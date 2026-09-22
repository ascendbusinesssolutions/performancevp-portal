/**
 * M-C5-TL, the team-leader learning-velocity module: 5 Import TeamLeader N (per leader, (mean of
 * the twelve − 1) × 25 over the items answered) and 9 Type C Scoring rows 80 to 82 (leaders with
 * a score over the team-leader headcount, flagged below 70%; the unit score is the mean across
 * leaders). The workbook does not screen these rows; the online route screens them for
 * patterning and speed first (Module Library 8.5), which assemble.ts does.
 */

import { THRESHOLDS } from "../constants";
import { average, lt, type Cell } from "../excel";
import { convertMean } from "../items";
import { C5L_ITEMS, type TeamLeaderResponse } from "../types";

export interface C5Result {
  /** Per leader row, in input order; blank where no item was answered. */
  leaderScores: Cell[];
  responseRate: Cell;
  /** "LOW team-leader response" below 70%, "ok" otherwise, blank without a rate. */
  rateFlag: string | undefined;
  score: Cell;
}

export function leaderScore(row: TeamLeaderResponse): Cell {
  const mean = average(C5L_ITEMS.map((item) => row.items[item]));
  return mean === undefined ? undefined : convertMean(mean);
}

export function scoreC5(
  rows: readonly TeamLeaderResponse[],
  headcount: number | undefined,
): C5Result {
  const leaderScores = rows.map(leaderScore);
  const scored = leaderScores.filter((s) => s !== undefined).length;
  const responseRate = headcount === undefined || headcount === 0 ? undefined : scored / headcount;
  return {
    leaderScores,
    responseRate,
    rateFlag:
      responseRate === undefined
        ? undefined
        : lt(responseRate, THRESHOLDS.teamLeaders)
          ? "LOW team-leader response"
          : "ok",
    score: average(leaderScores),
  };
}
