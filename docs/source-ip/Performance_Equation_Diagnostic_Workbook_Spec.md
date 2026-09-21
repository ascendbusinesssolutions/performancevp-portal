# The Performance Equation
## Diagnostic Workbook Specification

**Author:** Michael, PerformanceVP
**Status:** Working draft. The build specification for the Diagnostic Workbook — the Excel scoring engine for a Performance Equation Diagnostic engagement. This is a *specification* (structure + logic blueprint), not the workbook itself; it is detailed enough that building the Excel file is a translation task, not a design task. (28 May 2026: input model revised to the three-input-type taxonomy — Type A raw item means the workbook converts; Type B structured counts the analyst pre-adjusts then the workbook does the final formula; Type C finished module/platform scores the analyst computes outside the workbook — and the O1/O2/O3 structural+perception layering, fully aligned with Measurement Reference Parts 1–2, the Tier 3 Module Library and the Diagnostic Delivery Handbook.)
**Last updated:** 25 June 2026 (Parts 13 and 14 rewritten to define the full deliverable data contract as labelled, named-range cells on the Report Data and Methodology Footer tabs, so the Unit-level Report and Client Report build is a one-tab read rather than a hunt across the engine; added Part 14A (the named-range scheme and how Claude Cowork consumes the contract), a new Tab 13 Analyst Evidence holding the qualitative narrative inputs for the [WRITE] drafting, and a Decision description field on the DLP log. Prior, 24 June 2026: Type A note corrected: with Google Forms confirmed as the survey platform, the upstream Survey Processing and Scoring Workbook produces validity-screened item means, not the survey platform itself; the M-C5-TL reference is corrected to the house convention `(mean of 12 items − 1) × 25`. Prior, 11 June 2026: binding-constraint identification revised to rank by realistic P gain, a bounded diminishing-returns improvement toward a research-informed ceiling, weighted toward genuine relative weaknesses via the unit mean; supersedes the earlier lift-to-ceiling contribution ranking)
**Companion documents:** Strategy; Sub-Dimension × Cadence Master Reference; Measurement Reference Parts 1 and 2 (the scoring authority this spec implements); Survey Blueprint; Tier 1 & 2 Data Collection Guide; Tier 3 Module Library; Data Audit Template; Diagnostic Delivery Handbook (Part 8 describes how the analyst uses this workbook).

---

# Part 1 — Purpose and Design Principles

## 1.1 What the workbook is

The Diagnostic Workbook is the Excel scoring engine for a Performance Equation Diagnostic. There is **one workbook per unit** being measured. The analyst enters the unit's data into clearly-marked input cells; the workbook applies the conversion and scoring rules from the Measurement Reference and Survey Blueprint and computes every sub-dimension score, the component composites (C, M, O), the Synergy coefficient (S), the overall P score, the binding constraint, the Decision Latency Score (DLS), the trip-wire flags and the gap flags. The analyst never performs a calculation by hand and never edits a formula.

It implements the scoring authority; it does not redefine it. Where this spec states a formula, that formula is reproduced from the Measurement Reference or the Survey Blueprint so the workbook is buildable — but those documents remain the authority. If a rule changes, it changes there first and propagates here.

## 1.2 The core design principle — input cells vs calculated cells

Every cell in the workbook is one of two kinds, and the distinction is the single most important property of the build:

- **[INPUT]** — the analyst types here. This may be raw data the workbook will convert, or a finished score the analyst computed outside the workbook (see Part 1.3 for which is which). Visually distinct (e.g. pale yellow fill, unlocked).
- **[CALCULATED]** — the workbook computes this; the analyst never touches it. Locked, and visually distinct (e.g. white or grey fill, locked when the sheet is protected).

Throughout this spec, every field is tagged **[INPUT]** or **[CALCULATED]**. The Excel build must preserve this distinction with cell protection (sheet protected; input cells unlocked) and consistent colour-coding, and a legend on the first tab.

**Important nuance.** "[INPUT]" does not mean "raw, unprocessed data" in every case. For some sub-dimensions the analyst enters genuinely raw figures and the workbook converts them; for others the analyst has already applied a conversion rule (one that needs judgement or data the workbook cannot hold) and enters the *finished* score. Both are [INPUT] cells — the analyst types both — but they differ in how much processing happened before entry. Part 1.3 sets out the three input types precisely, because getting this boundary right is the difference between a workbook that scores correctly and one that double-counts or under-processes.

## 1.3 The three input types — what the analyst enters, and who converts

This is the most important section of the spec. The boundary is **not** cleanly "Tier 1/2 = raw, Tier 3 = item means." The real boundary is *which conversions are mechanical* (the workbook does them) versus *which require analyst judgement or data the workbook cannot hold* (the analyst does them outside the workbook and enters the result). Reading the Measurement Reference (Parts 1 and 2) and the Tier 3 Module Library together, every input falls into one of three types, and these cut across the tiers:

### Type A — Raw survey item means → the workbook converts

The analyst enters the **mean response per survey item** (1.00–5.00), exactly as the survey platform reports it, **un-flipped** (raw), even for reverse-scored items. The **workbook** reverse-scores the flagged items (`6 − mean`), averages, and applies `(mean − 1) × 25`.

Applies to the sub-dimensions measured by the main Performance Equation Diagnostic Survey: **C4 (CII — 15 items), M1–M4, the three trip-wires, the O1–O5 perception items, S2 (TSI-2), and S3 (TSI-3).**

Why the workbook converts: the conversion is purely mechanical (a fixed reverse-scoring map plus one arithmetic formula), so it belongs in the workbook where it is auditable and consistent. The respondent-level work the workbook cannot do, namely validity exclusions, attention checks, individual-response aggregation (Survey Blueprint 7.8) and the computation of item means, is done upstream in the Survey Processing and Scoring Workbook, because Google Forms does not screen responses or compute means. That workbook outputs validity-screened item means, and the analyst enters those verbatim.

### Type B — Structured raw counts → the analyst pre-adjusts, the workbook does the final formula

The analyst enters **structured counts or per-domain scores**, and the workbook applies the sub-dimension's final arithmetic. But before entry the analyst applies any **provider-specific Tier 2 adjustment** that needs judgement — these adjustments cannot live in the workbook because they depend on which platform the data came from and on analyst assessment.

Applies to: **C1 (confirmed-proficiency counts per role family — after applying e.g. Compono −0.5 self-rating adjustment, LinkedIn 50% weighting, Eightfold 25%-spot-confirm-or-downgrade per Measurement Reference 2.1), C3 (rating-band counts — after applying e.g. the Tier 2 "cap exceptional at 15%, reallocate excess" adjustment per Measurement Reference 2.3), and C2 (per-domain mean assessment scores + criticality weights per Measurement Reference 2.2).**

Why this split: the *final* formula (C1 coverage ratio, C3 band-weighted formula, C2 criticality-weighted average) is mechanical and lives in the workbook. The *provider-specific pre-adjustment* needs judgement and source knowledge, so the analyst does it first and enters the adjusted counts/scores. The methodology footer records any adjustment applied.

### Type C — Finished module / platform scores → the analyst enters the result, the workbook treats it as given

The analyst enters a **finished 0–100 score** that was computed outside the workbook, because the scoring rule involves analyst judgement, statistical adjustment, document-review blending, agreement calculations or FTE-weighting that the workbook cannot replicate.

Applies to two families:
- **Tier 3 Module Library modules** that output a finished score: M-O1-LT (60% agreement + 40% clarity), M-C1-MGR (coverage ratio + 15% audit-sample adjustment), M-C3-MGR (band distribution + statistical adjustment), M-C5-TL (sum/120 × 100, averaged across team leaders), M-O1-CASCADE, M-O2-IA, M-O3-PF (each a structural-component score), M-DLP-PART (per-decision latency → DLS), M-C2-KDS (domain-weighted). See Tier 3 Module Library Parts 2–7 for each module's bespoke rule.
- **Tier 1/2 platform composites** that the platform already reports as a 0–100 score: e.g. a Culture Amp / Glint / Peakon engagement composite for M1 (Measurement Reference 3.1), or a calibrated platform rating distribution that the analyst reads directly.

