# The Performance Equation
## Strategy and Reference Document

**Author:** Michael, PerformanceVP
**Status:** Working draft. Source-of-truth file for the book, consulting offering and diagnostic instrument. This revision reconciles the Strategy with the consolidated measurement model used across the operational document set (Measurement Reference Parts 1 and 2, Sub-Dimension × Cadence Master Reference, Survey Blueprint, Data Audit Template, Tier 1 & 2 Data Collection Guide, Tier 3 Module Library, Diagnostic Delivery Handbook).
**Last updated:** 21 September 2026 (the paired-measurement and triangulation passages now state that the perception score feeds the O composite when the audit-perception gap exceeds 15. Prior, 11 June 2026: binding-constraint identification in Parts 4.2 and 4.3 revised to the realistic-P-gain ranking, weighted toward genuine relative weaknesses via the unit mean; supersedes the earlier lift-to-ceiling contribution ranking; see Diagnostic Workbook Spec Part 10)
**Companion documents:** Performance Equation Measurement Reference Part 1 of 2 (Capability and Motivation); Measurement Reference Part 2 of 2 (Opportunity, Synergy, DLP); Sub-Dimension × Cadence Master Reference; Survey Blueprint; Data Audit Template; Tier 1 & 2 Data Collection Guide; Tier 3 Module Library; Diagnostic Delivery Handbook.

---

## Purpose of this document

This file is the consolidated reference for the Performance Equation as a piece of commercial intellectual property. It sets out:

1. The finalised mathematical model and its theoretical justification.
2. A plain-English translation of the equation for executive and board audiences.
3. The measurement architecture for each of the four elements of the equation (three components C, M, O and the Synergy adjustment S), including the consolidated sub-dimension structure and the tiered data hierarchy. Full operational detail for each element lives in the Measurement Reference (Parts 1 and 2) and the supporting operational documents.
4. The client-facing presentation logic, including the three commercial offerings, report design and dashboard structure.

Everything here is intended to be revised as the model is calibrated against real client data. Where this document specifies weights, coefficients and bounds, those values are evidence-informed defaults held static across all engagements; the calibration pathway for refining them against PerformanceVP's accumulating pilot data is noted where relevant.

---

## Part 1. The Finalised Mathematical Model

### 1.1 The equation

The Performance Equation, in its commercial form, is:

**P = S × (C^α × M^β × O^γ)**

subject to **α + β + γ = 1**

Where:

| Symbol | Definition | Scale |
|---|---|---|
| P | Performance index for a team or organisational unit | 0 to 100 |
| C | Collective Capability composite score | 0 to 100 |
| M | Collective Motivation composite score | 0 to 100 |
| O | Systemic Opportunity composite score | 0 to 100 |
| α, β, γ | Component weights (output elasticities), summing to 1 | 0 to 1 |
| S | Synergy coefficient (team interaction quality) | 0.85 to 1.15 |

The standardised default weights, held constant across all engagements, are:

| Component | Symbol | Default weight |
|---|---|---|
| Capability | α | 0.35 |
| Motivation | β | 0.40 |
| Opportunity | γ | 0.25 |

So the working equation, with defaults applied, is:

**P = S × (C^0.35 × M^0.40 × O^0.25)**

There is no separate E (system efficiency) coefficient in this model; the earlier E coefficient has been retired. External sector conditions are deliberately kept outside the equation: P measures the internal, human-and-systemic determinants of performance, and external context (sector productivity, growth, regulatory load, macro conditions) is not allowed to distort the internal score. Each unit is still classified by sector and unit type (see Part 3.6) so that, as PerformanceVP accumulates engagements, an internal comparison set can be built from real P-score data — but no external sector benchmark is published or applied to the score.

### 1.2 Why this form, mathematically

Five properties make this specification defensible.

**It is multiplicative, not additive.** The geometric structure C^α × M^β × O^γ enforces the principle that any one component approaching zero drives P toward zero. A team with high capability, zero motivation and high opportunity produces nothing; the equation reflects that. An additive form (C + M + O) would let a surplus in one component compensate for a deficit in another, which is contradicted by the evidence base and by what leaders observe on the ground.

**It is weighted, not equal-weighted.** The exponents α, β and γ are output elasticities: near healthy levels, a 1% rise in a component produces a rise in P proportional to that component's weight, holding the others constant. This reflects the meta-analytic evidence (Jiang, Lepak, Hu and Baer, 2012, *Academy of Management Journal*, 116 studies) that the three components carry differential, heterogeneous effects on performance rather than contributing equally. Critically, that evidence does not support the intuitive assumption that capability is the dominant component: the meta-analytic findings indicate that the motivation pathway is among the strongest, with skill-enhancing practices more strongly related to human capital but less strongly related to the motivation that drives discretionary effort. The default weights (β = 0.40 for Motivation, α = 0.35 for Capability, γ = 0.25 for Opportunity) reflect this ranking — Motivation ≥ Capability > Opportunity — rather than the older capability-first assumption.

**The weights are deliberately clean defaults, not spurious precision.** The weights are set at 0.05 increments to signal honestly that they are evidence-informed defaults grounded in the meta-analytic ranking, not regression outputs calibrated on a specific client's data. Presenting them as, say, 0.347 / 0.398 / 0.255 would imply a calibration PerformanceVP has not yet performed. The clean defaults are both more defensible and more honest. They are held static across all engagements and are not varied by industry; industry differences are handled inside the components, through the sub-dimension weights (see Part 3 and the Measurement Reference), not through the top-level component weights.

**It is log-linear when transformed.** Taking natural logs gives:

> ln P = ln S + α ln C + β ln M + γ ln O

This is a standard linear form. Once PerformanceVP has accumulated sufficient paired data across enough business units (a minimum of roughly 12 to 24 months of paired data across at least 20 units), the elasticities can in principle be estimated empirically by regressing historical performance outcomes on historical component scores. Until that calibration data exists, the standardised defaults are used and are disclosed as defaults. This preserves the option of moving to empirically-estimated weights in future without changing the structure of the model.

