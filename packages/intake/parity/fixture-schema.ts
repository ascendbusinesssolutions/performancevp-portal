/**
 * The intake's parity fixture: one complete intake input and the values Excel holds for every
 * mapped formula cell, keyed by the cell map's key. The same shape as the engine's fixtures
 * (docs/ENGINE_SPEC.md 5.3). Fixtures are generated on a machine with Excel and committed.
 */

import type { IntakeInput } from "../src/types";
import type { DumpValue } from "./compare";

export const FIXTURE_FORMAT_VERSION = 1;

export interface FixtureRequest {
  name: string;
  purpose: string;
  input: IntakeInput;
}

export interface ParityFixture extends FixtureRequest {
  formatVersion: typeof FIXTURE_FORMAT_VERSION;
  source: {
    workbook: string;
    sha256: string;
    /** The Excel build that recalculated the copy, or "stored" for values read from the benchmark as shipped. */
    excel: string;
    generated: string;
  };
  expected: Record<string, DumpValue>;
}
