/**
 * M-C3-MGR, the talent-band distribution: 9 Type C Scoring rows 69 to 76. Raw counts per band
 * from the manager rows; Band 5 capped at 25% of the rated total with the excess moved to Band 4;
 * where the mean band after the cap exceeds 3.5, 20% of each band's count moves down one band;
 * the analyst override column is blank online, so FINAL is the skewed column. Band 1 below 5%
 * of the rated total is a flag only. The Online Measurement Specification 4.4 adopts this form.
 */

import { C3_ADJUSTMENT, C3_BANDS } from "../constants";
import { gt, lt } from "../excel";
import type { ManagerRow } from "./c1-mgr";

/** Counts indexed by band: index 0 is Band 1. */
export type BandCounts = [number, number, number, number, number];

export interface C3Result {
  raw: BandCounts;
  capped: BandCounts;
  skewed: BandCounts;
  final: BandCounts;
  total: number;
  /** SUMPRODUCT(bands, raw) / total; blank when nothing is rated. */
  rawMean: number | undefined;
  /** The mean band after the cap, which the skew rule tests. */
  cappedMean: number | undefined;
  capApplied: boolean;
  skewApplied: boolean;
  /** "Band1<5%: verify (not auto-adjusted)" or "ok"; blank when nothing is rated. */
  band1Check: string | undefined;
}

function meanBand(counts: BandCounts, total: number): number {
  let sum = 0;
  C3_BANDS.forEach((band, i) => {
    sum += band * (counts[i] as number);
  });
  return sum / total;
}

export function scoreC3(rows: readonly ManagerRow[]): C3Result {
  const raw: BandCounts = [0, 0, 0, 0, 0];
  for (const row of rows) {
    const index = C3_BANDS.indexOf(row.band as (typeof C3_BANDS)[number]);
    if (index >= 0) raw[index] = (raw[index] as number) + 1;
  }
  const total = raw.reduce((a, b) => a + b, 0);
  if (total === 0) {
    const zero: BandCounts = [0, 0, 0, 0, 0];
    return {
      raw,
      capped: zero,
      skewed: zero,
      final: zero,
      total,
      rawMean: undefined,
      cappedMean: undefined,
      capApplied: false,
      skewApplied: false,
      band1Check: undefined,
    };
  }
  const cap = C3_ADJUSTMENT.band5CapShare * total;
  const band5 = Math.min(raw[4], cap);
  const capped: BandCounts = [raw[0], raw[1], raw[2], raw[3] + Math.max(0, raw[4] - cap), band5];
  const cappedMean = meanBand(capped, total);
  const shift = C3_ADJUSTMENT.skewShift;
  const skewApplied = gt(cappedMean, C3_ADJUSTMENT.skewMeanTrigger);
  const skewed: BandCounts = skewApplied
    ? [
        capped[0] + shift * capped[1],
        (1 - shift) * capped[1] + shift * capped[2],
        (1 - shift) * capped[2] + shift * capped[3],
        (1 - shift) * capped[3] + shift * capped[4],
        (1 - shift) * capped[4],
      ]
    : [...capped];
  return {
    raw,
    capped,
    skewed,
    final: [...skewed],
    total,
    rawMean: meanBand(raw, total),
    cappedMean,
    capApplied: raw[4] > cap,
    skewApplied,
    band1Check: lt(raw[0] / total, C3_ADJUSTMENT.band1FloorShare)
      ? "Band1<5%: verify (not auto-adjusted)"
      : "ok",
  };
}
