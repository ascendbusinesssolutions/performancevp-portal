/**
 * Turning an intake input into the cell edits that build a Survey Processing workbook copy from
 * the blank template, through the cell map's input getters.
 */

import type { IntakeInput } from "../src/types";
import { inputCells } from "./cell-map";

/** ["clear", sheet, cell] or ["set", sheet, cell, value], as tools/parity/build_copies.py reads them. */
export type CellEdit = ["clear", string, string] | ["set", string, string, number | string];

export function editsForInput(input: IntakeInput): CellEdit[] {
  const edits: CellEdit[] = [];
  for (const cell of inputCells()) {
    const [sheet, ref] = cell.cell.split("!") as [string, string];
    const value = cell.get(input);
    if (value === undefined || value === "") edits.push(["clear", sheet, ref]);
    else edits.push(["set", sheet, ref, typeof value === "boolean" ? (value ? 1 : 0) : value]);
  }
  return edits;
}
