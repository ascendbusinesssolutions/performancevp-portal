import { constants } from "@performancevp/intake";

import {
  isGroupingUnit,
  type LeaderState,
  leaderState,
  type PersonRef,
  unitTree,
  type UnitRow,
} from "./units";

/**
 * Measurement units as the setup screens and the readiness check see them (Online Measurement
 * Specification 6.2, "Combining small units for measurement"; Milestone 4b plan, Sections 1 to 4).
 * The directory keeps the org units as the HRIS has them; each belongs to one measurement unit, its
 * own single or a combination the administrator chose. Pure, so it is unit-tested; the database
 * holds tenancy, membership and the in-use rule, and these functions hold which units may combine
 * and what each measurement unit's state is.
 */

const MIN_STAFF = constants.SETUP.minUnitStaff;

export interface MeasurementUnitRow {
  id: string;
  code: string;
  name: string;
  kind: string;
  status: string;
  single_unit_id: string | null;
  unit_leader_employee_id: string | null;
  grouping_kept_at: string | null;
}

export interface MemberRow {
  measurement_unit_id: string;
  business_unit_id: string;
}

/**
 * - measured: 10 or more, a single or a combination.
 * - short: 1 to 9 with nothing below it (a single), or a combination under 10.
 * - empty: a single with no one in it and nothing below it.
 * - grouping: a single under 10 with units below it, not yet decided.
 * - groupingKept: the same, kept as a grouping unit by the administrator.
 */
export type MeasurementState = "measured" | "short" | "empty" | "grouping" | "groupingKept";

export interface MeasurementView<U extends UnitRow = UnitRow> {
  row: MeasurementUnitRow;
  /** The org units it holds now, in tree order. */
  units: U[];
  staff: number;
  state: MeasurementState;
  combined: boolean;
  /** The unit above all the others it holds (a single's own unit; a combination that rolls up). */
  top: U | null;
}

export interface MeasurementModel<U extends UnitRow = UnitRow> {
  /** Active measurement units holding at least one active unit, by name. */
  views: MeasurementView<U>[];
  /** Each active org unit's measurement unit now. */
  ofUnit: Map<string, MeasurementView<U>>;
  units: readonly U[];
}

/** The parent a unit sits under, or null at the top (a retired parent counts as the top). */
function parentOf(units: readonly UnitRow[], unit: UnitRow): string | null {
  const parent = unit.parent_unit_id;
  return parent && units.some((u) => u.id === parent && u.status === "active") ? parent : null;
}

function isAncestor(units: readonly UnitRow[], ancestorId: string, unit: UnitRow): boolean {
  const byId = new Map(units.map((u) => [u.id, u]));
  let current = parentOf(units, unit);
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    const next = byId.get(current);
    current = next ? parentOf(units, next) : null;
  }
  return false;
}

export function measurementModel<U extends UnitRow>(input: {
  units: readonly U[];
  measurementUnits: readonly MeasurementUnitRow[];
  members: readonly MemberRow[];
  people: ReadonlyArray<{ unit_id: string }>;
}): MeasurementModel<U> {
  const staffOf = new Map<string, number>();
  for (const p of input.people) staffOf.set(p.unit_id, (staffOf.get(p.unit_id) ?? 0) + 1);
  const order = new Map(unitTree(input.units).map((e, i) => [e.unit.id, i]));
  const unitById = new Map(input.units.filter((u) => u.status === "active").map((u) => [u.id, u]));

  const views: MeasurementView<U>[] = [];
  const ofUnit = new Map<string, MeasurementView<U>>();
  for (const row of input.measurementUnits) {
    if (row.status !== "active") continue;
    const units = input.members
      .filter((m) => m.measurement_unit_id === row.id)
      .map((m) => unitById.get(m.business_unit_id))
      .filter((u): u is U => u !== undefined)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    if (units.length === 0) continue;
    const combined = row.kind === "combined";
    const staff = units.reduce((n, u) => n + (staffOf.get(u.id) ?? 0), 0);
    let state: MeasurementState;
    if (combined) {
      state = staff >= MIN_STAFF ? "measured" : "short";
    } else if (isGroupingUnit(input.units, units[0]!.id, staff)) {
      state = row.grouping_kept_at ? "groupingKept" : "grouping";
    } else {
      state = staff >= MIN_STAFF ? "measured" : staff === 0 ? "empty" : "short";
    }
    const top = combined
      ? (units.find((t) => units.every((u) => u.id === t.id || isAncestor(input.units, t.id, u))) ??
        null)
      : units[0]!;
    const view: MeasurementView<U> = { row, units, staff, state, combined, top };
    views.push(view);
    for (const u of units) ofUnit.set(u.id, view);
  }
  views.sort(
    (a, b) =>
      a.row.name.localeCompare(b.row.name, "en-AU") ||
      a.row.code.localeCompare(b.row.code, "en-AU"),
  );
  return { views, ofUnit, units: input.units };
}

