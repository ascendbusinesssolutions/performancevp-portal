/**
 * The administrator checklists' answers (Online Measurement Specification 4.2 to 4.3a; Milestone 5
 * plan, 3.4), in the shape save_checklist stores and the intake scores: ADM-O1 per role family
 * ({ra1, ra2, ra3} as yes or no), ADM-O2 per system ({ti1, ti2} yes or no, ti3 yes, partly or no,
 * int1 one of five), ADM-O4 as up to five figures with the backlog's "not applicable". Pure: it
 * turns the checklist form's fields into answers, and answers back into the form's defaults.
 */

export type ChecklistCode = "ADM-O1" | "ADM-O2" | "ADM-O4";

export const CHECKLISTS: readonly ChecklistCode[] = ["ADM-O1", "ADM-O2", "ADM-O4"];

/** The answer key each fact is stored under. */
export const FACT_KEY: Readonly<Record<string, string>> = {
  "RA-1": "ra1",
  "RA-2": "ra2",
  "RA-3": "ra3",
  "TI-1": "ti1",
  "TI-2": "ti2",
  "TI-3": "ti3",
  "INT-1": "int1",
  "CF-1": "utilisationPercent",
  "CF-2": "overtimeHoursPerFte",
  "CF-3": "absenceAboveBaselinePercent",
  "CF-4": "backlogChangePercent",
  "CF-5": "vacancyRatePercent",
};

const YES_NO = new Set(["ra1", "ra2", "ra3", "ti1", "ti2"]);
const TI3 = new Set(["yes", "partly", "no"]);
const INT1 = new Set(["automated", "scheduled", "manual", "not-connected", "excluded"]);
const FIGURES = [
  "utilisationPercent",
  "overtimeHoursPerFte",
  "absenceAboveBaselinePercent",
  "backlogChangePercent",
  "vacancyRatePercent",
];

/** A form field's name: the subject (role family or system) and the answer key. */
export function fieldName(subject: string, key: string): string {
  return `${subject}:${key}`;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The answers a checklist form holds, for the given subjects (role families for ADM-O1, systems for
 * ADM-O2), or null where a figure is not a number. Unanswered questions are left out.
 */
export function answersFromForm(
  code: ChecklistCode,
  formData: FormData,
  subjects: readonly string[],
): Record<string, unknown> | null {
  if (code === "ADM-O4") {
    const answers: Record<string, unknown> = {};
    for (const key of FIGURES) {
      if (key === "backlogChangePercent" && text(formData, `${key}:na`) === "on") {
        answers[key] = "not-applicable";
        continue;
      }
      const raw = text(formData, key).replace(",", ".").replace(/%$/, "");
      if (raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || Math.abs(value) > 1000) return null;
      answers[key] = value;
    }
    return answers;
  }
  const keys = code === "ADM-O1" ? ["ra1", "ra2", "ra3"] : ["ti1", "ti2", "ti3", "int1"];
  const answers: Record<string, Record<string, unknown>> = {};
  for (const subject of subjects) {
    const entry: Record<string, unknown> = {};
    for (const key of keys) {
      const value = text(formData, fieldName(subject, key));
      if (value === "") continue;
      if (YES_NO.has(key)) {
        if (value !== "yes" && value !== "no") return null;
        entry[key] = value === "yes";
      } else if (key === "ti3") {
        if (!TI3.has(value)) return null;
        entry[key] = value;
      } else if (key === "int1") {
        if (!INT1.has(value)) return null;
        entry[key] = value;
      }
    }
    if (Object.keys(entry).length > 0) answers[subject] = entry;
  }
  return answers;
}

/** A stored answer as the form's option value: yes and no for true and false, else as stored. */
export function optionOf(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
