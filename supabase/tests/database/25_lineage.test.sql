-- Unit continuity and unit scopes (Online Measurement Specification 6.2; PORTAL_BUILD_PLAN.md 3.2;
-- Milestone 3 plan, Section 5.5).
--
-- Codes are unique within the organisation, case aside, never changed and never reused. The
-- hierarchy has no cycles. A merge or split retires its predecessors and records lineage. A unit
-- viewer sees the nominated units and everything below them, and is granted with them.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(26);

select tests.seed_fixture();

-- Codes and hierarchy.
select throws_ok(
  $$insert into public.business_units (organisation_id, unit_code, name) values (tests.id('alpha'), 'c1', 'Clash')$$,
  '23505', null, 'a unit code is unique within the organisation, case aside'
);
select throws_ok(
  $$insert into public.business_units (organisation_id, unit_code, name) values (tests.id('alpha'), 'old', 'Reuse')$$,
  '23505', null, 'a retired unit''s code is never reused'
);
select lives_ok(
  $$insert into public.business_units (organisation_id, unit_code, name) values (tests.id('beta'), 'NEW1', 'Fine')$$,
  'another organisation may use any code'
);
select throws_ok(
  $$update public.business_units set unit_code = 'C9' where id = tests.id('alpha_C1')$$,
  '23514', null, 'a unit code never changes, even for the table owner'
);
select throws_ok(
  $$update public.business_units set parent_unit_id = tests.id('alpha_G1') where id = tests.id('alpha_R')$$,
  '23514', 'a unit cannot sit below itself', 'the hierarchy has no cycles'
);
select throws_ok(
  $$insert into public.teams (organisation_id, unit_id, name) values (tests.id('alpha'), tests.id('beta_C1'), 'Cross')$$,
  '23503', null, 'a team cannot sit in another organisation''s unit'
);

-- What each persona may see of the units' results.
create function pg_temp.viewable(p_key text)
returns text[]
language plpgsql
as $$
declare
  v_units text[];
begin
  perform tests.authenticate_as(p_key);
  select array_agg(i.key order by i.key) into v_units
  from private.viewable_unit_ids() as v (id)
  join tests.ids i on i.id = v.id;
  perform tests.as_postgres();
  return coalesce(v_units, '{}');
end
$$;

select is(pg_temp.viewable('alpha_uv'), array['alpha_C1', 'alpha_G1'],
  'a unit viewer sees the nominated unit and the units below it, and no others');
select is(pg_temp.viewable('alpha_exec'), array['alpha_C1', 'alpha_C2', 'alpha_G1', 'alpha_OLD', 'alpha_R'],
  'an executive viewer sees every unit of the organisation');
select is(pg_temp.viewable('support_a'), array['alpha_C1', 'alpha_C2', 'alpha_G1', 'alpha_OLD', 'alpha_R'],
  'staff under a session see every unit of that organisation');
select is(pg_temp.viewable('beta_uv'), array['beta_C1', 'beta_G1'],
  'another organisation''s unit viewer sees only their own units');
select is(pg_temp.viewable('outsider'), '{}'::text[], 'a person with no membership sees none');

-- Lineage.
insert into public.business_units (organisation_id, unit_code, name, parent_unit_id)
select tests.id('alpha'), code, 'Unit ' || code, tests.id('alpha_R')
from unnest(array['M1', 'M2', 'MX', 'P1', 'S1', 'S2']) as code;
insert into tests.ids (key, id)
select 'alpha_' || unit_code, id from public.business_units
where organisation_id = tests.id('alpha') and unit_code in ('M1', 'M2', 'MX', 'P1', 'S1', 'S2');
create temp view u as
  select unit_code, id, status, retired_on from public.business_units where organisation_id = tests.id('alpha');