Why the analyst converts: these rules need things the workbook does not hold — audit-call findings, statistical re-distribution, role-architecture document review, cross-respondent agreement, the platform's own proprietary scoring. The analyst computes the score per the module/platform rule and enters the result; the workbook uses it as an input to the composite.

### Tagging convention for the three types

In the input tabs that follow, every input field is tagged **[INPUT]**. To make the type visible to the implementer and the analyst, fields also carry a parenthetical:
- **[INPUT — raw, workbook converts]** = Type A (and the raw-count cells of Type B)
- **[INPUT — analyst-adjusted before entry]** = the pre-adjustment step of Type B
- **[INPUT — finished score, analyst-computed outside workbook]** = Type C

The Excel build should reflect this with a cell-comment or a column note, and the Tab 1 legend should explain the three types. The point is that an analyst opening the workbook can tell at a glance whether a yellow cell wants a raw number or a number they have already worked out.

## 1.4 Layered sub-dimensions — O1, O2, O3 (structural + perception)

Three Opportunity sub-dimensions are **two-layer composites**, and the workbook must model both layers:

1. **Structural layer** — built from Type C module scores plus analyst document-review scores, assembled *outside* the workbook into a single structural score. Per the Tier 3 Module Library Part 9.1 and Measurement Reference Part 4:
   - `O1 structural = 0.40 × M-O1-LT + 0.30 × role-architecture doc-review + 0.30 × M-O1-CASCADE`
   - `O2 structural = 0.35 × tool-inventory doc-review + 0.40 × M-O2-IA + 0.25 × integration doc-review`
   - `O3 structural = M-O3-PF (aggregate across audited processes)`
2. **Perception layer** — the survey score (Type A) from the OI1/OI2/OI3 items, which the **workbook** converts from item means.
3. **Composite** — `O_composite = (structural + perception) / 2`, with the **>15-point gap rule**: where structural and perception diverge by more than 15 points, both are reported separately and the divergence is flagged as a diagnostic finding rather than averaged silently.

The workbook can compute the structural composite *if* the analyst enters its components (the module score and the doc-review scores) — or the analyst can assemble the structural score outside and enter it as one finished number. The spec below provides input fields for the components (the more transparent option) and computes the structural score in-workbook, then does the structural-vs-perception composite and gap flag. This keeps the gap calculation — which is mechanical — inside the workbook while leaving the judgement-laden module and doc-review scoring outside it.

## 1.5 Conversion convention (the corrected formula)

All survey-based 0–100 conversions use:

```
score = (adjusted_mean − 1) × 25
```

where `adjusted_mean` is the mean of the item responses after reverse-scoring. A mean of 1 → 0; a mean of 5 → 100. This aligns with Measurement Reference Part 1.3 and the corrected Survey Blueprint (Part 1 and Part 7.2). **Do not use `mean × 25`** — that was an error in earlier Survey Blueprint drafts, now corrected.

## 1.6 One workbook per unit

Each in-scope unit gets its own workbook file. Portfolio engagements produce multiple workbooks plus a separate rollup (out of scope for this spec; the rollup is a report artefact, not a scoring engine). The workbook computes a single unit's P and its constituent scores.

## 1.7 Tab structure

The workbook has 13 tabs (plus a hidden Reference tab), matching Measurement Reference Part 1.4 and Diagnostic Delivery Handbook Part 8.2, with Tab 13 added to hold the narrative inputs for the deliverable build:

| # | Tab | Kind | Purpose |
|---|---|---|---|
| 1 | Engagement Metadata | Mostly input | Client/unit identifiers, archetype selector |
| 2 | Tier Assignment | Input + calc | Per sub-dimension: tier selector, source, vintage |
| 3 | Capability Inputs | Input + calc | C1–C5 raw inputs and sub-dimension scores |
| 4 | Motivation Inputs | Input + calc | M1–M4 + trip-wires |
| 5 | Opportunity Inputs | Input + calc | O1–O5 (O1/O2/O3 structural + perception) |
| 6 | Synergy Inputs | Input + calc | S1–S3 |
| 7 | DLP | Input + calc | Decision sample log, latency, DLS |
| 8 | Behavioural Triangulators | Input + calc | Turnover, absence, etc.; gap calcs |
| 9 | Sector Classification | Input | Metadata for internal comparison |
| 10 | Composite Scoring | Calculated | C, M, O, S, P; binding constraint |
| 11 | Methodology Footer | Calculated | Auto-populated from other tabs |
| 12 | Report Data | Calculated | Formatted, named-range outputs for the report and deck build |
| 13 | Analyst Evidence | Input | Free-text qualitative inputs for the narrative draft; the one input tab filled at the synthesis and reporting stage |

Tabs are ordered for workflow: the analyst works left to right. Tabs 10 to 12 are entirely calculated and the analyst enters nothing there. Tab 13 (Analyst Evidence) is the one input tab filled later, at the reporting stage, after the scores have computed.

---

# Part 2 — Tab 1: Engagement Metadata

Purpose: identify the engagement and set the industry archetype (which drives within-component sub-dimension weights).

| Field | Kind | Notes |
|---|---|---|
| Client name | [INPUT] | Text |
| Unit name | [INPUT] | Text |
| Unit FTE | [INPUT] | Number |
| ANZSIC sector | [INPUT] | Dropdown (metadata only; not in equation) |
| Sub-sector | [INPUT] | Text |
| Size band | [INPUT] | Dropdown |
| Unit type | [INPUT] | Dropdown |
| **Industry archetype** | [INPUT] | Dropdown — one of the six archetypes. **Drives the within-component weight set** used on the Composite Scoring tab. |
| Engagement date | [INPUT] | Date |
| Lead analyst | [INPUT] | Text |
| Source Diagnostic reference | [INPUT] | Text (used by the Intervention Design Workbook downstream) |

**Archetype logic.** The archetype selector drives the within-component sub-dimension weights (Measurement Reference / Cadence Master). The Composite Scoring tab reads the selected archetype and applies the matching weight set. The **component-level** weights (α=0.35, β=0.40, γ=0.25) are standardised and do **not** vary by archetype. Implement the archetype weight sets as a lookup table on a hidden reference tab; the default (standard) weights are C: 0.35/0.15/0.20/0.20/0.10, M: 0.50/0.20/0.15/0.15, O: 0.30/0.25/0.20/0.10/0.15.

---

# Part 3 — Tab 2: Tier Assignment

Purpose: record, per sub-dimension, which measurement route is used. This tab's selectors drive which input fields are active on Tabs 3–7.

One row per sub-dimension (17 rows + 3 trip-wires + DLP):

| Column | Kind | Notes |
|---|---|---|
| Sub-dimension | [CALCULATED] | Pre-filled label (C1…S3, TW1–3, DLP) |
| **Tier selector** | [INPUT] | Dropdown: `Tier 1`, `Tier 2`, `Tier 3`, `Insufficient data`. For O1/O2/O3 the structural + perception layering (Part 1.4) always applies regardless of the tier of each layer's source. |
| Source identifier | [INPUT] | Text — the specific source (e.g. "Workday turnover report") |
| Vintage (data date) | [INPUT] | Date — drives confidence decay |
| Confidence | [CALCULATED] | High/Medium/Low, computed from vintage vs the sub-dimension's cadence (Cadence Master Part 7) |
| Notes | [INPUT] | Free text for methodology footer |

