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
import type { FormalRatingRow, SnapshotPerson } from "./snapshot";
import { unitSnapshot } from "./snapshot";
import { hasChildren, leaderState, type UnitRow } from "./units";

/**
 * The readiness check (PORTAL_BUILD_PLAN.md 7; PORTAL_COPY_SPEC.md S2; Milestone 4 plan, Section 7,
 * decisions D1 to D11 and the unit leader). Pure: it takes the live directory and context and
 * returns each check's level and findings, with no copy; the page words them. The setup counts and
 * the formal-ratings rule are the intake package's own, run over the intake's own snapshot shape,
 * so the check says what the campaign close will find. Milestone 5's launch reruns it on the server.
 */

const SETUP = constants.SETUP;
const LEADERSHIP_MIN = constants.THRESHOLDS.leadershipMinimumRespondents;

export interface ReadinessPerson extends SnapshotPerson {
  first_name: string;
  last_name: string;
  work_email: string | null;
}

export interface Ref {
  id: string;
  name: string;
}

export interface ReadinessInput {
  today: string;
  units: readonly UnitRow[];
  /** Active people only. */
  people: readonly ReadinessPerson[];
  families: ReadonlyArray<{ id: string; name: string; status: string }>;
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
  | { kind: "unitSize"; unit: Ref; n: number }
  | { kind: "noManager"; people: Ref[] }
  | { kind: "managerLeft"; people: Ref[] }
  | { kind: "noEmail"; people: Ref[] }
  | { kind: "noRoleFamily"; unit: Ref; n: number }
  | { kind: "familyIncomplete"; family: Ref; problems: FamilyProblem[] }
  | { kind: "contextIncomplete"; unit: Ref; parts: Array<{ part: ContextPart; n: number }> }
  | { kind: "noCriticalDomain"; unit: Ref }
  | { kind: "leadershipTeam"; unit: Ref; n: number }
  | { kind: "noTeamLeaders"; unit: Ref }
  | { kind: "noUnitLeader"; unit: Ref; candidates: number }
  | { kind: "ratingsUndecided" }
  | { kind: "labelsUnmapped"; labels: string[] }
  | { kind: "uploadAwaiting"; uploadId: string };

export type CheckKey =
  | "units"
  | "unitForEveryone"
  | "managers"
  | "workEmails"
  | "roleFamilies"
  | "context"
  | "criticalDomain"
  | "leadershipTeam"
  | "teamLeaders"
  | "unitLeader"
  | "formalRatings"
  | "uploadAwaiting";

export type Level = "passed" | "warning" | "blocker" | "skipped";

export type PassDetail =
  | { key: "units"; n: number }
  | { key: "unitForEveryone"; n: number }
  | { key: "managers"; n: number; head: Ref | null }
  | { key: "workEmails"; n: number }
  | { key: "roleFamilies"; units: number; families: number; min: number; max: number }
  | { key: "context"; units: number }
  | { key: "formalRatings"; current: number; below: Ref[] }
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
  /** Units a campaign would measure: active units with people in them. */
  measured: Ref[];
}

const NONE: PassDetail = { key: "none" };

