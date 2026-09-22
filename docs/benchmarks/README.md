# Benchmarks: the workbooks and the parity fixtures

This folder holds the three Excel workbooks the portal's pure packages must reproduce, and the fixtures generated from them. Everything here is a snapshot. The masters live in the separate IP folder (`performance-equation`, alongside this repository), under `Production Docs/` for the workbooks and `tools/workbook-maintenance/fixtures/` for the fixture file. They are refreshed only by copying from the masters and are never edited here. All three workbooks and the fixture file were verified identical to their masters by SHA-256 on 21 September 2026.

## The rule

**The Diagnostic Workbook is the single source of calculation truth** (`DECISIONS.md` 2.1, settled 10 June 2026). The engine reproduces its logic formula for formula, including intermediate rounding and Excel's threshold comparison behaviour. Any difference between engine output and workbook output is a defect in the engine, never a design choice made in the portal. The same relationship holds between the intake package and the Survey Processing and Scoring Workbook.

## The three workbooks

| File | What it is | Which package it benchmarks |
|---|---|---|
| `PerformanceVP-Diagnostic-Workbook.xlsx` | The production Diagnostic Workbook as corrected on 21 September 2026: the gap-flag guard, the perception-only gap rule, the blank-input rule, the false-consensus guard and the trip-wire "not measured" text (`DECISIONS.md` 1.1 and 1.4, and Section 4 items 6 and 7). Fourteen tabs from Engagement Metadata through Composite Scoring to Report Data and Ref. Its stored inputs are the Northwind Mutual worked example. | `packages/engine` (Milestone 1). Parity is asserted at every computed output, with exact match on the discrete outputs. |
| `Survey Processing and Scoring Workbook.xlsx` | The blank template: twelve tabs, every scoring formula present, the import sheets carrying headers and keys only. It is the workbook that turns module and survey responses into the engine's Type A, B and C inputs. | `packages/intake` (Milestone 2). The package mirrors its formulas. |
| `Survey Processing and Scoring Workbook - Northwind Mutual (Worked Example).xlsx` | The same template populated with the Northwind Mutual responses. | `packages/intake`. The parity benchmark for every module the workbook scores. |

The rules that are new in the Online Measurement Specification (M-C2-MGR, the three administrator checklists, the inflation guard, the formal-ratings route) have no workbook. Their named fixtures are the worked examples in Part 4 of that specification.

## The fixtures folder

`fixtures/2026-09-21-gap-rule-and-blank-inputs.json` holds fifty scenarios computed by Excel from the Diagnostic Workbook, each with its inputs written as edits to the Northwind example and its outputs under both the archived v5 workbook and the corrected production workbook. The engine reproduces the **after** outputs; the **before** outputs are kept to show what each change moved. `fixtures/README.md` describes the file and the Excel comparison behaviour the engine must reproduce.

Milestone 1 adds the versioned parity fixture format from `docs/ENGINE_SPEC.md` 5.3: one complete engine input and the expected full result set per fixture, with the recorded outputs taken from the workbook.

## Handling the workbooks

Do not open a workbook from this folder and save it. Excel rewrites stored values on save, and the stored values are the benchmark. Work on a copy elsewhere if a workbook needs to be opened for reading, or read it programmatically. `.gitattributes` marks `.xlsx` as binary and `.gitignore` excludes Excel's `~$` lock files, so an accidental open leaves no trace in git, but a save would.

## Refreshing from the masters

1. Copy the changed file from its master path in the IP folder over the copy here.
2. Compare checksums (`shasum -a 256`) of master and copy; they must match.
3. Commit with the date and the reason for the refresh, and update the verification date at the top of this file.
