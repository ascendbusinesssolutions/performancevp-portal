/**
 * Confidence bands (Tier Assignment E), P confidence (Composite Scoring B51) and the tier mix
 * (Methodology Footer C10:C13), against the fixture file's conf_* scenarios and Northwind.
 */
import { describe, expect, it } from "vitest";

import { confidenceBand, confidenceBands, pConfidence, tierMix } from "../../src/routes";
import { ROUTE_ROWS, type RouteAssignment, type RouteRow } from "../../src/types";

const ENGAGEMENT = "2026-06-01"; // Engagement Metadata D19, serial 46174

/** The Northwind Tier Assignment as stored (B and D columns). */
const NORTHWIND_ROUTES: Partial<Record<RouteRow, RouteAssignment>> = {
  C1: { tier: "Tier 1", vintage: "2026-04-15" },
  C2: { tier: "Tier 1", vintage: "2026-04-20" },
  C3: { tier: "Tier 1", vintage: "2026-03-30" },
  C4: { tier: "Tier 3", vintage: "2026-05-10" },
  C5: { tier: "Tier 1", vintage: "2026-05-01" },
  M1: { tier: "Tier 1", vintage: "2026-05-05" },
  M2: { tier: "Tier 3", vintage: "2026-05-10" },
  M3: { tier: "Tier 3", vintage: "2026-05-10" },
  M4: { tier: "Tier 3", vintage: "2026-05-10" },
  TW1: { tier: "Tier 3", vintage: "2026-05-10" },
  TW2: { tier: "Tier 3", vintage: "2026-05-10" },
  TW3: { tier: "Tier 3", vintage: "2026-05-10" },
  O1: { tier: "Tier 3", vintage: "2026-05-10" },
  O2: { tier: "Tier 3", vintage: "2026-05-10" },
  O3: { tier: "Tier 3", vintage: "2026-05-10" },
  O4: { tier: "Tier 3", vintage: "2026-05-10" },
  O5: { tier: "Tier 3", vintage: "2026-05-10" },
  S1: { tier: "Tier 1", vintage: "2026-04-15" },
  S2: { tier: "Tier 1", vintage: "2026-05-10" },
  S3: { tier: "Tier 3", vintage: "2026-05-10" },
  DLP: { tier: "Tier 3", vintage: "2026-05-15" },
};

describe("confidence bands (Tier Assignment E; Cadence Master Part 7)", () => {
  it("Northwind: every row is High and P confidence is High (fixture scenario nw)", () => {
    const bands = confidenceBands(NORTHWIND_ROUTES, ENGAGEMENT);
    for (const row of ROUTE_ROWS) expect(bands[row]).toBe("High");
    expect(pConfidence(bands, 72.3)).toBe("High");
  });

  it("reads Low when the vintage is blank (conf_vintage_blank) or the engagement date is blank (conf_engdate_blank)", () => {
    expect(confidenceBand("C1", { tier: "Tier 1" }, ENGAGEMENT)).toBe("Low");
    expect(confidenceBand("C1", { tier: "Tier 1", vintage: "2026-04-15" }, undefined)).toBe("Low");
    expect(confidenceBand("C1", { tier: "Tier 1" }, undefined)).toBe("Low");
    const bands = confidenceBands(NORTHWIND_ROUTES, undefined);
    expect(bands.C1).toBe("Low");
    expect(pConfidence(bands, 72.3)).toBe("Low");
  });

  it("reads n/a when the route is unset (conf_route_unset) or Insufficient, whatever the dates", () => {
    expect(confidenceBand("C1", undefined, ENGAGEMENT)).toBe("n/a");
    expect(confidenceBand("C1", { vintage: "2026-04-15" }, ENGAGEMENT)).toBe("n/a");
    expect(
      confidenceBand("C1", { tier: "Insufficient data", vintage: "2026-04-15" }, ENGAGEMENT),
    ).toBe("n/a");
  });

  it("applies each row's thresholds in complete months: C4 is High to 6, Medium to 8, then Low", () => {
    const at = (vintage: string) => confidenceBand("C4", { tier: "Tier 3", vintage }, ENGAGEMENT);
    expect(at("2025-12-01")).toBe("High"); // 6 months
    expect(at("2025-11-30")).toBe("High"); // 6 complete months (day 1 is before day 30)
    expect(at("2025-11-01")).toBe("Medium"); // 7
    expect(at("2025-10-01")).toBe("Medium"); // 8
    expect(at("2025-09-30")).toBe("Medium"); // 8 complete months
    expect(at("2025-09-01")).toBe("Low"); // 9
  });

  it("uses the row's own thresholds: C3 is Medium at 15 months, C1 Low at 15", () => {
    expect(confidenceBand("C3", { tier: "Tier 1", vintage: "2025-03-01" }, ENGAGEMENT)).toBe(
      "Medium",
    );
    expect(confidenceBand("C1", { tier: "Tier 1", vintage: "2025-03-01" }, ENGAGEMENT)).toBe("Low");
    expect(confidenceBand("C5", { tier: "Tier 1", vintage: "2026-03-01" }, ENGAGEMENT)).toBe(
      "Medium",
    ); // 3 months, C5 High to 2
  });

  it("reads '-' when the vintage is after the engagement date (DATEDIF errors)", () => {
    expect(confidenceBand("C1", { tier: "Tier 1", vintage: "2026-06-02" }, ENGAGEMENT)).toBe("-");
  });
});

