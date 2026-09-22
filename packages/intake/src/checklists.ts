/**
 * The administrator checklists (Online Measurement Specification 4.2, 4.3, 4.3a): ADM-O1 role
 * architecture, ADM-O2 tools and integration, ADM-O4 capacity facts. Each yields the structural
 * layer score the engine takes unaltered. No workbook cell scores these; the Part 4 worked
 * examples are their fixtures.
 */

import { ADM_O2, ADM_O4 } from "./constants";
import { roleFamilyFte } from "./directory";
import { average, isNumber, type Cell } from "./excel";
import type { AdmO1Response, AdmO2Response, AdmO4Response, RoleFamily, Snapshot } from "./types";

export interface AdmO1Result {
  families: Array<{ roleFamilyId: string; name: string; yes: number; score: number; fte: number }>;
  /** FTE-weighted mean of the family scores; blank when the answered families carry no FTE. */
  score: Cell;
}

/** (Yes count / 3) × 100 per role family answered, FTE-weighted over those families. */
export function scoreAdmO1(
  responses: readonly AdmO1Response[] | undefined,
  families: readonly RoleFamily[],
  snapshot: Snapshot,
): AdmO1Result {
  const rows = (responses ?? []).flatMap((response) => {
    const family = families.find((f) => f.id === response.roleFamilyId);
    if (family === undefined) return [];
    const yes = [response.ra1, response.ra2, response.ra3].filter(Boolean).length;
    return [
      {
        roleFamilyId: family.id,
        name: family.name,
        yes,
        score: (yes / 3) * 100,
        fte: roleFamilyFte(snapshot, family.id),
      },
    ];
  });
  let weighted = 0;
  let fteTotal = 0;
  for (const row of rows) {
    weighted += row.score * row.fte;
    fteTotal += row.fte;
  }
  return { families: rows, score: fteTotal === 0 ? undefined : weighted / fteTotal };
}

export interface AdmO2Result {
  systems: Array<{
    systemId: string;
    /** mean(TI-1, TI-2, TI-3). */
    inventory: number;
    /** INT-1 value; blank when excluded. */
    integration: number | undefined;
  }>;
  toolInventoryScore: Cell;
  integrationScore: Cell;
}

/** Tool inventory: mean across systems of mean(TI-1, TI-2, TI-3) × 100. Integration: mean of INT-1 over systems not excluded. */
export function scoreAdmO2(responses: readonly AdmO2Response[] | undefined): AdmO2Result {
  const systems = (responses ?? []).map((r) => ({
    systemId: r.systemId,
    inventory: ((r.ti1 ? 1 : 0) + (r.ti2 ? 1 : 0) + ADM_O2.ti3[r.ti3]) / 3,
    integration: r.int1 === "excluded" ? undefined : ADM_O2.int1[r.int1],
  }));
  const inventory = average(systems.map((s) => s.inventory));
  return {
    systems,
    toolInventoryScore: inventory === undefined ? undefined : inventory * 100,
    integrationScore: average(systems.map((s) => s.integration)),
  };
}

export interface AdmO4Result {
  facts: Array<{ id: "CF-1" | "CF-2" | "CF-3" | "CF-4" | "CF-5"; value: number; score: number }>;
  /** Mean of the facts entered, blank with fewer than three. */
  score: Cell;
}

/** Each fact banded, a boundary value taking the higher-scoring band; the mean of at least three. */
export function scoreAdmO4(response: AdmO4Response | undefined): AdmO4Result {
  const facts: AdmO4Result["facts"] = [];
  if (response !== undefined) {
    if (isNumber(response.utilisationPercent)) {
      facts.push({
        id: "CF-1",
        value: response.utilisationPercent,
        score: ADM_O4.utilisation(response.utilisationPercent),
      });
    }
    if (isNumber(response.overtimeHoursPerFte)) {
      facts.push({
        id: "CF-2",
        value: response.overtimeHoursPerFte,
        score: ADM_O4.overtime(response.overtimeHoursPerFte),
      });
    }
    if (isNumber(response.absenceAboveBaselinePercent)) {
      facts.push({
        id: "CF-3",
        value: response.absenceAboveBaselinePercent,
        score: ADM_O4.absence(response.absenceAboveBaselinePercent),
      });
    }
    if (isNumber(response.backlogChangePercent)) {
      facts.push({
        id: "CF-4",
        value: response.backlogChangePercent,
        score: ADM_O4.backlog(response.backlogChangePercent),
      });
    }
    if (isNumber(response.vacancyRatePercent)) {
      facts.push({
        id: "CF-5",
        value: response.vacancyRatePercent,
        score: ADM_O4.vacancy(response.vacancyRatePercent),
      });
    }
  }
  return {
    facts,
    score: facts.length < ADM_O4.minimumFacts ? undefined : average(facts.map((f) => f.score)),
  };
}
