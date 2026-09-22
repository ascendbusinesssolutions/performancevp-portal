/**
 * The binding-constraint ranking: Measurement Reference 9.4 (realistic P gain weighted toward
 * relative weakness), the Northwind top six from the fixture file, ties, and the strings.
 */
import { describe, expect, it } from "vitest";

import { compositeScores } from "../../src/composite";
import { type Cell } from "../../src/excel";
import {
  bindingComponent,
  bindingStatement,
  pTypicalCheck,
  priorityRows,
  rankSubDimensions,
  sRangeCheck,
  topSix,
  tripWireOverride,
} from "../../src/ranking";
import {
  RANKED_CODES,
  SUB_DIMENSION_CODES,
  type RankedCode,
  type SubDimensionCode,
} from "../../src/types";

const NO_FLAGS = { TW1: "", TW2: "", TW3: "" };

function ranked(partial: Partial<Record<RankedCode, Cell>>): Record<RankedCode, Cell> {
  const out = {} as Record<RankedCode, Cell>;
  for (const code of RANKED_CODES) out[code] = partial[code];
  return out;
}
function all(partial: Partial<Record<SubDimensionCode, number>>): Record<SubDimensionCode, Cell> {
  const out = {} as Record<SubDimensionCode, Cell>;
  for (const code of SUB_DIMENSION_CODES) out[code] = partial[code];
  return out;
}
const DEFAULT_WEIGHTS: Record<RankedCode, number> = {
  C1: 0.35,
  C2: 0.15,
  C3: 0.2,
  C4: 0.2,
  C5: 0.1,
  M1: 0.5,
  M2: 0.2,
  M3: 0.15,
  M4: 0.15,
  O1: 0.3,
  O2: 0.25,
  O3: 0.2,
  O4: 0.1,
  O5: 0.15,
};

describe("Measurement Reference 9.4 synthesis, at function level with the document's stated intermediates", () => {
  const scores = ranked({
    C1: 76.1,
    C2: 73,
    C3: 66,
    C4: 71,
    C5: 79,
    M1: 72,
    M2: 75,
    M3: 67,
    M4: 60,
    O1: 61.2,
    O2: 65,
    O3: 60,
    O4: 58,
    O5: 66,
  });
  const result = rankSubDimensions({
    scores,
    normalisedWeights: DEFAULT_WEIGHTS,
    components: { C: 72, M: 70, O: 62 },
    P: 69.7,
    tripWireFlags: NO_FLAGS,
  });

  it("ranks O1, M4, O3, M1, O2, C3 with the stated priorities to two decimals", () => {
    expect(result.topSix.map((r) => r.label.split(" - ")[0])).toEqual([
      "O1",
      "M4",
      "O3",
      "M1",
      "O2",
      "C3",
    ]);
    const priorities = result.topSix.map((r) => Number((r.priority as number).toFixed(2)));
    expect(priorities).toEqual([0.41, 0.32, 0.3, 0.29, 0.25, 0.21]);
  });

  it("uses a unit mean of 67.8 and gives M1 the largest realistic P gain (about 0.77) yet fourth place", () => {
    const rows = result.rows;
    const m1 = rows.find((r) => r.code === "M1");
    expect(m1?.deltaP).toBeCloseTo(0.77, 2);
    const largestGain = Math.max(
      ...rows.map((r) => (typeof r.deltaP === "number" ? r.deltaP : -1)),
    );
    expect(m1?.deltaP).toBe(largestGain);
    // rel is 0.5 at the mean; M1 at 72 sits above 67.8 so its factor is below 0.5
    expect(m1?.rel).toBeLessThan(0.5);
    const o1 = rows.find((r) => r.code === "O1");
    expect(o1?.rel).toBeGreaterThan(0.5);
  });

  it("names Opportunity the binding component and builds the statement verbatim", () => {
    expect(result.bindingComponent).toBe("Opportunity");
    expect(result.statement).toBe(
      "O1 - Clarity & decision rights is the binding constraint, the highest-priority place a realistic improvement would lift P; Opportunity is the lowest-scoring force",
    );
    expect(result.tripWireOverride).toBe("");
  });
});

