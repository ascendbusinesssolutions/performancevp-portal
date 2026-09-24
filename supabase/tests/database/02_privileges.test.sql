-- Standing invariants on privileges (PORTAL_BUILD_PLAN.md 3.1; Milestone 3 plan, Section 3.1).
--
-- `anon` holds nothing in the schemas this project owns. PUBLIC holds no execute right on any of
-- our functions. `authenticated` and `service_role` hold exactly the grants listed below, table by
-- table, column by column and function by function, so a grant nobody reviewed fails the suite.
-- Every relation is owned by `postgres`; `anon` and `authenticated` cannot bypass row security;
-- every security-definer function pins its search_path; every view runs as its invoker.
begin;

select plan(12);

-- Our objects: public and private, less anything an extension installed.
create temp view our_relations as
  select c.oid, n.nspname, c.relname, c.relkind, c.relowner, c.relacl, c.reloptions
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
    and not exists (
      select 1 from pg_depend d
      where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e'
    );

create temp view our_functions as
  select p.oid, n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not exists (
      select 1 from pg_depend d
      where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
    );

-- 1 to 5: anon holds nothing.
select is_empty(
  $$
    select format('%I.%I', nspname, relname) from our_relations
    where case when relkind <> 'S'
      then has_table_privilege('anon', oid, 'select, insert, update, delete, truncate, references, trigger')
      else false end
  $$,
  'anon holds no privilege on any table or view'
);

select is_empty(
  $$
    select format('%I.%I', nspname, relname) from our_relations
    where case when relkind <> 'S'
      then has_any_column_privilege('anon', oid, 'select, insert, update, references')
      else false end
  $$,
  'anon holds no privilege on any column'
);

select is_empty(
  $$
    select format('%I.%I', nspname, relname) from our_relations
    where case when relkind = 'S' then has_sequence_privilege('anon', oid, 'usage, select, update') else false end
  $$,
  'anon holds no privilege on any sequence'
);

select is_empty(
  $$ select oid::regprocedure::text from our_functions where has_function_privilege('anon', oid, 'execute') $$,
  'anon can execute none of our functions'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon has no usage on the private schema'
);

-- 6: PUBLIC holds no execute right (a null ACL means the default, which grants it).
select is_empty(
  $$
    select oid::regprocedure::text from our_functions
    where proacl is null
       or exists (select 1 from aclexplode(proacl) a where a.grantee = 0)
  $$,
  'PUBLIC can execute none of our functions'
);

-- 7: the exact grant list for authenticated and service_role.
create temp table expected_grants (object text, grantee text, privilege text);

-- Tables and views: 'schema.table'. Columns: 'schema.table(column)'. Functions: their signature.
-- Each step of Milestone 3 adds its rows here beside the tables it creates.
-- (Step 1 creates no object that any Data API role may use.)

-- Step 2: identity, tenancy, plan and staff access.
insert into expected_grants values
  ('public.organisations', 'authenticated', 'SELECT'),
  ('public.organisations(name)', 'authenticated', 'UPDATE'),
  ('public.organisations(anzsic_division)', 'authenticated', 'UPDATE'),
  ('public.organisations(anzsic_class)', 'authenticated', 'UPDATE'),
  ('public.organisations(size_band)', 'authenticated', 'UPDATE'),
  ('public.ref_employee_bands', 'authenticated', 'SELECT'),
  ('public.subscriptions', 'authenticated', 'SELECT'),
  ('public.profiles', 'authenticated', 'SELECT'),
  ('public.profiles(full_name)', 'authenticated', 'UPDATE'),
  ('public.org_memberships', 'authenticated', 'SELECT'),
  ('public.membership_invitations', 'authenticated', 'SELECT'),
  ('public.support_sessions', 'authenticated', 'SELECT'),
  ('private.org_ids(text[])', 'authenticated', 'EXECUTE'),
  ('private.writable_org_ids(text[])', 'authenticated', 'EXECUTE'),
  ('private.account_owner_org_ids()', 'authenticated', 'EXECUTE'),
  ('private.support_org_ids()', 'authenticated', 'EXECUTE'),
  ('private.support_writable_org_ids()', 'authenticated', 'EXECUTE'),
  ('private.is_staff()', 'authenticated', 'EXECUTE'),
  ('private.is_owner()', 'authenticated', 'EXECUTE'),
  ('private.is_support_staff()', 'authenticated', 'EXECUTE'),
  ('private.visible_profile_ids()', 'authenticated', 'EXECUTE'),
  ('my_access()', 'authenticated', 'EXECUTE');

