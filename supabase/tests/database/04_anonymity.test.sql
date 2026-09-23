-- Anonymous responses are structurally unlinkable to a person and unreadable by every role
-- (CLAUDE.md Section 4; PORTAL_BUILD_PLAN.md 3.4 and 14; Milestone 3 plan, Section 4).
--
-- The anonymous tables hold exactly the reviewed columns: no timestamp, no invitation, token,
-- person or session reference. Their foreign keys reach only unit-level parents, and only the item
-- table references the response table. No function or view in our schemas mentions them (Milestone
-- 5 adds exactly two, the ingestion and the close read, to the allowlist). No Data API role holds
-- any privilege on them, the service role included, and every persona is refused every command.
-- Invitations record that someone responded, never when, and are read by nobody directly.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(16);

select tests.seed_fixture();

-- The reviewed columns. Adding one fails here until the list changes in the same commit.
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'survey_responses' $$,
  array['id', 'organisation_id', 'campaign_unit_id', 'audience', 'team_id', 'completion_seconds'],
  'survey_responses holds exactly the reviewed columns'
);
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'survey_item_responses' $$,
  array['id', 'organisation_id', 'response_id', 'item_code', 'process_id', 'value'],
  'survey_item_responses holds exactly the reviewed columns'
);
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'invitations' $$,
  array['id', 'organisation_id', 'campaign_unit_id', 'audience', 'snapshot_member_id', 'email', 'token_hash',
        'status', 'sent_at', 'reminder_count', 'last_reminded_at'],
  'invitations hold exactly the reviewed columns, with no completion time'
);

-- Keys.
create temp view anonymous_keys as
  select src.relname::text as source, dst.relname::text as target
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_class dst on dst.oid = con.confrelid
  join pg_namespace n on n.oid = src.relnamespace
  where con.contype = 'f' and n.nspname = 'public';

select set_eq(
  $$ select target from anonymous_keys where source = 'survey_responses' $$,
  array['organisations', 'campaign_units', 'teams'],
  'a response references only its organisation, campaign unit and self-selected team'
);
select set_eq(
  $$ select target from anonymous_keys where source = 'survey_item_responses' $$,
  array['organisations', 'survey_responses'],
  'an item response references only its organisation and response'
);
select set_eq(
  $$ select source from anonymous_keys where target in ('survey_responses', 'survey_item_responses') $$,
  array['survey_item_responses'],
  'nothing references the anonymous tables except the item table'
);
select is(
  (select count(*)::integer from pg_attrdef d
   join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
   where d.adrelid in ('public.survey_responses'::regclass, 'public.survey_item_responses'::regclass)
     and a.attname = 'id' and pg_get_expr(d.adbin, d.adrelid) = 'gen_random_uuid()'),
  2,
  'response identifiers are random, never a sequence'
);

-- No reader.
select is_empty(
  $$
    select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ 'survey_(item_)?responses'
  $$,
  'no function in public or private reads or writes the anonymous tables (the allowlist is empty until Milestone 5)'
);
select is_empty(
  $$ select viewname from pg_views where schemaname in ('public', 'private') and definition ~ 'survey_(item_)?responses' $$,
  'no view exposes them'
);
select is_empty(
  $$
    select r.rolname, c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated'), ('service_role')) as r (rolname)
    where n.nspname = 'public' and c.relname in ('survey_responses', 'survey_item_responses', 'invitations')
      and (has_table_privilege(r.rolname, c.oid, 'select, insert, update, delete, truncate, references, trigger')
           or has_any_column_privilege(r.rolname, c.oid, 'select, insert, update, references'))
  $$,
  'no Data API role, the service role included, holds any privilege on the anonymous tables or invitations'
);

-- Every persona is refused every command, the Owner and staff under a session included.
insert into public.support_sessions (organisation_id, staff_user_id, staff_name, staff_email, kind, reason, expires_at)
values (tests.id('alpha'), tests.user_id('owner'), 'Owner', 'owner@pvp.test', 'owner', 'Checking anonymity holds', now() + interval '1 hour');

create temp table writes (
  label text, stmt text,
  alpha_ao text, alpha_admin text, alpha_exec text, alpha_uv text, alpha_mgr text,
  owner text, support_a text, outsider text, anon text, service text
);
insert into writes
select label, stmt, 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'
from (values
  ('read responses', 'select count(*) from public.survey_responses'),
  ('read item responses', 'select count(*) from public.survey_item_responses'),
  ('write a response', $$insert into public.survey_responses (organisation_id, campaign_unit_id, audience)
     select organisation_id, id, 'members_part_a' from public.campaign_units limit 1$$),
  ('change a response', 'update public.survey_item_responses set value = 5'),
  ('delete responses', 'delete from public.survey_responses'),
  ('read invitations', 'select count(*) from public.invitations'),
  ('change an invitation', $$update public.invitations set status = 'responded'$$)
) as v (label, stmt);

select is_empty(
  $$ select * from tests.write_mismatches('writes') where label like '%response%' $$,
  'every role is refused every command on the anonymous responses'
);
select is_empty(
  $$ select * from tests.write_mismatches('writes') where label like '%invitation%' $$,
  'and on invitations'
);

-- What administrators see instead: counts, never a person.
select results_eq(
  $$
    select u.unit_code, c.audience, c.sent, c.responded
    from (select tests.value_as('alpha_admin', format('select jsonb_agg(to_jsonb(c)) from public.invitation_status_counts(%L) c', tests.id('alpha_open')))::jsonb as j) x
    cross join lateral jsonb_to_recordset(x.j) as c (unit_id uuid, audience text, sent integer, responded integer)
    join public.business_units u on u.id = c.unit_id
    order by u.unit_code
  $$,
  $$ values ('C1'::text, 'members_part_a'::text, 3, 3), ('C2', 'members_part_a', 4, 0) $$,
  'administrators see invitation status counts per unit and audience'
);
select is(
  tests.attempt('alpha_exec', format('select * from public.invitation_status_counts(%L)', tests.id('alpha_open'))),
  'denied',
  'an executive viewer does not'
);
select is(
  tests.attempt('beta_ao', format('select * from public.invitation_status_counts(%L)', tests.id('alpha_open'))),
  'denied',
  'nor does another organisation'
);

-- The fixture really does hold responses (the refusals above are not vacuous).
select is((select count(*)::integer from public.survey_responses where organisation_id = tests.id('alpha')), 5,
  'the fixture holds anonymous responses for every refusal above to be tested against');

select * from finish();

rollback;
