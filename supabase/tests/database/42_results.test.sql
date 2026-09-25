-- What the close stores and who reads it (PORTAL_BUILD_PLAN.md 2.6 and 3.3; Milestone 5 plan, 6.2,
-- 6.3 and D16, D17). A run is stored whole by the service role after the rewrite, once per cycle,
-- and never changes; a cycle changes once, when it is released. Administrators, the account owner
-- and staff under a session read every cycle; viewers read only released cycles in their scope, and
-- of those only the scores, composites, trip-wires and the run's methodology. Only an administrator
-- or the account owner releases. A pulse stores aggregates and no run.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(20);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_res', array['C1', 'C2']);
select tests.launch(tests.id('alpha_res'), 'alpha_admin');

create temp view units as
  select cu.id, mu.code from public.campaign_units cu join public.measurement_units mu on mu.id = cu.measurement_unit_id
  where cu.campaign_id = tests.id('alpha_res');

-- 1 and 2: nothing is stored before the rewrite, and only by the service role.
select alike(
  tests.attempt('service', format($$select public.store_calculation_run(%L, %L::jsonb)$$,
    (select id from units where code = 'C1'), tests.run_payload())),
  'error: 22023 a result is stored for a closed campaign whose responses have been rewritten%',
  'a result waits for the close and the rewrite'
);
select tests.close_and_settle(tests.id('alpha_res'));
select is(
  tests.attempt('alpha_admin', format($$select public.store_calculation_run(%L, %L::jsonb)$$,
    (select id from units where code = 'C1'), tests.run_payload())),
  'denied',
  'no signed-in person stores a result'
);

-- 3 to 6: storing.
select is(
  tests.attempt('service', format($$select public.store_calculation_run(%L, %L::jsonb)$$,
    (select id from units where code = 'C1'), tests.run_payload()), p_keep => true),
  '1',
  'the service role stores a unit''s run'
);
select is(
  (select array[
     (select count(*) from public.sub_dimension_scores s join public.calculation_runs r on r.id = s.run_id join public.measurement_cycles c on c.id = r.cycle_id where c.campaign_unit_id = u.id),
     (select count(*) from public.trip_wire_results s join public.calculation_runs r on r.id = s.run_id join public.measurement_cycles c on c.id = r.cycle_id where c.campaign_unit_id = u.id),
     (select jsonb_array_length(cs.ranking) from public.composite_scores cs join public.calculation_runs r on r.id = cs.run_id join public.measurement_cycles c on c.id = r.cycle_id where c.campaign_unit_id = u.id)
   ]::integer[] from units u where u.code = 'C1'),
  array[17, 3, 14],
  'in one transaction: seventeen scores, three trip-wires and all fourteen ranking rows'
);
select alike(
  tests.attempt('service', format($$select public.store_calculation_run(%L, %L::jsonb)$$,
    (select id from units where code = 'C1'), tests.run_payload())),
  'error: 22023 this campaign unit already has its result%',
  'one run per cycle'
);
select is(
  (select status from public.campaigns where id = tests.id('alpha_res')),
  'closed',
  'the campaign stays closed until every unit is stored'
);
select tests.attempt('service', format($$select public.store_calculation_run(%L, %L::jsonb)$$,
  (select id from units where code = 'C2'), tests.run_payload()), p_keep => true);

-- 7 and 8: under review.
select is(
  (select status from public.campaigns where id = tests.id('alpha_res')),
  'under_review',
  'with every unit stored the campaign is under review'
);
select is(
  (select count(*)::integer from private.email_outbox where campaign_id = tests.id('alpha_res') and kind = 'scores_ready'),
  2,
  'and the account owner and each administrator are told'
);

-- 9 and 10: before release, viewers read nothing.
create temp table visibility (persona text, tbl text, expected integer);
insert into visibility values
  ('alpha_admin', 'measurement_cycles', 2), ('alpha_ao', 'calculation_runs', 2), ('support_a', 'sub_dimension_scores', 34),
  ('alpha_admin', 'engine_inputs', 2), ('alpha_admin', 'calculation_run_details', 2), ('alpha_admin', 'unit_aggregates', 2),
  ('alpha_exec', 'measurement_cycles', 0), ('alpha_exec', 'sub_dimension_scores', 0), ('alpha_uv', 'composite_scores', 0),
  ('alpha_mgr', 'measurement_cycles', 0), ('beta_ao', 'measurement_cycles', 0);
select is_empty(
  $$
    select persona, tbl, expected from visibility
    where expected is distinct from tests.visible_rows(persona, tbl, tests.id('alpha'), 'aal2',
      case when persona = 'alpha_mgr' then array['otp'] end)
  $$,
  'before release: administrators, the account owner and staff read everything; no viewer reads anything'
);
select is(
  tests.visible_rows('anon', 'measurement_cycles', tests.id('alpha')),
  -1,
  'the anonymous role holds nothing'
);

