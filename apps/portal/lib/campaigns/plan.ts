import { evaluateFormalRatings, type UnitContext } from "@performancevp/intake";

import type { DomainRow, NamedRow } from "@/lib/setup/frameworks";
import { measurementLeader, measurementModel, type MeasurementView } from "@/lib/setup/measurement";
import {
  type Check,
  evaluateReadiness,
  type Finding,
  type ReadinessInput,
  type ReadinessPerson,
  type Readiness,
  type Ref,
} from "@/lib/setup/readiness";
import { measurementSnapshot, teamKeys } from "@/lib/setup/snapshot";

import { type CampaignCadence, needsFullRun } from "./cadence";
import { type AudienceDeployment, type AudienceKey, deploymentFor } from "./deployment";

/**
 * The launch plan (Milestone 5 plan, 2.3 and 3.1 to 3.5), computed from the same data the readiness
 * check reads and checked again by launch_campaign against the live directory. Per measurement
 * unit: its members with their team keys, the team keys, the position titles the leadership module
 * offers, the unit context in the intake's shape, the team-leader and leadership-team audiences as
 * readiness counts them, the deployment for the cadence, and the C3 route from the intake's own
 * rule over the intake's own snapshot, dated at the launch. Pure; the preview shows what it would
 * freeze and why it would refuse.
 */

export interface LaunchPerson extends ReadinessPerson {
  role_title: string | null;
}

export interface LaunchData extends ReadinessInput {
  people: readonly LaunchPerson[];
  families: ReadonlyArray<{ id: string; name: string; status: string; is_people_leader: boolean }>;
  teams: ReadonlyArray<{ id: string; name: string; unit_id: string; status: string }>;
  context: {
    domains: readonly DomainRow[];
    decisions: readonly NamedRow[];
    processes: readonly NamedRow[];
    systems: readonly NamedRow[];
  };
  /** Measurement units with a released full run to carry forward from (D9). */
  releasedFullRuns: readonly string[];
  /** Measurement units another open or scoring campaign is measuring. */
  busy: readonly string[];
}

export interface UnitChange {
  id: string;
  name: string | null;
  dropped: boolean;
}

export interface CampaignToLaunch {
  id: string;
  cadence: CampaignCadence;
  pulse_rotation: number | null;
  event_trigger: string | null;
  closes_at: string | null;
  measurementUnitIds: readonly string[];
  /** Units that changed after the draft was made (checkpoint 2); cleared when the draft is saved. */
  unit_changes: readonly UnitChange[] | null;
}

export interface PlanTeam {
  key: string;
  name: string;
  teamId: string | null;
  businessUnitId: string;
  kind: "team" | "unit";
}

export type PlanContext = Omit<UnitContext, "teams" | "clientName" | "sector" | "subSector">;

export interface PlanUnit {
  measurementUnitId: string;
  c3Route: "formal" | "module";
  members: Array<{ employeeId: string; teamKey: string | null }>;
  teams: PlanTeam[];
  positions: Array<{ title: string }>;
  context: PlanContext;
  teamLeaders: string[];
  leadershipTeam: string[];
  audiences: Partial<Record<AudienceKey, AudienceDeployment>>;
}

export interface LaunchPlan {
  units: PlanUnit[];
}

/** What the preview shows for a unit. */
export interface PreviewUnit {
  id: string;
  name: string;
  members: number;
  teams: number;
  teamLeaders: number;
  /** No team leader is flagged, so the unit leader takes the learning module. */
  teamLeaderFallback: boolean;
  leadershipTeam: number;
  managers: number;
  c3Route: "formal" | "module";
  audiences: AudienceKey[];
  checklists: string[];
}

export type CampaignBlocker =
  | { kind: "noUnits" }
  | { kind: "unitsChanged"; units: string[] }
  | { kind: "notMeasured"; unit: Ref }
  | { kind: "needsFullRun"; unit: Ref }
  | { kind: "busy"; unit: Ref }
  | { kind: "windowPassed" };

