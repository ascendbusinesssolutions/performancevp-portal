import { constants, evaluateFormalRatings } from "@performancevp/intake";

import {
  contextCounts,
  type ContextPart,
  familyProblems,
  type FamilyProblem,
  incompleteParts,
  lacksCriticalDomain,
  type SkillRow,
} from "./frameworks";
import {
  branchOk,
  type Candidate,
  candidates,
  type Direction,
  isGroupingState,
  measurementLeader,
  measurementModel,
  type MeasurementUnitRow,
  type MeasurementView,
  type MemberRow,
} from "./measurement";
import type { FormalRatingRow, SnapshotPerson } from "./snapshot";
import { measurementSnapshot, teamKeys } from "./snapshot";
import type { UnitRow } from "./units";

/**
 * The readiness check (PORTAL_BUILD_PLAN.md 7; PORTAL_COPY_SPEC.md S2; Milestone 4 plan, Section 7,
 * decisions D1 to D11 and the unit leader; Milestone 4b plan, Section 3). Pure: it takes the live
 * directory, the measurement units and the context, and returns each check's level and findings,
 * with no copy; the page words them. It judges measurement units, never org units (Online
 * Measurement Specification 6.2): a unit under 10 lists the units it could combine with and blocks
 * until the administrator chooses. The setup counts and the formal-ratings rule are the intake
 * package's own, run over the intake's own snapshot shape, so the check says what the campaign
 * close will find. Milestone 5's launch reruns it on the server.
 */

const LEADERSHIP_MIN = constants.THRESHOLDS.leadershipMinimumRespondents;
const TEAM_MIN = constants.THRESHOLDS.teamMinimumValid;

export interface ReadinessPerson extends SnapshotPerson {
  first_name: string;
  last_name: string;
  work_email: string | null;
}

export interface Ref {
  id: string;
  name: string;
}

/** A measurement unit in a finding, with the org units it holds (for links to where it is fixed). */
export interface UnitRef extends Ref {
  unitIds: string[];
  combined: boolean;
}

export interface CandidateRef {
  target: UnitRef;
  direction: Direction;
  /** For a candidate above a grouping parent, the grouping unit passed over. */
  via: Ref | null;
  n: number;
  total: number;
  short: boolean;
}

export interface ReadinessInput {
  today: string;
  units: readonly UnitRow[];
  measurementUnits: readonly MeasurementUnitRow[];
  /** Current memberships. */
  members: readonly MemberRow[];
  /** Active people only. */
  people: readonly ReadinessPerson[];
  families: ReadonlyArray<{ id: string; name: string; status: string }>;
  /** The teams people belong to, for the team-size warning. */
  teams: ReadonlyArray<{ id: string; name: string }>;
  skills: readonly SkillRow[];
  context: Parameters<typeof contextCounts>[1];
  formalRatings: readonly FormalRatingRow[];
  scaleMap: {
    decision: "mapped" | "skipped";
    calibrated: boolean | null;
    entries: ReadonlyArray<{ label: string; band: 1 | 2 | 3 | 4 | 5 }>;
  } | null;
  stagedUploadId: string | null;
}

export type Finding =
  | { kind: "unitShort"; unit: UnitRef; n: number; candidates: CandidateRef[] }
  | { kind: "unitEmpty"; unit: UnitRef }
  | { kind: "combinationShort"; unit: UnitRef; n: number; holds: Ref[]; candidates: CandidateRef[] }
  | { kind: "branchBroken"; unit: UnitRef; holds: Ref[] }
  | { kind: "groupingUndecided"; unit: UnitRef; n: number; candidates: CandidateRef[] }
  | { kind: "noManager"; people: Ref[] }
  | { kind: "managerLeft"; people: Ref[] }
  | { kind: "noEmail"; people: Ref[] }
  | { kind: "noRoleFamily"; unit: UnitRef; n: number }
  | { kind: "familyIncomplete"; family: Ref; problems: FamilyProblem[] }
  | { kind: "contextIncomplete"; unit: UnitRef; parts: Array<{ part: ContextPart; n: number }> }
  | { kind: "noCriticalDomain"; unit: UnitRef }
  | { kind: "leadershipTeam"; unit: UnitRef; n: number }
  | { kind: "noTeamLeaders"; unit: UnitRef }
  | { kind: "smallTeams"; unit: UnitRef; teams: Array<{ name: string; n: number }> }
  | { kind: "noUnitLeader"; unit: UnitRef; candidates: number }
  | { kind: "leaderNotFlagged"; unit: UnitRef; leader: Ref }
  | { kind: "ratingsUndecided" }
  | { kind: "labelsUnmapped"; labels: string[] }
  | { kind: "uploadAwaiting"; uploadId: string };

