# The Performance Equation
## Measurement Reference — Part 1 of 2: Capability and Motivation

**Author:** Michael, PerformanceVP
**Status:** Working draft. First half of the consolidated Measurement Reference; covers Introduction, Capability (C) and Motivation (M).
**Last updated:** 9 July 2026 (each C and M sub-dimension and the trip-wire "Theoretical foundation" line extended with its meta-analytic / large-scale cumulative-evidence anchors, to support the Diagnostic Companion Appendix A research layer; construct definitions, weights and scoring rules unchanged. Prior, 10 June 2026: the survey-score formula shorthand for the CII sub-constructs, M1 to M4 and the trip-wires now carries the "− 1" in the (mean − 1) × 25 conversion, consistent with Section 1.3, the worked examples, the Diagnostic Workbook Spec and the corrected Survey Blueprint)
**Companion documents:** Performance Equation Strategy; Sub-Dimension × Cadence Master Reference; Survey Blueprint; (Part 2 of 2: Opportunity, Synergy, DLP — to follow); Diagnostic Delivery Handbook; Tier 1 & 2 Data Collection Guide; Data Audit Template; Diagnostic Workbook (spreadsheet artefact, to be built); Client Report Template (PowerPoint artefact, to be built).

---

# Part 1 — Introduction and Conventions

## 1.1 Purpose of this document

The Measurement Reference is the operational scoring authority for the Performance Equation. For each of the 17 sub-dimensions plus the three trip-wires and the Decision Latency Protocol (and the sector classification metadata), it specifies:

- The construct being measured and its theoretical foundation
- The Tier 1, Tier 2 and Tier 3 data sources acceptable for measurement
- The operational conversion rule that turns raw client data into a 0–100 sub-dimension score
- The scoring rubric, including handling of partial data and missing inputs
- Worked examples that illustrate typical scoring scenarios

This document sits below the Strategy (the "what and why") and above the Diagnostic Delivery Handbook (the "how to deliver an engagement"). It is the consultant's operational reference for "what data do I need for this sub-dimension, how do I convert what the client has into a score, what does the score mean".

> **Source of truth.** The sub-dimension structure, the within-component weights and the refresh cadence applied here are owned by the Sub-Dimension × Cadence Master Reference. Where this document repeats those values it does so to be self-contained; if any of them need to change, change them in the Cadence Master first and then propagate.

The Measurement Reference is written for **manual delivery via the Diagnostic Workbook** — a spreadsheet artefact in which the consultant records raw inputs per sub-dimension, the workbook applies the conversion rules, calculates sub-dimension and component scores, and produces values for paste-in to the Client Report Template (PowerPoint). The conversion rules in this document are expressed in terms that translate directly into spreadsheet formulas.

## 1.2 The tier hierarchy

For each sub-dimension, data is drawn from one of three tiers, applied in order of preference:

- **Tier 1 — Gold standard.** Validated platform or system data with documented methodology, used directly with light normalisation. Acceptance requires the source to meet specific criteria per sub-dimension (e.g. minimum response rate, vintage, calibration documentation).
- **Tier 2 — Acceptable alternative.** Platform or system data with reputable methodology, used with provider-specific conversion rules. Where Tier 2 is used, the conversion may apply confidence-band adjustment or wider error margins.
- **Tier 3 — PerformanceVP instrument.** Deployed where Tier 1 and Tier 2 are unavailable or insufficient. Includes the CII, the DLP, the Performance Equation Diagnostic Survey, the TDC workshop, and the Clarity, Process and Capacity audits.

The consultant assigns a tier to each sub-dimension during the engagement scoping phase. Tier assignment is recorded in the Diagnostic Workbook's "Tier Assignment" tab and surfaces in the methodology footer of the client report.

**Multiple tier sources may apply to a single sub-dimension.** For example, C1 Skill may draw on Tier 1 Workday Skills Cloud data for technical skills, Tier 2 manager-rated 360 data for behavioural skills, and Tier 3 SCA workshop for a small uncalibrated team. The workbook supports this; the consultant records each input separately and the workbook applies appropriate weighting.

## 1.3 Scoring conventions

**Scale.** All sub-dimension scores are reported on a 0–100 scale. Component composites (C, M, O) are on 0–100. The Synergy coefficient (S) is on 0.85–1.15. The P score is on 0–100.

**Survey items.** Where survey data is used, the convention is the 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree). Conversion to 0–100: sub-dimension score = (mean response across valid items − 1) × 25. A mean of 1 maps to 0; a mean of 5 maps to 100. Reverse-scored items are adjusted before averaging.

**Audit and analytical scores.** Audits and analytical protocols produce scores on 0–100 directly per their rubrics, documented per sub-dimension below.

**Missing data.** Sub-dimension scores require minimum data coverage to be reported (specified per sub-dimension below). Where coverage is below threshold, the score is suppressed and flagged as "insufficient data" in the workbook. The composite component score uses available sub-dimensions, with the missing sub-dimension's weight reallocated proportionally to the others, and an annotation in the methodology footer.

**Confidence.** Each sub-dimension carries a confidence indicator (High / Medium / Low) per the decay rules in the Sub-Dimension × Cadence Master Reference. The Diagnostic Workbook captures the measurement date per sub-dimension and computes confidence automatically based on cadence rules.

**Reporting threshold for survey-based sub-dimensions.** Minimum 60% response rate per unit; minimum 4 valid respondents per team for the CII. Where thresholds are not met, the sub-dimension is reported as "insufficient response" and excluded from the composite.

## 1.4 The Diagnostic Workbook

The Diagnostic Workbook is an Excel/Google Sheets artefact (one workbook per unit being measured) with the following tab structure:

| Tab | Purpose |
|---|---|
| **Engagement metadata** | Client, unit, FTE, sector, sub-sector, size band, engagement date, consultant |
| **Tier assignment** | Per sub-dimension: which tier used, rationale, vintage |
| **Capability inputs** | Raw inputs and sub-dimension calculations for C1–C5 |
| **Motivation inputs** | Raw inputs and sub-dimension calculations for M1–M4 plus trip-wires |
| **Opportunity inputs** | Raw inputs and sub-dimension calculations for O1–O5 |
| **Synergy inputs** | Raw inputs and sub-dimension calculations for S1–S3 |
| **DLP** | Decision sampling log, latency calculations, DLS |
| **Behavioural triangulators** | Turnover, absence, eNPS etc.; survey-behavioural gap calculations |
| **Sector classification** | Sector classification metadata (division, sub-sector, size band, unit type) for internal comparison |
| **Composite scoring** | Pulls sub-dimension scores, applies weights, computes C, M, O, S, P |
| **Methodology footer** | Auto-populates from tier assignment and exclusion logs |
| **Report data** | Formats scores and findings for paste-in to the PowerPoint template |

Each sub-dimension section below describes the corresponding section of the workbook and the inputs the consultant records there.

## 1.5 How to read this document

For each sub-dimension, the structure is:

1. **Construct.** What the sub-dimension measures, theoretical foundation, plain-language version.
2. **Weight.** The default weight within its parent component, with industry archetype adjustments noted.
3. **Tier 1 sources.** Specific platforms and data types acceptable as gold-standard, with acceptance criteria.
4. **Tier 2 sources.** Acceptable alternatives, with provider-specific conversion rules.
5. **Tier 3 instrument.** The PerformanceVP fallback.
6. **Operational conversion rule.** What goes into the workbook's input cells, and how the sub-dimension score is calculated.
7. **Worked example.** A typical scoring scenario with actual numbers.
8. **Reporting threshold and confidence.** When the score is reported with high confidence, when it is flagged for insufficient data, when it is excluded.

---

# Part 2 — Capability (C) Measurement

Capability is the collective ability of the unit's people to do the work expected of them. It is measured through five sub-dimensions:

| Sub-dim | Construct | Weight in C |
|---|---|---|
| **C1** | Skill (including behavioural capability) | 35% |
| **C2** | Knowledge depth and breadth | 15% |
| **C3** | Talent density | 20% |
| **C4** | Collective intelligence | 20% |
| **C5** | Learning velocity | 10% |

**Capability composite formula:**

```
C = 0.35(C1) + 0.15(C2) + 0.20(C3) + 0.20(C4) + 0.10(C5)
```

Weights sum to 100%. Industry archetype adjustments are documented per sub-dimension in this Measurement Reference (and summarised in the Sub-Dimension × Cadence Master Reference). The *component-level* weights applied in the P equation (α=0.35 Capability, β=0.40 Motivation, γ=0.25 Opportunity) are standardised across all engagements; industry differences are handled inside the components via these sub-dimension weights, not at the component level.

