# DECISIONS — PerformanceVP Client Portal

This register records the settled decisions behind the portal build and the reasoning behind the consequential ones, so they are not reopened from scratch later. The build plan (`PORTAL_BUILD_PLAN.md`) holds the detail; the corrected source documents and the Diagnostic Workbook hold the calculation truth; `CLAUDE.md` holds the standing principles and guardrails. This file is the why and the what, not a substitute for those.

**Last updated:** 21 September 2026 (the product change from an analyst-operated portal to a self-service online subscription; see Section 5)
**Owner of record:** Michael, PerformanceVP

---

## 1. The consequential calls, with reasoning

### 1.1 Perception-only gap rule (O1, O2, O3)

**Resolution.** Where the structural and perception layers of O1, O2 or O3 diverge by more than 15 points, the perception score feeds the O composite, and the gap is reported separately as a diagnostic finding. The layers are not averaged when the flag fires.

**Reasoning.** The gap rule exists to surface the divergence between structural reality and lived experience as a finding in its own right. Once that divergence is reported separately, the score that should feed P is the one that best represents performance-relevant reality, and for an operating unit that is what staff actually experience, because perception drives behaviour. Averaging the two layers produces a number that represents neither and quietly buries the signal the gap rule exists to expose.

**Provenance.** Settled 28 May 2026 in the Diagnostic Workbook (Survey Blueprint 4.1.5). Measurement Reference Part 2 carried stale "mean of both layers" wording and was aligned to the workbook on 10 June 2026. Corrected 21 September 2026: the workbook was not correct throughout. The rule was never implemented there; versions 1 to 5 all averaged the two layers whatever the gap, and Survey Blueprint 4.1.5 said only that the layers were "reported separately" above 15, without saying which value feeds the composite. The production workbook implements the rule from 21 September 2026 (archive v5 is the last version without it), and the Workbook Spec and Survey Blueprint now state it plainly.

### 1.2 Binding constraint: realistic-P-gain ranking

**Resolution.** The binding constraint is the sub-dimension where a realistic, evidence-bounded improvement would deliver the most P, ranked across the fourteen C, M and O sub-dimensions with Synergy excluded as a coefficient. It is neither the lowest raw score nor the largest theoretical lift to a perfect 100. The engine computes three quantities per sub-dimension and ranks by their combination:

```
Δs       = ρ × MAX(0, S_cap − score)                        (realistic improvement, diminishing returns)
ΔP       = P × ((1 + wnorm × Δs / compScore)^exponent − 1)   (realistic P gain, leverage preserved)
rel      = 1 / (1 + EXP((score − unitMean) / τ))             (relative weakness vs the unit's own mean)
Priority = ΔP × rel
```

Ranked by Priority, descending, with a deterministic row-fraction tiebreak, presented as a top-six table (rank, component, sub-dimension, raw score, realistic P gain, Priority). The binding-constraint statement leads with the top-ranked sub-dimension; the binding component (lowest of C, M, O) is reported alongside as the weakest force. Parameters S_cap = 85, ρ = 0.30 and τ = 8 are evidence-informed defaults, calibrated in pilots; unitMean is the mean of the fourteen C/M/O scores.

**Reasoning.** Ranking purely by lift-to-ceiling corrected the lowest-score rule's blindness to leverage, but it over-selected the same high-leverage sub-dimension irrespective of the unit. Under that rule M1 Engagement and confidence appeared in the top six in almost every simulated profile, because its 0.50 weight inside the heaviest component gives it the largest headroom-times-leverage product even where the unit is strong there. A constraint a client should act on first cannot be a dimension where the unit already leads. Two corrections fix this. First, the realistic-improvement term replaces the lift to 100 with a bounded, diminishing-returns gain: the ceiling effect is diminishing returns by definition, and workplace interventions deliver modest, bounded improvements rather than a leap to perfection. Second, the relative-weakness term weights each candidate by how far it sits below the unit's own average, so a high-leverage strength is no longer named a constraint. The "lower baseline improves more" pattern is held in check rather than amplified, since part of it is regression to the mean rather than true opportunity; the curve is deliberately kept moderate for that reason. Synergy remains excluded because it is a coefficient, not a scored component competing for the designation.

**Provenance.** Settled 11 June 2026. Supersedes the 9 June 2026 contribution-to-ceiling rule, which itself replaced an earlier lowest-score rule. Documented in full in Workbook Spec Part 10, with parameters in Reference Tab Part 9, and reflected in Strategy 4.2 and 4.3 and Diagnostic Delivery Handbook 8.4 on 11 June 2026. Worked-example effect: under the realistic-P-gain ranking the lead priority moves off M1, which is demoted toward mid-pack wherever it sits above the unit's own average, while genuine below-average weaknesses rise. The Measurement Reference 9.4 worked example and any named parity fixture that asserted the earlier M1 result (see 2.1) are recomputed under this rule as their documents are updated.

