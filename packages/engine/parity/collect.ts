/**
 * Step 5 of fixture generation: reads each recalculated copy's value dump and writes the fixture,
 * with every mapped formula cell's Excel value keyed by the map's key, the workbook hash and the
 * Excel build that recalculated it.
 *
 * usage: pnpm parity:collect <stage_dir> "<excel version>"
 *
 * Expects <stage_dir>/values/<name>.values.json from tools/parity/dump_values.py for every
 * request in fixtures/parity/requests/. Writes fixtures/parity/<name>.json.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { outputCells } from "./cell-map";
import type { DumpValue } from "./compare";
import { FIXTURE_FORMAT_VERSION, type FixtureRequest, type ParityFixture } from "./fixture-schema";

const [stage, excel] = process.argv.slice(2);
if (stage === undefined || excel === undefined)
  throw new Error('usage: collect <stage_dir> "<excel version>"');

const requestsDir = new URL("../fixtures/parity/requests/", import.meta.url).pathname;
const fixturesDir = new URL("../fixtures/parity/", import.meta.url).pathname;
const workbookPath = new URL(
  "../../../docs/benchmarks/PerformanceVP-Diagnostic-Workbook.xlsx",
  import.meta.url,
).pathname;
const sha256 = createHash("sha256").update(readFileSync(workbookPath)).digest("hex");
const generated = new Date().toISOString().slice(0, 10);
const outputs = outputCells();

let count = 0;
for (const file of readdirSync(requestsDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const request = JSON.parse(readFileSync(join(requestsDir, file), "utf8")) as FixtureRequest;
  const valuesPath = join(stage, "values", `${request.name}.values.json`);
  if (!existsSync(valuesPath)) {
    process.stderr.write(`no values for ${request.name}; skipped\n`);
    continue;
  }
  const values = JSON.parse(readFileSync(valuesPath, "utf8")) as Record<string, DumpValue>;
  const expected: Record<string, DumpValue> = {};
  for (const cell of outputs) {
    expected[cell.key] = cell.cell in values ? (values[cell.cell] as DumpValue) : null;
  }
  const fixture: ParityFixture = {
    formatVersion: FIXTURE_FORMAT_VERSION,
    name: request.name,
    purpose: request.purpose,
    input: request.input,
    ...(request.overrides === undefined ? {} : { overrides: request.overrides }),
    source: { workbook: "PerformanceVP-Diagnostic-Workbook.xlsx", sha256, excel, generated },
    expected,
  };
  writeFileSync(join(fixturesDir, `${request.name}.json`), `${JSON.stringify(fixture, null, 1)}\n`);
  count += 1;
}
process.stdout.write(`${count} fixtures written to ${fixturesDir}\n`);
