-- The setup version (Milestone 5 plan, D27): every write to a readiness input moves it, in the
-- writer's transaction, including the purge, whose audit rows are suppressed; only the service role
-- reads it; the launch refuses a stale one (37_campaign_lifecycle). And the cadence calendar a
-- baseline proposes is read by administrators, not viewers (plan 2.2).
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(9);

select tests.seed_fixture();

create temp table v (step text, version bigint);
insert into v values ('start', public.setup_version(tests.id('alpha')));

update public.employees set role_title = 'Lead Analyst' where id = tests.id('alpha_E003');
insert into v values ('employee', public.setup_version(tests.id('alpha')));
insert into public.critical_processes (organisation_id, measurement_unit_id, name)
values (tests.id('alpha'), tests.mu('alpha_C2'), 'Quoting');
insert into v values ('context', public.setup_version(tests.id('alpha')));
update public.rating_scale_maps set calibrated = false where organisation_id = tests.id('alpha');
insert into v values ('scale map', public.setup_version(tests.id('alpha')));
update public.formal_ratings set rating_label = 'Exceeds' where employee_id = tests.id('alpha_E004');
insert into v values ('formal rating', public.setup_version(tests.id('alpha')));

-- 1 to 4: each kind of setup write moves the version.
select ok((select version from v where step = 'employee') > (select version from v where step = 'start'), 'a directory edit moves the setup version');
select ok((select version from v where step = 'context') > (select version from v where step = 'employee'), 'a context edit moves it');
select ok((select version from v where step = 'scale map') > (select version from v where step = 'context'), 'a scale-map edit moves it');
select ok((select version from v where step = 'formal rating') > (select version from v where step = 'scale map'), 'a formal-rating edit moves it');

-- 5: the purge moves it, although its row audit is suppressed.
select tests.as_service();
select public.purge_deactivated_employees();
select tests.as_postgres();
select ok(
  public.setup_version(tests.id('alpha')) > (select version from v where step = 'formal rating'),
  'the purge moves it too, although it writes no row audit'
);

-- 6: another organisation's writes do not.
insert into v values ('before beta', public.setup_version(tests.id('alpha')));
update public.employees set role_title = 'Lead Analyst' where id = tests.id('beta_E003');
select is(public.setup_version(tests.id('alpha')), (select version from v where step = 'before beta'),
  'each organisation has its own version');

-- 7: only the service role reads it.
select is(
  array[
    tests.attempt('alpha_admin', format($$select public.setup_version(%L)$$, tests.id('alpha'))),
    tests.attempt('service', format($$select public.setup_version(%L)$$, tests.id('alpha')))
  ],
  array['denied', '1'],
  'only the service role reads the setup version'
);

-- 8 and 9: the calendar.
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_year', array['C1']);
select tests.launch(tests.id('alpha_year'), 'alpha_admin');
select is(
  array[
    tests.count_as('alpha_admin', $$select count(*)::integer from public.campaign_schedule$$),
    tests.count_as('support_a', $$select count(*)::integer from public.campaign_schedule$$)
  ],
  array[4, 4],
  'administrators and staff under a session read the year''s proposals'
);
select is(
  array[
    tests.count_as('alpha_exec', $$select count(*)::integer from public.campaign_schedule$$),
    tests.count_as('beta_ao', $$select count(*)::integer from public.campaign_schedule$$)
  ],
  array[0, 0],
  'viewers and other organisations do not'
);

select * from finish();

rollback;
