import { describe, expect, it } from "vitest";

import {
  descendantIds,
  hasChildren,
  isGroupingUnit,
  isMeasuredUnit,
  leaderCandidates,
  leaderState,
  type PersonRef,
  unitTree,
  type UnitRow,
} from "./units";

function unit(id: string, parent: string | null, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    unit_code: id.toUpperCase(),
    name: extra.name ?? `Unit ${id}`,
    parent_unit_id: parent,
    unit_type: null,
    status: "active",
    unit_leader_employee_id: null,
    ...extra,
  };
}

function person(id: string, unitId: string, manager: string | null): PersonRef {
  return { id, unit_id: unitId, manager_employee_id: manager, first_name: id, last_name: "X" };
}

describe("unitTree", () => {
  it("orders each unit before the units below it, siblings by name", () => {
    const tree = unitTree([
      unit("r", null, { name: "Group" }),
      unit("s", "r", { name: "Sales" }),
      unit("o", "r", { name: "Operations" }),
      unit("f", "o", { name: "Field" }),
    ]);
    expect(tree.map((e) => [e.unit.id, e.depth])).toEqual([
      ["r", 0],
      ["o", 1],
      ["f", 2],
      ["s", 1],
    ]);
  });

  it("leaves retired units out and lifts a unit whose parent has retired to the top", () => {
    const tree = unitTree([
      unit("old", null, { status: "retired" }),
      unit("a", "old", { name: "A" }),
    ]);
    expect(tree.map((e) => [e.unit.id, e.depth])).toEqual([["a", 0]]);
  });
});

describe("descendantIds and hasChildren", () => {
  const units = [unit("r", null), unit("a", "r"), unit("b", "a"), unit("c", null)];
  it("finds a unit and everything below it", () => {
    expect([...descendantIds(units, "r")].sort()).toEqual(["a", "b", "r"]);
    expect([...descendantIds(units, "c")]).toEqual(["c"]);
  });
  it("knows whether a unit has units below it", () => {
    expect(hasChildren(units, "a")).toBe(true);
    expect(hasChildren(units, "b")).toBe(false);
  });
});

describe("the unit leader", () => {
  const people = [
    person("head", "r", null),
    person("lead", "u", "head"),
    person("m1", "u", "lead"),
    person("m2", "u", "lead"),
    person("a", "v", "head"),
    person("b", "v", "head"),
  ];

  it("proposes the one member whose manager is outside the unit, or who has none", () => {
    expect(leaderCandidates("u", people).map((p) => p.id)).toEqual(["lead"]);
    expect(leaderCandidates("r", people).map((p) => p.id)).toEqual(["head"]);
    expect(leaderState(unit("u", null), people)).toEqual({ kind: "proposed", person: people[1] });
  });

  it("asks for a choice when several could lead, and says so when none could", () => {
    const state = leaderState(unit("v", null), people);
    expect(state.kind).toBe("ambiguous");
    expect(leaderState(unit("empty", null), people)).toEqual({ kind: "none" });
  });

  it("keeps a designation over the rule", () => {
    const state = leaderState(unit("v", null, { unit_leader_employee_id: "b" }), people);
    expect(state).toEqual({ kind: "designated", person: people[5] });
  });
});

describe("isGroupingUnit and isMeasuredUnit (Online Measurement Specification 6.2)", () => {
  const units = [unit("top", null), unit("a", "top"), unit("b", null)];
  it("groups a unit with units below it and fewer than 10 of its own", () => {
    expect(isGroupingUnit(units, "top", 0)).toBe(true);
    expect(isGroupingUnit(units, "top", 9)).toBe(true);
    expect(isGroupingUnit(units, "top", 10)).toBe(false);
    expect(isMeasuredUnit(units, "top", 3)).toBe(false);
    expect(isMeasuredUnit(units, "top", 10)).toBe(true);
  });

  it("never groups a unit with nothing below it: it is measured once it has anyone", () => {
    expect(isGroupingUnit(units, "b", 4)).toBe(false);
    expect(isMeasuredUnit(units, "b", 4)).toBe(true);
    expect(isMeasuredUnit(units, "b", 0)).toBe(false);
  });

  it("ignores retired units below", () => {
    const retired = [unit("top", null), unit("a", "top", { status: "retired" })];
    expect(isGroupingUnit(retired, "top", 3)).toBe(false);
  });
});
