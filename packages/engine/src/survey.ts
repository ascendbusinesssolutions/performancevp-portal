/**
 * Type A survey conversion: reverse-scoring and (mean − 1) × 25.
 *
 * Mirrors the "Adjusted" helper column (IF(ISNUMBER(mean), mean or 6 − mean, "")) and the score
 * cells IF(COUNT(adjusted) = 0, "", (AVERAGE(adjusted) − 1) × 25) on every input sheet.
 * Items not supplied are excluded from the mean, never counted as zero (Workbook Spec Part 15, note 2).
 */

import { CONVERSION, REVERSE_BASE, REVERSE_SCORED_ITEMS } from "./constants";
import { average, count, isNumber, type Cell } from "./excel";
import type { ItemCode, ItemMeans } from "./types";

/** The adjusted mean for one item: flipped when the item is reverse-scored, blank when absent. */
export function adjustItem(code: ItemCode, mean: Cell): Cell {
  if (!isNumber(mean)) return undefined;
  return REVERSE_SCORED_ITEMS.has(code) ? REVERSE_BASE - mean : mean;
}

/** The adjusted means for a group of items, in the group's sheet order. */
export function adjustItems<K extends ItemCode>(
  codes: readonly K[],
  items: ItemMeans<K> | undefined,
): Cell[] {
  return codes.map((code) => adjustItem(code, items?.[code]));
}

/** (mean − 1) × 25. A mean of 1 gives 0; a mean of 5 gives 100. */
export function convertMean(mean: number): number {
  return (mean - CONVERSION.offset) * CONVERSION.scale;
}

/** The score cell for a group of items: blank when no item is numeric, else the converted average of the adjusted means. */
export function scoreItems<K extends ItemCode>(
  codes: readonly K[],
  items: ItemMeans<K> | undefined,
): Cell {
  const adjusted = adjustItems(codes, items);
  if (count(adjusted) === 0) return undefined;
  const mean = average(adjusted);
  return mean === undefined ? undefined : convertMean(mean);
}
