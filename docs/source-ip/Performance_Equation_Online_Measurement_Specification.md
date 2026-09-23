# The Performance Equation
## Online Measurement Specification

**Author:** Michael, PerformanceVP
**Status:** Working draft v0.9, for review. Proposed new source document. All decisions raised in drafting were settled on 21 September 2026 and are recorded in Part 11.1; three further decisions of 22 September 2026, raised by the intake package build, are recorded there too. Later decisions supersede earlier ones where noted.
**Last updated:** 23 September 2026
**Companion documents:** Performance Equation Strategy; Sub-Dimension × Cadence Master Reference; Measurement Reference Parts 1 and 2; Survey Blueprint; Tier 3 Module Library; Survey Processing and Scoring Workbook Spec; Diagnostic Workbook Spec; Intervention Design Library; PORTAL_BUILD_PLAN.md, CLAUDE.md and DECISIONS.md (all three revised on 21 September 2026 to implement this document).

---

## Purpose of this document

PerformanceVP is sold through two product lines that run on one equation.

- **The consultancy line** (the Diagnostic and Intervention Design) is consultant-led, uses the client's own Tier 1 and Tier 2 data wherever it qualifies, includes the Decision Latency Protocol, and reports through the document packs. Nothing in this document changes it.
- **The online subscription** is a self-service product. A client subscribes, sets up its own organisation, runs the instruments itself and reads its results in the portal, with no consultant in the measurement loop.

This document defines the **online measurement route**: how each of the 17 sub-dimensions and the three trip-wires is measured and scored when no analyst is present. It exists because the portal implements the IP and must not redefine it. Every rule the portal applies has to be written down at source first, and this is that source.

### What this document owns, and what it defers to

| Matter | Authority |
|---|---|
| The equation, component weights, offerings | Strategy |
| Sub-dimension structure, within-component weights, cadence, confidence decay | Cadence Master |
| Constructs, scoring formulas, gap rules, reallocation, composite and P calculation | Measurement Reference Parts 1 and 2 |
| Binding-constraint ranking method and parameters | Diagnostic Workbook Spec Parts 9 and 10 |
| Wording of main-survey items | Survey Blueprint |
| Wording and scoring of existing Tier 3 modules | Tier 3 Module Library |
| **The online route per sub-dimension; the new online instruments (M-C2-MGR, ADM-O1, ADM-O2, ADM-O4); the rules that replace analyst steps; online validity, storage and labelling rules** | **This document** |

Where this document repeats a rule from a higher document it does so for buildability. If they disagree, the higher document wins and the discrepancy is flagged, not resolved here. Four discrepancies found while drafting are recorded in Part 11.3.

---

# Part 1 - Design principles of the online route

1. **The engine does not change.** Sub-dimension weights, component composites, the Synergy mapping, the weighted form of P, the realistic-P-gain ranking, trip-wire logic, gap rules, weight reallocation, carry-forward and confidence decay are all applied exactly as the Measurement Reference and the Diagnostic Workbook specify. The online route changes only how inputs arrive.
2. **Instruments only.** The online route uses PerformanceVP instruments throughout. It does not ingest the client's existing platform data. In tier terms the whole route is Tier 3, self-administered. Use of the client's own data remains a feature of the consultant-led Diagnostic. The one exception is C3, where a client may supply its own formal performance ratings as the input (Part 6.4).
3. **Every sub-dimension has a default route.** In consultant-led work some modules are conditional on materiality (C5, C2). Online, all 17 sub-dimensions are measured by default. A sub-dimension is still reported as insufficient where its validity thresholds are not met or a component it requires is missing, and its weight then reallocates.
4. **Rules replace judgement.** Each analyst step is replaced by one of three things: a mechanical rule already in the IP, a short factual checklist completed by the client's administrator, or a platform-enforced validity threshold. Where none of these can stand in for the analyst, the step is dropped and the loss is disclosed (Part 5).
5. **A fixed instrument.** Clients configure context (unit names, role families, skills, knowledge domains, decision types, processes, systems). They cannot edit item wording, scales, scoring, thresholds or weights. This protects instrument validity and the comparability of the research dataset.
6. **Unit-level measurement, anonymous surveys, identified ratings.** Every score, finding and suggestion is about a unit. Survey responses are anonymous and are never linked to a directory record. Manager ratings are different in kind: they are identified, retained for traceability and visible to the client's administrators (Part 7). The two are kept strictly apart, and respondents are told so.
7. **Honest labelling.** Every online score is labelled as instrument-measured and self-administered. Manager-rated and checklist-based inputs are labelled as not independently validated. The consultant-led Diagnostic remains the higher-assurance measurement and the product says so.
8. **No DLP online.** The Decision Latency Protocol depends on analyst sampling and document evidence. It is not part of the online route. It never fed P, so nothing downstream is affected.
9. **Ratings come from managers.** C1 and C2 ratings are entered only by the manager the people report to, through the modules. C3 comes either from the manager module or from the organisation's formal performance ratings, which are managers' ratings that have been through the organisation's own review process (Part 6.4). An administrator never supplies ratings of their own making: typed-in band counts are not accepted, and the upload is a transfer of the formal record. Where a manager has not completed a module, the platform reminds them and shows the administrator which managers are outstanding.

---

# Part 2 - Audiences, instruments and respondent load

The online route uses five audiences. The first four already exist in the Tier 3 Module Library. The fifth, the account administrator, is new.