-- Step 3: the audit trail and the identity functions.
insert into expected_grants values
  ('public.audit_logs', 'authenticated', 'SELECT'),
  ('provision_organisation(text,text,date,date,date,text,text)', 'authenticated', 'EXECUTE'),
  ('record_subscription_term(uuid,text,date,date,date,text)', 'authenticated', 'EXECUTE'),
  ('set_subscription_override(uuid,text,text)', 'authenticated', 'EXECUTE'),
  ('set_support_staff(uuid,boolean)', 'authenticated', 'EXECUTE'),
  ('open_support_session(uuid,text)', 'authenticated', 'EXECUTE'),
  ('close_support_session(uuid)', 'authenticated', 'EXECUTE'),
  ('set_data_contribution_opt_out(uuid,boolean)', 'authenticated', 'EXECUTE'),
  ('invite_member(uuid,text,text,uuid[])', 'authenticated', 'EXECUTE'),
  ('revoke_membership(uuid)', 'authenticated', 'EXECUTE'),
  ('replace_account_owner(uuid,text)', 'authenticated', 'EXECUTE'),
  ('reset_factors(uuid)', 'authenticated', 'EXECUTE');

-- Step 4: structure and the context parents.
insert into expected_grants values
  ('public.business_units', 'authenticated', 'SELECT'),
  ('public.business_units', 'authenticated', 'INSERT'),
  ('public.business_units(name)', 'authenticated', 'UPDATE'),
  ('public.business_units(parent_unit_id)', 'authenticated', 'UPDATE'),
  ('public.business_units(unit_type)', 'authenticated', 'UPDATE'),
  ('public.business_units(status)', 'authenticated', 'UPDATE'),
  ('public.business_units(retired_on)', 'authenticated', 'UPDATE'),
  ('public.teams', 'authenticated', 'SELECT'),
  ('public.teams', 'authenticated', 'INSERT'),
  ('public.teams(name)', 'authenticated', 'UPDATE'),
  ('public.teams(status)', 'authenticated', 'UPDATE'),
  ('public.unit_lineage', 'authenticated', 'SELECT'),
  ('public.role_families', 'authenticated', 'SELECT'),
  ('public.role_families', 'authenticated', 'INSERT'),
  ('public.role_families(name)', 'authenticated', 'UPDATE'),
  ('public.role_families(is_people_leader)', 'authenticated', 'UPDATE'),
  ('public.role_families(status)', 'authenticated', 'UPDATE'),
  ('public.skills', 'authenticated', 'SELECT'),
  ('public.skills', 'authenticated', 'INSERT'),
  ('public.skills(name)', 'authenticated', 'UPDATE'),
  ('public.skills(is_critical)', 'authenticated', 'UPDATE'),
  ('public.skills(kind)', 'authenticated', 'UPDATE'),
  ('public.skills(status)', 'authenticated', 'UPDATE'),
  ('public.knowledge_domains', 'authenticated', 'SELECT'),
  ('public.knowledge_domains', 'authenticated', 'INSERT'),
  ('public.knowledge_domains(name)', 'authenticated', 'UPDATE'),
  ('public.knowledge_domains(criticality)', 'authenticated', 'UPDATE'),
  ('public.knowledge_domains(status)', 'authenticated', 'UPDATE'),
  ('public.unit_access', 'authenticated', 'SELECT'),
  ('private.viewable_unit_ids()', 'authenticated', 'EXECUTE'),
  ('private.can_view_unit(uuid)', 'authenticated', 'EXECUTE'),
  ('record_unit_lineage(uuid,text,uuid[],uuid[],date)', 'authenticated', 'EXECUTE'),
  ('set_unit_access(uuid,uuid[])', 'authenticated', 'EXECUTE');

