# @performancevp/engine

The calculation engine. A pure TypeScript package that reproduces the production Diagnostic Workbook formula for formula, including intermediate rounding and Excel's threshold comparison behaviour. It performs no IO, reads no clock, and imports nothing outside itself.

**Authority.** `docs/ENGINE_SPEC.md` is the specification. The Diagnostic Workbook in `docs/benchmarks/` is the single source of calculation truth; any engine-versus-workbook difference is an engine defect (`DECISIONS.md` 2.1). Constants are sourced from the workbook's Ref sheet, checked against the Cadence Master, Workbook Spec and Measurement Reference, and live in `src/constants.ts`, each annotated with its cell and its document section.

**Status.** Milestone 1 complete: every worked example reproduces; the 50 workbook scenarios of 21 September 2026 and 40 Excel-recalculated fixtures match on every formula cell. Version 1.0.0.

## Public surface

- `calculateUnit(input)`: the whole workbook for one unit and one cycle. `UnitMeasurementInput` mirrors the input cells (an empty cell is an absent property); `UnitMeasurementResult` mirrors the calculated cells (a blank is `undefined` on a present key).
- `projectImpact(baseline, code, assumedScore)`: the unit recomputed with one sub-dimension's score replaced, for the what-if simulator and the recommendations package. An unchanged score returns the baseline exactly.
- `constants`, the types, `ENGINE_VERSION` and `DisabledArchetypeError`. Only the Default archetype is enabled; the others are held so the weight table can be checked against Ref.

Every sheet's functions are exported from their modules for function-level tests; the wiring is in `src/evaluate.ts`, once, with a closed set of overrides (the seventeen score cells and the O1 to O3 layers) that replace a calculated cell with a constant, as typing over the formula would.

## Running

`pnpm test` runs the worked examples, the property tests, the 50 legacy scenarios and every parity fixture, and prints the parity report. `pnpm typecheck` checks the package source under `lib: ["es2023"]` with no Node or DOM types, then the tests. Fixture generation (needs Excel) is described in `tools/parity/README.md`.

## Mirrored quirks

Behaviour the engine reproduces from the workbook that a reader might take for a defect. Each is deliberate and covered by a test; changing any of them is a workbook change first (`DECISIONS.md` 2.1).

| Behaviour | Cell |
|---|---|
| Threshold comparisons apply Excel's rule: two numbers agreeing to 15 significant digits compare equal, so a gap stored as 15.000000000000014 is not above 15 and a perception score of 59.999999999999986 is not below 60. | Every comparison site: gaps, trip-wires, false consensus, bands, range checks, the binding-component tie |
| P confidence maps Low to 1, Medium to 2 and anything else to 3, so a sub-dimension reading "n/a" (unmeasured) or "-" (vintage after the engagement date) never lowers it. Trip-wire and DLP rows are excluded. | Composite Scoring B51 |
| The unit mean the relative-weakness factor uses is the average of the available scores only; blank sub-dimensions do not pull it down. | Composite Scoring Q5:Q18, `AVERAGE($K$5:$K$18)` |
| The O5 denominator counts the FTE of teams whose score is above 0. A team scoring exactly 0 contributes nothing and leaves the denominator. | Opportunity Inputs D75, `SUMIF(C71:C74,">0",B71:B74)` |
| C2 computes whatever the critical-domain coverage check says; the check is a flag, not a gate. Gating is the intake package's job. | Capability Inputs D23, D24 |
| C1 is not capped after the tenure moderator: full coverage with the 1.05 factor gives 105. The Measurement Reference says "capped"; the workbook does not cap. Parked for the source-document pass. | Capability Inputs D12 |
| The realistic P gain shows `#DIV/0!` when a sub-dimension's component is exactly 0; its priority is then blank and the top-six gain cell is blank. The engine carries the error as a typed value. | Composite Scoring P5:P18, E36:E41 |
| Display cells follow Excel's blank-as-zero arithmetic: a blank confirmed-proficiencies count gives a coverage ratio of 0 (not blank), a blank domain score gives a coverage-adjusted 0, a blank band count gives a share of 0 over a non-zero total. The scores themselves are unaffected. | Capability Inputs E7:E9, E19:E22, D28:D32 |
| Unguarded references show 0 when their source is empty. The engine result keeps these blank; the parity map applies Excel's 0 for the comparison. | Sector Classification C4:C11; Methodology Footer C6, C8 |
| The tier-mix counts run over the twenty rows above DLP; the rating uses "Tier 3 more than Tier 1 plus Tier 2" and "Tier 1 at least Tier 2 plus Tier 3", else Mixed. | Methodology Footer C10:C13 |
| The Synergy range check cannot fail: S is clamped to 0.85 and 1.15 before the check reads it, and 0.85 + 0.30 compares equal to 1.15 under the comparison rule. | Composite Scoring B31, B49 |
| The overall DLS is blank unless all three classes have decisions, because text in arithmetic errors and the cell is wrapped in IFERROR. | DLP B52 |
| The critical-findings text is built with a trailing separator and trimmed with `LEFT(text, LEN − 2)`; a trip-wire with no mean reads "not measured". | Methodology Footer C24 |
| False consensus tests the raw TSI3-01 and TSI3-02 means, each converted, against 60, not the S3 score; all three inputs must be measured. | Synergy Inputs D37 |
| C5 on Tier 3 takes the module score even when indicators exist; on any other route, indicators and module blend 0.6/0.4 when both exist, else whichever exists. | Capability Inputs D63 |
| M1 on Tier 1 or Tier 2 with no platform composite is blank even when the eight items are present; only Tier 3 reads the items. An unset selector reads as Insufficient data everywhere. | Motivation Inputs D19; Capability Inputs D15, D63 |
| The S2 gap flag says "GAP - diagnostic finding", the O gap flags say "GAP - report separately", the M1 gap flag says "GAP - key finding". | Synergy Inputs D25; Opportunity Inputs D22, D39, D55; Behavioural Triangulators C11 |
| The workbook holds three role families, four domains, four teams and forty-three decisions. The engine accepts any number; the fixture generator refuses more than the workbook holds. | Capability Inputs rows 7 to 9 and 19 to 22; Opportunity Inputs rows 71 to 74; DLP rows 5 to 47 |
