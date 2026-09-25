-- Checkpoint 2 (Michael, 25 September 2026). "Measured" means a campaign open, being scored, under
-- review or released: a draft or scheduled campaign never causes a unit to be retired. When a unit
-- such a campaign names changes, the campaign follows it (drops a unit no longer measured as it
-- was, keeps one changed in place) and records the change, until an administrator saves the draft.
-- Job runs are recorded in their own table and audited only when a run changed something.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(10);

select tests.seed_fixture();

-- Three units under Alpha's root with nobody in them (the minimum of 10 is the portal's rule).
insert into public.business_units (organisation_id, unit_code, name, parent_unit_id, unit_type)
select tests.id('alpha'), c, 'Unit ' || c, tests.id('alpha_R'), 'operations' from unnest(array['Y1', 'Y2', 'Y3']) as c;
select tests.remember('alpha_' || unit_code, id) from public.business_units
where organisation_id = tests.id('alpha') and unit_code in ('Y1', 'Y2', 'Y3');

create function pg_temp.as_admin(p_sql text)
returns void
language plpgsql
as $$
begin
  perform tests.authenticate_as('alpha_admin');
  execute p_sql;
  perform tests.as_postgres();
end
$$;

create function pg_temp.draft(p_key text, p_units uuid[], p_status text default 'draft')
returns uuid
language plpgsql
as $$
declare
  v_campaign uuid;
begin
  insert into public.campaigns (organisation_id, cadence, status, opens_at, closes_at, approved_at)
  values (tests.id('alpha'), 'baseline', p_status, now() + interval '1 day', now() + interval '14 days', now())
  returning id into v_campaign;
  insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
  select tests.id('alpha'), v_campaign, x from unnest(p_units) as x;
  return tests.remember(p_key, v_campaign);
end
$$;

create temp view changes as
  select c.id, e ->> 'name' as name, (e ->> 'dropped')::boolean as dropped
  from public.campaigns c cross join lateral jsonb_array_elements(coalesce(c.unit_changes, '[]'::jsonb)) e;

-- 1 and 2: a draft names Y1 and Y2 on their own; combining them drops both from it and records it.
select pg_temp.draft('alpha_d1', array[tests.mu('alpha_Y1'), tests.mu('alpha_Y2'), tests.mu('alpha_C1')]);
select pg_temp.as_admin(format($$select public.combine_measurement_units(%L, array[%L, %L]::uuid[], 'Units Y1 and Y2')$$,
  tests.id('alpha'), tests.mu('alpha_Y1'), tests.mu('alpha_Y2')));
select tests.remember('alpha_Y12', (select id from public.measurement_units where organisation_id = tests.id('alpha') and code = 'Y1+Y2'));
select is(
  (select array_agg(mu.code order by mu.code) from public.campaign_units cu join public.measurement_units mu on mu.id = cu.measurement_unit_id
   where cu.campaign_id = tests.id('alpha_d1')),
  array['C1'],
  'a draft drops the units that are no longer measured on their own'
);
select is(
  (select array_agg(name || ':' || dropped order by name) from changes where id = tests.id('alpha_d1')),
  array['Unit Y1:true', 'Unit Y2:true'],
  'and records each change for the launch to show'
);

-- 3 and 4: a scheduled campaign names the combination; extending it keeps it and records the change,
-- and nothing is retired, because nothing measured it.
select pg_temp.draft('alpha_s1', array[tests.id('alpha_Y12')], 'scheduled');
select pg_temp.as_admin(format($$select public.combine_measurement_units(%L, array[%L, %L]::uuid[], 'Units Y1 to Y3')$$,
  tests.id('alpha'), tests.id('alpha_Y12'), tests.mu('alpha_Y3')));
select is(
  (select array[mu.status, mu.code] from public.campaign_units cu join public.measurement_units mu on mu.id = cu.measurement_unit_id
   where cu.campaign_id = tests.id('alpha_s1')),
  array['active', 'Y1+Y2+Y3'],
  'a combination a scheduled campaign names is extended in place, not retired'
);
select is(
  (select array_agg(name || ':' || dropped) from changes where id = tests.id('alpha_s1')),
  array['Units Y1 to Y3:false'],
  'and the scheduled campaign records that it changed'
);

-- 5 and 6: undoing it removes it, since nothing measured it; the campaign drops it, and a
-- cancelled campaign that named it lets it go too.
select pg_temp.draft('alpha_c1', array[tests.id('alpha_Y12')], 'cancelled');
select pg_temp.as_admin(format($$select public.undo_measurement_unit(%L, %L)$$, tests.id('alpha'), tests.id('alpha_Y12')));
select ok(
  not exists (select 1 from public.measurement_units where id = tests.id('alpha_Y12'))
  and not exists (select 1 from public.measurement_unit_lineage l where l.predecessor_id = tests.id('alpha_Y12')),
  'undoing a combination only drafts named removes it, with no lineage'
);
select is(
  array[
    (select count(*)::integer from public.campaign_units where campaign_id = tests.id('alpha_s1')),
    (select count(*)::integer from public.campaign_units where campaign_id = tests.id('alpha_c1'))
  ],
  array[0, 0],
  'the scheduled campaign drops it, and so does the cancelled one'
);

-- 7: saving the draft is the administrator's review, and clears the record.
select pg_temp.as_admin(format($$select public.update_campaign(%L, null, array[%L]::uuid[], now() + interval '1 day', now() + interval '14 days')$$,
  tests.id('alpha_d1'), tests.mu('alpha_C1')));
select is((select unit_changes from public.campaigns where id = tests.id('alpha_d1')), null::jsonb,
  'saving the draft clears its recorded changes');

-- 8: an open campaign still holds its units fixed.
select alike(
  tests.attempt('alpha_admin', format($$select public.combine_measurement_units(%L, array[%L, %L]::uuid[], 'x')$$,
    tests.id('alpha'), tests.mu('alpha_C1'), tests.mu('alpha_C2'))),
  'error: 22023 a campaign is measuring this unit%',
  'an open campaign''s units do not change'
);

-- 9 and 10: job runs.
select tests.as_service();
select public.record_job_run('campaigns', '{"opened": 0}', false);
select public.record_job_run('campaigns', '{"opened": 1}', true);
select tests.as_postgres();
select is(
  (select array_agg(changed order by id) from private.job_runs where job = 'campaigns' and ran_at >= now()),
  array[false, true],
  'every run is recorded'
);
select is(
  (select count(*)::integer from public.audit_logs where action = 'job.campaigns_completed' and occurred_at >= now()),
  1,
  'and only a run that changed something is audited'
);

select * from finish();

rollback;
