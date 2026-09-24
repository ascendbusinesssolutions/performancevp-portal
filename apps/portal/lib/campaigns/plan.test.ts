import { describe, expect, it } from "vitest";

import type { SkillRow } from "@/lib/setup/frameworks";
import type { UnitRow } from "@/lib/setup/units";

import { type CampaignToLaunch, type LaunchData, type LaunchPerson, prepareLaunch } from "./plan";

// U1 (12 people) sits under nothing; U2 (10 people) sits under U1 and is led by A1, who sits in U1
// and is flagged leadership team. U1 has two teams, A and B, and its head in neither; U2 has none,
// and no team leader, so A1 takes the learning module. Each unit is its own single, with a complete
// context; everyone is in role family F.

const NOW = new Date("2026-09-25T01:00:00Z");

function unit(id: string, parent: string | null, extra: Partial<UnitRow> = {}): UnitRow {
  return {
    id,
    unit_code: id,
    name: `Unit ${id}`,
    parent_unit_id: parent,
    unit_type: "operations",
    status: "active",
    unit_leader_employee_id: null,
    ...extra,
  };
}

function person(
  id: string,
  unitId: string,
  manager: string | null,
  extra: Partial<LaunchPerson> = {},
): LaunchPerson {
  return {
    id,
    employee_ref: id.toUpperCase(),
    first_name: "Person",
    last_name: id,
    work_email: `${id}@example.test`,
    unit_id: unitId,
    team_id: null,
    role_family_id: "F",
    role_title: "Analyst",
    manager_employee_id: manager,
    start_date: "2020-01-01",
    fte: 1,
    is_team_leader: false,
    is_leadership_team: false,
    ...extra,
  };
}

