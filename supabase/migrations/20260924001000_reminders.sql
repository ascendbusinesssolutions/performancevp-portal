-- Milestone 5, step 7: monitoring, reminders and the five-minute job (Milestone 5 plan, 5.1 and 5.2).
--
-- Survey reminders never name a person in the database. On a reminder day, or when an
-- administrator asks, the job reads the invitations, derives each token's hash with the secret it
-- alone holds, asks which are still live, and emails those people straight away from its memory;
-- only a campaign-level record (when, for which units and audiences, how many emails) is kept,
-- because a per-person record would say who had not answered by when. Reminders about identified
-- work, a manager's ratings and the administrators' checklists, go through the outbox as before.
-- Manual reminders are limited to one a day, per unit and audience, and per manager.

alter table public.rating_sessions add column last_reminded_at timestamptz;
alter table private.email_outbox add column schedule_id uuid;

create table public.campaign_reminders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_id uuid not null,
  campaign_unit_id uuid,
  audience text check (audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team')),
  kind text not null check (kind in ('automatic', 'manual')),
  reminder_day integer check (reminder_day > 0),
  requested_by uuid,
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  emails integer check (emails >= 0),
  unique (organisation_id, id),
  foreign key (organisation_id, campaign_id) references public.campaigns (organisation_id, id),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  check ((kind = 'automatic') = (reminder_day is not null))
);
create unique index campaign_reminders_day_idx on public.campaign_reminders (organisation_id, campaign_id, reminder_day)
  where kind = 'automatic';
comment on table public.campaign_reminders is
  'The survey reminders a campaign sent: when, to which units and audiences, and how many emails. '
  'Never who: the job works that out from the live tokens in memory (Milestone 5 plan, 4.1).';

alter table public.campaign_reminders enable row level security;
create policy campaign_reminders_select on public.campaign_reminders for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
grant select on public.campaign_reminders to authenticated;

-- Each rating session's reports, and how many are fully rated: every skill of the report's role
-- family where C1 is asked, every knowledge domain of the unit where C2 is, and the band where C3
-- is asked on the module route, all as frozen at launch.
create function private.session_progress(p_campaign_id uuid)
returns table (session_id uuid, reports integer, rated integer)
language sql
stable
security definer
set search_path = ''
as $$
  with rep as (
    select s.id as session_id, sm.id as subject, cam.campaign_unit_id, sm.role_family_id
    from public.rating_sessions s
    join public.snapshot_members sm
      on sm.organisation_id = s.organisation_id and sm.manager_snapshot_member_id = s.manager_snapshot_member_id
    join public.campaign_audience_members cam
      on cam.organisation_id = sm.organisation_id and cam.snapshot_member_id = sm.id and cam.audience = 'members'
    join public.campaign_units cu
      on cu.organisation_id = cam.organisation_id and cu.id = cam.campaign_unit_id and cu.campaign_id = s.campaign_id
    where s.campaign_id = p_campaign_id
  ),
  need as (
    select rep.*,
      case when 'c1' = any (a.items) then (
        select count(*) from jsonb_array_elements(x.context -> 'roleFamilies') f
        cross join lateral jsonb_array_elements(f -> 'skills') k
        where f ->> 'id' = rep.role_family_id::text
      ) else 0 end as skills,
      case when 'c2' = any (a.items) then jsonb_array_length(x.context -> 'knowledgeDomains') else 0 end as domains,
      ('c3' = any (a.items) and cu.c3_route = 'module') as band
    from rep
    join public.campaign_audiences a on a.campaign_unit_id = rep.campaign_unit_id and a.audience = 'managers'
    join public.campaign_unit_contexts x on x.campaign_unit_id = rep.campaign_unit_id
    join public.campaign_units cu on cu.id = rep.campaign_unit_id
  )
  select n.session_id, count(*)::integer,
         count(*) filter (where
           (select count(*) from public.skill_ratings r where r.rating_session_id = n.session_id and r.subject_snapshot_member_id = n.subject) >= n.skills
           and (select count(*) from public.knowledge_ratings r where r.rating_session_id = n.session_id and r.subject_snapshot_member_id = n.subject) >= n.domains
           and (not n.band or exists (select 1 from public.talent_bands r where r.rating_session_id = n.session_id and r.subject_snapshot_member_id = n.subject))
         )::integer
  from need n
  group by n.session_id
