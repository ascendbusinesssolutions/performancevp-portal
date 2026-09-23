import { directoryCopy } from "@/lib/copy/directory";

import {
  type Column,
  COLUMNS,
  DIRECTORY_MAX_ROWS,
  DIRECTORY_SHEET,
  GUIDANCE_SHEET,
  type RowKey,
} from "./columns";
import type { CellValue, Workbook } from "./xlsx-read";

/**
 * Row-level validation of an uploaded directory (Milestone 3 plan, Section 5.2). What can be judged
 * from one row, or from the file alone, is judged here; what needs the other rows' reporting lines or
 * the live directory (loops, missing managers, retired unit codes) is judged by the database when the
 * upload is staged. Errors name the row and column and never repeat a cell's contents.
 */

export interface DirectoryRow {
  row_number: number;
  employee_ref: string;
  first_name: string;
  last_name: string;
  work_email: string | null;
  unit_code: string;
  unit_name: string;
  team_name: string | null;
  manager_ref: string | null;
  role_title: string | null;
  role_family_name: string | null;
  start_date: string | null;
  fte: number;
  is_team_leader: boolean;
  is_leadership_team: boolean;
  employment_status: string | null;
  formal_rating_label: string | null;
  formal_rating_date: string | null;
}

export interface RowError {
  /** The spreadsheet row, from 1 (the header is row 1). */
  row: number;
  /** The template header of the column, or "" for the file as a whole. */
  column: string;
  message: string;
}

export interface ValidationResult {
  rows: DirectoryRow[];
  errors: RowError[];
  templateVersion: string | null;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UNIT_CODE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

function header(column: Column): string {
  return directoryCopy[`header.${column.key}`];
}

function isBlank(cell: CellValue | undefined): boolean {
  return cell === undefined || (cell.type === "string" && cell.value.trim() === "");
}

/** A spreadsheet serial date to ISO, in the 1900 or 1904 system. */
export function serialToIso(serial: number, date1904: boolean): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.floor(serial) * 86_400_000);
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) return null;
  return date.toISOString().slice(0, 10);
}

