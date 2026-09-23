-- The audit trail (CLAUDE.md Section 4; Milestone 3 plan, Section 6).
--
-- Row changes record the actor, the actor's kind and, for staff, the support session. Images carry
-- values only for allowlisted columns. Nobody changes or removes an entry, the owner included. An
-- organisation's administrators read its entries; the Owner reads platform and staff entries.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(17);

select tests.seed_fixture();

-- An administrator's change.
select tests.attempt('alpha_admin', $$update public.organisations set name = 'Alpha Renamed' where id = tests.id('alpha')$$,
  p_keep => true);
select results_eq(
  $$
    select actor_user_id, actor_kind, action, changed_columns, before ->> 'name', after ->> 'name'
    from public.audit_logs
    where entity_type = 'organisations' and entity_id = tests.id('alpha') and action = 'row.update'
  $$,
  $$ values (tests.user_id('alpha_admin'), 'client'::text, 'row.update'::text, array['name'], 'Alpha Test Pty Ltd', 'Alpha Renamed') $$,
  'a client change records the person, the columns and the allowlisted before and after values'
);

-- A staff change under a session carries the session.
select tests.attempt('support_a', $$update public.organisations set name = 'Alpha By Support' where id = tests.id('alpha')$$,
  p_keep => true);
select results_eq(
  $$
    select a.actor_kind, a.support_session_id
    from public.audit_logs a
    where a.entity_type = 'organisations' and a.entity_id = tests.id('alpha')
      and a.after ->> 'name' = 'Alpha By Support'
  $$,
  $$
    select 'support'::text, s.id from public.support_sessions s
    where s.organisation_id = tests.id('alpha') and s.staff_user_id = tests.user_id('support_a') and s.ended_at is null
  $$,
  'a staff change records the support session it was made under'
);

-- Profiles: staff designations are audited, names are not.
select tests.attempt('alpha_exec', $$update public.profiles set full_name = 'Someone Else' where id = auth.uid()$$,
  p_keep => true);
select is(
  (select count(*)::integer from public.audit_logs where entity_type = 'profiles' and entity_id = tests.user_id('alpha_exec')),
  0,
  'a change of name is not audited'
);
update public.profiles set is_support_staff = false where id = tests.user_id('support_b');
select is(
  (select after -> 'is_support_staff' from public.audit_logs
   where entity_type = 'profiles' and entity_id = tests.user_id('support_b') and action = 'row.update'
   order by id desc limit 1),
  'false'::jsonb,
  'a change of staff designation is audited'
);

-- Images carry only allowlisted columns.
select is(
  (select count(*)::integer from public.audit_logs
   where entity_type = 'membership_invitations' and (after ? 'email' or before ? 'email')),
  0,
  'an invitation''s email address never appears in an image'
);
select is_empty(
  $$
    select a.entity_type, k
    from public.audit_logs a,
      lateral jsonb_object_keys(coalesce(a.after, '{}'::jsonb) || coalesce(a.before, '{}'::jsonb)) as k
    where not exists (
      select 1 from private.audit_image_columns c where c.table_name = a.entity_type and c.column_name = k
    )
  $$,
  'no image carries a column outside the allowlist'
);
select ok(
  (select bool_and(changed_columns @> array['email']) from public.audit_logs
   where entity_type = 'membership_invitations' and action = 'row.insert'),
  'a column kept out of the image is still named as changed'
);

-- Nobody changes or removes an entry.
select is(
  tests.attempt('alpha_ao', 'update public.audit_logs set action = ''row.forged'''),
  'denied',
  'an account owner cannot change an entry'
);
select is(
  tests.attempt('alpha_ao', 'delete from public.audit_logs'),
  'denied',
  'an account owner cannot remove an entry'
);
select is(tests.attempt('service', 'delete from public.audit_logs'), 'denied',
  'the service role cannot remove an entry');
select throws_ok('update public.audit_logs set action = ''row.forged''', '42501', 'audit entries cannot be changed or removed',
  'the table owner cannot change an entry');
select throws_ok('delete from public.audit_logs', '42501', 'audit entries cannot be changed or removed',
  'the table owner cannot remove an entry');
select throws_ok('truncate public.audit_logs', '42501', 'audit entries cannot be changed or removed',
  'the table owner cannot truncate the log');

-- Who reads what.
select is(
  tests.visible_rows('alpha_ao', 'audit_logs', tests.id('alpha')),
  (select count(*)::integer from public.audit_logs where organisation_id = tests.id('alpha')),
  'the account owner reads every entry of the organisation'
);
select is(tests.visible_rows('alpha_ao', 'audit_logs', tests.id('beta')), 0, 'and none of another');
select is(tests.visible_rows('alpha_exec', 'audit_logs', tests.id('alpha')) + tests.visible_rows('support_a', 'audit_logs', tests.id('alpha')), 0,
  'viewers and support staff do not read the log');
select is(
  tests.visible_rows('owner', 'audit_logs', tests.id('alpha')),
  (select count(*)::integer from public.audit_logs where organisation_id = tests.id('alpha') and actor_kind in ('support', 'owner')),
  'the Owner reads the entries staff made, and no others'
);

select * from finish();

rollback;
