/**
 * Synergy Inputs sheet. Type A: S2 perception and S3. S1, telemetry, the S2 blend and the
 * false-consensus flag follow in later steps.
 */

import { type Cell } from "./excel";
import { scoreItems } from "./survey";
import { TSI2_ITEMS, TSI3_ITEMS, type ItemMeans, type Tsi2Item, type Tsi3Item } from "./types";

/** Synergy Inputs D23. */
export function perceptionS2(items: ItemMeans<Tsi2Item> | undefined): Cell {
  return scoreItems(TSI2_ITEMS, items);
}

/** Synergy Inputs D36. */
export function scoreS3(items: ItemMeans<Tsi3Item> | undefined): Cell {
  return scoreItems(TSI3_ITEMS, items);
}