function named(mu: string, n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${mu}-${prefix}${i}`,
    measurement_unit_id: mu,
    name: `${prefix} ${i}`,
    status: "active",
  }));
}

function data(): LaunchData {
  const people: LaunchPerson[] = [
    person("h", "U1", null, { is_leadership_team: true, role_title: "Chief Executive" }),
    person("a1", "U1", "h", {
      is_leadership_team: true,
      is_team_leader: true,
      team_id: "A",
      role_title: "Operations Lead",
    }),
    person("a2", "U1", "h", { is_leadership_team: true, team_id: "B" }),
    ...Array.from({ length: 5 }, (_, i) => person(`a${i + 3}`, "U1", "a1", { team_id: "A" })),
    ...Array.from({ length: 4 }, (_, i) => person(`b${i}`, "U1", "a2", { team_id: "B" })),
    person("c0", "U2", "a1", { is_leadership_team: true, role_title: "Team Coordinator" }),
    person("c1", "U2", "a1", { is_leadership_team: true }),
    ...Array.from({ length: 8 }, (_, i) => person(`c${i + 2}`, "U2", "c0")),
  ];
  const skills: SkillRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: `s${i}`,
    role_family_id: "F",
    name: `Skill ${i}`,
    is_critical: i === 0,
    kind: i % 2 === 0 ? "technical" : "behavioural",
    status: "active",
  }));
  const units = [unit("U1", null), unit("U2", "U1", { unit_leader_employee_id: "a1" })];
  const context = { domains: [], decisions: [], processes: [], systems: [] } as {
    domains: LaunchData["context"]["domains"][number][];
    decisions: LaunchData["context"]["decisions"][number][];
    processes: LaunchData["context"]["processes"][number][];
    systems: LaunchData["context"]["systems"][number][];
  };
  for (const mu of ["mu-U1", "mu-U2"]) {
    context.domains.push(
      ...named(mu, 3, "Domain").map((d, i) => ({ ...d, criticality: i === 0 ? 3 : 2 })),
    );
    context.decisions.push(...named(mu, 8, "Decision"));
    context.processes.push(...named(mu, 3, "Process"));
    context.systems.push(...named(mu, 3, "System"));
  }
  return {
    today: "2026-09-25",
    units,
    measurementUnits: units.map((u) => ({
      id: `mu-${u.id}`,
      code: u.unit_code,
      name: u.name,
      kind: "single",
      status: "active",
      single_unit_id: u.id,
      unit_leader_employee_id: null,
      grouping_kept_at: null,
    })),
    members: units.map((u) => ({ measurement_unit_id: `mu-${u.id}`, business_unit_id: u.id })),
    people,
    families: [{ id: "F", name: "Analysts", status: "active", is_people_leader: false }],
    teams: [
      { id: "A", unit_id: "U1", name: "Team A", status: "active" },
      { id: "B", unit_id: "U1", name: "Team B", status: "active" },
    ],
    skills,
    context,
    formalRatings: [],
    scaleMap: null,
    stagedUploadId: null,
    releasedFullRuns: [],
    busy: [],
  };
}

function campaign(extra: Partial<CampaignToLaunch> = {}): CampaignToLaunch {
  return {
    id: "camp",
    cadence: "baseline",
    pulse_rotation: null,
    event_trigger: null,
    closes_at: "2026-10-08T06:00:00Z",
    measurementUnitIds: ["mu-U2", "mu-U1"],
    ...extra,
  };
}

describe("the launch plan", () => {
  it("plans each unit's members, teams, audiences and context", () => {
    const prep = prepareLaunch(data(), campaign(), NOW);
    expect(prep.ready).toBe(true);
    expect(prep.plan.units.map((u) => u.measurementUnitId)).toEqual(["mu-U1", "mu-U2"]);

    const [u1, u2] = prep.plan.units;
    expect(u1!.teams).toEqual([
      { key: "A", name: "Team A", teamId: "A", businessUnitId: "U1", kind: "team" },
      { key: "B", name: "Team B", teamId: "B", businessUnitId: "U1", kind: "team" },
      // The head is in no team, in a unit with teams: the residual team (D21).
      { key: "U1", name: "Unit U1", teamId: null, businessUnitId: "U1", kind: "unit" },
    ]);
    expect(u1!.members.find((m) => m.employeeId === "h")?.teamKey).toBe("U1");
    expect(u1!.members).toHaveLength(12);
    expect(u1!.teamLeaders).toEqual(["a1"]);
    expect(u1!.leadershipTeam).toEqual(["a1", "a2", "h"]);

    // U2 has no teams at all, so no team keys; its leader sits above it.
    expect(u2!.teams).toEqual([]);
    expect(u2!.members.every((m) => m.teamKey === null)).toBe(true);
    expect(u2!.leadershipTeam).toEqual(["a1", "c0", "c1"]);
    expect(u2!.teamLeaders).toEqual(["a1"]);
    expect(u2!.positions).toEqual([
      { title: "Analyst" },
      { title: "Operations Lead" },
      { title: "Team Coordinator" },
    ]);
    expect(u2!.context.roleFamilies).toHaveLength(1);
    expect(u2!.context.roleFamilies[0]!.skills).toHaveLength(10);
    expect(u2!.context.processes.map((p) => p.id)).toEqual(
      u2!.audiences.members_part_b?.processIds,
    );
    expect(u2!.c3Route).toBe("module");
    expect(u2!.audiences.managers).toEqual({ items: ["c1", "c2", "c3"] });

    expect(prep.preview.find((p) => p.id === "mu-U2")).toMatchObject({
      members: 10,
      teams: 0,
      teamLeaders: 1,
      teamLeaderFallback: true,
      leadershipTeam: 3,
      managers: 2,
    });
    // Everyone in both units, once each.
    expect(prep.peopleEmailed).toBe(22);
  });

  it("takes talent density from formal ratings where they cover 80% of the unit", () => {
    const d = data();
    d.formalRatings = d.people
      .filter((p) => p.unit_id === "U2")
      .map((p) => ({ employee_id: p.id, rating_label: "Meets", rating_date: "2026-06-30" }));
    d.scaleMap = { decision: "mapped", calibrated: true, entries: [{ label: "Meets", band: 3 }] };
    const u2 = prepareLaunch(d, campaign(), NOW).plan.units[1]!;
    expect(u2.c3Route).toBe("formal");
    expect(u2.audiences.managers).toEqual({ items: ["c1", "c2"] });
  });

  it("refuses a later cadence for a unit with nothing to carry forward (D9)", () => {
    const d = data();
    const prep = prepareLaunch(d, campaign({ cadence: "half_yearly" }), NOW);
    expect(prep.ready).toBe(false);
    expect(prep.blockers.map((b) => b.kind)).toEqual(["needsFullRun", "needsFullRun"]);
    d.releasedFullRuns = ["mu-U1", "mu-U2"];
    expect(prepareLaunch(d, campaign({ cadence: "half_yearly" }), NOW).ready).toBe(true);
  });

  it("refuses a unit another campaign is measuring, a unit no longer measured and a passed window", () => {
    const d = data();
    d.busy = ["mu-U1"];
    d.people = d.people.filter((p) => !["c8", "c9"].includes(p.id));
    const prep = prepareLaunch(d, campaign({ closes_at: "2026-09-24T07:00:00Z" }), NOW);
    expect(prep.blockers).toEqual([
      { kind: "windowPassed" },
      { kind: "busy", unit: { id: "mu-U1", name: "Unit U1" } },
      { kind: "notMeasured", unit: { id: "mu-U2", name: "Unit U2" } },
    ]);
    expect(prepareLaunch(d, campaign({ measurementUnitIds: [] }), NOW).blockers).toContainEqual({
      kind: "noUnits",
    });
  });

  it("refuses on any readiness blocker", () => {
    const d = data();
    d.people = d.people.map((p) => (p.id === "c3" ? { ...p, work_email: null } : p));
    const prep = prepareLaunch(d, campaign(), NOW);
    expect(prep.blockers).toEqual([]);
    expect(prep.readiness.ready).toBe(false);
    expect(prep.ready).toBe(false);
  });
});
