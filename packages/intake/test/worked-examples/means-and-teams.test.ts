/**
 * 8 Type A Means: item means over valid respondents, block response rates and flags, the per-team
 * CII and O5 rows. Northwind values are the workbook's stored cells.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { blockRates, itemMeans } from "../../src/means";
import { teamCii, teamO5 } from "../../src/teams";
import type { IntakeInput, MemberResponse } from "../../src/types";
import { runSurveyWorkbook } from "../../src/workbook";

const northwind = JSON.parse(
  readFileSync(new URL("../../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

function row(values: Record<string, number>, teamId?: string): MemberResponse {
  const r: MemberResponse = { items: values as MemberResponse["items"] };
  if (teamId !== undefined) r.teamId = teamId;
  return r;
}

describe("item means and block rates", () => {
  it("averages each item over the rows given, leaving an unanswered item absent", () => {
    const rows = [row({ "CII-01": 4, "CII-02": 2 }), row({ "CII-01": 3 })];
    expect(itemMeans(rows, ["CII-01", "CII-02", "CII-03"])).toEqual({ "CII-01": 3.5, "CII-02": 2 });
  });

  it("rates each block by valid respondents answering its first item over the headcount", () => {
    const rows = [row({ "CII-01": 4, "MI1-01": 3 }), row({ "MI1-01": 4 }), row({ "MI1-02": 4 })];
    const rates = blockRates(rows, 5);
    expect(rates.find((b) => b.key === "C4")).toEqual({
      key: "C4",
      responseRate: 0.2,
      flag: "LOW",
    });
    expect(rates.find((b) => b.key === "M1")).toEqual({
      key: "M1",
      responseRate: 0.4,
      flag: "LOW",
    });
    // A block nobody answered rates 0 and LOW, as the workbook does; without a headcount, no rate.
    expect(rates.find((b) => b.key === "M2")).toEqual({ key: "M2", responseRate: 0, flag: "LOW" });
    expect(blockRates(rows, undefined)[0]?.responseRate).toBeUndefined();
  });

  it("flags LOW strictly below 60%", () => {
    const rows = Array.from({ length: 6 }, () => row({ "CII-01": 3 }));
    expect(blockRates(rows, 10)[0]).toMatchObject({
      responseRate: 0.6,
      flag: "",
    });
    expect(blockRates(rows.slice(1), 10)[0]).toMatchObject({
      responseRate: 0.5,
      flag: "LOW",
    });
  });
});

describe("teams", () => {
  const teams = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  const snapshot = {
    members: [
      ...Array.from({ length: 5 }, (_, i) => ({ employeeRef: `a${i}`, teamId: "a", fte: 1 })),
      ...Array.from({ length: 4 }, (_, i) => ({ employeeRef: `b${i}`, teamId: "b", fte: 0.5 })),
    ],
  };

  it("CII per team: 4 valid at 70% pass; 3 valid or 69% is LOW; the rate divides by team FTE", () => {
    const rows = [
      ...Array.from({ length: 4 }, () => row({ "CII-01": 4 }, "a")),
      ...Array.from({ length: 2 }, () => row({ "CII-01": 3 }, "b")),
    ];
    const result = teamCii(rows, teams, snapshot);
    expect(result[0]).toMatchObject({
      teamId: "a",
      validCount: 4,
      responseRate: 0.8,
      flag: "",
      means: { "CII-01": 4 },
    });
    // Team B has 2 FTE over 4 heads: 2 valid is 100% of FTE but fewer than 4 respondents.
    expect(result[1]).toMatchObject({ teamId: "b", validCount: 2, responseRate: 1, flag: "LOW" });

    const three = teamCii(rows.slice(1), teams, snapshot);
    expect(three[0]).toMatchObject({ validCount: 3, responseRate: 0.6, flag: "LOW" });
  });

  it("O5 per team: (mean of the three item means − 1) × 25, flagged on the count only", () => {
    const rows = [
      row({ "OI5-01": 4, "OI5-02": 4, "OI5-03": 3 }, "a"),
      row({ "OI5-01": 5, "OI5-02": 3, "OI5-03": 3 }, "a"),
      row({ "OI5-01": 3 }, "b"),
    ];
    const result = teamO5(rows, teams, snapshot);
    // Item means 4.5, 3.5, 3: mean 3.6667, score 66.67.
    expect(result[0]?.score).toBeCloseTo(66.66666666666667, 12);
    expect(result[0]).toMatchObject({ fte: 5, validCount: 2, responseRate: 0.4, flag: "LOW" });
    // One item answered: the mean of the one item mean.
    expect(result[1]).toMatchObject({ score: 50, flag: "LOW" });
    // No rows at all: no score, and a rate of 0.
    expect(teamO5([], teams, snapshot)[0]).toMatchObject({
      score: undefined,
      validCount: 0,
      responseRate: 0,
    });
  });

  it("gives a team with no FTE no rate, as the workbook's blank Setup FTE", () => {
    const result = teamCii([row({ "CII-01": 4 }, "c")], [{ id: "c", name: "C" }], { members: [] });
    expect(result[0]).toMatchObject({ validCount: 1, responseRate: undefined, flag: "LOW" });
  });
});

describe("Northwind", () => {
  const result = runSurveyWorkbook(northwind);

  it("reproduces the stored item means and block rates", () => {
    expect(result.typeA.means["CII-01"]).toBeCloseTo(3.8936170212766, 12);
    expect(result.typeA.means["OI5-01"]).toBeCloseTo(3.66666666666667, 12);
    expect(result.typeA.blocks[0]).toMatchObject({ key: "C4", responseRate: 47 / 60, flag: "" });
    expect(result.typeA.blocks[10]).toMatchObject({ key: "O5", responseRate: 0.8, flag: "" });
  });

  it("reproduces the four team rows: 12 valid each at 80%, O5 70.83 / 64.58 / 66.67 / 64.58", () => {
    expect(result.typeA.teamCii.map((t) => [t.validCount, t.responseRate, t.flag])).toEqual([
      [12, 0.8, ""],
      [12, 0.8, ""],
      [12, 0.8, ""],
      [12, 0.8, ""],
    ]);
    expect(result.typeA.teamO5.map((t) => t.score)).toEqual([
      70.83333333333334, 64.58333333333334, 66.66666666666666, 64.58333333333334,
    ]);
  });
});