-- Step 5: the directory, uploads, snapshots and the purge.
insert into expected_grants values
  ('public.employees', 'authenticated', 'SELECT'),
  ('public.employees', 'authenticated', 'INSERT'),
  ('public.employees(first_name)', 'authenticated', 'UPDATE'),
  ('public.employees(last_name)', 'authenticated', 'UPDATE'),
  ('public.employees(work_email)', 'authenticated', 'UPDATE'),
  ('public.employees(unit_id)', 'authenticated', 'UPDATE'),
  ('public.employees(team_id)', 'authenticated', 'UPDATE'),
  ('public.employees(manager_employee_id)', 'authenticated', 'UPDATE'),
  ('public.employees(role_title)', 'authenticated', 'UPDATE'),
  ('public.employees(role_family_id)', 'authenticated', 'UPDATE'),
  ('public.employees(start_date)', 'authenticated', 'UPDATE'),
  ('public.employees(fte)', 'authenticated', 'UPDATE'),
  ('public.employees(is_team_leader)', 'authenticated', 'UPDATE'),
  ('public.employees(is_leadership_team)', 'authenticated', 'UPDATE'),
  ('public.employees(employment_status)', 'authenticated', 'UPDATE'),
  ('public.employees(status)', 'authenticated', 'UPDATE'),
  ('public.directory_uploads', 'authenticated', 'SELECT'),
  ('public.campaigns', 'authenticated', 'SELECT'),
  ('public.campaign_units', 'authenticated', 'SELECT'),
  ('public.directory_snapshots', 'authenticated', 'SELECT'),
  ('public.snapshot_members', 'authenticated', 'SELECT'),
  ('private.my_employee_ids()', 'authenticated', 'EXECUTE'),
  ('private.my_rated_campaign_ids()', 'authenticated', 'EXECUTE'),
  ('directory_upload_preview(uuid)', 'authenticated', 'EXECUTE'),
  ('apply_directory_upload(uuid,text,boolean)', 'authenticated', 'EXECUTE'),
  ('discard_directory_upload(uuid)', 'authenticated', 'EXECUTE'),
  ('set_formal_rating(uuid,text,date)', 'authenticated', 'EXECUTE'),
  ('read_formal_ratings(uuid,uuid,text,uuid)', 'authenticated', 'EXECUTE'),
  ('stage_directory_upload(uuid,uuid,uuid,text,integer,text,text,text,jsonb,jsonb)', 'service_role', 'EXECUTE'),
  ('purge_deactivated_employees(date)', 'service_role', 'EXECUTE'),
  ('expire_directory_uploads()', 'service_role', 'EXECUTE'),
  ('uploads_awaiting_file_removal()', 'service_role', 'EXECUTE'),
  ('mark_upload_file_removed(uuid)', 'service_role', 'EXECUTE');

-- Step 6: invitations, anonymous responses and identified ratings. The anonymous tables and
-- invitations have no grant for any role.
insert into expected_grants values
  ('public.rating_sessions', 'authenticated', 'SELECT'),
  ('public.skill_ratings', 'authenticated', 'SELECT'),
  ('public.skill_ratings', 'authenticated', 'DELETE'),
  ('public.skill_ratings(organisation_id)', 'authenticated', 'INSERT'),
  ('public.skill_ratings(rating_session_id)', 'authenticated', 'INSERT'),
  ('public.skill_ratings(subject_snapshot_member_id)', 'authenticated', 'INSERT'),
  ('public.skill_ratings(skill_id)', 'authenticated', 'INSERT'),
  ('public.skill_ratings(rating)', 'authenticated', 'INSERT'),
  ('public.skill_ratings(evidence_note)', 'authenticated', 'INSERT'),
  ('public.skill_ratings(rating)', 'authenticated', 'UPDATE'),
  ('public.skill_ratings(evidence_note)', 'authenticated', 'UPDATE'),
  ('public.knowledge_ratings', 'authenticated', 'SELECT'),
  ('public.knowledge_ratings', 'authenticated', 'DELETE'),
  ('public.knowledge_ratings(organisation_id)', 'authenticated', 'INSERT'),
  ('public.knowledge_ratings(rating_session_id)', 'authenticated', 'INSERT'),
  ('public.knowledge_ratings(subject_snapshot_member_id)', 'authenticated', 'INSERT'),
  ('public.knowledge_ratings(knowledge_domain_id)', 'authenticated', 'INSERT'),
  ('public.knowledge_ratings(rating)', 'authenticated', 'INSERT'),
  ('public.knowledge_ratings(evidence_note)', 'authenticated', 'INSERT'),
  ('public.knowledge_ratings(rating)', 'authenticated', 'UPDATE'),
  ('public.knowledge_ratings(evidence_note)', 'authenticated', 'UPDATE'),
  ('public.talent_bands', 'authenticated', 'SELECT'),
  ('public.talent_bands', 'authenticated', 'DELETE'),
  ('public.talent_bands(organisation_id)', 'authenticated', 'INSERT'),
  ('public.talent_bands(rating_session_id)', 'authenticated', 'INSERT'),
  ('public.talent_bands(subject_snapshot_member_id)', 'authenticated', 'INSERT'),
  ('public.talent_bands(band)', 'authenticated', 'INSERT'),
  ('public.talent_bands(evidence_note)', 'authenticated', 'INSERT'),
  ('public.talent_bands(band)', 'authenticated', 'UPDATE'),
  ('public.talent_bands(evidence_note)', 'authenticated', 'UPDATE'),
  ('private.my_rating_session_ids()', 'authenticated', 'EXECUTE'),
  ('private.my_open_rating_session_ids()', 'authenticated', 'EXECUTE'),
  ('read_skill_ratings(uuid,uuid,uuid,uuid,text)', 'authenticated', 'EXECUTE'),
  ('read_knowledge_ratings(uuid,uuid,uuid,uuid,text)', 'authenticated', 'EXECUTE'),
  ('read_talent_bands(uuid,uuid,uuid,uuid,text)', 'authenticated', 'EXECUTE'),
  ('invitation_status_counts(uuid)', 'authenticated', 'EXECUTE');

