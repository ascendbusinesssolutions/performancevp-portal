-- Milestone 5, checkpoint 2 (Michael, 25 September 2026).
--
-- "Measured", for retire-and-lineage, means a campaign that is open, being scored, under review or
-- released; only an open or scoring campaign holds its units fixed. A draft or scheduled campaign
-- never causes anything to be retired: when a unit it names changes, the campaign follows (the
-- unit is dropped from it where it is no longer measured as it was, kept where it changed in place)
-- and records the change, which blocks its launch until an administrator saves the draft again.
-- Job runs are recorded by record_job_run in their own table, and audited only when a run changes a
-- campaign's state.

create or replace function private.measurement_unit_in_use(p_organisation_id uuid, p_measurement_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaign_units cu
    join public.campaigns c on c.organisation_id = cu.organisation_id and c.id = cu.campaign_id
    where cu.organisation_id = p_organisation_id and cu.measurement_unit_id = p_measurement_unit_id
      and c.status in ('open', 'closed', 'under_review', 'released')
  )
$$;
comment on function private.measurement_unit_in_use(uuid, uuid) is
  'Whether a campaign has measured the unit: one open, being scored, under review or released. Such a '
  'unit changes only through lineage.';

create or replace function private.measurement_unit_running(p_organisation_id uuid, p_measurement_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaign_units cu
    join public.campaigns c on c.organisation_id = cu.organisation_id and c.id = cu.campaign_id
    where cu.organisation_id = p_organisation_id and cu.measurement_unit_id = p_measurement_unit_id
      and c.status in ('open', 'closed')
  )
$$;

-- Draft and scheduled campaigns follow their units --------------------------------------------------

alter table public.campaigns add column unit_changes jsonb;
comment on column public.campaigns.unit_changes is
  'The units named by this draft or scheduled campaign that changed after it was made, each '
  '{id, name, dropped}. Launch refuses until an administrator saves the draft, which clears it.';

