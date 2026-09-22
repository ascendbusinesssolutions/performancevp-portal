/**
 * The online-only rules: the inflation guard, the C3 route, tenure, S1 and the team rules. Rule-
 * derived fixtures from the Online Measurement Specification Parts 3, 4.4 and 6.4, and the
 * Measurement Reference 2.4, 4.5 and 5.1 worked examples through the engine.
 */
import { calculateUnit, type UnitMeasurementInput } from "@performancevp/engine";
import { describe, expect, it } from "vitest";

import { evaluateFormalRatings, isCurrent, selectC3Route } from "../../src/c3-route";
import { completeMonths, minusMonths } from "../../src/excel";
import { c3Adjustments, highRatingShare, ratingDeduction } from "../../src/guard";
import { scoreC3 } from "../../src/modules/c3-mgr";
import { gini, scoreS1 } from "../../src/s1";
import {
  applyTeamRules,
  enoughTeamsValid,
  teamStatuses,
  weightedItemMeans,
} from "../../src/team-rules";
import type { TeamCii, TeamO5 } from "../../src/teams";
import { medianTenureMonths } from "../../src/tenure";
import { CII_ITEMS, type RoleFamily, type SkillRating, type Snapshot } from "../../src/types";

function engine(partial: Partial<UnitMeasurementInput>): ReturnType<typeof calculateUnit> {
  return calculateUnit({
    engagement: { archetype: "Default", engagementDate: "2026-08-24" },
    ...partial,
  });
}

describe("the inflation guard (4.4)", () => {
  it("does not fire at exactly 50% high ratings and fires one rating over", () => {
    const half = [4, 5, 3, 2, 4, 1, 5, 3, 4, 3]; // 5 of 10
    expect(highRatingShare(half)).toEqual({ ratings: 10, highShare: 0.5, fired: false });
    expect(ratingDeduction("C1", half)).toBeUndefined();
    const over = [...half.slice(0, 9), 4]; // 6 of 10
    const deduction = ratingDeduction("C1", over);
    expect(deduction).toMatchObject({ subDimension: "C1", amount: 7.5, applied: false });
    expect(deduction?.rule).toContain("60.0% of 10");
    expect(ratingDeduction("C2", [5, 5, 4])?.subDimension).toBe("C2");
    expect(highRatingShare([])).toEqual({ ratings: 0, highShare: undefined, fired: false });
  });

  it("records the C3 cap and the band transfer as applied, with the counts moved", () => {
    const rows = [5, 5, 5, 5, 5, 4, 3, 3, 2].map((band, i) => ({
      managerRef: "M",
      employeeRef: `E${i}`,
      roleFamilyId: undefined,
      skills: [],
      band,
      coverage: undefined,
      newManager: 0 as const,
    }));
    const adjustments = c3Adjustments(scoreC3(rows));
    expect(adjustments).toHaveLength(2);
    expect(adjustments[0]).toMatchObject({ subDimension: "C3", amount: 2.75, applied: true });
    expect(adjustments[1]).toMatchObject({ subDimension: "C3", amount: 0.2, applied: true });
    expect(c3Adjustments(scoreC3([]))).toEqual([]);
  });
});

