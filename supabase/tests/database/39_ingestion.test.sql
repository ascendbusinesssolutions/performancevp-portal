-- The anonymous ingestion path (Milestone 5 plan, 4.1 to 4.3): what a link opens, what a submission
-- may carry, and that a refused submission leaves its token live. Only the service role reaches
-- either function. Single use under concurrency rests on the token row being deleted in the same
-- transaction as the response is written (the primary key serialises two deletes of one token);
-- a pgTAP test runs in one transaction, so it shows the sequential case.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(21);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_in', array['C1', 'C2']);
select tests.launch(tests.id('alpha_in'), 'alpha_admin');
select tests.issue_tokens(tests.id('alpha_in'));

create temp table opened as
select a.audience, public.survey_for_token(tests.token('alpha', tests.id('alpha_in'), a.ref, a.audience)) as survey
from (values ('E003', 'members_part_a'), ('E003', 'members_part_b'), ('E002', 'team_leaders'), ('E001', 'leadership_team'),
             ('E010', 'members_part_a')) as a (ref, audience);

-- 1 to 5: what a link opens.
select is(
  (select array_agg(survey ->> 'state' order by audience) from opened),
  array['open', 'open', 'open', 'open', 'open'],
  'a live link opens its survey'
);
select is(
  (select jsonb_array_length(survey -> 'teams') || ' ' || jsonb_array_length(survey -> 'items') || ' ' || (survey ->> 'partB')
   from opened where audience = 'members_part_a' and survey ->> 'unitName' = 'Operations'),
  '2 71 true',
  'Part A offers the unit''s team keys and the 71 items, and says a Part B follows'
);
select is(
  (select jsonb_array_length(survey -> 'processes') || ' ' || jsonb_array_length(survey -> 'teams')
   from opened where audience = 'members_part_b'),
  '1 0',
  'Part B offers the unit''s processes and no team'
);
select is(
  (select jsonb_array_length(survey -> 'decisionTypes') || ' ' || jsonb_array_length(survey -> 'positions') || ' ' || (survey ->> 'audienceSize')
   from opened where audience = 'leadership_team'),
  '2 2 2',
  'the leadership module offers the decision types and position titles, and knows its audience is small'
);
select ok(
  (select not (survey ? 'email') and not (survey ? 'firstName') and not (survey::text ~ 'e00[0-9]@') from opened where audience = 'members_part_a' limit 1),
  'a link opens a survey, never a person'
);

-- 6 to 15: what a submission may carry. Each refusal leaves the token live.
create temp table tried as
select label, tests.submit(tests.token('alpha', tests.id('alpha_in'), ref, audience), payload) as result
from (values
  ('an item not deployed to Part A', 'E004', 'members_part_a', '{"items": {"O1C-01": 3}}'::jsonb),
  ('a value outside 1 to 5', 'E004', 'members_part_a', '{"items": {"CII-01": 6}}'::jsonb),
  ('a value as text', 'E004', 'members_part_a', '{"items": {"CII-01": "4"}}'::jsonb),
  ('a team of another unit', 'E004', 'members_part_a',
    jsonb_build_object('team', (select t.id from public.campaign_teams t join public.campaign_units cu on cu.id = t.campaign_unit_id
                                join public.measurement_units mu on mu.id = cu.measurement_unit_id
                                where cu.campaign_id = tests.id('alpha_in') and mu.code = 'C2'), 'items', '{"CII-01": 3}'::jsonb)),
  ('a team on Part B', 'E004', 'members_part_b',
    jsonb_build_object('team', (select t.id from public.campaign_teams t join public.campaign_units cu on cu.id = t.campaign_unit_id
                                where cu.campaign_id = tests.id('alpha_in') limit 1), 'items', '{"O1C-01": 3}'::jsonb)),
  ('processes on Part A', 'E004', 'members_part_a',
    jsonb_build_object('items', '{"CII-01": 3}'::jsonb, 'processes', jsonb_build_array(jsonb_build_object('process', tests.id('alpha_process'), 'items', '{"O3P-01": 3}'::jsonb)))),
  ('a process the unit did not name', 'E004', 'members_part_b',
    jsonb_build_object('processes', jsonb_build_array(jsonb_build_object('process', gen_random_uuid(), 'items', '{"O3P-01": 3}'::jsonb)))),
  ('a position the unit does not have', 'E001', 'leadership_team',
    jsonb_build_object('decisions', jsonb_build_array(jsonb_build_object(
      'decisionType', (select d ->> 'id' from public.campaign_unit_contexts c
                       join public.campaign_units cu on cu.id = c.campaign_unit_id
                       join public.measurement_units mu on mu.id = cu.measurement_unit_id,
                       jsonb_array_elements(c.context -> 'decisionTypes') d
                       where cu.campaign_id = tests.id('alpha_in') and mu.code = 'C1' limit 1),
      'roles', jsonb_build_object('decides', jsonb_build_array(gen_random_uuid())))))),
  ('an unknown field', 'E004', 'members_part_a', '{"items": {"CII-01": 3}, "name": "Person Number4"}'::jsonb),
  ('nothing answered', 'E004', 'members_part_a', '{"items": {}}'::jsonb)
) as v (label, ref, audience, payload);

