import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { emailText } from "./email-text";
import { COPY_FIXTURES } from "./fixtures";
import { COPY_TABLES } from "./index";
import { lintCopy, lintString } from "./lint";
import { fill, isTemplate, listOf, slotNames } from "./template";

// The copy check (PORTAL_COPY_SPEC.md Sections 1, 6 and 7), run in CI as its own named check.

const TEMPLATE_DIR = fileURLToPath(new URL("../../../../supabase/templates/", import.meta.url));

describe("the copy module", () => {
  it.each(Object.entries(COPY_TABLES))("%s passes the copy lint", (_name, { table, footer }) => {
    expect(lintCopy(table, { footer })).toEqual([]);
  });

  const templates = Object.entries(COPY_TABLES).flatMap(([module, { table }]) =>
    Object.entries(table)
      .filter(([, text]) => isTemplate(text))
      .map(([key, text]) => [`${module}.${key}`, text] as const),
  );

  it.each(templates)("%s has a fixture, and each fixture fills exactly", (id, text) => {
    const fixtures = COPY_FIXTURES[id];
    expect(fixtures, `no fixture for ${id}`).toBeDefined();
    expect(fixtures!.length).toBeGreaterThan(0);
    for (const fixture of fixtures!) {
      expect(Object.keys(fixture.slots).sort()).toEqual(slotNames(text).sort());
      expect(fill(text, fixture.slots as never)).toBe(fixture.expected);
      expect(lintString(id, fixture.expected)).toEqual([]);
    }
  });

  it("holds no fixture for a key that is not a template", () => {
    const known = new Set<string>(templates.map(([id]) => id));
    expect(Object.keys(COPY_FIXTURES).filter((id) => !known.has(id))).toEqual([]);
  });
});

describe("the Supabase Auth email templates", () => {
  const files = readdirSync(TEMPLATE_DIR).filter((f) => f.endsWith(".html"));

  it("are all found", () => {
    expect(files.sort()).toEqual(["invite.html", "magic_link.html", "recovery.html"]);
  });

  it.each(files)("%s passes the copy lint", (file) => {
    const text = emailText(readFileSync(`${TEMPLATE_DIR}${file}`, "utf8"));
    expect(text.length).toBeGreaterThan(0);
    expect(lintString(file, text)).toEqual([]);
  });
});

describe("fill", () => {
  it("fills every slot and writes whole numbers with thousands separators", () => {
    expect(fill("{n} of {total} units", { n: 3, total: 1200 })).toBe("3 of 1,200 units");
  });

  it("refuses a missing or misspelt slot, at compile time and at run time", () => {
    const template = "{unit} has {n}." as const;
    // @ts-expect-error a missing slot does not compile (pnpm typecheck asserts this line errors)
    expect(() => fill(template, { unit: "Claims" })).toThrow(/\{n\}/);
    // @ts-expect-error a misspelt slot does not compile
    expect(() => fill(template, { unit: "Claims", count: 9 })).toThrow(/\{n\}/);
  });
});

describe("listOf", () => {
  const words = { and: "and", more: (n: number) => `${n} more` };
  it("joins a short list and cuts a long one", () => {
    expect(listOf(["A"], words)).toBe("A");
    expect(listOf(["A", "B"], words)).toBe("A and B");
    expect(listOf(["A", "B", "C"], words)).toBe("A, B and C");
    expect(listOf(["A", "B", "C", "D"], words, 2)).toBe("A, B and 2 more");
  });
});

describe("emailText", () => {
  it("keeps the words and drops markup and template actions", () => {
    expect(emailText('<p style="x">Open {{ .SiteURL }}/login &amp; sign in</p>')).toBe(
      "Open /login & sign in",
    );
  });
});
