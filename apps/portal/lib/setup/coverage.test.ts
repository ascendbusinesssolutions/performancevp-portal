import { describe, expect, it } from "vitest";

import { previewCoverage } from "./coverage";

describe("previewCoverage", () => {
  const today = "2026-09-23";

  it("counts ratings present and current, and tests each unit's current FTE against 80%", () => {
    const result = previewCoverage(
      [
        {
          unit_code: "CLM",
          people: 10,
          fte: 10,
          dates: [
            { date: "2026-03-31", people: 8, fte: 8 },
            { date: "2025-03-31", people: 2, fte: 2 },
          ],
        },
        {
          unit_code: "SAL",
          people: 5,
          fte: 4,
          dates: [{ date: "2026-06-30", people: 3, fte: 3.2 }],
        },
        { unit_code: "OPS", people: 4, fte: 4, dates: [] },
      ],
      today,
    );
    expect(result.total).toBe(19);
    expect(result.withRating).toBe(13);
    expect(result.current).toBe(11);
    expect(result.units).toEqual([
      { key: "CLM", share: 0.8, qualifies: true },
      { key: "SAL", share: 0.8, qualifies: true },
      { key: "OPS", share: 0, qualifies: false },
    ]);
  });

  it("gives a grouping unit no coverage line, and still counts its people in the totals", () => {
    const result = previewCoverage(
      [
        { unit_code: "GRP", people: 2, fte: 2, dates: [] },
        {
          unit_code: "OPS",
          people: 10,
          fte: 10,
          dates: [{ date: "2026-06-30", people: 9, fte: 9 }],
        },
      ],
      today,
      (code) => (code === "GRP" ? null : code),
    );
    expect(result.total).toBe(12);
    expect(result.units).toEqual([{ key: "OPS", share: 0.9, qualifies: true }]);
  });

  it("judges a combination's units together, over the combination's FTE", () => {
    const result = previewCoverage(
      [
        { unit_code: "A", people: 6, fte: 6, dates: [{ date: "2026-06-30", people: 6, fte: 6 }] },
        { unit_code: "B", people: 4, fte: 4, dates: [] },
      ],
      today,
      () => "combined-ab",
    );
    expect(result.units).toEqual([{ key: "combined-ab", share: 0.6, qualifies: false }]);
  });

  it("applies the intake's 12-month rule: the same day a year earlier counts, the day before does not", () => {
    const unit = (date: string) => ({
      unit_code: "U",
      people: 1,
      fte: 1,
      dates: [{ date, people: 1, fte: 1 }],
    });
    expect(previewCoverage([unit("2025-09-23")], today).current).toBe(1);
    expect(previewCoverage([unit("2025-09-22")], today).current).toBe(0);
    expect(previewCoverage([unit("2026-09-24")], today).current).toBe(0);
  });

  it("leaves a unit with no FTE without a share", () => {
    expect(
      previewCoverage([{ unit_code: "Z", people: 0, fte: 0, dates: [] }], today).units,
    ).toEqual([{ key: "Z", share: undefined, qualifies: false }]);
  });
});
