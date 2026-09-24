/**
 * Copy for the units screens (Milestone 4 plan, Section 3; Online Measurement Specification 6.2):
 * the unit tree, adding and editing units and teams, the unit leader, and merges and splits; and
 * the measurement units (Milestone 4b plan, Sections 6 and 7). Drafted for Michael's review with the
 * copy module.
 */
export const unitsCopy = {
  "page.title": "Units",
  "page.meta": "{units}, {people}",
  "page.intro":
    "Your units as your HRIS holds them. Add units here, or let a directory upload create them from its unit codes, then arrange them into a hierarchy. Below them, choose how units under 10 are measured.",

  "col.code": "Code",
  "col.unit": "Unit",
  "col.type": "Type",
  "col.people": "People",
  "col.leader": "Unit leader",
  "col.measuredAs": "Measured as",
  "tree.below": "below {parent}",
  "measuredAs.own": "On its own",
  "measuredAs.short": "Not yet: under 10",
  "measuredAs.empty": "Not yet: no one in it",
  "row.edit": "Edit",
  "row.noStaff": "No one yet",
  "row.grouping": "Not measured: groups the units below",

  "leader.proposed": "Proposed: {name}",
  "leader.none": "No one to propose",
  "leader.ambiguous": "{n} could lead it; choose one",
  "leader.unknown": "Not set",

  "type.operations": "Operations",
  "type.sales": "Sales",
  "type.technology": "Technology",
  "type.support_functions": "Support functions",
  "type.professional_services": "Professional services",
  "type.research_and_development": "Research and development",
  "type.other": "Other",
  "type.none": "Not set",

  "add.title": "Add a unit",
  "add.code": "Unit code",
  "add.code.hint":
    "Letters, numbers, dots, dashes and underscores, up to 40 characters. A code never changes; a new code makes a new unit.",
  "add.name": "Unit name",
  "add.parent": "Sits under",
  "add.parent.none": "Nothing: a top-level unit",
  "add.type": "Unit type",
  "add.type.hint": "Chooses the starter list of decision types for the unit.",
  "add.submit": "Add the unit",
  "add.done": "Unit added.",

  "empty.title": "Units with no one in them",
  "empty.intro":
    "A unit with no active staff, often after a directory upload moved everyone out. Record the merge or split it was part of, or retire it.",

  "edit.meta": "Code {code}. {people} people.",
  "edit.details": "Name, type and place",
  "edit.codeNote": "The code stays {code}. Renaming keeps the unit's history.",
  "edit.save": "Save changes",
  "edit.saved": "Saved.",
  "edit.back": "Back to units",

  "leader.title": "Unit leader",
  "leader.intro":
    "The person who leads the unit: a member of it, or of a unit above it, such as the executive its staff report to. The leadership-team module goes to them, and so does the learning module where the unit has no team leaders.",
  "leader.option.above": "{name}, {unit}",
  "leader.field": "Unit leader",
  "leader.field.none": "No one",
  "leader.proposedNote":
    "{name} is the only person in the unit whose manager sits outside it, so is proposed. Save to confirm.",
  "leader.ambiguousNote":
    "{n} people in the unit have a manager outside it, or none. Choose which of them leads it.",
  "leader.noneNote":
    "No one in the unit has a manager outside it. Choose the person who leads it, or check the reporting lines.",
  "leader.save": "Save the unit leader",

  "teams.title": "Teams",
  "teams.intro":
    "Teams within the unit. Some measures are scored team by team and then brought together for the unit; a unit without teams counts as one team.",
  "teams.none": "No teams. The unit counts as one team.",
  "teams.col.team": "Team",
  "teams.col.people": "People",
  "teams.rename": "Rename",
  "teams.retire": "Retire",
  "teams.retireBlocked": "In use",
  "teams.add": "Team name",
  "teams.addSubmit": "Add the team",

  "retire.title": "Retire this unit",
  "retire.intro":
    "A retired unit keeps its history but takes no part in campaigns. Only a unit with no one in it can be retired. If it merged with or split into other units, record that instead, so its trend continues.",
  "retire.blocked": "{people} people are in this unit. Move them to another unit first.",
  "retire.hasChildren": "Units sit below this one. Move them first.",
  "retire.submit": "Retire the unit",
  "retire.done": "Unit retired.",

  "lineage.title": "Record a merge or split",
  "lineage.intro":
    "First move everyone out of the old units and into the new ones. The old units are then retired on the date you give, and their history carries into the new units' trends, marked as a break.",
  "lineage.kind": "What happened",
  "lineage.kind.merge": "Merge: two or more units became one",
  "lineage.kind.split": "Split: one unit became two or more",
  "lineage.predecessors": "Old units (no one left in them)",
  "lineage.successors": "New units",
  "lineage.date": "Date it took effect",
  "lineage.submit": "Record it",
  "lineage.done":
    "Recorded. The old units are retired and their history carries into the new ones.",
  "lineage.noEmpty": "No unit is empty yet. Move everyone out of the old units first.",

  "error.codeFormat":
    "Use letters, numbers, dots, dashes and underscores only, up to 40 characters, starting with a letter or number.",
  "error.codeUsed": "That unit code is already used, by this or a retired unit. Choose another.",
  "error.nameUsed": "That name is already used in this unit. Choose another.",
  "error.belowItself": "A unit cannot sit below itself or one of its own units.",
  "error.hasStaff": "Move everyone out of the unit before retiring it.",
  "error.leader": "The unit leader must be someone in the unit, or in a unit above it.",
  "error.mergeShape": "A merge needs two or more old units and one new unit.",
  "error.splitShape": "A split needs one old unit and two or more new units.",
  "error.sameUnit": "A unit cannot be both old and new.",
  "error.lineageStaff": "Move everyone out of the old units first.",
  "error.lineageDate": "Give the date it took effect.",

  // Measurement units (Online Measurement Specification 6.2).
  "measurement.title": "Measurement units",
  "measurement.intro":
    "The directory keeps your structure as it is. A unit of 10 or more is measured on its own. A unit under 10 is measured together with others in its branch, and you choose which. Context, results and trends belong to the measurement unit. Inside a combined measurement unit, each unit keeps its own teams, and a unit without teams counts as one team.",
  "measurement.col.code": "Code",
  "measurement.col.unit": "Measurement unit",
  "measurement.col.holds": "Holds",
  "measurement.col.people": "People",
  "measurement.col.status": "Status",
  "measurement.col.leader": "Unit leader",
  "measurement.status.measured": "Measured",
  "measurement.status.short": "Under 10",
  "measurement.status.empty": "No one in it",
  "measurement.status.grouping": "Grouping unit, to choose",
  "measurement.status.groupingKept": "Grouping unit",
  "measurement.status.broken": "Units no longer in one branch",
  "measurement.leader.rollUp": "{name}, the leader of {unit}",

  "measurement.short.title": "Units under 10",
  "measurement.short.intro":
    "Nothing under 10 is measured. For each unit below, choose a unit in its branch to measure it with. Nothing is applied until you choose, and a combination can be undone.",
  "measurement.short.none": "Every unit has 10 or more, on its own or combined.",
  "measurement.short.heading": "{unit}, {people}",
  "measurement.short.grouping":
    "It has units below it. Measure it with one of them, or keep it as a grouping unit: then it is not measured and its people are not surveyed as members, though they still manage the people below them.",
  "measurement.short.noCandidates":
    "No unit in its branch to combine it with. Grow it, move people into it, or retire it once it is empty.",
  "measurement.combine": "Combine",
  "measurement.combine.name": "Combine {unit} with {candidate}",
  "measurement.keep": "Keep as a grouping unit",
  "measurement.kept.title": "Kept as grouping units",
  "measurement.kept.intro":
    "Not measured. Their people still manage and lead the people in the units below them.",
  "measurement.withdraw": "Measure it with a unit below instead",
  "measurement.withdraw.name": "Measure {unit} with a unit below instead",

  "measurement.combination.title": "Combinations",
  "measurement.combination.holds": "Holds {list}: {people}.",
  "measurement.combination.broken": "Its units no longer share a branch. Undo it and choose again.",
  "measurement.combination.nameField": "Name",
  "measurement.combination.saveName": "Save the name",
  "measurement.combination.rollUp":
    "Led by the leader of {unit}, the unit above the others it holds. Change it on that unit.",
  "measurement.combination.leaderNote":
    "Its units sit side by side, so choose who leads it: a member of one of them, or of a unit above them.",
  "measurement.combination.saveLeader": "Save the unit leader",
  "measurement.combination.undo": "Undo the combination",
  "measurement.combination.undoNote":
    "Undoing removes the context entered for {name}. Each unit's own context is kept.",

  "measurement.notice.combined": "Combined. {name} holds {list}: {people}.",
  "measurement.notice.undone": "Undone. Its units are measured on their own again.",
  "measurement.notice.kept": "Kept as a grouping unit.",
  "measurement.notice.withdrawn": "Choose a unit below to measure it with.",

  "error.combineStale": "The units have changed since this page was shown. Choose again.",
  "error.twoCombinations": "Two combinations cannot be combined. Undo one of them first.",
  "error.measuredByCampaign":
    "A campaign has measured this unit. Changing it after a campaign is not yet available.",
  "error.combinationName": "Give the combination a name of up to 200 characters.",
  "error.combinationLeader":
    "The unit leader must be a member of one of its units, or of a unit above them.",
} as const;

export type UnitsCopyKey = keyof typeof unitsCopy;
