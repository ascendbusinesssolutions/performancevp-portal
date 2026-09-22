import { describe, expect, it } from "vitest";

import { INTAKE_VERSION } from "../src/index";
import pkg from "../package.json";

describe("@performancevp/intake", () => {
  it("exports the version recorded in package.json", () => {
    expect(INTAKE_VERSION).toBe(pkg.version);
  });
});
