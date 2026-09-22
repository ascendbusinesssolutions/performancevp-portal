/**
 * An intake input from a Survey Processing workbook's stored input cells. The workbook types its
 * headcounts and FTE; the intake derives them from a directory snapshot, so the extractor builds
 * a synthetic snapshot that reproduces them: one member per head, FTE spread evenly across each
 * team's members, the first heads flagged for the leadership team and as team leaders, and the
 * manager rows' direct reports attached to their managers.
 */

import { PART_A_ITEMS } from "../src/items";
import {
  O1C_ITEMS,
  O2I_ITEMS,
  type IntakeInput,
  type LeadershipRow,
  type Member,
  type MemberResponse,
  type TeamLeaderResponse,
} from "../src/types";
import type { DumpValue } from "./compare";
import { ROWS, SHEET, mainColumns, teamLeaderColumns } from "./layout";

type Dump = Record<string, DumpValue>;

function num(dump: Dump, cell: string): number | undefined {
  const v = dump[cell];
  return typeof v === "number" ? v : undefined;
}

function str(dump: Dump, cell: string): string | undefined {
  const v = dump[cell];
  if (typeof v === "number") return String(v);
  return typeof v === "string" && v !== "" ? v : undefined;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface ExtractOptions {
  launchDate: string;
  closeDate: string;
}

export function inputFromDump(dump: Dump, options: ExtractOptions): IntakeInput {
  const S = SHEET.setup;
  const teams: Array<{ id: string; name: string; fte: number }> = [];
  for (let t = 0; t < ROWS.teams.count; t += 1) {
    const r = ROWS.teams.first + t;
    const name = str(dump, `${S}!A${r}`);
    if (name !== undefined) teams.push({ id: slug(name), name, fte: num(dump, `${S}!B${r}`) ?? 0 });
  }
  const decisionTypes: Array<{ id: string; name: string }> = [];
  for (let d = 0; d < ROWS.decisionTypes.count; d += 1) {
    const name = str(dump, `${S}!D${ROWS.decisionTypes.first + d}`);
    if (name !== undefined) decisionTypes.push({ id: slug(name), name });
  }
  const roleFamilies: Array<{ id: string; name: string; fte: number; skillCount: number }> = [];
  for (let f = 0; f < ROWS.roleFamilies.count; f += 1) {
    const r = ROWS.roleFamilies.first + f;
    const name = str(dump, `${S}!K${r}`);
    if (name !== undefined) {
      roleFamilies.push({
        id: slug(name),
        name,
        fte: num(dump, `${S}!L${r}`) ?? 0,
        skillCount: num(dump, `${S}!M${r}`) ?? 0,
      });
    }
  }

  // Responses: the main survey, one row per member, process blocks keyed to the three slots.
  const processes = [0, 1, 2].map((p) => ({ id: `process-${p + 1}`, name: `Process ${p + 1}` }));
  const columns = mainColumns();
  const members: MemberResponse[] = [];
  for (let n = 0; n < ROWS.main.count; n += 1) {
    const r = ROWS.main.first + n;
    const items: Partial<Record<string, number>> = {};
    const byProcess = new Map<number, Partial<Record<string, number>>>();
    let any = false;
    for (const c of columns) {
      const v = num(dump, `${SHEET.importMain}!${c.column}${r}`);
      if (v === undefined) continue;
      any = true;
      if (c.process === undefined) items[c.item] = v;
      else {
        const bucket = byProcess.get(c.process) ?? {};
        bucket[c.item] = v;
        byProcess.set(c.process, bucket);
      }
    }
    const teamName = str(dump, `${SHEET.importMain}!B${r}`);
    if (!any && teamName === undefined) continue;
    const response: MemberResponse = { id: `main-${r}`, items: items as MemberResponse["items"] };
    const team = teams.find((t) => t.name === teamName);
    if (team !== undefined) response.teamId = team.id;
    if (byProcess.size > 0) {
      response.processes = [...byProcess.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([p, processItems]) => ({
          processId: processes[p]?.id ?? `process-${p + 1}`,
          items: processItems as NonNullable<MemberResponse["processes"]>[number]["items"],
        }));
    }
    members.push(response);
  }

  // Leadership survey: one row per respondent per decision type, in workbook order.
  const L = SHEET.importLeadership;
  const leadership: LeadershipRow[] = [];
  for (let n = 0; n < ROWS.leadership.count; n += 1) {
    const r = ROWS.leadership.first + n;
    const respondentId = str(dump, `${L}!A${r}`);
    const decisionName = str(dump, `${L}!B${r}`);
    if (respondentId === undefined || decisionName === undefined) continue;
    const decisionTypeId =
      decisionTypes.find((d) => d.name === decisionName)?.id ?? slug(decisionName);
    const rowEntry: LeadershipRow = { respondentId, decisionTypeId };
    const roles = ["recommend", "agree", "perform", "input", "decides"] as const;
    roles.forEach((role, k) => {
      const v = str(dump, `${L}!${String.fromCharCode(67 + k)}${r}`);
      if (v !== undefined) rowEntry[role] = v;
    });
    const clarity = num(dump, `${L}!H${r}`);
    if (clarity !== undefined) rowEntry.clarity = clarity;
    leadership.push(rowEntry);
  }

  // Team-leader survey.
  const teamLeaders: TeamLeaderResponse[] = [];
  for (let n = 0; n < ROWS.teamLeader.count; n += 1) {
    const r = ROWS.teamLeader.first + n;
    const items: Partial<Record<string, number>> = {};
    let any = false;
    for (const c of teamLeaderColumns()) {
      const v = num(dump, `${SHEET.importTeamLeader}!${c.column}${r}`);
      if (v !== undefined) {
        any = true;
        items[c.item] = v;
      }
    }
    if (any || str(dump, `${SHEET.importTeamLeader}!A${r}`) !== undefined) {
      teamLeaders.push({ id: `leader-${r}`, items: items as TeamLeaderResponse["items"] });
    }
  }

  // The synthetic snapshot.
  const headMembers = num(dump, `${S}!B20`) ?? 0;
  const headLeadership = num(dump, `${S}!B22`) ?? 0;
  const headTeamLeaders = num(dump, `${S}!B23`) ?? 0;
  const snapshotMembers: Member[] = [];
  const teamFteTotal = teams.reduce((sum, t) => sum + t.fte, 0);
  let seq = 0;
  const push = (member: Omit<Member, "employeeRef">): void => {
    seq += 1;
    snapshotMembers.push({ employeeRef: `E${String(seq).padStart(3, "0")}`, ...member });
  };
  if (teams.length > 0 && teamFteTotal > 0) {
    // Heads per team in proportion to FTE; the last team takes the remainder.
    let assigned = 0;
    teams.forEach((team, t) => {
      const heads =
        t === teams.length - 1
          ? headMembers - assigned
          : Math.round((headMembers * team.fte) / teamFteTotal);
      assigned += heads;
      for (let k = 0; k < heads; k += 1) push({ teamId: team.id, fte: team.fte / heads });
    });
  } else {
    for (let k = 0; k < headMembers; k += 1)
      push({ fte: (num(dump, `${S}!B16`) ?? headMembers) / headMembers });
  }
  for (let k = 0; k < snapshotMembers.length; k += 1) {
    const m = snapshotMembers[k] as Member;
    if (k < headLeadership) m.leadershipTeam = true;
    if (k < headTeamLeaders) m.teamLeader = true;
  }
  // Role families: the Setup FTE worth of heads each, taken in order from members not yet in a
  // family. Generated fixtures with manager data build their input directly (requests.ts).
  let cursor = 0;
  for (const family of roleFamilies) {
    let remaining = family.fte;
    while (remaining > 0 && cursor < snapshotMembers.length) {
      const m = snapshotMembers[cursor] as Member;
      m.roleFamilyId = family.id;
      remaining -= m.fte;
      cursor += 1;
    }
  }

  const input: IntakeInput = {
    campaign: {
      cadence: (str(dump, `${S}!B17`) ?? "baseline") as IntakeInput["campaign"]["cadence"],
      launchDate: options.launchDate,
      closeDate: options.closeDate,
      deployed: {
        partA: [...PART_A_ITEMS],
        partB: { items: [...O1C_ITEMS, ...O2I_ITEMS], processIds: processes.map((p) => p.id) },
        leadershipTeam: leadership.length > 0,
        teamLeaders: teamLeaders.length > 0,
      },
    },
    unit: {
      name: str(dump, `${S}!B15`) ?? "",
      teams: teams.map(({ id, name }) => ({ id, name })),
      roleFamilies: roleFamilies.map((f) => ({
        id: f.id,
        name: f.name,
        skills: Array.from({ length: f.skillCount }, (_, k) => ({
          id: `${f.id}-skill-${k + 1}`,
          name: `Skill ${k + 1}`,
          critical: false,
          kind: "technical" as const,
        })),
      })),
      knowledgeDomains: [],
      systems: [],
      processes,
      decisionTypes,
    },
    snapshot: { members: snapshotMembers },
    responses: {
      members,
      teamLeaders,
      leadershipTeam: leadership,
    },
  };
  return input;
}
