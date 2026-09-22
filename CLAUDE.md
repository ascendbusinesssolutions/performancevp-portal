# CLAUDE.md — PerformanceVP Client Portal

This file gives Claude Code the context and operating instructions for building the **PerformanceVP online subscription portal**, the self-service software product that is PerformanceVP's third commercial offering. Read this in full before doing anything. Then read `PORTAL_BUILD_PLAN.md` (the approved plan of 21 September 2026), `docs/ENGINE_SPEC.md`, the two online specifications and the source IP documents in `docs/source-ip/`.

**Revised 21 September 2026.** The earlier version of this file described an analyst-operated portal with read-only clients. That product is not being built. The reasons are recorded in `DECISIONS.md` Section 5. Amended 22 September 2026: no online payment, and organisations are provisioned by PerformanceVP (`DECISIONS.md` 5.5).

---

## 1. What we are building

A multi-tenant B2B web application through which a client organisation measures its own business units with the Performance Equation, without a PerformanceVP analyst in the loop.

PerformanceVP runs two product lines on one equation. The consultancy line (the Diagnostic and Intervention Design) is consultant-led, reports through document packs and does not use this portal. The online subscription is this product. It has three groups of users:

- **Client administrators** (the account owner and administrators) set up the organisation, maintain the employee directory, configure unit context, run campaigns, review and release results, and can see the ratings managers enter.
- **Client viewers** (executive and unit viewers) read released results, drilling from organisation, to business unit, to the four forces (Capability, Motivation, Opportunity, Synergy), down to individual sub-dimension scores per unit. They see the binding constraint, the full priority ranking, trip-wire flags, suggestions and trends across measurement cycles. They never see ratings and never see another organisation's data.
- **Respondents.** Unit members, team leaders and leadership-team members answer anonymous tokenised surveys and are not portal users. Managers sign in with a one-time email code to rate their own direct reports; those ratings are identified and retained.

Organisations are provisioned by PerformanceVP (the Owner or support staff) on signature of an agreement; they do not self-register, and there is no online payment. Designated PerformanceVP support staff can access a client's account to assist, where the client has left support access on. Every such access is logged and visible to the client. There is no analyst workspace, no manual score entry and no analyst publish gate: scoring runs automatically when a campaign closes, and a client administrator reviews and releases the results.

## 2. How this relates to the wider Performance Equation IP

The Performance Equation is an established body of intellectual property. The portal **implements** that IP; it does not redefine it. The canonical source documents are copied into `docs/source-ip/`. Treat them as read-only authority. If the portal and a source document disagree, the source document wins, and the discrepancy is flagged to Michael rather than resolved unilaterally.

The source documents you must read before planning the engine and dashboards:

- `Performance_Equation_Strategy.md` — master commercial IP; equation, weights, offerings, report and dashboard design intent.
- `Performance_Equation_Sub_Dimension_Cadence_Master.md` — the single source of truth for the four forces, their sub-dimensions, weights, tier sources, refresh cadence, and item counts. **Take every sub-dimension count and weight from here. Do not infer or hardcode them from this file.**
- `Performance_Equation_Measurement_Reference_Part1.md` — C and M scoring, conversion rules, acceptance criteria, worked examples.
- `Performance_Equation_Measurement_Reference_Part2.md` — O, S, DLP, sector metadata, triangulation and gap rules, the composite P calculation.
- `Performance_Equation_Diagnostic_Workbook_Spec.md` — the Excel scoring-engine specification. **The portal calculation engine must mirror this exactly.**
- `Performance_Equation_Survey_Blueprint.md` — item-level source of truth for the Diagnostic Survey (the basis for the portal survey builder).
- `Performance_Equation_Intervention_Design_Library.md` — the catalogue of intervention design patterns (basis for the intervention module's templates and effect ranges; online, the basis for the suggestion cards).
- `Performance_Equation_Online_Measurement_Specification.md`: how each of the 17 sub-dimensions is measured and scored online with no analyst present, the new online instruments, and the directory, storage and labelling rules. **The authority for every online-specific measurement rule.**
- `Performance_Equation_Online_Recommendations_Specification.md`: how results are ranked and presented, how a pattern is chosen for a suggestion, what a suggestion contains, and the what-if and action-tracking rules.
- `Performance_Equation_Tier3_Module_Library.md`: wording and scoring of the audience modules the campaign engine deploys.
- `Performance_Equation_Survey_Processing_Workbook_Spec.md`: the scoring of module responses into engine inputs. **The intake package must mirror this.**

If any of these files are missing from `docs/source-ip/`, stop and ask Michael to supply them rather than working from assumption.

## 3. Tech stack and architecture

- **Frontend and server.** Next.js (App Router), TypeScript, deployed on Vercel. The existing marketing site is a separate Next.js app on Vercel at `www.performancevp.com.au`; the portal is its own app, running on the confirmed subdomain `app.performancevp.com.au`. "Log in via the PerformanceVP site" is satisfied by a login entry point on the marketing site that routes to the portal subdomain.
- **Database, auth, storage.** Supabase (Postgres, Supabase Auth, Row Level Security, Storage for uploaded files).
- **Styling.** Tailwind CSS with the brand tokens in section 8. Read `/mnt/skills/public/frontend-design/SKILL.md` conventions if available in the environment.
- **Email.** Survey invitations and notifications go through Resend, consistent with the existing PerformanceVP email pipeline. Do not stand up a second email provider.
- **Billing.** None in the portal. Subscriptions are sales-led and invoiced from the accounting system; the portal holds the subscription record and enforces the grace, suspension and retention rules. No payment provider is introduced.
- **Spreadsheets.** The employee directory template is generated and parsed server-side as `.xlsx`. Uploaded files are size-limited, stored privately with a hash, and never executed or rendered.
- **DNS.** Managed at VentraIP. Adding the portal subdomain is a CNAME to Vercel. Existing MX and all TXT records (DKIM, SPF, DMARC, Google verification) on the apex and `www` must be left untouched. Treat any DNS change as a planning item, not an action to take.

## 4. Tenancy, roles, and security model

Client data is sensitive. It includes anonymous employee survey responses, a persistent employee directory and identified manager ratings of named employees. Security is not a later phase; it is a precondition of every table and every query.

- **Tenant boundary is the organisation.** Every client-owned row carries an `organisation_id`. Row Level Security is enabled on every table with no exceptions. The default posture is deny; access is granted by explicit policy. Plan and document the policies before writing the schema.
- **Business units** belong to an organisation and may form a hierarchy. Scores are held per unit per measurement cycle.
- **Roles.** Owner (one PerformanceVP account, least privilege, audited break-glass). Support staff (designated PerformanceVP accounts, with access only where the organisation's support access is on, every access logged and visible to the client). Account owner, Administrator, Executive viewer and Unit viewer on the client side. Manager respondent (signs in with a one-time email code to rate their own direct reports). Members, team leaders and leadership-team respondents are not portal users. The full matrix is in `PORTAL_BUILD_PLAN.md` Section 3.
- **Multi-factor authentication** is mandatory for the Owner, support staff, account owners and administrators, because those roles can see identified ratings.
- **Survey anonymity.** Employee survey responses are anonymous, structurally unlinkable to a person, and reported only in aggregate. A unit-level survey-derived score displays only when valid respondents reach the higher of the anonymity floor (5; 8 for psychological safety and for the pay-equity and fairness trip-wires) and the Cadence Master validity threshold. Suppression is enforced in the database, not the UI. No role, including support staff and the Owner, can read raw survey responses client-side. This protects respondents and protects the integrity of the psychological-safety construct being measured.
- **Identified ratings.** Manager ratings of named direct reports (skills, knowledge, talent bands), their evidence notes and uploaded formal performance ratings are identified and retained for traceability. They are readable only by the rating manager (own rows), administrators, the account owner and enabled support staff, never by executive or unit viewers. Every administrator or support view or export is audit-logged. When a directory record is purged, the employee link on that person's rating rows is removed and the rows are kept. There must be no query path from a directory record to an anonymous survey response.
- **No personal or sensitive data in URLs or query strings.** Survey access uses single-use, tokenised links. Uploaded files live in Supabase Storage behind RLS, never in public buckets.
- **Auditability.** Log directory uploads, campaign launches, calculation runs, results releases, rating views and exports, and support-staff access, with actor, timestamp and before-and-after state where applicable. No one, including PerformanceVP staff, can silently alter a client's historical scores: every released score traces to an immutable calculation run.
- **Retention on lapse.** A suspended organisation's data is retained until the Owner deletes the organisation. Deletion is manual and audited, exports first and then purges. The legal review may set a maximum retention period; until it does, retention is until deletion.

## 5. The measurement model and calculation engine

The engine is the heart of the portal and the highest-risk component. Build it as a pure, fully tested TypeScript module, decoupled from the database and the UI, with the Workbook Spec and Measurement Reference as its only authority.

**Invariants that must hold (confirm exact numbers against the source docs, do not take them from this file):**

- The operational equation is the **weighted multiplicative form**: `P = S × (C^0.35 × M^0.40 × O^0.25)`, with C, M, O on 0–100 and S a coefficient in the range 0.85 to 1.15. The simplified form `P = S × (C × M × O)^(1/3)` is for marketing and the book only and must never be used in the engine.
- Component scores are built from sub-dimension scores using the sub-dimension weights defined in the Cadence Master.
- Survey-based 0–100 conversion is `(mean − 1) × 25`. A mean of 1 maps to 0; a mean of 5 maps to 100. Never `mean × 25`.
- **The binding constraint is discovered among C, M, and O only. Synergy is a coefficient, not a candidate binding constraint.** Any "what is limiting this unit" logic in the dashboard must exclude S from contention.
- **Trip-wires (pay equity, fairness, basic conditions) sit outside the P calculation.** They are an overlay, not weighted into M, and require prominent, mandatory reporting wherever a unit's results are shown.
- **O1, O2, O3 are two-layer composites** (a structural layer and a perception layer) combined under a greater-than-15-point gap rule. Implement exactly as the Measurement Reference and Workbook Spec specify.
- The **Decision Latency Protocol** is not part of the online product. The engine keeps its DLP functions so that it remains a formula-for-formula mirror of the workbook, but the portal never supplies a decision sample, builds no DLP tables and shows no DLP block.

**The three-input-type model** still defines the engine's inputs, but no analyst produces them. The intake package (`packages/intake`), a pure module that mirrors the Survey Processing and Scoring Workbook and implements the online-only rules in the Online Measurement Specification, assembles them from validated aggregates, identified ratings, administrator checklists and formal performance ratings:

- **Type A (raw survey item means).** The intake package supplies item means (1–5, un-flipped); the engine reverse-scores and applies `(mean − 1) × 25`.
- **Type B (structured counts).** The intake package supplies the counts (C1 coverage inputs, C2 domain rows, C3 band counts after the online acceptance or inflation rules); the engine applies the final formula.
- **Type C (finished module or checklist scores).** The intake package computes the score per the module's rule and enters the result directly.

**Acceptance criteria for the engine:**

1. A test suite reproduces every worked example in the Measurement Reference to the stated precision.
2. Numerical parity with the Diagnostic Workbook: identical inputs produce identical C, M, O, S, P, binding constraint, and trip-wire flags.
3. Weights and conversion constants are defined in one place, sourced from the Cadence Master, never duplicated inline.
4. The intake package reproduces the Survey Processing Workbook on the Northwind worked example, and every worked example in Part 4 of the Online Measurement Specification.
5. The recommendations package (`packages/recommendations`) reproduces its named fixtures from a stored calculation run.

## 6. Functional areas

- **Setup and directory.** A guided setup: organisation and units with stable unit codes, the employee directory (edited in the portal or rebuilt from the Excel template, matched on employee ID, with a preview of differences before anything applies), unit context from the template library, optional formal-rating scale mapping, and a readiness check that gates the first campaign. Campaign launch freezes a directory snapshot. Unit lineage preserves trend history across restructures.
- **Campaign engine.** Baseline, quarterly pulse, half-yearly, annual and event-triggered campaigns assembled from the reference tables. Five audiences: members (Part A and Part B, tokenised and anonymous), team leaders and the leadership team (tokenised modules), managers (signed-in rating forms, pre-filled from their previous ratings), and administrators (checklists). At close: validity rules, aggregation, thresholds, then intake, engine and recommendations run as one stored calculation run.
- **Results and dashboards.** Organisation to unit to force to sub-dimension drill-down. Show the P index, the binding constraint (C/M/O only) with the full fourteen-row ranking, the Synergy lane, trip-wire flags (prominent and separate from P), gap findings and trends across cycles. An administrator reviews and releases each run; viewers see released runs only. RLS confines every view to the user's own organisation and role. A separate ratings area, for administrators only and access-logged, shows the ratings managers entered.
- **Suggestions, what-if and action tracking.** Rule-based suggestions from the online pattern cards per the Online Recommendations Specification, a what-if simulator that calls the engine's `projectImpact` for one sub-dimension at a time, and a light record of the client's own actions with movement shown at later cycles.
- **Subscriptions and provisioning.** One entitlement field (`employee_band`) from the start. Provisioning by the Owner or support staff: band, subscription period, agreement date, invoice reference, and the account-owner invitation. Renewal reminders at 60 and 30 days; on expiry a 30-day read-only grace period, then suspension.

## 7. Domain rules that must never be violated

- **The design and implementation boundary is commercial IP.** PerformanceVP designs interventions and measures their effect. The client implements them. Online suggestions carry design guidance only (no timelines, owners or implementation detail), and action tracking records the client's own status. Nothing may present PerformanceVP as executing implementation or blur ownership of the implementation.
- **Research claim calibration.** The underlying constructs are grounded in established research; the integrated equation and specific designed interventions are validated through pilots. Never use "proven to deliver" or equivalent. Indicative effect ranges are evidence-informed estimates and must be labelled as such in the UI.
- **Measurement separation.** Post-intervention measurement lives in a re-run Diagnostic or in the online subscription's own cadence. Action tracking shows movement at later cycles and states that it cannot be attributed to the action alone. Intervention Design produces a measurement plan, not the measurement itself.
- **Weights are evidence-informed defaults, held static**, presented honestly as such, not as calibrated regression outputs.
- **The model is decision-support, not a deterministic predictor.** UI copy should reflect that honesty and avoid spurious precision.
- **A fixed instrument.** Clients configure context only (units, role families, skills, knowledge domains, decision types, processes, systems). Item wording, scales, scoring, thresholds and weights are never client-editable.
- **Unit-level outputs.** Scores, findings and suggestions are about units. No result or suggestion names, ranks or infers an individual. The ratings area is separate, administrator-only and access-logged.
- **Ratings come from managers.** C1 and C2 only through the manager modules. C3 through the manager module, or through the organisation's formal performance ratings where they are dated within 12 months and cover at least 80% of the unit. Typed-in band counts are never accepted.
- **Claims discipline in suggestions.** Movement is "could", "indicative" or "plausible", never "will". No dollar figures and no percentage returns. The product is never described as an engagement survey, and no competitor is named.

## 8. Design system and brand

- Corporate Slate Blue `#1F3A52` — primary; all four forces (C, M, O, S) share this colour.
- Strategic Gold `#B89E6E` — accent.
- Measurement Grey `#5C6670` — secondary text and structure.
- White `#FFFFFF` — neutral background.

Define these as Tailwind theme tokens. Visualisations should distinguish forces by position, label, and shape rather than by colour, since the four forces share one colour.

## 9. Voice and copy conventions

All user-facing copy and all documentation use executive prose. No em dashes. No AI-flavoured language. No emotive HR jargon. Minimal bullets in prose surfaces. State limitations honestly. These conventions also apply to anything you write back to Michael, including the build plan.

## 10. Coding conventions and working discipline

- TypeScript throughout, strict mode. Prefer clarity over cleverness.
- The calculation engine is pure and independently testable, with no database or UI dependencies.
- Constants and weights live in a single sourced location, never duplicated.
- Before changing an existing file, read its current state rather than working from memory. Preview changes before applying them. Verify against the live file, not a cached copy.
- One clean source of a thing is preferred over variants.
- Where a decision is consequential and not yet settled, insert an explicitly named placeholder with a brief note on the consequence, and surface it to Michael rather than guessing.

## 11. Out of scope and guardrails

- The book is a separate track and is not part of this build.
- Do not take infrastructure actions (DNS changes, environment variable changes, deployments) as part of planning. Identify them as steps for Michael to perform or approve.
- Do not invent sub-dimension names, weights, counts, or scoring rules. Source them from the documents in `docs/source-ip/`.
- Do not introduce a second email provider, a second auth system, a second hosting target, or a payment provider. There is no online payment.
- The consultancy line (the Diagnostic, Intervention Design, the workbooks and the Document Production Loop) is out of scope. The portal must not depend on any of it at runtime.

## 12. How to work in this repo

The build plan exists and is approved: `PORTAL_BUILD_PLAN.md` (21 September 2026). The engine specification carried over from the first plan is preserved verbatim in `docs/ENGINE_SPEC.md`. Work milestone by milestone in the plan's order. Start each milestone in plan mode and confirm the approach with Michael before writing application code. Treat the engine, the intake package, the security model and the tenancy model as the four areas where correctness matters most and where assumptions are most dangerous. The superseded first plan is in `archive/` for history only; do not build from it.
