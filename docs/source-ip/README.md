# Source IP: authority and lookup

This folder holds the canonical Performance Equation source documents that the portal implements. They are copied here so Claude Code can read them while building. **Treat every file in this folder as read-only authority.** The portal implements this IP; it does not redefine it. Do not edit these files, and do not invent sub-dimension names, weights, counts or scoring rules. Source them here.

**These files are a snapshot.** The root masters live in the separate IP folder (`performance-equation`, alongside this repository), and this snapshot is refreshed only by copying from them. Nothing here is ever edited in place. If a document looks stale or internally inconsistent, flag it to Michael rather than correcting it here. All eleven documents were verified identical to their masters by SHA-256 on 23 September 2026.

The operating documents of the build (`CLAUDE.md`, `DECISIONS.md`, `PORTAL_BUILD_PLAN.md` and `docs/ENGINE_SPEC.md`) are the opposite case: this repository is their only home, and they are edited here.

## Refreshing the snapshot

1. Copy the changed document from the IP folder root over the copy here, keeping the file name.
2. Compare checksums (`shasum -a 256`) of master and copy; they must match.
3. Commit with the date and the reason for the refresh, and update the verification date above.

## Hierarchy of authority

When two documents appear to disagree, the higher layer wins, and the discrepancy is surfaced to Michael rather than resolved unilaterally.

1. **Strategy** defines truth: the equation, the weights, the offerings, and the report and dashboard intent.
2. **Cadence Master** fixes structure: the four forces and their sub-dimensions, weights, tier sources, refresh cadence and item counts.
3. **Measurement Reference (Parts 1 and 2)** turns structure into scoring rules.
4. **Diagnostic Workbook Spec** implements those rules as the scoring engine the portal must mirror. **Survey Processing Workbook Spec** implements the scoring of responses into the engine's inputs, which the intake package must mirror.
5. **Survey Blueprint**, **Tier 3 Module Library** and **Intervention Design Library** are the instrument-level and pattern-level sources: item wording, module wording and scoring, and the intervention patterns.
6. **Online Measurement Specification** and **Online Recommendations Specification** own the rules that exist only for the online product. Each states what it owns and defers to every document above it; where one repeats a higher rule for buildability and the two disagree, the higher document wins.

Lower documents defer to higher ones. The Workbook Spec implements the Measurement Reference; it does not override it.

## What each document is authoritative for

| Document | Authoritative for |
|---|---|
| `Performance_Equation_Strategy.md` | The equation, the weights, the commercial offerings, and the intended design of reports and dashboards. The top of the hierarchy; when a principle is contested, this wins. |
| `Performance_Equation_Sub_Dimension_Cadence_Master.md` | The single source of truth for the four forces and every sub-dimension, their weights, tier sources, refresh cadence and item counts. **Take all counts and weights from here. Do not hardcode them from CLAUDE.md or any other file.** |
| `Performance_Equation_Measurement_Reference_Part1.md` | Scoring for Capability and Motivation: conversion rules, acceptance criteria and worked examples. |
| `Performance_Equation_Measurement_Reference_Part2.md` | Scoring for Opportunity and Synergy, the Decision Latency Protocol, sector metadata, the triangulation and gap rules, and the composite P calculation. |
| `Performance_Equation_Diagnostic_Workbook_Spec.md` | The structure and logic of the scoring engine. **The portal calculation engine must mirror this exactly**, including the three-input-type model for how data enters. Together with the workbook in `docs/benchmarks/`, the benchmark for numerical parity. |
| `Performance_Equation_Survey_Processing_Workbook_Spec.md` | The scoring of survey and module responses into engine inputs. **The intake package must mirror this.** |
| `Performance_Equation_Survey_Blueprint.md` | The exact wording, structure and item counts of the Diagnostic Survey, and the response validity rules. The basis for the survey builder. |
| `Performance_Equation_Tier3_Module_Library.md` | The wording and scoring of the audience modules the campaign engine deploys to managers, team leaders, the leadership team and unit members. |
| `Performance_Equation_Intervention_Design_Library.md` | The catalogue of intervention design patterns: when to use each, its design shape, variants, indicative effect ranges, pace and failure modes. Online, the basis for the suggestion cards. Carries design guidance only; it deliberately omits implementation timelines and measurement cadences. |
| `Performance_Equation_Online_Measurement_Specification.md` | How each of the 17 sub-dimensions and the three trip-wires is measured and scored online with no analyst present: the online route per sub-dimension, the new online instruments (M-C2-MGR, ADM-O1, ADM-O2, ADM-O4), the rules that replace analyst steps, and the online validity, directory, storage and labelling rules. **The authority for every online-specific measurement rule.** |
| `Performance_Equation_Online_Recommendations_Specification.md` | How results are ranked and presented, which pattern the platform suggests from the signals it holds, what a suggestion contains and the limits on it, the what-if and action-tracking rules, and the authoring rules for the online pattern content. |

## Where to read by build area

- **Calculation engine (`packages/engine`).** `docs/ENGINE_SPEC.md` is the specification. Diagnostic Workbook Spec is primary; Cadence Master for weights and structure; Measurement Reference Part 1 for C and M, Part 2 for O, S, the gap rules and the composite P. Reproduce the worked examples in the Measurement Reference as fixtures, and check numerical parity against the workbook in `docs/benchmarks/`.
- **Intake package (`packages/intake`).** Online Measurement Specification for the route per sub-dimension and every online-only rule (Parts 3, 4, 6.4 and 7). Survey Processing Workbook Spec and Tier 3 Module Library for module scoring. Survey Blueprint 7.8 and Measurement Reference 8.5 for response validity. The Northwind worked example in `docs/benchmarks/` for parity.
- **Setup and directory.** Online Measurement Specification Part 6 for the directory, the template fields, unit continuity, event triggers detected from the directory and the formal-ratings route. Part 4.5 for the Role-Family Template Library.
- **Campaign engine.** Online Measurement Specification Part 2 for the five audiences, the instrument mix and cadence. Survey Blueprint for items, structure and cadence tags. Tier 3 Module Library for module wording and bundling. Cadence Master Part 7 for cadence, triggers and validity thresholds. Part 7 of the Online Measurement Specification for display thresholds and storage rules.
- **Results and dashboards.** Online Recommendations Specification Part 1 for what the client sees, in order. Strategy for the intended dashboard design. Measurement Reference Part 2 for the binding-constraint logic, the trip-wire overlay and the gap findings. Online Measurement Specification Part 8 for the methodology footer and labelling. Synergy is a coefficient and never a candidate binding constraint; trip-wires sit outside P and require prominent reporting.
- **Suggestions, what-if and action tracking (`packages/recommendations`).** Online Recommendations Specification Parts 2 to 6 for eligibility, pattern selection, card content, effect ranges, the simulator, action tracking and the guardrails. Intervention Design Library for the patterns themselves. Strategy for the design-versus-implementation boundary, which no suggestion may blur.
- **Security, tenancy and storage.** Online Measurement Specification Part 7 for the storage rules: anonymous responses, identified ratings, support-staff access, retention and offboarding. `PORTAL_BUILD_PLAN.md` Section 3 for the roles and the policy intent.

## Two rules that recur and must not be broken

1. **The operational equation is the weighted form** `P = S × (C^0.35 × M^0.40 × O^0.25)`. The simplified form is for marketing and the book only and never appears in the engine.
2. **Survey conversion is** `(mean − 1) × 25`, not `mean × 25`. A mean of 1 maps to 0; a mean of 5 maps to 100.