describe("the C3 route (6.4)", () => {
  const scaleMap = [
    { label: "Exceptional", band: 5 as const },
    { label: "Strong", band: 4 as const },
    { label: "Solid", band: 3 as const },
    { label: "Developing", band: 2 as const },
    { label: "Below", band: 1 as const },
  ];
  const launch = "2026-08-03";
  const snapshotWith = (
    labels: Array<string | undefined>,
    date = "2026-03-31",
    fte = 1,
  ): Snapshot => ({
    members: labels.map((label, i) => {
      const m: Snapshot["members"][number] = { employeeRef: `E${i}`, fte };
      if (label !== undefined) m.formalRating = { label, date };
      return m;
    }),
  });
  const moduleNone = scoreC3([]);

  it("uses a rating dated exactly 12 months before launch and not one dated 12 months and a day", () => {
    expect(minusMonths(launch, 12)).toBe("2025-08-03");
    expect(isCurrent("2025-08-03", launch)).toBe(true);
    expect(isCurrent("2025-08-02", launch)).toBe(false);
    expect(isCurrent("2026-08-03", launch)).toBe(true);
    expect(isCurrent("2026-08-04", launch)).toBe(false);
    expect(minusMonths("2028-02-29", 12)).toBe("2027-02-28");
    expect(completeMonths("2025-08-02", launch)).toBe(12);
  });

  it("qualifies at 80% coverage and not at 79.9%", () => {
    const labels = Array.from({ length: 10 }, (_, i) => (i < 8 ? "Solid" : undefined));
    const eighty = evaluateFormalRatings(
      { scaleMap, calibrated: true },
      snapshotWith(labels),
      launch,
    );
    expect(eighty).toMatchObject({ ratedCount: 8, coverage: 0.8, qualifies: true });
    const snapshot = snapshotWith(labels);
    (snapshot.members[9] as Snapshot["members"][number]).fte = 1.0125; // 8 of 10.0125 = 79.9%
    const under = evaluateFormalRatings({ scaleMap, calibrated: true }, snapshot, launch);
    expect(under?.qualifies).toBe(false);
    expect(under?.reason).toContain("79.9%");
  });

  it("uses calibrated ratings as they stand within the 25% and 5% bounds, and caps them otherwise", () => {
    // 20 rated: 5 at Band 5 (25%), 1 at Band 1 (5%): as declared.
    const ok = [
      ...Array<string>(5).fill("Exceptional"),
      ...Array<string>(14).fill("Solid"),
      "Below",
    ];
    const asDeclared = evaluateFormalRatings(
      { scaleMap, calibrated: true },
      snapshotWith(ok),
      launch,
    );
    expect(asDeclared).toMatchObject({ treatment: "as-declared", final: [1, 0, 14, 0, 5] });
    // The same distribution declared uncalibrated: top band capped at 15% (3), excess 2 to Band 4.
    const uncal = evaluateFormalRatings({ scaleMap, calibrated: false }, snapshotWith(ok), launch);
    expect(uncal).toMatchObject({ treatment: "uncalibrated-capped", final: [1, 0, 14, 2, 3] });
    // Calibrated but 6 at Band 5 (30%): the uncalibrated rule.
    const skewed = [
      ...Array<string>(6).fill("Exceptional"),
      ...Array<string>(13).fill("Solid"),
      "Below",
    ];
    expect(
      evaluateFormalRatings({ scaleMap, calibrated: true }, snapshotWith(skewed), launch)
        ?.treatment,
    ).toBe("uncalibrated-capped");
    // Calibrated with no Band 1: the uncalibrated rule, and the cap only bites above 15%.
    const noBottom = [...Array<string>(2).fill("Exceptional"), ...Array<string>(18).fill("Solid")];
    expect(
      evaluateFormalRatings({ scaleMap, calibrated: true }, snapshotWith(noBottom), launch),
    ).toMatchObject({
      treatment: "uncalibrated-capped",
      final: [0, 0, 18, 0, 2],
    });
  });

  it("selects the formal route with its earliest rating date and the confidence cap, else the module, else none", () => {
    const snapshot = snapshotWith(Array<string>(10).fill("Strong"), "2026-05-01");
    (snapshot.members[3] as Snapshot["members"][number]).formalRating = {
      label: "Strong",
      date: "2025-12-15",
    };
    const formal = evaluateFormalRatings({ scaleMap, calibrated: false }, snapshot, launch);
    const chosen = selectC3Route(formal, moduleNone, 0, snapshot);
    expect(chosen.record).toEqual({
      source: "formal",
      ratingDate: "2025-12-15",
      coverage: 1,
      treatment: "uncalibrated-capped",
      confidenceCap: "Medium",
    });
    expect(chosen.bands).toEqual([0, 0, 0, 10, 0]);

    const fourPoint = [
      { label: "Meets", band: 3 as const },
      { label: "Exceeds", band: 4 as const },
    ];
    const unmapped = evaluateFormalRatings(
      { scaleMap: fourPoint, calibrated: true },
      snapshotWith(["Strong", "Meets"]),
      launch,
    );
    expect(unmapped).toMatchObject({ ratedCount: 1, coverage: 0.5, qualifies: false });

    const moduleRows = [3, 4, 3].map((band, i) => ({
      managerRef: "M",
      employeeRef: `E${i}`,
      roleFamilyId: undefined,
      skills: [],
      band,
      coverage: undefined,
      newManager: 0 as const,
    }));
    const viaModule = selectC3Route(
      unmapped,
      scoreC3(moduleRows),
      3,
      snapshotWith([undefined, undefined, undefined, undefined]),
    );
    expect(viaModule.record).toMatchObject({
      source: "module",
      coverage: 0.75,
      confidenceCap: undefined,
    });
    expect(viaModule.bands).toEqual([0, 0, 2, 1, 0]);
    expect(selectC3Route(undefined, moduleNone, 0, snapshotWith([])).record.source).toBe("none");
  });
});

