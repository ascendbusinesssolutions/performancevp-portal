# The Performance Equation
## Sub-Dimension × Cadence Master Reference

**Author:** Michael, PerformanceVP
**Status:** Working draft. Master reference for sub-dimension specification, data collection, cadence and refresh logic.
**Last updated:** 21 September 2026 (O1 audit-perception gap analysis now states which value feeds the O composite. Prior: 22 May 2026)
**Companion documents:** Performance Equation Strategy (master reference); Diagnostic Delivery Handbook; Tier 1 & 2 Data Collection Guide; Data Audit Template.

---

## Purpose of this document

This file is the consolidated reference for the 17 sub-dimensions of the Performance Equation across its four elements (C, M, O, S). For each sub-dimension it specifies:

1. The construct definition and its weight within the parent component.
2. The data sources used at baseline, including the Tier 1/2/3 hierarchy and the PerformanceVP instrument that applies where client data is unavailable.
3. The refresh cadence — whether the sub-dimension is refreshed quarterly, half-yearly, annually, or only on event trigger.
4. The item count and data extraction load at each refresh cadence.
5. Event-triggered refresh rules.
6. Confidence decay rules — how long a measurement remains valid before the dashboard flags it as stale.

This document is the source of truth that all other artefacts (the handbooks, the Tier 1 & 2 Data Collection Guide, the Data Audit Template, the dashboard specification, the survey blueprints) derive from. Changes to sub-dimension structure, items or cadence must be made here first and propagated.

---

## How to read this document

**Structure.** Part 1 is the master summary table. Parts 2–5 detail each sub-dimension within each component. Part 6 specifies cross-cutting rules: cadence-rollup logic for the P score, confidence indicators, event triggers and dashboard conventions.

**Cadence codes.**

- **Q** — Quarterly. Refreshed every 3 months as part of the standard pulse.
- **H** — Half-yearly. Refreshed every 6 months as part of the half-yearly health check.
- **A** — Annual. Refreshed once a year as part of the annual baseline refresh, or at engagement baseline.
- **E** — Event-triggered. Refreshed when a defined trigger event occurs, independent of calendar cadence.

A sub-dimension may have more than one code (e.g. **Q+H+A** means items rotate through pulse, health check and annual refresh).

**Tier codes for data sources** (carried over from the existing measurement architecture):

- **Tier 1** — Gold standard validated platform data, used directly with light normalisation.
- **Tier 2** — Acceptable platform or system data, used with provider-specific conversion rules.
- **Tier 3** — PerformanceVP proprietary instrument or audit, deployed when no acceptable client source exists.

---

# Part 1 — Master Summary Table

## 1.1 The Performance Equation structure

> **P = S × (C^0.35 × M^0.40 × O^0.25)**
>
> Public-facing simplified form (book, board, marketing): **P = S × (C × M × O)^(1/3)**

| Element | Code | Range | Role |
|---|---|---|---|
| Capability | C | 0–100 | Component (geometric mean) |
| Motivation | M | 0–100 | Component (geometric mean) |
| Opportunity | O | 0–100 | Component (geometric mean) |
| Synergy | S | 0.85–1.15 | Coefficient (amplifier) |
| Sector classification | — | n/a | Metadata for internal comparison (not in equation) |

17 sub-dimensions in total across C (5), M (4), O (5), S (3), plus 3 hygiene trip-wire indicators and the Decision Latency Protocol as a flagship objective metric cutting across O.

## 1.2 Master cadence table

| # | Code | Sub-dimension | Component | Weight | Baseline items | Q items | H items | A items | Primary Tier-1/2 source | PerformanceVP instrument (Tier 3) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | C1 | Skill (incl. behavioural) | C | 35% | varies | — | — | A | HRIS skills inventory, certification registers, performance ratings | SCA — Skills Coverage Assessment |
| 2 | C2 | Knowledge depth and breadth | C | 15% | varies | — | — | A | LMS with assessment scores, compliance assessments | KDS — Knowledge Depth Survey |
| 3 | C3 | Talent density | C | 20% | varies | — | — | A | Calibrated performance ratings, 9-box | TDC — Talent Density Calibration workshop |
| 4 | C4 | Collective intelligence | C | 20% | 15 | — | 15 | 15 | None commercially available; ONA supplementary | **CII — Collective Intelligence Index** |
| 5 | C5 | Learning velocity | C | 10% | varies | — | — | A | DORA metrics, LMS time-to-competence, project cycle data | M-C5-TL learning-velocity module (async; LVI structured interview retained as fallback) |
| 6 | M1 | Engagement & confidence | M | 50% | 8 | 5 | 8 | 8 | Existing engagement survey (Culture Amp, Glint, etc.) | MI-1 module |
| 7 | M2 | Psychological safety | M | 20% | 5 | 3 | 5 | 5 | Engagement-survey safety items, speak-up data | MI-2 module |
| 8 | M3 | Autonomous motivation | M | 15% | 5 | — | — | 5 | SDT-aligned items in engagement survey (rare) | MI-3 module |
| 9 | M4 | Purpose alignment | M | 15% | 4 | — | — | 4 | Engagement-survey purpose items, values survey | MI-4 module |
| 10 | TW | Hygiene trip-wires (pay equity, fairness, conditions) | M (overlay) | n/a | 3 | 2 (rotating) | 3 | 3 | Pay equity audits, WHS records, grievance data | TW items |
| 11 | O1 | Clarity & decision rights | O | 30% | 8 + audit | — | 5 | 8 + audit | Documented RAPID/RACI, role architecture, OKR cascade | OI-Clarity audit + survey |
| 12 | O2 | Tools & information | O | 25% | 4 + audit | — | 4 | 4 + audit | SaaS management, ITSM, Workplace Analytics | OI-2 audit + survey |
| 13 | O3 | Process & workflow | O | 20% | 5 + audit | — | 5 | 5 + audit | Process mining, work-management cycle data | OI-3 audit + survey |
| 14 | O4 | Resource adequacy | O | 10% | 3 | — | 3 | 3 | Workforce planning data, capacity analytics, HRIS load data | OI-4 survey + capacity analysis |
| 15 | O5 | Leadership enablement | O | 15% | 3 | 3 | 3 | 3 | 360 data, manager-effectiveness scores | OI-5 survey |
| 16 | S1 | Skill complementarity | S | 30% | analytic | — | — | A | Skills inventory data (reuses C1 inputs) | TSI-1 analytical protocol or workshop |
| 17 | S2 | Collaboration friction | S | 40% | 3 | 3 | 3 | 3 | Workplace Analytics, meeting/collab telemetry | TSI-2 survey |
| 18 | S3 | Conflict health | S | 30% | 5 | — | 3 | 5 | None commercially available | **TSI-3 — Conflict Health Survey** |
| — | DLP | Decision Latency Protocol | O (cross-cutting) | reported alongside O | full sample | operational class only | tactical class added | strategic class added | Decision records, calendars, meeting minutes | **DLP — PerformanceVP proprietary** |
| — | Sector | Sector classification (internal comparison) | metadata | n/a | once | — | — | once | None — captured as engagement metadata | Internal comparison set (grows from PerformanceVP engagements) |

