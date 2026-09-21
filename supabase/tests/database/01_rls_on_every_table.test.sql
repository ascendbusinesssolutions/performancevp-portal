-- Standing invariant: every table in the public schema has row level security enabled.
--
-- CLAUDE.md Section 4 and PORTAL_BUILD_PLAN.md 3.1: RLS on every table, no exceptions, deny by
-- default. This test passes vacuously at Milestone 0, when there are no tables, and fails the
-- moment a migration creates one without enabling RLS. Whether RLS is also forced for the
-- table owner is decided with the policies in Milestone 3.
begin;

select plan(1);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public has row level security enabled'
);

select * from finish();

rollback;
