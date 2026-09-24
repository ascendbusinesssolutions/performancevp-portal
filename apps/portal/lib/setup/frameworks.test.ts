import { describe, expect, it } from "vitest";

import {
  contextCounts,
  familyProblems,
  incompleteParts,
  lacksCriticalDomain,
  type SkillRow,
} from "./frameworks";

function skills(n: number, extra: Partial<SkillRow> = {}): SkillRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    role_family_id: "f",
    name: `Skill ${i}`,
    is_critical: i === 0,
    kind: i % 2 === 0 ? "technical" : "behavioural",
    status: "active",
    ...extra,
  }));
}

describe("familyProblems", () => {
  it("accepts 8 to 15 skills of both kinds with one critical", () => {
    expect(familyProblems("f", skills(8))).toEqual([]);
    expect(familyProblems("f", skills(15))).toEqual([]);
  });

  it("names each thing that is missing", () => {
    expect(familyProblems("f", skills(7))).toEqual([{ kind: "tooFew", n: 7, min: 8 }]);
    expect(familyProblems("f", skills(16))).toEqual([{ kind: "tooMany", n: 16, max: 15 }]);
    expect(familyProblems("f", skills(9, { is_critical: false }))).toEqual([
      { kind: "noCritical" },
    ]);
    expect(familyProblems("f", skills(9, { kind: "technical" }))).toEqual([
      { kind: "noBehavioural" },
    ]);
  });

  it("counts only the family's active skills", () => {
    const list = [
      ...skills(8),
      ...skills(3, { status: "retired" }),
      ...skills(3, { role_family_id: "g" }),
    ];
    expect(familyProblems("f", list)).toEqual([]);
    expect(familyProblems("f", skills(8, { status: "retired" }))[0]).toEqual({
      kind: "tooFew",
      n: 0,
      min: 8,
    });
  });
});

describe("a unit's context", () => {
  const named = (n: number, unit = "u") =>
    Array.from({ length: n }, (_, i) => ({
      id: `${unit}${i}`,
      measurement_unit_id: unit,
      name: `N${i}`,
      status: "active",
    }));
  const domains = (criticalities: number[]) =>
    criticalities.map((c, i) => ({
      id: `d${i}`,
      measurement_unit_id: "u",
      name: `D${i}`,
      status: "active",
      criticality: c,
    }));

  it("is complete with 3 to 6 domains, 8 to 12 decision types, exactly 3 processes and 3 to 8 systems", () => {
    const counts = contextCounts("u", {
      domains: domains([3, 2, 1]),
      decisions: named(8),
      processes: named(3),
      systems: named(3),
    });
    expect(incompleteParts(counts)).toEqual([]);
    expect(lacksCriticalDomain(counts)).toBe(false);
  });

  it("names each incomplete part, and warns when no domain is critical", () => {
    const counts = contextCounts("u", {
      domains: domains([2, 2]),
      decisions: named(13),
      processes: named(4),
      systems: named(9),
    });
    expect(incompleteParts(counts)).toEqual(["domains", "decisions", "processes", "systems"]);
    expect(lacksCriticalDomain(counts)).toBe(true);
  });

  it("counts only the unit's active rows", () => {
    const counts = contextCounts("u", {
      domains: [],
      decisions: [...named(8), ...named(4, "v")],
      processes: [
        ...named(3),
        { id: "x", measurement_unit_id: "u", name: "Old", status: "retired" },
      ],
      systems: named(3),
    });
    expect(counts.decisions).toBe(8);
    expect(counts.processes).toBe(3);
    expect(lacksCriticalDomain(counts)).toBe(false);
  });
});
