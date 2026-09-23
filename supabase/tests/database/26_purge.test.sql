-- The purge of deactivated directory records (DECISIONS.md 2.5 and 5.2; Online Measurement
-- Specification Part 7; Milestone 3 plan, Section 5.6).
--
-- A record deactivated 30 or more days ago (Sydney calendar) is purged: its manager membership is
-- revoked, its snapshot rows are redacted so they stay distinct, its formal rating and the record
-- itself are deleted, links to it become null, and an account left with no membership is deleted.
-- Nothing else is deleted, no row audit is written for the link clearing, and each organisation
-- gets one event with the counts. Ratings about the person, and a manager's sessions, are kept with
-- the link removed, so earlier inputs stay reproducible. In the fixture, E019 (a manager with an
-- account in Alpha, and rated in the closed campaign) was deactivated 31 days ago and E020 29 days
-- ago, in both organisations.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(17);

select tests.seed_fixture();

create function pg_temp.row_counts()
returns table (tbl text, n integer)
language sql
as $$
  select c.relname::text,
         (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text::integer
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r'
  union all
  select 'auth.users', (select count(*)::integer from auth.users)
$$;

create temp table before as select * from pg_temp.row_counts();
create temp table row_audit_before as select count(*)::integer as n from public.audit_logs where action like 'row.%';
create temp table redacted_ids as
  select id from public.snapshot_members where employee_id in (tests.id('alpha_E019'), tests.id('beta_E019'));

select is(
  tests.value_as('service', 'select (public.purge_deactivated_employees() ->> ''records_purged'')'),
  '2',
  'the purge takes the two records deactivated 31 days ago, one per organisation'
);

create temp table after as select * from pg_temp.row_counts();

select is_empty(
  $$
    select b.tbl, a.n - b.n as delta
    from before b join after a using (tbl)
    where a.n - b.n <> coalesce((
      select d from (values
        ('employees', -2), ('formal_ratings', -2), ('org_memberships', -1), ('profiles', -1),
        ('auth.users', -1), ('audit_logs', 2)
      ) as expected (t, d) where t = b.tbl
    ), 0)
  $$,
  'nothing else is deleted: two records and their formal ratings, one manager account and its membership, two events'
);

select is((select status from public.employees where id = tests.id('alpha_E020')), 'inactive',
  'a record deactivated 29 days ago is kept');
select ok(not exists (select 1 from public.employees where id = tests.id('alpha_E019')), 'the purged record is gone');

select results_eq(
  $$
    select count(*)::integer, count(distinct employee_ref)::integer,
           bool_and(employee_ref = 'purged:' || id::text), bool_and(first_name is null and last_name is null and role_title is null),
           bool_and(employee_id is null), bool_and(redacted_at is not null)
    from public.snapshot_members where id in (select id from redacted_ids)
  $$,
  $$ values (2, 2, true, true, true, true) $$,
  'its snapshot rows are redacted, unlinked and still distinct'
);
select is(
  (select count(*)::integer from public.snapshot_formal_ratings where snapshot_member_id in (select id from redacted_ids)),
  2,
  'the frozen formal ratings behind earlier campaigns are kept, attached to the redacted rows'
);
select is(
  (select count(*)::integer from public.snapshot_members sm where sm.snapshot_id = tests.id('alpha_closed_snapshot')),
  20,
  'every snapshot keeps its size'
);

select results_eq(
  $$
    select (select count(*)::integer from public.skill_ratings where subject_snapshot_member_id in (select id from redacted_ids) and employee_id is null),
           (select count(*)::integer from public.knowledge_ratings where subject_snapshot_member_id in (select id from redacted_ids) and employee_id is null),
           (select count(*)::integer from public.talent_bands where subject_snapshot_member_id in (select id from redacted_ids) and employee_id is null)
  $$,
  $$ values (2, 2, 2) $$,
  'ratings about the purged person are kept, in a closed campaign, with the link to them removed'
);
select is(
  (select manager_employee_id from public.rating_sessions where id = tests.id('alpha_closed_session_gone')),
  null,
  'the purged manager''s rating session is kept, unlinked from them'
);
select ok(not exists (select 1 from auth.users where id = tests.user_id('alpha_gone_mgr')),
  'the purged manager''s account, left with no membership, is deleted');
select is(
  (select count(*)::integer from public.audit_logs where action like 'row.%'),
  (select n from row_audit_before),
  'clearing the links writes no row audit'
);
select results_eq(
  $$ select detail from public.audit_logs where action = 'directory.employees_purged' and organisation_id = tests.id('alpha') $$,
  $$ values ('{"records": 1, "accounts_deleted": 1, "memberships_revoked": 1, "snapshot_rows_redacted": 1}'::jsonb) $$,
  'each organisation sees one event with the counts'
);
select is(
  (select actor_kind from public.audit_logs where action = 'directory.employees_purged' and organisation_id = tests.id('alpha')),
  'system',
  'the event is recorded against the system'
);

select is(
  tests.value_as('service', 'select (public.purge_deactivated_employees() ->> ''records_purged'')'),
  '0',
  'running the purge again purges nothing more'
);
select is(
  tests.value_as('service', format('select (public.purge_deactivated_employees(%L::date) ->> ''records_purged'')', tests.today() + 1)),
  '2',
  'the next day, the records deactivated 29 days before today reach 30 days and are purged'
);

select is(tests.attempt('alpha_admin', 'select public.purge_deactivated_employees()'), 'denied',
  'only the service role runs the purge');
select is(tests.attempt('anon', 'select public.purge_deactivated_employees()'), 'denied',
  'and never anonymously');

select * from finish();

rollback;