export interface LaunchPreparation {
  readiness: Readiness;
  blockers: CampaignBlocker[];
  /** Readiness blockers and the campaign's own together. */
  ready: boolean;
  plan: LaunchPlan;
  preview: PreviewUnit[];
  /** Everyone who would receive an anonymous-survey email, counted once. */
  peopleEmailed: number;
}

function byName<T extends { name: string }>(rows: T[]): T[] {
  return rows.sort((a, b) => a.name.localeCompare(b.name, "en-AU"));
}

function byRef(people: readonly LaunchPerson[]): string[] {
  return [...people]
    .sort((a, b) => a.employee_ref.localeCompare(b.employee_ref, "en-AU"))
    .map((p) => p.id);
}

function unitContext(view: MeasurementView, staff: readonly LaunchPerson[], data: LaunchData) {
  const id = view.row.id;
  const active = <T extends { measurement_unit_id: string; status: string }>(rows: readonly T[]) =>
    rows.filter((r) => r.measurement_unit_id === id && r.status === "active");
  const familyIds = new Set(staff.map((p) => p.role_family_id).filter(Boolean) as string[]);
  const context: PlanContext = {
    name: view.row.name,
    roleFamilies: byName(
      data.families
        .filter((f) => familyIds.has(f.id) && f.status === "active")
        .map((f) => ({
          id: f.id,
          name: f.name,
          peopleLeader: f.is_people_leader,
          skills: byName(
            data.skills
              .filter((s) => s.role_family_id === f.id && s.status === "active")
              .map((s) => ({
                id: s.id,
                name: s.name,
                critical: s.is_critical,
                kind: s.kind === "behavioural" ? ("behavioural" as const) : ("technical" as const),
              })),
          ),
        })),
    ),
    knowledgeDomains: byName(
      active(data.context.domains).map((d) => ({
        id: d.id,
        name: d.name,
        criticality: d.criticality as 1 | 2 | 3,
      })),
    ),
    decisionTypes: byName(active(data.context.decisions).map((d) => ({ id: d.id, name: d.name }))),
    processes: byName(active(data.context.processes).map((d) => ({ id: d.id, name: d.name }))),
    systems: byName(active(data.context.systems).map((d) => ({ id: d.id, name: d.name }))),
  };
  return context;
}

