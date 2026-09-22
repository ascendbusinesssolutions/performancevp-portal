/**
 * Response validity: the Survey Processing workbook's two whole-row checks (7 Screening B:I and
 * the summary B207:B211) plus the speed check the online route adds (Online Measurement
 * Specification Part 7). A row's numeric values are every item on it, process items included,
 * as the workbook's C:DB range is.
 *
 * Patterning: MAX = MIN over the row (G). Straight-lining: the mean of the forward items and the
 * mean of the reverse items both at or above 4, or both at or below 2 (H); a row with no forward
 * or no reverse value cannot fire it. Valid unless either fires (I). A row with no numeric value
 * is not a response at all (A blank) and is neither received nor counted.
 */

import { SPEED_CHECK, STRAIGHT_LINING } from "./constants";
import { average, isNumber, isReverse, type Cell } from "./items";
import type { MemberResponse, ScreeningSummary, SurveyItem, SurveyRow } from "./types";

export interface RowScreen {
  /** The row's position among the received rows, for traceability. */
  index: number;
  id: string | undefined;
  /** COUNT of numeric values on the row. */
  count: number;
  forwardMean: Cell;
  reverseMean: Cell;
  max: Cell;
  min: Cell;
  patterning: boolean;
  straightLining: boolean;
  speed: boolean;
  valid: boolean;
}

export interface ScreenedRows<R> {
  rows: RowScreen[];
  valid: R[];
  summary: ScreeningSummary;
}

/** Every numeric value on the row, item by item, with the item code for the flag lookup. */
export function rowValues(row: SurveyRow): Array<[SurveyItem, number]> {
  const out: Array<[SurveyItem, number]> = [];
  for (const [item, value] of Object.entries(row.items)) {
    if (isNumber(value)) out.push([item as SurveyItem, value]);
  }
  const processes = (row as MemberResponse).processes;
  if (processes) {
    for (const process of processes) {
      for (const [item, value] of Object.entries(process.items)) {
        if (isNumber(value)) out.push([item as SurveyItem, value]);
      }
    }
  }
  return out;
}

/** 7 Screening B:H for one row, before the speed check. */
export function screenRow(row: SurveyRow, index: number): Omit<RowScreen, "speed" | "valid"> {
  const values = rowValues(row);
  const forward: Cell[] = [];
  const reverse: Cell[] = [];
  let max: Cell;
  let min: Cell;
  for (const [item, value] of values) {
    (isReverse(item) ? reverse : forward).push(value);
    max = max === undefined || value > max ? value : max;
    min = min === undefined || value < min ? value : min;
  }
  const count = values.length;
  const forwardMean = average(forward);
  const reverseMean = average(reverse);
  const patterning = count > 0 && max === min;
  const straightLining =
    count > 0 &&
    forwardMean !== undefined &&
    reverseMean !== undefined &&
    ((forwardMean >= STRAIGHT_LINING.high && reverseMean >= STRAIGHT_LINING.high) ||
      (forwardMean <= STRAIGHT_LINING.low && reverseMean <= STRAIGHT_LINING.low));
  return {
    index,
    id: row.id,
    count,
    forwardMean,
    reverseMean,
    max,
    min,
    patterning,
    straightLining,
  };
}

/**
 * The nearest-rank 5th percentile of the received rows' completion times: the value at rank
 * ceiling(0.05 × n) in ascending order, over rows that recorded a time. Blank unless at least
 * 20 rows were received.
 */
export function speedCutoff(rows: readonly SurveyRow[]): number | undefined {
  if (rows.length < SPEED_CHECK.minimumReceived) return undefined;
  const times = rows
    .map((r) => r.completionSeconds)
    .filter(isNumber)
    .sort((a, b) => a - b);
  if (times.length === 0) return undefined;
  const rank = Math.max(1, Math.ceil(SPEED_CHECK.percentile * times.length));
  return times[rank - 1];
}

/**
 * Screens one audience's rows. Rows with no numeric value are dropped before anything is counted,
 * as the workbook leaves their A cell blank. `headcount` drives the reconciliation line (B211).
 */
export function screenResponses<R extends SurveyRow>(
  rows: readonly R[],
  options: { headcount?: number; applySpeedCheck?: boolean } = {},
): ScreenedRows<R> {
  const applySpeed = options.applySpeedCheck ?? true;
  const received: Array<{ row: R; screen: Omit<RowScreen, "speed" | "valid"> }> = [];
  rows.forEach((row, index) => {
    const screen = screenRow(row, index);
    if (screen.count > 0) received.push({ row, screen });
  });

  const cutoff = applySpeed ? speedCutoff(received.map((r) => r.row)) : undefined;
  const screened: RowScreen[] = [];
  const valid: R[] = [];
  const reasons = { straightLining: 0, patterning: 0, speed: 0 };
  for (const { row, screen } of received) {
    const speed =
      cutoff !== undefined && isNumber(row.completionSeconds) && row.completionSeconds < cutoff;
    const isValid = !(screen.patterning || screen.straightLining || speed);
    if (screen.patterning) reasons.patterning += 1;
    if (screen.straightLining) reasons.straightLining += 1;
    if (speed) reasons.speed += 1;
    screened.push({ ...screen, speed, valid: isValid });
    if (isValid) valid.push(row);
  }

  const receivedCount = received.length;
  const validCount = valid.length;
  const headcount = options.headcount;
  return {
    rows: screened,
    valid,
    summary: {
      received: receivedCount,
      valid: validCount,
      excluded: receivedCount - validCount,
      exclusionRate: receivedCount === 0 ? undefined : (receivedCount - validCount) / receivedCount,
      reasons,
      speedCheckApplied: cutoff !== undefined,
      speedCutoffSeconds: cutoff,
      headcountReconciliation:
        headcount === undefined
          ? undefined
          : receivedCount > headcount
            ? "CHECK: responses exceed headcount"
            : "ok",
    },
  };
}
