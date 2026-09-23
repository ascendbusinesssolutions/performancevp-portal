/**
 * Copy for the formal ratings mapping (Online Measurement Specification 6.4; Milestone 4 plan,
 * Section 6). The 12-month rule, the 80% test and the acceptance rules are stated where the mapping
 * is done (UX brief 4.1). The band labels and descriptions are the Tier 3 Module Library 4.2
 * framework in client form, for Michael's review against the source before the manager form uses
 * them in Milestone 5.
 */
export const ratingsMapCopy = {
  "page.title": "Formal ratings",
  "page.meta": "Optional",
  "page.intro":
    "If your organisation has a formal performance rating for each person, it can stand in for managers rating talent density. Map your rating labels onto the five talent bands and say whether the ratings were calibrated, or skip this and managers rate.",

  "rules.title": "When formal ratings are used",
  "rules.currency":
    "A formal rating is used only if its date is within the 12 months before a campaign launches.",
  "rules.coverage":
    "They are used for a unit only where current ratings cover at least 80% of its people, by FTE. In other units the formal ratings are set aside and managers rate.",
  "rules.acceptance":
    "Ratings declared calibrated, with no more than 25% in the top band and at least 5% in the bottom band, are used as they stand. Otherwise the top band is capped at 15%, with the excess moved to the band below, and confidence in talent density is capped at Medium.",

  "none.title": "No formal ratings in the directory",
  "none.body":
    "Managers rate talent density. To use formal ratings, add each person's rating and its date to the directory template and upload it.",

  "labels.title": "Your rating labels",
  "labels.intro": "Each label found in the directory, and how many people have it.",
  "labels.col.label": "Label",
  "labels.col.people": "People",
  "labels.col.current": "Dated within 12 months",
  "labels.col.band": "Talent band",
  "labels.unmapped": "Not mapped",
  "labels.bandOption": "Band {band}: {name}",

  "calibrated.legend": "Were these ratings calibrated across managers?",
  "calibrated.yes":
    "Yes. Managers' ratings were compared and adjusted together before they were final.",
  "calibrated.no": "No, or not that we can show.",

  save: "Save the mapping",
  saved: "Mapping saved.",
  "skip.title": "Or skip formal ratings",
  "skip.body":
    "Formal ratings are then set aside, even where the directory holds them, and managers rate talent density in every unit.",
  "skip.submit": "Skip. Managers rate talent density.",
  skipped: "Skipped. Managers rate talent density.",
  "decision.mapped": "Mapped, and declared {calibration}.",
  "decision.calibrated": "calibrated",
  "decision.notCalibrated": "not calibrated",
  "decision.skipped": "Skipped. Managers rate talent density.",
  "decision.none": "Not decided yet.",

  "guide.title": "The five talent bands",
  "band.5.name": "Exceptional contributor",
  "band.5.description":
    "Consistently exceeds expectations in scope and quality; recognised as a top performer.",
  "band.4.name": "Exceeding expectations",
  "band.4.description": "Consistently delivers above the role's expected standard.",
  "band.3.name": "Meeting expectations",
  "band.3.description": "Delivers reliably at the role's expected standard.",
  "band.2.name": "Developing, partly meeting",
  "band.2.description": "Meets some expectations; gaps in delivery quality or scope.",
  "band.1.name": "Underperforming",
  "band.1.description": "Consistent gaps in delivery; performance management is warranted.",

  "units.title": "What this means for each unit",
  "units.intro": "Judged today; at a campaign the dates are judged against its launch.",
  "units.col.unit": "Unit",
  "units.col.coverage": "Current, mapped ratings",
  "units.col.route": "Talent density from",
  "units.coverage": "{pct}% of FTE",
  "units.route.formal": "Formal ratings",
  "units.route.managers": "Managers' ratings",
  "units.treatment.asDeclared": "used as they stand",
  "units.treatment.capped": "top band capped at 15%, confidence Medium",
} as const;

export type RatingsMapCopyKey = keyof typeof ratingsMapCopy;
