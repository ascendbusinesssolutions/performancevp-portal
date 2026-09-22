/**
 * Worked examples for the Type C components, the two-layer combination, S1, S2, the flags and the
 * tier routing. Measurement Reference 4.1 to 4.4, 5.1 to 5.3, 8.1 to 8.3; the workbook's stored
 * Northwind inputs; and the routing scenarios in the 50-scenario fixture file.
 */
import { describe, expect, it } from "vitest";

import {
  combineTwoLayer,
  perceptionO1,
  scoreO4,
  structuralO1,
  structuralO2,
  structuralO3,
} from "../../src/opportunity";
import { routeC1, routeC5, routeM1 } from "../../src/routes";
import { combineS2, falseConsensusFlag, scoreS1 } from "../../src/synergy";
import { scoreTriangulators } from "../../src/triangulators";

describe("O1 to O3 two-layer composites (Measurement Reference 4.1 to 4.3 and 8.1)", () => {
  it("O1 = 61.2: structural 62.3 from 62 / 60 / 65, perception 60, gap 2.3, mean of the layers", () => {
    const structural = structuralO1({
      decisionRightsScore: 62,
      roleArchitectureScore: 60,
      cascadeScore: 65,
    });
    expect(structural).toBeCloseTo(62.3, 10);
    const result = combineTwoLayer(structural, 60);
    expect(result.gap).toBeCloseTo(2.3, 10);
    expect(result.gapFlag).toBe("");
    // (62.3 + 60) / 2 = 61.15, which the document prints as 61.2
    expect(result.score).toBeCloseTo(61.15, 10);
  });

  it("fires the gap flag at 78 / 56 and the perception score feeds the composite (DECISIONS.md 1.1)", () => {
    expect(combineTwoLayer(78, 56)).toEqual({
      structural: 78,
      perception: 56,
      gap: 22,
      gapFlag: "GAP - report separately",
      score: 56,
    });
    // Either direction
    expect(combineTwoLayer(56, 78)).toMatchObject({
      gap: -22,
      gapFlag: "GAP - report separately",
      score: 78,
    });
  });

  it("does not fire at a gap of exactly 15 and fires at 15.01 (fixture scenarios a_gap15, a_gap1501)", () => {
    expect(combineTwoLayer(75, 60)).toMatchObject({ gap: 15, gapFlag: "", score: 67.5 });
    expect(combineTwoLayer(75.01, 60)).toMatchObject({
      gapFlag: "GAP - report separately",
      score: 60,
    });
  });

  it("reproduces scenario a_nominal15_real: a computed gap of 15.000000000000014 does not fire", () => {
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
    const structural = structuralO1({
      decisionRightsScore: 75,
      roleArchitectureScore: 75,
      cascadeScore: 75,
    });
    const result = combineTwoLayer(structural, perception);
    expect(result.gap).toBe(15.000000000000014);
    expect(result.gapFlag).toBe("");
    expect(result.score).toBe(67.5);
  });

  it("is blank, with no gap and no flag, when either layer is blank (Workbook Spec 1.8)", () => {
    expect(structuralO1({ decisionRightsScore: 62, roleArchitectureScore: 60 })).toBeUndefined();
    expect(combineTwoLayer(undefined, 60)).toEqual({
      structural: undefined,
      perception: 60,
      gap: undefined,
      gapFlag: "",
      score: undefined,
    });
    expect(combineTwoLayer(62.3, undefined).score).toBeUndefined();
  });

  it("O2 = 69.3: Northwind structural 73.5 from 80 / 70 / 70 with perception 65", () => {
    const structural = structuralO2({
      toolInventoryScore: 80,
      informationAccessScore: 70,
      integrationScore: 70,
    });
    expect(structural).toBe(73.5);
    expect(combineTwoLayer(structural, 65).score).toBeCloseTo(69.3, 1);
  });

  it("O3 = 55.0: structural 60 with perception 50", () => {
    expect(structuralO3({ processFrictionScore: 60 })).toBe(60);
    expect(combineTwoLayer(60, 50).score).toBeCloseTo(55.0, 1);
  });
});

describe("O4 Resource adequacy (Measurement Reference 4.4)", () => {
  it("O4 = 47.5 from capacity 55 and perception 40, both required", () => {
    expect(scoreO4(55, 40)).toBe(47.5);
    expect(scoreO4(undefined, 40)).toBeUndefined();
    expect(scoreO4(55, undefined)).toBeUndefined();
  });
});

describe("S1 Skill complementarity (Measurement Reference 5.1)", () => {
  it("S1 = 89.9 from breadth 93.3, depth 91.7, distribution 82", () => {
    expect(scoreS1({ coverageBreadth: 93.3, coverageDepth: 91.7, distribution: 82 })).toBeCloseTo(
      89.9,
      1,
    );
  });

  it("reproduces the Northwind stored value of 85.75 and is blank with a missing component", () => {
    expect(scoreS1({ coverageBreadth: 90, coverageDepth: 85, distribution: 80 })).toBe(85.75);
    expect(scoreS1({ coverageBreadth: 90, coverageDepth: 85 })).toBeUndefined();
  });
});

