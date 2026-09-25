/**
 * The manager's rating form as my_rating_form returns it, and what it asks of each report (Milestone
 * 5 plan, 3.4): the skills of the report's role family where C1 is asked, the unit's knowledge
 * domains where C2 is, and the talent band where C3 is asked of managers (never on the formal-
 * ratings route). Pure, so the status of each report is tested.
 */

export interface Rated {
  subject: string;
  /** The skill or domain; absent for a band. */
  id?: string;
  value: number;
  note: string | null;
}

export interface FormSkill {
  id: string;
  name: string;
  critical: boolean;
  kind: string;
}

export interface FormUnit {
  campaignUnitId: string;
  name: string;
  c3Route: "formal" | "module" | null;
  items: string[];
  roleFamilies: Array<{ id: string; name: string; skills: FormSkill[] }>;
  knowledgeDomains: Array<{ id: string; name: string; criticality: number }>;
}

export interface FormReport {
  subject: string;
  name: string;
  roleTitle: string | null;
  roleFamilyId: string | null;
  fte: number;
  startDate: string | null;
  campaignUnitId: string;
  team: string | null;
}

export interface RatingForm {
  campaign: {
    id: string;
    name: string | null;
    cadence: string;
    eventTrigger: string | null;
    closesAt: string;
    status: string;
  };
  organisationName: string;
  session: { id: string; managerName: string };
  units: FormUnit[];
  reports: FormReport[];
  ratings: { skills: Rated[]; knowledge: Rated[]; bands: Rated[] };
  previous: { skills: Rated[]; knowledge: Rated[]; bands: Rated[] };
}

export type Kind = "skill" | "knowledge" | "band";

/** The key of one rating in a form: report, kind and item. */
export function ratingKey(subject: string, kind: Kind, id = ""): string {
  return `${subject}|${kind}|${id}`;
}

/** Every rating of a list, by key. */
export function byKey(
  form: RatingForm["ratings"],
): Map<string, { value: number; note: string | null }> {
  const map = new Map<string, { value: number; note: string | null }>();
  for (const r of form.skills) map.set(ratingKey(r.subject, "skill", r.id), r);
  for (const r of form.knowledge) map.set(ratingKey(r.subject, "knowledge", r.id), r);
  for (const r of form.bands) map.set(ratingKey(r.subject, "band"), r);
  return map;
}

export interface Asked {
  skills: FormSkill[];
  domains: FormUnit["knowledgeDomains"];
  band: boolean;
}

export function askedOf(report: FormReport, unit: FormUnit | undefined): Asked {
  if (!unit) return { skills: [], domains: [], band: false };
  const family = unit.roleFamilies.find((f) => f.id === report.roleFamilyId);
  return {
    skills: unit.items.includes("c1") ? (family?.skills ?? []) : [],
    domains: unit.items.includes("c2") ? unit.knowledgeDomains : [],
    band: unit.items.includes("c3") && unit.c3Route === "module",
  };
}

/** The keys a report needs rated to be done. */
export function neededKeys(report: FormReport, unit: FormUnit | undefined): string[] {
  const asked = askedOf(report, unit);
  return [
    ...asked.skills.map((s) => ratingKey(report.subject, "skill", s.id)),
    ...asked.domains.map((d) => ratingKey(report.subject, "knowledge", d.id)),
    ...(asked.band ? [ratingKey(report.subject, "band")] : []),
  ];
}

/** A 5 needs evidence, and a band of 5 or 1 does too (the database's constraints). */
export function needsEvidence(kind: Kind, value: number): boolean {
  return kind === "band" ? value === 1 || value === 5 : value === 5;
}
