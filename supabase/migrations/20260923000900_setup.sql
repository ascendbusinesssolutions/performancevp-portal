-- Milestone 4, step 4: what the setup flows need (Milestone 4 plan, Section 11).
--
-- The rest of the unit context (decision types, critical processes, primary systems), the formal
-- rating scale map, the unit-leader designation, the reference data the setup screens start from
-- (the ANZSIC divisions and the placeholder Role-Family Template Library), the per-person and
-- readiness reads of formal ratings, the formal-rating coverage lines of the upload preview, and
-- the decision behind "Send me a new link".
--
-- Context follows the structure migration: every member of the organisation reads it (results and
-- suggestions name processes), and administrators, the account owner and staff under a session
-- write it while the organisation is writable. Nothing is deleted: a row is retired. The scale map
-- is read and written by the same people who manage the directory and by nobody else.

-- Constants ---------------------------------------------------------------------------------------

create function private.new_link_cooldown_seconds()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- The least time between two new links for one account (Milestone 4 plan, Section 8).
  select 60
$$;

create function private.new_link_hourly_limit()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- The most new links one account can be sent in an hour (Milestone 4 plan, Section 8).
  select 5
$$;

-- Reference data ----------------------------------------------------------------------------------

-- The 19 divisions of ANZSIC 2006 (Australian Bureau of Statistics, catalogue 1292.0). The
-- organisation's sector is metadata only (Measurement Reference Part 2, 7.1).
create table public.ref_anzsic_divisions (
  code text primary key check (code ~ '^[A-S]$'),
  name text not null check (btrim(name) <> ''),
  sort_order integer not null unique
);
comment on table public.ref_anzsic_divisions is
  'ANZSIC 2006 divisions, for the organisation''s sector metadata. Written by migration only.';

insert into public.ref_anzsic_divisions (code, name, sort_order) values
  ('A', 'Agriculture, Forestry and Fishing', 1),
  ('B', 'Mining', 2),
  ('C', 'Manufacturing', 3),
  ('D', 'Electricity, Gas, Water and Waste Services', 4),
  ('E', 'Construction', 5),
  ('F', 'Wholesale Trade', 6),
  ('G', 'Retail Trade', 7),
  ('H', 'Accommodation and Food Services', 8),
  ('I', 'Transport, Postal and Warehousing', 9),
  ('J', 'Information Media and Telecommunications', 10),
  ('K', 'Financial and Insurance Services', 11),
  ('L', 'Rental, Hiring and Real Estate Services', 12),
  ('M', 'Professional, Scientific and Technical Services', 13),
  ('N', 'Administrative and Support Services', 14),
  ('O', 'Public Administration and Safety', 15),
  ('P', 'Education and Training', 16),
  ('Q', 'Health Care and Social Assistance', 17),
  ('R', 'Arts and Recreation Services', 18),
  ('S', 'Other Services', 19);

alter table public.organisations
  add foreign key (anzsic_division) references public.ref_anzsic_divisions (code);

-- The Role-Family Template Library and the starter lists (Online Measurement Specification 4.5;
-- PORTAL_BUILD_PLAN.md 2.4, ref_templates). Starting points the client selects, renames and trims;
-- they carry no scoring rules. Every row seeded here is placeholder content, flagged as such, until
-- the library is written (the ROLE_FAMILY_TEMPLATE_LIBRARY named placeholder).
create table public.ref_templates (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  kind text not null check (
    kind in ('role_family', 'decision_types', 'knowledge_domain_prompts', 'process_prompts', 'system_prompts')
  ),
  name text not null check (btrim(name) <> ''),
  unit_type text check (
    unit_type in (
      'operations', 'sales', 'technology', 'support_functions', 'professional_services',
      'research_and_development', 'other'
    )
  ),
  is_people_leader boolean not null default false,
  version integer not null default 1 check (version > 0),
  is_placeholder boolean not null,
  sort_order integer not null,
  unique (kind, sort_order),
  check ((kind = 'decision_types') = (unit_type is not null)),
  check (kind = 'role_family' or not is_people_leader)
);
comment on table public.ref_templates is
  'Starter content for unit context: role-family skill frameworks, decision-type starter lists by '
  'unit type, and prompts. Written by migration only. is_placeholder marks content awaiting the '
  'Role-Family Template Library.';

create table public.ref_template_items (
  template_code text not null references public.ref_templates (code),
  position integer not null check (position > 0),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  skill_kind text check (skill_kind in ('technical', 'behavioural')),
  is_critical boolean,
  primary key (template_code, position),
  check ((skill_kind is null) = (is_critical is null))
);
comment on table public.ref_template_items is
  'The items of a template: skills (with their kind and critical flag) for a role family, decision '
  'types for a starter list, or prompt questions.';

