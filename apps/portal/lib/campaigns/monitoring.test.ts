import { describe, expect, it } from "vitest";

import { type MonitoringData, monitoringModel } from "./monitoring";

const data: MonitoringData = {
  units: [
    {
      campaignUnitId: "cu",
      measurementUnitId: "mu",
      headcount: 12,
      c3Route: "module",
      audiences: [
        { audience: "members_part_a", size: 12, issued: 12, received: 5, items: [] },
        { audience: "members_part_b", size: 12, issued: 12, received: 9, items: [] },
        { audience: "team_leaders", size: 1, issued: 1, received: 1, items: [] },
        { audience: "leadership_team", size: 2, issued: 2, received: 2, items: [] },
        { audience: "managers", size: 2, issued: 0, received: 0, items: ["c1", "c2", "c3"] },
        {
          audience: "admin_checklists",
          size: 0,
          issued: 0,
          received: 0,
          items: ["ADM-O1", "ADM-O4"],
        },
      ],
      checklists: [{ code: "ADM-O4", versions: 1, latestAt: "2026-09-20T00:00:00Z" }],
    },
  ],
  sessions: [
    {
      sessionId: "s1",
      firstName: "Liam",
      lastName: "North",
      reports: [
        {
          subjectSnapshotMemberId: "r1",
          campaignUnitId: "cu",
          roleFamilyId: "F",
          skills: 2,
          domains: 1,
          band: true,
        },
        {
          subjectSnapshotMemberId: "r2",
          campaignUnitId: "cu",
          roleFamilyId: "F",
          skills: 1,
          domains: 1,
          band: true,
        },
      ],
    },
    {
      sessionId: "s2",
      firstName: "Kara",
      lastName: "Head",
      reports: [
        {
          subjectSnapshotMemberId: "r3",
          campaignUnitId: "cu",
          roleFamilyId: "F",
          skills: 2,
          domains: 1,
          band: true,
        },
      ],
    },
  ],
};

describe("the monitoring model", () => {
  const model = monitoringModel({
    cadence: "baseline",
    data,
    names: new Map([["cu", "Dispatch"]]),
    contexts: new Map([["cu", { skills: new Map([["F", 2]]), domains: 1 }]]),
    flaggedTeamLeaders: new Set(),
  });
  const row = model.rows[0]!;

  it("sets what has been received against what the close needs", () => {
    expect(row.cells.members_part_a).toMatchObject({
      received: 5,
      size: 12,
      needed: 8,
      below: true,
      more: 3,
      rate: 0.6,
    });
    expect(row.cells.members_part_b).toMatchObject({ below: false, more: 0 });
  });

  it("notes a leadership team under 3 and team leaders the unit leader stands in for", () => {
    expect(row.cells.leadership_team.note).toBe("leadershipMinimum");
    expect(row.cells.team_leaders.note).toBe("fallback");
  });

  it("counts a manager complete when every report in the unit is fully rated", () => {
    expect(row.cells.managers).toMatchObject({ received: 1, size: 2, needed: 2, below: true });
    expect(model.managers).toEqual([
      { sessionId: "s1", name: "Liam North", units: ["Dispatch"], reports: 2, rated: 1 },
    ]);
  });

  it("names the checklists still open", () => {
    expect(row.checklists).toEqual({ asked: true, open: ["ADM-O1"] });
    expect(model.people).toBe(12);
  });
});