-- Step 8: the consoles.
insert into expected_grants values
  ('staff_organisations()', 'authenticated', 'EXECUTE'),
  ('designate_support_staff(text)', 'authenticated', 'EXECUTE');

-- Step 9: the directory screens and the daily job.
insert into expected_grants values
  ('can_manage_directory(uuid)', 'authenticated', 'EXECUTE'),
  ('record_job_run(text,jsonb)', 'service_role', 'EXECUTE');

-- Milestone 4: the setup flows. read_formal_ratings gained p_employee_id (above).
insert into expected_grants values
  ('public.ref_anzsic_divisions', 'authenticated', 'SELECT'),
  ('public.ref_templates', 'authenticated', 'SELECT'),
  ('public.ref_template_items', 'authenticated', 'SELECT'),
  ('public.business_units(unit_leader_employee_id)', 'authenticated', 'UPDATE'),
  ('public.decision_types', 'authenticated', 'SELECT'),
  ('public.decision_types', 'authenticated', 'INSERT'),
  ('public.decision_types(name)', 'authenticated', 'UPDATE'),
  ('public.decision_types(status)', 'authenticated', 'UPDATE'),
  ('public.critical_processes', 'authenticated', 'SELECT'),
  ('public.critical_processes', 'authenticated', 'INSERT'),
  ('public.critical_processes(name)', 'authenticated', 'UPDATE'),
  ('public.critical_processes(status)', 'authenticated', 'UPDATE'),
  ('public.primary_systems', 'authenticated', 'SELECT'),
  ('public.primary_systems', 'authenticated', 'INSERT'),
  ('public.primary_systems(name)', 'authenticated', 'UPDATE'),
  ('public.primary_systems(status)', 'authenticated', 'UPDATE'),
  ('public.rating_scale_maps', 'authenticated', 'SELECT'),
  ('public.rating_scale_maps(organisation_id)', 'authenticated', 'INSERT'),
  ('public.rating_scale_maps(decision)', 'authenticated', 'INSERT'),
  ('public.rating_scale_maps(calibrated)', 'authenticated', 'INSERT'),
  ('public.rating_scale_maps(decision)', 'authenticated', 'UPDATE'),
  ('public.rating_scale_maps(calibrated)', 'authenticated', 'UPDATE'),
  ('public.rating_scale_map_entries', 'authenticated', 'SELECT'),
  ('public.rating_scale_map_entries', 'authenticated', 'DELETE'),
  ('public.rating_scale_map_entries(organisation_id)', 'authenticated', 'INSERT'),
  ('public.rating_scale_map_entries(label)', 'authenticated', 'INSERT'),
  ('public.rating_scale_map_entries(band)', 'authenticated', 'INSERT'),
  ('public.rating_scale_map_entries(band)', 'authenticated', 'UPDATE'),
  ('new_link_kind(text)', 'service_role', 'EXECUTE');