export type CheckKey =
  | "units"
  | "grouping"
  | "unitForEveryone"
  | "managers"
  | "workEmails"
  | "roleFamilies"
  | "context"
  | "criticalDomain"
  | "leadershipTeam"
  | "teamLeaders"
  | "teamSize"
  | "unitLeader"
  | "formalRatings"
  | "uploadAwaiting";

export type Level = "passed" | "warning" | "blocker" | "skipped";

export type PassDetail =
  | { key: "units"; n: number }
  | { key: "grouping"; kept: UnitRef[] }
  | { key: "unitForEveryone"; n: number }
  | { key: "managers"; n: number; head: Ref | null }
  | { key: "workEmails"; n: number }
  | { key: "roleFamilies"; units: number; families: number; min: number; max: number }
  | { key: "context"; units: number }
  | { key: "formalRatings"; current: number; below: UnitRef[] }
  /** A check of measured units, with none measured yet. */
  | { key: "waiting" }
  | { key: "none" };

export interface Check {
  key: CheckKey;
  level: Level;
  findings: Finding[];
  pass: PassDetail;
}

export interface Readiness {
  checks: Check[];
  blockers: number;
  warnings: number;
  passed: number;
  /** Every check passed, was skipped or only warns: a first campaign may launch. */
  ready: boolean;
  /** The measurement units a campaign would measure: those of 10 or more. */
  measured: UnitRef[];
}

const NONE: PassDetail = { key: "none" };

