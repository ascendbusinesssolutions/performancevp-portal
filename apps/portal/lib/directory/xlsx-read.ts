import { unzipSync } from "fflate";
import { SaxesParser } from "saxes";

/**
 * A narrow reader for the directory template (Milestone 3 plan, Section 5.2; decision 4). It reads
 * only what the template uses: sheets, shared and inline strings, numbers and booleans. It never
 * evaluates a formula (a formula cell yields its cached value), never resolves an external entity
 * (a document type declaration is refused outright), and inflates only the parts it needs after
 * checking the zip directory against hard limits, so a crafted file cannot exhaust memory.
 */

export type CellValue =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean };

export interface Sheet {
  name: string;
  /** rows[rowIndex][columnIndex], both from 0; missing cells are undefined. */
  rows: Array<Array<CellValue | undefined>>;
}

export interface Workbook {
  sheets: Sheet[];
  /** The workbook uses the 1904 date system (dates count from 1 January 1904). */
  date1904: boolean;
}

export type WorkbookErrorCode = "not_xlsx" | "encrypted" | "unsafe" | "malformed";

export class WorkbookError extends Error {
  constructor(
    readonly code: WorkbookErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "WorkbookError";
  }
}

export const READ_LIMITS = {
  /** Parts in the zip; the template has about ten and a re-saved workbook rarely thirty. */
  maxEntries: 100,
  /** Declared uncompressed size of everything in the zip. */
  maxTotalInflatedBytes: 40 * 1024 * 1024,
  /** Declared uncompressed size of any one part the reader inflates. */
  maxPartInflatedBytes: 32 * 1024 * 1024,
  maxRows: 25_000,
  maxColumns: 64,
};

const UNSAFE_PARTS = [
  /^xl\/vbaProject\.bin$/i,
  /^xl\/externalLinks\//i,
  /^xl\/embeddings\//i,
  /^xl\/activeX\//i,
  /^xl\/macrosheets\//i,
];

function isWanted(name: string): boolean {
  return (
    name === "xl/workbook.xml" ||
    name === "xl/_rels/workbook.xml.rels" ||
    name === "xl/sharedStrings.xml" ||
    /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)
  );
}

function localName(tag: string): string {
  const colon = tag.indexOf(":");
  return colon === -1 ? tag : tag.slice(colon + 1);
}

/** Parses XML with saxes, refusing any document type declaration. */
function parseXml(
  xml: string,
  handlers: {
    open?: (name: string, attributes: Record<string, string>) => void;
    close?: (name: string) => void;
    text?: (text: string) => void;
  },
): void {
  const parser = new SaxesParser();
  parser.on("doctype", () => {
    throw new WorkbookError("unsafe", "document type declaration");
  });
  parser.on("opentag", (tag) => {
    const attributes: Record<string, string> = {};
    for (const [key, attribute] of Object.entries(tag.attributes)) {
      attributes[localName(key)] = attribute;
    }
    handlers.open?.(localName(tag.name), attributes);
  });
  parser.on("closetag", (tag) => handlers.close?.(localName(tag.name)));
  parser.on("text", (text) => handlers.text?.(text));
  parser.on("cdata", (text) => handlers.text?.(text));
  parser.on("error", (error) => {
    throw error instanceof WorkbookError ? error : new WorkbookError("malformed", error.message);
  });
  parser.write(xml).close();
}

