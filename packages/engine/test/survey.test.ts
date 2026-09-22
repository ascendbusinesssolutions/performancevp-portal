import { describe, expect, it } from "vitest";

import { REVERSE_SCORED_ITEMS } from "../src/constants";
import { adjustItem, adjustItems, convertMean, scoreItems } from "../src/survey";
import { CII_ITEMS, MI2_ITEMS, type ItemCode } from "../src/types";

describe("survey conversion", () => {
  it("maps a mean of 1 to 0 and a mean of 5 to 100 (Survey Blueprint Part 7)", () => {
    expect(convertMean(1)).toBe(0);
    expect(convertMean(5)).toBe(100);
    expect(convertMean(3)).toBe(50);
  });

  it("never uses mean × 25", () => {
    expect(convertMean(4)).toBe(75);
    expect(convertMean(4)).not.toBe(100);
  });

  it("flips only the mapped items with 6 − mean", () => {
    expect(adjustItem("MI2-05", 2)).toBe(4);
    expect(adjustItem("MI2-01", 2)).toBe(2);
    expect(REVERSE_SCORED_ITEMS.size).toBe(15);
    const flipped = (CII_ITEMS as readonly ItemCode[]).filter((code) =>
      REVERSE_SCORED_ITEMS.has(code),
    );
    expect(flipped).toEqual(["CII-05", "CII-10", "CII-15"]);
  });

  it("leaves an absent item blank and excludes it from the mean", () => {
    expect(adjustItem("MI2-01", undefined)).toBeUndefined();
    const withAll = scoreItems(MI2_ITEMS, {
      "MI2-01": 4,
      "MI2-02": 4,
      "MI2-03": 4,
      "MI2-04": 4,
      "MI2-05": 2,
    });
    const withOneMissing = scoreItems(MI2_ITEMS, {
      "MI2-01": 4,
      "MI2-02": 4,
      "MI2-03": 4,
      "MI2-05": 2,
    });
    expect(withAll).toBe(75);
    expect(withOneMissing).toBe(75);
  });

  it("is blank when no item is numeric", () => {
    expect(scoreItems(MI2_ITEMS, undefined)).toBeUndefined();
    expect(scoreItems(MI2_ITEMS, {})).toBeUndefined();
  });

  it("reproduces the Northwind M2 score of 75 from the workbook's item means", () => {
    // Motivation Inputs B23:B27 as stored in the workbook
    expect(
      scoreItems(MI2_ITEMS, {
        "MI2-01": 4,
        "MI2-02": 3.9,
        "MI2-03": 4.1,
        "MI2-04": 4,
        "MI2-05": 2,
      }),
    ).toBe(75);
  });

  it("keeps sheet order in the adjusted column", () => {
    expect(adjustItems(MI2_ITEMS, { "MI2-05": 2, "MI2-01": 4 })).toEqual([
      4,
      undefined,
      undefined,
      undefined,
      4,
    ]);
  });
});
