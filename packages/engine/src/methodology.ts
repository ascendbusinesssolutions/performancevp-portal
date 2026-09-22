/**
 * Methodology Footer and the Report Data cells that are strings rather than scores. Every value
 * is the workbook's text, verbatim, so the deliverable contract (Workbook Spec Part 14A) holds.
 */

import {
  CRITICAL_FINDINGS,
  DLS_CRITICAL_THRESHOLD,
  EXCLUSIONS,
  GAP_FLAG_NONE,
  INTERNAL_COMPARISON_TEXT,
  NON_STANDARD_NONE,
  TRIP_WIRE_NAMES,
} from "./constants";
import { isNumber, lt, type Cell } from "./excel";
import { TRIP_WIRE_CODES, type TripWireCode, type TripWireResult } from "./types";

/** Methodology Footer C5: client & " - " & unit; a blank name leaves its side empty. */
export function clientUnit(clientName: string | undefined, unitName: string | undefined): string {
  return `${clientName ?? ""} - ${unitName ?? ""}`;
}

/** Methodology Footer C17:C22: "none" where the flag cell is blank, else the flag. */
export function gapFlagText(flag: string): string {
  return flag === "" ? GAP_FLAG_NONE : flag;
}

/**
 * Methodology Footer C24 (and Report Data C73): the trip-wire fragments in order, then the DLS
 * fragment, joined; "No critical findings identified" when empty; otherwise LEFT(text, LEN − 2)
 * to drop the trailing separator.
 */
export function criticalFindings(
  tripWires: Record<TripWireCode, TripWireResult>,
  overallDls: Cell,
): string {
  let text = "";
  for (const code of TRIP_WIRE_CODES) {
    const { score, flag } = tripWires[code];
    const name = TRIP_WIRE_NAMES[code];
    if (flag !== "") text += CRITICAL_FINDINGS.breached(name);
    else if (!isNumber(score)) text += CRITICAL_FINDINGS.notMeasured(name);
  }
  if (isNumber(overallDls) && lt(overallDls, DLS_CRITICAL_THRESHOLD)) {
    text += CRITICAL_FINDINGS.decisionLatency;
  }
  if (text === "") return CRITICAL_FINDINGS.none;
  return text.slice(0, text.length - 2);
}

/** Methodology Footer C25 and Sector Classification C14. */
export function internalComparison(): string {
  return INTERNAL_COMPARISON_TEXT;
}

/** Methodology Footer C41: COUNTIF(Composite Scoring D6:D25, 0) over the seventeen sub-dimensions. */
export function exclusionsSummary(unavailable: number): string {
  return unavailable === 0 ? EXCLUSIONS.none : EXCLUSIONS.some(unavailable);
}

/** Methodology Footer C43. */
export function nonStandardDefinitions(text: string | undefined): string {
  return text === undefined || text === "" ? NON_STANDARD_NONE : text;
}

/** Methodology Footer C29:C39: IF(cell = "", "", cell). */
export function responseRate(value: Cell): Cell {
  return isNumber(value) ? value : undefined;
}
