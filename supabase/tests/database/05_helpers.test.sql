-- The test helpers themselves behave as the rest of the suite assumes.
begin;
\ir helpers/tests.psql

select plan(9);

select tests.create_user('someone', 'someone@example.test');

select tests.authenticate_as('someone');
select is(current_user::text, 'authenticated', 'authenticate_as becomes the authenticated role');
select is(auth.uid(), tests.user_id('someone'), 'auth.uid() is the persona');
select is(auth.jwt() ->> 'aal', 'aal2', 'the default session is aal2');
select ok(
  auth.jwt() -> 'amr' @> '[{"method": "password"}, {"method": "totp"}]',
  'the default session is a password completed with TOTP'
);

select tests.as_postgres();
select is(current_user::text, 'postgres', 'as_postgres returns to the owner');
select ok(
  exists (select 1 from auth.sessions where user_id = tests.user_id('someone')),
  'authenticate_as leaves a live session row'
);

select is(
  tests.attempt('someone', 'select * from private.audit_image_columns'),
  'denied',
  'attempt reports a privilege refusal as denied'
);

create temp table scratch (n integer);
grant insert on scratch to authenticated;

select is(
  tests.attempt('someone', 'insert into pg_temp.scratch values (1)'),
  '1',
  'attempt reports the rows affected'
);
select is((select count(*)::integer from scratch), 0, 'attempt undoes the statement');

select * from finish();

rollback;