**How the selector drives the input tabs.** Each sub-dimension's section on Tabs 3–7 contains input blocks for *each possible route*. The active block is the one matching the Tier Assignment selector; inactive blocks are greyed and ignored by the score formula. Implement with conditional formatting (grey out inactive blocks) and an `IF`/`CHOOSE` on the sub-dimension score that reads the selected route. This is what lets one workbook handle a sub-dimension sourced from Tier 1 in one engagement and Tier 3 in another.

---

# Part 4 — Tab 3: Capability Inputs (C1–C5)

For each sub-dimension: the input block(s) by route, the conversion to a 0–100 score, and the resulting **[CALCULATED]** sub-dimension score. The per-sub-dimension raw-data conversion rules are the authority of **Measurement Reference Part 1**; this spec gives the input fields and the operational formula shape so the Excel is buildable. Where a conversion is complex, the spec references the Measurement Reference section number and reproduces the operational form.

## 4.1 C1 — Skill (weight 35% within C)

C1 is **Type B** on the Tier 1/2 route and **Type C** on the Tier 3 route. Per Measurement Reference 2.1, the workbook computes a per-role-family coverage ratio from confirmed-proficiency counts; the analyst supplies those counts after applying any provider-specific Tier 2 adjustment.

**Tier 1/2 route (Type B — counts in, workbook computes coverage).** One block per role family (repeatable rows):

| Input field | Kind | Notes |
|---|---|---|
| Role family name | [INPUT — raw] | E.g. "Customer Service Reps" |
| FTE in role family | [INPUT — raw] | Count |
| Framework skills required (per person) | [INPUT — raw] | Count of required skills for the role family |
| Confirmed proficiencies — count | [INPUT — analyst-adjusted before entry] | Sum of skills demonstrated at threshold across the role family, **after** applying provider-specific Tier 2 conversions (Compono −0.5; LinkedIn 50%; Eightfold 25%-spot-confirm-or-downgrade; etc. per Measurement Reference 2.1). Record the adjustment in the methodology note. |
| **Role family coverage ratio** | [CALCULATED] | `Confirmed proficiencies / (FTE × Framework skills required)`, capped at 1.0 |
| **Role family C1 score** | [CALCULATED] | `coverage ratio × 100` |
| Median tenure (optional) | [INPUT — raw] | For experience moderator (Measurement Reference 2.1): <18m ×0.95; 18m–8y none; >8y ×1.05 |
| **C1 score (Tier 1/2)** | [CALCULATED] | FTE-weighted average of role-family C1 scores, × tenure moderator if applied |

**Tier 3 route (Type C — M-C1-MGR module score entered).**

| Input field | Kind | Notes |
|---|---|---|
| M-C1-MGR module score | [INPUT — finished score, analyst-computed outside workbook] | 0–100. The analyst computes it per Tier 3 Module Library 4.1 (coverage ratio + 15% audit-sample adjustment) **before** entry; the workbook does not recompute it |
| **C1 score (Tier 3)** | [CALCULATED] | = the entered module score |

**C1 sub-dimension score** [CALCULATED] = the active route's score per the Tier Assignment selector.

## 4.2 C2 — Knowledge (weight 15% within C)

C2 is **Type B**: per Measurement Reference 2.2 the workbook computes a criticality-weighted, coverage-adjusted average across knowledge domains; the analyst supplies a per-domain score, criticality weight and coverage. The same structure serves Tier 1/2 (assessment scores) and Tier 3 (M-C2-KDS domain scores).

One block per knowledge domain (repeatable rows, typically 3–6):

| Input field | Kind | Notes |
|---|---|---|
| Domain name | [INPUT — raw] | E.g. "Regulatory framework knowledge" |
| Criticality weight (1–3) | [INPUT — raw] | 1 supplementary, 2 important, 3 critical (Measurement Reference 2.2) |
| Mean domain score (0–100) | [INPUT — analyst-adjusted before entry] | From the LMS/assessment platform (Tier 1/2) or the M-C2-KDS module (Tier 3, Module Library 7.1). Apply any Tier 2 proxy conversion (e.g. tenure-proxy) before entry |
| Coverage % | [INPUT — raw] | % of role-family FTE with current data in this domain |
| **Coverage-adjusted domain score** | [CALCULATED] | `Mean domain score × Coverage% (as fraction)` |
| **C2 score** | [CALCULATED] | `Σ(coverage-adjusted score × criticality) / Σ(criticality)` (Measurement Reference 2.2) |

C2 reporting requires at least one criticality-3 domain measured at ≥60% coverage (Measurement Reference 2.2); otherwise C2 = "insufficient coverage".

## 4.3 C3 — Talent density (weight 20% within C)

C3 is **Type B**: per Measurement Reference 2.3 the workbook applies the band-distribution formula to five band counts; the analyst supplies the counts after any required adjustment. The route differs only in *how* the analyst arrives at the calibrated counts.

| Input field | Kind | Notes |
|---|---|---|
| Band 5 count (Exceptional) | [INPUT — analyst-adjusted before entry] | See adjustment note below |
| Band 4 count (Exceeding) | [INPUT — analyst-adjusted before entry] | |
| Band 3 count (Meeting) | [INPUT — analyst-adjusted before entry] | |
| Band 2 count (Developing) | [INPUT — analyst-adjusted before entry] | |
| Band 1 count (Underperforming) | [INPUT — analyst-adjusted before entry] | |
| **Band percentages** | [CALCULATED] | each band count / total rated |
| **C3 score** | [CALCULATED] | `Band5% × 100 + Band4% × 80 + Band3% × 60 + Band2% × 35 + Band1% × 0` (Measurement Reference 2.3) |

**Adjustment note (which happens before entry, by route):**
- **Tier 1** (calibrated platform ratings): enter counts as-is.
- **Tier 2** (uncalibrated ratings): apply the "cap exceptional at 15%, reallocate excess" adjustment (Measurement Reference 2.3) before entry.
- **Tier 3 — M-C3-MGR**: the analyst applies the module's statistical adjustment (Tier 3 Module Library 4.2) before entering the adjusted band counts. Note M-C3-MGR is **Type B here**, not Type C: it outputs a calibrated *distribution*, and the band formula is the same mechanical one, so the workbook still does the final formula.
- **Tier 3 — TDC workshop**: enter the final calibrated band counts agreed in the workshop (Diagnostic Handbook 7.5 Step 10).

## 4.4 C4 — Collective intelligence (weight 20% within C) — **CII, structured**

C4 is survey-only (Survey Blueprint Part 2). It has an **intermediate sub-construct layer**: 15 item means → 3 sub-construct scores → C4. This is the most structured input block in the workbook.

**Tier 3 route (CII — the only route for C4).** Analyst enters 15 item means.

| Input field | Kind | Notes |
|---|---|---|
| CII-01 … CII-15 mean (15 cells) | [INPUT] | Item means 1.00–5.00, raw (un-flipped), as platform reports |
| Response rate % | [INPUT] | Drives reporting threshold |
| Reverse-scoring | [CALCULATED] | Flip CII-05, CII-10, CII-15: `6 − mean` |
| Expertise Clarity score | [CALCULATED] | `((mean of CII-01..05, CII-05 flipped) − 1) × 25` |
| Expertise Trust score | [CALCULATED] | `((mean of CII-06..10, CII-10 flipped) − 1) × 25` |
| Expertise Flow score | [CALCULATED] | `((mean of CII-11..15, CII-15 flipped) − 1) × 25` |
| **C4 score** | [CALCULATED] | `0.35 × Clarity + 0.35 × Trust + 0.30 × Flow` (Survey Blueprint 2.1.4) |

