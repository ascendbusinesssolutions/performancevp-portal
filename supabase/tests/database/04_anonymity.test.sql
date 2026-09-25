-- Anonymous responses are structurally unlinkable to a person and unreadable by every role
-- (CLAUDE.md Section 4; PORTAL_BUILD_PLAN.md 3.4 and 14; Milestone 3 plan, Section 4; Milestone 5
-- plan, Section 4 and D4).
--
-- Structure: the anonymous tables hold exactly the reviewed columns, with no time, invitation, token
-- or person; their keys reach only unit-level parents; exactly two functions touch them
-- (ingest_survey_response and close_campaign_responses); no Data API role holds any privilege on
-- them, on the invitations or on the live tokens, and no trigger writes about them.
--
-- The lifecycle: a campaign is launched, its tokens issued, responses submitted, and the campaign
-- closed, settled and rewritten. At no point does an invitation record that its person responded;
-- a spent token cannot be reused; after close the invitations and tokens are gone, no response keeps
-- the identifier it was written with, and no value anywhere outside the anonymous tables is a
-- response identifier or a token hash. What a response still shares with person-related data is its
-- campaign unit and, for a team of four or more, its team key.
--
-- One limit of a single-transaction test: every row here carries the same transaction identifier,
-- so that the rewrite gives all of a campaign's rows one identifier is shown by the vertical slice
-- (Milestone 5 plan, Section 7), which runs across real transactions.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(30);

select tests.seed_fixture();

-- 1 to 5: the reviewed columns. Adding one fails here until the list changes in the same commit.
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'survey_responses' $$,
  array['id', 'organisation_id', 'campaign_unit_id', 'audience', 'campaign_team_id', 'completion_seconds'],
  'survey_responses holds exactly the reviewed columns'
);
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'survey_item_responses' $$,
  array['id', 'organisation_id', 'response_id', 'item_code', 'process_id', 'decision_type_id', 'value'],
  'survey_item_responses holds exactly the reviewed columns'
);
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'survey_role_answers' $$,
  array['id', 'organisation_id', 'response_id', 'decision_type_id', 'role', 'position_id'],
  'survey_role_answers holds exactly the reviewed columns'
);
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'invitations' $$,
  array['id', 'organisation_id', 'campaign_unit_id', 'audience', 'snapshot_member_id', 'email', 'token_salt',
        'status', 'sent_at', 'reminder_count', 'last_reminded_at'],
  'invitations hold exactly the reviewed columns: no token, no hash, and no record of a response'
);
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'private' and table_name = 'survey_tokens' $$,
  array['token_hash', 'organisation_id', 'campaign_unit_id', 'audience'],
  'a live token names a campaign unit and an audience, and no invitation'
);

-- 6 to 9: keys.
create temp view anonymous_keys as
  select src.relname::text as source, dst.relname::text as target
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_class dst on dst.oid = con.confrelid
  where con.contype = 'f';

select set_eq(
  $$ select target from anonymous_keys where source = 'survey_responses' $$,
  array['organisations', 'campaign_units', 'campaign_teams'],
  'a response references only its organisation, campaign unit and frozen team key'
);
select set_eq(
  $$ select source || '>' || target from anonymous_keys where source in ('survey_item_responses', 'survey_role_answers') $$,
  array['survey_item_responses>organisations', 'survey_item_responses>survey_responses',
        'survey_role_answers>organisations', 'survey_role_answers>survey_responses'],
  'an item or role answer references only its organisation and response'
);
select set_eq(
  $$ select source from anonymous_keys where target in ('survey_responses', 'survey_item_responses', 'survey_role_answers', 'survey_tokens') $$,
  array['survey_item_responses', 'survey_role_answers'],
  'nothing references the anonymous tables or the live tokens except the answer tables'
);
select is(
  (select count(*)::integer from pg_attrdef d
   join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
   where d.adrelid in ('public.survey_responses'::regclass, 'public.survey_item_responses'::regclass, 'public.survey_role_answers'::regclass)
     and a.attname = 'id' and pg_get_expr(d.adbin, d.adrelid) = 'gen_random_uuid()'),
  3,
  'response identifiers are random, never a sequence'
);

