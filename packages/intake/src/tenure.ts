/**
 * Median unit tenure in complete months at campaign launch, from directory start dates
 * (Online Measurement Specification 3.1). Complete months as DATEDIF "m" counts them, so the
 * engine's 18-month and 96-month edges read the same way. Members without a start date are left
 * out; with none, the moderator stays neutral.
 */

import { completeMonths, median, type Cell } from "./excel";
import type { Snapshot } from "./types";

export function medianTenureMonths(snapshot: Snapshot, launchDate: string): Cell {
  const months = snapshot.members
    .filter((m) => m.startDate !== undefined)
    .map((m) => Math.max(0, completeMonths(m.startDate as string, launchDate)));
  return median(months);
}
