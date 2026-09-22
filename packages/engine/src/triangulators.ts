/**
 * Behavioural Triangulators sheet: the behavioural composite and the M1 survey-behavioural gap.
 * The online product supplies no triangulators, so these are blank there and the flag never fires.
 */

import { GAP_THRESHOLD, M1_GAP_FLAG } from "./constants";
import { average, count, gt, isNumber, type Cell } from "./excel";
import type { TriangulatorInputs, TriangulatorResult } from "./types";

/** C9: AVERAGE of the converted scores, blank when none is numeric. */
export function behaviouralComposite(inputs: TriangulatorInputs | undefined): Cell {
  const values = [
    inputs?.voluntaryTurnover,
    inputs?.unplannedAbsence,
    inputs?.enps,
    inputs?.goalAchievement,
  ];
  return count(values) === 0 ? undefined : average(values);
}

/** C10, C11: M1 − composite, and the flag when |gap| is above 15. Measurement Reference 8.2. */
export function scoreTriangulators(
  inputs: TriangulatorInputs | undefined,
  m1Score: Cell,
): TriangulatorResult {
  const composite = behaviouralComposite(inputs);
  // C10: IFERROR(M1 − C9, ""). Both cells hold "" text when blank, which errors, so the gap is blank.
  const m1Gap = isNumber(m1Score) && isNumber(composite) ? m1Score - composite : undefined;
  const m1GapFlag = isNumber(m1Gap) && gt(Math.abs(m1Gap), GAP_THRESHOLD) ? M1_GAP_FLAG : "";
  return { composite, m1Gap, m1GapFlag };
}