insert into public.ref_templates (code, kind, name, unit_type, is_people_leader, is_placeholder, sort_order) values
  ('customer_service', 'role_family', 'Customer service', null, false, true, 1),
  ('sales', 'role_family', 'Sales', null, false, true, 2),
  ('software_engineering', 'role_family', 'Software engineering', null, false, true, 3),
  ('finance', 'role_family', 'Finance', null, false, true, 4),
  ('people_and_culture', 'role_family', 'People and culture', null, false, true, 5),
  ('operations_supervision', 'role_family', 'Operations supervision', null, false, true, 6),
  ('project_delivery', 'role_family', 'Project delivery', null, false, true, 7),
  ('people_leaders', 'role_family', 'People leaders', null, true, true, 8),
  ('decisions_operations', 'decision_types', 'Operations', 'operations', false, true, 1),
  ('decisions_sales', 'decision_types', 'Sales', 'sales', false, true, 2),
  ('decisions_technology', 'decision_types', 'Technology', 'technology', false, true, 3),
  ('decisions_support_functions', 'decision_types', 'Support functions', 'support_functions', false, true, 4),
  ('decisions_professional_services', 'decision_types', 'Professional services', 'professional_services', false, true, 5),
  ('decisions_research_and_development', 'decision_types', 'Research and development', 'research_and_development', false, true, 6),
  ('decisions_other', 'decision_types', 'Other', 'other', false, true, 7),
  ('knowledge_domain_prompts', 'knowledge_domain_prompts', 'Knowledge domains', null, false, true, 1),
  ('process_prompts', 'process_prompts', 'Critical processes', null, false, true, 1),
  ('system_prompts', 'system_prompts', 'Primary systems', null, false, true, 1);

insert into public.ref_template_items (template_code, position, name, skill_kind, is_critical) values
  ('customer_service', 1, 'Product and service knowledge', 'technical', true),
  ('customer_service', 2, 'Case handling in the core systems', 'technical', true),
  ('customer_service', 3, 'Complaint resolution', 'behavioural', true),
  ('customer_service', 4, 'Clear written communication', 'behavioural', false),
  ('customer_service', 5, 'Active listening', 'behavioural', true),
  ('customer_service', 6, 'Applying policy and compliance rules', 'technical', true),
  ('customer_service', 7, 'Resolving enquiries at first contact', 'technical', false),
  ('customer_service', 8, 'De-escalation', 'behavioural', false),
  ('customer_service', 9, 'Accurate record keeping', 'technical', false),
  ('customer_service', 10, 'Working with other teams on a case', 'behavioural', false),

  ('sales', 1, 'Prospecting and pipeline building', 'technical', true),
  ('sales', 2, 'Discovery and needs analysis', 'behavioural', true),
  ('sales', 3, 'Product knowledge', 'technical', true),
  ('sales', 4, 'Proposal and pricing preparation', 'technical', false),
  ('sales', 5, 'Negotiation', 'behavioural', true),
  ('sales', 6, 'Forecasting', 'technical', false),
  ('sales', 7, 'Account planning', 'technical', false),
  ('sales', 8, 'Relationship building', 'behavioural', true),
  ('sales', 9, 'Keeping the customer record current', 'technical', false),
  ('sales', 10, 'Handling objections', 'behavioural', false),

  ('software_engineering', 1, 'Writing maintainable code', 'technical', true),
  ('software_engineering', 2, 'Code review', 'technical', false),
  ('software_engineering', 3, 'Automated testing', 'technical', true),
  ('software_engineering', 4, 'System design', 'technical', true),
  ('software_engineering', 5, 'Debugging and incident response', 'technical', true),
  ('software_engineering', 6, 'Secure development practice', 'technical', false),
  ('software_engineering', 7, 'Build and deployment tooling', 'technical', false),
  ('software_engineering', 8, 'Estimating and breaking down work', 'behavioural', false),
  ('software_engineering', 9, 'Explaining technical trade-offs', 'behavioural', false),
  ('software_engineering', 10, 'Collaboration across disciplines', 'behavioural', true),
  ('software_engineering', 11, 'Data modelling', 'technical', false),

  ('finance', 1, 'Month-end close', 'technical', true),
  ('finance', 2, 'Reconciliations', 'technical', true),
  ('finance', 3, 'Management reporting', 'technical', true),
  ('finance', 4, 'Budgeting and forecasting', 'technical', false),
  ('finance', 5, 'Applying accounting standards', 'technical', true),
  ('finance', 6, 'Tax and compliance obligations', 'technical', false),
  ('finance', 7, 'Financial systems', 'technical', false),
  ('finance', 8, 'Business partnering', 'behavioural', false),
  ('finance', 9, 'Accuracy and attention to detail', 'behavioural', true),
  ('finance', 10, 'Explaining financial results', 'behavioural', false),

  ('people_and_culture', 1, 'Applying employment law and awards', 'technical', true),
  ('people_and_culture', 2, 'Recruitment and selection', 'technical', false),
  ('people_and_culture', 3, 'Employee relations case management', 'technical', true),
  ('people_and_culture', 4, 'Payroll and HR systems', 'technical', false),
  ('people_and_culture', 5, 'Workforce reporting', 'technical', false),
  ('people_and_culture', 6, 'Policy development', 'technical', false),
  ('people_and_culture', 7, 'Coaching managers', 'behavioural', true),
  ('people_and_culture', 8, 'Handling confidential matters', 'behavioural', true),
  ('people_and_culture', 9, 'Facilitation', 'behavioural', false),
  ('people_and_culture', 10, 'Work health and safety obligations', 'technical', true),

  ('operations_supervision', 1, 'Rostering and allocating people', 'technical', true),
  ('operations_supervision', 2, 'Work health and safety practice', 'technical', true),
  ('operations_supervision', 3, 'Quality control', 'technical', true),
  ('operations_supervision', 4, 'Knowledge of the unit''s operations', 'technical', true),
  ('operations_supervision', 5, 'Tracking performance against targets', 'technical', false),
  ('operations_supervision', 6, 'Solving problems as they arise', 'behavioural', false),
  ('operations_supervision', 7, 'Giving clear instructions', 'behavioural', false),
  ('operations_supervision', 8, 'Coaching team members', 'behavioural', false),
  ('operations_supervision', 9, 'Escalating issues early', 'behavioural', false),
  ('operations_supervision', 10, 'Equipment and systems', 'technical', false),

  ('project_delivery', 1, 'Scoping and planning', 'technical', true),
  ('project_delivery', 2, 'Scheduling and dependencies', 'technical', true),
  ('project_delivery', 3, 'Risk and issue management', 'technical', true),
  ('project_delivery', 4, 'Budget tracking', 'technical', false),
  ('project_delivery', 5, 'Stakeholder management', 'behavioural', true),
  ('project_delivery', 6, 'Status reporting', 'technical', false),
  ('project_delivery', 7, 'Change control', 'technical', false),
  ('project_delivery', 8, 'Vendor management', 'technical', false),
  ('project_delivery', 9, 'Running effective meetings', 'behavioural', false),
  ('project_delivery', 10, 'Negotiating priorities', 'behavioural', false),

  ('people_leaders', 1, 'Setting clear expectations', 'behavioural', true),
  ('people_leaders', 2, 'Giving feedback', 'behavioural', true),
  ('people_leaders', 3, 'Coaching and development', 'behavioural', true),
  ('people_leaders', 4, 'Delegation', 'behavioural', false),
  ('people_leaders', 5, 'Performance conversations', 'behavioural', true),
  ('people_leaders', 6, 'Planning and prioritising the team''s work', 'technical', false),
  ('people_leaders', 7, 'Budget and resource management', 'technical', false),
  ('people_leaders', 8, 'Recruitment decisions', 'technical', false),
  ('people_leaders', 9, 'Leading through change', 'behavioural', false),
  ('people_leaders', 10, 'Applying people policies', 'technical', false);

