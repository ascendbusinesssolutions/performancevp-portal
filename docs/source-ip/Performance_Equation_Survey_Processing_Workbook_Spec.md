# The Performance Equation
## Survey Processing and Scoring Workbook Specification

**Author:** Michael, PerformanceVP
**Status:** Working draft. The build specification for the Survey Processing and Scoring Workbook, the Excel intake layer that turns raw Google Forms responses and the analyst's Layer 2 inputs into the values the Diagnostic Workbook expects. This is a *specification* (structure and logic blueprint), not the workbook itself; it is detailed enough that building the Excel file is a translation task, not a design task.
**Last updated:** 24 June 2026 (O5 and O4 outputs aligned to the Diagnostic Workbook: O5 is now output as a per-team score with team FTE, and O4 as a single capacity-analysis score; see Part 11 item 6)
**Supersedes:** the narrowly-scoped "Tier 3 Module Scoring Calculator" in the build tracker. With Google Forms as the confirmed platform, the intake layer must also screen responses and compute item means, not only the bespoke Type C module scores, so the scope is widened and the artefact renamed.
**Companion documents:** Diagnostic Workbook Specification (the downstream engine this workbook feeds; its input contract is the authority here); Tier 3 Module Library (the authority for the bespoke module scoring rules); Survey Blueprint (the authority for item wording, reverse-scoring and validity exclusions); Sub-Dimension × Cadence Master Reference (structure and thresholds); Tier 3 Survey Creation and Deployment via Google Forms (the upstream deployment mechanics); Measurement Reference Parts 1 and 2.

---

# Part 1 — Purpose and Design Principles

## 1.1 What the workbook is

The Survey Processing and Scoring Workbook is the Excel intake layer that sits between the raw Google Forms responses and the Diagnostic Workbook. There is **one workbook per unit**, mirroring the one-workbook-per-unit rule of the Diagnostic Workbook. Its single job is to produce the values the Diagnostic Workbook expects in its `[INPUT]` cells, from two sources: the raw Google Forms response exports, and the analyst's Layer 2 work (document review and analytical inputs that have no respondent).

The Diagnostic Workbook was specified assuming the survey platform would deliver validity-screened item means ready to type in. Google Forms does not screen responses or compute means; it returns raw per-respondent rows. This workbook fills that gap, and the bespoke-module-scoring gap, in one place.

## 1.2 The boundary — what this workbook does and does not do

The dividing line is the same `[INPUT]` versus `[CALCULATED]` line the Diagnostic Workbook already draws. This workbook produces the Diagnostic Workbook's `[INPUT]` values and nothing more. The Diagnostic Workbook produces all of its own `[CALCULATED]` values from those inputs.

**This workbook does:**
- Apply the validity exclusions to raw responses (Survey Blueprint 7.8), within the limits of what Google Forms data allows (see Part 4).
- Compute raw, un-flipped item means per item per unit (Type A), with CII handled at team level.
- Compute the bespoke Type C module scores that need agreement maths, coverage ratios, statistical adjustment or normalisation.
- Compute the M-C3-MGR adjusted band counts (Type B output) and the M-DLP-PART per-decision latencies.
- Hold the Layer 2 analyst inputs so everything that feeds the Diagnostic Workbook converges and can be checked in one place.
- Lay all of this out in a single paste-ready output block mapped cell-for-cell to the Diagnostic Workbook's input cells.

**This workbook does not (the Diagnostic Workbook does):**
- Reverse-score Type A items. It outputs raw means un-flipped; the Diagnostic Workbook flips the mapped items.
- Apply the `(mean − 1) × 25` conversion to Type A items.
- Assemble the O1, O2 or O3 structural composite from its components, or apply the structural-versus-perception gap rule.
- Compute the DLP latency-to-DLS scoring (it outputs latencies; the Diagnostic Workbook scores them, because percentile banding needs the full decision sample it holds).
- Compute the final C2 criticality-weighted average (it outputs per-domain scores; the Diagnostic Workbook does the weighting).
- Compute S1, O4 triangulation, any component composite, the Synergy coefficient, P, or the binding constraint.

