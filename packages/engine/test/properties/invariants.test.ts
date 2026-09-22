/**
 * Property and invariant tests (docs/ENGINE_SPEC.md 5.3) over randomly generated inputs.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { DisabledArchetypeError } from "../../src/composite";
import { REVERSE_SCORED_ITEMS } from "../../src/constants";
import { calculateUnit, projectImpact } from "../../src/index";
import { adjustItem, scoreItems } from "../../src/survey";
import {
  ARCHETYPES,
  CII_ITEMS,
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  ROUTE_ROWS,
  SUB_DIMENSION_CODES,
  TSI2_ITEMS,
  TSI3_ITEMS,
  type ItemCode,
  type ItemMeans,
  type Route,
  type RouteAssignment,
  type RouteRow,
  type SubDimensionCode,
  type UnitMeasurementInput,
} from "../../src/types";

// ---------------------------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------------------------

const mean = fc.integer({ min: 100, max: 500 }).map((n) => n / 100);
const maybe = <T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.option(arb, { nil: undefined, freq: 4 });
const score100 = fc.integer({ min: 0, max: 10000 }).map((n) => n / 100);
const items = <K extends ItemCode>(codes: readonly K[]): fc.Arbitrary<ItemMeans<K>> =>
  fc.tuple(...codes.map(() => maybe(mean))).map((values) => {
    const out: ItemMeans<K> = {};
    codes.forEach((code, i) => {
      const v = values[i];
      if (v !== undefined) out[code] = v;
    });
    return out;
  });
const tier = fc.constantFrom<Route | undefined>(
  "Tier 1",
  "Tier 2",
  "Tier 3",
  "Insufficient data",
  undefined,
);
const isoDate = fc
  .record({
    y: fc.integer({ min: 2024, max: 2026 }),
    m: fc.integer({ min: 1, max: 12 }),
    d: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ y, m, d }) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
const routes = fc
  .tuple(...ROUTE_ROWS.map(() => fc.record({ tier, vintage: maybe(isoDate) })))
  .map((assignments) => {
    const out: Partial<Record<RouteRow, RouteAssignment>> = {};
    ROUTE_ROWS.forEach((row, i) => {
      const a = assignments[i] as { tier: Route | undefined; vintage: string | undefined };
      out[row] = {
        ...(a.tier === undefined ? {} : { tier: a.tier }),
        ...(a.vintage === undefined ? {} : { vintage: a.vintage }),
      };
    });
    return out;
  });

const strip = <T extends object>(o: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
};

const inputArb: fc.Arbitrary<UnitMeasurementInput> = fc
  .record({
    engagementDate: maybe(isoDate),
    routes,
    families: fc.array(
      fc
        .record({
          fte: maybe(fc.integer({ min: 1, max: 80 })),
          skillsRequired: maybe(fc.integer({ min: 0, max: 15 })),
          confirmedProficiencies: maybe(fc.integer({ min: 0, max: 1200 })),
        })
        .map(strip),
      { maxLength: 3 },
    ),
    tenure: maybe(fc.integer({ min: 1, max: 200 })),
    c1Module: maybe(score100),
    domains: fc.array(
      fc
        .record({
          criticality: maybe(fc.integer({ min: 1, max: 3 })),
          meanScore: maybe(score100),
          coverage: maybe(fc.integer({ min: 0, max: 100 }).map((n) => n / 100)),
        })
        .map(strip),
      { maxLength: 4 },
    ),
    c3: fc
      .record({
        band5: maybe(fc.nat(30)),
        band4: maybe(fc.nat(30)),
        band3: maybe(fc.nat(30)),
        band2: maybe(fc.nat(30)),
        band1: maybe(fc.nat(30)),
      })
      .map(strip),
    cii: items(CII_ITEMS),
    c5: fc
      .record({
        timeToCompetence: maybe(score100),
        adoption: maybe(score100),
        cycleImprovement: maybe(score100),
        moduleScore: maybe(score100),
      })
      .map(strip),
    platform: maybe(score100),
    mi1: items(MI1_ITEMS),
    mi2: items(MI2_ITEMS),
    mi3: items(MI3_ITEMS),
    mi4: items(MI4_ITEMS),
    tw: fc.record({ TW1: maybe(mean), TW2: maybe(mean), TW3: maybe(mean) }).map(strip),
    o1c: fc.tuple(maybe(score100), maybe(score100), maybe(score100)),
    oi1: items(OI1_ITEMS),
    o2c: fc.tuple(maybe(score100), maybe(score100), maybe(score100)),
    oi2: items(OI2_ITEMS),
    o3c: maybe(score100),
    oi3: items(OI3_ITEMS),
    o4c: maybe(score100),
    oi4: items(OI4_ITEMS),
    teams: fc.array(
      fc.record({ fte: maybe(fc.integer({ min: 1, max: 40 })), score: maybe(score100) }).map(strip),
      { maxLength: 4 },
    ),
    s1: fc.tuple(maybe(score100), maybe(score100), maybe(score100)),
    telemetry: fc
      .record({
        meetingHoursPerIc: maybe(fc.nat(50)),
        meetingHoursPerManager: maybe(fc.nat(60)),
        fragmentedTimeRatio: maybe(fc.nat(100).map((n) => n / 100)),
        afterHoursHours: maybe(fc.nat(20)),
      })
      .map(strip),
    tsi2: items(TSI2_ITEMS),
    tsi3: items(TSI3_ITEMS),
    triangulators: fc
      .record({
        voluntaryTurnover: maybe(score100),
        unplannedAbsence: maybe(score100),
        enps: maybe(score100),
        goalAchievement: maybe(score100),
      })
      .map(strip),
  })
  .map((r) => ({
    engagement: {
      archetype: "Default" as const,
      ...(r.engagementDate === undefined ? {} : { engagementDate: r.engagementDate }),
    },
    routes: r.routes,
    capability: {
      c1: strip({ families: r.families, medianTenureMonths: r.tenure, moduleScore: r.c1Module }),
      c2: { domains: r.domains },
      c3: r.c3,
      c4: { items: r.cii },
      c5: r.c5,
    },
    motivation: {
      m1: strip({ platformComposite: r.platform, items: r.mi1 }),
      m2: { items: r.mi2 },
      m3: { items: r.mi3 },
      m4: { items: r.mi4 },
      tripWires: r.tw,
    },
    opportunity: {
      o1: strip({
        decisionRightsScore: r.o1c[0],
        roleArchitectureScore: r.o1c[1],
        cascadeScore: r.o1c[2],
        items: r.oi1,
      }),
      o2: strip({
        toolInventoryScore: r.o2c[0],
        informationAccessScore: r.o2c[1],
        integrationScore: r.o2c[2],
        items: r.oi2,
      }),
      o3: strip({ processFrictionScore: r.o3c, items: r.oi3 }),
      o4: strip({ capacityAnalysisScore: r.o4c, items: r.oi4 }),
      o5: { teams: r.teams },
    },
    synergy: {
      s1: strip({ coverageBreadth: r.s1[0], coverageDepth: r.s1[1], distribution: r.s1[2] }),
      s2: { telemetry: r.telemetry, items: r.tsi2 },
      s3: { items: r.tsi3 },
    },
    behaviouralTriangulators: r.triangulators,
    // strip() removes every undefined at runtime; the cast records that for exactOptionalPropertyTypes.
  })) as fc.Arbitrary<UnitMeasurementInput>;

const tripWiresArb = fc
  .record({ TW1: maybe(mean), TW2: maybe(mean), TW3: maybe(mean) })
  .map(strip) as fc.Arbitrary<Partial<Record<"TW1" | "TW2" | "TW3", number>>>;

const RUNS = { numRuns: 300 };

// ---------------------------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------------------------

describe("invariants over random inputs", () => {
  it("is deterministic: the same input gives a deep-equal result", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        expect(calculateUnit(input)).toEqual(calculateUnit(structuredClone(input)));
      }),
      RUNS,
    );
  });

  it("every score is blank or within 0 to 100, except C1, which the workbook lets reach 105 through the tenure moderator", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = calculateUnit(input);
        for (const code of SUB_DIMENSION_CODES) {
          const score = result.subDimensions[code].score;
          if (score === undefined) continue;
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(code === "C1" ? 105 : 100);
        }
        for (const value of [result.components.C, result.components.M, result.components.O]) {
          if (value !== undefined) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(105);
          }
        }
      }),
      RUNS,
    );
  });

  it("S stays within 0.85 and 1.15 and the range check always reads OK", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = calculateUnit(input);
        expect(result.components.S).toBeGreaterThanOrEqual(0.85);
        expect(result.components.S).toBeLessThanOrEqual(1.15);
        expect(result.validation.sInRange).toBe("OK");
      }),
      RUNS,
    );
  });

  it("reallocated weights sum to 1 within every component that has an available sub-dimension, and to 0 otherwise", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = calculateUnit(input);
        for (const component of ["C", "M", "O", "S"] as const) {
          const codes = SUB_DIMENSION_CODES.filter(
            (code) => result.subDimensions[code].component === component,
          );
          const sum = codes.reduce((t, code) => t + result.subDimensions[code].normalisedWeight, 0);
          const any = codes.some((code) => result.subDimensions[code].available);
          expect(Math.abs(sum - (any ? 1 : 0))).toBeLessThan(1e-12);
        }
      }),
      RUNS,
    );
  });

  it("the binding constraint is never a Synergy sub-dimension", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const result = calculateUnit(input);
        for (const row of result.ranking.topSix) expect(row.label.startsWith("S")).toBe(false);
        expect(result.ranking.statement.startsWith("S")).toBe(false);
      }),
      RUNS,
    );
  });

  it("trip-wires never alter P, C, M or O", () => {
    fc.assert(
      fc.property(inputArb, tripWiresArb, (input, tripWires) => {
        const a = calculateUnit(input);
        const b = calculateUnit({ ...input, motivation: { ...input.motivation, tripWires } });
        expect(b.components).toEqual(a.components);
        expect(b.ranking.topSix).toEqual(a.ranking.topSix);
      }),
      RUNS,
    );
  });

  it("a blank item never alters a mean, and reverse-scoring applies only to the mapped items", () => {
    fc.assert(
      fc.property(items(MI2_ITEMS), (means) => {
        const withBlank = { ...means };
        delete withBlank["MI2-03"];
        const scoreWith = scoreItems(MI2_ITEMS, {
          ...withBlank,
          "MI2-03": means["MI2-03"] as number,
        });
        if (means["MI2-03"] === undefined) expect(scoreItems(MI2_ITEMS, withBlank)).toBe(scoreWith);
      }),
      RUNS,
    );
    fc.assert(
      fc.property(
        fc.constantFrom(...CII_ITEMS, ...MI1_ITEMS, ...OI1_ITEMS, ...TSI3_ITEMS),
        mean,
        (code, m) => {
          expect(adjustItem(code, m)).toBe(REVERSE_SCORED_ITEMS.has(code) ? 6 - m : m);
        },
      ),
      RUNS,
    );
  });

  it("an older vintage changes confidence only", () => {
    fc.assert(
      fc.property(inputArb, fc.constantFrom(...ROUTE_ROWS), (input, row) => {
        const a = calculateUnit(input);
        const older = structuredClone(input);
        older.routes = {
          ...older.routes,
          [row]: { ...older.routes?.[row], vintage: "2020-01-01" },
        };
        const b = calculateUnit(older);
        expect(b.subDimensions[row as SubDimensionCode]?.score).toEqual(
          a.subDimensions[row as SubDimensionCode]?.score,
        );
        expect(b.components).toEqual(a.components);
        expect(b.ranking).toEqual(a.ranking);
        expect(b.motivation).toEqual(a.motivation);
        expect(b.opportunity).toEqual(a.opportunity);
      }),
      RUNS,
    );
  });

  it("projectImpact with the current score returns the baseline exactly, for any sub-dimension", () => {
    fc.assert(
      fc.property(inputArb, fc.constantFrom(...SUB_DIMENSION_CODES), (input, code) => {
        const baseline = calculateUnit(input);
        const current = baseline.subDimensions[code].score;
        fc.pre(current !== undefined);
        const projection = projectImpact(input, code, current as number);
        expect(projection.projected).toEqual(baseline);
        expect(projection.bindingConstraintChanges).toBe(false);
      }),
      RUNS,
    );
  });

  it("refuses every disabled archetype and accepts Default", () => {
    for (const archetype of ARCHETYPES) {
      const input: UnitMeasurementInput = { engagement: { archetype } };
      if (archetype === "Default") expect(() => calculateUnit(input)).not.toThrow();
      else expect(() => calculateUnit(input)).toThrow(DisabledArchetypeError);
    }
  });
});
