-- Provisioning, subscription terms, staff designation, support sessions, the opt-out and factor
-- resets (PORTAL_BUILD_PLAN.md 11; Online Measurement Specification v0.9 Part 7; Milestone 3 plan,
-- Sections 7 and 9). Each is a checked function that writes its own audit entry.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(28);

select tests.seed_fixture();

-- Provisioning.
select tests.attempt('support_a', $$
  select public.provision_organisation('Delta Test Pty Ltd', 'test_band', tests.today(), tests.today() + 364,
    tests.today(), 'INV-DELTA-1', 'owner@delta.test')
$$, p_keep => true);
select tests.remember('delta', (select id from public.organisations where name = 'Delta Test Pty Ltd'));

select is(private.subscription_state(tests.id('delta')), 'active', 'support staff provision an organisation with its first term');
select ok(
  exists (select 1 from public.membership_invitations where organisation_id = tests.id('delta') and role = 'account_owner'),
  'and invite its account owner'
);
select results_eq(
  $$ select actor_kind, actor_user_id from public.audit_logs where organisation_id = tests.id('delta') and action = 'organisation.provisioned' $$,
  $$ values ('support'::text, tests.user_id('support_a')) $$,
  'provisioning is audited against the staff member'
);
select is(tests.attempt('alpha_ao', $$select public.provision_organisation('X', 'test_band', tests.today(), tests.today() + 364, tests.today(), 'INV-X', 'x@x.test')$$),
  'denied', 'a client cannot provision');
select is(tests.attempt('anon', $$select public.provision_organisation('X', 'test_band', tests.today(), tests.today() + 364, tests.today(), 'INV-X', 'x@x.test')$$),
  'denied', 'nor can anyone anonymously');

-- Terms and overrides.
select is(tests.attempt('owner', $$select public.record_subscription_term(tests.id('delta'), 'test_band', tests.today() + 365, tests.today() + 729, tests.today(), 'INV-DELTA-2')$$),
  '1', 'the Owner records a renewal term');
select is(tests.attempt('alpha_ao', $$select public.record_subscription_term(tests.id('alpha'), 'test_band', tests.today() + 300, tests.today() + 600, tests.today(), 'INV-A-2')$$),
  'denied', 'a client cannot record a term');
select tests.attempt('support_b', $$
  select public.set_subscription_override((select id from public.subscriptions where organisation_id = tests.id('delta')), 'suspended', 'Invoice unpaid')
$$, p_keep => true);
select is(private.subscription_state(tests.id('delta')), 'suspended', 'staff can suspend a term by hand');
select tests.attempt('support_b', $$
  select public.set_subscription_override((select id from public.subscriptions where organisation_id = tests.id('delta')), null, null)
$$, p_keep => true);
select is(private.subscription_state(tests.id('delta')), 'active', 'and clear the override');

-- Staff designation.
select tests.attempt('owner', $$select public.set_support_staff(tests.user_id('outsider'), true)$$, p_keep => true);
select ok((select is_support_staff from public.profiles where id = tests.user_id('outsider')), 'the Owner designates support staff');
select is(tests.attempt('support_a', $$select public.set_support_staff(tests.user_id('support_b'), false)$$),
  'denied', 'support staff cannot designate staff');
select alike(tests.attempt('owner', $$select public.set_support_staff(tests.user_id('alpha_exec'), true)$$),
  'error: 23514%', 'a client member cannot be designated');
select tests.attempt('owner', $$select public.set_support_staff(tests.user_id('support_a'), false)$$, p_keep => true);
select is(
  (select count(*)::integer from public.support_sessions where staff_user_id = tests.user_id('support_a') and ended_at is null),
  0,
  'removing the designation ends the person''s open sessions'
);

