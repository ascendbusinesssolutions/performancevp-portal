-- Milestone 5, step 6: the manager's rating form (Milestone 5 plan, 3.4; D14).
--
-- A manager reads their own form through my_rating_form: the campaign, their direct reports in the
-- units it measures (from the frozen audiences, which they cannot read directly), each unit's frozen
-- skills and knowledge domains and whether managers give the talent band there, their ratings so far,
-- and their own previous ratings of the same people for the pre-fill. A manager never sees another
-- manager's ratings, so a report who has changed manager starts blank. Their own ratings are theirs
-- to read, so this read is not logged, as the Milestone 3 policies intend. They save through
-- save_manager_ratings, which checks the session is theirs and open; the rating guard checks the rest
-- (their own reports, the frozen framework, no band on the formal-ratings route) and the evidence
-- constraints hold for a 5, and for a band of 5 or 1.

-- The open campaigns a manager rates in, in one organisation.
create function public.my_rating_campaigns(p_organisation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'campaignId', c.id, 'name', c.name, 'cadence', c.cadence, 'eventTrigger', c.event_trigger,
    'closesAt', c.closes_at, 'status', c.status
  ) order by c.closes_at, c.id), '[]'::jsonb)
  from public.rating_sessions s
  join public.campaigns c on c.organisation_id = s.organisation_id and c.id = s.campaign_id
  where s.organisation_id = p_organisation_id and s.id in (select private.my_rating_session_ids())
    and c.status = 'open'
$$;

create function public.my_rating_form(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.rating_sessions;
  v_campaign public.campaigns;
begin
  select s.* into v_session from public.rating_sessions s
  where s.campaign_id = p_campaign_id and s.id in (select private.my_rating_session_ids());
  if not found then
    perform private.refuse('only the rating manager opens their rating form');
  end if;
  select * into v_campaign from public.campaigns where id = p_campaign_id;

  return (
    with reports as (
      select sm.id as subject, sm.employee_id, sm.first_name, sm.last_name, sm.role_title,
             sm.role_family_id, sm.fte, sm.start_date, cam.campaign_unit_id, t.name as team
      from public.campaign_audience_members cam
      join public.campaign_units cu on cu.organisation_id = cam.organisation_id and cu.id = cam.campaign_unit_id
      join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
      left join public.campaign_teams t on t.organisation_id = cam.organisation_id and t.id = cam.campaign_team_id
      where cu.organisation_id = v_session.organisation_id and cu.campaign_id = p_campaign_id
        and cam.audience = 'members' and sm.redacted_at is null
        and sm.manager_snapshot_member_id = v_session.manager_snapshot_member_id
    ),
    -- The manager's earlier sessions, newest first, for the pre-fill.
    earlier as (
      select s.id, c.launched_at from public.rating_sessions s
      join public.campaigns c on c.organisation_id = s.organisation_id and c.id = s.campaign_id
      where s.id in (select private.my_rating_session_ids()) and s.id <> v_session.id
        and c.launched_at < coalesce(v_campaign.launched_at, now())
    )
    select jsonb_build_object(
      'campaign', jsonb_build_object(
        'id', v_campaign.id, 'name', v_campaign.name, 'cadence', v_campaign.cadence,
        'eventTrigger', v_campaign.event_trigger, 'closesAt', v_campaign.closes_at, 'status', v_campaign.status
      ),
      'organisationName', (select o.name from public.organisations o where o.id = v_session.organisation_id),
      'session', jsonb_build_object(
        'id', v_session.id,
        'managerName', (
          select btrim(coalesce(sm.first_name, '') || ' ' || coalesce(sm.last_name, ''))
          from public.snapshot_members sm where sm.id = v_session.manager_snapshot_member_id
        )
      ),
      'units', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'campaignUnitId', cu.id, 'name', mu.name, 'c3Route', cu.c3_route, 'items', to_jsonb(a.items),
          'roleFamilies', x.context -> 'roleFamilies', 'knowledgeDomains', x.context -> 'knowledgeDomains'
        ) order by mu.name), '[]'::jsonb)
        from public.campaign_units cu
        join public.measurement_units mu on mu.organisation_id = cu.organisation_id and mu.id = cu.measurement_unit_id
        join public.campaign_audiences a on a.organisation_id = cu.organisation_id and a.campaign_unit_id = cu.id and a.audience = 'managers'
        join public.campaign_unit_contexts x on x.organisation_id = cu.organisation_id and x.campaign_unit_id = cu.id
        where cu.organisation_id = v_session.organisation_id and cu.campaign_id = p_campaign_id
          and cu.id in (select r.campaign_unit_id from reports r)
      ),
      'reports', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'subject', r.subject, 'name', btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')),
          'roleTitle', r.role_title, 'roleFamilyId', r.role_family_id, 'fte', r.fte, 'startDate', r.start_date,
          'campaignUnitId', r.campaign_unit_id, 'team', r.team
        ) order by lower(r.last_name), lower(r.first_name), r.subject), '[]'::jsonb)
        from reports r
      ),
      'ratings', jsonb_build_object(
        'skills', (
          select coalesce(jsonb_agg(jsonb_build_object('subject', x.subject_snapshot_member_id, 'id', x.skill_id,
            'value', x.rating, 'note', x.evidence_note)), '[]'::jsonb)
          from public.skill_ratings x where x.organisation_id = v_session.organisation_id and x.rating_session_id = v_session.id
        ),
        'knowledge', (
          select coalesce(jsonb_agg(jsonb_build_object('subject', x.subject_snapshot_member_id, 'id', x.knowledge_domain_id,
            'value', x.rating, 'note', x.evidence_note)), '[]'::jsonb)
          from public.knowledge_ratings x where x.organisation_id = v_session.organisation_id and x.rating_session_id = v_session.id
        ),
        'bands', (
          select coalesce(jsonb_agg(jsonb_build_object('subject', x.subject_snapshot_member_id,
            'value', x.band, 'note', x.evidence_note)), '[]'::jsonb)
          from public.talent_bands x where x.organisation_id = v_session.organisation_id and x.rating_session_id = v_session.id
        )
      ),
      -- The manager's own latest earlier rating of each item for the same person, by employee.
      'previous', jsonb_build_object(
        'skills', (
          select coalesce(jsonb_agg(p.row), '[]'::jsonb) from (
            select distinct on (r.subject, x.skill_id)
              jsonb_build_object('subject', r.subject, 'id', x.skill_id, 'value', x.rating, 'note', x.evidence_note) as row
            from reports r
            join public.skill_ratings x on x.organisation_id = v_session.organisation_id and x.employee_id = r.employee_id
            join earlier e on e.id = x.rating_session_id
            order by r.subject, x.skill_id, e.launched_at desc
          ) p
        ),
        'knowledge', (
          select coalesce(jsonb_agg(p.row), '[]'::jsonb) from (
            select distinct on (r.subject, x.knowledge_domain_id)
              jsonb_build_object('subject', r.subject, 'id', x.knowledge_domain_id, 'value', x.rating, 'note', x.evidence_note) as row
            from reports r
            join public.knowledge_ratings x on x.organisation_id = v_session.organisation_id and x.employee_id = r.employee_id
            join earlier e on e.id = x.rating_session_id
            order by r.subject, x.knowledge_domain_id, e.launched_at desc
          ) p
        ),
        'bands', (
          select coalesce(jsonb_agg(p.row), '[]'::jsonb) from (
            select distinct on (r.subject)
              jsonb_build_object('subject', r.subject, 'value', x.band, 'note', x.evidence_note) as row
            from reports r
            join public.talent_bands x on x.organisation_id = v_session.organisation_id and x.employee_id = r.employee_id
            join earlier e on e.id = x.rating_session_id
            order by r.subject, e.launched_at desc
          ) p
        )
      )
    )
  );
