/**
 * Intake 1.2.0: what an online campaign hands the intake that the workbook never saw (Milestone 5
 * plan, D1 and D2). Part B arrives as its own survey, screened on its own; the leadership-team and
 * team-leader audiences arrive as the lists frozen at launch.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { assembleUnit } from "../../src/index";
import { screenRow } from "../../src/screening";
import {
  C5L_ITEMS,
  O1C_ITEMS,
  O2I_ITEMS,
  type IntakeInput,
  type MemberResponse,
  type PartAItem,
  type PartBItem,
} from "../../src/types";

const northwind = JSON.parse(
  readFileSync(new URL("../../fixtures/northwind-intake-input.json", import.meta.url), "utf8"),
) as IntakeInput;

const PART_B = new Set<string>([...O1C_ITEMS, ...O2I_ITEMS]);

/** One member row as two unlinked submissions: Part A with the team, Part B with the processes. */
function split(row: MemberResponse): { a: MemberResponse; b: MemberResponse } {
  const a: Partial<Record<PartAItem, number>> = {};
  const b: Partial<Record<PartBItem, number>> = {};
  for (const [item, value] of Object.entries(row.items)) {
    if (PART_B.has(item)) b[item as PartBItem] = value;
    else a[item as PartAItem] = value;
  }
  return {
    a: { items: a, ...(row.teamId === undefined ? {} : { teamId: row.teamId }) },
    b: { items: b, ...(row.processes === undefined ? {} : { processes: row.processes }) },
  };
}

function valid(row: MemberResponse): boolean {
  const s = screenRow(row, 0);
  return !s.patterning && !s.straightLining;
}

describe("Part B as its own survey", () => {
  // The Northwind rows that pass screening whole and as two parts, so the two inputs hold the same
  // valid answers and only the way Part B arrives differs.
  const rows = (northwind.responses?.members ?? []).filter((row) => {
    const { a, b } = split(row);
    return valid(row) && valid(a) && valid(b);
  });

  const combined = (): IntakeInput => {
    const input = structuredClone(northwind);
    input.responses = { ...input.responses, members: rows };
    return input;
  };
  const separate = (): IntakeInput => {
    const input = structuredClone(northwind);
    const parts = rows.map(split);
    input.responses = {
      ...input.responses,
      members: parts.map((p) => p.a),
      membersPartB: parts.map((p) => p.b),
    };
    return input;
  };

  it("scores Cascade, information access and process friction exactly as the combined rows do", () => {
    expect(rows.length).toBeGreaterThan(20);
    const whole = assembleUnit(combined());
    const parts = assembleUnit(separate());
    expect(parts.aggregates.cascade).toBe(whole.aggregates.cascade);
    expect(parts.aggregates.informationAccess).toBe(whole.aggregates.informationAccess);
    expect(parts.aggregates.o2IaAccess).toBe(whole.aggregates.o2IaAccess);
    expect(parts.aggregates.o2IaUse).toBe(whole.aggregates.o2IaUse);
    expect(parts.aggregates.processFriction).toEqual(whole.aggregates.processFriction);
    expect(parts.instruments["M-O1-CASCADE"]).toEqual(whole.instruments["M-O1-CASCADE"]);
    expect(parts.instruments["M-O2-IA"]).toEqual(whole.instruments["M-O2-IA"]);
    expect(parts.instruments["M-O3-PF"]).toEqual(whole.instruments["M-O3-PF"]);
    expect(parts.engineInput).toEqual(whole.engineInput);
  });

  it("screens each part against its own speed cut-off and headcount", () => {
    const input = separate();
    const a = input.responses?.members ?? [];
    const b = input.responses?.membersPartB ?? [];
    // Part A takes about ten minutes, Part B about three: 1 second apart, from different starts.
    a.forEach((row, i) => (row.completionSeconds = 600 + i));
    b.forEach((row, i) => (row.completionSeconds = 180 + i));
    const result = assembleUnit(input);
    const cutoff = (n: number) => Math.ceil(0.05 * n);
    expect(result.screening.members?.speedCutoffSeconds).toBe(600 + cutoff(a.length) - 1);
    expect(result.screening.membersPartB?.speedCutoffSeconds).toBe(180 + cutoff(b.length) - 1);
    expect(result.screening.members?.reasons.speed).toBe(cutoff(a.length) - 1);
    expect(result.screening.membersPartB?.reasons.speed).toBe(cutoff(b.length) - 1);
    expect(result.screening.members?.headcountReconciliation).toBe("ok");
    expect(result.screening.membersPartB?.headcountReconciliation).toBe("ok");
    expect(result.methodology.exclusions.membersPartB).toEqual(result.screening.membersPartB);
    expect(
      result.methodology.standingStatements.filter((s) => s.startsWith("The speed check")),
    ).toEqual([
      expect.stringContaining("the Part A member survey"),
      expect.stringContaining("the Part B member survey"),
    ]);

    // Passed the old way, as one member array, the Part B times would set Part A's cut-off and
    // Part A would count double against the headcount.
    const mixed = structuredClone(input);
    mixed.responses = { ...mixed.responses, members: [...a, ...b] };
    delete mixed.responses.membersPartB;
    const wrong = assembleUnit(mixed);
    expect(wrong.screening.members?.speedCutoffSeconds).toBeLessThan(600);
    expect(wrong.screening.members?.headcountReconciliation).toBe(
      "CHECK: responses exceed headcount",
    );
  });

  it("changes nothing when Part B is not separate", () => {
    const result = assembleUnit(structuredClone(northwind));
    expect(result.screening.membersPartB).toBeUndefined();
    expect(result.methodology.exclusions.membersPartB).toBeUndefined();
    expect(result.methodology.standingStatements).toContainEqual(
      expect.stringContaining("the member survey"),
    );
  });
});

