# The Performance Equation
## Survey Blueprint and Item Bank

**Author:** Michael, PerformanceVP
**Status:** Working draft. Item-level specification for the Performance Equation Diagnostic Survey across all cadences.
**Last updated:** 21 September 2026 (O1, O2 and O3 scoring now say which value feeds the O composite when the audit-perception gap exceeds 15: the survey (perception) score, as Measurement Reference Part 2 section 8.1 and the Diagnostic Workbook require; the gap table in 7.7 says the same. Prior, 24 June 2026: survey platform confirmed as Google Forms, the interim platform, with reverse-scoring, validity exclusions and item-mean aggregation moved downstream to the Survey Processing and Scoring Workbook; added the non-identifying CII team-selector question so collective-intelligence responses can be grouped to team level under per-department links. Prior: 28 May 2026)
**Companion documents:** Performance Equation Strategy (master reference); Sub-Dimension × Cadence Master Reference; Diagnostic Delivery Handbook.

---

## Purpose of this document

This file specifies, at the item level, every survey item used across the Performance Equation Diagnostic. For each item it captures:

1. The sub-dimension it measures and the construct it taps.
2. The exact item wording.
3. The response scale.
4. The cadence tags (which surveys it appears in: baseline, quarterly pulse, half-yearly health check, annual refresh).
5. The scoring rules including reverse-scoring.
6. The item-rotation rules where applicable.

This is the operational source-of-truth for survey deployment. Survey platform configuration, reporting logic and dashboard mapping all derive from this document. (Delivery and platform choice are covered in Part 8.)

> **Source of truth.** This document owns item-level wording, scales and item-to-cadence tagging. The sub-dimension structure, the within-component weights and the refresh cadence themselves are owned by the Sub-Dimension × Cadence Master Reference; where they are repeated here, change them in the Cadence Master first and then propagate.

**Total item bank: 70 items at baseline / annual refresh, ~57 at half-yearly, ~16 at quarterly pulse.**

---

## How to read this document

**Item identification.** Each item carries a unique ID of the form `[SUB-DIM][NUMBER]` (e.g. CII-01, MI1-03, TW-02). IDs are stable across versions; new items get new IDs, retired items keep their IDs but are flagged.

**Cadence tags.** Each item is tagged with the cadences it appears in:

- **B** = Baseline (engagement onboarding)
- **Q** = Quarterly pulse
- **H** = Half-yearly health check
- **A** = Annual refresh

A tag of **B+H+A** means the item is in the baseline, half-yearly and annual but not the quarterly. A tag of **B+Q+H+A** means the item is in every cadence.

**Reverse-scored items** are marked with **(R)** in the item ID. Scoring formula: response score = 6 − raw response (on 5-point scale) or 8 − raw response (on 7-point scale).

**Response scale convention.** Unless otherwise noted, all items use the standard 5-point Likert scale:

> 1 = Strongly Disagree, 2 = Disagree, 3 = Neither Agree nor Disagree, 4 = Agree, 5 = Strongly Agree

This is converted to the 0–100 scoring scale by: `(mean response − 1) × 25`. A mean of 1 maps to 0; a mean of 5 maps to 100. Items requiring a different scale (e.g. frequency items, rank-order items) are flagged in their definition.

**Sub-dimension scoring.** Sub-dimension score = (mean of all valid items in that sub-dimension at the given cadence, after reverse-scoring, − 1) × 25, capped at 0–100.

**Reporting threshold.** Sub-dimension score requires minimum 60% response rate at the unit level for the relevant cadence (with additional thresholds per the Master Cadence Reference Part 7.4). Sub-dimension scores below this threshold are suppressed and reported as "insufficient response".

---

# Part 1 — Survey deployment summary

## 1.1 Cadence-by-cadence survey composition

| Cadence | Total items | Time per respondent | Composition |
|---|---|---|---|
| **Baseline (B)** | 70 | 12–15 min | All sub-dimension items, full bank |
| **Quarterly pulse (Q)** | 16 | 3–4 min | Fastest-moving sub-dimensions, rotating subsets |
| **Half-yearly health check (H)** | 42 | 8–10 min | Fast + medium-pace sub-dimensions, full sets for those |
| **Annual refresh (A)** | 70 | 12–15 min | Full bank, full sets for all sub-dimensions |

## 1.2 Items per sub-dimension by cadence

| Sub-dim | Construct | B | Q | H | A |
|---|---|---|---|---|---|
| **CII** | Collective intelligence (3 sub-constructs) | 15 | 1 | 15 | 15 |
| **MI1** | Engagement & confidence | 8 | 5 (rotating) | 8 | 8 |
| **MI2** | Psychological safety | 5 | 3 (rotating) | 5 | 5 |
| **MI3** | Autonomous motivation | 5 | — | — | 5 |
| **MI4** | Purpose alignment | 4 | — | — | 4 |
| **TW** | Hygiene trip-wires | 3 | 2 (rotating) | 3 | 3 |
| **OI1** | Clarity & decision rights | 8 | — | 5 (subset) | 8 |
| **OI2** | Tools & information | 4 | — | 4 | 4 |
| **OI3** | Process & workflow | 5 | — | 5 | 5 |
| **OI4** | Resource adequacy | 3 | — | 3 | 3 |
| **OI5** | Leadership enablement | 3 | 3 | 3 | 3 |
| **TSI2** | Collaboration friction | 3 | 3 | 3 | 3 |
| **TSI3** | Conflict health | 5 | — | 3 (subset) | 5 |
| **C-other** | C1, C2, C3, C5 system data only | (no survey items — uses HRIS, LMS, performance ratings, DORA, etc.) |
| **S1** | Skill complementarity (analytical) | (no survey items — uses C1 data analytically) |
| **TOTAL** | | **70** | **17** | **57** | **70** |

*Note: Total Q is 17 not 16 due to the rounded counts in the table; the actual deployed quarterly pulse is 16 items because the CII-Q item is administered only to a sub-sample of teams per quarter on a rotating basis (see Part 2). The half-yearly is 57, not 42 as previously stated — this is the more accurate count once items per sub-dimension are specified at the granular level. The earlier 42 figure was indicative; the precise count surfaces as the blueprint is built out.*

**Revised cadence load with precise item counts:**

| Cadence | Items | Approx time |
|---|---|---|
| Baseline / Annual | 70 | 12–15 min |
| Half-yearly | 57 | 10–12 min |
| Quarterly pulse | 16 (one rotating CII item every 4 quarters) | 3–4 min |

