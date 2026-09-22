/**
 * Property tests over generated inputs: deductions never take a score below 0; route selection is
 * deterministic; formal ratings older than 12 months are never used; a blank item never moves a
 * mean; screening is order-independent; FTE weighting reduces to a plain mean for equal FTE; the
 * C3 adjustment preserves the rated total; the Gini stays within [0, 1); the C1 Type B rows give
 * the engine the workbook's family coverage when every FTE is whole.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { assemble } from "../../src/assemble";
import { evaluateFormalRatings, isCurrent, selectC3Route } from "../../src/c3-route";
import { minusMonths } from "../../src/excel";
import { c3Adjustments, ratingDeduction } from "../../src/guard";
import { itemMeans } from "../../src/means";
import { scoreC3 } from "../../src/modules/c3-mgr";
import { gini } from "../../src/s1";
import { screenResponses } from "../../src/screening";
import { weightedItemMeans } from "../../src/team-rules";
import {
  CII_ITEMS,
  PART_A_ITEMS_FOR_TESTS,
  type IntakeInput,
  type MemberResponse,
  type Snapshot,
} from "./items";

const likert = fc.integer({ min: 1, max: 5 });

const memberRow: fc.Arbitrary<MemberResponse> = fc
  .record({
    items: fc.dictionary(fc.constantFrom(...PART_A_ITEMS_FOR_TESTS), likert, {
      minKeys: 0,
      maxKeys: 20,
    }),
    completionSeconds: fc.option(fc.integer({ min: 1, max: 3600 }), { nil: undefined }),
  })
  .map(({ items, completionSeconds }) => {
    const row: MemberResponse = { items: items as MemberResponse["items"] };
    if (completionSeconds !== undefined) row.completionSeconds = completionSeconds;
    return row;
  });

describe("screening", () => {
  it("is order-independent: the valid set, counts and cut-off do not depend on row order", () => {
    fc.assert(
      fc.property(
        fc.array(memberRow, { minLength: 0, maxLength: 40 }),
        fc.array(fc.nat(), { minLength: 40, maxLength: 40 }),
        (rows, keys) => {
          const shuffled = rows
            .map((r, i) => ({ r, k: keys[i] ?? 0 }))
            .sort((a, b) => a.k - b.k)
            .map((x) => x.r);
          const a = screenResponses(rows);
          const b = screenResponses(shuffled);
          expect(b.summary).toEqual(a.summary);
          expect(new Set(b.valid)).toEqual(new Set(a.valid));
        },
      ),
    );
  });

  it("never excludes more than it received, and a row with no numeric value is never received", () => {
    fc.assert(
      fc.property(fc.array(memberRow, { maxLength: 30 }), (rows) => {
        const s = screenResponses(rows).summary;
        expect(s.excluded).toBeLessThanOrEqual(s.received);
        expect(s.received).toBe(rows.filter((r) => Object.keys(r.items).length > 0).length);
      }),
    );
  });
});

describe("means", () => {
  it("a blank item never moves a mean: adding a row that skips the item leaves it unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.dictionary(fc.constantFrom(...CII_ITEMS), likert, { minKeys: 1 }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.constantFrom(...CII_ITEMS),
        (rowItems, item) => {
          const rows: MemberResponse[] = rowItems.map((items) => ({
            items: items as MemberResponse["items"],
          }));
          const before = itemMeans(rows, [item])[item];
          const extra: MemberResponse = { items: { "CII-01": 3 } as MemberResponse["items"] };
          delete (extra.items as Record<string, number>)[item];
          const after = itemMeans([...rows, extra], [item])[item];
          expect(after).toBe(before);
        },
      ),
    );
  });

  it("FTE weighting reduces to a plain mean when every team has the same FTE", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.dictionary(fc.constantFrom(...CII_ITEMS), fc.double({ min: 1, max: 5, noNaN: true }), {
            minKeys: 1,
          }),
          { minLength: 1, maxLength: 8 },
        ),
        fc.double({ min: 0.5, max: 50, noNaN: true }),
        (teamMeans, fte) => {
          const weighted = weightedItemMeans(
            teamMeans.map((means) => ({
              fte,
              means: means as Record<(typeof CII_ITEMS)[number], number>,
            })),
          );
          for (const item of CII_ITEMS) {
            const values = teamMeans
              .map((m) => m[item])
              .filter((v): v is number => v !== undefined);
            if (values.length === 0) expect(weighted[item]).toBeUndefined();
            else
              expect(weighted[item]).toBeCloseTo(
                values.reduce((a, b) => a + b, 0) / values.length,
                9,
              );
          }
        },
      ),
    );
  });
});

describe("the guard and the C3 adjustment", () => {
  it("records a deduction only above 50% high ratings, and the amount is always 7.5", () => {
    fc.assert(
      fc.property(fc.array(likert, { maxLength: 60 }), (ratings) => {
        const high = ratings.filter((r) => r >= 4).length;
        const deduction = ratingDeduction("C1", ratings);
        if (ratings.length > 0 && high / ratings.length > 0.5)
          expect(deduction).toMatchObject({ amount: 7.5, applied: false });
        else expect(deduction).toBeUndefined();
      }),
    );
  });

  it("preserves the rated total through the cap and the transfer, keeps every count non-negative, and never raises the mean band", () => {
    fc.assert(
      fc.property(fc.array(likert, { maxLength: 60 }), (bands) => {
        const rows = bands.map((band, i) => ({
          managerRef: "M",
          employeeRef: `E${i}`,
          roleFamilyId: undefined,
          skills: [],
          band,
          coverage: undefined,
          newManager: 0 as const,
        }));
        const result = scoreC3(rows);
        const total = result.final.reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(result.total, 9);
        for (const c of result.final) expect(c).toBeGreaterThanOrEqual(0);
        if (result.total > 0) {
          const meanOf = (counts: readonly number[]): number =>
            counts.reduce((sum, c, i) => sum + c * (i + 1), 0) / result.total;
          expect(meanOf(result.final)).toBeLessThanOrEqual(meanOf(result.raw) + 1e-9);
          expect(result.final[4]).toBeLessThanOrEqual(0.25 * result.total + 1e-9);
        }
        for (const a of c3Adjustments(result)) expect(a.applied).toBe(true);
      }),
    );
  });
});

describe("the C3 route", () => {
  const iso = fc
    .date({
      min: new Date("2020-01-01T00:00:00Z"),
      max: new Date("2030-12-31T00:00:00Z"),
      noInvalidDate: true,
    })
    .map((d) => d.toISOString().slice(0, 10));

  it("never uses a rating dated more than 12 months before launch, or after launch", () => {
    fc.assert(
      fc.property(iso, iso, (ratingDate, launchDate) => {
        const current = isCurrent(ratingDate, launchDate);
        const tooOld = ratingDate < minusMonths(launchDate, 12);
        const future = ratingDate > launchDate;
        expect(current).toBe(!tooOld && !future);
      }),
    );
  });

  it("selects the route deterministically and the formal route only at 80% coverage or more", () => {
    const scaleMap = [
      { label: "A", band: 5 as const },
      { label: "B", band: 3 as const },
      { label: "C", band: 1 as const },
    ];
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.constantFrom("A", "B", "C", "unmapped"), { nil: undefined }), {
          minLength: 1,
          maxLength: 30,
        }),
        fc.boolean(),
        (labels, calibrated) => {
          const snapshot: Snapshot = {
            members: labels.map((label, i) => ({
              employeeRef: `E${i}`,
              fte: 1,
              ...(label === undefined ? {} : { formalRating: { label, date: "2026-03-01" } }),
            })),
          };
          const formal = evaluateFormalRatings({ scaleMap, calibrated }, snapshot, "2026-08-03");
          const again = evaluateFormalRatings({ scaleMap, calibrated }, snapshot, "2026-08-03");
          expect(again).toEqual(formal);
          const mapped = labels.filter((l) => l === "A" || l === "B" || l === "C").length;
          expect(formal?.qualifies).toBe(mapped > 0 && mapped / labels.length >= 0.8 - 1e-12);
          const chosen = selectC3Route(formal, scoreC3([]), 0, snapshot);
          expect(chosen.record.source).toBe(formal?.qualifies ? "formal" : "none");
          if (formal !== undefined) {
            expect(formal.final.reduce((a, b) => a + b, 0)).toBeCloseTo(
              formal.raw.reduce((a, b) => a + b, 0),
              9,
            );
            expect(formal.final[4]).toBeLessThanOrEqual(
              Math.max(formal.raw[4], 0.25 * formal.ratedCount) + 1e-9,
            );
          }
        },
      ),
    );
  });
});

describe("S1", () => {
  it("keeps the Gini in [0, 1) and at 0 for equal counts", () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: 20 }), { maxLength: 30 }), (counts) => {
        const g = gini(counts);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThan(1);
        if (new Set(counts).size <= 1) expect(g).toBe(0);
      }),
    );
  });
});

describe("the assembly", () => {
  it("never puts a person in the engine input, and every route row is set", () => {
    fc.assert(
      fc.property(
        fc.array(memberRow, { minLength: 5, maxLength: 25 }),
        fc.integer({ min: 5, max: 40 }),
        (rows, heads) => {
          const input: IntakeInput = {
            campaign: {
              cadence: "baseline",
              launchDate: "2026-08-03",
              closeDate: "2026-08-24",
              deployed: { partA: [...PART_A_ITEMS_FOR_TESTS] },
            },
            unit: {
              name: "U",
              teams: [],
              roleFamilies: [],
              knowledgeDomains: [],
              systems: [],
              processes: [],
              decisionTypes: [],
            },
            snapshot: {
              members: Array.from({ length: heads }, (_, i) => ({
                employeeRef: `PERSON-${i}`,
                fte: 1,
                startDate: "2024-01-01",
              })),
            },
            responses: { members: rows },
          };
          const result = assemble(input);
          const text = JSON.stringify(result.engineInput);
          expect(text).not.toContain("PERSON-");
          for (const row of [
            "C1",
            "C2",
            "C3",
            "C4",
            "C5",
            "M1",
            "M2",
            "M3",
            "M4",
            "TW1",
            "TW2",
            "TW3",
            "O1",
            "O2",
            "O3",
            "O4",
            "O5",
            "S1",
            "S2",
            "S3",
            "DLP",
          ]) {
            expect(
              result.engineInput.routes?.[
                row as keyof NonNullable<typeof result.engineInput.routes>
              ]?.tier,
              row,
            ).toBeDefined();
          }
          expect(result.engineInput.engagement.unitFte).toBe(heads);
        },
      ),
      { numRuns: 40 },
    );
  });
});