describe("the audiences frozen at launch", () => {
  it("count a leader from a unit above in the leadership team's denominator", () => {
    const input = structuredClone(northwind);
    const flagged = input.snapshot.members
      .filter((m) => m.leadershipTeam === true)
      .map((m) => m.employeeRef);
    // The same answers against a team one larger: the leader above did not respond.
    const withLeader = structuredClone(input);
    withLeader.snapshot.audiences = { leadershipTeam: [...flagged, "HEAD-1"] };
    const before = assembleUnit(input).instruments["M-O1-LT"];
    const after = assembleUnit(withLeader).instruments["M-O1-LT"];
    expect(after?.validCount).toBe(before?.validCount);
    expect(after?.responseRate).toBeCloseTo(
      (before?.responseRate ?? 0) * (flagged.length / (flagged.length + 1)),
      12,
    );
  });

  it("give the team-leader module a denominator when it falls back to an unflagged unit leader", () => {
    const input = structuredClone(northwind);
    input.campaign.deployed.teamLeaders = true;
    for (const m of input.snapshot.members) delete m.teamLeader;
    const leader = input.snapshot.members[0]!.employeeRef;
    input.responses = {
      ...input.responses,
      teamLeaders: [{ items: Object.fromEntries(C5L_ITEMS.map((item, i) => [item, 2 + (i % 3)])) }],
    };
    expect(assembleUnit(input).instruments["M-C5-TL"]?.status).toBe("insufficient");
    input.snapshot.audiences = { teamLeaders: [leader] };
    const result = assembleUnit(input);
    expect(result.instruments["M-C5-TL"]).toMatchObject({ status: "reported", responseRate: 1 });
    expect(result.engineInput.capability?.c5?.moduleScore).toBeDefined();
  });

  it("count each person once, and leave members, FTE and managers alone", () => {
    const input = structuredClone(northwind);
    const before = assembleUnit(input);
    input.snapshot.audiences = { leadershipTeam: ["X", "X", "Y"], teamLeaders: [] };
    const after = assembleUnit(input);
    expect(after.instruments["M-O1-LT"]?.responseRate).toBeCloseTo(
      (before.instruments["M-O1-LT"]?.validCount ?? 0) / 2,
      12,
    );
    expect(after.engineInput.engagement.unitFte).toBe(before.engineInput.engagement.unitFte);
    expect(after.instruments["Part A C4"]).toEqual(before.instruments["Part A C4"]);
  });
});
