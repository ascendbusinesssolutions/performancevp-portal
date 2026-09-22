/**
 * Running a fixture: the workbook mirror on its input, every mapped formula cell read and compared
 * with the expected values. Shared by the fixture tests and the parity report.
 */

import type { IntakeInput } from "../src/types";
import { runSurveyWorkbook } from "../src/workbook";
import { outputCells, type OutputCell } from "./cell-map";
import { compareValues, type Comparison, type DumpValue } from "./compare";

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

/** Keys absent from `expected` are skipped, so a fixture may cover a subset of cells. */
export function runAgainstExpected(
  input: IntakeInput,
  expected: Record<string, DumpValue>,
): RunReport {
  const result = runSurveyWorkbook(input);
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
    const comparison = compareValues(cell.read(ctx), expected[cell.key] as DumpValue);
    report.compared += 1;
    if (comparison.difference !== undefined) {
      report.numericComparisons += 1;
      if (comparison.difference > report.largestDifference)
        report.largestDifference = comparison.difference;
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
        `${m.cell} (${m.key}): intake ${JSON.stringify(m.actual)} vs Excel ${JSON.stringify(m.expected)}`,
    )
    .join("\n");
}