This is still well within tolerance for the stated cadence model. The half-yearly is denser than the indicative figure but still under 12 minutes, which is the operational ceiling for half-yearly cadence.

## 1.3 Survey deployment principles

**One survey, one brand.** Respondents see a single "Performance Equation Diagnostic Survey" (or "Pulse" / "Health Check" depending on cadence). The internal modular structure is invisible to the respondent — items are interleaved by topic flow, not grouped by sub-dimension code.

**Section headings.** Items group under three respondent-facing section headings: "About your team and work", "About your role and environment", "About your motivation and experience". Sub-dimension boundaries do not appear in the survey itself.

**Anti-patterning measures.** Reverse-scored items embedded across each sub-dimension. Item rotation across quarters where bank size permits (M1, M2, trip-wires). Attention-check rule applies (response excluded if reverse-scored item agrees in direction with forward items on the same sub-dimension).

**Anonymity protocol.** All responses anonymous at individual level. Reporting at unit aggregate only. Validity thresholds per the Master Cadence Reference: minimum 4 valid respondents per team for CII; minimum 12 valid respondents per unit for quarterly pulse; minimum 8 per unit for half-yearly; standard 60% response rate per unit for baseline and annual.

**Survey window.** Two weeks for baseline and annual; one week for half-yearly; five days for quarterly pulse. Reminders sent on days 4, 8, 11 for the longer windows; days 2, 4 for the pulse.

---

# Part 2 — Capability (C): CII item bank

The Capability component sources four of its five sub-dimensions (C1, C2, C3, C5) from system data and structured assessments rather than survey items. Only C4 (Collective Intelligence) uses survey items, through the PerformanceVP CII.

## 2.1 CII — Collective Intelligence Index (C4)

**Construct:** Transactive memory system, comprising Expertise Clarity (specialisation), Expertise Trust (credibility) and Expertise Flow (coordination).

**Theoretical foundation:** Wegner (1987); Ren and Argote (2011). Item wording is PerformanceVP proprietary.

**Cadence:** Baseline, Half-yearly, Annual. One Expertise Flow item rotates through the Quarterly pulse as a leading indicator.

