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
      { unit_code: "CLM", share: 0.8, qualifies: true },
      { unit_code: "SAL", share: 0.8, qualifies: true },
      { unit_code: "OPS", share: 0, qualifies: false },
    ]);
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
    ).toEqual([{ unit_code: "Z", share: undefined, qualifies: false }]);
  });
});
