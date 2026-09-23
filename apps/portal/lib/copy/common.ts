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
} as const;

export type CommonCopyKey = keyof typeof commonCopy;

/** A count of people: "1 person", "{n} people". */
export function peopleCount(n: number): string {
  return n === 1 ? commonCopy["people.one"] : fill(commonCopy["people.many"], { n });
}
