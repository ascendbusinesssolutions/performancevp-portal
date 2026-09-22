/**
 * Step 1 of fixture generation: turns every request in fixtures/parity/requests/ into a list of
 * cell edits for tools/parity/build_copies.py, applied to the blank template.
 *
 * usage: pnpm parity:prepare <stage_dir>
 *
 * <stage_dir> must sit inside Excel's sandbox container (~/Library/Containers/com.microsoft.Excel/
 * Data/pvp-parity-intake) so the recalculation step needs no file-access prompts.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { editsForInput } from "./apply";
import type { FixtureRequest } from "./fixture-schema";

const stage = process.argv[2];
if (stage === undefined) throw new Error("usage: prepare <stage_dir>");
const requestsDir = new URL("../fixtures/parity/requests/", import.meta.url).pathname;
const editsDir = join(stage, "edits");
mkdirSync(editsDir, { recursive: true });

let count = 0;
for (const file of readdirSync(requestsDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const request = JSON.parse(readFileSync(join(requestsDir, file), "utf8")) as FixtureRequest;
  writeFileSync(
    join(editsDir, `${request.name}.edits.json`),
    JSON.stringify(editsForInput(request.input)),
  );
  count += 1;
}
process.stdout.write(`${count} edit lists written to ${editsDir}\n`);