**The synergy coefficient S captures team-level emergence, bounded to a moderate range.** Team performance is not the simple product of the underlying components; the quality of team interaction either amplifies or suppresses what C, M and O imply. S is bounded between 0.85 and 1.15 so that it adjusts the score by at most ±15% (see Part 1.4 for the evidence basis of this bound).

### 1.3 The simplified form for general use

For the book, board papers and most consulting communication, the equation can be presented in its headline structural form:

**P = S × (C × M × O)^(1/3)**

This is the equal-weighted special case (α = β = γ = 1/3). It is useful as the public-facing, intuition-building version because it shows the multiplicative weakest-link logic cleanly without requiring the audience to absorb the weights. The weighted form with the 0.35 / 0.40 / 0.25 defaults sits underneath as the analytical engine that produces the actual scores. In practice the difference between the two is second-order: the geometric structure does the heavy lifting in both, and the weights only tilt the gradient between components once they are all reasonably healthy. The book and marketing can lead with the simplified form and disclose the weighted form as the working model.

### 1.4 The Synergy coefficient and its evidence basis

Synergy operationalises the long-established team-effectiveness principle, originating with Steiner (1972), that a team's actual productivity equals its potential productivity minus process losses (and, in the positive case, plus process gains). In Steiner's framework, *actual productivity = potential productivity − losses due to faulty group processes*. The Performance Equation maps directly onto this: C, M and O define the unit's potential, and S adjusts that potential for how effectively the team actually works together. Process losses in Steiner's model fall into coordination losses and motivational losses, which are the conceptual parents of the Synergy sub-dimensions (collaboration friction and conflict health) — see Part 3.4.

The **bound of 0.85 to 1.15 (±15%)** is set deliberately to reflect the *magnitude* of team process effects established in the empirical literature, not to claim a precise measured multiplier (no such single coefficient exists in the research). The anchor is the meta-analysis of teamwork processes by LePine, Piccolo, Jackson, Mathieu and Saul (2008, *Personnel Psychology*), which found that teamwork processes have a **moderate** — real and consistent, but not dominant — relationship with team performance, with the strength of that relationship somewhat dependent on task interdependence and team size. A ±15% bound is consistent with a moderate effect: it allows Synergy to meaningfully amplify or drag performance without overriding the substantive measurement of Capability, Motivation and Opportunity, which are measured from far more data (roughly 70 survey items plus system data) than the three Synergy sub-dimensions. A wider bound such as ±30% would imply teamwork alone could nearly double or halve a team's effective performance, which overstates a moderate effect and would let the lightest-measured element dominate the score.

The internal Synergy composite (S_internal, on a 0–100 scale) is mapped to the coefficient by:

> S = 0.85 + (S_internal / 100) × 0.30

so that S_internal = 50 maps to S = 1.00 (neutral synergy, the default), S_internal = 0 maps to S = 0.85 (maximum drag), and S_internal = 100 maps to S = 1.15 (maximum amplification). In practice most units fall between S = 0.93 and S = 1.12. The bound is a principled bound informed by the moderate-effect finding; it is validated and refined against PerformanceVP's own pilot data over time.

### 1.5 What the model does not claim

Three honest limitations to disclose openly in the book and to clients.

The model is a decision-support instrument, not a deterministic predictor. P is a directional index correlated with outcomes, not a guaranteed forecast of revenue or profit.

The components are measured with error. Survey-based measures of motivation and self- or peer-rated measures of capability carry the standard limitations of perceptual data. Triangulation with objective metrics reduces this error but does not eliminate it.

The model addresses the people-and-organisation contribution to performance. Strategy quality, capital allocation, market conditions and luck sit outside the equation. The Performance Equation explains the human-and-systemic determinants of output, not the entire production function of the firm.

### 1.6 The flywheel: dynamic feedback

The equation is presented as a static formula for clarity, but the underlying system is dynamic. Three feedback loops should be modelled in any longitudinal application:

- **Efficacy spiral:** higher P at time t raises baseline M at time t+1, because collective achievement strengthens collective efficacy.
- **Capability-Opportunity coupling:** sustained high C generates pressure on the organisation to expand decision rights and information access, raising O over time.
- **Opportunity-Capability coupling:** strong O reduces the cost of capability acquisition, accelerating C growth.

These loops mean that interventions in one component eventually lift the others, and that decline in one component can cascade into others. The dashboard (Part 4) tracks each component on its own trajectory so that early-warning signs are visible.

### 1.7 Theoretical lineage in brief

The Performance Equation is grounded in five converging research traditions:

- Vroom's Expectancy Theory (1964): P = f(Ability × Motivation), establishing the multiplicative logic.
- Blumberg and Pringle (1982, *Academy of Management Review*): the Opportunity, Capacity, Willingness three-factor interactive model that added the systemic dimension Vroom had missed.
- Campbell's theory of performance (1990, 1993, 2012): declarative knowledge, procedural skill and motivation as the three direct determinants of behavioural performance.
- Appelbaum, Bailey, Berg and Kalleberg (2000): the Ability-Motivation-Opportunity (AMO) framework tied to High-Performance Work Systems and strategic HRM.
- Jiang, Lepak, Hu and Baer (2012, AMJ): the meta-analytic evidence that the three components work through different mediating mechanisms and carry different empirical weights — the basis for the differential component weights in this model.

Adjacent foundations include the Job Demands-Resources model (Bakker and Demerouti), Self-Determination Theory (Deci and Ryan), transactive memory systems research (Wegner; Ren and Argote), collective efficacy theory (Bandura), Steiner's (1972) process-loss model and the LePine et al. (2008) teamwork-process meta-analysis (the basis for the Synergy coefficient and its bound). The Bos-Nehles et al. systematic review (2023) confirms multiplicative two-way and three-way interactions have been demonstrated empirically, and characterises opportunity as operating partly as a boundary condition on ability and motivation — itself supporting the multiplicative rather than additive structure.

---

## Part 2. The Plain-English Version (for business leaders)

### 2.1 The core idea, in one paragraph

