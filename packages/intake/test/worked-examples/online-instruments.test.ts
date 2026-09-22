/**
 * The online instruments against the Online Measurement Specification Part 4 worked examples,
 * each carried through the engine: C2 = 60.1, ADM-O1 = 72.2 and O1 = 62.2, ADM-O2 structural =
 * 57.7, ADM-O4 = 52.5 and O4 = 46.3. Test files may call the engine; src/ may not.
 */
import { calculateUnit, type UnitMeasurementInput } from "@performancevp/engine";
import { describe, expect, it } from "vitest";

import { scoreAdmO1, scoreAdmO2, scoreAdmO4 } from "../../src/checklists";
import { scoreC2 } from "../../src/modules/c2-mgr";
import type { KnowledgeDomain, KnowledgeRating, Snapshot } from "../../src/types";

function engine(partial: Partial<UnitMeasurementInput>): ReturnType<typeof calculateUnit> {
  return calculateUnit({
    engagement: { archetype: "Default", engagementDate: "2026-08-24" },
    ...partial,
  });
}

describe("M-C2-MGR (4.1)", () => {
  const domains: KnowledgeDomain[] = [
    { id: "reg", name: "Regulatory", criticality: 3 },
    { id: "prod", name: "Product", criticality: 2 },
    { id: "proc", name: "Procedures", criticality: 2 },
  ];
  // Ten heads, nine rated, so coverage is 0.90; ratings chosen to give the example's means.
  const snapshot: Snapshot = {
    members: Array.from({ length: 10 }, (_, i) => ({ employeeRef: `E${i}`, fte: 1 })),
  };
  const ratingsFor = (domainId: string, values: number[]): KnowledgeRating[] =>
    values.map((rating, i) => ({
      managerRef: i < 5 ? "M1" : "M2",
      employeeRef: `E${i}`,
      domainId,
      rating,
    }));
  const ratings = [
    ...ratingsFor("reg", [4, 4, 4, 4, 4, 4, 4, 4, 3]), // mean 3.889, the example's 3.9
    ...ratingsFor("prod", [3, 3, 3, 3, 4, 4, 4, 3, 4]), // 3.444, the example's 3.4
    ...ratingsFor("proc", [4, 4, 4, 3, 3, 4, 3, 4, 3]), // 3.556, the example's 3.6
  ];

  it("converts each domain's mean and takes coverage as rated FTE over unit FTE", () => {
    const result = scoreC2(ratings, domains, snapshot);
    expect(result.domains.map((d) => [d.ratedCount, d.coverage])).toEqual([
      [9, 0.9],
      [9, 0.9],
      [9, 0.9],
    ]);
    expect(result.domains[0]?.meanScore).toBeCloseTo((3.888888888888889 - 1) * 25, 12);
    expect(result.distinctManagers).toBe(2);
    expect(result.ratings).toHaveLength(27);
  });

  it("reproduces C2 = 60.1 through the engine on the example's own rounded means", () => {
    const result = engine({
      capability: {
        c2: {
          domains: [
            { name: "Regulatory", criticality: 3, meanScore: (3.9 - 1) * 25, coverage: 0.9 },
            { name: "Product", criticality: 2, meanScore: (3.4 - 1) * 25, coverage: 0.9 },
            { name: "Procedures", criticality: 2, meanScore: (3.6 - 1) * 25, coverage: 0.9 },
          ],
        },
      },
    });
    expect(result.subDimensions.C2.score).toBeCloseTo(60.1, 1);
  });

  it("gives an unrated domain no mean and no coverage, and a unit without FTE no coverage", () => {
    const result = scoreC2(ratingsFor("reg", [4]), domains, snapshot);
    expect(result.domains[1]).toMatchObject({ ratedCount: 0, meanScore: undefined, coverage: 0 });
    expect(
      scoreC2(ratingsFor("reg", [4]), domains, { members: [] }).domains[0]?.coverage,
    ).toBeUndefined();
  });
});

