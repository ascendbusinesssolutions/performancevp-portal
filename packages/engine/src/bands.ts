/**
 * Report Data column D: Green above 75, Amber at or above 50, Red below, Neutral when blank.
 * Bands are decided on the unrounded score under Excel's comparison rule, so 74.6 prints as 75
 * and is Amber (docs/benchmarks/fixtures/README.md). Strategy 4.6 display rules.
 */

import { BANDS } from "./constants";
import { ge, gt, isNumber, type Cell } from "./excel";
import type { Band } from "./types";

export function band(value: Cell): Band {
  if (!isNumber(value)) return "Neutral";
  if (gt(value, BANDS.greenAbove)) return "Green";
  if (ge(value, BANDS.amberAtLeast)) return "Amber";
  return "Red";
}
