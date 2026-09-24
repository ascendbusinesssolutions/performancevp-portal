import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  C5L_ITEMS,
  CII_ITEMS,
  constants,
  MI1_ITEMS,
  MI2_ITEMS,
  MI3_ITEMS,
  MI4_ITEMS,
  O1C_ITEMS,
  O2I_ITEMS,
  O3P_ITEMS,
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  OI5_ITEMS,
  TSI2_ITEMS,
  TSI3_ITEMS,
  TW_ITEMS,
} from "@performancevp/intake";
import { describe, expect, it } from "vitest";

import { migrationSql, pgtapSql } from "./generate";
import { EVERY_PULSE, ROTATED_WITHOUT_Q_TAG } from "./interpretation";
import { parseReference } from "./parse";
import type { ChecklistBand, ReferenceSet } from "./types";

/**
 * The reference data cannot drift from the source documents (Milestone 5 plan, Section 1.2). The
 * chain is source, JSON, migration, database: this test holds the first three links and the
 * generated pgTAP test holds the last. Run `pnpm --filter @performancevp/portal reference` to
 * regenerate after a source or interpretation change; the files are then written instead of checked.
 */

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const JSON_PATH = fileURLToPath(new URL("./reference.json", import.meta.url));
const MIGRATIONS = `${ROOT}supabase/migrations/`;
const PGTAP_PATH = `${ROOT}supabase/tests/database/36_reference_items_data.test.sql`;
const FIRST_DATA_MIGRATION = "20260924000200_reference_items_data.sql";
const TITLE = "Milestone 5, step 1: the reference rows, generated from the source documents.";
const WRITE = process.env.REFERENCE_WRITE === "1";

function source(name: string): string {
  return readFileSync(`${ROOT}docs/source-ip/Performance_Equation_${name}.md`, "utf8");
}

const set: ReferenceSet = parseReference({
  blueprint: source("Survey_Blueprint"),
  moduleLibrary: source("Tier3_Module_Library"),
  onlineMeasurement: source("Online_Measurement_Specification"),
  cadenceMaster: source("Sub_Dimension_Cadence_Master"),
});
const json = `${JSON.stringify(set, null, 2)}\n`;

function latestDataMigration(): string {
  const names = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith("_reference_items_data.sql"))
    .sort();
  return names[names.length - 1] ?? FIRST_DATA_MIGRATION;
}

if (WRITE) {
  writeFileSync(JSON_PATH, json);
  writeFileSync(`${MIGRATIONS}${latestDataMigration()}`, migrationSql(set, TITLE));
  writeFileSync(PGTAP_PATH, pgtapSql(set));
}

const items = new Map(set.survey_items.map((item) => [item.code, item]));
const moduleItems = new Map(set.module_items.map((item) => [item.code, item]));

describe("the chain from the source documents", () => {
  it("the committed reference set is what the source documents say now", () => {
    expect(readFileSync(JSON_PATH, "utf8")).toBe(json);
  });

  it("the latest reference data migration is what the generator writes", () => {
    expect(readFileSync(`${MIGRATIONS}${latestDataMigration()}`, "utf8")).toBe(
      migrationSql(set, TITLE),
    );
  });

  it("the generated pgTAP test is current", () => {
    expect(readFileSync(PGTAP_PATH, "utf8")).toBe(pgtapSql(set));
  });
});

