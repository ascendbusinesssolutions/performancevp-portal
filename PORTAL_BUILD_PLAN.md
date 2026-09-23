# PerformanceVP Online Subscription: Build Plan (v2)

**Status:** Approved by Michael on 21 September 2026. Amended 22 September 2026: subscriptions are sales-led with no online payment (Sections 0, 1, 2.8, 4, 11, 12, 13 and 15). Amended 23 September 2026, with the Milestone 3 plan: staff reach client data through logged support sessions with no client switch, passwords for every role except managers, and the schema refinements Milestone 3 settled (Sections 1.2, 2.1, 2.2, 2.8, 3, 4, 12, 13, 14 and 15). This plan supersedes the June 2026 plan, which is archived at `archive/PORTAL_BUILD_PLAN_v1.md` for history only. The engine specification from that plan is preserved verbatim in `docs/ENGINE_SPEC.md`.
**Read with:** `Performance_Equation_Online_Measurement_Specification.md` and `Performance_Equation_Online_Recommendations_Specification.md`. Those two documents are the source for every online-specific rule in this plan. This plan says how to build what they define.

---

## Context

PerformanceVP now runs two product lines on one equation. The consultancy line (the Diagnostic and Intervention Design) is consultant-led, reports through the document packs and is delivered with the workbooks. It does not use the portal. The online subscription is a separate self-service product: a client subscribes, sets up its own organisation, runs the instruments itself and reads its results online, with no analyst in the measurement loop. The portal exists only for the online subscription.

The v1 plan described an analyst-operated portal in which clients were read-only and nothing scored or published without an analyst. That product is no longer being built. Most of its foundations carry over; the control layer does not.

The portal still implements existing intellectual property and does not redefine it. Every constant comes from the source documents. Where documents disagree, the discrepancy is flagged to Michael and not resolved in the build.

Four areas carry the most risk and are treated as foundational: the calculation engine, the intake package that turns responses and ratings into engine inputs, the security model (which now covers a persistent employee directory and identified manager ratings as well as anonymous survey responses), and the tenancy model.

---

## 0. What changed from v1

| | Items |
|---|---|
| **Carried over unchanged** | The engine and its parity regime (v1 Section 5). Stack, repository separation, environments, Sydney data residency. Organisation as the tenant boundary, RLS on every table, deny by default, role facts in tables. Anonymous surveys on single-use unlinkable tokens, with the shared-link fallback. Validity rules, display thresholds and suppression enforced in the database. Append-only calculation runs and audit design. Dashboard display rules. No organisational P. Default archetype only. Offboarding as the Owner's deletion flow (Section 11). |
| **Removed** | The analyst workspace and manual Type A, B and C entry. Tier assignment. The analyst publish gate. Analyst assignments per organisation. The DLP decision log and DLP results. Evidence file uploads. The analyst-authored intervention design module with versions and P-impact authoring. |
| **Added** | Self-serve setup. The persistent employee directory with the Excel template, upload preview, campaign snapshots and unit lineage. Five respondent audiences with module deployment. The identified manager rating flow with retained ratings. The formal performance ratings route for C3. The intake package. Automatic scoring with administrator review and release. The recommendations package, pattern cards, what-if simulator and action tracking. Cadence scheduling and event-trigger prompts. Plans, entitlements and sales-led provisioning. PerformanceVP support access, logged and visible to the client. |
| **Settled decisions superseded** | `PII_RETENTION` (contact data purged 30 days after campaign close) is replaced by a persistent directory. "Clients never see raw inputs" is replaced by administrator visibility of manager ratings. "No self-service sign-up" stands: organisations are provisioned by the Owner or support staff on signature of an agreement, and there is no sign-up flag (amended 22 September 2026). "The analyst remains the gate" is replaced by automatic scoring behind validity gates. Each needs a dated entry in `DECISIONS.md`. |

---

## 1. Architecture

### 1.1 Applications and separability

The marketing site is untouched apart from the approved "Client login" link. The portal is its own Next.js application in its own repository, deployed as its own Vercel project at `app.performancevp.com.au`.

The online product may one day be sold separately from the consultancy. To keep that option open at no cost, the portal uses its own repository, Vercel project, Supabase projects and Resend API keys, and depends on none of the consultancy's tooling (Google Workspace, the workbooks, the Document Production Loop). The repository carries the application, three pure packages, the Supabase migrations and a `docs/source-ip` snapshot that now includes the two online specifications, the Tier 3 Module Library and the Survey Processing Workbook Spec.

### 1.2 Stack

