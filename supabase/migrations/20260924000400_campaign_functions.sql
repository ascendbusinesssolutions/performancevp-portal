-- Milestone 5, step 3: the campaign engine's functions (Milestone 5 plan, Sections 2 to 4 and 6).
--
-- The lifecycle an administrator drives (create, schedule, cancel, extend, close now); the launch,
-- which only the service role runs, after the portal has rerun readiness on the server; the survey
-- tokens and the two functions that alone touch the anonymous tables (ingest_survey_response and
-- close_campaign_responses); monitoring counts; the administrator checklists; the close; the manager
-- rating guard over the frozen context; and retire-and-lineage for measured measurement units.

-- Who may act -------------------------------------------------------------------------------------

-- Administrators, the account owner and staff under a session, in any state where the organisation
-- is readable: an open campaign runs to its close even in grace (Milestone 5 plan, D22).
create function private.can_run_campaign(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (private.is_org_admin(p_organisation_id) or private.is_support_for(p_organisation_id))
     and private.org_readable(p_organisation_id)
$$;

-- A campaign that is scheduled, open or being scored holds its measurement units fixed.
create function private.measurement_unit_running(p_organisation_id uuid, p_measurement_unit_id uuid)
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
      and c.status in ('scheduled', 'open', 'closed')
  )
$$;

-- The manager rating guard, over the frozen context ------------------------------------------------

-- Replaces the Milestone 3 guard, adding what the frozen context decides: the subject is measured
-- by this campaign, the skill belongs to the subject's role family and the domain to the subject's
-- unit as frozen at launch, and no band is written where the unit takes talent density from formal
-- ratings (Online Measurement Specification 6.4).
create or replace function private.guard_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_session public.rating_sessions;
  v_campaign_status text;
  v_subject public.snapshot_members;
  v_unit public.campaign_units;
  v_context jsonb;
begin
  select * into v_session from public.rating_sessions
  where organisation_id = (v_row ->> 'organisation_id')::uuid and id = (v_row ->> 'rating_session_id')::uuid;
  select status into v_campaign_status from public.campaigns
  where organisation_id = v_session.organisation_id and id = v_session.campaign_id;

  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'employee_id') = (to_jsonb(old) - 'employee_id')
     and new.employee_id is null then
    return new;
  end if;

  if v_campaign_status is distinct from 'open' then
    raise exception 'ratings are fixed once the campaign closes' using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  select * into v_subject from public.snapshot_members
  where organisation_id = new.organisation_id and id = new.subject_snapshot_member_id;
  if v_subject.manager_snapshot_member_id is distinct from v_session.manager_snapshot_member_id then
    raise exception 'a manager rates only their own direct reports in the campaign snapshot'
      using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'UPDATE' and new.subject_snapshot_member_id is distinct from old.subject_snapshot_member_id then
    raise exception 'a rating''s subject never changes' using errcode = 'insufficient_privilege';
  end if;

  select cu.* into v_unit
  from public.campaign_audience_members cam
  join public.campaign_units cu on cu.organisation_id = cam.organisation_id and cu.id = cam.campaign_unit_id
  where cam.organisation_id = new.organisation_id and cam.snapshot_member_id = new.subject_snapshot_member_id
    and cam.audience = 'members' and cu.campaign_id = v_session.campaign_id;
  if not found then
    raise exception 'a manager rates only people this campaign measures' using errcode = 'insufficient_privilege';
  end if;
  select c.context into v_context from public.campaign_unit_contexts c
  where c.organisation_id = v_unit.organisation_id and c.campaign_unit_id = v_unit.id;

  if tg_table_name = 'skill_ratings' and not exists (
    select 1
    from jsonb_array_elements(v_context -> 'roleFamilies') f
    cross join lateral jsonb_array_elements(f -> 'skills') s
    where f ->> 'id' = v_subject.role_family_id::text and s ->> 'id' = to_jsonb(new) ->> 'skill_id'
  ) then
    raise exception 'the skill is not in the framework this campaign froze for the person''s role family'
      using errcode = 'insufficient_privilege';
  end if;
  if tg_table_name = 'knowledge_ratings' and not exists (
    select 1 from jsonb_array_elements(v_context -> 'knowledgeDomains') d
    where d ->> 'id' = to_jsonb(new) ->> 'knowledge_domain_id'
  ) then
    raise exception 'the knowledge domain is not one this campaign froze for the person''s unit'
      using errcode = 'insufficient_privilege';
  end if;
  if tg_table_name = 'talent_bands' and v_unit.c3_route is distinct from 'module' then
    raise exception 'this unit takes talent density from formal ratings; managers do not rate it'
      using errcode = 'insufficient_privilege';
  end if;

  new.employee_id := v_subject.employee_id;
  new.updated_at := now();
  return new;
end
$$;

-- The lifecycle an administrator drives (Milestone 5 plan, 2.1 and 2.2) ---------------------------

