-- Measurement units (Online Measurement Specification 6.2, "Combining small units for measurement";
-- Milestone 4b plan, Sections 1, 2, 4 and 8).
--
-- Every org unit has its single, created with it and following its name and status. Measurement
-- units are read like the org units and written only through combine, undo and keep-as-grouping,
-- apart from a combined unit's name and leader; administrators, the account owner and staff under
-- a session make those changes while the organisation is writable. Nothing a campaign has measured
-- is changed. The leader of a unit or a combination may sit in it or above it. Unit viewers see the
-- measurement units that hold, or held, a unit in their scope.
--
-- Added to the fixture here, in Alpha: S1 (3 people), S2 (4) and S3 (empty) beside C1 under R, and
-- V1 (2) and V2 (2) under C1, inside the unit viewer's scope. In Beta: T1 (1) under R.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(53);

select tests.seed_fixture();

create function tests.seed_measurement()
returns void
language plpgsql
as $$
declare
  v_id uuid;
  v_unit record;
  i integer;
begin
  for v_unit in
    select * from (values
      ('alpha', 'S1', 'Claims', 'R'), ('alpha', 'S2', 'Service', 'R'), ('alpha', 'S3', 'Projects', 'R'),
      ('alpha', 'V1', 'Field North', 'C1'), ('alpha', 'V2', 'Field South', 'C1'), ('beta', 'T1', 'Treasury', 'R')
    ) as u (org, code, name, parent)
  loop
    insert into public.business_units (organisation_id, unit_code, name, parent_unit_id)
    values (tests.id(v_unit.org), v_unit.code, v_unit.name, tests.id(v_unit.org || '_' || v_unit.parent))
    returning id into v_id;
    perform tests.remember(v_unit.org || '_' || v_unit.code, v_id);
  end loop;
  for i in 1..3 loop
    perform tests.employee('alpha', 'S1' || i, 'Sam', 'One' || i, 'S1', null, 'E001', 'analyst', 's1' || i || '@alpha.test');
  end loop;
  for i in 1..4 loop
    perform tests.employee('alpha', 'S2' || i, 'Sal', 'Two' || i, 'S2', null, 'E001', 'analyst', 's2' || i || '@alpha.test');
  end loop;
  for i in 1..2 loop
    perform tests.employee('alpha', 'V1' || i, 'Val', 'North' || i, 'V1', null, 'E002', 'analyst', 'v1' || i || '@alpha.test');
    perform tests.employee('alpha', 'V2' || i, 'Vic', 'South' || i, 'V2', null, 'E002', 'analyst', 'v2' || i || '@alpha.test');
  end loop;
  perform tests.employee('beta', 'T11', 'Tia', 'One', 'T1', null, 'E001', 'analyst', 't11@beta.test');
end
$$;
select tests.seed_measurement();

-- 1 to 4: singles follow their units.
select is(
  (select count(*)::integer from public.business_units u
   where not exists (
     select 1 from public.measurement_units mu
     where mu.single_unit_id = u.id and mu.kind = 'single' and mu.code = u.unit_code and mu.name = u.name
       and mu.organisation_id = u.organisation_id
   )),
  0,
  'every unit has its single measurement unit, with its code and name'
);
select is(
  (select status || ' ' || (m.ended_at is not null)::text from public.measurement_units mu
   join public.measurement_unit_members m on m.measurement_unit_id = mu.id
   where mu.single_unit_id = tests.id('alpha_OLD')),
  'retired true',
  'a retired unit''s single is retired and holds it no longer'
);
select is(
  (select count(*)::integer from public.measurement_unit_lineage
   where predecessor_id = tests.mu('alpha_OLD') and successor_id = tests.mu('alpha_C2') and kind = 'merge'),
  1,
  'an org unit merge is also recorded as measurement lineage'
);
select tests.attempt('alpha_admin',
  $$update public.business_units set name = 'Claims and Recoveries' where id = tests.id('alpha_S1')$$, 'aal2', null, true);
select is(
  (select name from public.measurement_units where id = tests.mu('alpha_S1')),
  'Claims and Recoveries',
  'a single follows its unit''s rename'
);

