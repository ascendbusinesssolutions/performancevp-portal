/**
 * The online team rules for C4 and O5 (Online Measurement Specification 3.1 and 3.3; Measurement
 * Reference 2.4 and 4.5). A team is valid with 4 valid respondents and 70% response; the unit
 * needs 75% of its teams valid; a unit with no sub-teams is one team. C4 travels to the engine as
 * the fifteen CII item means FTE-weighted over the valid teams, which equals the FTE-weighted
 * mean of the team C4 scores because C4 is linear in the item means. O5 travels as one engine
 * row per valid team. The workbook flags but does not apply these rules; the intake does.
 */

import type { CiiItem } from "@performancevp/engine";

import { THRESHOLDS } from "./constants";
import { unitFte } from "./directory";
import { ge, lt } from "./excel";
import { itemMeans, type ItemMeans } from "./means";
import type { TeamCii, TeamO5 } from "./teams";
import { CII_ITEMS, OI5_ITEMS, type MemberResponse, type Snapshot } from "./types";
import { average } from "./excel";
import { convertMean } from "./items";

export interface TeamStatus {
  teamId: string;
  name: string;
  fte: number;
  validCount: number;
  responseRate: number | undefined;
  valid: boolean;
  reason: string | undefined;
}

export function teamValid(
  validCount: number,
  responseRate: number | undefined,
): TeamStatus["reason"] {
  if (lt(validCount, THRESHOLDS.teamMinimumValid))
    return `${validCount} valid respondents, below 4`;
  if (responseRate === undefined) return "no FTE in the directory for this team";
  if (lt(responseRate, THRESHOLDS.teamRate))
    return `${(responseRate * 100).toFixed(1)}% response, below 70%`;
  return undefined;
}

export function teamStatuses(teams: readonly TeamO5[]): TeamStatus[] {
  return teams.map((t) => {
    const reason = teamValid(t.validCount, t.responseRate);
    return {
      teamId: t.teamId,
      name: t.name,
      fte: t.fte,
      validCount: t.validCount,
      responseRate: t.responseRate,
      valid: reason === undefined,
      reason,
    };
  });
}

/** At least 75% of the unit's teams valid. */
export function enoughTeamsValid(statuses: readonly TeamStatus[]): boolean {
  if (statuses.length === 0) return false;
  const valid = statuses.filter((s) => s.valid).length;
  return ge(valid / statuses.length, THRESHOLDS.teamsValidShare);
}

/** Each item's FTE-weighted mean over the teams that have a mean for it. */
export function weightedItemMeans(
  teams: ReadonlyArray<{ fte: number; means: ItemMeans<CiiItem> }>,
): ItemMeans<CiiItem> {
  const out: ItemMeans<CiiItem> = {};
  for (const item of CII_ITEMS) {
    let weighted = 0;
    let fte = 0;
    for (const t of teams) {
      const m = t.means[item];
      if (m === undefined) continue;
      weighted += m * t.fte;
      fte += t.fte;
    }
    if (fte > 0) out[item] = weighted / fte;
  }
  return out;
}

export interface UnitTeamResult {
  statuses: TeamStatus[];
  enoughTeams: boolean;
  /** The C4 item means for the engine, over the valid teams; empty when the unit fails the team rule. */
  c4Items: ItemMeans<CiiItem>;
  /** The O5 rows for the engine, valid teams only. */
  o5Teams: Array<{ name: string; fte: number; score: number }>;
}

/**
 * Applies the team rules to the mirror's team rows. A unit with no teams is one team made of every
 * valid row, with the unit's FTE.
 */
export function applyTeamRules(
  cii: readonly TeamCii[],
  o5: readonly TeamO5[],
  validRows: readonly MemberResponse[],
  snapshot: Snapshot,
): UnitTeamResult {
  let ciiRows = cii;
  let o5Rows = o5;
  if (o5.length === 0) {
    const fte = unitFte(snapshot);
    const responseRate = fte === 0 ? undefined : validRows.length / fte;
    const means = itemMeans(validRows, OI5_ITEMS);
    const mean = average(OI5_ITEMS.map((item) => means[item]));
    o5Rows = [
      {
        teamId: "unit",
        name: "Whole unit",
        fte,
        validCount: validRows.length,
        responseRate,
        means,
        score: mean === undefined ? undefined : convertMean(mean),
        flag: "",
      },
    ];
    ciiRows = [
      {
        teamId: "unit",
        name: "Whole unit",
        validCount: validRows.length,
        responseRate,
        means: itemMeans(validRows, CII_ITEMS),
        flag: "",
      },
    ];
  }
  const statuses = teamStatuses(o5Rows);
  const enoughTeams = enoughTeamsValid(statuses);
  const validIds = new Set(statuses.filter((s) => s.valid).map((s) => s.teamId));
  const c4Items = enoughTeams
    ? weightedItemMeans(
        ciiRows
          .filter((t) => validIds.has(t.teamId))
          .map((t) => ({
            fte: o5Rows.find((o) => o.teamId === t.teamId)?.fte ?? 0,
            means: t.means,
          })),
      )
    : {};
  const o5Teams = enoughTeams
    ? o5Rows
        .filter((t) => validIds.has(t.teamId) && t.score !== undefined)
        .map((t) => ({ name: t.name, fte: t.fte, score: t.score as number }))
    : [];
  return { statuses, enoughTeams, c4Items, o5Teams };
}