Performance is what a team or organisation actually produces. Three things determine it. **Capability** is whether the people have the skills, knowledge and experience to do the work. **Motivation** is whether they are willing to put in real effort and care about the outcome. **Opportunity** is whether the organisation makes it possible for them to do their best work, with the tools, information, decision rights and processes they need. If any one of these is missing, performance collapses regardless of the others. A brilliant, motivated team with no tools and no authority cannot perform. A capable team with great systems but no motivation will not perform. A motivated team with great systems but no skills cannot perform. All three have to be present.

### 2.2 Why the formula is multiplied, not added

The Performance Equation multiplies the three components rather than adding them. This is the most important point to convey to a leader and the one that distinguishes this model from most engagement surveys.

Adding them would mean a great score on one component can offset a terrible score on another. A 90 in Capability and a 10 in Opportunity would average to 50, suggesting middling performance. But anyone who has watched a brilliant team get strangled by bad systems knows the real outcome is closer to zero, not 50. Multiplying captures this. If any component is very low, the whole product is very low. The equation reflects what leaders see on the ground.

This is the **weakest link principle**: performance is constrained by whichever of the three components is the weakest. Fixing the weakest is the highest-leverage intervention.

### 2.3 Why the three are not weighted equally

The three components do not contribute equally to performance, and the equation reflects this. Drawing on the strongest meta-analytic evidence in the field, motivation carries the largest weight, capability is close behind, and opportunity carries the smallest of the three. This is worth stating plainly because it corrects a common intuition: leaders often assume capability (talent, skills) is the dominant lever, but the evidence shows that the willingness to apply that capability — motivation — is at least as consequential. The weights are modest in their spread; the multiplicative structure still dominates, so the practical message remains "fix the weakest link first," with the weights breaking ties when components are close.

### 2.4 The synergy adjustment

**Synergy** is whether the team works well together. The same people, with the same skills, in the same conditions, will produce different output depending on how their work fits together. Teams with complementary skills, low collaboration friction and healthy, productive disagreement will outperform teams of equivalent average skill that lack those qualities. Teams with conflict, overlap and coordination failure will underperform their on-paper potential. Synergy can amplify the underlying scores or drag them down, by up to about 15% either way — a meaningful adjustment, but not one that can override genuinely weak (or genuinely strong) fundamentals.

### 2.5 How to explain it in a board meeting

A board-friendly version, designed to fit on one slide:

> Performance comes from three things working together: people with the right capability, the motivation to apply themselves, and an organisation that gives them the opportunity to perform. These three multiply rather than add — if any one is weak, performance is weak. They are weighted to reflect the evidence on what matters most, with motivation carrying the largest weight. A synergy factor then adjusts for how well the team actually works together. The Performance Equation scores all of this on a 0 to 100 scale and produces a single performance index. It tells the board what is driving performance, where the binding constraint is, and where the highest-return intervention lies.

### 2.6 What this changes for management

The Performance Equation reframes three common management conversations.

It reframes the engagement conversation. Engagement is part of Motivation. It is not the whole story. A high-engagement organisation with weak capability or broken systems will still underperform. Engagement data is useful but partial.

It reframes the talent conversation. Talent is part of Capability. Bringing in great people without fixing decision rights, tools or motivation produces frustrated high performers who leave. Talent strategy has to be paired with opportunity and motivation strategy.

It reframes the transformation conversation. Most transformations focus on structure, process and technology, which sit inside Opportunity. They are necessary but not sufficient. Without parallel attention to Capability and Motivation, structural change produces compliance, not performance.

---

## Part 3. Measurement Architecture

This section turns the equation from a concept into a commercial product. The model measures **17 sub-dimensions** across the three components and the synergy coefficient, plus **three hygiene trip-wires** that operate as independent critical-finding indicators, plus the **Decision Latency Protocol (DLP)** as a flagship objective metric. Each unit is also classified by sector and unit type for internal comparison (see Part 3.6); this classification is metadata, not a term in the equation and not an external benchmark.

The consolidated structure is:

| Element | Sub-dimensions | Count |
|---|---|---|
| Capability (C) | C1 Skill, C2 Knowledge, C3 Talent density, C4 Collective intelligence, C5 Learning velocity | 5 |
| Motivation (M) | M1 Engagement and confidence, M2 Psychological safety, M3 Autonomous motivation, M4 Purpose alignment | 4 |
| Opportunity (O) | O1 Clarity and decision rights, O2 Tools and information, O3 Process and workflow, O4 Resource adequacy, O5 Leadership enablement | 5 |
| Synergy (S) | S1 Skill complementarity, S2 Collaboration friction, S3 Conflict health | 3 |
| Trip-wires | Pay equity, Fairness, Basic conditions | 3 (overlay, not weighted into M) |
| Decision Latency Protocol | Operational, Tactical, Strategic decision classes | flagship metric, reported alongside O |
| Sector classification | ANZSIC sector, sub-sector, size band, unit type | metadata for internal comparison, not in the equation |

Full data-source registers, tier acceptance criteria, conversion rules and proprietary instrument specifications for every sub-dimension live in the Measurement Reference (Part 1 for C and M; Part 2 for O, S and DLP). This Strategy gives the architecture and the weights; the Measurement Reference is the operational scoring authority.

> **Source of truth.** The sub-dimension structure, the within-component weights and the refresh cadence are owned by the Sub-Dimension × Cadence Master Reference. The figures repeated in this Strategy are derived from it for narrative completeness; if any of them need to change, change them in the Cadence Master first and then propagate outward.

### 3.1 The tiered data hierarchy

For each sub-dimension, data is drawn from one of three tiers, applied in order of preference. This is the organising principle of the entire measurement approach: **use the client's existing data wherever it meets quality standards, and deploy PerformanceVP's own instruments only where no acceptable client data exists.**