export function isGroupingState(state: MeasurementState): boolean {
  return state === "grouping" || state === "groupingKept";
}

// Candidates ------------------------------------------------------------------------------------

/**
 * Where a candidate sits: beside one of the units (a sibling), above it (its parent), above its
 * parent where the parent is a grouping unit (the next unit up), or below it (a unit directly below).
 */
export type Direction = "beside" | "above" | "aboveGrouping" | "below";

const DIRECTION_ORDER: readonly Direction[] = ["beside", "above", "below", "aboveGrouping"];

export interface Candidate<U extends UnitRow = UnitRow> {
  view: MeasurementView<U>;
  direction: Direction;
  /** For aboveGrouping, the grouping unit passed over. */
  via: U | null;
  total: number;
  /** Still under 10 together. */
  short: boolean;
}

/**
 * The measurement units a measurement unit could combine with (Online Measurement Specification
 * 6.2): the siblings of each unit it holds, its parent, the unit above a grouping parent, and the
 * units directly below. A combination cannot take another combination. Nothing is preselected;
 * those reaching 10 come first, then beside, above and below, then by name.
 */
export function candidates<U extends UnitRow>(
  model: MeasurementModel<U>,
  view: MeasurementView<U>,
  only?: readonly Direction[],
): Candidate<U>[] {
  const active = model.units.filter((u) => u.status === "active");
  const found = new Map<string, { direction: Direction; via: U | null }>();
  const offer = (unit: U | undefined, direction: Direction, via: U | null = null) => {
    if (!unit || (only && !only.includes(direction))) return;
    const target = model.ofUnit.get(unit.id);
    if (!target || target.row.id === view.row.id) return;
    if (view.combined && target.combined) return;
    const known = found.get(target.row.id);
    if (!known || DIRECTION_ORDER.indexOf(direction) < DIRECTION_ORDER.indexOf(known.direction)) {
      found.set(target.row.id, { direction, via });
    }
  };
  for (const unit of view.units) {
    const parentId = parentOf(model.units, unit);
    for (const sibling of active) {
      if (sibling.id !== unit.id && parentOf(model.units, sibling) === parentId) {
        offer(sibling, "beside");
      }
    }
    const parent = parentId ? active.find((u) => u.id === parentId) : undefined;
    offer(parent, "above");
    const parentView = parent ? model.ofUnit.get(parent.id) : undefined;
    if (parent && parentView && !parentView.combined && isGroupingState(parentView.state)) {
      const grandparentId = parentOf(model.units, parent);
      offer(
        grandparentId ? active.find((u) => u.id === grandparentId) : undefined,
        "aboveGrouping",
        parent,
      );
    }
    for (const child of active) {
      if (parentOf(model.units, child) === unit.id) offer(child, "below");
    }
  }
  const byId = new Map(model.views.map((v) => [v.row.id, v]));
  return [...found.entries()]
    .map(([id, { direction, via }]) => {
      const target = byId.get(id)!;
      const total = view.staff + target.staff;
      return { view: target, direction, via, total, short: total < MIN_STAFF };
    })
    .sort(
      (a, b) =>
        Number(a.short) - Number(b.short) ||
        DIRECTION_ORDER.indexOf(a.direction) - DIRECTION_ORDER.indexOf(b.direction) ||
        a.view.row.name.localeCompare(b.view.row.name, "en-AU"),
    );
}

