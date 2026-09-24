import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { colourTokens, contrast } from "./contrast";

// Every colour pairing the interface relies on, read from the tokens themselves, so a token cannot
// be changed to a value that fails WCAG 2.1 AA without this suite going red (PORTAL_UX_BRIEF.md 7;
// Milestone 4 plan, Section 10). Text needs 4.5:1 (1.4.3); marks, rules and control boundaries
// need 3:1 (1.4.11).
const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");
const tokens = colourTokens(css);

function token(name: string): string {
  const value = tokens.get(name);
  if (!value) throw new Error(`no --color-${name} in globals.css`);
  return value;
}

const TEXT = 4.5;
const MARK = 3;

const BANDS = ["band-green", "band-amber", "band-red", "band-neutral"] as const;

describe("colour tokens", () => {
  it("define every status band with its ink, tint and mark, and the critical colour", () => {
    for (const band of BANDS) {
      for (const suffix of ["", "-tint", "-mark"])
        expect(tokens.has(`${band}${suffix}`)).toBe(true);
    }
    expect(tokens.has("critical")).toBe(true);
    // The critical finding has no fill (decided 23 September 2026).
    expect(tokens.has("critical-tint")).toBe(false);
  });

  it.each([
    ["slate", "white"],
    ["grey", "white"],
    ["gold-deep", "white"],
    ["critical", "white"],
    ...BANDS.map((band) => [band, "white"] as [string, string]),
    ...BANDS.map((band) => [band, `${band}-tint`] as [string, string]),
    // The header bar: the navigation, the wordmark's gold and the secondary header text.
    ["white", "slate"],
    ["gold", "slate"],
    ["slate-20", "slate"],
  ])("text: %s on %s meets 4.5:1", (text, background) => {
    expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(TEXT);
  });

  it.each([
    ...BANDS.map((band) => [`${band}-mark`, "white"] as [string, string]),
    // The critical finding's 3px rule.
    ["critical", "white"],
    // Form control boundaries and the secondary button's border.
    ["grey-80", "white"],
    // The active navigation underline on the header bar.
    ["gold", "slate"],
  ])("mark: %s on %s meets 3:1", (mark, background) => {
    expect(contrast(token(mark), token(background))).toBeGreaterThanOrEqual(MARK);
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrast("#1f3a52", "#ffffff")).toBeCloseTo(11.76, 2);
  });
});
