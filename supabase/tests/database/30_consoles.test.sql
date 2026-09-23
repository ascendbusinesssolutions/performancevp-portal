-- What the consoles read and do (Milestone 3 plan, step 8).
--
-- Staff see every organisation with its computed state and current term, and whether they hold a
-- session on it; nobody else can call that. The Owner designates support staff by email, and is
-- told when the address has no account yet.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(8);

select tests.seed_fixture();
select tests.set_state('beta', 'grace');

create function pg_temp.overview(p_key text)
returns jsonb
language sql
as $$
  select tests.value_as(p_key, 'select jsonb_agg(to_jsonb(o)) from public.staff_organisations() o')::jsonb
$$;

select results_eq(
  $$
    select o ->> 'name', o ->> 'state', o ->> 'employee_band', (o ->> 'open_session_id') is not null
    from jsonb_array_elements(pg_temp.overview('support_a')) o
    where o ->> 'name' in ('Alpha Test Pty Ltd', 'Beta Test Pty Ltd')
    order by 1
  $$,
  $$ values ('Alpha Test Pty Ltd'::text, 'active'::text, 'test_band'::text, true), ('Beta Test Pty Ltd', 'grace', 'test_band', false) $$,
  'staff see each organisation with its computed state, band and their own open session'
);
select is(
  (select count(*)::integer from jsonb_array_elements(pg_temp.overview('owner')) o where o ->> 'name' like '% Test Pty Ltd'),
  2,
  'the Owner sees them too'
);
select is(tests.attempt('alpha_ao', 'select * from public.staff_organisations()'), 'denied', 'an account owner cannot');
select is(tests.attempt('anon', 'select * from public.staff_organisations()'), 'denied', 'nor can anyone anonymously');

select is(tests.value_as('owner', $$select public.designate_support_staff('OUTSIDER@elsewhere.test')$$), 'designated',
  'the Owner designates an existing account as support staff, by email');
select ok((select is_support_staff from public.profiles where id = tests.user_id('outsider')), 'and the designation holds');
select is(tests.value_as('owner', $$select public.designate_support_staff('new.staff@pvp.test')$$), 'needs_account',
  'an address with no account is reported, so the server can invite it first');
select is(tests.attempt('support_a', $$select public.designate_support_staff('x@pvp.test')$$), 'denied',
  'support staff cannot designate staff');

select * from finish();

rollback;