describe("tenure (3.1)", () => {
  const launch = "2026-08-03";
  const snapshotWith = (starts: Array<string | undefined>): Snapshot => ({
    members: starts.map((startDate, i) => {
      const m: Snapshot["members"][number] = { employeeRef: `E${i}`, fte: 1 };
      if (startDate !== undefined) m.startDate = startDate;
      return m;
    }),
  });

  it("takes the median of complete months, an even count averaging the middle two", () => {
    expect(
      medianTenureMonths(snapshotWith(["2025-02-03", "2024-08-03", "2020-01-01"]), launch),
    ).toBe(24);
    expect(medianTenureMonths(snapshotWith(["2025-02-03", "2024-08-03"]), launch)).toBe(21);
  });

  it("reads the moderator edges as the engine does: 17 and 18 months, 96 and 97 months", () => {
    expect(medianTenureMonths(snapshotWith(["2025-02-04"]), launch)).toBe(17);
    expect(medianTenureMonths(snapshotWith(["2025-02-03"]), launch)).toBe(18);
    expect(medianTenureMonths(snapshotWith(["2018-08-03"]), launch)).toBe(96);
    expect(medianTenureMonths(snapshotWith(["2018-07-03"]), launch)).toBe(97);
    expect(
      engine({
        capability: {
          c1: {
            families: [{ fte: 10, skillsRequired: 4, confirmedProficiencies: 40 }],
            medianTenureMonths: 17,
          },
        },
        routes: { C1: { tier: "Tier 1", vintage: "2026-08-24" } },
      }).subDimensions.C1.score,
    ).toBe(95);
    expect(
      engine({
        capability: {
          c1: {
            families: [{ fte: 10, skillsRequired: 4, confirmedProficiencies: 40 }],
            medianTenureMonths: 18,
          },
        },
        routes: { C1: { tier: "Tier 1", vintage: "2026-08-24" } },
      }).subDimensions.C1.score,
    ).toBe(100);
  });

  it("ignores members without a start date, a future start counts as 0, and none at all is blank", () => {
    expect(medianTenureMonths(snapshotWith([undefined, "2025-02-03", undefined]), launch)).toBe(18);
    expect(medianTenureMonths(snapshotWith(["2026-09-01"]), launch)).toBe(0);
    expect(medianTenureMonths(snapshotWith([undefined]), launch)).toBeUndefined();
  });
});

