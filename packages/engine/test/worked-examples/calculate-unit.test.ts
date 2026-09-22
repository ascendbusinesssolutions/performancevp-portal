/**
 * End to end: the Northwind Mutual worked example through calculateUnit, against the fixture
 * file's nw scenario (Excel-recalculated) and the workbook's stored strings; projectImpact.
 */
import { describe, expect, it } from "vitest";

import { calculateUnit, projectImpact } from "../../src/index";
import { NORTHWIND } from "../fixtures/northwind";

describe("calculateUnit on Northwind Mutual (fixture scenario nw)", () => {
  const result = calculateUnit(NORTHWIND);

  it("reproduces every key sub-dimension cell", () => {
    const s = result.subDimensions;
    expect(s.C1.score).toBeCloseTo(76.11111111111111, 12);
    expect(s.C2.score).toBeCloseTo(73.7942857142857, 12);
    expect(s.C3.score).toBeCloseTo(66.5, 12);
    expect(s.C4.score).toBeCloseTo(70.325, 12);
    expect(s.C5.score).toBe(79);
    expect(s.M1.score).toBe(72);
    expect(s.M2.score).toBeCloseTo(75, 12);
    expect(s.M3.score).toBeCloseTo(67, 12);
    expect(s.M4.score).toBeCloseTo(60, 12);
    expect(s.O1.score).toBeCloseTo(61.22812499999999, 12);
    expect(s.O2.score).toBeCloseTo(69.25, 12);
    expect(s.O3.score).toBeCloseTo(55.25, 12);
    expect(s.O4.score).toBe(47.5);
    expect(s.O5.score).toBe(66);
    expect(s.S1.score).toBe(85.75);
    expect(s.S2.score).toBeCloseTo(54.37499999999999, 12);
    expect(s.S3.score).toBeCloseTo(65.99999999999999, 12);
  });

  it("reproduces the layers, gaps and flags", () => {
    expect(result.opportunity.o1.structural).toBeCloseTo(62.3, 12);
    expect(result.opportunity.o1.gap).toBeCloseTo(62.3 - 60.15625, 12);
    expect(result.opportunity.o1.gapFlag).toBe("");
    expect(result.opportunity.o2.structural).toBe(73.5);
    expect(result.opportunity.o2.perception).toBe(65);
    expect(result.opportunity.o3.perception).toBe(50.5);
    expect(result.synergy.s2.behaviouralComposite).toBe(63.75);
    expect(result.synergy.s2.gap).toBeCloseTo(18.75, 12);
    expect(result.synergy.s2.gapFlag).toBe("GAP - diagnostic finding");
    expect(result.synergy.s3.falseConsensusFlag).toBe("");
    expect(result.triangulators).toEqual({ composite: 66, m1Gap: 6, m1GapFlag: "" });
    expect(result.motivation.tripWires.TW3.flag).toBe("CRITICAL FINDING");
  });

  it("reproduces the composites, S and P to nine decimals and the top six exactly", () => {
    expect(result.components.C).toBeCloseTo(72.97303174603177, 9);
    expect(result.components.M).toBeCloseTo(70.05, 9);
    expect(result.components.O).toBeCloseTo(61.380937499999995, 9);
    expect(result.components.sInternal).toBeCloseTo(67.27499999999999, 9);
    expect(result.components.S).toBeCloseTo(1.051825, 9);
    expect(result.components.P).toBeCloseTo(72.3139293565219, 9);
    expect(result.ranking.topSix.map((r) => r.label)).toEqual([
      "O3 - Process & workflow",
      "O1 - Clarity & decision rights",
      "M4 - Purpose alignment",
      "O4 - Resource adequacy",
      "M1 - Engagement & confidence",
      "C3 - Talent density",
    ]);
    expect(result.ranking.bindingComponent).toBe("Opportunity");
    expect(result.ranking.statement).toBe(
      "O3 - Process & workflow is the binding constraint, the highest-priority place a realistic improvement would lift P; Opportunity is the lowest-scoring force",
    );
  });

  it("reproduces confidence, the footer strings, the bands and the DLP", () => {
    expect(result.validation).toEqual({ sInRange: "OK", pTypical: "OK", pConfidence: "High" });
    expect(result.confidence.C1).toBe("High");
    expect(result.methodology.criticalFindings).toBe("Basic conditions trip-wire breached");
    expect(result.methodology.exclusionsSummary).toBe(
      "No sub-dimensions suppressed; full weight set applied; no responses excluded beyond validity screening",
    );
    expect(result.methodology.tierMixRating).toBe("Tier-3-dominant; methodology disclosed");
    expect(result.methodology.gapFlags).toEqual({
      m1SurveyBehavioural: "none",
      falseConsensus: "none",
      s2TelemetryPerception: "GAP - diagnostic finding",
      o1: "none",
      o2: "none",
      o3: "none",
    });
    expect(result.methodology.clientUnit).toBe("Northwind Mutual - Member Services");
    expect(result.methodology.responseRates.C4).toBe(0.78);
    expect(result.methodology.nonStandardDefinitions).toBe("None recorded");
    expect(result.reportData.pBand).toBe("Amber");
    expect(result.subDimensions.C2.band).toBe("Amber");
    expect(result.subDimensions.O4.band).toBe("Red");
    expect(result.subDimensions.S1.band).toBe("Green");
    expect(result.reportData.tripWireOverride).toBe(
      "CRITICAL trip-wire finding present - takes priority regardless of P",
    );
    expect(result.reportData.comparisonRow.topBindingSubDimension).toBe("O3 - Process & workflow");
    expect(result.dlp.overall).toBeCloseTo(60.814445970696, 12);
    expect(result.dlp.sampleN).toBe(43);
  });
});

