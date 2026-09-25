/**
 * Copy for the campaign screens an administrator runs (Milestone 5 plan, 2.1 to 2.5 and 3.5;
 * PORTAL_COPY_SPEC.md C1): the campaigns hub and its calendar, starting a campaign, the event menu,
 * the draft with its launch preview, scheduling, and the launched campaign's audiences. C1's state
 * lines are kept as the specification gives them; the rest is drafted for Michael's review with
 * this milestone. The instrument's own wording (items, facts, triggers) comes from the reference
 * tables, verbatim from the sources, and is not held here.
 */
export const campaignsCopy = {
  "hub.title": "Campaigns",
  "hub.intro":
    "A campaign asks your people, their managers and you the questions each measure needs. When it launches it freezes the directory and unit context as they stand, and runs on them to its close.",
  "hub.start": "Start a campaign",
  "hub.none": "No campaign yet. The first campaign for a unit is a baseline.",
  "hub.readOnly": "The subscription is read-only, so no campaign can be started or launched.",

  "calendar.title": "The calendar",
  "calendar.intro":
    "A baseline or annual campaign proposes the year that follows it: a pulse at three months, a half-yearly check at six, a pulse at nine and the annual at twelve. Nothing opens until you schedule it.",
  "calendar.none":
    "Nothing proposed yet. A baseline or annual campaign proposes the year's campaigns when it launches.",
  "calendar.due": "{cadence}, due {date}",
  "calendar.units": "For {list}.",
  "calendar.schedule": "Schedule it",
  "calendar.scheduleName": "Schedule the {cadence} due {date}",
  "calendar.scheduleNote": "It opens {date} at 9 am and closes {close} at 5 pm.",
  "calendar.dismiss": "Dismiss",
  "calendar.dismissName": "Dismiss the {cadence} due {date}",
  "calendar.dismissed": "Dismissed.",

  "list.title": "Campaigns",
  "col.campaign": "Campaign",
  "col.units": "Units",
  "col.window": "Window",
  "col.state": "State",
  "window.range": "{opens} to {closes}",
  "window.none": "Not set",

  "cadence.baseline": "Baseline",
  "cadence.annual": "Annual",
  "cadence.half_yearly": "Half-yearly check",
  "cadence.quarterly_pulse": "Quarterly pulse",
  "cadence.event_triggered": "Event",
  "cadence.eventNamed": "Event: {trigger}",

  // C1's other states, as the specification gives them, and the states before launch.
  "state.draft": "Draft",
  "state.scheduled": "Scheduled, opens {date}",
  "state.open": "Open, closes {date}, {time}",
  "state.closed": "Closed {date}, under review",
  "state.released": "Released {date}",
  "state.cancelled": "Cancelled",

  "new.title": "Start a campaign",
  "new.intro":
    "Choose what to measure and which units. The campaign starts as a draft: nothing is sent until it launches, and you can change it until then.",
  "new.cadence": "What to run",
  "new.cadence.baseline":
    "Baseline: the full measurement, for a unit's first campaign. About 15 minutes for each person, over 14 days.",
  "new.cadence.annual": "Annual: the full measurement again, a year on. Over 14 days.",
  "new.cadence.half_yearly":
    "Half-yearly check: 57 of the survey's items and the capacity facts, over 7 days.",
  "new.cadence.quarterly_pulse":
    "Quarterly pulse: 17 items, over 5 days. It shows the direction of travel between full measurements and does not recalculate the index.",
  "new.cadence.event_triggered":
    "After an event: the measures an event affects, over 14 days. Choose the event below.",
  "new.event": "If after an event, which",
  "new.event.none": "Not an event",
  "new.event.hint": "The event of pulse indicators dropping runs a half-yearly check instead.",
  "new.units": "Units",
  "new.units.hint":
    "Measurement units of 10 or more. A half-yearly, pulse or event campaign needs a released baseline or annual result for each unit.",
  "new.units.none": "No unit is measured yet. The readiness check shows what is missing.",
  "new.name": "Name (optional)",
  "new.name.hint": "Shown to you and your administrators only. Up to 120 characters.",
  "new.opens": "Opens on",
  "new.opens.hint": "It opens at 9 am on this day and closes at 5 pm on its last day.",
  "new.submit": "Create the draft",

  "draft.windowLine": "Opens {opens} at {openTime}. Closes {closes} at {closeTime}.",
  "draft.edit": "Change the draft",
  "draft.closes": "Closes on",
  "draft.save": "Save the draft",
  "draft.saved": "Saved.",
  "draft.launch": "Launch now",
  "draft.launchNote": "It opens now and closes {date} at {time}.",
  "draft.schedule": "Schedule it",
  "draft.scheduleNote": "It opens {date} at {time}, once readiness passes then.",
  "draft.unschedule": "Move it back to draft",
  "draft.cancel": "Cancel the campaign",
  "draft.cancelNote": "A cancelled campaign cannot be reopened. Nothing has been sent.",
  "draft.refused":
    "The scheduled launch was refused, so the campaign is a draft again. Fix what is listed below, then launch or schedule it.",

  "preview.title": "What it asks",
  "preview.intro": "Who is asked in each unit, as the directory stands now.",
  "preview.snapshot": "A running campaign keeps the directory it started with.",
  "preview.snapshotNote":
    "Changes to the directory or unit context after launch take effect from the next campaign. A joiner is not invited; a manager who leaves can no longer rate.",
  "preview.col.unit": "Unit",
  "preview.col.members": "Members",
  "preview.col.teams": "Teams",
  "preview.col.managers": "Managers",
  "preview.col.teamLeaders": "Team leaders",
  "preview.col.leadershipTeam": "Leadership team",
  "preview.col.checklists": "Your checklists",
  "preview.needs": "needs {n}",
  "preview.notAsked": "Not asked",
  "preview.noTeams": "One team",
  "preview.fallback": "{n}, the unit leader",
  "preview.formal": "{n}; formal ratings for talent density",
  "preview.emailed": "{people} receive the anonymous survey.",
  "preview.foot":
    "Members answer two short anonymous surveys. Team leaders and the leadership team answer their own anonymous module. Managers sign in to rate their direct reports, and their ratings carry their name.",
  "preview.footPartA": "Members answer one short anonymous survey.",

  "checklist.ADM-O1": "Role architecture",
  "checklist.ADM-O2": "Tools and integration",
  "checklist.ADM-O4": "Capacity facts",

  "blockers.title": "Before it can launch",
  "blockers.none": "Nothing blocks the launch.",
  "blocker.noUnits": "The campaign measures no unit. Choose at least one.",
  "blocker.unitsChanged":
    "{list} changed after this draft was made. Check the units below and save the draft before it launches.",
  "blocker.notMeasured":
    "{unit} is no longer measured as it was when the draft was made. Remove it, and add the unit that now measures its people.",
  "blocker.needsFullRun":
    "{unit} has no released baseline or annual result to carry forward from. Its first campaign is a baseline.",
  "blocker.busy":
    "Another campaign is measuring {unit}. Launch this one after that campaign closes.",
  "blocker.windowPassed": "The close has passed. Choose a new window.",
  "blocker.readiness": "{check}: see the readiness check.",
  "blocker.readOnly": "The subscription is read-only.",

  // The administrator checklists (Online Measurement Specification 4.2 to 4.3a; plan 3.4). The
  // facts' wording and choices are the source's, from the reference tables.
  "checklists.title": "Your checklists",
  "checklists.intro":
    "Facts about each unit's roles, systems and capacity that only you can give. Each save is kept, and the close uses the latest.",
  "checklists.row": "{checklist}, {units}",
  "checklists.status.none": "Not started",
  "checklists.status.some": "Saved for {n} of {total}",
  "checklists.status.all": "Done",
  "checklists.continue": "Continue",
  "checklists.review": "Review",
  "checklists.unitLink": "{checklist} for {unit}",
  "checklist.title": "Your checklists for {unit}",
  "checklist.meta": "{campaign}. Closes {date}, {time}.",
  "checklist.intro.ADM-O1":
    "For each role family in {unit}: whether its position description holds each of these.",
  "checklist.intro.ADM-O2": "For each of the primary systems {unit} relies on.",
  "checklist.intro.ADM-O4":
    "The unit's capacity facts, as figures from your own records. Leave out any you do not hold; three or more are needed for a score.",
  "checklist.save": "Save",
  "checklist.saveName": "Save {checklist}",
  "checklist.saved": "Saved. The close uses the latest save.",
  "checklist.prefilled": "Filled in from the last save. Check each answer still holds.",
  "checklist.unanswered": "Not answered",
  "checklist.notApplicable": "Not applicable",
  "checklist.closed": "The campaign has closed, so its checklists are fixed.",
  "checklist.back": "Back to the campaign",
  "error.checklist":
    "Those answers could not be saved. Check that each is one of the choices, and each figure a number.",

  // Monitoring (PORTAL_COPY_SPEC.md C1 to C4; layout notes of 24 September 2026). C2's {valid}
  // is {received}: validity is known only at close (D19); C3's fixed line as D14 amends it.
  "monitor.state": "Open, day {d} of {total}",
  "monitor.closes": "Closes {date}, {time}",
  "monitor.size": "{units}, {people}",
  "monitor.reminders": "Reminders sent {dates}. Next: {next}",
  "monitor.remindersNone": "No reminder sent yet. Next: {next}",
  "monitor.remindersAll": "Reminders sent {dates}",
  "monitor.remind": "Send a reminder now",
  "monitor.reminded":
    "A reminder is going to everyone who still has a part of the survey to answer. No one who has answered is emailed.",
  "monitor.remindLimit": "A reminder went less than a day ago. Send the next one tomorrow.",
  "monitor.extend": "Extend by a week",
  "monitor.extended": "Extended. It now closes {date}, {time}.",
  "monitor.response.title": "Response against the thresholds that will apply",
  "monitor.countsOnly": "Counts only. No response is linked to a person.",
  "monitor.col.unit": "Unit",
  "monitor.col.members_part_a": "Members part A",
  "monitor.col.members_part_b": "Members part B",
  "monitor.col.managers": "Managers",
  "monitor.col.team_leaders": "Team leaders",
  "monitor.col.leadership_team": "Leadership team",
  "monitor.col.checklists": "Checklists",
  "monitor.needsRate": "needs {pct}",
  "monitor.needsCount": "needs {n}",
  "monitor.needsLeadership": "needs {pct}, 3+",
  "monitor.pct": "{pct}%",
  "monitor.of": "{n} of {total}",
  "monitor.more": "{n} more needed",
  "monitor.leadershipMinimum": "3 needed to score",
  "monitor.fallback": "None flagged; unit leader instead",
  "monitor.notAsked": "Not asked",
  "monitor.checklistsDone": "Done",
  "monitor.foot":
    "Amber is below what the close needs. The counts are responses received; the validity checks at close may exclude some.",
  "monitor.managers.title": "Managers outstanding",
  "monitor.managers.remindAll": "Remind all",
  "monitor.managers.row": "{reports} reports, {rated} rated",
  "monitor.managers.rowNone": "{reports} reports, none rated",
  "monitor.managers.remind": "Remind",
  "monitor.managers.remindName": "Remind {name}",
  "monitor.managers.reminded": "Reminder sent.",
  "monitor.managers.limit": "Everyone outstanding was reminded less than a day ago.",
  "monitor.managers.none": "Every manager has rated their reports.",
  "monitor.managers.fixed":
    "Only the manager can rate. Reports left unrated at close count as not rated.",
  "monitor.close.title": "At close",
  "monitor.close.body":
    "Scores are calculated and held for your review. Nothing is visible to viewers until you release it.",
  "monitor.closeNow": "Close it now",
  "monitor.closeNowNote":
    "Closing now stops the surveys and the rating forms at once, and scores what has been received.",

  "launched.title": "Who was asked",
  "launched.notice": "Launched. The campaign is open, on the directory as it stood at launch.",
  "launched.accountsPending":
    "Sign-in is not yet ready for {n} managers. It is set up again automatically.",
  "launched.meta": "Launched {date}.",

  "error.cadence": "Choose what to run.",
  "error.event": "Choose the event.",
  "error.units": "Choose at least one unit.",
  "error.opens": "Give the day it opens, today or later.",
  "error.window": "Give a close after the opening.",
  "error.name": "Give a name of up to 120 characters, or none.",
  "error.changed":
    "The directory or setup changed while the campaign was launching. Launch it again.",
  "error.refused": "The campaign cannot launch yet. What stops it is listed below.",
  "error.state": "The campaign has moved on since this page was shown.",
  "error.busy":
    "Another campaign is measuring one of these units. Launch this one after it closes.",
  "error.proposal": "This proposal has already been decided.",
  "error.proposalUnits":
    "None of the units this proposal measures is still measured. Start a campaign instead.",
} as const;

export type CampaignsCopyKey = keyof typeof campaignsCopy;
