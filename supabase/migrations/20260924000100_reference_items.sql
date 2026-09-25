-- Milestone 5, step 1: the instrument as reference data (PORTAL_BUILD_PLAN.md 2.4; Milestone 5 plan,
-- Section 1).
--
-- The Survey Blueprint's items with their cadence tags, respondent order and pulse rotation; the
-- Tier 3 Module Library's modules and items, with M-C2-MGR from the Online Measurement
-- Specification; the administrator checklists ADM-O1, ADM-O2 and ADM-O4 with their answer values
-- and bands; and the event triggers of Cadence Master 7.3. The rows are loaded by the next
-- migration, which is generated from the source documents and checked against them by
-- apps/portal/lib/reference/reference.test.ts. Every signed-in person reads these tables; nobody
-- writes them at run time. Clients never edit the instrument (CLAUDE.md Section 7).
--
-- The column lists are exactly the reference set's fields, because the generated pgTAP test
-- compares each table with to_jsonb of its rows: a column added here without the generator fails.
-- Positions are unique but deferrable, so a regenerated migration can reorder rows in one pass.

create table public.ref_survey_sections (
  code text primary key check (code in ('A', 'B', 'C')),
  heading text not null check (btrim(heading) <> ''),
  position integer not null check (position > 0),
  unique (position) deferrable initially deferred
);
comment on table public.ref_survey_sections is
  'The three respondent-facing sections of the Diagnostic Survey (Survey Blueprint 1.3 and 6.1).';

create table public.ref_survey_items (
  code text primary key check (code ~ '^(CII|MI[1-4]|TW|OI[1-5]|TSI[23])-[0-9]{2}$'),
  block text not null check (
    block in ('C4', 'M1', 'M2', 'M3', 'M4', 'TW', 'O1', 'O2', 'O3', 'O4', 'O5', 'S2', 'S3')
  ),
  sub_construct text check (
    sub_construct in (
      'clarity', 'trust', 'flow', 'engagement', 'team_confidence', 'pride', 'role_clarity',
      'decision_rights', 'cascade', 'task', 'relationship'
    )
  ),
  wording text not null check (btrim(wording) <> ''),
  is_reverse boolean not null,
  in_baseline boolean not null,
  in_pulse boolean not null,
  pulse_rotates boolean not null,
  in_half_yearly boolean not null,
  in_annual boolean not null,
  section text not null references public.ref_survey_sections (code),
  position integer not null check (position > 0),
  unique (position) deferrable initially deferred,
  check (in_pulse or not pulse_rotates)
);
comment on table public.ref_survey_items is
  'The Part A items of the Diagnostic Survey (Survey Blueprint Parts 2 to 6): wording, reverse flag, '
  'cadence tags (B, Q, H, A; pulse_rotates is the Blueprint''s Q*) and respondent order.';

create table public.ref_pulse_rotation (
  rotation smallint not null check (rotation between 1 and 4),
  item_code text not null references public.ref_survey_items (code),
  primary key (rotation, item_code)
);
comment on table public.ref_pulse_rotation is
  'The quarterly pulse item set for each rotation row (Survey Blueprint 3.1.4, 3.2.2, 3.5.2, with '
  'OI5, TSI2 and CII-13 in every pulse; Milestone 5 plan, D6).';

create table public.ref_modules (
  code text primary key,
  audience text not null check (audience in ('members_part_b', 'leadership_team', 'managers', 'team_leaders')),
  sub_dimension text not null check (sub_dimension in ('C1', 'C2', 'C3', 'C5', 'O1', 'O2', 'O3')),
  repeats_over text not null check (
    repeats_over in ('none', 'process', 'decision_type', 'report_skill', 'report_domain', 'report')
  ),
  disclosure text not null check (disclosure in ('none', 'leadership_team', 'small_group')),
  source text not null,
  position integer not null check (position > 0),
  unique (position) deferrable initially deferred
);
comment on table public.ref_modules is
  'The modules the online route deploys (Online Measurement Specification Part 2; Tier 3 Module '
  'Library Parts 2 to 5; M-C2-MGR from Online Measurement Specification 4.1).';

create table public.ref_module_items (
  code text primary key check (code ~ '^[A-Z0-9]+-[0-9]{2}$'),
  module_code text not null references public.ref_modules (code),
  position integer not null check (position > 0),
  wording text not null check (btrim(wording) <> ''),
  response_kind text not null check (
    response_kind in ('agree5', 'anchored5', 'rapid_multi', 'rapid_single', 'band5', 'evidence_note', 'open_text')
  ),
  anchors jsonb check (anchors is null or jsonb_typeof(anchors) = 'array'),
  is_reverse boolean not null,
  online boolean not null,
  portal_code boolean not null,
  unique (module_code, position) deferrable initially deferred,
  check ((response_kind in ('anchored5', 'band5')) = (anchors is not null))
);
comment on table public.ref_module_items is
  'Each module''s items with their response form and anchors. online is false for the open-text '
  'items, which the online route does not deploy (Online Measurement Specification 11.1, decision 5); '
  'portal_code marks a code the portal assigned where the source gives none (Milestone 5 plan, D20).';

