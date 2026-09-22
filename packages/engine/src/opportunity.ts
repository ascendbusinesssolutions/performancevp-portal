/**
 * Opportunity Inputs sheet: the perception layers and O5. Structural layers, the two-layer
 * combination and O4 follow in step 4.
 */

import { isNumber, sum, type Cell } from "./excel";
import { scoreItems } from "./survey";
import {
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  type ItemMeans,
  type Oi1Item,
  type Oi2Item,
  type Oi3Item,
  type Oi4Item,
  type TeamInput,
} from "./types";

/** Opportunity Inputs D20. */
export function perceptionO1(items: ItemMeans<Oi1Item> | undefined): Cell {
  return scoreItems(OI1_ITEMS, items);
}
/** D37. */
export function perceptionO2(items: ItemMeans<Oi2Item> | undefined): Cell {
  return scoreItems(OI2_ITEMS, items);
}
/** D53. */
export function perceptionO3(items: ItemMeans<Oi3Item> | undefined): Cell {
  return scoreItems(OI3_ITEMS, items);
}
/** D66. */
export function perceptionO4(items: ItemMeans<Oi4Item> | undefined): Cell {
  return scoreItems(OI4_ITEMS, items);
}

// ---------------------------------------------------------------------------------------------
// O5 Leadership enablement (per team, FTE-weighted): rows 71 to 74, D75
// ---------------------------------------------------------------------------------------------

export interface O5Result {
  /** D71:D74: FTE × score where both are numeric, else 0. */
  contributions: number[];
  /** D75: SUM(contributions) / SUMIF(score > 0, FTE); blank when that denominator is 0. */
  score: Cell;
}

/**
 * Measurement Reference 4.5. The denominator counts the FTE of teams whose score is above 0, so a
 * team scoring exactly 0 contributes nothing and leaves the denominator; mirrored as written.
 */
export function scoreO5(teams: readonly TeamInput[] | undefined): O5Result {
  const rows = teams ?? [];
  const contributions = rows.map((t) =>
    isNumber(t.fte) && isNumber(t.score) ? t.fte * t.score : 0,
  );
  let denominator = 0;
  for (const t of rows)
    if (isNumber(t.score) && t.score > 0 && isNumber(t.fte)) denominator += t.fte;
  if (denominator === 0) return { contributions, score: undefined };
  return { contributions, score: sum(contributions) / denominator };
}
