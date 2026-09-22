/**
 * Excel semantics the Survey Processing workbook relies on, reproduced once. A blank cell is
 * `undefined`; COUNT and AVERAGE ignore blanks; threshold comparisons apply Excel's rule that two
 * numbers agreeing to 15 significant digits compare equal (PORTAL_BUILD_PLAN.md Section 5), the
 * same rule the engine's excel.ts holds.
 */

export type Cell = number | undefined;

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export const COMPARISON_PRECISION = 15;

export function toComparable(value: number): number {
  return Number(value.toPrecision(COMPARISON_PRECISION));
}

export function gt(a: number, b: number): boolean {
  return toComparable(a) > toComparable(b);
}
export function ge(a: number, b: number): boolean {
  return toComparable(a) >= toComparable(b);
}
export function lt(a: number, b: number): boolean {
  return toComparable(a) < toComparable(b);
}
export function le(a: number, b: number): boolean {
  return toComparable(a) <= toComparable(b);
}
export function eq(a: number, b: number): boolean {
  return toComparable(a) === toComparable(b);
}

/** COUNT: the numeric values in a range. */
export function count(values: readonly Cell[]): number {
  let n = 0;
  for (const v of values) if (isNumber(v)) n += 1;
  return n;
}

/** SUM over the numeric values; 0 when there are none, as Excel. */
export function sum(values: readonly Cell[]): number {
  let total = 0;
  for (const v of values) if (isNumber(v)) total += v;
  return total;
}

/** AVERAGE over the numeric values, blank when there are none (Excel's #DIV/0! under IFERROR). */
export function average(values: readonly Cell[]): Cell {
  const n = count(values);
  return n === 0 ? undefined : sum(values) / n;
}
