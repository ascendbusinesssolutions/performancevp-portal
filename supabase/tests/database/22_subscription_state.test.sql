-- The subscription state and what it does to access (PORTAL_BUILD_PLAN.md 11; DECISIONS.md 5.5;
-- Milestone 3 plan, Section 7).
--
-- The state is computed from the governing term (the latest that has started) on the Sydney
-- calendar: pending before any term starts, active within it, grace for 30 days after it ends,
-- suspended afterwards or with no term at all; an override takes precedence. Grace is read-only;
-- suspension closes client access, except that the account owner still sees the organisation,
-- the subscription, staff sessions and the audit log.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(21);

select tests.seed_fixture();

select is(private.today(), (now() at time zone 'Australia/Sydney')::date,
  'dates are on the Sydney calendar');

-- A standalone organisation with fixed dates.
insert into public.organisations (name) values ('Gamma Test Pty Ltd') returning id \gset gamma_
select is(private.subscription_state(:'gamma_id'), 'suspended', 'no term at all is suspended');

insert into public.subscriptions (organisation_id, employee_band, period_start, period_end, agreement_date, invoice_reference, provisioned_by)
values (:'gamma_id', 'test_band', '2026-01-01', '2026-12-31', '2025-12-15', 'INV-G-1', tests.user_id('support_a'));

select is(private.subscription_state(:'gamma_id', '2025-12-31'), 'pending', 'before the first term starts: pending');
select is(private.subscription_state(:'gamma_id', '2026-01-01'), 'active', 'the first day: active');
select is(private.subscription_state(:'gamma_id', '2026-12-31'), 'active', 'the last day: active');
select is(private.subscription_state(:'gamma_id', '2027-01-01'), 'grace', 'the day after: grace');
select is(private.subscription_state(:'gamma_id', '2027-01-30'), 'grace', 'the 30th day after: grace');
select is(private.subscription_state(:'gamma_id', '2027-01-31'), 'suspended', 'the 31st day after: suspended');

-- A renewal with a gap: the lapsed term governs until the new one starts.
insert into public.subscriptions (organisation_id, employee_band, period_start, period_end, agreement_date, invoice_reference, provisioned_by)
values (:'gamma_id', 'test_band', '2027-06-01', '2028-05-31', '2027-05-20', 'INV-G-2', tests.user_id('support_a'));
select is(private.subscription_state(:'gamma_id', '2027-03-01'), 'suspended',
  'a renewal that has not started yet does not revive a lapsed organisation');
select is(private.subscription_state(:'gamma_id', '2027-06-01'), 'active', 'the renewal is active from its start');

select throws_ok(
  format($$insert into public.subscriptions (organisation_id, employee_band, period_start, period_end, agreement_date, invoice_reference, provisioned_by)
    values (%L, 'test_band', '2027-12-01', '2028-12-31', '2027-11-01', 'INV-G-3', %L)$$, :'gamma_id', tests.user_id('support_a')),
  '23P01',
  null,
  'terms cannot overlap'
);

update public.subscriptions set state_override = 'suspended', override_reason = 'Invoice unpaid'
where organisation_id = :'gamma_id' and invoice_reference = 'INV-G-2';
select is(private.subscription_state(:'gamma_id', '2027-07-01'), 'suspended', 'an override suspends an active term');
update public.subscriptions set state_override = 'cancelled', override_reason = 'Agreement ended'
where organisation_id = :'gamma_id' and invoice_reference = 'INV-G-2';
select is(private.subscription_state(:'gamma_id', '2027-07-01'), 'cancelled', 'an override can cancel');

-- What each state does to access.
select tests.set_state('alpha', 'pending');
select is(
  tests.attempt('alpha_admin', $$update public.organisations set name = 'Onboarding' where id = tests.id('alpha')$$),
  '1',
  'pending: onboarding can write'
);

select tests.set_state('alpha', 'grace');
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha')), 1, 'grace: readable');
select is(
  tests.attempt('alpha_admin', $$update public.organisations set name = 'Late' where id = tests.id('alpha')$$),
  '0',
  'grace: nothing can be written'
);

select tests.set_state('alpha', 'suspended');
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha')), 0, 'suspended: client access is closed');
select is(tests.visible_rows('alpha_admin', 'organisations', tests.id('alpha')), 0, 'suspended: administrators too');
select is(tests.visible_rows('alpha_ao', 'organisations', tests.id('alpha')), 1,
  'suspended: the account owner still sees the organisation');
select is(tests.visible_rows('alpha_ao', 'subscriptions', tests.id('alpha')), 1,
  'suspended: and its subscription');
select is(tests.visible_rows('beta_exec', 'organisations', tests.id('beta')), 1,
  'another organisation is unaffected');

select * from finish();

rollback;