function isoDate(text: string): string | null {
  const match = ISO_DATE.exec(text.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date.toISOString().slice(0, 10);
}

function templateVersion(workbook: Workbook): string | null {
  const guidance = workbook.sheets.find(
    (s) => s.name.toLowerCase() === GUIDANCE_SHEET.toLowerCase(),
  );
  for (const row of guidance?.rows ?? []) {
    const label = row?.[0];
    const value = row?.[1];
    if (label?.type === "string" && label.value === directoryCopy["guidance.version"] && value) {
      return String(value.value);
    }
  }
  return null;
}

export function validateDirectory(workbook: Workbook, today: string): ValidationResult {
  const version = templateVersion(workbook);
  const sheet =
    workbook.sheets.find((s) => s.name.toLowerCase() === DIRECTORY_SHEET.toLowerCase()) ??
    workbook.sheets[0];
  if (!sheet)
    return {
      rows: [],
      errors: [{ row: 0, column: "", message: directoryCopy["error.noSheet"] }],
      templateVersion: version,
    };

  const headerRow = sheet.rows[0] ?? [];
  const headersMatch = COLUMNS.every((column, index) => {
    const cell = headerRow[index];
    return (
      cell?.type === "string" && cell.value.trim().toLowerCase() === header(column).toLowerCase()
    );
  });
  if (!headersMatch) {
    return {
      rows: [],
      errors: [{ row: 1, column: "", message: directoryCopy["error.headers"] }],
      templateVersion: version,
    };
  }

  const dataRows = sheet.rows
    .map((cells, index) => ({ cells: cells ?? [], rowNumber: index + 1 }))
    .slice(1)
    .filter(({ cells }) => COLUMNS.some((_, c) => !isBlank(cells[c])));
  if (dataRows.length > DIRECTORY_MAX_ROWS) {
    return {
      rows: [],
      errors: [{ row: 0, column: "", message: directoryCopy["error.tooManyRows"] }],
      templateVersion: version,
    };
  }
  if (dataRows.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, column: "", message: directoryCopy["error.empty"] }],
      templateVersion: version,
    };
  }

  const errors: RowError[] = [];
  const rows: DirectoryRow[] = [];
  const seenIds = new Set<string>();

  for (const { cells, rowNumber } of dataRows) {
    const rowErrors: RowError[] = [];
    const fail = (column: Column, key: Parameters<typeof message>[0]) =>
      rowErrors.push({ row: rowNumber, column: header(column), message: message(key) });
    const values: Partial<Record<RowKey, string | number | boolean | null>> = {};

    COLUMNS.forEach((column, index) => {
      const cell = cells[index];
      if (isBlank(cell)) {
        if (column.required) fail(column, "error.required");
        values[column.key] = column.kind === "flag" ? false : null;
        return;
      }
      const raw = cell!;
      switch (column.kind) {
        case "id": {
          if (raw.type !== "string") return fail(column, "error.idNumber");
          const value = raw.value.trim();
          if (value.length > (column.maxLength ?? 64) || CONTROL.test(value))
            return fail(column, "error.tooLong");
          values[column.key] = value;
          return;
        }
        case "code": {
          const value =
            raw.type === "number" && Number.isInteger(raw.value)
              ? String(raw.value)
              : raw.type === "string"
                ? raw.value.trim()
                : "";
          if (!UNIT_CODE.test(value)) return fail(column, "error.unitCode");
          values[column.key] = value;
          return;
        }
        case "text": {
          const value = raw.type === "string" ? raw.value.trim() : String(raw.value);
          if (value.length > (column.maxLength ?? 200) || CONTROL.test(value))
            return fail(column, "error.tooLong");
          values[column.key] = value;
          return;
        }
        case "email": {
          const value = raw.type === "string" ? raw.value.trim() : "";
          if (!EMAIL.test(value) || value.length > (column.maxLength ?? 320))
            return fail(column, "error.email");
          values[column.key] = value;
          return;
        }
        case "date": {
          const value =
            raw.type === "number"
              ? serialToIso(raw.value, workbook.date1904)
              : raw.type === "string"
                ? isoDate(raw.value)
                : null;
          if (value === null) return fail(column, "error.date");
          values[column.key] = value;
          return;
        }
        case "fte": {
          const value =
            raw.type === "number"
              ? raw.value
              : raw.type === "string"
                ? Number(raw.value.trim())
                : Number.NaN;
          if (!Number.isFinite(value) || value <= 0 || value > 1) return fail(column, "error.fte");
          values[column.key] = Math.round(value * 1000) / 1000;
          return;
        }
        case "flag": {
          if (raw.type === "boolean") {
            values[column.key] = raw.value;
            return;
          }
          const value = String(raw.value).trim().toLowerCase();
          if (["y", "yes", "true", "1"].includes(value)) values[column.key] = true;
          else if (["n", "no", "false", "0"].includes(value)) values[column.key] = false;
          else fail(column, "error.flag");
          return;
        }
      }
    });

    const label = values.formal_rating_label;
    const date = values.formal_rating_date;
    const labelColumn = COLUMNS.find((c) => c.key === "formal_rating_label")!;
    const dateColumn = COLUMNS.find((c) => c.key === "formal_rating_date")!;
    if (
      (label === null) !== (date === null) &&
      !rowErrors.some((e) => e.column === header(dateColumn))
    ) {
      fail(labelColumn, "error.ratingPair");
    } else if (typeof date === "string" && date > today) {
      fail(dateColumn, "error.ratingFuture");
    }

    const id = values.employee_ref;
    if (typeof id === "string") {
      const key = id.toLowerCase();
      if (seenIds.has(key)) fail(COLUMNS[0]!, "error.duplicateId");
      seenIds.add(key);
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    rows.push({ row_number: rowNumber, ...(values as Omit<DirectoryRow, "row_number">) });
  }

  return { rows: errors.length > 0 ? [] : rows, errors, templateVersion: version };
}

function message(
  key:
    | "error.required"
    | "error.idNumber"
    | "error.tooLong"
    | "error.email"
    | "error.unitCode"
    | "error.date"
    | "error.fte"
    | "error.flag"
    | "error.ratingPair"
    | "error.ratingFuture"
    | "error.duplicateId",
): string {
  return directoryCopy[key];
}
