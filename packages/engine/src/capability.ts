/**
 * Capability Inputs sheet. Type A: C4. Type B and routing follow in later steps.
 */

import { C4_WEIGHTS, CII_GROUPS } from "./constants";
import { isNumber, type Cell } from "./excel";
import { scoreItems } from "./survey";
import type { CiiItem, ItemMeans } from "./types";

export interface C4Result {
  /** Capability Inputs B53. */
  clarity: Cell;
  /** B54. */
  trust: Cell;
  /** B55. */
  flow: Cell;
  /** D56: 0.35 Clarity + 0.35 Trust + 0.30 Flow, blank when any sub-construct is blank. */
  score: Cell;
}

/** The team-level composite of the three sub-constructs (Capability Inputs D56; Measurement Reference 2.4). */
export function composeC4(clarity: Cell, trust: Cell, flow: Cell): Cell {
  if (!isNumber(clarity) || !isNumber(trust) || !isNumber(flow)) return undefined;
  return C4_WEIGHTS.clarity * clarity + C4_WEIGHTS.trust * trust + C4_WEIGHTS.flow * flow;
}

/** C4 from the fifteen CII item means: three sub-construct scores, then the weighted composite. */
export function scoreC4(items: ItemMeans<CiiItem> | undefined): C4Result {
  const clarity = scoreItems(CII_GROUPS.clarity, items);
  const trust = scoreItems(CII_GROUPS.trust, items);
  const flow = scoreItems(CII_GROUPS.flow, items);
  return { clarity, trust, flow, score: composeC4(clarity, trust, flow) };
}
