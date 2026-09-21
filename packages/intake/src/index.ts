/**
 * @performancevp/intake
 *
 * The intake package: turns validated aggregates, identified ratings, administrator
 * checklists and formal performance ratings into a complete engine input plus the
 * methodology metadata for the footer. It mirrors the Survey Processing and Scoring
 * Workbook for every existing module and implements the online-only rules.
 *
 * Authority: the Online Measurement Specification, the Survey Processing Workbook Spec
 * and the Tier 3 Module Library in docs/source-ip/; the Northwind worked example in
 * docs/benchmarks/. Depends on the engine's input types only (PORTAL_BUILD_PLAN.md 1.3).
 *
 * Milestone 2 fills this package. Until then it exports its version only, which
 * calculation_runs will record as intake_version.
 */
export const INTAKE_VERSION = "0.0.0";