create table public.ref_admin_checklists (
  code text primary key check (code in ('ADM-O1', 'ADM-O2', 'ADM-O4')),
  repeats_over text not null check (repeats_over in ('role_family', 'system', 'unit')),
  minimum_facts integer check (minimum_facts is null or minimum_facts > 0),
  source text not null,
  position integer not null check (position > 0),
  unique (position) deferrable initially deferred
);
comment on table public.ref_admin_checklists is
  'The administrator checklists that replace the analyst''s structural reviews (Online Measurement '
  'Specification 4.2, 4.3, 4.3a).';

create table public.ref_admin_checklist_facts (
  code text primary key,
  checklist_code text not null references public.ref_admin_checklists (code),
  position integer not null check (position > 0),
  wording text not null check (btrim(wording) <> ''),
  response_kind text not null check (
    response_kind in ('yes_no', 'yes_partly_no', 'integration', 'percent', 'hours', 'percent_or_na')
  ),
  source_response text,
  unique (checklist_code, position) deferrable initially deferred
);
comment on table public.ref_admin_checklist_facts is
  'The facts each checklist asks, with the source''s response or band cell verbatim.';

create table public.ref_admin_checklist_values (
  fact_code text not null references public.ref_admin_checklist_facts (code),
  option text not null,
  label text not null,
  value numeric,
  position integer not null check (position > 0),
  primary key (fact_code, option),
  unique (fact_code, position) deferrable initially deferred
);
comment on table public.ref_admin_checklist_values is
  'The answers a fact takes and the value each scores; a null value is excluded from the score.';

create table public.ref_admin_checklist_bands (
  fact_code text not null references public.ref_admin_checklist_facts (code),
  position integer not null check (position > 0),
  score numeric not null,
  lower numeric,
  lower_inclusive boolean not null,
  upper numeric,
  upper_inclusive boolean not null,
  primary key (fact_code, position),
  check (lower is null or upper is null or lower < upper),
  check (lower is not null or not lower_inclusive),
  check (upper is not null or not upper_inclusive)
);
comment on table public.ref_admin_checklist_bands is
  'ADM-O4''s bands (Online Measurement Specification 4.3a); a value on a boundary takes the '
  'higher-scoring band. The intake package scores the facts; these rows describe the bands to the '
  'administrator and are proven equal to the intake''s rules.';

create table public.ref_event_triggers (
  code text primary key check (code ~ '^[a-z_]+$'),
  source_trigger text not null,
  affects text[] not null,
  detection text not null check (detection in ('menu', 'directory')),
  deploys text not null check (deploys in ('affected', 'half_yearly')),
  source text not null,
  position integer not null check (position > 0),
  unique (position) deferrable initially deferred,
  check ((deploys = 'half_yearly') = (cardinality(affects) = 0)),
  check (affects <@ array[
    'C1', 'C2', 'C3', 'C4', 'C5', 'M1', 'M2', 'M3', 'M4', 'O1', 'O2', 'O3', 'O4', 'O5', 'S1', 'S2', 'S3',
    'TW1', 'TW2', 'TW3'
  ]::text[])
);
comment on table public.ref_event_triggers is
  'The event-triggered refreshes the online route offers (Cadence Master 7.3; Online Measurement '
  'Specification 6.3), with the sub-dimensions each refreshes. Directory-detected triggers are '
  'prompted from Milestone 8; the rest are a menu. Uncapped (Cadence Master 7.3).';

-- Row level security: every signed-in person reads the instrument; nobody writes it at run time.

alter table public.ref_survey_sections enable row level security;
alter table public.ref_survey_items enable row level security;
alter table public.ref_pulse_rotation enable row level security;
alter table public.ref_modules enable row level security;
alter table public.ref_module_items enable row level security;
alter table public.ref_admin_checklists enable row level security;
alter table public.ref_admin_checklist_facts enable row level security;
alter table public.ref_admin_checklist_values enable row level security;
alter table public.ref_admin_checklist_bands enable row level security;
alter table public.ref_event_triggers enable row level security;

create policy ref_survey_sections_select on public.ref_survey_sections for select to authenticated using (true);
create policy ref_survey_items_select on public.ref_survey_items for select to authenticated using (true);
create policy ref_pulse_rotation_select on public.ref_pulse_rotation for select to authenticated using (true);
create policy ref_modules_select on public.ref_modules for select to authenticated using (true);
create policy ref_module_items_select on public.ref_module_items for select to authenticated using (true);
create policy ref_admin_checklists_select on public.ref_admin_checklists for select to authenticated using (true);
create policy ref_admin_checklist_facts_select on public.ref_admin_checklist_facts for select to authenticated using (true);
create policy ref_admin_checklist_values_select on public.ref_admin_checklist_values for select to authenticated using (true);
create policy ref_admin_checklist_bands_select on public.ref_admin_checklist_bands for select to authenticated using (true);
create policy ref_event_triggers_select on public.ref_event_triggers for select to authenticated using (true);

grant select on public.ref_survey_sections to authenticated;
grant select on public.ref_survey_items to authenticated;
grant select on public.ref_pulse_rotation to authenticated;
grant select on public.ref_modules to authenticated;
grant select on public.ref_module_items to authenticated;
grant select on public.ref_admin_checklists to authenticated;
grant select on public.ref_admin_checklist_facts to authenticated;
grant select on public.ref_admin_checklist_values to authenticated;
grant select on public.ref_admin_checklist_bands to authenticated;
grant select on public.ref_event_triggers to authenticated;
