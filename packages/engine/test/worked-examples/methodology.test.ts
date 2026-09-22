/**
 * Bands, the critical-findings text (fixture scenarios k7_*), the exclusions summary and the other
 * footer strings, verbatim against the workbook.
 */
import { describe, expect, it } from "vitest";

import { band } from "../../src/bands";
import {
  clientUnit,
  criticalFindings,
  exclusionsSummary,
  gapFlagText,
  nonStandardDefinitions,
  responseRate,
} from "../../src/methodology";
import type { TripWireCode, TripWireResult } from "../../src/types";

const BREACHED: TripWireResult = { score: 58, flag: "CRITICAL FINDING" };
const CLEAR: TripWireResult = { score: 72, flag: "" };
const UNMEASURED: TripWireResult = { score: undefined, flag: "" };
const tw = (
  a: TripWireResult,
  b: TripWireResult,
  c: TripWireResult,
): Record<TripWireCode, TripWireResult> => ({
  TW1: a,
  TW2: b,
  TW3: c,
});

describe("bands (Report Data D)", () => {
  it("Green above 75, Amber at or above 50, Red below, Neutral when blank", () => {
    expect(band(75.01)).toBe("Green");
    expect(band(75)).toBe("Amber");
    expect(band(50)).toBe("Amber");
    expect(band(49.99)).toBe("Red");
    expect(band(undefined)).toBe("Neutral");
  });

  it("decides on the unrounded score under Excel's rule: 74.6 is Amber, 75.000000000000014 is Amber", () => {
    expect(band(74.6)).toBe("Amber");
    expect(band(75.000000000000014)).toBe("Amber");
    expect(band(49.999999999999986)).toBe("Amber");
  });
});

describe("critical findings (Methodology Footer C24)", () => {
  it("Northwind: one breach reads without the trailing separator (k7_one_breached)", () => {
    expect(criticalFindings(tw(CLEAR, CLEAR, BREACHED), 60.8)).toBe(
      "Basic conditions trip-wire breached",
    );
  });

  it("all clear (k7_all_clear)", () => {
    expect(criticalFindings(tw(CLEAR, CLEAR, CLEAR), 60.8)).toBe("No critical findings identified");
  });

  it("one unmeasured and the rest clear (k7_one_unmeasured)", () => {
    expect(criticalFindings(tw(UNMEASURED, CLEAR, CLEAR), 60.8)).toBe(
      "Pay equity trip-wire not measured",
    );
  });

  it("all unmeasured (k7_all_unmeasured), in trip-wire order", () => {
    expect(criticalFindings(tw(UNMEASURED, UNMEASURED, UNMEASURED), 60.8)).toBe(
      "Pay equity trip-wire not measured; Fairness trip-wire not measured; Basic conditions trip-wire not measured",
    );
  });

  it("adds the decision-latency fragment below a DLS of 50, and ignores a blank DLS", () => {
    expect(criticalFindings(tw(CLEAR, BREACHED, CLEAR), 49.9)).toBe(
      "Fairness trip-wire breached; Decision latency critical (overall DLS below 50)",
    );
    expect(criticalFindings(tw(CLEAR, CLEAR, CLEAR), 49.9)).toBe(
      "Decision latency critical (overall DLS below 50)",
    );
    expect(criticalFindings(tw(CLEAR, CLEAR, CLEAR), undefined)).toBe(
      "No critical findings identified",
    );
    expect(criticalFindings(tw(CLEAR, CLEAR, CLEAR), 50)).toBe("No critical findings identified");
  });
});

describe("the other footer strings", () => {
  it("exclusions summary (C41)", () => {
    expect(exclusionsSummary(0)).toBe(
      "No sub-dimensions suppressed; full weight set applied; no responses excluded beyond validity screening",
    );
    expect(exclusionsSummary(1)).toBe(
      "Sub-dimensions suppressed for insufficient data: 1 (weights reallocated proportionally; see Tier Assignment)",
    );
  });

  it("gap flag text (C17:C22), client and unit (C5), non-standard definitions (C43), response rates", () => {
    expect(gapFlagText("")).toBe("none");
    expect(gapFlagText("GAP - report separately")).toBe("GAP - report separately");
    expect(clientUnit("Northwind Mutual", "Member Services")).toBe(
      "Northwind Mutual - Member Services",
    );
    expect(clientUnit(undefined, undefined)).toBe(" - ");
    expect(nonStandardDefinitions(undefined)).toBe("None recorded");
    expect(nonStandardDefinitions("Absence counts exclude parental leave")).toBe(
      "Absence counts exclude parental leave",
    );
    expect(responseRate(0.78)).toBe(0.78);
    expect(responseRate(undefined)).toBeUndefined();
  });
});
