/**
 * 8 Type A Means, rows 5 to 75: the mean of each item over valid respondents (C), the response
 * rate per block from the block's first item (E) and the LOW flag below the all-member threshold
 * (F). Means are raw and un-flipped; the engine reverse-scores. Only deployed items are averaged,
 * so an item this cadence did not carry stays absent and the engine's AVERAGE skips it.
 */

import { THRESHOLDS } from "./constants";
import { average, isNumber, lt, type Cell } from "./excel";
import { PART_A_BLOCKS } from "./items";
import type { SurveyRow } from "./types";

export type ItemMeans<K extends string = string> = Partial<Record<K, number>>;

/** AVERAGEIFS over the valid rows, item by item; an item with no numeric value is absent. */
export function itemMeans<K extends string>(
  rows: readonly SurveyRow[],
  items: readonly K[],
): ItemMeans<K> {
  const means: ItemMeans<K> = {};
  for (const item of items) {
    const values: Cell[] = rows.map((row) => (row.items as ItemMeans)[item]);
    const mean = average(values);
    if (mean !== undefined) means[item] = mean;
  }
  return means;
}

export interface BlockRate {
  key: string;
  /** Valid respondents who answered the block's first item, over the headcount. */
  responseRate: number | undefined;
  /** "LOW" below the all-member threshold, "" otherwise, blank without a rate. */
  flag: string | undefined;
}

/** COUNTIFS(valid, first item <> "") / headcount for every Part A block, with the LOW flag. */
export function blockRates(
  validRows: readonly SurveyRow[],
  headcount: number | undefined,
  deployed: ReadonlySet<string>,
): BlockRate[] {
  return PART_A_BLOCKS.map((block) => {
    const first = block.items[0];
    if (headcount === undefined || headcount === 0 || !deployed.has(first)) {
      return { key: block.key, responseRate: undefined, flag: undefined };
    }
    let answered = 0;
    for (const row of validRows) {
      if (isNumber((row.items as ItemMeans)[first])) answered += 1;
    }
    const responseRate = answered / headcount;
    return {
      key: block.key,
      responseRate,
      flag: lt(responseRate, THRESHOLDS.allMember) ? "LOW" : "",
    };
  });
}