Note: C4 reporting threshold is team-level (min 4 valid respondents and 70% per team; unit C4 = FTE-weighted average of team scores — Survey Blueprint 2.1). For the single-unit workbook, if the analyst enters unit-level item means, capture the team-weighting as a note; the full team-level roll-up is a survey-platform output. Provide an optional team-level entry block (one column per team) that FTE-weights to the unit C4 where the analyst has team-level data.

## 4.5 C5 — Learning velocity (weight 10% within C)

| Input field (Tier 1/2 — Type B) | Kind | Notes |
|---|---|---|
| Velocity indicator(s) 0–100 (time-to-competence, adoption %, cycle improvement) | [INPUT — analyst-adjusted before entry] | Each converted to 0–100 per the Measurement Reference 2.5 lookup before entry |
| **C5 score (Tier 1/2)** | [CALCULATED] | Arithmetic mean of available indicators (Measurement Reference 2.5) |

| Input field (Tier 3 — Type C, M-C5-TL) | Kind | Notes |
|---|---|---|
| M-C5-TL module score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, computed per Tier 3 Module Library 5.1 ((mean of 12 items − 1) × 25, averaged across team leaders) before entry |
| **C5 score (Tier 3)** | [CALCULATED] | = entered module score |

Where both indicator and module data exist, Measurement Reference 2.5 blends them `0.6 × indicator mean + 0.4 × module`; provide an optional blend cell.

**C5 sub-dimension score** [CALCULATED] = active route's score.

## 4.6 Capability composite (computed on Composite Scoring tab, shown here for reference)

```
C = 0.35(C1) + 0.15(C2) + 0.20(C3) + 0.20(C4) + 0.10(C5)
```
Weights from the selected archetype (default shown). If a sub-dimension is "Insufficient data", its weight reallocates proportionally to the others (Measurement Reference 1.3) and the methodology footer annotates it.

---

# Part 5 — Tab 4: Motivation Inputs (M1–M4 + trip-wires)

M1, M2 are survey-based with quarterly rotation; M3, M4 survey-based annual; trip-wires are single-item indicators. All Tier 3 survey route by default (Survey Blueprint Part 3).

## 5.1 M1 — Engagement & confidence (weight 50% within M)

M1 has two routes. **Tier 1/2 (Type C):** a recognised engagement platform (Culture Amp, Glint, Peakon, etc.) already reports an engagement composite on 0–100 — the analyst enters it directly (Measurement Reference 3.1). **Tier 3 (Type A):** the MI1 survey module, entered as item means for the workbook to convert.

**Tier 1/2 route (Type C):**

| Input field | Kind | Notes |
|---|---|---|
| Platform engagement composite (0–100) | [INPUT — finished score, analyst-computed outside workbook] | From the platform, already on 0–100 (Measurement Reference 3.1) |
| **M1 score (Tier 1/2)** | [CALCULATED] | = entered composite |

**Tier 3 route (Type A):** 8-item bank; at a given cadence the analyst enters the item means present at that cadence.

| Input field | Kind | Notes |
|---|---|---|
| MI1-01 … MI1-08 mean (enter those present at the cadence) | [INPUT — raw, workbook converts] | 1.00–5.00 raw; leave blank if not in this cadence |
| Response rate % | [INPUT — raw] | |
| Reverse-scoring | [CALCULATED] | Flip MI1-04: `6 − mean` |
| **M1 score (Tier 3)** | [CALCULATED] | `((mean of valid entered items, MI1-04 flipped) − 1) × 25` |

**M1 sub-dimension score** [CALCULATED] = active route's score. The formula averages only the non-blank entered items (so it works at any cadence). Use `AVERAGE` over the range ignoring blanks, after flipping MI1-04. The behavioural composite (Tab 8) is reported alongside for the gap flag — it does **not** average into M1 (Measurement Reference 3.1).

## 5.2 M2 — Psychological safety (weight 20% within M)

| Input field | Kind | Notes |
|---|---|---|
| MI2-01 … MI2-05 mean | [INPUT] | 1.00–5.00 raw |
| Response rate % | [INPUT] | |
| Reverse-scoring | [CALCULATED] | Flip MI2-05 |
| **M2 score** | [CALCULATED] | `((mean of valid items, MI2-05 flipped) − 1) × 25` |

## 5.3 M3 — Autonomous motivation (weight 15% within M)

| Input field | Kind | Notes |
|---|---|---|
| MI3-01 … MI3-05 mean | [INPUT] | 1.00–5.00 raw (baseline/annual only) |
| Response rate % | [INPUT] | |
| Reverse-scoring | [CALCULATED] | Flip MI3-04 |
| **M3 score** | [CALCULATED] | `((mean of valid items, MI3-04 flipped) − 1) × 25` |

## 5.4 M4 — Purpose alignment (weight 15% within M)

| Input field | Kind | Notes |
|---|---|---|
| MI4-01 … MI4-04 mean | [INPUT] | 1.00–5.00 raw (baseline/annual only) |
| Response rate % | [INPUT] | |
| Reverse-scoring | [CALCULATED] | Flip MI4-04 |
| **M4 score** | [CALCULATED] | `((mean of valid items, MI4-04 flipped) − 1) × 25` |

## 5.5 Trip-wires (TW-01, TW-02, TW-03) — independent indicators, NOT in M

| Input field | Kind | Notes |
|---|---|---|
| TW-01 mean (pay equity) | [INPUT] | 1.00–5.00 |
| TW-02 mean (fairness) | [INPUT] | 1.00–5.00 |
| TW-03 mean (basic conditions) | [INPUT] | 1.00–5.00 |
| **TW-01 score** | [CALCULATED] | `(mean − 1) × 25` |
| **TW-02 score** | [CALCULATED] | `(mean − 1) × 25` |
| **TW-03 score** | [CALCULATED] | `(mean − 1) × 25` |
| **TW-01 flag** | [CALCULATED] | `IF(score<60,"CRITICAL FINDING","")` |
| **TW-02 flag** | [CALCULATED] | `IF(score<60,"CRITICAL FINDING","")` |
| **TW-03 flag** | [CALCULATED] | `IF(score<60,"CRITICAL FINDING","")` |

Trip-wires do not feed the M composite (Survey Blueprint 7.6). They surface on the Composite Scoring and Methodology Footer tabs as independent flags.

## 5.6 Motivation composite (Composite Scoring tab)

```
M = 0.50(M1) + 0.20(M2) + 0.15(M3) + 0.15(M4)
```

---

# Part 6 — Tab 5: Opportunity Inputs (O1–O5)

O1, O2, O3 are **two-layer composites** (structural + perception) per Part 1.4 — not simply "survey + one audit score." The structural layer is itself assembled from a Type C module score plus analyst document-review scores; the perception layer is the Type A survey score. O4 combines survey with capacity data; O5 is survey-only.

## 6.1 O1 — Clarity & decision rights (weight 30% within O) — structural + perception

**Structural layer** (per Tier 3 Module Library 9.1 / Measurement Reference Part 4.1):

| Input field | Kind | Notes |
|---|---|---|
| M-O1-LT decision-rights score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, computed per Tier 3 Module Library 3.1 (60% agreement + 40% clarity) before entry |
| Role-architecture doc-review score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, analyst document review of position descriptions |
| M-O1-CASCADE score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, per Tier 3 Module Library 2.1 (or OKR-cascade doc review where Tier 1/2) |
| **O1 structural** | [CALCULATED] | `0.40 × M-O1-LT + 0.30 × role-architecture + 0.30 × M-O1-CASCADE` |

**Perception layer** (Type A survey):

| Input field | Kind | Notes |
|---|---|---|
| OI1-01 … OI1-08 mean (those present at cadence) | [INPUT — raw, workbook converts] | 1.00–5.00 raw |
| Survey response rate % | [INPUT — raw] | |
| Reverse-scoring | [CALCULATED] | Flip OI1-03, OI1-06 |
| **O1 perception** | [CALCULATED] | `((mean of valid items, R items flipped) − 1) × 25` |