insert into public.ref_template_items (template_code, position, name) values
  ('decisions_operations', 1, 'Changing the roster'),
  ('decisions_operations', 2, 'Approving overtime'),
  ('decisions_operations', 3, 'Buying consumables within budget'),
  ('decisions_operations', 4, 'Changing a standard operating procedure'),
  ('decisions_operations', 5, 'Stopping work for a safety concern'),
  ('decisions_operations', 6, 'Setting the order of the day''s work'),
  ('decisions_operations', 7, 'Approving leave'),
  ('decisions_operations', 8, 'Resolving a customer escalation'),
  ('decisions_operations', 9, 'Choosing a supplier for routine items'),
  ('decisions_operations', 10, 'Assigning people to tasks'),

  ('decisions_sales', 1, 'Discounting within the price book'),
  ('decisions_sales', 2, 'Discounting outside the price book'),
  ('decisions_sales', 3, 'Choosing which prospects to pursue'),
  ('decisions_sales', 4, 'Assigning territories and accounts'),
  ('decisions_sales', 5, 'Agreeing a non-standard contract term'),
  ('decisions_sales', 6, 'Committing the forecast'),
  ('decisions_sales', 7, 'Setting campaign priorities'),
  ('decisions_sales', 8, 'Approving travel and entertainment'),
  ('decisions_sales', 9, 'Hiring into the sales team'),
  ('decisions_sales', 10, 'Handing an account to service'),

  ('decisions_technology', 1, 'Choosing a technology or framework'),
  ('decisions_technology', 2, 'Releasing to production'),
  ('decisions_technology', 3, 'Ordering the backlog'),
  ('decisions_technology', 4, 'Accepting technical debt'),
  ('decisions_technology', 5, 'Granting system access'),
  ('decisions_technology', 6, 'Declaring and closing an incident'),
  ('decisions_technology', 7, 'Buying software or services'),
  ('decisions_technology', 8, 'Changing the architecture'),
  ('decisions_technology', 9, 'Staffing a project'),
  ('decisions_technology', 10, 'Retiring a system'),

  ('decisions_support_functions', 1, 'Approving spend within budget'),
  ('decisions_support_functions', 2, 'Changing a policy'),
  ('decisions_support_functions', 3, 'Responding to a request from another unit'),
  ('decisions_support_functions', 4, 'Ordering the queue of requests'),
  ('decisions_support_functions', 5, 'Engaging a contractor'),
  ('decisions_support_functions', 6, 'Approving an exception to policy'),
  ('decisions_support_functions', 7, 'Selecting a vendor'),
  ('decisions_support_functions', 8, 'Changing a reporting format'),
  ('decisions_support_functions', 9, 'Setting deadlines for other units'),
  ('decisions_support_functions', 10, 'Hiring into the team'),

  ('decisions_professional_services', 1, 'Accepting a new client engagement'),
  ('decisions_professional_services', 2, 'Pricing a proposal'),
  ('decisions_professional_services', 3, 'Staffing an engagement'),
  ('decisions_professional_services', 4, 'Approving a write-off'),
  ('decisions_professional_services', 5, 'Signing off a client deliverable'),
  ('decisions_professional_services', 6, 'Changing the scope of an engagement'),
  ('decisions_professional_services', 7, 'Engaging a subcontractor'),
  ('decisions_professional_services', 8, 'Resolving a client complaint'),
  ('decisions_professional_services', 9, 'Choosing a method or approach'),
  ('decisions_professional_services', 10, 'Allocating non-billable time'),

  ('decisions_research_and_development', 1, 'Starting a project'),
  ('decisions_research_and_development', 2, 'Stopping a project'),
  ('decisions_research_and_development', 3, 'Choosing an experimental approach'),
  ('decisions_research_and_development', 4, 'Allocating equipment time'),
  ('decisions_research_and_development', 5, 'Approving research spend'),
  ('decisions_research_and_development', 6, 'Publishing or sharing results'),
  ('decisions_research_and_development', 7, 'Moving work to the next stage'),
  ('decisions_research_and_development', 8, 'Engaging an external partner'),
  ('decisions_research_and_development', 9, 'Setting research priorities'),
  ('decisions_research_and_development', 10, 'Hiring into the team'),

  ('decisions_other', 1, 'Approving spend within budget'),
  ('decisions_other', 2, 'Setting the team''s priorities'),
  ('decisions_other', 3, 'Changing a work process'),
  ('decisions_other', 4, 'Approving leave'),
  ('decisions_other', 5, 'Engaging a contractor'),
  ('decisions_other', 6, 'Resolving a complaint'),
  ('decisions_other', 7, 'Approving an exception to policy'),
  ('decisions_other', 8, 'Choosing a supplier'),
  ('decisions_other', 9, 'Assigning work'),
  ('decisions_other', 10, 'Hiring into the team'),

  ('knowledge_domain_prompts', 1, 'What must someone in this unit know that takes months to learn?'),
  ('knowledge_domain_prompts', 2, 'Which regulations, standards or contracts does the unit''s work depend on?'),
  ('knowledge_domain_prompts', 3, 'Which products, services or customers does the unit need to know in detail?'),
  ('knowledge_domain_prompts', 4, 'Where would the unit struggle if one experienced person left?'),

  ('process_prompts', 1, 'Which processes does most of the unit''s work pass through?'),
  ('process_prompts', 2, 'Where are work and information handed to other units most often?'),
  ('process_prompts', 3, 'Which processes do people most often work around?'),
  ('process_prompts', 4, 'Which process would customers or other units notice first if it slowed down?'),

  ('system_prompts', 1, 'Which systems does the unit use every day?'),
  ('system_prompts', 2, 'Where is the unit''s core information kept?'),
  ('system_prompts', 3, 'Which spreadsheets or local tools does the unit rely on?'),
  ('system_prompts', 4, 'Which systems does the unit exchange data with?');

