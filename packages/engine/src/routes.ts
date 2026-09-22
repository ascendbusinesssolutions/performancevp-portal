/**
 * Tier Assignment: the route selectors that choose a sub-dimension's active path. Only C1, C5
 * and M1 route on the selector; every other selector affects confidence and the tier counts only.
 * Confidence bands and the tier mix are added in step 7.
 */

import { isNumber, type Cell } from "./excel";
import type { Route } from "./types";

/** An unset selector reads the same as "Insufficient data" (Workbook Spec 1.8). */
export function isInsufficient(tier: Route | undefined): boolean {
  return tier === undefined || tier === "Insufficient data";
}

/** Capability Inputs D15: Tier 3 takes the module score; unset or Insufficient gives blank; otherwise the table. */
export function routeC1(tier: Route | undefined, tableScore: Cell, moduleScore: Cell): Cell {
  if (tier === "Tier 3") return isNumber(moduleScore) ? moduleScore : undefined;
  if (isInsufficient(tier)) return undefined;
  return tableScore;
}

/** Capability Inputs D63: unset or Insufficient gives blank; Tier 3 takes the module score; otherwise the blend. */
export function routeC5(tier: Route | undefined, blendScore: Cell, moduleScore: Cell): Cell {
  if (isInsufficient(tier)) return undefined;
  if (tier === "Tier 3") return isNumber(moduleScore) ? moduleScore : undefined;
  return blendScore;
}

/** Motivation Inputs D19: unset or Insufficient gives blank; Tier 3 takes the item score; otherwise the platform composite. */
export function routeM1(tier: Route | undefined, tier3Score: Cell, platformComposite: Cell): Cell {
  if (isInsufficient(tier)) return undefined;
  if (tier === "Tier 3") return tier3Score;
  return isNumber(platformComposite) ? platformComposite : undefined;
}