-- 10 to 13: no time, no reader, no writer about them.
select is_empty(
  $$
    select c.relname || '.' || a.attname from pg_attribute a join pg_class c on c.oid = a.attrelid
    where c.oid in ('public.survey_responses'::regclass, 'public.survey_item_responses'::regclass,
                    'public.survey_role_answers'::regclass, 'private.survey_tokens'::regclass)
      and a.attnum > 0 and not a.attisdropped
      and format_type(a.atttypid, a.atttypmod) in ('timestamp with time zone', 'timestamp without time zone', 'date', 'time without time zone')
  $$,
  'no anonymous table and no live token carries a time'
);
select set_eq(
  $$
    select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ 'survey_(item_responses|responses|role_answers)'
  $$,
  array['ingest_survey_response(text,jsonb,integer)', 'close_campaign_responses(uuid)'],
  'exactly two functions read or write the anonymous tables: the ingestion and the close'
);
select is_empty(
  $$ select viewname from pg_views where schemaname in ('public', 'private') and definition ~ 'survey_(item_responses|responses|role_answers|tokens)' $$,
  'no view exposes them'
);
select is_empty(
  $$
    select c.relname || ':' || t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not t.tgisinternal
      and c.oid in ('public.survey_responses'::regclass, 'public.survey_item_responses'::regclass,
                    'public.survey_role_answers'::regclass, 'public.invitations'::regclass,
                    'private.survey_tokens'::regclass, 'private.email_outbox'::regclass)
  $$,
  'no trigger, and so no audit row, is written about a response, an invitation or a token'
);

-- 14 and 15: no Data API role holds any privilege, and every persona is refused.
select is_empty(
  $$
    select r.rolname, n.nspname || '.' || c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated'), ('service_role')) as r (rolname)
    where (n.nspname, c.relname) in (
      ('public', 'survey_responses'), ('public', 'survey_item_responses'), ('public', 'survey_role_answers'),
      ('public', 'invitations'), ('private', 'survey_tokens'), ('private', 'email_outbox'), ('private', 'setup_versions')
    )
      and (has_table_privilege(r.rolname, c.oid, 'select, insert, update, delete, truncate, references, trigger')
           or has_any_column_privilege(r.rolname, c.oid, 'select, insert, update, references'))
  $$,
  'no Data API role, the service role included, holds any privilege on the anonymous tables, invitations or tokens'
);

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
  ('read role answers', 'select count(*) from public.survey_role_answers'),
  ('write a response', $$insert into public.survey_responses (organisation_id, campaign_unit_id, audience)
     select organisation_id, id, 'members_part_a' from public.campaign_units limit 1$$),
  ('change a response', 'update public.survey_item_responses set value = 5'),
  ('delete responses', 'delete from public.survey_responses'),
  ('read invitations', 'select count(*) from public.invitations'),
  ('change an invitation', $$update public.invitations set status = 'bounced'$$),
  ('read tokens', 'select count(*) from private.survey_tokens'),
  ('read the outbox', 'select count(*) from private.email_outbox')
) as v (label, stmt);

select is_empty(
  $$ select * from tests.write_mismatches('writes') $$,
  'every role is refused every command on responses, invitations, tokens and the outbox'
);

-- The lifecycle -----------------------------------------------------------------------------------

-- C1 of Alpha: E002 to E008 (team One: E002 to E005, four people; team Two: E006 to E008, three),
-- E002 a team leader and the leadership team E002 with E001, who leads from the unit above.
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_life', array['C1']);
select tests.launch(tests.id('alpha_life'), 'alpha_admin');
select tests.remember('alpha_life_cu', (select id from public.campaign_units where campaign_id = tests.id('alpha_life')));
select tests.issue_tokens(tests.id('alpha_life'));

