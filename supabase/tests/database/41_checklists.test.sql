-- The administrator checklists (Online Measurement Specification 4.2 to 4.3a; Milestone 5 plan,
-- 3.4): each save a new version, the answers checked against the frozen context, entered while the
-- campaign is open by administrators, the account owner or staff under a session, and never imaged
-- in the audit log.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(11);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_check', array['C1']);
select tests.launch(tests.id('alpha_check'), 'alpha_admin');
select tests.remember('alpha_check_cu', (select id from public.campaign_units where campaign_id = tests.id('alpha_check')));

create function pg_temp.save(p_persona text, p_checklist text, p_answers jsonb)
returns text
language sql
as $$
  select tests.attempt(p_persona, format($f$select public.save_checklist(%L, %L, %L::jsonb)$f$,
    tests.id('alpha_check_cu'), p_checklist, p_answers), p_keep => true)
$$;

-- 1 to 3: the three checklists, keyed by the frozen context.
select is(
  pg_temp.save('alpha_admin', 'ADM-O1', jsonb_build_object(
    tests.id('alpha_analyst'), '{"ra1": true, "ra2": true, "ra3": false}'::jsonb,
    tests.id('alpha_lead'), '{"ra1": true, "ra2": null}'::jsonb)),
  '1',
  'ADM-O1 per role family in the unit, partly answered if need be'
);
select is(
  pg_temp.save('support_a', 'ADM-O2', jsonb_build_object(
    tests.id('alpha_system'), '{"ti1": true, "ti2": false, "ti3": "partly", "int1": "scheduled"}'::jsonb)),
  '1',
  'ADM-O2 per frozen system, by staff under a session'
);
select is(
  pg_temp.save('alpha_ao', 'ADM-O4', '{"utilisationPercent": 108, "overtimeHoursPerFte": 4.5, "backlogChangePercent": "not-applicable"}'::jsonb),
  '1',
  'ADM-O4 as figures, with backlog not applicable'
);

-- 4 to 6: what is refused.
select is(
  array[
    pg_temp.save('alpha_admin', 'ADM-O1', jsonb_build_object(gen_random_uuid(), '{"ra1": true}'::jsonb)),
    pg_temp.save('alpha_admin', 'ADM-O2', jsonb_build_object(tests.id('alpha_system'), '{"ti3": "sometimes"}'::jsonb)),
    pg_temp.save('alpha_admin', 'ADM-O4', '{"utilisationPercent": "high"}'::jsonb),
    pg_temp.save('alpha_admin', 'ADM-O3', '{}'::jsonb)
  ] ,
  array[
    'error: 22023 ADM-O1 answers are yes or no for RA-1 to RA-3, per role family in the unit',
    'error: 22023 ADM-O2 answers are TI-1 to TI-3 and INT-1, per system in the unit',
    'error: 22023 ADM-O4 answers are the five capacity facts, as figures',
    'error: 22023 this campaign does not ask this checklist of this unit'
  ],
  'a role family or system outside the unit, an answer outside the instrument, and an unknown checklist are refused'
);
select is(
  array[
    pg_temp.save('alpha_exec', 'ADM-O4', '{}'::jsonb),
    pg_temp.save('alpha_uv', 'ADM-O4', '{}'::jsonb),
    tests.attempt('alpha_mgr', format($$select public.save_checklist(%L, 'ADM-O4', '{}'::jsonb)$$, tests.id('alpha_check_cu')), 'aal1', array['otp'])
  ],
  array['denied', 'denied', 'denied'],
  'viewers and managers do not complete checklists'
);
select is(
  tests.attempt('beta_admin', format($$select public.save_checklist(%L, 'ADM-O4', '{}'::jsonb)$$, tests.id('alpha_check_cu'))),
  'denied',
  'nor does another organisation'
);

-- 7 and 8: versions.
select is(pg_temp.save('alpha_admin', 'ADM-O4', '{"utilisationPercent": 90, "vacancyRatePercent": 4, "absenceAboveBaselinePercent": 0}'::jsonb), '1',
  'a second save of a checklist');
select is(
  (select array_agg(version order by version) from public.checklist_responses
   where campaign_unit_id = tests.id('alpha_check_cu') and checklist_code = 'ADM-O4'),
  array[1, 2],
  'is a new version; the close uses the latest'
);

-- 9 and 10: who reads them; the audit keeps ids only.
select is(
  array[
    tests.count_as('alpha_admin', $$select count(*)::integer from public.checklist_responses$$),
    tests.count_as('alpha_exec', $$select count(*)::integer from public.checklist_responses$$)
  ],
  array[4, 0],
  'administrators read the checklists; viewers do not'
);
select is_empty(
  $$
    select id from public.audit_logs
    where entity_type = 'checklist_responses'
      and (after::text ~ 'utilisation|ra1|ti3|int1' or before is not null)
  $$,
  'no checklist answer is copied into the audit log'
);

-- 11: only while open.
update public.campaigns set status = 'closed', closed_at = now() where id = tests.id('alpha_check');
select alike(pg_temp.save('alpha_admin', 'ADM-O4', '{}'::jsonb), 'error: 22023 checklists are completed while the campaign is open%',
  'after the close a checklist is fixed');

select * from finish();

rollback;
