import { constants, isCurrent } from "@performancevp/intake";

/**
 * The formal-rating lines of the upload preview (PORTAL_COPY_SPEC.md S3), from the per-unit sums
 * the database returns. The 12-month rule and the 80% test are the intake package's own
 * (Online Measurement Specification 6.4), so the preview says what the campaign close will do.
 * Here currency is judged against today; at launch it is judged against the launch date. Labels are
 * not considered: they are mapped to bands on the formal ratings screen. Coverage is judged per
 * measurement unit: a combination's units are summed, and grouping units are counted in the totals
 * but given no coverage line, since they are not measured (Online Measurement Specification 6.2).
 */
export interface UnitRatingSums {
  unit_code: string;
  people: number;
  fte: number;
  dates: Array<{ date: string; people: number; fte: number }>;
}

export interface UnitCoverage {
  /** The measurement unit's key: the code of a unit measured on its own, or a combination's id. */
  key: string;
  /** Current ratings' FTE over the measurement unit's FTE, or undefined where it has no FTE. */
  share: number | undefined;
  qualifies: boolean;
}

export interface CoveragePreview {
  total: number;
  withRating: number;
  current: number;
  units: UnitCoverage[];
}

export function previewCoverage(
  units: readonly UnitRatingSums[],
  today: string,
  /**
   * The measurement unit each unit code in the file is measured as after the upload: its own code,
   * a combination's id, or null for a grouping unit, which is not measured.
   */
  measuredAs: (unitCode: string) => string | null = (code) => code,
): CoveragePreview {
  let total = 0;
  let withRating = 0;
  let current = 0;
  const sums = new Map<string, { fte: number; currentFte: number }>();
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
    const key = measuredAs(unit.unit_code);
    if (key === null) continue;
    const sum = sums.get(key) ?? { fte: 0, currentFte: 0 };
    sums.set(key, { fte: sum.fte + unit.fte, currentFte: sum.currentFte + currentFte });
  }
  const out = [...sums.entries()].map(([key, sum]): UnitCoverage => {
    const share = sum.fte > 0 ? sum.currentFte / sum.fte : undefined;
    return {
      key,
      share,
      qualifies: share !== undefined && share >= constants.FORMAL_RATINGS.coverageShare,
    };
  });
  return { total, withRating, current, units: out };
}
