-- The Section 3.3 matrix for rating sessions, identified ratings, invitations and anonymous
-- responses (Milestone 3 plan, 3.3). This is the milestone's exit criterion: executive and unit
-- viewers cannot read ratings, and no role can read anonymous responses.
--
-- Per organisation in Alpha: 4 rating sessions, 5 skill ratings, 2 knowledge ratings, 3 talent
-- bands, 10 invitations, 5 anonymous responses with 10 item answers. Direct reads of ratings are
-- the rating manager's alone; administrators and staff read them through the logged functions.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(17);

select tests.seed_fixture();

create temp table visibility (
  tbl text, org text,
  alpha_ao integer, alpha_admin integer, alpha_exec integer, alpha_uv integer, beta_ao integer,
  owner integer, support_a integer, support_b integer, outsider integer, anon integer
);
insert into visibility values
  --                                   ao adm exe  uv b_ao own s_a s_b out anon
  ('rating_sessions',       'alpha',   4,  4,  0,  0,   0,  0,  4,  0,  0,  -1),
  ('rating_sessions',       'beta',    0,  0,  0,  0,   2,  0,  0,  0,  0,  -1),
  ('skill_ratings',         'alpha',   0,  0,  0,  0,   0,  0,  0,  0,  0,  -1),
  ('knowledge_ratings',     'alpha',   0,  0,  0,  0,   0,  0,  0,  0,  0,  -1),
  ('talent_bands',          'alpha',   0,  0,  0,  0,   0,  0,  0,  0,  0,  -1),
  ('skill_ratings',         'beta',    0,  0,  0,  0,   0,  0,  0,  0,  0,  -1),
  ('invitations',           'alpha',  -1, -1, -1, -1,  -1, -1, -1, -1, -1,  -1),
  ('survey_responses',      'alpha',  -1, -1, -1, -1,  -1, -1, -1, -1, -1,  -1),
  ('survey_item_responses', 'alpha',  -1, -1, -1, -1,  -1, -1, -1, -1, -1,  -1);

select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'rating_sessions' $$,
  'rating sessions (who is outstanding, no ratings): administrators, the account owner and staff under a session'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl in ('skill_ratings', 'knowledge_ratings', 'talent_bands') $$,
  'identified ratings: no direct read for anyone but the rating manager; executive and unit viewers read nothing'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl in ('invitations', 'survey_responses', 'survey_item_responses') $$,
  'invitations and anonymous responses: no role reads them'
);

-- The rating managers, on email-code sessions.
create temp table manager_visibility (persona text, tbl text, org text, expected integer);
insert into manager_visibility values
  ('alpha_mgr', 'rating_sessions', 'alpha', 2), ('alpha_mgr', 'skill_ratings', 'alpha', 4),
  ('alpha_mgr', 'knowledge_ratings', 'alpha', 2), ('alpha_mgr', 'talent_bands', 'alpha', 3),
  ('alpha_mgr2', 'rating_sessions', 'alpha', 1), ('alpha_mgr2', 'skill_ratings', 'alpha', 1),
  ('alpha_mgr2', 'knowledge_ratings', 'alpha', 0), ('alpha_mgr2', 'talent_bands', 'alpha', 0),
  ('alpha_gone_mgr', 'rating_sessions', 'alpha', 0), ('alpha_gone_mgr', 'skill_ratings', 'alpha', 0),
  ('beta_mgr', 'skill_ratings', 'alpha', 0), ('alpha_mgr', 'skill_ratings', 'beta', 0),
  ('alpha_mgr', 'invitations', 'alpha', -1), ('alpha_mgr', 'survey_responses', 'alpha', -1);
select is_empty(
  $$
    select persona, tbl, org, expected,
           tests.visible_rows(persona, tbl, tests.id(org), 'aal1', array['otp']) as actual
    from manager_visibility
    where expected is distinct from tests.visible_rows(persona, tbl, tests.id(org), 'aal1', array['otp'])
  $$,
  'a manager reads their own ratings and sessions, in any campaign, and nobody else''s'
);