end
$$;

-- Saves one report's ratings: skills [{id, value, note}], knowledge [{id, value, note}] and the
-- band {value, note}, each inserted or replaced. The session must be the caller's and its campaign
-- open; the rating guard and the evidence constraints decide the rest, row by row.
create function public.save_manager_ratings(p_session_id uuid, p_subject_snapshot_member_id uuid, p_ratings jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.rating_sessions;
begin
  if p_session_id is null or p_session_id not in (select private.my_open_rating_session_ids()) then
    perform private.refuse('ratings are saved by the rating manager while the campaign is open');
  end if;
  if jsonb_typeof(p_ratings) <> 'object' then
    perform private.invalid('the ratings are an object');
  end if;
  select * into v_session from public.rating_sessions where id = p_session_id;

  insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating, evidence_note)
  select v_session.organisation_id, p_session_id, p_subject_snapshot_member_id, (x ->> 'id')::uuid, (x ->> 'value')::smallint,
         nullif(btrim(coalesce(x ->> 'note', '')), '')
  from jsonb_array_elements(coalesce(p_ratings -> 'skills', '[]'::jsonb)) x
  on conflict (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id)
  do update set rating = excluded.rating, evidence_note = excluded.evidence_note;

  insert into public.knowledge_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, knowledge_domain_id, rating, evidence_note)
  select v_session.organisation_id, p_session_id, p_subject_snapshot_member_id, (x ->> 'id')::uuid, (x ->> 'value')::smallint,
         nullif(btrim(coalesce(x ->> 'note', '')), '')
  from jsonb_array_elements(coalesce(p_ratings -> 'knowledge', '[]'::jsonb)) x
  on conflict (organisation_id, rating_session_id, subject_snapshot_member_id, knowledge_domain_id)
  do update set rating = excluded.rating, evidence_note = excluded.evidence_note;

  if jsonb_typeof(p_ratings -> 'band') = 'object' then
    insert into public.talent_bands (organisation_id, rating_session_id, subject_snapshot_member_id, band, evidence_note)
    values (v_session.organisation_id, p_session_id, p_subject_snapshot_member_id, (p_ratings -> 'band' ->> 'value')::smallint,
            nullif(btrim(coalesce(p_ratings -> 'band' ->> 'note', '')), ''))
    on conflict (organisation_id, rating_session_id, subject_snapshot_member_id)
    do update set band = excluded.band, evidence_note = excluded.evidence_note;
  end if;
end
$$;

grant execute on function public.my_rating_campaigns(uuid) to authenticated;
grant execute on function public.my_rating_form(uuid) to authenticated;
grant execute on function public.save_manager_ratings(uuid, uuid, jsonb) to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
