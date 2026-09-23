-- Milestone 3, step 6: invitations, anonymous responses and identified ratings.
--
-- Two kinds of data, kept apart (CLAUDE.md Section 4; PORTAL_BUILD_PLAN.md 3.4; Online Measurement
-- Specification Part 7). Survey responses are anonymous: they carry the campaign unit, the
-- audience, a self-selected team for members and a completion time, and nothing that could act as
-- a key to a person. No role can read or write them through the Data API, the service role
-- included; from Milestone 5 the service role reaches them only through two functions, one to
-- ingest a response and one for the close job to read a campaign unit's rows. Manager ratings are
-- identified and retained: the rating manager reads and writes their own while the campaign is
-- open, and administrators, the account owner and staff under a session read them only through
-- functions that log every view and export. Executive and unit viewers never see them.
--
-- The shapes are fixed now so the separation can be proven; Milestone 5 adds the campaign
-- lifecycle, and any new column on the anonymous tables fails the allowlist in 04_anonymity until
-- it is reviewed.

-- Invitations -------------------------------------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  audience text not null check (audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team')),
  snapshot_member_id uuid not null,
  -- Cleared when the campaign closes (Milestone 5).
  email text,
  token_hash text unique,
  -- Whether the person responded, and never when.
  status text not null default 'issued' check (status in ('issued', 'sent', 'bounced', 'responded', 'expired')),
  sent_at timestamptz,
  reminder_count integer not null default 0 check (reminder_count >= 0),
  last_reminded_at timestamptz,
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id, audience, snapshot_member_id),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  foreign key (organisation_id, snapshot_member_id) references public.snapshot_members (organisation_id, id)
);
comment on table public.invitations is
  'One single-use token per person per anonymous audience (DECISIONS.md 2.2). No link to any '
  'response, and no record of when a person responded. Administrators see status counts only.';

-- Anonymous responses -----------------------------------------------------------------------------

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  audience text not null check (audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team')),
  -- The non-identifying team selector (Survey Blueprint 6.1), members only.
  team_id uuid,
  completion_seconds integer check (completion_seconds is null or completion_seconds >= 0),
  unique (organisation_id, id),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  foreign key (organisation_id, team_id) references public.teams (organisation_id, id),
  check (team_id is null or audience in ('members_part_a', 'members_part_b'))
);
comment on table public.survey_responses is
  'Anonymous. No timestamp, no invitation, token, person or session reference; random ids. No '
  'Data API role holds any privilege on it.';

create table public.survey_item_responses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  response_id uuid not null,
  item_code text not null check (item_code ~ '^[A-Z0-9]+-[0-9]{2}$'),
  -- The M-O3-PF process an item was answered for; its foreign key arrives with the process
  -- context table (Milestone 4).
  process_id uuid,
  value smallint not null check (value between 1 and 5),
  unique (organisation_id, id),
  unique nulls not distinct (organisation_id, response_id, item_code, process_id),
  foreign key (organisation_id, response_id) references public.survey_responses (organisation_id, id)
);
comment on table public.survey_item_responses is
  'Anonymous raw item answers, un-flipped, 1 to 5. No Data API role holds any privilege on it.';

alter table public.invitations enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_item_responses enable row level security;
-- No policies and no grants on the anonymous tables, for any role.

-- Identified ratings ------------------------------------------------------------------------------

create table public.rating_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_id uuid not null,
  manager_snapshot_member_id uuid not null,
  manager_employee_id uuid,
  status text not null default 'open' check (status in ('open', 'submitted')),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (organisation_id, id),
  unique (organisation_id, campaign_id, manager_snapshot_member_id),
  foreign key (organisation_id, campaign_id) references public.campaigns (organisation_id, id),
  foreign key (organisation_id, manager_snapshot_member_id) references public.snapshot_members (organisation_id, id),
  foreign key (organisation_id, manager_employee_id) references public.employees (organisation_id, id)
    on delete set null (manager_employee_id)
);
create index rating_sessions_manager_idx on public.rating_sessions (organisation_id, manager_employee_id);

