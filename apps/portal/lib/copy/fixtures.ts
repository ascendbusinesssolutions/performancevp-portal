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
  "common.people.many": [{ slots: { n: 7 }, expected: "7 people" }],
  "common.units.many": [{ slots: { n: 3 }, expected: "3 units" }],
  "common.families.many": [{ slots: { n: 2 }, expected: "2 role families" }],
  "setup.status.unitsToSettle": [
    {
      slots: { units: "3 units", n: 2 },
      expected: "3 units. 2 need a choice of how they are measured.",
    },
  ],
  "setup.status.unitsToSettleOne": [
    { slots: { units: "4 units" }, expected: "4 units. 1 needs a choice of how it is measured." },
  ],
  "context.unit.metaCombined": [
    {
      slots: { people: "14 people", list: "Claims and Service" },
      expected: "14 people in Claims and Service.",
    },
  ],
  "context.unit.start.from": [
    { slots: { unit: "Claims" }, expected: "Start from the context of Claims" },
  ],
  "units.tree.below": [{ slots: { parent: "Group" }, expected: "below Group" }],
  "survey.bar.group": [{ slots: { g: 3, total: 12 }, expected: "Group 3 of 12" }],
  "manager.index.row": [
    {
      slots: { campaign: "Annual baseline", date: "Monday 28 September" },
      expected: "Annual baseline, closes Monday 28 September",
    },
  ],
  "manager.eyebrow": [
    {
      slots: { campaign: "Annual baseline", units: "Member Services" },
      expected: "Annual baseline · Member Services",
    },
  ],
  "manager.meta": [
    {
      slots: { done: 3, total: 8, date: "Monday 28 September" },
      expected: "3 of 8 done. Closes Monday 28 September. Your answers save as you go.",
    },
  ],
  "manager.report.meta": [
    {
      slots: { family: "Claims officers", team: "North", fte: 1, start: "1 February 2022" },
      expected: "Claims officers · North · 1 FTE · started 1 February 2022",
    },
  ],
  "manager.report.metaNoTeam": [
    {
      slots: { family: "Claims officers", fte: 0.6, start: "1 February 2022" },
      expected: "Claims officers · 0.6 FTE · started 1 February 2022",
    },
  ],
  "manager.anchor": [{ slots: { value: 1, label: "Novice" }, expected: "1 Novice" }],
  "manager.scale.value": [{ slots: { value: 5, label: "Expert" }, expected: "5, Expert" }],
  "manager.formalRoute": [
    {
      slots: { unit: "Member Services" },
      expected:
        "Talent density for Member Services comes from your organisation's formal ratings this year, so no overall band is asked here.",
    },
  ],
  "manager.next": [{ slots: { name: "Ana Lee" }, expected: "Done, next: Ana Lee" }],
  "campaigns.checklists.row": [
    {
      slots: { checklist: "Role architecture", units: "2 units" },
      expected: "Role architecture, 2 units",
    },
  ],
  "campaigns.checklists.status.some": [{ slots: { n: 1, total: 2 }, expected: "Saved for 1 of 2" }],
  "campaigns.checklists.unitLink": [
    {
      slots: { checklist: "Capacity facts", unit: "Dispatch" },
      expected: "Capacity facts for Dispatch",
    },
  ],
  "campaigns.checklist.title": [
    { slots: { unit: "Dispatch" }, expected: "Your checklists for Dispatch" },
  ],
  "campaigns.checklist.meta": [
    {
      slots: { campaign: "Baseline", date: "Thursday 8 October", time: "5 pm" },
      expected: "Baseline. Closes Thursday 8 October, 5 pm.",
    },
  ],
  "campaigns.checklist.intro.ADM-O1": [
    {
      slots: { unit: "Dispatch" },
      expected:
        "For each role family in Dispatch: whether its position description holds each of these.",
    },
  ],
  "campaigns.checklist.intro.ADM-O2": [
    {
      slots: { unit: "Dispatch" },
      expected: "For each of the primary systems Dispatch relies on.",
    },
  ],
  "campaigns.checklist.saveName": [
    { slots: { checklist: "Capacity facts" }, expected: "Save Capacity facts" },
  ],
  "survey.bar.decision": [{ slots: { g: 2, total: 8 }, expected: "Decision 2 of 8" }],
  "survey.landing.eyebrow": [
    {
      slots: { organisation: "Northwind Mutual", unit: "Member Services" },
      expected: "Northwind Mutual · Member Services",
    },
  ],
  "survey.landing.title.members": [
    { slots: { unit: "Member Services" }, expected: "How is work going in Member Services?" },
  ],
  "survey.landing.title.leadershipTeam": [
    { slots: { unit: "Member Services" }, expected: "Who decides what in Member Services?" },
  ],
  "survey.landing.anonymous": [
    {
      slots: { floor: 5 },
      expected: "No name, no email, no login. Answers are only shown for groups of 5 or more.",
    },
  ],
  "survey.landing.minutes.title": [{ slots: { minutes: 15 }, expected: "About 15 minutes" }],
  "survey.landing.questions": [
    { slots: { items: 71, groups: 18 }, expected: "71 short questions in 18 groups." },
  ],
  "survey.landing.decisions": [
    { slots: { n: 8 }, expected: "8 of the unit's decisions, with six short questions on each." },
  ],
  "survey.about.behalf": [
    {
      slots: { organisation: "Northwind Mutual" },
      expected: "PerformanceVP runs this survey on behalf of Northwind Mutual.",
    },
  ],
  "survey.about.shown": [
    {
      slots: { organisation: "Northwind Mutual", floor: 5 },
      expected:
        "Northwind Mutual sees results for the unit, and for groups of 5 or more, never one person's answers.",
    },
  ],
  "survey.scale.value": [
    { slots: { value: 1, label: "Strongly disagree" }, expected: "1, Strongly disagree" },
  ],
  "survey.partB.process": [
    { slots: { process: "Claims intake" }, expected: "Thinking about Claims intake" },
  ],
  "email.footer": [
    {
      slots: { organisation: "Northwind Mutual" },
      expected: "Sent by PerformanceVP for Northwind Mutual.",
    },
  ],
  "email.survey.subject": [
    {
      slots: { organisation: "Northwind Mutual" },
      expected: "A short survey for Northwind Mutual",
    },
  ],
  "email.survey.intro": [
    {
      slots: { organisation: "Northwind Mutual" },
      expected:
        "Northwind Mutual has asked PerformanceVP to run a short survey about how work is going.",
    },
  ],
  "email.survey.link.members_part_a": [
    {
      slots: { unit: "Member Services", minutes: 15 },
      expected: "The survey about Member Services, about 15 minutes:",
    },
  ],
  "email.survey.link.members_part_b": [
    {
      slots: { unit: "Member Services", minutes: 6 },
      expected: "A second, shorter survey about Member Services, about 6 minutes:",
    },
  ],
  "email.survey.link.team_leaders": [
    {
      slots: { unit: "Member Services", minutes: 15 },
      expected: "Questions for team leaders in Member Services, about 15 minutes:",
    },
  ],
  "email.survey.link.leadership_team": [
    {
      slots: { unit: "Member Services", minutes: 10 },
      expected: "Questions for the leadership team of Member Services, about 10 minutes:",
    },
  ],
  "email.survey.closes": [
    {
      slots: { date: "Monday 28 September", time: "5 pm" },
      expected: "The survey closes Monday 28 September at 5 pm.",
    },
  ],
  "email.survey.behalf": [
    {
      slots: { organisation: "Northwind Mutual" },
      expected: "PerformanceVP runs this survey on behalf of Northwind Mutual.",
    },
  ],
  "email.manager.subject": [
    {
      slots: { organisation: "Northwind Mutual" },
      expected: "Rate your team for Northwind Mutual",
    },
  ],
  "email.manager.intro": [
    {
      slots: { organisation: "Northwind Mutual", units: "Member Services" },
      expected:
        "Northwind Mutual is asking you to rate the skills and knowledge of your direct reports in Member Services.",
    },
  ],
  "email.manager.closes": [
    {
      slots: { date: "Monday 28 September", time: "5 pm" },
      expected: "Rating closes Monday 28 September at 5 pm.",
    },
  ],
  "email.refused.subject": [
    { slots: { campaign: "Quarterly pulse" }, expected: "Quarterly pulse did not open" },
  ],
  "email.refused.body": [
    {
      slots: { campaign: "Quarterly pulse" },
      expected:
        "Quarterly pulse was scheduled to open, but the readiness check found something to fix first. It is a draft again.",
    },
  ],
  "email.scores.subject": [
    {
      slots: { campaign: "Annual baseline" },
      expected: "Results ready for review: Annual baseline",
    },
  ],
  "email.scores.body": [
    {
      slots: { campaign: "Annual baseline" },
      expected:
        "Annual baseline has closed. Scores are calculated and held for your review. Nothing is visible to viewers until you release it.",
    },
  ],
  "units.measurement.lineageNote": [
    {
      slots: { name: "Claims and Service" },
      expected:
        "Claims and Service has results from a campaign, so it is not changed in place. It is kept with its history, the new arrangement starts as a new measurement unit, and trends show the change as a break.",
    },
  ],
  "units.measurement.combination.retireNote": [
    {
      slots: { name: "Claims and Service" },
      expected:
        "Claims and Service has results from a campaign. Undoing retires it, with its history and context kept, and its units are measured on their own again, each trend marked as a break.",
    },
  ],
  "units.measurement.running": [
    {
      slots: { name: "Claims and Service" },
      expected:
        "A campaign is measuring Claims and Service. It can be changed after that campaign closes.",
    },
  ],
  "units.measurement.split.name": [
    { slots: { unit: "Claims" }, expected: "Measure Claims on its own" },
  ],
  "units.measurement.splitNote": [
    {
      slots: { unit: "Claims", people: "11 people" },
      expected:
        "Claims now has 11 people, enough to be measured on its own. The rest stay combined.",
    },
  ],
  "units.measurement.splitNoteRest": [
    {
      slots: { unit: "Claims", people: "11 people" },
      expected:
        "Claims now has 11 people, enough to be measured on its own. The rest are measured on their own again.",
    },
  ],
  "campaigns.calendar.due": [
    {
      slots: { cadence: "Quarterly pulse", date: "Thursday 24 December" },
      expected: "Quarterly pulse, due Thursday 24 December",
    },
  ],
  "campaigns.calendar.units": [
    { slots: { list: "Claims and Service" }, expected: "For Claims and Service." },
  ],
  "campaigns.calendar.scheduleName": [
    {
      slots: { cadence: "Quarterly pulse", date: "Thursday 24 December" },
      expected: "Schedule the Quarterly pulse due Thursday 24 December",
    },
  ],
  "campaigns.calendar.scheduleNote": [
    {
      slots: { date: "Thursday 24 December", close: "Monday 28 December" },
      expected: "It opens Thursday 24 December at 9 am and closes Monday 28 December at 5 pm.",
    },
  ],
  "campaigns.calendar.dismissName": [
    {
      slots: { cadence: "Half-yearly check", date: "Wednesday 24 March 2027" },
      expected: "Dismiss the Half-yearly check due Wednesday 24 March 2027",
    },
  ],
  "campaigns.window.range": [
    {
      slots: { opens: "Tuesday 15 September", closes: "Monday 28 September" },
      expected: "Tuesday 15 September to Monday 28 September",
    },
  ],
  "campaigns.cadence.eventNamed": [
    {
      slots: { trigger: "Major process redesign" },
      expected: "Event: Major process redesign",
    },
  ],
  "campaigns.state.scheduled": [
    { slots: { date: "Tuesday 6 October" }, expected: "Scheduled, opens Tuesday 6 October" },
  ],
  "campaigns.state.open": [
    {
      slots: { date: "Monday 28 September", time: "5 pm" },
      expected: "Open, closes Monday 28 September, 5 pm",
    },
  ],
  "campaigns.state.closed": [
    {
      slots: { date: "Monday 28 September" },
      expected: "Closed Monday 28 September, under review",
    },
  ],
  "campaigns.state.released": [
    { slots: { date: "Friday 2 October" }, expected: "Released Friday 2 October" },
  ],
  "campaigns.draft.windowLine": [
    {
      slots: {
        opens: "Tuesday 6 October",
        openTime: "9 am",
        closes: "Monday 19 October",
        closeTime: "5 pm",
      },
      expected: "Opens Tuesday 6 October at 9 am. Closes Monday 19 October at 5 pm.",
    },
  ],
  "campaigns.draft.launchNote": [
    {
      slots: { date: "Thursday 8 October", time: "5 pm" },
      expected: "It opens now and closes Thursday 8 October at 5 pm.",
    },
  ],
  "campaigns.draft.scheduleNote": [
    {
      slots: { date: "Tuesday 6 October", time: "9 am" },
      expected: "It opens Tuesday 6 October at 9 am, once readiness passes then.",
    },
  ],
  "campaigns.preview.needs": [{ slots: { n: 36 }, expected: "needs 36" }],
  "campaigns.preview.fallback": [{ slots: { n: 1 }, expected: "1, the unit leader" }],
  "campaigns.preview.formal": [
    { slots: { n: 6 }, expected: "6; formal ratings for talent density" },
  ],
  "campaigns.preview.emailed": [
    { slots: { people: "72 people" }, expected: "72 people receive the anonymous survey." },
  ],
  "campaigns.blocker.unitsChanged": [
    {
      slots: { list: "Claims and Service" },
      expected:
        "Claims and Service changed after this draft was made. Check the units below and save the draft before it launches.",
    },
  ],
  "campaigns.blocker.notMeasured": [
    {
      slots: { unit: "Claims" },
      expected:
        "Claims is no longer measured as it was when the draft was made. Remove it, and add the unit that now measures its people.",
    },
  ],
  "campaigns.blocker.needsFullRun": [
    {
      slots: { unit: "Claims" },
      expected:
        "Claims has no released baseline or annual result to carry forward from. Its first campaign is a baseline.",
    },
  ],
  "campaigns.blocker.busy": [
    {
      slots: { unit: "Claims" },
      expected: "Another campaign is measuring Claims. Launch this one after that campaign closes.",
    },
  ],
  "campaigns.blocker.readiness": [
    { slots: { check: "Work emails" }, expected: "Work emails: see the readiness check." },
  ],
  "campaigns.launched.accountsPending": [
    {
      slots: { n: 2 },
      expected: "Sign-in is not yet ready for 2 managers. It is set up again automatically.",
    },
  ],
  "campaigns.launched.meta": [
    { slots: { date: "Tuesday 15 September" }, expected: "Launched Tuesday 15 September." },
  ],
  "readiness.teamSize.warning": [
    {
      slots: { unit: "Claims", teams: "Intake has 2 and Claims has 1" },
      expected:
        "Claims: Intake has 2 and Claims has 1. A team under 4 can never reach the 4 responses a team result needs, so its own results are never shown; its people still count for the unit. Merge it into another team.",
    },
  ],
  "readiness.teamSize.team": [{ slots: { team: "Intake", n: 2 }, expected: "Intake has 2" }],
  "units.leader.option.above": [
    { slots: { name: "Ruth Root", unit: "Head Office" }, expected: "Ruth Root, Head Office" },
  ],
  "units.measurement.leader.rollUp": [
    {
      slots: { name: "Mia Manager", unit: "Operations" },
      expected: "Mia Manager, the leader of Operations",
    },
  ],
  "units.measurement.short.heading": [
    { slots: { unit: "Claims", people: "7 people" }, expected: "Claims, 7 people" },
  ],
  "units.measurement.combine.name": [
    { slots: { unit: "Claims", candidate: "Service" }, expected: "Combine Claims with Service" },
  ],
  "units.measurement.withdraw.name": [
    { slots: { unit: "Executive" }, expected: "Measure Executive with a unit below instead" },
  ],
  "units.measurement.combination.holds": [
    {
      slots: { list: "Claims and Service", people: "14 people" },
      expected: "Holds Claims and Service: 14 people.",
    },
  ],
  "units.measurement.combination.rollUp": [
    {
      slots: { unit: "Operations" },
      expected:
        "Led by the leader of Operations, the unit above the others it holds. Change it on that unit.",
    },
  ],
  "units.measurement.combination.undoNote": [
    {
      slots: { name: "Claims and Service" },
      expected:
        "Undoing removes the context entered for Claims and Service. Each unit's own context is kept.",
    },
  ],
  "units.measurement.notice.combined": [
    {
      slots: { name: "Claims and Service", list: "Claims and Service", people: "14 people" },
      expected: "Combined. Claims and Service holds Claims and Service: 14 people.",
    },
  ],
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
        "For every unit that is measured: 3 to 6 knowledge domains, 8 to 12 decision types, 3 critical processes and 3 to 8 primary systems.",
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
  "readiness.units.pass": [
    { slots: { units: "4 units" }, expected: "4 units of 10 or more." },
    { slots: { units: "1 unit" }, expected: "1 unit of 10 or more." },
  ],
  "readiness.grouping.keptOne": [
    {
      slots: { unit: "Executive" },
      expected: "Executive groups the units below it and is not measured.",
    },
  ],
  "readiness.grouping.keptMany": [
    {
      slots: { list: "Executive and Corporate" },
      expected: "Executive and Corporate group the units below them and are not measured.",
    },
  ],
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
      slots: { n: 4, units: "4 units", families: "3 role families", min: 9, max: 12 },
      expected: "4 of 4 units. 3 role families, 9 to 12 skills each, critical skills marked.",
    },
  ],
  "readiness.context.pass": [
    {
      slots: { n: 4, units: "4 units", processes: 3 },
      expected: "4 of 4 units. 3 processes named in each.",
    },
    {
      slots: { n: 1, units: "1 unit", processes: 3 },
      expected: "1 of 1 unit. 3 processes named in each.",
    },
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
      expected: "Claims has 9. Nothing under 10 is measured. Combine it with a unit in its branch.",
    },
  ],
  "readiness.units.combinationShort": [
    {
      slots: { unit: "Claims and Service", list: "Claims and Service", people: "8 people" },
      expected: "Claims and Service holds Claims and Service: 8 people, still short of 10.",
    },
  ],
  "readiness.units.branchBroken": [
    {
      slots: { unit: "Claims and Service" },
      expected:
        "Claims and Service holds units that no longer share a branch. Undo it and choose again.",
    },
  ],
  "readiness.grouping.undecided": [
    {
      slots: { unit: "Executive", n: 3 },
      expected:
        "Executive has 3 of its own and units below it. Unless it is combined with a unit below, it is not measured and its people are not surveyed as members.",
    },
  ],
  "readiness.candidate.beside": [
    {
      slots: { candidate: "Service", people: "7 people", together: "14 together" },
      expected: "Service, beside it: 7 people, 14 together.",
    },
  ],
  "readiness.candidate.above": [
    {
      slots: { candidate: "Field", people: "1 person", together: "8 together, still short of 10" },
      expected: "Field, above it: 1 person, 8 together, still short of 10.",
    },
  ],
  "readiness.candidate.aboveGrouping": [
    {
      slots: {
        candidate: "Head Office",
        parent: "Field",
        people: "3 people",
        together: "12 together",
      },
      expected: "Head Office, above Field: 3 people, 12 together.",
    },
  ],
  "readiness.candidate.below": [
    {
      slots: { candidate: "Claims", people: "8 people", together: "14 together" },
      expected: "Claims, below it: 8 people, 14 together.",
    },
  ],
  "readiness.candidate.together": [{ slots: { total: 14 }, expected: "14 together" }],
  "readiness.candidate.togetherShort": [
    { slots: { total: 8 }, expected: "8 together, still short of 10" },
  ],
  "readiness.unitLeader.notFlagged": [
    {
      slots: { leader: "Ruth Root", unit: "Claims and Service" },
      expected: "Ruth Root, who leads Claims and Service, is not flagged as leadership team.",
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
  "setup.status.people": [
    { slots: { n: 1240, date: "23 Sept 2026" }, expected: "1,240 people, uploaded 23 Sept 2026" },
  ],
  "setup.status.peopleNoUpload": [{ slots: { n: 41 }, expected: "41 people" }],
  "setup.status.context": [
    {
      slots: { done: 2, total: "4 units", remaining: "Claims and Sales" },
      expected: "2 of 4 units. Claims and Sales to go.",
    },
    {
      slots: { done: 0, total: "1 unit", remaining: "Operations" },
      expected: "0 of 1 unit. Operations to go.",
    },
  ],
  "setup.status.contextDone": [{ slots: { done: 4, total: "4 units" }, expected: "4 of 4 units." }],
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
  "units.page.meta": [
    { slots: { units: "4 units", people: "1,240 people" }, expected: "4 units, 1,240 people" },
  ],
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
