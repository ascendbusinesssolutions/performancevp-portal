-- The campaign lifecycle (Milestone 5 plan, 2.1 to 2.3): who creates, schedules, cancels, extends
-- and closes a campaign; the moves a campaign may make and no others; the launch, which only the
-- service role runs, and what it refuses: another campaign measuring the same unit, a subscription
-- that is not active, and a directory that changed after readiness read it.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(22);

select tests.seed_fixture();

-- 1 to 4: creating.
select is(
  tests.attempt('alpha_admin', format(
    $$select public.create_campaign(%L, 'baseline', 'Annual baseline', array[%L, %L]::uuid[], now() + interval '1 day', now() + interval '15 days')$$,
    tests.id('alpha'), tests.mu('alpha_C1'), tests.mu('alpha_C2'))),
  '1',
  'an administrator creates a draft campaign'
);
select is(
  array[
    tests.attempt('alpha_exec', format($$select public.create_campaign(%L, 'baseline', null, array[%L]::uuid[], now() + interval '1 day', now() + interval '15 days')$$, tests.id('alpha'), tests.mu('alpha_C1'))),
    tests.attempt('alpha_mgr', format($$select public.create_campaign(%L, 'baseline', null, array[%L]::uuid[], now() + interval '1 day', now() + interval '15 days')$$, tests.id('alpha'), tests.mu('alpha_C1')), 'aal1', array['otp']),
    tests.attempt('beta_ao', format($$select public.create_campaign(%L, 'baseline', null, array[%L]::uuid[], now() + interval '1 day', now() + interval '15 days')$$, tests.id('alpha'), tests.mu('alpha_C1')))
  ],
  array['denied', 'denied', 'denied'],
  'an executive viewer, a manager and another organisation cannot'
);
select is(
  tests.attempt('support_a', format(
    $$select public.create_campaign(%L, 'event_triggered', null, array[%L]::uuid[], now() + interval '1 day', now() + interval '15 days', 'tool_rollout')$$,
    tests.id('alpha'), tests.mu('alpha_C1'))),
  '1',
  'staff under a session can (Guided Setup), and an event campaign names its trigger'
);
select alike(
  tests.attempt('alpha_admin', format(
    $$select public.create_campaign(%L, 'baseline', null, array[%L]::uuid[], now() + interval '1 day', now() + interval '15 days')$$,
    tests.id('alpha'), tests.mu('beta_C1'))),
  'error: 22023 every unit must be an active measurement unit of this organisation%',
  'a campaign measures only its own organisation''s active units'
);

-- 5: the pulse rotation row is the organisation's pulse count, cycling 1 to 4 (D6).
select tests.attempt('alpha_admin', format(
  $$select public.create_campaign(%L, 'quarterly_pulse', 'Pulse one', array[%L]::uuid[], now() + interval '1 day', now() + interval '6 days')$$,
  tests.id('alpha'), tests.mu('alpha_C1')), p_keep => true);
select tests.attempt('alpha_admin', format(
  $$select public.create_campaign(%L, 'quarterly_pulse', 'Pulse two', array[%L]::uuid[], now() + interval '1 day', now() + interval '6 days')$$,
  tests.id('alpha'), tests.mu('alpha_C1')), p_keep => true);
select is(
  (select array_agg(pulse_rotation order by name) from public.campaigns
   where organisation_id = tests.id('alpha') and cadence = 'quarterly_pulse'),
  array[1, 2]::smallint[],
  'successive pulses take rotation rows 1 and 2'
);