-- 5 to 8: every member of the organisation and staff under a session read them; nobody else.
create temp table visibility (
  tbl text, org text,
  alpha_ao integer, alpha_admin integer, alpha_exec integer, alpha_uv integer, beta_ao integer,
  owner integer, support_a integer, support_b integer, outsider integer, anon integer
);
insert into visibility values
  --                                      ao adm exe  uv b_ao own s_a s_b out anon
  ('measurement_units',        'alpha',  10, 10, 10, 10,   0,  0, 10,  0,  0,  -1),
  ('measurement_units',        'beta',    0,  0,  0,  0,   6,  0,  0,  0,  0,  -1),
  ('measurement_unit_members', 'alpha',  10, 10, 10, 10,   0,  0, 10,  0,  0,  -1),
  ('measurement_unit_members', 'beta',    0,  0,  0,  0,   6,  0,  0,  0,  0,  -1),
  ('measurement_unit_lineage', 'alpha',   1,  1,  1,  1,   0,  0,  1,  0,  0,  -1),
  ('measurement_unit_lineage', 'beta',    0,  0,  0,  0,   1,  0,  0,  0,  0,  -1);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') $$,
  'measurement units, their members and their lineage: every member and staff under a session read them'
);
select is(
  tests.count_as('alpha_mgr', $$select count(*)::integer from public.measurement_units$$, 'aal1', array['otp']),
  10,
  'a manager signed in with a code reads them too'
);

