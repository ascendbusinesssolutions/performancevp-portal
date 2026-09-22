/**
 * Opportunity Inputs sheet: O1 to O5. The perception layers, the structural layers, the two-layer
 * combination with the gap rule, O4 and O5.
 */

import {
  GAP_THRESHOLD,
  O1_STRUCTURAL_WEIGHTS,
  O2_STRUCTURAL_WEIGHTS,
  O4_BLEND,
  O_GAP_FLAG,
} from "./constants";
import { gt, isNumber, sum, type Cell } from "./excel";
import { scoreItems } from "./survey";
import {
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  type ItemMeans,
  type O1Inputs,
  type O2Inputs,
  type O3Inputs,
  type Oi1Item,
  type Oi2Item,
  type Oi3Item,
  type Oi4Item,
  type TeamInput,
  type TwoLayerResult,
} from "./types";

/** Opportunity Inputs D20. */
export function perceptionO1(items: ItemMeans<Oi1Item> | undefined): Cell {
  return scoreItems(OI1_ITEMS, items);
}
/** D37. */
export function perceptionO2(items: ItemMeans<Oi2Item> | undefined): Cell {
  return scoreItems(OI2_ITEMS, items);
}
/** D53. */
export function perceptionO3(items: ItemMeans<Oi3Item> | undefined): Cell {
  return scoreItems(OI3_ITEMS, items);
}
/** D66. */
export function perceptionO4(items: ItemMeans<Oi4Item> | undefined): Cell {
  return scoreItems(OI4_ITEMS, items);
}

// ---------------------------------------------------------------------------------------------
// O5 Leadership enablement (per team, FTE-weighted): rows 71 to 74, D75
// ---------------------------------------------------------------------------------------------

export interface O5Result {
  /** D71:D74: FTE × score where both are numeric, else 0. */
  contributions: number[];
  /** D75: SUM(contributions) / SUMIF(score > 0, FTE); blank when that denominator is 0. */
  score: Cell;
}

/**
 * Measurement Reference 4.5. The denominator counts the FTE of teams whose score is above 0, so a
 * team scoring exactly 0 contributes nothing and leaves the denominator; mirrored as written.
 */
export function scoreO5(teams: readonly TeamInput[] | undefined): O5Result {
  const rows = teams ?? [];
  const contributions = rows.map((t) =>
    isNumber(t.fte) && isNumber(t.score) ? t.fte * t.score : 0,
  );
  let denominator = 0;
  for (const t of rows)
    if (isNumber(t.score) && t.score > 0 && isNumber(t.fte)) denominator += t.fte;
  if (denominator === 0) return { contributions, score: undefined };
  return { contributions, score: sum(contributions) / denominator };
}

// ---------------------------------------------------------------------------------------------
// Structural layers (Type C components), the two-layer combination and O4
// ---------------------------------------------------------------------------------------------

/** D8: 0.40 M-O1-LT + 0.30 role architecture + 0.30 M-O1-CASCADE; blank unless all three are numeric (Workbook Spec 1.8). */
export function structuralO1(inputs: O1Inputs | undefined): Cell {
  const {
    decisionRightsScore: lt,
    roleArchitectureScore: ra,
    cascadeScore: cascade,
  } = inputs ?? {};
  if (!isNumber(lt) || !isNumber(ra) || !isNumber(cascade)) return undefined;
  const w = O1_STRUCTURAL_WEIGHTS;
  return w.decisionRights * lt + w.roleArchitecture * ra + w.cascade * cascade;
}

/** D29: 0.35 tool inventory + 0.40 M-O2-IA + 0.25 integration; blank unless all three are numeric. */
export function structuralO2(inputs: O2Inputs | undefined): Cell {
  const {
    toolInventoryScore: tools,
    informationAccessScore: ia,
    integrationScore: integration,
  } = inputs ?? {};
  if (!isNumber(tools) || !isNumber(ia) || !isNumber(integration)) return undefined;
  const w = O2_STRUCTURAL_WEIGHTS;
  return w.toolInventory * tools + w.informationAccess * ia + w.integration * integration;
}

/** D44: M-O3-PF as given. */
export function structuralO3(inputs: O3Inputs | undefined): Cell {
  const score = inputs?.processFrictionScore;
  return isNumber(score) ? score : undefined;
}

/**
 * The two-layer combination for O1, O2 and O3 (D21:D23, D38:D40, D54:D56).
 * gap = structural − perception (IFERROR, so blank when either layer is blank).
 * |gap| above 15 fires the flag and the perception score feeds the composite; otherwise the score
 * is the mean of the two layers. Measurement Reference 8.1; Workbook Spec 6.6; DECISIONS.md 1.1.
 * The comparison applies Excel's 15-significant-digit rule.
 */
export function combineTwoLayer(structural: Cell, perception: Cell): TwoLayerResult {
  if (!isNumber(structural) || !isNumber(perception)) {
    return { structural, perception, gap: undefined, gapFlag: "", score: undefined };
  }
  const gap = structural - perception;
  const fires = gt(Math.abs(gap), GAP_THRESHOLD);
  return {
    structural,
    perception,
    gap,
    gapFlag: fires ? O_GAP_FLAG : "",
    score: fires ? perception : (structural + perception) / 2,
  };
}

/** D67: (capacity analysis + perception) / 2, both required; no gap rule. Measurement Reference 4.4. */
export function scoreO4(capacityAnalysis: Cell, perception: Cell): Cell {
  if (!isNumber(capacityAnalysis) || !isNumber(perception)) return undefined;
  return (capacityAnalysis + perception) * O4_BLEND;
}