/**
 * Whether a combination's units still share a branch: each is joined to the others through
 * siblings, a parent and child, or a grandparent over a grouping unit. A unit moved elsewhere after
 * the combination was made breaks it, and the readiness check asks for it to be undone.
 */
export function branchOk<U extends UnitRow>(
  model: MeasurementModel<U>,
  view: MeasurementView<U>,
): boolean {
  if (!view.combined) return true;
  // The child's parent is a grouping unit sitting directly below `above`.
  const overGroupingParent = (child: U, above: U): boolean => {
    const middleId = parentOf(model.units, child);
    const middle = middleId ? model.units.find((u) => u.id === middleId) : undefined;
    if (!middle || parentOf(model.units, middle) !== above.id) return false;
    const middleView = model.ofUnit.get(middle.id);
    return middleView !== undefined && !middleView.combined && isGroupingState(middleView.state);
  };
  const related = (a: U, b: U): boolean => {
    const pa = parentOf(model.units, a);
    const pb = parentOf(model.units, b);
    return (
      pa === pb ||
      pa === b.id ||
      pb === a.id ||
      overGroupingParent(a, b) ||
      overGroupingParent(b, a)
    );
  };
  const [first, ...rest] = view.units;
  if (!first) return false;
  const reached = new Set<string>([first.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of rest) {
      if (reached.has(u.id)) continue;
      if (view.units.some((r) => reached.has(r.id) && related(r, u))) {
        reached.add(u.id);
        grew = true;
      }
    }
  }
  return reached.size === view.units.length;
}

// The name ---------------------------------------------------------------------------------------

/**
 * The name a combination takes: the default worded from its units' names (the caller words it from
 * the copy module), unless the administrator renamed the combination being extended, whose name is
 * then kept. Names are at most 200 characters, as the database holds them.
 */
export function combinationName(
  defaultOf: (names: string[]) => string,
  next: readonly UnitRow[],
  extending?: { name: string; units: readonly UnitRow[] },
): string {
  const fresh = defaultOf(next.map((u) => u.name)).slice(0, 200);
  if (!extending) return fresh;
  const previous = defaultOf(extending.units.map((u) => u.name)).slice(0, 200);
  return extending.name === previous ? fresh : extending.name;
}

// The leader -------------------------------------------------------------------------------------

/**
 * Where a measurement unit's leader comes from: a single's is its unit's; a combination that rolls
 * up takes its top unit's; where siblings combine, the administrator chooses.
 */
export type LeaderSource = "unit" | "rollUp" | "chosen";

export type MeasurementLeader<P extends PersonRef> = LeaderState<P> & { source: LeaderSource };

export function measurementLeader<U extends UnitRow, P extends PersonRef>(
  view: MeasurementView<U>,
  people: readonly P[],
): MeasurementLeader<P> {
  if (!view.combined) return { ...leaderState(view.units[0]!, people), source: "unit" };
  if (view.top) return { ...leaderState(view.top, people), source: "rollUp" };
  if (view.row.unit_leader_employee_id) {
    return {
      kind: "designated",
      person: people.find((p) => p.id === view.row.unit_leader_employee_id),
      source: "chosen",
    };
  }
  const inside = new Set(view.units.map((u) => u.id));
  const members = people.filter((p) => inside.has(p.unit_id));
  const memberIds = new Set(members.map((p) => p.id));
  const candidates = members.filter(
    (p) => !p.manager_employee_id || !memberIds.has(p.manager_employee_id),
  );
  if (candidates.length === 1)
    return { kind: "proposed", person: candidates[0]!, source: "chosen" };
  if (candidates.length === 0) return { kind: "none", source: "chosen" };
  return { kind: "ambiguous", candidates, source: "chosen" };
}