-- 6 to 10: scheduling, unscheduling, cancelling.
select tests.draft_campaign('alpha', 'alpha_later', array['G1']);
update public.campaigns set opens_at = now() + interval '3 days', closes_at = now() + interval '17 days'
where id = tests.id('alpha_later');
select is(
  tests.attempt('alpha_admin', format($$select public.schedule_campaign(%L)$$, tests.id('alpha_later')), p_keep => true),
  '1',
  'an administrator approves a draft to open at its time'
);
select ok(
  (select status = 'scheduled' and approved_by = tests.user_id('alpha_admin') and approved_at is not null
   from public.campaigns where id = tests.id('alpha_later')),
  'the campaign is scheduled, with who approved it'
);
select is(
  tests.attempt('alpha_admin', format($$select public.unschedule_campaign(%L)$$, tests.id('alpha_later')), p_keep => true),
  '1',
  'and can take it back to draft'
);
select is(
  tests.attempt('alpha_admin', format($$select public.cancel_campaign(%L)$$, tests.id('alpha_later')), p_keep => true),
  '1',
  'a draft can be cancelled'
);
select alike(
  tests.attempt('alpha_admin', format($$select public.cancel_campaign(%L)$$, tests.id('alpha_open'))),
  'error: 22023 only a draft or scheduled campaign can be cancelled%',
  'an open campaign cannot: people have answered'
);

-- 11 and 12: only the reviewed moves.
select throws_ok(
  format($$update public.campaigns set status = 'draft' where id = %L$$, tests.id('alpha_open')),
  '23514',
  'a campaign cannot move from open to draft',
  'no other move is possible, even for the owner of the tables'
);
select throws_ok(
  format($$update public.campaigns set status = 'open' where id = %L$$, tests.id('alpha_closed')),
  '23514',
  'a campaign cannot move from closed to open',
  'a closed campaign never reopens'
);

-- 13 to 16: extending and closing an open campaign.
select is(
  tests.attempt('alpha_admin', format($$select public.extend_campaign(%L, now() + interval '9 days')$$, tests.id('alpha_open')), p_keep => true),
  '1',
  'an administrator extends an open campaign'
);
select alike(
  tests.attempt('alpha_admin', format($$select public.extend_campaign(%L, now() + interval '1 day')$$, tests.id('alpha_open'))),
  'error: 22023 an extension closes the campaign later%',
  'an extension never brings the close forward'
);
select is(
  tests.attempt('alpha_exec', format($$select public.close_campaign_now(%L)$$, tests.id('alpha_open'))),
  'denied',
  'an executive viewer cannot close a campaign'
);
select tests.set_state('alpha', 'grace');
select is(
  tests.attempt('alpha_admin', format($$select public.close_campaign_now(%L)$$, tests.id('alpha_open')), p_keep => true),
  '1',
  'in grace an open campaign can still be closed (D22)'
);

-- 17 to 22: the launch.
select tests.set_state('alpha', 'active');
select tests.draft_campaign('alpha', 'alpha_next', array['C1']);
select is(
  tests.attempt('alpha_admin', format($$select public.launch_campaign(null, %L, 0, '{}'::jsonb)$$, tests.id('alpha_next'))),
  'denied',
  'only the service role launches'
);
select alike(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('alpha_next'), public.setup_version(tests.id('alpha')), tests.launch_plan(tests.id('alpha_next')))),
  'error: 22023 another campaign is measuring one of these units%',
  'a unit is in one running campaign at a time (the fixture''s closed campaign is still being scored)'
);
select tests.clear_fixture_campaigns('alpha');
select tests.set_state('alpha', 'grace');
select alike(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('alpha_next'), public.setup_version(tests.id('alpha')), tests.launch_plan(tests.id('alpha_next')))),
  'error: 22023 a campaign cannot be launched while the subscription is not active%',
  'no launch in grace (D22)'
);
select tests.set_state('alpha', 'active');
create temp table seen as select public.setup_version(tests.id('alpha')) as version;
update public.employees set role_title = 'Senior Analyst' where id = tests.id('alpha_E003');
select alike(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('alpha_next'), (select version from seen), tests.launch_plan(tests.id('alpha_next')))),
  'error: 22023 the directory or setup changed while the campaign was launching%',
  'a change to the directory after readiness read it refuses the launch (D27)'
);
select is(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('alpha_next'), public.setup_version(tests.id('alpha')), tests.launch_plan(tests.id('alpha_next'))), p_keep => true),
  '1',
  'at the current version the launch succeeds'
);
select ok(
  (select status = 'open' and launched_at is not null and setup_version = public.setup_version(tests.id('alpha'))
   from public.campaigns where id = tests.id('alpha_next')),
  'and the campaign is open, recording the setup version it launched at'
);

select * from finish();

rollback;
