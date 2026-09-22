/**
 * Motivation Inputs sheet: M1 to M4 and the three trip-wires.
 */

import { TRIP_WIRE_FLAG, TRIP_WIRE_THRESHOLD } from "./constants";
import { isNumber, lt, type Cell } from "./excel";
import { convertMean, scoreItems } from "./survey";
import {
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  TRIP_WIRE_CODES,
  type ItemMeans,
  type Mi1Item,
  type Mi2Item,
  type Mi3Item,
  type Mi4Item,
  type TripWireCode,
  type TripWireResult,
} from "./types";

/** Motivation Inputs D17: the MI-1 module score (Tier 3 path). */
export function scoreM1Tier3(items: ItemMeans<Mi1Item> | undefined): Cell {
  return scoreItems(MI1_ITEMS, items);
}

/** D29. */
export function scoreM2(items: ItemMeans<Mi2Item> | undefined): Cell {
  return scoreItems(MI2_ITEMS, items);
}

/** D39. */
export function scoreM3(items: ItemMeans<Mi3Item> | undefined): Cell {
  return scoreItems(MI3_ITEMS, items);
}

/** D48. */
export function scoreM4(items: ItemMeans<Mi4Item> | undefined): Cell {
  return scoreItems(MI4_ITEMS, items);
}

/**
 * One trip-wire: C = (mean − 1) × 25; D = "CRITICAL FINDING" when the score is below 60.
 * Motivation Inputs C52:D54. Measurement Reference 8.4. Outside P.
 */
export function scoreTripWire(mean: Cell): TripWireResult {
  if (!isNumber(mean)) return { score: undefined, flag: "" };
  const score = convertMean(mean);
  return { score, flag: lt(score, TRIP_WIRE_THRESHOLD) ? TRIP_WIRE_FLAG : "" };
}

export function scoreTripWires(
  means: Partial<Record<TripWireCode, number>> | undefined,
): Record<TripWireCode, TripWireResult> {
  const out = {} as Record<TripWireCode, TripWireResult>;
  for (const code of TRIP_WIRE_CODES) out[code] = scoreTripWire(means?.[code]);
  return out;
}
