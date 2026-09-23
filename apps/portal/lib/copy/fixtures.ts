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
  "context.families.intro": [
    {
      slots: { min: 8, max: 15 },
      expected:
        "Managers rate each person on the skills of their role family. A role family needs 8 to 15 skills, both technical and behavioural, with the critical ones marked.",
    },
  ],
  "context.family.count": [{ slots: { n: 11 }, expected: "11 skills" }],
  "context.family.problem.tooFew": [{ slots: { n: 5, min: 8 }, expected: "5 skills; 8 needed" }],
  "context.family.problem.tooMany": [
    { slots: { n: 17, max: 15 }, expected: "17 skills; at most 15" },
  ],
  "context.family.retire.blocked": [
    { slots: { n: 42 }, expected: "42 people have this role family. Give them another first." },
  ],
  "context.family.addFromTemplateTitle": [
    {
      slots: { family: "Claims officers" },
      expected: "Add skills to Claims officers from a template",
    },
  ],
  "context.units.intro": [
    {
      slots: { domains: "3 to 6", decisions: "8 to 12", processes: 3, systems: "3 to 8" },
      expected:
        "For every unit with people in it: 3 to 6 knowledge domains, 8 to 12 decision types, 3 critical processes and 3 to 8 primary systems.",
    },
  ],
  "context.unit.meta": [
    { slots: { people: 34, type: "Operations" }, expected: "34 people. Unit type: Operations." },
  ],
  "context.unit.count": [
    { slots: { n: 2, needed: "3 to 6 needed" }, expected: "2 named; 3 to 6 needed." },
    { slots: { n: 3, needed: "complete" }, expected: "3 named; complete." },
  ],
  "context.domains.intro": [
    {
      slots: { min: 3, max: 6 },
      expected:
        "The areas of knowledge the unit's work depends on, each with how critical it is. Managers rate each person's working knowledge of each domain. Name 3 to 6.",
    },
  ],
  "context.decisions.intro": [
    {
      slots: { min: 8, max: 12 },
      expected:
        "The decisions the unit's leadership team is asked about: who proposes, who decides, who must agree. Choose 8 to 12 from the list for this kind of unit, and add any of your own.",
    },
  ],
  "context.decisions.starter": [
    { slots: { type: "Operations" }, expected: "Suggested for Operations units" },
  ],
  "context.processes.intro": [
    {
      slots: { n: 3 },
      expected:
        "The processes most of the unit's work flows through. Members are asked where each one creates friction. Name exactly 3.",
    },
  ],
  "context.processes.full": [
    { slots: { n: 3 }, expected: "3 are named. Remove one to name another." },
  ],
  "context.systems.intro": [
    {
      slots: { min: 3, max: 8 },
      expected:
        "The systems the unit relies on. The administrator checklist asks about each one's ownership, currency and fit. Name 3 to 8.",
    },
  ],
  "context.range": [{ slots: { min: 3, max: 6 }, expected: "3 to 6" }],
  "context.need.range": [{ slots: { min: 8, max: 12 }, expected: "8 to 12 needed" }],
  "context.need.exact": [{ slots: { n: 3 }, expected: "exactly 3 needed" }],
  "ratings-map.labels.bandOption": [
    {
      slots: { band: 4, name: "Exceeding expectations" },
      expected: "Band 4: Exceeding expectations",
    },
  ],
  "ratings-map.decision.mapped": [
    { slots: { calibration: "calibrated" }, expected: "Mapped, and declared calibrated." },
    { slots: { calibration: "not calibrated" }, expected: "Mapped, and declared not calibrated." },
  ],
  "ratings-map.units.coverage": [{ slots: { pct: 85 }, expected: "85% of FTE" }],
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
