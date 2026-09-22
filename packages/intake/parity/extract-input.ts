/**
 * Writes an intake input from a workbook value dump.
 *
 * usage: pnpm parity:extract-input <dump.json> <out.json> <launch ISO date> <close ISO date>
 *
 * A dump of the Northwind copy (tools/parity/dump_values.py) gives fixtures/northwind-intake-input.json.
 * The campaign dates are not in the workbook and are passed in.
 */
import { readFileSync, writeFileSync } from "node:fs";

import type { DumpValue } from "./compare";
import { inputFromDump } from "./extract";

const [dumpPath, outPath, launchDate, closeDate] = process.argv.slice(2);
if (
  dumpPath === undefined ||
  outPath === undefined ||
  launchDate === undefined ||
  closeDate === undefined
) {
  throw new Error("usage: extract-input <dump.json> <out.json> <launch> <close>");
}
const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as Record<string, DumpValue>;
const input = inputFromDump(dump, { launchDate, closeDate });
writeFileSync(outPath, `${JSON.stringify(input, null, 2)}\n`);
process.stdout.write(`input written to ${outPath}\n`);
