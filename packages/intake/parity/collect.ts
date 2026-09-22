/**
 * Writes a fixture from a request and a value dump of the matching workbook copy: every mapped
 * formula cell's Excel value keyed by the map's key, the workbook hash and the Excel build.
 *
 * usage: pnpm parity:collect <stage_dir> "<excel version>" [workbook.xlsx]
 *
 * Expects <stage_dir>/values/<name>.values.json for every request in fixtures/parity/requests/.
 * The workbook defaults to the blank template; the Northwind request names its own copy.
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
const benchmarks = new URL("../../../docs/benchmarks/", import.meta.url).pathname;
const generated = new Date().toISOString().slice(0, 10);
const outputs = outputCells();

const WORKBOOKS = {
  template: "Survey Processing and Scoring Workbook.xlsx",
  northwind: "Survey Processing and Scoring Workbook - Northwind Mutual (Worked Example).xlsx",
} as const;

let count = 0;
for (const file of readdirSync(requestsDir).sort()) {
  if (!file.endsWith(".json")) continue;
  const request = JSON.parse(readFileSync(join(requestsDir, file), "utf8")) as FixtureRequest & {
    workbook?: keyof typeof WORKBOOKS;
  };
  const valuesPath = join(stage, "values", `${request.name}.values.json`);
  if (!existsSync(valuesPath)) {
    process.stderr.write(`no values for ${request.name}; skipped\n`);
    continue;
  }
  const workbook = WORKBOOKS[request.workbook ?? "template"];
  const sha256 = createHash("sha256")
    .update(readFileSync(join(benchmarks, workbook)))
    .digest("hex");
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
    source: { workbook, sha256, excel, generated },
    expected,
  };
  writeFileSync(join(fixturesDir, `${request.name}.json`), `${JSON.stringify(fixture, null, 1)}\n`);
  count += 1;
}
process.stdout.write(`${count} fixtures written to ${fixturesDir}\n`);
