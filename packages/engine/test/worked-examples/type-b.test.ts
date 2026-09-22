/**
 * Worked examples for the Type B scorers: Measurement Reference 2.1, 2.2, 2.3, 4.5 and 5.2,
 * and the workbook's stored Northwind inputs.
 */
import { describe, expect, it } from "vitest";

import {
  c5IndicatorMean,
  scoreC1Table,
  scoreC2,
  scoreC3,
  scoreC5Blend,
  scoreRoleFamily,
  tenureModerator,
} from "../../src/capability";
import { scoreO5 } from "../../src/opportunity";
import { behaviouralCompositeS2, convertTelemetry } from "../../src/synergy";

describe("C1 Skill (Measurement Reference 2.1)", () => {
  const families = [
    { name: "Customer Service Reps", fte: 50, skillsRequired: 10, confirmedProficiencies: 380 },
    { name: "Team Leaders", fte: 10, skillsRequired: 12, confirmedProficiencies: 92 },
  ];

  it("C1 = 76.1 to one decimal, FTE-weighted, tenure 22 months so no moderator", () => {
    const result = scoreC1Table(families, 22);
    expect(result.families[0]?.familyScore).toBeCloseTo(76.0, 10);
    expect(result.families[1]?.familyScore).toBeCloseTo(76.666666666666671, 10);
    expect(result.tenureModerator).toBe(1);
    expect(result.tier12Score).toBeCloseTo(76.1, 1);
    // The workbook's stored Northwind value (fixture key Capability Inputs!D15)
    expect(result.tier12Score).toBe(76.11111111111111);
  });

  it("applies the tenure moderator at the stated boundaries", () => {
    expect(tenureModerator(17)).toBe(0.95);
    expect(tenureModerator(18)).toBe(1);
    expect(tenureModerator(96)).toBe(1);
    expect(tenureModerator(97)).toBe(1.05);
    expect(tenureModerator(undefined)).toBe(1);
    expect(scoreC1Table(families, 12).tier12Score).toBeCloseTo(76.11111111111111 * 0.95, 10);
  });

  it("caps coverage at 1 and ignores rows with no skills required", () => {
    expect(
      scoreRoleFamily({ fte: 10, skillsRequired: 5, confirmedProficiencies: 80 }).coverageRatio,
    ).toBe(1);
    expect(scoreRoleFamily({ fte: 10, skillsRequired: 0, confirmedProficiencies: 80 })).toEqual({
      coverageRatio: undefined,
      familyScore: undefined,
      fteValid: 0,
      contribution: 0,
    });
    expect(scoreC1Table([{ fte: 10 }], undefined).tier12Score).toBeUndefined();
  });
});

describe("C2 Knowledge (Measurement Reference 2.2)", () => {
  it("C2 = 69.5 to one decimal, criticality-weighted and coverage-adjusted", () => {
    const result = scoreC2([
      { criticality: 3, meanScore: 84, coverage: 0.95 },
      { criticality: 2, meanScore: 71, coverage: 0.8 },
      { criticality: 2, meanScore: 76, coverage: 0.88 },
    ]);
    const adjusted = result.domains.map((d) => d.coverageAdjusted);
    expect(adjusted[0]).toBeCloseTo(79.8, 10);
    expect(adjusted[1]).toBeCloseTo(56.8, 10);
    expect(adjusted[2]).toBeCloseTo(66.88, 10);
    expect(result.score).toBeCloseTo(69.5, 1);
    expect(result.coverageCheck).toBe("OK");
  });

  it("flags insufficient coverage without withholding the score", () => {
    const result = scoreC2([
      { criticality: 3, meanScore: 84, coverage: 0.5 },
      { criticality: 2, meanScore: 71, coverage: 0.8 },
    ]);
    expect(result.coverageCheck).toBe("INSUFFICIENT COVERAGE");
    expect(result.score).toBeCloseTo((84 * 0.5 * 3 + 71 * 0.8 * 2) / 5, 10);
  });

  it("is blank with no valid domain", () => {
    expect(scoreC2(undefined).score).toBeUndefined();
    expect(scoreC2([{ criticality: 3, meanScore: 84 }]).score).toBeUndefined();
  });
});

