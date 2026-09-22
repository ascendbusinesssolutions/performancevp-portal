/**
 * Comparing an engine value with a workbook cell value.
 *
 * Numbers agree within an absolute tolerance of 1e-9; the dump holds Excel's 17-digit doubles,
 * and the same IEEE operations in the same order give far tighter agreement in practice, which
 * the parity report records. P is additionally held to the 0.05 ceiling DECISIONS.md 2.1 sets.
 * Strings and blanks must match exactly; the engine's "" and Excel's empty string are both blank.
 */

import { isExcelError } from "../src/excel";
import type { CellValue } from "./cell-map";

export const NUMERIC_TOLERANCE = 1e-9;
export const P_CEILING = 0.05;

/** A value as the dump tool writes it. */
export type DumpValue = number | string | boolean | null | { error: string };

export interface Comparison {
  ok: boolean;
  actual: DumpValue;
  expected: DumpValue;
  /** The absolute difference for two numbers; undefined otherwise. */
  difference?: number;
}

/** Normalises an engine value to the dump's representation. */
export function toDumpValue(value: CellValue): DumpValue {
  if (value === undefined || value === "") return null;
  if (isExcelError(value)) return { error: value.excelError };
  return value;
}

export function compareValues(
  actualRaw: CellValue,
  expected: DumpValue,
  tolerance = NUMERIC_TOLERANCE,
): Comparison {
  const actual = toDumpValue(actualRaw);
  if (typeof actual === "number" && typeof expected === "number") {
    const difference = Math.abs(actual - expected);
    return { ok: difference <= tolerance, actual, expected, difference };
  }
  if (
    typeof actual === "object" &&
    actual !== null &&
    typeof expected === "object" &&
    expected !== null
  ) {
    return { ok: actual.error === expected.error, actual, expected };
  }
  return { ok: actual === expected, actual, expected };
}