-- Milestone 4b: measurement units. Written through the three functions, apart from a combined
-- unit's name and leader. invitation_status_counts was replaced to report measurement units (above).
insert into expected_grants values
  ('public.measurement_units', 'authenticated', 'SELECT'),
  ('public.measurement_units(name)', 'authenticated', 'UPDATE'),
  ('public.measurement_units(unit_leader_employee_id)', 'authenticated', 'UPDATE'),
  ('public.measurement_unit_members', 'authenticated', 'SELECT'),
  ('public.measurement_unit_lineage', 'authenticated', 'SELECT'),
  ('private.viewable_measurement_unit_ids()', 'authenticated', 'EXECUTE'),
  ('private.can_view_measurement_unit(uuid)', 'authenticated', 'EXECUTE'),
  ('combine_measurement_units(uuid,uuid[],text)', 'authenticated', 'EXECUTE'),
  ('undo_measurement_unit(uuid,uuid)', 'authenticated', 'EXECUTE'),
  ('keep_grouping_unit(uuid,uuid,boolean)', 'authenticated', 'EXECUTE');

-- Milestone 5, step 1: the instrument as reference data, read by every signed-in person.
insert into expected_grants values
  ('public.ref_survey_sections', 'authenticated', 'SELECT'),
  ('public.ref_survey_items', 'authenticated', 'SELECT'),
  ('public.ref_pulse_rotation', 'authenticated', 'SELECT'),
  ('public.ref_modules', 'authenticated', 'SELECT'),
  ('public.ref_module_items', 'authenticated', 'SELECT'),
  ('public.ref_admin_checklists', 'authenticated', 'SELECT'),
  ('public.ref_admin_checklist_facts', 'authenticated', 'SELECT'),
  ('public.ref_admin_checklist_values', 'authenticated', 'SELECT'),
  ('public.ref_admin_checklist_bands', 'authenticated', 'SELECT'),
  ('public.ref_event_triggers', 'authenticated', 'SELECT');

create temp view actual_grants as
  select format('%I.%I', r.nspname, r.relname) as object, a.grantee::regrole::text as grantee,
         a.privilege_type as privilege
  from our_relations r
  cross join lateral aclexplode(r.relacl) a
  where a.grantee in (select oid from pg_roles where rolname in ('authenticated', 'service_role'))
  union all
  select format('%I.%I(%I)', r.nspname, r.relname, att.attname), a.grantee::regrole::text,
         a.privilege_type
  from our_relations r
  join pg_attribute att on att.attrelid = r.oid and att.attnum > 0 and not att.attisdropped
  cross join lateral aclexplode(att.attacl) a
  where a.grantee in (select oid from pg_roles where rolname in ('authenticated', 'service_role'))
  union all
  select f.oid::regprocedure::text, a.grantee::regrole::text, a.privilege_type
  from our_functions f
  cross join lateral aclexplode(f.proacl) a
  where a.grantee in (select oid from pg_roles where rolname in ('authenticated', 'service_role'));

select set_eq(
  'select object, grantee, privilege from actual_grants',
  'select object, grantee, privilege from expected_grants',
  'authenticated and service_role hold exactly the reviewed grants'
);

-- 8: ownership.
select is_empty(
  $$
    select format('%I.%I', nspname, relname) from our_relations
    where relowner <> 'postgres'::regrole
  $$,
  'every relation in public and private is owned by postgres'
);

-- 9 and 10: who can bypass row security.
select is_empty(
  $$
    select rolname from pg_roles
    where rolname in ('anon', 'authenticated') and (rolbypassrls or rolsuper)
  $$,
  'anon and authenticated cannot bypass row security'
);

select ok(
  (select rolbypassrls from pg_roles where rolname = 'service_role'),
  'service_role bypasses row security, which is why it is granted nothing on the anonymous tables'
);

-- 11: security-definer functions pin their search path.
select is_empty(
  $$
    select oid::regprocedure::text from our_functions
    where prosecdef
      and not exists (select 1 from unnest(proconfig) c where c like 'search\_path=%')
  $$,
  'every security-definer function sets its search_path'
);

-- 12: views run with the privileges and row security of the caller.
select is_empty(
  $$
    select format('%I.%I', nspname, relname) from our_relations
    where relkind = 'v'
      and not coalesce(
        reloptions && array['security_invoker=true', 'security_invoker=on', 'security_invoker=1'],
        false
      )
  $$,
  'every view is security_invoker'
);

select * from finish();

rollback;
