import { describe, expect, it } from "vitest";

import type { SkillRow } from "./frameworks";
import {
  type Check,
  type CheckKey,
  evaluateReadiness,
  type ReadinessInput,
  type ReadinessPerson,
} from "./readiness";
import type { UnitRow } from "./units";

// A clean organisation: a grouping unit TOP over U1 (12 people, led by the head of the organisation)
// and U2 (10 people, led by someone who reports to the head). Everyone has an email and the role
// family F (10 skills, both kinds, one critical); each unit has a complete context. Every test
// breaks one thing and looks at the check it should trip.

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
  extra: Partial<ReadinessPerson> = {},
): ReadinessPerson {
  return {
    id,
    employee_ref: id.toUpperCase(),
    first_name: "Person",
    last_name: id,
    work_email: `${id}@example.test`,
    unit_id: unitId,
    team_id: null,
    role_family_id: "F",
    manager_employee_id: manager,
    start_date: "2020-01-01",
    fte: 1,
    is_team_leader: false,
    is_leadership_team: false,
    ...extra,
  };
}

function baseline(): ReadinessInput {
  const people: ReadinessPerson[] = [
    person("h", "U1", null, { is_leadership_team: true }),
    person("a1", "U1", "h", { is_leadership_team: true, is_team_leader: true }),
    person("a2", "U1", "h", { is_leadership_team: true }),
    ...Array.from({ length: 9 }, (_, i) => person(`u1m${i}`, "U1", "a1")),
    person("b0", "U2", "h", { is_leadership_team: true }),
    person("b1", "U2", "b0", { is_leadership_team: true, is_team_leader: true }),
    person("b2", "U2", "b0", { is_leadership_team: true }),
    ...Array.from({ length: 7 }, (_, i) => person(`u2m${i}`, "U2", "b1")),
  ];
  const skills: SkillRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: `s${i}`,
    role_family_id: "F",
    name: `Skill ${i}`,
    is_critical: i === 0,
    kind: i % 2 === 0 ? "technical" : "behavioural",
    status: "active",
  }));
  const named = (unitId: string, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${unitId}-${n}-${i}`,
      unit_id: unitId,
      name: `N${i}`,
      status: "active",
    }));
  const domains = (unitId: string) =>
    [3, 2, 1].map((c, i) => ({
      id: `${unitId}-d${i}`,
      unit_id: unitId,
      name: `D${i}`,
      status: "active",
      criticality: c,
    }));
  return {
    today: "2026-09-23",
    units: [unit("TOP", null), unit("U1", "TOP"), unit("U2", "TOP")],
    people,
    families: [{ id: "F", name: "Analysts", status: "active" }],
    skills,
    context: {
      domains: [...domains("U1"), ...domains("U2")],
      decisions: [...named("U1", 8), ...named("U2", 8)],
      processes: [...named("U1", 3), ...named("U2", 3)],
      systems: [...named("U1", 3), ...named("U2", 3)],
    },
    formalRatings: [],
    scaleMap: null,
    stagedUploadId: null,
  };
}

function check(input: ReadinessInput, key: CheckKey): Check {
  const found = evaluateReadiness(input).checks.find((c) => c.key === key);
  if (!found) throw new Error(`no check ${key}`);
  return found;
}

describe("evaluateReadiness", () => {
  it("passes a complete organisation, with the grouping unit left out of measurement", () => {
    const result = evaluateReadiness(baseline());
    expect(result.blockers).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.ready).toBe(true);
    expect(result.measured.map((u) => u.id)).toEqual(["U1", "U2"]);
    expect(check(baseline(), "managers").pass).toEqual({
      key: "managers",
      n: 21,
      head: { id: "h", name: "Person h" },
    });
    expect(check(baseline(), "formalRatings").level).toBe("skipped");
  });

  it("blocks a unit below 10 and an empty unit with nothing below it (D1)", () => {
    const input = baseline();
    input.people = input.people.filter((p) => p.id !== "u2m0");
    input.units = [...input.units, unit("EMPTY", null)];
    const units = check(input, "units");
    expect(units.level).toBe("blocker");
    expect(units.findings).toEqual([
      { kind: "unitSize", unit: { id: "EMPTY", name: "Unit EMPTY" }, n: 0 },
      { kind: "unitSize", unit: { id: "U2", name: "Unit U2" }, n: 9 },
    ]);
    expect(evaluateReadiness(input).ready).toBe(false);
  });

  it("allows one head of the organisation without a manager, and no one else (D2)", () => {
    const input = baseline();
    input.people = input.people.map((p) =>
      p.id === "b0" ? { ...p, manager_employee_id: null } : p,
    );
    const managers = check(input, "managers");
    expect(managers.level).toBe("blocker");
    expect(managers.findings).toEqual([
      {
        kind: "noManager",
        people: [
          { id: "b0", name: "Person b0" },
          { id: "h", name: "Person h" },
        ],
      },
    ]);
  });

  it("blocks a reporting line to someone who has left", () => {
    const input = baseline();
    input.people = input.people.map((p) =>
      p.id === "u2m1" ? { ...p, manager_employee_id: "gone" } : p,
    );
    expect(check(input, "managers").findings).toEqual([
      { kind: "managerLeft", people: [{ id: "u2m1", name: "Person u2m1" }] },
    ]);
  });

  it("blocks a missing work email", () => {
    const input = baseline();
    input.people = input.people.map((p) => (p.id === "a2" ? { ...p, work_email: null } : p));
    expect(check(input, "workEmails").findings).toEqual([
      { kind: "noEmail", people: [{ id: "a2", name: "Person a2" }] },
    ]);
  });

  it("blocks people without a role family and a family short of skills (D3)", () => {
    const input = baseline();
    input.people = input.people.map((p) => (p.id === "u1m0" ? { ...p, role_family_id: null } : p));
    input.skills = input.skills.slice(0, 5);
    const families = check(input, "roleFamilies");
    expect(families.level).toBe("blocker");
    expect(families.findings).toEqual([
      { kind: "noRoleFamily", unit: { id: "U1", name: "Unit U1" }, n: 1 },
      {
        kind: "familyIncomplete",
        family: { id: "F", name: "Analysts" },
        problems: [{ kind: "tooFew", n: 5, min: 8 }],
      },
    ]);
  });

  it("blocks incomplete context and warns when no domain is critical (D3)", () => {
    const input = baseline();
    input.context = {
      ...input.context,
      processes: input.context.processes.filter((r) => r.unit_id !== "U2" || r.id.endsWith("-0")),
      domains: input.context.domains.map((d) =>
        d.unit_id === "U1" ? { ...d, criticality: 2 } : d,
      ),
    };
    expect(check(input, "context").findings).toEqual([
      {
        kind: "contextIncomplete",
        unit: { id: "U2", name: "Unit U2" },
        parts: [{ part: "processes", n: 1 }],
      },
    ]);
    const critical = check(input, "criticalDomain");
    expect(critical.level).toBe("warning");
    expect(critical.findings).toEqual([
      { kind: "noCriticalDomain", unit: { id: "U1", name: "Unit U1" } },
    ]);
  });

  it("warns, without blocking, on the leadership team, team leaders and the unit leader", () => {
    const input = baseline();
    input.people = input.people.map((p) =>
      p.unit_id === "U2"
        ? {
            ...p,
            is_leadership_team: p.id === "b0",
            is_team_leader: false,
            manager_employee_id: p.id === "b1" ? "h" : p.manager_employee_id,
          }
        : p,
    );
    const result = evaluateReadiness(input);
    expect(result.ready).toBe(true);
    expect(check(input, "leadershipTeam").findings).toEqual([
      { kind: "leadershipTeam", unit: { id: "U2", name: "Unit U2" }, n: 1 },
    ]);
    expect(check(input, "teamLeaders").findings).toEqual([
      { kind: "noTeamLeaders", unit: { id: "U2", name: "Unit U2" } },
    ]);
    // b0 and b1 both report outside U2 now: two candidates, no designation.
    expect(check(input, "unitLeader").findings).toEqual([
      { kind: "noUnitLeader", unit: { id: "U2", name: "Unit U2" }, candidates: 2 },
    ]);
    input.units = input.units.map((u) =>
      u.id === "U2" ? { ...u, unit_leader_employee_id: "b0" } : u,
    );
    expect(check(input, "unitLeader").level).toBe("passed");
  });

  it("handles formal ratings: undecided blocks, unmapped labels block, a full mapping previews the route (D4)", () => {
    const input = baseline();
    input.formalRatings = input.people
      .filter((p) => p.unit_id === "U1")
      .map((p, i) => ({
        employee_id: p.id,
        rating_label: i === 0 ? "Top" : "Solid",
        rating_date: "2026-03-31",
      }));
    expect(check(input, "formalRatings").findings).toEqual([{ kind: "ratingsUndecided" }]);

    input.scaleMap = {
      decision: "mapped",
      calibrated: true,
      entries: [{ label: "Solid", band: 3 }],
    };
    expect(check(input, "formalRatings").findings).toEqual([
      { kind: "labelsUnmapped", labels: ["Top"] },
    ]);

    input.scaleMap = {
      decision: "mapped",
      calibrated: true,
      entries: [
        { label: "Solid", band: 3 },
        { label: "Top", band: 5 },
      ],
    };
    const mapped = check(input, "formalRatings");
    expect(mapped.level).toBe("passed");
    expect(mapped.pass).toEqual({
      key: "formalRatings",
      current: 12,
      below: [{ id: "U2", name: "Unit U2" }],
    });

    input.scaleMap = { decision: "skipped", calibrated: null, entries: [] };
    expect(check(input, "formalRatings").level).toBe("skipped");
  });

  it("warns about an upload awaiting review without blocking (D11)", () => {
    const input = baseline();
    input.stagedUploadId = "upload-1";
    const result = evaluateReadiness(input);
    expect(result.ready).toBe(true);
    expect(check(input, "uploadAwaiting").findings).toEqual([
      { kind: "uploadAwaiting", uploadId: "upload-1" },
    ]);
  });

  it("blocks an organisation with no one in it", () => {
    const input = baseline();
    input.people = [];
    expect(evaluateReadiness(input).ready).toBe(false);
  });
});
