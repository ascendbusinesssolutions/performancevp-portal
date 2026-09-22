/**
 * DLP sheet (rows 5 to 47 and B49:E52) and Report Data C76:D84. Kept so the engine remains a
 * formula-for-formula mirror of the workbook; the online product supplies no decisions, so every
 * output here is blank there. Measurement Reference Part 6; Workbook Spec Part 8.
 */

import { DLP_CLASS_WEIGHTS, DLP_MINIMUM_SAMPLE, DLP_NORMS } from "./constants";
import { average, count, isNumber, type Cell } from "./excel";
import type { DecisionClass, DecisionInput, DlpClassResult, DlpResult } from "./types";

const CLASSES: readonly DecisionClass[] = ["Operational", "Tactical", "Strategic"];
const LONGEST = 5;

/**
 * DLP D: 100 at or below p25; linear to 75 at p50, 50 at p75, 25 at p90; beyond p90,
 * MAX(0, 25 − (latency − p90) / p90 × 25). Blank when the latency is blank or the class unknown.
 * Comparisons are on raw inputs against the norm constants.
 */
export function latencyScore(decisionClass: DecisionClass | undefined, latencyDays: Cell): Cell {
  if (!isNumber(latencyDays)) return undefined;
  if (decisionClass === undefined || !(decisionClass in DLP_NORMS)) return undefined;
  const [p25, p50, p75, p90] = DLP_NORMS[decisionClass];
  if (latencyDays <= p25) return 100;
  if (latencyDays <= p50) return 100 - ((latencyDays - p25) / (p50 - p25)) * 25;
  if (latencyDays <= p75) return 75 - ((latencyDays - p50) / (p75 - p50)) * 25;
  if (latencyDays <= p90) return 50 - ((latencyDays - p75) / (p90 - p75)) * 25;
  return Math.max(0, 25 - ((latencyDays - p90) / p90) * 25);
}

/** B49:E51 for one class: AVERAGEIF over the class's numeric scores, COUNTIF of the class, and the minimum-sample warning. */
export function classResult(
  decisions: readonly DecisionInput[],
  scores: readonly Cell[],
  decisionClass: DecisionClass,
): DlpClassResult {
  const matching: Cell[] = [];
  let sample = 0;
  decisions.forEach((d, i) => {
    if (d.class === decisionClass) {
      sample += 1;
      matching.push(scores[i]);
    }
  });
  const dls = count(matching) === 0 ? undefined : average(matching);
  const minimum = DLP_MINIMUM_SAMPLE[decisionClass];
  return { dls, sample, warning: sample < minimum ? `BELOW MIN (${minimum})` : "" };
}

/** The whole DLP block plus the Report Data decision-latency detail. */
export function scoreDlp(decisions: readonly DecisionInput[] | undefined): DlpResult {
  const rows = decisions ?? [];
  const scores = rows.map((d) => latencyScore(d.class, d.latencyDays));
  const [operational, tactical, strategic] = CLASSES.map((c) => classResult(rows, scores, c)) as [
    DlpClassResult,
    DlpClassResult,
    DlpClassResult,
  ];
  // B52: IFERROR(w_op * B49 + w_tac * B50 + w_st * B51, ""): text in arithmetic errors, so blank unless all three exist.
  const overall =
    isNumber(operational.dls) && isNumber(tactical.dls) && isNumber(strategic.dls)
      ? DLP_CLASS_WEIGHTS.Operational * operational.dls +
        DLP_CLASS_WEIGHTS.Tactical * tactical.dls +
        DLP_CLASS_WEIGHTS.Strategic * strategic.dls
      : undefined;
  // Report Data C76: COUNT(DLP!C5:C47)
  const latencies = rows.map((d) => d.latencyDays);
  const sampleN = count(latencies);
  // Report Data B80:D84: LARGE(latency, k) with MATCH to the first row holding it; blank rows past the count.
  const sorted = latencies.filter(isNumber).sort((a, b) => b - a);
  const longestFive: DlpResult["longestFive"] = [];
  for (let k = 0; k < LONGEST; k += 1) {
    const target = sorted[k];
    if (target === undefined) {
      longestFive.push({ class: "", description: "", latencyDays: undefined });
      continue;
    }
    const index = latencies.findIndex((v) => isNumber(v) && v === target);
    const row = rows[index];
    longestFive.push({
      class: row?.class ?? "",
      // C: IF(INDEX(G, ...) = 0, "", INDEX(G, ...)): a blank description reads as 0, so blank.
      description: row?.description ?? "",
      latencyDays: target,
    });
  }
  return {
    decisions: scores.map((latencyScoreValue) => ({ latencyScore: latencyScoreValue })),
    operational,
    tactical,
    strategic,
    overall,
    sampleN,
    longestFive,
  };
}
