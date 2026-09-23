import { describe, expect, it } from "vitest";

import { directoryCopy } from "@/lib/copy/directory";

import { COLUMNS, TEMPLATE_VERSION } from "./columns";
import { describeError, parseErrors } from "./errors";
import { buildWorkbook, type TestCell } from "./test-workbook";
import { validateDirectory } from "./validate";
import { readWorkbook, WorkbookError } from "./xlsx-read";
import { writeTemplate } from "./xlsx-write";

const HEADER = COLUMNS.map((c) => directoryCopy[`header.${c.key}`]);
const TODAY = "2026-09-23";

// A valid person, column by column in template order.
function person(
  overrides: Partial<Record<(typeof COLUMNS)[number]["key"], TestCell>> = {},
): TestCell[] {
  const base: Record<string, TestCell> = {
    employee_ref: "E001",
    first_name: "Ada",
    last_name: "Lovelace",
    work_email: "ada@example.test",
    unit_code: "OPS",
    unit_name: "Operations",
    team_name: "Service",
    manager_ref: null,
    role_title: "Analyst",
    role_family_name: "Analyst",
    start_date: "2020-02-03",
    fte: 1,
    is_team_leader: "Y",
    is_leadership_team: null,
    employment_status: "Permanent",
    formal_rating_label: "Meets",
    formal_rating_date: 46100,
    ...overrides,
  };
  return COLUMNS.map((c) => base[c.key] ?? null);
}

function errorsFor(rows: TestCell[][], options = {}) {
  return validateDirectory(readWorkbook(buildWorkbook([HEADER, ...rows], options)), TODAY).errors;
}

describe("the template", () => {
  const workbook = readWorkbook(writeTemplate());

  it("round-trips through the reader with the header in template order", () => {
    const directory = workbook.sheets.find((s) => s.name === "Directory")!;
    expect(directory.rows[0]!.map((c) => (c?.type === "string" ? c.value : null))).toEqual(HEADER);
  });

  it("carries its version and guidance", () => {
    expect(validateDirectory(workbook, TODAY).templateVersion).toBe(TEMPLATE_VERSION);
    const guidance = workbook.sheets.find((s) => s.name === "Guidance")!;
    const text = guidance.rows
      .flat()
      .map((c) => (c?.type === "string" ? c.value : ""))
      .join(" ");
    expect(text).toContain("within the 12 months before a campaign launches");
  });

  it("an empty template is refused as having no people", () => {
    expect(validateDirectory(workbook, TODAY).errors[0]!.message).toBe(
      directoryCopy["error.empty"],
    );
  });
});

describe("reading", () => {
  it("reads shared strings with rich-text runs, and cached formula values", () => {
    const bytes = buildWorkbook(
      [HEADER, person({ employee_ref: { formula: 'CONCAT("E","007")', cached: "E007" } })],
      {
        sharedStrings: true,
      },
    );
    const result = validateDirectory(readWorkbook(bytes), TODAY);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      employee_ref: "E007",
      first_name: "Ada",
      unit_code: "OPS",
    });
  });

  it("converts spreadsheet dates in both date systems", () => {
    expect(
      validateDirectory(readWorkbook(buildWorkbook([HEADER, person({ start_date: 45000 })])), TODAY)
        .rows[0]!.start_date,
    ).toBe("2023-03-15");
    expect(
      validateDirectory(
        readWorkbook(
          buildWorkbook(
            [
              HEADER,
              person({
                start_date: 45000 - 1462,
                formal_rating_label: null,
                formal_rating_date: null,
              }),
            ],
            {
              date1904: true,
            },
          ),
        ),
        TODAY,
      ).rows[0]!.start_date,
    ).toBe("2023-03-15");
  });

  it("refuses a file that is not a workbook, or is password-protected", () => {
    expect(() => readWorkbook(new TextEncoder().encode("name,email\n"))).toThrow(
      expect.objectContaining({ code: "not_xlsx" }),
    );
    expect(() =>
      readWorkbook(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    ).toThrow(expect.objectContaining({ code: "encrypted" }));
  });

  it("refuses macros, external links and embedded objects", () => {
    for (const part of [
      "xl/vbaProject.bin",
      "xl/externalLinks/externalLink1.xml",
      "xl/embeddings/oleObject1.bin",
    ]) {
      const bytes = buildWorkbook([HEADER], { extraParts: { [part]: new Uint8Array([1, 2, 3]) } });
      expect(() => readWorkbook(bytes)).toThrow(expect.objectContaining({ code: "unsafe" }));
    }
  });

  it("refuses a document type declaration, so no entity is ever expanded", () => {
    const bytes = buildWorkbook([HEADER], {
      sheetPrologue: '<!DOCTYPE x [<!ENTITY a "aaaaaaaaaa">]>',
    });
    expect(() => readWorkbook(bytes)).toThrow(expect.objectContaining({ code: "unsafe" }));
  });

  it("refuses a file that would inflate beyond the limits, before inflating it", () => {
    const bomb = new Uint8Array(33 * 1024 * 1024);
    const bytes = buildWorkbook([HEADER], { extraParts: { "xl/worksheets/sheet2.xml": bomb } });
    expect(bytes.length).toBeLessThan(200_000);
    expect(() => readWorkbook(bytes)).toThrow(WorkbookError);
  });

  it("refuses a truncated file", () => {
    const bytes = buildWorkbook([HEADER, person()]);
    expect(() => readWorkbook(bytes.slice(0, bytes.length - 40))).toThrow(WorkbookError);
  });
});

