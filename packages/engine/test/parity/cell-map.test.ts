/**
 * The cell map covers every input cell the blank template clears and every formula cell in the
 * workbook, and the Northwind input extracted through it equals the hand-built fixture.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { inputCells, outputCells } from "../../parity/cell-map";
import { inputFromDump } from "../../parity/apply";
import type { DumpValue } from "../../parity/compare";
import type { UnitMeasurementInput } from "../../src/types";
import { NORTHWIND } from "../fixtures/northwind";

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

describe("cell map coverage", () => {
  const inputs = inputCells();
  const outputs = outputCells();

  it("has no duplicate cells or keys", () => {
    const inputAddresses = inputs.map((c) => c.cell);
    expect(new Set(inputAddresses).size).toBe(inputAddresses.length);
    const outputAddresses = outputs.map((c) => c.cell);
    expect(new Set(outputAddresses).size).toBe(outputAddresses.length);
    const keys = outputs.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    const overlap = inputAddresses.filter((a) => outputAddresses.includes(a));
    expect(overlap).toEqual([]);
  });

  it("covers every cell the blank template clears", () => {
    const cleared = read<[string, string][]>("../../fixtures/blank_template_cells.json");
    const known = new Set(inputs.map((c) => c.cell));
    const missing = cleared.map(([s, r]) => `${s}!${r}`).filter((a) => !known.has(a));
    expect(missing).toEqual([]);
    expect(cleared.length).toBe(356);
  });

  it("covers every formula cell in the workbook", () => {
    const listed = read<{ sha256: string; formulaCells: string[] }>(
      "../../fixtures/workbook-formula-cells.json",
    );
    const known = new Set(outputs.map((c) => c.cell));
    const missing = listed.formulaCells.filter((a) => !known.has(a));
    expect(missing).toEqual([]);
    const extra = [...known].filter((a) => !listed.formulaCells.includes(a));
    expect(extra).toEqual([]);
    expect(listed.formulaCells.length).toBe(685);
  });
});

describe("the Northwind input extracted from the workbook", () => {
  it("equals the hand-built fixture", () => {
    const extracted = read<UnitMeasurementInput>("../../fixtures/northwind-input.json");
    expect(extracted).toEqual(NORTHWIND);
  });

  it("round-trips through the map: getters reproduce the dump's input cells", () => {
    const dump: Record<string, DumpValue> = {};
    for (const cell of inputCells()) {
      const v = cell.get(NORTHWIND);
      dump[cell.cell] = v === undefined ? null : (v as DumpValue);
    }
    expect(inputFromDump(dump)).toEqual(NORTHWIND);
  });
});
