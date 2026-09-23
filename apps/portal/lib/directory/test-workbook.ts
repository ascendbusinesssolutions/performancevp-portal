import { strToU8, zipSync } from "fflate";

/**
 * Builds small .xlsx files for the reader and validator tests, in the shapes other tools produce:
 * shared or inline strings, the 1904 date system, formula cells with cached values, and hostile
 * variants (extra parts, a document type declaration). Test support only.
 */

export type TestCell = string | number | boolean | null | { formula: string; cached: string };

export interface TestWorkbookOptions {
  sheetName?: string;
  sharedStrings?: boolean;
  date1904?: boolean;
  extraParts?: Record<string, Uint8Array>;
  /** Prepended to the sheet XML, after the XML declaration. */
  sheetPrologue?: string;
}

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function letter(index: number): string {
  let out = "";
  let n = index + 1;
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function buildWorkbook(rows: TestCell[][], options: TestWorkbookOptions = {}): Uint8Array {
  const shared: string[] = [];
  const sheetData = rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          const ref = `${letter(c)}${r + 1}`;
          if (cell === null) return "";
          if (typeof cell === "object")
            return `<c r="${ref}" t="str"><f>${escape(cell.formula)}</f><v>${escape(cell.cached)}</v></c>`;
          if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
          if (typeof cell === "boolean") return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
          if (options.sharedStrings) {
            shared.push(cell);
            return `<c r="${ref}" t="s"><v>${shared.length - 1}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escape(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8"?>${options.sheetPrologue ?? ""}<worksheet xmlns="${MAIN}"><sheetData>${sheetData}</sheetData></worksheet>`;
  const parts: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0"?><workbook xmlns="${MAIN}" xmlns:r="${REL}"><workbookPr${options.date1904 ? ' date1904="1"' : ""}/><sheets><sheet name="${options.sheetName ?? "Directory"}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheet),
    ...options.extraParts,
  };
  if (options.sharedStrings) {
    parts["xl/sharedStrings.xml"] = strToU8(
      `<?xml version="1.0"?><sst xmlns="${MAIN}">${shared.map((s) => `<si><r><t>${escape(s.slice(0, 1))}</t></r><r><t>${escape(s.slice(1))}</t></r></si>`).join("")}</sst>`,
    );
  }
  return zipSync(parts);
}