- **Tier 1 — Gold standard.** Validated platform or system data with documented methodology, used directly with light normalisation, subject to per-sub-dimension acceptance criteria (minimum coverage, vintage, calibration documentation, etc.).
- **Tier 2 — Acceptable alternative.** Platform or system data with reputable methodology, used with provider-specific conversion rules and, where appropriate, confidence-band adjustment.
- **Tier 3 — PerformanceVP instrument.** Deployed where Tier 1 and Tier 2 are unavailable or insufficient. Tier 3 is not a sign of weak data; for some constructs (collective intelligence, decision latency, conflict health) there is *no* commercial Tier 1 source, and the PerformanceVP instrument is the right tool by design.

Tier assignment is determined during the data audit (a 90-minute triage workshop, per the Data Audit Template), validated against the checklists in the Tier 1 & 2 Data Collection Guide, and recorded in the methodology footer of every client deliverable. The principle throughout is **minimum sufficient data**: request only what is needed for the sub-dimensions where client data will actually be used, and deploy PerformanceVP instruments only for the genuine gaps.

The Tier 3 instruments are delivered primarily through a single **Performance Equation Diagnostic Survey** plus a small library of audience-specific modules (the Tier 3 Module Library), rather than through workshops. Workshops are minimised to the data audit, the conditional Talent Density Calibration workshop (only where cross-manager calibration is genuinely required), and the executive briefing.

### 3.2 Measuring Capability (C)

**Definition.** The aggregate ability of a team or organisation to do the work required — the right people with the right knowledge, skills, experience and collective intelligence to convert effort into output.

**Sub-dimensions and weights (within C):**

| Sub-dim | Construct | Weight in C |
|---|---|---|
| C1 | Skill (including behavioural and leadership capability relevant to the role, and an experience-depth moderator) | 35% |
| C2 | Knowledge depth and breadth | 15% |
| C3 | Talent density | 20% |
| C4 | Collective intelligence (transactive memory: expertise clarity, trust and flow) | 20% |
| C5 | Learning velocity | 10% |

**Capability composite:**

> C = 0.35(C1) + 0.15(C2) + 0.20(C3) + 0.20(C4) + 0.10(C5)

Note the consolidation from the earlier seven-sub-dimension Capability structure: behavioural and leadership capability is now absorbed into C1 (with the leadership-enablement aspect moved to O5, where it belongs as part of the system that enables performance); and experience depth is now a tenure-weighted moderator within C1 rather than a standalone sub-dimension. C4 Collective intelligence is measured through the PerformanceVP Collective Intelligence Index (CII), a proprietary Tier 3 instrument, because no commercial platform measures the transactive-memory construct directly.

### 3.3 Measuring Motivation (M)

**Definition.** The aggregate direction, intensity and persistence of discretionary effort within the team or organisation — the willingness to perform the work well and to extend beyond it.

**Sub-dimensions and weights (within M):**

| Sub-dim | Construct | Weight in M |
|---|---|---|
| M1 | Engagement and confidence (consolidates engagement, team potency/collective efficacy, and affective commitment/pride) | 50% |
| M2 | Psychological safety | 20% |
| M3 | Autonomous motivation (Self-Determination Theory) | 15% |
| M4 | Purpose alignment | 15% |

**Motivation composite:**

> M = 0.50(M1) + 0.20(M2) + 0.15(M3) + 0.15(M4)

The consolidation here merges the previously separate engagement, collective efficacy and affective commitment constructs into M1, on the basis that they correlate empirically at r ≈ 0.6–0.8 and measuring them separately produces noise rather than signal. M1 carries a high within-component weight as the consolidated headline motivation construct. Survey scores are triangulated against behavioural indicators (turnover, absence, internal mobility, eNPS, goal achievement); where survey and behavioural data diverge by more than 15 points on the 0–100 scale, the gap is flagged as a diagnostic finding rather than averaged away.

### 3.3.1 The hygiene trip-wires

Pay equity, fair treatment and basic working conditions are **not** weighted sub-dimensions of Motivation. They are three independent **trip-wire** indicators that operate as critical-finding flags. This is a deliberate and important design choice, and it changes how hygiene factors behave in the model.

In an earlier version, hygiene was a small (≈5%) weighted slice of Motivation. That meant a hygiene failure was averaged away — a unit could have a serious pay-equity or conditions problem and still post a healthy M, rendering the failure invisible in the headline score. That is the wrong behaviour: pay inequity, unfair treatment and inadequate basic conditions are not minor drags on motivation; they are red-line issues a leader has a duty to act on regardless of how strong everything else looks.

By pulling them out as trip-wires, the model treats them as binary critical-finding flags rather than as graduated, averageable inputs. **Any trip-wire scoring below 60 is a critical finding that surfaces in the client reporting regardless of the overall P score.** The trip-wires do not enter the P calculation at all.

**Reporting requirement (mandatory).** Because the trip-wires sit outside the P score, the reporting must always present them explicitly and prominently — never buried, never implied by the headline number. Specifically:

- Trip-wire status is surfaced in the executive summary as its own item, separate from the P score, whenever any trip-wire is breached.
- The client report and the executive briefing PowerPoint each carry dedicated content for trip-wires (a trip-wire status view and, where one fires, a consolidated critical-findings view).
- A breached trip-wire is framed as a "do something now" finding, distinct in category from the graduated diagnostic findings, with the relevant action path noted (pay equity audit; fairness investigation; conditions remediation).
- The reporting makes clear that a healthy P score does **not** clear a trip-wire: the P score answers "how is this unit performing," and the trip-wires answer "is anything here unacceptable." Both questions must be visible side by side so that a leader never reads a good P and concludes everything is fine.

This requirement is a fixed principle of the offering, captured here and operationalised in the Measurement Reference (Part 8.4), the Survey Blueprint (trip-wire items and scoring), and the Diagnostic Delivery Handbook (executive briefing protocol).

### 3.4 Measuring Opportunity (O)

**Definition.** The degree to which the organisational system enables performance — the tools, information, decision rights, processes, structure and leadership context that allow capability and motivation to convert into output.

**Sub-dimensions and weights (within O):**

