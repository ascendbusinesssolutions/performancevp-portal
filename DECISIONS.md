# DECISIONS — PerformanceVP Client Portal

This register records the settled decisions behind the portal build and the reasoning behind the consequential ones, so they are not reopened from scratch later. The build plan (`PORTAL_BUILD_PLAN.md`) holds the detail; the corrected source documents and the Diagnostic Workbook hold the calculation truth; `CLAUDE.md` holds the standing principles and guardrails. This file is the why and the what, not a substitute for those.

**Last updated:** 23 September 2026 (Milestone 3: staff access, sign-in and the tenancy decisions; see 5.6)
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
| Owner role | A distinct owner role defined in the schema now, held by one account. Least privilege: the owner administers the system (support-staff accounts, organisations, reference-data deployments, audit review) without automatic read access to client survey responses or results. Access to a client's data follows the support-session rule in 5.4 and 5.6: the Owner opens a logged session like support staff, labelled as the Owner's, which is what the break-glass became once there was no switch to break. No broader hierarchy in v1. | 10 Jun 2026; wording aligned 21 Sep 2026 and 23 Sep 2026 |
| Repository layout | A dedicated portal repo, separate from the marketing site, with the calculation engine as its own internal package so it stays pure and independently testable, alongside the Supabase migrations and `docs/source-ip`. | 10 Jun 2026 |

### 2.5 Retention

| Decision | Resolution | Date |
|---|---|---|
| Employee directory | Persistent for the life of the subscription, maintained in the portal or rebuilt from the Excel template. Deactivated records are purged 30 days after deactivation. Supersedes the 10 Jun 2026 rule that purged survey contact data within 30 days of campaign close, which cannot support recurring self-service campaigns. De-identified aggregated responses are still retained as product. | 21 Sep 2026 |
| Organisation offboarding | Export then purge client data within the contractual 30 days post cessation. End-of-relationship path, distinct from the survey-contact purge above. The Privacy Notice defers retention to the engagement contract; no notice change required. Depends on the contract template specifying 30 days post cessation (see 4). Superseded 22 Sep 2026 by 5.5: data is retained until the Owner deletes the organisation. | 10 Jun 2026 |

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

1. **Engagement contract clause.** Superseded 22 September 2026 by 5.5. Retention of suspended organisations is now a matter for the subscription terms (item 4).
2. **Cadence Master validity thresholds.** Confirm the per-construct scoring-validity numbers so the anonymity-floor constants can be locked against them.
3. **Resend verification.** Confirm the Resend domain is verified and a live send tested before surveys depend on the pipeline.
4. **Subscription terms and privacy notice.** Before any client data enters the portal: terms that make the client responsible for its data with PerformanceVP as service provider, and that cover support-staff access, the data-contribution default and opt-out, the handling of access requests, and the retention of suspended organisations until the Owner deletes them or until any maximum period the review sets; a privacy notice that reflects the persistent directory and retained ratings; and the respondent-facing statement that separates anonymous surveys from identified manager ratings.
5. **IP ownership.** Written confirmation of which entity owns the Performance Equation IP, which any sale of the online product on its own would depend on.
6. **Gap-flag guard.** Carry the gap-flag guard correction into the production Diagnostic Workbook before parity fixtures are generated in Milestone 1. Completed 21 September 2026: the five gap-flag formulas in the production Diagnostic Workbook (Opportunity Inputs D22, D39 and D55; Synergy Inputs D25; Behavioural Triangulators C11) now carry the nested guard from the B&D copy, with the prior version archived as `archive/PerformanceVP-Diagnostic-Workbook v4.xlsx`; the Workbook Spec documents the same guard, and its `docs/source-ip` copy was refreshed from the corrected root file.
7. **Perception-only gap rule and blank-input rule.** Implement both in the production Diagnostic Workbook before parity fixtures are generated in Milestone 1. Completed 21 September 2026: 87 formula cells changed in one pass (1.1, 1.4), with the prior version archived as `archive/PerformanceVP-Diagnostic-Workbook v5.xlsx`; the Workbook Spec, the Survey Blueprint and the engine specification note were corrected, and the pass's branch-test and partial-entry results are kept as parity fixtures in `tools/workbook-maintenance/fixtures/`. The same 87-cell change was applied to the B&D engagement copy on the same day, with a dated backup beside it, its stale stored values cleared and a full recalculation set for its next opening in Excel.
8. **M-O1-LT per-role agreement.** The Survey Processing Workbook's 9 Type C Scoring C6:G17 scored every decision type from the first import row's answer counts (an N() wrapper Excel evaluates as a single cell); corrected at source on 22 September 2026 to MAXIFS over each decision type's own rows, in the template, the Northwind worked example and the B&D engagement copy. Recorded in full in the IP folder's DECISIONS.md item 4.8. The intake scores M-O1-LT as Tier 3 Module Library 3.1 states; the benchmark copies and the leadership-edges fixture were refreshed on this branch.

