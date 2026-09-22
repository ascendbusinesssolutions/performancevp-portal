/**
 * DLP: the workbook's stored Northwind sample (43 decisions) and the Measurement Reference 6.7
 * class weighting. Retained for parity; the online product supplies no decisions.
 */
import { describe, expect, it } from "vitest";

import { DLP_CLASS_WEIGHTS } from "../../src/constants";
import { latencyScore, scoreDlp } from "../../src/dlp";
import type { DecisionClass, DecisionInput } from "../../src/types";

const LATENCIES: Record<DecisionClass, number[]> = {
  Operational: [1, 1, 2, 2, 2, 3, 3, 3, 4, 5, 5, 6, 6, 7, 7, 8, 10, 12, 14, 18],
  Tactical: [5, 7, 9, 10, 11, 12, 14, 16, 18, 20, 22, 26, 30, 34, 40],
  Strategic: [35, 50, 60, 80, 100, 130, 160, 200],
};
const NORTHWIND: DecisionInput[] = (["Operational", "Tactical", "Strategic"] as const).flatMap(
  (c) =>
    LATENCIES[c].map((latencyDays, i) => ({
      id: `${c.slice(0, 2).toUpperCase()}-${i + 1}`,
      class: c,
      latencyDays,
    })),
);

describe("per-decision latency scores (DLP D; Measurement Reference 6.5)", () => {
  it("reproduces the stored Northwind scores at the band edges and inside the bands", () => {
    expect(latencyScore("Operational", 1)).toBe(100);
    expect(latencyScore("Operational", 2)).toBe(87.5);
    expect(latencyScore("Operational", 3)).toBe(75);
    expect(latencyScore("Operational", 7)).toBe(50);
    expect(latencyScore("Operational", 14)).toBe(25);
    expect(latencyScore("Operational", 18)).toBeCloseTo(17.8571428571429, 12);
    expect(latencyScore("Tactical", 26)).toBeCloseTo(42.3076923076923, 12);
    expect(latencyScore("Strategic", 35)).toBeCloseTo(95.8333333333333, 12);
    expect(latencyScore("Strategic", 200)).toBeCloseTo(16.6666666666667, 12);
  });

  it("floors at 0 far beyond the 90th percentile and is blank without a latency or class", () => {
    expect(latencyScore("Operational", 100)).toBe(0);
    expect(latencyScore("Operational", undefined)).toBeUndefined();
    expect(latencyScore(undefined, 5)).toBeUndefined();
  });
});

describe("class DLS, overall DLS, sample warnings and the longest five (DLP B49:E52; Report Data C76:D84)", () => {
  const result = scoreDlp(NORTHWIND);

  it("reproduces the stored Northwind class and overall DLS", () => {
    expect(result.operational.dls).toBeCloseTo(62.7232142857143, 12);
    expect(result.tactical.dls).toBeCloseTo(62.6373626373626, 12);
    expect(result.strategic.dls).toBeCloseTo(55.2083333333333, 12);
    expect(result.overall).toBeCloseTo(60.814445970696, 12);
    expect([result.operational.sample, result.tactical.sample, result.strategic.sample]).toEqual([
      20, 15, 8,
    ]);
    expect([result.operational.warning, result.tactical.warning, result.strategic.warning]).toEqual(
      ["", "", ""],
    );
    expect(result.sampleN).toBe(43);
  });

  it("lists the five longest decisions, all Strategic, with blank descriptions", () => {
    expect(result.longestFive.map((d) => d.latencyDays)).toEqual([200, 160, 130, 100, 80]);
    expect(result.longestFive.every((d) => d.class === "Strategic" && d.description === "")).toBe(
      true,
    );
  });

  it("warns below the minimum sample and blanks the overall DLS when a class is empty", () => {
    const small = scoreDlp([
      { class: "Operational", latencyDays: 2 },
      { class: "Tactical", latencyDays: 10 },
    ]);
    expect(small.operational.warning).toBe("BELOW MIN (10)");
    expect(small.tactical.warning).toBe("BELOW MIN (5)");
    expect(small.strategic).toEqual({ dls: undefined, sample: 0, warning: "BELOW MIN (3)" });
    expect(small.overall).toBeUndefined();
    expect(small.longestFive.map((d) => d.latencyDays)).toEqual([
      10,
      2,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("is entirely blank with no decisions, as on the online route", () => {
    const none = scoreDlp(undefined);
    expect(none.overall).toBeUndefined();
    expect(none.sampleN).toBe(0);
    expect(none.operational.sample).toBe(0);
    expect(none.decisions).toEqual([]);
  });

  it("weights classes 0.40 / 0.35 / 0.25: the 6.7 example's class values give 60.1", () => {
    const overall =
      DLP_CLASS_WEIGHTS.Operational * 73.3 +
      DLP_CLASS_WEIGHTS.Tactical * 58 +
      DLP_CLASS_WEIGHTS.Strategic * 42;
    expect(overall).toBeCloseTo(60.1, 1);
  });
});