describe("the Survey Blueprint's items", () => {
  const partA = [
    ...CII_ITEMS,
    ...MI1_ITEMS,
    ...MI2_ITEMS,
    ...MI3_ITEMS,
    ...MI4_ITEMS,
    ...TW_ITEMS,
    ...OI1_ITEMS,
    ...OI2_ITEMS,
    ...OI3_ITEMS,
    ...OI4_ITEMS,
    ...OI5_ITEMS,
    ...TSI2_ITEMS,
    ...TSI3_ITEMS,
  ];

  it("are exactly the intake's Part A items, in three sections ordered 1 to 71", () => {
    expect(new Set(items.keys())).toEqual(new Set(partA));
    expect(set.survey_items.map((i) => i.position)).toEqual(partA.map((_, i) => i + 1));
    expect(set.survey_sections.map((s) => s.code)).toEqual(["A", "B", "C"]);
  });

  it("carry the intake's reverse-scoring map", () => {
    const reverse = set.survey_items.filter((i) => i.is_reverse).map((i) => i.code);
    const intake = partA.filter((code) => constants.REVERSE_SCORED_ITEMS.has(code));
    expect(new Set(reverse)).toEqual(new Set(intake));
  });

  it("give 71 items at baseline and annual and 57 at half-yearly", () => {
    expect(set.survey_items.filter((i) => i.in_baseline)).toHaveLength(71);
    expect(set.survey_items.filter((i) => i.in_annual)).toHaveLength(71);
    expect(set.survey_items.filter((i) => i.in_half_yearly)).toHaveLength(57);
  });

  it("group into the sub-constructs the intake scores", () => {
    const of = (key: string) =>
      set.survey_items.filter((i) => i.sub_construct === key).map((i) => i.code);
    expect(of("clarity")).toEqual([...constants.CII_GROUPS.clarity].sort(byPosition));
    expect(of("trust")).toEqual([...constants.CII_GROUPS.trust].sort(byPosition));
    expect(of("flow")).toEqual([...constants.CII_GROUPS.flow].sort(byPosition));
    expect(new Set(of("engagement"))).toEqual(new Set(constants.MI1_GROUPS.engagement));
    expect(new Set(of("team_confidence"))).toEqual(new Set(constants.MI1_GROUPS.teamConfidence));
    expect(new Set(of("pride"))).toEqual(new Set(constants.MI1_GROUPS.pride));
    expect(new Set(of("task"))).toEqual(new Set(constants.TSI3_GROUPS.task));
    expect(new Set(of("relationship"))).toEqual(new Set(constants.TSI3_GROUPS.relationship));
  });
});

function byPosition(a: string, b: string): number {
  return (items.get(a)?.position ?? 0) - (items.get(b)?.position ?? 0);
}

describe("the pulse rotation", () => {
  it("gives 5 MI1, 3 MI2 and 2 trip-wire items in each row, with OI5, TSI2 and CII-13 always", () => {
    for (const rotation of [1, 2, 3, 4]) {
      const row = set.pulse_rotation.filter((r) => r.rotation === rotation).map((r) => r.item_code);
      const count = (block: string) =>
        row.filter((code) => items.get(code)?.block === block).length;
      expect([
        count("M1"),
        count("M2"),
        count("TW"),
        count("O5"),
        count("S2"),
        count("C4"),
      ]).toEqual([5, 3, 2, 3, 3, 1]);
      expect(row).toContain(EVERY_PULSE[0]);
    }
  });

  it("takes only items the half-yearly also carries (Cadence Master 7.7)", () => {
    for (const row of set.pulse_rotation)
      expect(items.get(row.item_code)?.in_half_yearly).toBe(true);
  });

  it("names exactly the parked items the Blueprint rotates without a Q tag", () => {
    const untagged = [
      ...new Set(
        set.pulse_rotation.map((r) => r.item_code).filter((code) => !items.get(code)?.in_pulse),
      ),
    ].sort();
    expect(untagged).toEqual([...ROTATED_WITHOUT_Q_TAG].sort());
  });
});