select is(
  (select array_agg(label order by label) from tried where result = 'survey.invalid'),
  array['a position the unit does not have', 'a process the unit did not name', 'a team of another unit', 'a team on Part B',
        'a value as text', 'a value outside 1 to 5', 'an item not deployed to Part A', 'an unknown field', 'processes on Part A'],
  'the deployment, the unit''s own keys and the answer form are enforced'
);
select is((select result from tried where label = 'nothing answered'), 'survey.empty', 'an empty response is refused');
select is(
  (select count(*)::integer from public.survey_responses r join public.campaign_units cu on cu.id = r.campaign_unit_id
   where cu.campaign_id = tests.id('alpha_in')),
  0,
  'no refused submission writes anything'
);
select ok(
  exists (select 1 from private.survey_tokens where token_hash = tests.token('alpha', tests.id('alpha_in'), 'E004', 'members_part_a')),
  'and a refused submission leaves its token live'
);
select is(
  tests.submit(tests.token('alpha', tests.id('alpha_in'), 'E004', 'members_part_a'), '{"items": {"CII-01": 3, "TW-02": 5}}'::jsonb, 480),
  'ok',
  'the same person can then answer'
);
select is(
  tests.submit(tests.token('alpha', tests.id('alpha_in'), 'E004', 'members_part_a'), '{"items": {"CII-01": 3}}'::jsonb),
  'survey.spent',
  'once'
);
select is(
  tests.submit(encode(extensions.digest('not a token', 'sha256'), 'hex'), '{"items": {"CII-01": 3}}'::jsonb),
  'survey.spent',
  'an unknown token reads exactly as a spent one'
);
select is(
  public.survey_for_token(tests.token('alpha', tests.id('alpha_in'), 'E004', 'members_part_a')) ->> 'state',
  'unknown',
  'and a spent link opens nothing'
);

-- 14 to 16: the team a response names.
select is(
  tests.submit(tests.token('alpha', tests.id('alpha_in'), 'E010', 'members_part_a'), '{"items": {"CII-01": 4}}'::jsonb),
  'ok',
  'in a unit with one team key the respondent is not asked'
);
select is(
  (select t.name || ' ' || t.headcount from public.survey_responses r
   join public.campaign_units cu on cu.id = r.campaign_unit_id
   join public.measurement_units mu on mu.id = cu.measurement_unit_id
   join public.campaign_teams t on t.id = r.campaign_team_id
   where cu.campaign_id = tests.id('alpha_in') and mu.code = 'C2'),
  'Team One 5',
  'and the response takes that key'
);
select is(
  (select count(*)::integer from public.survey_responses r join public.campaign_units cu on cu.id = r.campaign_unit_id
   where cu.campaign_id = tests.id('alpha_in') and r.completion_seconds = 480),
  1,
  'the completion time is kept for the speed check, and nothing else about when'
);

-- 17 to 19: the window, the live check, and who may call.
select is(
  (select count(*)::integer from public.survey_tokens_live(tests.id('alpha_in'),
     array[tests.token('alpha', tests.id('alpha_in'), 'E004', 'members_part_a'), tests.token('alpha', tests.id('alpha_in'), 'E005', 'members_part_a')])),
  1,
  'the job learns which of the hashes it derived are still live, and nothing more'
);
update public.campaigns set closes_at = now() where id = tests.id('alpha_in');
select is(
  tests.submit(tests.token('alpha', tests.id('alpha_in'), 'E005', 'members_part_a'), '{"items": {"CII-01": 4}}'::jsonb),
  'survey.closed',
  'after the close a live token answers nothing'
);
select is(
  array[
    tests.attempt('alpha_admin', format($$select public.ingest_survey_response(%L, '{}'::jsonb, 1)$$, 'x')),
    tests.attempt('alpha_admin', $$select public.survey_for_token('x')$$),
    tests.attempt('anon', $$select public.survey_for_token('x')$$),
    tests.attempt('alpha_admin', format($$select public.close_campaign_responses(%L)$$, gen_random_uuid()))
  ],
  array['denied', 'denied', 'denied', 'denied'],
  'no signed-in person and no anonymous caller reaches ingestion, a survey or the close read'
);

-- 20 and 21: the close read waits for the close and the settling.
select alike(
  tests.attempt('service', format($$select public.close_campaign_responses(%L)$$,
    (select id from public.campaign_units where campaign_id = tests.id('alpha_in') limit 1))),
  'error: 22023 responses are read only after the campaign has closed and settled%',
  'responses cannot be read while the campaign is open'
);
select alike(
  tests.attempt('service', format($$select public.issue_survey_tokens(%L, '[]'::jsonb)$$, tests.id('alpha_in'))),
  'error: 22023 this campaign''s tokens are already issued%',
  'tokens are issued once'
);

select * from finish();

rollback;
