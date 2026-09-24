/**
 * Templates (PORTAL_COPY_SPEC.md Section 1): a fixed sentence with named slots, written in the copy
 * module as `{slot}`. Each branch of a template is its own key, so "every branch has a fixture"
 * means every templated key has one (fixtures.ts; the suite in template.test.ts fails otherwise).
 *
 * The slot names are read from the string's literal type, so filling a template with a missing or
 * misspelt slot fails to compile, and fails again at run time if a value is missing.
 */

/** The slot names in a template string, as a union of string literals. */
export type SlotNames<S extends string> = S extends `${string}{${infer Slot}}${infer Rest}`
  ? Slot | SlotNames<Rest>
  : never;

export type SlotValue = string | number;

export type Slots<S extends string> = [SlotNames<S>] extends [never]
  ? Record<string, never>
  : Record<SlotNames<S>, SlotValue>;

const SLOT = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

/** The slot names in a template, in order of first appearance. */
export function slotNames(template: string): string[] {
  return [...new Set([...template.matchAll(SLOT)].map((match) => match[1]!))];
}

export function isTemplate(text: string): boolean {
  return slotNames(text).length > 0;
}

/** Whole numbers take the Australian thousands separator; other values are written as given. */
function show(value: SlotValue): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("en-AU") : String(value);
  }
  return value;
}

/** Fills a template's slots. Every slot must have a value. */
export function fill<S extends string>(template: S, slots: Slots<S>): string {
  const values = slots as Record<string, SlotValue | undefined>;
  return template.replace(SLOT, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`copy template: no value for {${name}}`);
    return show(value);
  });
}

/**
 * A list for a sentence ("A, B and C"), cut short after `limit` items with the count of the rest.
 * The joining words come from the caller's copy, so nothing here is prose.
 */
export function listOf(
  items: readonly string[],
  words: { and: string; more: (count: number) => string },
  limit = 5,
): string {
  if (items.length === 0) return "";
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} ${words.and} ${words.more(rest)}`;
  if (shown.length === 1) return shown[0]!;
  return `${shown.slice(0, -1).join(", ")} ${words.and} ${shown.at(-1)!}`;
}
