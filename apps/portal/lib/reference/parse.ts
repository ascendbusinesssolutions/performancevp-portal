import {
  ADM_O4_BANDS,
  ANSWER_CODES,
  BLOCK_OF_PREFIX,
  EVENT_TRIGGERS,
  EVERY_PULSE,
  MODULES,
  NOT_APPLICABLE,
  OMS_TRIGGERS_ALREADY_IN_CADENCE_MASTER,
  PORTAL_CODES,
  RAPID_FORM,
  SUB_CONSTRUCT_OF_HEADING,
} from "./interpretation";
import { anchors, plain, tables, tableUnder, type Table } from "./markdown";
import type {
  Checklist,
  ChecklistBand,
  ChecklistFact,
  ChecklistValue,
  EventTrigger,
  ModuleItem,
  PulseRotationRow,
  ReferenceSet,
  SectionCode,
  SurveyItem,
  SurveySection,
} from "./types";

/**
 * Reads the reference set from the source documents (Milestone 5 plan, Section 1.2): the Survey
 * Blueprint's items, cadence tags, respondent order and pulse rotation; the Tier 3 Module Library's
 * module items; the Online Measurement Specification's M-C2-MGR and administrator checklists; and
 * the event triggers of the Cadence Master and the Online Measurement Specification. Where a source
 * cell needs interpreting, `interpretation.ts` holds the reading, keyed to the cell's own words.
 */

export interface SourceDocuments {
  blueprint: string;
  moduleLibrary: string;
  onlineMeasurement: string;
  cadenceMaster: string;
}

const PART_A_CODE = /^(CII|MI[1-4]|TW|OI[1-5]|TSI[23])-\d{2}$/;
const MODULE_CODE = /^(O1C|O2I|O3P|C5L)-\d{2}$/;

function fail(message: string): never {
  throw new Error(`reference data: ${message}`);
}

function prefixOf(code: string): string {
  return code.slice(0, code.lastIndexOf("-"));
}

// Survey Blueprint -------------------------------------------------------------------------------

