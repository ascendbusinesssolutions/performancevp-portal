-- Standing invariant: every table in the schemas this project owns has row level security enabled.
--
-- CLAUDE.md Section 4 and PORTAL_BUILD_PLAN.md 3.1: RLS on every table, no exceptions, deny by
-- default. It fails the moment a migration creates a table without enabling RLS.
--
-- RLS is enabled, not forced (decided in Milestone 3; see the foundations migration). Every table
-- is owned by `postgres`, which the Data API never uses, and 02_privileges asserts that ownership.
begin;

select plan(1);

select is_empty(
  $$
    select format('%I.%I', n.nspname, c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public and private has row level security enabled'
);

select * from finish();

rollback;