**Composite + gap:**

| Field | Kind | Notes |
|---|---|---|
| **O1 gap** | [CALCULATED] | `structural − perception` |
| **O1 gap flag** | [CALCULATED] | `IF(ABS(gap)>15,"GAP — report separately","")` (Measurement Reference 8.1) |
| **O1 composite score** | [CALCULATED] | `(structural + perception)/2` where `ABS(gap)<=15`; where gap >15, both layers reported separately and flagged (Survey Blueprint 4.1.5) |

## 6.2 O2 — Tools & information (weight 25% within O) — structural + perception

**Structural layer** (per Tier 3 Module Library 9.1 / Measurement Reference Part 4.2):

| Input field | Kind | Notes |
|---|---|---|
| Tool-inventory doc-review score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, analyst document review |
| M-O2-IA information-access score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, per Tier 3 Module Library 2.2 |
| Integration doc-review score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, analyst document review |
| **O2 structural** | [CALCULATED] | `0.35 × tool-inventory + 0.40 × M-O2-IA + 0.25 × integration` |

**Perception layer** (Type A survey):

| Input field | Kind | Notes |
|---|---|---|
| OI2-01 … OI2-04 mean | [INPUT — raw, workbook converts] | 1.00–5.00 raw |
| Survey response rate % | [INPUT — raw] | |
| Reverse-scoring | [CALCULATED] | Flip OI2-04 |
| **O2 perception** | [CALCULATED] | `((mean, OI2-04 flipped) − 1) × 25` |

**Composite + gap:** `O2 gap`, `O2 gap flag`, `O2 composite` [CALCULATED] — same structural-vs-perception gap rule as O1.

## 6.3 O3 — Process & workflow (weight 20% within O) — structural + perception

**Structural layer** (per Tier 3 Module Library 9.1 / Measurement Reference Part 4.3):

| Input field | Kind | Notes |
|---|---|---|
| M-O3-PF process-friction score | [INPUT — finished score, analyst-computed outside workbook] | 0–100, per Tier 3 Module Library 2.3 (mean across the 2–3 audited processes) |
| **O3 structural** | [CALCULATED] | = M-O3-PF score (single-component structural layer) |

**Perception layer** (Type A survey):

| Input field | Kind | Notes |
|---|---|---|
| OI3-01 … OI3-05 mean | [INPUT — raw, workbook converts] | 1.00–5.00 raw |
| Survey response rate % | [INPUT — raw] | |
| Reverse-scoring | [CALCULATED] | Flip OI3-05 |
| **O3 perception** | [CALCULATED] | `((mean, OI3-05 flipped) − 1) × 25` |

**Composite + gap:** `O3 gap`, `O3 gap flag`, `O3 composite` [CALCULATED] — same structural-vs-perception gap rule as O1.

## 6.4 O4 — Resource adequacy (weight 10% within O) — survey + capacity data

| Input field | Kind | Notes |
|---|---|---|
| OI4-01 … OI4-03 mean | [INPUT — raw, workbook converts] | 1.00–5.00 raw |
| Survey response rate % | [INPUT — raw] | |
| Reverse-scoring | [CALCULATED] | Flip OI4-03 |
| **O4 survey score** | [CALCULATED] | `((mean, OI4-03 flipped) − 1) × 25` |
| Capacity data inputs (overtime, backlog, etc.) | [INPUT — raw] | Feed behavioural triangulators (Tab 8); see Measurement Reference Part 2 |
| **O4 score** | [CALCULATED] | Survey score, triangulated with capacity data per Measurement Reference Part 2 |

## 6.5 O5 — Leadership enablement (weight 15% within O) — survey only (Type A)

| Input field | Kind | Notes |
|---|---|---|
| OI5-01, OI5-02, OI5-03 mean | [INPUT — raw, workbook converts] | 1.00–5.00 raw (all 3, no reverse) |
| Response rate % | [INPUT — raw] | |
| **O5 score** | [CALCULATED] | `((mean of 3 items) − 1) × 25` |

## 6.6 Opportunity composite (Composite Scoring tab)

```
O = 0.30(O1) + 0.25(O2) + 0.20(O3) + 0.10(O4) + 0.15(O5)
```
For O1/O2/O3, the value entering the composite is the structural-perception composite where gap ≤15, else the perception score with annotation (Survey Blueprint 4.1.5).

---

# Part 7 — Tab 6: Synergy Inputs (S1–S3)

## 7.1 S1 — Skill complementarity (weight 30% within S) — analytical, from C1 data

| Input field | Kind | Notes |
|---|---|---|
| Skill-profile diversity / complementarity inputs | [INPUT] | Derived analytically from C1 skill data (Survey Blueprint notes S1 uses C1 data analytically; Measurement Reference Part 2 gives the rule) |
| **S1 score** | [CALCULATED] | Per Measurement Reference Part 2 S1 rule |

## 7.2 S2 — Collaboration friction (weight 40% within S) — survey + telemetry

| Input field | Kind | Notes |
|---|---|---|
| TSI2-01, TSI2-02, TSI2-03 mean | [INPUT] | 1.00–5.00 raw |
| Response rate % | [INPUT] | |
| Reverse-scoring | [CALCULATED] | Flip TSI2-03 |
| **S2 survey score** | [CALCULATED] | `((mean of 3, TSI2-03 flipped) − 1) × 25` |
| Workplace Analytics inputs (meeting hrs, fragmented time, after-hours) | [INPUT] | Optional telemetry; triangulates the survey score (Measurement Reference Part 2) |
| **S2 score** | [CALCULATED] | Survey score, triangulated with telemetry where available |

## 7.3 S3 — Conflict health (weight 30% within S) — survey

| Input field | Kind | Notes |
|---|---|---|
| TSI3-01 … TSI3-05 mean (those present at cadence) | [INPUT] | 1.00–5.00 raw |
| Response rate % | [INPUT] | |
| Reverse-scoring | [CALCULATED] | Flip TSI3-04, TSI3-05 |
| **S3 score** | [CALCULATED] | `((mean of valid items, TSI3-04/05 flipped) − 1) × 25` |
| **False-consensus flag** | [CALCULATED] | `IF(AND(TSI3-01 score<60, TSI3-02 score<60, M2 score>75),"FALSE CONSENSUS — suppressed disagreement","")` (Survey Blueprint 5.2.4 / 7.7) |

## 7.4 Synergy coefficient (Composite Scoring tab)

```
S_internal = 0.30(S1) + 0.40(S2) + 0.30(S3)
S = 0.85 + (S_internal / 100) × 0.30
```
S ∈ [0.85, 1.15].

---

# Part 8 — Tab 7: Decision Latency Protocol (DLP)

The DLP samples 15–25 decisions and measures latency per decision class (operational / tactical / strategic). Analyst enters the decision sample log; the workbook computes the Decision Latency Score (DLS).

**Decision sample log** — one row per sampled decision (15–25 rows):

| Column | Kind | Notes |
|---|---|---|
| Decision ID | [INPUT] | Anonymised reference |
| Decision class | [INPUT] | Dropdown: Operational / Tactical / Strategic |
| Decision description | [INPUT] | Short anonymised description of the decision (for example "approve campaign budget above threshold"). Feeds the longest-latency-pathway narrative in the report and deck; not used in scoring. |
| Latency (elapsed time) | [INPUT] | In the unit the protocol specifies (e.g. days) |
| Latency score (0–100) | [CALCULATED] | Per Measurement Reference Part 2 DLP rule (latency → score, by class norm) |

**Per-class and overall DLS:**