Holding this boundary is what prevents two homes for any one piece of scoring logic. Every scoring rule lives once: the bespoke module rules and the mean computation here, everything downstream of them in the Diagnostic Workbook.

## 1.3 What this workbook produces — the output contract

The workbook produces five families of value, each mapped to a Diagnostic Workbook input location (Part 8 gives the full mapping):

1. **Type A raw item means** (un-flipped, 1.00 to 5.00) for CII, M1 to M4, trip-wires, O1 to O4 perception, S2, S3, plus a response rate per sub-dimension.
2. **Type C finished module scores** (0 to 100) for M-C1-MGR, M-C5-TL, M-O1-LT, M-O1-CASCADE, M-O2-IA, M-O3-PF, the per-team O5 leadership-enablement scores, and per-domain scores for M-C2-KDS.
3. **Type B adjusted band counts** for M-C3-MGR (five counts).
4. **DLP per-decision latencies** (with class and quality) for each sampled decision.
5. **Layer 2 component scores**: the O1 role-architecture, O2 tool-inventory and O2 integration document-review scores; the S1 complementarity inputs; and the O4 capacity-analysis score (0 to 100).

## 1.4 Scope boundary with Tier 1/2 client data

The Tier 1/2 client-data inputs (HRIS counts, calibrated ratings, LMS scores, platform engagement composites and their provider-specific adjustments) are a separate stream that the analyst enters directly into the Diagnostic Workbook, because they do not come from Google Forms. They are out of scope here. This workbook covers the Stage 2b survey outputs and the Layer 2 analyst inputs only. The design can be extended later to also hold the Tier 1/2 adjustments if a single intake point is wanted, but that is deliberately excluded from this version to keep the scope at "Google Forms plus Layer 2."

## 1.5 Conventions

- Every cell is `[INPUT]` (the analyst types or pastes) or `[CALCULATED]` (the workbook computes; the analyst never touches it). Protect every sheet; unlock only input cells; colour-code with a legend on the first tab.
- Item means are output **raw and un-flipped**. Reverse-scoring is used inside this workbook only to detect straight-lining (Part 4); it is never applied to the output means.
- One workbook per unit. Portfolio engagements reuse the template per unit, exactly as the Diagnostic Workbook does.

## 1.6 Tab structure

| # | Tab | Kind | Purpose |
|---|---|---|---|
| 1 | Setup and Keys | Input + ref | Unit name, team list, decision list, audience headcounts, thresholds, item maps |
| 2 | Import: Main Survey | Input (paste) | Raw per-respondent rows from the all-member Google Form |
| 3 | Import: Manager Survey | Input (paste) | Raw rows from the manager Google Form (M-C1-MGR, M-C3-MGR) |
| 4 | Import: Leadership Survey | Input (paste) | Raw rows from the leadership Google Form (M-O1-LT) |
| 5 | Import: Team-Leader Survey | Input (paste) | Raw rows from the team-leader Google Form (M-C5-TL) |
| 6 | Import: DLP Survey | Input (paste) | Raw rows from the decision-participant Google Form (M-DLP-PART) |
| 7 | Response Screening | Calc + input | Validity flags per respondent; valid-set selection |
| 8 | Type A Item Means | Calculated | Raw item means per sub-dimension; CII per team; response rates; threshold flags |
| 9 | Type C Module Scoring | Calc + input | The bespoke module scores; M-C3-MGR band counts; DLP latencies |
| 10 | Layer 2 Inputs | Input | Document-review and analytical inputs, recorded and passed through |
| 11 | Output: Diagnostic Workbook Inputs | Calculated | Paste-ready block mapped to the Diagnostic Workbook input cells |
| 12 | Reference (hidden) | Ref | Reverse-scoring map, item-to-sub-dimension map, thresholds, decision classes |

Tabs are ordered for workflow: import, screen, compute, record, output.

---

# Part 2 — Tab 1: Setup and Keys

Holds the engagement-specific keys the formulas read, so the workbook adapts to each unit without editing formulas.