describe("S2 Collaboration friction (Measurement Reference 5.2 and 8.2)", () => {
  it("S2 = 54.4 from the telemetry composite 63.75 and perception 45, with the gap noted", () => {
    const result = combineS2(63.75, 45);
    expect(result.score).toBeCloseTo(54.4, 1);
    expect(result.score).toBe(54.375);
    expect(result.gap).toBe(18.75);
    expect(result.gapFlag).toBe("GAP - diagnostic finding");
  });

  it("falls back to whichever layer exists", () => {
    expect(combineS2(undefined, 45)).toEqual({ gap: undefined, gapFlag: "", score: 45 });
    expect(combineS2(63.75, undefined)).toEqual({ gap: undefined, gapFlag: "", score: 63.75 });
    expect(combineS2(undefined, undefined).score).toBeUndefined();
  });
});

describe("false consensus (Measurement Reference 8.3; fixture scenarios b_*)", () => {
  it("fires when TSI3-01 and TSI3-02 convert below 60 and M2 is above 75", () => {
    expect(falseConsensusFlag(3.0, 3.0, 80)).toBe("FALSE CONSENSUS - suppressed disagreement");
  });

  it("does not fire at M2 of 70, or with any input unmeasured", () => {
    expect(falseConsensusFlag(3.0, 3.0, 70)).toBe("");
    expect(falseConsensusFlag(undefined, 3.0, 80)).toBe("");
    expect(falseConsensusFlag(3.0, 3.0, undefined)).toBe("");
  });

  it("does not fire at the boundaries: exactly 60 on task conflict, exactly 75 on M2", () => {
    expect(falseConsensusFlag(3.4, 3.0, 80)).toBe("");
    expect(falseConsensusFlag(3.0, 3.0, 75)).toBe("");
  });
});

describe("M1 survey-behavioural gap (Measurement Reference 3.1 and 8.2)", () => {
  it("M1 72 against a composite of 66 gives a gap of 6 and no flag", () => {
    const result = scoreTriangulators(
      { voluntaryTurnover: 68, unplannedAbsence: 60, enps: 68, goalAchievement: 68 },
      72,
    );
    expect(result).toEqual({ composite: 66, m1Gap: 6, m1GapFlag: "" });
  });

  it("fires above 15 and stays blank when nothing is supplied (the online route)", () => {
    expect(scoreTriangulators({ voluntaryTurnover: 50 }, 72).m1GapFlag).toBe("GAP - key finding");
    expect(scoreTriangulators(undefined, 72)).toEqual({
      composite: undefined,
      m1Gap: undefined,
      m1GapFlag: "",
    });
  });
});

describe("tier routing (Capability Inputs D15, D63; Motivation Inputs D19)", () => {
  it("C1: Tier 3 takes the module, unset gives blank whatever is filled, Tier 1 takes the table", () => {
    expect(routeC1("Tier 1", 76.11, undefined)).toBe(76.11);
    expect(routeC1("Tier 3", 76.11, undefined)).toBeUndefined(); // c1_t3_nomodule
    expect(routeC1("Tier 3", 76.11, 70)).toBe(70);
    expect(routeC1(undefined, 76.11, undefined)).toBeUndefined(); // c1_unset_table
    expect(routeC1(undefined, 76.11, 70)).toBeUndefined(); // c1_unset_module
    expect(routeC1("Insufficient data", 76.11, 70)).toBeUndefined();
  });

  it("C5: unset gives blank, Tier 3 takes the module, otherwise the blend", () => {
    expect(routeC5(undefined, 79, undefined)).toBeUndefined(); // c5_unset
    expect(routeC5("Tier 3", 79, undefined)).toBeUndefined(); // c5_t3_nomodule
    expect(routeC5("Tier 3", 79, 88)).toBe(88);
    expect(routeC5("Tier 1", 79, 88)).toBe(79);
  });

  it("M1: Tier 3 takes the item score, Tier 1 takes the platform composite, unset gives blank", () => {
    expect(routeM1("Tier 1", 72.34375, 72)).toBe(72);
    expect(routeM1("Tier 1", 72.34375, undefined)).toBeUndefined(); // m1_t12_noD5
    expect(routeM1("Tier 3", 72.34375, 72)).toBe(72.34375);
    expect(routeM1(undefined, 72.34375, 72)).toBeUndefined(); // m1_unset_D5
    expect(routeM1(undefined, 72.34375, undefined)).toBeUndefined(); // m1_unset_noD5
  });
});
