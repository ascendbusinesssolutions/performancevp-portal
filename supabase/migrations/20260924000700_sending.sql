-- Milestone 5, step 5: sending (Milestone 5 plan, 4.1 and 5.2).
--
-- The job, as the service role, first writes a launched campaign's live tokens in one shuffled batch
-- (issue_survey_tokens, step 3) from the invitations it reads here, deriving each token with
-- SURVEY_TOKEN_SECRET, which the database never holds. It then claims outbox rows, renders each email
-- at send time from the copy module (no body is stored), sends it and records the outcome. A row is
-- claimed before it is sent, so two runs never send it twice; a run that dies leaves its claim to
-- lapse after ten minutes. Survey mail waits until its campaign's tokens exist, so no link is ever
-- sent that does not work.

alter table private.email_outbox add column claimed_at timestamptz;
comment on column private.email_outbox.claimed_at is
  'When a job run claimed the row for sending; a claim older than ten minutes lapses.';

-- The invitations whose tokens the job derives, for an open campaign whose tokens are not issued
-- yet. Their salts are not secret on their own: a token needs the secret too.
create function public.invitations_for_tokens(p_campaign_id uuid)
returns table (invitation_id uuid, token_salt text, campaign_unit_id uuid, audience text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.campaigns where id = p_campaign_id and status = 'open' and tokens_issued_at is null
  ) then
    return;
  end if;
  return query
    select i.id, i.token_salt, i.campaign_unit_id, i.audience
    from public.invitations i
    join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
    where cu.campaign_id = p_campaign_id
    order by i.id;
end
$$;

-- Open campaigns whose tokens are still to be issued.
create function public.campaigns_awaiting_tokens()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.campaigns c
  where c.status = 'open' and c.tokens_issued_at is null
  order by c.launched_at, c.id
$$;

-- Claims up to p_limit rows to send, optionally for one campaign, and returns what each email needs:
-- the kind, the campaign and organisation, the recipient's address, and for survey mail the
-- invitations (id, salt, audience and unit) from which the job derives each link. Survey mail is
-- held until its campaign's tokens are issued; a row tried five times is left failed.
create function public.claim_outbox(p_limit integer, p_campaign_id uuid default null)
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

-- A row sent: its invitations are marked sent, which says nothing about whether anyone answered.
create function public.outbox_sent(p_outbox_id uuid, p_provider_message_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.email_outbox;
begin
  update private.email_outbox
  set status = 'sent', sent_at = now(), provider_message_id = left(p_provider_message_id, 200), last_error = null
  where id = p_outbox_id and status = 'sending'
  returning * into v_row;
  if not found then
    perform private.invalid('only a claimed outbox row can be marked sent');
  end if;
  update public.invitations set status = 'sent', sent_at = coalesce(sent_at, now())
  where organisation_id = v_row.organisation_id and id = any (v_row.invitation_ids) and status = 'issued';
end
$$;

-- A row not sent. A permanent failure (the provider refused the address, or there is none) marks
-- its invitations bounced (plan D28); otherwise it waits for the next run, up to five attempts.
create function public.outbox_failed(p_outbox_id uuid, p_error text, p_permanent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.email_outbox;
begin
  update private.email_outbox
  set status = case when p_permanent or attempts >= 5 then 'failed' else 'pending' end,
      last_error = left(coalesce(p_error, 'unknown'), 200), claimed_at = null
  where id = p_outbox_id and status = 'sending'
  returning * into v_row;
  if not found then
    perform private.invalid('only a claimed outbox row can be marked failed');
  end if;
  if v_row.status = 'failed' then
    update public.invitations set status = 'bounced'
    where organisation_id = v_row.organisation_id and id = any (v_row.invitation_ids);
  end if;
end
$$;

grant execute on function public.invitations_for_tokens(uuid) to service_role;
grant execute on function public.campaigns_awaiting_tokens() to service_role;
grant execute on function public.claim_outbox(integer, uuid) to service_role;
grant execute on function public.outbox_sent(uuid, text) to service_role;
grant execute on function public.outbox_failed(uuid, text, boolean) to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