| Audience | Identified by | Instruments at baseline and annual | Indicative time |
|---|---|---|---|
| All unit members | Directory membership of the unit | Part A: the Performance Equation Diagnostic Survey (about 71 items). Part B: M-O1-CASCADE (5), M-O2-IA (6), M-O3-PF (6 per process, 3 processes) | Part A 12 to 15 min; Part B 6 to 8 min |
| People managers | Anyone with direct reports inside the unit (derived from reporting lines) | M-C1-MGR, M-C2-MGR (new), M-C3-MGR | 30 to 50 min for a manager with 8 reports |
| Team leaders | Directory flag | M-C5-TL (12 items) | 15 to 20 min |
| Unit leadership team | Directory flag (unit leader plus direct reports, typically 4 to 8) | M-O1-LT | 10 to 15 min |
| Account administrator, with the unit leader and an IT contact | Portal role | Context setup; ADM-O1, ADM-O2, ADM-O4 checklists (all new) | 30 to 45 min per unit after first setup |

**Two-part member survey.** The Module Library's bundling rule deploys all-member modules separately when they add more than 15 items. Online they add about 29, so the baseline goes to members as Part A and Part B inside one campaign window, each with its own single-use token. Part B has lower response thresholds (Module Library 2.1 to 2.3), so some drop-off between parts is tolerable. Whether one sitting performs better is a pilot question (Part 11.2).

**Cadence of each instrument** follows the Cadence Master without change:

| Cycle | Members | Managers, team leaders, leadership team | Administrator |
|---|---|---|---|
| Baseline and annual | Part A full, Part B | All modules | All checklists |
| Half-yearly | About 57 items per Survey Blueprint cadence tags; no Part B | None (annual-only constructs carried forward) | ADM-O4 capacity facts only |
| Quarterly pulse | About 16 items per the rotation matrices | None | None |
| Event-triggered | Item set for the affected sub-dimensions per Cadence Master 7.3 | Only where the trigger touches C1, C3, S1 or O1 | Only the affected checklist |

P recalculates at baseline, half-yearly, annual and event-triggered cycles. The quarterly pulse never moves P (Cadence Master 7.2). Because software removes the services cost, the online subscription places no cap on event-triggered refreshes.

---

# Part 3 - The online route, sub-dimension by sub-dimension

Each entry states the source rule, the online input, and what stands in for the analyst. Formulas are not restated where the source rule is applied unchanged.

## 3.1 Capability

### C1 Skill
- **Source rule:** Measurement Reference 2.1; Module Library 4.1 (M-C1-MGR).
- **Online input:** M-C1-MGR. Managers rate each direct report on the skills required for that person's role family (1 Novice to 5 Expert; 3 is the threshold for demonstrated).
- **Framework:** built by the client at setup from the Role-Family Template Library (Part 4.5): 8 to 15 skills per role family, a mix of technical and behavioural, each flagged critical or supporting (the flag is needed by S1). Skill names are editable; the scale and rules are not.
- **Scoring:** unchanged. Coverage per person, mean per role family, FTE-weighted to the unit. The platform assembles the Type B inputs (FTE, required skills, confirmed proficiencies) and the engine applies the final formula.
- **Experience-depth moderator:** applied automatically from median unit tenure, computed from directory start dates (0.95 below 18 months, 1.05 above 8 years).
- **Replaces the 15% audit-sample calls:** the inflation guard (Part 4.4) and a required one-line evidence note for any rating of 5.
- **Validity:** at least 70% of managers complete; ratings cover at least 70% of unit FTE. Below either, C1 is insufficient and its weight reallocates.

### C2 Knowledge depth and breadth
- **Source rule:** Measurement Reference 2.2.
- **Why a new instrument:** the bespoke KDS takes one to three consulting days per unit to construct and cannot be self-served. The Measurement Reference already recognises manager-rated knowledge against a framework as a Tier 2 source, conditional on calibration the online route cannot perform. The online instrument is therefore labelled uncalibrated.
- **Online input:** M-C2-MGR (Part 4.1). At setup the unit leader names 3 to 6 knowledge domains and assigns each a criticality of 1 to 3. Managers rate each direct report's knowledge depth per domain.
- **Scoring:** domain mean score = ((mean rating - 1) × 25); coverage = rated FTE / unit FTE; then the source formula unchanged (coverage-adjusted, criticality-weighted).
- **Validity:** the source threshold applies: at least one criticality-3 domain at 60% coverage or better, otherwise insufficient. The inflation guard applies.
- **Fallback:** none (decided 21 September 2026). Where managers do not complete the module, C2 is reported as insufficient and its weight reallocates. The Measurement Reference's tenure-adjusted knowledge proxy is not used online, consistent with principle 9.

### C3 Talent density
- **Source rule:** Measurement Reference 2.3; Module Library 4.2 (M-C3-MGR).
- **Online input, two routes.** (a) Formal performance ratings uploaded through the HRIS template, where they are dated within the last 12 months and cover at least 80% of the unit's FTE (Part 6.4). (b) Otherwise M-C3-MGR: managers assign each direct report to one of the five bands, with anchored descriptors visible, and a one-line evidence note is required for Band 5 and Band 1. The route is set per unit. Where route (a) applies, the C3 section of the manager module is not deployed for that unit.
- **Scoring:** band counts are the Type B input; the engine applies 100 / 80 / 60 / 35 / 0.
- **Replaces the 10% audit calls and the TDC workshop:** the Module Library's statistical adjustment applied automatically: Band 5 capped at 25% with the excess reallocated to Band 4; the high-skew adjustment in the mechanical form set in Part 4.4. There is no workshop fallback online, and typed-in band counts are not accepted (principle 9). Route (a) applies the Measurement Reference's own acceptance rules instead (Part 6.4). Where a unit leader disputes the distribution, the product points to the consultant-led Diagnostic.
- **Validity:** at least 80% of in-scope FTE rated.

