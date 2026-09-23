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