**Totals across the 17 sub-dimensions plus trip-wires:**

| Cadence | Total survey items per respondent | Time per respondent | Notes |
|---|---|---|---|
| Baseline (engagement start) | ~70 items | 12–15 minutes | Full instrument, all sub-dimensions |
| Quarterly pulse | ~16 items | 3–4 minutes | Fast-moving sub-dimensions only |
| Half-yearly health check | ~57 items | 10–12 minutes | Fast + medium-pace sub-dimensions |
| Annual refresh | ~70 items | 12–15 minutes | Full re-baseline |

**Annual respondent load across a tracking-subscription year:** 4 × pulse (16 items × 4 = 64 items) + 2 × half-yearly (57 items × 2 = 114 items) + 1 × annual (70 items) = approximately 248 item-encounters per respondent per year, or roughly 40–50 minutes of survey time annually. Comparable to or lower than a standard engagement-survey programme.

---

# Part 2 — Capability (C) sub-dimensions

C = 0.35(C1) + 0.15(C2) + 0.20(C3) + 0.20(C4) + 0.10(C5)

## 2.1 C1 — Skill (including behavioural capability)

**Definition.** The applied procedural and behavioural competence to perform the role. Covers technical skill, functional skill, and behavioural competencies (communication, decision-making, collaboration, judgement, leadership where role-relevant). Merged with the former C6 — behavioural capability is part of skill, not a separate construct.

**Weight within C:** 35%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Workday Skills Cloud, SAP SuccessFactors Talent Intelligence Hub, Oracle HCM Dynamic Skills, Korn Ferry Success Profiles | Manager-confirmed proficiency only, not AI-inferred alone |
| 2 | Compono Develop, Eightfold, Degreed, Cornerstone Galaxy, ELMO, LinkedIn Skill Assessments, industry certification registers, HackerRank/Codility/Mercer Mettl, internal capability frameworks | Provider-specific conversion rules per Capability Measurement Module |
| 2 | 360 data for behavioural component (Korn Ferry, CCL, SHL, DDI, Hogan, Leadership Circle, Culture Amp 360) | For leadership cohort |
| 3 | **SCA — Skills Coverage Assessment** (PerformanceVP instrument) | Manager + self-rating against framework, 15% audit sample |

**Cadence: Annual only.** Skill profiles move slowly. Quarterly and half-yearly refresh would produce noise without signal. The annual cycle aligns with the client's performance management calendar in most organisations.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | Full skills inventory pull + role-framework mapping + SCA where needed | One-time data exchange |
| Quarterly | None | No refresh between annual cycles |
| Half-yearly | None | No refresh |
| Annual | Skills inventory refresh + manager rating cycle + SCA refresh where needed | Aligns with client's annual review cycle |

**Event triggers.**

- Unit headcount change >20% in a quarter → refresh next annual cycle and apply provisional C1 adjustment in the dashboard.
- Major capability programme completed → refresh next annual cycle as scheduled, with intervention-effect annotation.
- New role family introduced into the unit → refresh framework mapping out-of-cycle.

**Confidence decay rule.** C1 measurement remains high-confidence for 12 months. After 14 months without refresh, the dashboard flags it as medium-confidence. After 18 months, low-confidence.

---

## 2.2 C2 — Knowledge depth and breadth

**Definition.** Declarative knowledge of products, customers, regulations, processes and operating context. What people know, distinct from how they apply it.

**Weight within C:** 15%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | LMS completion with assessment scores (Cornerstone, SAP Learning, Workday Learning, ELMO), compliance assessment platforms (Sentrient, Cloud Assess), product knowledge assessments | Outcome scores required, not completion only |
| 2 | Internal bespoke knowledge tests (where psychometric quality documented), tenure-adjusted knowledge proxy, manager-rated knowledge against framework | Supplementary only |
| 3 | **KDS — Knowledge Depth Survey** (PerformanceVP instrument) | Scenario-based, 20–25 items per role family |

**Cadence: Annual only.** Knowledge testing is high-burden; refresh more frequently produces compliance-testing fatigue without diagnostic gain.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | LMS assessment data extract + KDS where needed | One-time data exchange + KDS deployment if applicable |
| Quarterly | None | |
| Half-yearly | None | |
| Annual | LMS refresh + KDS re-deployment if used | KDS items reviewed annually for currency |

**Event triggers.**

- Major regulatory change affecting knowledge requirements → out-of-cycle KDS refresh on regulatory items only.
- New product launch or operating-model change → out-of-cycle KDS refresh on affected role families.

**Confidence decay rule.** High-confidence for 12 months. Medium at 14 months. Low at 18 months. Assessments older than 24 months excluded entirely from the score.

---

## 2.3 C3 — Talent density

**Definition.** The proportion of roles filled by people performing at or above the standard expected. The "A and B players" concept, calibrated through structured talent review rather than left to inflated annual ratings.

**Weight within C:** 20%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Calibrated performance ratings in HRIS, current nine-box outputs, talent review structured outputs, Korn Ferry Success Profile assessments | Documented calibration required for Tier 1 |
| 2 | Uncalibrated performance ratings, 360 overall ratings, promotion/recognition data, probation completion rates | Use with downward adjustment for rating inflation (cap "exceptional" at 15%) |
| 3 | **TDC — Talent Density Calibration workshop** (PerformanceVP facilitated) | Half-day to full-day per management layer |

**Cadence: Annual only.** Talent density moves on annual rating cycles. Mid-year refresh is rare and usually doesn't produce defensible recalibration.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | Performance rating extract + nine-box + succession data + TDC workshop if needed | TDC adds 0.5–1.0 consulting days per management layer |
| Quarterly | None | |
| Half-yearly | None | |
| Annual | Rating cycle data refresh + TDC workshop if ratings remain uncalibrated | Aligns with client annual review cycle |

**Event triggers.**

- Senior leadership turnover >25% in a quarter → out-of-cycle TDC workshop for the affected layer.
- Major reorganisation affecting role definitions → out-of-cycle TDC workshop after the reorg lands.

**Confidence decay rule.** High-confidence for 12 months. Medium at 15 months. Low at 18 months.

---

