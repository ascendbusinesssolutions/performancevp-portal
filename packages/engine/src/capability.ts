/**
 * Capability Inputs sheet: C1 to C5. Routing on the tier selector (D15, D63) is in routes.ts.
 */

import {
  C1_TENURE,
  C2_COVERAGE_CHECK,
  C2_COVERAGE_TEXT,
  C3_BAND_WEIGHTS,
  C4_WEIGHTS,
  C5_BLEND,
  CII_GROUPS,
} from "./constants";
import { average, count, isNumber, sum, type Cell } from "./excel";
import { scoreItems } from "./survey";
import type {
  C3Inputs,
  C5Inputs,
  CiiItem,
  ItemMeans,
  KnowledgeDomainInput,
  KnowledgeDomainResult,
  RoleFamilyInput,
  RoleFamilyResult,
} from "./types";

// ---------------------------------------------------------------------------------------------
// C1 Skill (Type B): rows 7 to 9, D10:D12
// ---------------------------------------------------------------------------------------------

/** One role-family row: E (coverage ratio, capped at 1), F (family score), G (_FTEvalid), H (_contrib). */
export function scoreRoleFamily(row: RoleFamilyInput): RoleFamilyResult {
  const { fte, skillsRequired, confirmedProficiencies } = row;
  // E: IFERROR(MIN(D/(B*C),1),""). Excel arithmetic reads a blank as 0, so only a zero
  // denominator gives the blank; a blank D gives 0. Display only: D12 reads G and H.
  const denominator = (fte ?? 0) * (skillsRequired ?? 0);
  const coverageRatio: Cell =
    denominator === 0 ? undefined : Math.min((confirmedProficiencies ?? 0) / denominator, 1);
  // F: IFERROR(E*100,"")
  const familyScore = isNumber(coverageRatio) ? coverageRatio * 100 : undefined;
  // G: IF(AND(ISNUMBER(B),ISNUMBER(C),ISNUMBER(D),C>0),B,0)
  const fteValid =
    isNumber(fte) &&
    isNumber(skillsRequired) &&
    isNumber(confirmedProficiencies) &&
    skillsRequired > 0
      ? fte
      : 0;
  // H: IF(G>0,MIN(D/(B*C),1)*100*B,0)
  const contribution =
    fteValid > 0 && isNumber(coverageRatio) ? coverageRatio * 100 * (fte as number) : 0;
  return { coverageRatio, familyScore, fteValid, contribution };
}

/** D11: 0.95 below 18 months, 1.05 above 96 months, otherwise 1; 1 when tenure is blank. Raw input comparison. */
export function tenureModerator(medianTenureMonths: Cell): number {
  if (!isNumber(medianTenureMonths)) return C1_TENURE.neutralFactor;
  if (medianTenureMonths < C1_TENURE.juniorBelowMonths) return C1_TENURE.juniorFactor;
  if (medianTenureMonths > C1_TENURE.experiencedAboveMonths) return C1_TENURE.experiencedFactor;
  return C1_TENURE.neutralFactor;
}

export interface C1TableResult {
  families: RoleFamilyResult[];
  tenureModerator: number;
  /** D12: FTE-weighted family scores times the moderator; blank when no family is valid. */
  tier12Score: Cell;
}

/** The Tier 1/2 route: the family table, FTE-weighted, times the tenure moderator. Measurement Reference 2.1. */
export function scoreC1Table(
  families: readonly RoleFamilyInput[] | undefined,
  medianTenureMonths: Cell,
): C1TableResult {
  const rows = (families ?? []).map(scoreRoleFamily);
  const moderator = tenureModerator(medianTenureMonths);
  const fteTotal = sum(rows.map((r) => r.fteValid));
  const tier12Score =
    fteTotal === 0 ? undefined : (sum(rows.map((r) => r.contribution)) / fteTotal) * moderator;
  return { families: rows, tenureModerator: moderator, tier12Score };
}

// ---------------------------------------------------------------------------------------------
// C2 Knowledge (Type B): rows 19 to 22, D23:D24
// ---------------------------------------------------------------------------------------------

/** One domain row: E (coverage-adjusted), F (_critvalid), G (_weighted). */
export function scoreKnowledgeDomain(row: KnowledgeDomainInput): KnowledgeDomainResult {
  const { criticality, meanScore, coverage } = row;
  const allNumeric = isNumber(criticality) && isNumber(meanScore) && isNumber(coverage);
  // E: IFERROR(C*D,""). A blank reads as 0 in Excel arithmetic, so the cell is 0, never blank.
  const coverageAdjusted: Cell = (meanScore ?? 0) * (coverage ?? 0);
  const criticalityValid = allNumeric ? (criticality as number) : 0;
  const weighted =
    criticalityValid > 0 ? (meanScore as number) * (coverage as number) * criticalityValid : 0;
  return { coverageAdjusted, criticalityValid, weighted };
}

export interface C2Result {
  domains: KnowledgeDomainResult[];
  /** D23: at least one criticality-3 domain with coverage at or above 0.6. A flag, not a gate. */
  coverageCheck: "OK" | "INSUFFICIENT COVERAGE";
  /** D24: criticality-weighted, coverage-adjusted mean; blank when no domain is valid. */
  score: Cell;
}

