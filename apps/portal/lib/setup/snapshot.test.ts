import { evaluateFormalRatings } from "@performancevp/intake";
import { describe, expect, it } from "vitest";

import { type SnapshotPerson, unitSnapshot } from "./snapshot";

function person(id: string, unit: string, extra: Partial<SnapshotPerson> = {}): SnapshotPerson {
  return {
    id,
    employee_ref: id.toUpperCase(),
    unit_id: unit,
    team_id: null,
    role_family_id: null,
    manager_employee_id: null,
    start_date: null,
    fte: 1,
    is_team_leader: false,
    is_leadership_team: false,
    ...extra,
  };
}

describe("unitSnapshot", () => {
  const people = [
    person("head", "r"),
    person("lead", "u", { manager_employee_id: "head", is_leadership_team: true, team_id: "t1" }),
    person("m1", "u", { manager_employee_id: "lead", fte: 0.6, start_date: "2020-01-01" }),
  ];

  it("holds the unit's members in the intake's shape, managers by employee ID", () => {
    expect(
      unitSnapshot("u", people, [
        { employee_id: "m1", rating_label: "Meets", rating_date: "2026-03-31" },
      ]),
    ).toEqual({
      members: [
        { employeeRef: "LEAD", fte: 1, teamId: "t1", leadershipTeam: true, managerRef: "HEAD" },
        {
          employeeRef: "M1",
          fte: 0.6,
          startDate: "2020-01-01",
          managerRef: "LEAD",
          formalRating: { label: "Meets", date: "2026-03-31" },
        },
      ],
    });
  });

  it("feeds the intake's formal-ratings rule directly", () => {
    const snapshot = unitSnapshot("u", people, [
      { employee_id: "lead", rating_label: "Exceeds", rating_date: "2026-03-31" },
      { employee_id: "m1", rating_label: "Meets", rating_date: "2026-03-31" },
    ]);
    const result = evaluateFormalRatings(
      {
        scaleMap: [
          { label: "Exceeds", band: 4 },
          { label: "Meets", band: 3 },
        ],
        calibrated: true,
      },
      snapshot,
      "2026-09-23",
    );
    expect(result?.coverage).toBe(1);
    expect(result?.qualifies).toBe(true);
  });
});
