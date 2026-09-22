/**
 * @performancevp/recommendations
 *
 * The recommendations package: turns a stored calculation run and its intake aggregates
 * into ranked suggestions. Eligibility, pattern selection with the 8-point margin and
 * self-checks, sequencing and combinations, and the projection rules, as pure functions
 * of a stored run, so a suggestion can always be reproduced from the run that produced it.
 *
 * Authority: the Online Recommendations Specification and the Intervention Design Library
 * in docs/source-ip/. Depends on the engine only, for projectImpact (PORTAL_BUILD_PLAN.md 1.3).
 *
 * Milestone 7 fills this package. Until then it exports its version only, which
 * calculation_runs will record as recommendations_version.
 */
export const RECOMMENDATIONS_VERSION = "0.0.0";