create function public.create_campaign(
  p_organisation_id uuid,
  p_cadence text,
  p_name text,
  p_measurement_unit_ids uuid[],
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_event_trigger text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := array(select distinct x from unnest(coalesce(p_measurement_unit_ids, '{}')) as x);
  v_campaign uuid;
  v_rotation smallint;
begin
  if not private.can_manage_org(p_organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session create campaigns');
  end if;
  if cardinality(v_ids) = 0 then
    perform private.invalid('a campaign measures one or more units');
  end if;
  if (select count(*) from public.measurement_units
      where organisation_id = p_organisation_id and id = any (v_ids) and status = 'active') <> cardinality(v_ids) then
    perform private.invalid('every unit must be an active measurement unit of this organisation');
  end if;
  if p_opens_at is null or p_closes_at is null or p_closes_at <= p_opens_at then
    perform private.invalid('a campaign needs a window that closes after it opens');
  end if;
  if p_cadence = 'quarterly_pulse' then
    -- The rotation row: the organisation's pulse count, cycling 1 to 4 (plan D6).
    select (count(*) % 4 + 1)::smallint into v_rotation from public.campaigns
    where organisation_id = p_organisation_id and cadence = 'quarterly_pulse' and status <> 'cancelled';
  end if;

  insert into public.campaigns (
    organisation_id, cadence, name, status, opens_at, closes_at, pulse_rotation, event_trigger, created_by
  ) values (
    p_organisation_id, p_cadence, nullif(btrim(coalesce(p_name, '')), ''), 'draft', p_opens_at, p_closes_at,
    v_rotation, p_event_trigger, private.acting_user_id()
  )
  returning id into v_campaign;
  insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
  select p_organisation_id, v_campaign, x from unnest(v_ids) as x;
  perform private.record_event(p_organisation_id, 'campaign.created', 'campaigns', v_campaign,
    jsonb_build_object('cadence', p_cadence, 'units', cardinality(v_ids)));
  return v_campaign;
end
$$;

-- A draft's name, units and window.
create function public.update_campaign(
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
  set name = nullif(btrim(coalesce(p_name, '')), ''), opens_at = p_opens_at, closes_at = p_closes_at
  where id = p_campaign_id;
  delete from public.campaign_units
  where organisation_id = v_campaign.organisation_id and campaign_id = p_campaign_id
    and measurement_unit_id <> all (v_ids);
  insert into public.campaign_units (organisation_id, campaign_id, measurement_unit_id)
  select v_campaign.organisation_id, p_campaign_id, x from unnest(v_ids) as x
  on conflict do nothing;
end
$$;

-- Approving a draft to open at its time (plan 2.2: nothing opens without that approval).
create function public.schedule_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_manage_org(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session schedule campaigns');
  end if;
  if v_campaign.status <> 'draft' then
    perform private.invalid('only a draft campaign can be scheduled');
  end if;
  if v_campaign.opens_at <= now() then
    perform private.invalid('a scheduled campaign opens in the future; launch it now instead');
  end if;
  update public.campaigns
  set status = 'scheduled', approved_by = private.acting_user_id(), approved_at = now(), launch_blockers = null
  where id = p_campaign_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.scheduled', 'campaigns', p_campaign_id,
    jsonb_build_object('opens_at', v_campaign.opens_at));
end
$$;

create function public.unschedule_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_manage_org(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session change campaigns');
  end if;
  if v_campaign.status <> 'scheduled' then
    perform private.invalid('only a scheduled campaign can go back to draft');
  end if;
  update public.campaigns set status = 'draft', approved_by = null, approved_at = null where id = p_campaign_id;
end
$$;

-- An open campaign is never cancelled: people have answered. It can be closed early.
create function public.cancel_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_manage_org(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session cancel campaigns');
  end if;
  if v_campaign.status not in ('draft', 'scheduled') then
    perform private.invalid('only a draft or scheduled campaign can be cancelled; close an open one instead');
  end if;
  update public.campaigns set status = 'cancelled' where id = p_campaign_id;
  update public.campaign_schedule set status = 'proposed', campaign_id = null, decided_by = null, decided_at = null
  where organisation_id = v_campaign.organisation_id and campaign_id = p_campaign_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.cancelled', 'campaigns', p_campaign_id, null);
end
$$;

-- The close moves later only; closing earlier is "Close now" (plan 2.1).
create function public.extend_campaign(p_campaign_id uuid, p_closes_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_run_campaign(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session extend campaigns');
  end if;
  if v_campaign.status <> 'open' then
    perform private.invalid('only an open campaign can be extended');
  end if;
  if p_closes_at is null or p_closes_at <= v_campaign.closes_at then
    perform private.invalid('an extension closes the campaign later than it closes now');
  end if;
  update public.campaigns set closes_at = p_closes_at where id = p_campaign_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.extended', 'campaigns', p_campaign_id,
    jsonb_build_object('closes_at', p_closes_at));
end
$$;

create function public.close_campaign_now(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_run_campaign(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session close campaigns');
  end if;
  if v_campaign.status <> 'open' then
    perform private.invalid('only an open campaign can be closed');
  end if;
  update public.campaigns set status = 'closed', closes_at = least(closes_at, now()), closed_at = now()
  where id = p_campaign_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.closed', 'campaigns', p_campaign_id,
    jsonb_build_object('early', true));
end
$$;

-- The launch (Milestone 5 plan, 2.3) ------------------------------------------------------------------

-- Invitations, accounts for managers who have none yet, and the calendar's proposals follow. Only
-- the service role runs this, after the portal has rerun readiness on the server over data it read
-- at setup version p_setup_version and computed the plan: per unit, the members with their team
-- keys, the teams, the positions, the audiences, the deployment and the C3 route. The database
-- checks the plan against itself: the members are exactly the unit's active people, the team
-- leaders and leadership team are members or may lead the unit, the items are the instrument's.
create function public.launch_campaign(
  p_actor_user_id uuid,
  p_campaign_id uuid,
  p_setup_version bigint,
  p_plan jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_org uuid;
  v_version bigint;
  v_snapshot uuid;
  v_map uuid;
  v_unit jsonb;
  v_cu public.campaign_units;
  v_mu public.measurement_units;
  v_units uuid[];
  v_team record;
  v_team_ids jsonb;
  v_team_id uuid;
  v_positions jsonb;
  v_audience record;
  v_count integer;
  v_invitations integer;
  v_sessions integer;
  v_missing jsonb;
  v_today date := private.today();
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found then
    perform private.invalid('no such campaign');
  end if;
  v_org := v_campaign.organisation_id;
  if p_actor_user_id is not null then
    if not private.user_can_manage_directory(p_actor_user_id, v_org) then
      perform private.refuse('this person cannot launch a campaign for this organisation');
    end if;
    perform set_config('app.actor_user_id', p_actor_user_id::text, true);
  end if;
  if v_campaign.status not in ('draft', 'scheduled') then
    perform private.invalid('only a draft or scheduled campaign can be launched');
  end if;
  if not private.org_writable(v_org) then
    perform private.invalid('a campaign cannot be launched while the subscription is not active');
  end if;
  if v_campaign.closes_at is null or v_campaign.closes_at <= now() then
    perform private.invalid('the campaign''s close has passed; choose a new window');
  end if;

  -- The setup version: waits for any setup write in flight, then must be the one readiness read.
  perform 1 from public.organisations where id = v_org for update;
  insert into private.setup_versions (organisation_id) values (v_org) on conflict do nothing;
  select version into v_version from private.setup_versions where organisation_id = v_org for update;
  if v_version <> p_setup_version then
    perform private.invalid('the directory or setup changed while the campaign was launching; launch it again');
  end if;

  if jsonb_typeof(p_plan -> 'units') <> 'array'
     or jsonb_array_length(p_plan -> 'units') <> (select count(*) from public.campaign_units where campaign_id = p_campaign_id)
     or exists (
       select 1 from jsonb_array_elements(p_plan -> 'units') u
       where not exists (
         select 1 from public.campaign_units cu
         where cu.organisation_id = v_org and cu.campaign_id = p_campaign_id
           and cu.measurement_unit_id = (u ->> 'measurementUnitId')::uuid
       )
     ) then
    perform private.invalid('the launch plan must cover exactly the campaign''s units');
  end if;

  -- One campaign at a time per unit: another open or scoring campaign would ask the same people.
  if exists (
    select 1 from public.campaign_units mine
    join public.campaign_units other
      on other.organisation_id = mine.organisation_id and other.measurement_unit_id = mine.measurement_unit_id
     and other.campaign_id <> mine.campaign_id
    join public.campaigns c on c.id = other.campaign_id
    where mine.campaign_id = p_campaign_id and c.status in ('open', 'closed')
  ) then
    perform private.invalid('another campaign is measuring one of these units; launch this one after it closes');
  end if;

  v_snapshot := private.take_directory_snapshot(p_campaign_id);

  insert into public.snapshot_scale_maps (organisation_id, snapshot_id, decision, calibrated)
  select v_org, v_snapshot, m.decision, m.calibrated from public.rating_scale_maps m where m.organisation_id = v_org
  returning id into v_map;
  if v_map is not null then
    insert into public.snapshot_scale_map_entries (organisation_id, snapshot_scale_map_id, label, band)
    select v_org, v_map, e.label, e.band from public.rating_scale_map_entries e where e.organisation_id = v_org;
  end if;

  for v_unit in select value from jsonb_array_elements(p_plan -> 'units') loop
    select * into v_cu from public.campaign_units
    where organisation_id = v_org and campaign_id = p_campaign_id
      and measurement_unit_id = (v_unit ->> 'measurementUnitId')::uuid;
    select * into v_mu from public.measurement_units where organisation_id = v_org and id = v_cu.measurement_unit_id;
    if v_mu.status <> 'active' then
      perform private.invalid(format('%s is no longer an active measurement unit', v_mu.name));
    end if;
    v_units := private.measurement_unit_constituents(v_org, v_mu.id);

    -- The members are exactly the unit's active people.
    if (select count(*) from public.employees e
        where e.organisation_id = v_org and e.status = 'active' and e.unit_id = any (v_units))
       <> jsonb_array_length(v_unit -> 'members')
       or exists (
         select 1 from jsonb_array_elements(v_unit -> 'members') m
         where not exists (
           select 1 from public.employees e
           where e.organisation_id = v_org and e.id = (m ->> 'employeeId')::uuid and e.status = 'active'
             and e.unit_id = any (v_units)
         )
       ) then
      perform private.invalid(format('the plan''s members for %s are not the unit''s active people', v_mu.name));
    end if;

    -- Team keys, each with its frozen headcount and FTE.
    v_team_ids := '{}'::jsonb;
    for v_team in
      select t.value as team, t.ordinality as position from jsonb_array_elements(v_unit -> 'teams') with ordinality t
    loop
      insert into public.campaign_teams (
        organisation_id, campaign_unit_id, name, team_id, business_unit_id, kind, headcount, fte, position
      )
      select v_org, v_cu.id, v_team.team ->> 'name', (v_team.team ->> 'teamId')::uuid,
             (v_team.team ->> 'businessUnitId')::uuid, v_team.team ->> 'kind',
             count(e.id), coalesce(sum(e.fte), 0), v_team.position
      from jsonb_array_elements(v_unit -> 'members') m
      join public.employees e on e.organisation_id = v_org and e.id = (m ->> 'employeeId')::uuid
      where m ->> 'teamKey' = v_team.team ->> 'key'
      returning id into v_team_id;
      v_team_ids := v_team_ids || jsonb_build_object(v_team.team ->> 'key', v_team_id);
    end loop;

    select coalesce(jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'title', p.value ->> 'title') order by p.ordinality), '[]'::jsonb)
    into v_positions
    from jsonb_array_elements(coalesce(v_unit -> 'positions', '[]'::jsonb)) with ordinality p;

    insert into public.campaign_unit_contexts (organisation_id, campaign_unit_id, context, positions)
    values (
      v_org, v_cu.id,
      (v_unit -> 'context') || jsonb_build_object('teams', (
        select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.position), '[]'::jsonb)
        from public.campaign_teams t where t.organisation_id = v_org and t.campaign_unit_id = v_cu.id
      )),
      v_positions
    );

    -- The audiences as frozen: members with their team key, team leaders, the leadership team, and
    -- the managers of the members, wherever they sit.
    insert into public.campaign_audience_members (organisation_id, campaign_unit_id, audience, snapshot_member_id, campaign_team_id)
    select v_org, v_cu.id, 'members', sm.id, (v_team_ids ->> (m ->> 'teamKey'))::uuid
    from jsonb_array_elements(v_unit -> 'members') m
    join public.snapshot_members sm
      on sm.organisation_id = v_org and sm.snapshot_id = v_snapshot and sm.employee_id = (m ->> 'employeeId')::uuid;

    if exists (
      select 1 from jsonb_array_elements_text(coalesce(v_unit -> 'teamLeaders', '[]'::jsonb)
                                               || coalesce(v_unit -> 'leadershipTeam', '[]'::jsonb)) e
      where not exists (
        select 1 from public.employees x
        where x.organisation_id = v_org and x.id = e::uuid and x.status = 'active'
          and (x.unit_id = any (v_units) or private.leader_eligible(v_org, v_units, x.id))
      )
    ) then
      perform private.invalid(format('the team leaders and leadership team of %s must be its people or may lead it', v_mu.name));
    end if;
    insert into public.campaign_audience_members (organisation_id, campaign_unit_id, audience, snapshot_member_id)
    select distinct v_org, v_cu.id, a.audience, sm.id
    from (
      select 'team_leaders' as audience, e from jsonb_array_elements_text(coalesce(v_unit -> 'teamLeaders', '[]'::jsonb)) e
      union all
      select 'leadership_team', e from jsonb_array_elements_text(coalesce(v_unit -> 'leadershipTeam', '[]'::jsonb)) e
    ) a
    join public.snapshot_members sm
      on sm.organisation_id = v_org and sm.snapshot_id = v_snapshot and sm.employee_id = a.e::uuid;
    insert into public.campaign_audience_members (organisation_id, campaign_unit_id, audience, snapshot_member_id)
    select distinct v_org, v_cu.id, 'managers', sm.manager_snapshot_member_id
    from public.campaign_audience_members cam
    join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
    where cam.organisation_id = v_org and cam.campaign_unit_id = v_cu.id and cam.audience = 'members'
      and sm.manager_snapshot_member_id is not null;

    -- The deployment: only the instrument's items, processes of the frozen context, and a C3 route
    -- that agrees with whether managers rate talent density.
    for v_audience in select key, value from jsonb_each(coalesce(v_unit -> 'audiences', '{}'::jsonb)) loop
      insert into public.campaign_audiences (organisation_id, campaign_unit_id, audience, items, process_ids)
      values (
        v_org, v_cu.id, v_audience.key,
        array(select jsonb_array_elements_text(coalesce(v_audience.value -> 'items', '[]'::jsonb))),
        array(select x::uuid from jsonb_array_elements_text(coalesce(v_audience.value -> 'processIds', '[]'::jsonb)) x)
      );
    end loop;
    if exists (
      select 1 from public.campaign_audiences a cross join lateral unnest(a.items) i
      where a.organisation_id = v_org and a.campaign_unit_id = v_cu.id and not (
        (a.audience = 'members_part_a' and i in (select code from public.ref_survey_items))
        or (a.audience = 'members_part_b' and i in (
          select code from public.ref_module_items where online and module_code in ('M-O1-CASCADE', 'M-O2-IA')))
        or (a.audience = 'team_leaders' and i in (select code from public.ref_module_items where module_code = 'M-C5-TL'))
        or (a.audience = 'managers' and i in ('c1', 'c2', 'c3'))
        or (a.audience = 'admin_checklists' and i in (select code from public.ref_admin_checklists))
      )
    ) or exists (
      select 1 from public.campaign_audiences a cross join lateral unnest(a.process_ids) p
      where a.organisation_id = v_org and a.campaign_unit_id = v_cu.id and not exists (
        select 1 from public.campaign_unit_contexts c, jsonb_array_elements(c.context -> 'processes') x
        where c.organisation_id = v_org and c.campaign_unit_id = v_cu.id and x ->> 'id' = p::text
      )
    ) then
      perform private.invalid(format('the deployment for %s names something outside the instrument or the unit''s context', v_mu.name));
    end if;
    if coalesce(v_unit ->> 'c3Route', '') not in ('formal', 'module')
       or ((v_unit ->> 'c3Route') = 'formal') = exists (
         select 1 from public.campaign_audiences a
         where a.organisation_id = v_org and a.campaign_unit_id = v_cu.id and a.audience = 'managers' and 'c3' = any (a.items)
       ) and exists (
         select 1 from public.campaign_audiences a
         where a.organisation_id = v_org and a.campaign_unit_id = v_cu.id and a.audience = 'managers'
       ) then
      perform private.invalid(format('the talent-density route for %s disagrees with the manager modules', v_mu.name));
    end if;

    update public.campaign_units
    set headcount = (select count(*) from public.campaign_audience_members
                     where organisation_id = v_org and campaign_unit_id = v_cu.id and audience = 'members'),
        fte = (select coalesce(sum(t.fte), 0) from public.campaign_teams t
               where t.organisation_id = v_org and t.campaign_unit_id = v_cu.id),
        c3_route = v_unit ->> 'c3Route'
    where id = v_cu.id;

    -- Invitations for the anonymous audiences, to the work email in the directory now.
    if exists (
      select 1 from public.campaign_audiences a
      join public.campaign_audience_members cam
        on cam.organisation_id = a.organisation_id and cam.campaign_unit_id = a.campaign_unit_id
       and cam.audience = case when a.audience in ('members_part_a', 'members_part_b') then 'members' else a.audience end
      join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
      join public.employees e on e.organisation_id = sm.organisation_id and e.id = sm.employee_id
      where a.organisation_id = v_org and a.campaign_unit_id = v_cu.id
        and a.audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team')
        and (e.work_email is null or btrim(e.work_email) = '')
    ) then
      perform private.invalid(format('someone asked in %s has no work email', v_mu.name));
    end if;
    insert into public.invitations (organisation_id, campaign_unit_id, audience, snapshot_member_id, email)
    select v_org, v_cu.id, a.audience, cam.snapshot_member_id, e.work_email
    from public.campaign_audiences a
    join public.campaign_audience_members cam
      on cam.organisation_id = a.organisation_id and cam.campaign_unit_id = a.campaign_unit_id
     and cam.audience = case when a.audience in ('members_part_a', 'members_part_b') then 'members' else a.audience end
    join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
    join public.employees e on e.organisation_id = sm.organisation_id and e.id = sm.employee_id
    where a.organisation_id = v_org and a.campaign_unit_id = v_cu.id
      and a.audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team');
  end loop;

  -- One rating session per manager of a unit whose managers are asked.
  insert into public.rating_sessions (organisation_id, campaign_id, manager_snapshot_member_id, manager_employee_id)
  select distinct on (cam.snapshot_member_id) v_org, p_campaign_id, cam.snapshot_member_id, sm.employee_id
  from public.campaign_audience_members cam
  join public.campaign_units cu on cu.organisation_id = cam.organisation_id and cu.id = cam.campaign_unit_id
  join public.campaign_audiences a
    on a.organisation_id = cu.organisation_id and a.campaign_unit_id = cu.id and a.audience = 'managers'
  join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
  where cu.organisation_id = v_org and cu.campaign_id = p_campaign_id and cam.audience = 'managers'
  order by cam.snapshot_member_id;
  get diagnostics v_sessions = row_count;

  -- The outbox: one anonymous-survey email per person, listing every survey they are asked; a
  -- separate email per manager about their identified ratings (plan 5.2, D15).
  insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_snapshot_member_id, invitation_ids)
  select v_org, p_campaign_id, 'survey_invitation', i.snapshot_member_id, array_agg(i.id order by i.id)
  from public.invitations i
  join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
  where cu.organisation_id = v_org and cu.campaign_id = p_campaign_id
  group by i.snapshot_member_id;
  get diagnostics v_invitations = row_count;
  insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_snapshot_member_id)
  select v_org, p_campaign_id, 'manager_invitation', s.manager_snapshot_member_id
  from public.rating_sessions s where s.organisation_id = v_org and s.campaign_id = p_campaign_id;

  -- The cadence calendar's proposals from a baseline or annual (plan 2.2).
  if v_campaign.cadence in ('baseline', 'annual') then
    insert into public.campaign_schedule (organisation_id, anchor_campaign_id, cadence, due_on)
    values
      (v_org, p_campaign_id, 'quarterly_pulse', (v_today + interval '3 months')::date),
      (v_org, p_campaign_id, 'half_yearly', (v_today + interval '6 months')::date),
      (v_org, p_campaign_id, 'quarterly_pulse', (v_today + interval '9 months')::date),
      (v_org, p_campaign_id, 'annual', (v_today + interval '12 months')::date)
    on conflict do nothing;
  end if;

  update public.campaigns
  set status = 'open', launched_at = now(), launched_by = p_actor_user_id,
      opens_at = case when opens_at is null or opens_at > now() then now() else opens_at end,
      setup_version = p_setup_version, launch_blockers = null
  where id = p_campaign_id;

  v_missing := public.grant_manager_memberships(p_campaign_id);
  select count(*) into v_count from public.invitations i
  join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
  where cu.campaign_id = p_campaign_id;
  perform private.record_event(v_org, 'campaign.launched', 'campaigns', p_campaign_id,
    jsonb_build_object('units', jsonb_array_length(p_plan -> 'units'), 'invitations', v_count,
                       'people_emailed', v_invitations, 'rating_sessions', v_sessions,
                       'setup_version', p_setup_version));
  return jsonb_build_object('managersWithoutAccounts', v_missing, 'invitations', v_count, 'ratingSessions', v_sessions);
end
$$;

-- Manager memberships for the campaign's rating managers who have an account; the managers who do
-- not yet have one, for the portal to create through the Auth Admin API and call this again.
create function public.grant_manager_memberships(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organisation_id into v_org from public.campaigns where id = p_campaign_id;
  if v_org is null then
    perform private.invalid('no such campaign');
  end if;
  insert into public.org_memberships (organisation_id, user_id, role, employee_id)
  select distinct on (e.id) v_org, p.id, 'manager_respondent', e.id
  from public.rating_sessions s
  join public.employees e on e.organisation_id = s.organisation_id and e.id = s.manager_employee_id and e.status = 'active'
  join public.profiles p on lower(p.email) = lower(e.work_email) and not (p.is_owner or p.is_support_staff)
  where s.organisation_id = v_org and s.campaign_id = p_campaign_id
    and not exists (
      select 1 from public.org_memberships m
      where m.organisation_id = v_org and m.role = 'manager_respondent' and m.revoked_at is null
        and (m.employee_id = e.id or m.user_id = p.id)
    )
  order by e.id;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('employeeId', e.id, 'email', e.work_email) order by e.id), '[]'::jsonb)
    from public.rating_sessions s
    join public.employees e on e.organisation_id = s.organisation_id and e.id = s.manager_employee_id and e.status = 'active'
    where s.organisation_id = v_org and s.campaign_id = p_campaign_id
      and not exists (select 1 from public.profiles p where lower(p.email) = lower(e.work_email))
  );
