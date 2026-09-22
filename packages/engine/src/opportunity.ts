/**
 * Opportunity Inputs sheet. Type A: the perception layers. Structural layers, the two-layer
 * combination, O4 and O5 follow in later steps.
 */

import { type Cell } from "./excel";
import { scoreItems } from "./survey";
import {
  OI1_ITEMS,
  OI2_ITEMS,
  OI3_ITEMS,
  OI4_ITEMS,
  type ItemMeans,
  type Oi1Item,
  type Oi2Item,
  type Oi3Item,
  type Oi4Item,
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