describe("ADM-O1 (4.2)", () => {
  const families = [
    { id: "csr", name: "Customer Service Representatives", skills: [] },
    { id: "tl", name: "Team Leaders", skills: [] },
  ];
  const snapshot: Snapshot = {
    members: [
      ...Array.from({ length: 50 }, (_, i) => ({
        employeeRef: `C${i}`,
        roleFamilyId: "csr",
        fte: 1,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        employeeRef: `T${i}`,
        roleFamilyId: "tl",
        fte: 1,
      })),
    ],
  };

  it("scores 66.7 and 100, FTE-weighted to 72.2, and O1 = 62.2 through the engine with LT 58 and CASCADE 65", () => {
    const result = scoreAdmO1(
      [
        { roleFamilyId: "csr", ra1: true, ra2: true, ra3: false },
        { roleFamilyId: "tl", ra1: true, ra2: true, ra3: true },
      ],
      families,
      snapshot,
    );
    expect(result.families.map((f) => f.yes)).toEqual([2, 3]);
    expect(result.score).toBeCloseTo(72.2, 1);
    const o1 = engine({
      opportunity: {
        o1: {
          decisionRightsScore: 58,
          roleArchitectureScore: result.score as number,
          cascadeScore: 65,
          items: {
            "OI1-01": 3.4,
            "OI1-02": 3.4,
            "OI1-03": 2.6,
            "OI1-04": 3.4,
            "OI1-05": 3.4,
            "OI1-06": 2.6,
            "OI1-07": 3.4,
            "OI1-08": 3.4,
          },
        },
      },
    });
    expect(o1.subDimensions.O1.score).toBeCloseTo(62.2, 1);
  });

  it("ignores an answer for a family not in the unit and is blank when the answered families carry no FTE", () => {
    expect(
      scoreAdmO1([{ roleFamilyId: "x", ra1: true, ra2: true, ra3: true }], families, snapshot)
        .score,
    ).toBeUndefined();
    expect(
      scoreAdmO1([{ roleFamilyId: "csr", ra1: true, ra2: true, ra3: true }], families, {
        members: [],
      }).score,
    ).toBeUndefined();
    expect(scoreAdmO1(undefined, families, snapshot).score).toBeUndefined();
  });
});

describe("ADM-O2 (4.3)", () => {
  it("gives tool inventory 58.3 and integration 50.0, and structural O2 57.7 through the engine with IA 62", () => {
    const result = scoreAdmO2([
      { systemId: "crm", ti1: true, ti2: true, ti3: "partly", int1: "automated" },
      { systemId: "pm", ti1: true, ti2: true, ti3: "yes", int1: "scheduled" },
      { systemId: "dm", ti1: true, ti2: false, ti3: "partly", int1: "manual" },
      { systemId: "sheet", ti1: false, ti2: false, ti3: "no", int1: "manual" },
    ]);
    expect(result.systems.map((s) => s.inventory)).toEqual([0.8333333333333334, 1, 0.5, 0]);
    expect(result.toolInventoryScore).toBeCloseTo(58.3, 1);
    expect(result.integrationScore).toBe(50);
    const o2 = engine({
      opportunity: {
        o2: {
          toolInventoryScore: result.toolInventoryScore as number,
          informationAccessScore: 62,
          integrationScore: result.integrationScore as number,
          items: { "OI2-01": 3.4, "OI2-02": 3.4, "OI2-03": 3.4, "OI2-04": 2.6 },
        },
      },
    });
    // Structural 57.7 against perception 60: within the gap, so the mean of the layers.
    expect(o2.subDimensions.O2.score).toBeCloseTo((57.7 + 60) / 2, 1);
  });

  it("excludes a system that does not need to connect from integration but not from inventory", () => {
    const result = scoreAdmO2([
      { systemId: "a", ti1: true, ti2: true, ti3: "yes", int1: "excluded" },
      { systemId: "b", ti1: false, ti2: false, ti3: "no", int1: "not-connected" },
    ]);
    expect(result.toolInventoryScore).toBe(50);
    expect(result.integrationScore).toBe(0);
    expect(
      scoreAdmO2([{ systemId: "a", ti1: true, ti2: true, ti3: "yes", int1: "excluded" }])
        .integrationScore,
    ).toBeUndefined();
    expect(scoreAdmO2(undefined).toolInventoryScore).toBeUndefined();
  });
});

