/**
 * @performancevp/engine
 *
 * The Performance Equation calculation engine: a pure, formula-for-formula mirror of the
 * Diagnostic Workbook. It performs no IO, reads no clock and imports nothing outside itself.
 *
 * Authority: docs/ENGINE_SPEC.md; the Diagnostic Workbook Spec, Cadence Master and
 * Measurement Reference in docs/source-ip/; the workbook and fixtures in docs/benchmarks/.
 *
 * Milestone 1 fills this package. Until then it exports its version only, which
 * calculation_runs will record against every stored result.
 */
export const ENGINE_VERSION = "0.0.0";