| Sub-dim | Construct | Weight in O |
|---|---|---|
| O1 | Clarity and decision rights (consolidates decision rights, role clarity and strategic-alignment cascade) | 30% |
| O2 | Tools and information | 25% |
| O3 | Process and workflow | 20% |
| O4 | Resource adequacy | 10% |
| O5 | Leadership enablement | 15% |

**Opportunity composite:**

> O = 0.30(O1) + 0.25(O2) + 0.20(O3) + 0.10(O4) + 0.15(O5)

The consolidation merges the earlier eight Opportunity sub-dimensions into five: decision rights, role clarity and strategic clarity combine into O1 (respondents experience these as one question — do I know what I am meant to do, what I am authorised to decide, and how my work connects up); and the standalone coordination/governance sub-dimension is absorbed into O1 and the DLP. O5 Leadership enablement now also carries the leadership-behaviour aspect previously sitting in Capability.

**The paired-measurement design.** O1, O2 and O3 each combine a structural audit (what exists on paper) with a perception survey (what is experienced). Where the two diverge by more than 15 points, the gap is reported as a key diagnostic finding rather than averaged — frequently the most valuable Opportunity finding in an engagement. Above 15 points the perception score is the value that feeds the O composite.

**Decision Latency Protocol (DLP).** The single most diagnostic Opportunity-related metric is decision latency: the elapsed time from a decision being recognised as needed to its authorised execution, sampled across operational, tactical and strategic decision classes. The DLP produces a Decision Latency Score (DLS) on a 0–100 scale. The DLS is reported alongside the O composite — **not** averaged into it — because it carries independent diagnostic weight and is often the most actionable single finding in an engagement.

### 3.5 Measuring Synergy (S)

**Definition.** A coefficient between 0.85 and 1.15 representing the degree to which team interaction amplifies or dampens the performance implied by C, M and O. (See Part 1.4 for the evidence basis of the construct and the bound.)

**Sub-dimensions and weights (within S_internal):**

| Sub-dim | Construct | Weight in S_internal |
|---|---|---|
| S1 | Skill complementarity | 30% |
| S2 | Collaboration friction | 40% |
| S3 | Conflict health (productive task conflict vs destructive relationship conflict) | 30% |

**Synergy internal composite and mapping:**

> S_internal = 0.30(S1) + 0.40(S2) + 0.30(S3)
>
> S = 0.85 + (S_internal / 100) × 0.30

S1 reuses the C1 skills data analytically (no new collection). S2 and S3 map onto Steiner's coordination losses and the task/relationship conflict distinction respectively. Collaboration friction (S2) carries the largest within-S weight because collaboration overload is the most operationally consequential and most frequently actionable drag on team output.

**Why Synergy is a high-ROI lever.** Synergy interventions act on existing capability and motivation rather than building new capability from scratch, and they are typically faster to implement (meeting-load reduction, handoff redesign, conflict mediation, team-composition rebalancing). Within the ±15% bound, a meaningful improvement in S translates into a direct uplift in P at no change to the underlying components. The Synergy findings should be positioned in the diagnostic report as a high-leverage intervention area.

### 3.6 Sector classification (internal comparison only)

Each unit is classified by ANZSIC division and class, sub-sector, organisation size band and unit type. This classification is captured purely as engagement metadata. **PerformanceVP does not publish or apply an external sector benchmark, and sector conditions are not a term in the equation.** The earlier plan for an Annual Sector Reference compiled from public data (ABS, RBA, Productivity Commission, IBISWorld) has been retired: in the early years it could only ever provide thin macro context rather than a defensible P-score comparison, and the genuinely valuable benchmark — distributions of real P scores by sector × unit-type × size-band — can only be built from PerformanceVP's own accumulating engagement data.

The classification is therefore kept for one reason: it is the substrate for an **internal comparison set** that grows engagement by engagement. After enough engagements accumulate, PerformanceVP will be able to say "a P of 64 sits at the Nth percentile of comparable units in our own dataset." Until that internal set is large enough to be meaningful, reports present the unit's P score on its own terms (against its own history once tracking begins, and against the absolute 0–100 colour bands), without an external benchmark claim. This is the more honest and more defensible position, and it removes a recurring annual production burden and the need for a sector-economist adviser.

### 3.7 Survey design and instrument principles

Four design rules hold across all instruments:

**Proprietary item development.** PerformanceVP builds proprietary items measuring established theoretical constructs (transactive memory, engagement, psychological safety, autonomous motivation, purpose, role clarity, task/relationship conflict, etc.) rather than licensing published academic scales, several of which carry commercial-use restrictions. The constructs are public domain; the item wordings and scoring rules are PerformanceVP's. This is the same approach taken by Culture Amp, Gallup, Korn Ferry and other commercial measurement firms. (Settled methodological decision, established 15 May 2026, applying to all current and future PerformanceVP instruments.)

**Modular structure, single survey.** The all-population perception measurement is delivered through one branded Performance Equation Diagnostic Survey (≈70 items at baseline) whose internal modular structure is invisible to respondents. Audience-specific Tier 3 modules (for managers, leadership teams, team leaders and decision participants) are deployed only where the data audit identifies a gap.

**Empirical validation pathway.** Each proprietary instrument follows a validation pathway: pilot across 30+ teams; Cronbach's alpha targets per sub-dimension; confirmatory factor analysis once sufficient responses accumulate; and criterion-validity correlation against external performance outcomes. An organisational psychologist with academic affiliation advises on the survey instruments; an operating-model specialist advises on the audit components.

**Triangulation against objective data.** Every survey-based score is paired with at least one objective behavioural indicator. Where the two diverge by more than 15 points, the gap is flagged as a diagnostic finding rather than averaged. This applies to Motivation (survey vs behavioural) and to Opportunity (audit vs perception). For Opportunity, the perception score is then the value that feeds the composite.

---

## Part 4. Commercial Model, Client Presentation and Dashboard

### 4.1 The three commercial offerings

The Performance Equation is commercialised through three products, in sequence:

**1. The Diagnostic (one-off, fixed-fee).** A 6–8 week engagement (longer for large portfolios) producing a quantified baseline: the P score, the C/M/O/S breakdown, all 17 sub-dimension scores, the binding constraint, the Decision Latency Score, trip-wire status, and 5–8 prioritised intervention recommendations per unit. Deliverables: a unit-level diagnostic report (30–50 pages), a board-ready executive summary (4 pages), and a 90-minute executive briefing. This is the entry point for every client.

**2. Intervention Design (project-based).** Detailed design of one to three priority interventions identified by the Diagnostic, with success criteria and tracking. Delivered by PerformanceVP, the client, or a partner.

**3. The Tracking Subscription (ongoing).** The recurring-revenue layer and the basis of the client portal. Quarterly pulses, half-yearly health checks and an annual baseline refresh, with a login portal showing the score breakdown, data, and change over time. Cadence and refresh logic are set out in Part 4.4.

### 4.2 The baseline diagnostic report

Delivered after the initial engagement. Structure:

1. **Executive summary (2 pages).** Headline P score, the three component scores, the binding constraint, top three recommendations, and trip-wire status (prominently, if any are breached).
2. **The Performance Equation explained (2–3 pages).** The model, what it measures, how it was applied to this client.
3. **Headline findings.** P visualised, C/M/O/S breakdown, sub-dimension breakdown.
4. **Capability / Motivation / Opportunity / Synergy findings.** One section each: component score, sub-dimensional breakdown, strengths and gaps, audit-perception gaps where applicable.
5. **Decision Latency findings.** DLS, class-level breakdown, bottleneck patterns, critical findings.
6. **Diagnostic findings.** Gap flags, trip-wire status, false-consensus pattern if applicable.
7. **The binding constraint.** The top-ranked sub-dimension from the realistic-P-gain ranking, why it binds, and what unlocking it would realistically do for P, with the top-six ranking shown.
8. **Recommended interventions (6–10 pages).** 5–8 prioritised interventions, each tied to a specific sub-dimension, with expected effect on P, indicative cost and timeline.
9. **Methodology footer.** Tier mix, data sources, validity and exclusions, confidence bands, gap flags, critical findings.

The executive summary is always pulled out as a standalone four-page document for board distribution.

### 4.3 The binding constraint and the Decision Latency Score — the flagship outputs

Two outputs distinguish the Performance Equation from existing diagnostics, and both should be positioned as the headline value.

**The binding constraint** is the single highest-impact place to intervene in a unit: the sub-dimension where a realistic, evidence-bounded improvement would deliver the most P, concentrated where the unit is genuinely below its own level. Because the equation multiplies C, M and O, a weak component drags the whole score down, so the binding component, the lowest of C, M and O, is reported alongside as the weakest force. Operationally, the Diagnostic Workbook ranks the 14 Capability, Motivation and Opportunity sub-dimensions on three things together: the realistic gain achievable in each, bounded by diminishing returns since interventions deliver modest improvements rather than a leap to perfection; the resulting gain in P, which accounts for the sub-dimension's weight, its component's score and the component's exponent, so leverage is preserved; and how far the sub-dimension sits below the unit's own average, so a high-leverage strength is not mistaken for a constraint. Synergy is excluded as a coefficient rather than a candidate. The top-ranked sub-dimension is the headline, presented with the top-six ranking behind it. It is identified per unit, and it is typically different from one unit to the next: the same organisation's Marketing and Engineering functions usually have different binding constraints and therefore need different interventions, not one enterprise-wide programme. This is the basis of the model's core promise: not just a score, but a precise, evidence-grounded answer to "where will an intervention have the most impact here, and what is it."

**The Decision Latency Score** is a hard, objective measure of how long decisions actually take in the unit, by class, with the bottleneck patterns producing the latency. It matters because decision latency is a leading indicator that degrades before lagging measures (revenue, satisfaction) move, and because it points directly at where decision rights or governance are broken. Most organisations have only anecdote here; the DLS gives leadership a defensible number and a specific operational target.

The deeper value, which the reporting should make explicit, is **traceability**: every one of the 17 sub-dimensions carries its own score and its own contribution to P. The diagnostic does not merely say "performance is a 64"; it says exactly which sub-dimension is dragging, by how much, and what moving it would do. This score → component → sub-dimension → specific intervention → expected P-impact chain is what converts a number into a targeted, prioritised, highest-ROI action plan. That traceability is the product.

### 4.4 The Tracking Subscription: cadence and dashboard refresh

The Tracking Subscription is the recurring product and the basis for the client portal. Its central design principle is that **the score updates when the data updates, not on an arbitrary calendar tick.** The P score and the equation refresh on real new data; the dashboard does not recompute the headline number when nothing has changed.

**The headline P score refreshes half-yearly and annually.** These are the two points at which genuinely new survey and scoring data enters the equation:

- **Annual baseline refresh** — full re-measurement of all 17 sub-dimensions, full P recalculation, weight refresh, and instrument review.
- **Half-yearly health check** — re-measurement of the fast- and medium-moving sub-dimensions (engagement, psychological safety, leadership enablement, collaboration friction, the full CII, the O1/O2/O3 perception components, resource adequacy, conflict health, and the trip-wires), with the genuinely slow-moving annual-only sub-dimensions (autonomous motivation, purpose, and the system-data Capability sub-dimensions) carried forward. P recalculates at this point.

**The quarterly pulse is an early-warning layer, not a P recalculation.** The pulse refreshes only the fastest-moving indicators (engagement, psychological safety, leadership enablement, collaboration friction, the trip-wires, and a single CII early-warning item). Because it touches only a handful of sub-dimensions, recomputing the full P from a mostly carried-forward set would create false precision. So the pulse shows indicator trajectories (up/down/flat), the current P carried forward with a confidence annotation, trip-wire status, the DLP operational-class score, and behavioural triangulators — but it does not move the headline P. Its job is to catch deterioration between the half-yearly scoring points.

**Event-triggered refresh.** Defined events (a major reorganisation, a new manager, a trip-wire breach, a significant pulse drop of more than ~10 points on an indicator) trigger an out-of-cycle re-measurement of the affected sub-dimensions and a P recalculation. This is what allows the score to respond between half-yearly points when the data genuinely justifies it — without routine false updates. The standard subscription includes up to two event-triggered refreshes per unit per year.