### C4 Collective intelligence
- **Source rule:** Measurement Reference 2.4. Unchanged.
- **Online input:** the 15 CII items in Part A, scored at team level using the directory's team field, FTE-weighted to the unit. Teams need 4 valid respondents and 70% response; the unit needs 75% of teams valid. A unit with no sub-teams is treated as one team.

### C5 Learning velocity
- **Source rule:** Module Library 5.1 (M-C5-TL).
- **Online input:** M-C5-TL to every team leader, always deployed (no materiality test online). A unit with no team-leader layer sends the module to the unit leader.
- **Scoring:** per team leader ((mean of 12 items - 1) × 25); unit C5 is the mean. Entered to the engine as a finished Type C score.
- **Validity:** at least 70% of team leaders complete. See discrepancy 1 in Part 11.3.

## 3.2 Motivation and the trip-wires

### M1 to M4
- **Source rule:** Measurement Reference 3.1 to 3.4. Unchanged. All four are scored from Part A item means (Type A).
- **M1 behavioural composite:** not computed online in v1. The metric-to-score lookup tables are a deferred item at source, so the survey-behavioural gap flag does not run online until they exist. The administrator may enter turnover and absence figures, which are displayed beside M1 as unscored context.

### Trip-wires
- **Source rule:** Measurement Reference 3.5 and 8.4. Unchanged. Below 60 is a critical finding, outside P.
- **Online handling of a breach:** shown prominently to the account owner and executive viewers on every view of the unit, with the action path named. A unit-level viewer cannot hide or dismiss it. The anonymity floor of 8 applies to pay equity and fairness.

## 3.3 Opportunity

### O1 Clarity and decision rights
- **Source rule:** Measurement Reference 4.1; Module Library 2.1 and 3.1.
- **Structural layer online:** 0.40 × M-O1-LT + 0.30 × ADM-O1 + 0.30 × M-O1-CASCADE.
  - M-O1-LT: the unit leader selects 8 to 12 decision types at setup from a starter list by unit type, adding their own. Leaders assign RAPID roles by position title from the directory. Scoring unchanged (0.60 agreement, 0.40 clarity). Needs 75% response and at least 3 respondents.
  - ADM-O1: the role-architecture checklist (Part 4.2) replaces the analyst's position-description review.
  - M-O1-CASCADE: scored from Part B.
- **Where the leadership team has fewer than 3 respondents:** M-O1-LT cannot produce an agreement score, so the structural layer cannot be computed. Under the blank-input rule settled for the workbook on 21 September 2026 (a composite computes only when every component it requires is numeric, with no reallocation inside a composite), O1 is then reported as insufficient and its weight reallocates. Setup guidance steers each unit to name at least three leadership-team respondents.
- **Perception layer:** OI1 items in Part A. **Composite and gap rule:** unchanged (mean where the gap is 15 or less; perception feeds the composite where it exceeds 15; both layers and the gap shown).

### O2 Tools and information
- **Source rule:** Measurement Reference 4.2; Module Library 2.2.
- **Structural layer online:** 0.35 × ADM-O2 tool inventory + 0.40 × M-O2-IA + 0.25 × ADM-O2 integration. The checklist (Part 4.3) replaces the analyst's tool-inventory and integration review. **Perception, composite and gap rule:** unchanged.

### O3 Process and workflow
- **Source rule:** Measurement Reference 4.3; Module Library 2.3.
- **Structural layer online:** M-O3-PF on 3 processes named by the unit leader at setup (see discrepancy 2 in Part 11.3). **Perception, composite and gap rule:** unchanged.

### O4 Resource adequacy
- **Source rule:** Measurement Reference 4.4. The source describes the capacity analysis score as a composite without giving a mechanical formula, and the Diagnostic Workbook takes it as a finished Type C score.
- **Online input:** ADM-O4 capacity facts (Part 4.3a) scored by rule, blended 50/50 with the OI4 perception score. No gap rule, per the source. Both components are required (Measurement Reference 4.4): with fewer than 3 capacity facts entered, or no valid perception score, O4 is reported as insufficient and its weight reallocates.