function nameOf(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`;
}

function byName<T extends Ref>(list: T[]): T[] {
  return list.sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
}

export function unitRef(view: MeasurementView): UnitRef {
  return {
    id: view.row.id,
    name: view.row.name,
    unitIds: view.units.map((u) => u.id),
    combined: view.combined,
  };
}

/** A candidate in a finding, and on the units screen. */
export function candidateRef(candidate: Candidate): CandidateRef {
  return {
    target: unitRef(candidate.view),
    direction: candidate.direction,
    via: candidate.via ? { id: candidate.via.id, name: candidate.via.name } : null,
    n: candidate.view.staff,
    total: candidate.total,
    short: candidate.short,
  };
}

export function evaluateReadiness(input: ReadinessInput): Readiness {
  const model = measurementModel({
    units: input.units,
    measurementUnits: input.measurementUnits,
    members: input.members,
    people: input.people,
  });
  const staffIn = (view: MeasurementView) => {
    const inside = new Set(view.units.map((u) => u.id));
    return input.people.filter((p) => inside.has(p.unit_id));
  };
  const candidateRefs = (view: MeasurementView, only?: readonly Direction[]): CandidateRef[] =>
    candidates(model, view, only).map(candidateRef);
  const holds = (view: MeasurementView): Ref[] =>
    view.units.map((u) => ({ id: u.id, name: u.name }));
  const measured = model.views.filter((v) => v.state === "measured");
  const checks: Check[] = [];

  // Units of 10 or more (Online Measurement Specification 6.2): a measurement unit's own staff
  // count. Nothing under 10 is measured. A unit under 10 with nothing below it blocks until it is
  // combined, grown or retired; a combination still under 10, or whose units no longer share a
  // branch, blocks too.
  {
    const findings: Finding[] = [];
    for (const view of model.views) {
      if (view.combined && !branchOk(model, view)) {
        findings.push({ kind: "branchBroken", unit: unitRef(view), holds: holds(view) });
      } else if (view.combined && view.state === "short") {
        findings.push({
          kind: "combinationShort",
          unit: unitRef(view),
          n: view.staff,
          holds: holds(view),
          candidates: candidateRefs(view),
        });
      } else if (view.state === "short") {
        findings.push({
          kind: "unitShort",
          unit: unitRef(view),
          n: view.staff,
          candidates: candidateRefs(view),
        });
      } else if (view.state === "empty") {
        findings.push({ kind: "unitEmpty", unit: unitRef(view) });
      }
    }
    checks.push({
      key: "units",
      level: findings.length > 0 || measured.length === 0 ? "blocker" : "passed",
      findings,
      pass: { key: "units", n: measured.length },
    });
  }

  // Grouping units: a unit under 10 with units below it is combined downward or kept as a grouping
  // unit, and nothing is chosen for the administrator. Undecided, it warns; it never blocks.
  {
    // A grouping unit with nobody of its own has nothing to measure, so there is no choice to make.
    const undecided = (v: MeasurementView) => v.state === "grouping" && v.staff > 0;
    const findings: Finding[] = model.views.filter(undecided).map((v) => ({
      kind: "groupingUndecided",
      unit: unitRef(v),
      n: v.staff,
      candidates: candidateRefs(v, ["below"]),
    }));
    checks.push({
      key: "grouping",
      level: findings.length > 0 ? "warning" : "passed",
      findings,
      pass: {
        key: "grouping",
        kept: model.views.filter((v) => isGroupingState(v.state) && !undecided(v)).map(unitRef),
      },
    });
  }

  // Unit for everyone (D8): guaranteed by the schema; shown for reassurance.
  checks.push({
    key: "unitForEveryone",
    level: "passed",
    findings: [],
    pass: { key: "unitForEveryone", n: input.people.length },
  });

  // Manager for everyone (D2): one head of the organisation may have no manager; nobody may report
  // to someone who has left.
  {
    const activeIds = new Set(input.people.map((p) => p.id));
    const noManager = input.people.filter((p) => !p.manager_employee_id);
    const left = input.people.filter(
      (p) => p.manager_employee_id && !activeIds.has(p.manager_employee_id),
    );
    const findings: Finding[] = [];
    if (noManager.length > 1) {
      findings.push({
        kind: "noManager",
        people: byName(noManager.map((p) => ({ id: p.id, name: nameOf(p) }))),
      });
    }
    if (left.length > 0) {
      findings.push({
        kind: "managerLeft",
        people: byName(left.map((p) => ({ id: p.id, name: nameOf(p) }))),
      });
    }
    const head = noManager.length === 1 ? noManager[0]! : null;
    checks.push({
      key: "managers",
      level: findings.length > 0 ? "blocker" : "passed",
      findings,
      pass: {
        key: "managers",
        n: input.people.length - (head ? 1 : 0),
        head: head ? { id: head.id, name: nameOf(head) } : null,
      },
    });
  }

  // Work emails: invitations and the manager's sign-in need one.
  {
    const missing = input.people.filter((p) => !p.work_email);
    checks.push({
      key: "workEmails",
      level: missing.length > 0 ? "blocker" : "passed",
      findings:
        missing.length > 0
          ? [
              {
                kind: "noEmail",
                people: byName(missing.map((p) => ({ id: p.id, name: nameOf(p) }))),
              },
            ]
          : [],
      pass: { key: "workEmails", n: input.people.length },
    });
  }

  // Role families and skills (D3): everyone in a measured unit has a role family, and every family
  // in use there has 8 to 15 skills of both kinds with at least one critical.
  {
    const findings: Finding[] = [];
    const members = measured.flatMap(staffIn);
    for (const view of measured) {
      const n = staffIn(view).filter((p) => !p.role_family_id).length;
      if (n > 0) findings.push({ kind: "noRoleFamily", unit: unitRef(view), n });
    }
    const inUse = new Set(members.map((p) => p.role_family_id).filter(Boolean) as string[]);
    const families = input.families
      .filter((f) => inUse.has(f.id))
      .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
    for (const f of families) {
      const problems = familyProblems(f.id, input.skills);
      if (problems.length > 0) {
        findings.push({ kind: "familyIncomplete", family: { id: f.id, name: f.name }, problems });
      }
    }
    const sizes = families.map(
      (f) => input.skills.filter((s) => s.role_family_id === f.id && s.status === "active").length,
    );
    checks.push({
      key: "roleFamilies",
      level: findings.length > 0 ? "blocker" : "passed",
      findings,
      pass: {
        key: "roleFamilies",
        units: measured.length,
        families: families.length,
        min: sizes.length > 0 ? Math.min(...sizes) : 0,
        max: sizes.length > 0 ? Math.max(...sizes) : 0,
      },
    });
  }

  // Context (D3), defined once for each measurement unit, and the warning when no knowledge domain
  // is critical.
  {
    const findings: Finding[] = [];
    const warnings: Finding[] = [];
    for (const view of measured) {
      const counts = contextCounts(view.row.id, input.context);
      const parts = incompleteParts(counts);
      if (parts.length > 0) {
        findings.push({
          kind: "contextIncomplete",
          unit: unitRef(view),
          parts: parts.map((part) => ({ part, n: counts[part] })),
        });
      }
      if (lacksCriticalDomain(counts))
        warnings.push({ kind: "noCriticalDomain", unit: unitRef(view) });
    }
    checks.push({
      key: "context",
      level: findings.length > 0 ? "blocker" : "passed",
      findings,
      pass: { key: "context", units: measured.length },
    });
    checks.push({
      key: "criticalDomain",
      level: warnings.length > 0 ? "warning" : "passed",
      findings: warnings,
      pass: NONE,
    });
  }

  // Leadership team of 3, team leaders, and the unit leader: warnings. The leadership team is the
  // people flagged across the units a measurement unit holds, and its leader where they sit above
  // them and are flagged (E9). The unit leader is expected to be among the flagged (Online
  // Measurement Specification 6.1).
  {
    const leadership: Finding[] = [];
    const teamLeaders: Finding[] = [];
    const unitLeaders: Finding[] = [];
    for (const view of measured) {
      const staff = staffIn(view);
      const leader = measurementLeader(view, input.people);
      const person =
        leader.kind === "designated" || leader.kind === "proposed" ? leader.person : undefined;
      const leaderAbove = person !== undefined && !staff.some((p) => p.id === person.id);
      const flagged =
        staff.filter((p) => p.is_leadership_team).length +
        (leaderAbove && person.is_leadership_team ? 1 : 0);
      if (flagged < LEADERSHIP_MIN) {
        leadership.push({ kind: "leadershipTeam", unit: unitRef(view), n: flagged });
      }
      if (!staff.some((p) => p.is_team_leader)) {
        teamLeaders.push({ kind: "noTeamLeaders", unit: unitRef(view) });
      }
      if (leader.kind === "none" || leader.kind === "ambiguous") {
        unitLeaders.push({
          kind: "noUnitLeader",
          unit: unitRef(view),
          candidates: leader.kind === "ambiguous" ? leader.candidates.length : 0,
        });
      } else if (person && !person.is_leadership_team) {
        unitLeaders.push({
          kind: "leaderNotFlagged",
          unit: unitRef(view),
          leader: { id: person.id, name: nameOf(person) },
        });
      }
    }
    checks.push({
      key: "leadershipTeam",
      level: leadership.length > 0 ? "warning" : "passed",
      findings: leadership,
      pass: NONE,
    });
    checks.push({
      key: "teamLeaders",
      level: teamLeaders.length > 0 ? "warning" : "passed",
      findings: teamLeaders,
      pass: NONE,
    });
    checks.push({
      key: "unitLeader",
      level: unitLeaders.length > 0 ? "warning" : "passed",
      findings: unitLeaders,
      pass: NONE,
    });
  }

  // Teams under 4 (Milestone 5, added at approval): a team can never reach the team floor of 4
  // valid respondents if it holds fewer people, so its own results are never shown and a response
  // naming it is stored without the team. A warning, named per unit, suggesting a merge. Teams are
  // the keys the campaign would freeze: a unit's own teams, and in a unit with teams a residual team
  // for the people in none; inside a combination a unit without teams is one team.
  {
    const findings: Finding[] = [];
    const teamName = new Map(input.teams.map((t) => [t.id, t.name]));
    const unitName = new Map(input.units.map((u) => [u.id, u.name]));
    for (const view of measured) {
      const counts = new Map<string, number>();
      for (const key of teamKeys(staffIn(view), view.combined).values()) {
        if (key !== null) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const small = [...counts]
        .filter(([, n]) => n < TEAM_MIN)
        .map(([key, n]) => ({ name: teamName.get(key) ?? unitName.get(key) ?? key, n }))
        .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
      if (small.length > 0)
        findings.push({ kind: "smallTeams", unit: unitRef(view), teams: small });
    }
    checks.push({
      key: "teamSize",
      level: findings.length > 0 ? "warning" : "passed",
      findings,
      pass: NONE,
    });
  }

  // Formal ratings (D4): skipped unless the directory holds them; then mapped or skipped, with
  // every label mapped. The pass line previews each measurement unit's route with the intake's own
  // rule, over 80% of the measurement unit's FTE.
  {
    const activeIds = new Set(input.people.map((p) => p.id));
    const held = input.formalRatings.filter((r) => activeIds.has(r.employee_id));
    const map = input.scaleMap;
    let check: Check;
    if (held.length === 0 || map?.decision === "skipped") {
      check = { key: "formalRatings", level: "skipped", findings: [], pass: NONE };
    } else if (!map) {
      check = {
        key: "formalRatings",
        level: "blocker",
        findings: [{ kind: "ratingsUndecided" }],
        pass: NONE,
      };
    } else {
      const mapped = new Set(map.entries.map((e) => e.label));
      const unmapped = [...new Set(held.map((r) => r.rating_label))]
        .filter((l) => !mapped.has(l))
        .sort((a, b) => a.localeCompare(b, "en-AU"));
      if (unmapped.length > 0) {
        check = {
          key: "formalRatings",
          level: "blocker",
          findings: [{ kind: "labelsUnmapped", labels: unmapped }],
          pass: NONE,
        };
      } else {
        const formal = { scaleMap: [...map.entries], calibrated: map.calibrated === true };
        let current = 0;
        const below: UnitRef[] = [];
        for (const view of measured) {
          const result = evaluateFormalRatings(
            formal,
            measurementSnapshot(
              view.units.map((u) => u.id),
              view.combined,
              input.people,
              held,
            ),
            input.today,
          );
          current += result?.ratedCount ?? 0;
          if (!result?.qualifies) below.push(unitRef(view));
        }
        check = {
          key: "formalRatings",
          level: "passed",
          findings: [],
          pass: { key: "formalRatings", current, below },
        };
      }
    }
    checks.push(check);
  }

  // An upload awaiting review (D11): what it holds is not yet in the directory.
  checks.push({
    key: "uploadAwaiting",
    level: input.stagedUploadId ? "warning" : "passed",
    findings: input.stagedUploadId
      ? [{ kind: "uploadAwaiting", uploadId: input.stagedUploadId }]
      : [],
    pass: NONE,
  });

  // Until a measurement unit has 10 or more, the checks made of measured units have nothing to
  // judge: they wait rather than pass.
  const perUnit: readonly CheckKey[] = [
    "roleFamilies",
    "context",
    "criticalDomain",
    "leadershipTeam",
    "teamLeaders",
    "teamSize",
    "unitLeader",
    "formalRatings",
  ];
  if (measured.length === 0) {
    for (const c of checks) {
      if (perUnit.includes(c.key) && c.level === "passed") {
        c.level = "skipped";
        c.pass = { key: "waiting" };
      }
    }
  }

  const blockers = checks.filter((c) => c.level === "blocker").length;
  const warnings = checks.filter((c) => c.level === "warning").length;
  const passed = checks.filter((c) => c.level === "passed" || c.level === "skipped").length;
  return {
    checks,
    blockers,
    warnings,
    passed,
    ready: blockers === 0,
    measured: measured.map(unitRef),
  };
}