-- Support sessions through the functions.
select tests.attempt('support_b', $$select public.open_support_session(tests.id('beta'), 'Checking the unit hierarchy')$$, p_keep => true);
select results_eq(
  $$ select kind, staff_name, expires_at > now() + interval '119 minutes' from public.support_sessions where staff_user_id = tests.user_id('support_b') and organisation_id = tests.id('beta') $$,
  $$ values ('support'::text, 'Sasha Support'::text, true) $$,
  'staff open a named, time-limited session'
);
select is(tests.visible_rows('support_b', 'org_memberships', tests.id('beta')), 5, 'which gives access to that organisation');
select alike(tests.attempt('support_b', $$select public.open_support_session(tests.id('beta'), 'Opening a second one')$$),
  'error: 22023%', 'one open session per organisation at a time');
select alike(tests.attempt('support_b', $$select public.open_support_session(tests.id('alpha'), 'short')$$),
  'error: 23514%', 'the reason must be written out');
select is(tests.attempt('alpha_ao', $$select public.open_support_session(tests.id('alpha'), 'A client trying to open one')$$),
  'denied', 'a client cannot open a session');
select tests.attempt('owner', $$select public.open_support_session(tests.id('beta'), 'Owner reviewing a support question')$$, p_keep => true);
select is(
  (select kind from public.support_sessions where staff_user_id = tests.user_id('owner') and organisation_id = tests.id('beta') and ended_at is null),
  'owner',
  'the Owner''s sessions are labelled as the Owner''s'
);
select tests.attempt('support_b', $$select public.close_support_session((select id from public.support_sessions where staff_user_id = auth.uid() and ended_at is null))$$, p_keep => true);
select is(tests.visible_rows('support_b', 'org_memberships', tests.id('beta')), 0, 'closing the session ends the access');

-- The opt-out.
select tests.attempt('alpha_ao', $$select public.set_data_contribution_opt_out(tests.id('alpha'), true)$$, p_keep => true);
select ok((select data_contribution_opt_out from public.organisations where id = tests.id('alpha')), 'the account owner sets the opt-out');
select is(tests.attempt('alpha_admin', $$select public.set_data_contribution_opt_out(tests.id('alpha'), false)$$),
  'denied', 'an administrator cannot');

-- Factor resets.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
select gen_random_uuid(), tests.user_id(k), 'phone', 'totp', 'verified', now(), now(), 'secret'
from unnest(array['alpha_admin', 'alpha_exec', 'support_b']) as k;

select tests.attempt('alpha_ao', $$select public.reset_factors(tests.user_id('alpha_exec'))$$, p_keep => true);
select is((select count(*)::integer from auth.mfa_factors where user_id = tests.user_id('alpha_exec')), 0,
  'the account owner resets a factor of a person who belongs to their organisation alone');
select ok(
  exists (select 1 from public.audit_logs where organisation_id = tests.id('alpha') and action = 'mfa.factors_reset' and entity_id = tests.user_id('alpha_exec')),
  'and the organisation sees the reset in its log'
);

-- A person who also belongs to Beta.
insert into public.org_memberships (organisation_id, user_id, role) values (tests.id('beta'), tests.user_id('alpha_admin'), 'executive_viewer');
select is(tests.attempt('alpha_ao', $$select public.reset_factors(tests.user_id('alpha_admin'))$$),
  'denied', 'but not of a person who also belongs to another organisation');
select is(tests.attempt('support_a', $$select public.reset_factors(tests.user_id('support_b'))$$),
  'denied', 'support staff cannot reset another staff member''s factor');
select is(tests.attempt('support_b', $$select public.reset_factors(tests.user_id('owner'))$$),
  'denied', 'nobody resets the Owner''s factor through the portal');

-- The step-up: TOTP verified more than 15 minutes ago is not enough.
select tests.authenticate_as('alpha_ao', 'aal2', null, null, interval '20 minutes');
select throws_ok($$select public.reset_factors(tests.user_id('alpha_uv'))$$, '42501', null,
  'a reset needs TOTP verified within the last 15 minutes');
select tests.as_postgres();

select * from finish();

rollback;