create table public.skill_ratings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  rating_session_id uuid not null,
  subject_snapshot_member_id uuid not null,
  employee_id uuid,
  skill_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  evidence_note text check (evidence_note is null or (btrim(evidence_note) <> '' and length(evidence_note) <= 500)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id),
  foreign key (organisation_id, rating_session_id) references public.rating_sessions (organisation_id, id),
  foreign key (organisation_id, subject_snapshot_member_id) references public.snapshot_members (organisation_id, id),
  foreign key (organisation_id, employee_id) references public.employees (organisation_id, id) on delete set null (employee_id),
  foreign key (organisation_id, skill_id) references public.skills (organisation_id, id),
  constraint skill_ratings_evidence check (rating <> 5 or evidence_note is not null)
);

create table public.knowledge_ratings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  rating_session_id uuid not null,
  subject_snapshot_member_id uuid not null,
  employee_id uuid,
  knowledge_domain_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  evidence_note text check (evidence_note is null or (btrim(evidence_note) <> '' and length(evidence_note) <= 500)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, rating_session_id, subject_snapshot_member_id, knowledge_domain_id),
  foreign key (organisation_id, rating_session_id) references public.rating_sessions (organisation_id, id),
  foreign key (organisation_id, subject_snapshot_member_id) references public.snapshot_members (organisation_id, id),
  foreign key (organisation_id, employee_id) references public.employees (organisation_id, id) on delete set null (employee_id),
  foreign key (organisation_id, knowledge_domain_id) references public.knowledge_domains (organisation_id, id),
  constraint knowledge_ratings_evidence check (rating <> 5 or evidence_note is not null)
);

create table public.talent_bands (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  rating_session_id uuid not null,
  subject_snapshot_member_id uuid not null,
  employee_id uuid,
  band smallint not null check (band between 1 and 5),
  evidence_note text check (evidence_note is null or (btrim(evidence_note) <> '' and length(evidence_note) <= 500)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, rating_session_id, subject_snapshot_member_id),
  foreign key (organisation_id, rating_session_id) references public.rating_sessions (organisation_id, id),
  foreign key (organisation_id, subject_snapshot_member_id) references public.snapshot_members (organisation_id, id),
  foreign key (organisation_id, employee_id) references public.employees (organisation_id, id) on delete set null (employee_id),
  constraint talent_bands_evidence check (band not in (1, 5) or evidence_note is not null)
);
comment on table public.skill_ratings is
  'Identified, retained (DECISIONS.md 5.2). Evidence note required at 5 (PORTAL_BUILD_PLAN.md 3.5).';
comment on table public.talent_bands is
  'Identified, retained (DECISIONS.md 5.2). Evidence note required at bands 5 and 1.';

-- Rating integrity ------------------------------------------------------------------------------------

-- The subject is one of the session manager's direct reports in the campaign's snapshot; the
-- employee link comes from the snapshot, never from the client; nothing changes once the campaign
-- has closed, except that the purge clears the employee link.
create function private.guard_rating()
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
  new.employee_id := v_subject.employee_id;
  new.updated_at := now();
  return new;
end
$$;

create trigger skill_ratings_guard before insert or update or delete on public.skill_ratings
  for each row execute function private.guard_rating();
create trigger knowledge_ratings_guard before insert or update or delete on public.knowledge_ratings
  for each row execute function private.guard_rating();
create trigger talent_bands_guard before insert or update or delete on public.talent_bands
  for each row execute function private.guard_rating();

-- Helpers -----------------------------------------------------------------------------------------

-- The caller's rating sessions, as the manager whose role currently counts.
create function private.my_rating_session_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.rating_sessions s
  where s.manager_employee_id in (select private.my_employee_ids())
$$;

-- Those whose campaign is open: the only ones a manager may write in.
create function private.my_open_rating_session_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.rating_sessions s
  join public.campaigns c on c.organisation_id = s.organisation_id and c.id = s.campaign_id
  where s.manager_employee_id in (select private.my_employee_ids()) and c.status = 'open'
$$;