describe("S1 (3.4; Measurement Reference 5.1)", () => {
  it("computes the Gini of counts: equal counts give 0, one member holding everything gives (n − 1) / n", () => {
    expect(gini([4, 4, 4, 4])).toBe(0);
    expect(gini([0, 0, 0, 8])).toBe(0.75);
    expect(gini([])).toBe(0);
    expect(gini([0, 0])).toBe(0);
    expect(gini([4, 11])).toBeCloseTo(7 / 30, 12);
  });

  it("reproduces breadth 14 of 15 and depth 91.7 on a 30-FTE matrix, and S1 through the engine", () => {
    // 15 framework skills, 8 critical; target depth ceiling(30 / 10) = 3; skill 8 (critical) has one
    // proficient member and skill 15 nobody.
    const family: RoleFamily = {
      id: "eng",
      name: "Engineers",
      skills: Array.from({ length: 15 }, (_, i) => ({
        id: `s${i + 1}`,
        name: `Skill ${i + 1}`,
        critical: i < 8,
        kind: "technical",
      })),
    };
    const snapshot: Snapshot = {
      members: Array.from({ length: 30 }, (_, i) => ({
        employeeRef: `E${i}`,
        roleFamilyId: "eng",
        fte: 1,
      })),
    };
    const ratings: SkillRating[] = [];
    // Every member rated on every skill; proficient (3) on skills 1 to 7 and 9 to 14 for the first
    // three members, skill 8 for one member only, skill 15 for none, everyone else at 2 elsewhere.
    for (let i = 0; i < 30; i += 1) {
      for (let k = 1; k <= 15; k += 1) {
        let rating = 2;
        if (k <= 7 || (k >= 9 && k <= 14)) rating = i < 3 ? 3 : 2;
        if (k === 8) rating = i === 0 ? 4 : 2;
        ratings.push({ managerRef: "M", employeeRef: `E${i}`, skillId: `s${k}`, rating });
      }
    }
    const result = scoreS1(ratings, [family], snapshot);
    expect(result).toMatchObject({
      frameworkSkills: 15,
      coveredSkills: 14,
      targetDepth: 3,
      sufficient: true,
      dataCoverage: 1,
    });
    expect(result.coverageBreadth).toBeCloseTo(93.33333333333333, 12);
    expect(result.coverageDepth).toBeCloseTo(((7 + 1 / 3) / 8) * 100, 12);
    expect(result.criticalSkillsUncovered).toEqual([]);
    const s1 = engine({
      synergy: { s1: { coverageBreadth: 93.3, coverageDepth: 91.7, distribution: 82 } },
      routes: { S1: { tier: "Tier 3", vintage: "2026-08-24" } },
    });
    expect(s1.subDimensions.S1.score).toBeCloseTo(89.9, 1);
  });

  it("needs skills data for 75% of FTE: 74.9% is insufficient, 75% is not; an uncovered critical skill is named", () => {
    const family: RoleFamily = {
      id: "f",
      name: "F",
      skills: [
        { id: "a", name: "Alpha", critical: true, kind: "technical" },
        { id: "b", name: "Beta", critical: true, kind: "behavioural" },
      ],
    };
    const snapshot: Snapshot = {
      members: [
        { employeeRef: "E1", roleFamilyId: "f", fte: 3 },
        { employeeRef: "E2", roleFamilyId: "f", fte: 1 },
      ],
    };
    const ratings: SkillRating[] = [
      { managerRef: "M", employeeRef: "E1", skillId: "a", rating: 4 },
    ];
    const at75 = scoreS1(ratings, [family], snapshot);
    expect(at75).toMatchObject({
      dataCoverage: 0.75,
      sufficient: true,
      criticalSkillsUncovered: ["Beta"],
      targetDepth: 2,
    });
    expect(at75.coverageDepth).toBe(25);
    (snapshot.members[1] as Snapshot["members"][number]).fte = 1.004;
    expect(scoreS1(ratings, [family], snapshot).sufficient).toBe(false);
    expect(scoreS1([], [family], snapshot)).toMatchObject({
      sufficient: false,
      coverageBreadth: 0,
      gini: undefined,
      distribution: undefined,
    });
  });
});

