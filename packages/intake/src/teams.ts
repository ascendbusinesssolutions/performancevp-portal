/**
 * 8 Type A Means, rows 80 to 91 (CII per team) and 95 to 106 (O5 per team). Each team's valid
 * respondents are the valid rows carrying its selector; the response rate divides by the team's
 * FTE from the snapshot, as the workbook divides by the Setup FTE. The CII flag is LOW below 4
 * valid or below 70%; the workbook's O5 flag tests the count only, and the online rule adds the
 * 70% test (Online Measurement Specification 3.3), which assemble.ts applies.
 */

import type { CiiItem } from "@performancevp/engine";

import { THRESHOLDS } from "./constants";
import { teamFte } from "./directory";
import { average, lt } from "./excel";
import { convertMean } from "./items";
import { itemMeans, type ItemMeans } from "./means";
import {
  CII_ITEMS,
  OI5_ITEMS,
  type MemberResponse,
  type Oi5Item,
  type Snapshot,
  type Team,
} from "./types";

export interface TeamCii {
  teamId: string;
  name: string;
  validCount: number;
  responseRate: number | undefined;
  means: ItemMeans<CiiItem>;
  /** "LOW" below 4 valid respondents or below 70%. */
  flag: string;
}

export interface TeamO5 {
  teamId: string;
  name: string;
  fte: number;
  validCount: number;
  responseRate: number | undefined;
  means: ItemMeans<Oi5Item>;
  /** (mean of the three item means − 1) × 25. */
  score: number | undefined;
  /** "LOW" below 4 valid respondents; the workbook applies no rate test here. */
  flag: string;
}

function teamRows(validRows: readonly MemberResponse[], teamId: string): MemberResponse[] {
  return validRows.filter((row) => row.teamId === teamId);
}

function rate(validCount: number, fte: number): number | undefined {
  return fte === 0 ? undefined : validCount / fte;
}

export function teamCii(
  validRows: readonly MemberResponse[],
  teams: readonly Team[],
  snapshot: Snapshot,
): TeamCii[] {
  return teams.map((team) => {
    const rows = teamRows(validRows, team.id);
    const fte = teamFte(snapshot, team.id);
    const responseRate = rate(rows.length, fte);
    const low =
      lt(rows.length, THRESHOLDS.teamMinimumValid) ||
      (responseRate !== undefined && lt(responseRate, THRESHOLDS.teamRate));
    return {
      teamId: team.id,
      name: team.name,
      validCount: rows.length,
      responseRate,
      means: itemMeans(rows, CII_ITEMS),
      flag: low ? "LOW" : "",
    };
  });
}

export function teamO5(
  validRows: readonly MemberResponse[],
  teams: readonly Team[],
  snapshot: Snapshot,
): TeamO5[] {
  return teams.map((team) => {
    const rows = teamRows(validRows, team.id);
    const fte = teamFte(snapshot, team.id);
    const means = itemMeans(rows, OI5_ITEMS);
    const mean = average(OI5_ITEMS.map((item) => means[item]));
    return {
      teamId: team.id,
      name: team.name,
      fte,
      validCount: rows.length,
      responseRate: rate(rows.length, fte),
      means,
      score: mean === undefined ? undefined : convertMean(mean),
      flag: lt(rows.length, THRESHOLDS.teamMinimumValid) ? "LOW" : "",
    };
  });
}
