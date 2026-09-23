import { directoryCopy } from "@/lib/copy/directory";

import { COLUMNS, type RowKey } from "./columns";

/**
 * Upload errors come from two places: the route's row checks, which already carry the template
 * header and the copy text, and the database's cross-row checks at staging, which carry the row
 * key and a plain message. Both are shown the same way, by row and column, never with a cell's
 * contents.
 */

export interface UploadError {
  row: number;
  column: string;
  message: string;
}

const PROBLEMS: Record<string, keyof typeof directoryCopy> = {
  "the manager's employee ID is not in this file": "problem.managerMissing",
  "a person cannot be their own manager": "problem.selfManager",
  "this work email appears on more than one row": "problem.duplicateEmail",
  "this unit code belongs to a retired unit and cannot be reused": "problem.retiredUnit",
  "this reporting line loops back to the same person": "problem.loop",
};

const KEYS = new Set<string>(COLUMNS.map((c) => c.key));

export function describeError(error: UploadError): UploadError {
  const column = KEYS.has(error.column)
    ? directoryCopy[`header.${error.column as RowKey}`]
    : error.column;
  const known = PROBLEMS[error.message];
  return { row: error.row, column, message: known ? directoryCopy[known] : error.message };
}

export function parseErrors(value: unknown): UploadError[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e): e is UploadError => typeof e === "object" && e !== null && "message" in e)
    .map((e) =>
      describeError({
        row: Number(e.row) || 0,
        column: String(e.column ?? ""),
        message: String(e.message),
      }),
    );
}