create temp table invitations_before as
  select to_jsonb(i) as row from public.invitations i where i.campaign_unit_id = tests.id('alpha_life_cu');

create temp table submissions as
select tests.submit(tests.token('alpha', tests.id('alpha_life'), 'E003', 'members_part_a'), jsonb_build_object(
  'team', (select id from public.campaign_teams where campaign_unit_id = tests.id('alpha_life_cu') and name = 'Team One'),
  'items', '{"CII-01": 4, "CII-05": 2, "MI2-03": 3, "TW-01": 4}'::jsonb), 612) as result
union all
select tests.submit(tests.token('alpha', tests.id('alpha_life'), 'E006', 'members_part_a'), jsonb_build_object(
  'team', (select id from public.campaign_teams where campaign_unit_id = tests.id('alpha_life_cu') and name = 'Team Two'),
  'items', '{"CII-01": 3, "CII-05": 3, "MI2-03": 4}'::jsonb), 540)
union all
select tests.submit(tests.token('alpha', tests.id('alpha_life'), 'E004', 'members_part_b'), jsonb_build_object(
  'items', '{"O1C-01": 4, "O2I-03": 2}'::jsonb,
  'processes', jsonb_build_array(jsonb_build_object('process', tests.id('alpha_process'), 'items', '{"O3P-01": 3, "O3P-04": 2}'::jsonb))), 200)
union all
select tests.submit(tests.token('alpha', tests.id('alpha_life'), 'E001', 'leadership_team'), jsonb_build_object(
  'decisions', (
    select jsonb_agg(jsonb_build_object(
      'decisionType', d ->> 'id', 'clarity', 4,
      'roles', jsonb_build_object(
        'recommend', jsonb_build_array((select p ->> 'id' from jsonb_array_elements(c.positions) p where p ->> 'title' = 'Analyst')),
        'decides', jsonb_build_array((select p ->> 'id' from jsonb_array_elements(c.positions) p where p ->> 'title' = 'Team Lead')),
        'agree', '["unclear"]'::jsonb)))
    from public.campaign_unit_contexts c, jsonb_array_elements(c.context -> 'decisionTypes') d
    where c.campaign_unit_id = tests.id('alpha_life_cu'))), 400)
union all
select tests.submit(tests.token('alpha', tests.id('alpha_life'), 'E002', 'team_leaders'), jsonb_build_object(
  'items', (select jsonb_object_agg(code, 2 + position % 3) from public.ref_module_items where module_code = 'M-C5-TL')), 700);

-- 16 to 19: submitting.
select is((select array_agg(result) from submissions), array['ok', 'ok', 'ok', 'ok', 'ok'], 'five responses are accepted');
select is(
  tests.submit(tests.token('alpha', tests.id('alpha_life'), 'E003', 'members_part_a'), '{"items": {"CII-01": 5}}'::jsonb),
  'survey.spent',
  'a token is spent by its submission: the same link cannot answer twice'
);
select set_eq(
  $$ select to_jsonb(i) from public.invitations i where i.campaign_unit_id = tests.id('alpha_life_cu') $$,
  $$ select row from invitations_before $$,
  'no invitation changes when its person answers: nothing records that they did'
);
select is(
  (select array_agg(coalesce(t.name, 'none') order by coalesce(t.name, 'none') collate "C")
   from public.survey_responses r left join public.campaign_teams t on t.id = r.campaign_team_id
   where r.campaign_unit_id = tests.id('alpha_life_cu') and r.audience = 'members_part_a'),
  array['Team One', 'none'],
  'a response names its team only where the team has four or more people'
);

create temp table ids_before as
  select id::text as id from public.survey_responses where campaign_unit_id = tests.id('alpha_life_cu');

