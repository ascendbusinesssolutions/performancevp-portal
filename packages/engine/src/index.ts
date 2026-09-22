/**
 * @performancevp/engine
 *
 * The Performance Equation calculation engine: a pure, formula-for-formula mirror of the
 * Diagnostic Workbook. It performs no IO, reads no clock and imports nothing outside itself.
 *
 * Authority: docs/ENGINE_SPEC.md; the Diagnostic Workbook Spec, Cadence Master and
 * Measurement Reference in docs/source-ip/; the workbook and fixtures in docs/benchmarks/.
 * Every constant is in constants.ts, annotated with its cell and its document section.
 */

import { evaluateWorkbook } from "./evaluate";
import { isNumber } from "./excel";
import type { SubDimensionCode, UnitMeasurementInput, UnitMeasurementResult } from "./types";

export * from "./types";
export * as constants from "./constants";
export { DisabledArchetypeError } from "./composite";
export type { Overrides } from "./evaluate";

/** Recorded on every stored calculation run. Moves to 1.0.0 when the Milestone 1 exit criteria are met. */
export const ENGINE_VERSION = "0.0.0";

/** The whole workbook for one unit and one cycle. */
export function calculateUnit(input: UnitMeasurementInput): UnitMeasurementResult {
  return evaluateWorkbook(input);
}

export interface ProjectionResult {
  /** The sub-dimension substituted and the score assumed for it. */
  code: SubDimensionCode;
  assumedScore: number;
  baseline: UnitMeasurementResult;
  projected: UnitMeasurementResult;
  /** Projected less baseline; blank where either side is blank. */
  delta: {
    C: number | undefined;
    M: number | undefined;
    O: number | undefined;
    S: number;
    P: number | undefined;
  };
  bindingConstraintChanges: boolean;
}

/**
 * Recomputes the unit with one sub-dimension's score replaced, as the what-if simulator and the
 * recommendations package need (Online Recommendations Specification 4.2 and 5.1). An unchanged
 * score returns the baseline exactly. Any of the seventeen codes is accepted.
 */
export function projectImpact(
  baseline: UnitMeasurementInput,
  code: SubDimensionCode,
  assumedScore: number,
): ProjectionResult {
  const before = evaluateWorkbook(baseline);
  const after = evaluateWorkbook(baseline, { scores: { [code]: assumedScore } });
  const diff = (a: number | undefined, b: number | undefined): number | undefined =>
    isNumber(a) && isNumber(b) ? b - a : undefined;
  return {
    code,
    assumedScore,
    baseline: before,
    projected: after,
    delta: {
      C: diff(before.components.C, after.components.C),
      M: diff(before.components.M, after.components.M),
      O: diff(before.components.O, after.components.O),
      S: after.components.S - before.components.S,
      P: diff(before.components.P, after.components.P),
    },
    bindingConstraintChanges: before.ranking.topSix[0]?.label !== after.ranking.topSix[0]?.label,
  };
}
