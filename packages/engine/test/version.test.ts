import { describe, expect, it } from "vitest";

import { ENGINE_VERSION } from "../src/index";
import pkg from "../package.json";

describe("@performancevp/engine", () => {
  it("exports the version recorded in package.json", () => {
    expect(ENGINE_VERSION).toBe(pkg.version);
  });
});
