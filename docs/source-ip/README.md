# Source IP — authority and lookup

This folder holds the canonical Performance Equation source documents that the portal implements. They are copied here so Claude Code can read them while building. **Treat every file in this folder as read-only authority.** The portal implements this IP; it does not redefine it. Do not edit these files, and do not invent sub-dimension names, weights, counts, or scoring rules. Source them here.

These are snapshots of a larger document set maintained separately by Michael. If the underlying IP changes, these copies must be refreshed; flag to Michael if anything here looks stale or internally inconsistent.

## Hierarchy of authority

When two documents appear to disagree, the higher layer wins, and the discrepancy is surfaced to Michael rather than resolved unilaterally.

1. **Strategy** defines truth: the equation, the weights, the offerings, and the report and dashboard intent.
2. **Cadence Master** fixes structure: the four forces and their sub-dimensions, weights, tier sources, refresh cadence, and item counts.
3. **Measurement Reference (Parts 1 and 2)** turns structure into scoring rules.
4. **Diagnostic Workbook Spec** implements those rules as the scoring engine the portal must mirror.
5. **Survey Blueprint** and **Intervention Design Library** are the instrument-level sources for the survey builder and the intervention module.

Lower documents defer to higher ones. The Workbook Spec implements the Measurement Reference; it does not override it.

## What each document is authoritative for

| Document | Authoritative for |
|---|---|
| `Performance_Equation_Strategy.md` | The equation, the weights, the three commercial offerings, and the intended design of reports and dashboards. The top of the hierarchy; when a principle is contested, this wins. |
| `Performance_Equation_Sub_Dimension_Cadence_Master.md` | The single source of truth for the four forces and every sub-dimension, their weights, tier sources, refresh cadence, and item counts. **Take all counts and weights from here. Do not hardcode them from CLAUDE.md or any other file.** |
| `Performance_Equation_Measurement_Reference_Part1.md` | Scoring for Capability and Motivation: conversion rules, acceptance criteria, and worked examples. |
| `Performance_Equation_Measurement_Reference_Part2.md` | Scoring for Opportunity and Synergy, the Decision Latency Protocol, sector metadata, the triangulation and gap rules, and the composite P calculation. |
| `Performance_Equation_Diagnostic_Workbook_Spec.md` | The structure and logic of the scoring engine. **The portal calculation engine must mirror this exactly**, including the three-input-type model for how data enters. The benchmark for numerical parity. |
| `Performance_Equation_Survey_Blueprint.md` | The exact wording, structure, and item counts of the Diagnostic Survey. The basis for the portal survey builder. |
| `Performance_Equation_Intervention_Design_Library.md` | The catalogue of intervention design patterns: when to use each, its design shape, variants, indicative effect ranges, and failure modes. The basis for the intervention module's templates. Carries design guidance only; it deliberately omits implementation timelines and measurement cadences. |

## Where to read by build area

- **Calculation engine.** Diagnostic Workbook Spec is primary. Cadence Master for weights and structure. Measurement Reference Part 1 for C and M, Part 2 for O, S, DLP, the gap rules, and the composite P. Reproduce the worked examples in the Measurement Reference as the engine's test fixtures, and check numerical parity against the Workbook Spec.
- **Analyst data upload.** Workbook Spec for the three input types and what is entered versus calculated. Cadence Master for which sub-dimension draws on which tier source.
- **Survey system.** Survey Blueprint for items and structure. Measurement Reference Part 1 for how survey means convert to scores. Cadence Master for refresh cadence.
- **Dashboards.** Strategy for the intended report and dashboard design. Measurement Reference Part 2 for the binding constraint logic, the trip-wire overlay, and DLP reporting. Remember that Synergy is a coefficient and is never a candidate binding constraint, and that trip-wires sit outside the P calculation and require prominent reporting.
- **Intervention design module.** Intervention Design Library for the design patterns and indicative effect ranges. Strategy for the design-versus-implementation boundary, which the module must not blur.

## Two rules that recur and must not be broken

1. **The operational equation is the weighted form** `P = S × (C^0.35 × M^0.40 × O^0.25)`. The simplified form is for marketing and the book only and never appears in the engine.
2. **Survey conversion is** `(mean − 1) × 25`, not `mean × 25`. A mean of 1 maps to 0; a mean of 5 maps to 100.