describe("ADM-O4 (4.3a)", () => {
  it("bands the Engineering example to 55, 45, 55, 55 for 52.5, and O4 = 46.3 through the engine", () => {
    const result = scoreAdmO4({
      utilisationPercent: 108,
      overtimeHoursPerFte: 4.5,
      absenceAboveBaselinePercent: 12,
      backlogChangePercent: 15,
    });
    expect(result.facts.map((f) => f.score)).toEqual([55, 45, 55, 55]);
    expect(result.score).toBe(52.5);
    const o4 = engine({
      opportunity: {
        o4: {
          capacityAnalysisScore: result.score as number,
          items: { "OI4-01": 2.6, "OI4-02": 2.6, "OI4-03": 3.4 },
        },
      },
    });
    expect(o4.subDimensions.O4.score).toBeCloseTo(46.3, 1);
  });

  it("takes the higher-scoring band on every boundary, both sides", () => {
    const u = (v: number) =>
      scoreAdmO4({ utilisationPercent: v, overtimeHoursPerFte: 0, absenceAboveBaselinePercent: 0 })
        .facts[0]?.score;
    expect([
      u(59.9),
      u(60),
      u(69.9),
      u(70),
      u(79.9),
      u(80),
      u(95),
      u(95.1),
      u(105),
      u(105.1),
      u(115),
      u(115.1),
    ]).toEqual([25, 55, 55, 75, 75, 100, 100, 75, 75, 55, 55, 25]);
    const o = (v: number) =>
      scoreAdmO4({ utilisationPercent: 90, overtimeHoursPerFte: v, absenceAboveBaselinePercent: 0 })
        .facts[1]?.score;
    expect([o(1), o(1.1), o(2), o(2.1), o(4), o(4.1), o(6), o(6.1)]).toEqual([
      100, 85, 85, 65, 65, 45, 45, 20,
    ]);
    const a = (v: number) =>
      scoreAdmO4({ utilisationPercent: 90, overtimeHoursPerFte: 0, absenceAboveBaselinePercent: v })
        .facts[2]?.score;
    expect([a(-3), a(0), a(0.1), a(10), a(10.1), a(25), a(25.1)]).toEqual([
      100, 100, 75, 75, 55, 55, 25,
    ]);
    const b = (v: number) =>
      scoreAdmO4({ utilisationPercent: 90, overtimeHoursPerFte: 0, backlogChangePercent: v })
        .facts[2]?.score;
    expect([b(-40), b(5), b(5.1), b(25), b(25.1)]).toEqual([100, 100, 55, 55, 25]);
    const v = (x: number) =>
      scoreAdmO4({ utilisationPercent: 90, overtimeHoursPerFte: 0, vacancyRatePercent: x }).facts[2]
        ?.score;
    expect([v(3), v(3.1), v(6), v(6.1), v(10), v(10.1), v(15), v(15.1)]).toEqual([
      100, 85, 85, 65, 65, 45, 45, 20,
    ]);
  });

  it("needs at least three facts, and a not-applicable backlog is not a fact", () => {
    expect(scoreAdmO4({ utilisationPercent: 90, overtimeHoursPerFte: 0 }).score).toBeUndefined();
    expect(
      scoreAdmO4({
        utilisationPercent: 90,
        overtimeHoursPerFte: 0,
        backlogChangePercent: "not-applicable",
      }).score,
    ).toBeUndefined();
    expect(
      scoreAdmO4({ utilisationPercent: 90, overtimeHoursPerFte: 0, backlogChangePercent: 0 }).score,
    ).toBe(100);
    expect(scoreAdmO4(undefined).score).toBeUndefined();
  });
});
