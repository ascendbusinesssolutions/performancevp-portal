/**
 * Composite Scoring H5:S18 (the hidden ranking block), the top-six table (A36:F41), the binding
 * component (B44), the binding-constraint statement (B45), the trip-wire override (B46) and the
 * S and P range checks (B49, B50). Workbook Spec Part 10; DECISIONS.md 1.2.
 */

import {
  COMPONENT_NAMES,
  COMPONENT_OF,
  EXPONENTS,
  RANKING,
  RANKING_ROW,
  STATEMENT_LEAD,
  STATEMENT_TAIL,
  SUB_DIMENSION_LABELS,
  SYNERGY_FLOOR,
  SYNERGY_RANGE,
  TIEBREAK_DIVISOR,
  TRIP_WIRE_OVERRIDE_NOTE,
  VALIDATION,
} from "./constants";
import {
  DIV0,
  average,
  ge,
  indexOfKthLargest,
  isExcelError,
  isNumber,
  le,
  type Cell,
} from "./excel";
import {
  RANKED_CODES,
  TRIP_WIRE_CODES,
  type ComponentName,
  type ExcelError,
  type PriorityRow,
  type RankedCode,
  type RankingResult,
  type TopSixRow,
  type TripWireCode,
} from "./types";

export interface RankingInput {
  /** K: the fourteen sub-dimension scores. */
  scores: Record<RankedCode, Cell>;
  /** L: the reallocated within-component weights. */
  normalisedWeights: Record<RankedCode, number>;
  /** M: the component composites. */
  components: { C: Cell; M: Cell; O: Cell };
  /** B32. */
  P: Cell;
  /** Motivation Inputs D52:D54, for the override note. */
  tripWireFlags: Record<TripWireCode, string>;
}

const TOP_SIX = 6;

/** The fourteen rows of the hidden block, in sheet order. */
export function priorityRows(input: RankingInput): PriorityRow[] {
  const scoreList = RANKED_CODES.map((code) => input.scores[code]);
  // AVERAGE($K$5:$K$18) ignores the blank rows.
  const unitMean = average(scoreList);
  return RANKED_CODES.map((code) => {
    const component = COMPONENT_OF[code] as "C" | "M" | "O";
    const score = input.scores[code];
    const normalisedWeight = input.normalisedWeights[code];
    const componentScore = input.components[component];
    const exponent = EXPONENTS[component];
    const hasScore = isNumber(score);
    // O: IF(ISNUMBER(K), rho * MAX(0, S_cap - K), "")
    const deltaS = hasScore ? RANKING.rho * Math.max(0, RANKING.sCap - score) : undefined;
    // P: IF(AND(ISNUMBER(K), ISNUMBER(B32)), B32 * ((1 + L * O / M) ^ N - 1), "")
    let deltaP: number | ExcelError | undefined;
    if (hasScore && isNumber(input.P) && isNumber(deltaS)) {
      if (!isNumber(componentScore) || componentScore === 0) deltaP = DIV0;
      else
        deltaP =
          input.P * (Math.pow(1 + (normalisedWeight * deltaS) / componentScore, exponent) - 1);
    }
    // Q: IF(ISNUMBER(K), 1 / (1 + EXP((K - unitMean) / tau)), "")
    const rel =
      hasScore && isNumber(unitMean)
        ? 1 / (1 + Math.exp((score - unitMean) / RANKING.tau))
        : undefined;
    // R: IF(AND(ISNUMBER(K), ISNUMBER(P)), P * Q, "")
    const priority = hasScore && isNumber(deltaP) && isNumber(rel) ? deltaP * rel : undefined;
    // S: IF(ISNUMBER(R), R - ROW() / 1000000, "")
    const sortKey = isNumber(priority)
      ? priority - RANKING_ROW[code] / TIEBREAK_DIVISOR
      : undefined;
    return {
      code,
      component: COMPONENT_NAMES[component],
      label: SUB_DIMENSION_LABELS[code],
      score,
      normalisedWeight,
      componentScore,
      exponent,
      deltaS,
      deltaP,
      rel,
      priority,
      sortKey,
    };
  });
}

/** A36:F41: LARGE over the sort key, then INDEX/MATCH into each column; blank rows where LARGE errors. */
export function topSix(rows: readonly PriorityRow[]): TopSixRow[] {
  const keys = rows.map((r) => r.sortKey);
  const out: TopSixRow[] = [];
  for (let rank = 1; rank <= TOP_SIX; rank += 1) {
    const index = indexOfKthLargest(keys, rank);
    const row = index === undefined ? undefined : rows[index];
    if (row === undefined) {
      out.push({
        rank,
        component: "",
        label: "",
        rawScore: undefined,
        realisticPGain: undefined,
        priority: undefined,
      });
      continue;
    }
    out.push({
      rank,
      component: row.component,
      label: row.label,
      rawScore: row.score,
      // E: IFERROR(INDEX(P, ...), "") gives blank where the P cell holds an error.
      realisticPGain: isExcelError(row.deltaP) ? undefined : row.deltaP,
      priority: row.priority,
    });
  }
  return out;
}

/** B44: the lowest of C, M and O with ties resolving C, then M, then O, under Excel's comparison rule. */
export function bindingComponent(C: Cell, M: Cell, O: Cell): ComponentName | "" {
  if (!isNumber(C) || !isNumber(M) || !isNumber(O)) return "";
  if (le(C, M)) return le(C, O) ? "Capability" : le(M, O) ? "Motivation" : "Opportunity";
  return le(M, O) ? "Motivation" : "Opportunity";
}

/** B45, verbatim. */
export function bindingStatement(topLabel: string, binding: ComponentName | ""): string {
  if (topLabel === "") return "";
  return `${topLabel}${STATEMENT_LEAD}${binding === "" ? "" : `; ${binding}${STATEMENT_TAIL}`}`;
}

/** B46. */
export function tripWireOverride(flags: Record<TripWireCode, string>): string {
  return TRIP_WIRE_CODES.some((code) => flags[code] !== "") ? TRIP_WIRE_OVERRIDE_NOTE : "";
}

export function rankSubDimensions(input: RankingInput): RankingResult {
  const rows = priorityRows(input);
  const six = topSix(rows);
  const binding = bindingComponent(input.components.C, input.components.M, input.components.O);
  return {
    rows,
    topSix: six,
    bindingComponent: binding,
    statement: bindingStatement(six[0]?.label ?? "", binding),
    tripWireOverride: tripWireOverride(input.tripWireFlags),
  };
}

/** B49: S within 0.85 and 1.15. */
export function sRangeCheck(S: Cell): string {
  if (!isNumber(S)) return "";
  return ge(S, SYNERGY_FLOOR) && le(S, SYNERGY_FLOOR + SYNERGY_RANGE)
    ? VALIDATION.ok
    : VALIDATION.sOutOfRange;
}

/** B50: P typically 45 to 80, a warning only. */
export function pTypicalCheck(P: Cell): string {
  if (!isNumber(P)) return "";
  return ge(P, VALIDATION.pTypicalMin) && le(P, VALIDATION.pTypicalMax)
    ? VALIDATION.ok
    : VALIDATION.pOutsideTypical;
}