## 2.4 C4 — Collective intelligence

**Definition.** The quality of the team's shared map of who knows what (Expertise Clarity), the trust in each other's expertise (Expertise Trust), and the smoothness with which expertise gets combined into collective output (Expertise Flow). Grounded theoretically in transactive memory systems research; measured through the PerformanceVP CII.

**Weight within C:** 20%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | None — no major commercial platform measures this construct | Genuine market gap and PerformanceVP differentiator |
| 2 | ONA platforms (Polinode, TrustSphere, Worklytics, OrgVitality, Microsoft Workplace Analytics), expertise directories with telemetry | Provides supporting signals but insufficient alone |
| 3 | **CII — Collective Intelligence Index** (PerformanceVP proprietary) | 15 items, 5 per sub-construct, deployed at team level |

**Cadence: Half-yearly + annual.** TMS moves with team composition changes and team-level events; half-yearly is the right grain for a 15-item instrument. Quarterly would be over-frequent for a multi-item construct. Annual would miss meaningful movement.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 15 (full CII) | Team-level deployment, minimum 4 valid respondents per team, 70% response rate target |
| Quarterly | None in pulse | Exception: 1 Expertise Flow item appears in the quarterly pulse as a leading indicator |
| Half-yearly | 15 (full CII) | Refreshed every 6 months |
| Annual | 15 (full CII) | Annual baseline refresh |

**Aggregation rule.** CII produces team-level scores. The unit-level C4 score is the FTE-weighted average of constituent team scores within the unit. Teams below the validity threshold (4 valid respondents) are excluded from the aggregate, with the exclusion noted in the methodology footer.

**Event triggers.**

- Team composition change >30% (new members or departures) → CII refresh at next quarter regardless of half-yearly cadence.
- Significant team-level incident (major delivery failure, conflict event, leadership change) → CII refresh within 60 days.

**Confidence decay rule.** High-confidence for 6 months. Medium at 8 months. Low at 12 months.

---

## 2.5 C5 — Learning velocity

**Definition.** The speed and efficiency with which a team acquires, integrates and operationalises new knowledge and skills. Team-level analogue of individual learning agility.

**Weight within C:** 10%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | DORA metrics platforms (LinearB, Sleuth, Jellyfish, Faros, Swarmia), LMS time-to-competence, Visier / One Model / Crunchr workforce analytics | DORA for technology teams; LMS-derived TTC for others |
| 2 | Project delivery cycle time (Jira, Asana, Monday, Smartsheet, ServiceNow), HRIS new-hire ramp-up data, tool/process adoption telemetry | Use trend rather than absolute values where benchmarks lack |
| 3 | **M-C5-TL learning-velocity module** (PerformanceVP; async, deployed to team leaders) | 12-item async module (≈15–20 min per team leader). LVI structured-interview protocol retained as fallback where async deployment is not viable. |

**Cadence: Annual only.** Learning velocity is computed as a trend over a 12-month window; quarterly refresh would not produce a meaningful trend, only a noisy snapshot. Annual refresh aligns with the trend window.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | DORA / LMS / project data extract + LVI interviews if needed | One-time setup of data feeds |
| Quarterly | None | Underlying data updates monthly via the data feed but C5 score isn't recomputed |
| Half-yearly | None | |
| Annual | Annual roll-up of underlying data + LVI re-interview if used | |

**Event triggers.**

- Major capability programme or learning intervention completed → out-of-cycle LVI refresh to capture intervention effect.
- Major delivery system change (Jira/DORA platform replacement) → re-establish baseline window from new system.

**Confidence decay rule.** Since C5 is a 12-month rolling metric, it carries its own currency. The dashboard flags C5 as stale only if the underlying data feed has lapsed for more than 60 days.

---

# Part 3 — Motivation (M) sub-dimensions

M = 0.50(M1) + 0.20(M2) + 0.15(M3) + 0.15(M4), with the 3 hygiene trip-wires as critical-finding overlays.

## 3.1 M1 — Engagement and confidence

**Definition.** Vigour, dedication, absorption, willingness to extend discretionary effort, and shared belief in the team's ability to succeed. Consolidates the former M1 (Engagement), M2 (Collective efficacy/team potency) and M6 (Affective commitment) into a single composite, on the basis that these constructs correlate at r = 0.6–0.8 empirically and measuring them separately produces noise.

**Weight within M:** 50%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Existing engagement survey composite (Culture Amp, Glint/Viva Glint, Peakon, Qualtrics, Aon, WTW, Korn Ferry, eNPS) | Response rate ≥60%, vintage ≤12 months for Tier 1 |
| 2 | Historical engagement-survey trend, retention awards, eNPS, alumni rates | Used as triangulators |
| 3 | **MI-1 module** (PerformanceVP proprietary) | 8 items covering engagement, team confidence and pride |

**Behavioural triangulators.** Voluntary turnover (12-month rolling), absenteeism (unplanned, excluding parental/medical), internal application rate, discretionary contribution proxies, goal achievement rate, stretch goal acceptance, referral rate, rehire/alumni rate. Triangulated against survey score; gap >15 points triggers the gap-flag rule.

**Cadence: Quarterly + half-yearly + annual.** Engagement is the single fastest-moving motivation construct. Quarterly pulse captures movement; half-yearly and annual provide deeper measurement.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 8 (full MI-1) | Establishes baseline score with full item set |
| Quarterly | 5 (rotating subset of MI-1) | Items rotate within an 8-item bank to reduce patterning |
| Half-yearly | 8 (full MI-1) | Full refresh |
| Annual | 8 (full MI-1) | Full refresh + triangulator deep-dive |

**Event triggers.**

- Major announcement, restructure or leadership change → out-of-cycle pulse within 30 days.
- Pulse engagement item drop >10 points quarter-on-quarter → out-of-cycle deeper investigation.

**Confidence decay rule.** High-confidence for 3 months. Medium at 4 months. Low at 6 months.

---

## 3.2 M2 — Psychological safety

**Definition.** Shared belief that the team is safe for interpersonal risk-taking; willingness to speak up, raise concerns, disclose errors and engage in productive disagreement. Includes elements of conflict-health task/relationship distinction (the former TSI-4) integrated here on the basis that conflict health is operationally a psych-safety outcome.

**Weight within M:** 20%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | None — psych safety items in engagement surveys are typically inadequate (single item, low reliability) | Most engagement platforms don't measure this construct well |
| 2 | Speak-up program data (aggregated, with legal sign-off), error/near-miss disclosure rates, grievance volume and resolution time, retrospective data flagging psychological-safety incidents | Behavioural triangulators |
| 3 | **MI-2 module** (PerformanceVP proprietary) | 5 items measuring Edmondson-construct psychological safety with original wording |