-- The logged reads.
create temp table logged_reads (persona text, fn text, expected text);
insert into logged_reads values
  ('alpha_ao', 'read_skill_ratings', '5'), ('alpha_admin', 'read_skill_ratings', '5'),
  ('support_a', 'read_skill_ratings', '5'), ('alpha_admin', 'read_knowledge_ratings', '2'),
  ('alpha_admin', 'read_talent_bands', '3'),
  ('alpha_exec', 'read_skill_ratings', 'denied'), ('alpha_uv', 'read_skill_ratings', 'denied'),
  ('alpha_exec', 'read_talent_bands', 'denied'), ('alpha_uv', 'read_knowledge_ratings', 'denied'),
  ('owner', 'read_skill_ratings', 'denied'), ('support_b', 'read_skill_ratings', 'denied'),
  ('beta_ao', 'read_skill_ratings', 'denied'), ('outsider', 'read_skill_ratings', 'denied'),
  ('anon', 'read_skill_ratings', 'denied');
select is_empty(
  $$
    select persona, fn, expected, tests.attempt(persona, format('select * from public.%I(tests.id(''alpha''))', fn), p_keep => true) as actual
    from logged_reads
    where expected is distinct from tests.attempt(persona, format('select * from public.%I(tests.id(''alpha''))', fn), p_keep => true)
  $$,
  'administrators, the account owner and staff under a session read ratings through the logged functions; executive and unit viewers, the Owner without a session, other organisations and the anonymous role are refused'
);
select is(
  tests.attempt('alpha_mgr', $$select * from public.read_skill_ratings(tests.id('alpha'))$$, 'aal1', array['otp']),
  'denied',
  'a manager reads their own ratings directly, not through the administrators'' function'
);

select ok(
  (select count(*) >= 2 from public.audit_logs
   where organisation_id = tests.id('alpha') and action = 'ratings.viewed' and actor_user_id = tests.user_id('alpha_admin')),
  'every administrator read is logged'
);
select results_eq(
  $$
    select actor_kind, support_session_id is not null, detail ->> 'kind', (detail ->> 'rows')::integer
    from public.audit_logs
    where organisation_id = tests.id('alpha') and action = 'ratings.viewed' and actor_user_id = tests.user_id('support_a')
    limit 1
  $$,
  $$ values ('support'::text, true, 'skills'::text, 5) $$,
  'a staff read is logged with the support session it was made under'
);
select is(
  (select count(*)::integer from public.audit_logs where action like 'ratings.%' and actor_user_id in (
    select user_id from tests.personas where key in ('alpha_exec', 'alpha_uv', 'owner', 'support_b', 'beta_ao', 'outsider'))),
  0,
  'a refused read writes nothing and returns nothing'
);

-- Filters.
select is(
  tests.count_as('alpha_admin', $$select count(*) from public.read_talent_bands(tests.id('alpha'), p_unit_id => tests.id('alpha_C1'))$$),
  3, 'the ratings read filters by unit'
);
select is(
  tests.count_as('alpha_admin', $$select count(*) from public.read_skill_ratings(tests.id('alpha'), p_manager_employee_id => tests.id('alpha_E009'))$$),
  1, 'and by manager'
);
select is(
  tests.count_as('alpha_admin', $$select count(*) from public.read_skill_ratings(tests.id('alpha'), p_campaign_id => tests.id('alpha_open'))$$),
  3, 'and by campaign'
);

-- Exports need a fresh TOTP.
select tests.authenticate_as('alpha_admin', 'aal2', null, null, interval '20 minutes');
select throws_ok($$select * from public.read_skill_ratings(tests.id('alpha'), p_purpose => 'export')$$, '42501', null,
  'an export needs TOTP verified within the last 15 minutes');
select tests.as_postgres();
select is(
  tests.attempt('alpha_admin', $$select * from public.read_skill_ratings(tests.id('alpha'), p_purpose => 'export')$$, p_keep => true),
  '5', 'with it, the export goes through'
);
select ok(
  exists (select 1 from public.audit_logs where action = 'ratings.exported' and actor_user_id = tests.user_id('alpha_admin')),
  'and is logged as an export'
);

-- Unit viewers and executives cannot reach ratings any other way.
select is(
  tests.count_as('alpha_exec', 'select count(*) from public.skill_ratings'), 0,
  'an executive viewer reads no rating directly'
);
select is(
  tests.count_as('alpha_uv', 'select count(*) from public.talent_bands'), 0,
  'nor does a unit viewer'
);

select * from finish();

rollback;
