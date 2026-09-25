-- Retire-and-lineage for measurement units a campaign has measured (Milestone 5 plan, 2.5): such a
-- unit is never changed in place. Extending a measured combination retires it and records a combine
-- row to its successor; undoing one retires it, keeps its context and returns its units to their
-- singles with a separate row each; splitting out a unit that has grown retires the combination and
-- leaves the rest combined; a measured single combined records its row too. Measured means a
-- campaign open, being scored, under review or released (checkpoint 2); nothing an open or scoring
-- campaign measures changes at all.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(14);

select tests.seed_fixture();

-- Five units under Alpha's root, with nobody in them (the minimum of 10 is the portal's rule).
insert into public.business_units (organisation_id, unit_code, name, parent_unit_id, unit_type)
select tests.id('alpha'), c, 'Unit ' || c, tests.id('alpha_R'), 'operations' from unnest(array['X1', 'X2', 'X3', 'X4', 'X5']) as c;
select tests.remember('alpha_' || unit_code, id) from public.business_units
where organisation_id = tests.id('alpha') and unit_code in ('X1', 'X2', 'X3', 'X4', 'X5');

-- A campaign measured a measurement unit when a campaign unit names it; under review is not running.
create function pg_temp.measured(p_measurement_unit uuid, p_status text default 'under_review')
returns void
language plpgsql
as $$
declare
  v_campaign uuid;
begin
  insert into public.campaigns (organisation_id, cadence, status, opens_at, closes_at, launched_at, closed_at)
  values (tests.id('alpha'), 'baseline', p_status, now() - interval '30 days', now() - interval '16 days',
          now() - interval '30 days', case when p_status <> 'open' then now() - interval '16 days' end)
  returning id into v_campaign;
  insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
  values (tests.id('alpha'), v_campaign, p_measurement_unit);
end
$$;

