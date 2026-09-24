import { constants } from "@performancevp/intake";

/**
 * Whether a role family's skills and a unit's context are complete, by the setup counts in the
 * intake package (constants.SETUP, from the Online Measurement Specification). Pure, so the context
 * screens and the readiness check judge by the same rules, and unit-tested.
 */

const SETUP = constants.SETUP;

export interface SkillRow {
  id: string;
  role_family_id: string;
  name: string;
  is_critical: boolean;
  kind: string;
  status: string;
}

export type FamilyProblem =
  | { kind: "tooFew"; n: number; min: number }
  | { kind: "tooMany"; n: number; max: number }
  | { kind: "noCritical" }
  | { kind: "noTechnical" }
  | { kind: "noBehavioural" };

/** What stops a role family's skills being complete: 8 to 15 active skills, both kinds, one critical. */
export function familyProblems(familyId: string, skills: readonly SkillRow[]): FamilyProblem[] {
  const active = skills.filter((s) => s.role_family_id === familyId && s.status === "active");
  const problems: FamilyProblem[] = [];
  const { min, max } = SETUP.skillsPerRoleFamily;
  if (active.length < min) problems.push({ kind: "tooFew", n: active.length, min });
  if (active.length > max) problems.push({ kind: "tooMany", n: active.length, max });
  if (!active.some((s) => s.is_critical)) problems.push({ kind: "noCritical" });
  if (!active.some((s) => s.kind === "technical")) problems.push({ kind: "noTechnical" });
  if (!active.some((s) => s.kind === "behavioural")) problems.push({ kind: "noBehavioural" });
  return problems;
}

export interface NamedRow {
  id: string;
  measurement_unit_id: string;
  name: string;
  status: string;
}

export interface DomainRow extends NamedRow {
  criticality: number;
}

export interface UnitContextCounts {
  domains: number;
  criticalDomains: number;
  decisions: number;
  processes: number;
  systems: number;
}

/** A measurement unit's context against the setup counts (context belongs to measurement units). */
export function contextCounts(
  measurementUnitId: string,
  rows: {
    domains: readonly DomainRow[];
    decisions: readonly NamedRow[];
    processes: readonly NamedRow[];
    systems: readonly NamedRow[];
  },
): UnitContextCounts {
  const active = <R extends NamedRow>(list: readonly R[]) =>
    list.filter((r) => r.measurement_unit_id === measurementUnitId && r.status === "active");
  const domains = active(rows.domains);
  return {
    domains: domains.length,
    criticalDomains: domains.filter((d) => d.criticality === SETUP.criticalDomainCriticality)
      .length,
    decisions: active(rows.decisions).length,
    processes: active(rows.processes).length,
    systems: active(rows.systems).length,
  };
}

export type ContextPart = "domains" | "decisions" | "processes" | "systems";

function within(n: number, range: { min: number; max: number }): boolean {
  return n >= range.min && n <= range.max;
}

/** Which parts of a unit's context are incomplete (blockers). */
export function incompleteParts(counts: UnitContextCounts): ContextPart[] {
  const parts: ContextPart[] = [];
  if (!within(counts.domains, SETUP.knowledgeDomainsPerUnit)) parts.push("domains");
  if (!within(counts.decisions, SETUP.decisionTypesPerUnit)) parts.push("decisions");
  if (counts.processes !== SETUP.criticalProcessesPerUnit) parts.push("processes");
  if (!within(counts.systems, SETUP.primarySystemsPerUnit)) parts.push("systems");
  return parts;
}

/** Whether a unit with knowledge domains has none marked critical (a warning: C2 cannot score). */
export function lacksCriticalDomain(counts: UnitContextCounts): boolean {
  return counts.domains > 0 && counts.criticalDomains === 0;
}