**Behavioural triangulators** (turnover, absence, overtime, etc.) flow continuously and feed gap-flagging and the pulse view, but they do not independently recompute the C/M/O scores.

**Confidence annotation throughout.** Every score on the portal carries a "last refreshed" date and a High / Medium / Low confidence band based on how recently it was measured against its cadence. This is the mechanism that lets the portal show live trajectory and early warnings honestly, without ever implying the headline P is freshly computed when it is carried forward. It is also the methodological transparency that protects the offering from false-precision criticism.

### 4.5 The dashboard / portal structure

The portal (to be built) is the surface for the Tracking Subscription. Structure:

**Top-level view:** the current P score with trend over the last four refresh points; the three component scores (C, M, O) with trend; the synergy coefficient S; the current binding constraint, visually emphasised; trip-wire status, presented as its own clearly-separated element (never folded into the P score); and a flag where any component has moved materially since the last refresh.

**Drill-down by business unit:** P, C, M, O, S per unit; comparison against the organisation-wide average and the unit's own history; a flag where a unit's binding constraint differs from the enterprise binding constraint.

**Drill-down by sub-dimension:** all 17 sub-dimensions (5 C, 4 M, 5 O, 3 S), each with its score, trend, and contribution to P; the three CII sub-scores within C4; the Decision Latency Score within the Opportunity view; heat-map visualisation of weak sub-dimensions; gap-flag indicators (survey-vs-behavioural for Motivation, audit-vs-perception for Opportunity).

**Trip-wire view:** the three trip-wires shown as independent indicators alongside (not inside) the P score, with any breach flagged as a critical finding — consistent with the reporting requirement in Part 3.3.1.

**Decision latency view:** the DLS composite and the underlying latencies by decision class, trend, and the longest-latency decision pathways with intervention status.

**Intervention tracking:** active interventions mapped to the sub-dimensions they target, with expected and actual P movement, and lead/lag indicators.

### 4.6 Visual design principles

**One headline number.** The P score is the largest element; everything else is supporting context.

**Three colour bands.** Green (above 75), amber (50–75), red (below 50). Sub-dimensional views may use a five-band heat-map where finer resolution helps.

**Trend always visible.** Every score is shown with its trajectory; a high score declining is a different signal from a high score holding.

**Binding constraint highlighted.** The constraining component is visually emphasised on every view.

**Trip-wires never buried.** Trip-wire status is always presented as a distinct element, never implied by the headline P.

**No false precision.** Scores are reported to the nearest integer; movement below two points is not flagged as significant; confidence bands are always shown.

---

## Part 5. Working Notes and Next Steps

### 5.1 IP and brand notes

- The headline term is "The Performance Equation". Worth registering as a trademark in Australia and reviewing the international position.
- The simplified form P = S × (C × M × O)^(1/3) is the public-facing version for the book and marketing; the weighted form P = S × (C^0.35 × M^0.40 × O^0.25) is the analytical engine and proprietary calibration approach.
- The diagnostic instrument is branded distinctly (working name: The Performance Equation Diagnostic, abbreviated TPE-D).
- PerformanceVP's IP is in the integration — the equation, the consolidated measurement architecture, the binding-constraint logic, the Decision Latency Protocol, the proprietary instrument suite — not in the underlying public-domain constructs. This honest positioning is consistent across the pitch deck and should be maintained.

### 5.2 Settled methodological decisions captured in this revision

- **Equation form and weights.** P = S × (C^α × M^β × O^γ), with static standardised defaults α = 0.35 (Capability), β = 0.40 (Motivation), γ = 0.25 (Opportunity). Weights are evidence-informed defaults reflecting the Jiang et al. (2012) meta-analytic ranking (motivation among the strongest, opportunity weakest), held constant across all engagements and not varied by industry. Empirical per-client calibration via the log-linear form is a future capability, available once sufficient benchmark data accumulates.
- **Synergy.** Bounded 0.85–1.15 (±15%), mapped via S = 0.85 + (S_internal/100) × 0.30. The bound is a principled bound anchored in Steiner's (1972) process-loss model and the LePine et al. (2008) meta-analytic finding that teamwork processes have a moderate effect on team performance.
- **E coefficient retired.** Removed from the equation and not replaced by any in-equation term. External sector conditions are deliberately excluded from P; sector classification is retained only as metadata for an internal comparison set built from PerformanceVP's own engagement data over time (Part 3.6). The previously planned Annual Sector Reference (public-data benchmark overlay) has been dropped.
- **Consolidated sub-dimensions.** 17 sub-dimensions (C: 5, M: 4, O: 5, S: 3), plus 3 hygiene trip-wires and the DLP.
- **Trip-wires.** Independent critical-finding indicators, not weighted into M; must be called out and presented prominently in all client reporting, separate from the P score (Part 3.3.1).
- **Tiered data hierarchy.** Tier 1 / 2 / 3, using client data where available and PerformanceVP instruments only for genuine gaps, governed by the principle of minimum sufficient data.
- **Dashboard refresh.** Half-yearly and annual P recalculation on real new data; quarterly pulse as an early-warning layer that can trigger event-based refreshes but does not itself move P.
- **Proprietary instruments across all components** (established 15 May 2026), with the CII as the reference template.

### 5.3 Open questions to resolve

- **Synergy bound calibration.** ±15% is a principled bound; first-year pilot data should test whether observed S_internal distributions justify adjustment.
- **Internal comparison set.** Define the data-collection and consent protocol for building PerformanceVP's own P-score comparison set (sector × unit-type × size-band) from the first 50–100 engagements; legal review of data ownership and aggregation rights required. Note this is an internal, real-data comparison set — not a public-data external benchmark, which has been retired (Part 3.6).
- **Instrument validation.** Run the pilot validation pathway (alpha at n=30, CFA at n=300+, criterion validity) across the proprietary suite.

