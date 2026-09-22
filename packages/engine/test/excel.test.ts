import { describe, expect, it } from "vitest";

import {
  average,
  count,
  datedifMonths,
  eq,
  ge,
  gt,
  indexOfKthLargest,
  isoToSerial,
  lt,
  serialToIso,
  sum,
  toComparable,
} from "../src/excel";

describe("Excel comparison rule (15 significant digits)", () => {
  it("treats the fixture README's gap of 15.000000000000014 as not above 15", () => {
    // docs/benchmarks/fixtures/README.md, scenario a_nominal15_real
    expect(gt(15.000000000000014, 15)).toBe(false);
    expect(eq(15.000000000000014, 15)).toBe(true);
  });

  it("treats a gap of 15.01 as above 15", () => {
    expect(gt(75.01 - 60, 15)).toBe(true);
  });

  it("treats a perception score of 59.999999999999986 as not below 60", () => {
    expect(lt(59.999999999999986, 60)).toBe(false);
    expect(ge(59.999999999999986, 60)).toBe(true);
  });

  it("keeps differences at the 14th significant digit", () => {
    expect(gt(15.0000000000001, 15)).toBe(true);
    expect(lt(59.9999999999999, 60)).toBe(true);
  });

  it("rounds to 15 significant digits", () => {
    expect(toComparable(15.000000000000014)).toBe(15);
    expect(toComparable(0.1 + 0.2)).toBe(0.3);
  });
});

describe("range functions ignore blanks", () => {
  it("COUNT, SUM and AVERAGE exclude undefined", () => {
    const values = [3.4, undefined, 3.4, undefined];
    expect(count(values)).toBe(2);
    expect(sum(values)).toBe(6.8);
    expect(average(values)).toBe(3.4);
  });

  it("AVERAGE of no numbers is blank", () => {
    expect(average([undefined, undefined])).toBeUndefined();
    expect(average([])).toBeUndefined();
  });
});

describe("DATEDIF in complete months", () => {
  it("counts whole months", () => {
    expect(datedifMonths("2026-04-15", "2026-06-01")).toBe(1);
    expect(datedifMonths("2026-04-01", "2026-06-01")).toBe(2);
    expect(datedifMonths("2025-06-01", "2026-06-01")).toBe(12);
  });

  it("subtracts a month when the end day is before the start day", () => {
    expect(datedifMonths("2026-01-31", "2026-02-28")).toBe(0);
    expect(datedifMonths("2026-01-31", "2026-03-31")).toBe(2);
    expect(datedifMonths("2026-01-15", "2026-03-14")).toBe(1);
  });

  it("is #NUM! when the start is after the end", () => {
    expect(datedifMonths("2026-06-02", "2026-06-01")).toEqual({ excelError: "#NUM!" });
  });

  it("is zero on the same day", () => {
    expect(datedifMonths("2026-06-01", "2026-06-01")).toBe(0);
  });
});

describe("Excel date serials", () => {
  it("round-trips the workbook's engagement date", () => {
    expect(serialToIso(46174)).toBe("2026-06-01");
    expect(isoToSerial("2026-06-01")).toBe(46174);
    expect(serialToIso(46127)).toBe("2026-04-15");
  });
});

describe("LARGE then MATCH", () => {
  it("returns the first position of the k-th largest, skipping blanks", () => {
    const values = [0.2, undefined, 0.5, 0.5, 0.1];
    expect(indexOfKthLargest(values, 1)).toBe(2);
    expect(indexOfKthLargest(values, 2)).toBe(2);
    expect(indexOfKthLargest(values, 3)).toBe(0);
    expect(indexOfKthLargest(values, 4)).toBe(4);
    expect(indexOfKthLargest(values, 5)).toBeUndefined();
  });
});
