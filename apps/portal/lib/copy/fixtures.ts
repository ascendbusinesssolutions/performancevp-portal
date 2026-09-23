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
  "context.family.problem.tooFew": [
    { slots: { n: 5, min: 8 }, expected: "skills 5 (at least 8 needed)" },
  ],
  "context.family.problem.tooMany": [
    { slots: { n: 17, max: 15 }, expected: "skills 17 (at most 15)" },
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
  "readiness.summary": [
    { slots: { b: 2, w: 1, p: 9 }, expected: "Blockers 2 \u00b7 Warnings 1 \u00b7 Passed 9" },
  ],
  "readiness.units.pass": [{ slots: { n: 4 }, expected: "All 4 units." }],
  "readiness.managers.pass": [{ slots: { n: 120 }, expected: "120 of 120." }],
  "readiness.managers.passHead": [
    {
      slots: { n: 119, head: "Ruth Root" },
      expected: "119 of 119, with Ruth Root at the head of the organisation.",
    },
  ],
  "readiness.unitForEveryone.pass": [{ slots: { n: 120 }, expected: "120 of 120." }],
  "readiness.roleFamilies.pass": [
    {
      slots: { units: 4, families: 3, min: 9, max: 12 },
      expected: "4 of 4 units. 3 role families, 9 to 12 skills each, critical skills marked.",
    },
  ],
  "readiness.context.pass": [
    { slots: { units: 4, processes: 3 }, expected: "4 of 4 units. 3 processes named in each." },
  ],
  "readiness.formalRatings.pass": [
    {
      slots: { n: 88 },
      expected: "Mapped to the five bands. Dated within 12 months for 88 people.",
    },
  ],
  "readiness.formalRatings.below": [
    {
      slots: { list: "Sales and Service" },
      expected: "Below 80% in Sales and Service, where managers rate instead.",
    },
  ],
  "readiness.workEmails.pass": [
    { slots: { n: 120 }, expected: "120 of 120 valid. Invitations can be sent." },
  ],
  "readiness.units.blocker": [
    {
      slots: { unit: "Claims", n: 9 },
      expected: "Claims has 9. A unit below 10 cannot be measured.",
    },
  ],
  "readiness.units.empty": [
    {
      slots: { unit: "Former Sales" },
      expected:
        "Former Sales has no one in it. Retire it, or record the merge or split it was part of.",
    },
  ],
  "readiness.managers.noManager": [
    {
      slots: { n: 2, list: "Ruth Root and Sol Saleslead" },
      expected:
        "2 without: Ruth Root and Sol Saleslead. Manager ratings and skill coverage need the reporting line. Only the head of the organisation may have none.",
    },
  ],
  "readiness.managers.left": [
    {
      slots: { n: 3, list: "A, B and C" },
      expected: "3 report to someone who has left: A, B and C.",
    },
  ],
  "readiness.workEmails.blocker": [
    { slots: { n: 1, list: "Nina New" }, expected: "1 invalid or missing: Nina New." },
  ],
  "readiness.roleFamilies.noRoleFamily": [
    { slots: { unit: "Claims", n: 4 }, expected: "Claims: 4 without a role family." },
  ],
  "readiness.roleFamilies.family": [
    {
      slots: {
        family: "Analysts",
        problems: "skills 5 (at least 8 needed); no critical skill marked",
      },
      expected: "Analysts: skills 5 (at least 8 needed); no critical skill marked.",
    },
  ],
  "readiness.context.blocker": [
    {
      slots: { unit: "Claims", missing: "critical processes 1 (3 needed)" },
      expected: "Claims: critical processes 1 (3 needed).",
    },
  ],
  "readiness.context.part.domains": [
    { slots: { n: 2, min: 3, max: 6 }, expected: "knowledge domains 2 (3 to 6 needed)" },
  ],
  "readiness.context.part.decisions": [
    { slots: { n: 5, min: 8, max: 12 }, expected: "decision types 5 (8 to 12 needed)" },
  ],
  "readiness.context.part.processes": [
    { slots: { n: 1, needed: 3 }, expected: "critical processes 1 (3 needed)" },
  ],
  "readiness.context.part.systems": [
    { slots: { n: 0, min: 3, max: 8 }, expected: "primary systems 0 (3 to 8 needed)" },
  ],
  "readiness.criticalDomain.warning": [
    {
      slots: { unit: "Claims" },
      expected:
        "Claims has no knowledge domain marked critical. Knowledge will be insufficient for Claims until one is.",
    },
  ],
  "readiness.leadershipTeam.warning": [
    {
      slots: { unit: "Claims", n: 2 },
      expected:
        "Claims has 2 flagged. Clarity & decision rights will be insufficient for Claims until 3 are flagged.",
    },
  ],
  "readiness.teamLeaders.warning": [
    {
      slots: { unit: "Claims" },
      expected: "Claims has none. The learning module goes to its unit leader instead.",
    },
  ],
  "readiness.unitLeader.none": [
    { slots: { unit: "Claims" }, expected: "Claims has no unit leader." },
  ],
  "readiness.unitLeader.ambiguous": [
    {
      slots: { unit: "Claims", n: 2 },
      expected: "Claims has no unit leader: 2 people could lead it. Choose one.",
    },
  ],
  "readiness.formalRatings.unmapped": [
    {
      slots: { list: "Outstanding and Needs work" },
      expected: "Not mapped to a band: Outstanding and Needs work.",
    },
  ],
  "setup.status.units": [{ slots: { count: 4 }, expected: "4 units" }],
  "setup.status.people": [
    { slots: { n: 1240, date: "23 Sept 2026" }, expected: "1,240 people, uploaded 23 Sept 2026" },
  ],
  "setup.status.peopleNoUpload": [{ slots: { n: 41 }, expected: "41 people" }],
  "setup.status.context": [
    {
      slots: { done: 2, total: 4, remaining: "Claims and Sales" },
      expected: "2 of 4 units. Claims and Sales to go.",
    },
  ],
  "setup.status.contextDone": [{ slots: { done: 4, total: 4 }, expected: "4 of 4 units." }],
  "setup.status.formalMapped": [
    { slots: { n: 88 }, expected: "Mapped. 88 people within 12 months." },
  ],
  "setup.status.blockers": [{ slots: { n: 3 }, expected: "3 blockers" }],
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