| Field | Kind | Notes |
|---|---|---|
| Client and unit name | [INPUT] | Text, for labelling the output block |
| Unit FTE | [INPUT] | For headcount reconciliation |
| Team list (name, FTE per team) | [INPUT] | Drives CII team-level aggregation; one row per team |
| Decision-type list (M-O1-LT) | [INPUT] | The 8 to 12 pre-loaded decision types |
| Decision sample list (M-DLP-PART) | [INPUT] | The 15 to 25 sampled decisions, with class per decision |
| Role-family list (M-C1-MGR) | [INPUT] | Role families and FTE for FTE-weighting |
| Audience headcounts | [INPUT] | All-member, managers, leadership, team-leaders, DLP participants, for response-rate denominators |
| Cadence | [INPUT] | Baseline / half-yearly / quarterly, so the means tab knows which items to expect |

The reverse-scoring map, item-to-sub-dimension map and validity thresholds are constants and live on the hidden Reference tab (Part 9), not here.

---

# Part 3 — Tabs 2 to 6: Import tabs

One tab per Google Form, each a paste target for that form's linked-Sheet export. The analyst exports the Google Sheet to CSV (or copies the response range) and pastes it here. No editing of the raw rows; the screening and scoring tabs read from these.

Each import tab carries a header row matching the Google Form's column order (set once when the master forms are built, per the Google Forms deployment document Part 3.4, so the column order is stable across engagements). The main survey carries a non-identifying team-selector question (a settled requirement, Part 11); its column is read by the means tab to split CII by team.

---

# Part 4 — Tab 7: Response Screening

Applies the validity exclusions in Survey Blueprint 7.8 to the main-survey and module responses, producing a valid/excluded flag per respondent. The means and module tabs then compute over valid respondents only.

| Check | Kind | Logic |
|---|---|---|
| Straight-lining | [CALCULATED] | Flag where a reverse-scored item agrees in direction with the forward items on the same sub-dimension (for example a reverse item at 4 or 5 alongside forward items at 4 or 5). Uses the reverse-scoring map on the Reference tab for detection only |
| Patterning | [CALCULATED] | Flag literal patterns across all items: all the same value, or strict alternation |
| Speed-clicking | not applied | Google Forms records only a submission timestamp, not duration, so this check cannot be applied. Settled decision: rely on the straight-lining and patterning checks, which catch the same low-effort responding, and record in the methodology footer that the speed check was not available. No hidden-timer workaround is used, to keep the survey simple |
| Valid flag | [CALCULATED] | TRUE unless any check above flagged the respondent |
| Exclusion count and rate | [CALCULATED] | Count and percentage excluded, for the methodology footer |

The exclusion log (count and reasons) is carried to the output block so the Diagnostic Workbook's methodology footer can record it.

---

# Part 5 — Tab 8: Type A Item Means

Computes the raw, un-flipped mean per item across valid respondents, for every survey-based sub-dimension. These are the Type A inputs; the Diagnostic Workbook reverse-scores and converts them. **Do not reverse-score or convert here.**

For each sub-dimension block (CII, MI1 to MI4, TW, OI1 to OI5, TSI2, TSI3):

| Field | Kind | Notes |
|---|---|---|
| Item mean per item | [CALCULATED] | `AVERAGE` of the item column over valid respondents, ignoring blanks. Raw 1.00 to 5.00 |
| Response rate % | [CALCULATED] | Valid respondents divided by the audience headcount from Tab 1 |
| Threshold flag | [CALCULATED] | Flag where the response rate is below the sub-dimension's reporting threshold (Part 9). The score is still passed through, flagged, so the Diagnostic Workbook and analyst can decide on suppression |

**CII, special handling (team level).** CII is reported at team level (minimum 4 valid respondents and 70% per team) and rolled up FTE-weighted to the unit (Survey Blueprint 2.1). This tab therefore computes the 15 CII item means **per team**, using the team-selector column, and flags any team below the 4-respondent or 70% threshold. The output block (Part 8) passes the per-team CII item means to the Diagnostic Workbook's optional team-level C4 block, which FTE-weights them to unit C4. Where team-level data is not available, the tab falls back to unit-level CII item means with a note, and the Diagnostic Workbook computes C4 from the unit-level means as an approximation.

