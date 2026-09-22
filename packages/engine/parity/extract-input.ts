/**
 * Writes an engine input from a workbook value dump through the cell map.
 *
 * usage: pnpm parity:extract-input <dump.json> <out.json>
 *
 * A dump of the production workbook (tools/parity/dump_values.py) gives the Northwind Mutual
 * worked example, which fixtures/northwind-input.json holds.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { inputFromDump } from "./apply";
import type { DumpValue } from "./compare";

const [dumpPath, outPath] = process.argv.slice(2);
if (dumpPath === undefined || outPath === undefined) {
  throw new Error("usage: extract-input <dump.json> <out.json>");
}
const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as Record<string, DumpValue>;
const input = inputFromDump(dump);
writeFileSync(outPath, `${JSON.stringify(input, null, 2)}\n`);
process.stdout.write(`input written to ${outPath}\n`);