export function prepareLaunch(
  data: LaunchData,
  campaign: CampaignToLaunch,
  now: Date,
): LaunchPreparation {
  const readiness = evaluateReadiness(data);
  const model = measurementModel({
    units: data.units,
    measurementUnits: data.measurementUnits,
    members: data.members,
    people: data.people,
  });
  const blockers: CampaignBlocker[] = [];
  const plan: LaunchPlan = { units: [] };
  const preview: PreviewUnit[] = [];
  const emailed = new Set<string>();
  const teamName = new Map(data.teams.map((t) => [t.id, t]));
  const unitName = new Map(data.units.map((u) => [u.id, u.name]));
  const activeIds = new Set(data.people.map((p) => p.id));
  const held = data.formalRatings.filter((r) => activeIds.has(r.employee_id));
  const map = data.scaleMap;
  const formal =
    map && map.decision === "mapped"
      ? { scaleMap: [...map.entries], calibrated: map.calibrated === true }
      : undefined;

  // Who and what this campaign reaches, for scoping the readiness check (checkpoint 2).
  const scope = {
    units: new Set<string>(),
    people: new Set<string>(),
    families: new Set<string>(),
    labels: new Set<string>(),
    holdsRatings: false,
  };
  const shortUnits = new Set<string>();

  if (campaign.unit_changes && campaign.unit_changes.length > 0) {
    blockers.push({
      kind: "unitsChanged",
      units: campaign.unit_changes
        .map((c) => c.name ?? "")
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "en-AU")),
    });
  }
  if (campaign.measurementUnitIds.length === 0) blockers.push({ kind: "noUnits" });
  if (campaign.closes_at === null || Date.parse(campaign.closes_at) <= now.getTime()) {
    blockers.push({ kind: "windowPassed" });
  }

  const ids = [...campaign.measurementUnitIds].sort((a, b) => {
    const nameOf = (id: string) => data.measurementUnits.find((m) => m.id === id)?.name ?? id;
    return nameOf(a).localeCompare(nameOf(b), "en-AU");
  });
  for (const id of ids) {
    const row = data.measurementUnits.find((m) => m.id === id);
    const ref: Ref = { id, name: row?.name ?? id };
    const view = model.views.find((v) => v.row.id === id);
    scope.units.add(id);
    if (!view || view.state !== "measured") {
      blockers.push({ kind: "notMeasured", unit: ref });
      shortUnits.add(id);
      continue;
    }
    if (needsFullRun(campaign.cadence) && !data.releasedFullRuns.includes(id)) {
      blockers.push({ kind: "needsFullRun", unit: ref });
    }
    if (data.busy.includes(id)) blockers.push({ kind: "busy", unit: ref });

    const inside = new Set(view.units.map((u) => u.id));
    const staff = data.people.filter((p) => inside.has(p.unit_id));
    const staffIds = new Set(staff.map((p) => p.id));
    const keys = teamKeys(staff, view.combined);
    const teams: PlanTeam[] = byName(
      [...new Set([...keys.values()].filter((k): k is string => k !== null))].map((key) => {
        const team = teamName.get(key);
        return team
          ? {
              key,
              name: team.name,
              teamId: key,
              businessUnitId: team.unit_id,
              kind: "team" as const,
            }
          : {
              key,
              name: unitName.get(key) ?? key,
              teamId: null,
              businessUnitId: key,
              kind: "unit" as const,
            };
      }),
    );

    const leader = measurementLeader(view, data.people);
    const person =
      leader.kind === "designated" || leader.kind === "proposed" ? leader.person : undefined;
    const leaderAbove = person !== undefined && !staffIds.has(person.id);
    const leadership = [
      ...staff.filter((p) => p.is_leadership_team),
      ...(leaderAbove && person.is_leadership_team ? [person] : []),
    ];
    const flaggedLeaders = staff.filter((p) => p.is_team_leader);
    const teamLeaders = flaggedLeaders.length > 0 ? flaggedLeaders : person ? [person] : [];

    const context = unitContext(view, staff, data);
    const route = evaluateFormalRatings(
      formal,
      measurementSnapshot(
        view.units.map((u) => u.id),
        view.combined,
        data.people,
        held,
      ),
      data.today,
    )?.qualifies
      ? ("formal" as const)
      : ("module" as const);
    const { audiences } = deploymentFor({
      cadence: campaign.cadence,
      rotation: campaign.pulse_rotation,
      trigger: campaign.event_trigger,
      c3Route: route,
      processIds: context.processes.map((p) => p.id),
    });

    const titles = new Set(
      [...staff, ...teamLeaders, ...leadership]
        .map((p) => p.role_title?.trim())
        .filter((t): t is string => Boolean(t)),
    );
    plan.units.push({
      measurementUnitId: id,
      c3Route: route,
      members: [...staff]
        .sort((a, b) => a.employee_ref.localeCompare(b.employee_ref, "en-AU"))
        .map((p) => ({ employeeId: p.id, teamKey: keys.get(p.id) ?? null })),
      teams,
      positions: [...titles]
        .sort((a, b) => a.localeCompare(b, "en-AU"))
        .map((title) => ({ title })),
      context,
      teamLeaders: byRef(teamLeaders),
      leadershipTeam: byRef(leadership),
      audiences,
    });

    const asked = Object.keys(audiences) as AudienceKey[];
    const managers = new Set(
      staff.map((p) => p.manager_employee_id).filter((m): m is string => Boolean(m)),
    );
    for (const person of [...staff, ...teamLeaders, ...leadership]) scope.people.add(person.id);
    for (const manager of managers) scope.people.add(manager);
    for (const person of staff)
      if (person.role_family_id) scope.families.add(person.role_family_id);
    for (const rating of held) {
      if (staffIds.has(rating.employee_id)) {
        scope.holdsRatings = true;
        scope.labels.add(rating.rating_label);
      }
    }
    if (audiences.members_part_a || audiences.members_part_b) {
      for (const p of staff) emailed.add(p.id);
    }
    if (audiences.team_leaders) for (const p of teamLeaders) emailed.add(p.id);
    if (audiences.leadership_team) for (const p of leadership) emailed.add(p.id);
    preview.push({
      id,
      name: view.row.name,
      members: staff.length,
      teams: teams.length,
      teamLeaders: teamLeaders.length,
      teamLeaderFallback: flaggedLeaders.length === 0 && teamLeaders.length > 0,
      leadershipTeam: leadership.length,
      managers: audiences.managers ? managers.size : 0,
      c3Route: route,
      audiences: asked,
      checklists: audiences.admin_checklists?.items ?? [],
    });
  }

  const scoped = scopeReadiness(readiness, { ...scope, shortUnits });
  return {
    readiness: scoped,
    blockers,
    ready: scoped.ready && blockers.length === 0,
    plan,
    preview,
    peopleEmailed: emailed.size,
  };
}