| Field | Kind | Notes |
|---|---|---|
| Operational DLS | [CALCULATED] | Mean latency score of operational-class decisions |
| Tactical DLS | [CALCULATED] | Mean of tactical-class |
| Strategic DLS | [CALCULATED] | Mean of strategic-class |
| **Overall DLS** | [CALCULATED] | Per Measurement Reference Part 2 weighting across classes |
| Sample size check | [CALCULATED] | `IF(count<15,"BELOW MINIMUM SAMPLE","")` |

DLP is reported alongside O (it is not a weighted contributor to the P equation; it is a flagship objective metric per the Strategy). Confirm the exact latency→score conversion and class weighting against Measurement Reference Part 2 at build time.

---

# Part 9 — Reference Tab (hidden): Reverse-Scoring Map and Weight Sets

A hidden reference tab holds the constants the formulas read, so the build has a single source for them.

**Reverse-scoring map** (items the workbook flips with `6 − mean`):

CII-05, CII-10, CII-15, MI1-04, MI2-05, MI3-04, MI4-04, OI1-03, OI1-06, OI2-04, OI3-05, OI4-03, TSI2-03, TSI3-04, TSI3-05.

(All other items are forward-scored. O5/OI5 items and trip-wires have no reverse items. Source: Survey Blueprint item tables.)

**Within-component weight sets** — one row per archetype, columns for each sub-dimension weight. Default (standard) set:

| Component | Weights |
|---|---|
| C | C1 0.35, C2 0.15, C3 0.20, C4 0.20, C5 0.10 |
| M | M1 0.50, M2 0.20, M3 0.15, M4 0.15 |
| O | O1 0.30, O2 0.25, O3 0.20, O4 0.10, O5 0.15 |
| S | S1 0.30, S2 0.40, S3 0.30 |

The six archetype variants adjust the within-component weights only (populate from Measurement Reference / Cadence Master at build time). Component-level weights α/β/γ are constant and live as a labelled constant, not an archetype variable.

**Component-level constants:** α = 0.35 (C), β = 0.40 (M), γ = 0.25 (O).

**Binding-constraint parameters** (evidence-informed defaults, calibrated in pilots): S_cap = 85 (realistic improvement ceiling), ρ = 0.30 (gap-closure fraction), τ = 8 (relative-weakness smoothing width). These drive only the Part 10 binding-constraint ranking; they do not affect any sub-dimension score, component, S or P.

---

# Part 10 — Tab 10: Composite Scoring

Entirely [CALCULATED]. Pulls sub-dimension scores from Tabs 3–7, applies the archetype weights from the reference tab, and computes the headline results.

| Field | Formula |
|---|---|
| C composite | `0.35(C1)+0.15(C2)+0.20(C3)+0.20(C4)+0.10(C5)` (archetype weights; reallocate if any sub-dim insufficient) |
| M composite | `0.50(M1)+0.20(M2)+0.15(M3)+0.15(M4)` |
| O composite | `0.30(O1)+0.25(O2)+0.20(O3)+0.10(O4)+0.15(O5)` |
| S_internal | `0.30(S1)+0.40(S2)+0.30(S3)` |
| S coefficient | `0.85 + (S_internal/100)×0.30` |
| **P score** | `S × (C^0.35 × M^0.40 × O^0.25)` |
| P confidence | High/Medium/Low — driven by the freshness of underlying sub-dimensions (worst-case or weighted across components per Cadence Master Part 7) |

**Weight reallocation rule.** Where a sub-dimension is "Insufficient data", drop it from its component formula and proportionally rescale the remaining weights to sum to 1 (Measurement Reference 1.3). Implement so the component formula divides by the sum of the *available* weights, not a hardcoded denominator.

**Binding constraint identification (realistic P gain, weighted toward genuine weaknesses):**

The binding constraint is the sub-dimension where a realistic, evidence-bounded improvement would deliver the most P, focused on where the unit is genuinely below its own level. It is deliberately neither the lowest raw score nor the largest theoretical gain to a perfect 100. For each of the 14 C, M and O sub-dimensions (Synergy is excluded as a coefficient, not a candidate), the workbook computes three quantities.

**1. Realistic improvement (diminishing returns).** The achievable gain shrinks as the baseline rises and reaches zero at the realistic ceiling S_cap:

```
Δs = ρ × MAX(0, S_cap − score)
```

A sub-dimension at 55 has real room; one already near S_cap has almost none. This is the ceiling effect, which is diminishing returns by definition, and it reflects that workplace interventions deliver modest, bounded gains rather than a lift to 100. S_cap and ρ are evidence-informed defaults (Part 9), calibrated in pilots.

**2. Realistic P gain (leverage).** The gain in P from applying that improvement, holding all else constant:

```
ΔP = P × ((1 + w_norm × Δs / compScore)^exponent − 1)
```

where `w_norm` is the sub-dimension's within-component weight after any reallocation, `compScore` is its component composite, and `exponent` is that component's α, β or γ. This preserves leverage: a point of movement on a high-weight, high-exponent sub-dimension counts for more than the same point on a low-weight one.

**3. Relative weakness (unit mean).** A smooth factor in (0,1), high when the sub-dimension sits below the unit's own average and low when above it:

```
rel = 1 / (1 + EXP((score − unitMean) / τ))
```

where `unitMean` is the mean of the 14 C/M/O sub-dimension scores. rel is 0.5 at the mean, approaches 1 well below it, and approaches 0 well above it. This is the term that stops a high-leverage strength (a healthy M1, for example) from being named a constraint in a unit that is comparatively strong there. The "lower baseline improves more" pull is held in check here rather than amplified, since part of that pattern is regression to the mean rather than true opportunity.

**Priority = ΔP × rel.** The 14 sub-dimensions are ranked by Priority, descending.

| Field | Formula |
|---|---|
| Priority ranking | All 14 sub-dimensions ranked by `ΔP × rel` descending; a small row-order fraction is subtracted so exact ties break deterministically and the ordering is stable |
| Top-six table | The six highest-priority sub-dimensions, each row showing: rank, component, sub-dimension, raw score, realistic P gain (ΔP) and Priority |
| Binding constraint statement | Concatenated text leading with the top-ranked (highest-priority) sub-dimension; notes the binding component (lowest of C, M, O) as the weakest force |
| Trip-wire override note | If any trip-wire fired, flag that it takes priority regardless of P (Diagnostic Handbook 8.4) |

The displayed "realistic P gain" (ΔP) is the honest, bounded P-points estimate for that sub-dimension; the ordering is by Priority, so a sub-dimension can show a higher realistic P gain yet rank lower when it is not a relative weakness. The full per-sub-dimension computation lives in a hidden helper block (one row each); only the top-six table and the statement are visible on the tab.

**Range checks** (validation, not scoring): S should fall 0.85–1.15; P typically 45–80; flag values outside expected bounds for manual cross-check (Diagnostic Handbook 8.2 Step 4).

---

# Part 11 — Tab 8: Behavioural Triangulators

Holds the behavioural data that triangulates survey scores and fires the survey-behavioural gap flag for M1.

| Input field | Kind | Notes |
|---|---|---|
| Voluntary turnover % | [INPUT] | Definition recorded (Diagnostic Handbook 5.4 risk flag) |
| Absence rate | [INPUT] | |
| eNPS / internal application rate / other | [INPUT] | As available |
| Overtime / after-hours / backlog (for O4, S2) | [INPUT] | |
| **Behavioural composite (for M1 gap)** | [CALCULATED] | Per Measurement Reference Part 2 |
| **M1 survey-behavioural gap** | [CALCULATED] | `M1 survey score − behavioural composite` |
| **M1 gap flag** | [CALCULATED] | `IF(ABS(gap)>15,"GAP — key finding","")` (Survey Blueprint 7.7) |

---

# Part 12 — Tab 9: Sector Classification

All [INPUT] metadata (division, sub-sector, size band, unit type) for internal comparison. Not in the equation. Mirrors Engagement Metadata where overlapping; kept as a discrete tab per the Measurement Reference structure for the internal-comparison contribution.

