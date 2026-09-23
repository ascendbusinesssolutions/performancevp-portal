import { describe, expect, it } from "vitest";

import type { SkillRow } from "./frameworks";
import type { MeasurementUnitRow, MemberRow } from "./measurement";
import {
  type Check,
  type CheckKey,
  evaluateReadiness,
  type ReadinessInput,
  type ReadinessPerson,
  type UnitRef,
} from "./readiness";
import type { UnitRow } from "./units";

// A clean organisation: a grouping unit TOP (nobody of its own) over U1 (12 people, led by the
// head of the organisation) and U2 (10 people, led by someone who reports to the head). Every unit
// is its own single measurement unit (mu-<unit>). Everyone has an email and the role family F (10
// skills, both kinds, one critical); each measured unit has a complete context. Every test breaks
// one thing, or combines units, and looks at the check it should trip.

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

function single(u: UnitRow, extra: Partial<MeasurementUnitRow> = {}): MeasurementUnitRow {
  return {
    id: `mu-${u.id}`,
    code: u.unit_code,
    name: u.name,
    kind: "single",
    status: "active",
    single_unit_id: u.id,
    unit_leader_employee_id: null,
    grouping_kept_at: null,
    ...extra,
  };
}

/** Every unit its own single, as the database creates them. */
function singles(input: ReadinessInput, units: UnitRow[]): void {
  input.units = units;
  input.measurementUnits = units.map((u) => single(u));
  input.members = units.map((u) => ({ measurement_unit_id: `mu-${u.id}`, business_unit_id: u.id }));
}

/** Combines units as combine_measurement_units does: a combined row, its singles inactive. */
function combine(
  input: ReadinessInput,
  id: string,
  unitIds: string[],
  extra: Partial<MeasurementUnitRow> = {},
): void {
  input.measurementUnits = [
    ...input.measurementUnits.map((mu) =>
      mu.single_unit_id && unitIds.includes(mu.single_unit_id) ? { ...mu, status: "inactive" } : mu,
    ),
    {
      id,
      code: unitIds.join("+"),
      name: id,
      kind: "combined",
      status: "active",
      single_unit_id: null,
      unit_leader_employee_id: null,
      grouping_kept_at: null,
      ...extra,
    },
  ];
  input.members = [
    ...input.members.filter((m) => !unitIds.includes(m.business_unit_id)),
    ...unitIds.map((u): MemberRow => ({ measurement_unit_id: id, business_unit_id: u })),
  ];
}