**Reporting threshold:** Team-level. Minimum 4 valid respondents per team and 70% response rate per team for valid team score. Unit C4 = FTE-weighted average of constituent team scores. Because the per-department link encodes the unit and not the team (Part 8.1a), the main survey carries a single non-identifying team-selector question ("Which team are you part of?", options drawn from the unit's team list) so CII responses can be grouped by team for the team-level threshold and the FTE-weighted roll-up. The selector groups CII responses only; where a team falls below the 4-respondent threshold it rolls up to its parent per the existing small-group rule (Parts 1.3 and 6.3), which also protects anonymity for small teams.

### 2.1.1 Expertise Clarity items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| CII-01 | Our team has a clear understanding of who the subject matter experts are for different aspects of our work. | B+H+A | |
| CII-02 | When I need specific expertise, I know exactly who on the team to go to. | B+H+A | |
| CII-03 | Team members openly acknowledge their areas of strength and the areas where others know more. | B+H+A | |
| CII-04 | We make good use of the different expertise across our team. | B+H+A | |
| CII-05 | When a new problem arises, it is often unclear who has the relevant knowledge to address it. | B+H+A | **(R)** |

**Sub-construct scoring.** Expertise Clarity score = ((mean of CII-01 through CII-05, with CII-05 reverse-scored) − 1) × 25.

### 2.1.2 Expertise Trust items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| CII-06 | I trust the work my team members produce without needing to second-guess it. | B+H+A | |
| CII-07 | When a colleague gives me information or advice, I act on it with confidence. | B+H+A | |
| CII-08 | We openly trust each other's professional judgement on complex issues. | B+H+A | |
| CII-09 | Our team treats each other's expertise as reliable and authoritative. | B+H+A | |
| CII-10 | I often feel I need to verify my colleagues' work before relying on it. | B+H+A | **(R)** |

**Sub-construct scoring.** Expertise Trust score = ((mean of CII-06 through CII-10, with CII-10 reverse-scored) − 1) × 25.

### 2.1.3 Expertise Flow items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| CII-11 | Information moves across our team without bottlenecks. | B+H+A | |
| CII-12 | Our team combines individual knowledge into collective output smoothly. | B+H+A | |
| CII-13 | We adapt quickly to new challenges because we know how to draw on each other's strengths. | B+H+A+Q* | |
| CII-14 | Coordinating expertise across our team feels effortless rather than forced. | B+H+A | |
| CII-15 | It often takes too long to bring the right people and information together to solve a problem. | B+H+A | **(R)** |

*CII-13 rotates through the quarterly pulse as the single CII early-warning indicator. Other CII items appear only at half-yearly and above.*

**Sub-construct scoring.** Expertise Flow score = ((mean of CII-11 through CII-15, with CII-15 reverse-scored) − 1) × 25.

### 2.1.4 C4 composite

> C4 = 0.35 × Expertise_Clarity + 0.35 × Expertise_Trust + 0.30 × Expertise_Flow

### 2.1.5 Attention check rule

If a respondent's reverse-scored item (CII-05, CII-10 or CII-15) agrees in direction with the forward-scored items on the same sub-construct (e.g. CII-05 ≥ 4 paired with CII-01 through CII-04 also ≥ 4), the response is flagged as inattentive and excluded from the team aggregate.

---

# Part 3 — Motivation (M) item bank

## 3.1 MI1 — Engagement and confidence (M1)

**Construct:** Consolidated engagement, team confidence and pride composite. Merges the former engagement (Gallup Q12 / UWES construct), team potency (Guzzo et al.) and affective commitment (Meyer-Allen) into one composite, on the basis these correlate at r = 0.6–0.8 empirically.

**Cadence:** Baseline, Quarterly pulse (5 rotating items), Half-yearly, Annual.

**Item bank: 8 items**, of which 5 rotate into the quarterly pulse on a rotation pattern.

### 3.1.1 Engagement items (vigour, dedication, absorption)

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| MI1-01 | I look forward to coming to work most days. | B+Q*+H+A | |
| MI1-02 | I am willing to put in extra effort when my team needs it. | B+Q*+H+A | |
| MI1-03 | When I'm working, time tends to fly by. | B+H+A | |
| MI1-04 | I often feel drained or disengaged at work. | B+Q*+H+A | **(R)** |

### 3.1.2 Team confidence items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| MI1-05 | I am confident our team can deliver on the goals we've been set. | B+Q*+H+A | |
| MI1-06 | When our team faces tough problems, we find a way through them. | B+H+A | |

### 3.1.3 Pride and commitment items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| MI1-07 | I'd recommend this organisation as a good place to work. | B+Q*+H+A | |
| MI1-08 | I feel proud to be part of this team and organisation. | B+H+A | |

### 3.1.4 Rotation rule for quarterly pulse

5 items appear in each quarterly pulse, rotating across the 8-item bank:

| Quarter | Items in pulse |
|---|---|
| Q1 | MI1-01, MI1-02, MI1-04, MI1-05, MI1-07 |
| Q2 | MI1-01, MI1-03, MI1-04, MI1-05, MI1-08 |
| Q3 | MI1-02, MI1-03, MI1-05, MI1-06, MI1-07 |
| Q4 | MI1-01, MI1-02, MI1-04, MI1-06, MI1-08 |

Each item appears in at least 2 quarters per year; MI1-05 (the team-confidence anchor) appears in 3 of 4 quarters to preserve cross-quarter comparability on a stable anchor.

### 3.1.5 M1 scoring

M1 score = ((mean of all valid items at the given cadence, with reverse-scored items adjusted) − 1) × 25.

---

## 3.2 MI2 — Psychological safety (M2)

**Construct:** Edmondson-construct psychological safety with original PerformanceVP wording. Includes 2 items integrating the task-conflict productive-disagreement aspect formerly in TSI-4, on the basis that psych safety is operationally what enables productive conflict.

**Cadence:** Baseline, Quarterly pulse (3 rotating items), Half-yearly, Annual.

**Item bank: 5 items**.

### 3.2.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| MI2-01 | On our team, people can raise concerns or disagreements without fear of being penalised. | B+Q*+H+A | |
| MI2-02 | If I make a mistake at work, I feel safe disclosing it so we can fix it and learn. | B+Q*+H+A | |
| MI2-03 | Our team discusses difficult issues openly rather than avoiding them. | B+Q*+H+A | |
| MI2-04 | I can voice an opinion that goes against the group view without it damaging my standing. | B+H+A | |
| MI2-05 | People on this team often get punished or dismissed for raising problems. | B+H+A | **(R)** |

### 3.2.2 Rotation rule for quarterly pulse

3 items appear in each quarterly pulse, rotating across the 5-item bank:

| Quarter | Items in pulse |
|---|---|
| Q1 | MI2-01, MI2-02, MI2-03 |
| Q2 | MI2-01, MI2-02, MI2-04 |
| Q3 | MI2-02, MI2-03, MI2-05 |
| Q4 | MI2-01, MI2-03, MI2-04 |

MI2-01 and MI2-02 appear in 3 of 4 quarters as the most actionable items.

### 3.2.3 M2 scoring

M2 score = ((mean of valid items, with MI2-05 reverse-scored) − 1) × 25.

---

## 3.3 MI3 — Autonomous motivation (M3)

**Construct:** Self-Determination Theory autonomous motivation (intrinsic + well-internalised extrinsic motivation). Theoretical foundation: Deci and Ryan / Gagné MWMS; item wording is PerformanceVP proprietary.

**Cadence:** Baseline, Annual only.

**Item bank: 5 items**.

### 3.3.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| MI3-01 | I do my work because I find it genuinely interesting. | B+A | |
| MI3-02 | The work I do aligns with what I personally value as important. | B+A | |
| MI3-03 | I have meaningful choice in how I do my work. | B+A | |
| MI3-04 | I do my work mainly because I have to, not because I want to. | B+A | **(R)** |
| MI3-05 | When I do my work well, I feel a sense of personal accomplishment from it. | B+A | |

### 3.3.2 M3 scoring

M3 score = ((mean of valid items, with MI3-04 reverse-scored) − 1) × 25.

---

## 3.4 MI4 — Purpose alignment (M4)

**Construct:** Work-meaning and values congruence. Theoretical foundation: Steger et al. (2012). Item wording is PerformanceVP proprietary.

**Cadence:** Baseline, Annual only.

**Item bank: 4 items**.

### 3.4.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| MI4-01 | My work has personal meaning for me. | B+A | |
| MI4-02 | The purpose of this organisation is something I can stand behind. | B+A | |
| MI4-03 | What I do at work matters in a broader sense, beyond the immediate task. | B+A | |
| MI4-04 | I struggle to see why what we do really matters. | B+A | **(R)** |

### 3.4.2 M4 scoring

M4 score = ((mean of valid items, with MI4-04 reverse-scored) − 1) × 25.

---

## 3.5 TW — Hygiene trip-wires

**Construct:** Three single-item indicators flagging critical hygiene failures (pay equity, fairness, basic conditions). Operate as critical-finding overlays rather than weighted contributors to M. Replaces the former M7 sub-dimension.

**Cadence:** Baseline, Quarterly pulse (2 rotating items), Half-yearly, Annual.

**Item bank: 3 items.**

### 3.5.1 Items

| ID | Item | Cadence | Reverse | Action threshold |
|---|---|---|---|---|
| TW-01 | I am paid fairly for the work I do compared to others in similar roles. | B+Q*+H+A | | Score <60 → critical finding |
| TW-02 | People in this team are treated fairly and respectfully regardless of their background. | B+Q*+H+A | | Score <60 → critical finding |
| TW-03 | I have the basic working conditions (workspace, tools, safety, time) I need to do my job. | B+Q*+H+A | | Score <60 → critical finding |

### 3.5.2 Rotation rule for quarterly pulse

2 of 3 trip-wires appear in each quarterly pulse, rotating so each is checked at least twice per year:

| Quarter | Items in pulse |
|---|---|
| Q1 | TW-01, TW-02 |
| Q2 | TW-02, TW-03 |
| Q3 | TW-03, TW-01 |
| Q4 | TW-01, TW-02 |

### 3.5.3 Trip-wire scoring and action logic

Trip-wires do not contribute to the M composite score. They produce three independent indicator values, each reported separately on the dashboard alongside M.

Score per trip-wire = ((mean response on the item) − 1) × 25.

Score <60 on any trip-wire = critical finding. Triggers immediate escalation to engagement lead and client sponsor, regardless of overall M score.

---

# Part 4 — Opportunity (O) item bank

## 4.1 OI1 — Clarity and decision rights (O1)

**Construct:** Consolidated coverage of decision-rights distribution, role clarity, and strategic-alignment cascade. Merged from former O1, O5, O6 on the basis these constructs correlate heavily and respondents experience them as one question — "do I know what I'm meant to do, what I'm authorised to decide, and how my work connects up?"

**Cadence:** Baseline, Half-yearly (5-item subset), Annual.

**Item bank: 8 items**.

### 4.1.1 Role clarity items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI1-01 | I am clear on what is expected of me in my role. | B+H+A | |
| OI1-02 | I know how my performance is evaluated and what success looks like in my role. | B+H+A | |
| OI1-03 | I often receive conflicting instructions about what I should be doing. | B+A | **(R)** |

### 4.1.2 Decision-rights items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI1-04 | I have the authority I need to make decisions about my own work. | B+H+A | |
| OI1-05 | It's clear in this team who has authority to make which decisions. | B+H+A | |
| OI1-06 | Decisions that should be made quickly often get held up needing extra approvals. | B+A | **(R)** |

### 4.1.3 Strategic cascade items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI1-07 | I understand how my work connects to the organisation's strategic priorities. | B+H+A | |
| OI1-08 | The goals my team is working towards are clearly linked to the broader organisation's goals. | B+A | |

### 4.1.4 Half-yearly subset

The 5 items at half-yearly cadence are: **OI1-01, OI1-02, OI1-04, OI1-05, OI1-07**. The 3 reverse-scored or higher-grain items (OI1-03, OI1-06, OI1-08) appear at baseline and annual only.

### 4.1.5 O1 scoring

O1 survey score = ((mean of valid items at the given cadence, with reverse items adjusted) − 1) × 25.

O1 composite combines the survey score with the Clarity audit score (run at baseline and annual). Where the two diverge by more than 15 points, this is reported as a key diagnostic finding rather than averaged. Default composite: O1 = (Survey + Audit) / 2 where the gap is ≤15 points; where the gap exceeds 15, both are reported separately with the divergence flagged, and the survey (perception) score is the value that feeds the O composite. Both scores are required; if either is missing, O1 is reported as insufficient data.

---

## 4.2 OI2 — Tools and information (O2)

**Construct:** Fit-for-purpose technology, systems and data access.

**Cadence:** Baseline, Half-yearly, Annual.

**Item bank: 4 items**.

### 4.2.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI2-01 | I have the tools and systems I need to do my work effectively. | B+H+A | |
| OI2-02 | I can get the information and data I need to do my work without unreasonable delay. | B+H+A | |
| OI2-03 | The tools we use work well together rather than against each other. | B+H+A | |
| OI2-04 | I often have to use workarounds because our systems don't do what I need them to. | B+H+A | **(R)** |

### 4.2.2 O2 scoring

O2 survey score = ((mean of valid items, with OI2-04 reverse-scored) − 1) × 25.

O2 composite combines survey with the Tools and Information Audit score; same gap-flag rule as O1. Where the gap exceeds 15, the O2 survey (perception) score feeds the O composite.

---

## 4.3 OI3 — Process and workflow (O3)

**Construct:** Friction-free flow of work, cycle times, rework, value-adding versus non-value-adding steps.

**Cadence:** Baseline, Half-yearly, Annual.

**Item bank: 5 items**.

### 4.3.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI3-01 | The processes we use to get work done are clear and easy to follow. | B+H+A | |
| OI3-02 | Work moves through our team without getting stuck in unnecessary steps or approvals. | B+H+A | |
| OI3-03 | I spend an appropriate amount of my time on the work that actually matters, not on admin or rework. | B+H+A | |
| OI3-04 | When something goes wrong, we have a clear way to fix it without making the whole process slow. | B+H+A | |
| OI3-05 | A lot of the work I do feels like duplicate effort or rework. | B+H+A | **(R)** |

### 4.3.2 O3 scoring

O3 survey score = ((mean of valid items, with OI3-05 reverse-scored) − 1) × 25.

O3 composite combines survey with the Process Friction Audit; same gap-flag rule as O1. Where the gap exceeds 15, the O3 survey (perception) score feeds the O composite.

---

## 4.4 OI4 — Resource adequacy (O4)

**Construct:** Whether the unit has time, headcount and budget proportionate to demand. Workload-capacity fit.

**Cadence:** Baseline, Half-yearly, Annual.

**Item bank: 3 items**.

### 4.4.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI4-01 | I have enough time to do my work to the standard expected. | B+H+A | |
| OI4-02 | Our team has the resources (people, budget, capacity) it needs to deliver what's being asked. | B+H+A | |
| OI4-03 | I regularly have to work outside normal hours just to keep up with my workload. | B+H+A | **(R)** |

### 4.4.2 O4 scoring

O4 survey score = ((mean of valid items, with OI4-03 reverse-scored) − 1) × 25.

O4 composite combines survey with the capacity analysis from HRIS / workforce planning data; behavioural triangulators include overtime, after-hours collaboration, backlog growth, sick leave clustering.

---

## 4.5 OI5 — Leadership enablement (O5)

**Construct:** Degree to which managers unblock rather than block their teams. Direct-report perception of manager enabling behaviours. Consolidates the former O7 with the leadership component of C6.

**Cadence:** Baseline, Quarterly pulse, Half-yearly, Annual.

**Item bank: 3 items**.

### 4.5.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| OI5-01 | My manager helps me remove obstacles that are getting in the way of my work. | B+Q+H+A | |
| OI5-02 | My manager backs my decisions and gives me appropriate latitude to act. | B+Q+H+A | |
| OI5-03 | My manager actively makes our team's work easier rather than harder. | B+Q+H+A | |

### 4.5.2 O5 scoring

O5 score = ((mean of all 3 items) − 1) × 25.

O5 is leader-attributable. When new manager events trigger off-cycle refresh, the score is recomputed for the affected team within the unit and the unit-level O5 updates accordingly.

---

# Part 5 — Synergy (S) item bank

## 5.1 TSI2 — Collaboration friction (S2)

**Construct:** Meeting overload, handoff failures, rework, fragmented time, coordination cost.

**Cadence:** Baseline, Quarterly pulse, Half-yearly, Annual.

**Item bank: 3 items**.

### 5.1.1 Items

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| TSI2-01 | Our team has enough uninterrupted time to focus on meaningful work. | B+Q+H+A | |
| TSI2-02 | Handoffs between our team and other groups work smoothly. | B+Q+H+A | |
| TSI2-03 | I spend too much of my week in meetings that don't really need me. | B+Q+H+A | **(R)** |

### 5.1.2 S2 scoring

S2 survey score = ((mean of all 3 items, with TSI2-03 reverse-scored) − 1) × 25.

S2 composite combines survey with Workplace Analytics / collaboration telemetry where available. Behavioural data signals: meeting hours per week, fragmented-time ratio, after-hours collaboration volume.

---

## 5.2 TSI3 — Conflict health (S3)

**Construct:** Ratio of constructive task conflict to destructive relationship conflict. Drawn from De Dreu and Weingart meta-analytic distinction; item wording is PerformanceVP proprietary.

**Cadence:** Baseline, Half-yearly (3-item subset), Annual.

**Item bank: 5 items**, 3 measuring task conflict (productive disagreement on work content) and 2 measuring relationship conflict (interpersonal friction).

### 5.2.1 Task conflict items (constructive — higher is better)

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| TSI3-01 | On our team, we challenge each other's ideas openly when we disagree about how to do the work. | B+H+A | |
| TSI3-02 | When we have different opinions about how to approach a problem, we debate them productively. | B+H+A | |
| TSI3-03 | Our team is comfortable having robust discussions about work decisions. | B+A | |

### 5.2.2 Relationship conflict items (destructive — higher is worse, reverse-scored)

| ID | Item | Cadence | Reverse |
|---|---|---|---|
| TSI3-04 | There is real interpersonal friction or animosity on our team. | B+H+A | **(R)** |
| TSI3-05 | Personality clashes affect how well our team gets work done. | B+A | **(R)** |

### 5.2.3 Half-yearly subset

The 3 items at half-yearly are **TSI3-01, TSI3-02, TSI3-04** — one core item from each construct dimension plus the most operationally responsive item. The remaining 2 items (TSI3-03, TSI3-05) refresh at baseline and annual only.

### 5.2.4 S3 scoring

S3 score = ((mean of valid items, with TSI3-04 and TSI3-05 reverse-scored) − 1) × 25.

A high S3 score requires both high task conflict (productive debate) AND low relationship conflict (low interpersonal friction). The scoring approach treats these symmetrically through reverse-scoring on the relationship conflict items.

**Critical pattern flag.** Where TSI3-01 and TSI3-02 score below 60 (suppressed task conflict) AND MI2 (psychological safety) scores above 75, this is flagged as a "false consensus" pattern — apparent safety masking suppressed disagreement. This is a meaningful diagnostic finding and is reported separately.

---

# Part 6 — Survey assembly and respondent flow

## 6.1 Baseline / Annual survey (70 items, full assembly)

The respondent first answers a single non-identifying team-selector question ("Which team are you part of?", options drawn from the unit's team list), used only to group CII responses to team level for the team-level threshold and the FTE-weighted roll-up (Part 2.1). It is not scored. The respondent then sees three sections, in this order:

### Section A — About your team and work (CII + TSI2 + TSI3 + parts of OI1)

| Order | Item ID | Source sub-dim |
|---|---|---|
| 1 | CII-01 | Expertise Clarity |
| 2 | CII-02 | Expertise Clarity |
| 3 | CII-06 | Expertise Trust |
| 4 | CII-07 | Expertise Trust |
| 5 | CII-11 | Expertise Flow |
| 6 | CII-12 | Expertise Flow |
| 7 | TSI2-01 | Collaboration friction |
| 8 | TSI2-02 | Collaboration friction |
| 9 | TSI3-01 | Conflict health (task) |
| 10 | TSI3-02 | Conflict health (task) |
| 11 | CII-03 | Expertise Clarity |
| 12 | CII-04 | Expertise Clarity |
| 13 | CII-08 | Expertise Trust |
| 14 | CII-09 | Expertise Trust |
| 15 | CII-13 | Expertise Flow |
| 16 | CII-14 | Expertise Flow |
| 17 | TSI2-03 (R) | Collaboration friction |
| 18 | TSI3-03 | Conflict health (task) |
| 19 | TSI3-04 (R) | Conflict health (relationship) |
| 20 | TSI3-05 (R) | Conflict health (relationship) |
| 21 | CII-05 (R) | Expertise Clarity |
| 22 | CII-10 (R) | Expertise Trust |
| 23 | CII-15 (R) | Expertise Flow |

### Section B — About your role and environment (OI1 + OI2 + OI3 + OI4 + OI5)

| Order | Item ID | Source sub-dim |
|---|---|---|
| 24 | OI1-01 | Role clarity |
| 25 | OI1-02 | Role clarity |
| 26 | OI1-04 | Decision rights |
| 27 | OI1-05 | Decision rights |
| 28 | OI1-07 | Strategic cascade |
| 29 | OI1-08 | Strategic cascade |
| 30 | OI1-03 (R) | Role clarity |
| 31 | OI1-06 (R) | Decision rights |
| 32 | OI2-01 | Tools & information |
| 33 | OI2-02 | Tools & information |
| 34 | OI2-03 | Tools & information |
| 35 | OI2-04 (R) | Tools & information |
| 36 | OI3-01 | Process |
| 37 | OI3-02 | Process |
| 38 | OI3-03 | Process |
| 39 | OI3-04 | Process |
| 40 | OI3-05 (R) | Process |
| 41 | OI4-01 | Resource adequacy |
| 42 | OI4-02 | Resource adequacy |
| 43 | OI4-03 (R) | Resource adequacy |
| 44 | OI5-01 | Leadership enablement |
| 45 | OI5-02 | Leadership enablement |
| 46 | OI5-03 | Leadership enablement |

### Section C — About your motivation and experience (MI1 + MI2 + MI3 + MI4 + TW)

| Order | Item ID | Source sub-dim |
|---|---|---|
| 47 | MI1-01 | Engagement |
| 48 | MI1-02 | Engagement |
| 49 | MI1-03 | Engagement |
| 50 | MI1-05 | Team confidence |
| 51 | MI1-06 | Team confidence |
| 52 | MI1-07 | Pride & commitment |
| 53 | MI1-08 | Pride & commitment |
| 54 | MI1-04 (R) | Engagement |
| 55 | MI2-01 | Psych safety |
| 56 | MI2-02 | Psych safety |
| 57 | MI2-03 | Psych safety |
| 58 | MI2-04 | Psych safety |
| 59 | MI2-05 (R) | Psych safety |
| 60 | MI3-01 | Autonomous motivation |
| 61 | MI3-02 | Autonomous motivation |
| 62 | MI3-03 | Autonomous motivation |
| 63 | MI3-05 | Autonomous motivation |
| 64 | MI3-04 (R) | Autonomous motivation |
| 65 | MI4-01 | Purpose |
| 66 | MI4-02 | Purpose |
| 67 | MI4-03 | Purpose |
| 68 | MI4-04 (R) | Purpose |
| 69 | TW-01 | Pay equity trip-wire |
| 70 | TW-02 | Fairness trip-wire |
| 71 | TW-03 | Conditions trip-wire |

*Note: 71 line items here because trip-wires were inadvertently counted separately above; total active scored items remain 70 for sub-dimension scoring, with the 3 trip-wires reported as independent indicators. For respondent purposes, the survey is 70–71 items presented as a single flow.*

### Section flow guidance for the platform

- Items should be presented one screen at a time, or in groups of 3–5 per screen, with the section heading visible.
- Reverse-scored items are interleaved (not clustered) to detect inattentive responding.
- Section A starts with the team-focused items (CII Clarity) because they are the most concrete and easiest to respond to — easing the respondent into the survey.
- Section C ends with trip-wires because they are the most sensitive items; placing them at the end means a respondent who quits early is less likely to have answered them, which protects against false-positive low scores from incomplete responses.

## 6.2 Half-yearly health check (57 items, subset)

The half-yearly survey is a subset of the baseline. Items appearing at half-yearly are tagged with **H** in the cadence column above. Section structure is preserved.

### Section A (Half-yearly) — About your team and work (~21 items)

CII full set (15 items) + TSI2 full set (3 items) + TSI3 subset (3 items: TSI3-01, TSI3-02, TSI3-04).

### Section B (Half-yearly) — About your role and environment (~18 items)

OI1 subset (5 items: OI1-01, OI1-02, OI1-04, OI1-05, OI1-07) + OI2 full set (4 items) + OI3 full set (5 items) + OI4 full set (3 items) + OI5 full set (3 items).

### Section C (Half-yearly) — About your motivation and experience (~18 items)

MI1 full set (8 items) + MI2 full set (5 items) + 3 trip-wires + (MI3 and MI4 skipped at half-yearly).

*Note: actual half-yearly count comes out at 56–57 items depending on whether MI3 and MI4 are completely skipped or partially included; current spec skips them entirely on the basis they are slow-moving annual-cadence constructs.*

## 6.3 Quarterly pulse (16 items, rotating)

The quarterly pulse is the fastest cadence and the most carefully designed for low respondent load.

### Pulse composition per quarter

| Sub-dim | Items in pulse | Notes |
|---|---|---|
| CII (Expertise Flow only) | 1 (CII-13) | Single early-warning indicator |
| MI1 Engagement & confidence | 5 (rotating from 8-item bank) | See rotation pattern in 3.1.4 |
| MI2 Psychological safety | 3 (rotating from 5-item bank) | See rotation pattern in 3.2.2 |
| TW Trip-wires | 2 (rotating from 3) | See rotation pattern in 3.5.2 |
| OI5 Leadership enablement | 3 (all 3 items) | No rotation, small bank |
| TSI2 Collaboration friction | 3 (all 3 items) | No rotation, small bank |
| **TOTAL** | **17 items** (16 with the 4-quarter CII rotation handled at unit level) | |

### Pulse rotation matrix (worked example — what each quarter contains)

**Q1 pulse (17 items):**

1. CII-13 (Expertise Flow)
2. MI1-01, MI1-02, MI1-04 (R), MI1-05, MI1-07 (Engagement & confidence)
3. MI2-01, MI2-02, MI2-03 (Psych safety)
4. TW-01, TW-02 (trip-wires)
5. OI5-01, OI5-02, OI5-03 (Leadership enablement)
6. TSI2-01, TSI2-02, TSI2-03 (R) (Collaboration friction)

**Q2 pulse (17 items):**

1. CII-13 (Expertise Flow) — *or rotated to another unit*
2. MI1-01, MI1-03, MI1-04 (R), MI1-05, MI1-08 (Engagement & confidence)
3. MI2-01, MI2-02, MI2-04 (Psych safety)
4. TW-02, TW-03 (trip-wires)
5. OI5-01, OI5-02, OI5-03 (Leadership enablement)
6. TSI2-01, TSI2-02, TSI2-03 (R) (Collaboration friction)

**Q3 pulse (17 items):**

1. CII-13 (Expertise Flow)
2. MI1-02, MI1-03, MI1-05, MI1-06, MI1-07 (Engagement & confidence)
3. MI2-02, MI2-03, MI2-05 (R) (Psych safety)
4. TW-03, TW-01 (trip-wires)
5. OI5-01, OI5-02, OI5-03 (Leadership enablement)
6. TSI2-01, TSI2-02, TSI2-03 (R) (Collaboration friction)

**Q4 pulse (17 items):**

1. CII-13 (Expertise Flow)
2. MI1-01, MI1-02, MI1-04 (R), MI1-06, MI1-08 (Engagement & confidence)
3. MI2-01, MI2-03, MI2-04 (Psych safety)
4. TW-01, TW-02 (trip-wires)
5. OI5-01, OI5-02, OI5-03 (Leadership enablement)
6. TSI2-01, TSI2-02, TSI2-03 (R) (Collaboration friction)

### Pulse anonymity threshold

Pulse reporting requires minimum 12 valid respondents per unit per pulse cycle. Units below this threshold roll up to a parent department/function for pulse reporting.

---

# Part 7 — Scoring algorithm

## 7.1 Item-level scoring

For each item:

- If forward-scored: response value used directly (1–5 scale).
- If reverse-scored: response value adjusted to (6 − raw response).
- Non-responses (skipped items) excluded from the sub-dimension mean calculation.

## 7.2 Sub-dimension scoring

For each sub-dimension at a given cadence:

```
sub_dim_score = (mean(adjusted_item_responses) − 1) × 25
```

Sub-dimension score is on a 0–100 scale. Minimum 60% of items must have valid responses for the sub-dimension score to be reported; otherwise it is suppressed and flagged as "insufficient response".

## 7.3 Component scoring (C, M, O)

For each component, the composite is the weighted sum of its sub-dimension scores using the weights specified in the Master Cadence Reference:

```
C = 0.35(C1) + 0.15(C2) + 0.20(C3) + 0.20(C4) + 0.10(C5)
M = 0.50(M1) + 0.20(M2) + 0.15(M3) + 0.15(M4)
O = 0.30(O1) + 0.25(O2) + 0.20(O3) + 0.10(O4) + 0.15(O5)
```

Sub-dimensions not refreshed at the current cadence use their most recent valid value (carry-forward), with confidence decay annotations per the Master Cadence Reference Part 7.

## 7.4 Synergy coefficient

```
S_internal = 0.30(S1) + 0.40(S2) + 0.30(S3)
S = 0.85 + (S_internal / 100) × 0.30
```

S ∈ [0.85, 1.15].

## 7.5 P score

```
P = S × (C^0.35 × M^0.40 × O^0.25)
```

The component-level weights are standardised: α=0.35 (Capability), β=0.40 (Motivation), γ=0.25 (Opportunity), summing to 1. The equal-weighted form P = S × (C × M × O)^(1/3) is the public-facing simplified version used in the book and marketing only. P is reported on a 0–100 scale. Confidence indicator (High / Medium / Low) accompanies the P score based on the freshness of underlying sub-dimensions.

## 7.6 Trip-wire reporting

Trip-wires do NOT enter the P calculation. Each trip-wire is reported as an independent indicator on the dashboard alongside M. Any trip-wire scoring <60 triggers a critical finding.

## 7.7 Gap-flag rules

| Gap | Definition | Action |
|---|---|---|
| Audit-perception gap (O1, O2, O3) | Audit score minus survey score > 15 points (either direction) | Reported as key diagnostic finding; both scores shown separately; the survey score feeds the O composite |
| Survey-behavioural gap (M1) | Survey score minus behavioural triangulator-derived score > 15 points (either direction) | Reported as key diagnostic finding |
| False-consensus pattern (TSI3 + MI2) | Task conflict items <60 AND psych safety >75 | Reported as suppressed-disagreement finding |
| Trip-wire failure | Any TW score <60 | Critical finding, immediate escalation |

## 7.8 Attention check and response validity

A response is excluded from the team or unit aggregate if any of the following are true:

- Reverse-scored item agrees in direction with forward items on the same sub-dimension (straight-lining).
- Survey completion time below the 5th percentile for the cohort (suggests speed-clicking).
- Response shows literal patterning across all items (all 1s, all 5s, alternating 1-5).

Excluded responses are logged and reported in the methodology footer ("X% of responses excluded for validity reasons").

---

# Part 8 — Platform and delivery notes

## 8.1 Survey platform

The survey is built, and the per-department links generated, in **Google Forms**, the confirmed interim survey platform. The build-and-deploy mechanics are specified in the Tier 3 Survey Google Forms deployment guide. Google Forms is free, familiar and exports cleanly to Google Sheets, and it satisfies the delivery essentials directly: anonymous response collection, and a separate distinct opaque link per survey instance (one per department).

Several capabilities in the 8.2 feature list are not native to Google Forms and are handled downstream rather than in the survey tool: per-item reverse-scoring, validity and attention-check exclusions, and item-mean aggregation all run in the Survey Processing and Scoring Workbook, which converts raw Google Forms responses into the Diagnostic Workbook's inputs. Item rotation across cadences is handled by assembling the right blocks per cadence at build time rather than by an in-tool rotation engine. The 8.2 list therefore now reads as requirements on the survey layer as a whole (Forms plus the processing workbook), not on Forms alone.

A native build inside PerformanceVP's own web app (the offering-3 portal) remains the intended longer-term home for survey delivery once the instrument has stabilised through pilots. Google Forms is the interim approach for the diagnostic and pilot phase.

## 8.1a Delivery approach — per-department links

The survey is distributed using a **unique, opaque link per department** (the in-scope unit). The approach:

1. **One link per department.** At engagement setup, the analyst generates a separate survey link for each in-scope department, drawn from the confirmed unit list. Each link is opaque — a random token (e.g. `/s/7fkq2a`), never a readable department name in the URL — so it can't be guessed or edited to submit into another department.

2. **The client sends each link internally.** PerformanceVP provides the client with a pre-prepared email for each department, written for that specific department. The client's project owner (or the department leader) sends the department's email and link to that department's staff from the client's own internal email — so the link arrives from a trusted internal sender.

3. **Staff click and complete.** A staff member clicks their department's link, completes the survey and submits. The department is encoded in the link itself, so there is no self-select dropdown and no risk of staff misattributing themselves to the wrong unit.

**Why per-department links.** Attribution is set by which link was clicked, not by what the respondent declares, so responses route to the correct unit automatically. Because each link goes to a department of known headcount, the analyst has a real denominator per unit for response-rate thresholds and for spotting anomalies (more responses than staff = investigate before scoring).

**Anonymity.** The link encodes the department, not the person. Everyone in a department clicks the identical link, so individuals can't be distinguished — the anonymity protocol in Part 1.3 holds. The link narrows the anonymity set to the department only; for very small departments below the reporting threshold, roll the unit up to its parent for reporting (as already specified in Parts 1.3 and 6.3).

**Duplicate submissions.** Enforced uniqueness per person isn't used, as it would require per-person links and erode anonymity. Instead: a device-level guard stops accidental re-submission (a completion flag set on the respondent's own device, with no identifier stored by PerformanceVP); the back-end validity rules in Part 7.8 catch low-effort patterns; and the per-department headcount reconciliation catches volume anomalies. The likelihood of deliberate duplicate submission in a performance diagnostic is low, and aggregate unit reporting absorbs the rare accidental duplicate.

**Methodology footer note.** Record plainly: distribution via unique per-department link sent by the client internally; unit attribution by link (not self-reported); duplicates mitigated by device-level guard and back-end validity exclusion rather than enforced uniqueness; no individual identifiers collected.

## 8.1b Setup checklist (per engagement)

- Confirm the in-scope department list and headcount per department with the sponsor.
- Generate one opaque link per department.
- Draft the per-department invitation email for the client to send.
- Capture expected headcount per department for the pre-scoring reconciliation.

## 8.1c Earlier platform note (superseded)

Earlier drafts named Qualtrics as primary, with Culture Amp or SurveyMonkey Enterprise as alternatives for clients already on those platforms, and a later draft left the provider to be confirmed. These remain valid options where a client mandates them, but the confirmed interim platform is Google Forms, per Part 8.1 and the Tier 3 Survey Google Forms deployment guide.

## 8.2 Required platform features

| Feature | Requirement |
|---|---|
| Reverse-scoring | Automatic, configured per item ID |
| Section headings | Three respondent-facing sections per the assembly in Part 6 |
| Item rotation | Quarterly rotation pattern configured per the rotation matrices |
| Anonymity protocol | Team-aggregate-only reporting; individual responses never exposed |
| Validity rules | Attention checks, response time floors, patterning detection |
| Response thresholds | Team minimum 4 respondents + 70% rate for CII; unit minimum 12 for pulse, 8 for half-yearly, 60% for baseline |
| Distinct link per department | Separate opaque link per in-scope department, per Part 8.1a |
| Data export | Raw responses (anonymised) for PerformanceVP scoring; pre-aggregated team and unit scores for client dashboard |

On Google Forms, the interim platform, the reverse-scoring, validity and attention-check exclusions, and item-mean aggregation in this list are not performed in the survey tool. Google Forms collects anonymous raw responses and exports them to a linked Google Sheet; the Survey Processing and Scoring Workbook then applies the exclusions and computes the item means that feed the Diagnostic Workbook. The requirements above therefore hold across the survey layer as a whole, with Forms providing collection and the processing workbook providing screening and aggregation.

## 8.3 Item review and revision protocol

The item bank is reviewed:

- **Annually** as part of the annual instrument refresh, with item-level psychometric review.
- **At engagement n=30, n=100, n=300** for confirmatory factor analysis and item-level revision based on accumulated response data.
- **Out-of-cycle** if a specific item shows persistent measurement problems (low alpha contribution, high non-response, ceiling/floor effects).

Items can be revised, retired or replaced through the formal item review process. New items are piloted across at least 30 teams before adoption into the standard bank.

---

# Part 9 — Translation and localisation notes

For Australian clients, the bank is deployed in Australian English. International deployment requires:

- Translation by a qualified bilingual translator with familiarity with workplace psychology terminology.
- Back-translation by an independent translator to verify equivalence.
- Cognitive interview testing in target language with at least 5 respondents before deployment.
- Cultural-equivalence review for items that may not translate cleanly (e.g. "discretionary effort", "robust discussions").

The current bank is built on Australian English idiom. Items flagged for likely translation difficulty:

- MI1-03 ("time tends to fly by") — idiomatic.
- MI3-01 ("genuinely interesting") — intensifier translates inconsistently.
- TSI3-01 ("challenge each other's ideas openly") — cultural variation in conflict norms.

For non-English deployment, plan 4–6 weeks for translation, back-translation and cognitive testing before pilot.

---

# Part 10 — Working notes and next steps

## 10.1 Settled decisions captured in this version

- 70-item baseline / annual instrument; 57-item half-yearly; 16-item quarterly pulse (17 with CII-13).
- One survey instrument per unit, three respondent-facing sections.
- Delivered via a unique opaque link per department, sent by the client internally using a PerformanceVP-supplied per-department email (Part 8.1a); built on Google Forms (the confirmed interim platform, per Part 8.1 and the Tier 3 Survey Google Forms deployment guide), with a native web-app build the longer-term home. Reverse-scoring, validity exclusions and item-mean aggregation run downstream in the Survey Processing and Scoring Workbook.
- Reverse-scoring across every sub-dimension to support attention checks.
- Item rotation in MI1, MI2 and trip-wires across quarterly cadence to reduce patterning.
- Audit-perception gap-flag rule retained for O1, O2, O3.
- False-consensus pattern flag for TSI3 + MI2 interaction.
- Trip-wires reported as independent critical-finding indicators, not weighted contributors to M.
- 5-point Likert scale throughout (no mixed scales).
- Conversion to 0–100 is `(mean − 1) × 25` consistently throughout (a mean of 1 → 0, a mean of 5 → 100), aligned with Measurement Reference Part 1.3. (Corrected 28 May 2026: earlier drafts stated `mean × 25` in several places, which was inconsistent with the stated 1→0 / 5→100 mapping; all instances now carry the − 1.)
- Item IDs stable across versions (new items get new IDs; retired items keep IDs).

## 10.2 Open questions for pilot validation

1. **Item alpha targets.** Cronbach's alpha targets: ≥0.80 per sub-dimension at baseline (with 4–5 items per sub-dim), ≥0.75 for the multi-item sub-dimensions. Pilot data confirms or revises individual items.
2. **CII-13 as pulse anchor.** Single-item CII representation in pulse is unusual. Pilot confirms whether CII-13 alone provides useful early-warning signal or whether a 2-item pulse subset would be more reliable.
3. **Half-yearly count of 57.** Whether this is operationally acceptable or whether a tighter 45-item half-yearly is needed. Test in pilot.
4. **Trip-wire threshold of <60.** May need calibration once pilot data exists.
5. **TSI3 false-consensus flag.** Test whether the pattern occurs at a meaningful rate in pilot data and whether the diagnostic interpretation is useful in practice.
6. **Section ordering.** Whether the team-then-role-then-self ordering produces better completion than alternatives. Test in pilot.
7. **Reverse-scored item rate.** Currently 1 reverse-scored item per sub-dimension. Confirm whether this rate produces sufficient attention-check coverage or whether 2 per sub-dimension is needed.
8. **Half-yearly skipping of MI3 and MI4.** Confirm whether complete skipping of these slow-moving sub-dimensions at half-yearly is acceptable or whether a 2-item subset of each should be retained for sense-checking.

## 10.3 Next-step actions

1. **Configure the survey build.** Take this blueprint and build the live survey instruments as Google Forms templates per the Tier 3 Survey Google Forms deployment guide, with per-department links configured (Part 8). Reverse-scoring, rotation and validity rules are handled downstream in the Survey Processing and Scoring Workbook rather than in Forms. One- to two-day exercise.
2. **Cognitive interview the item bank.** Run a 5–8 person cognitive interview pilot on the item bank to identify items that read ambiguously or inconsistently. Half-day exercise per interview.
3. **Pilot the full cadence cycle.** Run baseline → quarterly pulse → quarterly pulse → half-yearly → quarterly pulse → quarterly pulse → annual refresh with 1–2 pilot clients to validate the full cycle. 14-month commitment.
4. **Build the scoring engine.** Implement the scoring algorithm (Part 7) in code, accepting raw response data and producing sub-dimension, component, S, and P scores with confidence indicators.
5. **Build the dashboard mock-up.** Wireframe the dashboard views (top-level P, sub-dimension drill-down, trend, audit-perception gap visualisation, trip-wire indicators) using the data structure defined here.
6. **Engage an organisational psychologist methodological adviser** for the validation work (Cronbach's alpha at n=30, CFA at n=300, criterion validity correlation against external performance metrics).
7. **Draft the methodology disclosure language** for the client diagnostic report, explaining the proprietary instrument approach and the validation pathway.

---

*End of working document. Revisions welcome.*
