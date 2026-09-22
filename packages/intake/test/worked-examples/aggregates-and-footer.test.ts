/**
 * The aggregates the recommendations rules read and the methodology footer, through assembleUnit
 * on Northwind and on the full instrument set.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { assembleUnit, INTAKE_VERSION } from "../../src/index";
import { scoreItemMeans } from "../../src/items";
import type { IntakeInput } from "../../src/types";

const northwind = JSON.parse(
  readFileSync(new URL("../../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

describe("aggregates", () => {
  const result = assembleUnit(northwind);

  it("scores the MI1, O2I and TSI3 item groups from the same means, reverse items flipped", () => {
    const means = result.engineInput.motivation?.m1?.items ?? {};
    expect(result.aggregates.m1Engagement).toBe(
      scoreItemMeans(["MI1-01", "MI1-02", "MI1-03", "MI1-04"], means),
    );
    expect(result.aggregates.m1TeamConfidence).toBe(scoreItemMeans(["MI1-05", "MI1-06"], means));
    expect(result.aggregates.o2IaAccess).toBeDefined();
    expect(result.aggregates.o2IaUse).toBeDefined();
    // The IA score is the mean over all six item means, which the two groups bracket.
    const [lo, hi] = [
      result.aggregates.o2IaAccess as number,
      result.aggregates.o2IaUse as number,
    ].sort((a, b) => a - b);
    expect(result.aggregates.informationAccess).toBeGreaterThanOrEqual(lo as number);
    expect(result.aggregates.informationAccess).toBeLessThanOrEqual(hi as number);
    expect(result.aggregates.s3TaskConflict).toBeDefined();
    expect(result.aggregates.s3RelationshipConflict).toBeDefined();
  });

  it("carries the component scores, per-process friction and the four teams' M1, M2 and O5", () => {
    expect(result.aggregates.decisionRights).toBeCloseTo(61, 12);
    expect(result.aggregates.cascade).toBeCloseTo(65.1041666666667, 10);
    expect(result.aggregates.processFriction.map((p) => p.score !== undefined)).toEqual([
      true,
      true,
      false,
    ]);
    expect(result.aggregates.toolInventory).toBeUndefined();
    expect(result.aggregates.teams).toHaveLength(4);
    for (const team of result.aggregates.teams) {
      expect(team.m1).toBeDefined();
      expect(team.m2).toBeDefined();
      expect(team.o5).toBeDefined();
    }
    expect(result.teams.map((t) => t.o5)).toEqual([
      70.83333333333334, 64.58333333333334, 66.66666666666666, 64.58333333333334,
    ]);
    expect(result.teams[0]?.m2).toBe(result.aggregates.teams[0]?.m2);
    expect(result.aggregates).toMatchObject({
      c3GuardFired: false,
      formalRatingsFailedAcceptance: false,
      criticalSkillsUncovered: [],
      c1CoverageByKind: [],
    });
  });

  it("leaves a group blank unless every item of the group was deployed", () => {
    const pulse = structuredClone(northwind);
    pulse.campaign.deployed = { partA: ["MI1-01", "MI1-02", "MI1-03", "MI1-04", "MI1-05"] };
    const partial = assembleUnit(pulse);
    expect(partial.aggregates.m1Engagement).toBeDefined();
    expect(partial.aggregates.m1TeamConfidence).toBeUndefined();
    expect(partial.aggregates.o2IaAccess).toBeUndefined();
  });
});

describe("the methodology footer", () => {
  const result = assembleUnit(northwind);

  it("states the route, the instruments with rates, the exclusions and the speed-check outcome", () => {
    expect(result.methodology.route).toBe(
      "Online, self-administered, Tier 3 instruments; C3 from M-C3-MGR.",
    );
    const partA = result.methodology.instruments.find((i) => i.instrument === "Part A M2");
    expect(partA).toMatchObject({ deployed: true, validCount: 48, responseRate: 0.8 });
    expect(result.methodology.instruments.find((i) => i.instrument === "M-C1-MGR")).toMatchObject({
      deployed: false,
    });
    expect(result.methodology.exclusions.members).toMatchObject({
      received: 50,
      valid: 48,
      exclusionRate: 0.04,
    });
    expect(result.methodology.standingStatements).toContain(
      "The speed check did not run for the member survey (50 received; it needs 20 with recorded times).",
    );
    expect(result.methodology.standingStatements[0]).toContain("self-reported");
    expect(result.methodology.standingStatements).toContain(
      "The leadership survey is not screened for response validity.",
    );
  });

  it("lists the insufficiencies with reasons and nothing carried forward on a first campaign", () => {
    expect(result.insufficiencies.map((i) => i.subDimension)).toEqual([
      "C1",
      "S1",
      "C2",
      "C3",
      "C5",
      "O1",
      "O2",
      "O4",
    ]);
    expect(result.insufficiencies.find((i) => i.subDimension === "O2")?.reason).toContain("ADM-O2");
    expect(result.methodology.carriedForward).toEqual([]);
    expect(result.methodology.adjustments).toEqual([]);
    expect(result.intakeVersion).toBe(INTAKE_VERSION);
  });

  it("names the confidence cap and the deductions not applied when they arise", () => {
    const input = structuredClone(northwind);
    input.formalRatings = {
      scaleMap: [
        { label: "Meets", band: 3 },
        { label: "Top", band: 5 },
      ],
      calibrated: false,
    };
    input.snapshot.members.forEach((m, i) => {
      m.formalRating = { label: i % 4 === 0 ? "Top" : "Meets", date: "2026-02-01" };
    });
    const formal = assembleUnit(input);
    expect(formal.c3Route).toMatchObject({
      source: "formal",
      treatment: "uncalibrated-capped",
      confidenceCap: "Medium",
      ratingDate: "2026-02-01",
    });
    expect(formal.methodology.route).toContain("not accepted as calibrated");
    expect(
      formal.methodology.standingStatements.some((s) =>
        s.startsWith("C3 confidence is capped at Medium"),
      ),
    ).toBe(true);
    expect(formal.aggregates.formalRatingsFailedAcceptance).toBe(true);
    expect(formal.engineInput.routes?.C3).toMatchObject({ tier: "Tier 3", vintage: "2026-02-01" });
    expect(formal.engineInput.capability?.c3).toEqual({
      band5: 9,
      band4: 6,
      band3: 45,
      band2: 0,
      band1: 0,
    });
  });
});
