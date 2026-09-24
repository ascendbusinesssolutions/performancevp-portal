import { describe, expect, it } from "vitest";

import {
  branchOk,
  candidates,
  combinationName,
  measurementLeader,
  measurementModel,
  type MeasurementUnitRow,
  type MemberRow,
} from "./measurement";
import type { PersonRef, UnitRow } from "./units";

// The exit criterion's organisation (Milestone 4b plan, Section 12): TOP holds the head and two
// executives; below it A (7) and B (7), DIV (2) with LEAF (9) below it, and P (6) with C (8) below
// it. Every unit has its single; a test adds combinations and grouping choices.

function unit(id: string, parent: string | null, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    unit_code: id,
    name: id,
    parent_unit_id: parent,
    unit_type: null,
    status: "active",
    unit_leader_employee_id: null,
    ...extra,
  };
}

interface P extends PersonRef {
  is_leadership_team: boolean;
}

function person(id: string, unitId: string, manager: string | null): P {
  return {
    id,
    unit_id: unitId,
    manager_employee_id: manager,
    first_name: id,
    last_name: "X",
    is_leadership_team: false,
  };
}

function staff(unitId: string, n: number, manager: string | null, lead?: string): P[] {
  return Array.from({ length: n }, (_, i) =>
    i === 0 && lead
      ? person(lead, unitId, manager)
      : person(`${unitId}${i}`, unitId, lead ?? manager),
  );
}

const UNITS = [
  unit("TOP", null),
  unit("A", "TOP"),
  unit("B", "TOP"),
  unit("DIV", "TOP"),
  unit("LEAF", "DIV"),
  unit("P", "TOP"),
  unit("C", "P"),
];

const PEOPLE: P[] = [
  person("head", "TOP", null),
  person("exec1", "TOP", "head"),
  person("exec2", "TOP", "head"),
  ...staff("A", 7, "head", "leadA"),
  ...staff("B", 7, "head", "leadB"),
  ...staff("DIV", 2, "head", "leadDIV"),
  ...staff("LEAF", 9, "leadDIV", "leadLEAF"),
  ...staff("P", 6, "head", "leadP"),
  ...staff("C", 8, "leadP", "leadC"),
];

function org(
  combos: Array<{ id: string; units: string[]; leader?: string }> = [],
  kept: string[] = [],
  units: UnitRow[] = UNITS,
) {
  const held = new Set(combos.flatMap((c) => c.units));
  const rows: MeasurementUnitRow[] = units.map((u) => ({
    id: `mu-${u.id}`,
    code: u.id,
    name: u.name,
    kind: "single",
    status: u.status !== "active" ? "retired" : held.has(u.id) ? "inactive" : "active",
    single_unit_id: u.id,
    unit_leader_employee_id: null,
    grouping_kept_at: kept.includes(u.id) ? "2026-09-23T10:00:00Z" : null,
  }));
  const members: MemberRow[] = units
    .filter((u) => !held.has(u.id))
    .map((u) => ({ measurement_unit_id: `mu-${u.id}`, business_unit_id: u.id }));
  for (const c of combos) {
    rows.push({
      id: c.id,
      code: c.units.join("+"),
      name: c.id,
      kind: "combined",
      status: "active",
      single_unit_id: null,
      unit_leader_employee_id: c.leader ?? null,
      grouping_kept_at: null,
    });
    for (const u of c.units) members.push({ measurement_unit_id: c.id, business_unit_id: u });
  }
  return measurementModel({ units, measurementUnits: rows, members, people: PEOPLE });
}

const view = (model: ReturnType<typeof org>, id: string) =>
  model.views.find((v) => v.row.id === id)!;

const listed = (
  model: ReturnType<typeof org>,
  id: string,
  only?: Parameters<typeof candidates>[2],
) =>
  candidates(model, view(model, id), only).map((c) => [
    c.view.row.id,
    c.direction,
    c.via?.id ?? null,
    c.total,
    c.short,
  ]);

describe("measurementModel", () => {
  it("gives each unit's single its state: grouping above, short below 10, nothing measured yet", () => {
    const model = org();
    expect(Object.fromEntries(model.views.map((v) => [v.row.id, [v.state, v.staff]]))).toEqual({
      "mu-TOP": ["grouping", 3],
      "mu-A": ["short", 7],
      "mu-B": ["short", 7],
      "mu-DIV": ["grouping", 2],
      "mu-LEAF": ["short", 9],
      "mu-P": ["grouping", 6],
      "mu-C": ["short", 8],
    });
  });

  it("measures a combination of 10 or more, leaves its singles out, and keeps a grouping choice", () => {
    const model = org(
      [
        { id: "AB", units: ["A", "B"] },
        { id: "DIVLEAF", units: ["LEAF", "DIV"] },
        { id: "PC", units: ["C", "P"] },
      ],
      ["TOP"],
    );
    expect(model.views.map((v) => [v.row.id, v.state, v.staff])).toEqual([
      ["AB", "measured", 14],
      ["DIVLEAF", "measured", 11],
      ["PC", "measured", 14],
      ["mu-TOP", "groupingKept", 3],
    ]);
    expect(view(model, "DIVLEAF").units.map((u) => u.id)).toEqual(["DIV", "LEAF"]);
    expect(model.ofUnit.get("C")?.row.id).toBe("PC");
  });

  it("finds the unit a combination rolls up to, and none where siblings combine", () => {
    const model = org([
      { id: "AB", units: ["A", "B"] },
      { id: "PC", units: ["C", "P"] },
    ]);
    expect(view(model, "PC").top?.id).toBe("P");
    expect(view(model, "AB").top).toBeNull();
  });

  it("measures a single with units below it once it has 10 of its own, and counts an empty leaf as empty", () => {
    const units = [unit("R", null), unit("K", "R"), unit("E", "R")];
    const people = [...staff("R", 10, null), ...staff("K", 3, "R0")];
    const model = measurementModel({
      units,
      measurementUnits: units.map((u) => ({
        id: u.id,
        code: u.id,
        name: u.id,
        kind: "single",
        status: "active",
        single_unit_id: u.id,
        unit_leader_employee_id: null,
        grouping_kept_at: null,
      })),
      members: units.map((u) => ({ measurement_unit_id: u.id, business_unit_id: u.id })),
      people,
    });
    expect(model.views.map((v) => [v.row.id, v.state])).toEqual([
      ["E", "empty"],
      ["K", "short"],
      ["R", "measured"],
    ]);
  });
});