describe("P confidence (Composite Scoring B51)", () => {
  const allHigh = confidenceBands(NORTHWIND_ROUTES, ENGAGEMENT);

  it("is blank when P is blank, whatever the bands", () => {
    expect(pConfidence(allHigh, undefined)).toBe("");
  });

  it("takes the worst band among the seventeen sub-dimensions", () => {
    expect(pConfidence({ ...allHigh, O3: "Medium" }, 70)).toBe("Medium");
    expect(pConfidence({ ...allHigh, O3: "Medium", S2: "Low" }, 70)).toBe("Low");
  });

  it("mirrors the workbook: n/a and '-' count as High, and trip-wire and DLP rows are ignored", () => {
    expect(pConfidence({ ...allHigh, C2: "n/a", O4: "-" }, 70)).toBe("High");
    expect(pConfidence({ ...allHigh, TW1: "Low", DLP: "Low" }, 70)).toBe("High");
  });
});

describe("tier mix (Methodology Footer C10:C13)", () => {
  it("counts Northwind as 7 Tier 1 and 13 Tier 3 over the twenty rows, Tier-3-dominant", () => {
    expect(tierMix(NORTHWIND_ROUTES)).toEqual({
      tier1: 7,
      tier2: 0,
      tier3: 13,
      rating: "Tier-3-dominant; methodology disclosed",
    });
  });

  it("rates Tier-1 dominant and Mixed by the workbook's comparisons, and ignores the DLP row", () => {
    const tier1: Partial<Record<RouteRow, RouteAssignment>> = {};
    for (const row of ROUTE_ROWS) tier1[row] = { tier: "Tier 1" };
    expect(tierMix(tier1)).toMatchObject({ tier1: 20, tier3: 0, rating: "Tier-1 dominant" });
    const mixed: Partial<Record<RouteRow, RouteAssignment>> = { ...tier1 };
    for (const row of ["C1", "C2", "C3", "C4", "C5", "M1", "M2", "M3", "M4", "TW1", "TW2"] as const)
      mixed[row] = { tier: "Tier 2" };
    expect(tierMix(mixed)).toMatchObject({ tier1: 9, tier2: 11, rating: "Mixed" });
    expect(tierMix(undefined)).toEqual({ tier1: 0, tier2: 0, tier3: 0, rating: "Tier-1 dominant" });
  });

  it("does not count Insufficient data or unset rows", () => {
    expect(tierMix({ C1: { tier: "Insufficient data" }, C2: {} })).toEqual({
      tier1: 0,
      tier2: 0,
      tier3: 0,
      rating: "Tier-1 dominant",
    });
  });
});
