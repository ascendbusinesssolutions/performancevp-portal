import type { SlotValue } from "./template";

/**
 * One fixture per branch of every template (PORTAL_COPY_SPEC.md Section 7): the slot values and
 * the exact sentence expected, keyed "module.key". The copy check fails when a templated key has
 * no fixture, when a fixture's slots differ from the template's, or when a fixture's output fails
 * the copy lint.
 */
export interface CopyFixture {
  slots: Record<string, SlotValue>;
  expected: string;
}

export const COPY_FIXTURES: Readonly<Record<string, readonly CopyFixture[]>> = {
  "common.list.more": [{ slots: { n: 3 }, expected: "3 more" }],
  "console.access.sessions.line": [
    {
      slots: {
        staff: "Sam Support",
        start: "23 Sept 2026, 9:05 am",
        end: "23 Sept 2026, 11:05 am",
        reason: "Guided setup of the directory",
      },
      expected:
        "Sam Support, 23 Sept 2026, 9:05 am to 23 Sept 2026, 11:05 am, Guided setup of the directory",
    },
    {
      slots: {
        staff: "Sam Support",
        start: "23 Sept 2026, 9:05 am",
        end: "open now",
        reason: "Guided setup of the directory",
      },
      expected: "Sam Support, 23 Sept 2026, 9:05 am to open now, Guided setup of the directory",
    },
  ],
  "setup.notice.staffSession": [
    {
      slots: { organisation: "Harbour Freight", time: "11:05 am" },
      expected:
        "You are working in Harbour Freight under a PerformanceVP support session that ends at 11:05 am. Everything you do here is recorded and shown to the organisation.",
    },
  ],
  "units.page.meta": [{ slots: { units: 4, people: 1240 }, expected: "4 units, 1,240 people" }],
  "units.leader.proposed": [{ slots: { name: "Mia Manager" }, expected: "Proposed: Mia Manager" }],
  "units.leader.ambiguous": [{ slots: { n: 2 }, expected: "2 could lead it; choose one" }],
  "units.edit.meta": [{ slots: { code: "OPS", people: 34 }, expected: "Code OPS. 34 people." }],
  "units.edit.codeNote": [
    { slots: { code: "OPS" }, expected: "The code stays OPS. Renaming keeps the unit's history." },
  ],
  "units.leader.proposedNote": [
    {
      slots: { name: "Mia Manager" },
      expected:
        "Mia Manager is the only person in the unit whose manager sits outside it, so is proposed. Save to confirm.",
    },
  ],
  "units.leader.ambiguousNote": [
    {
      slots: { n: 3 },
      expected:
        "3 people in the unit have a manager outside it, or none. Choose which of them leads it.",
    },
  ],
  "units.retire.blocked": [
    {
      slots: { people: 12 },
      expected: "12 people are in this unit. Move them to another unit first.",
    },
  ],
  "console.access.termRange": [
    { slots: { start: "2026-09-01", end: "2027-08-31" }, expected: "2026-09-01 to 2027-08-31" },
  ],
};