---

# Part 13 — Tab 11: Methodology Footer

Entirely [CALCULATED], auto-populated from the other tabs. It is one of the three tabs the report and deck consume (with Report Data and Analyst Evidence), so every field below is exposed as a labelled cell carrying a named range (prefix `mf_`) per Part 14A, not only as readable text. Content follows Measurement Reference Part 2 §9.6 and Diagnostic Handbook 9.5.

| Block | Field | Named range | Source |
|---|---|---|---|
| Tier mix | Per sub-dimension: tier, source, vintage (the full sub-dimension block) | `mf_TIER_MIX` | Tier Assignment (Tab 2) |
|  | Composite tier rating | `mf_COMPOSITE_TIER_RATING` | Tier Assignment |
| Validity and exclusions | Response rate per construct, as a labelled list | `mf_RESPONSE_RATES` | the per-construct response-rate cells on Tabs 3 to 7 |
|  | Exclusions summary: sub-dimensions suppressed for insufficient data, weight reallocations applied, responses excluded | `mf_EXCLUSIONS` | Composite Scoring reallocation logic and Tier Assignment |
| Confidence | Per sub-dimension confidence (the 17-row block) | `mf_CONFIDENCE_TABLE` | Tier Assignment confidence column |
|  | Overall P confidence | `mf_P_CONFIDENCE` | Composite Scoring |
| Gap flags fired | O1/O2/O3 audit-perception, M1 survey-behavioural, false-consensus, S2 telemetry-perception | `mf_GAP_FLAGS_FIRED` | the gap-flag cells on Tabs 5, 6, 8 |
| Critical findings | Trip-wire breaches and DLP critical findings, consolidated | `mf_CRITICAL_FINDINGS` | Motivation Inputs trip-wire flags and DLP |
| Internal comparison | The standing note that no external-company benchmark and no accumulated cross-client comparison is applied | `mf_INTERNAL_COMPARISON_NOTE` | standing text |
| Non-standard definitions | Any client-specific data definition recorded during the engagement (for example a turnover definition) | `mf_NONSTANDARD_DEFINITIONS` | mirrors `ev_NONSTANDARD` on Analyst Evidence |

Build as formula-driven cells that assemble from the source tabs. The analyst edits nothing here; light narrative editing happens later in the report, not the workbook. Where a block spans several rows (tier mix, response rates, confidence table), the named range covers the whole rectangular block so the build reads it in one call.

---

# Part 14 — Tab 12: Report Data

Entirely [CALCULATED]. This tab is the single hand-off surface to the Unit-level Report (Word), its board Executive Summary, and the Client Report (PowerPoint). It implements, field for field, the data contract in the Unit-level Report Specification Part 3, so that producing a deliverable is a paste-and-write task and an automated build reads one tab rather than hunting across the engine. Every value cell carries a named range (prefix `rd_`) per Part 14A.

Three rules govern the tab:

1. **One surface.** Every field the two report templates name as a token appears here, even where it is computed elsewhere (Composite Scoring, the input tabs, the DLP tab). Report Data mirrors those values by formula so the build reads from one place; the identity fields are mirrored from Engagement Metadata for the same reason. Where a value is computed elsewhere, this tab references it, it does not recompute it, so there is one calculation and one number.
2. **Score and band together.** Each headline and sub-dimension score is surfaced with its functional band (Green above 75, Amber 50 to 75, Red below 50, Neutral where there is no score), computed here by rule, so the renderer never re-derives a threshold.
3. **Score and confidence together.** Each sub-dimension is surfaced with its confidence band (from Tier Assignment), since the templates headline confidence beside every score.

The blocks, each field bound to the named range shown:

*Identity (mirrored from Engagement Metadata).* `rd_CLIENT`, `rd_UNIT`, `rd_UNIT_FTE`, `rd_SECTOR`, `rd_SUBSECTOR`, `rd_SIZE_BAND`, `rd_UNIT_TYPE`, `rd_ARCHETYPE`, `rd_ENGAGEMENT_DATE`, `rd_ANALYST`, `rd_DIAGNOSTIC_REF`.

*Headline.* `rd_P_SCORE`, `rd_P_BAND`, `rd_P_CONFIDENCE`, `rd_C_SCORE`, `rd_C_BAND`, `rd_M_SCORE`, `rd_M_BAND`, `rd_O_SCORE`, `rd_O_BAND`, `rd_S_COEFF`, `rd_S_INTERNAL`.

*Sub-dimension table (17 rows: sub-dimension, score, band, confidence).* The whole block as `rd_SUBDIM_TABLE`, plus a single-cell range per score for direct paste: `rd_C1` to `rd_C5`, `rd_M1` to `rd_M4`, `rd_O1` to `rd_O5`, `rd_S1` to `rd_S3`. The C4 detail: `rd_CII_CLARITY`, `rd_CII_TRUST`, `rd_CII_FLOW`. The O1 to O3 two-layer detail, since the gap is itself a finding: `rd_O1_STRUCTURAL`, `rd_O1_PERCEPTION`, `rd_O1_GAP`, and the same for O2 and O3.

*Decision Latency.* `rd_DLS`, `rd_DLS_OPERATIONAL`, `rd_DLS_TACTICAL`, `rd_DLS_STRATEGIC`, `rd_DLP_SAMPLE_N`, and `rd_DLP_TOP_DECISIONS` (a short block of the longest-latency decisions: class, anonymised description, latency, drawn from the DLP tab; it feeds both the [PASTE] distribution visual and the [WRITE] pathway narrative).

*Trip-wires.* `rd_TW1_SCORE`, `rd_TW1_FLAG`, `rd_TW2_SCORE`, `rd_TW2_FLAG`, `rd_TW3_SCORE`, `rd_TW3_FLAG`. The flag cell is blank when clear and reads "CRITICAL FINDING" below 60, matching the template's conditional rendering.

*Binding constraint.* `rd_BINDING_STATEMENT` (the concatenated one-sentence statement leading with the top-ranked sub-dimension), `rd_BINDING_COMPONENT` (the lowest of C, M, O, reported as the weakest force), and `rd_PRIORITY_TABLE` (the top-six block: rank, component, sub-dimension, raw score, realistic P gain ΔP, Priority).

*Diagnostic findings.* `rd_O1_GAP_FLAG`, `rd_O2_GAP_FLAG`, `rd_O3_GAP_FLAG`, `rd_M1_GAP_FLAG`, `rd_FALSE_CONSENSUS_FLAG`, and `rd_CRITICAL_FINDINGS` (the consolidated list of trip-wire breaches and DLP critical findings).

*Cross-unit comparison contributory row.* `rd_UNIT_COMPARISON_ROW`: one row carrying this unit's name, P (with band), C, M, O, S and its top-ranked binding sub-dimension. A single unit's workbook never builds the comparison table; the engagement-level build assembles it by reading this one row from each unit's workbook (Unit-level Report Spec Part 3.9). Exposing it as a named row is what makes that assembly clean.

---

# Part 14A — The Deliverable Data Contract: Named Ranges and How Cowork Consumes It

The Report Data, Methodology Footer and Analyst Evidence tabs together form the deliverable data contract: everything the Unit-level Report, the board Executive Summary and the Client Report need, and nothing the analyst must hunt for. The contract is bound to **named ranges**, not cell positions, so an inserted row never silently shifts a value the build reads.

**Naming convention.** Each report token `{{X}}` maps to a named range:
- `rd_X` for a value printed in a deliverable ([PASTE]), on Report Data.
- `mf_X` for a methodology field, on Methodology Footer.
- `ev_X` for an analyst evidence input that feeds drafting but is not itself printed, on Analyst Evidence (Tab 13).

