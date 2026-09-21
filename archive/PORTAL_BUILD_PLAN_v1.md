# PerformanceVP Client Portal: Build Plan

## Context

PerformanceVP commercialises the Performance Equation through three offerings: a one-off Diagnostic, project-based Intervention Design, and an ongoing Tracking Subscription. This plan covers the client portal that operationalises the third offering and hosts the working surface for the first two within an ongoing client relationship. The portal lets PerformanceVP analysts run measurement work (surveys, diagnostic uploads, scoring, intervention design) and lets client executives view their own organisation's results, from the headline P score down to individual sub-dimension scores per business unit.

The portal implements existing intellectual property; it does not redefine it. The canonical sources live in `docs/source-ip/` and were read in full before this plan was written: the Strategy, the Sub-Dimension Cadence Master, Measurement Reference Parts 1 and 2, the Diagnostic Workbook Spec, the Survey Blueprint, and the Intervention Design Library. Where this plan repeats a weight or formula it does so for buildability; the source documents remain the authority, and every constant in the build is sourced from them, never invented. Where two source documents disagree, the discrepancy is recorded in Section 13 for Michael to resolve rather than resolved unilaterally.

Three areas carry the most risk and are treated as foundational throughout: the calculation engine (numerical correctness against the Workbook Spec), the security model (client data includes anonymous employee survey responses), and the tenancy model (no client may ever see another client's data).

---

## 1. Architecture Overview

### 1.1 Two applications, one platform

The existing marketing site (`performancevp-site/`, Next.js 15, App Router, deployed on Vercel at `www.performancevp.com.au`) remains untouched except for one approved change: a "Client login" entry point in its navigation that links to the portal subdomain. The portal is a separate Next.js application in its own repository, deployed as its own Vercel project on the confirmed subdomain `app.performancevp.com.au`. The portal repository carries the application, the calculation engine as its own internal package, the Supabase migrations, and a copy of `docs/source-ip` so the build always works against the authoritative IP snapshot. Keeping the two apps separate isolates the portal's auth, dependencies and release cadence from the public site, and means a marketing deploy can never break a client dashboard.

"Log in via the PerformanceVP site" is satisfied by the marketing-site link routing to the portal's `/login` page. The marketing site holds no auth code and no client data.

### 1.2 Stack

The portal is Next.js (App Router) with TypeScript in strict mode, styled with Tailwind CSS using the four brand tokens (Corporate Slate Blue `#1F3A52`, Strategic Gold `#B89E6E`, Measurement Grey `#5C6670`, White `#FFFFFF`) defined once as theme tokens. Visualisations distinguish the four forces by position, label and shape, not colour, since all four share Slate Blue.

Supabase provides Postgres, Auth, Row Level Security and Storage. All client data access from the browser and from server components goes through the Supabase client with RLS enforced. The service-role key exists only in server-side route handlers for the few operations that legitimately bypass RLS (anonymous survey ingestion, user provisioning, email dispatch) and is never shipped to the browser.

Resend sends survey invitations, reminders and portal notifications, consistent with the existing PerformanceVP email pipeline. Supabase Auth's own emails (invitations, password resets) are routed through Resend via custom SMTP so that no second email provider exists.

### 1.3 Application layers

The portal has four internal layers with strict dependencies in one direction only:

1. **The calculation engine**: a pure TypeScript package (`packages/engine`) with no database, network or UI dependency. It is the portal's mirror of the Diagnostic Workbook Spec. Everything else depends on it; it depends on nothing.
2. **The data layer**: the Postgres schema (Section 2), RLS policies (Section 3), and a thin set of typed query modules.
3. **Server actions and route handlers**: cycle management, input capture, engine invocation, survey ingestion, email dispatch, audit writing.
4. **The UI**: analyst workspace and client dashboards, both server-component-first, with client components only where interactivity requires them.

The engine is invoked only server-side. A calculation run reads the cycle's inputs, executes the engine, and persists the full result set in one transaction with an audit record. The UI never computes a score.

### 1.4 Environments

Confirmed: separate staging and production Supabase projects plus a local Supabase CLI stack, with matching Vercel environments, all in the Sydney region for data residency. Migrations are checked into the repo and every schema or RLS policy change is exercised locally and on staging before it reaches production; production is never the test target. No console-edited schema.

---

## 2. Data Model

All tenant-owned tables carry `organisation_id`. Reference tables (marked "ref") hold IP-derived structure seeded from the source documents and owned by PerformanceVP, readable by all authenticated users, writable by no one at runtime (changes arrive as seeded migrations when the IP changes). Identifiers are UUIDs; timestamps are `timestamptz`; all tables get `created_at`.

### 2.1 Identity and tenancy

| Table | Key columns | Notes |
|---|---|---|
| `organisations` | `id`, `name`, `status` | The tenant boundary. |
| `business_units` | `id`, `organisation_id`, `parent_unit_id` (self-FK, nullable), `name`, `fte`, `unit_type`, `anzsic_division`, `anzsic_class`, `size_band`, `archetype`, `status` | Hierarchy via `parent_unit_id`. Sector fields are classification metadata per Measurement Reference Part 7; `archetype` selects the within-component weight set. |
| `profiles` | `id` (= `auth.users.id`), `full_name`, `email`, `is_analyst`, `is_owner` | One row per portal user. `is_analyst` marks PerformanceVP staff; `is_owner` marks the single system owner account (Section 3.4a). |
| `org_memberships` | `id`, `organisation_id`, `user_id`, `role` (`client_admin` or `client_viewer`) | Unique on (organisation, user). Client Admin sees the whole organisation. |
| `unit_access` | `membership_id`, `business_unit_id` | Scopes a `client_viewer` to nominated units (descendants included). |
| `analyst_assignments` | `id`, `user_id`, `organisation_id`, `active`, `assigned_by` | Analysts cross organisations only where a row exists here. |

### 2.2 Measurement structure and reference data

| Table | Key columns | Notes |
|---|---|---|
| `ref_sub_dimensions` | `code` (PK: C1..C5, M1..M4, O1..O5, S1..S3), `component`, `name`, `cadence`, `confidence_rules` (jsonb) | Structure and decay thresholds from the Cadence Master. |
| `ref_archetype_weights` | `archetype`, `sub_dimension_code`, `weight`, `enabled` | Weight sets keyed by archetype. v1 ships with the Default set populated and enabled; the other five archetypes are present but disabled until Michael rebalances them at source, since most do not sum to 100 (`ARCHETYPE_WEIGHT_MATRIX` in Section 13, deferred enhancement with Michael as owner). Mirrored from the engine's constants for display; the engine package is the single computational source. |
| `ref_survey_items` | `code` (PK: CII-01..TW-03), `sub_dimension_code`, `sub_construct`, `wording`, `reverse_scored`, `cadence_tags`, `baseline_order` | Item bank verbatim from the Survey Blueprint, including the Part 6 assembly order. |
| `ref_pulse_rotation` | `quarter_index`, `item_code` | The Q1..Q4 rotation matrices from Survey Blueprint 3.1.4, 3.2.2, 3.5.2 and Part 6.3. |
| `ref_intervention_patterns` | `code` (C1-P1..TW-P3), `sub_dimension_code`, `name`, `when_to_use`, `design_shape`, `variants` (jsonb), `effect_min`, `effect_max`, `evidence_rating`, `pace_of_change`, `failure_modes`, `watch_for` | Seeded from the Intervention Design Library. Design guidance only; deliberately carries no implementation timelines or measurement cadences. |
| `ref_dlp_norms` | `decision_class`, `p25_days`, `p50_days`, `p75_days`, `p90_days`, `version` | Reserved for the percentile-banding enhancement. v1 does not score DLP against norms: results are reported as raw measured latencies, labelled as not yet benchmarked, until Michael supplies the normative reference set (`DLP_NORM_TABLES`, Section 13, deferred). |

### 2.3 Cycles, inputs and results

| Table | Key columns | Notes |
|---|---|---|
| `measurement_cycles` | `id`, `organisation_id`, `business_unit_id`, `cycle_type` (`baseline`, `quarterly_pulse`, `half_yearly`, `annual`, `event_triggered`), `quarter_index`, `label`, `status` (`draft`, `collecting`, `calculated`, `published`, `archived`), `opened_at`, `published_at` | One cycle per unit per measurement point, mirroring "one workbook per unit". Per the Cadence Master Part 7, a `quarterly_pulse` cycle never produces a fresh P; it produces pulse indicators with the prior P carried forward. |
| `tier_assignments` | `id`, `cycle_id`, `sub_dimension_code`, `tier` (`1`, `2`, `3`, `insufficient`), `source_identifier`, `vintage_date`, `notes` | The portal's Tab 2. The tier selector drives which input route is active and feeds confidence decay. |
| `analyst_inputs` | `id`, `cycle_id`, `sub_dimension_code` (also `TW1..3`, `DLP`, `TRIANG`), `input_type` (`A`, `B`, `C`), `route`, `payload` (jsonb, validated against a per-sub-dimension schema), `version`, `superseded_by` (nullable), `created_by` | Append-only. Editing creates a new version that supersedes the old; nothing is destructively updated. |
| `dlp_decisions` | `id`, `cycle_id`, `decision_ref`, `decision_class`, `identified_date`, `authorised_date`, `latency_days`, `bottleneck`, `outcome_quality`, `open_at_sampling` | The decision sample log (Workbook Spec Part 8). |
| `triangulator_inputs` | `id`, `business_unit_id`, `period_month`, `metric`, `value`, `source` | Monthly behavioural data (turnover, absence, eNPS, overtime, backlog) feeding the M1 gap rule and the pulse trajectory layer. |
| `data_files` | `id`, `organisation_id`, `cycle_id` (nullable), `storage_path`, `filename`, `sha256`, `uploaded_by` | Metadata for evidence files in Supabase Storage (private bucket). |
| `calculation_runs` | `id`, `cycle_id`, `run_by`, `run_at`, `engine_version`, `reference_data_version`, `inputs_hash`, `status` | Every engine execution is a run; published results always trace to one run. |
| `sub_dimension_scores` | `id`, `calculation_run_id`, `sub_dimension_code`, `score` (nullable: null = suppressed), `structural_score`, `perception_score`, `gap`, `gap_flag`, `tier`, `confidence` (`high`, `medium`, `low`, `excluded`), `carried_forward_from_cycle_id` (nullable), `suppression_reason` | Structural and perception columns used for O1/O2/O3 (and M1's behavioural composite alongside). |
| `composite_scores` | `calculation_run_id` (1:1), `c`, `m`, `o`, `s_internal`, `s`, `p`, `binding_component`, `binding_sub_dimension`, `constraint_ranking` (jsonb), `p_confidence`, `weight_reallocations` (jsonb), `methodology` (jsonb) | `constraint_ranking` holds the top-six priority ranking from the realistic-P-gain method (rank, component, sub-dimension, raw score, realistic P gain, priority) per the workbook's binding-constraint method (Section 5.2); `binding_component` and `binding_sub_dimension` denormalise its top entry. The methodology blob holds everything the methodology footer needs: tier mix, exclusions, reallocations, gap flags, carry-forward list. |
| `trip_wire_results` | `calculation_run_id`, `code` (`TW1`, `TW2`, `TW3`), `score`, `is_critical` | Always outside P. |
| `dlp_results` | `calculation_run_id`, `class_summaries` (jsonb), `operational_dls`, `tactical_dls`, `strategic_dls`, `overall_dls`, `sample_warnings` (jsonb) | Reported alongside O, never averaged into it. In v1 `class_summaries` carries the raw measured results per class (count, median, observed 75th and 90th percentile latency, open-at-sampling count, bottleneck notes) and the DLS columns stay null until the percentile-banding enhancement lands. |

### 2.4 Surveys

| Table | Key columns | Notes |
|---|---|---|
| `survey_campaigns` | `id`, `organisation_id`, `cadence_type`, `quarter_index`, `opens_at`, `closes_at`, `status`, `created_by` | One campaign per measurement event; item set assembled from `ref_survey_items` plus rotation. |
| `campaign_units` | `id`, `campaign_id`, `business_unit_id`, `cycle_id`, `expected_headcount` | Per-unit targeting and the headcount denominator for response-rate and reconciliation checks. |
| `survey_invitations` | `id`, `campaign_unit_id`, `email`, `token_hash`, `status` (`created`, `sent`, `opened`, `completed`, `bounced`), `sent_at`, `reminders_sent` | Single-use tokens, stored hashed. Deliberately not linkable to responses (see Section 3.5). |
| `survey_responses` | `id`, `campaign_unit_id`, `submitted_at`, `completion_seconds`, `validity_status` (`valid`, `excluded`), `exclusion_reason` | Carries unit and campaign only; no invitation reference, no respondent identity. |
| `survey_item_responses` | `id`, `response_id`, `item_code`, `raw_value` (1..5) | Raw, un-flipped values as entered. |
| `survey_unit_aggregates` | `id`, `campaign_unit_id`, `item_code`, `n_valid`, `mean_raw` | Computed after window close; the bridge into Type A engine inputs. |

### 2.5 Interventions and audit

| Table | Key columns | Notes |
|---|---|---|
| `interventions` | `id`, `organisation_id`, `business_unit_id`, `source_cycle_id`, `sub_dimension_code`, `from_binding_constraint` (bool), `pattern_code` (nullable FK to `ref_intervention_patterns`), `title`, `status` (`draft`, `designed`, `presented`, `client_implementing`, `measuring`, `closed`), `current_version_id`, `created_by` | Created from a finding. |
| `intervention_versions` | `id`, `intervention_id`, `version`, `root_cause`, `designed_solution`, `variant`, `p_impact` (jsonb), `measurement_plan`, `client_implementation_plan`, `created_by` | Append-only versions. `p_impact` stores the baseline run id, the assumed improved sub-dimension score, the recomputed C/M/O/S/P and the delta, plus the engine version used. |
| `intervention_effects` | `id`, `intervention_id`, `cycle_id`, `observed_score`, `observed_delta`, `notes` | Measured effect recorded against later cycles. |
| `audit_logs` | `id`, `organisation_id` (nullable for global events), `actor_id`, `action`, `entity_type`, `entity_id`, `before` (jsonb), `after` (jsonb), `created_at` | Append-only; no update or delete path exists for any role. |

Relationships in brief: an organisation has units; a unit has cycles; a cycle has tier assignments, inputs, DLP decisions and calculation runs; a run has sub-dimension scores, composite scores, trip-wire results and DLP results; a campaign spans units and links each campaign unit to a cycle; interventions hang off an organisation and unit and reference the cycle and finding that produced them.

---

## 3. Security and Tenancy

This section is the contract the schema and every feature must satisfy. It is written before the code on purpose.

### 3.1 The tenant boundary

The organisation is the tenant. Every client-owned row carries `organisation_id`, directly or through an unambiguous parent (a `survey_item_response` reaches its organisation through response, campaign unit and campaign). RLS is enabled on every table in the schema, including reference tables, with no exceptions. The default posture is deny: enabling RLS with no policy denies everything, and policies then grant the minimum each role needs. There are no `USING (true)` policies on tenant data, and the `anon` role has no grants on any table.

### 3.2 Roles and access helpers

Three client-facing roles, exactly as CLAUDE.md defines: Analyst (PerformanceVP staff, elevated access scoped to assigned engagements), Client Admin (full read of their own organisation), Client Viewer (read scoped to nominated units and their descendants). Above them sits a single Owner role for system administration (Section 3.4a). Role facts live in tables (`profiles.is_analyst`, `profiles.is_owner`, `org_memberships`, `analyst_assignments`, `unit_access`), not in JWT claims, so revocation is immediate. Policies call a small set of `security definer` helper functions with stable search paths:

- `is_owner()`: single-account owner flag for system administration (Section 3.4a).
- `is_analyst()`: profile flag for the current user.
- `is_assigned_analyst(org_id)`: analyst with an active assignment to that organisation.
- `has_org_access(org_id)`: assigned analyst, or member of the organisation.
- `can_view_unit(unit_id)`: assigned analyst, client admin of the unit's organisation, or client viewer whose `unit_access` covers the unit or an ancestor.

### 3.3 Policy intent per table group

| Table group | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `organisations`, `business_units` | `has_org_access`, with unit rows further filtered by `can_view_unit` for viewers | Assigned analysts only; deletes are status changes, not row deletes |
| `profiles` | Own row; analysts see profiles of users in assigned organisations | Own row (name only); provisioning runs server-side with service role |
| `org_memberships`, `unit_access`, `analyst_assignments` | Visible to assigned analysts and to client admins for their own organisation | Assigned analysts only; `analyst_assignments` writable only via a server-side admin path |
| `measurement_cycles`, `tier_assignments` | Analysts: assigned orgs. Clients: rows whose cycle status is `published`, unit-filtered | Assigned analysts only |
| `analyst_inputs`, `dlp_decisions`, `triangulator_inputs`, `data_files`, `calculation_runs` | Assigned analysts only. Clients never see raw inputs | Assigned analysts; `analyst_inputs` insert-only (supersede, never update) |
| `sub_dimension_scores`, `composite_scores`, `trip_wire_results`, `dlp_results` | Analysts: assigned orgs, all runs. Clients: only runs belonging to `published` cycles, unit-filtered | No client write path; written server-side within the calculation transaction |
| `survey_campaigns`, `campaign_units`, `survey_invitations` | Assigned analysts only (invitation emails are PII; clients never see them) | Assigned analysts; invitation send and token issuance run server-side |
| `survey_responses`, `survey_item_responses` | No client-side SELECT for anyone, including analysts. Raw responses are processed only by server-side service-role code | Inserted only by the anonymous-ingestion route handler (service role) |
| `survey_unit_aggregates` | Assigned analysts; clients see nothing here (clients see scores, not item means) | Written server-side by the aggregation job |
| `interventions`, `intervention_versions`, `intervention_effects` | Analysts: assigned orgs. Clients: interventions in `presented` or later status for their units | Assigned analysts; versions insert-only |
| `ref_*` | All authenticated users | No one at runtime; seeded by migration |
| `audit_logs` | Assigned analysts for their organisations' rows; a future super-admin view is server-side | Insert via trigger and server code only; UPDATE and DELETE revoked from every role |

Storage: one private bucket, paths prefixed `org/{organisation_id}/`, storage policies mirroring `has_org_access` for read and assigned-analyst for write. No public buckets anywhere.

### 3.4 Analyst scoping

`is_analyst` alone grants nothing on tenant data. Every analyst policy requires an active `analyst_assignments` row for the organisation. This is what makes "able to cross organisations only where assigned" mechanical rather than procedural. Creating and revoking assignments is itself audited and restricted to the Owner through a server-side admin path.

### 3.4a The Owner role

A distinct Owner role exists in the schema from day one, held by exactly one account (Michael). It is deliberately least-privilege: the Owner administers the system (organisations, units, user provisioning, memberships, analyst assignments, reference-data deployments, audit review) without any automatic read access to client survey responses or client results. Where the Owner needs client data, access is granted per assignment exactly as for analysts. An explicit break-glass path exists: the Owner can self-grant an assignment through the server-side admin function, and that grant is written to the audit log flagged as break-glass, so emergency access is possible but never silent. No broader role hierarchy is built for v1, and raw survey responses remain unreadable client-side for every role including the Owner (Section 3.3).

### 3.5 Survey respondents without accounts

Respondents are not portal users and never authenticate. The flow: the analyst's campaign send issues a single-use token per invitation, stores only its hash, and emails the link via Resend (`/s/{token}`, an opaque token, no PII and no readable unit name in the URL). The survey page and submission run through public route handlers that validate the token hash server-side with the service role, resolve the campaign unit, accept the response, and mark the token used. Two deliberate properties: the respondent never receives a Supabase session or any read access, and the response row records the campaign unit but not the invitation, so completion status and answers are structurally unlinkable. The token gates exactly one submission, which is what lets response-rate tracking and reminders work without ever linking a person to their answers. Token validation is rate-limited and tokens expire when the campaign window closes.

This tokenised-unlinkable design is the confirmed default. A per-department shared link (the Survey Blueprint 8.1a model) is retained as a configurable per-campaign fallback for clients who will not supply staff email lists, with its trade-offs stated in the analyst UI and the methodology footer: no per-person response tracking, no targeted reminders, and no guarantee of one response per person beyond the device-level guard and the validity rules.

### 3.6 Minimum-N suppression

Suppression is enforced where the data lives, not in the UI. Raw responses are unreadable client-side by design (3.3). Aggregation applies two layers, and the binding rule is confirmed: a unit-level survey-derived score displays only when the valid respondent count is at least the higher of the anonymity floor and the Cadence Master 7.4 scoring-validity threshold for that construct and cadence. Always the maximum of the two, never the minimum. The scoring-validity thresholds (taken from the Cadence Master, to be re-read when the constants are locked: 60% response per unit at baseline and annual, 12 valid respondents per unit for the pulse, 8 for the half-yearly, 4 valid respondents and 70% per team for the CII) mark a sub-dimension insufficient and reallocate its weight. The anonymity floor is N = 5 as the baseline, raised to N = 8 for psychological safety (M2) and for the pay-equity and fairness trip-wires, reflecting the sensitivity of those constructs. Units below the pulse threshold roll up to their parent for pulse reporting, per the Cadence Master. The engine receives only aggregates that have already passed these gates, and `sub_dimension_scores.score` is null with a `suppression_reason` when a gate fails.

### 3.7 Audit strategy

Three mechanisms. Database triggers on the sensitive tables (`analyst_inputs`, `tier_assignments`, `measurement_cycles`, `interventions`, `intervention_versions`, role and assignment tables) write before-and-after images to `audit_logs` with the acting user. Application-level audit entries record the semantic events triggers cannot see: calculation runs (who, when, engine version, inputs hash), publishes, campaign sends, exports. And the data model itself is append-only where history matters: inputs and intervention versions supersede rather than overwrite, and every published score traces to an immutable calculation run. Together these make it impossible for an analyst to silently alter a client's historical scores: the prior run, its inputs and the audit trail all survive.

---

## 4. Authentication

Supabase Auth with email and password, plus invitation-driven onboarding. There is no self-service sign-up: an assigned analyst (or the Owner) provisions a client user from the analyst workspace, which creates the auth user server-side, writes the `org_memberships` row (and `unit_access` rows for viewers), and sends an invitation email through Resend prompting the user to set a password. Password resets follow the standard Supabase flow with emails routed through Resend SMTP.

Sessions use `@supabase/ssr` cookie-based sessions so server components, server actions and route handlers all see the same authenticated context. Next.js middleware refreshes sessions and gates all portal routes except `/login`, the auth callback routes and the public survey routes (`/s/*`). After login, analysts land on the analyst workspace and client users land on their organisation's dashboard; a user with no membership and no analyst flag sees an access-pending page and nothing else.

Role assignment is data, not configuration: the login flow carries no role logic beyond reading `profiles` and `org_memberships`. Multi-factor authentication is mandatory for the Owner and for analyst accounts with no exception, enforced at login for any user with either flag; client admins are offered MFA at first login and encouraged to enable it, without it being a barrier to access. The marketing site's only involvement is the "Client login" link to `https://app.performancevp.com.au/login`; adding that link is an approved content change to `performancevp-site`, listed in Section 11.

---

## 5. Calculation Engine

### 5.1 Shape and boundaries

Governing principle, confirmed 10 June 2026: the Diagnostic Workbook at `Production Docs/PerformanceVP-Diagnostic-Workbook.xlsx` is the single source of calculation truth. The engine reproduces the workbook's logic formula for formula, including intermediate rounding, by reading the workbook's actual cell formulas during implementation, with the Workbook Spec and Measurement Reference serving as narrative documentation. Any difference between engine and workbook output is a defect in the engine, never a design choice made in the portal.

The engine is a pure TypeScript package (`packages/engine`), compiled and tested independently of the app. It imports nothing but its own modules; it performs no IO. Its public surface is a small set of pure functions, of which the central one takes a fully described unit measurement and returns a fully described result:

```
calculateUnit(input: UnitMeasurementInput): UnitMeasurementResult
```

`UnitMeasurementInput` carries: the archetype; per-sub-dimension tier assignment, route, vintage date and the route's typed payload (Type A item means keyed by item code, Type B structured counts, Type C finished scores); the O1/O2/O3 structural components; trip-wire item means; the DLP decision sample; behavioural triangulator values; prior-cycle scores with their vintages for carry-forward; and the as-at date. `UnitMeasurementResult` carries every sub-dimension score with tier, confidence and suppression state; the CII sub-construct scores; structural, perception, gap and gap flag for O1/O2/O3; C, M, O, S_internal, S and P; the binding-constraint priority ranking (top six by realistic P gain weighted by relative weakness, with the top-ranked sub-dimension denormalised as the binding constraint); trip-wire scores and critical flags; the DLP raw class summaries with sample warnings (and, once the normative set exists, DLS per class and overall); the M1 survey-behavioural gap and flag; the false-consensus flag; weight reallocations applied; and the methodology metadata the footer needs. The same module exposes `projectImpact(baseline, subDimensionCode, assumedScore)` for the intervention module, which recomputes the composites from the unit's actual data with one sub-dimension substituted.

All constants live in one `constants` module inside the package, each value annotated with its source document and section: the component exponents, the archetype weight matrices, the reverse-scoring map (CII-05, CII-10, CII-15, MI1-04, MI2-05, MI3-04, MI4-04, OI1-03, OI1-06, OI2-04, OI3-05, OI4-03, TSI2-03, TSI3-04, TSI3-05, per Workbook Spec Part 9), the structural-layer weights, the gap threshold, the trip-wire threshold, the binding-constraint parameters (S_cap = 85, ρ = 0.30, τ = 8, per Workbook Spec Part 9), the DLP class weights, and the confidence decay rules. Nothing is duplicated inline. The `ref_*` tables mirror these for display but the engine never reads the database.

### 5.2 The rules the engine implements

Each rule below is implemented exactly as specified, with the source noted. During implementation, confirm every formula against the workbook's actual cells first and every number against the source documents; none are to be taken from this plan alone.

**Survey conversion.** `score = (adjusted_mean - 1) × 25`, where reverse-scored items are flipped as `6 - mean` before averaging and blank items (not in the cadence) are excluded from the mean, never treated as zero. Never `mean × 25`. (Workbook Spec 1.5 and Part 15; Survey Blueprint Part 7; Measurement Reference 1.3.)

**Sub-dimension scoring by route.** Type A: the engine reverse-scores and converts item means (C4's CII with its three sub-constructs and the 0.35/0.35/0.30 composite; M1 through M4; the O perception layers; O5; S2 and S3 survey scores; trip-wires). Type B: the engine applies the final mechanical formula to analyst-adjusted counts (C1 coverage ratio capped at 1.0, FTE-weighted across role families, with the tenure moderator 0.95/none/1.05; C2 criticality-weighted coverage-adjusted domain average; C3 band formula 100/80/60/35/0; C5 indicator mean with the 0.6/0.4 blend where a module score also exists). Type C: the engine accepts finished 0 to 100 scores as given (Tier 3 module outputs, platform composites, the O structural components, the O4 capacity analysis score). (Workbook Spec Parts 1.3 and 4 to 7; Measurement Reference Parts 2 to 5.)

**Two-layer composites for O1, O2, O3.** Structural layer: O1 = 0.40 × M-O1-LT + 0.30 × role-architecture review + 0.30 × M-O1-CASCADE; O2 = 0.35 × tool inventory + 0.40 × M-O2-IA + 0.25 × integration; O3 = M-O3-PF. Perception layer from the survey. Gap = structural minus perception; absolute gap above 15 fires the gap flag, both layers are reported separately, and the divergence is a diagnostic finding rather than silently averaged. The composite rule is resolved: where the gap is 15 or below, the sub-dimension score is the mean of the two layers; where it exceeds 15, the perception score is the value that feeds the O composite, implemented behind a single named constant. Measurement Reference 4.1 to 4.3 and 8.1 have been corrected at source (10 June 2026) to match Workbook Spec 6.6, so the document set is internally consistent. The gap magnitude itself remains a first-class output and must surface prominently in the dashboard (Section 8). (Workbook Spec 1.4, Part 6 and 6.6; Measurement Reference Part 4 and 8.1 as corrected.)

**Component aggregation with Cadence Master weights.** C, M, O and S_internal are weighted sums of their sub-dimensions using the archetype's weight set (default sets: C 0.35/0.15/0.20/0.20/0.10; M 0.50/0.20/0.15/0.15; O 0.30/0.25/0.20/0.10/0.15; S 0.30/0.40/0.30). The archetype layer is deferred out of v1: the engine reads weights from a table keyed by archetype, with Default populated and enabled and the other five archetypes disabled until rebalanced at source (Section 13). Where a sub-dimension is insufficient or excluded, its weight reallocates proportionally across the remainder (divide by the sum of available weights, never a hardcoded denominator) and the reallocation is recorded. (Cadence Master Parts 2 to 5; Measurement Reference 9.2; Workbook Spec Part 10.)

**Synergy and P.** S_internal maps to the coefficient via `S = 0.85 + (S_internal / 100) × 0.30`, bounded 0.85 to 1.15, defaulting to 1.00 with a "Synergy not measured" annotation when all three S sub-dimensions are unmeasurable. P uses only the weighted analytical form `P = S × (C^0.35 × M^0.40 × O^0.25)`. The simplified equal-weighted form never appears anywhere in the engine or portal. (Strategy 1.1 and 1.4; Measurement Reference 9.3 and 9.4.)

**Binding constraint, Synergy excluded.** The engine follows the workbook's realistic-P-gain ranking, weighted toward genuine relative weaknesses: neither a lowest-score rule nor the largest theoretical lift to a perfect 100. For each of the fourteen measured C, M and O sub-dimensions the engine computes three quantities. First, the realistic improvement under diminishing returns: `Δs = ρ × MAX(0, S_cap − score)`, which shrinks as the baseline rises and reaches zero at the realistic ceiling S_cap. Second, the realistic P gain with leverage preserved: `ΔP = P × ((1 + w_norm × Δs / compScore)^exponent − 1)`, where `w_norm` is the sub-dimension's reallocated within-component weight, `compScore` is its component's composite, and `exponent` is that component's α, β or γ. Third, the relative weakness against the unit's own level: `rel = 1 / (1 + EXP((score − unitMean) / τ))`, where `unitMean` is the mean of the fourteen C/M/O sub-dimension scores; rel is 0.5 at the mean, approaches 1 well below it and approaches 0 well above it. Priority = ΔP × rel, and the fourteen sub-dimensions rank by Priority descending, with the workbook's row-fraction tiebreak reproduced exactly so equal priorities order stably and identically to the workbook. The parameters S_cap = 85, ρ = 0.30 and τ = 8 are evidence-informed defaults calibrated in pilots, sourced from Workbook Spec Part 9 into the engine's constants module. The result carries the top-six ranking (rank, component, sub-dimension, raw score, realistic P gain, Priority); the binding-constraint statement leads with the top-ranked sub-dimension and reports the binding component, the lowest of C, M and O, alongside as the weakest force. The displayed realistic P gain is the honest P-points number; ordering is by Priority, so a high-leverage strength can show a larger gain yet rank lower. Synergy is a coefficient and never a candidate. The result also carries the trip-wire override note: any fired trip-wire takes reporting priority regardless of P. Aligned to the realistic-P-gain method on 11 June 2026 (Workbook Spec Part 10, Strategy 4.2/4.3, Measurement Reference 9.4, DECISIONS 1.2), so the document set and the workbook agree. (Diagnostic Workbook, Composite Scoring tab; Workbook Spec Parts 9 and 10 as revised.)

**Trip-wire overlay outside P.** Each trip-wire scores `(mean - 1) × 25`; below 60 is a critical finding. Trip-wires never enter M or P; they are returned as an independent overlay that the dashboard must surface prominently wherever a unit's results appear. (Strategy 3.3.1; Measurement Reference 8.4; Survey Blueprint 3.5.)

**DLP.** v1 reports raw measured results per decision class: decision count, median and observed 75th and 90th percentile latency, open-at-sampling count and bottleneck patterns, labelled in every surface as not yet benchmarked against a normative set. No per-decision scores and no DLS are computed, and nothing is interpolated or invented in place of the missing 25th and 75th norm anchors. Minimum samples 10/5/3 per class and the below-15 total-sample warning still apply to the raw reporting. DLP is reported alongside O and never feeds P, so this defers cleanly. The percentile-banded DLS (per Measurement Reference Part 6: 100 at or below the 25th percentile, linear bands to the 90th, class weighting 0.40/0.35/0.25) is a scoped enhancement that activates once Michael supplies the normative reference set. (Measurement Reference Part 6; Workbook Spec Part 8.)

**Gap and pattern flags.** M1 survey-behavioural gap above 15 points fires a flag with both values reported (the behavioural composite never averages into M1). False consensus fires when TSI3-01 and TSI3-02 score below 60 and M2 exceeds 75. (Measurement Reference 8.2 and 8.3.)

**S1 analytical scoring.** Coverage breadth, depth (target depth = ceiling(FTE / 10), minimum 2) and distribution (100 minus the Gini coefficient of skill counts × 100), composed 0.40/0.35/0.25. (Measurement Reference 5.1.)

**Carry-forward and confidence.** Sub-dimensions not refreshed in the current cycle carry forward at their last measured value with the measurement date, not the recalculation date, driving the confidence band (per-sub-dimension high/medium/low thresholds from the Cadence Master). P inherits the lowest contributing band, and the methodology output lists every carried-forward sub-dimension. A quarterly pulse cycle calls a separate `assemblePulseView` function that updates pulse indicators, trip-wires, operational DLS and trajectories but performs no P recalculation. (Cadence Master Part 7; Measurement Reference 8.6 and 9.5.)

### 5.3 Test strategy

Three layers, all in the engine package and run in CI on every commit.

**Worked-example fixtures.** Every worked example in Measurement Reference Parts 1 and 2 becomes a named fixture asserting the stated result to its stated precision: C1 = 76.1, C2 = 69.5, C3 = 60.9 (60.85 unrounded), C4 = 73.7 with team Zeta excluded, C5 = 96.7, M1 = 72 with behavioural composite 66 and no flag, M2 = 75, M3 = 75, M4 = 71, O1 = 61.2 (and the contrasting 78/56 case firing the gap flag, with the perception score 56 feeding the composite per the corrected gap rule), O2 = 69.3, O3 = 55.0, O4 = 47.5, O5 = 71.0, S1 = 89.9, S2 = 54.4 with the gap noted, S3 = 66.0, the DLP raw class summaries for the Part 6 decision sample (the DLS = 60.1 banding example is retained as a skipped fixture until the normative set arrives), the weight-reallocation example (0.4375/0.1875/0.25/0.125), and the Part 9.4 synthesis: C 72, M 70, O 62, S_internal 56 giving S = 1.018 and P = 69.7, with the binding-constraint assertion following the realistic-P-gain ranking the Measurement Reference 9.4 narrative now carries: top six by Priority O1 (0.41), M4 (0.32), O3 (0.30), M1 (0.29), O2 (0.25), C3 (0.21), leading with O1 Clarity and decision rights (score 61.2 against a unit mean of 67.8), with M1 showing the largest realistic P gain (ΔP ≈ 0.77) yet ranking fourth because it sits above the unit's own average, and the engine required to match the workbook's ranking exactly. The Survey Blueprint's conversion endpoints (mean 1 maps to 0, mean 5 maps to 100) and the Workbook Spec's trip-wire and false-consensus conditions get explicit cases.

**Property and invariant tests.** Scores stay in 0 to 100; S stays in 0.85 to 1.15; reallocated weights always sum to 1; the binding constraint is never S; trip-wires never alter P; blank items never alter a mean; reverse-scoring is applied only to the mapped items; carry-forward never changes a value, only its confidence; `projectImpact` with an unchanged score returns the baseline exactly.

**Numerical parity harness.** The Diagnostic Workbook at `Production Docs/PerformanceVP-Diagnostic-Workbook.xlsx` is confirmed current (it has implemented the perception-only gap rule and the (mean − 1) × 25 conversion since 28 May 2026; the 10 June 2026 document corrections aligned the text to the workbook, not the reverse) and is the validated parity benchmark from Milestone 1. Implementation reads the workbook's actual cell formulas and reproduces them, including intermediate rounding, so any residual divergence is rounding-driven rather than logic-driven. A versioned fixture format (JSON: one complete `UnitMeasurementInput` and the expected full result set) defines the contract: each fixture's inputs are entered into the workbook and the recorded outputs become the expected values. CI asserts parity at every computed output, each sub-dimension score and C, M, O, S_internal, S and P, not just final P, with 0.05 as the ceiling on final P, and requires exact match on the discrete outputs: the binding-constraint ranking (top six, in workbook order), the trip-wire flags, and whether each gap rule fired. Any divergence is a release blocker for the engine.

---

## 6. Analyst Data Upload

The analyst workspace mirrors the workbook's left-to-right flow per cycle per unit: engagement metadata (drawn from the unit record), tier assignment, then input sections for C, M, O, S, DLP, behavioural triangulators, then results.

**Tier assignment first.** The analyst sets each sub-dimension's tier, source and vintage. As in the workbook, this drives which input route is active in each section; inactive routes are visible but disabled, so the analyst always sees what the alternative route would have asked for.

**Entry by input type.** Type A sections present item-mean grids (1.00 to 5.00, two decimals, blanks allowed for items not in the cadence) plus response-rate fields; where the cycle is linked to a portal survey campaign, these grids arrive pre-filled from `survey_unit_aggregates` and the analyst reviews rather than retypes. For C4, team-level entry is the default (one column per team, FTE-weighted to the unit score, matching the CII's team-level validity rules), with unit-level means as the fallback where team structure is not captured. Type B sections present structured forms: C1 role-family rows (FTE, framework skills, adjusted confirmed proficiencies, optional median tenure), C2 domain rows (criticality 1 to 3, mean score, coverage), C3 band counts, C5 indicators. Each field that expects an analyst-adjusted value is labelled as such, with a required methodology note recording the adjustment applied, mirroring the Workbook Spec's tagging convention. Type C sections take a finished 0 to 100 score, the module or platform identifier, and the computation note. The DLP section is the decision sample log. The behavioural triangulator section takes the monthly metrics plus, for v1, the analyst-computed M1 behavioural composite entered as a finished score; the lookup-table automation is a deferred enhancement (Section 13), and the M1 gap rule runs on the entered composite unchanged. Validation matches the tier and module rules: ranges, caps (the C1 coverage cap, the C3 exceptional-band warning when above 15 percent on Tier 2), required-coverage rules (C2's criticality-3 domain at 60 percent coverage), DLP minimum samples, and the headcount reconciliation warning when responses exceed expected headcount. Warnings warn; only structural errors block.

**Versioning and audit.** Saving an input writes a new immutable `analyst_inputs` version superseding the prior one; the prior version remains readable in a history view. Every save is audit-logged with actor and before-and-after state.

**Explicit recalculation.** Scores never recompute on save. The analyst presses "Run calculation", which snapshots the current input versions, computes `inputs_hash`, executes the engine server-side, and stores the complete result set as a new `calculation_run` in one transaction with an audit entry. The run view shows results with the methodology footer (tier mix, exclusions, reallocations, gap flags, confidence, carry-forward list) and the range checks from the Workbook Spec (S within 0.85 to 1.15, P typically 45 to 80) as warnings. Publishing the cycle is a second explicit, audited step; only then do client users see anything. Recalculating after publish creates a new run and requires republish, leaving the old run intact.

---

## 7. Survey System

**Campaign building.** The analyst picks an organisation, the in-scope units, and the cadence (baseline, quarterly pulse with quarter index, half-yearly, annual). The portal assembles the instrument from `ref_survey_items` and `ref_pulse_rotation`: the correct item subset for the cadence, the Part 6 assembly order and the three respondent-facing section headings, with reverse-scored items interleaved as the blueprint specifies. The analyst previews the exact respondent experience, sets the window (defaults from the blueprint: two weeks for baseline and annual, one for half-yearly, five days for pulse), and uploads recipient emails per unit; where a client will not supply email lists, the campaign switches to the per-department shared-link fallback (Section 3.5) and the analyst confirms expected headcount per unit instead. Campaigns link each unit to its measurement cycle.

**Invitations.** Sending generates single-use tokens (hashed at rest) and dispatches invitations through Resend from `surveys@performancevp.com.au`, with the message body stating that the survey is run by PerformanceVP on behalf of the named client. Reminders follow the blueprint's day pattern to non-completers, computed from invitation status without ever touching response content. Recipient emails are PII and are minimised: visible only to assigned analysts, held only for the life of the campaign plus its reminder window, then purged (or irreversibly hashed where a bounce-investigation record is needed) within 30 days of campaign close, leaving only de-identified aggregated responses. The retention period is stated in the PerformanceVP Privacy Notice consistent with APP 11.2, and the purge runs as an automated scheduled job, not a manual task.

**Respondent experience.** The tokenised link opens a clean, unauthenticated survey: section headings, items in groups of three to five per screen, the 5-point Likert scale, save-free single submission. Submission validates the token server-side, writes the response and item responses, marks the token used, and sets a device-level completion flag. No respondent identity is stored with the response.

**Validity and aggregation.** At window close (or on demand), a server job applies the Survey Blueprint 7.8 exclusion rules per response: reverse-item directional agreement, completion time below the cohort's 5th percentile, and literal patterning. Exclusions are flagged on the response row with reasons and surface as a percentage in the methodology footer. The job then writes `survey_unit_aggregates`: per unit per item, the count of valid responses and the raw un-flipped mean, exactly what the workbook's Type A cells expect. Threshold evaluation (Cadence Master 7.4 and the anonymity floor) happens here, marking units or teams insufficient and applying the pulse roll-up to parent units.

**Becoming engine inputs.** Aggregates flow into the linked cycle as pre-filled Type A inputs for analyst review and confirmation. The analyst remains the gate: nothing scores without an explicit calculation run.

---

## 8. Dashboards

**Drill-down.** Organisation view, then unit, then force, then sub-dimension. The organisation view shows the current P per unit and an FTE-weighted average of unit P scores, always labelled as an average and never presented as a computed organisational P, since no organisational P exists in the model. Alongside the average it shows the spread: at minimum the range and the lowest-scoring unit, with the weakest unit surfaced prominently in keeping with the weakest-link logic. It also shows trip-wire status across units and flags where a unit's binding constraint differs from the most common one. The unit view leads with P and its trend across refresh points, the C/M/O scores with trends, the S coefficient, the binding constraint visually emphasised (the top-ranked sub-dimension from the realistic-P-gain priority ranking, with the top-six ranking one step away so the statement is always traceable), and the trip-wire panel. The force view breaks a component into its sub-dimensions with weights, scores, trends and contribution; the Capability view includes the three CII sub-constructs; the Opportunity view includes the DLP block, which in v1 shows the raw measured latencies by decision class, labelled as not yet benchmarked against a normative set (Section 5.2). The sub-dimension view shows score history, tier and source, confidence and last-refreshed date, gap flags with both layer values and the gap magnitude displayed prominently where fired (since the perception score alone feeds the composite in that case, the size of the divergence is itself the finding), and any interventions targeting it.

**Fixed display rules** (from Strategy 4.5 and 4.6, and CLAUDE.md): one headline number per view; green above 75, amber 50 to 75, red below 50; trend always visible; scores to the nearest integer; movement under two points never flagged as significant; confidence band and last-refreshed shown beside every score; forces distinguished by position, label and shape, never colour. Trip-wires are never folded into P: every view that shows a unit's results carries the trip-wire element, and a breach renders as a prominent critical finding with the relevant action path named. Suppressed scores render as an explicit suppression notice, never as zero or blank.

**Cadence honesty.** Published half-yearly and annual cycles move the headline P. A published pulse cycle updates the trajectory layer only: pulse indicators with up/down/flat against the prior pulse, trip-wire status, operational DLS, behavioural triangulators, and the carried-forward P with its confidence annotation ("Includes carry-forward measurements; refresh due for ..."). Cross-cycle trends plot P and components across refresh points and let the user step into any prior published cycle.

**Confinement.** Every dashboard query runs under the viewer's RLS context. Client admins see their whole organisation; client viewers see only their nominated units and descendants; analysts see assigned organisations. The methodology footer renders on every results view from the run's stored methodology blob.

---

## 9. Intervention Design Module

**Creation from a finding.** From any sub-dimension view, gap flag, trip-wire breach or the binding constraint, the analyst creates an intervention pre-linked to the unit, the source cycle and the finding. The module suggests matching patterns from `ref_intervention_patterns` (the Library's by-sub-dimension and by-finding indexes); the analyst may pick a pattern and variant, combine patterns, or design from first principles with the pattern field left null and the adaptation documented.

**Design fields.** Root cause (validated, not assumed), designed solution, chosen variant, P-impact estimate, measurement plan, and the client's implementation plan. Field labels and helper copy enforce the domain rules: the implementation plan is captioned as owned and executed by the client; indicative effect ranges from the Library render with the fixed label "evidence-informed estimate", never as predictions; no copy anywhere says or implies "proven to deliver".

**P-impact recomputation.** The estimate is computed, not typed: the analyst selects the target sub-dimension and an assumed improved score (the pattern's indicative range shown alongside as context), and the module calls the engine's `projectImpact` against the unit's latest published run, using the unit's actual data, weights and archetype. It stores and displays the projected sub-dimension, component and P movement, whether the binding constraint would shift, and the baseline run and engine version it was computed from. If the target sits outside the binding component, the display says plainly that P movement will be modest for that reason.

**Versioning, status, measured effect.** Every edit writes a new immutable `intervention_versions` row; the diff between versions is viewable and audited. Status follows the lifecycle draft, designed, presented, client implementing, measuring, closed; the transition into "client implementing" is recorded as a client decision. Measured effect is captured only from later published cycles: the module shows expected versus actual movement of the target sub-dimension across subsequent cycles and stores it in `intervention_effects`. The module never collects its own measurements; post-intervention measurement lives in the Tracking Subscription or a re-run Diagnostic, and the UI says so where an analyst might otherwise reach for it.

**Boundary enforcement.** The design-versus-implementation boundary is commercial IP: PerformanceVP designs and measures; the client implements. The module has no implementation task tracking, no implementation status owned by PerformanceVP, and no language presenting PerformanceVP as executing the plan.

---

## 10. Phased Delivery Roadmap

Dependency-ordered. The engine, the security model and the tenancy model come first because everything else builds on them and mistakes there are the expensive ones.

**Milestone 0: Foundations.** New portal repository, Next.js app scaffold, TypeScript strict, Tailwind with brand tokens, Supabase CLI and local stack, CI (lint, typecheck, tests), staging deploy to Vercel under a temporary `*.vercel.app` URL. No DNS work yet.

**Milestone 1: The engine.** `packages/engine` complete with constants sourced and annotated, all rules in Section 5.2 implemented from the workbook's actual cell formulas, the full worked-example fixture suite passing, property tests, and the parity suite populated from the Diagnostic Workbook. No database involvement. Exit: every Measurement Reference worked example reproduces to stated precision, and the parity suite passes at every computed output with exact matches on the discrete outputs (binding-constraint ranking, trip-wire flags, gap-rule firings).

**Milestone 2: Tenancy, identity and security core.** Schema migrations for Sections 2.1, 2.5 and the reference tables; all helper functions; RLS policies for every table; auth flows (login, invitation provisioning, middleware gating); audit triggers; the RLS test harness (Section 12) green. Exit: deny-by-default proven by tests, two seeded organisations demonstrably isolated, roles behave per the matrix.

**Milestone 3: The vertical slice.** The smallest end-to-end path proving the architecture: one organisation, one unit, one baseline cycle; analyst sets tier assignments and enters inputs across all three input types manually; runs the engine; publishes; a client admin logs in and sees the unit dashboard with P, components, binding constraint, trip-wire panel and methodology footer, confined by RLS. This slice exercises auth, tenancy, upload, engine, publish and dashboard in one thread and is the first thing Michael can click through end to end.

**Milestone 4: Full measurement workflow.** All sub-dimension input forms and validations, DLP log, triangulators, file uploads, carry-forward from prior cycles, confidence decay, pulse cycles with the trajectory layer, cycle lifecycle and republish flow, full methodology footer.

**Milestone 5: Survey system.** Reference item bank seeded, campaign builder with cadence assembly and rotation, Resend invitations and reminders, public respondent flow, validity engine, aggregation into Type A inputs, thresholds and roll-up.

**Milestone 6: Dashboards complete.** Full drill-down, trends across cycles, gap-flag visualisations, DLP view, organisation overview, suppression rendering, display-rule audit against Strategy 4.6.

**Milestone 7: Intervention module.** Pattern library seeded, creation from findings, design fields with boundary copy, `projectImpact` integration, versioning, status lifecycle, measured-effect tracking.

**Milestone 8: Hardening and go-live.** Security review against Section 3 (including an external pass if budget allows), performance and accessibility checks, backup and restore rehearsal on staging, observability (error tracking, audit review view), an organisation offboarding path that exports then purges client data within the contractual 30-day post-engagement window, copy review against the voice conventions, production Supabase and Vercel setup, DNS cutover (Section 11), pilot client onboarding.

Milestones 5, 6 and 7 are independent of each other once Milestone 4 lands and can reorder on commercial priority.

---

## 11. Infrastructure and Environment

These are items for Michael to perform or approve. None will be executed as part of the build without sign-off, and no DNS, environment or deployment change happens implicitly.

1. **Portal subdomain confirmed**: `app.performancevp.com.au`. No further decision needed; the DNS step below uses the `app` label.
2. **Create the portal Git repository** (same host as the marketing site repo) and connect it to a new Vercel project. Approve the Vercel team/plan if the portal needs team features.
3. **Create two Supabase projects** (staging, production) in the Sydney region (`ap-southeast-2`). Enable daily backups on production and record the database passwords in your password manager.
4. **Provide environment variables to Vercel** (staging and production separately): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `RESEND_API_KEY`, `APP_BASE_URL`, plus a `SURVEY_TOKEN_SECRET` for token hashing. I will supply the exact list and which are server-only at Milestone 0.
5. **Configure Supabase Auth**: site URL and redirect URLs for the portal domain and the Vercel preview domain; custom SMTP pointed at Resend so auth emails use the existing pipeline; disable public sign-ups.
6. **Resend sending identity**: `surveys@performancevp.com.au`, with invitation bodies stating the survey is run on behalf of the named client. Before any survey depends on it: confirm the domain is verified in Resend and run one live test send to an external mailbox, checking delivery and SPF/DKIM alignment. No new email provider.
7. **VentraIP DNS change (at cutover, not before)**: add one CNAME record, `app` (or the confirmed label) pointing to the Vercel-provided target. Change nothing else. Explicitly: all existing MX records and all TXT records (SPF, DKIM, DMARC, Google site verification) on the apex and on `www` must be left untouched. The change is additive only; I will provide the exact record values from Vercel for you to enter.
8. **Approve the marketing-site change**: a "Client login" link in `performancevp-site` navigation pointing to the portal login. I will prepare it as a reviewable change; you approve and deploy it.
9. **Privacy and legal items**: the Privacy Notice needs no change, since it already defers retention to the period set out in the relevant client engagement. When you create client engagement contracts, set engagement-data retention at 30 days post cessation of the engagement, as decided; the portal's offboarding path is designed to honour that window. The operational handling of survey contact data (purge within 30 days of campaign close, de-identified aggregates retained as product, consistent with APP 11.2) stands as designed. Still to schedule: the respondent-facing anonymity statement wording, and the internal comparison set consent and ownership review (already flagged in Strategy 5.3, not needed for v1).
10. **Inputs you own, none blocking v1**: parity fixture outputs from the Diagnostic Workbook during Milestone 1 (the workbook is confirmed current and is the validated benchmark); and, as deferred enhancements on your timetable, the rebalanced archetype weight sets, the DLP normative reference set, and the M1 behavioural lookup tables (Section 13.3).

---

## 12. Testing and Quality Strategy

**Engine.** As Section 5.3: worked-example fixtures for every Measurement Reference example, property and invariant tests, and the staged numerical-parity harness against the workbook. The engine package gates merges: a red engine suite blocks everything.

**RLS and security.** A dedicated SQL test suite (pgTAP or equivalent, run in CI against a migrated local Supabase) that creates users in every role across two seeded organisations and asserts the full access matrix in Section 3.3 per table: anonymous denied everywhere, cross-organisation reads denied for every role including analysts without assignment, client write paths denied on results, draft cycles invisible to clients, raw survey responses unreadable by every client-side role, and audit logs immune to update and delete. Every new table or policy lands with matching matrix tests; a table without RLS tests fails CI by convention. The survey token path gets focused tests: token reuse rejected, expired window rejected, no response-to-invitation linkage queryable.

**Application.** Playwright end-to-end tests for the load-bearing flows: login and role landing; client viewer confined to nominated units; analyst input, calculate, publish, and the client seeing exactly the published run; survey submit and aggregate; suppression rendering below threshold; intervention creation with P-impact recomputation. Component tests for the input forms' validation rules and the dashboard display rules (colour bands, integer rounding, trip-wire prominence). A copy lint pass enforces the voice conventions in UI strings: no em dashes, no prohibited claims ("proven to deliver"), effect ranges always labelled as evidence-informed estimates.

**Data and operations.** Migration tests (fresh database builds from migrations alone), a seeded demo organisation for staging, backup restore rehearsed once before go-live, and error tracking in production from day one.

---

## 13. Open Decisions and Risks

### 13.1 Decisions resolved on 10 June 2026

These were open in earlier versions of this plan and are now settled, across two rounds of decisions on the same day. They are recorded here so the plan is self-contained; the body sections already reflect them.

- `CALCULATION_TRUTH` (governing principle): the Production Docs Diagnostic Workbook is the single source of calculation truth. The engine reproduces its logic formula for formula, including intermediate rounding, read from the workbook's actual cells. Any engine-versus-workbook divergence is an engine defect, never a portal design choice. The workbook is confirmed current: it has implemented the perception-only gap rule and the (mean − 1) × 25 conversion since 28 May 2026, and the 10 June document corrections aligned the text to it.
- `BINDING_CONSTRAINT_METHOD`: resolved, revised 11 June 2026, superseding the contribution-ranking resolution of 10 June. The binding constraint is identified by the realistic-P-gain ranking across the fourteen C, M and O sub-dimensions with Synergy excluded: a realistic improvement bounded by diminishing returns, `Δs = ρ × MAX(0, S_cap − score)`; the resulting realistic P gain with leverage preserved, `ΔP = P × ((1 + w_norm × Δs / compScore)^exponent − 1)`; and a relative-weakness factor against the unit's own mean of the fourteen scores, `rel = 1 / (1 + EXP((score − unitMean) / τ))`. Candidates rank by Priority = ΔP × rel, descending, with the workbook's row-fraction tiebreak, presented as a top-six table; the statement leads with the top-ranked sub-dimension and reports the binding component (lowest of C, M, O) alongside as the weakest force. Parameters S_cap = 85, ρ = 0.30 and τ = 8 are evidence-informed defaults calibrated in pilots (Workbook Spec Parts 9 and 10; DECISIONS 1.2). The 9.4 worked example now leads with O1 Clarity and decision rights, not M1. M1 still carries the largest raw realistic P gain but ranks lower because it sits above the unit's own average; the relative-weakness term is what demotes it. The earlier M1 result (ΔP ≈ 5.3) was produced by the superseded lift-to-ceiling method.
- `PARITY_TOLERANCE` and regime: resolved. Parity is tested at every computed output (each sub-dimension score, C, M, O, S_internal, S, P), 0.05 is the ceiling on final P, and the discrete outputs (binding-constraint ranking, trip-wire flags, gap-rule firings) must match exactly.
- `SUPER_ADMIN_MODEL`: resolved. A distinct Owner role exists in the schema from day one, held by one account, least-privilege: system administration without automatic read access to client survey responses or results, client-data access per assignment as for analysts, with an audited break-glass self-grant path (Section 3.4a). No broader hierarchy in v1. Assessment returned as requested: standing owner visibility is not needed; per-assignment access plus break-glass covers the real cases, and raw responses stay server-side-only for every role regardless.
- Ratifications: the extension of the (mean − 1) correction into Measurement Reference Part 2's perception and Synergy formula lines is approved; the decision not to silently normalise the archetype tables is approved.

- `GAP_COMPOSITE_RULE`: resolved. Where an O1/O2/O3 audit-perception gap exceeds 15 points, the perception score is the value that feeds the O composite; the gap is reported separately as a finding and its magnitude surfaces prominently in the dashboard. Measurement Reference Part 2 (sections 4.1 to 4.3, 4.6 and 8.1, plus the contrasting worked example) was corrected at source on 10 June 2026, in both the root master copy and the `docs/source-ip` snapshot, so the set now matches Workbook Spec 6.6.
- `CONVERSION_TEXT_CORRECTIONS`: resolved. `(mean - 1) × 25` everywhere. The formula shorthand lines missing the minus one were corrected at source on 10 June 2026 in Measurement Reference Part 1 (CII sub-constructs, M1 to M4, trip-wires) and, for the same defect, in Part 2 (O1 to O5 perception, S2, S3), in both copies.
- `ANONYMITY_FLOOR_N`: resolved. Baseline display floor N = 5, raised to N = 8 for psychological safety (M2) and for the pay-equity and fairness trip-wires. A unit-level survey-derived score displays only when the valid respondent count is at least the higher of the anonymity floor and the Cadence Master scoring-validity threshold for that construct: always the maximum, never the minimum. The Cadence Master validity numbers are re-read from source when the constants module is written.
- `SURVEY_DELIVERY_MODEL`: resolved. Tokenised-unlinkable per-respondent invitations are the default; a per-department shared link is a configurable per-campaign fallback with its trade-offs (no tracking, no reminders, no one-response guarantee) documented in the analyst UI and methodology footer.
- `PORTAL_SUBDOMAIN`: confirmed as `app.performancevp.com.au`.
- `ENV_TOPOLOGY`: confirmed as staging plus production Supabase projects plus a local CLI stack; migrations and RLS changes are tested against staging, never production.
- `ANALYST_MFA`: confirmed mandatory for analysts with no exception; offered and encouraged for client admins.
- `MAIL_FROM_IDENTITY`: confirmed as `surveys@performancevp.com.au`, with bodies stating the survey is run on behalf of the named client, and a verified-domain check plus live test send before surveys depend on it (Section 11, item 6).
- `PII_RETENTION`: confirmed as minimise. Contact data is held for the life of the campaign plus its reminder window, then purged or hashed within 30 days of close, retaining only de-identified aggregates, with the period stated in the Privacy Notice consistent with APP 11.2. The 30-day figure is this plan's concrete rendering of that decision; adjust it in the Privacy Notice update if a different figure is preferred.
- `C4_TEAM_ENTRY`: confirmed team-level entry as the default, unit-level as fallback.
- `REPO_LAYOUT`: confirmed. A dedicated portal repository, separate from the marketing site, containing the application, the calculation engine as its own internal package, the Supabase migrations, and the `docs/source-ip` snapshot.
- `ORG_AGGREGATION_METHOD`: confirmed. There is no organisational P in the model. The organisation view shows an FTE-weighted average of unit P scores, labelled as an average, alongside the spread (at least the range and the lowest-scoring unit) with the weakest unit surfaced prominently.

### 13.2 Genuinely open items

Nothing is genuinely open. Every decision needed to build v1 is resolved; the items in 13.3 are deferred enhancements with owners, not blockers. The two items previously listed here are closed:

- `BINDING_CONSTRAINT_DOC_ALIGNMENT`: executed, completed 11 June 2026. Workbook Spec Part 10 (method) and Part 9 (parameters), Strategy 4.2 and 4.3, and the Measurement Reference 9.4 narrative were aligned to the realistic-P-gain method (DECISIONS 1.2), in both copies, with each document's header noting the change.
- `PRIVACY_NOTICE_RETENTION`: resolved without a notice change. The Privacy Notice already states that engagement data is retained for the period set out in the relevant client engagement. Michael will create client engagement contracts when ready, specifying retention of 30 days post cessation of the engagement; the portal's organisation offboarding path must honour that window (export, then purge), covered in Milestone 8. The operational purge of identifying survey contact data within 30 days of campaign close stands separately as already designed.

### 13.3 Deferred enhancements, with owners

Each is scoped out of v1 by decision, blocks nothing, and has a named owner for the input that unlocks it.

- `ARCHETYPE_WEIGHT_MATRIX` (owner: Michael, rebalance at source). v1 ships on the Default archetype, which is valid; the engine reads weights from a table keyed by archetype with the other five sets present but disabled. For the rebalance, the assembled sums by component: Capability: Knowledge-intensive 120, Operations-heavy 80, Customer-facing 105, Public sector 95, Healthcare 115. Motivation: Knowledge-intensive 105, Operations-heavy 90, Customer-facing 105, Public sector 110, Healthcare 125. Opportunity: Knowledge-intensive 100, Operations-heavy 110, Customer-facing 115, Public sector 100, Healthcare 115. Synergy: Knowledge-intensive 115, Operations-heavy 85, Customer-facing 100, Public sector 95, Healthcare 100. (All Default sets are 100; Knowledge-intensive and Public sector O and Customer-facing and Healthcare S are already valid.) Silent normalisation was considered and rejected, with approval, because it would replace the clean 0.05-increment defaults with derived decimals. Enabling an archetype is a seeded migration once its set sums to 100.
- `DLP_NORM_TABLES` (owner: Michael, normative reference set). v1 reports raw measured DLP results by decision class, labelled as not yet benchmarked; no anchors are invented or interpolated. Percentile banding and the DLS activate as an enhancement when the reference set exists; the schema (`ref_dlp_norms`, the DLS columns) is already shaped for it.
- `M1_BEHAVIOURAL_LOOKUPS` (owner: Michael, lookup tables). v1 behaviour is the analyst-computed behavioural composite entered as a finished score, with the M1 gap rule running on it unchanged. Automating the metric-to-score conversion is an enhancement once the tables are finalised.

### 13.4 Risks worth naming

The deferred items degrade by design rather than by accident: Default-only archetype scoring, raw-only DLP reporting and analyst-entered behavioural composites are accepted v1 scope, each labelled honestly in the UI rather than approximated. The anonymity design trades duplicate-submission enforcement for unlinkability, exactly as the Blueprint reasons; the mitigations (single-use token gating, device flag, validity rules, headcount reconciliation) are implemented, and the shared-link fallback weakens them further in the ways its documented trade-offs state. The internal comparison set remains deliberately out of scope for v1 pending the legal review the Strategy already requires; the schema's sector metadata leaves the door open without building on unreviewed ground.
