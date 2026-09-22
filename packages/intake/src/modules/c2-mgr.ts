/**
 * M-C2-MGR, the manager knowledge rating (Online Measurement Specification 4.1). Per domain, the
 * mean rating across rated direct reports converted with (mean − 1) × 25, and coverage as the
 * rated FTE over the unit FTE. The engine weights the domains by criticality and applies the
 * coverage (Measurement Reference 2.2); the criticality-3 coverage gate is applied in thresholds.
 * No workbook cell scores this module; the Part 4 worked example is its fixture.
 */

import { sumFte, unitFte } from "../directory";
import { average, type Cell } from "../excel";
import { convertMean } from "../items";
import type { KnowledgeDomain, KnowledgeRating, Snapshot } from "../types";

export interface DomainResult {
  domainId: string;
  name: string;
  criticality: 1 | 2 | 3;
  ratedCount: number;
  meanRating: Cell;
  /** (mean rating − 1) × 25. */
  meanScore: Cell;
  ratedFte: number;
  /** Rated FTE over unit FTE; blank when the unit has no FTE. */
  coverage: Cell;
}

export interface C2Result {
  domains: DomainResult[];
  /** Distinct raters, for the manager response rate on this module. */
  distinctManagers: number;
  /** All knowledge ratings in the unit, for the inflation guard. */
  ratings: number[];
}

export function scoreC2(
  ratings: readonly KnowledgeRating[] | undefined,
  domains: readonly KnowledgeDomain[],
  snapshot: Snapshot,
): C2Result {
  const all = ratings ?? [];
  const fte = unitFte(snapshot);
  const result = domains.map((domain): DomainResult => {
    const rows = all.filter((r) => r.domainId === domain.id);
    // One rating per person per domain; a person rated twice counts once at their last rating.
    const byEmployee = new Map<string, number>();
    for (const r of rows) byEmployee.set(r.employeeRef, r.rating);
    const meanRating = average([...byEmployee.values()]);
    const rated = snapshot.members.filter((m) => byEmployee.has(m.employeeRef));
    const ratedFte = sumFte(rated);
    return {
      domainId: domain.id,
      name: domain.name,
      criticality: domain.criticality,
      ratedCount: byEmployee.size,
      meanRating,
      meanScore: meanRating === undefined ? undefined : convertMean(meanRating),
      ratedFte,
      coverage: fte === 0 ? undefined : ratedFte / fte,
    };
  });
  return {
    domains: result,
    distinctManagers: new Set(all.map((r) => r.managerRef)).size,
    ratings: all.map((r) => r.rating),
  };
}
