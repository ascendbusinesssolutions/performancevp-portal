import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Nothing on the survey path logs (Milestone 5 plan, 4.2): no token, hash, answer or address may
// reach a log. The survey routes, the page, the token and sending code are read as source and
// must hold no console call and no use of a logger.

const APP = fileURLToPath(new URL("../../", import.meta.url));
const PATHS = [
  "app/api/survey",
  "app/s",
  "lib/survey",
  "lib/campaigns/tokens.ts",
  "lib/campaigns/sender.ts",
  "lib/campaigns/reminders.ts",
  "lib/email",
];

function files(path: string): string[] {
  const full = join(APP, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

describe("the survey path", () => {
  it("logs nothing", () => {
    const sources = PATHS.flatMap(files).filter(
      (f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"),
    );
    expect(sources.length).toBeGreaterThan(8);
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      expect({ file, logs: /\bconsole\.|\blogger\b/.test(text) }).toEqual({ file, logs: false });
    }
  });
});
