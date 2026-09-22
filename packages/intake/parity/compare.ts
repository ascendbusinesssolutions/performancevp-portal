/**
 * Comparing an intake value with a workbook cell value, as the engine's parity does: numbers
 * within 1e-9, strings and blanks exact. The intake has no Excel errors to compare; a cell the
 * workbook shows as an error is a mismatch unless the map reads it as one.
 */

export const NUMERIC_TOLERANCE = 1e-9;

/** A cell value as tools/parity/dump_values.py writes it. */
export type DumpValue = number | string | boolean | null | { error: string };

/** A value the cell map reads from the intake: number, string, boolean, or blank. */
export type CellValue = number | string | boolean | undefined;

export interface Comparison {
  ok: boolean;
  actual: DumpValue;
  expected: DumpValue;
  difference?: number;
}

export function toDumpValue(value: CellValue): DumpValue {
  if (value === undefined || value === "") return null;
  return value;
}

export function compareValues(actualRaw: CellValue, expected: DumpValue): Comparison {
  const actual = toDumpValue(actualRaw);
  if (typeof actual === "number" && typeof expected === "number") {
    const difference = Math.abs(actual - expected);
    return { ok: difference <= NUMERIC_TOLERANCE, actual, expected, difference };
  }
  return { ok: actual === expected, actual, expected };
}
