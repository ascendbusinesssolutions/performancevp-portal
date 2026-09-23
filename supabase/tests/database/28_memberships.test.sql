-- Memberships and invitations (PORTAL_BUILD_PLAN.md 3.2 and 4; Milestone 3 plan, Sections 2.1 and 9).
--
-- The account owner grants administrator and viewer roles. An address with an account gets the
-- membership at once; any other gets an invitation, claimed when its account is created. Revocation
-- takes effect on the next query. The account owner is changed only by staff. Manager memberships
-- are never granted by a person.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(19);

select tests.seed_fixture();

-- An address that already has an account.
select is(
  tests.value_as('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'OUTSIDER@elsewhere.test', 'administrator')::text$$),
  'false',
  'granting access to an existing account needs no new account'
);
select is(tests.visible_rows('outsider', 'org_memberships', tests.id('alpha')), 5,
  'and the membership is live at once: the outsider now administers Alpha and sees its five memberships');

-- An address without an account.
select is(
  tests.value_as('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'new.exec@alpha.test', 'executive_viewer')::text$$),
  'true',
  'granting access to a new address records an invitation and reports that an account is needed'
);
select tests.create_user('new_exec', 'new.exec@alpha.test');
select ok(
  exists (select 1 from public.org_memberships where user_id = tests.user_id('new_exec') and role = 'executive_viewer' and revoked_at is null),
  'creating the account claims the invitation'
);
select ok(
  (select claimed_at is not null from public.membership_invitations where email = 'new.exec@alpha.test'),
  'and marks it claimed'
);

-- Who may grant, and what.
select is(tests.attempt('alpha_admin', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'executive_viewer')$$),
  'denied', 'an administrator cannot grant access');
select is(tests.attempt('support_a', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'executive_viewer')$$),
  'denied', 'staff cannot grant access');
select is(tests.attempt('beta_ao', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'executive_viewer')$$),
  'denied', 'another organisation''s account owner cannot grant access');
select alike(tests.attempt('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'manager_respondent')$$),
  'error: 22023%', 'manager access is never granted by a person');
select alike(tests.attempt('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'account_owner')$$),
  'error: 22023%', 'the account owner cannot appoint another account owner');
select alike(tests.attempt('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'support.a@pvp.test', 'executive_viewer')$$),
  'error: 22023%', 'staff cannot be given a membership');

select tests.set_state('alpha', 'grace');
select is(tests.attempt('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'executive_viewer')$$),
  'denied', 'no access is granted during grace');
select tests.set_state('alpha', 'active');

-- Revocation.
select tests.attempt('alpha_ao',
  $$select public.revoke_membership((select id from public.org_memberships where user_id = tests.user_id('alpha_exec')))$$,
  p_keep => true);
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha')), 0,
  'a revoked member loses access on the next query');
select alike(
  tests.attempt('alpha_ao', $$select public.revoke_membership((select id from public.org_memberships where user_id = tests.user_id('alpha_ao')))$$),
  'error: 22023%',
  'the account owner cannot revoke their own role'
);
select is(
  tests.attempt('alpha_admin', $$select public.revoke_membership((select id from public.org_memberships where user_id = tests.user_id('alpha_uv')))$$),
  'denied',
  'an administrator cannot revoke access'
);

-- Changing the account owner.
select tests.attempt('support_a', $$select public.replace_account_owner(tests.id('alpha'), 'admin@alpha.test')$$, p_keep => true);
select is(tests.visible_rows('alpha_ao', 'subscriptions', tests.id('alpha')), 0,
  'staff replace the account owner, and the previous one loses the role');
select is(tests.visible_rows('alpha_admin', 'subscriptions', tests.id('alpha')), 1,
  'the new account owner holds it');

-- Constraints.
select throws_ok(
  $$insert into public.org_memberships (organisation_id, user_id, role) values (tests.id('alpha'), tests.user_id('outsider'), 'manager_respondent')$$,
  '23514', null,
  'a manager membership requires the manager''s directory record'
);
select throws_ok(
  $$insert into public.org_memberships (organisation_id, user_id, role) values (tests.id('beta'), tests.user_id('outsider'), 'account_owner')$$,
  '23505', null,
  'an organisation has one account owner'
);

select * from finish();

rollback;