const named = (unitId: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${unitId}-${n}-${i}`,
    measurement_unit_id: unitId,
    name: `N${i}`,
    status: "active",
  }));
const domains = (unitId: string) =>
  [3, 2, 1].map((c, i) => ({
    id: `${unitId}-d${i}`,
    measurement_unit_id: unitId,
    name: `D${i}`,
    status: "active",
    criticality: c,
  }));

function completeContext(input: ReadinessInput, ids: string[]): void {
  input.context = {
    domains: [...input.context.domains, ...ids.flatMap(domains)],
    decisions: [...input.context.decisions, ...ids.flatMap((id) => named(id, 8))],
    processes: [...input.context.processes, ...ids.flatMap((id) => named(id, 3))],
    systems: [...input.context.systems, ...ids.flatMap((id) => named(id, 3))],
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
  const input: ReadinessInput = {
    today: "2026-09-23",
    units: [],
    measurementUnits: [],
    members: [],
    people,
    families: [{ id: "F", name: "Analysts", status: "active" }],
    skills,
    context: { domains: [], decisions: [], processes: [], systems: [] },
    formalRatings: [],
    scaleMap: null,
    stagedUploadId: null,
  };
  singles(input, [unit("TOP", null), unit("U1", "TOP"), unit("U2", "TOP")]);
  completeContext(input, ["mu-U1", "mu-U2"]);
  return input;
}

function ref(unitId: string): UnitRef {
  return { id: `mu-${unitId}`, name: `Unit ${unitId}`, unitIds: [unitId], combined: false };
}

function check(input: ReadinessInput, key: CheckKey): Check {
  const found = evaluateReadiness(input).checks.find((c) => c.key === key);
  if (!found) throw new Error(`no check ${key}`);
  return found;
}

describe("evaluateReadiness", () => {
  it("passes a complete organisation, measuring the measurement units of 10 or more", () => {
    const result = evaluateReadiness(baseline());
    expect(result.blockers).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.ready).toBe(true);
    expect(result.measured).toEqual([ref("U1"), ref("U2")]);
    expect(check(baseline(), "managers").pass).toEqual({
      key: "managers",
      n: 21,
      head: { id: "h", name: "Person h" },
    });
    // TOP has nobody of its own, so there is nothing to choose: it groups the units below it.
    expect(check(baseline(), "grouping")).toMatchObject({
      level: "passed",
      pass: { key: "grouping", kept: [ref("TOP")] },
    });
    expect(check(baseline(), "formalRatings").level).toBe("skipped");
  });

  it("blocks a unit under 10 with nothing below it, listing what it could combine with (6.2)", () => {
    const input = baseline();
    input.people = input.people.filter((p) => p.id !== "u2m0");
    singles(input, [...input.units, unit("EMPTY", null)]);
    const units = check(input, "units");
    expect(units.level).toBe("blocker");
    expect(units.findings).toEqual([
      { kind: "unitEmpty", unit: ref("EMPTY") },
      {
        kind: "unitShort",
        unit: ref("U2"),
        n: 9,
        candidates: [
          { target: ref("U1"), direction: "beside", via: null, n: 12, total: 21, short: false },
          { target: ref("TOP"), direction: "above", via: null, n: 0, total: 9, short: true },
        ],
      },
    ]);
    expect(evaluateReadiness(input).measured).toEqual([ref("U1")]);
    expect(evaluateReadiness(input).ready).toBe(false);
  });

  it("passes once the unit under 10 is combined with one beside it, and asks for the combination's context", () => {
    const input = baseline();
    input.people = input.people.filter((p) => p.id !== "u2m0");
    combine(input, "U1U2", ["U1", "U2"]);
    const combined = { id: "U1U2", name: "U1U2", unitIds: ["U1", "U2"], combined: true };
    expect(check(input, "units").level).toBe("passed");
    expect(evaluateReadiness(input).measured).toEqual([combined]);
    expect(check(input, "context").findings).toEqual([
      {
        kind: "contextIncomplete",
        unit: combined,
        parts: [
          { part: "domains", n: 0 },
          { part: "decisions", n: 0 },
          { part: "processes", n: 0 },
          { part: "systems", n: 0 },
        ],
      },
    ]);
    completeContext(input, ["U1U2"]);
    expect(evaluateReadiness(input).ready).toBe(true);
  });

  it("blocks a combination still under 10, and one whose units no longer share a branch", () => {
    const input = baseline();
    singles(input, [
      ...input.units,
      unit("S1", "TOP"),
      unit("S2", "TOP"),
      unit("FAR", "U1"),
      unit("NEAR", "U2"),
    ]);
    input.people = [
      ...input.people,
      person("s1a", "S1", "h"),
      person("s1b", "S1", "h"),
      person("s2a", "S2", "h"),
      ...Array.from({ length: 5 }, (_, i) => person(`far${i}`, "FAR", "h")),
      ...Array.from({ length: 5 }, (_, i) => person(`near${i}`, "NEAR", "h")),
    ];
    combine(input, "SS", ["S1", "S2"]);
    // FAR and NEAR shared a parent when combined; FAR has since moved under U1.
    combine(input, "FN", ["FAR", "NEAR"]);
    const findings = check(input, "units").findings;
    expect(findings).toContainEqual({
      kind: "branchBroken",
      unit: { id: "FN", name: "FN", unitIds: ["FAR", "NEAR"], combined: true },
      holds: [
        { id: "FAR", name: "Unit FAR" },
        { id: "NEAR", name: "Unit NEAR" },
      ],
    });
    const short = findings.find((f) => f.kind === "combinationShort");
    expect(short).toMatchObject({
      unit: { id: "SS" },
      n: 3,
      holds: [
        { id: "S1", name: "Unit S1" },
        { id: "S2", name: "Unit S2" },
      ],
    });
    // A combination is offered the singles beside and above it, never another combination.
    expect(
      short?.kind === "combinationShort" && short.candidates.map((c) => [c.target.id, c.total]),
    ).toEqual([
      ["mu-U1", 15],
      ["mu-U2", 13],
      ["mu-TOP", 3],
    ]);
  });

  it("warns about a unit under 10 with units below it until it is combined downward or kept as a grouping unit", () => {
    const input = baseline();
    // The head moves up into TOP with two executives: 3 of its own, and units below it.
    input.people = [
      ...input.people.map((p) => (p.id === "h" ? { ...p, unit_id: "TOP" } : p)),
      person("e1", "TOP", "h", { role_family_id: null }),
      person("e2", "TOP", "h", { role_family_id: "EXEC" }),
    ];
    input.families = [...input.families, { id: "EXEC", name: "Executives", status: "active" }];
    input.units = input.units.map((u) =>
      u.id === "U1" ? { ...u, unit_leader_employee_id: "a1" } : u,
    );
    const grouping = check(input, "grouping");
    expect(grouping.level).toBe("warning");
    expect(grouping.findings).toEqual([
      {
        kind: "groupingUndecided",
        unit: ref("TOP"),
        n: 3,
        candidates: [
          { target: ref("U1"), direction: "below", via: null, n: 11, total: 14, short: false },
          { target: ref("U2"), direction: "below", via: null, n: 10, total: 13, short: false },
        ],
      },
    ]);
    const result = evaluateReadiness(input);
    expect(result.blockers).toBe(0);
    expect(result.ready).toBe(true);
    // Its people are not surveyed or rated, so their role families are not asked for.
    expect(check(input, "roleFamilies").findings).toEqual([]);

    input.measurementUnits = input.measurementUnits.map((mu) =>
      mu.id === "mu-TOP" ? { ...mu, grouping_kept_at: "2026-09-23T10:00:00Z" } : mu,
    );
    expect(check(input, "grouping")).toMatchObject({
      level: "passed",
      findings: [],
      pass: { key: "grouping", kept: [ref("TOP")] },
    });
    // Still the head of the organisation, and still the manager of the people below.
    expect(check(input, "managers").pass).toEqual({
      key: "managers",
      n: 23,
      head: { id: "h", name: "Person h" },
    });
  });

  it("combining downward measures the grouping unit's people with the unit below", () => {
    const input = baseline();
    input.people = input.people.map((p) => (p.id === "h" ? { ...p, unit_id: "TOP" } : p));
    input.units = input.units.map((u) =>
      u.id === "U1" ? { ...u, unit_leader_employee_id: "a1" } : u,
    );
    combine(input, "TOPU1", ["TOP", "U1"]);
    completeContext(input, ["TOPU1"]);
    expect(check(input, "grouping").findings).toEqual([]);
    expect(evaluateReadiness(input).measured.map((u) => u.id)).toEqual(["TOPU1", "mu-U2"]);
    expect(evaluateReadiness(input).ready).toBe(true);
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
      { kind: "noRoleFamily", unit: ref("U1"), n: 1 },
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
      processes: input.context.processes.filter(
        (r) => r.measurement_unit_id !== "mu-U2" || r.id.endsWith("-0"),
      ),
      domains: input.context.domains.map((d) =>
        d.measurement_unit_id === "mu-U1" ? { ...d, criticality: 2 } : d,
      ),
    };
    expect(check(input, "context").findings).toEqual([
      {
        kind: "contextIncomplete",
        unit: ref("U2"),
        parts: [{ part: "processes", n: 1 }],
      },
    ]);
    const critical = check(input, "criticalDomain");
    expect(critical.level).toBe("warning");
    expect(critical.findings).toEqual([{ kind: "noCriticalDomain", unit: ref("U1") }]);
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
      { kind: "leadershipTeam", unit: ref("U2"), n: 1 },
    ]);
    expect(check(input, "teamLeaders").findings).toEqual([
      { kind: "noTeamLeaders", unit: ref("U2") },
    ]);
    // b0 and b1 both report outside U2 now: two candidates, no designation.
    expect(check(input, "unitLeader").findings).toEqual([
      { kind: "noUnitLeader", unit: ref("U2"), candidates: 2 },
    ]);
    input.units = input.units.map((u) =>
      u.id === "U2" ? { ...u, unit_leader_employee_id: "b0" } : u,
    );
    expect(check(input, "unitLeader").level).toBe("passed");
  });

  it("warns where the unit leader is not flagged as leadership team (6.1)", () => {
    const input = baseline();
    input.units = input.units.map((u) =>
      u.id === "U2" ? { ...u, unit_leader_employee_id: "u2m3" } : u,
    );
    expect(check(input, "unitLeader").findings).toEqual([
      { kind: "leaderNotFlagged", unit: ref("U2"), leader: { id: "u2m3", name: "Person u2m3" } },
    ]);
  });

  it("counts a flagged leader from the unit above toward the leadership team (E9)", () => {
    const input = baseline();
    input.people = [
      ...input.people.map((p) =>
        p.unit_id === "U2" ? { ...p, is_leadership_team: p.id === "b0" || p.id === "b1" } : p,
      ),
      person("exec", "TOP", "h", { is_leadership_team: true }),
    ];
    input.units = input.units.map((u) =>
      u.id === "U2" ? { ...u, unit_leader_employee_id: "exec" } : u,
    );
    expect(check(input, "leadershipTeam").findings).toEqual([]);
    expect(check(input, "unitLeader").findings).toEqual([]);
  });

  it("takes the leader of a combination that rolls up from its top unit, and asks siblings to choose", () => {
    const input = baseline();
    singles(input, [...input.units, unit("P", "U2"), unit("S", "U2")]);
    input.people = [
      ...input.people,
      ...Array.from({ length: 6 }, (_, i) => person(`p${i}`, "P", i === 0 ? "b0" : "p0")),
      ...Array.from({ length: 5 }, (_, i) => person(`s${i}`, "S", i === 0 ? "b0" : "s0")),
    ];
    input.units = input.units.map((u) =>
      u.id === "U2" ? { ...u, unit_leader_employee_id: "b0" } : u,
    );
    combine(input, "U2P", ["U2", "P"]);
    completeContext(input, ["U2P"]);
    // U2 with P below it rolls up to U2, whose leader is designated: nothing to choose.
    expect(check(input, "unitLeader").findings).toEqual([]);

    const siblings = baseline();
    singles(siblings, [...siblings.units, unit("P", "U2"), unit("S", "U2")]);
    siblings.people = [...input.people];
    combine(siblings, "PS", ["P", "S"]);
    completeContext(siblings, ["PS"]);
    const combined = { id: "PS", name: "PS", unitIds: ["P", "S"], combined: true };
    expect(check(siblings, "unitLeader").findings).toContainEqual({
      kind: "noUnitLeader",
      unit: combined,
      candidates: 2,
    });
    siblings.measurementUnits = siblings.measurementUnits.map((mu) =>
      mu.id === "PS" ? { ...mu, unit_leader_employee_id: "b0" } : mu,
    );
    expect(check(siblings, "unitLeader").findings).toEqual([]);
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
    expect(mapped.pass).toEqual({ key: "formalRatings", current: 12, below: [ref("U2")] });

    // Combined, U1's ratings cover 12 of 22: below 80%, so managers rate the combination.
    combine(input, "U1U2", ["U1", "U2"]);
    completeContext(input, ["U1U2"]);
    expect(check(input, "formalRatings").pass).toEqual({
      key: "formalRatings",
      current: 12,
      below: [{ id: "U1U2", name: "U1U2", unitIds: ["U1", "U2"], combined: true }],
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

  it("holds the checks of measured units until a unit has 10 or more, rather than pass them", () => {
    const input = baseline();
    input.people = input.people.filter((p) => !p.id.startsWith("u1m") && !p.id.startsWith("u2m"));
    const result = evaluateReadiness(input);
    expect(result.measured).toEqual([]);
    expect(
      result.checks
        .filter((c) => c.pass.key === "waiting")
        .map((c) => [c.key, c.level])
        .sort(),
    ).toEqual([
      ["context", "skipped"],
      ["criticalDomain", "skipped"],
      ["leadershipTeam", "skipped"],
      ["roleFamilies", "skipped"],
      ["teamLeaders", "skipped"],
      ["unitLeader", "skipped"],
    ]);
    expect(check(input, "units").level).toBe("blocker");
  });
});