## 2.1 C1 — Skill (including behavioural capability)

### Construct

**Definition.** The applied procedural and behavioural competence of unit members to perform their roles. Covers technical skill, functional skill, and behavioural competencies (communication, judgement, collaboration, decision-making, leadership where role-relevant). Skill is "can do" — the demonstrated ability to perform role-required activities.

**Plain language.** Whether the people in this unit have the actual skills needed to do their jobs well, including the behavioural and leadership skills the work requires.

**Theoretical foundation.** Campbell's theory of performance (1990, 2012) — procedural skill as one of the three direct performance determinants. The behavioural competency tradition (Boyatzis, Spencer & Spencer) for behavioural skills. Role-theoretic foundation (Katz & Kahn) for the role-relevance criterion. Cumulative evidence: Schmidt & Hunter (1998) on the criterion validity of measured skill and ability; Crook et al. (2011), meta-analysis, on the human-capital-to-firm-performance link (strongest for firm-specific human capital measured against operational outcomes) — the unit-level warrant for framework-mapped skill measurement.

**Consolidated coverage.** C1 absorbs the former C6 (Behavioural and Leadership Capability) and the former C7 (Experience Depth, now used as a tenure-weighted moderator rather than a stand-alone sub-dimension).

### Weight

Default 35% of C. Industry archetypes:

| Archetype | C1 weight |
|---|---|
| Default | 35% |
| Knowledge-intensive (professional services, R&D, technology) | 40% |
| Operations-heavy (manufacturing, logistics, field service) | 35% |
| Customer-facing service | 35% |
| Public sector / regulated | 30% (knowledge weight higher) |
| Healthcare | 35% |

### Tier 1 sources

**Tier 1 acceptance criteria:** Platform-managed skills inventory data where (a) the skill framework reflects role-relevant skills explicitly mapped to the unit's roles, (b) proficiency assessments are manager-confirmed (not solely AI-inferred or self-reported), (c) coverage is at least 75% of the unit's FTE, (d) data vintage is within 12 months.

Acceptable platforms include:

| Platform | Notes for Tier 1 acceptance |
|---|---|
| Workday Skills Cloud | Manager-confirmed proficiency required; AI suggestions not sufficient alone |
| SAP SuccessFactors Talent Intelligence Hub | Confirmed Skills graph; role-skill mapping must be active |
| Oracle HCM Dynamic Skills | Confirmed proficiencies, not just inferred |
| Korn Ferry Success Profiles | Where deployed with structured assessment |

For behavioural skills, Tier 1 360 platforms include Korn Ferry Voices, CCL Benchmarks, SHL, DDI, Hogan, Leadership Circle Profile, Culture Amp 360, where deployed with manager and direct-report ratings against a behavioural framework.

### Tier 2 sources

Used where Tier 1 acceptance criteria are not met. Provider-specific conversion rules:

| Platform | Conversion rule |
|---|---|
| Compono Develop | Self-rated proficiency adjusted downward by 0.5 points on the 5-point scale to correct for self-rating inflation, then converted to confirmed-equivalent |
| Eightfold | AI-inferred proficiency accepted with manager spot-confirmation of 25% sample; otherwise downgrade to Tier 3 |
| Degreed | Skill ratings count where manager-confirmed; learning-completion data treated as supplementary only |
| Cornerstone Galaxy | Use confirmed-skills view, not unconfirmed inferences |
| ELMO | Manager-confirmed skill ratings count; performance review skill ratings treated as supplementary |
| LinkedIn Skill Assessments | Count as confirmed for the specific skill tested, weighted at 50% (single-point in time, not ongoing) |
| Industry certification registers | Count as confirmed for the certified scope; cross-reference to framework requirement |
| Technical assessment platforms (HackerRank, Codility, Mercer Mettl) | Count as confirmed for technical skill domain assessed |
| Internal capability frameworks (Excel/SharePoint) | Use where manager-rated and within 12 months |

For behavioural skills, Tier 2 includes: McKinsey OHI Capabilities sub-section, performance review behavioural ratings (within 12 months, calibrated), Culture Amp Effectiveness scores, 9-box behavioural axis data.

### Tier 3 — SCA (Skills Coverage Assessment)

The PerformanceVP Skills Coverage Assessment is deployed where no acceptable Tier 1 or Tier 2 source covers the unit. Operationally:

1. The consultant works with the unit's leader to define the role-relevant skill framework (typically 8–15 skills per role family within the unit, drawn from the client's existing framework if it exists, or constructed from a relevant industry framework if not).
2. Managers rate each direct report on each role-required skill on a 5-point proficiency scale (1 = Novice, 2 = Developing, 3 = Proficient, 4 = Advanced, 5 = Expert), with the threshold for "demonstrated" being 3 (Proficient).
3. A 15% audit sample of ratings is validated through structured manager interview (5-minute per direct-report sample) to detect rating inflation.
4. Behavioural skills (where role-relevant) are added via either an PerformanceVP behavioural rubric or, where feasible, a 360 deployment.

The SCA workshop runs 0.5–1.0 consulting days per management layer plus 1–2 days analytical work.

### Operational conversion rule

The consultant records inputs in the workbook's "C1 Skill" section:

**Per role family in the unit, the consultant enters:**

| Input | Description |
|---|---|
| Role family name | E.g. "Customer Service Representatives", "Software Engineers", "Operations Managers" |
| FTE in this role family | Count of full-time-equivalents |
| Framework skills required | Total count of skills required for this role family per the framework |
| Confirmed proficiencies (Tier 1) | Sum across the role family of skills demonstrated at threshold proficiency, drawn from Tier 1 source |
| Confirmed proficiencies (Tier 2, adjusted) | Sum from Tier 2 sources after provider-specific conversion |
| Confirmed proficiencies (Tier 3 SCA) | Sum from SCA workshop where used |
| Source vintage | Date of most recent data |
| Source identifier | Which platform / source the data is drawn from |

**Per role family, sub-dimension score is calculated as:**

```
Coverage ratio (per role family) = (sum of confirmed proficiencies across all sources)
                                   / (FTE in role family × Framework skills required)
                                 (capped at 1.0)

Role family C1 score = Coverage ratio × 100
```

**Unit-level C1 score is the FTE-weighted average across role families:**

```
C1 = Σ(Role family C1 score × Role family FTE) / Total unit FTE
```

### Experience-depth moderator

Where the unit has unusually high or low tenure profile relative to sector norms, an experience moderator is applied:

- Median unit tenure < 18 months → C1 multiplied by 0.95 (junior team penalty)
- Median unit tenure 18 months–8 years → no adjustment
- Median unit tenure > 8 years → C1 multiplied by 1.05 (experience bonus, capped)

The moderator is documented in the methodology footer.

### Worked example

A Customer Service unit of 60 FTE, comprising 50 Customer Service Reps (CSRs) and 10 Team Leaders (TLs).

CSR framework: 10 required skills per CSR. From Workday Skills Cloud (Tier 1, manager-confirmed, current): 380 confirmed proficiencies across the 50 CSRs out of a possible 500 (50 FTE × 10 skills) = 76.0% coverage. CSR C1 = 76.0.

TL framework: 12 required skills per TL. From a combination of Workday (technical skills, Tier 1) and an internal 360 (behavioural skills, Tier 2): 92 confirmed proficiencies out of 120 (10 FTE × 12 skills) = 76.7% coverage. TL C1 = 76.7.

Unit C1 (FTE-weighted) = (76.0 × 50 + 76.7 × 10) / 60 = (3800 + 767) / 60 = 76.1.

Median tenure of the unit is 22 months → no moderator applied.

**Unit C1 = 76.1, Tier mix 80% T1 + 20% T2, Confidence: High.**

### Reporting threshold and confidence

C1 score requires coverage of at least 70% of the unit's FTE. Where coverage falls below this, C1 is reported as "insufficient coverage" and the consultant either expands data collection or deploys SCA for the uncovered population.

Confidence per the cadence master:
- High for 12 months from refresh date
- Medium at 14 months
- Low at 18 months
- Excluded entirely from composite if last refresh > 24 months

## 2.2 C2 — Knowledge depth and breadth

### Construct

**Definition.** Declarative knowledge of products, customers, regulations, processes and operating context. What people know — distinct from how they apply it (which is C1 Skill).

**Plain language.** Whether the people in this unit actually know what they need to know — about products, customers, rules, processes — to do their work well.