describe("the team rules (3.1, 3.3; Measurement Reference 2.4, 4.5)", () => {
  const ciiMeans = (clarity: number, trust: number, flow: number): TeamCii["means"] => {
    const means: TeamCii["means"] = {};
    const raw = (score: number, reverse: boolean): number =>
      reverse ? 6 - (1 + score / 25) : 1 + score / 25;
    CII_ITEMS.forEach((item, i) => {
      const score = i < 5 ? clarity : i < 10 ? trust : flow;
      means[item] = raw(score, item === "CII-05" || item === "CII-10" || item === "CII-15");
    });
    return means;
  };
  const eight: Array<[string, number, number, number, number, number]> = [
    ["Alpha", 9, 76, 78, 72, 75.5],
    ["Beta", 8, 72, 70, 65, 69.2],
    ["Gamma", 10, 84, 82, 80, 82.1],
    ["Delta", 7, 65, 70, 60, 65.3],
    ["Epsilon", 9, 78, 76, 74, 76.1],
    ["Zeta", 5, 70, 70, 70, 70],
    ["Eta", 8, 70, 68, 65, 67.8],
    ["Theta", 9, 82, 80, 78, 80.1],
  ];
  const cii: TeamCii[] = eight.map(([name, valid, c, t, f]) => ({
    teamId: name.toLowerCase(),
    name,
    validCount: valid,
    responseRate: valid / 10,
    means: ciiMeans(c, t, f),
    flag: "",
  }));
  const o5: TeamO5[] = eight.map(([name, valid]) => ({
    teamId: name.toLowerCase(),
    name,
    fte: 10,
    validCount: valid,
    responseRate: valid / 10,
    means: {},
    score: 70,
    flag: "",
  }));
  const snapshot: Snapshot = { members: [] };

  it("C4 = 73.7 through the engine with Zeta excluded at 50% response", () => {
    const result = applyTeamRules(cii, o5, [], snapshot);
    expect(result.statuses.map((s) => s.valid)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
    ]);
    expect(result.statuses[5]?.reason).toBe("50.0% response, below 70%");
    expect(result.enoughTeams).toBe(true);
    const c4 = engine({ capability: { c4: { items: result.c4Items } } });
    // The Reference sums rounded team scores (5161 / 70); Delta is 65.25 unrounded, so 5160.5 / 70.
    expect(c4.subDimensions.C4.score).toBeCloseTo(5160.5 / 70, 6);
    expect(c4.subDimensions.C4.score).toBeCloseTo(73.7, 1);
  });

  it("Delta at exactly 70% and 7 valid passes; 3 valid or 69% fails; 74% of teams valid fails and 75% passes", () => {
    expect(
      teamStatuses([{ ...(o5[0] as TeamO5), validCount: 4, responseRate: 0.7 }])[0]?.valid,
    ).toBe(true);
    expect(
      teamStatuses([{ ...(o5[0] as TeamO5), validCount: 3, responseRate: 1 }])[0]?.reason,
    ).toBe("3 valid respondents, below 4");
    expect(
      teamStatuses([{ ...(o5[0] as TeamO5), validCount: 69, responseRate: 0.69 }])[0]?.reason,
    ).toBe("69.0% response, below 70%");
    const statuses = (validCount: number, total: number) =>
      Array.from({ length: total }, (_, i) => ({
        ...(teamStatuses([o5[0] as TeamO5])[0] as ReturnType<typeof teamStatuses>[number]),
        valid: i < validCount,
      }));
    expect(enoughTeamsValid(statuses(3, 4))).toBe(true);
    expect(enoughTeamsValid(statuses(74, 100))).toBe(false);
    expect(enoughTeamsValid(statuses(2, 3))).toBe(false);
    expect(enoughTeamsValid([])).toBe(false);
  });

  it("O5 = 71.0 through the engine from the five valid teams", () => {
    const five: Array<[string, number, number, number]> = [
      ["Manager A", 16, 14, 78],
      ["Manager B", 15, 13, 65],
      ["Manager C", 17, 15, 82],
      ["Manager D", 16, 12, 58],
      ["Manager E", 16, 13, 71],
    ];
    const rows: TeamO5[] = five.map(([name, fte, valid, score]) => ({
      teamId: name,
      name,
      fte,
      validCount: valid,
      responseRate: valid / fte,
      means: {},
      score,
      flag: "",
    }));
    const result = applyTeamRules([], rows, [], snapshot);
    expect(result.o5Teams).toHaveLength(5);
    const o5Result = engine({ opportunity: { o5: { teams: result.o5Teams } } });
    expect(o5Result.subDimensions.O5.score).toBeCloseTo(5681 / 80, 10);
  });

  it("FTE-weights each item over the teams that have it, and treats a unit without teams as one team", () => {
    expect(
      weightedItemMeans([
        { fte: 10, means: { "CII-01": 4 } },
        { fte: 30, means: { "CII-01": 2, "CII-02": 5 } },
      ]),
    ).toEqual({ "CII-01": 2.5, "CII-02": 5 });
    const rows = Array.from({ length: 5 }, () => ({
      items: { "CII-01": 4, "OI5-01": 3, "OI5-02": 4, "OI5-03": 5 },
    }));
    const unit: Snapshot = {
      members: Array.from({ length: 6 }, (_, i) => ({ employeeRef: `E${i}`, fte: 1 })),
    };
    const result = applyTeamRules([], [], rows, unit);
    expect(result.statuses).toEqual([
      {
        teamId: "unit",
        name: "Whole unit",
        fte: 6,
        validCount: 5,
        responseRate: 5 / 6,
        valid: true,
        reason: undefined,
      },
    ]);
    expect(result.c4Items).toEqual({ "CII-01": 4 });
    expect(result.o5Teams).toEqual([{ name: "Whole unit", fte: 6, score: 75 }]);
    expect(applyTeamRules([], [], rows.slice(0, 3), unit).enoughTeams).toBe(false);
  });
});
