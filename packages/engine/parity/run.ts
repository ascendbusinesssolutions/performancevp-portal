/**
 * Running a fixture: evaluate the engine on its input and overrides, read every mapped formula
 * cell, and compare with the expected values. Shared by the fixture tests and the parity report.
 */

import { evaluateWorkbook, type Overrides } from "../src/evaluate";
import { type UnitMeasurementInput } from "../src/types";
import { outputCells, type OutputCell } from "./cell-map";
import { P_CEILING, compareValues, type Comparison, type DumpValue } from "./compare";

export interface CellMismatch extends Comparison {
  cell: string;
  key: string;
}

export interface RunReport {
  compared: number;
  exactMatches: number;
  numericComparisons: number;
  largestDifference: number;
  mismatches: CellMismatch[];
}

let cachedOutputs: OutputCell[] | undefined;
export function outputCellsCached(): OutputCell[] {
  if (cachedOutputs === undefined) cachedOutputs = outputCells();
  return cachedOutputs;
}

/**
 * Compares the engine against expected values keyed by the map's keys. Keys absent from
 * `expected` are skipped, so a fixture may cover a subset of cells.
 */
export function runAgainstExpected(
  input: UnitMeasurementInput,
  overrides: Overrides | undefined,
  expected: Record<string, DumpValue>,
): RunReport {
  const result = evaluateWorkbook(input, overrides ?? {});
  const ctx = { input, result };
  const report: RunReport = {
    compared: 0,
    exactMatches: 0,
    numericComparisons: 0,
    largestDifference: 0,
    mismatches: [],
  };
  for (const cell of outputCellsCached()) {
    if (!(cell.key in expected)) continue;
    const expectedValue = expected[cell.key] as DumpValue;
    const tolerance = cell.key === "components.P" ? P_CEILING : undefined;
    const comparison = compareValues(cell.read(ctx), expectedValue, tolerance);
    report.compared += 1;
    if (comparison.difference !== undefined) {
      report.numericComparisons += 1;
      if (comparison.difference > report.largestDifference)
        report.largestDifference = comparison.difference;
      // P is also held to the 1e-9 that every other number meets; the ceiling is the contractual bound.
      if (cell.key === "components.P" && comparison.difference > 1e-9) {
        report.mismatches.push({ ...comparison, ok: false, cell: cell.cell, key: cell.key });
        continue;
      }
    } else if (comparison.ok) {
      report.exactMatches += 1;
    }
    if (!comparison.ok) report.mismatches.push({ ...comparison, cell: cell.cell, key: cell.key });
  }
  return report;
}

export function describeMismatches(mismatches: readonly CellMismatch[], limit = 12): string {
  return mismatches
    .slice(0, limit)
    .map(
      (m) =>
        `${m.cell} (${m.key}): engine ${JSON.stringify(m.actual)} vs Excel ${JSON.stringify(m.expected)}`,
    )
    .join("\n");
}