**Cadence: Quarterly + half-yearly + annual.** Psych safety degrades quickly after damaging events (a high-profile failure followed by punitive response, a manager change toward an aggressive style). Quarterly cadence captures these. Half-yearly and annual provide deeper measurement.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 5 (full MI-2) | |
| Quarterly | 3 (subset of MI-2) | |
| Half-yearly | 5 (full MI-2) | |
| Annual | 5 (full MI-2) | |

**Event triggers.**

- Reported speak-up incident, public failure, or grievance escalation → out-of-cycle MI-2 within 45 days.
- Manager change in the unit → MI-2 refresh at 60 days post-appointment.

**Confidence decay rule.** High-confidence for 3 months. Medium at 4 months. Low at 6 months.

---

## 3.3 M3 — Autonomous motivation

**Definition.** Degree to which work is experienced as volitional and self-endorsed (Self-Determination Theory autonomous motivation construct, comprising intrinsic motivation and well-internalised extrinsic motivation).

**Weight within M:** 15%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | None — SDT-aligned items are not standard in commercial engagement platforms | Gap in commercial measurement |
| 2 | Engagement-survey autonomy/interest items where present, self-directed learning hours (LMS non-mandatory), innovation/idea submission rates, career conversation records | Behavioural triangulators |
| 3 | **MI-3 module** (PerformanceVP proprietary) | 5 items measuring autonomous vs controlled motivation |

**Cadence: Annual only.** Autonomous motivation is a relatively stable individual-difference construct moderated by job design and managerial behaviour; meaningful change happens over months to a year, not quarter to quarter. Quarterly refresh produces noise without signal.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 5 (full MI-3) | |
| Quarterly | None | |
| Half-yearly | None | |
| Annual | 5 (full MI-3) | |

**Event triggers.**

- Major job-design change, role redesign or managerial-practice shift in the unit → out-of-cycle MI-3 within 90 days.

**Confidence decay rule.** High-confidence for 12 months. Medium at 14 months. Low at 18 months.

---

## 3.4 M4 — Purpose alignment

**Definition.** Degree to which work is perceived as meaningful and aligned with personal values (work-meaning construct).

**Weight within M:** 15%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Engagement-survey purpose/meaning items where present and reviewable | If items are construct-valid |
| 2 | Internal values or culture-survey data, exit-interview themes coded for purpose, CSR/community participation | Triangulators |
| 3 | **MI-4 module** (PerformanceVP proprietary) | 4 items measuring meaning and values congruence |

**Cadence: Annual only.** Purpose is tied to organisational identity and stable values; it rarely shifts within a year unless something major happens to the organisation's mission.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 4 (full MI-4) | |
| Quarterly | None | |
| Half-yearly | None | |
| Annual | 4 (full MI-4) | |

**Event triggers.**

- Major mission, brand or identity change → out-of-cycle MI-4 within 90 days of the change.
- Significant CSR or ethics event (positive or negative) affecting organisational identity → out-of-cycle MI-4.

**Confidence decay rule.** High-confidence for 12 months. Medium at 14 months. Low at 18 months.

---

## 3.5 Trip-wires — Pay equity, fairness, basic conditions

**Definition.** Three single-item trip-wire indicators that flag critical hygiene failures regardless of overall M score. Replaces the former M7 sub-dimension; these are operating-as-critical-findings, not weighted contributors.

**Weight within M:** Not weighted. Independent critical-finding indicators.

**The three trip-wires.**

| Trip-wire | Item construct | Action threshold |
|---|---|---|
| Pay equity | "I am paid fairly for the work I do compared to others in similar roles." | Score <60 = critical finding requiring pay equity audit |
| Fairness of treatment | "People in this team are treated fairly and respectfully regardless of their background." | Score <60 = critical finding requiring fairness investigation |
| Basic conditions | "I have the basic working conditions (workspace, tools, safety, time) I need to do my job." | Score <60 = critical finding requiring conditions remediation |

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Pay equity audit results (Mercer, internal), WHS incident records, fair-treatment grievance data | Behavioural triangulators |
| 2 | Engagement-survey hygiene items where present | |
| 3 | **TW items** in the PerformanceVP survey | 3 items |

**Cadence: Quarterly (rotating) + half-yearly + annual.** All three trip-wires run at half-yearly and annual. At quarterly cadence, 2 of the 3 rotate so that each trip-wire is checked at least twice between half-yearly refreshes.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 3 (all trip-wires) | |
| Quarterly | 2 (rotating) | Rotation: Q1 = pay+fairness, Q2 = fairness+conditions, Q3 = conditions+pay, Q4 = pay+fairness |
| Half-yearly | 3 (all) | |
| Annual | 3 (all) | |

**Event triggers.**

- Any trip-wire score <60 → immediate critical finding, escalation to engagement lead and client sponsor.
- Pay equity audit pending or recent → out-of-cycle trip-wire refresh.
- WHS incident in the unit → out-of-cycle trip-wire refresh.

**Confidence decay rule.** Trip-wires carry decay rules independent of M. High-confidence for 3 months. Medium at 4. Low at 6.

---

# Part 4 — Opportunity (O) sub-dimensions

O = 0.30(O1) + 0.25(O2) + 0.20(O3) + 0.10(O4) + 0.15(O5)

## 4.1 O1 — Clarity and decision rights

**Definition.** Consolidated sub-dimension covering decision-rights distribution, role clarity, and strategic-alignment cascade. Merged from the former O1 (Decision rights), O5 (Role clarity) and O6 (Strategic clarity), which measure overlapping ground — whether each person knows what they're meant to do, what they're authorised to decide, and how their work connects to enterprise outcomes.

**Weight within O:** 30%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Documented RAPID/RACI/DACI framework, current role architecture with success criteria, OKR cascade platform (Workboard, Viva Goals, Quantive, Lattice, 15Five, Cascade) with documented enterprise-to-individual goal-trace | All three required for Tier 1 |
| 2 | McKinsey OHI Accountability/Direction data, Galbraith Star audit, HRIS reporting structure with role-level definitions, partial OKR cascade, position descriptions within 24 months | Partial Tier 2 components combinable |
| 3 | **OI-Clarity audit + survey** (PerformanceVP) | Half-day workshop (decision rights mapping + role architecture + cascade audit on 5–10 goal-traces) + 8-item perception survey |

**Audit-perception gap analysis.** The audit produces a structural score (0–100); the survey produces a perception score (0–100). Where they diverge by more than 15 points, this is reported as a key diagnostic finding rather than averaged away. Within 15 points the two are averaged; beyond 15, the perception score feeds the O composite.