create temp table writes (
  label text, stmt text,
  alpha_ao text, alpha_admin text, alpha_exec text, alpha_uv text, beta_ao text,
  owner text, support_a text, support_b text, outsider text, anon text
);
insert into writes values
  ('combine two units',
   $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_S1'), tests.mu('alpha_S2')], 'Claims and Service')$$,
   '1', '1', 'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied'),
  ('insert a measurement unit directly',
   $$insert into public.measurement_units (organisation_id, code, name, kind) values (tests.id('alpha'), 'X+Y', 'X and Y', 'combined')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('delete a measurement unit directly',
   $$delete from public.measurement_units where id = tests.mu('alpha_S3')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('change a measurement unit code',
   $$update public.measurement_units set code = 'S9' where id = tests.mu('alpha_S3')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('move a unit between measurement units directly',
   $$update public.measurement_unit_members set measurement_unit_id = tests.mu('alpha_S1') where business_unit_id = tests.id('alpha_S3')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('record measurement lineage directly',
   $$insert into public.measurement_unit_lineage (organisation_id, predecessor_id, successor_id, kind, effective_date)
     values (tests.id('alpha'), tests.mu('alpha_S3'), tests.mu('alpha_S1'), 'merge', current_date)$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied');
select is_empty(
  $$ select * from tests.write_mismatches('writes') where label = 'combine two units' $$,
  'administrators, the account owner and staff under a session combine units; nobody else'
);
select is_empty(
  $$ select * from tests.write_mismatches('writes') where label <> 'combine two units' $$,
  'measurement units, their members and their lineage are written only through the functions'
);

-- 9 to 10: in grace, and as a manager, nothing is combined.
select tests.set_state('alpha', 'grace');
select is(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_S1'), tests.mu('alpha_S2')], 'Claims and Service')$$),
  'denied',
  'in grace an administrator cannot combine units'
);
select tests.set_state('alpha', 'active');
select is(
  tests.attempt('alpha_mgr',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_S1'), tests.mu('alpha_S2')], 'Claims and Service')$$,
    'aal1', array['otp']),
  'denied',
  'nor can a manager'
);

-- 11 to 18: combining. S1 has a knowledge domain of its own first.
select tests.attempt('alpha_admin',
  $$insert into public.knowledge_domains (organisation_id, measurement_unit_id, name, criticality)
    values (tests.id('alpha'), tests.mu('alpha_S1'), 'Claims law', 3)$$, 'aal2', null, true);
select is(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_S1'), tests.mu('alpha_S2')], 'Claims and Service')$$,
    'aal2', null, true),
  '1',
  'an administrator combines two singles'
);
select tests.remember('alpha_S_combined',
  (select id from public.measurement_units where organisation_id = tests.id('alpha') and kind = 'combined'));
select is(
  (select code || ' ' || name || ' ' || status from public.measurement_units where id = tests.id('alpha_S_combined')),
  'S1+S2 Claims and Service active',
  'the combination takes a code joining its units'' codes, and the name given'
);
select is(
  (select array_agg(status order by code) from public.measurement_units where id in (tests.mu('alpha_S1'), tests.mu('alpha_S2'))),
  array['inactive', 'inactive'],
  'the singles it holds are inactive'
);
select is(
  (select array_agg(u.unit_code order by u.unit_code) from public.measurement_unit_members m
   join public.business_units u on u.id = m.business_unit_id
   where m.measurement_unit_id = tests.id('alpha_S_combined') and m.ended_at is null),
  array['S1', 'S2'],
  'and it holds both units now'
);
select is(
  (select count(*)::integer from public.measurement_unit_members
   where business_unit_id in (tests.id('alpha_S1'), tests.id('alpha_S2')) and ended_at is null),
  2,
  'each unit belongs to one measurement unit at a time'
);
select is(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.id('alpha_S_combined'), tests.mu('alpha_S3')], 'Claims, Service and Projects')$$,
    'aal2', null, true),
  '1',
  'a single joins a combination to extend it'
);
select is(
  (select code || ' ' || (select count(*) from public.measurement_unit_members m
                          where m.measurement_unit_id = mu.id and m.ended_at is null)::text
   from public.measurement_units mu where id = tests.id('alpha_S_combined')),
  'S1+S2+S3 3',
  'the combination keeps its identity, and its code follows its units until a campaign measures it'
);
select ok(
  exists (select 1 from public.audit_logs
          where organisation_id = tests.id('alpha') and action = 'measurement.combined'
            and entity_id = tests.id('alpha_S_combined') and actor_user_id = tests.user_id('alpha_admin')),
  'combining is in the audit log, with the administrator as actor'
);

-- 19 to 24: what cannot be combined.
select tests.attempt('alpha_admin',
  $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_V1'), tests.mu('alpha_V2')], 'Field')$$,
  'aal2', null, true);
select tests.remember('alpha_V_combined',
  (select id from public.measurement_units where organisation_id = tests.id('alpha') and code = 'V1+V2'));
select alike(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.id('alpha_S_combined'), tests.id('alpha_V_combined')], 'Everything')$$),
  'error: 22023 two combinations cannot be combined%',
  'two combinations cannot be combined'
);
select alike(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_C1'), tests.mu('alpha_C2')], 'Operations and Sales')$$),
  'error: 22023 a campaign is measuring this unit%',
  'a measurement unit a running campaign measures is not changed (retire-and-lineage is 42_retire_lineage)'
);
select alike(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_R'), tests.mu('beta_T1')], 'Across')$$),
  'error: 22023 every measurement unit must be%',
  'nor is a unit of another organisation combined'
);
select alike(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_S1'), tests.mu('alpha_R')], 'Held')$$),
  'error: 22023 every measurement unit must be%',
  'nor a single already held in a combination'
);
select alike(
  tests.attempt('alpha_admin',
    $$select public.combine_measurement_units(tests.id('alpha'), array[tests.mu('alpha_R')], 'Alone')$$),
  'error: 22023 choose two or more%',
  'a combination needs two or more measurement units'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.business_units set status = 'retired', retired_on = current_date where id = tests.id('alpha_S3')$$),
  'error: 23514 undo the combination%',
  'a unit inside a combination is not retired'
);

-- 25 to 27: the name of a combination is the administrator's; a single's is its unit's.
select is(
  tests.attempt('alpha_admin',
    $$update public.measurement_units set name = 'Customer Group' where id = tests.id('alpha_S_combined')$$),
  '1',
  'an administrator renames a combination'
);
select is(
  tests.attempt('alpha_exec',
    $$update public.measurement_units set name = 'Customer Group' where id = tests.id('alpha_S_combined')$$),
  '0',
  'an executive viewer does not'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.measurement_units set name = 'Something Else' where id = tests.mu('alpha_R')$$),
  'error: 23514 a single unit is measured under its own name%',
  'a single is measured under its unit''s name'
);