/** "B7" to column index 1; letters only. */
export function columnIndex(reference: string): number {
  let index = 0;
  for (const character of reference) {
    const code = character.toUpperCase().charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

function rowIndex(reference: string): number {
  const digits = /\d+$/.exec(reference);
  return digits ? Number(digits[0]) - 1 : -1;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function readWorkbook(bytes: Uint8Array): Workbook {
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    // An encrypted .xlsx is an OLE compound file, as is the old binary .xls.
    throw new WorkbookError("encrypted");
  }
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new WorkbookError("not_xlsx");

  let entries = 0;
  let declaredTotal = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter(file) {
        entries += 1;
        declaredTotal += file.originalSize;
        if (entries > READ_LIMITS.maxEntries || declaredTotal > READ_LIMITS.maxTotalInflatedBytes) {
          throw new WorkbookError("unsafe", "too large when inflated");
        }
        if (UNSAFE_PARTS.some((pattern) => pattern.test(file.name))) {
          throw new WorkbookError("unsafe", "macros, external links or embedded objects");
        }
        const wanted = isWanted(file.name);
        if (wanted && file.originalSize > READ_LIMITS.maxPartInflatedBytes) {
          throw new WorkbookError("unsafe", "part too large when inflated");
        }
        return wanted;
      },
    });
  } catch (error) {
    if (error instanceof WorkbookError) throw error;
    throw new WorkbookError("malformed", "not a readable zip");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const text = (name: string): string | undefined => {
    const part = files[name];
    if (part === undefined) return undefined;
    try {
      return decoder.decode(part);
    } catch {
      throw new WorkbookError("malformed", `${name} is not UTF-8`);
    }
  };

  const workbookXml = text("xl/workbook.xml");
  const relsXml = text("xl/_rels/workbook.xml.rels");
  if (workbookXml === undefined || relsXml === undefined)
    throw new WorkbookError("malformed", "no workbook part");

  let date1904 = false;
  const sheetRefs: Array<{ name: string; relationshipId: string }> = [];
  parseXml(workbookXml, {
    open(name, attributes) {
      if (name === "workbookPr")
        date1904 = attributes.date1904 === "1" || attributes.date1904 === "true";
      if (name === "sheet" && attributes.name && attributes.id) {
        sheetRefs.push({ name: attributes.name, relationshipId: attributes.id });
      }
    },
  });

  const targets = new Map<string, string>();
  parseXml(relsXml, {
    open(name, attributes) {
      if (name === "Relationship" && attributes.Id && attributes.Target)
        targets.set(attributes.Id, attributes.Target);
    },
  });

  const sharedStrings: string[] = [];
  const sharedXml = text("xl/sharedStrings.xml");
  if (sharedXml !== undefined) {
    let current: string | null = null;
    let inText = false;
    let inPhonetic = false;
    parseXml(sharedXml, {
      open(name) {
        if (name === "si") current = "";
        else if (name === "rPh") inPhonetic = true;
        else if (name === "t" && !inPhonetic) inText = true;
      },
      close(name) {
        if (name === "si" && current !== null) {
          sharedStrings.push(current);
          current = null;
        } else if (name === "t") inText = false;
        else if (name === "rPh") inPhonetic = false;
      },
      text(value) {
        if (inText && current !== null) current += value;
      },
    });
  }

  const sheets: Sheet[] = [];
  for (const ref of sheetRefs) {
    const target = targets.get(ref.relationshipId);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    const sheetXml = text(path);
    if (sheetXml === undefined) continue;

    const rows: Sheet["rows"] = [];
    let cellRef = "";
    let cellType = "n";
    let valueText: string | null = null;
    let inlineText: string | null = null;
    let inValue = false;
    let inInlineText = false;

    parseXml(sheetXml, {
      open(name, attributes) {
        if (name === "c") {
          cellRef = attributes.r ?? "";
          cellType = attributes.t ?? "n";
          valueText = null;
          inlineText = null;
        } else if (name === "v") {
          inValue = true;
          valueText = "";
        } else if (name === "is") {
          inlineText = "";
        } else if (name === "t" && inlineText !== null) {
          inInlineText = true;
        }
      },
      close(name) {
        if (name === "v") inValue = false;
        else if (name === "t") inInlineText = false;
        else if (name === "c") {
          const r = rowIndex(cellRef);
          const c = columnIndex(cellRef);
          if (r < 0 || c < 0) throw new WorkbookError("malformed", "a cell without a reference");
          if (r >= READ_LIMITS.maxRows || c >= READ_LIMITS.maxColumns) return;
          let cell: CellValue | undefined;
          if (cellType === "inlineStr") {
            cell = inlineText !== null ? { type: "string", value: inlineText } : undefined;
          } else if (cellType === "s") {
            const shared = sharedStrings[Number(valueText)];
            cell = shared !== undefined ? { type: "string", value: shared } : undefined;
          } else if (cellType === "str") {
            cell = valueText !== null ? { type: "string", value: valueText } : undefined;
          } else if (cellType === "b") {
            cell =
              valueText !== null ? { type: "boolean", value: valueText.trim() === "1" } : undefined;
          } else if (cellType === "e") {
            cell = undefined;
          } else if (valueText !== null && valueText.trim() !== "") {
            const number = Number(valueText);
            cell = Number.isFinite(number) ? { type: "number", value: number } : undefined;
          }
          if (cell !== undefined) {
            const row = (rows[r] ??= []);
            row[c] = cell;
          }
        }
      },
      text(value) {
        if (inValue && valueText !== null) valueText += value;
        else if (inInlineText && inlineText !== null) inlineText += value;
      },
    });
    sheets.push({ name: ref.name, rows });
  }

  return { sheets, date1904 };
}
