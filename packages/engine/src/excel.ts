/**
 * Excel semantics the workbook relies on, reproduced once so every formula reads the same way.
 *
 * A blank cell is `undefined`. Functions that Excel evaluates over ranges (COUNT, AVERAGE, SUM)
 * ignore blanks and text, as Excel does. Threshold comparisons on computed values go through the
 * comparison helpers, which apply Excel's rule that two numbers agreeing to 15 significant digits
 * compare equal (docs/benchmarks/fixtures/README.md; PORTAL_BUILD_PLAN.md Section 5).
 */

import type { ExcelError, IsoDate } from "./types";

export type Cell = number | undefined;

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isExcelError(value: unknown): value is ExcelError {
  return typeof value === "object" && value !== null && "excelError" in value;
}

export const DIV0: ExcelError = { excelError: "#DIV/0!" };
export const NUM: ExcelError = { excelError: "#NUM!" };

/** The number of significant digits Excel compares at. */
export const COMPARISON_PRECISION = 15;

/** Rounds to Excel's comparison precision. */
export function toComparable(value: number): number {
  return Number(value.toPrecision(COMPARISON_PRECISION));
}

/** a > b as Excel evaluates it. */
export function gt(a: number, b: number): boolean {
  return toComparable(a) > toComparable(b);
}
/** a >= b as Excel evaluates it. */
export function ge(a: number, b: number): boolean {
  return toComparable(a) >= toComparable(b);
}
/** a < b as Excel evaluates it. */
export function lt(a: number, b: number): boolean {
  return toComparable(a) < toComparable(b);
}
/** a <= b as Excel evaluates it. */
export function le(a: number, b: number): boolean {
  return toComparable(a) <= toComparable(b);
}
/** a = b as Excel evaluates it. */
export function eq(a: number, b: number): boolean {
  return toComparable(a) === toComparable(b);
}

/** COUNT: the numeric values in a range. */
export function count(values: readonly Cell[]): number {
  let n = 0;
  for (const v of values) if (isNumber(v)) n += 1;
  return n;
}

/** SUM over the numeric values, in range order. */
export function sum(values: readonly Cell[]): number {
  let total = 0;
  for (const v of values) if (isNumber(v)) total += v;
  return total;
}

/** AVERAGE over the numeric values; blank when there are none (the callers guard with COUNT as the cells do). */
export function average(values: readonly Cell[]): Cell {
  const n = count(values);
  if (n === 0) return undefined;
  return sum(values) / n;
}

/** MIN over numbers. */
export function min(values: readonly number[]): number {
  let m = Number.POSITIVE_INFINITY;
  for (const v of values) if (v < m) m = v;
  return m;
}

/** Excel serial date epoch: serial 1 is 1900-01-01; serial 0 is 1899-12-30 in UTC terms. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export function isoToSerial(date: IsoDate): number {
  const [y, m, d] = parseIso(date);
  return Math.round((Date.UTC(y, m - 1, d) - EXCEL_EPOCH_MS) / DAY_MS);
}

export function serialToIso(serial: number): IsoDate {
  return new Date(EXCEL_EPOCH_MS + Math.round(serial) * DAY_MS).toISOString().slice(0, 10);
}

function parseIso(date: IsoDate): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`Not a calendar date: ${date}`);
  }
  return [y, m, d];
}

/**
 * DATEDIF(start, end, "m"): complete months between two dates. One month is subtracted when the
 * end day of month is before the start day. Start after end is #NUM!.
 */
export function datedifMonths(start: IsoDate, end: IsoDate): number | ExcelError {
  const [sy, sm, sd] = parseIso(start);
  const [ey, em, ed] = parseIso(end);
  if (Date.UTC(sy, sm - 1, sd) > Date.UTC(ey, em - 1, ed)) return NUM;
  let months = (ey - sy) * 12 + (em - sm);
  if (ed < sd) months -= 1;
  return months;
}

/**
 * LARGE(range, k) followed by MATCH(value, range, 0): the index (0-based) of the k-th largest numeric
 * value, resolved to the first position holding it. Blanks and errors are not candidates. Returns
 * undefined where Excel would error (k beyond the numeric count), which the callers wrap in IFERROR.
 */
export function indexOfKthLargest(
  values: readonly (number | undefined | ExcelError)[],
  k: number,
): number | undefined {
  const numeric: number[] = [];
  for (const v of values) if (isNumber(v)) numeric.push(v);
  if (k < 1 || k > numeric.length) return undefined;
  numeric.sort((a, b) => b - a);
  const target = numeric[k - 1];
  if (target === undefined) return undefined;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (isNumber(v) && eq(v, target)) return i;
  }
  return undefined;
}
