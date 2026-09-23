/**
 * Copy for the unit context screens (Milestone 4 plan, Section 5; Online Measurement Specification
 * 3.1, 3.3, 4.1, 4.3 and 4.5): role families and their skills from the template library, and each
 * unit's knowledge domains, decision types, critical processes and primary systems. Clients name
 * context only; nothing here touches items, scales, scoring or weights. Drafted for Michael's review.
 */
export const contextCopy = {
  "page.title": "Unit context",
  "page.intro":
    "What the manager modules and the leadership and administrator checklists ask about: the skills of each role family, and for each unit its knowledge domains, decision types, critical processes and primary systems. You name these; the questions, scales and scoring stay fixed.",

  // Role families.
  "families.title": "Role families and skills",
  "families.intro":
    "Managers rate each person on the skills of their role family. A role family needs {min} to {max} skills, both technical and behavioural, with the critical ones marked.",
  "families.col.family": "Role family",
  "families.col.skills": "Skills",
  "families.col.people": "People",
  "families.col.status": "Ready",
  "families.none": "No role families yet. Start from the template library below, or add your own.",
  "families.ok": "Ready",
  "families.edit": "Edit",
  "families.fromTemplate": "Start from the template library",
  "families.fromTemplate.intro":
    "Each template is a starting point to rename and trim. The library is placeholder content until the Role-Family Template Library is published.",
  "families.use": "Use this template",
  "families.own": "Add a role family of your own",

  "family.count": "{n} skills",
  "family.problem.tooFew": "skills {n} (at least {min} needed)",
  "family.problem.tooMany": "skills {n} (at most {max})",
  "family.problem.noCritical": "no critical skill marked",
  "family.problem.noTechnical": "no technical skill",
  "family.problem.noBehavioural": "no behavioural skill",

  "family.newTitle": "Add a role family",
  "family.fromTemplateTitle": "Add a role family from a template",
  "family.name": "Role family name",
  "family.peopleLeader": "This role family leads people",
  "family.skills": "Skills",
  "family.skills.intro":
    "Keep, rename or drop each skill, and mark which are critical. Critical skills are the ones the unit cannot do without; they are used to judge how well skills are spread across the team.",
  "family.col.keep": "Keep",
  "family.col.skill": "Skill",
  "family.col.kind": "Kind",
  "family.col.critical": "Critical",
  "family.kind.technical": "Technical",
  "family.kind.behavioural": "Behavioural",
  "family.blankRows": "Add your own skills in the empty rows.",
  "family.create": "Add the role family",
  "family.created": "Role family added.",
  "family.save": "Save",
  "family.saved": "Saved.",
  "family.addSkill": "Add a skill",
  "family.skillName": "Skill name",
  "family.retireSkill": "Remove",
  "family.retire": "Retire this role family",
  "family.retire.intro":
    "A retired role family keeps the ratings made against it but is no longer offered.",
  "family.retire.blocked": "{n} people have this role family. Give them another first.",
  "family.retired": "Role family retired.",
  "family.back": "Back to unit context",
  "family.placeholder": "Placeholder template",
  "family.addFromTemplateTitle": "Add skills to {family} from a template",
  "family.addFromTemplate": "Add skills from the template library",
  "family.addFromTemplate.intro":
    "Choose a template to add its skills to this role family. You keep, rename or drop each one before anything is added.",
  "family.template": "Template",
  "family.templateContinue": "Continue",
  "family.addSkills": "Add these skills",

  // Per unit.
  "units.title": "Each unit's context",
  "units.intro":
    "For every unit with people in it: {domains} knowledge domains, {decisions} decision types, {processes} critical processes and {systems} primary systems.",
  "units.col.unit": "Unit",
  "units.col.domains": "Knowledge domains",
  "units.col.decisions": "Decision types",
  "units.col.processes": "Processes",
  "units.col.systems": "Systems",
  "units.col.status": "Status",
  "units.open": "Open",
  "units.status.complete": "Complete",
  "units.status.incomplete": "Incomplete",
  "units.none": "No units with people in them yet. Upload the directory first.",

  "unit.meta": "{people} people. Unit type: {type}.",
  "unit.prompts": "Questions that help",
  "unit.remove": "Remove",
  "unit.add": "Add",
  "unit.count": "{n} named; {needed}.",

  "domains.title": "Knowledge domains",
  "domains.intro":
    "The areas of knowledge the unit's work depends on, each with how critical it is. Managers rate each person's working knowledge of each domain. Name {min} to {max}.",
  "domains.name": "Knowledge domain",
  "domains.criticality": "Criticality",
  "domains.criticality.1": "1: useful",
  "domains.criticality.2": "2: important",
  "domains.criticality.3": "3: critical",
  "domains.needCritical":
    "Mark at least one domain as critical. Without one, knowledge cannot be scored for this unit.",
  "domains.none": "No knowledge domains yet.",

  "decisions.title": "Decision types",
  "decisions.intro":
    "The decisions the unit's leadership team is asked about: who proposes, who decides, who must agree. Choose {min} to {max} from the list for this kind of unit, and add any of your own.",
  "decisions.starter": "Suggested for {type} units",
  "decisions.starterNone":
    "Set the unit's type on the units screen to see suggested decision types.",
  "decisions.saveSelection": "Save the selection",
  "decisions.own": "Your own decision types",
  "decisions.name": "Decision type",
  "decisions.none": "None of your own yet.",

  "processes.title": "Critical processes",
  "processes.intro":
    "The processes most of the unit's work flows through. Members are asked where each one creates friction. Name exactly {n}.",
  "processes.name": "Process",
  "processes.none": "No processes yet.",
  "processes.full": "{n} are named. Remove one to name another.",

  "systems.title": "Primary systems",
  "systems.intro":
    "The systems the unit relies on. The administrator checklist asks about each one's ownership, currency and fit. Name {min} to {max}.",
  "systems.name": "System",
  "systems.none": "No systems yet.",

  range: "{min} to {max}",
  "need.range": "{min} to {max} needed",
  "need.exact": "exactly {n} needed",
  "need.met": "complete",

  "error.nameUsed": "That name is already used here.",
  "error.familyInUse": "People have this role family. Give them another first.",
  "error.processesFull": "This unit already has its processes. Remove one first.",
} as const;

export type ContextCopyKey = keyof typeof contextCopy;
