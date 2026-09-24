import { fill } from "./template";

/**
 * Words shared by lists and counts across the copy module (PORTAL_COPY_SPEC.md Section 1).
 */
export const commonCopy = {
  "list.and": "and",
  "list.more": "{n} more",
  "list.none": "None",
  "people.one": "1 person",
  "people.many": "{n} people",
  "units.one": "1 unit",
  "units.many": "{n} units",
  "families.one": "1 role family",
  "families.many": "{n} role families",
} as const;

export type CommonCopyKey = keyof typeof commonCopy;

/** A count of people: "1 person", "{n} people". */
export function peopleCount(n: number): string {
  return n === 1 ? commonCopy["people.one"] : fill(commonCopy["people.many"], { n });
}

/** A count of units: "1 unit", "{n} units". */
export function unitCount(n: number): string {
  return n === 1 ? commonCopy["units.one"] : fill(commonCopy["units.many"], { n });
}

/** A count of role families: "1 role family", "{n} role families". */
export function familyCount(n: number): string {
  return n === 1 ? commonCopy["families.one"] : fill(commonCopy["families.many"], { n });
}
