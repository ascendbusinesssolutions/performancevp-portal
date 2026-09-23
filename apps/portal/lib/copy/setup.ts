/**
 * Copy for the setup journey (PORTAL_UX_BRIEF.md 4.1; PORTAL_COPY_SPEC.md S1): the organisation
 * details, the notices every setup screen shares, and the errors the setup forms report. The S1
 * step statuses and the hub arrive with the readiness check. Drafted for Michael's review with the
 * copy module; additions to PORTAL_COPY_SPEC.md follow as a dry run.
 */
export const setupCopy = {
  // Notices shared by every screen an organisation is managed from.
  "notice.staffSession":
    "You are working in {organisation} under a PerformanceVP support session that ends at {time}. Everything you do here is recorded and shown to the organisation.",
  "notice.saved": "Saved.",
  "notice.readOnly": "Nothing can be changed while the subscription is read-only.",

  // The organisation (step 1).
  "organisation.title": "Organisation",
  "organisation.intro":
    "The organisation's name and sector. The sector is recorded for context only; it does not change how anything is scored.",
  "organisation.name": "Organisation name",
  "organisation.division": "Industry (ANZSIC division)",
  "organisation.division.none": "Not recorded",
  "organisation.class": "ANZSIC class code (optional)",
  "organisation.class.hint":
    "Four digits, from the Australian Bureau of Statistics classification, if you know it.",
  "organisation.sizeBand": "Size, in full-time equivalent staff",
  "organisation.sizeBand.none": "Not recorded",
  "organisation.sizeBand.under_50": "Fewer than 50",
  "organisation.sizeBand.50_to_200": "50 to 200",
  "organisation.sizeBand.200_to_1000": "200 to 1,000",
  "organisation.sizeBand.over_1000": "More than 1,000",
  "organisation.save": "Save the organisation",
  "organisation.crumb": "Setup",
  "organisation.toUnits": "Continue to the units",

  // The hub (UX brief 4.1; PORTAL_COPY_SPEC.md S1).
  "hub.title": "Setup",
  "hub.intro":
    "Six steps take the organisation from empty to ready for its first campaign. They can be done in any order, everything saves as you go, and you can leave and come back at any point.",
  "hub.continue": "Continue setup",
  "hub.open": "Open",
  "hub.stepsLabel": "Setup steps",
  "hub.blockers.title": "What stands in the way",
  "hub.blockers.more": "See the readiness check",
  "hub.state.done": "Done",
  "hub.state.next": "Next",
  "hub.state.todo": "To do",
  "hub.state.skipped": "Skipped",
  "hub.state.locked": "Not yet",

  "step.organisation": "Organisation and units",
  "step.directory": "Directory",
  "step.context": "Unit context",
  "step.formalRatings": "Formal ratings (optional)",
  "step.readiness": "Readiness check",
  "step.campaign": "First campaign",

  // S1 status lines.
  "status.units": "{count} units",
  "status.noUnits": "No units yet.",
  "status.people": "{n} people, uploaded {date}",
  "status.peopleNoUpload": "{n} people",
  "status.noPeople": "No one yet.",
  "status.context": "{done} of {total} units. {remaining} to go.",
  "status.contextDone": "{done} of {total} units.",
  "status.contextWaiting": "Waiting for people in the directory.",
  "status.formalSkipped": "Skipped. Managers rate talent density.",
  "status.formalNone": "No formal ratings in the directory. Managers rate talent density.",
  "status.formalMapped": "Mapped. {n} people within 12 months.",
  "status.formalUndecided": "Formal ratings found. Map them or skip them.",
  "status.blockers": "{n} blockers",
  "status.oneBlocker": "1 blocker",
  "status.passed": "Passed.",
  "status.campaignLocked": "Opens when the readiness check passes",
  "status.campaignReady": "Ready. The readiness check has passed.",

  // Errors the setup forms report, from the database's refusals.
  "error.readOnly":
    "Nothing was saved. The subscription is read-only, or you no longer have access to change this.",
  "error.classCode": "Enter the class code as four digits, or leave it blank.",
  "error.duplicate": "That name is already used here. Choose another.",
  "error.generic": "That could not be saved. Check the entries and try again.",
} as const;

export type SetupCopyKey = keyof typeof setupCopy;