### 1.3 No organisational P

**Resolution.** P is defined and validated at the unit level. There is no computed organisational P. Organisation-level reporting uses an FTE-weighted average of unit P scores, labelled as an average and never as a computed P, shown alongside the spread (at minimum the range and the lowest-scoring unit), with the weakest unit surfaced prominently.

**Reasoning.** The model operates at unit level and deliberately keeps external sector conditions out of the equation. Computing a top-level P by aggregating C, M and O across a whole organisation would contradict the unit-level design and produce a figure the model does not support. An average is honest. Showing the spread and emphasising the weakest unit preserves the weakest-link logic the model rests on, which an average alone would hide.

**Provenance.** Settled 10 June 2026.

### 1.4 An empty input never scores as zero

**Resolution.** A score, layer or composite computes only when every component it requires is present; otherwise it is blank. A blank sub-dimension is treated as insufficient data: it drops out of its component and the remaining weights are rescaled to sum to 1. An unset measurement route counts as insufficient data, whichever inputs are filled. There is no proportional reallocation inside a composite: the O1 and O2 structural layers need all three of their components, O4 needs both the capacity analysis and the perception score, and S1 needs all three of its components. Averages over survey item means that leave out items not deployed at a cadence are unaffected. Where no Synergy sub-dimension is available, S is 1.00.

**Reasoning.** The Measurement Reference never scores a missing sub-dimension as zero. It marks it insufficient data and reallocates its weight proportionally within the component (Part 1 section 1.3; Part 2 section 9.2), and Synergy falls back to a neutral 1.00 when nothing is measurable (Part 2 section 5.4). A zero is a strong low score, not an absence: an input scored as zero drags its component down, can name a false binding constraint and can fire findings that are not there. In Excel an empty cell is 0 in arithmetic, so unguarded formulas did exactly that. On the Northwind example an empty M1 platform score produced M1 = 0 and moved P from 72.3 to 54.2, and one missing structural component fired a spurious O1 gap flag. The engine inherits the rule because it mirrors the workbook.

**Provenance.** Settled 21 September 2026 and implemented in the production Diagnostic Workbook the same day, with the perception-only gap rule (1.1), the false-consensus guard, Low confidence where a date is missing, a blank P confidence where there is no P, an exclusions summary that counts every sub-dimension without a score, and "not measured" reporting for a trip-wire without a score. Documented in Workbook Spec Part 1.8.

---

## 2. Resolved decisions

### 2.1 Calculation and parity

| Decision | Resolution | Date |
|---|---|---|
| Calculation benchmark | The Production Docs Diagnostic Workbook is the single source of calculation truth. The portal engine reproduces its logic formula for formula. Any engine-versus-workbook difference is an engine defect, never a portal design choice. | 10 Jun 2026 |
| Survey-to-score conversion | `(mean − 1) × 25` throughout. Mean of 1 maps to 0; mean of 5 maps to 100. | 28 May 2026 (Survey Blueprint); Measurement Reference Parts 1 and 2 lines corrected 10 Jun 2026 |
| Parity testing | 0.05 ceiling on final P. Parity asserted at every computed output (each sub-dimension score, C, M, O, S and P), not only final P. Exact match required on discrete outputs: binding constraint, trip-wire flags, and whether the gap rule fired. Workbook intermediate rounding replicated so divergence is rounding-driven, not logic-driven. The Measurement Reference 9.4 worked example is a named parity fixture; its expected binding-constraint output follows the current rule (1.2) and is recomputed whenever that rule changes, and the rounding-sensitive ordering pair is re-identified under the active metric. | 10 Jun 2026; binding-constraint fixture revised 11 Jun 2026 (1.2) |

### 2.2 Surveys

| Decision | Resolution | Date |
|---|---|---|
| Anonymity floor | A unit-level survey-derived score displays only when respondents reach the higher of the anonymity floor (baseline N = 5) and the Cadence Master validity threshold for that construct. Floor raised to N = 8 for psychological safety (M2) and for the pay-equity and fairness trip-wires. Confirm the Cadence Master validity numbers before locking the constants. | 10 Jun 2026 |
| Delivery model | Default to per-respondent single-use unlinkable tokens: the token gates exactly one submission, and the response store retains no mapping between token and answers, so response-rate tracking and reminders work without linking a person to their answers. Per-department shared link retained as a configurable fallback, with the trade-off documented (no tracking, no reminders, no one-response-per-person guarantee). | 10 Jun 2026 |
| Sending identity | Send from `surveys@performancevp.com.au`, with the body stating the survey is run on behalf of the named client. Depends on Resend domain verification and a live send test (see 4). | 10 Jun 2026 |

### 2.3 Data entry and model