$$;

-- Emails the managers of a campaign who still have reports to rate, leaving out anyone reminded in
-- the last day. For an administrator (one manager, or all) and for the job on a reminder day.
create function private.queue_manager_reminders(p_campaign_id uuid, p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    select s.id, s.organisation_id, s.manager_snapshot_member_id
    from public.rating_sessions s
    join private.session_progress(p_campaign_id) p on p.session_id = s.id
    where s.campaign_id = p_campaign_id and p.rated < p.reports
      and (p_session_id is null or s.id = p_session_id)
      and (s.last_reminded_at is null or s.last_reminded_at < now() - interval '1 day')
    for update of s
  ), marked as (
    update public.rating_sessions s set last_reminded_at = now() from due where s.id = due.id
    returning s.id
  )
  insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_snapshot_member_id)
  select due.organisation_id, p_campaign_id, 'manager_reminder', due.manager_snapshot_member_id
  from due join marked on marked.id = due.id;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

create function public.remind_managers(p_campaign_id uuid, p_session_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_count integer;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;
  if not found or not private.can_run_campaign(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session send reminders');
  end if;
  if v_campaign.status <> 'open' then
    perform private.invalid('reminders go while the campaign is open');
  end if;
  v_count := private.queue_manager_reminders(p_campaign_id, p_session_id);
  if v_count > 0 then
    perform private.record_event(v_campaign.organisation_id, 'campaign.managers_reminded', 'campaigns', p_campaign_id,
      jsonb_build_object('managers', v_count));
  end if;
  return v_count;
end
$$;

-- An administrator's survey reminder, for the campaign or one unit and audience: at most one a day
-- for any overlapping scope. The job sends it within minutes.
create function public.request_survey_reminder(
  p_campaign_id uuid,
  p_campaign_unit_id uuid default null,
  p_audience text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_id uuid;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not private.can_run_campaign(v_campaign.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session send reminders');
  end if;
  if v_campaign.status <> 'open' or v_campaign.tokens_issued_at is null then
    perform private.invalid('reminders go while the campaign is open, once its invitations have gone');
  end if;
  if exists (
    select 1 from public.campaign_reminders r
    where r.campaign_id = p_campaign_id and r.kind = 'manual' and r.requested_at > now() - interval '1 day'
      and (r.campaign_unit_id is null or p_campaign_unit_id is null or r.campaign_unit_id = p_campaign_unit_id)
      and (r.audience is null or p_audience is null or r.audience = p_audience)
  ) then
    perform private.invalid('a reminder went to these people less than a day ago');
  end if;
  insert into public.campaign_reminders (organisation_id, campaign_id, campaign_unit_id, audience, kind, requested_by)
  values (v_campaign.organisation_id, p_campaign_id, p_campaign_unit_id, p_audience, 'manual', private.acting_user_id())
  returning id into v_id;
  perform private.record_event(v_campaign.organisation_id, 'campaign.reminder_requested', 'campaigns', p_campaign_id,
    jsonb_build_object('campaign_unit_id', p_campaign_unit_id, 'audience', p_audience));
  return v_id;
end
$$;

-- The job's side ------------------------------------------------------------------------------------

-- Open campaigns, for reminders and manager accounts.
create function public.open_campaigns()
returns table (campaign_id uuid, organisation_id uuid, cadence text, opens_at timestamptz,
               closes_at timestamptz, tokens_issued boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.organisation_id, c.cadence, c.opens_at, c.closes_at, c.tokens_issued_at is not null
  from public.campaigns c where c.status = 'open'
  order by c.opens_at, c.id
$$;

-- Claims a reminder day's run for a campaign, once: the survey reminders, the managers' and the
-- checklists'. Null where it has already run.
create function public.claim_automatic_reminder(p_campaign_id uuid, p_day integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_id uuid;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;
  if not found or v_campaign.status <> 'open' or v_campaign.tokens_issued_at is null then
    return null;
  end if;
  insert into public.campaign_reminders (organisation_id, campaign_id, kind, reminder_day)
  values (v_campaign.organisation_id, p_campaign_id, 'automatic', p_day)
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    perform private.queue_manager_reminders(p_campaign_id, null);
    -- The account owner and administrators, where a checklist the campaign asks is not saved yet.
    if exists (
      select 1 from public.campaign_audiences a
      join public.campaign_units cu on cu.organisation_id = a.organisation_id and cu.id = a.campaign_unit_id
      cross join lateral unnest(a.items) i
      where cu.campaign_id = p_campaign_id and a.audience = 'admin_checklists'
        and not exists (
          select 1 from public.checklist_responses r where r.campaign_unit_id = cu.id and r.checklist_code = i
        )
    ) then
      insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_user_id)
      select distinct v_campaign.organisation_id, p_campaign_id, 'checklist_reminder', m.user_id
      from public.org_memberships m
      where m.organisation_id = v_campaign.organisation_id and m.revoked_at is null
        and m.role in ('account_owner', 'administrator');
    end if;
  end if;
  return v_id;
end
$$;

-- Administrators' reminders not yet sent.
create function public.pending_survey_reminders()
returns table (reminder_id uuid, campaign_id uuid, campaign_unit_id uuid, audience text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.campaign_id, r.campaign_unit_id, r.audience
  from public.campaign_reminders r
  join public.campaigns c on c.organisation_id = r.organisation_id and c.id = r.campaign_id
  where r.sent_at is null and c.status = 'open'
  order by r.requested_at
$$;

-- The invitations a survey reminder may go to, with what its email needs: for the job to work out,
-- with the secret, which are still live. Bounced addresses are left out.
create function public.invitations_for_reminders(
  p_campaign_id uuid,
  p_campaign_unit_id uuid default null,
  p_audience text default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'organisationName', (select o.name from public.organisations o where o.id = c.organisation_id),
    'closesAt', c.closes_at,
    'invitations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'salt', i.token_salt, 'audience', i.audience, 'unitName', mu.name, 'email', i.email,
        'itemCount', coalesce((
          select cardinality(a.items) + 6 * cardinality(a.process_ids) from public.campaign_audiences a
          where a.organisation_id = i.organisation_id and a.campaign_unit_id = i.campaign_unit_id and a.audience = i.audience
        ), 0)
      ) order by i.email, mu.name, i.audience), '[]'::jsonb)
      from public.invitations i
      join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
      join public.measurement_units mu on mu.organisation_id = cu.organisation_id and mu.id = cu.measurement_unit_id
      where cu.organisation_id = c.organisation_id and cu.campaign_id = c.id
        and i.status <> 'bounced' and i.email is not null
        and (p_campaign_unit_id is null or i.campaign_unit_id = p_campaign_unit_id)
        and (p_audience is null or i.audience = p_audience)
    )
  )
  from public.campaigns c where c.id = p_campaign_id and c.status = 'open'
$$;

create function public.survey_reminder_sent(p_reminder_id uuid, p_emails integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.campaign_reminders set sent_at = now(), emails = greatest(coalesce(p_emails, 0), 0)
  where id = p_reminder_id and sent_at is null
$$;

-- The calendar's notice, fourteen days before a proposal is due, once, to the account owner and
-- administrators.
create function public.queue_schedule_notices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    update public.campaign_schedule s set noticed_at = now()
    where s.status = 'proposed' and s.noticed_at is null and s.due_on <= private.today() + 14
    returning s.id, s.organisation_id, s.anchor_campaign_id
  )
  insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_user_id, schedule_id)
  select distinct due.organisation_id, due.anchor_campaign_id, 'schedule_notice', m.user_id, due.id
  from due
  join public.org_memberships m
    on m.organisation_id = due.organisation_id and m.revoked_at is null and m.role in ('account_owner', 'administrator');
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- The sender reads the proposal a notice is about.
create or replace function public.claim_outbox(p_limit integer, p_campaign_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  with candidates as (
    select o.id from private.email_outbox o
    left join public.campaigns c on c.organisation_id = o.organisation_id and c.id = o.campaign_id
    where (p_campaign_id is null or o.campaign_id = p_campaign_id)
      and (o.status = 'pending' or (o.status = 'sending' and o.claimed_at < now() - interval '10 minutes'))
      and o.attempts < 5
      and (o.kind not in ('survey_invitation', 'survey_reminder') or c.tokens_issued_at is not null)
    order by o.created_at, o.id
    limit greatest(coalesce(p_limit, 0), 0)
    for update of o skip locked
  ), claimed as (
    update private.email_outbox o
    set status = 'sending', claimed_at = now(), attempts = o.attempts + 1
    from candidates
    where o.id = candidates.id
    returning o.id
  )
  select array_agg(id) into v_ids from claimed;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id,
      'kind', o.kind,
      'organisationId', o.organisation_id,
      'organisationName', org.name,
      'campaign', case when c.id is null then null else jsonb_build_object(
        'id', c.id, 'name', c.name, 'cadence', c.cadence, 'eventTrigger', c.event_trigger,
        'closesAt', c.closes_at, 'status', c.status
      ) end,
      'email', coalesce(
        (select i.email from public.invitations i where i.id = any (o.invitation_ids) order by i.id limit 1),
        case when o.invitation_ids = '{}' then (
          select e.work_email from public.snapshot_members sm
          join public.employees e on e.organisation_id = sm.organisation_id and e.id = sm.employee_id and e.status = 'active'
          where sm.organisation_id = o.organisation_id and sm.id = o.recipient_snapshot_member_id
        ) end,
        (select p.email from public.profiles p where p.id = o.recipient_user_id)
      ),
      'invitations', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', i.id, 'salt', i.token_salt, 'audience', i.audience, 'unitName', mu.name,
          -- For the email's "about N minutes": the items asked, six per process.
          'itemCount', coalesce((
            select cardinality(a.items) + 6 * cardinality(a.process_ids) from public.campaign_audiences a
            where a.organisation_id = i.organisation_id and a.campaign_unit_id = i.campaign_unit_id
              and a.audience = i.audience
          ), 0)
        ) order by mu.name, i.audience), '[]'::jsonb)
        from public.invitations i
        join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
        join public.measurement_units mu on mu.organisation_id = cu.organisation_id and mu.id = cu.measurement_unit_id
        where i.id = any (o.invitation_ids)
      ),
      'schedule', (
        select jsonb_build_object('cadence', s.cadence, 'dueOn', s.due_on)
        from public.campaign_schedule s where s.organisation_id = o.organisation_id and s.id = o.schedule_id
      ),
      'units', case when o.kind in ('manager_invitation', 'manager_reminder') then (
        select coalesce(jsonb_agg(distinct mu.name), '[]'::jsonb)
        from public.campaign_audience_members cam
        join public.snapshot_members sm on sm.organisation_id = cam.organisation_id and sm.id = cam.snapshot_member_id
        join public.campaign_units cu on cu.organisation_id = cam.organisation_id and cu.id = cam.campaign_unit_id
        join public.measurement_units mu on mu.organisation_id = cu.organisation_id and mu.id = cu.measurement_unit_id
        where cam.organisation_id = o.organisation_id and cu.campaign_id = o.campaign_id and cam.audience = 'members'
          and sm.manager_snapshot_member_id = o.recipient_snapshot_member_id
      ) else '[]'::jsonb end
    ) order by o.created_at, o.id), '[]'::jsonb)
    from private.email_outbox o
    join public.organisations org on org.id = o.organisation_id
    left join public.campaigns c on c.organisation_id = o.organisation_id and c.id = o.campaign_id
    where o.id = any (coalesce(v_ids, '{}'))
  );
end
$$;


grant execute on function public.remind_managers(uuid, uuid) to authenticated;
grant execute on function public.request_survey_reminder(uuid, uuid, text) to authenticated;
grant execute on function public.open_campaigns() to service_role;
grant execute on function public.claim_automatic_reminder(uuid, integer) to service_role;
grant execute on function public.pending_survey_reminders() to service_role;
grant execute on function public.invitations_for_reminders(uuid, uuid, text) to service_role;
grant execute on function public.survey_reminder_sent(uuid, integer) to service_role;
grant execute on function public.queue_schedule_notices() to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
