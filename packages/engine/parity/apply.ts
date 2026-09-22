/**
 * Turning workbook cell values and scenario edits into an engine input and overrides, through the
 * cell map, and the reverse: turning an input and overrides into the cell edits that build a
 * workbook copy.
 */

import type { Overrides } from "../src/evaluate";
import type { UnitMeasurementInput } from "../src/types";
import {
  LAYER_OVERRIDE_CELLS,
  SCORE_OVERRIDE_CELLS,
  inputCells,
  type CellValue,
  type InputCell,
} from "./cell-map";
import type { DumpValue } from "./compare";

/** ["clear", sheet, cell] or ["set", sheet, cell, value], as tools/parity/build_copies.py reads them. */
export type CellEdit = ["clear", string, string] | ["set", string, string, number | string];

let cache: Map<string, InputCell> | undefined;
export function inputCellByAddress(): Map<string, InputCell> {
  if (cache === undefined) cache = new Map(inputCells().map((c) => [c.cell, c]));
  return cache;
}

function fromDump(value: DumpValue | undefined): CellValue {
  if (value === undefined || value === null || typeof value === "boolean") return undefined;
  if (typeof value === "object") return { excelError: value.error as "#DIV/0!" };
  return value;
}

/** Replaces holes in arrays the setters created with empty rows, so the input is plain data. */
export function normaliseInput(input: UnitMeasurementInput): UnitMeasurementInput {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const out: unknown[] = [];
      for (let i = 0; i < value.length; i += 1) out.push(walk(i in value ? value[i] : {}));
      return out;
    }
    if (value !== null && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== undefined) out[k] = walk(v);
      }
      return out;
    }
    return value;
  };
  return walk(input) as UnitMeasurementInput;
}

/** An engine input from a workbook's stored input cells (a dump of the production workbook gives Northwind). */
export function inputFromDump(dump: Record<string, DumpValue>): UnitMeasurementInput {
  const input = { engagement: { archetype: "Default" } } as UnitMeasurementInput;
  for (const cell of inputCells()) cell.set(input, fromDump(dump[cell.cell]));
  return normaliseInput(input);
}

/**
 * Applies a scenario's edits to a copy of a base input. Edits on input cells change the input;
 * edits on the six layer cells or the seventeen score cells become overrides; "blank_template"
 * clears the listed cells. An edit on any other cell is an error, since it would be silently lost.
 */
export function applyEdits(
  base: UnitMeasurementInput,
  edits: readonly (readonly unknown[])[],
  blankTemplateCells: readonly (readonly [string, string])[],
): { input: UnitMeasurementInput; overrides: Overrides } {
  const input = structuredClone(base);
  const overrides: Overrides = {};
  const byAddress = inputCellByAddress();
  const apply = (form: string, sheet: string, ref: string, value?: unknown): void => {
    const address = `${sheet}!${ref}`;
    const inputCell = byAddress.get(address);
    if (inputCell !== undefined) {
      inputCell.set(input, form === "clear" ? undefined : (value as CellValue));
      return;
    }
    if (form === "set" && address in LAYER_OVERRIDE_CELLS) {
      overrides.layers = {
        ...overrides.layers,
        [LAYER_OVERRIDE_CELLS[address] as string]: Number(value),
      };
      return;
    }
    if (form === "set" && address in SCORE_OVERRIDE_CELLS) {
      overrides.scores = {
        ...overrides.scores,
        [SCORE_OVERRIDE_CELLS[address] as string]: Number(value),
      };
      return;
    }
    throw new Error(`Edit on a cell the map does not know: ${form} ${address}`);
  };
  for (const edit of edits) {
    const [form, sheet, ref, value] = edit as [string, string?, string?, unknown?];
    if (form === "blank_template") {
      for (const [s, r] of blankTemplateCells) apply("clear", s, r);
    } else if (form === "clear" || form === "set") {
      apply(form, sheet as string, ref as string, value);
    } else {
      throw new Error(`Unknown edit form: ${String(form)}`);
    }
  }
  return { input: normaliseInput(input), overrides };
}

/**
 * The cell edits that turn a copy of the production workbook into a copy holding this input:
 * every input cell cleared, then every defined value set, then the overrides set on their formula
 * cells. Refuses inputs beyond the workbook's row capacity, which the map cannot express.
 */
export function editsForInput(input: UnitMeasurementInput, overrides: Overrides = {}): CellEdit[] {
  const capacity = {
    families: input.capability?.c1?.families?.length ?? 0,
    domains: input.capability?.c2?.domains?.length ?? 0,
    teams: input.opportunity?.o5?.teams?.length ?? 0,
    decisions: input.dlp?.decisions?.length ?? 0,
  };
  const limits = { families: 3, domains: 4, teams: 4, decisions: 43 };
  for (const [key, count] of Object.entries(capacity)) {
    const limit = limits[key as keyof typeof limits];
    if (count > limit)
      throw new Error(`The workbook holds ${limit} ${key}; the input has ${count}.`);
  }
  const edits: CellEdit[] = [];
  for (const cell of inputCells()) {
    if (cell.kind === "ignored") continue;
    const [sheet, ref] = cell.cell.split("!") as [string, string];
    const value = cell.get(input);
    if (value === undefined || typeof value === "object") edits.push(["clear", sheet, ref]);
    else edits.push(["set", sheet, ref, value]);
  }
  for (const [address, key] of Object.entries(LAYER_OVERRIDE_CELLS)) {
    const value = overrides.layers?.[key];
    if (value !== undefined) {
      const [sheet, ref] = address.split("!") as [string, string];
      edits.push(["set", sheet, ref, value]);
    }
  }
  for (const [address, code] of Object.entries(SCORE_OVERRIDE_CELLS)) {
    const value = overrides.scores?.[code];
    if (value !== undefined) {
      const [sheet, ref] = address.split("!") as [string, string];
      edits.push(["set", sheet, ref, value]);
    }
  }
  return edits;
}