select is(
  tests.attempt('alpha_admin', $$select public.record_unit_lineage(tests.id('alpha'), 'merge',
    array[tests.id('alpha_M1'), tests.id('alpha_M2')],
    array[tests.id('alpha_MX')], current_date)$$, p_keep => true),
  '1',
  'an administrator records a merge'
);
select results_eq(
  $$ select unit_code, status from u where unit_code in ('M1', 'M2', 'MX') order by 1 $$,
  $$ values ('M1'::text, 'retired'::text), ('M2', 'retired'), ('MX', 'active') $$,
  'a merge retires its predecessors'
);
select is(
  (select count(*)::integer from public.unit_lineage
   where successor_unit_id = tests.id('alpha_MX')),
  2,
  'and links each predecessor to the successor'
);

select is(
  tests.attempt('support_a', $$select public.record_unit_lineage(tests.id('alpha'), 'split',
    array[tests.id('alpha_P1')],
    array[tests.id('alpha_S1'), tests.id('alpha_S2')], current_date)$$, p_keep => true),
  '1',
  'staff under a session record a split'
);
select is(
  (select count(*)::integer from public.unit_lineage where predecessor_unit_id = tests.id('alpha_P1')),
  2,
  'a split links the predecessor to each successor'
);

select alike(
  tests.attempt('alpha_admin', $$select public.record_unit_lineage(tests.id('alpha'), 'merge',
    array[tests.id('alpha_C1')], array[tests.id('alpha_C2')], current_date)$$),
  'error: 22023%', 'a merge needs two or more predecessors'
);
select alike(
  tests.attempt('alpha_admin', $$select public.record_unit_lineage(tests.id('alpha'), 'split',
    array[tests.id('alpha_M1')],
    array[tests.id('alpha_C1'), tests.id('alpha_C2')], current_date)$$),
  'error: 22023%', 'a retired unit cannot be merged or split again'
);
select alike(
  tests.attempt('alpha_admin', $$select public.record_unit_lineage(tests.id('alpha'), 'merge',
    array[tests.id('alpha_C1'), tests.id('beta_C1')], array[tests.id('alpha_C2')], current_date)$$),
  'error: 22023%', 'lineage stays within one organisation'
);
select is(
  tests.attempt('alpha_exec', $$select public.record_unit_lineage(tests.id('alpha'), 'merge',
    array[tests.id('alpha_C1'), tests.id('alpha_G1')], array[tests.id('alpha_C2')], current_date)$$),
  'denied', 'an executive viewer cannot record lineage'
);

-- Unit viewers are granted with their units.
select is(
  tests.value_as('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'scoped@alpha.test', 'unit_viewer', array[tests.id('alpha_C2')])::text$$),
  'true', 'the account owner grants a unit viewer with units'
);
select tests.create_user('scoped', 'scoped@alpha.test');
select is(pg_temp.viewable('scoped'), array['alpha_C2'], 'and the scope arrives with the account');
select alike(
  tests.attempt('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'unit_viewer', '{}')$$),
  'error: 22023%', 'a unit viewer needs at least one unit'
);
select alike(
  tests.attempt('alpha_ao', $$select public.invite_member(tests.id('alpha'), 'x@alpha.test', 'unit_viewer', array[tests.id('beta_C1')])$$),
  'error: 22023%', 'and only units of the organisation'
);

select tests.attempt('alpha_ao', $$select public.set_unit_access(
  (select id from public.org_memberships where user_id = tests.user_id('alpha_uv')), array[tests.id('alpha_C2')])$$, p_keep => true);
select is(pg_temp.viewable('alpha_uv'), array['alpha_C2'], 'the account owner replaces a unit viewer''s scope');

select tests.set_state('alpha', 'grace');
select is(
  tests.attempt('alpha_admin', $$insert into public.teams (organisation_id, unit_id, name) values (tests.id('alpha'), tests.id('alpha_C1'), 'Late Team')$$),
  'denied', 'structure cannot change during grace'
);

select * from finish();

rollback;