-- 11 to 13: who releases.
select is(
  array[
    tests.attempt('support_a', format($$select public.release_cycles(%L)$$, tests.id('alpha_res'))),
    tests.attempt('alpha_exec', format($$select public.release_cycles(%L)$$, tests.id('alpha_res'))),
    tests.attempt('alpha_admin', format($$select public.release_cycles(%L)$$, tests.id('alpha_res')), 'aal1')
  ],
  array['denied', 'denied', 'denied'],
  'staff under a session, a viewer and an administrator without TOTP do not release (D16)'
);
select is(
  tests.attempt('alpha_admin', format($$select public.release_cycles(%L, array[%L]::uuid[])$$, tests.id('alpha_res'), tests.mu('alpha_C1')), p_keep => true),
  '1',
  'an administrator releases one unit'
);
select ok(
  (select c.status = 'released' and c.released_by = tests.user_id('alpha_admin') and c.released_at is not null
   from public.measurement_cycles c join units u on u.id = c.campaign_unit_id where u.code = 'C1'),
  'the release records who and when'
);

-- 14 to 16: after release, viewers read released cycles in scope, and never the inputs.
delete from visibility;
insert into visibility values
  ('alpha_exec', 'measurement_cycles', 1), ('alpha_exec', 'calculation_runs', 1), ('alpha_exec', 'sub_dimension_scores', 17),
  ('alpha_exec', 'composite_scores', 1), ('alpha_exec', 'trip_wire_results', 3),
  ('alpha_exec', 'engine_inputs', 0), ('alpha_exec', 'calculation_run_details', 0), ('alpha_exec', 'unit_aggregates', 0),
  ('alpha_uv', 'measurement_cycles', 1), ('alpha_uv', 'sub_dimension_scores', 17), ('alpha_uv', 'engine_inputs', 0);
select is_empty(
  $$ select persona, tbl, expected from visibility where expected is distinct from tests.visible_rows(persona, tbl, tests.id('alpha')) $$,
  'after release: viewers read the released unit''s scores, composites, trip-wires and methodology, and no input'
);
select tests.attempt('alpha_ao', format($$select public.release_cycles(%L)$$, tests.id('alpha_res')), p_keep => true);
select is(
  array[
    tests.visible_rows('alpha_exec', 'measurement_cycles', tests.id('alpha')),
    tests.visible_rows('alpha_uv', 'measurement_cycles', tests.id('alpha'))
  ],
  array[2, 1],
  'with both released, the executive reads both and the unit viewer only the unit in scope'
);
select is(
  (select status from public.campaigns where id = tests.id('alpha_res')),
  'released',
  'the campaign reads released once every unit is'
);

-- 17 and 18: immutability.
select throws_ok(
  format($$update public.sub_dimension_scores set score = 99 where run_id in (
    select r.id from public.calculation_runs r join public.measurement_cycles c on c.id = r.cycle_id
    join public.campaign_units cu on cu.id = c.campaign_unit_id where cu.campaign_id = %L)$$, tests.id('alpha_res')),
  '42501',
  'sub_dimension_scores rows never change',
  'a stored score never changes, even for the owner of the tables'
);
select throws_ok(
  format($$update public.measurement_cycles set status = 'under_review', released_at = null where campaign_unit_id in (
    select id from public.campaign_units where campaign_id = %L)$$, tests.id('alpha_res')),
  '42501',
  'a measurement cycle changes only by being released',
  'and a release is never taken back'
);

-- 19 and 20: a pulse stores aggregates and no run.
select tests.draft_campaign('alpha', 'alpha_pulse', array['G1'], 'quarterly_pulse');
select tests.launch(tests.id('alpha_pulse'), 'alpha_admin');
select tests.close_and_settle(tests.id('alpha_pulse'));
select alike(
  tests.attempt('service', format($$select public.store_calculation_run(%L, %L::jsonb)$$,
    (select id from public.campaign_units where campaign_id = tests.id('alpha_pulse')), tests.run_payload())),
  'error: 22023 a pulse stores its aggregates and never a run%',
  'a pulse never recalculates P (Cadence Master 7.2)'
);
select tests.attempt('service', format($$select public.store_pulse_result(%L, %L::jsonb)$$,
  (select id from public.campaign_units where campaign_id = tests.id('alpha_pulse')),
  jsonb_build_object('cycle', jsonb_build_object('measuredOn', private.today()),
                     'aggregates', jsonb_build_object('instruments', '{}'::jsonb, 'screening', '{}'::jsonb,
                                                      'pulse', '{"means": {"MI1-01": 3.8}}'::jsonb))), p_keep => true);
select ok(
  (select c.kind = 'quarterly_pulse' and a.pulse is not null
          and not exists (select 1 from public.calculation_runs r where r.cycle_id = c.id)
   from public.measurement_cycles c join public.unit_aggregates a on a.cycle_id = c.id
   join public.campaign_units cu on cu.id = c.campaign_unit_id where cu.campaign_id = tests.id('alpha_pulse')),
  'it stores the pulse''s aggregates for the trajectory layer, and no run'
);

select * from finish();

rollback;
