import { describe, expect, it } from "vitest";

import {
  ARCHETYPE_WEIGHTS,
  COMPONENT_OF,
  EXPONENTS,
  RANKING,
  RANKING_ROW,
  SUB_DIMENSION_LABELS,
} from "../src/constants";
import { ARCHETYPES, RANKED_CODES, SUB_DIMENSION_CODES, type ComponentKey } from "../src/types";

function componentSum(archetype: (typeof ARCHETYPES)[number], component: ComponentKey): number {
  const { weights } = ARCHETYPE_WEIGHTS[archetype];
  let total = 0;
  for (const code of SUB_DIMENSION_CODES)
    if (COMPONENT_OF[code] === component) total += weights[code];
  return Number(total.toFixed(10));
}

describe("constants", () => {
  it("uses the weighted analytical exponents, which sum to 1", () => {
    expect(EXPONENTS).toEqual({ C: 0.35, M: 0.4, O: 0.25 });
    expect(EXPONENTS.C + EXPONENTS.M + EXPONENTS.O).toBeCloseTo(1, 12);
  });

  it("enables the Default archetype only", () => {
    expect(ARCHETYPE_WEIGHTS.Default.enabled).toBe(true);
    for (const archetype of ARCHETYPES) {
      if (archetype !== "Default") expect(ARCHETYPE_WEIGHTS[archetype].enabled).toBe(false);
    }
  });

  it("Default weights sum to 1 within every component", () => {
    for (const component of ["C", "M", "O", "S"] as const) {
      expect(componentSum("Default", component)).toBe(1);
    }
  });

  it("records that the other archetype sets do not all sum to 1, which is why they are disabled", () => {
    const offending = ARCHETYPES.filter((a) => a !== "Default").filter((a) =>
      (["C", "M", "O", "S"] as const).some((c) => componentSum(a, c) !== 1),
    );
    expect(offending.length).toBeGreaterThan(0);
  });

  it("carries a workbook row and a label for each ranked sub-dimension", () => {
    expect(RANKED_CODES.map((code) => RANKING_ROW[code])).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect(SUB_DIMENSION_LABELS.O1).toBe("O1 - Clarity & decision rights");
    expect(SUB_DIMENSION_LABELS.M1).toBe("M1 - Engagement & confidence");
  });

  it("holds the ranking parameters from Ref E4:E6", () => {
    expect(RANKING).toEqual({ sCap: 85, rho: 0.3, tau: 8 });
  });
});