describe("the blank template (fixture scenario blank)", () => {
  it("gives blank components and P, S 1.00, an empty ranking and n/a confidence everywhere", () => {
    const result = calculateUnit({ engagement: { archetype: "Default" } });
    expect(result.components).toMatchObject({
      C: undefined,
      M: undefined,
      O: undefined,
      P: undefined,
      sInternal: 50,
      S: 1,
    });
    expect(result.ranking.topSix.map((r) => r.label)).toEqual(["", "", "", "", "", ""]);
    expect(result.ranking.statement).toBe("");
    expect(result.validation.pConfidence).toBe("");
    expect(result.confidence.C1).toBe("n/a");
    expect(result.methodology.exclusionsSummary).toBe(
      "Sub-dimensions suppressed for insufficient data: 17 (weights reallocated proportionally; see Tier Assignment)",
    );
    expect(result.methodology.criticalFindings).toBe(
      "Pay equity trip-wire not measured; Fairness trip-wire not measured; Basic conditions trip-wire not measured",
    );
    expect(result.methodology.clientUnit).toBe(" - ");
    expect(result.reportData.pBand).toBe("Neutral");
  });
});

describe("projectImpact", () => {
  it("returns the baseline exactly when the score is unchanged", () => {
    const baseline = calculateUnit(NORTHWIND);
    const projection = projectImpact(NORTHWIND, "O3", baseline.subDimensions.O3.score as number);
    expect(projection.projected).toEqual(baseline);
    expect(projection.delta).toEqual({ C: 0, M: 0, O: 0, S: 0, P: 0 });
    expect(projection.bindingConstraintChanges).toBe(false);
  });

  it("raises O and P when O3 moves to 70 and changes the binding constraint", () => {
    const projection = projectImpact(NORTHWIND, "O3", 70);
    expect(projection.delta.O).toBeCloseTo((70 - 55.25) * 0.2, 9);
    expect(projection.delta.P).toBeGreaterThan(0);
    expect(projection.delta.C).toBe(0);
    expect(projection.delta.M).toBe(0);
    expect(projection.projected.ranking.topSix[0]?.label).not.toBe("O3 - Process & workflow");
    expect(projection.bindingConstraintChanges).toBe(true);
  });

  it("accepts a Synergy sub-dimension and moves S, never the binding constraint's candidates", () => {
    const projection = projectImpact(NORTHWIND, "S2", 80);
    expect(projection.delta.S).toBeGreaterThan(0);
    expect(projection.delta.O).toBe(0);
    expect(projection.projected.ranking.topSix.every((r) => !r.label.startsWith("S"))).toBe(true);
  });
});