-- Records that a measurement unit changed on every draft or scheduled campaign naming it, the latest
-- change per unit; where it is dropped, removes it from those campaigns (and from cancelled ones,
-- which keep no data), so nothing a draft names is ever kept alive or retired for it.
create function private.note_unit_change(p_organisation_id uuid, p_measurement_unit_id uuid, p_drop boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select name into v_name from public.measurement_units
  where organisation_id = p_organisation_id and id = p_measurement_unit_id;
  update public.campaigns c
  set unit_changes = (
    select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(coalesce(c.unit_changes, '[]'::jsonb)) e
    where e ->> 'id' <> p_measurement_unit_id::text
  ) || jsonb_build_array(jsonb_build_object('id', p_measurement_unit_id, 'name', v_name, 'dropped', p_drop))
  where c.organisation_id = p_organisation_id and c.status in ('draft', 'scheduled')
    and exists (
      select 1 from public.campaign_units cu
      where cu.organisation_id = c.organisation_id and cu.campaign_id = c.id and cu.measurement_unit_id = p_measurement_unit_id
    );
  if p_drop then
    delete from public.campaign_units cu
    using public.campaigns c
    where cu.organisation_id = p_organisation_id and cu.measurement_unit_id = p_measurement_unit_id
      and c.organisation_id = cu.organisation_id and c.id = cu.campaign_id
      and c.status in ('draft', 'scheduled', 'cancelled');
  end if;
end
$$;

-- A measurement unit removed, no longer active, or kept as a grouping unit.
create function private.follow_measurement_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.note_unit_change(old.organisation_id, old.id, true);
    return old;
  end if;
  if new.status is distinct from old.status and new.status <> 'active' then
    perform private.note_unit_change(new.organisation_id, new.id, true);
  elsif new.grouping_kept_at is distinct from old.grouping_kept_at then
    perform private.note_unit_change(new.organisation_id, new.id, false);
  end if;
  return new;
end
$$;

create trigger measurement_units_follow before update or delete on public.measurement_units
  for each row execute function private.follow_measurement_unit();

-- The units a measurement unit holds changed in place: a combination extended or cut back.
create function private.follow_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.note_unit_change(
    coalesce(new.organisation_id, old.organisation_id),
    coalesce(new.measurement_unit_id, old.measurement_unit_id),
    false
  );
  return null;
end
$$;

create trigger measurement_unit_members_follow after insert or update or delete on public.measurement_unit_members
  for each row execute function private.follow_membership();

-- Saving a draft is the administrator's review of its units.
create or replace function public.update_campaign(
  p_campaign_id uuid,
  p_name text,
  p_measurement_unit_ids uuid[],
  p_opens_at timestamptz,
  p_closes_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_ids uuid[] := array(select distinct x from unnest(coalesce(p_measurement_unit_ids, '{}')) as x);
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_manage_org(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session change campaigns');
  end if;
  if v_campaign.status <> 'draft' then
    perform private.invalid('only a draft campaign can be changed');
  end if;
  if cardinality(v_ids) = 0 or (select count(*) from public.measurement_units
      where organisation_id = v_campaign.organisation_id and id = any (v_ids) and status = 'active') <> cardinality(v_ids) then
    perform private.invalid('a campaign measures one or more active measurement units');
  end if;
  if p_opens_at is null or p_closes_at is null or p_closes_at <= p_opens_at then
    perform private.invalid('a campaign needs a window that closes after it opens');
  end if;
  update public.campaigns
  set name = nullif(btrim(coalesce(p_name, '')), ''), opens_at = p_opens_at, closes_at = p_closes_at,
      unit_changes = null
  where id = p_campaign_id;
  delete from public.campaign_units
  where organisation_id = v_campaign.organisation_id and campaign_id = p_campaign_id
    and measurement_unit_id <> all (v_ids);
  insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
  select v_campaign.organisation_id, p_campaign_id, x from unnest(v_ids) as x
  on conflict do nothing;
end
$$;

-- The scheduled launch reads the recorded changes too.
create or replace function public.launch_dataset(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_org uuid;
  v_version bigint;
  v_ratings jsonb;
  v_result jsonb;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;
  if not found then
    perform private.invalid('no such campaign');
  end if;
  v_org := v_campaign.organisation_id;
  select coalesce((select version from private.setup_versions where organisation_id = v_org), 0) into v_version;

  select coalesce(jsonb_agg(jsonb_build_object(
    'employee_id', e.id, 'unit_id', e.unit_id, 'rating_label', fr.rating_label, 'rating_date', fr.rating_date
  ) order by lower(e.employee_ref)), '[]'::jsonb)
  into v_ratings
  from public.formal_ratings fr
  join public.employees e on e.organisation_id = fr.organisation_id and e.id = fr.employee_id
  where fr.organisation_id = v_org;

  v_result := jsonb_build_object(
    'setupVersion', v_version,
    'today', private.today(),
    'campaign', jsonb_build_object(
      'id', v_campaign.id,
      'organisation_id', v_org,
      'cadence', v_campaign.cadence,
      'status', v_campaign.status,
      'pulse_rotation', v_campaign.pulse_rotation,
      'event_trigger', v_campaign.event_trigger,
      'opens_at', v_campaign.opens_at,
      'closes_at', v_campaign.closes_at,
      'unit_changes', v_campaign.unit_changes,
      'measurementUnitIds', (
        select coalesce(jsonb_agg(cu.measurement_unit_id order by cu.measurement_unit_id), '[]'::jsonb)
        from public.campaign_units cu where cu.organisation_id = v_org and cu.campaign_id = p_campaign_id
      )
    ),
    'units', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', u.id, 'unit_code', u.unit_code, 'name', u.name, 'parent_unit_id', u.parent_unit_id,
        'unit_type', u.unit_type, 'status', u.status, 'unit_leader_employee_id', u.unit_leader_employee_id
      ) order by u.id), '[]'::jsonb)
      from public.business_units u where u.organisation_id = v_org
    ),
    'measurementUnits', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'code', m.code, 'name', m.name, 'kind', m.kind, 'status', m.status,
        'single_unit_id', m.single_unit_id, 'unit_leader_employee_id', m.unit_leader_employee_id,
        'grouping_kept_at', m.grouping_kept_at
      ) order by m.id), '[]'::jsonb)
      from public.measurement_units m where m.organisation_id = v_org
    ),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'measurement_unit_id', m.measurement_unit_id, 'business_unit_id', m.business_unit_id
      ) order by m.id), '[]'::jsonb)
      from public.measurement_unit_members m where m.organisation_id = v_org and m.ended_at is null
    ),
    'people', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'employee_ref', e.employee_ref, 'first_name', e.first_name, 'last_name', e.last_name,
        'work_email', e.work_email, 'unit_id', e.unit_id, 'team_id', e.team_id,
        'manager_employee_id', e.manager_employee_id, 'role_family_id', e.role_family_id,
        'role_title', e.role_title, 'start_date', e.start_date, 'fte', e.fte,
        'is_team_leader', e.is_team_leader, 'is_leadership_team', e.is_leadership_team,
        'employment_status', e.employment_status, 'status', e.status
      ) order by e.id), '[]'::jsonb)
      from public.employees e where e.organisation_id = v_org and e.status = 'active'
    ),
    'teams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'unit_id', t.unit_id, 'name', t.name, 'status', t.status
      ) order by t.id), '[]'::jsonb)
      from public.teams t where t.organisation_id = v_org
    ),
    'families', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'is_people_leader', f.is_people_leader, 'status', f.status,
        'template_code', f.template_code
      ) order by f.id), '[]'::jsonb)
      from public.role_families f where f.organisation_id = v_org
    ),
    'skills', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'role_family_id', s.role_family_id, 'name', s.name, 'is_critical', s.is_critical,
        'kind', s.kind, 'status', s.status
      ) order by s.id), '[]'::jsonb)
      from public.skills s where s.organisation_id = v_org
    ),
    'context', jsonb_build_object(
      'domains', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', d.id, 'measurement_unit_id', d.measurement_unit_id, 'name', d.name, 'status', d.status,
          'criticality', d.criticality
        ) order by d.id), '[]'::jsonb)
        from public.knowledge_domains d where d.organisation_id = v_org
      ),
      'decisions', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', d.id, 'measurement_unit_id', d.measurement_unit_id, 'name', d.name, 'status', d.status,
          'from_starter_list', d.from_starter_list
        ) order by d.id), '[]'::jsonb)
        from public.decision_types d where d.organisation_id = v_org
      ),
      'processes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', p.id, 'measurement_unit_id', p.measurement_unit_id, 'name', p.name, 'status', p.status
        ) order by p.id), '[]'::jsonb)
        from public.critical_processes p where p.organisation_id = v_org
      ),
      'systems', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', s.id, 'measurement_unit_id', s.measurement_unit_id, 'name', s.name, 'status', s.status
        ) order by s.id), '[]'::jsonb)
        from public.primary_systems s where s.organisation_id = v_org
      )
    ),
    'formalRatings', v_ratings,
    'scaleMap', (
      select jsonb_build_object(
        'decision', m.decision,
        'calibrated', m.calibrated,
        'entries', (
          select coalesce(jsonb_agg(jsonb_build_object('label', e.label, 'band', e.band) order by e.label), '[]'::jsonb)
          from public.rating_scale_map_entries e where e.organisation_id = v_org
        )
      )
      from public.rating_scale_maps m where m.organisation_id = v_org
    ),
    'stagedUploadId', (
      select u.id from public.directory_uploads u
      where u.organisation_id = v_org and u.status = 'staged'
      order by u.uploaded_at desc limit 1
    ),
    'releasedFullRuns', (
      select coalesce(jsonb_agg(distinct c.measurement_unit_id), '[]'::jsonb)
      from public.measurement_cycles c
      where c.organisation_id = v_org and c.status = 'released'
        and exists (select 1 from public.calculation_runs r where r.organisation_id = c.organisation_id and r.cycle_id = c.id)
    ),
    'busy', (
      select coalesce(jsonb_agg(distinct cu.measurement_unit_id), '[]'::jsonb)
      from public.campaign_units cu
      join public.campaigns c on c.organisation_id = cu.organisation_id and c.id = cu.campaign_id
      where cu.organisation_id = v_org and c.id <> p_campaign_id and c.status in ('open', 'closed')
    )
  );

  -- As the readiness read: the formal ratings were read for a check, and only counts reach a page.
  perform private.record_event(v_org, 'ratings.checked', 'formal_ratings', null,
    jsonb_build_object('kind', 'formal', 'unit_id', null, 'employee_id', null,
                       'rows', jsonb_array_length(v_ratings), 'purpose', 'scheduled_launch'));
  return v_result;