**O5, special handling (team level).** O5 (leadership enablement) is a per-team, FTE-weighted construct in the Diagnostic Workbook. This tab therefore computes a per-team O5 score from the OI5 items, `(mean of the team's OI5 responses − 1) × 25` (OI5 has no reverse items), and passes the per-team score together with the team FTE to the Diagnostic Workbook's O5 tab, which FTE-weights them to unit O5. This mirrors the CII team handling and replaces the earlier output of three all-member OI5 item means, which did not match the Diagnostic Workbook's per-team O5 input. See Part 11 item 6.

---

# Part 6 — Tab 9: Type C Module Scoring

Computes each Tier 3 module's bespoke output. The scoring rules are owned by the Tier 3 Module Library; the operational form is reproduced here for buildability. Where the Library's stated conversion conflicts with the settled house convention, this spec uses the house convention `(mean − 1) × 25` and flags the conflict in Part 11.

## 6.1 M-O1-LT — Decision Rights (Tier 3 Module Library 3.1)

From the leadership-survey import. Per decision type, respondents assign R, A, P, I, D and rate clarity (1 to 5).

| Field | Kind | Logic |
|---|---|---|
| Per-role agreement | [CALCULATED] | For each decision type and each RAPID role: (count of respondents giving the most common answer) / (total respondents) |
| Decision-type agreement | [CALCULATED] | Mean of the five per-role agreements for that decision |
| Aggregate agreement | [CALCULATED] | Mean of decision-type agreements across all decision types |
| Per-decision clarity | [CALCULATED] | `(mean clarity response − 1) × 25` (house convention; see Part 11) |
| Aggregate clarity | [CALCULATED] | Mean of per-decision clarity across decisions |
| Leadership response rate | [CALCULATED] | Against leadership headcount; flag below 75% |
| **M-O1-LT score** | [CALCULATED] | `0.60 × (Aggregate agreement × 100) + 0.40 × Aggregate clarity` |

## 6.2 to 6.4 Structural-component modules — M-O1-CASCADE, M-O2-IA, M-O3-PF

Each is a mean conversion over its valid items. Output the component score; the Diagnostic Workbook assembles the O1, O2 and O3 structural composites, so **do not assemble them here.**

| Module | Items | Reverse | Score (house convention) |
|---|---|---|---|
| M-O1-CASCADE | O1C-01 to O1C-05 | O1C-05 | `(mean of valid items, O1C-05 flipped − 1) × 25` |
| M-O2-IA | O2I-01 to O2I-06 | O2I-03, O2I-04, O2I-06 | `(mean of valid items, reverse items flipped − 1) × 25` |
| M-O3-PF | O3P-01 to O3P-06 per process | O3P-04 | per process `(mean, O3P-04 flipped − 1) × 25`; M-O3-PF = mean across the audited processes |

Each also carries a response rate and a threshold flag. Open-text items (O2I-07, O3P-07) are passed through to a notes area for analyst theming, not scored.

## 6.5 M-C1-MGR — Manager Capability (Tier 3 Module Library 4.1)

From the manager-survey import: each manager rates each direct report on each role-required skill (1 to 5).

| Field | Kind | Logic |
|---|---|---|
| Per-direct-report coverage | [CALCULATED] | (skills rated at or above the proficiency threshold, default 3) / (required skills for the role) |
| Role-family coverage | [CALCULATED] | Mean of per-direct-report coverage within the role family |
| Role-family score | [CALCULATED] | Role-family coverage × 100 |
| Audit-sample adjustment | [INPUT] | The analyst enters the adjustment indicated by the 15% audit-sample manager calls (for example −7.5, equal to −0.3 on the 5-point scale, where systematic inflation is found; otherwise 0) |
| Manager response rate | [CALCULATED] | Against manager count; flag below 70% |
| **M-C1-MGR score** | [CALCULATED] | FTE-weighted mean of role-family scores, plus the audit-sample adjustment |

## 6.6 M-C3-MGR — Talent Calibration (Tier 3 Module Library 4.2) — outputs band counts (Type B)

From the manager-survey import: each manager assigns each direct report to a band (1 to 5). The statistical adjustment is applied here; the **band counts**, not a score, are the output, because the Diagnostic Workbook applies the band formula.

