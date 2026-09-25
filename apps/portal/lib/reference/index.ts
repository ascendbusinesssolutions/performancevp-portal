import json from "./reference.json";
import type { ReferenceSet } from "./types";

/**
 * The instrument as the reference tables hold it. The drift test proves this file equals the source
 * documents and the seeded tables, so pure code may read it instead of the database.
 */
export const REFERENCE = json as ReferenceSet;

export type * from "./types";