---

## 5. The product change of 21 September 2026

### 5.1 From an analyst-operated portal to a self-service subscription

**Resolution.** The portal is built as a self-service online subscription, separate from the consultant-led Diagnostic and Intervention Design. Clients set up their own organisation, run the instruments themselves and read their results online. The consultancy line reports through the document packs and does not use the portal. The approved plan is `PORTAL_BUILD_PLAN.md`; the first plan is in `archive/PORTAL_BUILD_PLAN_v1.md` and its engine specification is preserved in `docs/ENGINE_SPEC.md`.

**Reasoning.** An analyst-operated portal scales only as fast as analyst time, and PerformanceVP has one deliverer. A self-service product scales with software, reaches buyers who do not want a consulting engagement, and can be sold separately from the consultancy if that ever becomes attractive. The Performance Equation is only about half survey, so self-service rests on two things already in the IP: the Tier 3 Module Library was written to be completed asynchronously, and the Cadence Master's carry-forward rules already treat the pulse and half-yearly cycles as survey-only refreshes. The remaining analyst judgement was replaced by mechanical rules, short factual checklists and validity thresholds. What could not be replaced (the DLP, audit-sample validation, use of the client's wider data) was left out of the online product and is disclosed to clients.

**Provenance.** Settled 21 September 2026. The measurement rules are in the Online Measurement Specification; the ranking, suggestion and tracking rules are in the Online Recommendations Specification. Pricing is by number of employees; Offerings 1 and 2 keep their existing pricing. The product keeps the PerformanceVP name.

### 5.2 Identified manager ratings, retained

**Resolution.** Ratings that managers enter for named direct reports are retained, identified, and visible to the rating manager, to the client's administrators and account owner, and to PerformanceVP support staff under a support session. They are never visible to executive or unit viewers. Every view and export is logged. When a directory record is purged, the employee link on that person's rating rows is removed and the rows are kept.

**Reasoning.** Traceability. A client must be able to see what produced a C1, C2, C3 or S1 score and to review what its managers entered, and managers should start each annual cycle from their previous ratings. An aggregates-only design was adopted earlier the same day and then set aside, because it made scores unreproducible below the aggregate. The consequence is accepted: the platform holds performance data about identifiable employees and is built to the standard that implies (role-restricted access in the database, access logging, mandatory MFA for roles that can see ratings, subscription terms to match).

### 5.3 Formal performance ratings as the one client-data input

**Resolution.** For C3 only, a client may upload its formal performance ratings through the directory template. Where they are dated within 12 months and cover at least 80% of a unit, they are that unit's C3 input and managers do not rate for C3; otherwise managers rate. The Measurement Reference's acceptance rules apply mechanically: ratings declared calibrated, with a top band at or below 25% and a bottom band at or above 5%, are used as they stand; anything else has its top band capped at 15% and its confidence capped at Medium. Typed-in band counts are never accepted.

**Reasoning.** A calibrated performance cycle is usually a more balanced read of talent density than managers rating independently, and it spares managers a section of the module. The IP's own position is that formal ratings are often inflated, so the source rules are applied, not waived. The 12-month limit matches the currency the Measurement Reference requires of performance rating data.

### 5.4 Superseded decisions

| Earlier decision | Now |
|---|---|
| The analyst remains the gate: nothing scores or publishes without an analyst | Scoring runs automatically at campaign close behind the validity gates. A client administrator reviews and releases results. |
| No self-service sign-up | Sales-led provisioning by the Owner or support staff; no self-serve sign-up in v1, flag or otherwise (22 Sep 2026, superseding the flag decided 21 Sep 2026). |
| Clients never see raw inputs | Administrators see the ratings managers entered. Raw anonymous survey responses remain unreadable by every role. |
| Analyst access scoped by assignment | Designated support staff, and the Owner, access an organisation through a logged, time-limited support session opened with a written reason. The client always sees the sessions and cannot switch them off (23 Sep 2026, 5.6, superseding the switch of 21 Sep 2026). |
| Survey contact data purged within 30 days of campaign close | A persistent directory (2.5). |
| Analyst MFA only | Every role that can see ratings (2.4). |
| An intervention design module with analyst-authored versions and P-impact | Rule-based suggestions from the online pattern cards, a single-lever what-if simulator and light action tracking. Tailored design remains Intervention Design. |
| DLP reported alongside O in the portal | Not part of the online product (Section 3). |

### 5.5 Invoice-based subscriptions, lapse and retention