Unchanged from v1: Next.js (App Router), TypeScript strict, Tailwind with the four brand tokens, Supabase (Postgres, Auth, RLS, Storage), Resend for all email including auth email over custom SMTP. Additions: a scheduled-job runner (Vercel Cron calling authenticated job routes, decided 23 September 2026) for campaign opening, reminders, closing, aggregation, subscription renewal reminders and lapse transitions, purges and event-trigger detection; a server-side spreadsheet library for generating and parsing the directory template as `.xlsx`. Uploaded files are parsed server-side only, size-limited, stored in the private bucket with a hash, and never executed or rendered.

### 1.3 Layers

Six layers, dependencies in one direction only.

1. **`packages/engine`**: pure. The formula-for-formula mirror of the Diagnostic Workbook. Unchanged from v1.
2. **`packages/intake`**: pure. Turns raw survey rows, ratings, checklists and formal ratings into a `UnitMeasurementInput` plus methodology metadata. Depends on nothing but its own constants and the engine's input types.
3. **`packages/recommendations`**: pure. Turns a stored calculation run and its intake aggregates into ranked suggestions. Depends on the engine only for `projectImpact`.
4. **The data layer**: schema, RLS policies, typed query modules.
5. **Server actions, route handlers and scheduled jobs.**
6. **The UI.**

The three packages perform no IO, are versioned, and gate merges with their own test suites. The UI never computes a score or a suggestion.

### 1.4 Environments

Unchanged: local Supabase CLI stack, staging and production projects in Sydney, matching Vercel environments, migrations in the repository, production never the test target.

---

## 2. Data model

All tenant-owned tables carry `organisation_id`. Reference tables are seeded by migration and writable by no one at runtime.

### 2.1 Identity, tenancy and plan

| Table | Notes |
|---|---|
| `organisations` | Adds `data_contribution_opt_out` (default false) and sector metadata (ANZSIC division and class, size band). The employee band and the subscription state live on `subscriptions` (2.8). There is no support-access switch (3.2). |
| `business_units` | Adds a stable `unit_code`. Hierarchy by `parent_unit_id`. Minimum 10 staff to be measurable. |
| `unit_lineage` | Predecessor and successor links for merges and splits, with the effective date. Renames need no lineage row. |
| `teams` | Team within a unit, for CII team-level scoring. |
| `profiles` | One row per authenticated user. Flags: `is_owner`, `is_support_staff`. |
| `org_memberships` | Role is one of `account_owner`, `administrator`, `executive_viewer`, `unit_viewer`, `manager_respondent`. A person may hold several roles in one organisation; one active account owner per organisation. Manager memberships are created by the system at campaign launch and linked to the manager's directory record; no person grants them. PerformanceVP staff never hold memberships. |
| `unit_access` | Scopes a `unit_viewer` to nominated units and descendants. |
| `membership_invitations` | Access granted to an address that has no account yet, claimed when the account is created. |
| `support_sessions` | How staff reach a client's data: staff member and name, reason, start, expiry, end. Visible to the client. |

### 2.2 Directory

