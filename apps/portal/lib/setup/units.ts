import { constants } from "@performancevp/intake";

/**
 * The unit structure as the setup screens show it: a tree in reading order, which units are
 * measured, and who could lead each unit. Pure, so it is unit-tested; the database enforces the
 * same rules (no unit below itself, a leader who is an active member of the unit).
 */

/** Unit types (Measurement Reference Part 2, 7.1); the type chooses the decision-type starter list. */
export const UNIT_TYPES = [
  "operations",
  "sales",
  "technology",
  "support_functions",
  "professional_services",
  "research_and_development",
  "other",
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export function asUnitType(value: string | null | undefined): UnitType | null {
  return UNIT_TYPES.find((t) => t === value) ?? null;
}

export interface UnitRow {
  id: string;
  unit_code: string;
  name: string;
  parent_unit_id: string | null;
  unit_type: string | null;
  status: string;
  unit_leader_employee_id: string | null;
}

/** The part of a unit the hierarchy rules read. */
export type UnitLink = Pick<UnitRow, "id" | "parent_unit_id" | "status">;

export interface PersonRef {
  id: string;
  unit_id: string;
  manager_employee_id: string | null;
  first_name: string;
  last_name: string;
}

export interface TreeEntry<U extends UnitRow = UnitRow> {
  unit: U;
  depth: number;
}

function byName<U extends UnitRow>(a: U, b: U): number {
  return a.name.localeCompare(b.name, "en-AU") || a.unit_code.localeCompare(b.unit_code, "en-AU");
}

/**
 * Active units as an indented tree: each unit followed by the units below it, siblings by name. A
 * unit whose parent is not active (retired, or missing) is placed at the top level.
 */
export function unitTree<U extends UnitRow>(units: readonly U[]): TreeEntry<U>[] {
  const active = units.filter((u) => u.status === "active");
  const ids = new Set(active.map((u) => u.id));
  const children = new Map<string | null, U[]>();
  for (const unit of active) {
    const parent = unit.parent_unit_id && ids.has(unit.parent_unit_id) ? unit.parent_unit_id : null;
    children.set(parent, [...(children.get(parent) ?? []), unit]);
  }
  const out: TreeEntry<U>[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const unit of [...(children.get(parent) ?? [])].sort(byName)) {
      if (seen.has(unit.id)) continue;
      seen.add(unit.id);
      out.push({ unit, depth });
      walk(unit.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** A unit and every active unit below it. */
export function descendantIds(units: readonly UnitRow[], unitId: string): Set<string> {
  const found = new Set<string>([unitId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of units) {
      if (u.parent_unit_id && found.has(u.parent_unit_id) && !found.has(u.id)) {
        found.add(u.id);
        grew = true;
      }
    }
  }
  return found;
}

/** The active units above a unit, nearest first. */
export function ancestorIds(units: readonly UnitLink[], unitId: string): string[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const out: string[] = [];
  let current = byId.get(unitId)?.parent_unit_id ?? null;
  while (current && !out.includes(current)) {
    const unit = byId.get(current);
    if (!unit || unit.status !== "active") break;
    out.push(current);
    current = unit.parent_unit_id;
  }
  return out;
}

/**
 * Who may be named leader of the given units (Online Measurement Specification 6.1): their active
 * members, then the members of the units above them, such as the executive their staff report to.
 * The database's leader_eligible holds the same rule.
 */
export function eligibleLeaders<P extends PersonRef>(
  units: readonly UnitLink[],
  unitIds: readonly string[],
  people: readonly P[],
): { inside: P[]; above: P[] } {
  const inside = new Set(unitIds);
  const above = new Set(
    unitIds.flatMap((id) => ancestorIds(units, id)).filter((id) => !inside.has(id)),
  );
  const byName = (a: P, b: P) => personName(a).localeCompare(personName(b), "en-AU");
  return {
    inside: people.filter((p) => inside.has(p.unit_id)).sort(byName),
    above: people.filter((p) => above.has(p.unit_id)).sort(byName),
  };
}

/** Whether a unit has active units below it. */
export function hasChildren(units: readonly UnitLink[], unitId: string): boolean {
  return units.some((u) => u.status === "active" && u.parent_unit_id === unitId);
}

/**
 * A grouping unit (Online Measurement Specification 6.2): a unit with active units below it and
 * fewer than 10 staff of its own, typically the head of the organisation and a small executive
 * group. It is not measured and does not block the first campaign. Its own staff are not surveyed
 * as members of any unit, though they still manage the people below them.
 */
export function isGroupingUnit(
  units: readonly UnitLink[],
  unitId: string,
  ownStaff: number,
): boolean {
  return ownStaff < constants.SETUP.minUnitStaff && hasChildren(units, unitId);
}

/**
 * Whether a campaign measures a unit: it has people of its own and is not a grouping unit. A unit
 * of 1 to 9 with nothing below it counts, so its context is set up while the readiness check
 * blocks on its size.
 */
export function isMeasuredUnit(
  units: readonly UnitLink[],
  unitId: string,
  ownStaff: number,
): boolean {
  return ownStaff > 0 && !isGroupingUnit(units, unitId, ownStaff);
}

/**
 * The people who could lead a unit by the default rule (decided 23 September 2026): active members
 * of the unit whose manager sits outside the unit, or who have no manager.
 */
export function leaderCandidates<P extends PersonRef>(unitId: string, people: readonly P[]): P[] {
  const members = people.filter((p) => p.unit_id === unitId);
  const memberIds = new Set(members.map((p) => p.id));
  return members.filter((p) => !p.manager_employee_id || !memberIds.has(p.manager_employee_id));
}

export type LeaderState<P extends PersonRef> =
  | { kind: "designated"; person: P | undefined }
  | { kind: "proposed"; person: P }
  | { kind: "none" }
  | { kind: "ambiguous"; candidates: P[] };

/**
 * A unit's leader: the designation where there is one; otherwise the single candidate, proposed
 * for the administrator to confirm; otherwise none, or several to choose between.
 */
export function leaderState<P extends PersonRef>(
  unit: UnitRow,
  people: readonly P[],
): LeaderState<P> {
  if (unit.unit_leader_employee_id) {
    return {
      kind: "designated",
      person: people.find((p) => p.id === unit.unit_leader_employee_id),
    };
  }
  const candidates = leaderCandidates(unit.id, people);
  if (candidates.length === 1) return { kind: "proposed", person: candidates[0]! };
  if (candidates.length === 0) return { kind: "none" };
  return { kind: "ambiguous", candidates };
}

export function personName(person: { first_name: string; last_name: string }): string {
  return `${person.first_name} ${person.last_name}`;
}