| Field | Kind | Logic |
|---|---|---|
| Raw band counts | [CALCULATED] | Count of direct reports per band |
| Adjustment: cap Band 5 | [CALCULATED] | Where Band 5 exceeds 25% of those rated, cap at 25% and reallocate the excess to Band 4 |
| Adjustment: skew shift | [CALCULATED] | Where the mean band exceeds 3.5, shift all ratings down by 0.2 before recounting |
| Band 1 retention | [CALCULATED] | Where Band 1 is below 5%, retain as is (flag for verification, do not adjust) |
| Analyst override | [INPUT] | Where the unit leader contests the distribution as unrepresentative, the analyst enters override band counts and a note; otherwise blank |
| **Adjusted band counts (5)** | [CALCULATED] | The five counts after adjustment (or the override), passed to the Diagnostic Workbook C3 Type B cells |

## 6.7 M-C5-TL — Learning Velocity (Tier 3 Module Library 5.1)

From the team-leader-survey import: each team leader answers 12 calibrated items (1 to 5).

| Field | Kind | Logic |
|---|---|---|
| Per-team-leader score | [CALCULATED] | `(mean of the 12 items − 1) × 25` (house convention; the Library and the Diagnostic Workbook Spec state two different alternative normalisations, see Part 11) |
| Team-leader response rate | [CALCULATED] | Against team-leader count; flag below 70% |
| **M-C5-TL score** | [CALCULATED] | Mean of per-team-leader scores |

## 6.8 M-C2-KDS — Knowledge (Tier 3 Module Library 7.1) — outputs per-domain scores

From the main-survey or sample import where deployed. Quiz items are scored against the answer key.

| Field | Kind | Logic |
|---|---|---|
| Per-domain score | [CALCULATED] | (correct responses / total items in the domain) × 100 |
| Per-domain coverage % | [CALCULATED] | Respondents with valid data in the domain, against the audience |
| Criticality weight (1 to 3) | [INPUT] | Per domain, carried for the Diagnostic Workbook |
| **Per-domain outputs** | [CALCULATED] | Domain score, coverage and criticality, passed to the Diagnostic Workbook C2 Type B cells, which do the criticality-weighted average |

## 6.9 M-DLP-PART — Decision Latency (Tier 3 Module Library 6.1) — outputs latencies

From the DLP-survey import: per decision, the respondent confirms or corrects the pre-filled dates.

| Field | Kind | Logic |
|---|---|---|
| Per-decision latency | [CALCULATED] | `authorised date (DLP-02) − identified date (DLP-01)`, in days |
| Decision class | [INPUT] | From the decision sample list on Tab 1 (operational / tactical / strategic) |
| Decision quality | [INPUT] | DLP-06 response (1 to 3), passed through |
| Participant response rate | [CALCULATED] | Against sampled participants; flag below 75% |
| **Per-decision outputs** | [CALCULATED] | Latency, class and quality per decision, passed to the Diagnostic Workbook DLP tab, which computes the latency scores and DLS |

Open-text pathway and bottleneck items (DLP-04, DLP-05, DLP-07) are passed to a notes area for analyst theming.

---

# Part 7 — Tab 10: Layer 2 Inputs

Holds the analyst inputs that have no respondent. These are recorded here, not re-computed, so every value feeding the Diagnostic Workbook is assembled and checkable in one place. The Diagnostic Workbook still does the structural assembly and the S1, O4 calculations; this tab only records the component values it needs.

| Input | Kind | Feeds |
|---|---|---|
| O1 role-architecture doc-review score (0 to 100) | [INPUT] | O1 structural component in the Diagnostic Workbook |
| O2 tool-inventory doc-review score (0 to 100) | [INPUT] | O2 structural component |
| O2 integration doc-review score (0 to 100) | [INPUT] | O2 structural component |
| S1 skill-complementarity inputs | [INPUT] | S1 in the Diagnostic Workbook (derived analytically from C1 data per the Measurement Reference rule) |
| O4 capacity-analysis score (0 to 100) | [INPUT] | O4 in the Diagnostic Workbook (the single Type C capacity-analysis score, analyst-computed from HRIS and workforce data; the Diagnostic Workbook blends it with OI4 perception). A free-text field records the supporting figures, overtime, backlog and after-hours, for the methodology footer |

A short note field accompanies each, captured for the methodology footer.