**Theoretical foundation.** Campbell's theory of performance (1990, 2012) — declarative knowledge as the first of three direct performance determinants. Anderson's ACT-R distinction between declarative and procedural knowledge. Cumulative evidence: Hunter (1986) on job knowledge as the proximal path from ability to performance; Dye, Reck & McDaniel (1993), meta-analysis, on job-knowledge-test validity (strongest for job-specific knowledge) — the warrant for assessment-scored data and the domain-criticality weighting.

### Weight

Default 15% of C. Industry archetypes:

| Archetype | C2 weight |
|---|---|
| Default | 15% |
| Knowledge-intensive | 15% |
| Operations-heavy | 10% |
| Customer-facing service | 20% (product/customer knowledge critical) |
| Public sector / regulated | 25% (regulatory knowledge critical) |
| Healthcare | 25% (clinical knowledge critical) |

### Tier 1 sources

**Tier 1 acceptance criteria:** Learning Management System with assessment-scored data (not just completion data), covering role-required knowledge domains, vintage within 12 months, coverage at least 75% of the unit's FTE.

Acceptable platforms:

| Platform | Notes for Tier 1 acceptance |
|---|---|
| Cornerstone OnDemand | Assessment scores required, not just completions |
| SAP Learning | Assessment scores required |
| Workday Learning | Assessment scores required |
| ELMO Learning | Assessment scores; mandatory and elective both count |
| Sentrient | Compliance assessment scores |
| Cloud Assess | Knowledge testing for vocational/operational domains |
| Industry-specific product knowledge platforms | Where deployed with assessment outcomes |

### Tier 2 sources

| Platform | Conversion rule |
|---|---|
| Internal bespoke knowledge tests | Use where psychometric quality documented (alpha ≥ 0.70 or pass/fail with documented passing standard); convert pass rate to score on 0–100 |
| Tenure-adjusted knowledge proxy | For roles where formal knowledge testing absent: assume baseline proficiency builds with tenure (0–6 months = 50%, 6–18 months = 70%, 18+ months = 85%); flag as proxy in methodology footer |
| Manager-rated knowledge | Against framework, on 5-point scale, only where calibrated against assessment data for at least 25% of population |
| Customer-facing knowledge proxies | First-call resolution rates, complaint-resolution accuracy, NPS where knowledge-related |

### Tier 3 — KDS (Knowledge Depth Survey)

The PerformanceVP Knowledge Depth Survey is deployed where no acceptable assessment data exists. Operationally:

1. The consultant works with the unit's leadership to define 3–6 role-critical knowledge domains for the unit (e.g. "Product range and specifications", "Customer regulatory requirements", "Internal escalation procedures", "Industry compliance landscape").
2. Per domain, 6–10 scenario-based items are constructed (or adapted from PerformanceVP's library where applicable) that test applied knowledge through realistic operating scenarios.
3. The KDS is deployed online to all unit members; results are aggregated to domain scores and the unit's overall C2 score.
4. Item difficulty is calibrated through a pilot with the unit's most experienced members so that scores are meaningful.

The KDS construction takes 1–2 consulting days per role family; deployment is online (web survey, 20–30 minutes per respondent).

### Operational conversion rule

The consultant records inputs in the workbook's "C2 Knowledge" section:

**Per knowledge domain (Tier 1 or Tier 2):**

| Input | Description |
|---|---|
| Domain name | E.g. "Product knowledge", "Compliance knowledge" |
| Domain criticality weight | 1–3 scale (1 = supplementary, 2 = important, 3 = critical to role) |
| Mean assessment score | 0–100, from the source platform |
| Coverage % | % of unit FTE with current assessment data in this domain |
| Source identifier and vintage | |

**Per knowledge domain (Tier 3 KDS):**

| Input | Description |
|---|---|
| Domain name | |
| Domain criticality weight | 1–3 scale |
| Mean KDS domain score | 0–100, from the deployed KDS |
| Coverage % | KDS response rate |

**Sub-dimension score calculated as:**

```
Per domain coverage-adjusted score = Mean score × Coverage %
                                    (where Coverage % is treated as a fraction, e.g. 0.85)

C2 = Σ(Per domain coverage-adjusted score × Domain criticality weight)
     / Σ(Domain criticality weight)
```

The criticality weighting ensures that, e.g., compliance knowledge in a regulated unit weighs more heavily than supplementary product knowledge.

### Worked example

A Compliance unit of 40 FTE. Three knowledge domains identified with the unit's leadership:

| Domain | Criticality | Source | Mean score | Coverage |
|---|---|---|---|---|
| Regulatory framework knowledge | 3 (critical) | Sentrient compliance assessments (T1) | 84 | 95% |
| Product knowledge | 2 (important) | Internal knowledge test (T2) | 71 | 80% |
| Internal procedures and escalation | 2 (important) | LMS completion + manager rating (T2) | 76 | 88% |

Per-domain coverage-adjusted scores:
- Regulatory: 84 × 0.95 = 79.8
- Product: 71 × 0.80 = 56.8
- Procedures: 76 × 0.88 = 66.9

Weighted average:
C2 = (79.8 × 3 + 56.8 × 2 + 66.9 × 2) / (3 + 2 + 2) = (239.4 + 113.6 + 133.8) / 7 = 486.8 / 7 = 69.5.

**Unit C2 = 69.5, Tier mix 50% T1 + 50% T2, Confidence: High.**

### Reporting threshold and confidence

C2 requires at least one Critical (weight 3) domain measured at 60%+ coverage. Without a Critical-domain measurement, C2 is reported as "insufficient coverage".

Confidence per the cadence master:
- High for 12 months
- Medium at 14 months
- Low at 18 months
- Assessments older than 24 months excluded entirely

## 2.3 C3 — Talent density

### Construct

**Definition.** The proportion of unit roles filled by people performing at or above the standard expected for their role. The "A and B players" concept calibrated through structured talent review rather than relying on inflated annual performance ratings.

**Plain language.** Of the people in this unit, what proportion are clearly performing well (the strong contributors and rising performers) versus those who are struggling or underperforming.

**Theoretical foundation.** Lawler (2003), Bersin's high-performance workforce research, McKinsey's "war for talent" lineage. Practically, the framework draws on calibrated 9-box and forced-distribution traditions while avoiding their excesses. Cumulative evidence: O'Boyle & Aguinis (2012) on the power-law (non-normal) distribution of individual performance — the share of strong performers in a unit is a real quantity, visible only when rating inflation is controlled; Crook et al. (2011) and Huselid (1995) on the human-capital-stock and selection-and-appraisal links to unit productivity. The calibration requirement and the Tier 2 inflation adjustment follow directly; the method constrains rating inflation, it does not mandate forced ranking of people.

### Weight

Default 20% of C. Industry archetypes:

| Archetype | C3 weight |
|---|---|
| Default | 20% |
| Knowledge-intensive | 25% (talent density matters more in expert work) |
| Operations-heavy | 15% (more standardised work; skill (C1) carries more weight) |
| Customer-facing service | 20% |
| Public sector / regulated | 15% (rating systems often constrained) |
| Healthcare | 20% |

### Tier 1 sources

**Tier 1 acceptance criteria:** Calibrated performance rating data in HRIS, where (a) calibration procedure is documented (forced distribution, peer calibration meetings, or similar), (b) data is current within 12 months, (c) coverage is at least 80% of unit FTE, (d) rating distribution shows evidence of true differentiation (top rating typically ≤25%, bottom rating ≥5%).

Acceptable platforms:

| Platform | Notes |
|---|---|
| Workday Performance Reviews with calibration enabled | Documented calibration required |
| SAP SuccessFactors with calibration | Documented calibration required |
| Lattice with calibration | |
| Korn Ferry Success Profiles assessment data | Where deployed with structured rating |
| 9-box outputs from calibrated talent review | Stand-alone 9-box from a structured review process |

### Tier 2 sources

| Source | Conversion rule |
|---|---|
| Uncalibrated performance ratings (HRIS) | Apply downward adjustment to "exceptional" rating count: cap exceptional at 15% of population; reallocate excess to "exceeds expectations" |
| 360 overall ratings | Treat composite rating as performance proxy with downward adjustment of 0.3 on the 5-point scale |
| Promotion and recognition data | Cumulative count of promotions and formal recognition within 24 months divided by FTE produces an "active recognition rate"; convert via lookup table |
| Probation completion rates | New-hire 6-month and 12-month retention as proxy for talent acquisition quality |
| Compa-ratio analysis | Pay relative to band can proxy talent density where calibration data is absent |

### Tier 3 — TDC (Talent Density Calibration) workshop

The PerformanceVP TDC workshop is deployed where ratings are uncalibrated or unavailable. Operationally, the workshop is facilitated for each management layer within the unit:

1. The unit's manager(s) calibrate their direct reports against a 5-band performance framework (1 = Underperforming, 2 = Developing, 3 = Meeting expectations, 4 = Exceeding expectations, 5 = Exceptional contributor).
2. Calibration is anchored to specific behavioural exemplars and recent performance evidence.
3. Cross-manager calibration is achieved through structured peer discussion at the workshop, with the consultant facilitating.
4. The resulting distribution is constrained against industry norms (typically: 5 = ≤10%, 4 = ≤25%, 3 = 40–60%, 2 = 10–20%, 1 = ≤10%).

The workshop runs 0.5–1.0 consulting days per management layer; for a unit with 30–50 direct reports across one management layer, a single 4-hour workshop typically suffices.

### Operational conversion rule

The consultant records inputs in the workbook's "C3 Talent Density" section:

**Per rating band, the consultant enters:**

| Input | Description |
|---|---|
| Band 5 — Exceptional contributors | Count (or % of FTE) |
| Band 4 — Exceeding expectations | Count (or % of FTE) |
| Band 3 — Meeting expectations | Count (or % of FTE) |
| Band 2 — Developing / partial meet | Count (or % of FTE) |
| Band 1 — Underperforming | Count (or % of FTE) |
| Source identifier and vintage | |
| Calibration evidence | Documented (Tier 1) / Workshop-based (Tier 3) / Adjusted (Tier 2) |

**Sub-dimension score calculated as:**

```
C3 = ( Band 5 % × 100
     + Band 4 % × 80
     + Band 3 % × 60
     + Band 2 % × 35
     + Band 1 % × 0 )
```

Where each Band % is expressed as a fraction (e.g. 0.10 for 10%) and the formula sums to 100 when distribution is entirely Band 5.

### Worked example

A Sales unit of 80 FTE. Performance ratings from Workday with documented calibration (Tier 1, 95% coverage, current):

| Band | % of unit |
|---|---|
| 5 — Exceptional | 8% |
| 4 — Exceeding | 22% |
| 3 — Meeting | 50% |
| 2 — Developing | 15% |
| 1 — Underperforming | 5% |

C3 = (0.08 × 100) + (0.22 × 80) + (0.50 × 60) + (0.15 × 35) + (0.05 × 0)
   = 8.0 + 17.6 + 30.0 + 5.25 + 0
   = 60.85

**Unit C3 = 60.9, Tier 1, Confidence: High.**

The score interpretation: with 30% of the unit at the "exceeding" or "exceptional" level and only 5% underperforming, this is a healthy talent density distribution. Score of ~61 reflects a meaningful concentration of strong performers but room to lift the middle.

### Reporting threshold and confidence

C3 requires at least 80% of unit FTE rated and current. Where coverage falls below 80%, score is reported as "insufficient coverage". Where calibration evidence is weak, the score is reported with a Tier 2 flag and Medium confidence regardless of vintage.

Confidence per the cadence master:
- High for 12 months
- Medium at 15 months
- Low at 18 months

## 2.4 C4 — Collective intelligence

### Construct

**Definition.** The quality of the team's shared map of who knows what (Expertise Clarity), the trust in each other's expertise (Expertise Trust), and the smoothness with which expertise gets combined into collective output (Expertise Flow). Theoretically grounded in transactive memory systems (TMS) research.

**Plain language.** Whether the team knows who knows what, trusts each other's expertise, and combines that expertise smoothly when work demands it. The "collective brain" of the team.

**Theoretical foundation.** Wegner (1987) on transactive memory; Lewis (2003) on the validated three-facet TMS field measure (specialisation, credibility, coordination) — the recognised lineage behind the CII's Expertise Clarity, Expertise Trust and Expertise Flow architecture; Ren and Argote (2011) on TMS as a team capability; ongoing research (e.g. Yuan, Wang, Lewis) on TMS antecedents and consequences. Cumulative evidence: DeChurch & Mesmer-Magnus (2010) and Bachrach et al. (2019), meta-analyses, confirm that team cognition predicts team performance with a consistent, moderate effect and incremental validity beyond motivation and cohesion — the warrant for the 20% weight and the market-gap claim.

### Weight

Default 20% of C. Industry archetypes:

| Archetype | C4 weight |
|---|---|
| Default | 20% |
| Knowledge-intensive | 25% (TMS most consequential for expert work) |
| Operations-heavy | 15% (more standardised work) |
| Customer-facing service | 20% |
| Public sector / regulated | 20% |
| Healthcare | 25% (clinical teams; TMS critical) |

### Tier 1 sources

**There is no Tier 1 source.** No major commercial platform measures the TMS construct in a form suitable for use as C4. Some Organisational Network Analysis platforms (Polinode, TrustSphere, Worklytics, OrgVitality, Microsoft Workplace Analytics) provide network-structure data that correlates with one or two TMS sub-constructs (typically Flow), but coverage is incomplete and the TMS construct itself is not measured.

This is the genuine market gap that justifies the PerformanceVP CII as proprietary measurement IP.

### Tier 2 sources

ONA platforms providing partial signal:

| Platform | What it gives | How treated |
|---|---|---|
| Polinode | Expertise network maps, advice-seeking patterns | Use as supplementary signal for Expertise Clarity sub-construct; not sufficient alone |
| TrustSphere | Communication and trust network data | Supplementary signal for Expertise Trust |
| Worklytics | Collaboration patterns | Supplementary signal for Expertise Flow |
| Microsoft Workplace Analytics | Collaboration telemetry | Supplementary signal for Expertise Flow |
| Internal expertise directories | Where deployed with usage telemetry | Supplementary signal for Expertise Clarity |

These provide partial signal that can be triangulated against the CII but do not replace it.

### Tier 3 — CII (Collective Intelligence Index)

The CII is the PerformanceVP proprietary instrument that measures C4. It is deployed in essentially every engagement.

**Deployment specification:**

- 15 items measuring three sub-constructs (Expertise Clarity, Expertise Trust, Expertise Flow), 5 items per sub-construct
- Item wording in Survey Blueprint Part 2
- Deployed at team level (typically 4–20 people per team)
- Required validity: minimum 4 valid respondents per team and 70% response rate per team
- Cadence: Half-yearly and annual; one item (CII-13 Expertise Flow) rotates through quarterly pulse
- 10–12 minutes per respondent for the full instrument; under 2 minutes for the rotating pulse item

**Sub-construct scoring:**

```
Expertise Clarity score = ((mean of CII-01 to CII-05, CII-05 reverse-scored) − 1) × 25
Expertise Trust score   = ((mean of CII-06 to CII-10, CII-10 reverse-scored) − 1) × 25
Expertise Flow score    = ((mean of CII-11 to CII-15, CII-15 reverse-scored) − 1) × 25

Team C4 score = 0.35 × Expertise_Clarity + 0.35 × Expertise_Trust + 0.30 × Expertise_Flow
```

Empirical weighting privileges Clarity and Trust slightly over Flow on the basis that Clarity and Trust are causally prior — a team cannot flow expertise it has not first mapped and learned to trust.

### Operational conversion rule

The consultant records inputs in the workbook's "C4 Collective Intelligence" section:

**Per team in the unit:**

| Input | Description |
|---|---|
| Team name | |
| Team FTE | Count of team members |
| Respondents | Count of valid respondents (after attention-check exclusions) |
| Response rate | Respondents / Team FTE (must be ≥ 70%) |
| Expertise Clarity score | Computed from CII-01 through CII-05 per scoring formula |
| Expertise Trust score | Computed from CII-06 through CII-10 |
| Expertise Flow score | Computed from CII-11 through CII-15 |
| Team C4 score | 0.35 × Clarity + 0.35 × Trust + 0.30 × Flow |
| Survey date | |
| ONA supplementary data | If available, recorded for triangulation |

**Unit-level C4 is FTE-weighted across constituent teams:**

```
Unit C4 = Σ(Team C4 × Team FTE) / Σ(Team FTE — where team valid)
```

Teams below the validity threshold (≥4 valid respondents AND ≥70% response rate) are excluded from the aggregate, with the exclusion noted in the methodology footer.

### Worked example

A Software Engineering unit of 80 FTE comprising 8 teams of 10. CII deployed; results:

| Team | FTE | Respondents | Resp % | Clarity | Trust | Flow | Team C4 |
|---|---|---|---|---|---|---|---|
| Alpha | 10 | 9 | 90% | 76 | 78 | 72 | 75.5 |
| Beta | 10 | 8 | 80% | 72 | 70 | 65 | 69.2 |
| Gamma | 10 | 10 | 100% | 84 | 82 | 80 | 82.1 |
| Delta | 10 | 7 | 70% | 65 | 70 | 60 | 65.3 |
| Epsilon | 10 | 9 | 90% | 78 | 76 | 74 | 76.1 |
| Zeta | 10 | 5 | 50% | — | — | — | INVALID (below 70% threshold) |
| Eta | 10 | 8 | 80% | 70 | 68 | 65 | 67.8 |
| Theta | 10 | 9 | 90% | 82 | 80 | 78 | 80.1 |

Zeta excluded for insufficient response rate.

Unit C4 = (75.5 × 10 + 69.2 × 10 + 82.1 × 10 + 65.3 × 10 + 76.1 × 10 + 67.8 × 10 + 80.1 × 10) / 70
       = (755 + 692 + 821 + 653 + 761 + 678 + 801) / 70
       = 5161 / 70
       = 73.7

**Unit C4 = 73.7, Tier 3 CII, Confidence: High. Team Zeta excluded for insufficient response.**

The diagnostic narrative then notes the substantial variation across teams (65.3 to 82.1) as a key finding within the unit — Delta is the lowest CII team and warrants closer attention.

### Reporting threshold and confidence

Unit-level C4 requires at least 75% of constituent teams meeting validity thresholds.

Confidence per the cadence master:
- High for 6 months
- Medium at 8 months
- Low at 12 months
- Excluded from composite if last refresh > 12 months

## 2.5 C5 — Learning velocity

### Construct

**Definition.** The speed and efficiency with which a team or unit acquires, integrates and operationalises new knowledge and skills. Team-level analogue of individual learning agility. Encompasses time-to-competence for new hires, time-to-proficiency on new tools or processes, and the unit's overall responsiveness to change.

**Plain language.** How fast this unit learns new things and gets them working productively — when new people join, when new tools arrive, when the work itself shifts.

**Theoretical foundation.** Edmondson's organisational learning research; Senge's learning organisation; Argote & Epple (1990) and Argote (2013) on organisational learning curves (units differ persistently and measurably in the rate at which experience converts to productivity); the engineering productivity literature (DORA / Forsgren, Humble & Kim 2018 — practitioner-grade) which provides quantifiable learning-velocity proxies for technology teams. Cumulative evidence: Tannenbaum & Cerasoli (2013), meta-analysis, that structured debriefing improves performance — the warrant for the retrospective-application items. The deliberately modest 10% weight reflects that the unit-level evidence base, while real, is thinner than for C1-C4.

### Weight

Default 10% of C. Industry archetypes:

| Archetype | C5 weight |
|---|---|
| Default | 10% |
| Knowledge-intensive | 15% (learning velocity central to expert-work units) |
| Operations-heavy | 5% (steady-state work; lower learning velocity importance) |
| Customer-facing service | 10% |
| Public sector / regulated | 5% |
| Healthcare | 10% |

### Tier 1 sources

**Tier 1 acceptance criteria:** Quantitative learning-velocity metrics drawn from validated systems, with data vintage within 12 months and trend visible over at least 6 months.

Acceptable sources:

| Source | Notes for Tier 1 acceptance |
|---|---|
| DORA metrics platforms (LinearB, Sleuth, Jellyfish, Faros, Swarmia) | For technology teams; lead time for changes and deployment frequency are direct learning-velocity proxies |
| LMS time-to-competence data | Where new-hire ramp-up is tracked through milestone-based assessment |
| Visier, One Model, Crunchr workforce analytics | Where new-hire productivity ramp data is captured |
| Project delivery cycle time from work management systems | Where new-project ramp time is comparable across periods |

### Tier 2 sources

| Source | Conversion rule |
|---|---|
| Project delivery cycle time (Jira, Asana, Monday, Smartsheet, ServiceNow) | Use trend rather than absolute values; learning velocity = improvement in cycle time over 6–12 months |
| HRIS new-hire ramp-up data | Time-to-target-productivity by role family, where measured |
| Tool / process adoption telemetry | % of unit using new tool within 90 days of rollout |
| Retrospective and post-mortem data | Where learning artefacts are reviewed and applied within 30 days |

### Tier 3 — M-C5-TL learning-velocity module (LVI interview as fallback)

The PerformanceVP learning-velocity instrument is deployed where no acceptable Tier 1/2 data exists. The primary delivery is the **M-C5-TL module** — an async, 12-item instrument completed by the unit's team leaders (≈15–20 minutes each), specified in the Tier 3 Module Library Part 5.1. The **LVI structured-interview protocol** (12 questions, ~45 minutes per team leader) is retained as a fallback where async deployment is not viable. Operationally, either route:

1. 12 questions/items administered to the unit's team leaders — async module by default, structured interview as fallback.
2. Questions cover: new-hire onboarding speed, time-to-productivity for tool/process changes, retrospective application, knowledge-sharing rituals, learning culture indicators.
3. The consultant scores each question on a 0–10 rubric; the module/LVI composite = (sum of scores / 120) × 100. This composite feeds the C5 conversion rule below.

The async M-C5-TL module is the default and substantially lighter; the LVI interview fallback runs approximately 1 consulting day per 3–4 team leaders interviewed plus analytical synthesis.

### Operational conversion rule

The consultant records inputs in the workbook's "C5 Learning Velocity" section:

**The consultant captures up to three velocity indicators per unit, each on a 0–100 scale:**

| Indicator | Description and conversion |
|---|---|
| New-hire time-to-competence | Compared to industry norm: 100 = 50% faster than norm; 75 = at norm; 50 = 25% slower than norm; 25 = 50% slower than norm; 0 = ≥75% slower |
| Tool / process adoption | % of unit demonstrably using a new tool / process within 90 days of rollout; convert directly to 0–100 |
| Project delivery cycle improvement | % improvement in cycle time over a 12-month window; >25% improvement = 100, 15–25% = 80, 5–15% = 60, 0–5% = 40, negative = 0–30 |

**Plus, where Tier 3 LVI is used:**

| Input | Description |
|---|---|
| LVI composite score | 0–100, from the LVI structured interview |

**Sub-dimension score calculated as:**

If multiple indicators available: C5 = arithmetic mean of available indicators (each on 0–100).

If only LVI: C5 = LVI composite score.

If both: C5 = (indicator mean × 0.6) + (LVI × 0.4), reflecting that the LVI is interpretive while the indicators are observed.

### Worked example

A Software Engineering unit of 80 FTE. Tier 1 DORA data plus internal new-hire data:

| Indicator | Raw measurement | Converted to 0–100 |
|---|---|---|
| Lead time for changes (DORA) | Improved from 5 days to 3 days over 12 months (40% improvement) | 100 |
| New-hire time-to-first-PR | Median 14 days; industry norm 21 days (33% faster than norm) | 90 |
| Deployment frequency (DORA) | Daily; industry norm weekly | 100 |

Arithmetic mean: (100 + 90 + 100) / 3 = 96.7

**Unit C5 = 96.7, Tier 1 DORA + internal data, Confidence: High.**

### Reporting threshold and confidence

C5 requires at least one valid indicator. Where no indicators or LVI data exists, C5 is reported as "insufficient data" and the consultant either deploys LVI or proposes the omission.

Confidence per the cadence master:
- C5 is a 12-month rolling metric; remains valid as long as the underlying data feed is within 60 days of currency
- Excluded from composite if data feed has lapsed > 6 months

## 2.6 Capability composite scoring

The Capability composite is the weighted sum of the five sub-dimensions:

```
C = 0.35(C1) + 0.15(C2) + 0.20(C3) + 0.20(C4) + 0.10(C5)
```

**Handling of missing sub-dimensions.** Where a sub-dimension is reported as "insufficient data" and cannot be measured, its weight is reallocated proportionally to the remaining sub-dimensions. For example, if C5 is unmeasurable, the remaining weights become: C1 = 0.35/0.90 = 0.389, C2 = 0.167, C3 = 0.222, C4 = 0.222. The methodology footer documents the omission and the reallocation.

**Industry archetype application.** The consultant selects the relevant industry archetype during engagement scoping (defaulting to Default if no obvious fit). The selected archetype weights are entered into the workbook's "Composite Scoring" tab and apply throughout subsequent calculations.

**Tier mix annotation.** The workbook tracks the tier mix across sub-dimensions and reports the composite tier rating:

- All sub-dimensions Tier 1 or Tier 2: Capability composite reported as "High data quality"
- Mixed Tier 2 / Tier 3 with no Tier 1: "Medium data quality"
- Majority Tier 3: "Tier-3-dominant; methodology disclosed"

This annotation surfaces in the methodology footer of the client report.

---

# Part 3 — Motivation (M) Measurement

Motivation is the collective willingness of the unit's people to apply themselves to the work and to care about the outcome. It is measured through four sub-dimensions plus three hygiene trip-wires:

| Sub-dim | Construct | Weight in M |
|---|---|---|
| **M1** | Engagement and confidence | 50% |
| **M2** | Psychological safety | 20% |
| **M3** | Autonomous motivation | 15% |
| **M4** | Purpose alignment | 15% |
| **TW** | Hygiene trip-wires | Independent critical-finding indicators (not weighted into M) |

**Motivation composite formula:**

```
M = 0.50(M1) + 0.20(M2) + 0.15(M3) + 0.15(M4)
```

Weights sum to 100%. Trip-wires sit outside the composite as independent critical-finding indicators.

## 3.1 M1 — Engagement and confidence

### Construct

**Definition.** Vigour, dedication and absorption in the work (engagement construct), combined with shared belief in the team's ability to succeed (team potency / collective efficacy) and pride and willingness to recommend the organisation (affective commitment). M1 consolidates the previously separate engagement, collective efficacy and affective commitment sub-dimensions on the basis that these constructs correlate empirically at r = 0.6–0.8 and measuring them separately produces noise rather than signal.

**Plain language.** Whether the people in this unit are energised by their work, confident their team can deliver, and proud to be part of it.

**Theoretical foundation.** Engagement: Kahn (1990), Schaufeli et al. (2002, UWES tradition), the Gallup Q12 engagement construct. Team potency / collective efficacy: Bandura, Guzzo et al. (1993). Affective commitment: Meyer and Allen (1991). Item wording in the Performance Equation Diagnostic Survey (MI1 module) is PerformanceVP proprietary. Cumulative evidence: Harter, Schmidt & Hayes (2002) with Gallup's cumulative Q12 meta-analysis (10th ed., 2020) — business-unit-level engagement relates consistently to unit productivity, profitability, retention and customer outcomes (the unit-level warrant for the unit-level claim and for the behavioural triangulators); Christian et al. (2011) on engagement's incremental validity for performance; Gully et al. (2002) and Stajkovic et al. (2009) on collective efficacy; Harrison, Newman & Roth (2006), the warrant for consolidating engagement, team confidence and commitment into one composite. The 50% weight reflects engagement holding the strongest unit-level outcome evidence of any motivation construct in the model.

### Weight

Default 50% of M. The high default weight reflects M1's role as the consolidated headline motivation construct.

Industry archetypes:

| Archetype | M1 weight |
|---|---|
| Default | 50% |
| Knowledge-intensive | 45% (Autonomous motivation M3 carries more weight in expert work) |
| Operations-heavy | 55% |
| Customer-facing service | 55% (engagement directly affects customer outcomes) |
| Public sector / regulated | 50% |
| Healthcare | 50% |

### Tier 1 sources

**Tier 1 acceptance criteria:** Existing engagement survey data where (a) the survey is from a recognised commercial platform with documented psychometric quality, (b) response rate ≥ 60% per unit, (c) vintage ≤ 12 months, (d) item coverage includes engagement, team confidence and pride/commitment constructs.

Acceptable platforms:

| Platform | Notes for Tier 1 acceptance |
|---|---|
| Culture Amp | Engagement composite, ≥ 60% response, ≤ 12 months |
| Glint / Microsoft Viva Glint | Engagement composite |
| Peakon (Workday) | Engagement composite |
| Qualtrics XM | Where engagement survey deployed with construct-aligned items |
| Aon Engagement | |
| WTW Engagement | |
| Korn Ferry Engagement | |
| Gallup Q12 | Where deployed; usable as Tier 1 even though items are unavailable to PerformanceVP |
| eNPS where measured at unit level | Use as supplementary; not sufficient alone |

### Tier 2 sources

| Platform | Conversion rule |
|---|---|
| Historical engagement-survey trend | Where current data is older than 12 months but trend is available |
| Engagement-survey items in a non-standard configuration | Cherry-pick items that map to engagement, team confidence and pride constructs; flag in methodology footer |
| Internal homegrown engagement surveys | Use where items are construct-aligned and response rate is acceptable; downward-adjust if item quality is uncertain |
| Retention awards, length-of-service patterns | Behavioural triangulator |

### Tier 3 — Performance Equation Diagnostic Survey, MI1 module

The MI1 module of the Performance Equation Diagnostic Survey is 8 items covering engagement (vigour, dedication, absorption), team confidence and pride/commitment. Items are in Survey Blueprint Part 3.1.

**Sub-dimension score calculated as:**

```
M1 score = ((mean of valid MI1 items, MI1-04 reverse-scored) − 1) × 25
```

### Behavioural triangulators

M1 is paired with behavioural data per the survey-behavioural gap rule. Triangulators:

| Triangulator | Calculation | Direction |
|---|---|---|
| Voluntary turnover | 12-month rolling voluntary turnover rate, unit-level | Lower = higher motivation |
| Unplanned absenteeism | Average unplanned absent days per FTE annually (excluding parental/medical) | Lower = higher motivation |
| Internal application rate | Internal job applications by unit members / FTE annually | Higher = higher motivation (active engagement with growth) |
| eNPS | Net promoter score for "would recommend this organisation" | Higher = higher motivation |
| Discretionary contribution proxies | Stretch goal acceptance rate, peer recognition rate, voluntary project participation | Higher = higher motivation |
| Goal achievement rate | % of unit-level goals achieved on time | Higher = higher motivation |
| Referral rate | New hires sourced via unit-member referral / total new hires | Higher = higher motivation |
| Rehire / alumni rate | Re-hires within 24 months / departures | Higher = higher motivation |

Triangulators are converted to a single 0–100 behavioural composite via a lookup table relating each metric to industry benchmark norms. The behavioural composite is compared to the M1 survey score; divergence > 15 points triggers the survey-behavioural gap flag (see Part 8 in Part 2 of this document).

### Operational conversion rule

The consultant records inputs in the workbook's "M1 Engagement and Confidence" section:

**Survey input:**

| Input | Description |
|---|---|
| Source identifier | Platform name and survey instance |
| Source vintage | Date of survey |
| Response rate | Respondents / FTE |
| Engagement composite score | 0–100, from platform or computed from MI1 module |
| Team confidence component | If platform breaks out separately; otherwise leave blank |
| Pride / commitment component | If platform breaks out separately; otherwise leave blank |
| M1 survey score | Where platform provides only composite, use composite; where MI1 used, computed from items |

**Behavioural triangulator input:**

| Input | Description |
|---|---|
| Voluntary turnover rate | 12-month rolling, unit-level |
| Absenteeism rate | Average unplanned absent days per FTE |
| eNPS | Where measured |
| Internal application rate | |
| Goal achievement rate | |
| Behavioural composite score | 0–100, computed via lookup table |

**Sub-dimension score:**

```
M1 = M1 survey score (the primary measurement)
M1 behavioural composite (for gap analysis)

Gap flag fires if |M1 survey - M1 behavioural composite| > 15
```

The behavioural composite does NOT replace or average with the survey score. It is reported alongside as a triangulator. Where the gap rule fires, both scores are reported separately with the divergence flagged as a diagnostic finding.

### Worked example

A Customer Service unit of 60 FTE. Tier 1 Culture Amp engagement survey, current, 78% response rate.

Survey input:
- Engagement composite from Culture Amp: 72 (their scale, already converted to 0–100)
- M1 survey score = 72

Behavioural triangulators:
- Voluntary turnover: 14% (industry norm 18%) → converted score 68
- Absenteeism: 5.2 days per FTE (industry norm 6) → converted score 60
- eNPS: 22 (industry norm 15) → converted score 68
- Goal achievement: 78% → converted score 68
- Behavioural composite (arithmetic mean): (68 + 60 + 68 + 68) / 4 = 66

Gap: |72 - 66| = 6 → no gap flag.

**Unit M1 = 72 (survey), behavioural composite 66, Tier 1 Culture Amp, Confidence: High, no gap flag.**

The interpretation: engagement is at a healthy level, with behavioural data corroborating the survey. Slight survey-over-behavioural reading (which is common; surveys tend to read 3–6 points higher than behavioural triangulators) but well within tolerance.

### Reporting threshold and confidence

M1 survey score requires ≥ 60% response rate per unit. Behavioural triangulators require at least 3 of the 4 primary triangulators (turnover, absenteeism, eNPS, goal achievement) to compute the behavioural composite.

Confidence per the cadence master:
- High for 3 months
- Medium at 4 months
- Low at 6 months
- Excluded from composite if last refresh > 12 months

## 3.2 M2 — Psychological safety

### Construct

**Definition.** Shared belief that the team is safe for interpersonal risk-taking. Willingness to speak up, raise concerns, disclose errors and engage in productive disagreement without fear of penalty. Includes elements of the task-conflict productive-disagreement construct (the former TSI-4) integrated here on the basis that psychological safety is operationally what enables productive conflict.

**Plain language.** Whether people on this team feel safe to raise concerns, admit mistakes, disagree with the group and challenge each other's thinking — without fear of being penalised or dismissed.

**Theoretical foundation.** Edmondson (1999) — the foundational construct. Edmondson and Lei (2014) — the consolidating review. Item wording in the Performance Equation Diagnostic Survey (MI2 module) is PerformanceVP proprietary but the construct measured is Edmondson's. Cumulative evidence: Frazier et al. (2017), meta-analysis of 136 samples (over 22,000 individuals, nearly 5,000 groups), that psychological safety predicts task performance, information sharing and learning behaviour with incremental validity at both individual and group levels — the warrant for a dedicated multi-item module rather than single-item engagement-survey proxies, and for the elevated healthcare weighting.

### Weight

Default 20% of M. Industry archetypes:

| Archetype | M2 weight |
|---|---|
| Default | 20% |
| Knowledge-intensive | 25% (psych safety central to expert collaboration) |
| Operations-heavy | 15% |
| Customer-facing service | 20% |
| Public sector / regulated | 20% |
| Healthcare | 30% (patient safety / clinical safety highly dependent on psych safety) |

### Tier 1 sources

**There is generally no Tier 1 source.** Psychological safety items in commercial engagement surveys are typically inadequate — usually a single item with low reliability, or items measuring adjacent constructs (e.g. respectful workplace, voice) rather than the psych safety construct itself.

Where a Tier 1 source exists, it is typically:

| Source | Tier 1 acceptance criteria |
|---|---|
| Engagement-survey psych-safety sub-scale | Where ≥ 4 items, alpha documented ≥ 0.75, construct-aligned to Edmondson definition |
| Targeted psych-safety survey (e.g. Edmondson-licensed deployment) | Where deployed with original instrument; rare in commercial practice |

### Tier 2 sources

| Source | Conversion rule |
|---|---|
| Single-item psych-safety in engagement survey | Use as triangulator only; not sufficient alone |
| Speak-up programme data | Aggregated speak-up volume, resolution time, reporter satisfaction; convert via lookup table |
| Error / near-miss disclosure rates | Where tracked; high disclosure correlates with psych safety in clinical/operational contexts |
| Grievance volume and resolution patterns | Disaggregated grievance type; relationship-conflict grievances are inverse signal |
| Retrospective data flagging psych-safety incidents | Coded post-mortems showing suppressed voice |

### Tier 3 — Performance Equation Diagnostic Survey, MI2 module

The MI2 module is 5 items measuring Edmondson-construct psychological safety. Items in Survey Blueprint Part 3.2.

**Sub-dimension score calculated as:**

```
M2 score = ((mean of valid MI2 items, MI2-05 reverse-scored) − 1) × 25
```

### Operational conversion rule

The consultant records inputs in the workbook's "M2 Psychological Safety" section:

| Input | Description |
|---|---|
| Source identifier | Platform / module |
| Source vintage | |
| Response rate | |
| M2 survey score | 0–100, computed from MI2 items |
| Speak-up programme volume | Triangulator |
| Speak-up resolution time (median) | Triangulator |
| Behavioural psych-safety signals | Documented incidents, near-miss disclosure rates if applicable |

**M2 score = M2 survey score** as the primary measurement, with behavioural signals reported as triangulators.

### Worked example

A Healthcare unit of 100 FTE. Engagement-survey psych safety sub-scale (3 items, alpha 0.62 — below Tier 1 threshold) so Tier 3 MI2 deployed alongside.

MI2 survey score (5 items): mean of (4.1 + 3.8 + 4.2 + 3.9 + reverse(2.0)) / 5 = (4.1 + 3.8 + 4.2 + 3.9 + 4.0) / 5 = 4.0
M2 score = (4.0 - 1) × 25 = 75

Triangulators:
- Speak-up programme: 12 reports in past 12 months, median resolution 18 days, reporter satisfaction 78%
- Patient incident near-miss disclosure: 142 disclosures in 12 months (high; industry norm for similar unit ~90)

**Unit M2 = 75, Tier 3 MI2 (with engagement-survey supplementary), Confidence: High.**

Interpretation: psychological safety at a healthy level, with above-norm near-miss disclosure corroborating that people in the unit feel safe to raise concerns about clinical risk.

### Reporting threshold and confidence

M2 survey requires ≥ 60% response rate per unit.

Confidence per the cadence master:
- High for 3 months
- Medium at 4 months
- Low at 6 months

## 3.3 M3 — Autonomous motivation

### Construct

**Definition.** Degree to which work is experienced as volitional and self-endorsed. Self-Determination Theory's autonomous motivation construct, comprising intrinsic motivation (the work is interesting in itself) and well-internalised extrinsic motivation (the work is valued for its meaning, not just for external reward). Distinguished from controlled motivation (working for external pressure, reward or to avoid sanction).

**Plain language.** Whether people in this unit are doing their work because they find it genuinely interesting and important to them — or mainly because they have to.

**Theoretical foundation.** Deci and Ryan (1985 onward) — Self-Determination Theory. Gagné and Deci (2005) — work-application of SDT. Gagné et al. (2015) — Multidimensional Work Motivation Scale (MWMS). Item wording in the Performance Equation Diagnostic Survey (MI3 module) is PerformanceVP proprietary but the construct measured is the SDT autonomous motivation construct. Cumulative evidence: Cerasoli, Nicklin & Ford (2014), a 40-year meta-analysis, that intrinsic motivation predicts performance with incremental validity over incentives and most strongly for quality of performance; Van den Broeck et al. (2016) on the need-satisfaction mechanism; Deci, Olafsen & Ryan (2017), consolidating review. The 15% weight avoids double-counting effect that flows through engagement (M1); the knowledge-intensive uplift follows the quality-of-performance moderator.

### Weight

Default 15% of M. Industry archetypes:

| Archetype | M3 weight |
|---|---|
| Default | 15% |
| Knowledge-intensive | 20% (autonomous motivation most predictive in expert work) |
| Operations-heavy | 10% |
| Customer-facing service | 15% |
| Public sector / regulated | 20% (purpose-driven work; autonomous motivation important) |
| Healthcare | 20% |

### Tier 1 sources

**There is generally no Tier 1 source.** SDT-aligned items are not standard in commercial engagement platforms.

Where a Tier 1 source exists:

| Source | Tier 1 acceptance criteria |
|---|---|
| MWMS deployment | Where deployed; commercial use requires permission from authors |
| Engagement-survey SDT sub-scale | Where alpha documented ≥ 0.75 and construct-aligned |

### Tier 2 sources

| Source | Conversion rule |
|---|---|
| Engagement-survey autonomy/interest items | Use where construct-aligned; downward-adjust 5% for non-SDT framing |
| Self-directed learning hours | LMS data on non-mandatory learning per FTE per year; triangulator |
| Innovation / idea submission rates | Where ideation platforms deployed; triangulator |
| Career conversation records | % of unit members with documented career conversations in past 12 months |

### Tier 3 — Performance Equation Diagnostic Survey, MI3 module

The MI3 module is 5 items measuring autonomous vs controlled motivation. Items in Survey Blueprint Part 3.3.

**Sub-dimension score calculated as:**

```
M3 score = ((mean of valid MI3 items, MI3-04 reverse-scored) − 1) × 25
```

### Operational conversion rule

The consultant records inputs in the workbook's "M3 Autonomous Motivation" section:

| Input | Description |
|---|---|
| Source identifier | Module / survey |
| Source vintage | |
| Response rate | |
| M3 survey score | 0–100, from MI3 items |
| Self-directed learning hours | Triangulator |
| Innovation idea submission rate | Triangulator |

### Worked example

An R&D unit of 50 FTE. Tier 3 MI3 deployed.

MI3 items (mean responses across 38 valid respondents, response rate 76%):
- MI3-01 (genuinely interesting): 4.2
- MI3-02 (aligned with values): 4.0
- MI3-03 (meaningful choice): 3.6
- MI3-04 (mainly because I have to — reverse): raw 2.1 → adjusted 3.9
- MI3-05 (sense of accomplishment): 4.3

Mean: (4.2 + 4.0 + 3.6 + 3.9 + 4.3) / 5 = 4.0
M3 score = (4.0 - 1) × 25 = 75

Triangulators:
- Self-directed learning hours: 48 hours per FTE per year (industry norm 30) → supports
- Innovation idea submission rate: 1.8 per FTE per year (industry norm 0.8) → supports

**Unit M3 = 75, Tier 3 MI3, Confidence: High.**

### Reporting threshold and confidence

M3 survey requires ≥ 60% response rate per unit.

Confidence per the cadence master:
- High for 12 months
- Medium at 14 months
- Low at 18 months

## 3.4 M4 — Purpose alignment

### Construct

**Definition.** Degree to which work is perceived as personally meaningful and aligned with personal values. Encompasses the work-meaning construct and values-congruence with the organisation.

**Plain language.** Whether people in this unit feel that what they do matters and aligns with what they personally care about.

**Theoretical foundation.** Steger, Dik and Duffy (2012) — work-meaning measurement (WAMI). Pratt and Ashforth (2003) and Rosso, Dekas & Wrzesniewski (2010) — work-meaning theory. Item wording in the Performance Equation Diagnostic Survey (MI4 module) is PerformanceVP proprietary. Cumulative evidence: Allan et al. (2019), meta-analysis (44 studies, over 23,000 people), that meaningful work correlates very strongly with engagement and commitment and modestly and indirectly with performance, with the best-fitting model running meaning → engagement → performance; Kristof-Brown, Zimmerman & Johnson (2005) on values congruence. The 15% weight and the pathway alongside a heavily weighted M1 mirror that structure — the evidence discipline the weights are built on.

### Weight

Default 15% of M. Industry archetypes:

| Archetype | M4 weight |
|---|---|
| Default | 15% |
| Knowledge-intensive | 15% |
| Operations-heavy | 10% |
| Customer-facing service | 15% |
| Public sector / regulated | 20% (mission-driven work) |
| Healthcare | 25% (vocation-driven work) |

### Tier 1 sources

Generally no Tier 1 source. Where available:

| Source | Tier 1 acceptance criteria |
|---|---|
| Engagement-survey purpose/meaning sub-scale | Where ≥ 3 items, construct-aligned |
| Values congruence survey | Where deployed with documented methodology |

### Tier 2 sources

| Source | Conversion rule |
|---|---|
| Single-item purpose/meaning in engagement survey | Triangulator, not sufficient alone |
| Internal values or culture survey | Where construct-aligned items exist |
| Exit-interview themes coded for purpose | Behavioural triangulator |
| CSR / community participation | Voluntary participation rate as supplementary signal |

### Tier 3 — Performance Equation Diagnostic Survey, MI4 module

The MI4 module is 4 items. Items in Survey Blueprint Part 3.4.

**Sub-dimension score calculated as:**

```
M4 score = ((mean of valid MI4 items, MI4-04 reverse-scored) − 1) × 25
```

### Operational conversion rule

The consultant records inputs in the workbook's "M4 Purpose Alignment" section:

| Input | Description |
|---|---|
| Source identifier | |
| Source vintage | |
| Response rate | |
| M4 survey score | 0–100, from MI4 items |
| Exit-interview purpose themes | % of recent exits citing lack of purpose; triangulator |

### Worked example

A Public Sector unit of 200 FTE. Tier 2 engagement-survey purpose sub-scale (Culture Amp, 3 construct-aligned items, alpha 0.81).

Purpose composite from Culture Amp: 71.

**Unit M4 = 71, Tier 2 Culture Amp purpose sub-scale, Confidence: High.**

### Reporting threshold and confidence

M4 survey requires ≥ 60% response rate per unit.

Confidence per the cadence master:
- High for 12 months
- Medium at 14 months
- Low at 18 months

## 3.5 Hygiene trip-wires

### Construct

**Definition.** Three single-item indicators that flag critical hygiene failures regardless of overall M score. They are not weighted into the M composite; they operate as independent critical-finding indicators. Reflect Herzberg's hygiene-factor logic — these are conditions that, if violated, produce dysfunction independent of motivator-level factors.

**Plain language.** Three "red line" checks: are people paid fairly, treated fairly, and given basic working conditions. If any of these fail, that's a critical finding regardless of what the other scores say.

**Theoretical foundation.** Herzberg's two-factor theory supplies the design intuition (the motivator-hygiene asymmetry) but the evidential weight rests on modern, robust sources: Adams (1965) equity theory; Colquitt et al. (2001, 2013), two meta-analyses across 25 years, that perceived fairness (distributive, procedural, interpersonal) predicts performance, citizenship, counterproductive behaviour and commitment; Christian et al. (2009), meta-analysis, on safety climate and conditions; Baumeister et al. (2001) on the negativity asymmetry (bad is stronger than good) — the empirical warrant for the non-compensatory design, since a hygiene failure cannot be averaged away by strengths elsewhere. WHS regulatory framework for the conditions trip-wire.

### The three trip-wires

| Trip-wire | Construct | Action threshold |
|---|---|---|
| **TW1 Pay equity** | Perceived pay fairness relative to comparable roles | Score < 60 = critical finding |
| **TW2 Fairness** | Perceived fair and respectful treatment regardless of background | Score < 60 = critical finding |
| **TW3 Basic conditions** | Adequate workspace, tools, safety and time to do the job | Score < 60 = critical finding |

### Tier 1 sources

| Source | What it gives |
|---|---|
| Pay equity audit results (Mercer, internal, or specialist provider) | Direct measure of TW1 structural component |
| WHS incident records, near-miss reports | TW3 structural triangulator |
| Fair treatment / discrimination grievance volume | TW2 structural triangulator |
| EEO and inclusion audit data | TW2 structural triangulator |

### Tier 2 sources

Engagement-survey items addressing pay fairness, fair treatment and basic conditions where present and construct-aligned.

### Tier 3 — Performance Equation Diagnostic Survey, trip-wire items

The three trip-wire items (TW-01, TW-02, TW-03) in the Performance Equation Diagnostic Survey. Items in Survey Blueprint Part 3.5.

**Trip-wire scoring (per trip-wire):**

```
Trip-wire score = ((mean response across valid respondents) − 1) × 25
```

### Operational conversion rule

The consultant records inputs in the workbook's "Trip-wires" section:

| Input | Description |
|---|---|
| TW1 Pay equity score | 0–100, from survey item TW-01 |
| TW2 Fairness score | 0–100, from survey item TW-02 |
| TW3 Basic conditions score | 0–100, from survey item TW-03 |
| Pay equity audit result | Tier 1 supporting evidence if available |
| WHS incident rate | Tier 1 supporting evidence if available |
| Fair-treatment grievance volume | Tier 1 supporting evidence if available |

**Critical finding logic:**

```
For each trip-wire:
  If score < 60: FLAG as critical finding
  Escalate to engagement lead and client sponsor
  Recommend immediate investigation (pay equity audit, fairness investigation, conditions remediation)
```

Trip-wires are reported on the client report as independent indicators alongside M, with critical findings highlighted in the executive summary regardless of overall M or P performance.

### Worked example

A Manufacturing unit of 120 FTE.

| Trip-wire | Score | Status |
|---|---|---|
| TW1 Pay equity | 72 | OK |
| TW2 Fairness | 78 | OK |
| TW3 Basic conditions | 54 | CRITICAL FINDING |

The TW3 critical finding triggers immediate escalation. The diagnostic report's executive summary features this as a top-priority finding requiring conditions remediation, independent of the unit's M composite (which may be 65 — apparently healthy but with hygiene degradation that requires action).

### Reporting threshold and confidence

Trip-wires require ≥ 60% response rate per unit per trip-wire.

Confidence per the cadence master:
- High for 3 months
- Medium at 4 months
- Low at 6 months

## 3.6 Motivation composite scoring

The Motivation composite is the weighted sum of the four sub-dimensions:

```
M = 0.50(M1) + 0.20(M2) + 0.15(M3) + 0.15(M4)
```

Trip-wires are NOT included in the M composite. They are reported as independent critical-finding indicators.

**Handling of missing sub-dimensions.** As with C: where a sub-dimension is reported as "insufficient data", its weight is reallocated proportionally to the remaining sub-dimensions, with the omission documented in the methodology footer.

**Industry archetype application.** The consultant selects the relevant archetype; the workbook applies the archetype's weights.

**Tier mix annotation.** As with C: composite tier rating documented in the methodology footer.

---

*End of Part 1 of 2. Part 2 (Opportunity, Synergy, DLP, Triangulation and Composite Scoring) to follow on review of this part.*
