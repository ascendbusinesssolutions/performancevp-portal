/**
 * The all-member Part B modules: M-O1-CASCADE, M-O2-IA and M-O3-PF (9 Type C Scoring B43:B48).
 * Each is the workbook's module form over the valid rows' item means: the mean of the per-item
 * means with the mapped items flipped, over the items present, then (mean − 1) × 25. CASCADE and
 * IA carry a response rate from their first item over the all-member headcount, flagged LOW
 * below 60%. PF scores each named process and takes the mean across processes with a score.
 */

import { THRESHOLDS } from "../constants";
import { average, isNumber, lt, type Cell } from "../excel";
import { scoreItemMeans } from "../items";
import { itemMeans } from "../means";
import { O1C_ITEMS, O2I_ITEMS, O3P_ITEMS, type MemberResponse, type O3pItem } from "../types";

export interface PartBModule {
  score: Cell;
  responseRate: Cell;
  /** "LOW" below 60%, "" otherwise, blank without a rate. */
  flag: string | undefined;
}

function rateOn(
  validRows: readonly MemberResponse[],
  item: string,
  headcount: number | undefined,
): Cell {
  if (headcount === undefined || headcount === 0) return undefined;
  let answered = 0;
  for (const row of validRows) {
    if (isNumber((row.items as Partial<Record<string, number>>)[item])) answered += 1;
  }
  return answered / headcount;
}

function flagOf(rate: Cell): string | undefined {
  return rate === undefined ? undefined : lt(rate, THRESHOLDS.allMember) ? "LOW" : "";
}

export function scoreCascade(
  validRows: readonly MemberResponse[],
  headcount: number | undefined,
): PartBModule {
  const rate = rateOn(validRows, O1C_ITEMS[0], headcount);
  return {
    score: scoreItemMeans(O1C_ITEMS, itemMeans(validRows, O1C_ITEMS)),
    responseRate: rate,
    flag: flagOf(rate),
  };
}

export function scoreInformationAccess(
  validRows: readonly MemberResponse[],
  headcount: number | undefined,
): PartBModule {
  const rate = rateOn(validRows, O2I_ITEMS[0], headcount);
  return {
    score: scoreItemMeans(O2I_ITEMS, itemMeans(validRows, O2I_ITEMS)),
    responseRate: rate,
    flag: flagOf(rate),
  };
}

export interface ProcessFriction {
  processes: Array<{ processId: string; name: string; score: Cell }>;
  /** AVERAGE across the processes with a score. */
  mean: Cell;
}

/** Per-process item means over the valid rows that answered for that process. */
export function processItemMeans(
  validRows: readonly MemberResponse[],
  processId: string,
): Partial<Record<O3pItem, number>> {
  const rows = validRows.flatMap((row) => {
    const process = row.processes?.find((p) => p.processId === processId);
    return process === undefined ? [] : [{ items: process.items }];
  });
  return itemMeans(rows, O3P_ITEMS);
}

export function scoreProcessFriction(
  validRows: readonly MemberResponse[],
  processes: ReadonlyArray<{ id: string; name: string }>,
): ProcessFriction {
  const scored = processes.map((process) => ({
    processId: process.id,
    name: process.name,
    score: scoreItemMeans(O3P_ITEMS, processItemMeans(validRows, process.id)),
  }));
  return { processes: scored, mean: average(scored.map((p) => p.score)) };
}