| Decision | Resolution | Date |
|---|---|---|
| CII (C4) entry | Unit/team-level entry as the default, consistent with the model operating at unit level. | 10 Jun 2026 |

### 2.4 Platform, security and infrastructure

| Decision | Resolution | Date |
|---|---|---|
| Subdomain | `app.performancevp.com.au`. Marketing site provides the login entry point. | 10 Jun 2026 |
| Supabase environments | Not production-only. Separate staging and production at minimum, ideally local as well. Migrations and RLS policy changes tested against staging, never production. | 10 Jun 2026 |
| MFA | Mandatory for the Owner, support staff, account owners and administrators, because those roles can see identified ratings. Offered to executive and unit viewers. Managers sign in with a one-time email code. Supersedes the analyst-only rule of 10 Jun 2026. | 21 Sep 2026 |
| Owner role | A distinct owner role defined in the schema now, held by one account. Least privilege: owner administers the system (analyst accounts, engagement assignment, settings) without automatic read access to client survey responses. Client-data access is granted per assignment as for analysts, with an explicit break-glass. No broader hierarchy in v1. | 10 Jun 2026 |
| Repository layout | A dedicated portal repo, separate from the marketing site, with the calculation engine as its own internal package so it stays pure and independently testable, alongside the Supabase migrations and `docs/source-ip`. | 10 Jun 2026 |

### 2.5 Retention

| Decision | Resolution | Date |
|---|---|---|
| Employee directory | Persistent for the life of the subscription, maintained in the portal or rebuilt from the Excel template. Deactivated records are purged 30 days after deactivation. Supersedes the 10 Jun 2026 rule that purged survey contact data within 30 days of campaign close, which cannot support recurring self-service campaigns. De-identified aggregated responses are still retained as product. | 21 Sep 2026 |
| Organisation offboarding | Export then purge client data within the contractual 30 days post cessation. End-of-relationship path, distinct from the survey-contact purge above. The Privacy Notice defers retention to the engagement contract; no notice change required. Depends on the contract template specifying 30 days post cessation (see 4). | 10 Jun 2026 |

---

## 3. Deferred enhancements (owner: Michael)

| Item | v1 behaviour | Note |
|---|---|---|
| Archetype weight matrix | Ships Default set only. The engine reads weights from an archetype-keyed table; the other five archetypes are disabled until rebalanced at source. | The assembled per-sub-dimension tables do not sum to 100 for most archetypes. Rebalancing is a judgment call to be made deliberately, not under build pressure, and must preserve clean 0.05-increment weights. |
| DLP | Not part of the online product. The engine keeps its DLP functions for workbook parity; the portal supplies no decision sample and builds no DLP tables. | Decision latency is measured in the consultant-led Diagnostic. The normative reference set remains a consultancy-line item. |
| M1 behavioural lookup tables | No behavioural composite online in v1, so the survey-behavioural gap flag does not run. Administrators may enter turnover and absence as unscored context. | Activates once the lookup tables exist at source. |

---

## 4. Dependencies on Michael before the first paying client

These are document or configuration tasks, not build tasks, but the build assumes them.

1. **Engagement contract clause.** The offboarding design assumes engagement contracts specify 30 days post cessation for client-data retention. That clause must exist in the contract template before the first paying client signs.
2. **Cadence Master validity thresholds.** Confirm the per-construct scoring-validity numbers so the anonymity-floor constants can be locked against them.
3. **Resend verification.** Confirm the Resend domain is verified and a live send tested before surveys depend on the pipeline.
4. **Subscription terms and privacy notice.** Before any client data enters the portal: terms that make the client responsible for its data with PerformanceVP as service provider, and that cover support-staff access, the data-contribution default and opt-out, and the handling of access requests; a privacy notice that reflects the persistent directory and retained ratings; and the respondent-facing statement that separates anonymous surveys from identified manager ratings.
5. **IP ownership.** Written confirmation of which entity owns the Performance Equation IP, which any sale of the online product on its own would depend on.
6. **Gap-flag guard.** Carry the gap-flag guard correction into the production Diagnostic Workbook before parity fixtures are generated in Milestone 1. Completed 21 September 2026: the five gap-flag formulas in the production Diagnostic Workbook (Opportunity Inputs D22, D39 and D55; Synergy Inputs D25; Behavioural Triangulators C11) now carry the nested guard from the B&D copy, with the prior version archived as `archive/PerformanceVP-Diagnostic-Workbook v4.xlsx`; the Workbook Spec documents the same guard, and its `docs/source-ip` copy was refreshed from the corrected root file.
7. **Perception-only gap rule and blank-input rule.** Implement both in the production Diagnostic Workbook before parity fixtures are generated in Milestone 1. Completed 21 September 2026: 87 formula cells changed in one pass (1.1, 1.4), with the prior version archived as `archive/PerformanceVP-Diagnostic-Workbook v5.xlsx`; the Workbook Spec, the Survey Blueprint and the engine specification note were corrected, and the pass's branch-test and partial-entry results are kept as parity fixtures in `tools/workbook-maintenance/fixtures/`. The same 87-cell change was applied to the B&D engagement copy on the same day, with a dated backup beside it, its stale stored values cleared and a full recalculation set for its next opening in Excel.

