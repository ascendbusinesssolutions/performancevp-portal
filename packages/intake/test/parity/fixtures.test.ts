/**
 * Every fixture in fixtures/parity/: the workbook mirror on the fixture's input against the
 * values Excel holds for every mapped formula cell, and the parity report.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { ParityFixture } from "../../parity/fixture-schema";
import { describeMismatches, outputCellsCached, runAgainstExpected } from "../../parity/run";

const dir = new URL("../../fixtures/parity/", import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort();
const fixtures = files.map(
  (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as ParityFixture,
);

const totals = { fixtures: 0, compared: 0, exactMatches: 0, numeric: 0, largest: 0, largestAt: "" };

describe("Survey Processing workbook parity fixtures", () => {
  it("all come from the same Excel build", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    expect(new Set(fixtures.map((f) => f.source.excel)).size).toBe(1);
  });

  for (const fixture of fixtures) {
    it(`${fixture.name}: ${fixture.purpose}`, () => {
      const report = runAgainstExpected(fixture.input, fixture.expected);
      totals.fixtures += 1;
      totals.compared += report.compared;
      totals.exactMatches += report.exactMatches;
      totals.numeric += report.numericComparisons;
      if (report.largestDifference > totals.largest) {
        totals.largest = report.largestDifference;
        totals.largestAt = fixture.name;
      }
      expect(report.compared).toBe(outputCellsCached().length);
      expect(report.mismatches, describeMismatches(report.mismatches)).toEqual([]);
    });
  }

  it("parity report", () => {
    const workbooks = [...new Set(fixtures.map((f) => `${f.source.workbook} ${f.source.sha256}`))];
    process.stdout.write(
      `\nParity fixtures: ${totals.fixtures} fixtures, ${totals.compared} cell comparisons, ${totals.exactMatches} exact matches on strings and blanks, ${totals.numeric} numeric comparisons, largest numeric difference ${totals.largest.toExponential(3)} (${totals.largestAt}); workbooks: ${workbooks.join("; ")}\n`,
    );
    expect(totals.compared).toBe(fixtures.length * outputCellsCached().length);
  });
});
