/**
 * The cell map covers every formula cell of the Survey Processing workbook, or lists it with a
 * reason; and every mapped address and key is unique.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { excludedCells, inputCells, outputCells } from "../../parity/cell-map";

const listing = JSON.parse(
  readFileSync(new URL("../../fixtures/workbook-formula-cells.json", import.meta.url), "utf8"),
) as { workbook: string; sha256: string; formulaCells: string[] };

describe("the Survey Processing cell map", () => {
  const outputs = outputCells();
  const inputs = inputCells();

  it("maps or excludes all 4,562 formula cells of the template", () => {
    expect(listing.formulaCells).toHaveLength(4562);
    const mapped = new Set(outputs.map((c) => c.cell));
    const exclusions = excludedCells();
    const unmapped = listing.formulaCells.filter(
      (cell) => !mapped.has(cell) && !exclusions.some((e) => e.pattern.test(cell)),
    );
    expect(unmapped).toEqual([]);
  });

  it("maps no cell that is not a formula cell, and excludes no mapped cell", () => {
    const formulas = new Set(listing.formulaCells);
    const notFormulas = outputs.map((c) => c.cell).filter((cell) => !formulas.has(cell));
    expect(notFormulas).toEqual([]);
    const exclusions = excludedCells();
    const both = outputs
      .map((c) => c.cell)
      .filter((cell) => exclusions.some((e) => e.pattern.test(cell)));
    expect(both).toEqual([]);
  });

  it("uses each address and key once, and never maps an input cell as an output", () => {
    expect(new Set(outputs.map((c) => c.cell)).size).toBe(outputs.length);
    expect(new Set(outputs.map((c) => c.key)).size).toBe(outputs.length);
    expect(new Set(inputs.map((c) => c.cell)).size).toBe(inputs.length);
    const outputAddresses = new Set(outputs.map((c) => c.cell));
    expect(inputs.filter((c) => outputAddresses.has(c.cell))).toEqual([]);
    const formulas = new Set(listing.formulaCells);
    expect(inputs.filter((c) => formulas.has(c.cell)).map((c) => c.cell)).toEqual([]);
  });
});
