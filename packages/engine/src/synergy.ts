/**
 * Synergy Inputs sheet: S1 to S3, the telemetry bands, the S2 blend and gap, and the
 * false-consensus flag.
 */

import {
  FALSE_CONSENSUS,
  FALSE_CONSENSUS_FLAG,
  GAP_THRESHOLD,
  S1_WEIGHTS,
  S2_BLEND,
  S2_GAP_FLAG,
  S2_TELEMETRY_BANDS,
} from "./constants";
import { average, count, gt, isNumber, lt, type Cell } from "./excel";
import { convertMean, scoreItems } from "./survey";
import {
  TSI2_ITEMS,
  TSI3_ITEMS,
  type ItemMeans,
  type S1Inputs,
  type TelemetryInputs,
  type Tsi2Item,
  type Tsi3Item,
} from "./types";

/** Synergy Inputs D23. */
export function perceptionS2(items: ItemMeans<Tsi2Item> | undefined): Cell {
  return scoreItems(TSI2_ITEMS, items);
}

/** Synergy Inputs D36. */
export function scoreS3(items: ItemMeans<Tsi3Item> | undefined): Cell {
  return scoreItems(TSI3_ITEMS, items);
}

// ---------------------------------------------------------------------------------------------
// S2 telemetry (Type B): B12:C16
// ---------------------------------------------------------------------------------------------

/** One telemetry indicator converted through its bands; blank when the raw value is blank. Raw-input comparisons. */
function bandTelemetry(
  raw: Cell,
  bands: readonly (readonly [number, number])[],
  floor: number,
): Cell {
  if (!isNumber(raw)) return undefined;
  for (const [upperExclusive, score] of bands) if (raw < upperExclusive) return score;
  return floor;
}

export type TelemetryConverted = Record<keyof TelemetryInputs, Cell>;

/** C12:C15. Measurement Reference 5.2. */
export function convertTelemetry(telemetry: TelemetryInputs | undefined): TelemetryConverted {
  const b = S2_TELEMETRY_BANDS;
  return {
    meetingHoursPerIc: bandTelemetry(
      telemetry?.meetingHoursPerIc,
      b.meetingHoursPerIc,
      b.meetingHoursPerIcFloor,
    ),
    meetingHoursPerManager: bandTelemetry(
      telemetry?.meetingHoursPerManager,
      b.meetingHoursPerManager,
      b.meetingHoursPerManagerFloor,
    ),
    fragmentedTimeRatio: bandTelemetry(
      telemetry?.fragmentedTimeRatio,
      b.fragmentedTimeRatio,
      b.fragmentedTimeRatioFloor,
    ),
    afterHoursHours: bandTelemetry(
      telemetry?.afterHoursHours,
      b.afterHoursHours,
      b.afterHoursHoursFloor,
    ),
  };
}

/** C16: AVERAGE of the converted indicators, blank when none is numeric. */
export function behaviouralCompositeS2(converted: TelemetryConverted): Cell {
  const values = [
    converted.meetingHoursPerIc,
    converted.meetingHoursPerManager,
    converted.fragmentedTimeRatio,
    converted.afterHoursHours,
  ];
  return count(values) === 0 ? undefined : average(values);
}

// ---------------------------------------------------------------------------------------------
// S1 (Type C components), the S2 blend and gap, the false-consensus flag
// ---------------------------------------------------------------------------------------------

/** D8: 0.40 breadth + 0.35 depth + 0.25 distribution; blank unless all three are numeric. Measurement Reference 5.1. */
export function scoreS1(inputs: S1Inputs | undefined): Cell {
  const { coverageBreadth: breadth, coverageDepth: depth, distribution } = inputs ?? {};
  if (!isNumber(breadth) || !isNumber(depth) || !isNumber(distribution)) return undefined;
  return (
    S1_WEIGHTS.breadth * breadth + S1_WEIGHTS.depth * depth + S1_WEIGHTS.distribution * distribution
  );
}

export interface S2CombinedResult {
  /** D24: composite − perception, blank unless both are numeric. */
  gap: Cell;
  /** D25: |gap| above 15. */
  gapFlag: string;
  /** D26: 0.5 composite + 0.5 perception where both exist, else whichever exists, else blank. */
  score: Cell;
}

/** Measurement Reference 5.2 and 8.2 as the workbook applies them to S2. */
export function combineS2(behaviouralComposite: Cell, perception: Cell): S2CombinedResult {
  const both = isNumber(behaviouralComposite) && isNumber(perception);
  const gap = both ? behaviouralComposite - perception : undefined;
  const gapFlag = isNumber(gap) && gt(Math.abs(gap), GAP_THRESHOLD) ? S2_GAP_FLAG : "";
  let score: Cell;
  if (both) score = S2_BLEND * behaviouralComposite + S2_BLEND * perception;
  else if (isNumber(perception)) score = perception;
  else if (isNumber(behaviouralComposite)) score = behaviouralComposite;
  return { gap, gapFlag, score };
}

/**
 * D37: fires when TSI3-01 and TSI3-02, each converted from their raw means, are below 60 and M2 is
 * above 75. All three must be measured. Measurement Reference 8.3.
 */
export function falseConsensusFlag(tsi01Mean: Cell, tsi02Mean: Cell, m2Score: Cell): string {
  if (!isNumber(tsi01Mean) || !isNumber(tsi02Mean) || !isNumber(m2Score)) return "";
  const fires =
    lt(convertMean(tsi01Mean), FALSE_CONSENSUS.taskConflictBelow) &&
    lt(convertMean(tsi02Mean), FALSE_CONSENSUS.taskConflictBelow) &&
    gt(m2Score, FALSE_CONSENSUS.safetyAbove);
  return fires ? FALSE_CONSENSUS_FLAG : "";
}
