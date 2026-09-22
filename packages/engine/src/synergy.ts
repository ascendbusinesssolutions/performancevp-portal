/**
 * Synergy Inputs sheet: S2 perception, S3 and the telemetry bands. S1, the S2 blend and the
 * false-consensus flag follow in step 4.
 */

import { S2_TELEMETRY_BANDS } from "./constants";
import { average, count, isNumber, type Cell } from "./excel";
import { scoreItems } from "./survey";
import {
  TSI2_ITEMS,
  TSI3_ITEMS,
  type ItemMeans,
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