export interface ReadinessScope {
  /** The campaign's measurement units. */
  units: ReadonlySet<string>;
  /** Those already refused as no longer measured, which the units check need not repeat. */
  shortUnits: ReadonlySet<string>;
  /** Their members, team leaders, leadership team and the members' managers. */
  people: ReadonlySet<string>;
  /** The role families their members hold. */
  families: ReadonlySet<string>;
  /** The formal-rating labels their members hold. */
  labels: ReadonlySet<string>;
  holdsRatings: boolean;
}

/**
 * The readiness check as it bears on one campaign (Michael, checkpoint 2, 25 September 2026): each
 * finding is kept only where it concerns the campaign's own units or the people, managers and
 * leaders in them, so a unit elsewhere still being set up blocks nothing here. A finding that is
 * organisation-wide by nature (an upload awaiting review) is kept as it is. Levels and counts are
 * recomputed from what remains.
 */
export function scopeReadiness(readiness: Readiness, scope: ReadinessScope): Readiness {
  const inScope = (finding: Finding): Finding | null => {
    switch (finding.kind) {
      case "unitShort":
      case "unitEmpty":
      case "combinationShort":
      case "branchBroken":
        return scope.units.has(finding.unit.id) && !scope.shortUnits.has(finding.unit.id)
          ? finding
          : null;
      case "groupingUndecided":
      case "noRoleFamily":
      case "contextIncomplete":
      case "noCriticalDomain":
      case "leadershipTeam":
      case "noTeamLeaders":
      case "smallTeams":
      case "noUnitLeader":
      case "leaderNotFlagged":
        return scope.units.has(finding.unit.id) ? finding : null;
      case "noManager":
      case "managerLeft":
      case "noEmail": {
        const people = finding.people.filter((p) => scope.people.has(p.id));
        return people.length > 0 ? { ...finding, people } : null;
      }
      case "familyIncomplete":
        return scope.families.has(finding.family.id) ? finding : null;
      case "ratingsUndecided":
        return scope.holdsRatings ? finding : null;
      case "labelsUnmapped": {
        const labels = finding.labels.filter((l) => scope.labels.has(l));
        return labels.length > 0 ? { ...finding, labels } : null;
      }
      case "uploadAwaiting":
        return finding;
    }
  };
  const checks: Check[] = readiness.checks.map((check) => {
    if (check.level !== "blocker" && check.level !== "warning") return check;
    const findings = check.findings.map(inScope).filter((f): f is Finding => f !== null);
    return findings.length > 0 ? { ...check, findings } : { ...check, level: "passed", findings };
  });
  const blockers = checks.filter((c) => c.level === "blocker").length;
  return {
    ...readiness,
    checks,
    blockers,
    warnings: checks.filter((c) => c.level === "warning").length,
    passed: checks.filter((c) => c.level === "passed" || c.level === "skipped").length,
    ready: blockers === 0,
  };
}