-- 28 to 36: leaders sit in the units they lead or above them.
select is(
  tests.attempt('alpha_admin',
    $$update public.business_units set unit_leader_employee_id = tests.id('alpha_E001') where id = tests.id('alpha_C1')$$),
  '1',
  'a unit''s leader may sit in a unit above it'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.business_units set unit_leader_employee_id = tests.id('alpha_E002') where id = tests.id('alpha_C2')$$),
  'error: 23514 the unit leader must be an active member of the unit or of a unit above it%',
  'but not in a unit beside it'
);
select is(
  tests.attempt('alpha_admin',
    $$update public.measurement_units set unit_leader_employee_id = tests.id('alpha_S11') where id = tests.id('alpha_S_combined')$$),
  '1',
  'a combination''s leader may be a member of one of its units'
);
select is(
  tests.attempt('alpha_admin',
    $$update public.measurement_units set unit_leader_employee_id = tests.id('alpha_E001') where id = tests.id('alpha_S_combined')$$),
  '1',
  'or of a unit above them'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.measurement_units set unit_leader_employee_id = tests.id('alpha_E002') where id = tests.id('alpha_S_combined')$$),
  'error: 23514 the leader must be an active member%',
  'but not of a unit elsewhere'
);
select alike(
  tests.attempt('alpha_admin',
    $$update public.measurement_units set unit_leader_employee_id = tests.id('alpha_E001') where id = tests.mu('alpha_R')$$),
  'error: 23514%',
  'a single has no leader of its own: its unit''s is used'
);
update public.measurement_units set unit_leader_employee_id = tests.id('alpha_S11') where id = tests.id('alpha_S_combined');
update public.employees set unit_id = tests.id('alpha_C2'), team_id = null where id = tests.id('alpha_S11');
select is(
  (select unit_leader_employee_id from public.measurement_units where id = tests.id('alpha_S_combined')),
  null,
  'a combination''s leader who moves elsewhere stops leading it'
);
update public.business_units set unit_leader_employee_id = tests.id('alpha_E002') where id = tests.id('alpha_G1');
update public.business_units set parent_unit_id = tests.id('alpha_C2') where id = tests.id('alpha_G1');
select is(
  (select unit_leader_employee_id from public.business_units where id = tests.id('alpha_G1')),
  null,
  'a unit moved away from its leader''s unit releases the leader'
);
update public.business_units set parent_unit_id = tests.id('alpha_C1') where id = tests.id('alpha_G1');
update public.employees set unit_id = tests.id('alpha_S1') where id = tests.id('alpha_S11');
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'measurement_units'
          and entity_id = tests.id('alpha_S_combined') and 'unit_leader_employee_id' = any (changed_columns)),
  'a combination''s leader changes are in the audit log'
);

-- 37 to 40: unit viewers see the measurement units holding a unit in their scope.
select is(
  tests.count_as('alpha_uv', format(
    $$select count(*)::integer from private.viewable_measurement_unit_ids() v where v in (%L, %L, %L)$$,
    tests.id('alpha_V_combined'), tests.mu('alpha_V1'), tests.id('alpha_S_combined'))),
  2,
  'a unit viewer sees the combination of units in their scope, and the single it once held, and not another'
);
select is(
  tests.count_as('alpha_exec', format(
    $$select count(*)::integer from private.viewable_measurement_unit_ids() v where v in (%L, %L)$$,
    tests.id('alpha_V_combined'), tests.id('alpha_S_combined'))),
  2,
  'an executive viewer sees every measurement unit of the organisation'
);
select is(
  tests.count_as('beta_ao', format(
    $$select count(*)::integer from private.viewable_measurement_unit_ids() v where v in (%L, %L)$$,
    tests.id('alpha_V_combined'), tests.id('alpha_S_combined'))),
  0,
  'and nobody sees another organisation''s'
);
select is(
  tests.value_as('alpha_uv', format($$select private.can_view_measurement_unit(%L)::text$$, tests.id('alpha_S_combined'))),
  'false',
  'can_view_measurement_unit agrees'
);

-- 41 to 47: undoing a combination.
select tests.attempt('alpha_admin',
  $$insert into public.knowledge_domains (organisation_id, measurement_unit_id, name, criticality)
    values (tests.id('alpha'), tests.id('alpha_S_combined'), 'Customer contracts', 2)$$, 'aal2', null, true);
