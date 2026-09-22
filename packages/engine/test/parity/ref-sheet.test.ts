/**
 * The constants module against the workbook's Ref sheet, every value, including the five disabled
 * archetype weight columns (decision 3 of 22 September 2026).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ARCHETYPE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  DLP_CLASS_WEIGHTS,
  DLP_NORMS,
  EXPONENTS,
  RANKING,
  REVERSE_SCORED_ITEMS,
  SYNERGY_FLOOR,
  SYNERGY_RANGE,
} from "../../src/constants";
import { ARCHETYPES, ROUTE_ROWS, SUB_DIMENSION_CODES } from "../../src/types";

const ref = (
  JSON.parse(readFileSync(new URL("../../fixtures/ref-sheet.json", import.meta.url), "utf8")) as {
    cells: Record<string, number | string | null>;
  }
).cells;

describe("constants against the Ref sheet", () => {
  it("exponents, Synergy mapping and ranking parameters (B4:B8, E4:E6)", () => {
    expect([ref["B4"], ref["B5"], ref["B6"]]).toEqual([EXPONENTS.C, EXPONENTS.M, EXPONENTS.O]);
    expect([ref["B7"], ref["B8"]]).toEqual([SYNERGY_FLOOR, SYNERGY_RANGE]);
    expect([ref["E4"], ref["E5"], ref["E6"]]).toEqual([RANKING.sCap, RANKING.rho, RANKING.tau]);
  });

  it("every archetype weight column (C15:H31), enabled or not", () => {
    const columns = ["C", "D", "E", "F", "G", "H"] as const;
    ARCHETYPES.forEach((archetype, j) => {
      expect(ref[`${columns[j]}14`]).toBe(archetype);
      SUB_DIMENSION_CODES.forEach((code, i) => {
        expect(ref[`A${15 + i}`]).toBe(code);
        expect(ref[`${columns[j]}${15 + i}`]).toBe(ARCHETYPE_WEIGHTS[archetype].weights[code]);
      });
    });
  });

  it("DLP class weights and norms (B9:B11, B35:E37)", () => {
    expect([ref["B9"], ref["B10"], ref["B11"]]).toEqual([
      DLP_CLASS_WEIGHTS.Operational,
      DLP_CLASS_WEIGHTS.Tactical,
      DLP_CLASS_WEIGHTS.Strategic,
    ]);
    (["Operational", "Tactical", "Strategic"] as const).forEach((decisionClass, i) => {
      const r = 35 + i;
      expect(ref[`A${r}`]).toBe(decisionClass);
      expect([ref[`B${r}`], ref[`C${r}`], ref[`D${r}`], ref[`E${r}`]]).toEqual([
        ...DLP_NORMS[decisionClass],
      ]);
    });
  });

  it("confidence thresholds for all twenty-one rows (A41:C61)", () => {
    ROUTE_ROWS.forEach((row, i) => {
      const r = 41 + i;
      expect(ref[`A${r}`]).toBe(row);
      expect([ref[`B${r}`], ref[`C${r}`]]).toEqual([
        CONFIDENCE_THRESHOLDS[row].high,
        CONFIDENCE_THRESHOLDS[row].medium,
      ]);
    });
  });

  it("the reverse-scoring list (A64)", () => {
    const listed = String(ref["A64"])
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[A-Z]+\d?-\d\d$/.test(s));
    expect(new Set(listed)).toEqual(REVERSE_SCORED_ITEMS);
  });
});