create function pg_temp.combine(p_ids uuid[], p_name text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  perform tests.authenticate_as('alpha_admin');
  v_id := public.combine_measurement_units(tests.id('alpha'), p_ids, p_name);
  perform tests.as_postgres();
  return v_id;
end
$$;

create temp view lineage as
  select p.code as predecessor, s.code as successor, l.kind
  from public.measurement_unit_lineage l
  join public.measurement_units p on p.id = l.predecessor_id
  join public.measurement_units s on s.id = l.successor_id
  where l.organisation_id = tests.id('alpha') and (p.code like 'X%' or s.code like 'X%');

-- 1 to 4: extending a measured combination.
select tests.remember('alpha_A', pg_temp.combine(array[tests.mu('alpha_X1'), tests.mu('alpha_X2')], 'Units X1 and X2'));
select pg_temp.measured(tests.id('alpha_A'));
insert into public.knowledge_domains (organisation_id, measurement_unit_id, name, criticality)
values (tests.id('alpha'), tests.id('alpha_A'), 'Combined domain', 3);
select tests.remember('alpha_B', pg_temp.combine(array[tests.id('alpha_A'), tests.mu('alpha_X3')], 'Units X1 to X3'));
select isnt(tests.id('alpha_B'), tests.id('alpha_A'), 'extending a measured combination makes a new one');
select is(
  (select status || ' ' || (retired_on = private.today())::text from public.measurement_units where id = tests.id('alpha_A')),
  'retired true',
  'and retires the old one, which keeps its code and history'
);
select results_eq(
  $$ select predecessor, successor, kind from lineage order by 1, 2 $$,
  $$ values ('X1+X2'::text, 'X1+X2+X3'::text, 'combine'::text) $$,
  'with a combine row from the old to the new'
);
select ok(
  exists (select 1 from public.knowledge_domains where measurement_unit_id = tests.id('alpha_A') and name = 'Combined domain'),
  'the retired combination keeps its context'
);

-- 5 to 8: undoing a measured combination.
select pg_temp.measured(tests.id('alpha_B'));
select tests.authenticate_as('alpha_admin');
select public.undo_measurement_unit(tests.id('alpha'), tests.id('alpha_B'));
select tests.as_postgres();
select is(
  (select status from public.measurement_units where id = tests.id('alpha_B')),
  'retired',
  'undoing a measured combination retires it rather than removing it'
);
select is(
  (select array_agg(mu.code || ':' || mu.status order by mu.code) from public.measurement_units mu
   join public.measurement_unit_members m on m.measurement_unit_id = mu.id and m.ended_at is null
   where mu.single_unit_id in (tests.id('alpha_X1'), tests.id('alpha_X2'), tests.id('alpha_X3'))),
  array['X1:active', 'X2:active', 'X3:active'],
  'its units are measured on their own again, each with a current membership'
);
select results_eq(
  $$ select predecessor, successor, kind from lineage where predecessor = 'X1+X2+X3' order by 2 $$,
  $$ values ('X1+X2+X3'::text, 'X1'::text, 'separate'::text), ('X1+X2+X3', 'X2', 'separate'), ('X1+X2+X3', 'X3', 'separate') $$,
  'with a separate row to each'
);
select is(
  (select count(*)::integer from public.measurement_unit_members
   where measurement_unit_id = tests.id('alpha_B') and ended_at is null),
  0,
  'and the retired combination holds nothing now'
);

-- 9 to 11: splitting out a unit that has grown.
select tests.remember('alpha_C', pg_temp.combine(array[tests.mu('alpha_X1'), tests.mu('alpha_X2'), tests.mu('alpha_X3')], 'Units X1 to X3 again'));
select is((select code from public.measurement_units where id = tests.id('alpha_C')), 'X1+X2+X3#2',
  'a new combination of the same units takes a suffixed code; the retired one keeps the plain code');
select pg_temp.measured(tests.id('alpha_C'));
select tests.authenticate_as('alpha_admin');
select public.split_out_measurement_unit(tests.id('alpha'), tests.id('alpha_C'), tests.id('alpha_X1'), 'Units X2 and X3');
select tests.as_postgres();
select results_eq(
  $$ select predecessor, successor, kind from lineage where predecessor = 'X1+X2+X3#2' order by 2 $$,
  $$ values ('X1+X2+X3#2'::text, 'X1'::text, 'separate'::text), ('X1+X2+X3#2', 'X2+X3', 'separate') $$,
  'splitting out records a separate row to the unit and to the rest, which stay combined'
);
select is(
  (select array_agg(mu.code || ':' || mu.status order by mu.code) from public.measurement_units mu
   where mu.organisation_id = tests.id('alpha') and mu.code in ('X1', 'X2', 'X3', 'X2+X3', 'X1+X2+X3#2')),
  array['X1:active', 'X1+X2+X3#2:retired', 'X2:inactive', 'X2+X3:active', 'X3:inactive'],
  'the grown unit is measured alone, the rest together'
);

-- 12: a measured single combined.
select pg_temp.measured(tests.mu('alpha_X4'));
select tests.remember('alpha_D', pg_temp.combine(array[tests.mu('alpha_X4'), tests.mu('alpha_X5')], 'Units X4 and X5'));
select results_eq(
  $$ select predecessor, successor, kind from lineage where successor = 'X4+X5' $$,
  $$ values ('X4'::text, 'X4+X5'::text, 'combine'::text) $$,
  'a measured single combined records a combine row; an unmeasured one records none'
);

-- 13 and 14: nothing a running campaign measures changes.
select pg_temp.measured(tests.id('alpha_D'), 'open');
select alike(
  tests.attempt('alpha_admin', format($$select public.undo_measurement_unit(%L, %L)$$, tests.id('alpha'), tests.id('alpha_D'))),
  'error: 22023 a campaign is measuring this unit%',
  'an open campaign''s unit cannot be undone'
);
select alike(
  tests.attempt('alpha_admin', format($$select public.split_out_measurement_unit(%L, %L, %L, 'Rest')$$,
    tests.id('alpha'), tests.id('alpha_D'), tests.id('alpha_X4'))),
  'error: 22023 a campaign is measuring this unit%',
  'or split'
);

select * from finish();

rollback;
