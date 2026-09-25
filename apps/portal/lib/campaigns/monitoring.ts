import type { CampaignCadence } from "./cadence";
import { type ChecklistCode, CHECKLISTS } from "./checklist-answers";
import { type MonitoredAudience, thresholdFor } from "./thresholds";

/**
 * The monitoring screen's model (Milestone 5 plan, 5.1; copy C1 to C3; layout notes of 24 September
 * 2026). Pure: it takes campaign_monitoring's counts (never a response and never a rating value),
 * the frozen contexts for what each report needs, and whether each unit's team leaders were flagged,
 * and returns per unit and audience what has been received against what the close will need.
 */

export interface MonitoringAudience {
  audience: string;
  size: number;
  issued: number;
  received: number;
  items: string[];
}

export interface MonitoringReport {
  subjectSnapshotMemberId: string;
  campaignUnitId: string;
  roleFamilyId: string | null;
  skills: number;
  domains: number;
  band: boolean;
}

export interface MonitoringData {
  units: Array<{
    campaignUnitId: string;
    measurementUnitId: string;
    headcount: number | null;
    c3Route: "formal" | "module" | null;
    audiences: MonitoringAudience[];
    checklists: Array<{ code: string; versions: number; latestAt: string }>;
  }>;
  sessions: Array<{
    sessionId: string;
    firstName: string | null;
    lastName: string | null;
    reports: MonitoringReport[];
  }>;
}

export interface UnitContextCounts {
  /** Skills per role family. */
  skills: ReadonlyMap<string, number>;
  domains: number;
}

export interface Cell {
  asked: boolean;
  received: number;
  size: number;
  needed: number;
  /** The share the close needs, where the rule is a rate; null where it is a count. */
  rate: number | null;
  below: boolean;
  more: number;
  note: "leadershipMinimum" | "fallback" | null;
}

export interface MonitoringRow {
  campaignUnitId: string;
  name: string;
  cells: Record<MonitoredAudience, Cell>;
  checklists: { asked: boolean; open: ChecklistCode[] };
}

export interface OutstandingManager {
  sessionId: string;
  name: string;
  units: string[];
  reports: number;
  rated: number;
}

export const MONITORED: readonly MonitoredAudience[] = [
  "members_part_a",
  "members_part_b",
  "managers",
  "team_leaders",
  "leadership_team",
];

function cell(
  cadence: CampaignCadence,
  audience: MonitoredAudience,
  asked: boolean,
  received: number,
  size: number,
  note: Cell["note"] = null,
): Cell {
  const threshold = thresholdFor(cadence, audience, size);
  const more = Math.max(0, threshold.needed - received);
  return {
    asked,
    received,
    size,
    needed: threshold.needed,
    rate: threshold.rate,
    below: asked && more > 0,
    more,
    note,
  };
}

export function monitoringModel(input: {
  cadence: CampaignCadence;
  data: MonitoringData;
  names: ReadonlyMap<string, string>;
  contexts: ReadonlyMap<string, UnitContextCounts>;
  /** Units whose team-leader audience has someone flagged team leader. */
  flaggedTeamLeaders: ReadonlySet<string>;
}): { rows: MonitoringRow[]; managers: OutstandingManager[]; people: number } {
  const { cadence, data, names, contexts } = input;
  const unitOf = new Map(data.units.map((u) => [u.campaignUnitId, u]));

  const rated = (report: MonitoringReport): boolean => {
    const unit = unitOf.get(report.campaignUnitId);
    const items = unit?.audiences.find((a) => a.audience === "managers")?.items ?? [];
    const context = contexts.get(report.campaignUnitId);
    const skills = items.includes("c1") ? (context?.skills.get(report.roleFamilyId ?? "") ?? 0) : 0;
    const domains = items.includes("c2") ? (context?.domains ?? 0) : 0;
    const band = items.includes("c3") && unit?.c3Route === "module";
    return report.skills >= skills && report.domains >= domains && (!band || report.band);
  };

  const rows = data.units
    .map((unit): MonitoringRow => {
      const audience = (key: string) => unit.audiences.find((a) => a.audience === key);
      const survey = (key: MonitoredAudience) => {
        const a = audience(key);
        const note =
          key === "leadership_team" && a && a.size < 3
            ? ("leadershipMinimum" as const)
            : key === "team_leaders" && a && !input.flaggedTeamLeaders.has(unit.campaignUnitId)
              ? ("fallback" as const)
              : null;
        return cell(cadence, key, Boolean(a), a?.received ?? 0, a?.size ?? 0, note);
      };
      const sessions = data.sessions
        .map((s) => s.reports.filter((r) => r.campaignUnitId === unit.campaignUnitId))
        .filter((reports) => reports.length > 0);
      const asked = unit.audiences.find((a) => a.audience === "admin_checklists")?.items ?? [];
      return {
        campaignUnitId: unit.campaignUnitId,
        name: names.get(unit.campaignUnitId) ?? "",
        cells: {
          members_part_a: survey("members_part_a"),
          members_part_b: survey("members_part_b"),
          managers: cell(
            cadence,
            "managers",
            Boolean(audience("managers")),
            sessions.filter((reports) => reports.every(rated)).length,
            sessions.length,
          ),
          team_leaders: survey("team_leaders"),
          leadership_team: survey("leadership_team"),
        },
        checklists: {
          asked: asked.length > 0,
          open: CHECKLISTS.filter(
            (code) => asked.includes(code) && !unit.checklists.some((c) => c.code === code),
          ),
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));

  const managers = data.sessions
    .map((s) => ({
      sessionId: s.sessionId,
      name: `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim(),
      units: [...new Set(s.reports.map((r) => names.get(r.campaignUnitId) ?? ""))].sort((a, b) =>
        a.localeCompare(b, "en-AU"),
      ),
      reports: s.reports.length,
      rated: s.reports.filter(rated).length,
    }))
    .filter((m) => m.reports > 0 && m.rated < m.reports)
    .sort((a, b) => a.name.localeCompare(b.name, "en-AU"));

  return {
    rows,
    managers,
    people: data.units.reduce((n, u) => n + (u.headcount ?? 0), 0),
  };
}