describe("the modules", () => {
  it("carry exactly the intake's module items, with its reverse flags", () => {
    const coded = set.module_items.filter((i) => !i.portal_code && i.online).map((i) => i.code);
    expect(new Set(coded)).toEqual(
      new Set([...O1C_ITEMS, ...O2I_ITEMS, ...O3P_ITEMS, ...C5L_ITEMS]),
    );
    for (const code of coded) {
      expect(moduleItems.get(code)?.is_reverse).toBe(
        (constants.REVERSE_SCORED_ITEMS as ReadonlySet<string>).has(code),
      );
    }
  });

  it("hold the open-text items as never deployed online", () => {
    expect(set.module_items.filter((i) => !i.online).map((i) => [i.code, i.response_kind])).toEqual(
      [
        ["O2I-07", "open_text"],
        ["O3P-07", "open_text"],
      ],
    );
  });

  it("give every team-leader item five anchors or its two ends", () => {
    for (const code of C5L_ITEMS) {
      const values = moduleItems.get(code)?.anchors?.map((a) => a.value);
      expect([
        [1, 2, 3, 4, 5],
        [1, 5],
      ]).toContainEqual(values);
    }
  });

  it("read the manager scales from the sources", () => {
    expect(moduleItems.get("C1M-01")?.anchors?.map((a) => a.label)).toEqual([
      "Novice",
      "Developing",
      "Proficient",
      "Advanced",
      "Expert",
    ]);
    expect(moduleItems.get("C2M-01")?.anchors?.map((a) => a.label)).toEqual([
      "Little working knowledge",
      "Basic; needs frequent reference or help",
      "Sound working knowledge for the role",
      "Deep knowledge; handles non-routine cases",
      "An authority others consult",
    ]);
    expect(moduleItems.get("C3M-01")?.anchors?.map((a) => [a.value, a.label])).toEqual([
      [1, "Underperforming"],
      [2, "Developing / partial meet"],
      [3, "Meeting expectations"],
      [4, "Exceeding expectations"],
      [5, "Exceptional contributor"],
    ]);
    expect(
      set.module_items.filter((i) => i.module_code === "M-O1-LT").map((i) => i.response_kind),
    ).toEqual([
      "rapid_multi",
      "rapid_multi",
      "rapid_multi",
      "rapid_multi",
      "rapid_single",
      "anchored5",
    ]);
  });
});

describe("the administrator checklists", () => {
  it("score ADM-O2's answers as the intake does", () => {
    const valueOf = (fact: string, option: string) =>
      set.checklist_values.find((v) => v.fact_code === fact && v.option === option)?.value;
    for (const [option, value] of Object.entries(constants.ADM_O2.ti3)) {
      expect(valueOf("TI-3", option)).toBe(value);
    }
    for (const [option, value] of Object.entries(constants.ADM_O2.int1)) {
      expect(valueOf("INT-1", option)).toBe(value);
    }
    expect(valueOf("INT-1", "excluded")).toBeNull();
  });

  it("need the intake's minimum of three capacity facts", () => {
    expect(set.checklists.find((c) => c.code === "ADM-O4")?.minimum_facts).toBe(
      constants.ADM_O4.minimumFacts,
    );
  });

  it("band ADM-O4 exactly as the intake scores it, at every boundary and between", () => {
    const intake: Record<string, (v: number) => number> = {
      "CF-1": constants.ADM_O4.utilisation,
      "CF-2": constants.ADM_O4.overtime,
      "CF-3": constants.ADM_O4.absence,
      "CF-4": constants.ADM_O4.backlog,
      "CF-5": constants.ADM_O4.vacancy,
    };
    for (const [fact, score] of Object.entries(intake)) {
      const bands = set.checklist_bands.filter((b) => b.fact_code === fact);
      const bounds = bands
        .flatMap((b) => [b.lower, b.upper])
        .filter((v): v is number => v !== null);
      const probes = [...bounds, ...bounds.map((v) => v + 0.5), ...bounds.map((v) => v - 0.5)];
      for (let v = -60; v <= 260; v += 0.25) probes.push(v);
      for (const v of probes) expect([fact, v, banded(bands, v)]).toEqual([fact, v, score(v)]);
    }
  });
});

function banded(bands: readonly ChecklistBand[], v: number): number | undefined {
  const matches = bands.filter(
    (b) =>
      (b.lower === null || (b.lower_inclusive ? v >= b.lower : v > b.lower)) &&
      (b.upper === null || (b.upper_inclusive ? v <= b.upper : v < b.upper)),
  );
  return matches.length === 1 ? matches[0]!.score : undefined;
}

describe("the event triggers", () => {
  it("offer the menu and the directory triggers, and one whole half-yearly", () => {
    expect(
      set.event_triggers.filter((t) => t.detection === "directory").map((t) => t.code),
    ).toEqual(["headcount_change", "new_manager", "team_composition_change"]);
    expect(
      set.event_triggers.filter((t) => t.deploys === "half_yearly").map((t) => t.code),
    ).toEqual(["pulse_drop"]);
  });
});
