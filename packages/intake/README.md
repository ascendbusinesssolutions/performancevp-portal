# @performancevp/intake

The intake package. A pure TypeScript package that turns the raw survey rows of a closed campaign, the identified manager ratings, the administrator checklists and any formal performance ratings into a complete `UnitMeasurementInput` for the engine, together with the aggregates the recommendations rules read and the methodology metadata for the footer. It mirrors the Survey Processing and Scoring Workbook for every module that workbook scores and implements the online-only rules on top. It performs no IO and reads no clock; the campaign's launch and close dates are inputs.

**Authority.** The Online Measurement Specification (v0.8, 22 September 2026) is the authority for every online-only rule. The Survey Processing and Scoring Workbook in `docs/benchmarks/` is the single source of calculation truth for the modules it scores, and any intake-versus-workbook difference on those cells is an intake defect, with one documented exception below. The Tier 3 Module Library and the Survey Processing Workbook Spec define module scoring; the worked examples in Part 4 of the Online Measurement Specification are the named fixtures for the rules that have no workbook cell. Constants live in `src/constants.ts`, each annotated with its Reference cell or document section; the copies the engine also holds are asserted equal to the engine's by a test.

**Dependencies.** The engine's input types only (`PORTAL_BUILD_PLAN.md` 1.3). Test files may call the engine; `src/` may not.

**Status.** Milestone 2 complete: Northwind and ten generated scenarios match the workbook on every mapped formula cell; every Part 4 worked example reproduces through the engine. Version 1.0.0.

## Public surface

