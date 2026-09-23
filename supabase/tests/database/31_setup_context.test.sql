-- The Section 3.3 matrix for the Milestone 4 tables, the unit-leader designation and the scale map
-- (Milestone 4 plan, Sections 3, 5, 6 and 11).
--
-- Decision types, critical processes and primary systems are unit context: every member of the
-- organisation and staff under a session read them; administrators, the account owner and staff
-- under a session write them while the organisation is writable. The scale map is read and written
-- only by the people who manage the directory. Rows per organisation: 2 decision types, 1 critical
-- process, 1 primary system, 1 scale map with 2 entries.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(18);

select tests.seed_fixture();

create temp table visibility (
  tbl text, org text,
  alpha_ao integer, alpha_admin integer, alpha_exec integer, alpha_uv integer, beta_ao integer,
  owner integer, support_a integer, support_b integer, outsider integer, anon integer
);
insert into visibility values
  --                                       ao adm exe  uv b_ao own s_a s_b out anon
  ('decision_types',           'alpha',    2,  2,  2,  2,   0,  0,  2,  0,  0,  -1),
  ('decision_types',           'beta',     0,  0,  0,  0,   2,  0,  0,  0,  0,  -1),
  ('critical_processes',       'alpha',    1,  1,  1,  1,   0,  0,  1,  0,  0,  -1),
  ('critical_processes',       'beta',     0,  0,  0,  0,   1,  0,  0,  0,  0,  -1),
  ('primary_systems',          'alpha',    1,  1,  1,  1,   0,  0,  1,  0,  0,  -1),
  ('primary_systems',          'beta',     0,  0,  0,  0,   1,  0,  0,  0,  0,  -1),
  ('rating_scale_maps',        'alpha',    1,  1,  0,  0,   0,  0,  1,  0,  0,  -1),
  ('rating_scale_maps',        'beta',     0,  0,  0,  0,   1,  0,  0,  0,  0,  -1),
  ('rating_scale_map_entries', 'alpha',    2,  2,  0,  0,   0,  0,  2,  0,  0,  -1),
  ('rating_scale_map_entries', 'beta',     0,  0,  0,  0,   2,  0,  0,  0,  0,  -1);

-- 1 to 2: who reads.
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl not like 'rating_scale_map%' $$,
  'unit context: every member and staff under a session read it, nobody else'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl like 'rating_scale_map%' $$,
  'the scale map: administrators, the account owner and staff under a session, and no viewer'
);

-- 3: a manager reads the context their forms need and never the scale map.
select is(
  array[
    tests.count_as('alpha_mgr', $$select count(*)::integer from public.decision_types$$, 'aal1', array['otp']),
    tests.count_as('alpha_mgr', $$select count(*)::integer from public.rating_scale_maps$$, 'aal1', array['otp']),
    tests.count_as('alpha_mgr', $$select count(*)::integer from public.rating_scale_map_entries$$, 'aal1', array['otp'])
  ],
  array[2, 0, 0],
  'a manager reads the unit context and not the scale map'
);

