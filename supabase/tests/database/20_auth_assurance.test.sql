-- Assurance rules (CLAUDE.md Section 4; Milestone 3 plan, decision 1 and Section 3.2).
--
-- Account owners, administrators and staff count only at aal2. Every role except manager needs a
-- password session; an email-code session carries none of them. Anyone who has enrolled TOTP needs
-- it for every role. A session that has been revoked or has expired counts for nothing, even while
-- its token would still verify.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(18);

select tests.seed_fixture();

-- Mandatory roles below aal2.
select is(tests.visible_rows('alpha_admin', 'organisations', tests.id('alpha'), 'aal1'), 0,
  'an administrator at aal1 holds no administrator access');
select is(tests.visible_rows('alpha_admin', 'org_memberships', tests.id('alpha'), 'aal1'), 1,
  'an administrator at aal1 still sees their own membership, so the application can route them to TOTP');
select is(tests.visible_rows('alpha_ao', 'subscriptions', tests.id('alpha'), 'aal1'), 0,
  'an account owner at aal1 cannot read the subscription');
select is(tests.visible_rows('owner', 'subscriptions', tests.id('alpha'), 'aal1'), 0,
  'the Owner at aal1 holds no staff access');
select is(tests.visible_rows('support_a', 'org_memberships', tests.id('alpha'), 'aal1'), 0,
  'support staff at aal1 hold no access, even with an open session');

-- The first factor.
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha'), 'aal1', array['otp']), 0,
  'an executive viewer on an email-code session is refused');
select is(tests.visible_rows('alpha_admin', 'organisations', tests.id('alpha'), 'aal2', array['otp', 'totp']), 0,
  'an administrator on an email code completed with TOTP is refused: a password is required');
select is(tests.visible_rows('owner', 'subscriptions', tests.id('alpha'), 'aal2', array['otp', 'totp']), 0,
  'the Owner on an email code completed with TOTP is refused');
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha'), 'aal1'), 1,
  'an executive viewer with no factor enrolled is admitted on a password alone');

-- A viewer who has enrolled TOTP always needs it.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), tests.user_id('alpha_exec'), 'phone', 'totp', 'verified', now(), now(), 'secret');
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha'), 'aal1'), 0,
  'an executive viewer with a verified factor is refused at aal1');
select is(tests.visible_rows('alpha_exec', 'organisations', tests.id('alpha'), 'aal2'), 1,
  'and admitted at aal2');

-- Revoked, expired and borrowed sessions.
create function pg_temp.count_with(p_key text, p_session uuid)
returns integer
language plpgsql
as $$
declare
  v_n integer;
begin
  perform tests.authenticate_as(p_key, 'aal2', null, p_session);
  select count(*) into v_n from public.organisations where id = tests.id('alpha');
  perform tests.as_postgres();
  return v_n;
end
$$;

create temp table sessions (key text primary key, id uuid);
insert into sessions select 'live', tests.authenticate_as('alpha_admin');
select tests.as_postgres();
insert into sessions select 'revoked', tests.authenticate_as('alpha_admin');
select tests.as_postgres();
insert into sessions select 'expired', tests.authenticate_as('alpha_admin');
select tests.as_postgres();
insert into sessions select 'someone_else', tests.authenticate_as('alpha_ao');
select tests.as_postgres();

delete from auth.sessions where id = (select id from sessions where key = 'revoked');
update auth.sessions set not_after = now() - interval '1 minute' where id = (select id from sessions where key = 'expired');

select is(pg_temp.count_with('alpha_admin', (select id from sessions where key = 'live')), 1,
  'a live session is admitted');
select is(pg_temp.count_with('alpha_admin', (select id from sessions where key = 'revoked')), 0,
  'a signed-out or revoked session is refused on the next query, though its token is unexpired');
select is(pg_temp.count_with('alpha_admin', (select id from sessions where key = 'expired')), 0,
  'a session past its not-after time is refused');
select is(pg_temp.count_with('alpha_admin', (select id from sessions where key = 'someone_else')), 0,
  'another person''s session id is refused');

-- What the application reads to route a person.
create function pg_temp.access_as(p_key text, p_aal text)
returns jsonb
language plpgsql
as $$
declare
  v_access jsonb;
begin
  perform tests.authenticate_as(p_key, p_aal);
  v_access := public.my_access();
  perform tests.as_postgres();
  return v_access;
end
$$;

select is((pg_temp.access_as('alpha_admin', 'aal1') ->> 'mfa_required')::boolean, true,
  'my_access tells the application an administrator must complete TOTP');
select is((pg_temp.access_as('alpha_exec', 'aal1') -> 'memberships' -> 0 ->> 'role'), 'executive_viewer',
  'my_access lists the person''s memberships');
select is(
  tests.attempt('anon', 'select public.my_access()'),
  'denied',
  'my_access is not callable anonymously'
);

select * from finish();

rollback;
