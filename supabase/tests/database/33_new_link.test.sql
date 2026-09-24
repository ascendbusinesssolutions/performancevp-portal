-- "Send me a new link" (PORTAL_BUILD_PLAN.md Milestone 4; Milestone 4 plan, Section 8). Only the
-- server, with the secret key, asks which link an address should receive. The answer is an
-- invitation where one was never taken up, a password link where a confirmed account holds a role
-- that signs in with a password, and nothing otherwise, including within the cooldown. The page
-- answers the same in every case; these tests prove the decision behind it.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(15);

select tests.seed_fixture();

create function tests.link_for(p_email text)
returns text
language sql
as $$
  select tests.value_as('service', format('select public.new_link_kind(%L)', p_email))
$$;

-- 1: nobody but the server can ask.
select is(
  array[
    tests.attempt('anon', $$select public.new_link_kind('admin@alpha.test')$$),
    tests.attempt('alpha_admin', $$select public.new_link_kind('admin@alpha.test')$$),
    tests.attempt('owner', $$select public.new_link_kind('admin@alpha.test')$$)
  ],
  array['denied', 'denied', 'denied'],
  'only the service role can ask which link an address should receive'
);

-- 2 to 4: a confirmed account with a password role gets a password link, once per cooldown.
select is(tests.link_for('admin@alpha.test'), 'recovery',
  'a confirmed administrator is sent a password link');
select is(tests.link_for('admin@alpha.test'), null,
  'a second request inside the cooldown sends nothing');
select is(tests.link_for('  ADMIN@Alpha.test '), null,
  'and the address is matched without regard to case or spaces, so the cooldown holds');

-- 5 to 6: after the cooldown, up to the hourly limit.
update private.auth_link_requests set requested_at = requested_at - interval '2 minutes';
select is(tests.link_for('admin@alpha.test'), 'recovery', 'after the cooldown a new link can be sent');
insert into private.auth_link_requests (user_id, requested_at)
select tests.user_id('alpha_admin'), now() - make_interval(mins => m) from generate_series(10, 12) as m;
update private.auth_link_requests set requested_at = requested_at - interval '2 minutes'
where user_id = tests.user_id('alpha_admin') and requested_at > now() - interval '1 minute';
select is(tests.link_for('admin@alpha.test'), null, 'but no more than five in an hour');

-- 7: old requests are removed on the next call, whoever it is for.
insert into private.auth_link_requests (user_id, requested_at)
values (tests.user_id('alpha_exec'), now() - interval '2 hours');
select tests.link_for('nobody@alpha.test');
select is(
  (select count(*)::integer from private.auth_link_requests where requested_at < now() - interval '1 hour'),
  0,
  'requests older than an hour are removed'
);

-- 8: support staff, who sign in with a password, are sent a password link.
select is(tests.link_for('support.a@pvp.test'), 'recovery', 'support staff are sent a password link');

-- 9 to 11: nothing for an unknown address, a malformed one, or a manager.
select is(tests.link_for('nobody@alpha.test'), null, 'an unknown address is sent nothing');
select is(tests.link_for('not an address'), null, 'nor is something that is not an address');
select is(tests.link_for('mgr@alpha.test'), null,
  'a manager, who signs in with a code and never holds a password, is sent nothing');

-- 12: nothing for an account with no role left.
select is(tests.link_for('outsider@elsewhere.test'), null, 'an account with no role is sent nothing');

-- 13: an invitation never taken up is sent again.
select tests.create_user('invited', 'invited@alpha.test', 'Ivy Invited');
update auth.users set email_confirmed_at = null, invited_at = now() - interval '2 hours'
where id = tests.user_id('invited');
insert into public.org_memberships (organisation_id, user_id, role)
values (tests.id('alpha'), tests.user_id('invited'), 'executive_viewer');
select is(tests.link_for('invited@alpha.test'), 'invite',
  'an invited person who never confirmed is sent the invitation again');

-- 14: and so is an open invitation whose account was never created.
insert into public.membership_invitations (organisation_id, email, role)
values (tests.id('alpha'), 'pending@alpha.test', 'administrator');
select is(tests.link_for('pending@alpha.test'), 'invite',
  'an open invitation with no account yet is sent again');

-- 15: the cooldown is kept by account, never by address.
select is(
  (select array_agg(column_name::text order by column_name::text)
   from information_schema.columns
   where table_schema = 'private' and table_name = 'auth_link_requests'),
  array['requested_at', 'user_id'],
  'the requests table holds an account id and a time, and no address'
);

select * from finish();

rollback;