-- 20 and 21: while open, no response identifier and no spent token hash is anywhere else.
select is_empty(
  $$ select tests.value_locations(array(select id from ids_before), array['survey_responses', 'survey_item_responses', 'survey_role_answers']) $$,
  'while open, no response identifier appears outside the anonymous tables'
);
select is_empty(
  $$
    select tests.value_locations(
      array(select token_hash from tests.tokens t
            where not exists (select 1 from private.survey_tokens s where s.token_hash = t.token_hash)),
      array[]::text[])
  $$,
  'a spent token''s hash is gone from everywhere'
);

-- The close: the window ends, the job closes and settles, and the close read rewrites.
update public.campaigns set closes_at = now() - interval '1 second' where id = tests.id('alpha_life');
select tests.as_service();
select public.close_due_campaigns();
select public.settle_campaign(tests.id('alpha_life'));
create temp table close_read as select public.close_campaign_responses(tests.id('alpha_life_cu')) as rows;
select tests.as_postgres();

-- 22 to 30: after close.
select is(
  array[
    (select count(*)::integer from public.invitations where campaign_unit_id = tests.id('alpha_life_cu')),
    (select count(*)::integer from private.survey_tokens where campaign_unit_id = tests.id('alpha_life_cu')),
    (select count(*)::integer from private.email_outbox where campaign_id = tests.id('alpha_life'))
  ],
  array[0, 0, 0],
  'at close the invitations, the live tokens and the outbox are deleted'
);
select results_eq(
  $$
    select audience, issued, responded from public.campaign_audiences
    where campaign_unit_id = tests.id('alpha_life_cu') and issued is not null order by audience
  $$,
  $$ values ('leadership_team'::text, 2, 1), ('members_part_a', 7, 2), ('members_part_b', 7, 1), ('team_leaders', 1, 1) $$,
  'the counts outlive them: how many were asked and how many answered, per audience'
);
select is(
  (select count(*)::integer from public.survey_responses
   where campaign_unit_id = tests.id('alpha_life_cu') and id::text in (select id from ids_before)),
  0,
  'no response keeps the identifier it was written with'
);
select is_empty(
  $$ select tests.value_locations(array(select id from ids_before), array[]::text[]) $$,
  'and no earlier identifier survives anywhere'
);
select is_empty(
  $$
    select tests.value_locations(
      array(select id::text from public.survey_responses where campaign_unit_id = tests.id('alpha_life_cu')),
      array['survey_responses', 'survey_item_responses', 'survey_role_answers'])
  $$,
  'no rewritten identifier appears outside the anonymous tables'
);
select is_empty(
  $$ select tests.value_locations(array(select token_hash from tests.tokens), array[]::text[]) $$,
  'no token hash, spent or unspent, survives anywhere'
);
select is(
  array[
    (select count(*)::integer from public.survey_responses where campaign_unit_id = tests.id('alpha_life_cu')),
    (select count(*)::integer from public.survey_item_responses i
     join public.survey_responses r on r.id = i.response_id where r.campaign_unit_id = tests.id('alpha_life_cu')),
    (select count(*)::integer from public.survey_role_answers a
     join public.survey_responses r on r.id = a.response_id where r.campaign_unit_id = tests.id('alpha_life_cu'))
  ],
  array[5, 25, 6],
  'the rewrite keeps every answer: five responses, their items and role answers'
);
select ok(
  (select bool_and(t.headcount >= 4) from public.survey_responses r
   join public.campaign_teams t on t.id = r.campaign_team_id
   where r.campaign_unit_id = tests.id('alpha_life_cu')),
  'what a response still shares with person-related data is its unit and a team key held by four or more'
);
select is(
  array[
    jsonb_array_length((select rows -> 'members' from close_read)),
    jsonb_array_length((select rows -> 'membersPartB' from close_read)),
    jsonb_array_length((select rows -> 'teamLeaders' from close_read)),
    jsonb_array_length((select rows -> 'leadership' from close_read))
  ],
  array[2, 1, 1, 2],
  'the close read returns the unit''s Part A, Part B, team-leader and leadership rows for the intake'
);

select * from finish();

rollback;
