# The Performance Equation
## Tier 3 Survey Module Library

**Author:** Michael, PerformanceVP
**Status:** Working draft. Reference library of Tier 3 survey modules deployable when client Tier 1/2 data is unavailable.
**Last updated:** 21 September 2026 (the O1 gap context and Part 9.1 now state that the perception score feeds the O composite when the audit-perception gap exceeds 15, and that a missing component or layer leaves the score blank, matching Measurement Reference Part 2 and the corrected Diagnostic Workbook. Prior, 24 June 2026: module-score conversions corrected to the house convention `(mean − 1) × 25`, replacing the earlier `mean × 25`; M-C5-TL per-team-leader score corrected to `(mean of 12 items − 1) × 25`, replacing the earlier `(sum / 60) × 100`; added a C2 handoff note that the per-domain KDS scores are weighted into overall C2 downstream in the Diagnostic Workbook. Prior: 14 May 2026)
**Companion documents:** Performance Equation Strategy; Sub-Dimension × Cadence Master Reference; Survey Blueprint; Measurement Reference Parts 1 and 2; Data Inventory Templates; Diagnostic Delivery Handbook (to be revised around this module library).

---

# Part 1 — Introduction and How to Use This Library

## 1.1 Purpose of this document

This library specifies the complete set of Tier 3 survey modules used to measure Performance Equation sub-dimensions where client Tier 1/2 data is unavailable or insufficient. It is the consultant's pick-and-choose reference: after the data audit identifies which sub-dimensions need Tier 3 measurement, the consultant selects the relevant modules, combines them into a single per-audience deployment per unit, and deploys.

This library replaces what was previously a set of workshop-and-interview protocols with an async-first, survey-driven methodology. Workshops are retained only where structurally unavoidable (TDC where cross-manager calibration is genuinely needed; triage scoping; executive briefing).

The module library does not replace the **Performance Equation Diagnostic Survey** specified in the Survey Blueprint. The Diagnostic Survey covers the all-population perception measurement for the CII, MI 1-4, OI 1-5 perception components, trip-wires, TSI-2 and TSI-3. This library covers the additional Tier 3 modules that supplement the Diagnostic Survey when more is needed:

- Structural components of O1, O2, O3 (where Tier 1/2 audit data isn't available)
- Manager-rated components of C1 and C3 (where Tier 1/2 platform data isn't available)
- Team-leader-reported component of C5 (where Tier 1/2 metrics aren't available)
- Decision participant data for the DLP (where analytical extraction is incomplete)
- Knowledge assessment for C2 (where Tier 1/2 LMS assessment data isn't available)

## 1.2 The design principle: async-first, survey-primary

The operating principle behind this library is that for any sub-dimension requiring Tier 3 measurement, the analyst's first question is "can this be collected via survey or async input?" Workshops are reserved for cases where survey-and-document-review cannot produce a defensible score.

This principle reflects a fundamental commercial reality: each per-unit workshop multiplies by the number of in-scope units. A 10-unit engagement with even modest per-unit workshop deployment consumes hundreds of person-hours of client time. The async-first model reduces this by an order of magnitude, making engagements at scale operationally viable for mid-market clients.

## 1.3 Module library structure

The library is organised by sub-dimension and audience:

| Audience | Modules |
|---|---|
| All unit members | Information Access (O2 structural); Process Friction (O3 structural); Strategic Cascade (O1 cascade component) |
| Unit leadership team only (4-8 people) | Decision Rights Mapping (O1 decision rights component) |
| Managers in the unit | Manager Capability Rating (C1); Manager Talent Calibration (C3) |
| Team leaders in the unit | Learning Velocity (C5) |
| Decision participants (sampled) | Decision Participant data (DLP) |
| All unit members or sub-sample | Knowledge Assessment (C2) where genuinely critical |

Modules deployed to the same audience are combined into a single survey for that audience. A typical engagement deploys 2-4 distinct surveys per unit (the Performance Equation Diagnostic Survey to all members, a manager survey to managers, a leadership team survey to leaders, optionally team leader and decision participant surveys).

## 1.4 How the analyst uses this library

The workflow:

1. **After the data audit and Stage 1 triage**, the analyst knows the tier assignment per sub-dimension. For each sub-dimension marked Tier 3, the analyst identifies the corresponding module(s).

2. **The analyst groups modules by audience.** Modules going to the same audience are combined into a single survey deployment. The analyst customises the survey for the engagement (unit name, role family names, decision types where applicable).

3. **The analyst deploys.** Each audience receives one combined survey. Standard survey window: 7-10 business days (similar to the Diagnostic Survey).

4. **The analyst applies module-specific scoring** per the rules in this library to produce the sub-dimension score per Tier 3 measurement.

5. **The analyst supplements with document review and targeted calls** where the module-based data leaves gaps. Targeted calls are 15-30 minutes each, typically 2-5 per unit total.

## 1.5 Conventions used throughout

**Scale.** Unless otherwise noted, items use a 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree) or a 5-point frequency scale (1 = Never, 5 = Always). Conversion to 0-100: sub-dimension score = ((mean response across valid items, with reverse-scoring applied) − 1) × 25. A mean of 1 maps to 0 and a mean of 5 maps to 100, aligned with the Survey Blueprint and Measurement Reference Part 1.3.

**Reverse-scored items** marked with **(R)**. Adjusted: (6 - raw response) on 5-point scale.

**Module IDs.** Each module has a unique identifier of the form `[M-]<sub-dim>-<audience>`. For example, `M-O1-LT` is the module measuring O1 (Decision Rights component) deployed to the unit Leadership Team.

**Conditional deployment.** Each module specifies when it deploys: always (where Tier 3 is required for that sub-dimension), conditional on specific triggers, or rarely (specialist deployment only).

**Reporting thresholds.** As with the main Diagnostic Survey: minimum 60% response rate per unit for sub-dimension reporting; specific minimums for smaller audience modules (e.g. minimum 75% response rate for leadership team modules given the small audience size).

---

# Part 2 — All-Unit-Member Modules

These modules deploy to all members of the in-scope unit. They are typically combined with the Performance Equation Diagnostic Survey into a single deployment.

## 2.1 M-O1-CASCADE — Strategic Cascade module

**Sub-dimension:** O1 Clarity and decision rights (strategic cascade component only).

**When deployed.** When Tier 1/2 OKR cascade data is insufficient or incomplete to assess strategic cascade clarity. Where the client has a complete OKR cascade in Workboard, Viva Goals, Quantive etc. with documented goal-traces, this module is skipped.

**Audience.** All unit members or representative sample (minimum 20% of unit FTE, minimum 8 respondents).

**Time:** 2-3 minutes.

### Items

| ID | Item | Scale | Reverse |
|---|---|---|---|
| O1C-01 | I can clearly describe how my work contributes to our team's goals. | 5-point Likert | |
| O1C-02 | I can clearly describe how my team's goals connect to the organisation's broader priorities. | 5-point Likert | |
| O1C-03 | I know what our organisation is trying to achieve and why. | 5-point Likert | |
| O1C-04 | When priorities change at the organisation level, the implications for my work are explained clearly. | 5-point Likert | |
| O1C-05 | Sometimes I find myself doing work that doesn't seem to connect to what the organisation is trying to achieve. | 5-point Likert | **(R)** |

### Scoring

```
M-O1-CASCADE score = ((mean of valid items, O1C-05 reverse-scored) − 1) × 25
```

The cascade component score combines with the decision rights component (M-O1-LT below) to produce the O1 structural composite score. Per the Measurement Reference Part 4.1 weighting:

```
O1 structural component = 0.40 × Decision rights + 0.30 × Role architecture + 0.30 × Strategic cascade
```

Where role architecture is assessed via analyst document review of position descriptions.

### Audit-perception gap context

The O1 structural composite (from this module plus the decision rights module plus document review) is compared to the O1 perception score from the Diagnostic Survey's OI1 module. Gap > 15 points triggers the diagnostic finding per the Measurement Reference Part 8.1, and the O1 perception score then feeds the O composite.

## 2.2 M-O2-IA — Information Access module

**Sub-dimension:** O2 Tools and information (structural component).

**When deployed.** When Tier 1/2 sources (SaaS management platform + ITSM + Workplace Analytics) are not all available at acceptable quality. In practice, this is most engagements; the structural component of O2 is rarely Tier 1.

**Audience.** All unit members or representative sample (minimum 30% of unit FTE, minimum 12 respondents).

**Time:** 3-4 minutes.

### Items

The module asks respondents to consider their typical work and the information they need to do it well.

| ID | Item | Scale | Reverse |
|---|---|---|---|
| O2I-01 | When I need information to do my work, I can find it without significant delay. | 5-point Likert | |
| O2I-02 | The information available to me is accurate and current. | 5-point Likert | |
| O2I-03 | I often need to ask colleagues for information that should be available in our systems. | 5-point Likert | **(R)** |
| O2I-04 | I spend significant time each week working around limitations in our tools or systems. | 5-point Likert | **(R)** |
| O2I-05 | The systems I use to do my work integrate well with each other. | 5-point Likert | |
| O2I-06 | I sometimes have to re-enter or copy information between systems that should connect automatically. | 5-point Likert | **(R)** |

Plus an open-text item:

| ID | Item |
|---|---|
| O2I-07 | What is the single most significant tool or information access issue in your work? (Optional, open-text) |

### Scoring

```
M-O2-IA score = ((mean of valid scored items O2I-01 to O2I-06, reverse-scored items adjusted) − 1) × 25
```

The information access score combines with the analyst's document-review-based tool inventory and integration assessment to produce the O2 structural component. Per the Measurement Reference Part 4.2 weighting:

```
O2 structural component = 0.35 × Tool inventory + 0.40 × Information access + 0.25 × Integration
```

Where the consultant assigns Tool Inventory and Integration scores based on document review (IT-provided tool list, integration documentation, Workplace Analytics or SaaS management data where available). Where these document-review scores cannot be confidently assigned, the consultant conducts a 30-minute targeted call with the IT lead.

### Open-text analysis

The O2I-07 open-text responses are reviewed by the analyst for themes. Common themes identified across respondents inform specific intervention recommendations.

## 2.3 M-O3-PF — Process Friction module

**Sub-dimension:** O3 Process and workflow (structural component).

**When deployed.** When Tier 1/2 process mining data is not available for the unit's core processes. Most mid-market engagements default to this module.

**Audience.** Participants in the unit's 2-3 most critical processes. The analyst identifies these processes during triage scoping. Audience may be all unit members (if processes span the whole unit) or specific sub-populations.

**Time:** 5-8 minutes total (the module asks about each critical process separately).

### Module structure

The analyst pre-loads the unit's 2-3 most critical processes into the survey. For each process, respondents answer the same item set. The items are framed in the language of the specific process.

Example for a Claims Processing unit: "Thinking about the new claim intake process..." then the items.

### Items (per process)

| ID | Item | Scale | Reverse |
|---|---|---|---|
| O3P-01 | This process is clear and easy to follow. | 5-point Likert | |
| O3P-02 | Work moves through this process without unnecessary delays or approvals. | 5-point Likert | |
| O3P-03 | Information and inputs are typically ready when this process needs them. | 5-point Likert | |
| O3P-04 | When something needs to be reworked or corrected in this process, the rework usually slows it down significantly. | 5-point Likert | **(R)** |
| O3P-05 | Handoffs in this process (between people, teams or systems) work smoothly. | 5-point Likert | |
| O3P-06 | I spend appropriate time on the value-adding parts of this process, not on admin or workarounds. | 5-point Likert | |

Plus open-text per process:

| ID | Item |
|---|---|
| O3P-07 | Where in this process is the biggest bottleneck or source of friction? (Optional, open-text) |

### Scoring

For each process:

```
Process friction score = ((mean of valid items O3P-01 to O3P-06, O3P-04 reverse-scored) − 1) × 25
```

Across processes:

```
M-O3-PF score = mean of process friction scores across the 2-3 audited processes
```

The aggregate score becomes the structural component for O3. Per the Measurement Reference Part 4.3, this combines with the O3 perception score from the Diagnostic Survey for the composite O3.

### Open-text analysis

O3P-07 responses are themed by the analyst. Process-by-process themes drive specific intervention recommendations.

---

# Part 3 — Leadership Team Modules

These modules deploy to the unit's leadership team only. They produce data that is most credibly captured from people with authority and overview of the unit.

## 3.1 M-O1-LT — Decision Rights Mapping module

**Sub-dimension:** O1 Clarity and decision rights (decision rights component).

**When deployed.** When Tier 1/2 documented decision-rights framework (RAPID, RACI, DACI) is unavailable or incomplete. Most engagements default to this module.

**Audience.** Unit leadership team only. Typically the unit leader plus their direct reports — 4-8 people total.

**Time:** 10-15 minutes.

### Module structure

The analyst pre-loads 8-12 of the unit's most consequential recurring decision types into the survey. The decision types are identified during triage scoping with the sponsor and unit leader. Examples for a Customer Service unit:

- Customer accommodation outside standard policy
- Escalation to senior management
- New hire approval for a role in the unit
- Process exception for high-value customer
- Resource shift between sub-teams
- Tool/system change request
- Vendor selection
- Training budget allocation
- Performance management escalation
- Strategic initiative proposal

For each decision type, the respondent assigns roles per the RAPID framework.

### Items (per decision type)

For each pre-loaded decision type, the respondent is shown the list of unit members (anonymised IDs) and asked:

| Item | Response format |
|---|---|
| Who **Recommends** this decision? | Multi-select from unit member list (or "Unclear / Varies") |
| Who **Agrees** must be consulted before this decision? | Multi-select |
| Who **Performs** (implements) this decision? | Multi-select |
| Who provides **Input** on this decision? | Multi-select |
| Who **Decides** (has decision authority) on this decision? | Single-select (or "Unclear / Varies") |

Plus a single confidence item per decision:

| Item | Scale |
|---|---|
| How clear are the decision rights for this type of decision? | 1 = Very unclear, 5 = Very clear |

### Scoring

The decision rights score is derived from two sources:

**1. Inter-respondent agreement.** For each decision type, how strongly do the unit leadership team members agree on who Recommends, Agrees, Decides etc.? High agreement = decision rights are clear. Low agreement = decision rights are unclear regardless of what any documentation might say.

For each decision type, the analyst calculates an agreement score:

```
Per-role agreement = (count of most-common-answer respondents) / (total respondents)

For each decision type:
  Decision-type agreement = mean of agreement scores across the 5 RAPID roles (R, A, P, I, D)

Mean across all decision types = aggregate agreement score
```

**2. Self-reported clarity.** For each decision type, the mean clarity score across respondents:

```
Per-decision clarity = ((mean response on clarity item) − 1) × 25
Mean across decision types = aggregate clarity score
```

**Module composite:**

```
M-O1-LT score = 0.60 × (Aggregate agreement × 100) + 0.40 × Aggregate clarity score
```

The 60/40 weighting privileges agreement because it is the more objective measure — clarity is what people *say* about decision rights; agreement is what their actual answers reveal.

### Validity

Minimum 75% response rate from the leadership team. Below this threshold, the module is reported as "insufficient response" and the analyst either re-deploys to non-respondents or supplements with a 30-minute call with the unit leader to fill the most critical gaps.

### Audit-perception gap context

The decision rights module score (this module) plus the strategic cascade module score (M-O1-CASCADE) plus the analyst's role architecture document review combine to produce the O1 structural composite per the Measurement Reference Part 4.1 weighting:

```
O1 structural = 0.40 × Decision rights + 0.30 × Role architecture + 0.30 × Strategic cascade
```

The O1 structural is then compared to the O1 perception score from the Diagnostic Survey for the audit-perception gap analysis.

---

# Part 4 — Manager Modules

These modules deploy to managers in the unit. They produce ratings of direct reports across capability and talent dimensions.

## 4.1 M-C1-MGR — Manager Capability Rating module

**Sub-dimension:** C1 Skill (including behavioural capability).

**When deployed.** When Tier 1/2 skills inventory data is not available at acceptable coverage. Where the client has Workday Skills Cloud, SuccessFactors Talent Intelligence Hub, or equivalent with manager-confirmed proficiencies at ≥75% FTE coverage, this module is skipped.

**Audience.** All managers in the unit who have direct reports within the in-scope FTE.

**Time:** 15-30 minutes per manager, depending on direct-report count and framework size.

### Module structure

The analyst pre-loads the role-required skill framework into the survey. For each manager:

1. The manager sees a list of their direct reports (using internal anonymised IDs).
2. For each direct report, the manager sees the skills required for that direct report's role family.
3. The manager rates each skill on the 5-point proficiency scale.

### Framework construction

Before the survey deploys, the analyst constructs (or adapts) the role-required skill framework:

- 8-15 skills per role family within the unit
- Mix of technical/functional and behavioural skills
- Drawn from the client's existing framework if it exists; constructed from industry framework if not
- Reviewed with the unit leader for sense-check

This pre-construction is desk-based analyst work, typically 0.5-1.0 consulting days per unit (less if the client's framework is usable; more if construction is required from scratch).

### Items

For each direct report × each role-required skill:

| Item | Scale |
|---|---|
| [Skill name]: rate this person's current demonstrated proficiency | 1 = Novice, 2 = Developing, 3 = Proficient, 4 = Advanced, 5 = Expert |

Threshold for "demonstrated" defaults to 3 = Proficient.

Plus optional comment fields per direct report for notes the manager wishes to provide.

### Audit sample validation

After survey completion, the analyst takes a 15% audit sample of ratings (random across managers and skills). For each sampled rating, the analyst conducts a 10-15 minute structured manager call:

- "You rated [Direct Report X] at [Level Y] on [Skill Z]. Can you describe specific behaviours you've observed that support this rating?"
- Analyst applies the rating standard rubric to assess whether the behavioural evidence supports the rating.

Where systematic inflation is detected (e.g. >25% of audit sample ratings are unsupported by evidence), the analyst applies downward adjustment (typically -0.3 on the 5-point scale, equivalent to -7.5 on 0-100) and documents in the methodology footer.

### Scoring

```
Per direct report:
  Coverage = (count of skills rated ≥3) / (count of required skills for their role family)

Per role family in the unit:
  Coverage ratio (role family) = mean of per-direct-report coverage across the role family
  Role family C1 score = Coverage ratio × 100

Unit C1 score = FTE-weighted average of role family scores
```

### Validity

Minimum 70% of managers complete the survey for valid scoring. Where a manager does not complete, their direct reports' skills cannot be assessed via this module; the analyst either follows up with a 30-minute call to capture the ratings verbally or excludes the manager's direct reports from C1 scoring with documentation in the methodology footer.

## 4.2 M-C3-MGR — Manager Talent Calibration module

**Sub-dimension:** C3 Talent density.

**When deployed.** Conditional on rating distribution evidence:

- If the client's existing performance ratings show a healthy distribution (top band ≤25%, bottom band ≥5%) and calibration is at least informally documented: skip this module; use existing ratings with Tier 2 acceptance.
- If existing ratings show inflated distribution (top band >40% OR no differentiation visible) AND multi-manager unit: deploy TDC workshop (not this module) for cross-manager calibration.
- If existing ratings show inflated distribution AND single-manager unit OR no existing ratings: deploy this module.

The module substitutes for TDC where statistical adjustment is more appropriate than peer calibration.

**Audience.** Managers in the unit who have direct reports within the in-scope FTE.

**Time:** 15-20 minutes per manager.

### Module structure

Similar to M-C1-MGR but rating against the talent framework rather than the skill framework:

1. Manager sees their direct reports (anonymised IDs)
2. For each, the manager assigns one of five performance bands

### The 5-band framework

| Band | Label | Description |
|---|---|---|
| 5 | Exceptional contributor | Consistently exceeds expectations in scope and quality; recognised as a top performer |
| 4 | Exceeding expectations | Consistently delivers above the role's expected standard |
| 3 | Meeting expectations | Delivers reliably at the role's expected standard |
| 2 | Developing / partial meet | Meets some expectations; gaps in delivery quality or scope |
| 1 | Underperforming | Consistent gaps in delivery; performance management intervention warranted |

The framework is anchored to specific behavioural exemplars per band, customised per role family. Anchoring statements are prepared by the analyst during framework construction (see M-C1-MGR section above).

### Items

For each direct report:

| Item | Response format |
|---|---|
| Performance band | Single-select from Band 1-5 with anchored descriptors visible |
| Evidence basis | Brief open-text: "What specific recent evidence supports this rating?" |

The evidence-basis item is critical. Ratings without specific evidence are flagged for audit-sample follow-up.

### Statistical adjustment

After completion, the analyst applies statistical adjustment to account for likely rating inflation:

- If the distribution shows >25% in Band 5, cap Band 5 at 25% and reallocate excess to Band 4.
- If the distribution shows <5% in Band 1, retain as is (some units may genuinely have no underperformers; flag for verification rather than adjustment).
- If overall distribution skews high (mean rating >3.5), apply a 0.2 downward adjustment to all ratings.

These adjustments are mechanical and documented in the methodology footer. Where the analyst has confidence in the ratings (e.g. evidence-basis text supports the ratings strongly across the audit sample), adjustments may be reduced or skipped with documented rationale.

### Audit sample validation

10% audit sample of ratings, similar to M-C1-MGR. 10-15 minute calls per audited rating asking the manager to describe the evidence behind the rating. Where evidence is thin, the rating is flagged as "weakly evidenced" and additional adjustment may apply.

### Scoring

After statistical adjustment:

```
C3 = ( Band 5 % × 100
     + Band 4 % × 80
     + Band 3 % × 60
     + Band 2 % × 35
     + Band 1 % × 0 )

(where each Band % is expressed as a fraction)
```

This is the standard C3 calculation from the Measurement Reference Part 2.3.

### Validity

Minimum 80% of in-scope FTE rated. Where coverage falls below 80%, C3 is reported as "insufficient coverage" or supplemented with manager calls to capture missing ratings.

### Workshop trigger

If statistical adjustment produces a distribution that the unit leader contests as unrepresentative, OR if rating disagreement across multiple managers is severe (e.g. similar direct reports rated very differently by different managers), the analyst escalates to a TDC workshop. The workshop is the fallback when async statistical adjustment cannot produce a defensible distribution.

---

# Part 5 — Team Leader Modules

These modules deploy to team leaders within the unit. They produce ratings on aspects of team operation that team leaders are best positioned to observe.

## 5.1 M-C5-TL — Learning Velocity module

**Sub-dimension:** C5 Learning velocity.

**When deployed.** Conditional. Skip if:

- Tier 1/2 DORA metrics, time-to-competence data, or project cycle data is available
- The engagement scope and unit type suggest C5 is not material to the binding constraint analysis

Deploy when:

- No Tier 1/2 learning velocity data exists
- C5 is potentially material (e.g. technology unit, growth context, or unit responsible for adapting to new conditions)

For many engagements with non-knowledge-intensive units, C5 may be scored at limited rigour with documented rationale rather than deploying this module. The module is for the cases where C5 actually matters.

**Audience.** Team leaders within the unit. Typically 3-5 team leaders per unit.

**Time:** 15-20 minutes per team leader.

### Items

The module asks team leaders to rate their team's learning velocity across 12 dimensions. Each item uses a 5-point scale calibrated by question (rather than a generic Likert scale).

**New-hire onboarding:**

| ID | Item | Scale anchors |
|---|---|---|
| C5L-01 | How long does it typically take for a new team member to make their first meaningful contribution? | 1 = >12 weeks; 2 = 8-12 weeks; 3 = 4-8 weeks; 4 = 2-4 weeks; 5 = <2 weeks |
| C5L-02 | How structured is your team's onboarding for new members? | 1 = No structure; 5 = Highly structured with clear milestones |

**Tool and process adoption:**

| ID | Item | Scale anchors |
|---|---|---|
| C5L-03 | When a new tool or process is introduced, how long until your team is using it productively? | 1 = >90 days; 5 = <30 days |
| C5L-04 | How smoothly does your team adopt new tools or processes? | 1 = Significant resistance/disruption; 5 = Smooth and rapid |

**Retrospective and learning application:**

| ID | Item | Scale anchors |
|---|---|---|
| C5L-05 | How often does your team formally review what worked and what didn't on completed work? | 1 = Never; 2 = Rarely; 3 = Sometimes; 4 = Regularly; 5 = After every significant piece of work |
| C5L-06 | When your team identifies a learning from a retrospective, how reliably does it get applied to subsequent work? | 1 = Rarely; 5 = Almost always |

**Knowledge sharing:**

| ID | Item | Scale anchors |
|---|---|---|
| C5L-07 | How regularly does your team share learning or new knowledge across team members? | 1 = Rarely; 5 = As a regular practice |
| C5L-08 | When a team member learns something new and useful, how easily does the rest of the team gain access to that knowledge? | 1 = Difficult; 5 = Effortless |

**Learning culture:**

| ID | Item | Scale anchors |
|---|---|---|
| C5L-09 | How safe is it for your team members to try new approaches that might not work? | 1 = Not safe — failures are penalised; 5 = Very safe — experimentation is encouraged |
| C5L-10 | How does your team treat mistakes and failures? | 1 = Punitive; 5 = As learning opportunities |

**Internal mobility and external learning:**

| ID | Item | Scale anchors |
|---|---|---|
| C5L-11 | How readily does your team accept the temporary or permanent transfer of team members to or from other teams? | 1 = Significant friction; 5 = Smooth and embraced |
| C5L-12 | How actively does your team consume external learning (industry conferences, courses, professional reading)? | 1 = Minimally; 5 = Highly actively |

### Scoring

```
M-C5-TL score per team leader = ((mean of the 12 items) − 1) × 25

Unit C5 score = mean of team leader scores
```

Each item contributes equally. The mean of the 12 items is converted with `(mean − 1) × 25` so a mean of 1 maps to 0 and a mean of 5 maps to 100, consistent with every other survey-based score in the model. The unit score averages across team leaders.

### Validity

Minimum 70% of team leaders complete the module. Where coverage is low, the analyst supplements with a 20-minute call to non-respondents.

### Targeted call follow-up

Where item responses are widely divergent across team leaders (e.g. some scoring "1" on item C5L-09 while others score "5"), the analyst conducts targeted calls to understand the divergence. Substantial divergence within a unit is itself a diagnostic finding.

---

# Part 6 — Decision Participant Module

This module deploys to participants in decisions sampled for the Decision Latency Protocol. It replaces (most of) the previously-spec'd 40-80 interviews with structured async input.

## 6.1 M-DLP-PART — Decision Participant module

**Sub-dimension:** DLP (cross-cutting metric reported alongside O).

**When deployed.** Always, for the DLP. The Tier 3 nature of the DLP itself isn't conditional; what's conditional is whether the module substitutes mostly or entirely for interviews.

**Audience.** Sampled decision participants. For a baseline DLP with 15-25 decisions sampled, each decision typically has 2-5 participants. The module is sent to one representative participant per decision (the person most centrally involved). Total survey deployment per unit: 15-25 individuals.

**Time:** 5-7 minutes per decision per participant.

### Module structure

The analyst pre-loads each sampled decision into the survey individually. Each participant sees only the decision(s) they were directly involved in. For each decision:

### Items (per decision)

| ID | Item | Response format |
|---|---|---|
| DLP-01 | When was this decision first identified as a need? (Approximate date) | Date input |
| DLP-02 | When was this decision authorised for execution? (Approximate date) | Date input |
| DLP-03 | Who participated in this decision? | Multi-select from anonymised participant list |
| DLP-04 | What was the decision pathway? (Sequence of approvals, consultations, etc.) | Open-text |
| DLP-05 | Where in the pathway did the longest delay occur? | Open-text |
| DLP-06 | In hindsight, how would you assess the decision quality? | 1 = Poor; 2 = Adequate; 3 = High |
| DLP-07 | What systemic factor (if any) made this decision slower than it could have been? | Open-text |

### Pre-population

For each decision, the analyst pre-populates as much information as possible from documentary evidence before the survey deploys. The respondent sees the analyst's draft information and is asked to confirm or correct rather than starting from scratch. This dramatically reduces respondent time and improves accuracy.

Example: "Our records suggest this decision was first raised on [date] and authorised on [date]. Is this accurate? If not, please correct."

### Scoring

Per decision (analyst processing after survey):

```
Latency (days) = DLP-02 date - DLP-01 date

Decision pathway and bottleneck = synthesised from DLP-04 and DLP-05 across participants

Decision outcome quality = DLP-06 response (1, 2 or 3)

Per-decision DLS score = per the percentile-band scoring rule in Measurement Reference Part 6.5
```

Per class (operational, tactical, strategic):

```
Class DLS = mean of per-decision DLS scores within class
```

Overall:

```
DLS = 0.40 × Operational DLS + 0.35 × Tactical DLS + 0.25 × Strategic DLS
```

### Validity

Minimum 75% of sampled decision participants respond. Where coverage is low, the analyst conducts targeted 15-minute interviews to fill the gaps. Strategic-class decisions especially benefit from interview follow-up where survey responses leave ambiguity; the analyst may interview key participants in 1-3 strategic decisions per unit even when survey responses are complete.

### Targeted interviews

The module replaces most interviews but not all. Retained interviews:

- 1-3 strategic decisions where the participant survey reveals significant ambiguity
- 1-2 decisions where the survey reveals a systemic bottleneck pattern worth deeper investigation
- Bottleneck pattern reconciliation (typically 1 conversation with the unit leader at the end of DLP processing)

Total interview time per unit: 30-60 minutes versus the previous spec of 5-8 days.

### Open-text analysis

DLP-04, DLP-05 and DLP-07 open-text responses are themed by the analyst. Systemic patterns (e.g. "Tactical decisions consistently get held up at finance approval") drive specific intervention recommendations.

---

# Part 7 — Specialist Module: Knowledge Assessment

This module is rare-deployment, used only for engagements where C2 Knowledge is genuinely critical.

## 7.1 M-C2-KDS — Knowledge Assessment module

**Sub-dimension:** C2 Knowledge depth and breadth.

**When deployed.** Only where ALL of the following apply:

- No Tier 1/2 LMS assessment data is available
- The unit's role makes knowledge a critical determinant of performance (typically: compliance, healthcare, regulated services, technical specialist roles, customer-facing roles in complex product domains)
- C2 is potentially material to the binding constraint analysis
- The engagement budget and timeline support the construction cost

For most engagements with non-knowledge-critical units, C2 is accepted at limited rigour with documented "Tier 3 with limited measurement" annotation rather than deploying this module. The module is reserved for engagements where C2 actually matters.

**Audience.** All unit members or representative sample (minimum 50% of unit FTE).

**Time:** 20-30 minutes per respondent.

### Module structure

This module differs from others in the library: it requires substantial construction effort by the analyst before deployment. The construction effort is acknowledged as significant (1-3 consulting days per unit, depending on domain familiarity) and is one reason the module is reserved for genuinely-critical engagements.

### Construction process

**Step 1 — Identify role-critical knowledge domains.** Work with unit leadership to identify 3-6 critical knowledge domains. For each, assign a criticality weight (1 = supplementary, 2 = important, 3 = critical to role).

**Step 2 — Construct scenario-based items per domain.** 6-10 items per domain. Each item presents a realistic operating scenario and asks the respondent to demonstrate applied knowledge. Format options:

- Multiple choice with one correct answer and 3-4 plausible distractors
- Multi-correct: select all that apply
- Sequence: arrange steps in correct order
- Brief written response with rubric-based scoring (more analyst-time intensive)

**Step 3 — Calibrate item difficulty.** Pilot the items with 3-5 of the unit's most experienced members. Items where top performers score below 80% are flagged for review (likely too hard or poorly worded). Items where everyone gets it right are flagged for review (too easy).

**Step 4 — Refine and finalise.** Adjust items based on pilot feedback before deployment.

### Items per domain

The items themselves are domain-specific and constructed per engagement. Example item structure for a compliance unit:

> "A customer requests a transaction that, under our standard procedures, requires additional documentation. The customer claims urgency and offers to provide the documentation within 48 hours. Under our compliance framework, what is the appropriate action? [4 multiple-choice options]"

### Scoring

```
Per domain:
  Domain score = (correct responses / total items) × 100
  Coverage-adjusted domain score = Domain score × Response coverage (where coverage <100%)

Overall C2:
  C2 = Σ(Coverage-adjusted domain score × Domain criticality weight) / Σ(Domain criticality weight)
```

This is the standard C2 calculation from Measurement Reference Part 2.2.

**Handoff note.** Under the Google Forms deployment, the M-C2-KDS quiz produces the per-domain scores, and the coverage and criticality weights are recorded alongside them. The criticality-weighted average that produces overall C2 is computed once, downstream in the Diagnostic Workbook, where C2 is a Type B input scored the same way as C1 and C3, not in the intake step. The formula above describes the end-to-end logic; the intake layer (the Survey Processing and Scoring Workbook) hands off the per-domain scores rather than averaging them, so the weighting lives in a single place.

### Validity

Item-level analysis after deployment: items where the variance is very low (everyone gets it right or wrong) are flagged for exclusion. Items where the difficulty deviates substantially from pilot calibration are flagged.

### Cost-benefit framing

The KDS deployment requires 1-3 consulting days for construction plus deployment time. Where the engagement's binding constraint analysis is unlikely to centre on C2, the construction cost is hard to justify. The triage scoping workshop is the moment to assess whether KDS is warranted.

---

# Part 8 — Deployment Logic

## 8.1 The combined survey approach

The library is designed so that modules going to the same audience are combined into a single survey deployment for that audience. The analyst's task after the data audit:

**Step 1 — Identify Tier 3 sub-dimensions.** From the tier assignment summary, list every sub-dimension marked Tier 3.

**Step 2 — Identify required modules.** For each Tier 3 sub-dimension, identify the module(s) that produce the measurement. Some sub-dimensions require multiple modules (e.g. O1 may require M-O1-LT and M-O1-CASCADE).

**Step 3 — Group modules by audience.** Sort the required modules by audience:

- All unit members
- Unit leadership team
- Managers in the unit
- Team leaders in the unit
- Decision participants
- (Other audiences if specialist modules apply)

**Step 4 — Combine modules per audience into one survey.** Each audience receives one survey containing all modules required for that audience. The respondent experience is one branded survey arriving in their inbox, completed in one session.

**Step 5 — Determine deployment relationship to the main Diagnostic Survey.**

The Performance Equation Diagnostic Survey (the main 70-item instrument from the Survey Blueprint) is always deployed to all unit members. The Tier 3 modules going to all unit members can either be:

- **Bundled into the main Diagnostic Survey** as additional sections — increases survey length but reduces deployment count
- **Deployed as a separate "Tier 3 supplementary survey"** — keeps the main survey at standard length but adds a second deployment to all members

Default approach: bundle when the additional items are ≤15 (combined Information Access + Strategic Cascade is typically 7-10 items, easily bundled). Deploy separately when the additional items are >15 (combined Information Access + Process Friction + Strategic Cascade for a process-friction-heavy engagement might be 20+ items, worth a separate survey).

The bundling decision is per engagement.

## 8.2 Standard deployment configurations

In practice, three common engagement configurations emerge based on what client data exists:

### Configuration 1: Data-rich client

Client has good Tier 1/2 data across most sub-dimensions: engagement survey current, skills inventory in Workday, performance ratings calibrated, OKR platform deployed, some Workplace Analytics, process mining for core processes.

**Tier 3 modules required per unit:**
- Performance Equation Diagnostic Survey (main, all members)
- M-DLP-PART (decision participants, 15-25 sampled)
- Possibly M-C5-TL (team leaders) if C5 is material and no DORA data

**Total deployments per unit:** 2-3 surveys. Plus document review by analyst. No workshops.

This is the lightest configuration. Engagements with data-rich clients are operationally easy.

### Configuration 2: Standard mid-market client

Client has some Tier 1/2 data (engagement survey, performance ratings, basic HRIS) but lacks several structural components (no OKR platform with cascade, no SaaS management platform, partial skills inventory, no process mining).

**Tier 3 modules required per unit:**
- Performance Equation Diagnostic Survey (main, all members) — bundled with all-member structural modules where length permits
- M-O1-CASCADE bundled into main survey
- M-O2-IA bundled into main survey
- M-O3-PF deployed to process participants
- M-O1-LT deployed to leadership team
- M-C1-MGR deployed to managers (where skills inventory is inadequate)
- M-C3-MGR deployed to managers (where rating calibration is inadequate)
- M-C5-TL deployed to team leaders (where C5 is material)
- M-DLP-PART deployed to decision participants

**Total deployments per unit:** 4-5 surveys. Plus document review by analyst. Possibly 1 TDC workshop where statistical adjustment is insufficient. Plus 2-5 targeted gap-filling calls.

This is the typical configuration. Most mid-market engagements look like this.

### Configuration 3: Data-light client

Client has minimal Tier 1/2 data — no skills inventory, no current engagement survey, no calibrated ratings, no OKR cascade, no process mining, no Workplace Analytics.

**Tier 3 modules required per unit:**
- Performance Equation Diagnostic Survey (main, all members) — bundled with all-member structural modules
- M-O1-CASCADE, M-O2-IA bundled into main survey
- M-O3-PF deployed to process participants
- M-O1-LT deployed to leadership team
- M-C1-MGR deployed to managers
- M-C3-MGR deployed to managers, with potential TDC workshop fallback
- M-C5-TL deployed to team leaders
- M-DLP-PART deployed to decision participants
- Plus extensive analyst document review and additional targeted calls

**Total deployments per unit:** 5-6 surveys. Plus extensive document review. Likely 1 TDC workshop. Plus 5-8 targeted gap-filling calls.

This is the heaviest configuration. The engagement is more analyst-intensive but still substantially lighter than the previous workshop-heavy approach.

## 8.3 Survey platform configuration

Each module deploys via the same survey platform as the main Diagnostic Survey. Configuration considerations:

- **Audience segmentation.** The platform must support audience-specific surveys (one URL for managers, another for leadership team, another for all members).
- **Pre-population.** Modules requiring decision-specific or skill-framework-specific pre-loading (M-DLP-PART, M-C1-MGR, M-C3-MGR) require per-engagement platform configuration. The analyst sets up the survey instance per engagement.
- **Anonymity.** Where modules go to small audiences (M-O1-LT with 4-8 respondents), anonymity thresholds may not be fully preservable. The analyst must communicate clearly to respondents that "the leadership team is small enough that complete anonymity cannot be guaranteed; aggregate findings will not identify individual responses but you should answer with that knowledge."
- **Combining modules.** Where modules going to the same audience are combined, the survey presents them as one continuous flow with appropriate section breaks.

## 8.4 Communication and consent

Each module deployment uses the standard PE Diagnostic communication framework (per Diagnostic Delivery Handbook Part 6.2). The pre-survey communication explains:

- Purpose of the survey
- What modules are included (in respondent-friendly language, not internal module IDs)
- Time required
- Anonymity protocol (with caveats for small audiences)
- Voluntary participation
- Window and timing

For modules going to small audiences (especially M-O1-LT, M-C5-TL, M-DLP-PART), the communication explicitly acknowledges the limited anonymity and frames the request as direct input rather than anonymous survey.

## 8.5 Validity exclusions

Same as the main Diagnostic Survey per Survey Blueprint Part 7.8:

- Reverse-scored item agreement (straight-lining): exclude
- Speed-clicking below 5th percentile: exclude
- Patterning across items: exclude

For modules without reverse-scored items (e.g. C5-TL uses calibrated scales rather than agreement scales), validity rules focus on patterning and speed-clicking.

---

# Part 9 — Scoring Synthesis

This section describes how the module outputs feed the Measurement Reference scoring rules.

## 9.1 Per-sub-dimension synthesis

For each sub-dimension where Tier 3 modules are deployed, the analyst synthesises module outputs with any document-review-derived scores per the Measurement Reference rules. Each structural layer needs all of its components; a missing component leaves the layer, and so the sub-dimension, blank rather than scored as zero.

### O1 Clarity and decision rights

```
O1 structural = 0.40 × M-O1-LT score
              + 0.30 × Role architecture document review score
              + 0.30 × M-O1-CASCADE score (or document review of OKR cascade if Tier 1/2)

O1 perception = (from Diagnostic Survey OI1 module)

O1 composite = (Structural + Perception) / 2 where the gap is 15 or less;
               Perception where it exceeds 15 (gap rule per Measurement Reference Part 8.1);
               blank if either layer is missing
```

### O2 Tools and information

```
O2 structural = 0.35 × Tool inventory (document review)
              + 0.40 × M-O2-IA score
              + 0.25 × Integration (document review)

O2 perception = (from Diagnostic Survey OI2 module)

O2 composite = (Structural + Perception) / 2 where the gap is 15 or less;
               Perception where it exceeds 15; blank if either layer is missing
```

### O3 Process and workflow

```
O3 structural = M-O3-PF score (aggregate across processes)

O3 perception = (from Diagnostic Survey OI3 module)

O3 composite = (Structural + Perception) / 2 where the gap is 15 or less;
               Perception where it exceeds 15; blank if either layer is missing
```

### O4 Resource adequacy

Mostly desk-based; M-O4 (no module specified separately; uses Diagnostic Survey perception + analyst capacity analysis).

### O5 Leadership enablement

Uses Diagnostic Survey OI5 module. No additional Tier 3 module required.

### C1 Skill

```
Per role family: Coverage ratio from M-C1-MGR
Unit C1 = FTE-weighted average across role families

With audit-sample validation adjustment if applicable
```

### C2 Knowledge

Where M-C2-KDS deployed: per the KDS scoring above.
Where not deployed: documented Tier 3 limitation, with rationale.

### C3 Talent density

Where M-C3-MGR deployed: per the rating scoring above with statistical adjustment.
Where TDC workshop substituted: per the workshop scoring per Measurement Reference Part 2.3.

### C4 Collective intelligence

From CII in Diagnostic Survey. No additional module.

### C5 Learning velocity

Where M-C5-TL deployed: per the team leader scoring above.
Where not deployed: documented Tier 3 limitation or limited-rigour Tier 3 with rationale.

### DLP

```
Per decision: latency and per-decision DLS from M-DLP-PART
Per class: aggregate DLS
Overall DLS: 0.40 × Operational + 0.35 × Tactical + 0.25 × Strategic
```

## 9.2 Documenting Tier 3 sources in the methodology footer

The methodology footer per Measurement Reference Part 9.6 captures the tier per sub-dimension. With this library, the footer also captures which specific modules were deployed:

> "O1 Clarity and decision rights: Tier 3 via M-O1-LT (decision rights, 100% response from 6-person leadership team), M-O1-CASCADE (cascade, 82% response from 67 unit members), and analyst document review (role architecture). Gap-flag: O1 audit-perception gap of 11 points; below threshold. Confidence: High."

This level of methodology footer detail protects the offering against scrutiny while making the data sources fully transparent.

---

# Part 10 — Working Notes and Next Steps

## 10.1 Settled decisions captured in this version

- Module library structured around audiences (all-unit-member, leadership-team, managers, team-leaders, decision-participants, specialist)
- 9 distinct modules covering Tier 3 measurement for C1, C2, C3, C5, O1, O2, O3, DLP (plus the main Diagnostic Survey already covering M1-M4, trip-wires, C4, O1 perception, O2 perception, O3 perception, O4 perception, O5, S2, S3)
- Workshops retained only for: triage scoping (once per engagement), executive briefing (once per engagement), TDC (conditional per unit on inflation evidence)
- Combined deployment per audience: modules going to the same audience deploy as one survey
- Bundling logic: modules ≤15 items can bundle into the main Diagnostic Survey; >15 items deploy separately
- Three standard engagement configurations identified (data-rich, standard mid-market, data-light)
- Audit-sample validation retained for M-C1-MGR and M-C3-MGR (15% and 10% sample respectively, 10-15 min calls)
- Targeted gap-filling calls retained at 2-5 per unit max, typically 15-30 minutes each
- Pre-population in M-DLP-PART (analyst pre-fills decision dates from documentary evidence; respondent confirms or corrects)
- Open-text items retained on O2-IA, O3-PF, DLP for theme analysis

## 10.2 Open questions for pilot validation

1. **Bundling threshold.** "≤15 items bundle into main Diagnostic Survey" is the working assumption. Pilot will confirm whether 15 is the right threshold or whether respondent fatigue kicks in earlier.
2. **Audience anonymity for small modules.** M-O1-LT with 4-8 respondents has limited anonymity. Pilot will reveal whether respondents are candid given this limitation.
3. **Pre-population effectiveness in M-DLP-PART.** The hypothesis is that pre-filling reduces respondent burden and improves accuracy. Pilot will confirm.
4. **Statistical adjustment vs TDC workshop trigger.** The decision rule for when statistical adjustment is sufficient vs when TDC workshop is needed is a working assumption. Pilot will refine.
5. **C5 materiality assessment.** Whether C5 is "material to binding constraint" is a judgement call. Pilot will produce calibration evidence.
6. **C2 deployment frequency.** Working assumption: KDS deploys only in compliance/healthcare/regulated/specialist contexts. Pilot will validate whether this is the right hurdle.
7. **Cross-respondent agreement scoring for M-O1-LT.** The 60/40 weighting of agreement vs clarity is a working assumption. Pilot will calibrate.
8. **Item-level psychometric quality.** Each module's items will need Cronbach's alpha review once pilot data accumulates.

## 10.3 Next-step actions

1. **Rewrite the Diagnostic Delivery Handbook.** The handbook's Parts 4 (data acquisition phase), 6 (survey deployment), 7 (audits and workshops) and 8 (DLP delivery) all need substantial revision to reflect the module-library-based approach. The rewrite is the next major document task.
2. **Build the survey platform configurations.** Each module needs to be configured in the survey platform as a deployable unit. Templates for the most common engagement configurations (data-rich, standard, data-light) should be prepared.
3. **Build the module construction protocols.** For modules requiring per-engagement construction (M-C1-MGR framework, M-DLP-PART decision pre-loading, M-C2-KDS items), the analyst needs construction protocols. These can sit as appendices to this library or as a separate Construction Protocols document.
4. **Cognitive interview the module items.** Each module's items need 3-5 person cognitive interview testing before live deployment. This is a standard psychometric validation step that should run before the first pilot.
5. **Pilot the library across 1-2 engagements.** Validate the deployment logic, the bundling decisions, the respondent experience, the analyst time savings, and the data quality produced.
6. **Refine based on pilot evidence.** First post-pilot revision of the library is expected after engagement 2-3.

---

*End of working document. Revisions welcome.*
