-- The Section 3.3 matrix for identity, tenancy, plan and staff access (Milestone 3 plan, 3.3).
--
-- Each row is one table in one organisation; each column is a persona; each cell is the number of
-- that organisation's rows the persona sees (-1: the role holds no privilege at all). Personas are
-- signed in with a live password session completed with TOTP. support_a holds an open session on
-- Alpha and an ended one on Beta; support_b holds none.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(11);

select tests.seed_fixture();

create temp table visibility (
  tbl text, org text,
  alpha_ao integer, alpha_admin integer, alpha_exec integer, alpha_uv integer, beta_ao integer,
  owner integer, support_a integer, support_b integer, outsider integer, anon integer
);
insert into visibility values
  --                                    ao adm exe  uv b_ao own s_a s_b out anon
  ('organisations',          'alpha',   1,  1,  1,  1,   0,  1,  1,  1,  0,  -1),
  ('organisations',          'beta',    0,  0,  0,  0,   1,  1,  1,  1,  0,  -1),
  ('subscriptions',          'alpha',   1,  0,  0,  0,   0,  1,  1,  1,  0,  -1),
  ('subscriptions',          'beta',    0,  0,  0,  0,   1,  1,  1,  1,  0,  -1),
  ('org_memberships',        'alpha',   4,  4,  1,  1,   0,  0,  4,  0,  0,  -1),
  ('org_memberships',        'beta',    0,  0,  0,  0,   4,  0,  0,  0,  0,  -1),
  ('membership_invitations', 'alpha',   1,  1,  0,  0,   0,  0,  1,  0,  0,  -1),
  ('membership_invitations', 'beta',    0,  0,  0,  0,   1,  0,  0,  0,  0,  -1),
  ('support_sessions',       'alpha',   1,  1,  0,  0,   0,  1,  1,  0,  0,  -1),
  ('support_sessions',       'beta',    0,  0,  0,  0,   1,  1,  1,  0,  0,  -1);

select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'organisations' $$,
  'organisations: members read their own, staff read all, nobody else reads any'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'subscriptions' $$,
  'subscriptions: the account owner and staff only'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'org_memberships' $$,
  'memberships: own rows; all of them for administrators and staff under a session'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'membership_invitations' $$,
  'invitations: administrators and staff under a session'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'support_sessions' $$,
  'support sessions: the staff member, the Owner, and the organisation''s administrators'
);

-- Profiles are not organisation-scoped: count the fixture profiles each persona can see.
create temp table profile_visibility (persona text, expected integer);
insert into profile_visibility values
  ('alpha_ao', 4), ('alpha_admin', 4), ('alpha_exec', 1), ('alpha_uv', 1), ('beta_ao', 4),
  ('owner', 3), ('support_a', 5), ('support_b', 1), ('outsider', 1), ('anon', -1);

select is_empty(
  $$
    select persona, expected, tests.count_as(
      persona,
      'select count(*) from public.profiles where id in (select user_id from tests.personas)'
    ) as actual
    from profile_visibility
    where expected is distinct from tests.count_as(
      persona,
      'select count(*) from public.profiles where id in (select user_id from tests.personas)'
    )
  $$,
  'profiles: one''s own; an organisation''s members for its administrators and staff under a session; staff for the Owner'
);

select is(
  tests.count_as('alpha_exec', $$select count(*) from public.ref_employee_bands where code = 'test_band'$$),
  1,
  'reference bands are readable by any signed-in user'
);
select is(
  tests.count_as('anon', 'select count(*) from public.ref_employee_bands'),
  -1,
  'reference bands are not readable anonymously'
);

-- Writes. Each cell is the outcome of the statement for that persona: rows affected, or denied.
create temp table writes (
  label text, stmt text,
  alpha_ao text, alpha_admin text, alpha_exec text, alpha_uv text, beta_ao text,
  owner text, support_a text, support_b text, outsider text, anon text
);
insert into writes values
  ('rename alpha',
   $$update public.organisations set name = 'Renamed' where id = tests.id('alpha')$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('rename beta',
   $$update public.organisations set name = 'Renamed' where id = tests.id('beta')$$,
   '0', '0', '0', '0', '1', '0', '0', '0', '0', 'denied'),
  ('change the opt-out directly',
   $$update public.organisations set data_contribution_opt_out = true where id = tests.id('alpha')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('create an organisation directly',
   $$insert into public.organisations (name) values ('Direct')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('delete an organisation',
   $$delete from public.organisations where id = tests.id('alpha')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('change a subscription directly',
   $$update public.subscriptions set period_end = period_end + 365 where organisation_id = tests.id('alpha')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('grant a membership directly',
   $$insert into public.org_memberships (organisation_id, user_id, role)
     values (tests.id('alpha'), tests.user_id('outsider'), 'administrator')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('revoke a membership directly',
   $$update public.org_memberships set revoked_at = now() where organisation_id = tests.id('alpha')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('invite directly',
   $$insert into public.membership_invitations (organisation_id, email, role)
     values (tests.id('alpha'), 'someone@alpha.test', 'administrator')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('open a support session directly',
   $$insert into public.support_sessions (organisation_id, staff_user_id, staff_name, staff_email, kind, reason, expires_at)
     values (tests.id('alpha'), auth.uid(), 'Me', 'me@pvp.test', 'support', 'Direct insert attempt', now() + interval '1 hour')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('rename own profile',
   $$update public.profiles set full_name = 'New Name' where id = auth.uid()$$,
   '1', '1', '1', '1', '1', '1', '1', '1', '1', 'denied'),
  ('rename someone else''s profile',
   $$update public.profiles set full_name = 'New Name' where id = tests.user_id('alpha_exec')$$,
   '0', '0', '1', '0', '0', '0', '0', '0', '0', 'denied'),
  ('flag oneself as staff',
   $$update public.profiles set is_support_staff = true where id = auth.uid()$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('add a band',
   $$insert into public.ref_employee_bands (code, label, max_employees, sort_order) values ('x', 'X', 10, 1)$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied');

select is_empty(
  $$ select * from tests.write_mismatches('writes') where label like 'rename alpha' or label like 'rename beta' $$,
  'organisation name and sector: administrators and staff under a session, in their own organisation'
);
select is_empty(
  $$
    select * from tests.write_mismatches('writes')
    where label not in ('rename alpha', 'rename beta', 'rename own profile', 'rename someone else''s profile')
  $$,
  'nothing else in identity is written directly by any role: functions only'
);
select is_empty(
  $$ select * from tests.write_mismatches('writes') where label like 'rename%profile' $$,
  'a person renames only their own profile'
);

select * from finish();

rollback;