**Cadence: Half-yearly + annual for the survey component; annual for the audit.** Survey perception of clarity moves with leader behaviour and organisational change; the structural audit is stable across 6-month windows.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | 8 survey items + half-day Clarity audit | Audit covers decision-rights, role architecture, OKR cascade |
| Quarterly | None | |
| Half-yearly | 5 survey items (subset of full 8) | Light perception refresh; no audit |
| Annual | 8 survey items + Clarity audit refresh | Full re-baseline |

**Event triggers.**

- Major reorganisation affecting reporting lines or decision authority → out-of-cycle Clarity audit and 8-item survey within 60 days of reorg landing.
- New enterprise strategy or major strategic pivot → out-of-cycle cascade audit on 5–10 goal-traces.
- Significant decision-latency degradation flagged in DLP → out-of-cycle Clarity audit on the affected decision class.

**Confidence decay rule.** Survey perception high-confidence for 6 months. Audit high-confidence for 12 months. Combined O1 carries the more restrictive of the two.

---

## 4.2 O2 — Tools and information

**Definition.** Fit-for-purpose technology, systems and data access. Whether people have the tools they need and can get the information they need to do their work.

**Weight within O:** 25%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | SaaS management platform (Zylo, Productiv, Torii) inventory + ITSM (ServiceNow, Jira Service Management, Freshservice) ticket data + Microsoft Workplace Analytics tool-usage telemetry | All three required for Tier 1 |
| 2 | Partial tool inventory, ITSM data alone, engagement-survey tools items | |
| 3 | **OI-2 audit + survey** (PerformanceVP) | Tool inventory and integration audit (consultant-led with IT) + 4-item perception survey |

**Cadence: Half-yearly + annual.** Tools and information change gradually. Quarterly cadence is unnecessary; half-yearly and annual capture meaningful change.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | 4 survey items + tools audit | Half-day audit with IT operations |
| Quarterly | None | |
| Half-yearly | 4 survey items | Survey refresh; no audit |
| Annual | 4 survey items + tools audit refresh | |

**Event triggers.**

- Major tool rollout (e.g. ERP replacement, new CRM, AI tooling deployment) → out-of-cycle audit + survey within 90 days of go-live.
- ITSM ticket volume spikes >50% over baseline → out-of-cycle audit focused on the affected workflow.

**Confidence decay rule.** High-confidence for 6 months. Medium at 8. Low at 12.

---

## 4.3 O3 — Process and workflow

**Definition.** Friction-free flow of work, cycle times, rework, value-adding versus non-value-adding steps.

**Weight within O:** 20%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Process mining platform (Celonis, UiPath, ARIS, Microsoft) | Full Tier 1 for clients with mature process mining |
| 2 | Work management cycle time data (Jira, Asana, Monday, ServiceNow), time-and-motion studies, operational excellence / Lean Six Sigma findings, customer complaint themes | Tier 2 covers most mid-market clients |
| 3 | **OI-3 audit + survey** (PerformanceVP) | Structured friction audit on 3–5 core processes (consultant-led) + 5-item perception survey |

**Cadence: Half-yearly + annual.** Process changes take quarters to land and stabilise. Half-yearly refresh captures meaningful change. The audit component refreshes only on significant process change or annually.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | 5 survey items + audit on 3–5 core processes | Full process audit at baseline |
| Quarterly | None | |
| Half-yearly | 5 survey items | Perception only; audit only if a major process change has landed |
| Annual | 5 survey items + audit refresh on changed processes | |

**Event triggers.**

- Major process redesign or workflow change → out-of-cycle audit and survey within 90 days of implementation.
- Customer complaint volume on a process-related issue spikes → out-of-cycle audit on the affected process.

**Confidence decay rule.** Survey perception high-confidence for 6 months. Audit high-confidence for 12 months. Combined O3 carries the more restrictive.

---

## 4.4 O4 — Resource adequacy

**Definition.** Whether the unit has time, headcount and budget proportionate to demand. Workload-capacity fit.

**Weight within O:** 10%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Workforce planning platform (Visier, Anaplan, Workday Adaptive) + capacity analytics + HRIS overtime / after-hours data | All three for Tier 1 |
| 2 | Project capacity data from work management systems, backlog data, burnout indicators (sick leave clustering, absenteeism patterns), engagement-survey workload items | |
| 3 | **OI-4 survey + capacity analysis** (PerformanceVP) | 3-item perception survey + analytical protocol using available data |

**Cadence: Half-yearly + annual perception survey. Monthly underlying data.** Capacity stress emerges over months; the perception view is half-yearly. The underlying behavioural data (overtime, backlog, burnout indicators) refreshes monthly via HRIS pull and feeds the dashboard at higher cadence than the survey.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | 3 survey items + capacity analysis | One-time capacity baseline |
| Quarterly | None on survey; monthly HRIS data pull continues | Dashboard shows monthly capacity trend |
| Half-yearly | 3 survey items + capacity analysis refresh | |
| Annual | 3 survey items + capacity analysis refresh | |

**Event triggers.**

- Unit headcount reduction >10% without proportional scope reduction → out-of-cycle capacity analysis.
- Backlog growth >25% over baseline → out-of-cycle capacity analysis and survey.
- Burnout indicators (sick leave clustering, absenteeism spike) → out-of-cycle capacity analysis.

**Confidence decay rule.** Survey high-confidence for 6 months. Underlying capacity data high-confidence for 1 month.

---

## 4.5 O5 — Leadership enablement

**Definition.** Degree to which managers unblock rather than block their teams. Consolidates the former O7 with the leadership-behaviour component of C6, on the basis that leadership belongs in the system that enables performance (O), not in the capability of the people being led (C).

**Weight within O:** 15%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Manager effectiveness scores from engagement survey (with documented psychometric construction), 360 data for in-scope managers (Korn Ferry, CCL, SHL, DDI, Hogan, Leadership Circle, Culture Amp 360, Lattice) | |
| 2 | McKinsey OHI Leadership, performance review behavioural ratings, direct-report engagement per manager, voluntary turnover by manager | |
| 3 | **OI-5 survey** (PerformanceVP) | 3-item direct-report perception survey on manager enabling behaviours |

**Cadence: Quarterly + half-yearly + annual.** Leadership behaviour can change immediately on a manager change or after a development intervention. Quarterly cadence catches this; half-yearly and annual provide deeper measurement.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 3 (full OI-5) | |
| Quarterly | 3 (full OI-5) | Light enough to refresh quarterly |
| Half-yearly | 3 (full OI-5) | |
| Annual | 3 (full OI-5) + 360 refresh for leadership cohort if available | |

**Event triggers.**