function nameOf(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`;
}

function byName<T extends Ref>(list: T[]): T[] {
  return list.sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
}

export function evaluateReadiness(input: ReadinessInput): Readiness {
  const active = input.units.filter((u) => u.status === "active");
  const staffOf = new Map<string, ReadinessPerson[]>();
  for (const p of input.people) staffOf.set(p.unit_id, [...(staffOf.get(p.unit_id) ?? []), p]);
  const unitRef = (u: UnitRow): Ref => ({ id: u.id, name: u.name });
  const measuredUnits = active
    .filter((u) => (staffOf.get(u.id) ?? []).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
  const checks: Check[] = [];

  // Units of 10 (D1): a unit's own staff count. A grouping unit (units below it, no staff of its
  // own) is not measured; a unit with 1 to 9 people, or an empty unit with nothing below it, blocks.
  {
    const findings: Finding[] = [...active]
      .sort((a, b) => a.name.localeCompare(b.name, "en-AU"))
      .flatMap((u): Finding[] => {
        const n = (staffOf.get(u.id) ?? []).length;
        const grouping = n === 0 && hasChildren(input.units, u.id);
        return !grouping && n < SETUP.minUnitStaff
          ? [{ kind: "unitSize", unit: unitRef(u), n }]
          : [];
      });
    checks.push({
      key: "units",
      level: findings.length > 0 || measuredUnits.length === 0 ? "blocker" : "passed",
      findings,
      pass: { key: "units", n: measuredUnits.length },
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
  // in use has 8 to 15 skills of both kinds with at least one critical.
  {
    const findings: Finding[] = [];
    for (const u of measuredUnits) {
      const n = (staffOf.get(u.id) ?? []).filter((p) => !p.role_family_id).length;
      if (n > 0) findings.push({ kind: "noRoleFamily", unit: unitRef(u), n });
    }
    const inUse = new Set(input.people.map((p) => p.role_family_id).filter(Boolean) as string[]);
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
        units: measuredUnits.length,
        families: families.length,
        min: sizes.length > 0 ? Math.min(...sizes) : 0,
        max: sizes.length > 0 ? Math.max(...sizes) : 0,
      },
    });
  }

  // Context (D3), and the warning when no knowledge domain is critical.
  {
    const findings: Finding[] = [];
    const warnings: Finding[] = [];
    for (const u of measuredUnits) {
      const counts = contextCounts(u.id, input.context);
      const parts = incompleteParts(counts);
      if (parts.length > 0) {
        findings.push({
          kind: "contextIncomplete",
          unit: unitRef(u),
          parts: parts.map((part) => ({ part, n: counts[part] })),
        });
      }
      if (lacksCriticalDomain(counts))
        warnings.push({ kind: "noCriticalDomain", unit: unitRef(u) });
    }
    checks.push({
      key: "context",
      level: findings.length > 0 ? "blocker" : "passed",
      findings,
      pass: { key: "context", units: measuredUnits.length },
    });
    checks.push({
      key: "criticalDomain",
      level: warnings.length > 0 ? "warning" : "passed",
      findings: warnings,
      pass: NONE,
    });
  }

  // Leadership team of 3, team leaders, and the unit leader: warnings.
  {
    const leadership: Finding[] = [];
    const teamLeaders: Finding[] = [];
    const unitLeaders: Finding[] = [];
    for (const u of measuredUnits) {
      const staff = staffOf.get(u.id) ?? [];
      const flagged = staff.filter((p) => p.is_leadership_team).length;
      if (flagged < LEADERSHIP_MIN)
        leadership.push({ kind: "leadershipTeam", unit: unitRef(u), n: flagged });
      if (!staff.some((p) => p.is_team_leader))
        teamLeaders.push({ kind: "noTeamLeaders", unit: unitRef(u) });
      const leader = leaderState(u, input.people);
      if (leader.kind === "none" || leader.kind === "ambiguous") {
        unitLeaders.push({
          kind: "noUnitLeader",
          unit: unitRef(u),
          candidates: leader.kind === "ambiguous" ? leader.candidates.length : 0,
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

  // Formal ratings (D4): skipped unless the directory holds them; then mapped or skipped, with
  // every label mapped. The pass line previews each unit's route with the intake's own rule.
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
        const below: Ref[] = [];
        for (const u of measuredUnits) {
          const result = evaluateFormalRatings(
            formal,
            unitSnapshot(u.id, input.people, held),
            input.today,
          );
          current += result?.ratedCount ?? 0;
          if (!result?.qualifies) below.push(unitRef(u));
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

  const blockers = checks.filter((c) => c.level === "blocker").length;
  const warnings = checks.filter((c) => c.level === "warning").length;
  const passed = checks.filter((c) => c.level === "passed" || c.level === "skipped").length;
  return {
    checks,
    blockers,
    warnings,
    passed,
    ready: blockers === 0,
    measured: measuredUnits.map(unitRef),
  };
}