The extractor recovers the token by stripping the prefix. A few tokens are block ranges (`rd_PRIORITY_TABLE`, `rd_SUBDIM_TABLE`, `rd_DLP_TOP_DECISIONS`, `rd_UNIT_COMPARISON_ROW`, `mf_TIER_MIX`, `mf_RESPONSE_RATES`, `mf_CONFIDENCE_TABLE`); the named range covers the whole rectangular block and the extractor reads it as a table.

**The cell-reference collision rule (a build-time trap worth stating).** Excel rejects a defined name that looks like a cell address. So the sub-dimension tokens `C1` to `C5`, `M1` to `M4`, `O1` to `O5`, `S1` to `S3`, and the trip-wires `TW1` to `TW3`, cannot be used as range names directly. The `rd_` prefix exists precisely to avoid this. Every contract field is prefixed; no bare token is used as a name.

**How Cowork consumes the contract, and why this keeps numbers exact and narrative honest:**
1. A deterministic extractor reads the named ranges into a structured data packet. No language model touches a number, so there is no transcription step and no transcription error. The same extractor, run across an engagement's workbooks, assembles the cross-unit comparison from each `rd_UNIT_COMPARISON_ROW`.
2. The narrative drafter writes the [WRITE] blocks from three inputs only: the data packet (the numbers), the model theory already set out in the Strategy, Diagnostic and Companion documents, and the `ev_` analyst evidence. Where a [WRITE] block needs an observation that is in neither the numbers nor the evidence tab, the draft inserts a clearly marked analyst-input placeholder rather than inventing a specific. The drafter may reason openly from numbers and theory; it may not state an engagement fact it does not hold.
3. A validator runs the two report specifications' pre-delivery checklists as automated checks: every token filled, no decimal except the S coefficient, the trip-wire block present in all mandated places, the binding statement matching `rd_BINDING_STATEMENT` verbatim, the three deliverables agreeing on every headline number, Australian spelling, no em dashes, no guarantee language.
4. The analyst reviews, completes any flagged placeholder, and signs off. The analyst remains the author of record.

---

# Part 14B — Tab 13: Analyst Evidence (Narrative Inputs)

A new input tab, added so the qualitative evidence the [WRITE] narrative needs is captured as a structured input the build can read, rather than held in the analyst's head. It is the only input tab filled at the synthesis and reporting stage rather than during data entry. Every cell is [INPUT] free text; nothing here feeds a score, and nothing here is printed verbatim. The drafter uses it as source material and writes to the deliverable's voice.

The tab carries a standing instruction line: record only what the numbers cannot say, keep it factual and anonymised, and leave a field blank where there is nothing to add. A blank field is a valid state; it tells the drafter to mark an analyst-input placeholder rather than invent.

| Field | Named range | What to capture |
|---|---|---|
| Engagement context | `ev_CONTEXT` | The client's objective for the diagnostic, and any situation the numbers cannot show (a restructure underway, a system migration, a new leader, a recent event). |
| Capability observations | `ev_CAPABILITY` | For the C sub-dimensions that carry signal, what was seen behind the score. |
| Motivation observations | `ev_MOTIVATION` | The same for M, including anything behind a trip-wire reading. Kept factual; the workbook surfaces the action path, the analyst notes where it is most pronounced, and no legal advice is offered. |
| Opportunity observations | `ev_OPPORTUNITY` | The same for O, with attention to any fired audit-perception gap and what the divergence reflects. |
| Synergy observations | `ev_SYNERGY` | The same for S. |
| Decision-latency context | `ev_DLP` | The pattern behind the latency numbers, beyond the per-decision descriptions captured on the DLP tab. |
| Why the constraint binds | `ev_BINDING` | The analyst's read, in this unit's terms, of why the top-ranked sub-dimension is the constraint and what a realistic improvement would change. |
| Intervention feasibility | `ev_INTERVENTIONS` | Any client-specific constraint on what is feasible, to keep the recommended-intervention drafting realistic. |
| Non-standard definitions | `ev_NONSTANDARD` | Any client-specific data definition to record in the methodology footer. |

The richer this tab, the stronger the first draft. Left empty, the build still produces every number, every chart, every standing section and every methodology field, and marks each narrative gap for the analyst. That is the honest floor of the automation: full on the quantitative and structural deliverable, assisted on the narrative, never confabulated.

---

# Part 15 — Build Notes for the Excel Implementer

1. **Cell protection.** Protect every sheet; unlock only [INPUT] cells. Colour-code: input cells one fill, calculated cells another, with a legend on Tab 1.
2. **Blanks vs zero.** Survey item-mean cells left blank (item not in this cadence) must be *excluded* from the mean, not treated as zero. Use `AVERAGE` (ignores blanks) over the item range after flipping reverse items — never `SUM/COUNT` with hardcoded denominators.
3. **Reverse-scoring.** Apply `6 − mean` only to the items in the Part 9 map. Build a helper row of adjusted means feeding the score formula, so the logic is visible and auditable.
4. **Conversion.** Always `(adjusted_mean − 1) × 25`. Never `mean × 25`.
5. **Tier selector drives active route.** Use the Tab 2 selector in a `CHOOSE`/`IFS` on each sub-dimension score so only the active route's inputs count. Grey inactive route blocks via conditional formatting.
6. **Weight reallocation** must be dynamic (divide by sum of available weights), not hardcoded, so "insufficient data" sub-dimensions are handled automatically.
7. **The P formula uses the weighted analytical form** `S × (C^0.35 × M^0.40 × O^0.25)` — never the public `(C×M×O)^(1/3)` form.
8. **Validation cells:** sample-size check on DLP; headcount reconciliation (responses vs unit FTE — Survey Blueprint 8.1a); S and P range checks. These warn, they don't block.
9. **One workbook per unit.** Do not build multi-unit logic into the scoring engine; the rollup is a separate report artefact.
10. **Named ranges are the contract.** Define a named range for every field in Parts 13, 14 and 14B, using the `rd_` / `mf_` / `ev_` convention, binding block fields as whole-block ranges. Never let a deliverable read a value by cell position. Remember the cell-reference collision rule: bare sub-dimension and trip-wire tokens cannot be names, which is why every field is prefixed.
11. **Report Data, Methodology Footer and Analyst Evidence are the deliverable surface.** A report or deck build reads only these three tabs. If a field a template needs is not surfaced here, extend these tabs, not the template.
12. **Analyst Evidence is input, never printed.** Its cells feed the narrative draft as source material; the drafter writes to the deliverable's voice and never pastes the evidence verbatim. A blank field is valid and signals an analyst-input placeholder.

---

# Part 16 — Open Items to Confirm at Build Time

These are points where this spec references another document's rule that should be read in full when wiring the formula, rather than relying on the summary here:

1. **Per-sub-dimension Tier 1/2 conversion rules** for C1, C2, C3, C5, S1, O4 capacity, S2 telemetry — read the exact rule in Measurement Reference Part 1 (C) / Part 2 (O, S) for each.
2. **DLP latency→score conversion and class weighting** — Measurement Reference Part 2 DLP section.
3. **The six archetype weight sets** — populate from the Cadence Master / Measurement Reference weight tables.
4. **O4 and S2 triangulation rules** (how the survey score combines with capacity/telemetry data) — Measurement Reference Part 2. (The O1/O2/O3 structural+perception layering is now modelled in Part 6; what remains to confirm at build time is the exact O4/S2 triangulation arithmetic.)
5. **Confidence-decay rules** (vintage → High/Medium/Low) — Cadence Master Part 7.

None of these change the workbook *structure* defined here; they fill in specific conversion constants the implementer wires into the [CALCULATED] cells.

---

*End of specification. This document defines the structure and logic of the Diagnostic Workbook; the Excel build is a translation of it. Revisions welcome.*