end
$$;

-- A scheduled launch that readiness refused goes back to draft, with the findings for the page.
create function public.record_launch_refusal(p_campaign_id uuid, p_blockers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or v_campaign.status <> 'scheduled' then
    perform private.invalid('only a scheduled campaign records a refused launch');
  end if;
  update public.campaigns
  set status = 'draft', approved_by = null, approved_at = null, launch_blockers = coalesce(p_blockers, '[]'::jsonb)
  where id = p_campaign_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.launch_refused', 'campaigns', p_campaign_id,
    jsonb_build_object('blockers', jsonb_array_length(coalesce(p_blockers, '[]'::jsonb))));
end
$$;

-- Survey tokens (Milestone 5 plan, 4.1) --------------------------------------------------------------

-- The live tokens of a launched campaign, written once, in one shuffled batch, before the first
-- email. The portal derives each token from an invitation with SURVEY_TOKEN_SECRET and passes only
-- its hash with the campaign unit and audience; the counts must match the invitations exactly.
create function public.issue_survey_tokens(p_campaign_id uuid, p_tokens jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_count integer;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or v_campaign.status <> 'open' then
    perform private.invalid('tokens are issued for an open campaign');
  end if;
  if v_campaign.tokens_issued_at is not null then
    perform private.invalid('this campaign''s tokens are already issued');
  end if;
  if jsonb_typeof(p_tokens) <> 'array' or exists (
    select 1
    from (
      select i.campaign_unit_id, i.audience, count(*) as n
      from public.invitations i
      join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
      where cu.campaign_id = p_campaign_id
      group by 1, 2
    ) inv
    full join (
      select (t ->> 'campaignUnitId')::uuid as campaign_unit_id, t ->> 'audience' as audience, count(*) as n
      from jsonb_array_elements(p_tokens) t
      group by 1, 2
    ) tok on tok.campaign_unit_id = inv.campaign_unit_id and tok.audience = inv.audience
    where inv.n is distinct from tok.n
  ) then
    perform private.invalid('the tokens must match the campaign''s invitations, unit by unit and audience by audience');
  end if;
  insert into private.survey_tokens (token_hash, organisation_id, campaign_unit_id, audience)
  select t ->> 'tokenHash', v_campaign.organisation_id, (t ->> 'campaignUnitId')::uuid, t ->> 'audience'
  from jsonb_array_elements(p_tokens) t
  order by random();
  get diagnostics v_count = row_count;
  update public.campaigns set tokens_issued_at = now() where id = p_campaign_id;
  return v_count;
end
$$;

-- Which of the given hashes are still live: for reminders, which the job works out from the
-- invitations with the secret. Only the job's memory ever pairs a person with "not yet answered".
create function public.survey_tokens_live(p_campaign_id uuid, p_hashes text[])
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select t.token_hash from private.survey_tokens t
  join public.campaign_units cu on cu.organisation_id = t.organisation_id and cu.id = t.campaign_unit_id
  where cu.campaign_id = p_campaign_id and t.token_hash = any (p_hashes)
$$;

-- What a survey link opens: the survey, never a person. Reads live tokens and the frozen campaign,
-- not the responses. A spent token and an unknown one look the same.
create function public.survey_for_token(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_token private.survey_tokens;
  v_campaign public.campaigns;
  v_cu public.campaign_units;
  v_context public.campaign_unit_contexts;
  v_audience public.campaign_audiences;
begin
  select * into v_token from private.survey_tokens where token_hash = p_token_hash;
  if not found then
    return jsonb_build_object('state', 'unknown');
  end if;
  select * into v_cu from public.campaign_units where id = v_token.campaign_unit_id;
  select * into v_campaign from public.campaigns where id = v_cu.campaign_id;
  if v_campaign.status <> 'open' or now() < v_campaign.opens_at or now() >= v_campaign.closes_at then
    return jsonb_build_object('state', 'closed');
  end if;
  select * into v_context from public.campaign_unit_contexts where campaign_unit_id = v_cu.id;
  select * into v_audience from public.campaign_audiences
  where campaign_unit_id = v_cu.id and audience = v_token.audience;
  return jsonb_build_object(
    'state', 'open',
    'audience', v_token.audience,
    'organisationName', (select o.name from public.organisations o where o.id = v_cu.organisation_id),
    'unitName', (select mu.name from public.measurement_units mu where mu.id = v_cu.measurement_unit_id),
    'cadence', v_campaign.cadence,
    'closesAt', v_campaign.closes_at,
    'items', to_jsonb(v_audience.items),
    'teams', case when v_token.audience = 'members_part_a' then (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.position), '[]'::jsonb)
      from public.campaign_teams t where t.campaign_unit_id = v_cu.id
    ) else '[]'::jsonb end,
    'processes', (
      select coalesce(jsonb_agg(p order by ordinality), '[]'::jsonb)
      from jsonb_array_elements(v_context.context -> 'processes') with ordinality x (p, ordinality)
      where (p ->> 'id')::uuid = any (v_audience.process_ids)
    ),
    'decisionTypes', case when v_token.audience = 'leadership_team' then v_context.context -> 'decisionTypes' else '[]'::jsonb end,
    'positions', case when v_token.audience = 'leadership_team' then v_context.positions else '[]'::jsonb end,
    'audienceSize', (
      select count(*) from public.campaign_audience_members cam
      where cam.campaign_unit_id = v_cu.id
        and cam.audience = case when v_token.audience in ('members_part_a', 'members_part_b') then 'members' else v_token.audience end
    ),
    'partB', exists (
      select 1 from public.campaign_audiences a where a.campaign_unit_id = v_cu.id and a.audience = 'members_part_b'
    )
  );