-- Where a role family came from, so a later library version can be offered against it.
alter table public.role_families
  add column template_code text references public.ref_templates (code),
  add column template_version integer check (template_version is null or template_version > 0),
  add check ((template_code is null) = (template_version is null));

-- The rest of the unit context (Online Measurement Specification 3.3 and 4.3) ----------------------

create table public.decision_types (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  unit_id uuid not null,
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  from_starter_list boolean not null default false,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);
create unique index decision_types_name on public.decision_types (organisation_id, unit_id, lower(name));
comment on table public.decision_types is
  'The 8 to 12 decision types M-O1-LT asks about for a unit (Online Measurement Specification 3.3), '
  'chosen from the starter list for the unit''s type or named by the client.';

create table public.critical_processes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  unit_id uuid not null,
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);
create unique index critical_processes_name on public.critical_processes (organisation_id, unit_id, lower(name));
comment on table public.critical_processes is
  'The 3 processes M-O3-PF audits for a unit (Online Measurement Specification 3.3; discrepancy 2 '
  'in Part 11.3).';

create table public.primary_systems (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  unit_id uuid not null,
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);
create unique index primary_systems_name on public.primary_systems (organisation_id, unit_id, lower(name));
comment on table public.primary_systems is
  'The 3 to 8 primary systems ADM-O2 asks about for a unit (Online Measurement Specification 4.3).';

-- The formal rating scale map (Online Measurement Specification 6.4) -------------------------------

-- One decision per organisation: the formal ratings are mapped onto the five bands, with the
-- calibration declaration, or the step is skipped and managers rate talent density. Labels match
-- the formal ratings exactly as stored, as the intake reads them.
create table public.rating_scale_maps (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null unique references public.organisations (id),
  decision text not null check (decision in ('mapped', 'skipped')),
  calibrated boolean,
  decided_by uuid,
  decided_at timestamptz not null default now(),
  unique (organisation_id, id),
  check ((decision = 'mapped') = (calibrated is not null))
);
comment on table public.rating_scale_maps is
  'Whether the organisation''s formal ratings are mapped onto the five talent bands, and whether it '
  'declares them calibrated across managers, or whether the step was skipped.';

create table public.rating_scale_map_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  label text not null check (label = btrim(label) and label <> '' and length(label) <= 100),
  band smallint not null check (band between 1 and 5),
  unique (organisation_id, id),
  unique (organisation_id, label)
);
comment on table public.rating_scale_map_entries is
  'One of the client''s rating labels and the talent band it maps to (1 to 5).';

-- Who decided, and when, is recorded by the database, never taken from the client.
create function private.stamp_scale_map_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.decided_by := private.acting_user_id();
  new.decided_at := now();
  return new;
end
$$;

create trigger rating_scale_maps_stamp
  before insert or update on public.rating_scale_maps
  for each row execute function private.stamp_scale_map_decision();

-- The unit leader (decided 23 September 2026) ---------------------------------------------------------

-- The person who leads the unit: the leadership-team module and the team-leader fallback use it
-- (Milestone 5). An active member of the unit, or nobody; a person who leaves the unit, or leaves,
-- stops being its leader. The readiness check proposes a default where exactly one person in the
-- unit has a manager outside it, or none.
alter table public.business_units
  add column unit_leader_employee_id uuid,
  add foreign key (organisation_id, unit_leader_employee_id)
    references public.employees (organisation_id, id) on delete set null (unit_leader_employee_id);
comment on column public.business_units.unit_leader_employee_id is
  'The unit leader: an active member of the unit, or null (decided 23 September 2026).';

