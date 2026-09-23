import { constants, isCurrent } from "@performancevp/intake";

/**
 * The formal-rating lines of the upload preview (PORTAL_COPY_SPEC.md S3), from the per-unit sums
 * the database returns. The 12-month rule and the 80% test are the intake package's own
 * (Online Measurement Specification 6.4), so the preview says what the campaign close will do.
 * Here currency is judged against today; at launch it is judged against the launch date. Labels are
 * not considered: they are mapped to bands on the formal ratings screen.
 */
export interface UnitRatingSums {
  unit_code: string;
  people: number;
  fte: number;
  dates: Array<{ date: string; people: number; fte: number }>;
}

export interface UnitCoverage {
  unit_code: string;
  /** Current ratings' FTE over the unit's FTE, or undefined for a unit with no FTE. */
  share: number | undefined;
  qualifies: boolean;
}

export interface CoveragePreview {
  total: number;
  withRating: number;
  current: number;
  units: UnitCoverage[];
}

export function previewCoverage(units: readonly UnitRatingSums[], today: string): CoveragePreview {
  let total = 0;
  let withRating = 0;
  let current = 0;
  const out: UnitCoverage[] = [];
  for (const unit of units) {
    total += unit.people;
    let currentFte = 0;
    for (const d of unit.dates) {
      withRating += d.people;
      if (isCurrent(d.date, today)) {
        current += d.people;
        currentFte += d.fte;
      }
    }
    const share = unit.fte > 0 ? currentFte / unit.fte : undefined;
    out.push({
      unit_code: unit.unit_code,
      share,
      qualifies: share !== undefined && share >= constants.FORMAL_RATINGS.coverageShare,
    });
  }
  return { total, withRating, current, units: out };
}
