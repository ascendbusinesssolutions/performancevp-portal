/**
 * M-C1-MGR, M-C3-MGR and M-C5-TL on constructed inputs. The Excel-generated fixtures in
 * fixtures/parity/ hold the same scenarios cell by cell; these tests state the rules in words.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { managerRows, scoreC1 } from "../../src/modules/c1-mgr";
import { scoreC3 } from "../../src/modules/c3-mgr";
import { leaderScore, scoreC5 } from "../../src/modules/c5-tl";
import type { IntakeInput, RoleFamily, TeamLeaderResponse } from "../../src/types";
import { runSurveyWorkbook } from "../../src/workbook";

function fixtureInput(name: string): IntakeInput {
  return (
    JSON.parse(
      readFileSync(new URL(`../../fixtures/parity/${name}.json`, import.meta.url), "utf8"),
    ) as { input: IntakeInput }
  ).input;
}

const family: RoleFamily = {
  id: "f",
  name: "Family",
  skills: [1, 2, 3, 4].map((i) => ({
    id: `s${i}`,
    name: `S${i}`,
    critical: i < 3,
    kind: "technical",
  })),
};

describe("M-C1-MGR", () => {
  const snapshot = {
    members: [
      { employeeRef: "E1", roleFamilyId: "f", fte: 1, managerRef: "M1" },
      { employeeRef: "E2", roleFamilyId: "f", fte: 0.5, managerRef: "M1" },
      { employeeRef: "E3", fte: 1, managerRef: "M2" },
      { employeeRef: "E4", roleFamilyId: "f", fte: 1, managerRef: "M3" },
    ],
  };
  const ratings = {
    skills: [
      { managerRef: "M1", employeeRef: "E1", skillId: "s1", rating: 3 },
      { managerRef: "M1", employeeRef: "E1", skillId: "s2", rating: 2 },
      { managerRef: "M1", employeeRef: "E1", skillId: "s3", rating: 5 },
      { managerRef: "M1", employeeRef: "E1", skillId: "s4", rating: 4 },
      { managerRef: "M1", employeeRef: "E2", skillId: "s1", rating: 3 },
      { managerRef: "M2", employeeRef: "E3", skillId: "s1", rating: 5 },
    ],
    talentBands: [{ managerRef: "M2", employeeRef: "E3", band: 4 }],
  };

  it("scores each rated person as proficient skills (3 or more) over the framework's count", () => {
    const rows = managerRows(ratings, [family], snapshot);
    expect(rows.map((r) => [r.managerRef, r.employeeRef, r.coverage, r.newManager])).toEqual([
      ["M1", "E1", 0.75, 1],
      ["M1", "E2", 0.25, 0],
      ["M2", "E3", undefined, 1], // no role family in the snapshot: blank, as the workbook's VLOOKUP
    ]);
    expect(rows[0]?.skills).toEqual([3, 2, 5, 4]);
    expect(rows[1]?.skills).toEqual([3, undefined, undefined, undefined]);
    expect(rows[2]?.band).toBe(4);
  });

  it("averages coverage per family unweighted, weights families by FTE, and counts distinct raters", () => {
    const rows = managerRows(ratings, [family], snapshot);
    const result = scoreC1(rows, [family], snapshot, 3);
    // E1 0.75 and E2 0.25: mean 0.5; E4 is in the family (FTE 2.5 total) but unrated.
    expect(result.families[0]).toMatchObject({ coverage: 0.5, score: 50, fte: 2.5 });
    expect(result.score).toBe(50);
    expect(result).toMatchObject({
      distinctManagers: 2,
      responseRate: 2 / 3,
      rateFlag: "LOW manager response",
    });
    expect(scoreC1(rows, [family], snapshot, 2).rateFlag).toBe("ok");
    expect(scoreC1(rows, [family], snapshot, 0).responseRate).toBeUndefined();
  });

  it("treats a family with FTE and no ratings as scoring 0 in the weighted mean, as SUMPRODUCT does", () => {
    const empty: RoleFamily = { id: "g", name: "Empty", skills: family.skills };
    const withEmpty = {
      members: [...snapshot.members, { employeeRef: "E5", roleFamilyId: "g", fte: 2.5 }],
    };
    const rows = managerRows(ratings, [family, empty], withEmpty);
    const result = scoreC1(rows, [family, empty], withEmpty, 3);
    expect(result.families[1]).toMatchObject({ coverage: undefined, score: undefined, fte: 2.5 });
    expect(result.score).toBe(25);
    expect(scoreC1(rows, [], withEmpty, 3).score).toBeUndefined();
  });
});

describe("M-C3-MGR", () => {
  const rowsWithBands = (bands: number[]) =>
    bands.map((band, i) => ({
      managerRef: "M",
      employeeRef: `E${i}`,
      roleFamilyId: undefined,
      skills: [],
      band,
      coverage: undefined,
      newManager: i === 0 ? (1 as const) : (0 as const),
    }));

  it("leaves counts alone when neither rule fires", () => {
    const result = scoreC3(rowsWithBands([2, 3, 3, 4, 3, 2, 3, 4, 3, 3]));
    expect(result.raw).toEqual([0, 2, 6, 2, 0]);
    expect(result.final).toEqual([0, 2, 6, 2, 0]);
    expect(result).toMatchObject({ total: 10, rawMean: 3, capApplied: false, skewApplied: false });
    expect(result.band1Check).toBe("Band1<5%: verify (not auto-adjusted)");
  });

  it("caps Band 5 at 25% of the rated total with the excess to Band 4, then skews on the capped mean", () => {
    const result = scoreC3(rowsWithBands([5, 5, 5, 5, 5, 4, 3, 3, 2]));
    expect(result.capped).toEqual([0, 1, 2, 3.75, 2.25]);
    expect(result.cappedMean).toBeCloseTo(34.25 / 9, 12);
    expect(result.skewApplied).toBe(true);
    expect(result.final.map((v) => Number(v.toFixed(12)))).toEqual([0.2, 1.2, 2.35, 3.45, 1.8]);
    expect(result.final.reduce((a, b) => a + b, 0)).toBeCloseTo(9, 12);
  });

  it("skews without a cap when the mean exceeds 3.5, and not at exactly 3.5", () => {
    const skewed = scoreC3(rowsWithBands([4, 4, 4, 4, 5, 4, 3, 4, 4]));
    expect(skewed).toMatchObject({ capApplied: false, skewApplied: true, rawMean: 4 });
    const trigger = scoreC3(rowsWithBands([2, 3, 3, 4, 4, 4, 4, 4, 4, 3]));
    expect(trigger.cappedMean).toBe(3.5);
    expect(trigger.skewApplied).toBe(false);
    expect(trigger.band1Check).toBe("Band1<5%: verify (not auto-adjusted)");
    expect(scoreC3(rowsWithBands([1, 3, 3, 3, 3, 3, 3, 3, 3, 3])).band1Check).toBe("ok");
  });

  it("is all zeros with nothing rated, and ignores a band outside 1 to 5", () => {
    expect(scoreC3([])).toMatchObject({
      total: 0,
      rawMean: undefined,
      band1Check: undefined,
      final: [0, 0, 0, 0, 0],
    });
    expect(scoreC3(rowsWithBands([6, 3])).total).toBe(1);
  });
});

describe("M-C5-TL", () => {
  const leader = (values: number[]): TeamLeaderResponse => {
    const items: TeamLeaderResponse["items"] = {};
    values.forEach((v, i) => {
      items[`C5L-${String(i + 1).padStart(2, "0")}` as keyof TeamLeaderResponse["items"]] = v;
    });
    return { items };
  };

  it("scores a leader as (mean of the answered items − 1) × 25 and a blank row as blank", () => {
    expect(leaderScore(leader([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]))).toBe(75);
    expect(leaderScore(leader([5, 3]))).toBe(75);
    expect(leaderScore({ items: {} })).toBeUndefined();
  });

  it("rates leaders with a score over the headcount and averages across them", () => {
    const rows = [leader([4, 4, 4]), leader([2, 2, 2]), { id: "blank", items: {} }];
    const result = scoreC5(rows, 4);
    expect(result.leaderScores).toEqual([75, 25, undefined]);
    expect(result).toMatchObject({
      responseRate: 0.5,
      rateFlag: "LOW team-leader response",
      score: 50,
    });
    expect(scoreC5(rows, 2).rateFlag).toBe("ok");
    expect(scoreC5([], 3)).toMatchObject({ responseRate: 0, score: undefined });
  });
});

describe("the generated manager fixtures through the mirror", () => {
  it("managers-neither: three families, part-time FTE, an unrated report, a report without a family", () => {
    const result = runSurveyWorkbook(fixtureInput("managers-neither"));
    expect(result.typeC.c1.rows).toHaveLength(10);
    expect(result.typeC.c1.rows.find((r) => r.employeeRef === "E11")?.coverage).toBeUndefined();
    expect(result.typeC.c1.families.map((f) => f.fte)).toEqual([3.6, 2.8, 3.5]);
    expect(result.typeC.c1).toMatchObject({
      distinctManagers: 4,
      responseRate: 0.8,
      rateFlag: "ok",
    });
    expect(result.typeC.c3).toMatchObject({ capApplied: false, skewApplied: false });
  });

  it("managers-trigger: the mean band sits exactly at 3.5 and the skew does not fire", () => {
    const result = runSurveyWorkbook(fixtureInput("managers-trigger"));
    expect(result.typeC.c3.cappedMean).toBe(3.5);
    expect(result.typeC.c3.skewApplied).toBe(false);
  });
});
