/**
 * Where the Survey Processing workbook keeps things: sheet names, row ranges and the column each
 * item occupies. The cell map and the extractor read this; nothing else knows a cell address.
 */

import {
  C5L_ITEMS,
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  O1C_ITEMS,
  O2I_ITEMS,
  O3P_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  TSI2_ITEMS,
  TSI3_ITEMS,
  TW_ITEMS,
  type C5lItem,
  type O3pItem,
  type PartAItem,
  type PartBItem,
} from "../src/types";
import { PART_A_ITEMS } from "../src/items";

export const SHEET = {
  setup: "1 Setup & Keys",
  reference: "Reference",
  importMain: "2 Import Main",
  importManager: "3 Import Manager",
  importLeadership: "4 Import Leadership",
  importTeamLeader: "5 Import TeamLeader",
  importDlp: "6 Import DLP",
  screening: "7 Screening",
  typeA: "8 Type A Means",
  typeC: "9 Type C Scoring",
  layer2: "10 Layer 2",
  output: "11 Output",
} as const;

/** Row capacities: the first data row and the number of rows each import sheet holds. */
export const ROWS = {
  main: { first: 5, count: 200 },
  manager: { first: 5, count: 150 },
  leadership: { first: 5, count: 150 },
  teamLeader: { first: 5, count: 40 },
  dlp: { first: 5, count: 200 },
  teams: { first: 32, count: 10 },
  decisionTypes: { first: 32, count: 12 },
  roleFamilies: { first: 32, count: 10 },
  skills: 15,
  processes: 3,
} as const;

export function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function columnIndex(letter: string): number {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** 2 Import Main: A timestamp, B team, then Part A, Part B (with the open O2I-07 column), and three process blocks of six items plus an open column. */
export interface MainColumn {
  column: string;
  item: PartAItem | PartBItem | O3pItem;
  /** The process slot (0 to 2) for an O3P item. */
  process?: number;
}

export function mainColumns(): MainColumn[] {
  const columns: MainColumn[] = [];
  let index = columnIndex("C");
  for (const item of PART_A_ITEMS) columns.push({ column: columnLetter(index++), item });
  for (const item of O1C_ITEMS) columns.push({ column: columnLetter(index++), item });
  for (const item of O2I_ITEMS) columns.push({ column: columnLetter(index++), item });
  index += 1; // O2I-07, open text
  for (let p = 0; p < ROWS.processes; p += 1) {
    for (const item of O3P_ITEMS) columns.push({ column: columnLetter(index++), item, process: p });
    index += 1; // O3P-07, open text
  }
  return columns;
}

/** The last numeric column of the main import (P3 O3P-06). */
export const MAIN_LAST_COLUMN = "DA";

/** 5 Import TeamLeader: A leader, B:M the twelve items. */
export function teamLeaderColumns(): Array<{ column: string; item: C5lItem }> {
  return C5L_ITEMS.map((item, i) => ({ column: columnLetter(columnIndex("B") + i), item }));
}

/** 8 Type A Means: the per-item rows 5 to 75 in Part A order, with the first row of each block. */
export const TYPE_A_FIRST_ROW = 5;

export const TYPE_A_BLOCKS = [
  { key: "C4", first: 5, count: 15 },
  { key: "M1", first: 20, count: 8 },
  { key: "M2", first: 28, count: 5 },
  { key: "M3", first: 33, count: 5 },
  { key: "M4", first: 38, count: 4 },
  { key: "TW", first: 42, count: 3 },
  { key: "O1", first: 45, count: 8 },
  { key: "O2", first: 53, count: 4 },
  { key: "O3", first: 57, count: 5 },
  { key: "O4", first: 62, count: 3 },
  { key: "O5", first: 65, count: 3 },
  { key: "S2", first: 68, count: 3 },
  { key: "S3", first: 71, count: 5 },
] as const;

export const TYPE_A_TEAM_ROWS = {
  cii: { first: 80, count: 10 },
  o5: { first: 95, count: 10 },
} as const;

/** 11 Output: the O5 team pass-through rows hold ten teams, two fewer than Type A Means. */
export const OUTPUT_O5_ROWS = { first: 78, count: 10 } as const;

/** 11 Output: the item-mean pass-through rows (B23:B97), item by item. */
export const OUTPUT_ITEM_ROWS: ReadonlyArray<readonly [PartAItem, number]> = (() => {
  const rows: Array<readonly [PartAItem, number]> = [];
  const blocks: Array<{ items: readonly PartAItem[]; first: number }> = [
    { items: MI1_ITEMS, first: 23 },
    { items: MI2_ITEMS, first: 31 },
    { items: MI3_ITEMS, first: 36 },
    { items: MI4_ITEMS, first: 41 },
    { items: TW_ITEMS, first: 45 },
    { items: OI1_ITEMS, first: 49 },
    { items: OI2_ITEMS, first: 60 },
    { items: OI3_ITEMS, first: 67 },
    { items: OI4_ITEMS, first: 73 },
    { items: TSI2_ITEMS, first: 90 },
    { items: TSI3_ITEMS, first: 93 },
  ];
  for (const block of blocks) block.items.forEach((item, i) => rows.push([item, block.first + i]));
  return rows;
})();