---

## 5. The product change of 21 September 2026

### 5.1 From an analyst-operated portal to a self-service subscription

**Resolution.** The portal is built as a self-service online subscription, separate from the consultant-led Diagnostic and Intervention Design. Clients set up their own organisation, run the instruments themselves and read their results online. The consultancy line reports through the document packs and does not use the portal. The approved plan is `PORTAL_BUILD_PLAN.md`; the first plan is in `archive/PORTAL_BUILD_PLAN_v1.md` and its engine specification is preserved in `docs/ENGINE_SPEC.md`.

**Reasoning.** An analyst-operated portal scales only as fast as analyst time, and PerformanceVP has one deliverer. A self-service product scales with software, reaches buyers who do not want a consulting engagement, and can be sold separately from the consultancy if that ever becomes attractive. The Performance Equation is only about half survey, so self-service rests on two things already in the IP: the Tier 3 Module Library was written to be completed asynchronously, and the Cadence Master's carry-forward rules already treat the pulse and half-yearly cycles as survey-only refreshes. The remaining analyst judgement was replaced by mechanical rules, short factual checklists and validity thresholds. What could not be replaced (the DLP, audit-sample validation, use of the client's wider data) was left out of the online product and is disclosed to clients.

**Provenance.** Settled 21 September 2026. The measurement rules are in the Online Measurement Specification; the ranking, suggestion and tracking rules are in the Online Recommendations Specification. Pricing is by number of employees; Offerings 1 and 2 keep their existing pricing. The product keeps the PerformanceVP name.

### 5.2 Identified manager ratings, retained

**Resolution.** Ratings that managers enter for named direct reports are retained, identified, and visible to the rating manager, to the client's administrators and account owner, and to enabled PerformanceVP support staff. They are never visible to executive or unit viewers. Every view and export is logged. When a directory record is purged, the employee link on that person's rating rows is removed and the rows are kept.

**Reasoning.** Traceability. A client must be able to see what produced a C1, C2, C3 or S1 score and to review what its managers entered, and managers should start each annual cycle from their previous ratings. An aggregates-only design was adopted earlier the same day and then set aside, because it made scores unreproducible below the aggregate. The consequence is accepted: the platform holds performance data about identifiable employees and is built to the standard that implies (role-restricted access in the database, access logging, mandatory MFA for roles that can see ratings, subscription terms to match).

### 5.3 Formal performance ratings as the one client-data input

**Resolution.** For C3 only, a client may upload its formal performance ratings through the directory template. Where they are dated within 12 months and cover at least 80% of a unit, they are that unit's C3 input and managers do not rate for C3; otherwise managers rate. The Measurement Reference's acceptance rules apply mechanically: ratings declared calibrated, with a top band at or below 25% and a bottom band at or above 5%, are used as they stand; anything else has its top band capped at 15% and its confidence capped at Medium. Typed-in band counts are never accepted.

**Reasoning.** A calibrated performance cycle is usually a more balanced read of talent density than managers rating independently, and it spares managers a section of the module. The IP's own position is that formal ratings are often inflated, so the source rules are applied, not waived. The 12-month limit matches the currency the Measurement Reference requires of performance rating data.

### 5.4 Superseded decisions

| Earlier decision | Now |
|---|---|
| The analyst remains the gate: nothing scores or publishes without an analyst | Scoring runs automatically at campaign close behind the validity gates. A client administrator reviews and releases results. |
| No self-service sign-up | Self-serve sign-up is built behind a flag, off until launch. |
| Clients never see raw inputs | Administrators see the ratings managers entered. Raw anonymous survey responses remain unreadable by every role. |
| Analyst access scoped by assignment | Designated support staff can access an organisation where its support-access switch is on (the default). Every access is logged and visible to the client. The Owner role and its break-glass are unchanged. |
| Survey contact data purged within 30 days of campaign close | A persistent directory (2.5). |
| Analyst MFA only | Every role that can see ratings (2.4). |
| An intervention design module with analyst-authored versions and P-impact | Rule-based suggestions from the online pattern cards, a single-lever what-if simulator and light action tracking. Tailored design remains Intervention Design. |
| DLP reported alongside O in the portal | Not part of the online product (Section 3). |

---

*Standing principles and guardrails (weighted equation only in the engine, trip-wires outside P with prominent reporting, the design-versus-implementation boundary, research-claim calibration, the model as decision-support) live in `CLAUDE.md` and are not repeated here.*