end
$$;

-- The first of the two functions that touch the anonymous tables (Milestone 3 plan, Section 4).
-- One transaction: the token is deleted (so it is spent, and a concurrent second submission of it
-- finds nothing), the answers are checked against the campaign unit's frozen deployment, and the
-- response is written with a random identifier, no time and no person. A response names a team
-- only on Part A and only for a team of four or more (plan D5). Nothing is audited.
create function public.ingest_survey_response(
  p_token_hash text,
  p_payload jsonb,
  p_completion_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_cu uuid;
  v_audience text;
  v_campaign public.campaigns;
  v_deployed public.campaign_audiences;
  v_context public.campaign_unit_contexts;
  v_team uuid;
  v_team_size integer;
  v_response uuid;
  v_answers integer := 0;
begin
  delete from private.survey_tokens where token_hash = p_token_hash
  returning organisation_id, campaign_unit_id, audience into v_org, v_cu, v_audience;
  if v_cu is null then
    raise exception 'survey.spent' using errcode = 'invalid_parameter_value';
  end if;
  select c.* into v_campaign from public.campaigns c
  join public.campaign_units cu on cu.organisation_id = c.organisation_id and cu.campaign_id = c.id
  where cu.id = v_cu;
  if v_campaign.status <> 'open' or now() < v_campaign.opens_at or now() >= v_campaign.closes_at then
    raise exception 'survey.closed' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_payload) k where k not in ('team', 'items', 'processes', 'decisions'))
     or (p_completion_seconds is not null and (p_completion_seconds < 0 or p_completion_seconds > 2419200)) then
    raise exception 'survey.invalid' using errcode = 'invalid_parameter_value';
  end if;
  select * into v_deployed from public.campaign_audiences where campaign_unit_id = v_cu and audience = v_audience;
  select * into v_context from public.campaign_unit_contexts where campaign_unit_id = v_cu;

  -- The team: Part A only; the only key where there is one; stored for four or more.
  if v_audience = 'members_part_a' then
    if p_payload ? 'team' and jsonb_typeof(p_payload -> 'team') = 'string' then
      select t.id, t.headcount into v_team, v_team_size from public.campaign_teams t
      where t.campaign_unit_id = v_cu and t.id::text = p_payload ->> 'team';
      if v_team is null then
        raise exception 'survey.invalid' using errcode = 'invalid_parameter_value';
      end if;
    elsif (select count(*) from public.campaign_teams t where t.campaign_unit_id = v_cu) = 1 then
      select t.id, t.headcount into v_team, v_team_size from public.campaign_teams t where t.campaign_unit_id = v_cu;
    end if;
    if v_team_size < 4 then
      v_team := null;
    end if;
  elsif p_payload ? 'team' and jsonb_typeof(p_payload -> 'team') <> 'null' then
    raise exception 'survey.invalid' using errcode = 'invalid_parameter_value';
  end if;

  if (p_payload ? 'items' and jsonb_typeof(p_payload -> 'items') <> 'object')
     or exists (
       select 1 from jsonb_each(coalesce(p_payload -> 'items', '{}'::jsonb)) i
       where not (i.key = any (v_deployed.items)) or i.value::text not in ('1', '2', '3', '4', '5')
     )
     or (v_audience <> 'members_part_b' and p_payload ? 'processes')
     or (v_audience <> 'leadership_team' and p_payload ? 'decisions') then
    raise exception 'survey.invalid' using errcode = 'invalid_parameter_value';
  end if;
  select count(*) into v_answers from jsonb_object_keys(coalesce(p_payload -> 'items', '{}'::jsonb));

  -- M-O3-PF: per process of the deployment, the six items, each process once.
  if p_payload ? 'processes' then
    if jsonb_typeof(p_payload -> 'processes') <> 'array'
       or exists (
         select 1 from jsonb_array_elements(p_payload -> 'processes') p
         where jsonb_typeof(p) <> 'object'
            or exists (select 1 from jsonb_object_keys(p) k where k not in ('process', 'items'))
            or not ((p ->> 'process') = any (select x::text from unnest(v_deployed.process_ids) x))
            or jsonb_typeof(p -> 'items') <> 'object'
            or exists (
              select 1 from jsonb_each(p -> 'items') i
              where i.key not in (select code from public.ref_module_items where module_code = 'M-O3-PF' and online)
                 or i.value::text not in ('1', '2', '3', '4', '5')
            )
       )
       or (select count(*) from jsonb_array_elements(p_payload -> 'processes'))
          <> (select count(distinct p ->> 'process') from jsonb_array_elements(p_payload -> 'processes') p) then
      raise exception 'survey.invalid' using errcode = 'invalid_parameter_value';
    end if;
    select v_answers + count(*) into v_answers
    from jsonb_array_elements(p_payload -> 'processes') p cross join lateral jsonb_object_keys(p -> 'items');
  end if;

  -- M-O1-LT: per frozen decision type, each role's positions (Decide takes one) and the clarity.
  if p_payload ? 'decisions' then
    if jsonb_typeof(p_payload -> 'decisions') <> 'array'
       or exists (
         select 1 from jsonb_array_elements(p_payload -> 'decisions') d
         where jsonb_typeof(d) <> 'object'
            or exists (select 1 from jsonb_object_keys(d) k where k not in ('decisionType', 'roles', 'clarity'))
            or not exists (
              select 1 from jsonb_array_elements(v_context.context -> 'decisionTypes') t where t ->> 'id' = d ->> 'decisionType'
            )
            or (d ? 'clarity' and (d -> 'clarity')::text not in ('1', '2', '3', '4', '5'))
            or (d ? 'roles' and (
              jsonb_typeof(d -> 'roles') <> 'object'
              or exists (
                select 1 from jsonb_each(d -> 'roles') r
                where r.key not in ('recommend', 'agree', 'perform', 'input', 'decides')
                   or jsonb_typeof(r.value) <> 'array'
                   or (r.key = 'decides' and jsonb_array_length(r.value) > 1)
                   or exists (
                     select 1 from jsonb_array_elements_text(r.value) v
                     where v <> 'unclear' and not exists (
                       select 1 from jsonb_array_elements(v_context.positions) x where x ->> 'id' = v
                     )
                   )
              )
            ))
       )
       or (select count(*) from jsonb_array_elements(p_payload -> 'decisions'))
          <> (select count(distinct d ->> 'decisionType') from jsonb_array_elements(p_payload -> 'decisions') d) then
      raise exception 'survey.invalid' using errcode = 'invalid_parameter_value';
    end if;
    select v_answers + count(*) into v_answers
    from jsonb_array_elements(p_payload -> 'decisions') d
    where d ? 'clarity' or exists (select 1 from jsonb_each(coalesce(d -> 'roles', '{}'::jsonb)) r where jsonb_array_length(r.value) > 0);
  end if;

  if v_answers = 0 then
    raise exception 'survey.empty' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.survey_responses (organisation_id, campaign_unit_id, audience, campaign_team_id, completion_seconds)
  values (v_org, v_cu, v_audience, v_team, p_completion_seconds)
  returning id into v_response;

  insert into public.survey_item_responses (organisation_id, response_id, item_code, value)
  select v_org, v_response, i.key, (i.value #>> '{}')::smallint
  from jsonb_each(coalesce(p_payload -> 'items', '{}'::jsonb)) i;

  insert into public.survey_item_responses (organisation_id, response_id, item_code, process_id, value)
  select v_org, v_response, i.key, (p ->> 'process')::uuid, (i.value #>> '{}')::smallint
  from jsonb_array_elements(coalesce(p_payload -> 'processes', '[]'::jsonb)) p
  cross join lateral jsonb_each(p -> 'items') i;

  insert into public.survey_item_responses (organisation_id, response_id, item_code, decision_type_id, value)
  select v_org, v_response, 'O1L-06', (d ->> 'decisionType')::uuid, (d ->> 'clarity')::smallint
  from jsonb_array_elements(coalesce(p_payload -> 'decisions', '[]'::jsonb)) d
  where d ? 'clarity';

  insert into public.survey_role_answers (organisation_id, response_id, decision_type_id, role, position_id)
  select distinct v_org, v_response, (d ->> 'decisionType')::uuid, r.key, nullif(v, 'unclear')::uuid
  from jsonb_array_elements(coalesce(p_payload -> 'decisions', '[]'::jsonb)) d
  cross join lateral jsonb_each(coalesce(d -> 'roles', '{}'::jsonb)) r
  cross join lateral jsonb_array_elements_text(r.value) v;
end
$$;

-- Monitoring (Milestone 5 plan, 5.1) --------------------------------------------------------------

-- Counts only. Received is tokens issued less tokens still live, per unit and audience, and after
-- close the recorded counts. Managers' progress is counts of what they have entered, never a value,
-- so this read writes no ratings audit entry. Never touches the anonymous tables.
create function public.campaign_monitoring(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;
  if not found or not private.can_run_campaign(v_campaign.organisation_id) then
    perform private.refuse('campaign monitoring is for administrators, the account owner and staff under a session');
  end if;
  return jsonb_build_object(
    'units', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'campaignUnitId', cu.id,
        'measurementUnitId', cu.measurement_unit_id,
        'headcount', cu.headcount,
        'fte', cu.fte,
        'c3Route', cu.c3_route,
        'audiences', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'audience', a.audience,
            'size', (
              select count(*) from public.campaign_audience_members cam
              where cam.campaign_unit_id = cu.id
                and cam.audience = case when a.audience in ('members_part_a', 'members_part_b') then 'members'
                                        when a.audience = 'admin_checklists' then 'none' else a.audience end
            ),
            'issued', coalesce(a.issued, (
              select count(*) from public.invitations i where i.campaign_unit_id = cu.id and i.audience = a.audience
            )),
            'received', case
              when a.issued is not null then a.responded
              when v_campaign.tokens_issued_at is null then 0
              else (select count(*) from public.invitations i where i.campaign_unit_id = cu.id and i.audience = a.audience)
                 - (select count(*) from private.survey_tokens t where t.campaign_unit_id = cu.id and t.audience = a.audience)
            end,
            'items', to_jsonb(a.items)
          ) order by a.audience), '[]'::jsonb)
          from public.campaign_audiences a where a.campaign_unit_id = cu.id
        ),
        'checklists', (
          select coalesce(jsonb_agg(jsonb_build_object('code', r.checklist_code, 'versions', r.n, 'latestAt', r.latest)), '[]'::jsonb)
          from (
            select checklist_code, count(*) as n, max(entered_at) as latest
            from public.checklist_responses where campaign_unit_id = cu.id group by checklist_code
          ) r
        )
      ) order by cu.id), '[]'::jsonb)
      from public.campaign_units cu where cu.campaign_id = p_campaign_id
    ),
    'sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'sessionId', s.id,
        'managerSnapshotMemberId', s.manager_snapshot_member_id,
        'managerEmployeeId', s.manager_employee_id,
        'firstName', m.first_name,
        'lastName', m.last_name,
        'reports', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'subjectSnapshotMemberId', rep.id,
            'campaignUnitId', cam.campaign_unit_id,
            'roleFamilyId', rep.role_family_id,
            'skills', (select count(*) from public.skill_ratings r where r.rating_session_id = s.id and r.subject_snapshot_member_id = rep.id),
            'domains', (select count(*) from public.knowledge_ratings r where r.rating_session_id = s.id and r.subject_snapshot_member_id = rep.id),
            'band', exists (select 1 from public.talent_bands r where r.rating_session_id = s.id and r.subject_snapshot_member_id = rep.id)
          ) order by rep.id), '[]'::jsonb)
          from public.snapshot_members rep
          join public.campaign_audience_members cam
            on cam.organisation_id = rep.organisation_id and cam.snapshot_member_id = rep.id and cam.audience = 'members'
          join public.campaign_units cu2 on cu2.id = cam.campaign_unit_id and cu2.campaign_id = p_campaign_id
          where rep.manager_snapshot_member_id = s.manager_snapshot_member_id
        )
      ) order by m.last_name, m.first_name, s.id), '[]'::jsonb)
      from public.rating_sessions s
      join public.snapshot_members m on m.organisation_id = s.organisation_id and m.id = s.manager_snapshot_member_id
      where s.campaign_id = p_campaign_id
    )
  );