create function private.guard_unit_leader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.unit_leader_employee_id is not null and not exists (
    select 1 from public.employees e
    where e.organisation_id = new.organisation_id and e.id = new.unit_leader_employee_id
      and e.unit_id = new.id and e.status = 'active'
  ) then
    raise exception 'the unit leader must be an active member of the unit' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger business_units_guard_leader
  before insert or update of unit_leader_employee_id on public.business_units
  for each row execute function private.guard_unit_leader();

create function private.release_unit_leader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' or new.unit_id is distinct from old.unit_id then
    update public.business_units u
    set unit_leader_employee_id = null
    where u.organisation_id = new.organisation_id and u.unit_leader_employee_id = new.id
      and (new.status <> 'active' or u.id <> new.unit_id);
  end if;
  return null;
end
$$;

create trigger employees_release_unit_leader
  after update of unit_id, status on public.employees
  for each row execute function private.release_unit_leader();

-- The leaver confirmation (PORTAL_COPY_SPEC.md S3) ------------------------------------------------

-- An upload that deactivates more people than this must be confirmed as the whole directory. The
-- rule was inline in directory_diff (Milestone 3); it is named here so the preview can state it
-- ("{n} leavers is more than {threshold}"), and directory_diff is replaced unchanged but for using
-- it and reporting it. A staged upload previewed before this migration is previewed again.
create function private.leaver_confirmation_threshold(p_active_before integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(5, ceil(p_active_before * 0.10))::integer
$$;

create or replace function private.directory_diff(p_upload_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_people jsonb;
  v_units jsonb;
  v_teams jsonb;
  v_families jsonb;
  v_active_before integer;
  v_active_after integer;
  v_leavers integer;
begin
  select organisation_id into v_org from public.directory_uploads where id = p_upload_id;

  with staged as (
    select r.*, lower(r.employee_ref) as ref_key from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id
  ),
  live as (
    select e.*, lower(e.employee_ref) as ref_key, u.unit_code, t.name as team_name,
           mgr.employee_ref as manager_ref, rf.name as role_family_name,
           fr.rating_label as formal_rating_label, fr.rating_date as formal_rating_date
    from public.employees e
    join public.business_units u on u.organisation_id = e.organisation_id and u.id = e.unit_id
    left join public.teams t on t.organisation_id = e.organisation_id and t.id = e.team_id
    left join public.employees mgr on mgr.organisation_id = e.organisation_id and mgr.id = e.manager_employee_id
    left join public.role_families rf on rf.organisation_id = e.organisation_id and rf.id = e.role_family_id
    left join public.formal_ratings fr on fr.organisation_id = e.organisation_id and fr.employee_id = e.id
    where e.organisation_id = v_org
  ),
  compared as (
    select
      coalesce(s.employee_ref, l.employee_ref) as employee_ref,
      coalesce(s.first_name, l.first_name) as first_name,
      coalesce(s.last_name, l.last_name) as last_name,
      case
        when l.id is null then 'joiner'
        when s.ref_key is null then case when l.status = 'active' then 'leaver' end
        when l.status = 'inactive' then 'returning'
        else 'update'
      end as change,
      case when s.ref_key is null then '{}'::jsonb else jsonb_strip_nulls(jsonb_build_object(
        'first_name', case when s.first_name is distinct from l.first_name
          then jsonb_build_object('from', l.first_name, 'to', s.first_name) end,
        'last_name', case when s.last_name is distinct from l.last_name
          then jsonb_build_object('from', l.last_name, 'to', s.last_name) end,
        'work_email', case when lower(s.work_email) is distinct from lower(l.work_email)
          then jsonb_build_object('from', l.work_email, 'to', s.work_email) end,
        'unit', case when lower(s.unit_code) is distinct from lower(l.unit_code)
          then jsonb_build_object('from', l.unit_code, 'to', s.unit_code) end,
        'team', case when lower(s.team_name) is distinct from lower(l.team_name)
          then jsonb_build_object('from', l.team_name, 'to', s.team_name) end,
        'manager', case when lower(s.manager_ref) is distinct from lower(l.manager_ref)
          then jsonb_build_object('from', l.manager_ref, 'to', s.manager_ref) end,
        'role_title', case when s.role_title is distinct from l.role_title
          then jsonb_build_object('from', l.role_title, 'to', s.role_title) end,
        'role_family', case when lower(s.role_family_name) is distinct from lower(l.role_family_name)
          then jsonb_build_object('from', l.role_family_name, 'to', s.role_family_name) end,
        'start_date', case when s.start_date is distinct from l.start_date
          then jsonb_build_object('from', l.start_date, 'to', s.start_date) end,
        'fte', case when s.fte is distinct from l.fte
          then jsonb_build_object('from', l.fte, 'to', s.fte) end,
        'team_leader', case when s.is_team_leader is distinct from l.is_team_leader
          then jsonb_build_object('from', l.is_team_leader, 'to', s.is_team_leader) end,
        'leadership_team', case when s.is_leadership_team is distinct from l.is_leadership_team
          then jsonb_build_object('from', l.is_leadership_team, 'to', s.is_leadership_team) end,
        'employment_status', case when s.employment_status is distinct from l.employment_status
          then jsonb_build_object('from', l.employment_status, 'to', s.employment_status) end,
        'formal_rating', case
          when (s.formal_rating_label, s.formal_rating_date) is distinct from (l.formal_rating_label, l.formal_rating_date)
          then jsonb_build_object(
            'from', case when l.formal_rating_label is not null
              then jsonb_build_object('label', l.formal_rating_label, 'date', l.formal_rating_date) end,
            'to', case when s.formal_rating_label is not null
              then jsonb_build_object('label', s.formal_rating_label, 'date', s.formal_rating_date) end)
          end
      )) end as fields
    from staged s
    full join live l on l.ref_key = s.ref_key
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('employee_ref', employee_ref, 'first_name', first_name, 'last_name', last_name,
                       'change', change, 'fields', fields)
    order by lower(employee_ref)
  ), '[]'::jsonb)
  into v_people
  from compared
  where change in ('joiner', 'returning', 'leaver') or (change = 'update' and fields <> '{}'::jsonb);

  with staged_units as (
    select lower(unit_code) as code_key, min(unit_code) as unit_code, min(unit_name) as unit_name
    from public.directory_upload_rows
    where organisation_id = v_org and upload_id = p_upload_id
    group by lower(unit_code)
  ),
  unit_changes as (
    select su.unit_code, 'new'::text as change, null::text as name_from, su.unit_name as name_to
    from staged_units su
    where not exists (
      select 1 from public.business_units u where u.organisation_id = v_org and lower(u.unit_code) = su.code_key
    )
    union all
    select u.unit_code, 'renamed', u.name, su.unit_name
    from staged_units su
    join public.business_units u on u.organisation_id = v_org and lower(u.unit_code) = su.code_key
    where u.status = 'active' and u.name is distinct from su.unit_name
    union all
    select u.unit_code, 'emptied', u.name, null
    from public.business_units u
    where u.organisation_id = v_org and u.status = 'active'
      and private.unit_has_active_staff(v_org, u.id)
      and lower(u.unit_code) not in (select code_key from staged_units)
  )
  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object('unit_code', unit_code, 'change', change, 'name_from', name_from, 'name_to', name_to))
    order by lower(unit_code), change
  ), '[]'::jsonb)
  into v_units
  from unit_changes;

  select coalesce(jsonb_agg(jsonb_build_object('unit_code', t.unit_code, 'team', t.team_name)
    order by lower(t.unit_code), lower(t.team_name)), '[]'::jsonb)
  into v_teams
  from (
    select min(r.unit_code) as unit_code, min(r.team_name) as team_name
    from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id and r.team_name is not null
    group by lower(r.unit_code), lower(r.team_name)
  ) t
  where not exists (
    select 1 from public.teams tm
    join public.business_units u on u.organisation_id = tm.organisation_id and u.id = tm.unit_id
    where tm.organisation_id = v_org and lower(u.unit_code) = lower(t.unit_code)
      and lower(tm.name) = lower(t.team_name)
  );

  select coalesce(jsonb_agg(f.role_family_name order by lower(f.role_family_name)), '[]'::jsonb)
  into v_families
  from (
    select min(r.role_family_name) as role_family_name
    from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id and r.role_family_name is not null
    group by lower(r.role_family_name)
  ) f
  where not exists (
    select 1 from public.role_families rf
    where rf.organisation_id = v_org and lower(rf.name) = lower(f.role_family_name)
  );

  select count(*) into v_active_before from public.employees where organisation_id = v_org and status = 'active';
  select count(*) into v_active_after from public.directory_upload_rows where organisation_id = v_org and upload_id = p_upload_id;
  select count(*) into v_leavers from jsonb_array_elements(v_people) p where p ->> 'change' = 'leaver';

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'rows', v_active_after,
      'joiners', (select count(*) from jsonb_array_elements(v_people) p where p ->> 'change' = 'joiner'),
      'returning', (select count(*) from jsonb_array_elements(v_people) p where p ->> 'change' = 'returning'),
      'leavers', v_leavers,
      'moves', (select count(*) from jsonb_array_elements(v_people) p
                where p ->> 'change' = 'update' and (p -> 'fields' ? 'unit' or p -> 'fields' ? 'team')),
      'manager_changes', (select count(*) from jsonb_array_elements(v_people) p
                          where p ->> 'change' = 'update' and p -> 'fields' ? 'manager'),
      'updates', (select count(*) from jsonb_array_elements(v_people) p where p ->> 'change' = 'update'),
      'formal_rating_changes', (select count(*) from jsonb_array_elements(v_people) p where p -> 'fields' ? 'formal_rating'),
      'new_units', (select count(*) from jsonb_array_elements(v_units) u where u ->> 'change' = 'new'),
      'renamed_units', (select count(*) from jsonb_array_elements(v_units) u where u ->> 'change' = 'renamed'),
      'emptied_units', (select count(*) from jsonb_array_elements(v_units) u where u ->> 'change' = 'emptied'),
      'new_teams', jsonb_array_length(v_teams),
      'new_role_families', jsonb_array_length(v_families)
    ),
    'leaver_confirmation_required', v_leavers > private.leaver_confirmation_threshold(v_active_before),
    'leaver_threshold', private.leaver_confirmation_threshold(v_active_before),
    'entitlement', private.entitlement(v_org, v_active_after),
    'people', v_people,
    'units', v_units,
    'teams', v_teams,
    'role_families', v_families
  );