- New manager into the unit → OI-5 refresh at 60 days post-appointment regardless of cadence.
- Manager-development programme completion → OI-5 refresh at 90 days post-completion to measure intervention effect.
- Voluntary turnover spike in a specific manager's team → out-of-cycle OI-5 on that team.

**Confidence decay rule.** High-confidence for 3 months. Medium at 4. Low at 6.

---

# Part 5 — Synergy (S) sub-dimensions

S_internal = 0.30(S1) + 0.40(S2) + 0.30(S3)

S = 0.85 + (S_internal / 100) × 0.30, producing S ∈ [0.85, 1.15].

## 5.1 S1 — Skill complementarity

**Definition.** Diversity and complementarity of capabilities across team members. Whether the team's skill profile is genuinely complementary (different members bring different strengths) or overlapping (members duplicate each other's capabilities without covering needed range).

**Weight within S:** 30%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Skills inventory data per team member with manager confirmation (reuses C1 input) | Uses same source data as C1 |
| 2 | Capability framework with required-skills per role + manager proficiency ratings | |
| 3 | **TSI-1 — Skill Complementarity Analysis** (PerformanceVP) | Analytical protocol applied to existing data; deployment workshop where no skills data exists |

**Cadence: Annual only.** Skill complementarity is a function of team composition; it changes meaningfully only when team composition changes. Calendar refresh more frequently than annually doesn't add value.

**Refresh load.**

| Refresh type | Items / load | Notes |
|---|---|---|
| Baseline | Analytical computation from C1 data + workshop if needed | No respondent items required |
| Quarterly | None | |
| Half-yearly | None | |
| Annual | Re-run analytical protocol against refreshed C1 data | |

**Event triggers.**

- Team composition change >20% in a quarter → re-run TSI-1 analytical protocol at next quarter regardless of annual cadence.
- New role family introduced into the team → re-run TSI-1 with revised framework.

**Confidence decay rule.** Tied to C1 confidence — S1 inherits the confidence rating of the C1 data it derives from.

---

## 5.2 S2 — Collaboration friction

**Definition.** Meeting overload, handoff failures, rework, fragmented time, coordination cost. The operational drag on team output from poor collaboration design.

**Weight within S:** 40%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | Microsoft Workplace Analytics / Viva Insights (meeting load, fragmented time, after-hours collaboration), Slack/Teams analytics, calendar telemetry | Where available and properly extracted |
| 2 | Time-allocation studies, process mining with cross-functional overlays, retrospective data flagging coordination issues, engagement-survey collaboration-friction items | |
| 3 | **TSI-2 survey** (PerformanceVP) | 3 perception items |

**Cadence: Quarterly + half-yearly + annual.** Collaboration friction is highly operationally responsive — meeting load can change in a fortnight after a ways-of-working intervention. Quarterly cadence is essential for tracking; half-yearly and annual provide deeper measurement.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 3 (full TSI-2) + Workplace Analytics extract if available | |
| Quarterly | 3 (full TSI-2) | + monthly Workplace Analytics data feed |
| Half-yearly | 3 (full TSI-2) | |
| Annual | 3 (full TSI-2) + behavioural data deep-dive | |

**Event triggers.**

- Ways-of-working intervention (meeting reduction programme, async work shift) → TSI-2 refresh at 30 and 90 days post-implementation to measure intervention effect.
- Sustained Workplace Analytics signal of meeting overload (>20 hours per week per IC, >35 hours per manager) → out-of-cycle survey.

**Confidence decay rule.** High-confidence for 3 months. Medium at 4. Low at 6.

---

## 5.3 S3 — Conflict health

**Definition.** Ratio of constructive task conflict (productive disagreement on ideas, methods, approaches) to destructive relationship conflict (interpersonal friction, personality clashes, harboured grudges). Drawn from De Dreu and Weingart meta-analytic distinction.

**Weight within S:** 30%.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| 1 | None — no major commercial platform measures task vs relationship conflict separately | PerformanceVP differentiator |
| 2 | HR case data on interpersonal grievances (aggregated, legal sign-off), retrospective data flagging conflict events, engagement-survey debate-culture items where present | |
| 3 | **TSI-3 — Conflict Health Survey** (PerformanceVP proprietary) | 5 items: 3 task conflict (forward), 2 relationship conflict (reverse-scored) |

**Cadence: Half-yearly + annual.** Conflict patterns evolve over months. Quarterly refresh is over-frequent for a 5-item construct measuring relatively stable team dynamics; half-yearly is the right grain.

**Refresh load.**

| Refresh type | Items per respondent | Notes |
|---|---|---|
| Baseline | 5 (full TSI-3) | |
| Quarterly | None | |
| Half-yearly | 3 (subset, retaining 2 task + 1 relationship) | |
| Annual | 5 (full TSI-3) | |

**Event triggers.**

- Reported interpersonal grievance or formal complaint in the team → out-of-cycle TSI-3 within 60 days.
- Manager change in the unit → TSI-3 refresh at 90 days post-appointment.
- High M2 (psych safety) score paired with low M1 (engagement) signal → potential suppressed-conflict pattern; trigger TSI-3 investigation.

**Confidence decay rule.** High-confidence for 6 months. Medium at 8. Low at 12.

---

# Part 6 — Decision Latency Protocol (DLP) and Sector classification

## 6.1 DLP — Decision Latency Protocol

**Definition.** Flagship PerformanceVP objective metric. Sampled across three decision classes — operational, tactical, strategic — measuring the elapsed time from problem identification to authorised execution. Produces a Decision Latency Score (DLS) on a 0–100 scale, reported alongside the O composite.

**Where it sits.** Cuts across O1 (decision rights), O3 (process), O5 (leadership enablement) and the governance structure. Reported as a standalone flagship metric, not as a sub-dimension of O.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| All | **DLP — PerformanceVP proprietary protocol** | No commercial equivalent |

The DLP samples decisions from decision records, calendar invitations, meeting minutes, ticketing systems, and the M-DLP-PART decision-participant module (async, with a small number of retained interviews where survey responses leave ambiguity).

**Cadence: Operational class quarterly; tactical class half-yearly; strategic class annual.** Operational decisions cycle fast enough that quarterly sampling catches meaningful change. Tactical decisions cycle on monthly to quarterly windows; half-yearly aggregation produces a stable score. Strategic decisions are infrequent enough that annual sampling is the right grain.

**Refresh load.**

| Refresh type | Sample size | Consultant time |
|---|---|---|
| Baseline | 30–60 decisions across all three classes | Full DLP deployment (M-DLP-PART module + analyst document review); ≈2–3 consultant days, with 30–60 min of retained interviews per unit |
| Quarterly | 5–8 operational decisions | 1–2 consultant days per quarter |
| Half-yearly | 5–8 operational + 5–10 tactical decisions | 2–3 consultant days |
| Annual | Full re-sample 30–60 decisions across all three classes | Full DLP refresh |