describe("Northwind (fixture scenario nw)", () => {
  const scores = all({
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
  const composite = compositeScores(scores, "Default");
  const result = rankSubDimensions({
    scores: ranked(scores),
    normalisedWeights: composite.normalisedWeights,
    components: { C: composite.C, M: composite.M, O: composite.O },
    P: composite.P,
    tripWireFlags: { TW1: "", TW2: "", TW3: "CRITICAL FINDING" },
  });

  it("reproduces the workbook's top six, binding component, statement and override", () => {
    expect(result.topSix.map((r) => r.label)).toEqual([
      "O3 - Process & workflow",
      "O1 - Clarity & decision rights",
      "M4 - Purpose alignment",
      "O4 - Resource adequacy",
      "M1 - Engagement & confidence",
      "C3 - Talent density",
    ]);
    expect(result.bindingComponent).toBe("Opportunity");
    expect(result.statement).toBe(
      "O3 - Process & workflow is the binding constraint, the highest-priority place a realistic improvement would lift P; Opportunity is the lowest-scoring force",
    );
    expect(result.tripWireOverride).toBe(
      "CRITICAL trip-wire finding present - takes priority regardless of P",
    );
    expect(result.topSix[0]?.component).toBe("Opportunity");
    expect(result.topSix[0]?.rawScore).toBe(55.25);
  });
});

describe("blank, ties and errors", () => {
  it("leaves the whole block and the top six blank when P is blank (fixture scenario blank)", () => {
    const result = rankSubDimensions({
      scores: ranked({}),
      normalisedWeights: DEFAULT_WEIGHTS,
      components: { C: undefined, M: undefined, O: undefined },
      P: undefined,
      tripWireFlags: NO_FLAGS,
    });
    expect(result.rows.every((r) => r.priority === undefined && r.sortKey === undefined)).toBe(
      true,
    );
    expect(result.topSix.map((r) => r.label)).toEqual(["", "", "", "", "", ""]);
    expect(result.bindingComponent).toBe("");
    expect(result.statement).toBe("");
  });

  it("breaks exact ties by sheet row: the earlier row ranks first", () => {
    // Equal scores, equal weights within M give equal priorities for M3 and M4; M3 is row 12.
    const scores = ranked({ M3: 60, M4: 60 });
    const rows = priorityRows({
      scores,
      normalisedWeights: { ...DEFAULT_WEIGHTS, M3: 0.5, M4: 0.5 },
      components: { C: undefined, M: 60, O: undefined },
      P: 60,
      tripWireFlags: NO_FLAGS,
    });
    const m3 = rows.find((r) => r.code === "M3");
    const m4 = rows.find((r) => r.code === "M4");
    expect(m3?.priority).toBe(m4?.priority);
    expect(m3?.sortKey).toBeGreaterThan(m4?.sortKey as number);
    expect(topSix(rows)[0]?.label).toBe("M3 - Autonomous motivation");
  });

  it("shows #DIV/0! in realistic P gain where a component is 0, blanks the priority, and blanks the top-six gain", () => {
    const rows = priorityRows({
      scores: ranked({ C1: 0, M1: 50, O1: 50 }),
      normalisedWeights: { ...DEFAULT_WEIGHTS, C1: 1, M1: 1, O1: 1 },
      components: { C: 0, M: 50, O: 50 },
      P: 0,
      tripWireFlags: NO_FLAGS,
    });
    const c1 = rows.find((r) => r.code === "C1");
    expect(c1?.deltaP).toEqual({ excelError: "#DIV/0!" });
    expect(c1?.priority).toBeUndefined();
    const six = topSix(rows);
    expect(six.map((r) => r.label.split(" - ")[0])).toEqual(["M1", "O1", "", "", "", ""]);
  });
});

describe("binding component ties and the range checks", () => {
  it("resolves ties Capability, then Motivation, then Opportunity", () => {
    expect(bindingComponent(60, 60, 60)).toBe("Capability");
    expect(bindingComponent(70, 60, 60)).toBe("Motivation");
    expect(bindingComponent(70, 65, 60)).toBe("Opportunity");
    expect(bindingComponent(60, 70, 60)).toBe("Capability");
    expect(bindingComponent(undefined, 60, 60)).toBe("");
  });

  it("applies Excel's comparison rule to the tie", () => {
    expect(bindingComponent(60.000000000000014, 60, 70)).toBe("Capability");
  });

  it("builds the statement without the force clause when the binding component is blank", () => {
    expect(bindingStatement("O1 - Clarity & decision rights", "")).toBe(
      "O1 - Clarity & decision rights is the binding constraint, the highest-priority place a realistic improvement would lift P",
    );
    expect(bindingStatement("", "Opportunity")).toBe("");
  });

  it("fires the override when any trip-wire flag is present", () => {
    expect(tripWireOverride({ TW1: "", TW2: "CRITICAL FINDING", TW3: "" })).not.toBe("");
    expect(tripWireOverride(NO_FLAGS)).toBe("");
  });

  it("range checks: S in range, P typical, and blank when P is blank", () => {
    expect(sRangeCheck(1.051825)).toBe("OK");
    expect(sRangeCheck(0.85)).toBe("OK");
    expect(sRangeCheck(1.15 + 1e-16)).toBe("OK");
    expect(pTypicalCheck(72.3)).toBe("OK");
    expect(pTypicalCheck(44.9)).toBe("outside typical - cross-check");
    expect(pTypicalCheck(80)).toBe("OK");
    expect(pTypicalCheck(undefined)).toBe("");
  });
});