*Resolved in this revision:* the component weights are settled at the clean evidence-informed defaults 0.35 / 0.40 / 0.25, reflecting the Jiang et al. (2012) meta-analytic ranking (Motivation ≥ Capability > Opportunity). These are the permanent standardised defaults, not placeholders pending retrieval of the paper's decimal effect sizes; presenting derived decimals would imply a calibration PerformanceVP has not performed. Empirical per-client calibration remains available in future via the log-linear form once sufficient paired data accumulates, without changing the model structure.

### 5.4 Immediate next steps (working list)

1. Pilot the high-priority proprietary instruments (CII, the Diagnostic Survey MI and OI modules, TSI-2, TSI-3) across the first 30+ client teams; run the DLP in 3–5 pilot engagements.
2. Engage the methodological adviser team: organisational psychologist (survey instruments), operating-model specialist (audit components).
3. Build the Diagnostic Workbook (scoring engine implementing the Measurement Reference rules), the Unit-level Report Template, and the Client Report Template.
4. Build the prototype client portal (single-tenant initially) covering the P score, C/M/O/S breakdown, sub-dimension drill-down, trip-wire view, gap-flag visualisations and the DLS view, with confidence annotations and the half-yearly/annual refresh logic.
5. Identify three pilot clients spanning different sectors to run the full Diagnostic in exchange for case-study rights.
6. Define the legal structure for IP ownership, including trademark registration and protection of the proprietary item sets.
7. Establish platform infrastructure (a survey platform such as Qualtrics for the proprietary surveys).
8. Draft the book outline structured around the equation as the central organising idea.

### 5.5 Key references for the book and methodology

- Vroom, V. H. (1964). *Work and Motivation*. Wiley.
- Blumberg, M., & Pringle, C. D. (1982). The missing opportunity in organizational research. *Academy of Management Review*, 7(4).
- Campbell, J. P. (1990, 1993, 2012). Multiple publications on the theory of performance determinants.
- Appelbaum, E., Bailey, T., Berg, P., & Kalleberg, A. L. (2000). *Manufacturing Advantage: Why High-Performance Work Systems Pay Off*. Cornell University Press.
- Boxall, P., & Purcell, J. (2003 and subsequent editions). *Strategy and Human Resource Management*. Palgrave Macmillan.
- Jiang, K., Lepak, D. P., Hu, J., & Baer, J. C. (2012). How does human resource management influence organizational outcomes? *Academy of Management Journal*, 55(6), 1264–1294. (Basis for the differential component weights; establishes that the AMO components carry heterogeneous effects, with motivation among the strongest.)
- Bos-Nehles, A., Trullen, J., Valverde, M., & Bondarouk, T. (2023). Systematic review of AMO measurement. *International Journal of Management Reviews*. (Confirms multiplicative interactions; characterises opportunity as a boundary condition.)
- Steiner, I. D. (1972). *Group Process and Productivity*. Academic Press. (Process-gain/process-loss model; basis for the Synergy construct.)
- LePine, J. A., Piccolo, R. F., Jackson, C. L., Mathieu, J. E., & Saul, J. R. (2008). A meta-analysis of teamwork processes. *Personnel Psychology*, 61(2), 273–307. (Basis for the moderate-effect characterisation underpinning the ±15% Synergy bound.)
- Bakker, A. B., & Demerouti, E. (2017). Job demands-resources theory. *Journal of Occupational Health Psychology*.
- Deci, E. L., Olafsen, A. H., & Ryan, R. M. (2017). Self-determination theory in work organizations. *Annual Review of Organizational Psychology and Organizational Behavior*.
- Wegner, D. M. (1987). Transactive memory: A contemporary analysis of the group mind. (Theoretical foundation for the CII.)
- Ren, Y., & Argote, L. (2011). Transactive memory systems: An integrative framework. *Academy of Management Annals*. (Theoretical foundation for the CII.)
- Edmondson, A. (1999). Psychological safety and learning behavior in work teams. *Administrative Science Quarterly*. (Foundation for M2; PerformanceVP items proprietary.)
- Bandura, A. (1997). *Self-Efficacy: The Exercise of Control*. W. H. Freeman. (For collective efficacy.)
- Guzzo, R. A., Yost, P. R., Campbell, R. J., & Shea, G. P. (1993). Potency in groups. *British Journal of Social Psychology*. (Foundation for the team-confidence component of M1.)
- Gagné, M., et al. (2015). The Multidimensional Work Motivation Scale. *European Journal of Work and Organizational Psychology*. (Foundation for M3; PerformanceVP items proprietary.)
- Meyer, J. P., & Allen, N. J. (1991). A three-component conceptualization of organizational commitment. *Human Resource Management Review*. (Foundation for the commitment component of M1.)
- Steger, M. F., Dik, B. J., & Duffy, R. D. (2012). Measuring meaningful work. *Journal of Career Assessment*. (Foundation for M4.)
- Herzberg, F. (1968). One more time: How do you motivate employees? *Harvard Business Review*. (Foundation for the hygiene trip-wires.)
- Galbraith, J. R. (2014). *Designing Organizations*. Jossey-Bass. (Foundation for O1.)
- Rogers, P., & Blenko, M. W. (2006). Who has the D? *Harvard Business Review*. (RAPID methodology; foundation for O1 decision rights.)
- Rizzo, J. R., House, R. J., & Lirtzman, S. I. (1970). Role conflict and ambiguity in complex organizations. *Administrative Science Quarterly*. (Foundation for the role-clarity component of O1.)
- Hammer, M. (2007). The process audit. *Harvard Business Review*. (Foundation for O3.)
- De Dreu, C. K. W., & Weingart, L. R. (2003). Task versus relationship conflict: A meta-analysis. *Journal of Applied Psychology*. (Foundation for S3.)
- Cross, R., Borgatti, S. P., & Parker, A. (2002). Making invisible work visible. *California Management Review*. (Foundation for S2.)
- Mathieu, J. E., et al. (2014). A review and integration of team composition models. *Journal of Management*. (Foundation for S1.)

---

*End of working document. Revisions welcome.*