---

# Part 8 — Tab 11: Output, Diagnostic Workbook Inputs

The data contract between this workbook and the Diagnostic Workbook. Entirely `[CALCULATED]`. It lays out every produced value in the order of the Diagnostic Workbook's tabs, so the analyst copies a contiguous block per destination tab, or, in a later iteration, links the two files directly.

| Diagnostic Workbook destination | Values supplied from here | Type |
|---|---|---|
| Tab 3, C1 (Tier 3 route) | M-C1-MGR score | C |
| Tab 3, C2 | Per-domain scores, coverage, criticality | B |
| Tab 3, C3 | Adjusted band counts (5) | B |
| Tab 3, C4 (CII) | 15 item means per team (or unit-level fallback) and response rates | A |
| Tab 3, C5 (Tier 3 route) | M-C5-TL score | C |
| Tab 4, M1 to M4, trip-wires | Item means and response rates | A |
| Tab 5, O1 | OI1 perception item means; plus M-O1-LT, M-O1-CASCADE and role-architecture component scores | A and C and Layer 2 |
| Tab 5, O2 | OI2 perception item means; plus M-O2-IA, tool-inventory and integration component scores | A and C and Layer 2 |
| Tab 5, O3 | OI3 perception item means; plus M-O3-PF structural score | A and C |
| Tab 5, O4 | OI4 perception item means; plus the O4 capacity-analysis score (0 to 100) | A and Layer 2 |
| Tab 5, O5 | Per-team O5 scores (0 to 100) and team FTE | C (per team) |
| Tab 6, S1 | Complementarity inputs | Layer 2 |
| Tab 6, S2, S3 | TSI2 and TSI3 item means | A |
| Tab 7, DLP | Per-decision latency, class and quality | latencies |
| Tab 11 methodology footer | Response rates, exclusion counts and reasons, threshold flags | metadata |

Each block carries the Diagnostic Workbook cell-group label as a header, so the paste target is unambiguous.

---

# Part 9 — Tab 12: Reference (hidden)

Holds the constants the formulas read, mirroring the Diagnostic Workbook's reference tab so the two agree.

- **Reverse-scoring map** (used here for straight-lining detection only, never to flip output means): CII-05, CII-10, CII-15, MI1-04, MI2-05, MI3-04, MI4-04, OI1-03, OI1-06, OI2-04, OI3-05, OI4-03, TSI2-03, TSI3-04, TSI3-05; plus the module-item reverse flags O1C-05, O2I-03, O2I-04, O2I-06, O3P-04. Source: Survey Blueprint and Tier 3 Module Library item tables.
- **Item-to-sub-dimension map**: which import column is which item.
- **Reporting thresholds**: 60% per unit (all-member); 75% (leadership); 70% (managers, team leaders); 75% (DLP participants); CII 4 valid and 70% per team; 12 per unit (quarterly pulse); 8 per unit (half-yearly).
- **Decision classes** for the DLP weighting reference (the weighting itself is applied in the Diagnostic Workbook).

---

# Part 10 — Build Notes for the Excel Implementer

1. **Output means raw and un-flipped.** The single most important rule. Reverse-scoring here is for screening detection only. If the output means are flipped, the Diagnostic Workbook will double-flip and the scores will be wrong.
2. **Do not convert to 0 to 100 for Type A.** Output 1.00 to 5.00 means. The Diagnostic Workbook applies `(mean − 1) × 25`.
3. **Blanks excluded, not zero.** Use `AVERAGE` over the item range so items absent at a cadence and skipped responses are ignored, never counted as zero.
4. **Compute over valid respondents only.** Every mean and module score reads the valid-flag column from Tab 7.
5. **Module scores use the house convention** `(mean − 1) × 25` wherever a module reduces to a mean, pending resolution of the Part 11 conflicts.
6. **Hold the boundary.** Do not assemble O1/O2/O3 structural composites, do not score DLP latencies, do not compute the C2 weighted average, do not compute S1, O4 triangulation, composites, S or P. Those are the Diagnostic Workbook's job.
7. **Cell protection and colour-coding** as in the Diagnostic Workbook, with a legend and the three input-type tags on Tab 1.
8. **Headcount reconciliation.** Flag where valid responses exceed the audience headcount (investigate before scoring, per Survey Blueprint 8.1a).
9. **One workbook per unit.** No multi-unit logic; reuse the template per unit.

