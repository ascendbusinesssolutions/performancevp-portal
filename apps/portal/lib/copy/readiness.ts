/**
 * Copy for the readiness check (PORTAL_COPY_SPEC.md S2; Milestone 4 plan, Section 7). Each check
 * has a pass line and a blocker or warning line; the S2 wording is kept where the specification
 * gives it. Additions (the unit leader, the critical knowledge domain, an upload awaiting review,
 * empty units, reporting lines to people who have left, and the head of the organisation) and the
 * small changes noted in comments are drafted for Michael's review.
 */
export const readinessCopy = {
  "page.title": "Readiness check",
  "page.intro":
    "The checks a first campaign needs to pass. Blockers must be fixed; each links to where it is fixed. Warnings do not block; they shape what can be scored.",
  // S2 reads "{b} blockers · {w} warnings · {p} passed"; labels first avoid "1 blockers".
  summary: "Blockers {b} · Warnings {w} · Passed {p}",
  "foot.blocked": "The first campaign opens once the blockers are fixed.",
  "foot.ready": "Nothing blocks the first campaign.",
  "passed.title": "Ready for the first campaign",
  "passed.body":
    "Every blocker is cleared. The directory and context as they stand now are what a campaign will use; a campaign freezes them when it launches.",

  "level.passed": "Passed",
  "level.warning": "Warning",
  "level.blocker": "Blocker",
  "level.skipped": "Skipped",

  "check.units": "Units of 10 or more",
  "check.managers": "A manager for everyone",
  "check.leadershipTeam": "Leadership team of 3",
  "check.teamLeaders": "Team leaders",
  "check.unitLeader": "Unit leaders",
  "check.unitForEveryone": "A unit for everyone",
  "check.roleFamilies": "Role families and skills",
  "check.context": "Unit context",
  "check.criticalDomain": "A critical knowledge domain",
  "check.formalRatings": "Formal ratings",
  "check.workEmails": "Work emails",
  "check.uploadAwaiting": "Directory uploads",

  "fix.units": "Open units",
  "fix.directory": "Open the directory",
  "fix.context": "Open unit context",
  "fix.formalRatings": "Open formal ratings",
  "fix.upload": "Review the upload",

  // Pass lines.
  "units.pass": "All {n} units.",
  "units.groupingOne": "{unit} groups the units below it and is not measured.",
  "units.groupingMany": "{list} group the units below them and are not measured.",
  "managers.pass": "{n} of {n}.",
  "managers.passHead": "{n} of {n}, with {head} at the head of the organisation.",
  "unitForEveryone.pass": "{n} of {n}.",
  "roleFamilies.pass":
    "{units} of {units} units. {families} role families, {min} to {max} skills each, critical skills marked.",
  "context.pass": "{units} of {units} units. {processes} processes named in each.",
  "criticalDomain.pass": "Every unit has a knowledge domain marked critical.",
  "leadershipTeam.pass": "Every unit has 3 or more flagged.",
  "teamLeaders.pass": "Every unit has team leaders flagged.",
  "unitLeader.pass": "Every unit has its leader.",
  "formalRatings.pass": "Mapped to the five bands. Dated within 12 months for {n} people.",
  "formalRatings.below": "Below 80% in {list}, where managers rate instead.",
  "formalRatings.skipped": "Skipped. Managers rate.",
  "workEmails.pass": "{n} of {n} valid. Invitations can be sent.",
  "uploadAwaiting.pass": "No upload is awaiting review.",

  // Blocker and warning lines.
  "units.blocker": "{unit} has {n}. A unit below 10 cannot be measured.",
  "units.empty": "{unit} has no one in it. Retire it, or record the merge or split it was part of.",
  "managers.noManager":
    "{n} without: {list}. Manager ratings and skill coverage need the reporting line. Only the head of the organisation may have none.",
  "managers.left": "{n} report to someone who has left: {list}.",
  "workEmails.blocker": "{n} invalid or missing: {list}.",
  "roleFamilies.noRoleFamily": "{unit}: {n} without a role family.",
  "roleFamilies.family": "{family}: {problems}.",
  "context.blocker": "{unit}: {missing}.",
  "context.part.domains": "knowledge domains {n} ({min} to {max} needed)",
  "context.part.decisions": "decision types {n} ({min} to {max} needed)",
  "context.part.processes": "critical processes {n} ({needed} needed)",
  "context.part.systems": "primary systems {n} ({min} to {max} needed)",
  "criticalDomain.warning":
    "{unit} has no knowledge domain marked critical. Knowledge will be insufficient for {unit} until one is.",
  // S2 reads "until a third is flagged", which fits only a unit with two flagged.
  "leadershipTeam.warning":
    "{unit} has {n} flagged. Clarity & decision rights will be insufficient for {unit} until 3 are flagged.",
  "teamLeaders.warning": "{unit} has none. The learning module goes to its unit leader instead.",
  "unitLeader.none": "{unit} has no unit leader.",
  "unitLeader.ambiguous": "{unit} has no unit leader: {n} people could lead it. Choose one.",
  "formalRatings.undecided":
    "The directory holds formal ratings. Map them to the five talent bands, or skip them.",
  "formalRatings.unmapped": "Not mapped to a band: {list}.",
  "uploadAwaiting.warning":
    "An upload is awaiting review. Until it is applied or discarded, the directory checked here is the one before it.",
} as const;

export type ReadinessCopyKey = keyof typeof readinessCopy;
