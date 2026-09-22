/**
 * Composite Scoring rows 6 to 32: availability, archetype weights and their reallocation, the
 * C, M and O composites, S_internal with its default, the Synergy coefficient and P.
 */

import {
  ARCHETYPE_WEIGHTS,
  COMPONENT_OF,
  EXPONENTS,
  SYNERGY_FLOOR,
  SYNERGY_INTERNAL_DEFAULT,
  SYNERGY_RANGE,
} from "./constants";
import { isNumber, type Cell } from "./excel";
import {
  ARCHETYPES,
  SUB_DIMENSION_CODES,
  type Archetype,
  type ComponentKey,
  type ComponentScores,
  type SubDimensionCode,
} from "./types";

/** Thrown when an archetype other than Default is requested (DECISIONS.md Section 3). */
export class DisabledArchetypeError extends Error {
  readonly archetype: string;
  constructor(archetype: string) {
    const known = ARCHETYPES.includes(archetype as Archetype);
    super(
      known
        ? `The "${archetype}" archetype is disabled until its weight set is rebalanced at source; only Default is enabled.`
        : `Unknown archetype "${archetype}".`,
    );
    this.name = "DisabledArchetypeError";
    this.archetype = archetype;
  }
}

/** Composite Scoring column C: the weight column for the archetype. */
export function archetypeWeights(archetype: Archetype): Record<SubDimensionCode, number> {
  const entry = ARCHETYPE_WEIGHTS[archetype] as (typeof ARCHETYPE_WEIGHTS)[Archetype] | undefined;
  if (entry === undefined || !entry.enabled) throw new DisabledArchetypeError(archetype);
  return entry.weights;
}

export interface CompositeResult extends ComponentScores {
  /** Column C. */
  weights: Record<SubDimensionCode, number>;
  /** Column D as a boolean. */
  available: Record<SubDimensionCode, boolean>;
  /** Ranking block column L: C × D / SUM(F) for the component, 0 when SUM(F) is 0. */
  normalisedWeights: Record<SubDimensionCode, number>;
}

/** B31: MAX(floor, MIN(floor + range, floor + S_internal / 100 × range)). */
export function synergyCoefficient(sInternal: number): number {
  return Math.max(
    SYNERGY_FLOOR,
    Math.min(SYNERGY_FLOOR + SYNERGY_RANGE, SYNERGY_FLOOR + (sInternal / 100) * SYNERGY_RANGE),
  );
}

/** B32: S × (C^α × M^β × O^γ), blank unless all four are numeric. Never the equal-weighted form. */
export function pScore(C: Cell, M: Cell, O: Cell, S: Cell): Cell {
  if (!isNumber(C) || !isNumber(M) || !isNumber(O) || !isNumber(S)) return undefined;
  return S * (Math.pow(C, EXPONENTS.C) * Math.pow(M, EXPONENTS.M) * Math.pow(O, EXPONENTS.O));
}

/**
 * The composite block. For each component, in sheet order: E = score × weight where available,
 * F = weight where available; component = SUM(E) / SUM(F), blank when SUM(F) is 0, except that
 * S_internal defaults to 50 (B30). Workbook Spec Part 10; Measurement Reference 9.2 and 9.3.
 */
export function compositeScores(
  scores: Record<SubDimensionCode, Cell>,
  archetype: Archetype,
): CompositeResult {
  const weights = archetypeWeights(archetype);
  const available = {} as Record<SubDimensionCode, boolean>;
  const sumE: Record<ComponentKey, number> = { C: 0, M: 0, O: 0, S: 0 };
  const sumF: Record<ComponentKey, number> = { C: 0, M: 0, O: 0, S: 0 };
  for (const code of SUB_DIMENSION_CODES) {
    const score = scores[code];
    const component = COMPONENT_OF[code];
    const isAvailable = isNumber(score);
    available[code] = isAvailable;
    // E: IF(ISNUMBER(B), B*C, 0); F: C*D
    sumE[component] += isAvailable ? score * weights[code] : 0;
    sumF[component] += weights[code] * (isAvailable ? 1 : 0);
  }
  const normalisedWeights = {} as Record<SubDimensionCode, number>;
  for (const code of SUB_DIMENSION_CODES) {
    const component = COMPONENT_OF[code];
    normalisedWeights[code] =
      sumF[component] === 0 ? 0 : (weights[code] * (available[code] ? 1 : 0)) / sumF[component];
  }
  const composite = (component: "C" | "M" | "O"): Cell =>
    sumF[component] === 0 ? undefined : sumE[component] / sumF[component];
  const C = composite("C");
  const M = composite("M");
  const O = composite("O");
  const sInternal = sumF.S === 0 ? SYNERGY_INTERNAL_DEFAULT : sumE.S / sumF.S;
  const S = synergyCoefficient(sInternal);
  return {
    C,
    M,
    O,
    sInternal,
    S,
    P: pScore(C, M, O, S),
    weightSums: { ...sumF },
    weights,
    available,
    normalisedWeights,
  };
}
