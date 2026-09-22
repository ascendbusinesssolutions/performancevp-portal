/**
 * M-O1-LT, M-O1-CASCADE, M-O2-IA and M-O3-PF: the Type C Scoring rows on constructed rows and on
 * Northwind (stored cells B38 = 61, B43 = 65.104, B44 = 69.792, B45 = B46 = 59.896).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  scoreCascade,
  scoreInformationAccess,
  scoreProcessFriction,
} from "../../src/modules/component";
import { scoreLeadership } from "../../src/modules/lt";
import type { IntakeInput, LeadershipRow, MemberResponse } from "../../src/types";
import { runSurveyWorkbook } from "../../src/workbook";

const northwind = JSON.parse(
  readFileSync(new URL("../../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

function row(
  values: Record<string, number>,
  processes?: MemberResponse["processes"],
): MemberResponse {
  const r: MemberResponse = { items: values as MemberResponse["items"] };
  if (processes !== undefined) r.processes = processes;
  return r;
}

const types = [
  { id: "d1", name: "Decision 1" },
  { id: "d2", name: "Decision 2" },
];

describe("M-O1-LT", () => {
  it("scores one decision: modal-answer agreement per role over n, the mean of five, clarity converted", () => {
    const rows: LeadershipRow[] = [
      {
        respondentId: "L1",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "B",
        perform: "C",
        input: "D",
        decides: "E",
        clarity: 5,
      },
      {
        respondentId: "L2",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "B",
        perform: "C",
        input: "D",
        decides: "F",
        clarity: 3,
      },
      {
        respondentId: "L3",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "X",
        perform: "C",
        input: "Y",
        decides: "F",
        clarity: 4,
      },
    ];
    const result = scoreLeadership(rows, types, 4);
    const d1 = result.decisions[0];
    expect(d1).toMatchObject({
      n: 3,
      agreement: { recommend: 1, agree: 2 / 3, perform: 1, input: 2 / 3, decides: 2 / 3 },
    });
    expect(d1?.mean).toBeCloseTo((1 + 2 / 3 + 1 + 2 / 3 + 2 / 3) / 5, 12);
    expect(d1?.clarity).toBe(75);
    // Decision 2 has no rows: n 0, everything blank, and it drops out of the aggregates.
    expect(result.decisions[1]).toMatchObject({ n: 0, mean: undefined, clarity: undefined });
    expect(result.aggregateAgreement).toBe(d1?.mean);
    expect(result.aggregateClarity).toBe(75);
    expect(result).toMatchObject({ distinctRespondents: 3, responseRate: 0.75, rateFlag: "ok" });
    expect(result.score).toBeCloseTo(0.6 * (d1?.mean ?? 0) * 100 + 0.4 * 75, 12);
  });

  it("counts a blank role answer in n but in no modal count, and takes the larger of a tie", () => {
    const rows: LeadershipRow[] = [
      { respondentId: "L1", decisionTypeId: "d1", recommend: "A" },
      { respondentId: "L2", decisionTypeId: "d1", recommend: "B" },
      { respondentId: "L3", decisionTypeId: "d1" },
    ];
    const result = scoreLeadership(rows, types, 3);
    expect(result.rows[2]?.counts.recommend).toBeUndefined();
    expect(result.decisions[0]?.agreement.recommend).toBeCloseTo(1 / 3, 12);
    // A role nobody answered: no count at all, so the maximum is 0 over n.
    expect(result.decisions[0]?.agreement.agree).toBe(0);
    // No clarity answered: blank, and the score cannot form.
    expect(result.decisions[0]?.clarity).toBeUndefined();
    expect(result.score).toBeUndefined();
  });

  it("flags a low response rate below 75% and counts a respondent once across decisions", () => {
    const rows: LeadershipRow[] = [
      { respondentId: "L1", decisionTypeId: "d1", clarity: 4 },
      { respondentId: "L1", decisionTypeId: "d2", clarity: 4 },
      { respondentId: "L2", decisionTypeId: "d1", clarity: 4 },
    ];
    expect(scoreLeadership(rows, types, 3)).toMatchObject({
      distinctRespondents: 2,
      responseRate: 2 / 3,
      rateFlag: "LOW leadership response",
    });
    expect(scoreLeadership(rows, types, 0).responseRate).toBeUndefined();
    expect(scoreLeadership(rows, types, undefined).rateFlag).toBeUndefined();
    expect(scoreLeadership(rows, types, 2).rateFlag).toBe("ok");
  });

  it("does not screen the leadership survey: an all-same row counts", () => {
    const rows: LeadershipRow[] = [
      {
        respondentId: "L1",
        decisionTypeId: "d1",
        recommend: "A",
        agree: "A",
        perform: "A",
        input: "A",
        decides: "A",
        clarity: 5,
      },
    ];
    expect(scoreLeadership(rows, types, 1).decisions[0]?.mean).toBe(1);
  });
});

describe("CASCADE, IA and PF", () => {
  it("CASCADE: mean of the item means with O1C-05 flipped, over the items present, converted", () => {
    const rows = [
      row({ "O1C-01": 4, "O1C-02": 4, "O1C-05": 2 }),
      row({ "O1C-01": 3, "O1C-02": 5, "O1C-05": 1 }),
    ];
    // Item means 3.5, 4.5, 1.5 flipped to 4.5: mean 4.1667, score 79.17.
    const result = scoreCascade(rows, 10);
    expect(result.score).toBeCloseTo((4.166666666666667 - 1) * 25, 12);
    expect(result).toMatchObject({ responseRate: 0.2, flag: "LOW" });
    expect(scoreCascade([], 10)).toEqual({ score: undefined, responseRate: 0, flag: "LOW" });
    expect(scoreCascade(rows, undefined)).toMatchObject({
      responseRate: undefined,
      flag: undefined,
    });
  });

  it("IA flips O2I-03, O2I-04 and O2I-06", () => {
    const rows = [row({ "O2I-01": 5, "O2I-03": 1, "O2I-04": 1, "O2I-06": 1 })];
    // Means 5, 1, 1, 1: flipped 5, 5, 5, 5: score 100.
    expect(scoreInformationAccess(rows, 1).score).toBe(100);
  });

  it("PF scores each named process and averages the processes with a score", () => {
    const rows = [
      row({}, [
        { processId: "p1", items: { "O3P-01": 4, "O3P-04": 2 } },
        { processId: "p2", items: { "O3P-01": 2 } },
      ]),
      row({}, [{ processId: "p1", items: { "O3P-01": 4, "O3P-04": 2 } }]),
    ];
    const processes = [
      { id: "p1", name: "P1" },
      { id: "p2", name: "P2" },
      { id: "p3", name: "P3" },
    ];
    const result = scoreProcessFriction(rows, processes);
    expect(result.processes.map((p) => p.score)).toEqual([75, 25, undefined]);
    expect(result.mean).toBe(50);
    expect(scoreProcessFriction([], processes).mean).toBeUndefined();
  });
});

describe("Northwind", () => {
  const result = runSurveyWorkbook(northwind);

  it("M-O1-LT: agreement 0.6, clarity 62.5, rate 100%, score 61", () => {
    expect(result.typeC.leadership.decisions.map((d) => d.n)).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(result.typeC.leadership.decisions[0]?.mean).toBeCloseTo(0.6, 12);
    expect(result.typeC.leadership).toMatchObject({
      aggregateClarity: 62.5,
      distinctRespondents: 6,
      responseRate: 1,
      rateFlag: "ok",
    });
    expect(result.typeC.leadership.score).toBeCloseTo(61, 12);
  });

  it("CASCADE 65.104, IA 69.792 at 80%, PF 59.896 over two processes", () => {
    expect(result.typeC.cascade.score).toBeCloseTo(65.1041666666667, 12);
    expect(result.typeC.cascade).toMatchObject({ responseRate: 0.8, flag: "" });
    expect(result.typeC.informationAccess.score).toBeCloseTo(69.7916666666667, 12);
    expect(result.typeC.processFriction.processes.map((p) => p.score !== undefined)).toEqual([
      true,
      true,
      false,
    ]);
    expect(result.typeC.processFriction.mean).toBeCloseTo(59.8958333333333, 12);
  });
});
