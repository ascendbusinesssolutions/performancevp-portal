import { describe, expect, it } from "vitest";

import { RECOMMENDATIONS_VERSION } from "../src/index";
import pkg from "../package.json";

describe("@performancevp/recommendations", () => {
  it("exports the version recorded in package.json", () => {
    expect(RECOMMENDATIONS_VERSION).toBe(pkg.version);
  });
});