describe("candidates", () => {
  it("lists a unit's siblings and its parent, those reaching 10 first, and marks any still short", () => {
    expect(listed(org(), "mu-A")).toEqual([
      ["mu-B", "beside", null, 14, false],
      ["mu-P", "beside", null, 13, false],
      ["mu-TOP", "above", null, 10, false],
      ["mu-DIV", "beside", null, 9, true],
    ]);
  });

  it("offers the unit above a grouping parent, naming the parent passed over", () => {
    expect(listed(org(), "mu-LEAF")).toEqual([
      ["mu-DIV", "above", null, 11, false],
      ["mu-TOP", "aboveGrouping", "DIV", 12, false],
    ]);
    expect(listed(org(), "mu-C")).toEqual([
      ["mu-P", "above", null, 14, false],
      ["mu-TOP", "aboveGrouping", "P", 11, false],
    ]);
  });

  it("offers a unit with units below it only the units below, when it chooses whether to group them", () => {
    expect(listed(org(), "mu-P", ["below"])).toEqual([["mu-C", "below", null, 14, false]]);
  });

  it("offers a combination as a whole, and never one combination to another", () => {
    const model = org([{ id: "DIVLEAF", units: ["LEAF", "DIV"] }]);
    expect(listed(model, "mu-A")).toContainEqual(["DIVLEAF", "beside", null, 18, false]);
    const both = org([
      { id: "AB", units: ["A", "B"] },
      { id: "DIVLEAF", units: ["LEAF", "DIV"] },
    ]);
    expect(listed(both, "AB").map((c) => c[0])).toEqual(["mu-P", "mu-TOP"]);
  });
});

describe("branchOk", () => {
  it("holds for siblings, a parent and child, and a unit with the one above its grouping parent", () => {
    const model = org([
      { id: "AB", units: ["A", "B"] },
      { id: "PC", units: ["C", "P"] },
      { id: "LT", units: ["LEAF", "TOP"] },
    ]);
    expect(["AB", "PC", "LT"].map((id) => branchOk(model, view(model, id)))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("fails for units that do not share a branch, as after one of them moves", () => {
    const model = org([{ id: "AL", units: ["A", "LEAF"] }]);
    expect(branchOk(model, view(model, "AL"))).toBe(false);
  });
});

describe("measurementLeader", () => {
  it("takes a single's leader from its unit", () => {
    const model = org();
    expect(measurementLeader(view(model, "mu-LEAF"), PEOPLE)).toMatchObject({
      kind: "proposed",
      person: { id: "leadLEAF" },
      source: "unit",
    });
  });

  it("takes the top unit's leader where a combination rolls up", () => {
    const model = org([{ id: "PC", units: ["C", "P"] }]);
    expect(measurementLeader(view(model, "PC"), PEOPLE)).toMatchObject({
      kind: "proposed",
      person: { id: "leadP" },
      source: "rollUp",
    });
  });

  it("asks for a choice where siblings combine, and takes the one chosen", () => {
    const model = org([{ id: "AB", units: ["A", "B"] }]);
    const open = measurementLeader(view(model, "AB"), PEOPLE);
    expect(open.kind).toBe("ambiguous");
    expect(open.kind === "ambiguous" && open.candidates.map((p) => p.id)).toEqual([
      "leadA",
      "leadB",
    ]);
    const chosen = org([{ id: "AB", units: ["A", "B"], leader: "exec1" }]);
    expect(measurementLeader(view(chosen, "AB"), PEOPLE)).toMatchObject({
      kind: "designated",
      person: { id: "exec1" },
      source: "chosen",
    });
  });
});

describe("combinationName", () => {
  const wordy = (names: string[]) => names.join(" and ");
  const [a, b, p] = [UNITS[1]!, UNITS[2]!, UNITS[5]!];

  it("words a new combination's name from its units", () => {
    expect(combinationName(wordy, [a, b])).toBe("A and B");
  });

  it("renames an extended combination that still has its default name", () => {
    expect(combinationName(wordy, [a, b, p], { name: "A and B", units: [a, b] })).toBe(
      "A and B and P",
    );
  });

  it("keeps the name the administrator gave it", () => {
    expect(combinationName(wordy, [a, b, p], { name: "Customer group", units: [a, b] })).toBe(
      "Customer group",
    );
  });
});
