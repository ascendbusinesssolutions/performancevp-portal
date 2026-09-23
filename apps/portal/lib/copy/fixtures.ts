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
  "directory.preview.newUnitLine": [
    {
      slots: { code: "CLM", name: "Claims", n: 34 },
      expected: "Unit code CLM is new. It will be created as a unit named Claims, 34 people.",
    },
  ],
  "directory.preview.leaversThreshold": [
    {
      slots: { n: 14, threshold: 12 },
      expected:
        "14 leavers is more than 12. Confirm the file is the whole directory before applying it.",
    },
  ],
  "directory.preview.ratings.present": [
    {
      slots: { n: 88, total: 112, current: 80 },
      expected: "Rating and date present for 88 of 112. Dated within 12 months: 80.",
    },
  ],
  "directory.preview.ratings.coverage": [
    {
      slots: { list: "Claims 92%, Sales 40%" },
      expected: "Coverage by unit: Claims 92%, Sales 40%.",
    },
  ],
  "directory.preview.ratings.unitShare": [
    { slots: { unit: "Claims", pct: 92 }, expected: "Claims 92%" },
  ],
  "directory.preview.ratings.below": [
    {
      slots: { list: "Sales and Service" },
      expected: "The managers of Sales and Service will rate instead.",
    },
  ],
  "directory.page.meta": [
    { slots: { active: 1240, inactive: 3 }, expected: "1,240 active, 3 deactivated" },
  ],
  "directory.people.count": [{ slots: { shown: 100, total: 1240 }, expected: "100 of 1,240" }],
  "directory.people.page": [{ slots: { page: 2, pages: 13 }, expected: "Page 2 of 13" }],
  "directory.person.meta": [{ slots: { ref: "E00417" }, expected: "Employee ID E00417" }],
  "directory.person.managerNow": [
    { slots: { name: "Mia Manager" }, expected: "Currently Mia Manager." },
  ],
  "directory.person.rating.current": [
    { slots: { label: "Exceeds", date: "31 Mar 2026" }, expected: "Exceeds, dated 31 Mar 2026." },
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