---

# Part 11 — Open Items and Cross-Document Discrepancies to Resolve

Building this spec surfaced conflicts between the source documents. The first five were decided on 24 June 2026 without changing the workbook's structure; the sixth, added on revision, adjusts the O5 and O4 output form so both paste straight into the Diagnostic Workbook. The resolutions are recorded inline below, and the remaining work is propagation into the affected documents.

1. **Conversion convention in the Tier 3 Module Library.** The Library (dated 14 May 2026) states module conversions as `mean × 25`, the pre-correction form. The Survey Blueprint and Diagnostic Workbook Spec settled on `(mean − 1) × 25` on 28 May 2026. For a 1 to 5 item, `mean × 25` maps 5 to 125, which exceeds 100, so it is clearly the old error. This spec uses `(mean − 1) × 25`. **Actioned 24 June 2026:** the Tier 3 Module Library module-scoring formulas are corrected to the house convention `(mean − 1) × 25`.
2. **M-C5-TL normalisation.** The Library states `(sum of 12 items / 60) × 100`; the Diagnostic Workbook Spec states `sum / 120 × 100`. The first maps a minimum sum of 12 to 20 rather than 0; the second caps at 50. Neither matches the house convention, which gives `(mean of 12 items − 1) × 25` (1 to 0, 5 to 100). This spec uses the house convention. **Resolved 24 June 2026:** the correct method is `(mean of the 12 items − 1) × 25` per team leader, averaged across team leaders. The Tier 3 Module Library (`sum / 60 × 100`) and the Diagnostic Workbook Spec note (`sum / 120 × 100`) are both corrected to this. The rendered Diagnostic Workbook treats M-C5-TL as an entered Type C input, so no formula re-render is needed; only the cell-note reference is refreshed at next touch.
3. **Speed-clicking exclusion under Google Forms.** Resolved 24 June 2026. Google Forms records only a submission timestamp, not duration, so the speed-clicking check in Survey Blueprint 7.8 cannot be applied. Decision: rely on the straight-lining and patterning checks and record the speed check as unavailable in the methodology footer, rather than adding a fragile hidden-timer workaround. This keeps the survey simple, and integrity is preserved because the two retained checks catch the same low-effort responding.
4. **CII team-level data under per-department links.** Resolved 24 June 2026. The per-department link encodes the unit, not the team, but CII is a team-level construct with a team-level validity gate. Decision: add a single non-identifying team-selector question ("Which team are you part of?") to the main-survey template, so CII is aggregated per team and FTE-weighted to unit C4. One question keeps it simple, and team-level aggregation preserves the integrity of C4. Propagation required: add the team selector to the main-survey template in the Google Forms deployment document and note it in the Survey Blueprint.
5. **C2 boundary.** Resolved 24 June 2026. Decision: this workbook outputs per-domain KDS scores, coverage and criticality, and the Diagnostic Workbook does the criticality-weighted average (C2 Type B), the same way C1 and C3 are handled. The weighting lives once, in the Diagnostic Workbook. The Tier 3 Module Library's end-to-end C2 description should note that the per-domain scores hand off for weighting rather than being averaged in the intake step.
6. **O5 and O4 output form.** Resolved 24 June 2026. The Diagnostic Workbook's O5 tab takes per-team scores (FTE-weighted to unit), and its O4 tab takes a single capacity-analysis score (0 to 100), not all-member OI5 item means or raw capacity indices. Decision: this workbook now outputs a per-team O5 score, `(team OI5 mean − 1) × 25` with team FTE, and a single O4 capacity-analysis score, so both paste directly into the Diagnostic Workbook. The Diagnostic Workbook is unchanged; the alignment lives entirely in this workbook. No other document is affected.

---

*End of specification. This document defines the structure and logic of the Survey Processing and Scoring Workbook; the Excel build is a translation of it. Item wording and the bespoke module rules remain owned by the Survey Blueprint and the Tier 3 Module Library; the input contract is owned by the Diagnostic Workbook Specification. Revisions welcome.*