describe("validation", () => {
  it("accepts a valid person and normalises the values", () => {
    const result = validateDirectory(readWorkbook(buildWorkbook([HEADER, person()])), TODAY);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual({
      row_number: 2,
      employee_ref: "E001",
      first_name: "Ada",
      last_name: "Lovelace",
      work_email: "ada@example.test",
      unit_code: "OPS",
      unit_name: "Operations",
      team_name: "Service",
      manager_ref: null,
      role_title: "Analyst",
      role_family_name: "Analyst",
      start_date: "2020-02-03",
      fte: 1,
      is_team_leader: true,
      is_leadership_team: false,
      employment_status: "Permanent",
      formal_rating_label: "Meets",
      formal_rating_date: "2026-03-19",
    });
  });

  it("refuses a numeric employee ID, where Excel may have stripped leading zeros", () => {
    expect(errorsFor([person({ employee_ref: 7 })])).toEqual([
      { row: 2, column: "Employee ID", message: directoryCopy["error.idNumber"] },
    ]);
    expect(errorsFor([person({ manager_ref: 1 })])[0]!.column).toBe("Manager's employee ID");
  });

  it("names each problem by row and column without repeating the cell", () => {
    const errors = errorsFor([
      person({
        first_name: null,
        work_email: "not an email",
        fte: 1.5,
        is_team_leader: "maybe",
        start_date: "01/02/2026",
      }),
    ]);
    expect(errors.map((e) => [e.column, e.message])).toEqual([
      ["First name", directoryCopy["error.required"]],
      ["Work email", directoryCopy["error.email"]],
      ["Start date", directoryCopy["error.date"]],
      ["FTE fraction", directoryCopy["error.fte"]],
      ["Team leader", directoryCopy["error.flag"]],
    ]);
    expect(JSON.stringify(errors)).not.toContain("not an email");
  });

  it("needs a formal rating and its date together, and not in the future", () => {
    expect(errorsFor([person({ formal_rating_date: null })])[0]!.message).toBe(
      directoryCopy["error.ratingPair"],
    );
    expect(errorsFor([person({ formal_rating_date: "2026-12-01" })])[0]!.message).toBe(
      directoryCopy["error.ratingFuture"],
    );
  });

  it("refuses a repeated employee ID, case aside", () => {
    expect(errorsFor([person(), person({ employee_ref: "e001" })])).toEqual([
      { row: 3, column: "Employee ID", message: directoryCopy["error.duplicateId"] },
    ]);
  });

  it("refuses a file whose header does not match the template", () => {
    const bytes = buildWorkbook([
      ["Name", "Email"],
      ["Ada", "ada@example.test"],
    ]);
    expect(validateDirectory(readWorkbook(bytes), TODAY).errors).toEqual([
      { row: 1, column: "", message: directoryCopy["error.headers"] },
    ]);
  });

  it("stages nothing when any row has an error", () => {
    const result = validateDirectory(
      readWorkbook(buildWorkbook([HEADER, person(), person({ employee_ref: "E002", fte: 0 })])),
      TODAY,
    );
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it("skips blank rows", () => {
    const result = validateDirectory(
      readWorkbook(buildWorkbook([HEADER, person(), [], person({ employee_ref: "E002" })])),
      TODAY,
    );
    expect(result.rows.map((r) => r.row_number)).toEqual([2, 4]);
  });
});

describe("problems reported at staging", () => {
  it("are shown in the copy's words, by template header", () => {
    expect(
      describeError({
        row: 4,
        column: "manager_ref",
        message: "this reporting line loops back to the same person",
      }),
    ).toEqual({ row: 4, column: "Manager's employee ID", message: directoryCopy["problem.loop"] });
  });

  it("leave the route's own errors as they are, and ignore anything that is not an error", () => {
    const own = { row: 2, column: "Employee ID", message: directoryCopy["error.idNumber"] };
    expect(parseErrors([own, null, "text", { row: "x" }])).toEqual([own]);
    expect(parseErrors(null)).toEqual([]);
  });
});
