/**
 * Copy for the manager's rating form (PORTAL_COPY_SPEC.md M1; Milestone 5 plan, 3.4 and D14; layout
 * notes of 24 September 2026). M1's strings are kept as the specification gives them. The scale
 * anchors and band labels are the sources' own (Module Library 4.1 and 4.2, Online Measurement
 * Specification 4.1; S8), read from the reference tables, not held here. The rest is drafted for
 * Michael's review.
 */
export const managerCopy = {
  "index.title": "Your rating forms",
  "index.none":
    "You have no ratings to give at the moment. Your rating forms open here when a campaign starts.",
  "index.row": "{campaign}, closes {date}",

  title: "Rate your team",
  eyebrow: "{campaign} · {units}",
  meta: "{done} of {total} done. Closes {date}. Your answers save as you go.",
  identified:
    "These ratings carry your name and your administrators can see them. The staff survey is separate and anonymous.",
  prefilled: "Last year's ratings shown. Change any that have moved.",
  firstTime: "First time rating this team.",
  missing: "Someone missing, or not yours? Tell your administrator. Only you can rate your team.",
  "list.label": "Your direct reports",

  "status.done": "Done",
  "status.open": "Open",
  "status.todo": "To do",

  "report.meta": "{family} · {team} · {fte} FTE · started {start}",
  "report.metaNoTeam": "{family} · {fte} FTE · started {start}",

  "skills.title": "Skills",
  "knowledge.title": "Knowledge",
  "band.title": "Overall, this year",
  critical: "critical",
  anchor: "{value} {label}",
  "scale.value": "{value}, {label}",
  "evidence.five": "A 5 needs one line of evidence",
  "evidence.band": "A 5 or a 1 needs one line of evidence.",
  formalRoute:
    "Talent density for {unit} comes from your organisation's formal ratings this year, so no overall band is asked here.",

  next: "Done, next: {name}",
  finish: "Done",
  later: "Come back later",
  allDone: "Every report is rated. You can change any rating until the campaign closes.",
  saving: "Saving",
  saved: "Saved",

  "error.evidence":
    "Add one line of evidence for each 5, and for a band of 5 or 1, before you go on.",
  "error.save": "That rating could not be saved. Try again.",
  "error.closed": "Rating has closed for this campaign.",
} as const;

export type ManagerCopyKey = keyof typeof managerCopy;