/** Measurement Reference 2.2. The score computes whatever the coverage check says; gating is the intake's job. */
export function scoreC2(domains: readonly KnowledgeDomainInput[] | undefined): C2Result {
  const inputs = domains ?? [];
  const rows = inputs.map(scoreKnowledgeDomain);
  // D23: SUMPRODUCT(--(B=3),--(D>=0.6))>=1, on raw inputs
  const criticalCovered = inputs.filter(
    (d) =>
      d.criticality === C2_COVERAGE_CHECK.criticality &&
      isNumber(d.coverage) &&
      d.coverage >= C2_COVERAGE_CHECK.minimumCoverage,
  ).length;
  const coverageCheck = criticalCovered >= 1 ? C2_COVERAGE_TEXT.ok : C2_COVERAGE_TEXT.insufficient;
  const validTotal = sum(rows.map((r) => r.criticalityValid));
  const score = validTotal === 0 ? undefined : sum(rows.map((r) => r.weighted)) / validTotal;
  return { domains: rows, coverageCheck, score };
}

// ---------------------------------------------------------------------------------------------
// C3 Talent density (Type B): B28:D33
// ---------------------------------------------------------------------------------------------

const C3_BANDS = ["band5", "band4", "band3", "band2", "band1"] as const;

export interface C3Result {
  /** D28:D32: each band's share of the counted total; blank when the total is 0. */
  bandShares: Record<(typeof C3_BANDS)[number], Cell>;
  /** D33: SUMPRODUCT(counts, weights) / SUM(counts); blank when the total is 0. */
  score: Cell;
}

/** Measurement Reference 2.3: 100 / 80 / 60 / 35 / 0. Counts are the Type B input; no cap is applied here. */
export function scoreC3(counts: C3Inputs | undefined): C3Result {
  const values = C3_BANDS.map((band) => counts?.[band]);
  const total = sum(values);
  const bandShares = {} as Record<(typeof C3_BANDS)[number], Cell>;
  // D28:D32: IFERROR(B/SUM(B28:B32),""). A blank count reads as 0 over a non-zero total.
  C3_BANDS.forEach((band, i) => {
    bandShares[band] = total === 0 ? undefined : (values[i] ?? 0) / total;
  });
  if (total === 0) return { bandShares, score: undefined };
  let weightedSum = 0;
  C3_BANDS.forEach((band, i) => {
    const v = values[i];
    if (isNumber(v)) weightedSum += v * C3_BAND_WEIGHTS[band];
  });
  return { bandShares, score: weightedSum / total };
}

// ---------------------------------------------------------------------------------------------
// C4 Collective intelligence (Type A): B37:D56
// ---------------------------------------------------------------------------------------------

export interface C4Result {
  /** Capability Inputs B53. */
  clarity: Cell;
  /** B54. */
  trust: Cell;
  /** B55. */
  flow: Cell;
  /** D56: 0.35 Clarity + 0.35 Trust + 0.30 Flow, blank when any sub-construct is blank. */
  score: Cell;
}

/** The team-level composite of the three sub-constructs (Capability Inputs D56; Measurement Reference 2.4). */
export function composeC4(clarity: Cell, trust: Cell, flow: Cell): Cell {
  if (!isNumber(clarity) || !isNumber(trust) || !isNumber(flow)) return undefined;
  return C4_WEIGHTS.clarity * clarity + C4_WEIGHTS.trust * trust + C4_WEIGHTS.flow * flow;
}

/** C4 from the fifteen CII item means: three sub-construct scores, then the weighted composite. */
export function scoreC4(items: ItemMeans<CiiItem> | undefined): C4Result {
  const clarity = scoreItems(CII_GROUPS.clarity, items);
  const trust = scoreItems(CII_GROUPS.trust, items);
  const flow = scoreItems(CII_GROUPS.flow, items);
  return { clarity, trust, flow, score: composeC4(clarity, trust, flow) };
}

// ---------------------------------------------------------------------------------------------
// C5 Learning velocity: B59:B62 (the D63 route selection is in routes.ts)
// ---------------------------------------------------------------------------------------------

/** AVERAGE(B59:B61), blank when no indicator is numeric. */
export function c5IndicatorMean(inputs: C5Inputs | undefined): Cell {
  const indicators = [inputs?.timeToCompetence, inputs?.adoption, inputs?.cycleImprovement];
  return count(indicators) === 0 ? undefined : average(indicators);
}

/**
 * The non-Tier-3 branch of D63: indicators and module blend 0.6/0.4 when both exist, else the
 * indicators mean, else the module score, else blank. Measurement Reference 2.5.
 */
export function scoreC5Blend(inputs: C5Inputs | undefined): Cell {
  const indicators = c5IndicatorMean(inputs);
  const moduleScore = inputs?.moduleScore;
  if (isNumber(moduleScore) && isNumber(indicators)) {
    return indicators * C5_BLEND.indicators + moduleScore * C5_BLEND.module;
  }
  if (isNumber(indicators)) return indicators;
  return isNumber(moduleScore) ? moduleScore : undefined;
}
