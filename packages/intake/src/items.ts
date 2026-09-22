/**
 * The item sets each instrument can deploy, the deployed-item model for a cadence, and the
 * arithmetic every mean shares: raw un-flipped means for the engine, flipped means for the modules.
 */

import { CONVERSION, REVERSE_BASE, REVERSE_SCORED_ITEMS } from "./constants";
import {
  CII_ITEMS,
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  OI5_ITEMS,
  TSI2_ITEMS,
  TSI3_ITEMS,
  TW_ITEMS,
  type PartAItem,
  type SurveyItem,
} from "./types";

/** Part A in the workbook's column order (2 Import Main C:BU). */
export const PART_A_ITEMS: readonly PartAItem[] = [
  ...CII_ITEMS,
  ...MI1_ITEMS,
  ...MI2_ITEMS,
  ...MI3_ITEMS,
  ...MI4_ITEMS,
  ...TW_ITEMS,
  ...OI1_ITEMS,
  ...OI2_ITEMS,
  ...OI3_ITEMS,
  ...OI4_ITEMS,
  ...OI5_ITEMS,
  ...TSI2_ITEMS,
  ...TSI3_ITEMS,
];

/** The Part A blocks as the workbook lays them out, with the engine's block key. */
export const PART_A_BLOCKS = [
  { key: "C4", items: CII_ITEMS },
  { key: "M1", items: MI1_ITEMS },
  { key: "M2", items: MI2_ITEMS },
  { key: "M3", items: MI3_ITEMS },
  { key: "M4", items: MI4_ITEMS },
  { key: "TW", items: TW_ITEMS },
  { key: "O1", items: OI1_ITEMS },
  { key: "O2", items: OI2_ITEMS },
  { key: "O3", items: OI3_ITEMS },
  { key: "O4", items: OI4_ITEMS },
  { key: "O5", items: OI5_ITEMS },
  { key: "S2", items: TSI2_ITEMS },
  { key: "S3", items: TSI3_ITEMS },
] as const;

export type Cell = number | undefined;

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** AVERAGE over the numeric values, blank when there are none. */
export function average(values: readonly Cell[]): Cell {
  let total = 0;
  let n = 0;
  for (const v of values) {
    if (isNumber(v)) {
      total += v;
      n += 1;
    }
  }
  return n === 0 ? undefined : total / n;
}

export function isReverse(item: SurveyItem): boolean {
  return REVERSE_SCORED_ITEMS.has(item);
}

/** 6 − mean for a reverse item, the mean otherwise. */
export function flip(item: SurveyItem, mean: number): number {
  return isReverse(item) ? REVERSE_BASE - mean : mean;
}

/** (mean − 1) × 25. */
export function convertMean(mean: number): number {
  return (mean - CONVERSION.offset) * CONVERSION.scale;
}

/**
 * The workbook's module form: the mean of the per-item means, each flipped where mapped, over the
 * items that have a mean, then converted. Type C Scoring B43:B47; Module Library Part 2.
 */
export function scoreItemMeans(
  items: readonly SurveyItem[],
  means: Partial<Record<string, number>>,
): Cell {
  const flipped: Cell[] = items.map((item) => {
    const m = means[item];
    return isNumber(m) ? flip(item, m) : undefined;
  });
  const mean = average(flipped);
  return mean === undefined ? undefined : convertMean(mean);
}