**Resolution.** There is no online payment. Subscriptions are sales-led: an organisation signs an agreement and is invoiced outside the portal from the accounting system. On signature the Owner or support staff provisions the organisation, sets its employee band and subscription period, records the agreement date and invoice reference, and invites the account owner; onboarding follows. Stripe is not used. Renewal reminders go to the account owner and to PerformanceVP at 60 and 30 days before the period ends. On expiry the organisation enters a 30-day read-only grace period: released results stay viewable, no campaign can be launched, and no directory or context change is possible. After the grace period the organisation is suspended and client access is closed. Its data is retained until the Owner deletes the organisation, a manual, audited action that exports first and then purges. The legal review may set a maximum retention period for suspended organisations; until it does, retention is until deletion.

**Reasoning.** A simpler build: no payment provider, no checkout, no webhooks and no card data in scope. Annual invoiced agreements are the standard form for B2B contracts of this kind, and invoicing stays in the accounting system where it already lives. Retaining history lets a returning client resume with its trends intact rather than start again, and a manual, audited deletion is a more defensible end to a relationship than an automatic purge on a timer.

**Provenance.** Settled 22 September 2026. Supersedes the 10 June 2026 offboarding rule of export and purge within 30 days of cessation (2.5) and the 21 September 2026 decision to build self-serve sign-up behind a flag (5.4). Stripe Invoicing is deferred as a possible later addition. Recorded in `PORTAL_BUILD_PLAN.md` Section 11 and `CLAUDE.md` Sections 3, 4 and 6.

### 5.6 The tenancy, roles and directory decisions of 23 September 2026

Settled with the Milestone 3 plan and its checkpoint. The plan and the migrations hold the detail.

| Decision | Resolution | Reasoning |
|---|---|---|
| Staff access | No client switch. Support staff and the Owner reach a client's data only through a support session: written reason, two hours, any subscription state, listed for the account owner and administrators with the staff member's name and a full trail. Staff never hold client memberships. | PerformanceVP staff must never be locked out of a client's account. What the client relies on instead is that every session is visible to it. Online Measurement Specification v0.9 Part 7 records the rule. |
| Sign-in | Passwords for account owners, administrators, viewers and staff; a one-time email code for managers; TOTP mandatory for the Owner, support staff, account owners and administrators, and for anyone who has enrolled. The database enforces all three and treats a signed-out session as dead. | Two paths chosen deliberately. Enforcing them in the database means a token alone, or an email code alone, never unlocks a role that needs more. |
| Auth email | From `portal@performancevp.com.au` through Resend SMTP. | Keeps account email distinct from survey invitations. |
| Email code and link expiry | One hour for manager codes and for invitation and password links, the single expiry Supabase applies to all three (staging, 23 Sep 2026). | One expiry has to serve both. An hour gives invitations and resets a workable window, at the cost of a longer-lived manager code. |
| Directory spreadsheet | Our own reader and writer over `fflate` and `saxes`, accepting only the portal's template. | The input is untrusted; a narrow parser we own is a smaller surface than a general library. |
| RLS not forced | Every table is owned by `postgres`; the suite asserts ownership, the grant list and that `anon` and `authenticated` cannot bypass RLS. | Forcing RLS would either change nothing (the owner has BYPASSRLS) or break the definer helpers. |
| Ratings read through logged functions | Administrators and staff have no direct read on ratings or formal ratings; the functions they use write a view or export entry every time. Exports need TOTP within 15 minutes. | "Every view is logged" becomes a property of the database rather than of the application. |
| Audit image allowlist | Values are copied into audit images only for allowlisted columns. Rating values, names and emails are recorded as changed but never copied. | The log stays immutable without outliving the directory purge, and cannot become an unlogged way to read ratings. |
| Subscription state computed | The band and the term live on `subscriptions`, one row per term. The state is computed from the governing term on the Sydney calendar and never stored. | A job that fails cannot lock a paying client out or keep a lapsed one in. |
| Formal ratings in their own table | Not columns on `employees`. | A manager reads their direct reports' records; they must never see a formal rating. |
| Staff write the directory | Under a support session, as they do structure and context. | Guided Setup means PerformanceVP does the upload with the client. |
| Suspension | The account owner keeps read access to the organisation, the subscription, staff session history and the audit log. | The client can always see what PerformanceVP did with its data. |
| Keys | The publishable and secret keys, all Supabase calls server-side. | The legacy anon and service-role keys are deprecated by the end of 2026. |
| Job runner | Vercel Cron, calling authenticated job routes; one daily route from Milestone 3 (upload expiry, file removal, the purge). | One runner for every scheduled job; file removal needs the Storage API. |
| Placeholders | `EMPLOYEE_BANDS` (band codes and ceilings), `SESSION_LIMITS` (recommended 8 hours inactivity and 24 hours absolute), `EMPLOYMENT_STATUS_VALUES` (informational text until defined). | Commercial or source decisions not yet made. |

---

*Standing principles and guardrails (weighted equation only in the engine, trip-wires outside P with prominent reporting, the design-versus-implementation boundary, research-claim calibration, the model as decision-support) live in `CLAUDE.md` and are not repeated here.*
