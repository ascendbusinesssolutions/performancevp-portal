/**
 * The inflation guard (Online Measurement Specification 4.4). C1 and C2: where more than 50% of
 * the unit's ratings are 4 or 5, a 7.5-point deduction, recorded but not applied until the
 * Diagnostic Workbook gains its adjustment cells (decision 1, 22 September 2026); the footer
 * says so. C3: the Band 5 cap and the band transfer are count-level and applied by the C3
 * module; the guard records them as applied. Scores floor at 0 wherever a deduction lands.
 */

import { INFLATION_GUARD } from "./constants";
import { gt } from "./excel";
import type { C3Result } from "./modules/c3-mgr";
import type { Adjustment } from "./types";

export interface DistributionCheck {
  ratings: number;
  highShare: number | undefined;
  fired: boolean;
}

export function highRatingShare(ratings: readonly number[]): DistributionCheck {
  if (ratings.length === 0) return { ratings: 0, highShare: undefined, fired: false };
  const high = ratings.filter((r) => r >= INFLATION_GUARD.highRatingFrom).length;
  const highShare = high / ratings.length;
  return {
    ratings: ratings.length,
    highShare,
    fired: gt(highShare, INFLATION_GUARD.highShareTrigger),
  };
}

export const DEDUCTION_NOTE =
  "Recorded, not applied: the Diagnostic Workbook has no adjustment cell for this sub-dimension yet (workbook pass pending).";

/** The C1 or C2 deduction, recorded with applied: false. Returns nothing when the guard does not fire. */
export function ratingDeduction(
  subDimension: "C1" | "C2",
  ratings: readonly number[],
): Adjustment | undefined {
  const check = highRatingShare(ratings);
  if (!check.fired) return undefined;
  return {
    subDimension,
    rule: `More than 50% of ${subDimension === "C1" ? "skill" : "knowledge"} ratings at 4 or 5 (${(
      (check.highShare ?? 0) * 100
    ).toFixed(1)}% of ${check.ratings})`,
    amount: INFLATION_GUARD.deductionPoints,
    applied: false,
    note: DEDUCTION_NOTE,
  };
}

/** The C3 adjustments the module applied, for the footer. */
export function c3Adjustments(c3: C3Result): Adjustment[] {
  const out: Adjustment[] = [];
  if (c3.capApplied) {
    out.push({
      subDimension: "C3",
      rule: "Band 5 above 25% of rated: capped, excess to Band 4",
      amount: c3.raw[4] - c3.capped[4],
      applied: true,
      note: `Band 5 count ${c3.raw[4]} of ${c3.total} capped at ${c3.capped[4]}.`,
    });
  }
  if (c3.skewApplied) {
    out.push({
      subDimension: "C3",
      rule: "Mean band above 3.5 after the cap: 20% of each band moved down one band",
      amount: 0.2,
      applied: true,
      note: `Mean band ${(c3.cappedMean ?? 0).toFixed(2)} after the cap.`,
    });
  }
  return out;
}
