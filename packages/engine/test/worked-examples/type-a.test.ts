/**
 * Worked examples for the Type A scorers, from the Measurement Reference and the workbook's
 * stored Northwind inputs. Each assertion states the document and its stated precision.
 */
import { describe, expect, it } from "vitest";

import { composeC4, scoreC4 } from "../../src/capability";
import { scoreM1Tier3, scoreM2, scoreM3, scoreM4, scoreTripWire } from "../../src/motivation";
import { perceptionO1, perceptionO4 } from "../../src/opportunity";
import { perceptionS2, scoreS3 } from "../../src/synergy";

describe("C4 Collective intelligence (Measurement Reference 2.4)", () => {
  it("composes each team's sub-constructs at 0.35 / 0.35 / 0.30 to the stated one decimal", () => {
    // The eight-team worked example. Team Zeta is excluded upstream for a 50% response rate; the
    // unit-level FTE weighting across teams has no workbook cell and is asserted in the intake
    // package (Milestone 2), where 73.7 is reproduced end to end.
    const teams: Array<[number, number, number, number]> = [
      [76, 78, 72, 75.5],
      [72, 70, 65, 69.2],
      [84, 82, 80, 82.1],
      [65, 70, 60, 65.3],
      [78, 76, 74, 76.1],
      [70, 68, 65, 67.8],
      [82, 80, 78, 80.1],
    ];
    for (const [clarity, trust, flow, expected] of teams) {
      expect(composeC4(clarity, trust, flow)).toBeCloseTo(expected, 1);
    }
  });

  it("is blank when any sub-construct is blank", () => {
    expect(composeC4(76, undefined, 72)).toBeUndefined();
    expect(scoreC4({ "CII-01": 4 }).score).toBeUndefined();
  });

  it("reproduces the Northwind sub-constructs from the workbook's item means", () => {
    // Capability Inputs B37:B51
    const result = scoreC4({
      "CII-01": 3.9,
      "CII-02": 3.8,
      "CII-03": 4,
      "CII-04": 3.8,
      "CII-05": 2.15,
      "CII-06": 3.8,
      "CII-07": 3.9,
      "CII-08": 3.7,
      "CII-09": 3.85,
      "CII-10": 2.2,
      "CII-11": 3.8,
      "CII-12": 3.7,
      "CII-13": 3.75,
      "CII-14": 3.8,
      "CII-15": 2.3,
    });
    // Clarity: mean of 3.9, 3.8, 4, 3.8, 3.85 (CII-05 flipped) = 3.87 → 71.75
    // Trust: 3.8, 3.9, 3.7, 3.85, 3.8 (CII-10 flipped) = 3.81 → 70.25
    // Flow: 3.8, 3.7, 3.75, 3.8, 3.7 (CII-15 flipped) = 3.75 → 68.75
    expect(result.clarity).toBeCloseTo(71.75, 10);
    expect(result.trust).toBeCloseTo(70.25, 10);
    expect(result.flow).toBeCloseTo(68.75, 10);
    expect(result.score).toBeCloseTo(0.35 * 71.75 + 0.35 * 70.25 + 0.3 * 68.75, 10);
  });
});

describe("M1 to M4 (Measurement Reference 3.1 to 3.4)", () => {
  it("M2 = 75 from the five MI2 items with MI2-05 reversed", () => {
    expect(
      scoreM2({ "MI2-01": 4.1, "MI2-02": 3.8, "MI2-03": 4.2, "MI2-04": 3.9, "MI2-05": 2.0 }),
    ).toBeCloseTo(75, 10);
  });

  it("M3 = 75 from the five MI3 items with MI3-04 reversed", () => {
    expect(
      scoreM3({ "MI3-01": 4.2, "MI3-02": 4.0, "MI3-03": 3.6, "MI3-04": 2.1, "MI3-05": 4.3 }),
    ).toBeCloseTo(75, 10);
  });

  it("M4 applies the conversion with MI4-04 reversed (the 3.4 example is a platform composite with no item means)", () => {
    expect(scoreM4({ "MI4-01": 4, "MI4-02": 4, "MI4-03": 4, "MI4-04": 2 })).toBe(75);
  });

  it("M1 Tier 3 path scores the Northwind MI-1 items to 72.34375 (D17); D19 reads 72 because the route is Tier 1)", () => {
    // Motivation Inputs B8:B15. The stored Northwind M1 of 72 is the platform composite in D5.
    expect(
      scoreM1Tier3({
        "MI1-01": 3.9,
        "MI1-02": 3.8,
        "MI1-03": 4,
        "MI1-04": 2.1,
        "MI1-05": 3.85,
        "MI1-06": 3.9,
        "MI1-07": 3.8,
        "MI1-08": 4,
      }),
    ).toBeCloseTo(72.34375, 10);
  });
});

describe("trip-wires (Measurement Reference 8.4; Motivation Inputs C52:D54)", () => {
  it("scores (mean − 1) × 25 and flags below 60", () => {
    // Northwind TW3 mean 3.32: (3.32 − 1) × 25 is 57.99999999999999 in floating point, below 60.
    const basicConditions = scoreTripWire(3.32);
    expect(basicConditions.score).toBeCloseTo(58, 10);
    expect(basicConditions.flag).toBe("CRITICAL FINDING");
    expect(scoreTripWire(3.88)).toEqual({ score: 72, flag: "" });
  });

  it("does not flag exactly 60 and flags just below it", () => {
    expect(scoreTripWire(3.4)).toEqual({ score: 60, flag: "" });
    expect(scoreTripWire(3.39).flag).toBe("CRITICAL FINDING");
  });

  it("is blank and unflagged when not measured", () => {
    expect(scoreTripWire(undefined)).toEqual({ score: undefined, flag: "" });
  });
});

describe("perception layers and S3", () => {
  it("O1 perception reproduces the fixture README's 59.999999999999986 from computed means", () => {
    // Scenario a_nominal15_real: OI1 means 3.4 with the two reverse items at 2.6
    const perception = perceptionO1({
      "OI1-01": 3.4,
      "OI1-02": 3.4,
      "OI1-03": 2.6,
      "OI1-04": 3.4,
      "OI1-05": 3.4,
      "OI1-06": 2.6,
      "OI1-07": 3.4,
      "OI1-08": 3.4,
    });
    expect(perception).toBe(59.999999999999986);
  });

  it("O4 perception reproduces the Northwind value of 40", () => {
    expect(perceptionO4({ "OI4-01": 2.7, "OI4-02": 2.5, "OI4-03": 3.4 })).toBeCloseTo(40, 10);
  });

  it("S2 perception reproduces the Northwind value of 45", () => {
    expect(perceptionS2({ "TSI2-01": 2.8, "TSI2-02": 2.8, "TSI2-03": 3.2 })).toBeCloseTo(45, 10);
  });

  it("S3 = 66.0 (Measurement Reference 5.3)", () => {
    expect(
      scoreS3({ "TSI3-01": 3.8, "TSI3-02": 3.6, "TSI3-03": 3.4, "TSI3-04": 2.4, "TSI3-05": 2.2 }),
    ).toBeCloseTo(66.0, 1);
  });
});
