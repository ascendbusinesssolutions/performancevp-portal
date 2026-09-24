-- The launch's reads and the cadence calendar (Milestone 5 plan, 2.2 and 2.3). A scheduled launch
-- reads the readiness data through launch_dataset, which only the service role runs and which logs
-- its formal-ratings read as ratings.checked; the job finds due scheduled campaigns; an
-- administrator approves a calendar proposal into a scheduled campaign for the anchor's units that
-- are still measured, or dismisses it, and cancelling that campaign puts the proposal back.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(13);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_next', array['C1', 'C2']);

-- 1 to 4: the scheduled launch's read.
select is(
  array[
    tests.attempt('alpha_admin', format($$select public.launch_dataset(%L)$$, tests.id('alpha_next'))),
    tests.attempt('support_a', format($$select public.launch_dataset(%L)$$, tests.id('alpha_next'))),
    tests.attempt('service', format($$select public.launch_dataset(%L)$$, tests.id('alpha_next')))
  ],
  array['denied', 'denied', '1'],
  'only the service role reads the launch data; a signed-in launch reads under row security'
);

create temp table dataset as select public.launch_dataset(tests.id('alpha_next')) as d;
select is(
  (select array[
     jsonb_array_length(d -> 'people'),
     jsonb_array_length(d -> 'campaign' -> 'measurementUnitIds'),
     (d ->> 'setupVersion')::integer
   ] from dataset),
  array[
    (select count(*)::integer from public.employees where organisation_id = tests.id('alpha') and status = 'active'),
    2,
    public.setup_version(tests.id('alpha'))::integer
  ],
  'it holds the active people, the campaign''s units and the setup version'
);
select is(
  (select array(select jsonb_object_keys(d -> 'people' -> 0) order by 1) from dataset),
  array['employee_ref', 'employment_status', 'first_name', 'fte', 'id', 'is_leadership_team', 'is_team_leader',
        'last_name', 'manager_employee_id', 'role_family_id', 'role_title', 'start_date', 'status', 'team_id',
        'unit_id', 'work_email'],
  'people come in the directory loader''s own columns'
);
select ok(
  exists (
    select 1 from public.audit_logs
    where organisation_id = tests.id('alpha') and action = 'ratings.checked' and actor_kind = 'system'
      and detail ->> 'purpose' = 'scheduled_launch'
  ),
  'reading the formal ratings for a scheduled launch is logged as a check, by the system'
);

-- 5 and 6: due scheduled campaigns.
update public.campaigns set opens_at = now() + interval '1 day', closes_at = now() + interval '8 days'
where id = tests.id('alpha_next');
select tests.attempt('alpha_admin', format($$select public.schedule_campaign(%L)$$, tests.id('alpha_next')), p_keep => true);
select is(
  (select count(*)::integer from public.due_scheduled_campaigns() where campaign_id = tests.id('alpha_next')),
  0,
  'a scheduled campaign is not due before it opens'
);
update public.campaigns set opens_at = now() - interval '1 minute' where id = tests.id('alpha_next');
select is(
  (select count(*)::integer from public.due_scheduled_campaigns() where campaign_id = tests.id('alpha_next')),
  1,
  'and is due once its opening has come'
);

-- 7: a refused scheduled launch goes back to draft and tells the administrators.
select tests.attempt('service', format($$select public.record_launch_refusal(%L, '[{"check": "units"}]'::jsonb)$$,
  tests.id('alpha_next')), p_keep => true);
select is(
  (select array[c.status, jsonb_array_length(c.launch_blockers)::text,
                (select count(*)::text from private.email_outbox o where o.campaign_id = c.id and o.kind = 'launch_refused')]
   from public.campaigns c where c.id = tests.id('alpha_next')),
  array['draft', '1', '2'],
  'a refused scheduled launch returns to draft with its blockers, and the account owner and administrator are told'
);

-- 8 to 13: the calendar's proposals, from a launched baseline.
select tests.launch(tests.id('alpha_next'), 'alpha_admin');
select tests.remember('alpha_pulse_proposal', (
  select id from public.campaign_schedule
  where anchor_campaign_id = tests.id('alpha_next') and cadence = 'quarterly_pulse' order by due_on limit 1));
select tests.remember('alpha_half_proposal', (
  select id from public.campaign_schedule
  where anchor_campaign_id = tests.id('alpha_next') and cadence = 'half_yearly'));

select is(
  array[
    tests.attempt('alpha_exec', format($$select public.decide_schedule_proposal(%L, true, now() + interval '90 days', now() + interval '95 days')$$, tests.id('alpha_pulse_proposal'))),
    tests.attempt('beta_admin', format($$select public.decide_schedule_proposal(%L, false)$$, tests.id('alpha_pulse_proposal')))
  ],
  array['denied', 'denied'],
  'viewers and other organisations do not decide the calendar'
);
select is(
  tests.attempt('alpha_admin', format($$select public.decide_schedule_proposal(%L, true, now() + interval '90 days', now() + interval '95 days')$$,
    tests.id('alpha_pulse_proposal')), p_keep => true),
  '1',
  'an administrator approves a proposal'
);
select is(
  (select array[c.status, c.cadence, c.pulse_rotation::text, (select count(*)::text from public.campaign_units u where u.campaign_id = c.id)]
   from public.campaign_schedule s join public.campaigns c on c.id = s.campaign_id
   where s.id = tests.id('alpha_pulse_proposal') and s.status = 'scheduled'),
  array['scheduled', 'quarterly_pulse', '1', '2'],
  'which becomes a scheduled pulse of the anchor''s units, on the first rotation row'
);
select alike(
  tests.attempt('alpha_admin', format($$select public.decide_schedule_proposal(%L, false)$$, tests.id('alpha_pulse_proposal'))),
  'error: 22023 this proposal has already been decided%',
  'a proposal is decided once'
);
select tests.attempt('alpha_admin', format($$select public.cancel_campaign(%L)$$,
  (select campaign_id from public.campaign_schedule where id = tests.id('alpha_pulse_proposal'))), p_keep => true);
select is(
  (select status from public.campaign_schedule where id = tests.id('alpha_pulse_proposal')),
  'proposed',
  'cancelling the scheduled campaign puts the proposal back'
);
select tests.attempt('support_a', format($$select public.decide_schedule_proposal(%L, false)$$, tests.id('alpha_half_proposal')), p_keep => true);
select ok(
  (select s.status = 'dismissed' and s.campaign_id is null and s.decided_by = tests.user_id('support_a')
   from public.campaign_schedule s where s.id = tests.id('alpha_half_proposal')),
  'staff under a session dismiss a proposal, which records who'
);

select * from finish();

rollback;
