/**
 * The C3 route (Online Measurement Specification 6.4; Measurement Reference 2.3). Formal
 * performance ratings are used when they are dated within the 12 months before launch, map onto
 * the five bands, and cover at least 80% of the unit's FTE; otherwise the M-C3-MGR band counts
 * stand. Declared calibrated with the top band at or below 25% and the bottom band at or above
 * 5%: used as they stand. Anything else: the top band capped at 15% with the excess to Band 4
 * and confidence capped at Medium, which the route record carries until the Diagnostic Workbook
 * gains a confidence cap (decision 2, 22 September 2026). C3's measurement date on the formal
 * route is the earliest current rating date used, so confidence decays from the oldest data.
 */

import { FORMAL_RATINGS, THRESHOLDS } from "./constants";
import { sumFte, unitFte } from "./directory";
import { ge, gt, le, minusMonths, onOrBefore } from "./excel";
import type { BandCounts, C3Result } from "./modules/c3-mgr";
import type { C3RouteRecord, FormalRatings, Snapshot } from "./types";

export interface FormalRatingsResult {
  /** Members with a current, mapped rating. */
  ratedCount: number;
  ratedFte: number;
  coverage: number | undefined;
  earliestDate: string | undefined;
  raw: BandCounts;
  final: BandCounts;
  treatment: "as-declared" | "uncalibrated-capped";
  qualifies: boolean;
  /** Why the route does not apply, when it does not. */
  reason: string | undefined;
}

/** Within the 12 months before launch: on or after the same day twelve months earlier, and not after launch. */
export function isCurrent(ratingDate: string, launchDate: string): boolean {
  const cutoff = minusMonths(launchDate, FORMAL_RATINGS.currencyMonths);
  return onOrBefore(cutoff, ratingDate) && onOrBefore(ratingDate, launchDate);
}

export function evaluateFormalRatings(
  formal: FormalRatings | undefined,
  snapshot: Snapshot,
  launchDate: string,
): FormalRatingsResult | undefined {
  if (formal === undefined) return undefined;
  const bandOf = new Map(formal.scaleMap.map((entry) => [entry.label, entry.band]));
  const raw: BandCounts = [0, 0, 0, 0, 0];
  const rated = snapshot.members.filter((m) => {
    const rating = m.formalRating;
    if (rating === undefined) return false;
    const band = bandOf.get(rating.label);
    return band !== undefined && isCurrent(rating.date, launchDate);
  });
  let earliest: string | undefined;
  for (const m of rated) {
    const rating = m.formalRating as { label: string; date: string };
    const band = bandOf.get(rating.label) as 1 | 2 | 3 | 4 | 5;
    raw[band - 1] = (raw[band - 1] as number) + 1;
    if (earliest === undefined || onOrBefore(rating.date, earliest)) earliest = rating.date;
  }
  const fte = unitFte(snapshot);
  const ratedFte = sumFte(rated);
  const coverage = fte === 0 ? undefined : ratedFte / fte;
  const total = rated.length;
  const topShare = total === 0 ? 0 : raw[4] / total;
  const bottomShare = total === 0 ? 0 : raw[0] / total;
  const asDeclared =
    formal.calibrated &&
    le(topShare, FORMAL_RATINGS.calibratedTopBandMax) &&
    ge(bottomShare, FORMAL_RATINGS.calibratedBottomBandMin);
  let final: BandCounts = [...raw];
  if (!asDeclared && total > 0) {
    const cap = FORMAL_RATINGS.uncalibratedTopBandCap * total;
    if (gt(raw[4], cap)) final = [raw[0], raw[1], raw[2], raw[3] + (raw[4] - cap), cap];
  }
  const qualifies = coverage !== undefined && ge(coverage, THRESHOLDS.c3FteRated) && total > 0;
  return {
    ratedCount: total,
    ratedFte,
    coverage,
    earliestDate: earliest,
    raw,
    final,
    treatment: asDeclared ? "as-declared" : "uncalibrated-capped",
    qualifies,
    reason: qualifies
      ? undefined
      : total === 0
        ? "No current formal rating maps onto the five bands."
        : `Current formal ratings cover ${((coverage ?? 0) * 100).toFixed(1)}% of unit FTE, below 80%.`,
  };
}

export interface C3Selection {
  record: C3RouteRecord;
  /** The band counts for the engine, in band order 1 to 5; undefined when nothing is available. */
  bands: BandCounts | undefined;
  /** Rated FTE over in-scope FTE on the chosen route. */
  coverage: number | undefined;
}

/** Route (a) where the formal ratings qualify, otherwise the module's counts, otherwise none. */
export function selectC3Route(
  formal: FormalRatingsResult | undefined,
  module: C3Result,
  moduleRatedFte: number,
  snapshot: Snapshot,
): C3Selection {
  if (formal?.qualifies === true) {
    return {
      record: {
        source: "formal",
        ratingDate: formal.earliestDate,
        coverage: formal.coverage,
        treatment: formal.treatment,
        confidenceCap:
          formal.treatment === "uncalibrated-capped" ? FORMAL_RATINGS.confidenceCap : undefined,
      },
      bands: formal.final,
      coverage: formal.coverage,
    };
  }
  if (module.total > 0) {
    const fte = unitFte(snapshot);
    const coverage = fte === 0 ? undefined : moduleRatedFte / fte;
    return {
      record: {
        source: "module",
        ratingDate: undefined,
        coverage,
        treatment: "module",
        confidenceCap: undefined,
      },
      bands: module.final,
      coverage,
    };
  }
  return {
    record: {
      source: "none",
      ratingDate: undefined,
      coverage: undefined,
      treatment: "none",
      confidenceCap: undefined,
    },
    bands: undefined,
    coverage: undefined,
  };
}
