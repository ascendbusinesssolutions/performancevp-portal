/**
 * The versioned parity fixture format (docs/ENGINE_SPEC.md 5.3). One complete engine input, any
 * overrides, and the values Excel computed for every formula cell, keyed by the cell map's key (a
 * result path where one exists, else the cell). Fixtures are generated on a machine with Excel
 * and committed; CI reads them and never touches Excel.
 */

import type { Overrides } from "../src/evaluate";
import type { UnitMeasurementInput } from "../src/types";
import type { DumpValue } from "./compare";

export const FIXTURE_FORMAT_VERSION = 1;

export interface FixtureRequest {
  name: string;
  purpose: string;
  input: UnitMeasurementInput;
  overrides?: Overrides;
}

export interface ParityFixture extends FixtureRequest {
  formatVersion: typeof FIXTURE_FORMAT_VERSION;
  source: {
    workbook: string;
    sha256: string;
    /** The Excel build that recalculated the copy, as reported at generation. */
    excel: string;
    generated: string;
  };
  expected: Record<string, DumpValue>;
}