end
$$;

-- The administrator checklists (Online Measurement Specification 4.2 to 4.3a; plan 3.4) -----------

-- Each save a new version, checked against the frozen context: ADM-O1 keyed by the role families
-- present among the unit's members, ADM-O2 by the frozen systems, ADM-O4 as up to five figures.
-- Answers may be partial; the close scores what is complete. Values are never imaged.
create function public.save_checklist(p_campaign_unit_id uuid, p_checklist text, p_answers jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cu public.campaign_units;
  v_campaign public.campaigns;
  v_context jsonb;
  v_version integer;
  v_families text[];
  v_systems text[];
begin
  select * into v_cu from public.campaign_units where id = p_campaign_unit_id;
  if not found or not private.can_run_campaign(v_cu.organisation_id) then
    perform private.refuse('checklists are completed by administrators, the account owner and staff under a session');
  end if;
  select * into v_campaign from public.campaigns where id = v_cu.campaign_id for update;
  if v_campaign.status <> 'open' then
    perform private.invalid('checklists are completed while the campaign is open');
  end if;
  if not exists (
    select 1 from public.campaign_audiences a
    where a.campaign_unit_id = v_cu.id and a.audience = 'admin_checklists' and p_checklist = any (a.items)
  ) then
    perform private.invalid('this campaign does not ask this checklist of this unit');
  end if;
  select c.context into v_context from public.campaign_unit_contexts c where c.campaign_unit_id = v_cu.id;
  if jsonb_typeof(p_answers) <> 'object' then
    perform private.invalid('the answers are an object');
  end if;

  if p_checklist = 'ADM-O1' then
    select array_agg(distinct sm.role_family_id::text) into v_families
    from public.campaign_audience_members cam
    join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
    where cam.campaign_unit_id = v_cu.id and cam.audience = 'members' and sm.role_family_id is not null;
    if exists (
      select 1 from jsonb_each(p_answers) f
      where not (f.key = any (coalesce(v_families, '{}')))
         or jsonb_typeof(f.value) <> 'object'
         or exists (
           select 1 from jsonb_each(f.value) x
           where x.key not in ('ra1', 'ra2', 'ra3') or jsonb_typeof(x.value) not in ('boolean', 'null')
         )
    ) then
      perform private.invalid('ADM-O1 answers are yes or no for RA-1 to RA-3, per role family in the unit');
    end if;
  elsif p_checklist = 'ADM-O2' then
    select array_agg(s ->> 'id') into v_systems from jsonb_array_elements(v_context -> 'systems') s;
    if exists (
      select 1 from jsonb_each(p_answers) f
      where not (f.key = any (coalesce(v_systems, '{}')))
         or jsonb_typeof(f.value) <> 'object'
         or exists (
           select 1 from jsonb_each(f.value) x
           where not (
             (x.key in ('ti1', 'ti2') and jsonb_typeof(x.value) in ('boolean', 'null'))
             or (x.key = 'ti3' and (jsonb_typeof(x.value) = 'null' or x.value #>> '{}' in ('yes', 'partly', 'no')))
             or (x.key = 'int1' and (jsonb_typeof(x.value) = 'null'
                 or x.value #>> '{}' in ('automated', 'scheduled', 'manual', 'not-connected', 'excluded')))
           )
         )
    ) then
      perform private.invalid('ADM-O2 answers are TI-1 to TI-3 and INT-1, per system in the unit');
    end if;
  elsif p_checklist = 'ADM-O4' then
    if exists (
      select 1 from jsonb_each(p_answers) x
      where not (
        (x.key in ('utilisationPercent', 'overtimeHoursPerFte', 'absenceAboveBaselinePercent', 'vacancyRatePercent')
          and (jsonb_typeof(x.value) = 'null' or (jsonb_typeof(x.value) = 'number' and (x.value #>> '{}')::numeric between -1000 and 1000)))
        or (x.key = 'backlogChangePercent' and (jsonb_typeof(x.value) = 'null' or x.value #>> '{}' = 'not-applicable'
            or (jsonb_typeof(x.value) = 'number' and (x.value #>> '{}')::numeric between -1000 and 1000)))
      )
    ) then
      perform private.invalid('ADM-O4 answers are the five capacity facts, as figures');
    end if;
  else
    perform private.invalid('no such checklist');
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.checklist_responses
  where campaign_unit_id = v_cu.id and checklist_code = p_checklist;
  insert into public.checklist_responses (organisation_id, campaign_unit_id, checklist_code, version, answers, entered_by)
  values (v_cu.organisation_id, v_cu.id, p_checklist, v_version, p_answers, private.acting_user_id());
  return v_version;
end
$$;

-- The close (Milestone 5 plan, 6.1) --------------------------------------------------------------------

-- The job closes every campaign whose close has passed. Ingestion checks the time itself, so a late
-- submission is refused before this runs.
create function public.close_due_campaigns()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  for v_campaign in
    select * from public.campaigns where status = 'open' and closes_at <= now() for update skip locked
  loop
    update public.campaigns set status = 'closed', closed_at = now() where id = v_campaign.id;
    perform private.record_event(v_campaign.organisation_id, 'campaign.closed', 'campaigns', v_campaign.id, null);
    return next v_campaign.id;
  end loop;
end
$$;

-- Records who was asked and how many answered, per unit and audience, then deletes what could still
-- pair a person with a response: the live tokens, the invitations and the outbox (plan D4).
create function public.settle_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or v_campaign.status not in ('closed', 'under_review', 'released') then
    perform private.invalid('a campaign is settled after it closes');
  end if;
  if v_campaign.settled_at is not null then
    return;
  end if;
  update public.campaign_audiences a
  set issued = inv.n,
      responded = case when v_campaign.tokens_issued_at is null then 0 else inv.n - coalesce(live.n, 0) end
  from (
    select i.campaign_unit_id, i.audience, count(*)::integer as n
    from public.invitations i
    join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
    where cu.campaign_id = p_campaign_id
    group by 1, 2
  ) inv
  left join (
    select t.campaign_unit_id, t.audience, count(*)::integer as n
    from private.survey_tokens t
    join public.campaign_units cu on cu.organisation_id = t.organisation_id and cu.id = t.campaign_unit_id
    where cu.campaign_id = p_campaign_id
    group by 1, 2
  ) live on live.campaign_unit_id = inv.campaign_unit_id and live.audience = inv.audience
  where a.campaign_unit_id = inv.campaign_unit_id and a.audience = inv.audience;

  delete from private.survey_tokens t
  using public.campaign_units cu
  where cu.organisation_id = t.organisation_id and cu.id = t.campaign_unit_id and cu.campaign_id = p_campaign_id;
  delete from private.email_outbox where campaign_id = p_campaign_id;
  delete from public.invitations i
  using public.campaign_units cu
  where cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id and cu.campaign_id = p_campaign_id;
  update public.campaigns set settled_at = now() where id = p_campaign_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.settled', 'campaigns', p_campaign_id, null);
end
$$;

-- The second of the two functions that touch the anonymous tables (Milestone 3 plan, Section 4).
-- On its first call for a campaign it rewrites all the campaign's anonymous rows in one transaction,
-- in random order and under fresh identifiers, so they share that transaction and their order says
-- nothing about when anyone answered (plan 4.4); later calls only read. It returns one campaign
-- unit's rows for the intake: Part A, Part B, the team leaders' and the leadership module's.
create function public.close_campaign_responses(p_campaign_unit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cu public.campaign_units;
  v_campaign public.campaigns;
  v_old uuid[];
  v_new uuid[];
begin
  select * into v_cu from public.campaign_units where id = p_campaign_unit_id;
  if not found then
    perform private.invalid('no such campaign unit');
  end if;
  select * into v_campaign from public.campaigns where id = v_cu.campaign_id for update;
  if v_campaign.status not in ('closed', 'under_review', 'released') or v_campaign.settled_at is null then
    perform private.invalid('responses are read only after the campaign has closed and settled');
  end if;

  if v_campaign.responses_rewritten_at is null then
    -- Each response's new identifier, paired by position with its old one.
    select coalesce(array_agg(r.id), '{}'), coalesce(array_agg(gen_random_uuid()), '{}') into v_old, v_new
    from public.survey_responses r
    join public.campaign_units cu on cu.organisation_id = r.organisation_id and cu.id = r.campaign_unit_id
    where cu.campaign_id = v_campaign.id;
    insert into public.survey_responses (id, organisation_id, campaign_unit_id, audience, campaign_team_id, completion_seconds)
    select m.new_id, r.organisation_id, r.campaign_unit_id, r.audience, r.campaign_team_id, r.completion_seconds
    from unnest(v_old, v_new) as m (old_id, new_id) join public.survey_responses r on r.id = m.old_id
    order by random();
    insert into public.survey_item_responses (organisation_id, response_id, item_code, process_id, decision_type_id, value)
    select i.organisation_id, m.new_id, i.item_code, i.process_id, i.decision_type_id, i.value
    from unnest(v_old, v_new) as m (old_id, new_id) join public.survey_item_responses i on i.response_id = m.old_id
    order by random();
    insert into public.survey_role_answers (organisation_id, response_id, decision_type_id, role, position_id)
    select a.organisation_id, m.new_id, a.decision_type_id, a.role, a.position_id
    from unnest(v_old, v_new) as m (old_id, new_id) join public.survey_role_answers a on a.response_id = m.old_id
    order by random();
    delete from public.survey_role_answers where response_id = any (v_old);
    delete from public.survey_item_responses where response_id = any (v_old);
    delete from public.survey_responses where id = any (v_old);
    update public.campaigns set responses_rewritten_at = now() where id = v_campaign.id;
  end if;

  return jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'team', r.campaign_team_id, 'seconds', r.completion_seconds,
        'items', (
          select coalesce(jsonb_object_agg(i.item_code, i.value), '{}'::jsonb) from public.survey_item_responses i
          where i.response_id = r.id and i.process_id is null and i.decision_type_id is null
        )
      ) order by r.id), '[]'::jsonb)
      from public.survey_responses r where r.campaign_unit_id = v_cu.id and r.audience = 'members_part_a'
    ),
    'membersPartB', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'seconds', r.completion_seconds,
        'items', (
          select coalesce(jsonb_object_agg(i.item_code, i.value), '{}'::jsonb) from public.survey_item_responses i
          where i.response_id = r.id and i.process_id is null
        ),
        'processes', (
          select coalesce(jsonb_agg(jsonb_build_object('process', p.process_id, 'items', p.items) order by p.process_id), '[]'::jsonb)
          from (
            select i.process_id, jsonb_object_agg(i.item_code, i.value) as items
            from public.survey_item_responses i
            where i.response_id = r.id and i.process_id is not null
            group by i.process_id
          ) p
        )
      ) order by r.id), '[]'::jsonb)
      from public.survey_responses r where r.campaign_unit_id = v_cu.id and r.audience = 'members_part_b'
    ),
    'teamLeaders', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'seconds', r.completion_seconds,
        'items', (
          select coalesce(jsonb_object_agg(i.item_code, i.value), '{}'::jsonb) from public.survey_item_responses i
          where i.response_id = r.id
        )
      ) order by r.id), '[]'::jsonb)
      from public.survey_responses r where r.campaign_unit_id = v_cu.id and r.audience = 'team_leaders'
    ),
    'leadership', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'respondent', d.response_id, 'decisionType', d.decision_type_id,
        'clarity', (
          select i.value from public.survey_item_responses i
          where i.response_id = d.response_id and i.decision_type_id = d.decision_type_id and i.item_code = 'O1L-06'
        ),
        'roles', (
          select coalesce(jsonb_object_agg(g.role, g.positions), '{}'::jsonb)
          from (
            select a.role, jsonb_agg(coalesce(a.position_id::text, 'unclear') order by coalesce(a.position_id::text, 'unclear')) as positions
            from public.survey_role_answers a
            where a.response_id = d.response_id and a.decision_type_id = d.decision_type_id
            group by a.role
          ) g
        )
      ) order by d.response_id, d.decision_type_id), '[]'::jsonb)
      from (
        select a.response_id, a.decision_type_id from public.survey_role_answers a
        join public.survey_responses r on r.id = a.response_id
        where r.campaign_unit_id = v_cu.id and r.audience = 'leadership_team'
        union
        select i.response_id, i.decision_type_id from public.survey_item_responses i
        join public.survey_responses r on r.id = i.response_id
        where r.campaign_unit_id = v_cu.id and r.audience = 'leadership_team' and i.decision_type_id is not null
      ) d
    )
  );
