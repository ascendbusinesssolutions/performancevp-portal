/**
 * The 50 scenarios in docs/benchmarks/fixtures/2026-09-21-gap-rule-and-blank-inputs.json,
 * computed by Excel from the corrected production workbook. Each starts from the Northwind input,
 * applies its edits through the cell map, and is compared on the file's after block: the 29 key
 * cells, C, M, O, S_internal, S, P, the four normalised-weight sums, the top six labels and the
 * error list.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { applyEdits } from "../../parity/apply";
import { outputCells } from "../../parity/cell-map";
import { compareValues, type DumpValue } from "../../parity/compare";
import { evaluateWorkbook } from "../../src/evaluate";
import { isExcelError } from "../../src/excel";
import { COMPONENT_OF } from "../../src/constants";
import { SUB_DIMENSION_CODES } from "../../src/types";
import { NORTHWIND } from "../fixtures/northwind";

interface Scenario {
  edits: unknown[][];
  after: Record<string, DumpValue | DumpValue[]>;
}
interface LegacyFile {
  workbook: string;
  recalculated_with: string;
  scenarios: Record<string, Scenario>;
}

const file = JSON.parse(
  readFileSync(
    new URL(
      "../../../../docs/benchmarks/fixtures/2026-09-21-gap-rule-and-blank-inputs.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as LegacyFile;
const blankTemplate = JSON.parse(
  readFileSync(new URL("../../fixtures/blank_template_cells.json", import.meta.url), "utf8"),
) as [string, string][];

const outputsByCell = new Map(outputCells().map((c) => [c.cell, c]));
const COMPONENT_KEYS = ["C", "M", "O", "S_internal", "S", "P"] as const;
const COMPONENT_PATH: Record<
  (typeof COMPONENT_KEYS)[number],
  "C" | "M" | "O" | "sInternal" | "S" | "P"
> = {
  C: "C",
  M: "M",
  O: "O",
  S_internal: "sInternal",
  S: "S",
  P: "P",
};

const largest = { difference: 0, cell: "" };
let exactMatches = 0;
let compared = 0;

describe(`legacy scenarios (${file.recalculated_with})`, () => {
  for (const [name, scenario] of Object.entries(file.scenarios)) {
    it(name, () => {
      const { input, overrides } = applyEdits(NORTHWIND, scenario.edits, blankTemplate);
      const result = evaluateWorkbook(input, overrides);
      const ctx = { input, result };
      const failures: string[] = [];

      for (const [key, expected] of Object.entries(scenario.after)) {
        if (
          key === "raw_excel_values" ||
          key === "top6" ||
          key === "errors" ||
          key.endsWith("_weights_sum")
        )
          continue;
        let comparison;
        if ((COMPONENT_KEYS as readonly string[]).includes(key)) {
          const path = COMPONENT_PATH[key as (typeof COMPONENT_KEYS)[number]];
          comparison = compareValues(result.components[path], expected as DumpValue);
        } else {
          const cell = outputsByCell.get(key);
          if (cell === undefined) {
            failures.push(`${key}: not in the cell map`);
            continue;
          }
          comparison = compareValues(cell.read(ctx), expected as DumpValue);
        }
        compared += 1;
        if (comparison.difference !== undefined) {
          if (comparison.difference > largest.difference)
            Object.assign(largest, { difference: comparison.difference, cell: `${name} ${key}` });
        } else if (comparison.ok) {
          exactMatches += 1;
        }
        if (!comparison.ok)
          failures.push(
            `${key}: engine ${JSON.stringify(comparison.actual)} vs Excel ${JSON.stringify(comparison.expected)}`,
          );
      }

      // The file's *_weights_sum is the sum of the normalised weights (ranking block L) rounded to 12 places.
      for (const component of ["C", "M", "O", "S"] as const) {
        const expected = scenario.after[`${component}_weights_sum`] as number;
        const sum = SUB_DIMENSION_CODES.filter((code) => COMPONENT_OF[code] === component).reduce(
          (total, code) => total + result.subDimensions[code].normalisedWeight,
          0,
        );
        const actual = Number(sum.toFixed(12));
        compared += 1;
        if (actual !== expected)
          failures.push(`${component}_weights_sum: engine ${actual} vs Excel ${expected}`);
        else exactMatches += 1;
      }

      const expectedTop6 = scenario.after["top6"] as (string | null)[];
      const actualTop6 = result.ranking.topSix.map((r) => (r.label === "" ? null : r.label));
      compared += 1;
      if (JSON.stringify(actualTop6) !== JSON.stringify(expectedTop6))
        failures.push(
          `top6: engine ${JSON.stringify(actualTop6)} vs Excel ${JSON.stringify(expectedTop6)}`,
        );
      else exactMatches += 1;

      const expectedErrors = scenario.after["errors"] as string[];
      const actualErrors = result.ranking.rows
        .filter((r) => isExcelError(r.deltaP))
        .map((r) => `Composite Scoring!P${5 + result.ranking.rows.indexOf(r)}`);
      compared += 1;
      if (JSON.stringify(actualErrors) !== JSON.stringify(expectedErrors))
        failures.push(
          `errors: engine ${JSON.stringify(actualErrors)} vs Excel ${JSON.stringify(expectedErrors)}`,
        );
      else exactMatches += 1;

      expect(failures, failures.join("\n")).toEqual([]);
    });
  }

  it("parity report", () => {
    process.stdout.write(
      `\nLegacy scenarios: ${Object.keys(file.scenarios).length} scenarios, ${compared} comparisons, ${exactMatches} exact matches, largest numeric difference ${largest.difference.toExponential(3)} (${largest.cell || "none"})\n`,
    );
    expect(Object.keys(file.scenarios).length).toBe(50);
  });
});