**Event triggers.**

- Major decision-rights restructure → out-of-cycle DLP within 90 days of implementation.
- Reported decision-latency complaint (executive or customer escalation) → out-of-cycle DLP on the affected decision class.

**Confidence decay rule.** Operational class high-confidence for 3 months. Tactical class high-confidence for 6 months. Strategic class high-confidence for 12 months.

---

## 6.2 Sector classification (internal comparison only)

**Definition.** Engagement metadata used to classify each unit for internal comparison. The earlier E (System Efficiency) coefficient was removed from the equation; it has **not** been replaced by an external sector benchmark. No public-data overlay is applied to P. Sector classification is retained solely as the substrate for an internal comparison set that grows from PerformanceVP's own engagement data.

**Data sources.**

| Tier | Source | Notes |
|---|---|---|
| n/a | Client-confirmed ANZSIC division/class, sub-sector, size band, unit type | Captured once at engagement setup as metadata |

No external data subscriptions (ABS, RBA, IBISWorld, etc.) are required. The previously planned Annual Sector Reference has been retired.

**Cadence: once per engagement (confirm at annual refresh).** Classification is confirmed at engagement setup and re-confirmed at the annual refresh only if the unit's business mix has materially changed.

**Refresh load.**

| Refresh type | Load | Notes |
|---|---|---|
| Baseline | Confirm classification per unit | One-time metadata capture |
| Quarterly | None | |
| Half-yearly | None | |
| Annual | Re-confirm classification only if business mix changed | |

**Event triggers.**

- Client business mix shifts materially (e.g. acquisition of a business in a different sector) → sector classification refresh.

**Confidence decay rule.** Not applicable — classification is metadata, not a measured score. It remains valid until the unit's business mix changes.

---

# Part 7 — Cross-cutting rules

## 7.1 P score recalculation logic

**Recalculation on real new data — half-yearly and annual.** The P score recomputes at the two points where genuinely new survey and scoring data enters the equation: the half-yearly health check and the annual baseline refresh. The dashboard does not recompute the headline P on an arbitrary calendar tick when nothing has changed. Behavioural triangulators and quarterly-pulse indicators flow continuously and update the dashboard's trajectory layer, but they do not recompute the headline P (see Part 7.2). Sub-dimensions not refreshed at a given recalculation point carry forward at their last measured value, with a confidence-decay annotation.

**Cadence-rollup formula.** The unit-level P score is:

> P = S × (C^0.35 × M^0.40 × O^0.25)

Where each component (C, M, O) is recomputed from its sub-dimensions using the within-component weights specified above, with each sub-dimension taking its most recent measured value, and the standardised component-level weights α=0.35 (Capability), β=0.40 (Motivation), γ=0.25 (Opportunity) applied as exponents. (The public-facing simplified form P = S × (C × M × O)^(1/3) is the equal-weighted special case used in the book and marketing.)

**Reporting confidence.** The dashboard reports P with a confidence indicator:

| Confidence | Condition |
|---|---|
| High | All sub-dimensions refreshed within their high-confidence window |
| Medium | One or more sub-dimensions in medium-confidence (overdue but within 50% of cadence window) |
| Low | One or more sub-dimensions in low-confidence (overdue by more than 50% of cadence window) |

The confidence indicator sits next to the P number on the dashboard. Boards understand and respect this convention.

## 7.2 Quarterly pulse does not produce a fresh P score

The quarterly pulse refreshes a subset of sub-dimensions only. Recomputing P from a heavily carry-forward set creates false precision. The dashboard at quarterly cadence shows:

- Pulse indicators with trajectory (up/down/flat vs last pulse)
- Current P score (carried forward from last full recalculation with confidence annotation)
- Trip-wire indicators (rotating)
- DLP operational-class current score
- Behavioural triangulators (turnover, absence, eNPS)
- Event-trigger flags if any have fired

P recalculates at half-yearly and annual refresh points, not at quarterly pulse. Event-triggered refreshes can also recalculate P out of cycle where a defined trigger justifies it (see Part 7.3).

## 7.3 Event trigger summary

Consolidated list of event triggers across all sub-dimensions:

| Trigger | Affected sub-dimensions | Action |
|---|---|---|
| Unit headcount change >20% in a quarter | C1, C4 (CII), S1 (Skill complementarity) | Provisional dashboard flag; refresh at next quarter |
| New manager into the unit | O5 (Leadership enablement), TSI-3 (Conflict health) | Refresh at 60–90 days post-appointment |
| Manager-development programme completion | O5, M1, M2 | Refresh at 90 days to measure intervention effect |
| Major reorganisation affecting decision rights | O1 (Clarity), DLP | Out-of-cycle Clarity audit and DLP within 60 days |
| Major tool rollout (ERP, CRM, AI) | O2 (Tools & information) | Out-of-cycle audit + survey within 90 days |
| Major process redesign | O3 (Process) | Out-of-cycle audit and survey within 90 days |
| New enterprise strategy or pivot | O1 (Clarity cascade), M4 (Purpose) | Out-of-cycle cascade audit; MI-4 refresh if mission changed |
| Reported speak-up or grievance incident | M2 (Psych safety), TSI-3 (Conflict health), trip-wires | Out-of-cycle within 45–60 days |
| Trip-wire score <60 on any item | Trip-wire indicator | Critical finding; immediate escalation |
| Two or more pulse indicators drop >10 points | Affected sub-dimensions | Out-of-cycle half-yearly health check |
| Pay equity audit pending or recent | Pay-equity trip-wire | Out-of-cycle trip-wire refresh |
| WHS incident in the unit | Conditions trip-wire, M2 | Out-of-cycle trip-wire and MI-2 refresh |
| Backlog growth >25% or burnout indicators | O4 (Resource adequacy) | Out-of-cycle capacity analysis |
| Sustained meeting overload signal in Workplace Analytics | S2 (Collaboration friction) | Out-of-cycle TSI-2 |
| Major sector shock | Sector classification | None — external conditions are not in the model; note in engagement context only |
| Voluntary turnover spike in a specific manager's team | O5 (that team) | Out-of-cycle OI-5 |
| Customer complaint spike on a process-related issue | O3 (affected process) | Out-of-cycle audit |
| Decision-latency complaint or escalation | DLP (affected class) | Out-of-cycle DLP |

**Trigger authorisation.** The subscription contract includes up to 2 event-triggered refreshes per unit per year. Additional triggered refreshes are billed separately at the per-refresh rate.