end
$$;


-- Job runs --------------------------------------------------------------------------------------------

-- Every run of a job, so a missed run shows as a gap, kept 90 days. Not an audit table.
create table private.job_runs (
  id bigint generated always as identity primary key,
  job text not null check (job ~ '^[a-z_]+$'),
  ran_at timestamptz not null default now(),
  changed boolean not null,
  detail jsonb
);
create index job_runs_job_idx on private.job_runs (job, ran_at);
alter table private.job_runs enable row level security;

drop function public.record_job_run(text, jsonb);

-- Records a run; audits it only where it changed something (for the campaign job, a campaign's
-- state), so a quiet five-minute run leaves no audit entry.
create function public.record_job_run(p_job text, p_detail jsonb, p_changed boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_job !~ '^[a-z_]+$' then
    perform private.invalid('a job name is lower case letters and underscores');
  end if;
  insert into private.job_runs (job, changed, detail) values (p_job, coalesce(p_changed, true), p_detail);
  delete from private.job_runs where job = p_job and ran_at < now() - interval '90 days';
  if coalesce(p_changed, true) then
    perform private.record_event(null, 'job.' || p_job || '_completed', null, null, p_detail);
  end if;
end
$$;

grant execute on function public.record_job_run(text, jsonb, boolean) to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
