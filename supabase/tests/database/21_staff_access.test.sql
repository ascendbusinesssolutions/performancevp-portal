-- PerformanceVP staff access (Online Measurement Specification v0.9 Part 7; Milestone 3 plan,
-- decision 2 and Section 7).
--
-- Staff reach a client's data only through an open, unexpired support session. There is no client
-- switch, and sessions work in every subscription state, so staff are never locked out. The Owner
-- needs a session too. Staff never hold client memberships. The client sees every session, with
-- the staff member's name, and the account owner keeps that view in suspension.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(16);

select tests.seed_fixture();

create function pg_temp.open_session(p_staff text, p_org text, p_kind text default 'support')
returns uuid
language sql
as $$
  insert into public.support_sessions (
    organisation_id, staff_user_id, staff_name, staff_email, kind, reason, expires_at
  ) values (
    tests.id(p_org), tests.user_id(p_staff), 'Staff', p_staff || '@pvp.test', p_kind,
    'Reason given for the test session', now() + interval '1 hour'
  )
  returning id
$$;

select is(tests.visible_rows('support_b', 'org_memberships', tests.id('alpha')), 0,
  'support staff without a session see no client data');

create temp table staff_sessions (key text primary key, id uuid);
insert into staff_sessions select 'support_b', pg_temp.open_session('support_b', 'alpha');

select is(tests.visible_rows('support_b', 'org_memberships', tests.id('alpha')), 4,
  'an open session gives support staff the organisation''s data');
select is(tests.visible_rows('support_b', 'org_memberships', tests.id('beta')), 0,
  'a session reaches only its own organisation');

update public.support_sessions set started_at = now() - interval '3 hours', expires_at = now() - interval '1 minute'
where id = (select id from staff_sessions where key = 'support_b');
select is(tests.visible_rows('support_b', 'org_memberships', tests.id('alpha')), 0,
  'an expired session gives nothing');

update public.support_sessions set expires_at = now() + interval '1 hour', ended_at = now()
where id = (select id from staff_sessions where key = 'support_b');
select is(tests.visible_rows('support_b', 'org_memberships', tests.id('alpha')), 0,
  'an ended session gives nothing');

select is(tests.visible_rows('owner', 'org_memberships', tests.id('alpha')), 0,
  'the Owner has no standing access to client data');
insert into staff_sessions select 'owner', pg_temp.open_session('owner', 'alpha', 'owner');
select is(tests.visible_rows('owner', 'org_memberships', tests.id('alpha')), 4,
  'the Owner reaches client data through a session, like support staff');

-- Never locked out.
select tests.set_state('alpha', 'suspended');
select is(tests.visible_rows('support_a', 'org_memberships', tests.id('alpha')), 4,
  'staff keep access through a session when the organisation is suspended');
select is(tests.visible_rows('alpha_admin', 'org_memberships', tests.id('alpha')), 1,
  'while the organisation''s administrators do not (only their own membership row)');
select is(
  tests.count_as('alpha_ao', $$select count(*) from public.support_sessions where organisation_id = tests.id('alpha') and staff_name = 'Sam Support'$$),
  1,
  'in suspension the account owner still sees staff sessions, with the staff member''s name'
);
select is(tests.visible_rows('alpha_admin', 'support_sessions', tests.id('alpha')), 0,
  'in suspension an administrator does not (flag 5 covers the account owner)');

select tests.set_state('alpha', 'grace');
select is(
  tests.attempt('support_a', $$update public.organisations set name = 'Renamed' where id = tests.id('alpha')$$),
  '0',
  'staff cannot write during grace: the organisation is read-only for everyone'
);
select tests.set_state('alpha', 'active');

-- Staff and memberships are exclusive.
select throws_ok(
  $$ insert into public.org_memberships (organisation_id, user_id, role) values (tests.id('alpha'), tests.user_id('support_a'), 'administrator') $$,
  '23514',
  'PerformanceVP staff reach client data through support sessions, not memberships',
  'a staff profile cannot hold a client membership'
);
select throws_ok(
  $$ update public.profiles set is_support_staff = true where id = tests.user_id('alpha_exec') $$,
  '23514',
  'a person who holds a client membership cannot be designated PerformanceVP staff',
  'a client member cannot be designated staff'
);
select throws_ok(
  $$ update public.profiles set is_owner = true, is_support_staff = true where id = tests.user_id('support_b') $$,
  '23514',
  null,
  'the Owner and support staff are distinct designations'
);
select throws_ok(
  $$ update public.profiles set is_support_staff = false, is_owner = true where id = tests.user_id('support_b') $$,
  '23505',
  null,
  'there is one Owner'
);

select * from finish();

rollback;
