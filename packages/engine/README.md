# @performancevp/engine

The calculation engine. A pure TypeScript package that reproduces the Diagnostic Workbook formula for formula, including intermediate rounding and Excel's threshold comparison behaviour. It performs no IO, reads no clock, and imports nothing outside itself.

**Authority.** `docs/ENGINE_SPEC.md` is the specification. The Diagnostic Workbook in `docs/benchmarks/` is the single source of calculation truth; any engine-versus-workbook difference is an engine defect. Constants are sourced from the Cadence Master and the Workbook Spec in `docs/source-ip/` and live in one annotated module.

**Status.** Empty shell (Milestone 0). Milestone 1 fills it and gates merges with its worked-example fixtures, property tests and the workbook parity harness.

**Run alone.** `pnpm test` and `pnpm typecheck` from this folder.
