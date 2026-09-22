/**
 * M-O1-LT, the leadership decision-rights module: 9 Type C Scoring rows 6 to 38 and the helper
 * columns I:N of 4 Import Leadership.
 *
 * Per decision type: n is the number of answer rows for it; each role's agreement is the largest
 * count of any one answer among those rows over n (a blank answer counts in n and in no answer);
 * the decision's agreement is the mean of the five roles; clarity is (mean clarity − 1) × 25.
 * Aggregate agreement and clarity are means across decision types with rows. The response rate
 * is distinct respondents over the leadership headcount. Score = 0.6 × agreement × 100 + 0.4 ×
 * clarity. The leadership survey is not screened (Module Library 8.5).
 */

import { LT_WEIGHTS, THRESHOLDS } from "../constants";
import { average, isNumber, lt, type Cell } from "../excel";
import { convertMean } from "../items";
import type { LeadershipRow } from "../types";

export const RAPID_ROLES = ["recommend", "agree", "perform", "input", "decides"] as const;
export type RapidRole = (typeof RAPID_ROLES)[number];

/** The import sheet's helper cells for one answer row (I:N). */
export interface LtRowHelper {
  /** COUNTIFS(decision, answer) per role; blank where the answer is blank. */
  counts: Record<RapidRole, Cell>;
  /** 1 on a respondent's first row, 0 otherwise. */
  newRespondent: 0 | 1;
}

export interface LtDecision {
  decisionTypeId: string;
  name: string;
  n: number;
  agreement: Record<RapidRole, Cell>;
  /** AVERAGE of the five role agreements. */
  mean: Cell;
  /** (mean clarity − 1) × 25. */
  clarity: Cell;
}

export interface LtResult {
  rows: LtRowHelper[];
  decisions: LtDecision[];
  aggregateAgreement: Cell;
  aggregateClarity: Cell;
  distinctRespondents: number;
  responseRate: Cell;
  /** "LOW leadership response" below 75%, "ok" otherwise, blank without a rate. */
  rateFlag: string | undefined;
  score: Cell;
}

export function scoreLeadership(
  rows: readonly LeadershipRow[],
  decisionTypes: ReadonlyArray<{ id: string; name: string }>,
  headcount: number | undefined,
): LtResult {
  const helpers: LtRowHelper[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const counts = {} as Record<RapidRole, Cell>;
    for (const role of RAPID_ROLES) {
      const answer = row[role];
      counts[role] =
        answer === undefined || answer === ""
          ? undefined
          : rows.filter((r) => r.decisionTypeId === row.decisionTypeId && r[role] === answer)
              .length;
    }
    const isNew = row.respondentId !== "" && !seen.has(row.respondentId);
    if (isNew) seen.add(row.respondentId);
    helpers.push({ counts, newRespondent: isNew ? 1 : 0 });
  }

  const decisions: LtDecision[] = decisionTypes.map((type) => {
    const indexes = rows
      .map((r, i) => (r.decisionTypeId === type.id ? i : -1))
      .filter((i) => i >= 0);
    const n = indexes.length;
    const agreement = {} as Record<RapidRole, Cell>;
    for (const role of RAPID_ROLES) {
      if (n === 0) {
        agreement[role] = undefined;
        continue;
      }
      let max = 0;
      for (const i of indexes) {
        const c = helpers[i]?.counts[role];
        if (c !== undefined && c > max) max = c;
      }
      agreement[role] = max / n;
    }
    const clarityValues: Cell[] = indexes.map((i) => rows[i]?.clarity);
    const clarityMean = average(clarityValues.filter(isNumber));
    return {
      decisionTypeId: type.id,
      name: type.name,
      n,
      agreement,
      mean: average(RAPID_ROLES.map((role) => agreement[role])),
      clarity: clarityMean === undefined ? undefined : convertMean(clarityMean),
    };
  });

  const aggregateAgreement = average(decisions.map((d) => d.mean));
  const aggregateClarity = average(decisions.map((d) => d.clarity));
  const responseRate =
    headcount === undefined || headcount === 0 ? undefined : seen.size / headcount;
  const score =
    aggregateAgreement === undefined || aggregateClarity === undefined
      ? undefined
      : LT_WEIGHTS.agreement * (aggregateAgreement * 100) + LT_WEIGHTS.clarity * aggregateClarity;
  return {
    rows: helpers,
    decisions,
    aggregateAgreement,
    aggregateClarity,
    distinctRespondents: seen.size,
    responseRate,
    rateFlag:
      responseRate === undefined
        ? undefined
        : lt(responseRate, THRESHOLDS.leadership)
          ? "LOW leadership response"
          : "ok",
    score,
  };
}
