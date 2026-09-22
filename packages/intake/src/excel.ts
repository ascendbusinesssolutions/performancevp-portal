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

// ---------------------------------------------------------------------------------------------
// Dates: ISO strings only, no clock. The same DATEDIF "m" arithmetic as the engine's excel.ts.
// ---------------------------------------------------------------------------------------------

export function parseIso(date: string): [number, number, number] {
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

/** DATEDIF(start, end, "m"): complete months between two dates; negative when start is after end. */
export function completeMonths(start: string, end: string): number {
  const [sy, sm, sd] = parseIso(start);
  const [ey, em, ed] = parseIso(end);
  if (Date.UTC(sy, sm - 1, sd) > Date.UTC(ey, em - 1, ed)) return -completeMonths(end, start);
  let months = (ey - sy) * 12 + (em - sm);
  if (ed < sd) months -= 1;
  return months;
}

/** a <= b on ISO dates. */
export function onOrBefore(a: string, b: string): boolean {
  const [ay, am, ad] = parseIso(a);
  const [by, bm, bd] = parseIso(b);
  return Date.UTC(ay, am - 1, ad) <= Date.UTC(by, bm - 1, bd);
}

/** The same day of month N months earlier, clamped to the month's length (29 February to 28). */
export function minusMonths(date: string, months: number): string {
  const [y, m, d] = parseIso(date);
  const total = y * 12 + (m - 1) - months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  const daysInMonth = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, daysInMonth);
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** MEDIAN over the numeric values: the middle value, or the mean of the two middle values. */
export function median(values: readonly Cell[]): Cell {
  const sorted = values.filter(isNumber).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return undefined;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}
