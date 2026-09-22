/**
 * M-C1-MGR, the manager skills rating: 3 Import Manager (one row per rated direct report, with
 * the coverage helper T and the new-manager flag U) and 9 Type C Scoring rows 52 to 65.
 *
 * A rated person's coverage is the count of framework skills rated at or above the proficiency
 * threshold over the framework's skill count (blank without a role family). A role family's
 * coverage is the mean over its rated people, times 100; the unit score is the FTE-weighted mean
 * across the families named in Setup, plus the audit-sample adjustment, which is 0 online. The
 * manager response rate is distinct raters over the manager headcount, flagged below 70%.
 *
 * The workbook's SUMPRODUCT treats a family with FTE but no ratings as scoring 0, which pulls
 * the unit score down; the mirror does the same. Online, C1 reaches the engine as Type B rows
 * built from the same per-person coverage (assemble.ts), not as this finished score.
 */

import { C1_PROFICIENCY_THRESHOLD, THRESHOLDS } from "../constants";
import { roleFamilyFte } from "../directory";
import { average, ge, isNumber, lt, type Cell } from "../excel";
import type { Ratings, RoleFamily, Snapshot } from "../types";

/** One import row: a manager's ratings of one direct report. */
export interface ManagerRow {
  managerRef: string;
  employeeRef: string;
  roleFamilyId: string | undefined;
  /** Ratings in the family's framework order; blank where the skill was not rated. */
  skills: Cell[];
  band: number | undefined;
  /** T: proficient skills over the framework's skill count; blank without a family. */
  coverage: Cell;
  /** U: 1 on a manager's first row. */
  newManager: 0 | 1;
}

export interface FamilyCoverage {
  roleFamilyId: string;
  name: string;
  /** B: the mean of the family's rated people's coverage. */
  coverage: Cell;
  /** C: × 100. */
  score: Cell;
  /** D: the family's FTE from the snapshot. */
  fte: number;
}

export interface C1Result {
  rows: ManagerRow[];
  families: FamilyCoverage[];
  distinctManagers: number;
  responseRate: Cell;
  /** "LOW manager response" below 70%, "ok" otherwise, blank without a rate. */
  rateFlag: string | undefined;
  /** B62: 0 online. */
  auditAdjustment: number;
  /** B65: FTE-weighted mean across families plus the adjustment; blank without family FTE. */
  score: Cell;
}

/**
 * The import rows, one per (manager, direct report) pair in order of first appearance across the
 * skill ratings and then the talent bands.
 */
export function managerRows(
  ratings: Ratings | undefined,
  families: readonly RoleFamily[],
  snapshot: Snapshot,
): ManagerRow[] {
  const order: string[] = [];
  const pairs = new Map<string, { managerRef: string; employeeRef: string }>();
  const note = (managerRef: string, employeeRef: string): void => {
    const key = `${managerRef}\u0000${employeeRef}`;
    if (!pairs.has(key)) {
      pairs.set(key, { managerRef, employeeRef });
      order.push(key);
    }
  };
  for (const s of ratings?.skills ?? []) note(s.managerRef, s.employeeRef);
  for (const b of ratings?.talentBands ?? []) note(b.managerRef, b.employeeRef);

  const seenManagers = new Set<string>();
  return order.map((key) => {
    const { managerRef, employeeRef } = pairs.get(key) as {
      managerRef: string;
      employeeRef: string;
    };
    const member = snapshot.members.find((m) => m.employeeRef === employeeRef);
    const family = families.find((f) => f.id === member?.roleFamilyId);
    const skills: Cell[] = (family?.skills ?? []).map((skill) => {
      const rating = ratings?.skills?.find(
        (s) =>
          s.managerRef === managerRef && s.employeeRef === employeeRef && s.skillId === skill.id,
      );
      return rating?.rating;
    });
    const band = ratings?.talentBands?.find(
      (b) => b.managerRef === managerRef && b.employeeRef === employeeRef,
    )?.band;
    let coverage: Cell;
    if (family !== undefined && family.skills.length > 0) {
      let proficient = 0;
      for (const s of skills) if (isNumber(s) && ge(s, C1_PROFICIENCY_THRESHOLD)) proficient += 1;
      coverage = proficient / family.skills.length;
    }
    const newManager = seenManagers.has(managerRef) ? 0 : 1;
    seenManagers.add(managerRef);
    return {
      managerRef,
      employeeRef,
      roleFamilyId: family?.id,
      skills,
      band,
      coverage,
      newManager,
    };
  });
}

export function scoreC1(
  rows: readonly ManagerRow[],
  families: readonly RoleFamily[],
  snapshot: Snapshot,
  managerHeadcount: number | undefined,
): C1Result {
  const familyRows: FamilyCoverage[] = families.map((family) => {
    const coverage = average(
      rows.filter((r) => r.roleFamilyId === family.id).map((r) => r.coverage),
    );
    return {
      roleFamilyId: family.id,
      name: family.name,
      coverage,
      score: coverage === undefined ? undefined : coverage * 100,
      fte: roleFamilyFte(snapshot, family.id),
    };
  });
  const distinctManagers = new Set(rows.map((r) => r.managerRef)).size;
  const responseRate =
    managerHeadcount === undefined || managerHeadcount === 0
      ? undefined
      : distinctManagers / managerHeadcount;
  const auditAdjustment = 0;
  let weighted = 0;
  let fteTotal = 0;
  for (const f of familyRows) {
    weighted += (f.score ?? 0) * f.fte;
    fteTotal += f.fte;
  }
  return {
    rows: [...rows],
    families: familyRows,
    distinctManagers,
    responseRate,
    rateFlag:
      responseRate === undefined
        ? undefined
        : lt(responseRate, THRESHOLDS.managers)
          ? "LOW manager response"
          : "ok",
    auditAdjustment,
    score: fteTotal === 0 ? undefined : weighted / fteTotal + auditAdjustment,
  };
}
