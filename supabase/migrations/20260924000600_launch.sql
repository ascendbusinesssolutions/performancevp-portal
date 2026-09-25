-- Milestone 5, step 4: the launch's reads and the cadence calendar's decisions (Milestone 5 plan,
-- 2.2 and 2.3).
--
-- "Launch now" reads the readiness data as the signed-in administrator, under row level security,
-- exactly as the readiness page does. A scheduled launch has no one signed in: the job reads the
-- same rows through launch_dataset, which only the service role runs, and which logs its read of
-- the formal ratings as ratings.checked, as the readiness read does. The portal then reruns the
-- readiness check and computes the plan, and launch_campaign checks the plan again under the lock.
-- An administrator turns a calendar proposal into a scheduled campaign, or dismisses it.

-- The scheduled launch's read ----------------------------------------------------------------------

-- Everything the readiness check and the launch plan read for a campaign's organisation, in the
-- shapes the portal's loaders return, with the setup version read first: any setup write committed
-- after it moves the version, and the launch then refuses.
create function public.launch_dataset(p_campaign_id uuid)
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

-- Scheduled campaigns whose opening has come, for the job to launch.
create function public.due_scheduled_campaigns()
returns table (campaign_id uuid, organisation_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.organisation_id from public.campaigns c
  where c.status = 'scheduled' and c.opens_at <= now()
  order by c.opens_at, c.id
$$;

-- A scheduled launch that readiness refused goes back to draft with the findings for its page, and
-- the account owner and each administrator are told (plan 2.2). Replaces step 3's version, which
-- queued no email.
create or replace function public.record_launch_refusal(p_campaign_id uuid, p_blockers jsonb)
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
  insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_user_id)
  select distinct v_campaign.organisation_id, p_campaign_id, 'launch_refused', m.user_id
  from public.org_memberships m
  where m.organisation_id = v_campaign.organisation_id and m.revoked_at is null
    and m.role in ('account_owner', 'administrator');
  perform private.record_event(v_campaign.organisation_id, 'campaign.launch_refused', 'campaigns', p_campaign_id,
    jsonb_build_object('blockers', jsonb_array_length(coalesce(p_blockers, '[]'::jsonb))));
end
$$;

-- The cadence calendar's decisions (plan 2.2) -------------------------------------------------------

-- Approving a proposal creates the campaign for the anchor's measurement units that are still
-- active and schedules it for the window given; dismissing it records who and when. Nothing opens
-- without this approval.
create function public.decide_schedule_proposal(
  p_proposal_id uuid,
  p_approve boolean,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.campaign_schedule;
  v_units uuid[];
  v_campaign uuid;
begin
  select * into v_proposal from public.campaign_schedule where id = p_proposal_id for update;
  if not found or not private.can_manage_org(v_proposal.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session decide the calendar');
  end if;
  if v_proposal.status <> 'proposed' then
    perform private.invalid('this proposal has already been decided');
  end if;

  if not coalesce(p_approve, false) then
    update public.campaign_schedule
    set status = 'dismissed', decided_by = private.acting_user_id(), decided_at = now()
    where id = p_proposal_id;
    perform private.record_event(v_proposal.organisation_id, 'campaign.proposal_dismissed', 'campaign_schedule',
      p_proposal_id, jsonb_build_object('cadence', v_proposal.cadence, 'due_on', v_proposal.due_on));
    return null;
  end if;

  v_units := array(
    select cu.measurement_unit_id from public.campaign_units cu
    join public.measurement_units m on m.organisation_id = cu.organisation_id and m.id = cu.measurement_unit_id
    where cu.organisation_id = v_proposal.organisation_id and cu.campaign_id = v_proposal.anchor_campaign_id
      and m.status = 'active'
  );
  if cardinality(v_units) = 0 then
    perform private.invalid('none of the units this proposal measures is still measured; start a campaign instead');
  end if;
  v_campaign := public.create_campaign(
    v_proposal.organisation_id, v_proposal.cadence, null, v_units, p_opens_at, p_closes_at
  );
  perform public.schedule_campaign(v_campaign);
  update public.campaign_schedule
  set status = 'scheduled', campaign_id = v_campaign, decided_by = private.acting_user_id(), decided_at = now()
  where id = p_proposal_id;
  return v_campaign;
end
$$;

-- Grants -------------------------------------------------------------------------------------------

grant execute on function public.decide_schedule_proposal(uuid, boolean, timestamptz, timestamptz) to authenticated;
grant execute on function public.launch_dataset(uuid) to service_role;
grant execute on function public.due_scheduled_campaigns() to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