describe("C3 Talent density (Measurement Reference 2.3)", () => {
  it("C3 = 60.85 from the band distribution", () => {
    // Percentages expressed as counts of 100
    const result = scoreC3({ band5: 8, band4: 22, band3: 50, band2: 15, band1: 5 });
    expect(result.score).toBeCloseTo(60.85, 10);
    expect(result.bandShares.band5).toBeCloseTo(0.08, 10);
  });

  it("reproduces the Northwind stored counts", () => {
    // Capability Inputs B28:B32: 6, 18, 29, 6, 1
    expect(scoreC3({ band5: 6, band4: 18, band3: 29, band2: 6, band1: 1 }).score).toBeCloseTo(
      (600 + 1440 + 1740 + 210) / 60,
      10,
    );
  });

  it("is blank when no counts are entered", () => {
    expect(scoreC3(undefined).score).toBeUndefined();
    expect(scoreC3({}).bandShares.band3).toBeUndefined();
  });
});

describe("C5 Learning velocity (Measurement Reference 2.5)", () => {
  it("C5 = 96.7 to one decimal from three indicators", () => {
    expect(
      scoreC5Blend({ timeToCompetence: 100, adoption: 90, cycleImprovement: 100 }),
    ).toBeCloseTo(96.7, 1);
  });

  it("blends indicators and module 0.6 / 0.4 when both exist, else takes whichever exists", () => {
    expect(scoreC5Blend({ timeToCompetence: 80, adoption: 78, moduleScore: 70 })).toBeCloseTo(
      79 * 0.6 + 70 * 0.4,
      10,
    );
    expect(scoreC5Blend({ timeToCompetence: 80, adoption: 78 })).toBe(79);
    expect(scoreC5Blend({ moduleScore: 70 })).toBe(70);
    expect(scoreC5Blend({})).toBeUndefined();
    expect(c5IndicatorMean({ adoption: 78 })).toBe(78);
  });
});

describe("O5 Leadership enablement (Measurement Reference 4.5)", () => {
  it("O5 = 71.0 FTE-weighted across five teams", () => {
    const result = scoreO5([
      { fte: 16, score: 78 },
      { fte: 15, score: 65 },
      { fte: 17, score: 82 },
      { fte: 16, score: 58 },
      { fte: 16, score: 71 },
    ]);
    expect(result.score).toBeCloseTo(71.0, 1);
    expect(result.contributions).toEqual([1248, 975, 1394, 928, 1136]);
  });

  it("reproduces the Northwind stored teams (four teams of 15)", () => {
    expect(
      scoreO5([
        { fte: 15, score: 70 },
        { fte: 15, score: 64 },
        { fte: 15, score: 66 },
        { fte: 15, score: 64 },
      ]).score,
    ).toBe(66);
  });

  it("mirrors the workbook: a team scoring 0 leaves the denominator, and no scored team gives blank", () => {
    expect(
      scoreO5([
        { fte: 10, score: 0 },
        { fte: 10, score: 60 },
      ]).score,
    ).toBe(60);
    expect(scoreO5([{ fte: 10 }]).score).toBeUndefined();
    expect(scoreO5(undefined).score).toBeUndefined();
  });
});

describe("S2 telemetry bands (Measurement Reference 5.2; Synergy Inputs C12:C16)", () => {
  it("converts the Northwind telemetry to 80, 75, 50, 50 and the composite of 63.75 the S2 example uses", () => {
    // 18 hours is below the 20-hour band edge, so 80. Measurement Reference 5.2: S2 = 0.50 × 63.75 + ...
    const converted = convertTelemetry({
      meetingHoursPerIc: 18,
      meetingHoursPerManager: 32,
      fragmentedTimeRatio: 0.72,
      afterHoursHours: 6,
    });
    expect(converted).toEqual({
      meetingHoursPerIc: 80,
      meetingHoursPerManager: 75,
      fragmentedTimeRatio: 50,
      afterHoursHours: 50,
    });
    expect(behaviouralCompositeS2(converted)).toBe(63.75);
  });

  it("scores the band edges: 15 hours is the second band, 20 the third", () => {
    expect(convertTelemetry({ meetingHoursPerIc: 14.9 }).meetingHoursPerIc).toBe(100);
    expect(convertTelemetry({ meetingHoursPerIc: 15 }).meetingHoursPerIc).toBe(80);
    expect(convertTelemetry({ meetingHoursPerIc: 20 }).meetingHoursPerIc).toBe(60);
  });

  it("uses the floor above the last band and blanks an absent indicator", () => {
    const converted = convertTelemetry({ meetingHoursPerIc: 40, afterHoursHours: 12 });
    expect(converted.meetingHoursPerIc).toBe(20);
    expect(converted.afterHoursHours).toBe(25);
    expect(converted.meetingHoursPerManager).toBeUndefined();
    expect(behaviouralCompositeS2(converted)).toBe(22.5);
    expect(behaviouralCompositeS2(convertTelemetry(undefined))).toBeUndefined();
  });
});
