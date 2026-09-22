/**
 * S1 Skill complementarity from the M-C1-MGR ratings matrix (Online Measurement Specification
 * 3.4; Measurement Reference 5.1). Breadth: framework skills with at least one proficient member
 * over all framework skills. Depth: for each critical skill, proficient members over the target
 * depth of ceiling(unit FTE / 10), minimum 2, capped at 1; the mean across critical skills.
 * Distribution: 100 − Gini of proficient-skill counts per rated member × 100. The engine takes
 * the three components and applies 0.40 / 0.35 / 0.25. Needs skills data for 75% of unit FTE.
 */

import { C1_PROFICIENCY_THRESHOLD, S1_DEPTH, THRESHOLDS } from "./constants";
import { sumFte, unitFte } from "./directory";
import { ge, type Cell } from "./excel";
import type { RoleFamily, SkillRating, Snapshot } from "./types";

export interface S1Result {
  /** Members with at least one skill rating, as FTE over unit FTE. */
  ratedFte: number;
  dataCoverage: number | undefined;
  /** Skills data for at least 75% of FTE. */
  sufficient: boolean;
  frameworkSkills: number;
  coveredSkills: number;
  coverageBreadth: Cell;
  targetDepth: number;
  criticalSkills: Array<{
    skillId: string;
    name: string;
    proficient: number;
    depthCoverage: number;
  }>;
  coverageDepth: Cell;
  /** Proficient-skill counts per rated member, in snapshot order. */
  skillCounts: number[];
  gini: Cell;
  distribution: Cell;
  /** Critical skills with no proficient member, for the aggregates. */
  criticalSkillsUncovered: string[];
}

/** The Gini coefficient of a set of non-negative counts: mean absolute difference over twice the mean. 0 when all are equal or all are 0. */
export function gini(values: readonly number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  let total = 0;
  for (const v of values) total += v;
  if (total === 0) return 0;
  let differences = 0;
  for (const a of values) for (const b of values) differences += Math.abs(a - b);
  return differences / (2 * n * total);
}

export function scoreS1(
  ratings: readonly SkillRating[] | undefined,
  families: readonly RoleFamily[],
  snapshot: Snapshot,
): S1Result {
  const all = ratings ?? [];
  const fte = unitFte(snapshot);
  // The latest rating per (employee, skill), so a person rated twice counts once.
  const latest = new Map<string, number>();
  for (const r of all) latest.set(`${r.employeeRef}\u0000${r.skillId}`, r.rating);
  const ratedEmployees = new Set(all.map((r) => r.employeeRef));
  const ratedMembers = snapshot.members.filter((m) => ratedEmployees.has(m.employeeRef));
  const ratedFte = sumFte(ratedMembers);
  const dataCoverage = fte === 0 ? undefined : ratedFte / fte;

  const skills = families.flatMap((f) => f.skills);
  const proficientBySkill = new Map<string, number>();
  const countsByEmployee = new Map<string, number>();
  for (const m of ratedMembers) countsByEmployee.set(m.employeeRef, 0);
  for (const [key, rating] of latest) {
    if (!ge(rating, C1_PROFICIENCY_THRESHOLD)) continue;
    const [employeeRef, skillId] = key.split("\u0000") as [string, string];
    proficientBySkill.set(skillId, (proficientBySkill.get(skillId) ?? 0) + 1);
    if (countsByEmployee.has(employeeRef)) {
      countsByEmployee.set(employeeRef, (countsByEmployee.get(employeeRef) ?? 0) + 1);
    }
  }

  const coveredSkills = skills.filter((s) => (proficientBySkill.get(s.id) ?? 0) > 0).length;
  const coverageBreadth = skills.length === 0 ? undefined : (coveredSkills / skills.length) * 100;

  const targetDepth = Math.max(S1_DEPTH.minimum, Math.ceil(fte / S1_DEPTH.perFte));
  const criticalSkills = skills
    .filter((s) => s.critical)
    .map((s) => {
      const proficient = proficientBySkill.get(s.id) ?? 0;
      return {
        skillId: s.id,
        name: s.name,
        proficient,
        depthCoverage: Math.min(proficient / targetDepth, 1),
      };
    });
  const coverageDepth =
    criticalSkills.length === 0
      ? undefined
      : (criticalSkills.reduce((sum, s) => sum + s.depthCoverage, 0) / criticalSkills.length) * 100;

  const skillCounts = ratedMembers.map((m) => countsByEmployee.get(m.employeeRef) ?? 0);
  const g = skillCounts.length === 0 ? undefined : gini(skillCounts);
  return {
    ratedFte,
    dataCoverage,
    sufficient: dataCoverage !== undefined && ge(dataCoverage, THRESHOLDS.s1FteCoverage),
    frameworkSkills: skills.length,
    coveredSkills,
    coverageBreadth,
    targetDepth,
    criticalSkills,
    coverageDepth,
    skillCounts,
    gini: g,
    distribution: g === undefined ? undefined : 100 - g * 100,
    criticalSkillsUncovered: criticalSkills.filter((s) => s.proficient === 0).map((s) => s.name),
  };
}