end
$$;

-- Formal ratings: one person's, and the readiness check's ----------------------------------------------

-- Replaces the Milestone 3 function. p_employee_id narrows the read to one person, so the edit page's
-- view is logged as that person's rating and not the whole unit's. The purpose 'check' is the
-- readiness check reading the ratings to preview the talent-density route; it is logged as
-- ratings.checked rather than a view, so "who has looked" in the ratings area counts people looking.
drop function public.read_formal_ratings(uuid, uuid, text);

create function public.read_formal_ratings(
  p_organisation_id uuid,
  p_unit_id uuid default null,
  p_purpose text default 'view',
  p_employee_id uuid default null
)
returns table (
  employee_id uuid,
  employee_ref text,
  first_name text,
  last_name text,
  unit_id uuid,
  rating_label text,
  rating_date date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if not (private.is_org_admin(p_organisation_id) or private.is_support_for(p_organisation_id)) then
    perform private.refuse('formal ratings are visible to administrators, the account owner and staff under a session');
  end if;
  if p_purpose not in ('view', 'export', 'check') then
    perform private.invalid('the purpose is view, export or check');
  end if;
  if p_purpose = 'export' and not private.recent_totp(private.step_up_minutes()) then
    perform private.refuse('confirm your authenticator code again before exporting ratings');
  end if;
  return query
    select e.id, e.employee_ref, e.first_name, e.last_name, e.unit_id, fr.rating_label, fr.rating_date
    from public.formal_ratings fr
    join public.employees e on e.organisation_id = fr.organisation_id and e.id = fr.employee_id
    where fr.organisation_id = p_organisation_id
      and (p_unit_id is null or e.unit_id = p_unit_id)
      and (p_employee_id is null or e.id = p_employee_id)
    order by lower(e.employee_ref);
  get diagnostics v_rows = row_count;
  perform private.record_event(p_organisation_id,
    'ratings.' || case p_purpose when 'export' then 'exported' when 'check' then 'checked' else 'viewed' end,
    'formal_ratings', null,
    jsonb_build_object('kind', 'formal', 'unit_id', p_unit_id, 'employee_id', p_employee_id, 'rows', v_rows));
end
$$;

-- The upload preview's formal-rating lines (PORTAL_COPY_SPEC.md S3) ----------------------------------

-- As Milestone 3, plus, per unit code in the file, its people and FTE and the people and FTE with a
-- formal rating on each rating date. The 12-month rule and the 80% test are applied by the
-- application with the intake package's own functions, so the rule has one home.
create or replace function public.directory_upload_preview(p_upload_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upload public.directory_uploads;
  v_diff jsonb;
  v_coverage jsonb;
begin
  select * into v_upload from public.directory_uploads where id = p_upload_id;
  if not found or not private.can_manage_directory(v_upload.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session preview uploads');
  end if;
  if v_upload.status <> 'staged' then
    perform private.invalid('this upload is no longer awaiting a decision');
  end if;
  v_diff := private.directory_diff(p_upload_id);

  with staged as (
    select r.unit_code, r.fte, r.formal_rating_date
    from public.directory_upload_rows r
    where r.organisation_id = v_upload.organisation_id and r.upload_id = p_upload_id
  ),
  units as (
    select lower(unit_code) as code_key, min(unit_code) as unit_code, count(*) as people, sum(fte) as fte
    from staged group by lower(unit_code)
  ),
  dates as (
    select lower(unit_code) as code_key, formal_rating_date as rating_date, count(*) as people, sum(fte) as fte
    from staged where formal_rating_date is not null
    group by lower(unit_code), formal_rating_date
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'unit_code', u.unit_code, 'people', u.people, 'fte', u.fte,
      'dates', coalesce((
        select jsonb_agg(jsonb_build_object('date', d.rating_date, 'people', d.people, 'fte', d.fte)
                         order by d.rating_date)
        from dates d where d.code_key = u.code_key
      ), '[]'::jsonb)
    ) order by u.unit_code), '[]'::jsonb)
  into v_coverage
  from units u;

  perform private.record_event(v_upload.organisation_id, 'directory.upload_previewed', 'directory_uploads',
    p_upload_id, jsonb_build_object('formal_rating_changes', v_diff -> 'summary' -> 'formal_rating_changes'));
  return v_diff || jsonb_build_object(
    'upload_id', p_upload_id,
    'preview_hash', private.diff_hash(v_diff),
    'formal_rating_coverage', v_coverage
  );
end
$$;

-- "Send me a new link" (PORTAL_BUILD_PLAN.md Milestone 4; Milestone 4 plan, Section 8) ----------------

-- One row per link sent, by account and never by address, for the cooldown. Rows older than an hour
-- are removed on every call, and an account's rows go with the account.
create table private.auth_link_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now()
);
create index auth_link_requests_user_idx on private.auth_link_requests (user_id, requested_at);
alter table private.auth_link_requests enable row level security;
comment on table private.auth_link_requests is
  'When a new sign-in link was sent to an account, for the cooldown. No address is stored.';

