-- Sending (Milestone 5 plan, 4.1 and 5.2). Only the service role reads invitations for tokens,
-- claims outbox rows and records outcomes. Survey mail waits for its campaign's tokens; a claimed
-- row is not claimed again until its claim lapses; a sent row marks its invitations sent, a
-- permanent failure marks them bounced. Nothing the sender reads carries a token or a token hash.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(12);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_send', array['C1']);
select tests.launch(tests.id('alpha_send'), 'alpha_admin');

-- 1: only the service role.
select is(
  array[
    tests.attempt('alpha_admin', format($$select public.invitations_for_tokens(%L)$$, tests.id('alpha_send'))),
    tests.attempt('support_a', $$select public.claim_outbox(10)$$),
    tests.attempt('alpha_ao', $$select public.campaigns_awaiting_tokens()$$),
    tests.attempt('service', $$select public.claim_outbox(0)$$)
  ],
  array['denied', 'denied', 'denied', '1'],
  'the sender''s functions are the service role''s alone'
);

-- 2 and 3: before the tokens.
select is(
  (select count(*)::integer from public.invitations_for_tokens(tests.id('alpha_send'))),
  (select count(*)::integer from public.invitations i join public.campaign_units cu on cu.id = i.campaign_unit_id
   where cu.campaign_id = tests.id('alpha_send')),
  'the job reads every invitation of a campaign whose tokens are not issued'
);
create temp table first_claim as select public.claim_outbox(100, tests.id('alpha_send')) as rows;
select is(
  (select array_agg(distinct r ->> 'kind') from first_claim, jsonb_array_elements(rows) r),
  array['manager_invitation'],
  'survey mail waits for the tokens; the managers'' mail does not'
);

-- 4 and 5: once the tokens are issued.
select tests.issue_tokens(tests.id('alpha_send'));
select ok(
  not exists (select 1 from public.invitations_for_tokens(tests.id('alpha_send')))
  and tests.id('alpha_send') <> all (array(select public.campaigns_awaiting_tokens())),
  'with the tokens issued there is nothing more to derive'
);
create temp table second_claim as select public.claim_outbox(100, tests.id('alpha_send')) as rows;
select ok(
  (select bool_and(jsonb_array_length(r -> 'invitations') > 0 and r ->> 'email' like '%@%' and r -> 'invitations' -> 0 ? 'salt')
   from second_claim, jsonb_array_elements(rows) r where r ->> 'kind' = 'survey_invitation')
  and (select count(*) from second_claim, jsonb_array_elements(rows) r where r ->> 'kind' = 'survey_invitation')
      = (select count(*) from private.email_outbox where campaign_id = tests.id('alpha_send') and kind = 'survey_invitation'),
  'each survey email comes with its address and the invitations its links are derived from'
);

-- 6: nothing the sender reads carries a token or its hash.
select ok(
  not exists (
    select 1 from second_claim, private.survey_tokens t
    where second_claim.rows::text like '%' || t.token_hash || '%'
  ),
  'no token hash reaches the sender'
);

-- 7: a claimed row is not claimed again while its claim stands.
select is(
  (select jsonb_array_length(public.claim_outbox(100, tests.id('alpha_send')))),
  0,
  'a claimed row is not claimed twice'
);

-- 8 and 9: sent.
create temp table one as
  select (r ->> 'id')::uuid as id, array(select (x ->> 'id')::uuid from jsonb_array_elements(r -> 'invitations') x) as invitations
  from second_claim, jsonb_array_elements(rows) r where r ->> 'kind' = 'survey_invitation' limit 2;
select public.outbox_sent((select id from one order by id limit 1), 'msg-1');
select is(
  (select array_agg(distinct i.status) from public.invitations i where i.id = any ((select invitations from one order by id limit 1)::uuid[])),
  array['sent'],
  'a sent email marks its invitations sent'
);
select throws_ok(
  format($$select public.outbox_sent(%L, 'again')$$, (select id from one order by id limit 1)),
  '22023',
  'only a claimed outbox row can be marked sent',
  'and is not marked twice'
);

-- 10 to 12: failures.
select public.outbox_failed((select id from one order by id desc limit 1), 'rate_limited', false);
select is(
  (select status from private.email_outbox where id = (select id from one order by id desc limit 1)),
  'pending',
  'a passing failure waits for the next run'
);
select is(
  (select count(*)::integer from jsonb_array_elements(public.claim_outbox(100, tests.id('alpha_send'))) r
   where (r ->> 'id')::uuid = (select id from one order by id desc limit 1)),
  1,
  'and is claimed again'
);
select public.outbox_failed((select id from one order by id desc limit 1), 'invalid_address', true);
select is(
  (select array_agg(distinct i.status) from public.invitations i where i.id = any ((select invitations from one order by id desc limit 1)::uuid[])),
  array['bounced'],
  'a permanent failure marks its invitations bounced (D28)'
);

select * from finish();

rollback;
