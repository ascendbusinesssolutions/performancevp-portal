/**
 * Every fixture in fixtures/parity/: the engine on the fixture's input and overrides against the
 * values Excel computed for all 685 formula cells, and the parity report.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { describeMismatches, runAgainstExpected } from "../../parity/run";
import type { ParityFixture } from "../../parity/fixture-schema";

const dir = new URL("../../fixtures/parity/", import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort();
const fixtures = files.map(
  (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as ParityFixture,
);

const totals = { fixtures: 0, compared: 0, exactMatches: 0, numeric: 0, largest: 0, largestAt: "" };

describe("workbook parity fixtures", () => {
  it("all come from the same workbook and Excel build", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    const hashes = new Set(fixtures.map((f) => f.source.sha256));
    expect(hashes.size).toBe(1);
    const builds = new Set(fixtures.map((f) => f.source.excel));
    expect(builds.size).toBe(1);
  });

  for (const fixture of fixtures) {
    it(`${fixture.name}: ${fixture.purpose}`, () => {
      const report = runAgainstExpected(fixture.input, fixture.overrides, fixture.expected);
      totals.fixtures += 1;
      totals.compared += report.compared;
      totals.exactMatches += report.exactMatches;
      totals.numeric += report.numericComparisons;
      if (report.largestDifference > totals.largest) {
        totals.largest = report.largestDifference;
        totals.largestAt = fixture.name;
      }
      expect(report.compared).toBe(685);
      expect(report.mismatches, describeMismatches(report.mismatches)).toEqual([]);
    });
  }

  it("parity report", () => {
    const sha = fixtures[0]?.source.sha256 ?? "";
    process.stdout.write(
      `\nParity fixtures: ${totals.fixtures} fixtures, ${totals.compared} cell comparisons, ${totals.exactMatches} exact matches on strings and blanks, ${totals.numeric} numeric comparisons, largest numeric difference ${totals.largest.toExponential(3)} (${totals.largestAt}), workbook sha256 ${sha}\n`,
    );
    expect(totals.compared).toBe(fixtures.length * 685);
  });
});