| Table | Notes |
|---|---|
| `employees` | `employee_ref` (the client's employee ID, the stable key, unique per organisation), names, work email, unit, team, `manager_employee_id`, role title, `role_family_id`, start date, FTE fraction, team-leader flag, leadership-team flag, employment status, status. |
| `formal_ratings` | The formal performance rating and its date, one per person. Kept apart from `employees` so a manager's read of their direct reports never includes a rating; read only through a function that logs every view. |
| `directory_uploads` | File metadata and hash, the counts of the differences (joiners, leavers, moves, manager changes), who applied it and when. Nothing applies until confirmed. The file is kept only until the upload is decided or expires. |
| `directory_upload_rows` | The staged rows of an upload awaiting its decision, read only through the logged preview. |
| `directory_snapshots`, `snapshot_members`, `snapshot_formal_ratings` | The frozen directory for a campaign, taken at launch. Immutable, except that the purge redacts and unlinks. |

### 2.3 Unit context (client-configured)

`role_families`, `skills` (tags: critical or supporting; technical or behavioural), `knowledge_domains` (criticality 1 to 3), `decision_types`, `critical_processes`, `primary_systems`, and `rating_scale_maps` (client rating label to talent band, plus the calibration declaration). Clients configure context only. They cannot alter items, scales, scoring, thresholds or weights.

### 2.4 Reference data

Carried from v1: `ref_sub_dimensions`, `ref_archetype_weights`, `ref_survey_items`, `ref_pulse_rotation`, `ref_intervention_patterns`. Added: `ref_modules` and `ref_module_items` (the Module Library modules plus M-C2-MGR), `ref_admin_checklists` (ADM-O1, ADM-O2, ADM-O4 with response values and bands), `ref_pattern_cards` (the online edition of each pattern), `ref_templates` (role-family frameworks, decision-type starter lists, prompts). `ref_dlp_norms` is dropped.

### 2.5 Campaigns and responses

| Table | Notes |
|---|---|
| `campaigns`, `campaign_units` | Cadence type, window, status, snapshot reference, per-unit cycle link and headcount denominator. |
| `campaign_audiences` | One row per audience per unit: members Part A, members Part B, managers, team leaders, leadership team, administrator checklists. |
| `invitations` | Hashed single-use tokens for the anonymous audiences. Not linkable to responses. |
| `survey_responses`, `survey_item_responses` | Anonymous. Carry campaign unit and audience only. Used for members, team leaders and the leadership team. |
| `rating_sessions` | One per manager per campaign: status, completion, reminders. Identified. |
| `skill_ratings`, `knowledge_ratings`, `talent_bands` | Identified rows: campaign, manager, employee, value, evidence note. Retained. When an employee record is purged, the employee link is nulled and the row kept. |
| `checklist_responses` | Administrator answers to ADM-O1, ADM-O2, ADM-O4, versioned. |
| `unit_aggregates` | Per unit per item or component: valid count and value. Includes the item-group means the recommendations rules need. |

### 2.6 Cycles and results

`measurement_cycles` loses `tier_assignments` and gains `c3_source` (module or formal ratings) and a `released` status in place of `published`. `engine_inputs` replaces `analyst_inputs`: the immutable, versioned input set the intake package assembled for a run. `calculation_runs` adds `intake_version` and `recommendations_version`. `sub_dimension_scores`, `composite_scores` (the constraint ranking now holds all fourteen rows) and `trip_wire_results` carry over. The DLP tables are not built; the engine keeps its DLP functions for workbook parity and the online product never supplies a decision sample.

### 2.7 Suggestions and actions

`suggestions` (run, sub-dimension, pattern, position, whether it leads or is the alternative, which signal fired, the client's self-check answer) and `action_records` (status of Considering, Under way, Completed or Set aside; start date; note). Measured movement is derived from later runs, not stored.

### 2.8 Subscriptions and audit

`subscriptions`, one row per term: band, period start and end, agreement date, invoice reference, provisioned by, and an optional `suspended` or `cancelled` override with its reason. The state (`pending`, `active`, `grace`, `suspended` or `cancelled`) is computed from the governing term on the Sydney calendar and never stored, so a scheduled job that fails to run cannot change anyone's access. `audit_logs` as v1, extended with directory uploads, rating views and exports, results releases, every support session and everything done in it, provisioning, subscription changes and organisation deletion. Row changes copy values only for allowlisted columns; rating values never reach the log.

---

## 3. Security and tenancy

Written before the code, as in v1.

### 3.1 Boundary and posture

Unchanged: the organisation is the tenant, RLS on every table, deny by default, no `USING (true)` on tenant data, no grants to `anon`, role facts in tables so revocation is immediate. RLS is enabled and not forced: every table is owned by `postgres`, which the Data API never uses, and the definer helpers rely on the owner's exemption (decided 23 September 2026). Every foreign key between tenant tables carries `organisation_id`.

### 3.2 Roles

| Role | Can do |
|---|---|
| **Owner** (one PerformanceVP account) | System administration, reference data deployments, audit review. Least privilege: no standing access to client data, which the Owner reaches through a support session like support staff, labelled as the Owner's. |
| **Support staff** (designated PerformanceVP accounts) | Access a client's account, including ratings, to assist with setup and support, through a support session opened with a written reason and limited in time. Sessions work in every subscription state and the client cannot switch them off (decided 23 September 2026). Every session, and everything done in it, is logged and visible to the account owner and administrators. |
| **Account owner** | Everything an administrator can do, plus the subscription view, user management and the data-contribution opt-out. |
| **Administrator** | Directory, unit context, campaigns, checklists, review and release of results, the ratings area, exports. |
| **Executive viewer** | All released results across the organisation. No directory editing, no ratings. |
| **Unit viewer** | Released results for nominated units and descendants. No ratings. |
| **Manager respondent** | Signs in to rate their own direct reports. Sees only their own rating forms, pre-filled from their previous ratings. |

Members, team leaders and leadership-team respondents are not portal users. They respond through tokenised links.

Helper functions replace v1's analyst helpers: `is_owner()`, `is_support_for(org_id)`, `has_org_role(org_id, roles[])`, `can_view_unit(unit_id)`, `is_rating_manager_of(employee_id)`.

### 3.3 Policy intent by table group

| Table group | Read | Write |
|---|---|---|
| Organisation, units, teams, lineage, unit context | Members of the organisation by role; staff under a support session | Administrators and account owner; staff under a support session |
| Directory and uploads | Administrators, account owner, staff under a support session. A manager respondent sees their own direct reports only. Formal ratings through a logged function only | Administrators and account owner; staff under a support session (Guided Setup); uploads apply after confirmation |
| Anonymous responses and item responses | No client-side read for any role, including support staff and the Owner | Public ingestion route only, service role |
| Invitations | Administrators see status counts, never a link between a person and a response | Server-side |
| Rating sessions and identified ratings | The rating manager (own rows); administrators, account owner and staff under a support session, through functions that log every view and export. Never executive or unit viewers | The rating manager until the campaign closes; immutable afterwards |
| Aggregates, engine inputs, runs | Administrators, account owner, staff under a support session | Server-side only |
| Scores, composites, trip-wires, suggestions | Administrators and account owner for all runs; executive and unit viewers for released runs only, unit-filtered | Server-side only, inside the calculation transaction |
| Action records | Roles that can see the unit's results | Administrators and account owner |
| Reference tables | All authenticated users | Migration only |
| Audit logs | Account owner and administrators for their organisation, including every support-session entry; the Owner for platform events and entries made by staff | Insert by trigger and server code only; no update or delete for any role, except the Owner's organisation deletion (Section 11) |

In suspension the account owner keeps read access to the organisation, the subscription, the staff session history and the audit log, and nothing else.

### 3.4 The two kinds of data, kept apart

Survey responses are anonymous and structurally unlinkable to a person, exactly as v1 Section 3.5. Manager ratings are identified, retained and visible to administrators. The schema keeps them in separate tables with no join path between a directory record and an anonymous response, and the respondent-facing text says plainly which is which. This separation is tested (Section 14).

### 3.5 Identified manager flow

Managers sign in with a one-time email code (no password) and receive the `manager_respondent` role scoped to the campaign. Rating forms list direct reports from the campaign snapshot. Ratings of 5, and talent bands 5 and 1, require a one-line evidence note. Forms pre-fill from the manager's previous ratings. Administrators see which managers are outstanding. Every administrator or support view or export of ratings writes an audit entry: administrators and staff read ratings only through functions that write it, so no view goes unrecorded. A scheduled job nulls the employee link on rating rows when a directory record is purged (30 days after deactivation), so history stays reproducible without named ratings on former employees.

### 3.6 Suppression and guardrails

Suppression is unchanged from v1 Section 3.6: the higher of the anonymity floor (5; 8 for M2, pay equity and fairness) and the Cadence Master validity threshold, enforced where the data is stored, with pulse roll-up to the parent unit. With no consultant screening clients, four guardrails are structural: results and suggestions are never about an individual; units under 10 staff cannot be measured; the instrument is fixed; a trip-wire breach cannot be hidden or dismissed by a unit viewer.

---

## 4. Authentication and onboarding

Supabase Auth with `@supabase/ssr` sessions and middleware gating, as v1. Account owners, administrators, viewers and PerformanceVP staff sign in with a password; managers use the one-time email code (decided 23 September 2026). Multi-factor authentication (TOTP) is mandatory for the Owner, support staff, account owners and administrators, because those roles can see identified ratings. Executive and unit viewers are offered it, and once enrolled always need it. The database enforces all of this: every role except manager needs a password session, the mandatory roles need `aal2`, and a signed-out or revoked session counts for nothing. Auth email is sent from `portal@performancevp.com.au`.

There is no self-serve sign-up. Organisations are provisioned by the Owner or support staff on signature of an agreement (Section 11), and the account owner is invited by email. Public sign-up is disabled in Supabase Auth.

---

## 5. Calculation engine

Unchanged. Sections 5.1 to 5.3 of the first plan remain the engine specification in full and are preserved verbatim in `docs/ENGINE_SPEC.md`: the Diagnostic Workbook is the single source of calculation truth, reproduced formula for formula including intermediate rounding; constants in one annotated module; worked-example fixtures, property tests and the parity harness at every computed output with exact match on discrete outputs.

Five notes for the online product. The engine returns the full fourteen-row priority ranking; parity is still asserted on the workbook's top six. The engine also returns the binding-constraint statement string, reproduced from the workbook's template (Composite Scoring B45), and it joins the exact-match parity outputs. The online product never supplies DLP decisions or behavioural triangulators, so those outputs are empty and no M1 survey-behavioural flag fires. Before parity fixtures are generated, the gap-flag guard correction must be carried into the production workbook, so the benchmark is clean. The five flag formulas (Opportunity Inputs D22, D39 and D55, Synergy Inputs D25, Behavioural Triangulators C11) use `AND(ISNUMBER(x),ABS(x)>15)`, which returns `#VALUE!` when the gap is blank because Excel evaluates both arguments. The online product never computes the S2 or M1 gap, so every online fixture would hit that error path. The fix is the nested form `IF(ISNUMBER(x),IF(ABS(x)>15,"...",""),"")`, already proven on the B&D copy with zero differences across 2,398 cells. Threshold comparisons follow Excel's behaviour, not strict IEEE comparison. The workbook maintenance pass of 21 September 2026 observed Excel evaluating 15.000000000000014 > 15 as FALSE, and computed scores routinely carry floating-point noise of that size (a perception score of 60 is stored as 59.999999999999986). The engine therefore applies Excel's own rule before any threshold comparison: both operands are rounded to 15 significant digits, so numbers that agree to that precision compare equal. The comparisons are the gap above 15, the trip-wire below 60, false consensus below 60 and above 75, the colour bands, the range checks and the binding-component comparison (decided 22 September 2026, replacing an earlier 10-decimal-place rule). The parity fixtures include exact-boundary cases built from computed survey means, and ties in the binding-component comparison resolve C, then M, then O, as the workbook's formula does.

---

## 6. Intake package

New, and the second most consequential piece of code after the engine. It is the portal's mirror of the Survey Processing and Scoring Workbook, extended with the online-only rules.

**Inputs.** The raw survey rows for the member, team-leader and leadership audiences, which the intake screens itself so the validity exclusions have one home; identified ratings; checklist responses; formal ratings with their dates and scale map; the unit context; the campaign snapshot; prior-cycle scores for carry-forward.

**Outputs.** A complete `UnitMeasurementInput` for the engine; the item-group means and component scores the recommendations rules use; and the methodology metadata for the footer (instruments, response rates, exclusions, insufficiencies, adjustments applied, C3 source and treatment).

**Rules it implements**, each from the Online Measurement Specification: module scoring for M-O1-LT, M-O1-CASCADE, M-O2-IA, M-O3-PF, M-C5-TL, M-C1-MGR and M-C3-MGR as the Module Library and the Survey Processing Workbook define them; M-C2-MGR; ADM-O1, ADM-O2 and ADM-O4; the O1, O2 and O4 components passed to the engine unaltered, so the workbook's blank-input rule applies (a missing component makes the sub-dimension insufficient, with no reallocation inside a composite); O5 scored per team and FTE-weighted to the unit, as C4 is; the C1 tenure moderator from directory start dates; S1 from the ratings matrix; the inflation guard; and C3 route selection per unit with the 12-month rule, the 80% coverage test and the Measurement Reference acceptance rules.

**Tests.** Parity against the Survey Processing Workbook on the Northwind worked example for every module that workbook scores. Named fixtures from the worked examples in the Online Measurement Specification Part 4 for every online-only rule (C2 = 60.1, ADM-O1 = 72.2 and O1 = 62.2, ADM-O2 structural = 57.7, ADM-O4 = 52.5 and O4 = 46.3, the guard deductions). Property tests: deductions never take a score below zero; route selection is deterministic; formal ratings older than 12 months are never used.

---

## 7. Setup and directory

The setup flow is the product's front door and is built as a guided sequence with a readiness check at the end.

1. **Organisation and units.** Name, sector metadata, unit hierarchy with stable unit codes.
2. **Directory.** Download the Excel template, populate it from the HRIS, upload. The platform validates, shows the differences and applies nothing until the administrator confirms. Individuals can also be edited directly in the portal. Re-uploading rebuilds the structure, matching on employee ID.
3. **Unit context.** Role families and skills from the template library, knowledge domains with criticality, decision types, three critical processes, primary systems.
4. **Formal ratings (optional).** Map the client's rating labels to the five bands and declare whether ratings were calibrated. The 12-month rule is stated on the template, the upload screen and in the guidance.
5. **Readiness check.** Units of at least 10, every person assigned to a unit and a manager, team leaders and leadership team flagged, frameworks complete. Blocks the first campaign until it passes.

Unit continuity follows the specification: renames keep history; merges and splits create new units with lineage and an annotated break in the trend. A scheduled job compares directory changes with the Cadence Master 7.3 triggers and prompts the administrator to run the matching event-triggered refresh.

---

## 8. Campaign engine

**Cadences.** Baseline, quarterly pulse, half-yearly, annual, event-triggered, assembled from the reference tables exactly as v1 Section 7 described, with the audience and module mix from the Online Measurement Specification Part 2.

**Audiences.** Members receive Part A and Part B as two tokenised surveys inside one window. Team leaders and the leadership team receive tokenised modules. Managers receive a sign-in link to their rating forms; the C3 section is omitted for units on the formal-ratings route. Administrators complete the checklists in the portal.

**Lifecycle.** Launch freezes the directory snapshot and issues invitations through Resend. Reminders go to non-completers without touching response content. At close, the close job passes the raw survey rows, the ratings, the checklists and the frozen snapshot to the intake package, which applies the Survey Blueprint 7.8 exclusions in the form the Survey Processing Workbook implements plus the speed check, computes the aggregates and evaluates the thresholds; nothing else screens a response. The intake package assembles the engine input, the engine runs, the recommendations package runs, and the full result is stored as one calculation run in one transaction.

**Review and release.** The administrator sees the run first, with the methodology footer and any insufficiency notices, and releases it. Only released runs are visible to executive and unit viewers. A pulse campaign updates the trajectory layer and never recalculates P.

**Scheduling.** The platform proposes a cadence calendar at setup from the baseline date. Campaigns open on schedule with administrator approval. Event-triggered refreshes are available from a menu and are not capped.

---

## 9. Results and dashboards

As v1 Section 8, with these changes. The ranked list shows all fourteen sub-dimensions with the two quantities explained in plain terms. Synergy has its own lane beside the ranking. There is no DLP block; the Opportunity view states that decision latency is measured in the consultant-led Diagnostic. The methodology footer carries the online route label and the standing statements from the Online Measurement Specification Part 8. A C3 source change between cycles is annotated on the trend, as is a unit lineage break. The fixed display rules are unchanged.

A separate **ratings area**, visible to administrators and the account owner only, lets them browse ratings by unit and manager and export them. Every view and export is logged. It shares no screen with results.

---

## 10. Suggestions, what-if and action tracking

Built to the Online Recommendations Specification. `packages/recommendations` implements eligibility (Part 2), pattern selection with the 8-point margin and self-checks (Part 3), sequencing and combinations (Part 3.5), and the projection rules (Part 4.2), as pure functions of a stored run with named fixtures. Cards render from `ref_pattern_cards`; until the 29 cards are written, placeholder content is seeded so the feature can be built and tested. The what-if simulator calls `projectImpact` for one sub-dimension at a time. Action tracking stores the client's status and start date and derives movement from later runs, shown with the statement that movement cannot be attributed to the action alone. The copy lint enforces the wording rules: no "will", no dollar or percentage returns, estimates labelled as such.

---

## 11. Subscriptions, entitlements and provisioning

There is no online payment. Subscriptions are sales-led: an organisation signs an agreement and is invoiced outside the portal from the accounting system. The portal holds the subscription record and enforces its consequences; it never takes a payment.

**Entitlement.** One entitlement field, `employee_band`, exists from Milestone 3 so nothing is reworked later. The entitlement check compares active directory headcount with the band, with a configurable tolerance; the enforcement rule itself is a commercial decision and is left as a named placeholder (`ENTITLEMENT_ENFORCEMENT`).

**Provisioning.** On signature, the Owner or support staff creates the organisation, sets its employee band and subscription period, records the agreement date and invoice reference, and invites the account owner by email. Onboarding (Section 7) follows. The subscription record carries who provisioned it, and provisioning is audit-logged.

**Renewal reminders.** The account owner and PerformanceVP are reminded at 60 and 30 days before the period ends. A renewal is recorded by the Owner or support staff extending the period.

**Lapse.** On expiry the organisation enters a 30-day read-only grace period: released results stay viewable, no campaign can be launched, and the directory and unit context cannot be changed. After the grace period the organisation is suspended and client access is closed. Its data is retained until the Owner deletes the organisation, a manual, audited action that exports first and then purges. The legal review may set a maximum retention period for suspended organisations; until it does, retention is until deletion. This supersedes the earlier offboarding rule of export and purge within 30 days of cessation.

Price levels, Guided Setup scope, the support model and the legal terms are outside this plan and are settled before launch, not before build.

---

## 12. Phased delivery

**Milestone 0: Foundations.** Repository, scaffold, CI, local stack, staging deploy. As v1.

**Milestone 1: Engine.** As v1, unchanged. Precondition: the gap-flag guard correction is in the production workbook. Exit: every worked example reproduces; parity passes at every computed output. Can start now.

**Milestone 2: Intake package.** Exit: Survey Processing Workbook parity on the Northwind example; all online-rule fixtures pass.

**Milestone 3: Tenancy, roles and directory.** Schema for Sections 2.1, 2.2 and 2.8; helper functions; RLS for every table; auth including the one-time-code manager sign-in and mandatory MFA; the Excel template, upload preview, snapshots and lineage; audit triggers. Exit: the RLS matrix in Section 3.3 proven by tests across two seeded organisations, including that executive and unit viewers cannot read ratings and that no role can read anonymous responses. Notes from Milestone 0. Data API grants: Supabase no longer auto-exposes new tables to `anon`, `authenticated` and `service_role` (the CLI's `auto_expose_new_tables` default is off, and the field is removed on 30 October 2026), so the first migration states the grants explicitly rather than assuming either the old or the new default, and the "no grants to `anon`" rule in 3.1 is asserted by a pgTAP test beside the RLS-on-every-table invariant that already exists. Key naming: Supabase issues publishable and secret keys alongside the legacy anon and service-role keys, and the local CLI prints both; the names in `apps/portal/.env.example` are confirmed against the staging project when it is created and renamed if the new keys are adopted. Whether RLS is also forced for the table owner is decided with the policies: it is not (3.1). Scope, settled 23 September 2026: Milestone 3 also creates the three context tables that personal data references (role families, skills, knowledge domains) and the security-bearing tables of 2.5 (invitations, anonymous responses, rating sessions and ratings, with campaigns and campaign units as skeletons), so the exit criterion can be proven; Milestones 4 and 5 add their flows.

**Milestone 4: Setup flows.** Section 7 end to end with placeholder templates. Exit: a new organisation reaches a passing readiness check without help. From Milestone 3 (23 September 2026): email codes and links last one hour, the shared Supabase expiry, so an invitation can expire before it is used. When an invitation link has expired or been used, the confirmation page offers "Send me a new link". The person enters their work email and, if a pending invitation or an account exists for it, a fresh link is sent. The page responds the same either way, so it reveals nothing about who holds an account, and it is subject to the auth email rate limit. It replaces the fallback the invitation email gives today (the password-reset path), which has not been tested for an invited person who never set a password.

**Milestone 5: Campaign engine.** All five audiences, both member parts, reminders, validity, aggregation, thresholds and roll-up.

**Milestone 6: The vertical slice, then results.** First the slice: one organisation, one unit, one baseline campaign with seeded responses through intake, engine, review, release and a unit dashboard seen by an executive viewer. Then the full dashboards, trends, footer, pulse trajectory and the ratings area. Note from Milestone 0: Tailwind's default palette is removed from the application, so the Green, Amber and Red status bands and any other status colour must be defined as deliberate tokens in `apps/portal/app/globals.css`, with contrast checked, before the display rules are built. No off-brand colour can be typed ad hoc. `assemblePulseView`, deferred from Milestone 1 because it has no workbook formula to mirror, is specified and built here with the pulse trajectory layer.

**Milestone 7: Suggestions, what-if and action tracking.**

**Milestone 8: Cadence scheduling and event-trigger prompts.**

**Milestone 9: Subscriptions and provisioning.** The subscription record, the provisioning flow with the account-owner invitation, the renewal reminder jobs, grace and suspension behaviour, Owner deletion with export, the Northwind demo tenant, help content.

**Milestone 10: Hardening.** External penetration test, backup and restore rehearsal, observability, accessibility, offboarding through the Owner deletion flow of Section 11, copy review, legal pages, production cutover. Note from Milestone 0: decide whether `GET /api/health`, public since the scaffold so the staging deploy could be verified, stays public. It reports the environment, the commit and the package versions, and no secrets. `VERCEL_ENV_SPLIT` and `ERROR_TRACKING_PROVIDER` (root README, Named placeholders) are also settled here.

Milestones 7 and 8 are independent of each other and can reorder.

---

## 13. Items for Michael

None is executed as part of the build without sign-off.

1. Create the portal repository and Vercel project; two Supabase projects in Sydney; Resend keys that belong to the online product alone.
2. Environment variables as v1 Section 11; the register is `apps/portal/.env.example`.
3. Supabase Auth configuration as v1, with public sign-up disabled.
4. Resend identity `surveys@performancevp.com.au`, verified, with a live test send before any campaign depends on it.
5. The VentraIP CNAME for `app`, additive only, at cutover. MX and TXT records untouched.
6. The "Client login" link on the marketing site, prepared as a reviewable change.
7. Carry the gap-flag guard correction into the production workbook, then supply parity fixture outputs during Milestone 1.
8. Before launch, not before build: subscription terms that make the client responsible for its data with PerformanceVP as service provider, cover support-staff access (which the client cannot switch off and always sees), the data-contribution default and opt-out, the handling of access requests, and the retention of suspended organisations until the Owner deletes them or until any maximum period the review sets; a privacy notice that reflects the persistent directory and retained ratings; the respondent-facing statement separating anonymous surveys from identified ratings; and confirmation of which entity owns the IP.

---

## 14. Testing and quality

**Engine.** As v1 Section 5.3. A red engine suite blocks everything.

**Intake and recommendations.** Parity and fixtures as Sections 6 and 10. Both packages gate merges.

**RLS and security.** The SQL matrix suite from v1, rewritten for the new roles, asserting Section 3.3 per table. Focused cases: anonymous responses unreadable by every role; no query path from a directory record to an anonymous response; ratings readable only by the rating manager, administrators, the account owner and staff under a support session; staff access denied without an open support session; every ratings view and support access present in the audit log; token reuse and expired windows rejected; the purge job nulls employee links and deletes nothing else.

**Directory.** Upload tests for matching on employee ID, the difference preview, deactivation, snapshots unaffected by later edits, lineage on merge and split, and rejection of malformed or oversized files.

**Application.** Playwright flows: setup to readiness; a baseline campaign across all audiences; manager sign-in, pre-fill and evidence-note enforcement; close, review and release; viewer confinement; suppression rendering; the formal-ratings route switching per unit; suggestions with a self-check; action tracking across two cycles. Component tests for display rules. Copy lint for the voice conventions and the claims rules.

**Operations.** Fresh-database migration test, the Northwind demo tenant on staging, one restore rehearsal before go-live, error tracking from day one.

---

## 15. Decisions

**Carried from v1 and still binding:** `CALCULATION_TRUTH`, `BINDING_CONSTRAINT_METHOD`, `PARITY_TOLERANCE`, `GAP_COMPOSITE_RULE`, `CONVERSION_TEXT_CORRECTIONS`, `ANONYMITY_FLOOR_N`, `SURVEY_DELIVERY_MODEL`, `PORTAL_SUBDOMAIN`, `ENV_TOPOLOGY`, `MAIL_FROM_IDENTITY`, `C4_TEAM_ENTRY`, `REPO_LAYOUT`, `ORG_AGGREGATION_METHOD`, and the Owner role.

**Superseded:** `PII_RETENTION`; the analyst gate; no self-service sign-up; clients never seeing inputs; `ANALYST_MFA` (widened to every role that can see ratings); the offboarding rule of export and purge within 30 days of cessation (22 September 2026, replaced by retention until Owner deletion, Section 11).

**New, settled 21 September 2026 in the two online specifications:** the online measurement route for all 17 sub-dimensions; M-C2-MGR and the three administrator checklists; the inflation guard; no C2 fallback; open text omitted in v1; identified ratings retained and visible to administrators; formal performance ratings as an optional C3 input under the 12-month rule, per unit, with the Measurement Reference acceptance rules; PerformanceVP support access; the persistent directory with the Excel template; suggestion depth, the 8-point margin, action tracking in v1 and case sketches withheld.

**Made in this plan and confirmed with its approval on 21 September 2026:** mandatory MFA for account owners and administrators; one-time email code sign-in for managers; self-serve sign-up behind a flag until launch (withdrawn 22 September 2026, Section 11); DLP tables not built; the first plan's engine sections preserved in `docs/ENGINE_SPEC.md`.

**Made on 22 September 2026:** sales-led subscriptions with no online payment; the lapse and retention policy (Section 11; `DECISIONS.md` 5.5).

**Made on 23 September 2026, with the Milestone 3 plan:** staff access through logged support sessions with no client switch; passwords for every role except managers; `portal@performancevp.com.au` for auth email; the directory spreadsheet read and written by our own code over `fflate`; RLS not forced; ratings read through logged functions; the audit image allowlist; the subscription state computed from its terms; formal ratings in their own table; staff writing the directory under a session; the account owner's history access in suspension; publishable and secret keys; Vercel Cron as the job runner (`DECISIONS.md` 5.6). New placeholders: `EMPLOYEE_BANDS`, `SESSION_LIMITS`, `EMPLOYMENT_STATUS_VALUES`.

**Deferred:** archetype weight sets; M1 behavioural lookups and the survey-behavioural flag; machine-themed open text; HRIS and engagement-platform integrations; the internal comparison set, pending legal review; `ENTITLEMENT_ENFORCEMENT`; Stripe Invoicing, as a possible later addition if invoicing ever moves out of the accounting system.

---

## 16. Changes to `CLAUDE.md` and `DECISIONS.md`

Applied on 21 September 2026, immediately after approval, because Claude Code treats `CLAUDE.md` as its operating instructions. Recorded here so the change is traceable.

**`CLAUDE.md`.** Section 1 rewritten for the client-operated product and the two product lines. Section 2 source list extended with the two online specifications, the Tier 3 Module Library and the Survey Processing Workbook Spec. Section 4 roles replaced with Section 3.2 of this plan, survey anonymity kept, the identified-ratings rules added. Section 5 keeps every engine invariant and replaces the three-input-type paragraph: the intake package, not an analyst, produces Type A, B and C inputs. Section 6 functional areas replaced with setup, directory, campaigns, results, suggestions and billing. Section 7 keeps every domain rule and amends measurement separation: post-intervention measurement lives in a re-run Diagnostic or the online subscription. Section 11 adds Stripe as the one permitted new provider. Section 12 points to this plan.

**`DECISIONS.md`.** Dated entries for each superseded decision with the reasoning, a new section summarising the 21 September 2026 decisions with pointers to the two specifications, and the deferred list updated.

---

## 17. Work that runs alongside the build

None of it blocks Milestones 0 to 6.

1. The three source checks in the Online Recommendations Specification Part 9.2 were completed on 21 September 2026 and are written into that document.
2. The Role-Family Template Library and the 29 online pattern cards. Placeholder seed data is enough to build and test against.
3. The Strategy Part 4 and Cadence Master 7.7 updates, and the four source discrepancies flagged in the Online Measurement Specification Part 11.3.
4. The commercial specification: price levels, Guided Setup, support model, terms.