-- 4 to 5: who writes, and what nobody can do.
create temp table writes (
  label text, stmt text,
  alpha_ao text, alpha_admin text, alpha_exec text, alpha_uv text, beta_ao text,
  owner text, support_a text, support_b text, outsider text, anon text
);
insert into writes values
  ('add a decision type',
   $$insert into public.decision_types (organisation_id, measurement_unit_id, name) values (tests.id('alpha'), tests.mu('alpha_C1'), 'Hiring into the team')$$,
   '1', '1', 'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied'),
  ('rename a process',
   $$update public.critical_processes set name = 'Claims triage' where id = tests.id('alpha_process')$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('retire a system',
   $$update public.primary_systems set status = 'retired' where id = tests.id('alpha_system')$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('map a label',
   $$insert into public.rating_scale_map_entries (organisation_id, label, band) values (tests.id('alpha'), 'Outstanding', 5)$$,
   '1', '1', 'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied'),
  ('change a band',
   $$update public.rating_scale_map_entries set band = 5 where organisation_id = tests.id('alpha') and label = 'Exceeds'$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('remove a mapping',
   $$delete from public.rating_scale_map_entries where organisation_id = tests.id('alpha') and label = 'Meets'$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('skip the step',
   $$update public.rating_scale_maps set decision = 'skipped', calibrated = null where organisation_id = tests.id('alpha')$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('delete a decision type',
   $$delete from public.decision_types where organisation_id = tests.id('alpha')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('move a process to another unit',
   $$update public.critical_processes set measurement_unit_id = tests.mu('alpha_C2') where id = tests.id('alpha_process')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('move a system to another organisation',
   $$update public.primary_systems set organisation_id = tests.id('beta') where id = tests.id('alpha_system')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('name who decided the scale map',
   $$update public.rating_scale_maps set decided_by = tests.user_id('alpha_exec') where organisation_id = tests.id('alpha')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('relabel a mapping',
   $$update public.rating_scale_map_entries set label = 'Top' where organisation_id = tests.id('alpha') and label = 'Exceeds'$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied');

select is_empty(
  $$ select * from tests.write_mismatches('writes')
     where label in ('add a decision type', 'rename a process', 'retire a system', 'map a label',
                     'change a band', 'remove a mapping', 'skip the step') $$,
  'context and the scale map: written by administrators, the account owner and staff under a session, in their own organisation'
);
select is_empty(
  $$ select * from tests.write_mismatches('writes')
     where label not in ('add a decision type', 'rename a process', 'retire a system', 'map a label',
                         'change a band', 'remove a mapping', 'skip the step') $$,
  'nothing is deleted or moved, the decider is not the client''s to name, and a label is replaced, not edited'
);

-- 6 to 7: the database records who decided the scale map, and the decision holds together.
select tests.attempt('alpha_admin',
  $$update public.rating_scale_maps set calibrated = false where organisation_id = tests.id('alpha')$$,
  'aal2', null, true);
select is(
  (select decided_by from public.rating_scale_maps where organisation_id = tests.id('alpha')),
  tests.user_id('alpha_admin'),
  'the person who changed the scale map is recorded as its decider'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.rating_scale_maps set decision = 'mapped', calibrated = null where organisation_id = tests.id('alpha')$$),
  'error: 23514%',
  'a mapped scale map declares whether the ratings were calibrated'
);

-- 8: in grace the context is read-only.
select tests.set_state('alpha', 'grace');
select is(
  array[
    tests.attempt('alpha_admin', $$insert into public.decision_types (organisation_id, measurement_unit_id, name) values (tests.id('alpha'), tests.mu('alpha_C1'), 'Hiring into the team')$$),
    tests.attempt('alpha_admin', $$update public.rating_scale_map_entries set band = 5 where organisation_id = tests.id('alpha')$$),
    tests.count_as('alpha_admin', $$select count(*)::integer from public.decision_types where organisation_id = tests.id('alpha')$$)::text
  ],
  array['denied', '0', '2'],
  'in grace the unit context and the scale map can be read and not changed'
);
select tests.set_state('alpha', 'active');

-- 9 to 16: the unit leader.
select is(
  tests.attempt('alpha_admin',
    $$update public.business_units set unit_leader_employee_id = tests.id('alpha_E002') where id = tests.id('alpha_C1')$$,
    'aal2', null, true),
  '1',
  'an administrator designates an active member of the unit as its leader'
);
select is(
  tests.attempt('alpha_exec',
    $$update public.business_units set unit_leader_employee_id = null where id = tests.id('alpha_C1')$$),
  '0',
  'an executive viewer cannot change it'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.business_units set unit_leader_employee_id = tests.id('alpha_E009') where id = tests.id('alpha_C1')$$),
  'error: 23514%',
  'someone from another unit cannot lead it'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.business_units set unit_leader_employee_id = tests.id('alpha_E019') where id = tests.id('alpha_C1')$$),
  'error: 23514%',
  'nor can someone who has left'
);
select alike(
  tests.attempt('beta_ao',
    $$update public.business_units set unit_leader_employee_id = tests.id('alpha_E002') where id = tests.id('beta_C1')$$),
  'error: 23%',
  'nor can someone from another organisation'
);
update public.employees set unit_id = tests.id('alpha_C2'), team_id = null where id = tests.id('alpha_E002');
select is(
  (select unit_leader_employee_id from public.business_units where id = tests.id('alpha_C1')),
  null,
  'a leader who moves to another unit stops leading this one'
);
update public.employees set unit_id = tests.id('alpha_C1'), team_id = tests.id('alpha_C1_T1') where id = tests.id('alpha_E002');
update public.business_units set unit_leader_employee_id = tests.id('alpha_E002') where id = tests.id('alpha_C1');
update public.employees set status = 'inactive' where id = tests.id('alpha_E002');
select is(
  (select unit_leader_employee_id from public.business_units where id = tests.id('alpha_C1')),
  null,
  'and a leader who leaves stops leading it'
);
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'business_units' and entity_id = tests.id('alpha_C1')
          and 'unit_leader_employee_id' = any (changed_columns)
          and after ? 'unit_leader_employee_id'),
  'every change of unit leader is in the audit log with its value'
);

-- 17 to 18: the audit log records context changes, and never the scale map's decider as a value.
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'decision_types' and action = 'row.insert'
          and after ->> 'name' = 'Changing the roster'),
  'adding a decision type is in the audit log'
);
select ok(
  not exists (select 1 from public.audit_logs
              where entity_type in ('rating_scale_maps', 'rating_scale_map_entries')
                and (coalesce(before, '{}'::jsonb) || coalesce(after, '{}'::jsonb)) ?| array['decided_by', 'label', 'band'])
  and exists (select 1 from public.audit_logs
              where entity_type = 'rating_scale_map_entries' and 'band' = any (changed_columns)),
  'the scale map''s labels, bands and decider are recorded as changed, never copied into an image'
);

select * from finish();

rollback;
