/**
 * Composite Scoring worked examples: Measurement Reference 9.2 to 9.4 and the fixture file's
 * blank and Northwind scenarios.
 */
import { describe, expect, it } from "vitest";

import {
  DisabledArchetypeError,
  archetypeWeights,
  compositeScores,
  pScore,
  synergyCoefficient,
} from "../../src/composite";
import { SUB_DIMENSION_CODES, type SubDimensionCode } from "../../src/types";
import { type Cell } from "../../src/excel";

function scores(
  partial: Partial<Record<SubDimensionCode, number>>,
): Record<SubDimensionCode, Cell> {
  const out = {} as Record<SubDimensionCode, Cell>;
  for (const code of SUB_DIMENSION_CODES) out[code] = partial[code];
  return out;
}

/** The Northwind sub-dimension scores: fixture scenario nw (after) for the key cells, the workbook's stored values for the rest. */
const NORTHWIND = scores({
  C1: 76.11111111111111,
  C2: 73.7942857142857,
  C3: 66.5,
  C4: 70.325,
  C5: 79,
  M1: 72,
  M2: 75,
  M3: 67,
  M4: 60,
  O1: 61.22812499999999,
  O2: 69.25,
  O3: 55.25,
  O4: 47.5,
  O5: 66,
  S1: 85.75,
  S2: 54.37499999999999,
  S3: 65.99999999999999,
});

describe("Synergy coefficient (Measurement Reference 5.4 and 9.3)", () => {
  it("maps S_internal 56 to 1.018 and neutral 50 to 1.00", () => {
    expect(synergyCoefficient(56)).toBeCloseTo(1.018, 12);
    expect(synergyCoefficient(50)).toBe(1);
  });

  it("is bounded to 0.85 and 1.15", () => {
    expect(synergyCoefficient(0)).toBe(0.85);
    expect(synergyCoefficient(100)).toBeCloseTo(1.15, 12);
    expect(synergyCoefficient(150)).toBeCloseTo(1.15, 12);
    expect(synergyCoefficient(-20)).toBe(0.85);
  });
});

describe("P (Measurement Reference 9.4)", () => {
  it("uses the weighted analytical form: C 72, M 70, O 62, S 1.018", () => {
    // The document rounds the geometric mean to 68.5 and prints P = 69.7; at full precision the
    // geometric mean is 68.58 and P is 69.82. The workbook computes at full precision.
    const P = pScore(72, 70, 62, 1.018);
    expect(P).toBeCloseTo(69.8154, 3);
    expect(P).not.toBeCloseTo(Math.cbrt(72 * 70 * 62) * 1.018, 1);
  });

  it("is blank when any component is blank", () => {
    expect(pScore(undefined, 70, 62, 1)).toBeUndefined();
    expect(pScore(72, 70, undefined, 1)).toBeUndefined();
  });
});

describe("composites with reallocation (Measurement Reference 9.2; Workbook Spec Part 10)", () => {
  it("reallocates C without C4 to 0.4375 / 0.1875 / 0.25 / 0.125 and records the weight sum", () => {
    const result = compositeScores(scores({ C1: 80, C2: 80, C3: 80, C5: 80 }), "Default");
    expect(result.normalisedWeights.C1).toBeCloseTo(0.4375, 12);
    expect(result.normalisedWeights.C2).toBeCloseTo(0.1875, 12);
    expect(result.normalisedWeights.C3).toBeCloseTo(0.25, 12);
    expect(result.normalisedWeights.C5).toBeCloseTo(0.125, 12);
    expect(result.normalisedWeights.C4).toBe(0);
    expect(result.weightSums.C).toBeCloseTo(0.8, 12);
    expect(result.C).toBeCloseTo(80, 12);
  });

  it("reproduces the Northwind components, S and P stored in the fixture file", () => {
    const result = compositeScores(NORTHWIND, "Default");
    expect(result.C).toBeCloseTo(72.97303174603177, 9);
    expect(result.M).toBeCloseTo(70.05, 9);
    expect(result.O).toBeCloseTo(61.380937499999995, 9);
    expect(result.sInternal).toBeCloseTo(67.27499999999999, 9);
    expect(result.S).toBeCloseTo(1.051825, 9);
    // SUM(F) is the workbook's denominator; the fixture's *_weights_sum is the sum of the
    // normalised weights rounded to 12 places, which is 1 for every component here.
    for (const key of ["C", "M", "O", "S"] as const) {
      expect(result.weightSums[key]).toBeCloseTo(1, 12);
    }
    const normalisedSum = (component: "C" | "M" | "O" | "S") =>
      Number(
        SUB_DIMENSION_CODES.filter((code) => code.startsWith(component))
          .reduce((total, code) => total + result.normalisedWeights[code], 0)
          .toFixed(12),
      );
    expect([
      normalisedSum("C"),
      normalisedSum("M"),
      normalisedSum("O"),
      normalisedSum("S"),
    ]).toEqual([1, 1, 1, 1]);
    expect(result.P).toBeCloseTo(72.3139293565219, 9);
  });

  it("the blank scenario: no scores gives blank components and P, S_internal 50 and S 1.00", () => {
    const result = compositeScores(scores({}), "Default");
    expect(result.C).toBeUndefined();
    expect(result.M).toBeUndefined();
    expect(result.O).toBeUndefined();
    expect(result.P).toBeUndefined();
    expect(result.sInternal).toBe(50);
    expect(result.S).toBe(1);
    expect(result.weightSums).toEqual({ C: 0, M: 0, O: 0, S: 0 });
  });

  it("one missing component blanks P but not the others (scenario o_none)", () => {
    const result = compositeScores(scores({ C1: 80, M1: 70, S1: 60 }), "Default");
    expect(result.C).toBe(80);
    expect(result.M).toBe(70);
    expect(result.O).toBeUndefined();
    expect(result.P).toBeUndefined();
    expect(result.normalisedWeights.M1).toBe(1);
  });

  it("refuses a disabled archetype with a typed error and still holds its weights", () => {
    expect(() => compositeScores(NORTHWIND, "Healthcare")).toThrow(DisabledArchetypeError);
    expect(() => archetypeWeights("Nonsense" as never)).toThrow(DisabledArchetypeError);
    expect(archetypeWeights("Default").M1).toBe(0.5);
  });
});
