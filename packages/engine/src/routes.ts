/**
 * Tier Assignment: the route selectors that choose a sub-dimension's active path (only C1, C5 and
 * M1 route on the selector), the confidence bands, P confidence and the tier mix.
 */

import {
  CONFIDENCE_THRESHOLDS,
  P_CONFIDENCE_ROWS,
  TIER_MIX_RATINGS,
  TIER_MIX_ROWS,
} from "./constants";
import { datedifMonths, isExcelError, isNumber, min, type Cell } from "./excel";
import {
  ROUTE_ROWS,
  type ConfidenceBand,
  type IsoDate,
  type Route,
  type RouteAssignment,
  type RouteRow,
} from "./types";

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

// ---------------------------------------------------------------------------------------------
// Confidence bands (Tier Assignment E), P confidence (Composite Scoring B51), tier mix
// ---------------------------------------------------------------------------------------------

/**
 * Tier Assignment E: "n/a" when the route is unset or Insufficient; "Low" when either date is
 * missing; else DATEDIF in complete months against the row's thresholds, High then Medium then
 * Low; "-" where DATEDIF errors (vintage after the engagement date). Cadence Master Part 7.
 */
export function confidenceBand(
  row: RouteRow,
  assignment: RouteAssignment | undefined,
  engagementDate: IsoDate | undefined,
): ConfidenceBand {
  if (isInsufficient(assignment?.tier)) return "n/a";
  const vintage = assignment?.vintage;
  if (vintage === undefined || engagementDate === undefined) return "Low";
  const months = datedifMonths(vintage, engagementDate);
  if (isExcelError(months)) return "-";
  const thresholds = CONFIDENCE_THRESHOLDS[row];
  if (months <= thresholds.high) return "High";
  if (months <= thresholds.medium) return "Medium";
  return "Low";
}

export function confidenceBands(
  routes: Partial<Record<RouteRow, RouteAssignment>> | undefined,
  engagementDate: IsoDate | undefined,
): Record<RouteRow, ConfidenceBand> {
  const out = {} as Record<RouteRow, ConfidenceBand>;
  for (const row of ROUTE_ROWS) out[row] = confidenceBand(row, routes?.[row], engagementDate);
  return out;
}

/**
 * Composite Scoring B51: blank when P is blank; otherwise the minimum over the seventeen
 * sub-dimension bands, mapping Low to 1, Medium to 2 and anything else (High, "n/a", "-") to 3.
 * An unmeasured sub-dimension therefore never lowers P confidence. Mirrored as written.
 */
export function pConfidence(bands: Record<RouteRow, ConfidenceBand>, P: Cell): ConfidenceBand | "" {
  if (!isNumber(P)) return "";
  const rank = (band: ConfidenceBand): number => (band === "Low" ? 1 : band === "Medium" ? 2 : 3);
  const lowest = min(P_CONFIDENCE_ROWS.map((row) => rank(bands[row])));
  return lowest === 1 ? "Low" : lowest === 2 ? "Medium" : "High";
}

export interface TierMix {
  tier1: number;
  tier2: number;
  tier3: number;
  /** Methodology Footer C13. */
  rating: string;
}

/** Methodology Footer C10:C13: COUNTIF over Tier Assignment B5:B24 (DLP excluded). */
export function tierMix(routes: Partial<Record<RouteRow, RouteAssignment>> | undefined): TierMix {
  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  for (const row of TIER_MIX_ROWS) {
    const tier = routes?.[row]?.tier;
    if (tier === "Tier 1") tier1 += 1;
    else if (tier === "Tier 2") tier2 += 1;
    else if (tier === "Tier 3") tier3 += 1;
  }
  let rating: string;
  if (tier3 > tier1 + tier2) rating = TIER_MIX_RATINGS.tier3Dominant;
  else if (tier1 >= tier2 + tier3) rating = TIER_MIX_RATINGS.tier1Dominant;
  else rating = TIER_MIX_RATINGS.mixed;
  return { tier1, tier2, tier3, rating };
}
