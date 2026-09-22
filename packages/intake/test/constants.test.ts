/**
 * The intake holds its own copies of the constants both workbooks hold. Each copy must agree with
 * the engine's: the item lists, the reverse-scoring map, the conversion, the CII groups.
 * Test files may import engine values; src/ may import its types only.
 */
import * as engine from "@performancevp/engine";
import { describe, expect, it } from "vitest";

import { CII_GROUPS, CONVERSION, REVERSE_SCORED_ITEMS } from "../src/constants";
import { convertMean, PART_A_ITEMS } from "../src/items";
import {
  CII_ITEMS,
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  TSI2_ITEMS,
  TSI3_ITEMS,
} from "../src/types";

describe("constants shared with the engine", () => {
  it("lists every Diagnostic Survey block in the engine's order", () => {
    expect(CII_ITEMS).toEqual(engine.CII_ITEMS);
    expect(MI1_ITEMS).toEqual(engine.MI1_ITEMS);
    expect(MI2_ITEMS).toEqual(engine.MI2_ITEMS);
    expect(MI3_ITEMS).toEqual(engine.MI3_ITEMS);
    expect(MI4_ITEMS).toEqual(engine.MI4_ITEMS);
    expect(OI1_ITEMS).toEqual(engine.OI1_ITEMS);
    expect(OI2_ITEMS).toEqual(engine.OI2_ITEMS);
    expect(OI3_ITEMS).toEqual(engine.OI3_ITEMS);
    expect(OI4_ITEMS).toEqual(engine.OI4_ITEMS);
    expect(TSI2_ITEMS).toEqual(engine.TSI2_ITEMS);
    expect(TSI3_ITEMS).toEqual(engine.TSI3_ITEMS);
  });

  it("flips exactly the items the engine flips, plus the module items the engine never sees", () => {
    const engineItems = new Set<string>(engine.constants.REVERSE_SCORED_ITEMS);
    for (const item of PART_A_ITEMS) {
      expect(REVERSE_SCORED_ITEMS.has(item)).toBe(engineItems.has(item));
    }
    const moduleOnly = [...REVERSE_SCORED_ITEMS].filter((item) => !engineItems.has(item));
    expect(moduleOnly.sort()).toEqual(["O1C-05", "O2I-03", "O2I-04", "O2I-06", "O3P-04"]);
  });

  it("converts as the engine converts: (mean − 1) × 25", () => {
    expect(CONVERSION).toEqual(engine.constants.CONVERSION);
    expect(convertMean(1)).toBe(0);
    expect(convertMean(5)).toBe(100);
    expect(convertMean(3.6)).toBe(65);
  });

  it("groups the CII items as the engine does", () => {
    expect(CII_GROUPS).toEqual(engine.constants.CII_GROUPS);
  });

  it("carries 71 Part A items in the workbook's column order (2 Import Main C:BU)", () => {
    expect(PART_A_ITEMS).toHaveLength(71);
    expect(PART_A_ITEMS[0]).toBe("CII-01");
    expect(PART_A_ITEMS[37]).toBe("TW-01");
    expect(PART_A_ITEMS[70]).toBe("TSI3-05");
    expect(new Set(PART_A_ITEMS).size).toBe(71);
  });
});
