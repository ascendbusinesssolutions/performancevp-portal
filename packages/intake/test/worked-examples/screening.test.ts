/**
 * Response validity: the workbook's whole-row checks (7 Screening) and the online speed check
 * (Online Measurement Specification Part 7), on constructed rows and on Northwind.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { screenResponses, screenRow, speedCutoff } from "../../src/screening";
import type { IntakeInput, MemberResponse } from "../../src/types";

const northwind = JSON.parse(
  readFileSync(new URL("../../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

function row(values: Record<string, number>, extra: Partial<MemberResponse> = {}): MemberResponse {
  return { items: values as MemberResponse["items"], ...extra };
}

describe("7 Screening: the whole-row checks", () => {
  it("flags patterning when every value on the row is the same (all 5s), including process items", () => {
    const s = screenRow(row({ "CII-01": 5, "CII-05": 5, "MI1-01": 5 }), 0);
    expect(s).toMatchObject({ count: 3, max: 5, min: 5, patterning: true });
    const withProcess = screenRow(
      row(
        { "CII-01": 4, "CII-05": 4 },
        { processes: [{ processId: "p1", items: { "O3P-01": 3 } }] },
      ),
      0,
    );
    expect(withProcess).toMatchObject({ count: 3, max: 4, min: 3, patterning: false });
  });

  it("flags straight-lining when the forward and reverse means are both at or above 4", () => {
    // Forward CII-01..04 mean 4.25; reverse CII-05 4: agreement in direction on a reverse item.
    const s = screenRow(
      row({ "CII-01": 4, "CII-02": 4, "CII-03": 5, "CII-04": 4, "CII-05": 4 }),
      0,
    );
    expect(s.forwardMean).toBe(4.25);
    expect(s.reverseMean).toBe(4);
    expect(s.straightLining).toBe(true);
    expect(s.patterning).toBe(false);
  });

  it("flags straight-lining when both means are at or below 2, and not between", () => {
    expect(screenRow(row({ "CII-01": 2, "CII-02": 1, "CII-05": 2 }), 0).straightLining).toBe(true);
    expect(screenRow(row({ "CII-01": 3, "CII-02": 4, "CII-05": 4 }), 0).straightLining).toBe(false);
    // Forward 4, reverse 2: the reverse item disagrees, as an attentive respondent's would.
    expect(screenRow(row({ "CII-01": 4, "CII-02": 4, "CII-05": 2 }), 0).straightLining).toBe(false);
  });

  it("cannot fire straight-lining on a row with no reverse item, as the workbook's D is blank", () => {
    const s = screenRow(row({ "CII-01": 5, "CII-02": 5, "CII-03": 4 }), 0);
    expect(s.reverseMean).toBeUndefined();
    expect(s.straightLining).toBe(false);
    expect(s.patterning).toBe(false);
  });

  it("treats a row with no numeric value as not received", () => {
    const result = screenResponses([row({}), row({ "CII-01": 3, "CII-05": 2 })]);
    expect(result.summary).toMatchObject({ received: 1, valid: 1, excluded: 0 });
    expect(result.rows.map((r) => r.index)).toEqual([1]);
  });

  it("reports the summary as the workbook does: counts, rate and the headcount reconciliation", () => {
    const rows = [
      row({ "CII-01": 3, "CII-05": 2 }),
      row({ "CII-01": 5, "CII-05": 5 }), // patterning and straight-lining
      row({ "CII-01": 4, "CII-02": 5, "CII-05": 4 }), // straight-lining only
    ];
    const result = screenResponses(rows, { headcount: 2 });
    expect(result.summary).toEqual({
      received: 3,
      valid: 1,
      excluded: 2,
      exclusionRate: 2 / 3,
      reasons: { straightLining: 2, patterning: 1, speed: 0 },
      speedCheckApplied: false,
      speedCutoffSeconds: undefined,
      headcountReconciliation: "CHECK: responses exceed headcount",
    });
    expect(screenResponses(rows, { headcount: 3 }).summary.headcountReconciliation).toBe("ok");
    expect(screenResponses(rows).summary.headcountReconciliation).toBeUndefined();
    expect(screenResponses([]).summary.exclusionRate).toBeUndefined();
  });
});

describe("the speed check (Online Measurement Specification Part 7)", () => {
  const timed = (n: number, seconds: (i: number) => number): MemberResponse[] =>
    Array.from({ length: n }, (_, i) =>
      row({ "CII-01": 3, "CII-05": 2 }, { id: `r${i}`, completionSeconds: seconds(i) }),
    );

  it("takes the nearest-rank 5th percentile: rank ceiling(0.05 × n)", () => {
    // 20 rows with times 10..200: rank ceiling(1) = 1, the smallest time.
    expect(speedCutoff(timed(20, (i) => (i + 1) * 10))).toBe(10);
    // 40 rows: rank 2.
    expect(speedCutoff(timed(40, (i) => (i + 1) * 10))).toBe(20);
    // 41 rows: rank ceiling(2.05) = 3.
    expect(speedCutoff(timed(41, (i) => (i + 1) * 10))).toBe(30);
  });

  it("runs only with at least 20 received responses, and excludes strictly below the cut-off", () => {
    const nineteen = screenResponses(timed(19, (i) => (i === 0 ? 1 : 100)));
    expect(nineteen.summary.speedCheckApplied).toBe(false);
    expect(nineteen.summary.valid).toBe(19);

    const twenty = screenResponses(timed(20, (i) => (i === 0 ? 1 : 100)));
    expect(twenty.summary).toMatchObject({
      speedCheckApplied: true,
      speedCutoffSeconds: 1,
      valid: 20,
      reasons: { speed: 0 },
    });

    const forty = screenResponses(timed(40, (i) => (i < 2 ? 5 : i === 2 ? 30 : 100)));
    expect(forty.summary.speedCutoffSeconds).toBe(5);
    expect(forty.summary.reasons.speed).toBe(0);
    const fortyOne = screenResponses(timed(41, (i) => (i < 2 ? 5 : i === 2 ? 30 : 100)));
    expect(fortyOne.summary.speedCutoffSeconds).toBe(30);
    expect(fortyOne.summary.reasons.speed).toBe(2);
    expect(fortyOne.valid.map((r) => r.id)).not.toContain("r0");
  });

  it("does not run when no response recorded a time, whatever the count", () => {
    const untimed = screenResponses(Array.from({ length: 25 }, () => row({ "CII-01": 3 })));
    expect(untimed.summary.speedCheckApplied).toBe(false);
  });

  it("can be switched off for a workbook comparison", () => {
    const result = screenResponses(
      timed(41, (i) => (i < 2 ? 5 : 100)),
      { applySpeedCheck: false },
    );
    expect(result.summary.speedCheckApplied).toBe(false);
    expect(result.summary.valid).toBe(41);
  });
});

describe("Northwind", () => {
  it("keeps 48 of 50 rows, excluding the last two, at a 4% exclusion rate", () => {
    const result = screenResponses(northwind.responses?.members ?? [], { headcount: 60 });
    expect(result.summary).toMatchObject({
      received: 50,
      valid: 48,
      excluded: 2,
      exclusionRate: 0.04,
      headcountReconciliation: "ok",
    });
    expect(result.rows.filter((r) => !r.valid).map((r) => r.id)).toEqual(["main-53", "main-54"]);
  });
});