## 7.4 Pulse anonymity and validity thresholds

| Cadence | Minimum respondents per unit for reporting | Notes |
|---|---|---|
| Baseline | 4 valid respondents per team for CII; 60% response rate per unit | Standard validity rules |
| Quarterly pulse | 12 valid respondents per unit | Stricter threshold due to repeated quarterly cadence and small item counts |
| Half-yearly health check | 8 valid respondents per unit | |
| Annual baseline refresh | 4 per team for CII; 60% per unit | Standard validity rules |

Units below the pulse threshold roll up to a parent department/function and are not reported at unit level for that pulse cycle.

## 7.5 Item rotation rule (anti-patterning)

To prevent respondents from patterning their answers across repeated cycles, items rotate within a small bank for each cadence:

| Sub-dimension | Item bank | Items per pulse | Rotation rule |
|---|---|---|---|
| M1 Engagement & confidence | 8 items | 5 in pulse | Drop 3, rotate from bank each quarter |
| M2 Psychological safety | 5 items | 3 in pulse | Drop 2, rotate from bank each quarter |
| Trip-wires | 3 items | 2 in pulse | Rotate so each is checked at least 2x per year |
| O5 Leadership enablement | 3 items | 3 in pulse | No rotation (small bank) |
| S2 Collaboration friction | 3 items | 3 in pulse | No rotation (small bank) |

Half-yearly and annual surveys use the full item bank for each sub-dimension; rotation applies only to the quarterly pulse.

## 7.6 Carry-forward and decay annotation

Every sub-dimension on the dashboard carries two annotations:

- **Last refreshed** — date of the most recent measurement
- **Confidence band** — High, Medium or Low per the decay rules above

Where a sub-dimension is carried forward in a P calculation beyond its high-confidence window, the dashboard annotates the P score with "Includes carry-forward measurements; refresh due for [list]."

This is the methodological transparency that protects the model from false-precision criticism, particularly from sceptical CFOs or procurement reviewers.

## 7.7 Subscription scope and refresh allocation

The standard tracking subscription includes, per unit per year:

| Item | Quantity |
|---|---|
| Quarterly pulses | 4 |
| Half-yearly health checks | 2 |
| Annual baseline refresh | 1 |
| Event-triggered refreshes | Up to 2 included |
| Executive briefings | 4 quarterly + 1 annual deep review |
| Sector benchmark refresh | n/a (no external benchmark; classification metadata only) |
| Dashboard access and maintenance | Continuous |

Additional event-triggered refreshes, additional intervention design work, or additional ad hoc analyses are billed separately.

---

# Part 8 — Working notes and open questions

## 8.1 Settled decisions captured in this version

- Synergy retained in headline equation with three sub-dimensions (S1, S2, S3) and tightened bounds S ∈ [0.85, 1.15].
- E (system efficiency) removed from equation; not replaced by any in-equation term. Sector retained only as classification metadata for an internal comparison set; no external benchmark, and the previously planned Annual Sector Reference is dropped.
- 17 sub-dimensions across C (5), M (4), O (5), S (3) plus 3 trip-wires and standalone DLP.
- Cadence per sub-dimension determined by how fast the construct actually moves, not by uniform calendar.
- P recalculates on real new data at the half-yearly health check and annual baseline refresh; the quarterly pulse does not produce a fresh P score (it is an early-warning trajectory layer); event-triggered refreshes can recalculate P out of cycle where justified.
- Component-level equation weights standardised at α=0.35 (Capability), β=0.40 (Motivation), γ=0.25 (Opportunity), held constant across engagements; public-facing simplified form is the equal-weighted P = S × (C × M × O)^(1/3).
- One survey instrument per unit, modular internal structure, ~70 items baseline / ~57 half-yearly / ~16 quarterly pulse.
- Behavioural triangulators run continuously via monthly HRIS extracts independent of survey cadence.
- Three-product commercial structure: one-off Diagnostic, Intervention Design, Tracking Subscription.

## 8.2 Open questions for pilot validation

1. **Optimal item rotation logic for M1.** 8-item bank rotating 5 in pulse is a working assumption; pilot data will indicate whether 6-item bank with 4 in pulse produces tighter measurement.
2. **Pulse anonymity threshold.** 12-respondent threshold for quarterly pulse may be too restrictive for some mid-market clients with smaller units. Test in pilot.
3. **Audit-perception gap rule consistency.** The 15-point gap-flag rule for O1, O3, O2 should be tested for false-positive rate in pilot.
4. **Quarterly cadence on collaboration friction.** Worth confirming in pilot whether quarterly is the right grain or whether half-yearly would be sufficient given the underlying Workplace Analytics data feeds monthly.
5. **Event-trigger volume in practice.** The "2 included per unit per year" subscription allocation is a working assumption; first year of subscription engagements will tell us actual frequency.
6. **DLP operational sampling at quarterly cadence.** Worth piloting whether 5–8 decisions per quarter is sufficient or whether larger samples are needed for stable quarter-on-quarter comparison.
7. **CII team-level threshold under unit-level reporting.** Aggregating team CII scores to unit C4 needs sense-checking in pilot — particularly for units with mix of compliant and non-compliant teams.
8. **Trip-wire threshold of <60.** May need calibration once pilot data exists. Initial threshold based on engagement-survey norms.

## 8.3 Next-step actions

1. **Build the survey blueprint. [DONE]** The Survey Blueprint has been built from this master cadence table, with the actual item bank for each sub-dimension and cadence tagging (baseline / quarterly / half-yearly / annual) at the item level.
2. **Restructure the existing document set. [DONE, with one part outstanding]** The five Measurement Architecture modules have been collapsed into a single Measurement Reference (Parts 1 and 2) built around this table. The Instrument Delivery Handbook split is partially complete: the Diagnostic Delivery Handbook and Intervention Design Handbook exist; the Tracking Delivery Handbook is not yet built (tracking logic currently lives in Part 7 of this document pending that handbook). The earlier Data Inventory Templates have been superseded by the Tier 1 & 2 Data Collection Guide and the Data Audit Template.
3. **Build the dashboard wireframe.** With cadence specified, the dashboard's data layers, confidence indicators and trend logic can now be wireframed properly.
4. **Define the data feed architecture.** Monthly HRIS extracts, quarterly Workplace Analytics feed, quarterly engagement-platform integration. Confirm the technical integration approach for the first pilot.
5. **Pilot the cadence design.** Run the full cadence cycle (Baseline + Quarterly + Half-yearly within the same engagement window if compressed) with 1–2 pilot clients to validate the design before going to market.

---

*End of working document. Revisions welcome.*