select is(
  tests.attempt('alpha_exec', format($$select public.undo_measurement_unit(%L, %L)$$, tests.id('alpha'), tests.id('alpha_S_combined'))),
  'denied',
  'an executive viewer cannot undo a combination'
);
select is(
  tests.attempt('alpha_admin', format($$select public.undo_measurement_unit(%L, %L)$$, tests.id('alpha'), tests.id('alpha_S_combined')),
    'aal2', null, true),
  '1',
  'an administrator undoes it'
);
select is(
  (select count(*)::integer from public.measurement_units where id = tests.id('alpha_S_combined')),
  0,
  'the combination is gone'
);
select is(
  (select array_agg(mu.status || ':' || (m.ended_at is null)::text order by mu.code)
   from public.measurement_units mu
   join public.measurement_unit_members m on m.measurement_unit_id = mu.id and m.business_unit_id = mu.single_unit_id
   where mu.id in (tests.mu('alpha_S1'), tests.mu('alpha_S2'), tests.mu('alpha_S3'))),
  array['active:true', 'active:true', 'active:true'],
  'its units are measured on their own again'
);
select is(
  (select array_agg(name order by name) from public.knowledge_domains
   where name in ('Claims law', 'Customer contracts')),
  array['Claims law'],
  'with their own context kept, and the context entered for the combination removed'
);
insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
values (tests.id('alpha'), tests.id('alpha_open'), tests.id('alpha_V_combined'));
select alike(
  tests.attempt('alpha_admin', format($$select public.undo_measurement_unit(%L, %L)$$, tests.id('alpha'), tests.id('alpha_V_combined'))),
  'error: 22023 a campaign is measuring this unit%',
  'a combination a running campaign measures is not undone'
);
select alike(
  tests.attempt('alpha_admin', format($$select public.undo_measurement_unit(%L, %L)$$, tests.id('alpha'), tests.mu('alpha_R'))),
  'error: 22023 only an active combined measurement unit%',
  'a single is not undone'
);

-- 48 to 50: keeping a unit with units below it as a grouping unit.
select is(
  tests.attempt('alpha_admin', format($$select public.keep_grouping_unit(%L, %L, true)$$, tests.id('alpha'), tests.mu('alpha_R')),
    'aal2', null, true),
  '1',
  'an administrator keeps a unit with units below it as a grouping unit'
);
select alike(
  tests.attempt('alpha_admin', format($$select public.keep_grouping_unit(%L, %L, true)$$, tests.id('alpha'), tests.mu('alpha_S1'))),
  'error: 22023 only an active unit with units below it%',
  'a unit with nothing below it cannot be'
);
select is(
  tests.attempt('alpha_uv', format($$select public.keep_grouping_unit(%L, %L, false)$$, tests.id('alpha'), tests.mu('alpha_R'))),
  'denied',
  'and a unit viewer cannot choose'
);

-- 51 to 53: lineage through the org units, and the audit images.
select is(
  tests.attempt('alpha_admin', format(
    $$select public.record_unit_lineage(%L, 'split', array[%L]::uuid[], array[%L, %L]::uuid[], current_date)$$,
    tests.id('alpha'), tests.id('alpha_S3'), tests.id('alpha_S1'), tests.id('alpha_S2')), 'aal2', null, true),
  '1',
  'an empty unit is split into two others'
);
select is(
  (select array_agg(s.code order by s.code) from public.measurement_unit_lineage l
   join public.measurement_units s on s.id = l.successor_id
   where l.predecessor_id = tests.mu('alpha_S3') and l.kind = 'split'),
  array['S1', 'S2'],
  'and its measurement lineage runs to the measurement units of both'
);
select is_empty(
  $$ select a.entity_type, k from public.audit_logs a, jsonb_object_keys(coalesce(a.after, a.before, '{}'::jsonb)) k
     where a.entity_type like 'measurement_unit%'
       and not exists (select 1 from private.audit_image_columns c where c.table_name = a.entity_type and c.column_name = k) $$,
  'measurement-unit audit images carry only allowlisted columns'
);

select * from finish();

rollback;
