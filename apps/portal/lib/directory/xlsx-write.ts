import { strToU8, zipSync } from "fflate";

import { directoryCopy } from "@/lib/copy/directory";

import {
  COLUMNS,
  DIRECTORY_MAX_ROWS,
  DIRECTORY_SHEET,
  GUIDANCE_SHEET,
  TEMPLATE_VERSION,
} from "./columns";

/**
 * Writes the directory template (Milestone 3 plan, Section 5.1): a Directory sheet with the header
 * row, the ID and unit-code columns formatted as text so Excel keeps leading zeros, the date columns
 * formatted as dates, Y lists on the two flags and a frozen header; and a Guidance sheet that defines
 * every field, states the 12-month rule for formal ratings and records the template version. Only the
 * parts Excel, Numbers, LibreOffice and Google Sheets need are written.
 */

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELATIONSHIPS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELATIONSHIPS = "http://schemas.openxmlformats.org/package/2006/relationships";

// Styles: 0 default, 1 bold header as text, 2 text, 3 date, 4 wrapped text.
const STYLE = { header: 1, text: 2, date: 3, wrap: 4 } as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnLetter(index: number): string {
  let letters = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function textCell(reference: string, value: string, style?: number): string {
  return `<c r="${reference}" t="inlineStr"${style !== undefined ? ` s="${style}"` : ""}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function columnStyle(kind: string): number | undefined {
  if (kind === "id" || kind === "code") return STYLE.text;
  if (kind === "date") return STYLE.date;
  return undefined;
}

function directorySheet(): string {
  const cols = COLUMNS.map((column, index) => {
    const style = columnStyle(column.kind);
    return `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"${style !== undefined ? ` style="${style}"` : ""}/>`;
  }).join("");
  const header = COLUMNS.map((column, index) =>
    textCell(`${columnLetter(index)}1`, directoryCopy[`header.${column.key}`], STYLE.header),
  ).join("");
  const flags = COLUMNS.map((column, index) => ({ column, letter: columnLetter(index) })).filter(
    ({ column }) => column.kind === "flag",
  );
  const validations = flags
    .map(
      ({ letter }) =>
        `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${letter}2:${letter}${DIRECTORY_MAX_ROWS + 1}"><formula1>"Y"</formula1></dataValidation>`,
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${cols}</cols>` +
    `<sheetData><row r="1">${header}</row></sheetData>` +
    `<dataValidations count="${flags.length}">${validations}</dataValidations>` +
    `</worksheet>`
  );
}

function guidanceSheet(): string {
  const rows: string[][] = [
    [directoryCopy["guidance.title"]],
    [directoryCopy["guidance.intro"]],
    [directoryCopy["guidance.required"]],
    [],
    ...COLUMNS.map((column) => [
      directoryCopy[`header.${column.key}`],
      directoryCopy[`guidance.${column.key}`],
    ]),
    [],
    [directoryCopy["guidance.version"], TEMPLATE_VERSION],
  ];
  const body = rows
    .map((cells, r) => {
      const content = cells
        .map((value, c) =>
          textCell(`${columnLetter(c)}${r + 1}`, value, r === 0 ? STYLE.header : STYLE.wrap),
        )
        .join("");
      return `<row r="${r + 1}">${content}</row>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}">` +
    `<cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="90" customWidth="1"/></cols>` +
    `<sheetData>${body}</sheetData>` +
    `</worksheet>`
  );
}

const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="${MAIN}">` +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="5">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>` +
  `<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

export function writeTemplate(): Uint8Array {
  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}"><workbookPr/><bookViews><workbookView/></bookViews>` +
    `<sheets><sheet name="${DIRECTORY_SHEET}" sheetId="1" r:id="rId1"/><sheet name="${GUIDANCE_SHEET}" sheetId="2" r:id="rId2"/></sheets>` +
    `</workbook>`;
  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${PACKAGE_RELATIONSHIPS}">` +
    `<Relationship Id="rId1" Type="${RELATIONSHIPS}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${RELATIONSHIPS}/worksheet" Target="worksheets/sheet2.xml"/>` +
    `<Relationship Id="rId3" Type="${RELATIONSHIPS}/styles" Target="styles.xml"/>` +
    `</Relationships>`;
  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="${PACKAGE_RELATIONSHIPS}">` +
    `<Relationship Id="rId1" Type="${RELATIONSHIPS}/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  return zipSync(
    {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rootRels),
      "xl/workbook.xml": strToU8(workbook),
      "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
      "xl/styles.xml": strToU8(STYLES),
      "xl/worksheets/sheet1.xml": strToU8(directorySheet()),
      "xl/worksheets/sheet2.xml": strToU8(guidanceSheet()),
    },
    { level: 6 },
  );
}