end
$$;

-- Retire-and-lineage (Milestone 5 plan, 2.5) -------------------------------------------------------

-- Replaces Milestone 4b's refusal: a measurement unit a campaign has measured changes through
-- lineage, never in place, and nothing a scheduled, open or scoring campaign measures changes at
-- all. Combining units at least one of which was measured retires a measured combination being
-- extended and records a combine row from each measured predecessor to the new combination.
create or replace function public.combine_measurement_units(
  p_organisation_id uuid,
  p_measurement_unit_ids uuid[],
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[] := array(select distinct x from unnest(coalesce(p_measurement_unit_ids, '{}')) as x);
  v_found integer;
  v_combined integer;
  v_extending uuid;
  v_retiring uuid;
  v_target uuid;
  v_base text;
  v_code text;
  v_n integer := 2;
  v_units uuid[];
begin
  if not private.can_manage_org(p_organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session combine units');
  end if;
  if cardinality(v_ids) < 2 then
    perform private.invalid('choose two or more measurement units to combine');
  end if;
  if p_name is null or btrim(p_name) = '' or length(btrim(p_name)) > 200 then
    perform private.invalid('a combined measurement unit needs a name of up to 200 characters');
  end if;

  perform 1 from public.measurement_units
  where organisation_id = p_organisation_id and id = any (v_ids)
  for update;
  select count(*), count(*) filter (where kind = 'combined')
  into v_found, v_combined
  from public.measurement_units
  where organisation_id = p_organisation_id and id = any (v_ids) and status = 'active';
  if v_found <> cardinality(v_ids) then
    perform private.invalid('every measurement unit must be an active measurement unit of this organisation');
  end if;
  if v_combined > 1 then
    perform private.invalid('two combinations cannot be combined; undo one of them first');
  end if;
  if exists (select 1 from unnest(v_ids) as x where private.measurement_unit_running(p_organisation_id, x)) then
    perform private.invalid('a campaign is measuring this unit; change it after the campaign closes');
  end if;

  select array_agg(m.business_unit_id) into v_units
  from public.measurement_unit_members m
  where m.organisation_id = p_organisation_id and m.measurement_unit_id = any (v_ids) and m.ended_at is null;

  select string_agg(u.unit_code, '+' order by lower(u.unit_code)) into v_base
  from public.business_units u
  where u.organisation_id = p_organisation_id and u.id = any (v_units);
  if length(v_base) > 240 then
    perform private.invalid('too many units to combine into one measurement unit');
  end if;

  select id into v_extending from public.measurement_units
  where organisation_id = p_organisation_id and id = any (v_ids) and kind = 'combined';
  -- A measured combination is not extended in place: it is retired and succeeded.
  if v_extending is not null and private.measurement_unit_in_use(p_organisation_id, v_extending) then
    v_retiring := v_extending;
    v_extending := null;
  end if;

  v_code := v_base;
  while exists (
    select 1 from public.measurement_units
    where organisation_id = p_organisation_id and lower(code) = lower(v_code) and id is distinct from v_extending
  ) loop
    v_code := v_base || '#' || v_n;
    v_n := v_n + 1;
  end loop;

  if v_extending is null then
    insert into public.measurement_units (organisation_id, code, name, kind)
    values (p_organisation_id, v_code, btrim(p_name), 'combined')
    returning id into v_target;
  else
    v_target := v_extending;
    update public.measurement_units set code = v_code, name = btrim(p_name) where id = v_target;
  end if;

  -- The units leave their measurement units, then join the combination.
  update public.measurement_unit_members
  set ended_at = now()
  where organisation_id = p_organisation_id and measurement_unit_id = any (v_ids)
    and measurement_unit_id <> v_target and ended_at is null;
  insert into public.measurement_unit_members (organisation_id, measurement_unit_id, business_unit_id)
  select p_organisation_id, v_target, u
  from unnest(v_units) as u
  where not exists (
    select 1 from public.measurement_unit_members m
    where m.organisation_id = p_organisation_id and m.measurement_unit_id = v_target
      and m.business_unit_id = u and m.ended_at is null
  );
  update public.measurement_units
  set status = 'inactive'
  where organisation_id = p_organisation_id and id = any (v_ids) and id <> v_target and kind = 'single';
  if v_retiring is not null then
    update public.measurement_units set status = 'retired', retired_on = private.today() where id = v_retiring;
  end if;

  -- Lineage from every measured predecessor (plan 2.5).
  insert into public.measurement_unit_lineage (organisation_id, predecessor_id, successor_id, kind, effective_date, recorded_by)
  select p_organisation_id, x, v_target, 'combine', private.today(), private.acting_user_id()
  from unnest(v_ids) as x
  where x <> v_target and private.measurement_unit_in_use(p_organisation_id, x)
  on conflict do nothing;

  perform private.record_event(p_organisation_id, 'measurement.combined', 'measurement_units', v_target,
    jsonb_build_object('units', cardinality(v_units), 'retired', v_retiring));
  return v_target;
end
$$;

-- Undoing a combination: one a campaign has not measured is removed with its context, as in
-- Milestone 4b; one a campaign has measured is retired, keeps its context and history, and each of
-- its units is measured on its own again, with a separate row of lineage to each.
create or replace function public.undo_measurement_unit(p_organisation_id uuid, p_measurement_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_units uuid[];
begin
  if not private.can_manage_org(p_organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session undo a combination');
  end if;
  perform 1 from public.measurement_units
  where organisation_id = p_organisation_id and id = p_measurement_unit_id and kind = 'combined' and status = 'active'
  for update;
  if not found then
    perform private.invalid('only an active combined measurement unit can be undone');
  end if;
  if private.measurement_unit_running(p_organisation_id, p_measurement_unit_id) then
    perform private.invalid('a campaign is measuring this unit; change it after the campaign closes');
  end if;

  v_units := private.measurement_unit_constituents(p_organisation_id, p_measurement_unit_id);

  if private.measurement_unit_in_use(p_organisation_id, p_measurement_unit_id) then
    update public.measurement_unit_members set ended_at = now()
    where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id and ended_at is null;
    update public.measurement_units set status = 'retired', retired_on = private.today()
    where organisation_id = p_organisation_id and id = p_measurement_unit_id;
    perform private.restore_singles(p_organisation_id, p_measurement_unit_id, v_units);
    perform private.record_event(p_organisation_id, 'measurement.retired', 'measurement_units', p_measurement_unit_id,
      jsonb_build_object('units', cardinality(v_units)));
    return;
  end if;

  delete from public.knowledge_domains where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id;
  delete from public.decision_types where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id;
  delete from public.critical_processes where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id;
  delete from public.primary_systems where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id;
  delete from public.measurement_unit_members where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id;
  delete from public.measurement_units where organisation_id = p_organisation_id and id = p_measurement_unit_id;

  update public.measurement_units
  set status = 'active'
  where organisation_id = p_organisation_id and single_unit_id = any (v_units);
  update public.measurement_unit_members m
  set ended_at = null
  from public.measurement_units s
  where s.organisation_id = p_organisation_id and s.single_unit_id = any (v_units)
    and m.organisation_id = s.organisation_id and m.measurement_unit_id = s.id and m.business_unit_id = s.single_unit_id
    and m.ended_at = (
      select max(x.ended_at) from public.measurement_unit_members x
      where x.organisation_id = m.organisation_id and x.measurement_unit_id = m.measurement_unit_id
    );

  perform private.record_event(p_organisation_id, 'measurement.undone', 'measurement_units', p_measurement_unit_id,
    jsonb_build_object('units', cardinality(v_units)));
end
$$;

-- The given units return to their own single measurement units, as a new membership each, with a
-- separate row of lineage from the retired combination.
create function private.restore_singles(p_organisation_id uuid, p_retired_id uuid, p_units uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.measurement_units
  set status = 'active'
  where organisation_id = p_organisation_id and single_unit_id = any (p_units) and status = 'inactive';
  insert into public.measurement_unit_members (organisation_id, measurement_unit_id, business_unit_id)
  select p_organisation_id, s.id, s.single_unit_id
  from public.measurement_units s
  where s.organisation_id = p_organisation_id and s.single_unit_id = any (p_units);
  insert into public.measurement_unit_lineage (organisation_id, predecessor_id, successor_id, kind, effective_date, recorded_by)
  select p_organisation_id, p_retired_id, s.id, 'separate', private.today(), private.acting_user_id()
  from public.measurement_units s
  where s.organisation_id = p_organisation_id and s.single_unit_id = any (p_units)
  on conflict do nothing;
end
$$;

-- Splitting out a unit of a measured combination that has grown past 10 (Online Measurement
-- Specification 6.2): the combination is retired; the unit is measured on its own; the rest stay
-- combined as a new combination where two or more remain, or return to their single. Lineage runs
-- from the retired combination to each successor. The minimum of 10 is the portal's to check.
create function public.split_out_measurement_unit(
  p_organisation_id uuid,
  p_measurement_unit_id uuid,
  p_unit_id uuid,
  p_rest_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_units uuid[];
  v_rest uuid[];
  v_base text;
  v_code text;
  v_n integer := 2;
  v_new uuid;
begin
  if not private.can_manage_org(p_organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session split a combination');
  end if;
  perform 1 from public.measurement_units
  where organisation_id = p_organisation_id and id = p_measurement_unit_id and kind = 'combined' and status = 'active'
  for update;
  if not found then
    perform private.invalid('only an active combined measurement unit can be split');
  end if;
  if private.measurement_unit_running(p_organisation_id, p_measurement_unit_id) then
    perform private.invalid('a campaign is measuring this unit; change it after the campaign closes');
  end if;
  v_units := private.measurement_unit_constituents(p_organisation_id, p_measurement_unit_id);
  if not (p_unit_id = any (v_units)) then
    perform private.invalid('the unit to split out must be one of the combination''s units');
  end if;
  v_rest := array(select u from unnest(v_units) as u where u <> p_unit_id);

  update public.measurement_unit_members set ended_at = now()
  where organisation_id = p_organisation_id and measurement_unit_id = p_measurement_unit_id and ended_at is null;
  update public.measurement_units set status = 'retired', retired_on = private.today()
  where organisation_id = p_organisation_id and id = p_measurement_unit_id;

  if cardinality(v_rest) < 2 then
    perform private.restore_singles(p_organisation_id, p_measurement_unit_id, v_units);
  else
    perform private.restore_singles(p_organisation_id, p_measurement_unit_id, array[p_unit_id]);
    if p_rest_name is null or btrim(p_rest_name) = '' or length(btrim(p_rest_name)) > 200 then
      perform private.invalid('the units that stay combined need a name of up to 200 characters');
    end if;
    select string_agg(u.unit_code, '+' order by lower(u.unit_code)) into v_base
    from public.business_units u where u.organisation_id = p_organisation_id and u.id = any (v_rest);
    v_code := v_base;
    while exists (
      select 1 from public.measurement_units where organisation_id = p_organisation_id and lower(code) = lower(v_code)
    ) loop
      v_code := v_base || '#' || v_n;
      v_n := v_n + 1;
    end loop;
    insert into public.measurement_units (organisation_id, code, name, kind)
    values (p_organisation_id, v_code, btrim(p_rest_name), 'combined')
    returning id into v_new;
    insert into public.measurement_unit_members (organisation_id, measurement_unit_id, business_unit_id)
    select p_organisation_id, v_new, u from unnest(v_rest) as u;
    insert into public.measurement_unit_lineage (organisation_id, predecessor_id, successor_id, kind, effective_date, recorded_by)
    values (p_organisation_id, p_measurement_unit_id, v_new, 'separate', private.today(), private.acting_user_id());
  end if;

  perform private.record_event(p_organisation_id, 'measurement.split', 'measurement_units', p_measurement_unit_id,
    jsonb_build_object('units', cardinality(v_units)));
end
$$;

-- The Milestone 3 invitation counts are replaced by campaign_monitoring.
drop function public.invitation_status_counts(uuid);

-- Row level security ------------------------------------------------------------------------------

alter table public.campaign_schedule enable row level security;
alter table public.snapshot_scale_maps enable row level security;
alter table public.snapshot_scale_map_entries enable row level security;
alter table public.campaign_teams enable row level security;
alter table public.campaign_unit_contexts enable row level security;
alter table public.campaign_audiences enable row level security;
alter table public.campaign_audience_members enable row level security;
alter table public.checklist_responses enable row level security;
alter table private.setup_versions enable row level security;
alter table private.survey_tokens enable row level security;
alter table private.email_outbox enable row level security;

-- Administrators, the account owner and staff under a session read what a campaign froze and
-- scheduled; a manager reads the frozen context of the campaigns they rate in (their form).
create policy campaign_schedule_select on public.campaign_schedule for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy snapshot_scale_maps_select on public.snapshot_scale_maps for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy snapshot_scale_map_entries_select on public.snapshot_scale_map_entries for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy campaign_teams_select on public.campaign_teams for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy campaign_unit_contexts_select on public.campaign_unit_contexts for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or campaign_unit_id in (
      select cu.id from public.campaign_units cu where cu.campaign_id in (select private.my_rated_campaign_ids())
    )
  );
create policy campaign_audiences_select on public.campaign_audiences for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy campaign_audience_members_select on public.campaign_audience_members for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy checklist_responses_select on public.checklist_responses for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
-- setup_versions, survey_tokens and email_outbox have no policy and no grant.

-- Grants -----------------------------------------------------------------------------------------

grant select on public.campaign_schedule to authenticated;
grant select on public.snapshot_scale_maps to authenticated;
grant select on public.snapshot_scale_map_entries to authenticated;
grant select on public.campaign_teams to authenticated;
grant select on public.campaign_unit_contexts to authenticated;
grant select on public.campaign_audiences to authenticated;
grant select on public.campaign_audience_members to authenticated;
grant select on public.checklist_responses to authenticated;

grant execute on function public.create_campaign(uuid, text, text, uuid[], timestamptz, timestamptz, text) to authenticated;
grant execute on function public.update_campaign(uuid, text, uuid[], timestamptz, timestamptz) to authenticated;
grant execute on function public.schedule_campaign(uuid) to authenticated;
grant execute on function public.unschedule_campaign(uuid) to authenticated;
grant execute on function public.cancel_campaign(uuid) to authenticated;
grant execute on function public.extend_campaign(uuid, timestamptz) to authenticated;
grant execute on function public.close_campaign_now(uuid) to authenticated;
grant execute on function public.campaign_monitoring(uuid) to authenticated;
grant execute on function public.save_checklist(uuid, text, jsonb) to authenticated;
grant execute on function public.split_out_measurement_unit(uuid, uuid, uuid, text) to authenticated;

grant execute on function public.setup_version(uuid) to service_role;
grant execute on function public.launch_campaign(uuid, uuid, bigint, jsonb) to service_role;
grant execute on function public.grant_manager_memberships(uuid) to service_role;
grant execute on function public.record_launch_refusal(uuid, jsonb) to service_role;
grant execute on function public.issue_survey_tokens(uuid, jsonb) to service_role;
grant execute on function public.survey_tokens_live(uuid, text[]) to service_role;
grant execute on function public.survey_for_token(text) to service_role;
grant execute on function public.ingest_survey_response(text, jsonb, integer) to service_role;
grant execute on function public.close_due_campaigns() to service_role;
grant execute on function public.settle_campaign(uuid) to service_role;
grant execute on function public.close_campaign_responses(uuid) to service_role;

-- Audit ----------------------------------------------------------------------------------------------

-- Campaign units, the schedule and checklist versions are audited; checklist answers are never
-- imaged, and nothing on the anonymous side is audited at all.
insert into private.audit_image_columns (table_name, column_name) values
  ('campaign_units', 'id'), ('campaign_units', 'campaign_id'), ('campaign_units', 'measurement_unit_id'),
  ('campaign_units', 'headcount'), ('campaign_units', 'c3_route'),
  ('campaign_schedule', 'id'), ('campaign_schedule', 'anchor_campaign_id'), ('campaign_schedule', 'cadence'),
  ('campaign_schedule', 'due_on'), ('campaign_schedule', 'status'), ('campaign_schedule', 'campaign_id'),
  ('checklist_responses', 'id'), ('checklist_responses', 'campaign_unit_id'),
  ('checklist_responses', 'checklist_code'), ('checklist_responses', 'version'),
  ('campaigns', 'name'), ('campaigns', 'pulse_rotation'), ('campaigns', 'event_trigger'),
  ('campaigns', 'approved_at'), ('campaigns', 'setup_version');

create trigger campaign_units_audit after insert or update or delete on public.campaign_units
  for each row execute function private.audit_row_change();
create trigger campaign_schedule_audit after insert or update or delete on public.campaign_schedule
  for each row execute function private.audit_row_change();
create trigger checklist_responses_audit after insert on public.checklist_responses
  for each row execute function private.audit_row_change();

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