### O5 Leadership enablement
- **Source rule:** Measurement Reference 4.5. Unchanged, from Part A. O5 is scored per team (each manager's team rating their manager) and FTE-weighted to the unit, as the workbook does, using the directory's team field in the same way as C4. The source validity rule applies: a team needs 4 valid respondents and 70% response, and the unit needs 75% of its teams valid. The workbook leaves that check to the analyst, so the intake package enforces it.

## 3.4 Synergy

### S1 Skill complementarity
- **Source rule:** Measurement Reference 5.1. Unchanged.
- **Online input:** computed automatically at aggregation from the M-C1-MGR ratings matrix: coverage breadth, depth against target depth of ceiling(FTE / 10) with a minimum of 2 on critical skills, and the distribution score from the Gini coefficient of proficient-skill counts per member. Composite 0.40 / 0.35 / 0.25. Requires skills data for 75% of FTE; inherits C1's confidence.

### S2 and S3
- **Source rule:** Measurement Reference 5.2 and 5.3. S2 is the TSI-2 perception score alone, which the source already allows where no telemetry exists. S3 unchanged. The false-consensus flag (8.3) runs automatically.

## 3.5 Not in the online route
- **Decision Latency Protocol.** Not measured. The Opportunity view carries no DLP block, and the product states that decision latency is measured in the consultant-led Diagnostic.
- **Archetype weights.** Default set only, as already decided for the engine.
- **Sector classification.** Captured at setup as metadata, unchanged.

---

# Part 4 - New online instruments and rules

Everything in this Part is new IP content. The instruments, triggers and band values were accepted on 21 September 2026 as the online defaults. They are evidence-informed defaults to be calibrated in pilots, in the same sense as the binding-constraint parameters.

## 4.1 M-C2-MGR - Manager Knowledge Rating module

**Audience:** people managers. **Setup:** 3 to 6 knowledge domains per unit, each with criticality 1 to 3.

For each direct report and each domain:

| Item | Scale |
|---|---|
| [Domain name]: rate this person's current working knowledge | 1 = Little working knowledge. 2 = Basic; needs frequent reference or help. 3 = Sound working knowledge for the role. 4 = Deep knowledge; handles non-routine cases. 5 = An authority others consult. |

```
Domain mean score   = ((mean rating across rated direct reports) - 1) × 25
Coverage            = rated FTE / unit FTE
C2                  = Σ(Domain mean score × Coverage × Criticality) / Σ(Criticality)
```

**Worked example.** Three domains. Regulatory (criticality 3): mean rating 3.9, coverage 0.90, so 72.5 × 0.90 = 65.3. Product (2): mean 3.4, coverage 0.90, so 60.0 × 0.90 = 54.0. Procedures (2): mean 3.6, coverage 0.90, so 65.0 × 0.90 = 58.5.

C2 = (65.3 × 3 + 54.0 × 2 + 58.5 × 2) / 7 = (195.9 + 108.0 + 117.0) / 7 = 420.9 / 7 = **60.1**.

## 4.2 ADM-O1 - Role architecture checklist

Replaces the analyst's position-description review (source: coverage and currency, scored 0 to 10). Completed by the administrator with the unit leader. For each role family in the unit, three yes or no facts:

| ID | Fact |
|---|---|
| RA-1 | A written position description exists and was reviewed or updated within the last 24 months. |
| RA-2 | The position description states success measures or accountabilities, not only duties. |
| RA-3 | The position description, or a delegations document it refers to, states the decisions the role can make without approval. |

```
Role family score = (count of Yes / 3) × 100
ADM-O1            = FTE-weighted mean of role family scores
```

**Worked example.** Customer Service Representatives, 50 FTE: Yes, Yes, No = 66.7. Team Leaders, 10 FTE: Yes, Yes, Yes = 100. ADM-O1 = (66.7 × 50 + 100 × 10) / 60 = **72.2**. With M-O1-LT 58 and M-O1-CASCADE 65: structural = 0.40 × 58 + 0.30 × 72.2 + 0.30 × 65 = 23.2 + 21.7 + 19.5 = **64.4**. Perception 60; gap 4.4; O1 = **62.2**.

## 4.3 ADM-O2 - Tools and integration checklist

Replaces the analyst's tool-inventory and integration review. Completed by the administrator with an IT contact. At setup the unit lists its 3 to 8 primary systems. For each system:

| ID | Fact | Response |
|---|---|---|
| TI-1 | The system has a named owner accountable for it. | Yes 1, No 0 |
| TI-2 | The system is on a current, vendor-supported version. | Yes 1, No 0 |
| TI-3 | The system does the job the unit needs without routine offline workarounds such as spreadsheets or re-keying. | Yes 1, Partly 0.5, No 0 |
| INT-1 | How data moves between this system and the others the unit relies on. | Automated integration 100; scheduled import or export 60; manual re-entry 20; not connected but should be 0; does not need to connect (excluded) |

```
Tool inventory score = mean across systems of mean(TI-1, TI-2, TI-3) × 100
Integration score    = mean of INT-1 across systems not excluded
```

**Worked example.** Four systems. CRM: 1, 1, 0.5 = 0.833; automated 100. Practice management: 1, 1, 1 = 1.0; scheduled 60. Document management: 1, 0, 0.5 = 0.5; manual 20. Spreadsheet scheduling: 0, 0, 0 = 0; manual 20. Tool inventory = 0.583 × 100 = **58.3**. Integration = **50.0**. With M-O2-IA 62: structural = 0.35 × 58.3 + 0.40 × 62 + 0.25 × 50 = 20.4 + 24.8 + 12.5 = **57.7**.

## 4.3a ADM-O4 - Capacity facts

Gives the capacity analysis a mechanical form. The administrator enters whichever facts the organisation holds for the unit; at least 3 of 5 are needed.

| ID | Fact | Bands to score |
|---|---|---|
| CF-1 | Workload to capacity (utilisation), % | 80 to 95 = 100; 95 to 105 or 70 to 80 = 75; 105 to 115 or 60 to 70 = 55; above 115 or below 60 = 25 |
| CF-2 | Hours worked per FTE per week above standard | up to 1 = 100; 1 to 2 = 85; 2 to 4 = 65; 4 to 6 = 45; above 6 = 20 |
| CF-3 | Unplanned absence against the organisation's own 12-month baseline | at or below = 100; up to 10% above = 75; 10 to 25% above = 55; more than 25% above = 25 |
| CF-4 | Change in open backlog over the last three months | shrinking or stable (within 5%) = 100; growing 5 to 25% = 55; growing more than 25% = 25; not applicable (excluded) |
| CF-5 | Vacancy rate against approved establishment | up to 3% = 100; 3 to 6 = 85; 6 to 10 = 65; 10 to 15 = 45; above 15 = 20 |

Where a value sits exactly on a band boundary it takes the higher-scoring band.

```
ADM-O4 = mean of the facts entered (minimum 3)
O4     = (ADM-O4 + O4 perception score) / 2
```

**Worked example**, using the Engineering unit in Measurement Reference 4.4: utilisation 108% = 55; overtime 4.5 hours = 45; absence 12% above baseline = 55; backlog growing 15% = 55; vacancy unknown. ADM-O4 = **52.5** (the source example, scored by judgement, gave 55). Perception 40. O4 = **46.3** (source: 47.5). The 25% backlog band matches the Cadence Master's O4 event trigger.

## 4.4 The inflation guard

Replaces audit-sample validation of manager ratings. Two parts.

**Friction.** A one-line evidence note is required for any skill or knowledge rating of 5, and for Band 5 and Band 1 in C3. Notes are retained with the ratings and carry the same visibility (Part 7).

**Distribution rule.**

| Sub-dimension | Trigger | Adjustment |
|---|---|---|
| C1 | More than 50% of all skill ratings in the unit are 4 or 5 | Deduct 7.5 points from unit C1 (the Module Library's audit-detected inflation adjustment of 0.3 on the scale, expressed in points) |
| C2 | More than 50% of all knowledge ratings are 4 or 5 | Deduct 7.5 points from C2 |
| C3 | Band 5 above 25% | Cap at 25%, reallocate the excess to Band 4 (Module Library 4.2, unchanged) |
| C3 | Mean band above 3.5 | Move 20% of each band's count down one band, Band 5 to Band 1, applied after the Band 5 cap. This lowers the mean band by 0.2 and is the Survey Processing Workbook's mechanical form of the Module Library's 0.2 downward adjustment, so the online route and the consultant-led route apply the same rule (decided 22 September 2026, replacing the 5-point deduction drafted earlier) |

Every adjustment applied is recorded in the methodology footer. Scores floor at 0.

**Decision status.** Triggers and deductions confirmed on 21 September 2026 as the online defaults. How often the guard fires on honest data remains a pilot question (Part 11.2).

## 4.5 The Role-Family Template Library

A separate content artefact, to be built: starter skill frameworks for common role families (for example customer service, sales, software engineering, finance, people and culture, operations supervision, project delivery, people leaders), each with 8 to 15 skills, a technical and behavioural mix, and two tags per skill: critical or supporting (needed by S1) and technical or behavioural (needed by the C1 pattern-selection rule in the Online Recommendations Specification). Clients select, rename and trim. The same approach supplies starter lists of decision types by unit type (for M-O1-LT) and prompts for naming knowledge domains and critical processes. This artefact carries no scoring rules.

---

# Part 5 - What the online route gives up

This list is published to clients. It is also the case for the consultant-led Diagnostic.

| Consultant-led Diagnostic | Online subscription |
|---|---|
| Uses the client's existing Tier 1 and Tier 2 data across the model, reducing survey load | Instruments only, with one exception: formal performance ratings may be used for C3 |
| Decision Latency Protocol and Decision Latency Score | Not measured |
| Manager ratings validated by audit-sample calls; TDC workshop where needed | Evidence-note friction, a distribution rule, and the client's administrators able to review the ratings entered; no independent validation |
| Structural layers scored from document review by an analyst | Self-reported factual checklists |
| M1 survey-behavioural triangulation | Not in v1 |
| Open-text responses themed by an analyst | Not collected in v1 |
| Findings interpreted, root causes validated, interventions tailored | Automated ranking and pattern-level suggestions from the online edition of the Library |
| Report pack, board summary and executive briefing | Portal dashboards |

---

# Part 6 - Setup data: the employee directory and organisation structure

## 6.1 The directory

The directory persists for the life of the subscription so that campaigns can be run at any time. It is maintained two ways.

- **In the portal:** the administrator edits individuals directly (unit, team, manager, role title, role family, flags, status).
- **By template:** the administrator downloads the HRIS template, populates it from the HRIS, and uploads it to rebuild the structure and directory.

**Template fields.** Employee ID (required; the stable key); first name; last name; work email; unit code and unit name; team; manager's employee ID; role title; role family; start date; FTE fraction; team leader flag; leadership team flag; employment status; formal performance rating and formal rating date (both optional; see Part 6.4). Required at upload: employee ID, first and last name, unit code and unit name, and FTE fraction; the rest may be blank at upload and are checked by the readiness check before the first campaign. Employee IDs and unit codes match without regard to case, so an HRIS export that changes case does not read as leavers (decided 23 September 2026). People-manager status is derived from reporting lines.

**Upload behaviour.** Records are matched on employee ID. New IDs are added, missing IDs are deactivated, changed attributes are updated. The platform shows a preview of the differences (joiners, leavers, moves between units and teams, manager changes) and applies nothing until the administrator confirms.

**Campaign snapshot.** Launching a campaign freezes a snapshot of the directory for that campaign. Later edits do not alter a campaign in progress.

## 6.2 Unit continuity

Trends are held against units, so unit identity has to survive a rebuild. Units carry a stable unit code. Renaming a unit keeps its history. Merging or splitting units creates new units with a recorded lineage to their predecessors; predecessor history remains viewable, and the trend line is shown as broken at that point with an annotation. A unit needs 10 or more staff, consistent with the consultancy line's definition.

## 6.3 Event triggers detected from the directory

Directory changes are compared against the Cadence Master 7.3 triggers and surfaced to the administrator as a prompt to run the matching event-triggered refresh:

| Detected change | Prompt |
|---|---|
| Unit headcount change above 20% in a quarter | Refresh C1, C4 and S1 |
| Team composition change above 30% | CII refresh for that team |
| New manager of the unit or a team | O5 at 60 days; S3 at 90 days |

Other triggers (restructure, tool rollout, process redesign, grievance or WHS incident) are offered as a menu the administrator selects from.

## 6.4 Formal performance ratings as the C3 input (optional)

This is the one place the online route uses the client's own data. An organisation's performance cycle, where it is calibrated, is usually a more balanced read of talent density than managers rating independently, and using it spares managers the C3 section of the module.

**How it works.** The HRIS template carries two optional columns: formal performance rating and formal rating date. At setup the administrator maps the client's rating labels onto the five talent bands, with the band descriptors shown as a guide, and states whether the ratings went through cross-manager calibration.

**The 12-month rule.** A formal rating is used only if its rating date is within the 12 months before the campaign launch, the same currency the Measurement Reference requires of performance rating data. The rule is stated on the template, on the upload screen and in the setup guidance, and the platform enforces it from the rating date. A client on an annual performance cycle will normally qualify, provided it uploads its most recent cycle.

**Route selection, per unit.** If current formal ratings cover at least 80% of the unit's FTE (the source threshold), C3 is scored from them and the C3 section of the manager module is not deployed for that unit. Otherwise the formal ratings are ignored for that unit and managers rate through M-C3-MGR.

**Acceptance rules, from Measurement Reference 2.3, applied mechanically.**

| Condition | Treatment |
|---|---|
| Declared calibrated, top band at or below 25% and bottom band at or above 5% | Used as they stand. Labelled as client-calibrated formal ratings (self-declared) |
| Anything else | The source's uncalibrated rule: top band capped at 15% with the excess reallocated to Band 4. C3 confidence is capped at Medium, as the source requires where calibration evidence is weak |

The module's inflation guard (Part 4.4) does not apply to route (a). These rules take its place.

**Scoring, dates and trend.** Band counts feed the engine as the Type B input, unchanged. C3's measurement date is the earliest rating date among the formal ratings used for the unit, so confidence decays from the oldest data in the set (decided 22 September 2026). Where a unit's C3 source changes between cycles, the trend is annotated at that point.

**Storage.** Formal ratings are identified records and follow the rules for manager ratings in Part 7.

---

# Part 7 - Validity, anonymity and storage

**Response validity.** Survey Blueprint 7.8 and Measurement Reference 8.5 apply, enforced automatically. For v1 the straight-lining and patterning checks take the form the Survey Processing Workbook implements (whole-row tests), because that workbook is the intake package's parity benchmark; the Blueprint's per-sub-dimension and alternation forms are a source-document question (Part 11.3, item 6). The speed check, which the workbook cannot apply because Google Forms records no duration, is defined here for the online route: a response is excluded where its completion time is below the 5th percentile (nearest-rank) of completion times among the responses received for that audience in that campaign, and the check runs only when at least 20 responses were received; the footer states whether it ran. Exclusions are reported as a percentage in the methodology footer.

**Display thresholds.** A survey-derived score displays only when valid respondents reach the higher of the anonymity floor (5; 8 for M2, pay equity and fairness) and the Cadence Master 7.4 validity threshold for that cadence (60% response at baseline and annual; 8 valid respondents at half-yearly; 12 at pulse; 4 respondents and 70% per team for the CII). Units below the pulse threshold roll up to their parent for that pulse. Suppression is enforced where the data is stored, not in the interface.

**Small audiences.** The leadership-team module cannot guarantee anonymity with 4 to 8 respondents. The Module Library's disclosure wording is shown to respondents before they begin.

**Storage rules.**

| Data | Rule |
|---|---|
| Survey responses | Never linked to a directory record or an invitation. Single-use unlinkable tokens, as already decided. |
| Manager ratings of named individuals, and evidence notes | Retained, identified, for the life of the subscription. Visible to the manager who entered them (their own direct reports only) and to the client's administrators. Not visible to executive or unit-level viewers, or to other managers. Administrators can export them. Every administrator view and export is recorded in the audit log. |
| Formal performance ratings uploaded as the C3 input | As for manager ratings. Visible to administrators only. |
| Ratings of people who leave | When a directory record is purged, that person's rating rows are kept but the link to their identity is removed, so historical scores stay reproducible without holding named ratings on former employees. |
| PerformanceVP staff access | Designated PerformanceVP support staff, and the Owner, reach a client's data only through a support session: opened with a written reason, time-limited, logged, and listed for the client's account owner and administrators with the staff member's name and the trail of what was done. Sessions work in every subscription state, suspension included, so staff are never locked out, and there is no client control that turns support access off (decided 23 September 2026, replacing the switch drafted earlier). Staff hold mandatory multi-factor authentication. |
| Research dataset | Individual ratings never enter it. Only unit-level aggregates do, subject to the client's opt-out. |
| Directory records | Retained while the person is active. Deactivated records purged 30 days after deactivation. |
| Organisation offboarding | On expiry, a 30-day read-only grace period, then suspension. A suspended organisation's data is retained until the Owner deletes the organisation, a manual, audited action that exports first and then purges (decided 22 September 2026, superseding the earlier rule of export and purge within 30 days of cessation). The legal review may set a maximum retention period. |

**Consequences of retaining identified ratings (decided 21 September 2026, superseding the earlier aggregates-only decision).** Every C1, C2, C3 and S1 score can be traced to the ratings behind it. Administrators can review what managers entered. Managers start each annual cycle from their previous ratings and adjust them. An event-triggered S1 refresh can be recomputed from stored ratings after a directory change. In return the platform holds performance data about identifiable employees, so it is built to the standard that implies: role-restricted access enforced where the data is stored, access logging, encryption, breach response, and subscription terms that make the client responsible for the data with PerformanceVP as its service provider. The legal review covers those terms and the handling of access requests.

**Replaces a settled decision.** The persistent directory supersedes the portal decision to purge survey contact data within 30 days of campaign close. DECISIONS.md needs a dated entry recording the change and the reason.

---

# Part 8 - Labelling and the methodology footer

Confidence bands keep their existing meaning (recency against cadence). Assurance is a separate annotation and is not folded into the bands.

Every online results view carries a methodology footer built from the stored run, containing: route ("Online, self-administered, Tier 3 instruments", with the C3 source, rating date and acceptance treatment stated where formal ratings are used); instruments deployed with response rates per audience; validity exclusions; sub-dimensions marked insufficient and the weight reallocation applied; inflation-guard adjustments applied; gap flags and the false-consensus flag; trip-wire status; carry-forward list with originating dates; confidence per sub-dimension and for P; and the standing statements that manager ratings and structural checklists are self-reported and not independently validated, and that decision latency is not measured.

The research dataset records route (online or consultant-led) on every unit observation so the two are never pooled unknowingly.

---

# Part 9 - How the online route feeds the engine

The route produces the same three input types the Diagnostic Workbook uses, so `calculateUnit` is unchanged.

| Input type | Online source |
|---|---|
| Type A, raw item means | Part A items (C4, M1 to M4, trip-wires, O1 to O5 perception, S2, S3) |
| Type B, structured counts | C1 (FTE, required skills, confirmed proficiencies per role family), C2 (domain rows), C3 (band counts after the cap) |
| Type C, finished scores | M-O1-LT, M-O1-CASCADE, M-O2-IA, M-O3-PF, M-C5-TL, ADM-O1, ADM-O2 components, ADM-O4, S1 |

A separate pure package converts responses into these inputs. It mirrors the Survey Processing and Scoring Workbook for every existing module, and that workbook is its parity benchmark (Northwind worked example). The rules new in this document have no workbook benchmark; the worked examples in Part 4 are their named fixtures. The inflation guard lands in two ways. The C3 rules (the Band 5 cap and the band transfer) act on counts and are applied by the intake package before the Type B input. The C1 and C2 point deductions cannot be applied to a Type B input, because the engine computes those scores from counts; they are applied by the engine through a per-sub-dimension adjustment cell (points, subtracted after the score, floored at 0) that is added to the Diagnostic Workbook first and then mirrored, in the same way as any other workbook change. The intake computes and records every deduction; until the adjustment cells exist, it records them as not applied and the footer says so. The same workbook change adds a per-row confidence cap on the Tier Assignment tab, which is how the formal-ratings route's cap at Medium (Part 6.4) reaches the engine.

---

# Part 10 - Documents that change once this is settled

| Document | Change |
|---|---|
| Strategy Part 4.1, 4.4, 4.5 | Offering 3 redefined as the online subscription; the Tracking Subscription as written is retired; annual consultant-led re-runs sit under Offering 1 |
| Cadence Master 7.7 and 7.3 (trigger authorisation) | Subscription scope rewritten for self-service; the two-refresh cap removed for online |
| Measurement Reference | Pointer to this document as the online route; the four discrepancies in 11.3 |
| Tier 3 Module Library | M-C2-MGR added; note that online always deploys C5 |
| Project principles | Post-intervention measurement now lives in a re-run Diagnostic or the online subscription |
| DECISIONS.md, CLAUDE.md, PORTAL_BUILD_PLAN.md | Done 21 September 2026: revised for the client-operated product; PII retention decision superseded; first plan archived and its engine sections preserved in `docs/ENGINE_SPEC.md` |
| Document Map and build tracker | New documents added: this specification, the Online Recommendations Specification, the Role-Family Template Library, the product and commercial specification |

---

# Part 11 - Open items

## 11.1 Decisions

**Confirmed on 21 September 2026**
1. **Aggregates-only storage of manager ratings.** Confirmed, then superseded the same day by decision 7.
2. **Inflation-guard triggers and deductions** (Part 4.4). Confirmed as the online defaults.
3. **Ratings come from managers.** Typed-in band counts for C3 are not accepted, and C1 and C2 are rated only through the modules (principle 9). Refined by decision 8.

4. **No C2 fallback.** Where managers do not complete M-C2-MGR, C2 is reported as insufficient and its weight reallocates. The tenure-adjusted proxy is not used online.
5. **Open text omitted in v1.** The Module Library's open-text items (O2I-07, O3P-07) are not deployed online. Machine-themed summaries may be considered later.
6. **Band values accepted as defaults** for ADM-O4 and the response values in ADM-O2, to be calibrated in pilots.
7. **Identified manager ratings are retained and visible to administrators** (Part 7), for traceability. Supersedes decision 1.
8. **Formal performance ratings as an optional C3 input** (Part 6.4). Where uploaded, dated within the last 12 months (aligned with the Measurement Reference) and covering 80% of the unit, they are the C3 input and managers do not rate for C3. Where blank, managers rate. The switch is per unit, and the Measurement Reference's acceptance rules apply mechanically. The 12-month limit is communicated to the client. This replaces the comparison feature and the six-month limit drafted earlier the same day.
9. **PerformanceVP support staff have access** to client accounts, including ratings, to assist (Part 7). Logged and visible to the client. Refined by decision 14.
10. **Aligned with the workbook's blank-input rule** (settled 21 September 2026 in the workbook maintenance pass): a composite computes only when every component it requires is numeric, and there is no reallocation inside a composite. The engine mirrors the workbook, so the online route cannot do otherwise. Two provisions of earlier drafts are withdrawn: the O4 fallback to perception alone, and the proportional reallocation of the O1 structural layer for small leadership teams. Both cases now report the sub-dimension as insufficient.

No decisions remain open in this document.

**Decided 22 September 2026, from the intake package build**

11. **C3 skew adjustment takes the workbook's form.** The Survey Processing Workbook already implements the Module Library's 0.2 adjustment as a transfer of 20% of each band's count down one band. The online route adopts it (Part 4.4), replacing the 5-point deduction, so both routes apply one rule and discrepancy 3 is closed.
12. **Speed check defined** (Part 7): nearest-rank 5th percentile per audience per campaign, applied only with at least 20 received responses, reported either way.
13. **Where the guard deductions and the confidence cap land** (Part 9): C1 and C2 point deductions through adjustment cells added to the Diagnostic Workbook and mirrored by the engine; the C3 confidence cap through a per-row cap on Tier Assignment; both workbook first. The intake records deductions as not applied until then.

**Decided 23 September 2026, from the tenancy build**

14. **Staff are never locked out, and there is no support switch.** Staff access is through logged, time-limited support sessions visible to the client (Part 7). Replaces the switch in decision 9.
15. **Offboarding follows the retention rule** of 22 September 2026 (Part 7), not the earlier 30-day purge.

## 11.2 Questions for pilot validation
1. Two-part member baseline against a single sitting: completion and drop-off.
2. How often the inflation guard fires on honest data, and whether 50% is the right trigger.
3. Agreement between checklist-based structural scores and analyst document-review scores, tested by running both on consultant-led engagements.
4. Completion rates for the manager modules without a consultant chasing them.
5. Whether 3 processes in M-O3-PF is too heavy for small units.
6. Whether mapping three-point and four-point client rating scales onto five bands distorts C3, and how often small units fail the bottom-band test in Part 6.4 for honest reasons.

## 11.3 Discrepancies found at source (flagged, not resolved)
1. **C5 scoring.** Measurement Reference 2.5 scores the M-C5-TL or LVI composite as (sum of scores / 120) × 100 on a 0 to 10 rubric. Module Library 5.1, corrected 24 June 2026, scores M-C5-TL as ((mean of 12 items) - 1) × 25 on 5-point scales. This document follows the Module Library for the async module. The Measurement Reference line appears to describe the interview fallback only and needs to say so.
2. **O3 process count.** Measurement Reference 4.3 requires at least 3 processes audited. Module Library 2.3 pre-loads 2 to 3. This document uses 3.
3. **C3 high-skew adjustment.** Module Library 4.2 applies "a 0.2 downward adjustment to all ratings" where the mean exceeds 3.5 without giving a mechanical form; the Survey Processing Workbook implements it as a transfer of 20% of each band's count down one band. Closed 22 September 2026: the online route adopts the workbook's form (Part 4.4, decision 11). The Module Library should state that form.
4. **O4 capacity analysis.** Measurement Reference 4.4 gives no formula for the capacity analysis composite. Part 4.3a proposes one for online. Whether the consultant-led route should adopt the same bands is a separate decision.
5. **C1 tenure moderator by route.** Measurement Reference 2.1 applies the tenure moderator to C1. The Diagnostic Workbook applies it only on the Tier 1/2 table route (Capability Inputs D11 to D15), not on the Tier 3 finished-score route that M-C1-MGR feeds in consultant-led work. Online, C1 from M-C1-MGR travels as Type B rows and receives the moderator, so the same module yields a moderated score online and an unmoderated one consultant-led. Flagged for the source pass and the next workbook maintenance pass. Until that pass, the intake package labels C1 as Tier 2 on the Tier Assignment row so that the engine takes the table route and applies the moderator; the source label names M-C1-MGR, and the footer's tier-mix count is out by one as a result.
6. **Screening form.** Survey Blueprint 7.8 and Diagnostic Workbook Spec Part 4 describe straight-lining per sub-dimension and patterning including alternation; the Survey Processing Workbook tests the whole row and all-same values only. The Blueprint is the authority for validity exclusions; the online route follows the workbook for v1 (Part 7) pending resolution at source.
7. **O5 team flag.** The Survey Processing Workbook flags a team only below 4 valid respondents; Measurement Reference 4.5 also requires 70% response. The online route applies both (Part 3.3).

---

*End of working draft. Revisions welcome.*