- `assembleUnit(input)`: the intake end to end for one unit and one campaign. `IntakeInput` is what the campaign engine holds at close (raw rows per audience, ratings, checklists, formal ratings, the unit context, the frozen directory snapshot, the campaign definition, and the prior cycle's engine input for carry-forward). `IntakeResult` is the engine input, the screening summaries, one status per instrument, the team rows, the aggregates, the adjustments, the C3 route record, the insufficiencies and the methodology metadata.
- `assemble(input)`: the same, returning every intermediate (`Assembly`) for the aggregates, the footer and tests.
- `runSurveyWorkbook(input)`: the workbook mirror alone, sheet by sheet, which the parity harness compares cell by cell.
- `screenResponses(rows)`: the validity checks for one audience, so the close job has exactly one place that screens.
- The module functions (`scoreLeadership`, `scoreCascade`, `scoreInformationAccess`, `scoreProcessFriction`, `scoreC1`, `scoreC2`, `scoreC3`, `scoreC5`, the three checklists, `scoreS1`, `medianTenureMonths`, the guard and the C3 route), `constants`, the types and `INTAKE_VERSION`.

## How the input reaches the engine

| Engine field | Source |
|---|---|
| `routes` | Every measured sub-dimension at the campaign close; an undeployed one carried forward from the prior cycle at its original date; a deployed one below threshold as `Insufficient data`. C1 is labelled Tier 2 so the engine takes its Type B rows on the table route and applies the tenure moderator; everything else is Tier 3; DLP is never measured. |
| `capability.c1` | Type B rows per role family: `fte` is the rated members' FTE and `confirmedProficiencies` the FTE-weighted count of their proficient skills, so the engine's coverage is the FTE-weighted mean of per-person coverage, which equals the workbook's unweighted family mean when every FTE is whole. `medianTenureMonths` from directory start dates. |
| `capability.c2` | Domain rows from M-C2-MGR: converted mean rating and rated FTE over unit FTE. |
| `capability.c3` | Band counts after the cap and the transfer (module route) or after the acceptance rules (formal route). |
| `capability.c4` | The fifteen CII item means FTE-weighted over the valid teams. |
| `capability.c5` | M-C5-TL as a finished score. |
| `motivation` | Raw item means over valid respondents, deployed items only; trip-wire means. |
| `opportunity.o1` to `o4` | Perception item means with M-O1-LT, ADM-O1, M-O1-CASCADE, ADM-O2, M-O2-IA, M-O3-PF and ADM-O4 as the structural components, each resolved on its own so a half-yearly check refreshes perception and carries the structural layer forward. |
| `opportunity.o5` | One row per valid team with its FTE and converted OI5 mean. |
| `synergy.s1` | Breadth, depth and distribution from the ratings matrix. |
| `synergy.s2`, `s3` | Item means; no telemetry online. |

## Running

`pnpm test` runs the worked examples, the property tests and every parity fixture, and prints the parity report. `pnpm typecheck` checks the package source under `lib: ["es2023"]` with no Node or DOM types, then the tests. Fixture generation (needs Excel) is described in `tools/parity/README.md`; the fixtures are built on the blank template from the requests `parity/requests.ts` writes, with the Northwind request extracted from the shipped worked example.

## Mirrored quirks

Behaviour the intake reproduces from the Survey Processing workbook that a reader might take for a defect, and the online rules it applies on top. Each is deliberate and covered by a test; changing any of the mirrored ones is a workbook change first.

| Behaviour | Cell or rule |
|---|---|
| Screening tests the whole row: patterning is MAX = MIN over every numeric value on the row, process items included; straight-lining is the mean of all forward items and the mean of all reverse items both at or above 4 or both at or below 2. The Survey Blueprint's per-sub-dimension and alternation forms are on the source pass. | 7 Screening G, H |
| A row with no reverse item answered cannot be straight-lined, since its reverse mean is blank. | 7 Screening D, H |
| MAX and MIN of an empty row read 0, not blank, because Excel's MAX of no numbers is 0 and IFERROR has nothing to catch. | 7 Screening E, F |
| The leadership survey is not screened; a manager counts as having responded once any rating of theirs exists. | 4 Import Leadership; 3 Import Manager U |
| The open-text columns O2I-07 and O3P-07 carry no forward or reverse flag; a numeric value there would count in COUNT, MAX and MIN and in neither mean. Online those columns are text and never reach the intake. | 2 Import Main row 3 |
| Every module score is the mean of the per-item means (each item weighted equally whatever its respondent count), with the mapped items flipped, over the items present, then (mean − 1) × 25. | 9 Type C Scoring B43:B47 |
| A block's response rate divides valid respondents answering its first item by the all-member headcount; the online thresholds count valid respondents answering any deployed item of the block, so a pulse that rotates the first item out still rates the block. | 8 Type A Means E; `thresholds.ts` |
| The team response rate divides by the team's FTE, not its headcount, as the workbook's Setup FTE does. Flagged for the source pass. | 8 Type A Means C80:C89, D95:D104 |
| The workbook's O5 team flag tests the count only; the online rule applies the count and the 70% rate to both CII and O5 teams, and the 75%-of-teams rule the workbook leaves to the analyst. | 8 Type A Means I95:I104; `team-rules.ts` |
| The Output sheet holds ten O5 team rows; the means sheet holds ten team rows too, although the Setup list has twelve slots. | 11 Output A78:C87 |
| M-O1-LT agreement: the workbook's C6:G17 wrap the helper range in N(), which Excel does not evaluate over an array, so every decision's agreement is the first import row's helper counts over that decision's n. Northwind masks it because all eight decisions there share one answer pattern. The intake follows the Module Library (each decision's own modal counts); `workbookForm` reproduces the defective cells for parity only. On the parked list for the workbook pass. | 9 Type C Scoring C6:G17, H6:H17, B34, B38 |
| A blank role answer counts in a decision's n and in no modal count; a role nobody answered scores 0 for that decision. | 4 Import Leadership I:M; 9 Type C Scoring C:G |
| A role family with FTE and no ratings weighs in at 0 in the C1 unit score, because SUMPRODUCT treats its blank score as 0. | 9 Type C Scoring B65 |
| B77 repeats the manager response-rate formula below the C3 block; a stray copy, mirrored. | 9 Type C Scoring B77 |
| The C3 skew rule is the workbook's 20% band transfer after the Band 5 cap, tested on the capped mean with Excel's 15-digit comparison, so a mean of exactly 3.5 does not fire. The analyst override column is blank online. | 9 Type C Scoring C69:F73 |
| The team-leader rows are not screened in the workbook; online they are screened for patterning and speed before scoring (Module Library 8.5), so the mirror's C5 and the assembly's C5 can differ when a leader answers all the same. | 5 Import TeamLeader N; `assemble.ts` |
| The speed check runs only with at least 20 received responses that recorded a time, at the nearest-rank 5th percentile, excluding strictly below the cut-off; the footer states whether it ran. | Online Measurement Specification Part 7 |
| The C1 and C2 inflation-guard deductions are computed and recorded with `applied: false` until the Diagnostic Workbook gains its adjustment cells; the C3 cap and transfer are applied. The formal-ratings confidence cap is recorded in the route record and the footer; the engine's band stands. | Online Measurement Specification 4.4, 6.4; decisions 1 and 2 of 22 September 2026 |
| A formal rating is current when dated on or after the same day of month twelve months before launch (29 February clamps to 28) and not after launch. C3's measurement date on the formal route is the earliest current rating date used. | Online Measurement Specification 6.4 |
| M-C1-MGR's unit score is mirrored for parity; the engine receives Type B rows and applies the tenure moderator, so the online C1 is moderated where the consultant-led Tier 3 route is not (Online Measurement Specification 11.3, discrepancy 5). | 9 Type C Scoring B65; `assemble.ts` |