-- Which link, if any, a work email should be sent: 'invite' where an invitation was never taken up
-- (the account exists unconfirmed, or an open invitation has no account yet), 'recovery' where a
-- confirmed account holds a role that signs in with a password, and null otherwise: no account, a
-- manager (who signs in with a code and never holds a password), or the cooldown. The page answers
-- the same in every case, so nothing here reaches the person asking. Called by the server with the
-- secret key only.
create function public.new_link_kind(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := private.normalise_email(p_email);
  v_user_id uuid;
  v_confirmed boolean;
  v_password_role boolean;
begin
  delete from private.auth_link_requests where requested_at < now() - interval '1 hour';
  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    return null;
  end if;

  select u.id, u.email_confirmed_at is not null into v_user_id, v_confirmed
  from auth.users u where lower(u.email) = v_email;

  if v_user_id is null then
    return case when exists (
      select 1 from public.membership_invitations i
      where lower(i.email) = v_email and i.claimed_at is null and i.expires_at > now()
    ) then 'invite' end;
  end if;

  v_password_role :=
    exists (
      select 1 from public.profiles p where p.id = v_user_id and (p.is_owner or p.is_support_staff)
    )
    or exists (
      select 1 from public.org_memberships m
      where m.user_id = v_user_id and m.revoked_at is null and m.role <> 'manager_respondent'
    );
  if not v_password_role then
    return null;
  end if;

  if exists (
       select 1 from private.auth_link_requests r
       where r.user_id = v_user_id
         and r.requested_at > now() - make_interval(secs => private.new_link_cooldown_seconds())
     )
     or (select count(*) from private.auth_link_requests r where r.user_id = v_user_id)
        >= private.new_link_hourly_limit() then
    return null;
  end if;

  insert into private.auth_link_requests (user_id) values (v_user_id);
  return case when v_confirmed then 'recovery' else 'invite' end;
end
$$;

-- Audit ----------------------------------------------------------------------------------------------

insert into private.audit_image_columns (table_name, column_name) values
  ('business_units', 'unit_leader_employee_id'),
  ('role_families', 'template_code'), ('role_families', 'template_version'),
  ('decision_types', 'id'), ('decision_types', 'unit_id'), ('decision_types', 'name'),
  ('decision_types', 'from_starter_list'), ('decision_types', 'status'),
  ('critical_processes', 'id'), ('critical_processes', 'unit_id'), ('critical_processes', 'name'),
  ('critical_processes', 'status'),
  ('primary_systems', 'id'), ('primary_systems', 'unit_id'), ('primary_systems', 'name'),
  ('primary_systems', 'status'),
  ('rating_scale_maps', 'id'), ('rating_scale_maps', 'decision'), ('rating_scale_maps', 'calibrated'),
  ('rating_scale_maps', 'decided_at'),
  -- A map entry's label and band are recorded as changed but never copied: the log carries no
  -- rating vocabulary or band value, as for ratings themselves. The campaign snapshot freezes the map.
  ('rating_scale_map_entries', 'id');

create trigger decision_types_audit after insert or update or delete on public.decision_types
  for each row execute function private.audit_row_change();
create trigger critical_processes_audit after insert or update or delete on public.critical_processes
  for each row execute function private.audit_row_change();
create trigger primary_systems_audit after insert or update or delete on public.primary_systems
  for each row execute function private.audit_row_change();
create trigger rating_scale_maps_audit after insert or update or delete on public.rating_scale_maps
  for each row execute function private.audit_row_change();
create trigger rating_scale_map_entries_audit after insert or update or delete on public.rating_scale_map_entries
  for each row execute function private.audit_row_change();

-- Row level security ------------------------------------------------------------------------------

alter table public.ref_anzsic_divisions enable row level security;
alter table public.ref_templates enable row level security;
alter table public.ref_template_items enable row level security;
alter table public.decision_types enable row level security;
alter table public.critical_processes enable row level security;
alter table public.primary_systems enable row level security;
alter table public.rating_scale_maps enable row level security;
alter table public.rating_scale_map_entries enable row level security;

-- Reference data: every signed-in person reads it; nobody writes it at run time. It is not tenant data.
create policy ref_anzsic_divisions_select on public.ref_anzsic_divisions for select to authenticated
  using (true);
create policy ref_templates_select on public.ref_templates for select to authenticated
  using (true);
create policy ref_template_items_select on public.ref_template_items for select to authenticated
  using (true);

-- The unit context, as knowledge_domains.
create policy decision_types_select on public.decision_types for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy decision_types_insert on public.decision_types for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy decision_types_update on public.decision_types for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy critical_processes_select on public.critical_processes for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy critical_processes_insert on public.critical_processes for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy critical_processes_update on public.critical_processes for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy primary_systems_select on public.primary_systems for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy primary_systems_insert on public.primary_systems for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy primary_systems_update on public.primary_systems for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

-- The scale map: the people who manage the directory, and nobody else.
create policy rating_scale_maps_select on public.rating_scale_maps for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy rating_scale_maps_insert on public.rating_scale_maps for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy rating_scale_maps_update on public.rating_scale_maps for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy rating_scale_map_entries_select on public.rating_scale_map_entries for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy rating_scale_map_entries_insert on public.rating_scale_map_entries for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy rating_scale_map_entries_update on public.rating_scale_map_entries for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy rating_scale_map_entries_delete on public.rating_scale_map_entries for delete to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

-- Grants -----------------------------------------------------------------------------------------

grant select on public.ref_anzsic_divisions to authenticated;
grant select on public.ref_templates to authenticated;
grant select on public.ref_template_items to authenticated;

-- Updates are column-level, so no row moves to another organisation or unit.
grant update (unit_leader_employee_id) on public.business_units to authenticated;
grant select, insert on public.decision_types to authenticated;
grant update (name, status) on public.decision_types to authenticated;
grant select, insert on public.critical_processes to authenticated;
grant update (name, status) on public.critical_processes to authenticated;
grant select, insert on public.primary_systems to authenticated;
grant update (name, status) on public.primary_systems to authenticated;
grant select on public.rating_scale_maps to authenticated;
grant insert (organisation_id, decision, calibrated) on public.rating_scale_maps to authenticated;
grant update (decision, calibrated) on public.rating_scale_maps to authenticated;
grant select, delete on public.rating_scale_map_entries to authenticated;
grant insert (organisation_id, label, band) on public.rating_scale_map_entries to authenticated;
grant update (band) on public.rating_scale_map_entries to authenticated;

grant execute on function public.read_formal_ratings(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.new_link_kind(text) to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