-- Campaigns a manager rates in (replaces the step 5 placeholder).
create or replace function private.my_rated_campaign_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct s.campaign_id from public.rating_sessions s
  where s.manager_employee_id in (select private.my_employee_ids())
$$;

-- Who may read identified ratings through the logged functions.
create function private.can_read_ratings(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_org_admin(p_organisation_id) or private.is_support_for(p_organisation_id)
$$;

create function private.check_ratings_read(p_organisation_id uuid, p_purpose text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.can_read_ratings(p_organisation_id) then
    perform private.refuse('ratings are visible to the rating manager, administrators, the account owner and staff under a session');
  end if;
  if p_purpose not in ('view', 'export') then
    perform private.invalid('the purpose is view or export');
  end if;
  if p_purpose = 'export' and not private.recent_totp(private.step_up_minutes()) then
    perform private.refuse('confirm your authenticator code again before exporting ratings');
  end if;
end
$$;

-- The logged reads (PORTAL_BUILD_PLAN.md 3.5) ----------------------------------------------------------

-- Each checks the caller, returns the rows, and writes a view or export entry with the filter and
-- the row count. Filters: a campaign, a unit (the subject's unit in the snapshot) and a manager.

create function public.read_skill_ratings(
  p_organisation_id uuid,
  p_campaign_id uuid default null,
  p_unit_id uuid default null,
  p_manager_employee_id uuid default null,
  p_purpose text default 'view'
)
returns table (
  rating_id uuid, campaign_id uuid, manager_snapshot_member_id uuid, manager_employee_id uuid,
  subject_snapshot_member_id uuid, employee_id uuid, subject_employee_ref text, subject_first_name text,
  subject_last_name text, unit_id uuid, skill_id uuid, skill_name text, rating smallint,
  evidence_note text, updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform private.check_ratings_read(p_organisation_id, p_purpose);
  return query
    select r.id, s.campaign_id, s.manager_snapshot_member_id, s.manager_employee_id,
           r.subject_snapshot_member_id, r.employee_id, sm.employee_ref, sm.first_name, sm.last_name,
           sm.unit_id, r.skill_id, sk.name, r.rating, r.evidence_note, r.updated_at
    from public.skill_ratings r
    join public.rating_sessions s on s.organisation_id = r.organisation_id and s.id = r.rating_session_id
    join public.snapshot_members sm on sm.organisation_id = r.organisation_id and sm.id = r.subject_snapshot_member_id
    join public.skills sk on sk.organisation_id = r.organisation_id and sk.id = r.skill_id
    where r.organisation_id = p_organisation_id
      and (p_campaign_id is null or s.campaign_id = p_campaign_id)
      and (p_unit_id is null or sm.unit_id = p_unit_id)
      and (p_manager_employee_id is null or s.manager_employee_id = p_manager_employee_id)
    order by s.campaign_id, sm.employee_ref, sk.name;
  get diagnostics v_rows = row_count;
  perform private.record_event(p_organisation_id,
    'ratings.' || case when p_purpose = 'export' then 'exported' else 'viewed' end, 'skill_ratings', null,
    jsonb_build_object('kind', 'skills', 'campaign_id', p_campaign_id, 'unit_id', p_unit_id,
                       'manager_employee_id', p_manager_employee_id, 'rows', v_rows));
end
$$;

create function public.read_knowledge_ratings(
  p_organisation_id uuid,
  p_campaign_id uuid default null,
  p_unit_id uuid default null,
  p_manager_employee_id uuid default null,
  p_purpose text default 'view'
)
returns table (
  rating_id uuid, campaign_id uuid, manager_snapshot_member_id uuid, manager_employee_id uuid,
  subject_snapshot_member_id uuid, employee_id uuid, subject_employee_ref text, subject_first_name text,
  subject_last_name text, unit_id uuid, knowledge_domain_id uuid, knowledge_domain_name text,
  rating smallint, evidence_note text, updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform private.check_ratings_read(p_organisation_id, p_purpose);
  return query
    select r.id, s.campaign_id, s.manager_snapshot_member_id, s.manager_employee_id,
           r.subject_snapshot_member_id, r.employee_id, sm.employee_ref, sm.first_name, sm.last_name,
           sm.unit_id, r.knowledge_domain_id, kd.name, r.rating, r.evidence_note, r.updated_at
    from public.knowledge_ratings r
    join public.rating_sessions s on s.organisation_id = r.organisation_id and s.id = r.rating_session_id
    join public.snapshot_members sm on sm.organisation_id = r.organisation_id and sm.id = r.subject_snapshot_member_id
    join public.knowledge_domains kd on kd.organisation_id = r.organisation_id and kd.id = r.knowledge_domain_id
    where r.organisation_id = p_organisation_id
      and (p_campaign_id is null or s.campaign_id = p_campaign_id)
      and (p_unit_id is null or sm.unit_id = p_unit_id)
      and (p_manager_employee_id is null or s.manager_employee_id = p_manager_employee_id)
    order by s.campaign_id, sm.employee_ref, kd.name;
  get diagnostics v_rows = row_count;
  perform private.record_event(p_organisation_id,
    'ratings.' || case when p_purpose = 'export' then 'exported' else 'viewed' end, 'knowledge_ratings', null,
    jsonb_build_object('kind', 'knowledge', 'campaign_id', p_campaign_id, 'unit_id', p_unit_id,
                       'manager_employee_id', p_manager_employee_id, 'rows', v_rows));
end
$$;

create function public.read_talent_bands(
  p_organisation_id uuid,
  p_campaign_id uuid default null,
  p_unit_id uuid default null,
  p_manager_employee_id uuid default null,
  p_purpose text default 'view'
)
returns table (
  rating_id uuid, campaign_id uuid, manager_snapshot_member_id uuid, manager_employee_id uuid,
  subject_snapshot_member_id uuid, employee_id uuid, subject_employee_ref text, subject_first_name text,
  subject_last_name text, unit_id uuid, band smallint, evidence_note text, updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform private.check_ratings_read(p_organisation_id, p_purpose);
  return query
    select r.id, s.campaign_id, s.manager_snapshot_member_id, s.manager_employee_id,
           r.subject_snapshot_member_id, r.employee_id, sm.employee_ref, sm.first_name, sm.last_name,
           sm.unit_id, r.band, r.evidence_note, r.updated_at
    from public.talent_bands r
    join public.rating_sessions s on s.organisation_id = r.organisation_id and s.id = r.rating_session_id
    join public.snapshot_members sm on sm.organisation_id = r.organisation_id and sm.id = r.subject_snapshot_member_id
    where r.organisation_id = p_organisation_id
      and (p_campaign_id is null or s.campaign_id = p_campaign_id)
      and (p_unit_id is null or sm.unit_id = p_unit_id)
      and (p_manager_employee_id is null or s.manager_employee_id = p_manager_employee_id)
    order by s.campaign_id, sm.employee_ref;
  get diagnostics v_rows = row_count;
  perform private.record_event(p_organisation_id,
    'ratings.' || case when p_purpose = 'export' then 'exported' else 'viewed' end, 'talent_bands', null,
    jsonb_build_object('kind', 'talent_bands', 'campaign_id', p_campaign_id, 'unit_id', p_unit_id,
                       'manager_employee_id', p_manager_employee_id, 'rows', v_rows));
end
$$;

-- Invitation status counts: never a person, only numbers per unit and audience (Plan 3.3).
create function public.invitation_status_counts(p_campaign_id uuid)
returns table (
  campaign_unit_id uuid, unit_id uuid, audience text, issued integer, sent integer, bounced integer,
  responded integer, expired integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organisation_id into v_org from public.campaigns where id = p_campaign_id;
  if v_org is null or not (private.is_org_admin(v_org) or private.is_support_for(v_org)) then
    perform private.refuse('invitation counts are for administrators, the account owner and staff under a session');
  end if;
  return query
    select cu.id, cu.unit_id, i.audience,
           count(*) filter (where i.status = 'issued')::integer,
           count(*) filter (where i.status = 'sent')::integer,
           count(*) filter (where i.status = 'bounced')::integer,
           count(*) filter (where i.status = 'responded')::integer,
           count(*) filter (where i.status = 'expired')::integer
    from public.invitations i
    join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
    where cu.organisation_id = v_org and cu.campaign_id = p_campaign_id
    group by cu.id, cu.unit_id, i.audience
    order by cu.unit_id, i.audience;
end
$$;

-- The purge now also clears invitation addresses of purged people ------------------------------------

create or replace function public.purge_deactivated_employees(p_as_of date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff date := coalesce(p_as_of, private.today()) - private.purge_after_days();
  v_org uuid;
  v_employees uuid[];
  v_users uuid[];
  v_redacted integer;
  v_revoked integer;
  v_accounts integer;
  v_total integer := 0;
begin
  for v_org in
    select distinct e.organisation_id from public.employees e
    where e.status = 'inactive'
      and (e.deactivated_at at time zone private.local_timezone())::date <= v_cutoff
  loop
    select array_agg(e.id) into v_employees
    from public.employees e
    where e.organisation_id = v_org and e.status = 'inactive'
      and (e.deactivated_at at time zone private.local_timezone())::date <= v_cutoff;

    perform set_config('app.suppress_row_audit', 'on', true);

    select coalesce(array_agg(distinct m.user_id), '{}') into v_users
    from public.org_memberships m
    where m.organisation_id = v_org and m.employee_id = any (v_employees);
    update public.org_memberships
    set revoked_at = coalesce(revoked_at, now()), employee_id = null
    where organisation_id = v_org and employee_id = any (v_employees);
    get diagnostics v_revoked = row_count;

    update public.invitations i
    set email = null
    from public.snapshot_members sm
    where i.organisation_id = v_org and sm.organisation_id = v_org
      and sm.id = i.snapshot_member_id and sm.employee_id = any (v_employees) and i.email is not null;

    update public.snapshot_members
    set employee_ref = 'purged:' || id::text, first_name = null, last_name = null, role_title = null,
        redacted_at = now()
    where organisation_id = v_org and employee_id = any (v_employees);
    get diagnostics v_redacted = row_count;

    delete from public.employees where organisation_id = v_org and id = any (v_employees);

    delete from auth.users u
    where u.id = any (v_users)
      and not exists (select 1 from public.org_memberships m where m.user_id = u.id and m.revoked_at is null)
      and not exists (select 1 from public.profiles p where p.id = u.id and (p.is_owner or p.is_support_staff));
    get diagnostics v_accounts = row_count;

    perform set_config('app.suppress_row_audit', 'off', true);

    perform private.record_event(v_org, 'directory.employees_purged', null, null,
      jsonb_build_object('records', cardinality(v_employees), 'snapshot_rows_redacted', v_redacted,
                         'memberships_revoked', v_revoked, 'accounts_deleted', v_accounts));
    v_total := v_total + cardinality(v_employees);
  end loop;
  return jsonb_build_object('records_purged', v_total, 'cutoff', v_cutoff);
end
$$;

-- Audit: ids only for the rating tables; no value, band or note ever reaches an image ------------------

insert into private.audit_image_columns (table_name, column_name) values
  ('rating_sessions', 'id'), ('rating_sessions', 'campaign_id'),
  ('rating_sessions', 'manager_snapshot_member_id'), ('rating_sessions', 'status'),
  ('skill_ratings', 'id'), ('skill_ratings', 'rating_session_id'),
  ('skill_ratings', 'subject_snapshot_member_id'), ('skill_ratings', 'skill_id'),
  ('knowledge_ratings', 'id'), ('knowledge_ratings', 'rating_session_id'),
  ('knowledge_ratings', 'subject_snapshot_member_id'), ('knowledge_ratings', 'knowledge_domain_id'),
  ('talent_bands', 'id'), ('talent_bands', 'rating_session_id'),
  ('talent_bands', 'subject_snapshot_member_id');

create trigger rating_sessions_audit after insert or update or delete on public.rating_sessions
  for each row execute function private.audit_row_change();
create trigger skill_ratings_audit after insert or update or delete on public.skill_ratings
  for each row execute function private.audit_row_change();
create trigger knowledge_ratings_audit after insert or update or delete on public.knowledge_ratings
  for each row execute function private.audit_row_change();
create trigger talent_bands_audit after insert or update or delete on public.talent_bands
  for each row execute function private.audit_row_change();

-- Row level security ------------------------------------------------------------------------------

alter table public.rating_sessions enable row level security;
alter table public.skill_ratings enable row level security;
alter table public.knowledge_ratings enable row level security;
alter table public.talent_bands enable row level security;

-- Sessions carry no rating: administrators and staff read them to see who is outstanding; a manager
-- reads their own.
create policy rating_sessions_select on public.rating_sessions for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or id in (select private.my_rating_session_ids())
  );

-- Ratings: the rating manager's own rows, read at any time and written while the campaign is open.
-- There is deliberately no policy for administrators or staff: they read through the logged
-- functions, so no view of a rating goes unrecorded.
create policy skill_ratings_select on public.skill_ratings for select to authenticated
  using (rating_session_id in (select private.my_rating_session_ids()));
create policy skill_ratings_insert on public.skill_ratings for insert to authenticated
  with check (rating_session_id in (select private.my_open_rating_session_ids()));
create policy skill_ratings_update on public.skill_ratings for update to authenticated
  using (rating_session_id in (select private.my_open_rating_session_ids()))
  with check (rating_session_id in (select private.my_open_rating_session_ids()));
create policy skill_ratings_delete on public.skill_ratings for delete to authenticated
  using (rating_session_id in (select private.my_open_rating_session_ids()));

create policy knowledge_ratings_select on public.knowledge_ratings for select to authenticated
  using (rating_session_id in (select private.my_rating_session_ids()));
create policy knowledge_ratings_insert on public.knowledge_ratings for insert to authenticated
  with check (rating_session_id in (select private.my_open_rating_session_ids()));
create policy knowledge_ratings_update on public.knowledge_ratings for update to authenticated
  using (rating_session_id in (select private.my_open_rating_session_ids()))
  with check (rating_session_id in (select private.my_open_rating_session_ids()));
create policy knowledge_ratings_delete on public.knowledge_ratings for delete to authenticated
  using (rating_session_id in (select private.my_open_rating_session_ids()));

create policy talent_bands_select on public.talent_bands for select to authenticated
  using (rating_session_id in (select private.my_rating_session_ids()));
create policy talent_bands_insert on public.talent_bands for insert to authenticated
  with check (rating_session_id in (select private.my_open_rating_session_ids()));
create policy talent_bands_update on public.talent_bands for update to authenticated
  using (rating_session_id in (select private.my_open_rating_session_ids()))
  with check (rating_session_id in (select private.my_open_rating_session_ids()));
create policy talent_bands_delete on public.talent_bands for delete to authenticated
  using (rating_session_id in (select private.my_open_rating_session_ids()));

-- Grants -----------------------------------------------------------------------------------------

grant select on public.rating_sessions to authenticated;
grant select, delete on public.skill_ratings to authenticated;
grant insert (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating, evidence_note)
  on public.skill_ratings to authenticated;
grant update (rating, evidence_note) on public.skill_ratings to authenticated;
grant select, delete on public.knowledge_ratings to authenticated;
grant insert (organisation_id, rating_session_id, subject_snapshot_member_id, knowledge_domain_id, rating, evidence_note)
  on public.knowledge_ratings to authenticated;
grant update (rating, evidence_note) on public.knowledge_ratings to authenticated;
grant select, delete on public.talent_bands to authenticated;
grant insert (organisation_id, rating_session_id, subject_snapshot_member_id, band, evidence_note)
  on public.talent_bands to authenticated;
grant update (band, evidence_note) on public.talent_bands to authenticated;

grant execute on function private.my_rating_session_ids() to authenticated;
grant execute on function private.my_open_rating_session_ids() to authenticated;
grant execute on function public.read_skill_ratings(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.read_knowledge_ratings(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.read_talent_bands(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.invitation_status_counts(uuid) to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