function surveyItems(blueprint: string): { sections: SurveySection[]; items: SurveyItem[] } {
  const all = tables(blueprint);

  // Parts 2 to 5: ID | Item | Cadence | Reverse (the trip-wire table adds an action column).
  const bank = new Map<string, Omit<SurveyItem, "section" | "position">>();
  for (const table of all) {
    if (table.header[0] !== "ID" || table.header[1] !== "Item" || table.header[2] !== "Cadence")
      continue;
    const heading = table.path[table.path.length - 1] ?? "";
    for (const row of table.rows) {
      const code = row[0] ?? "";
      if (!PART_A_CODE.test(code)) fail(`unexpected item code ${code} at line ${table.line}`);
      const tags = (row[2] ?? "").split("+");
      const known = new Set(["B", "Q", "Q*", "H", "A"]);
      for (const tag of tags) if (!known.has(tag)) fail(`unknown cadence tag ${tag} on ${code}`);
      const reverse = (row[3] ?? "").includes("(R)");
      if (bank.has(code)) fail(`${code} appears twice`);
      const block = BLOCK_OF_PREFIX[prefixOf(code)];
      if (block === undefined) fail(`no block for ${code}`);
      bank.set(code, {
        code,
        block,
        sub_construct: SUB_CONSTRUCT_OF_HEADING[heading] ?? null,
        wording: plain(row[1] ?? ""),
        is_reverse: reverse,
        in_baseline: tags.includes("B"),
        in_pulse: tags.includes("Q") || tags.includes("Q*"),
        pulse_rotates: tags.includes("Q*"),
        in_half_yearly: tags.includes("H"),
        in_annual: tags.includes("A"),
      });
    }
  }

  // Part 6.1: the respondent order, section by section.
  const sections: SurveySection[] = [];
  const items: SurveyItem[] = [];
  for (const table of all) {
    if (table.header.join("|") !== "Order|Item ID|Source sub-dim") continue;
    const heading = table.path[table.path.length - 1] ?? "";
    const match = /^Section ([ABC]) — (.+?) \(/.exec(heading);
    if (!match || !table.path.some((h) => h.startsWith("6.1 "))) continue;
    const code = match[1] as SectionCode;
    sections.push({ code, heading: match[2]!, position: sections.length + 1 });
    for (const row of table.rows) {
      const position = Number(row[0]);
      const idCell = row[1] ?? "";
      const itemCode = idCell.replace(/\s*\(R\)$/, "");
      const entry = bank.get(itemCode);
      if (entry === undefined) fail(`6.1 lists ${itemCode}, which Parts 2 to 5 do not define`);
      if (idCell.endsWith("(R)") !== entry.is_reverse) {
        fail(`6.1 and the item bank disagree on whether ${itemCode} is reverse-scored`);
      }
      items.push({ ...entry, section: code, position });
    }
  }
  if (items.length !== bank.size) {
    fail(`6.1 orders ${items.length} items but Parts 2 to 5 define ${bank.size}`);
  }
  items.sort((a, b) => a.position - b.position);
  items.forEach((item, i) => {
    if (item.position !== i + 1) fail(`6.1 positions are not 1 to ${items.length}`);
  });
  return { sections, items };
}

function pulseRotation(blueprint: string, items: readonly SurveyItem[]): PulseRotationRow[] {
  const all = tables(blueprint);
  const rotated = new Map<number, Set<string>>();
  for (const table of all) {
    if (table.header.join("|") !== "Quarter|Items in pulse") continue;
    for (const row of table.rows) {
      const quarter = /^Q([1-4])$/.exec(row[0] ?? "");
      if (!quarter) fail(`unexpected rotation row ${row[0]} at line ${table.line}`);
      const set = rotated.get(Number(quarter[1])) ?? new Set<string>();
      for (const code of (row[1] ?? "").split(",").map((c) => c.trim())) set.add(code);
      rotated.set(Number(quarter[1]), set);
    }
  }
  // Every pulse also carries the items tagged Q without rotation (OI5, TSI2), and CII-13 (D6).
  const fixed = items
    .filter((item) => item.in_pulse && !item.pulse_rotates)
    .map((item) => item.code);
  const rows: PulseRotationRow[] = [];
  for (const rotation of [1, 2, 3, 4] as const) {
    const set = rotated.get(rotation);
    if (set === undefined) fail(`no rotation row Q${rotation}`);
    for (const code of [...set, ...fixed, ...EVERY_PULSE]) {
      if (!items.some((item) => item.code === code)) fail(`rotation names unknown item ${code}`);
      if (!rows.some((r) => r.rotation === rotation && r.item_code === code)) {
        rows.push({ rotation, item_code: code });
      }
    }
  }
  const order = new Map(items.map((item) => [item.code, item.position]));
  return rows.sort(
    (a, b) =>
      a.rotation - b.rotation || (order.get(a.item_code) ?? 0) - (order.get(b.item_code) ?? 0),
  );
}

// Tier 3 Module Library and the Online Measurement Specification -------------------------------

function moduleOf(code: string): string {
  switch (prefixOf(code)) {
    case "O1C":
      return "M-O1-CASCADE";
    case "O2I":
      return "M-O2-IA";
    case "O3P":
      return "M-O3-PF";
    case "C5L":
      return "M-C5-TL";
    default:
      return fail(`no module for ${code}`);
  }
}

function portalCode(wording: string): string {
  const code = PORTAL_CODES[wording];
  if (code === undefined) fail(`no portal code for the item "${wording}"`);
  return code;
}

function moduleItems(moduleLibrary: string, onlineMeasurement: string): ModuleItem[] {
  const all = tables(moduleLibrary);
  const items: ModuleItem[] = [];
  const add = (item: Omit<ModuleItem, "position">) => {
    const position = items.filter((i) => i.module_code === item.module_code).length + 1;
    items.push({ ...item, position });
  };

  // Coded items: the all-member modules (with their open-text items) and the team-leader module.
  for (const table of all) {
    if (table.header[0] !== "ID" || table.header[1] !== "Item") continue;
    for (const row of table.rows) {
      const code = row[0] ?? "";
      if (!MODULE_CODE.test(code)) continue;
      const openText = table.header.length === 2;
      const likert = table.header[2] === "Scale";
      const anchored = table.header[2] === "Scale anchors";
      if (!openText && !likert && !anchored) fail(`unexpected module table at line ${table.line}`);
      if (likert && row[2] !== "5-point Likert") fail(`${code} is not on the 5-point Likert scale`);
      add({
        code,
        module_code: moduleOf(code),
        wording: plain(row[1] ?? ""),
        response_kind: openText ? "open_text" : likert ? "agree5" : "anchored5",
        anchors: anchored ? anchors(row[2] ?? "").map((a) => ({ ...a, description: null })) : null,
        is_reverse: (row[3] ?? "").includes("(R)"),
        online: !openText,
        portal_code: false,
      });
    }
  }

  // M-O1-LT: the five RAPID role items and the clarity item (Module Library 3.1).
  const roles = tableUnder(
    all,
    ["3.1 M-O1-LT", "Items (per decision type)"],
    ["Item", "Response format"],
  );
  for (const row of roles.rows) {
    const wording = plain(row[0] ?? "");
    const form = RAPID_FORM[row[1] ?? ""];
    if (form === undefined) fail(`unknown M-O1-LT response format "${row[1]}"`);
    add({
      code: portalCode(wording),
      module_code: "M-O1-LT",
      wording,
      response_kind: form,
      anchors: null,
      is_reverse: false,
      online: true,
      portal_code: true,
    });
  }
  const clarity = tableUnder(all, ["3.1 M-O1-LT", "Items (per decision type)"], ["Item", "Scale"]);
  for (const row of clarity.rows) {
    const wording = plain(row[0] ?? "");
    add({
      code: portalCode(wording),
      module_code: "M-O1-LT",
      wording,
      response_kind: "anchored5",
      anchors: anchors(row[1] ?? "").map((a) => ({ ...a, description: null })),
      is_reverse: false,
      online: true,
      portal_code: true,
    });
  }

  // M-C1-MGR (Module Library 4.1).
  const c1 = tableUnder(all, ["4.1 M-C1-MGR", "Items"], ["Item", "Scale"]);
  for (const row of c1.rows) {
    const wording = plain(row[0] ?? "");
    add({
      code: portalCode(wording),
      module_code: "M-C1-MGR",
      wording,
      response_kind: "anchored5",
      anchors: anchors(row[1] ?? "").map((a) => ({ ...a, description: null })),
      is_reverse: false,
      online: true,
      portal_code: true,
    });
  }

  // M-C2-MGR (Online Measurement Specification 4.1).
  const c2 = tableUnder(tables(onlineMeasurement), ["4.1 M-C2-MGR"], ["Item", "Scale"]);
  for (const row of c2.rows) {
    const wording = plain(row[0] ?? "");
    add({
      code: portalCode(wording),
      module_code: "M-C2-MGR",
      wording,
      response_kind: "anchored5",
      anchors: anchors(row[1] ?? "").map((a) => ({ ...a, description: null })),
      is_reverse: false,
      online: true,
      portal_code: true,
    });
  }

  // M-C3-MGR (Module Library 4.2): the band item carries the five bands with their descriptors.
  const bands = tableUnder(
    all,
    ["4.2 M-C3-MGR", "The 5-band framework"],
    ["Band", "Label", "Description"],
  );
  const bandAnchors = bands.rows
    .map((row) => ({ value: Number(row[0]), label: row[1] ?? "", description: row[2] ?? "" }))
    .sort((a, b) => a.value - b.value);
  const c3 = tableUnder(all, ["4.2 M-C3-MGR", "Items"], ["Item", "Response format"]);
  for (const row of c3.rows) {
    const wording = plain(row[0] ?? "");
    const band = wording === "Performance band";
    add({
      code: portalCode(wording),
      module_code: "M-C3-MGR",
      wording,
      response_kind: band ? "band5" : "evidence_note",
      anchors: band ? bandAnchors : null,
      is_reverse: false,
      online: true,
      portal_code: true,
    });
  }

  const moduleOrder = new Map(MODULES.map((m) => [m.code, m.position]));
  return items.sort(
    (a, b) =>
      (moduleOrder.get(a.module_code) ?? 0) - (moduleOrder.get(b.module_code) ?? 0) ||
      a.position - b.position,
  );
}

// The administrator checklists (Online Measurement Specification 4.2, 4.3, 4.3a) -----------------

const CHECKLISTS: readonly Checklist[] = [
  {
    code: "ADM-O1",
    repeats_over: "role_family",
    minimum_facts: null,
    source: "Online Measurement Specification 4.2",
    position: 1,
  },
  {
    code: "ADM-O2",
    repeats_over: "system",
    minimum_facts: null,
    source: "Online Measurement Specification 4.3",
    position: 2,
  },
  {
    code: "ADM-O4",
    repeats_over: "unit",
    minimum_facts: 3,
    source: "Online Measurement Specification 4.3a",
    position: 3,
  },
];

function checklistParts(onlineMeasurement: string): {
  facts: ChecklistFact[];
  values: ChecklistValue[];
  bands: ChecklistBand[];
} {
  const all = tables(onlineMeasurement);
  const facts: ChecklistFact[] = [];
  const values: ChecklistValue[] = [];
  const bands: ChecklistBand[] = [];

  // ADM-O1: three yes-or-no facts; the score counts the Yes answers.
  const o1 = tableUnder(all, ["4.2 ADM-O1"], ["ID", "Fact"]);
  o1.rows.forEach((row, i) => {
    const code = row[0] ?? "";
    facts.push({
      code,
      checklist_code: "ADM-O1",
      position: i + 1,
      wording: plain(row[1] ?? ""),
      response_kind: "yes_no",
      source_response: null,
    });
    values.push(
      { fact_code: code, option: "yes", label: "Yes", value: 1, position: 1 },
      { fact_code: code, option: "no", label: "No", value: 0, position: 2 },
    );
  });

  // ADM-O2: the response cell lists each answer with its value.
  const o2 = tableUnder(all, ["4.3 ADM-O2"], ["ID", "Fact", "Response"]);
  o2.rows.forEach((row, i) => {
    const code = row[0] ?? "";
    const cell = row[2] ?? "";
    const integration = code === "INT-1";
    const options = integration ? cell.split(";") : cell.split(",");
    const parsed = options.map((option, j) => {
      const text = option.trim();
      const excluded = /^(.*) \(excluded\)$/.exec(text);
      const valued = /^(.*) ([0-9.]+)$/.exec(text);
      const label = excluded?.[1] ?? valued?.[1] ?? fail(`unreadable answer "${text}" on ${code}`);
      const optionCode = ANSWER_CODES[label] ?? fail(`no answer code for "${label}"`);
      return {
        fact_code: code,
        option: optionCode,
        label,
        value: excluded ? null : Number(valued![2]),
        position: j + 1,
      };
    });
    values.push(...parsed);
    facts.push({
      code,
      checklist_code: "ADM-O2",
      position: i + 1,
      wording: plain(row[1] ?? ""),
      response_kind: integration ? "integration" : parsed.length === 3 ? "yes_partly_no" : "yes_no",
      source_response: cell,
    });
  });

  // ADM-O4: capacity facts scored by bands.
  const o4 = tableUnder(all, ["4.3a ADM-O4"], ["ID", "Fact", "Bands to score"]);
  o4.rows.forEach((row, i) => {
    const code = row[0] ?? "";
    const cell = row[2] ?? "";
    const reading = ADM_O4_BANDS[cell];
    if (reading === undefined) fail(`the ADM-O4 bands for ${code} changed at source: "${cell}"`);
    facts.push({
      code,
      checklist_code: "ADM-O4",
      position: i + 1,
      wording: plain(row[1] ?? ""),
      response_kind: reading.factKind,
      source_response: cell,
    });
    reading.bands.forEach((band, j) => bands.push({ fact_code: code, position: j + 1, ...band }));
    if (reading.factKind === "percent_or_na") {
      values.push({
        fact_code: code,
        option: NOT_APPLICABLE.option,
        label: NOT_APPLICABLE.label,
        value: null,
        position: 1,
      });
    }
  });

  return { facts, values, bands };
}

// Event triggers (Cadence Master 7.3; Online Measurement Specification 6.3) --------------------

function eventTriggers(cadenceMaster: string, onlineMeasurement: string): EventTrigger[] {
  const out: EventTrigger[] = [];
  const read = (trigger: string, source: string) => {
    const reading = EVENT_TRIGGERS[trigger];
    if (reading === undefined) fail(`no reading for the event trigger "${trigger}" (${source})`);
    if ("excluded" in reading) return;
    out.push({ ...reading, source_trigger: trigger, source, position: out.length + 1 });
  };
  const cadence = tableUnder(
    tables(cadenceMaster),
    ["7.3 Event trigger summary"],
    ["Trigger", "Affected sub-dimensions", "Action"],
  );
  for (const row of cadence.rows) read(plain(row[0] ?? ""), "Cadence Master 7.3");
  const oms = tableUnder(
    tables(onlineMeasurement),
    ["6.3 Event triggers"],
    ["Detected change", "Prompt"],
  );
  for (const row of oms.rows) {
    const trigger = plain(row[0] ?? "");
    if (OMS_TRIGGERS_ALREADY_IN_CADENCE_MASTER.includes(trigger)) continue;
    read(trigger, "Online Measurement Specification 6.3");
  }
  return out;
}

export function parseReference(docs: SourceDocuments): ReferenceSet {
  const { sections, items } = surveyItems(docs.blueprint);
  const checklists = checklistParts(docs.onlineMeasurement);
  return {
    survey_sections: sections,
    survey_items: items,
    pulse_rotation: pulseRotation(docs.blueprint, items),
    modules: [...MODULES],
    module_items: moduleItems(docs.moduleLibrary, docs.onlineMeasurement),
    checklists: [...CHECKLISTS],
    checklist_facts: checklists.facts,
    checklist_values: checklists.values,
    checklist_bands: checklists.bands,
    event_triggers: eventTriggers(docs.cadenceMaster, docs.onlineMeasurement),
  };
}

/** The tables of a document, for tests that inspect a source directly. */
export { tables, type Table };
