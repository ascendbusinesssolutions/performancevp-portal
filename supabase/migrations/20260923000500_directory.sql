-- Milestone 3, step 5: the directory, uploads, campaign snapshots and the purge.
--
-- The directory persists for the life of the subscription (DECISIONS.md 2.5; Online Measurement
-- Specification 6.1). It is keyed on the client's employee ID, maintained by individual edits or by
-- uploading the whole directory, and frozen into a snapshot when a campaign launches. Formal
-- performance ratings are identified records visible to administrators only (Part 7), so they sit
-- in their own tables and are read only through functions that log every view.
--
-- An upload is staged by the service role after the route has checked size, type, zip structure
-- and hash (Milestone 3 plan, 5.2), so a signed-in user cannot skip those checks. The difference
-- against the live directory is computed here, in SQL, for both the preview and the apply, and the
-- apply refuses if the difference has changed since the preview was shown.
--
-- A deactivated record is purged 30 days after deactivation: the link to it is removed wherever it
-- appears, its snapshot rows are redacted, and nothing else is deleted (Part 7; DECISIONS.md 5.2).

-- Campaigns (the skeleton snapshots hang from; Milestone 5 adds the lifecycle) --------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  cadence text not null check (cadence in ('baseline', 'quarterly_pulse', 'half_yearly', 'annual', 'event_triggered')),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'cancelled')),
  opens_at timestamptz,
  closes_at timestamptz,
  launched_at timestamptz,
  launched_by uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id)
);

create table public.campaign_units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_id uuid not null,
  unit_id uuid not null,
  unique (organisation_id, id),
  unique (organisation_id, campaign_id, unit_id),
  foreign key (organisation_id, campaign_id) references public.campaigns (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);

-- The directory -----------------------------------------------------------------------------------

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  employee_ref text not null check (employee_ref = btrim(employee_ref) and employee_ref <> '' and length(employee_ref) <= 64),
  first_name text not null check (btrim(first_name) <> '' and length(first_name) <= 100),
  last_name text not null check (btrim(last_name) <> '' and length(last_name) <= 100),
  work_email text check (work_email is null or (work_email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and length(work_email) <= 320)),
  unit_id uuid not null,
  team_id uuid,
  manager_employee_id uuid,
  role_title text check (role_title is null or length(role_title) <= 200),
  role_family_id uuid,
  start_date date,
  fte numeric(4, 3) not null check (fte > 0 and fte <= 1),
  is_team_leader boolean not null default false,
  is_leadership_team boolean not null default false,
  employment_status text check (employment_status is null or length(employment_status) <= 100),
  status text not null default 'active' check (status in ('active', 'inactive')),
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id),
  -- The team is always inside the person's unit.
  foreign key (organisation_id, unit_id, team_id) references public.teams (organisation_id, unit_id, id),
  foreign key (organisation_id, manager_employee_id) references public.employees (organisation_id, id)
    on delete set null (manager_employee_id),
  foreign key (organisation_id, role_family_id) references public.role_families (organisation_id, id),
  check (manager_employee_id <> id),
  check ((status = 'inactive') = (deactivated_at is not null))
);
create unique index employees_ref on public.employees (organisation_id, lower(employee_ref));
create unique index employees_active_email on public.employees (organisation_id, lower(work_email))
  where status = 'active' and work_email is not null;
create index employees_manager_idx on public.employees (organisation_id, manager_employee_id);
create index employees_unit_idx on public.employees (organisation_id, unit_id);
comment on table public.employees is
  'The persistent directory (Online Measurement Specification 6.1). employee_ref is the client''s '
  'employee ID, the stable key, matched case aside. People-manager status is derived from '
  'reporting lines. employment_status is informational text until EMPLOYMENT_STATUS_VALUES is '
  'settled. Deactivated records are purged 30 days after deactivation.';

-- The manager link on memberships, now that the directory exists.
alter table public.org_memberships
  add foreign key (organisation_id, employee_id) references public.employees (organisation_id, id)
    on delete set null (employee_id);

create table public.formal_ratings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  employee_id uuid not null,
  rating_label text not null check (btrim(rating_label) <> '' and length(rating_label) <= 100),
  rating_date date not null,
  source_upload_id uuid,
  recorded_by uuid,
  recorded_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, employee_id),
  foreign key (organisation_id, employee_id) references public.employees (organisation_id, id) on delete cascade
);
comment on table public.formal_ratings is
  'The client''s formal performance rating per person (Online Measurement Specification 6.4), the '
  'optional C3 input. Identified: read only through read_formal_ratings, which logs every view.';

-- Uploads -------------------------------------------------------------------------------------------

create table public.directory_uploads (
  id uuid primary key,
  organisation_id uuid not null references public.organisations (id),
  file_name text not null check (length(file_name) between 1 and 255),
  byte_size integer not null check (byte_size > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null,
  template_version text,
  status text not null check (status in ('staged', 'rejected', 'applied', 'discarded', 'expired')),
  row_count integer not null default 0,
  -- Row, column and message only: no cell contents are echoed back.
  errors jsonb not null default '[]'::jsonb,
  -- Counts only.
  diff_summary jsonb,
  uploaded_by uuid not null,
  uploaded_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz,
  file_removed_at timestamptz,
  unique (organisation_id, id)
);
comment on table public.directory_uploads is
  'One row per uploaded directory file: metadata, SHA-256 and the outcome. The file itself is kept '
  'in the private directory-uploads bucket only until the upload is decided or expires.';

alter table public.formal_ratings
  add foreign key (organisation_id, source_upload_id) references public.directory_uploads (organisation_id, id)
    on delete set null (source_upload_id);

create table public.directory_upload_rows (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  upload_id uuid not null,
  row_number integer not null check (row_number > 0),
  employee_ref text not null check (employee_ref = btrim(employee_ref) and employee_ref <> '' and length(employee_ref) <= 64),
  first_name text not null check (btrim(first_name) <> '' and length(first_name) <= 100),
  last_name text not null check (btrim(last_name) <> '' and length(last_name) <= 100),
  work_email text check (work_email is null or (work_email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and length(work_email) <= 320)),
  unit_code text not null check (unit_code ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$'),
  unit_name text not null check (btrim(unit_name) <> '' and length(unit_name) <= 200),
  team_name text check (team_name is null or (btrim(team_name) <> '' and length(team_name) <= 200)),
  manager_ref text check (manager_ref is null or (manager_ref = btrim(manager_ref) and manager_ref <> '' and length(manager_ref) <= 64)),
  role_title text check (role_title is null or length(role_title) <= 200),
  role_family_name text check (role_family_name is null or (btrim(role_family_name) <> '' and length(role_family_name) <= 200)),
  start_date date,
  fte numeric(4, 3) not null check (fte > 0 and fte <= 1),
  is_team_leader boolean not null default false,
  is_leadership_team boolean not null default false,
  employment_status text check (employment_status is null or length(employment_status) <= 100),
  formal_rating_label text check (formal_rating_label is null or (btrim(formal_rating_label) <> '' and length(formal_rating_label) <= 100)),
  formal_rating_date date,
  unique (organisation_id, id),
  unique (organisation_id, upload_id, row_number),
  foreign key (organisation_id, upload_id) references public.directory_uploads (organisation_id, id) on delete cascade,
  check ((formal_rating_label is null) = (formal_rating_date is null))
);
create unique index directory_upload_rows_ref on public.directory_upload_rows (organisation_id, upload_id, lower(employee_ref));
comment on table public.directory_upload_rows is
  'Staged rows of an upload awaiting a decision. No client grant: read through the logged preview. '
  'Deleted when the upload is applied, discarded or expires.';

-- Snapshots ------------------------------------------------------------------------------------------

create table public.directory_snapshots (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_id uuid not null,
  member_count integer not null default 0,
  taken_by uuid,
  taken_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, campaign_id),
  foreign key (organisation_id, campaign_id) references public.campaigns (organisation_id, id)
);

create table public.snapshot_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  snapshot_id uuid not null,
  employee_id uuid,
  employee_ref text not null,
  first_name text,
  last_name text,
  role_title text,
  unit_id uuid not null,
  team_id uuid,
  manager_employee_id uuid,
  manager_snapshot_member_id uuid,
  role_family_id uuid,
  start_date date,
  fte numeric(4, 3) not null,
  is_team_leader boolean not null,
  is_leadership_team boolean not null,
  redacted_at timestamptz,
  unique (organisation_id, id),
  foreign key (organisation_id, snapshot_id) references public.directory_snapshots (organisation_id, id),
  foreign key (organisation_id, employee_id) references public.employees (organisation_id, id)
    on delete set null (employee_id),
  foreign key (organisation_id, manager_employee_id) references public.employees (organisation_id, id)
    on delete set null (manager_employee_id),
  foreign key (organisation_id, manager_snapshot_member_id) references public.snapshot_members (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id),
  foreign key (organisation_id, unit_id, team_id) references public.teams (organisation_id, unit_id, id),
  foreign key (organisation_id, role_family_id) references public.role_families (organisation_id, id)
);
create index snapshot_members_snapshot_idx on public.snapshot_members (organisation_id, snapshot_id);
create index snapshot_members_employee_idx on public.snapshot_members (organisation_id, employee_id);
create index snapshot_members_manager_idx on public.snapshot_members (organisation_id, manager_employee_id);
comment on table public.snapshot_members is
  'The directory as frozen at campaign launch: what the intake''s Member needs, and no email. '
  'Immutable except for the purge, which clears the links and redacts the identifiers.';

create table public.snapshot_formal_ratings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  snapshot_member_id uuid not null,
  rating_label text not null,
  rating_date date not null,
  unique (organisation_id, id),
  unique (organisation_id, snapshot_member_id),
  foreign key (organisation_id, snapshot_member_id) references public.snapshot_members (organisation_id, id)
);

-- The upload bucket ---------------------------------------------------------------------------------

-- Private, 4 MiB (the route's DIRECTORY_UPLOAD_MAX_BYTES; Vercel's request ceiling is 4.5 MB), xlsx
-- only. No storage policy is created for it, so only the service role reads or writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'directory-uploads', 'directory-uploads', false, 4194304,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

-- Integrity triggers -----------------------------------------------------------------------------------

create function private.employees_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.deactivated_at := case when new.status = 'inactive' then now() end;
  end if;
  if (tg_op = 'INSERT' or new.unit_id is distinct from old.unit_id) and exists (
    select 1 from public.business_units u
    where u.organisation_id = new.organisation_id and u.id = new.unit_id and u.status = 'retired'
  ) then
    raise exception 'a person cannot be placed in a retired unit' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger employees_before_write
  before insert or update on public.employees
  for each row execute function private.employees_before_write();

-- Reporting lines may not loop. Checked at commit, so an upload that swaps two managers is judged on
-- its end state, not on the order its rows were written in.
create function private.check_reporting_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.manager_employee_id is not null and exists (
    with recursive chain (id, manager_employee_id) as (
      select e.id, e.manager_employee_id from public.employees e
      where e.organisation_id = new.organisation_id and e.id = new.manager_employee_id
      union
      select e.id, e.manager_employee_id from public.employees e
      join chain c on e.organisation_id = new.organisation_id and e.id = c.manager_employee_id
    ) cycle id set looped using path
    select 1 from chain where id = new.id
  ) then
    raise exception 'a reporting line cannot loop back to the same person' using errcode = 'check_violation';
  end if;
  return null;
end
$$;

create constraint trigger employees_no_reporting_cycle
  after insert or update of manager_employee_id on public.employees
  deferrable initially deferred
  for each row execute function private.check_reporting_cycle();

create or replace function private.unit_has_active_staff(p_organisation_id uuid, p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employees e
    where e.organisation_id = p_organisation_id and e.unit_id = p_unit_id and e.status = 'active'
  )
$$;

create function private.guard_unit_retirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'retired' and old.status = 'active'
     and private.unit_has_active_staff(new.organisation_id, new.id) then
    raise exception 'move everyone out of a unit before retiring it' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger business_units_guard_retirement
  before update of status on public.business_units
  for each row execute function private.guard_unit_retirement();

-- Snapshots never change, except that the purge clears links and redacts identifiers.
create function private.guard_snapshot_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a campaign snapshot never changes' using errcode = 'insufficient_privilege';
  end if;
  if (to_jsonb(new) - array['employee_id', 'manager_employee_id', 'employee_ref', 'first_name', 'last_name',
                            'role_title', 'redacted_at'])
     is distinct from
     (to_jsonb(old) - array['employee_id', 'manager_employee_id', 'employee_ref', 'first_name', 'last_name',
                            'role_title', 'redacted_at'])
     or (new.employee_id is distinct from old.employee_id and new.employee_id is not null)
     or (new.manager_employee_id is distinct from old.manager_employee_id and new.manager_employee_id is not null)
     or (
       (new.employee_ref, new.first_name, new.last_name, new.role_title, new.redacted_at)
         is distinct from (old.employee_ref, old.first_name, old.last_name, old.role_title, old.redacted_at)
       and not (
         new.employee_ref = 'purged:' || new.id::text
         and new.first_name is null and new.last_name is null and new.role_title is null
         and new.redacted_at is not null
       )
     ) then
    raise exception 'a campaign snapshot never changes' using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$$;

create trigger snapshot_members_guard
  before update or delete on public.snapshot_members
  for each row execute function private.guard_snapshot_member();

create function private.refuse_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows never change', tg_table_name using errcode = 'insufficient_privilege';
end
$$;

-- A snapshot's header is written once; its member count is filled in by take_directory_snapshot
-- straight after the members are frozen, and nothing changes after that.
create function private.guard_directory_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.member_count = 0
     and (to_jsonb(new) - 'member_count') = (to_jsonb(old) - 'member_count') then
    return new;
  end if;
  raise exception 'directory_snapshots rows never change' using errcode = 'insufficient_privilege';
end
$$;

create trigger directory_snapshots_guard before update or delete on public.directory_snapshots
  for each row execute function private.guard_directory_snapshot();
create trigger snapshot_formal_ratings_guard before update or delete on public.snapshot_formal_ratings
  for each row execute function private.refuse_change();

-- Helpers -----------------------------------------------------------------------------------------

-- A manager's role holds only while their directory record is active and its work email is the
-- address they signed in with (replaces the step 2 placeholder).
create or replace function private.manager_link_ok(p_organisation_id uuid, p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees e
    join public.profiles p on p.id = auth.uid()
    where e.organisation_id = p_organisation_id
      and e.id = p_employee_id
      and e.status = 'active'
      and lower(e.work_email) = lower(p.email)
  )
$$;

-- The directory records the caller manages as, where their manager role currently counts.
create function private.my_employee_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.employee_id
  from public.org_memberships m
  where m.user_id = auth.uid()
    and m.role = 'manager_respondent'
    and m.revoked_at is null
    and m.organisation_id in (select private.org_ids(array['manager_respondent']))
    and private.manager_link_ok(m.organisation_id, m.employee_id)
$$;

-- Campaigns a manager rates in. Rating sessions arrive in step 6, which replaces this.
create function private.my_rated_campaign_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select null::uuid where false
$$;

-- Whether a given person may manage an organisation's directory: used by service-role functions
-- that act for a named person, where there is no signed-in session to read.
create function private.user_can_manage_directory(p_user_id uuid, p_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.org_writable(p_organisation_id) and (
    exists (
      select 1 from public.org_memberships m
      where m.organisation_id = p_organisation_id and m.user_id = p_user_id and m.revoked_at is null
        and m.role in ('account_owner', 'administrator')
    )
    or exists (
      select 1 from public.support_sessions s
      join public.profiles p on p.id = s.staff_user_id
      where s.organisation_id = p_organisation_id and s.staff_user_id = p_user_id
        and s.ended_at is null and s.expires_at > now() and (p.is_owner or p.is_support_staff)
    )
  )
$$;

-- Active headcount against the subscription band. What to do about an overage is the
-- ENTITLEMENT_ENFORCEMENT placeholder (PORTAL_BUILD_PLAN.md 11); for now it is reported only.
create function private.entitlement(p_organisation_id uuid, p_active_headcount integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'active_headcount', p_active_headcount,
    'employee_band', b.code,
    'max_employees', b.max_employees,
    'over_band', p_active_headcount > b.max_employees
  )
  from public.subscriptions s
  join public.ref_employee_bands b on b.code = s.employee_band
  where s.organisation_id = p_organisation_id and s.period_start <= private.today()
  order by s.period_start desc
  limit 1
$$;

-- The difference -----------------------------------------------------------------------------------

-- An upload against the live directory: people (joiners, returning, leavers, updates with each
-- changed field), units (new, renamed, emptied), new teams and role families, and the entitlement
-- position. Matching is on employee ID and unit code, case aside. Deterministic, so its hash can
-- stand for "the difference the person was shown".
create function private.directory_diff(p_upload_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_people jsonb;
  v_units jsonb;
  v_teams jsonb;
  v_families jsonb;
  v_active_before integer;
  v_active_after integer;
  v_leavers integer;
begin
  select organisation_id into v_org from public.directory_uploads where id = p_upload_id;

  with staged as (
    select r.*, lower(r.employee_ref) as ref_key from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id
  ),
  live as (
    select e.*, lower(e.employee_ref) as ref_key, u.unit_code, t.name as team_name,
           mgr.employee_ref as manager_ref, rf.name as role_family_name,
           fr.rating_label as formal_rating_label, fr.rating_date as formal_rating_date
    from public.employees e
    join public.business_units u on u.organisation_id = e.organisation_id and u.id = e.unit_id
    left join public.teams t on t.organisation_id = e.organisation_id and t.id = e.team_id
    left join public.employees mgr on mgr.organisation_id = e.organisation_id and mgr.id = e.manager_employee_id
    left join public.role_families rf on rf.organisation_id = e.organisation_id and rf.id = e.role_family_id
    left join public.formal_ratings fr on fr.organisation_id = e.organisation_id and fr.employee_id = e.id
    where e.organisation_id = v_org
  ),
  compared as (
    select
      coalesce(s.employee_ref, l.employee_ref) as employee_ref,
      coalesce(s.first_name, l.first_name) as first_name,
      coalesce(s.last_name, l.last_name) as last_name,
      case
        when l.id is null then 'joiner'
        when s.ref_key is null then case when l.status = 'active' then 'leaver' end
        when l.status = 'inactive' then 'returning'
        else 'update'
      end as change,
      case when s.ref_key is null then '{}'::jsonb else jsonb_strip_nulls(jsonb_build_object(
        'first_name', case when s.first_name is distinct from l.first_name
          then jsonb_build_object('from', l.first_name, 'to', s.first_name) end,
        'last_name', case when s.last_name is distinct from l.last_name
          then jsonb_build_object('from', l.last_name, 'to', s.last_name) end,
        'work_email', case when lower(s.work_email) is distinct from lower(l.work_email)
          then jsonb_build_object('from', l.work_email, 'to', s.work_email) end,
        'unit', case when lower(s.unit_code) is distinct from lower(l.unit_code)
          then jsonb_build_object('from', l.unit_code, 'to', s.unit_code) end,
        'team', case when lower(s.team_name) is distinct from lower(l.team_name)
          then jsonb_build_object('from', l.team_name, 'to', s.team_name) end,
        'manager', case when lower(s.manager_ref) is distinct from lower(l.manager_ref)
          then jsonb_build_object('from', l.manager_ref, 'to', s.manager_ref) end,
        'role_title', case when s.role_title is distinct from l.role_title
          then jsonb_build_object('from', l.role_title, 'to', s.role_title) end,
        'role_family', case when lower(s.role_family_name) is distinct from lower(l.role_family_name)
          then jsonb_build_object('from', l.role_family_name, 'to', s.role_family_name) end,
        'start_date', case when s.start_date is distinct from l.start_date
          then jsonb_build_object('from', l.start_date, 'to', s.start_date) end,
        'fte', case when s.fte is distinct from l.fte
          then jsonb_build_object('from', l.fte, 'to', s.fte) end,
        'team_leader', case when s.is_team_leader is distinct from l.is_team_leader
          then jsonb_build_object('from', l.is_team_leader, 'to', s.is_team_leader) end,
        'leadership_team', case when s.is_leadership_team is distinct from l.is_leadership_team
          then jsonb_build_object('from', l.is_leadership_team, 'to', s.is_leadership_team) end,
        'employment_status', case when s.employment_status is distinct from l.employment_status
          then jsonb_build_object('from', l.employment_status, 'to', s.employment_status) end,
        'formal_rating', case
          when (s.formal_rating_label, s.formal_rating_date) is distinct from (l.formal_rating_label, l.formal_rating_date)
          then jsonb_build_object(
            'from', case when l.formal_rating_label is not null
              then jsonb_build_object('label', l.formal_rating_label, 'date', l.formal_rating_date) end,
            'to', case when s.formal_rating_label is not null
              then jsonb_build_object('label', s.formal_rating_label, 'date', s.formal_rating_date) end)
          end
      )) end as fields
    from staged s
    full join live l on l.ref_key = s.ref_key
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('employee_ref', employee_ref, 'first_name', first_name, 'last_name', last_name,
                       'change', change, 'fields', fields)
    order by lower(employee_ref)
  ), '[]'::jsonb)
  into v_people
  from compared
  where change in ('joiner', 'returning', 'leaver') or (change = 'update' and fields <> '{}'::jsonb);

  with staged_units as (
    select lower(unit_code) as code_key, min(unit_code) as unit_code, min(unit_name) as unit_name
    from public.directory_upload_rows
    where organisation_id = v_org and upload_id = p_upload_id
    group by lower(unit_code)
  ),
  unit_changes as (
    select su.unit_code, 'new'::text as change, null::text as name_from, su.unit_name as name_to
    from staged_units su
    where not exists (
      select 1 from public.business_units u where u.organisation_id = v_org and lower(u.unit_code) = su.code_key
    )
    union all
    select u.unit_code, 'renamed', u.name, su.unit_name
    from staged_units su
    join public.business_units u on u.organisation_id = v_org and lower(u.unit_code) = su.code_key
    where u.status = 'active' and u.name is distinct from su.unit_name
    union all
    select u.unit_code, 'emptied', u.name, null
    from public.business_units u
    where u.organisation_id = v_org and u.status = 'active'
      and private.unit_has_active_staff(v_org, u.id)
      and lower(u.unit_code) not in (select code_key from staged_units)
  )
  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object('unit_code', unit_code, 'change', change, 'name_from', name_from, 'name_to', name_to))
    order by lower(unit_code), change
  ), '[]'::jsonb)
  into v_units
  from unit_changes;

  select coalesce(jsonb_agg(jsonb_build_object('unit_code', t.unit_code, 'team', t.team_name)
    order by lower(t.unit_code), lower(t.team_name)), '[]'::jsonb)
  into v_teams
  from (
    select min(r.unit_code) as unit_code, min(r.team_name) as team_name
    from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id and r.team_name is not null
    group by lower(r.unit_code), lower(r.team_name)
  ) t
  where not exists (
    select 1 from public.teams tm
    join public.business_units u on u.organisation_id = tm.organisation_id and u.id = tm.unit_id
    where tm.organisation_id = v_org and lower(u.unit_code) = lower(t.unit_code)
      and lower(tm.name) = lower(t.team_name)
  );

  select coalesce(jsonb_agg(f.role_family_name order by lower(f.role_family_name)), '[]'::jsonb)
  into v_families
  from (
    select min(r.role_family_name) as role_family_name
    from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id and r.role_family_name is not null
    group by lower(r.role_family_name)
  ) f
  where not exists (
    select 1 from public.role_families rf
    where rf.organisation_id = v_org and lower(rf.name) = lower(f.role_family_name)
  );

  select count(*) into v_active_before from public.employees where organisation_id = v_org and status = 'active';
  select count(*) into v_active_after from public.directory_upload_rows where organisation_id = v_org and upload_id = p_upload_id;
  select count(*) into v_leavers from jsonb_array_elements(v_people) p where p ->> 'change' = 'leaver';

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'rows', v_active_after,
      'joiners', (select count(*) from jsonb_array_elements(v_people) p where p ->> 'change' = 'joiner'),
      'returning', (select count(*) from jsonb_array_elements(v_people) p where p ->> 'change' = 'returning'),
      'leavers', v_leavers,
      'moves', (select count(*) from jsonb_array_elements(v_people) p
                where p ->> 'change' = 'update' and (p -> 'fields' ? 'unit' or p -> 'fields' ? 'team')),
      'manager_changes', (select count(*) from jsonb_array_elements(v_people) p
                          where p ->> 'change' = 'update' and p -> 'fields' ? 'manager'),
      'updates', (select count(*) from jsonb_array_elements(v_people) p where p ->> 'change' = 'update'),
      'formal_rating_changes', (select count(*) from jsonb_array_elements(v_people) p where p -> 'fields' ? 'formal_rating'),
      'new_units', (select count(*) from jsonb_array_elements(v_units) u where u ->> 'change' = 'new'),
      'renamed_units', (select count(*) from jsonb_array_elements(v_units) u where u ->> 'change' = 'renamed'),
      'emptied_units', (select count(*) from jsonb_array_elements(v_units) u where u ->> 'change' = 'emptied'),
      'new_teams', jsonb_array_length(v_teams),
      'new_role_families', jsonb_array_length(v_families)
    ),
    'leaver_confirmation_required', v_leavers > greatest(5, ceil(v_active_before * 0.10)),
    'entitlement', private.entitlement(v_org, v_active_after),
    'people', v_people,
    'units', v_units,
    'teams', v_teams,
    'role_families', v_families
  );
end
$$;

create function private.diff_hash(p_diff jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_diff::text, 'UTF8')), 'hex')
$$;

-- Problems that stop an upload being staged at all: things only visible across rows or against
-- the live directory. Row-level checks (types, required fields, formats) are made by the route.
create function private.upload_problems(p_upload_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with staged as (
    select r.* from public.directory_upload_rows r where r.upload_id = p_upload_id
  ),
  problems as (
    select r.row_number, 'manager_ref'::text as column_name,
           'the manager''s employee ID is not in this file'::text as message
    from staged r
    where r.manager_ref is not null
      and not exists (select 1 from staged m where lower(m.employee_ref) = lower(r.manager_ref))
    union all
    select r.row_number, 'manager_ref', 'a person cannot be their own manager'
    from staged r where lower(r.manager_ref) = lower(r.employee_ref)
    union all
    select r.row_number, 'work_email', 'this work email appears on more than one row'
    from staged r
    where r.work_email is not null
      and (select count(*) from staged o where lower(o.work_email) = lower(r.work_email)) > 1
    union all
    select r.row_number, 'unit_code', 'this unit code belongs to a retired unit and cannot be reused'
    from staged r
    join public.business_units u on u.organisation_id = r.organisation_id and lower(u.unit_code) = lower(r.unit_code)
    where u.status = 'retired'
    union all
    select c.row_number, 'manager_ref', 'this reporting line loops back to the same person'
    from (
      with recursive chain (start_ref, row_number, ref, manager_ref) as (
        select lower(r.employee_ref), r.row_number, lower(r.employee_ref), lower(r.manager_ref) from staged r
        where r.manager_ref is not null
        union
        select c.start_ref, c.row_number, lower(m.employee_ref), lower(m.manager_ref)
        from chain c
        join staged m on lower(m.employee_ref) = c.manager_ref
        where m.manager_ref is not null
      ) cycle ref set looped using path
      select distinct row_number from chain where manager_ref = start_ref
    ) c
  )
  select coalesce(jsonb_agg(jsonb_build_object('row', row_number, 'column', column_name, 'message', message)
                            order by row_number, column_name), '[]'::jsonb)
  from problems
$$;

-- Staging (service role only) ---------------------------------------------------------------------

-- Called by the upload route after its checks, for the person who uploaded. p_rows is the parsed
-- directory as a JSON array of objects keyed like directory_upload_rows; p_errors holds the
-- route's row-level validation errors. With errors, or with problems found here, the upload is
-- recorded as rejected and nothing is staged.
create function public.stage_directory_upload(
  p_actor_user_id uuid,
  p_organisation_id uuid,
  p_upload_id uuid,
  p_file_name text,
  p_byte_size integer,
  p_sha256 text,
  p_storage_path text,
  p_template_version text,
  p_rows jsonb,
  p_errors jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problems jsonb;
  v_status text;
  v_diff jsonb;
begin
  if not private.user_can_manage_directory(p_actor_user_id, p_organisation_id) then
    perform private.refuse('this person cannot manage the directory');
  end if;
  perform set_config('app.actor_user_id', p_actor_user_id::text, true);

  insert into public.directory_uploads (
    id, organisation_id, file_name, byte_size, sha256, storage_path, template_version, status,
    row_count, errors, uploaded_by
  ) values (
    p_upload_id, p_organisation_id, p_file_name, p_byte_size, p_sha256, p_storage_path, p_template_version,
    'staged', coalesce(jsonb_array_length(p_rows), 0), coalesce(p_errors, '[]'::jsonb), p_actor_user_id
  );

  if jsonb_array_length(coalesce(p_errors, '[]'::jsonb)) = 0 then
    insert into public.directory_upload_rows (
      organisation_id, upload_id, row_number, employee_ref, first_name, last_name, work_email, unit_code,
      unit_name, team_name, manager_ref, role_title, role_family_name, start_date, fte, is_team_leader,
      is_leadership_team, employment_status, formal_rating_label, formal_rating_date
    )
    select p_organisation_id, p_upload_id, r.row_number, r.employee_ref, r.first_name, r.last_name,
           r.work_email, r.unit_code, r.unit_name, r.team_name, r.manager_ref, r.role_title,
           r.role_family_name, r.start_date, r.fte, coalesce(r.is_team_leader, false),
           coalesce(r.is_leadership_team, false), r.employment_status, r.formal_rating_label,
           r.formal_rating_date
    from jsonb_to_recordset(p_rows) as r (
      row_number integer, employee_ref text, first_name text, last_name text, work_email text,
      unit_code text, unit_name text, team_name text, manager_ref text, role_title text,
      role_family_name text, start_date date, fte numeric, is_team_leader boolean,
      is_leadership_team boolean, employment_status text, formal_rating_label text, formal_rating_date date
    );
    v_problems := private.upload_problems(p_upload_id);
  else
    v_problems := '[]'::jsonb;
  end if;

  if jsonb_array_length(coalesce(p_errors, '[]'::jsonb)) > 0 or jsonb_array_length(v_problems) > 0 then
    delete from public.directory_upload_rows where organisation_id = p_organisation_id and upload_id = p_upload_id;
    v_status := 'rejected';
    update public.directory_uploads
    set status = v_status, errors = coalesce(p_errors, '[]'::jsonb) || v_problems,
        decided_at = now()
    where id = p_upload_id;
  else
    v_status := 'staged';
    v_diff := private.directory_diff(p_upload_id);
    update public.directory_uploads set diff_summary = v_diff -> 'summary' where id = p_upload_id;
  end if;

  perform private.record_event(p_organisation_id, 'directory.upload_staged', 'directory_uploads', p_upload_id,
    jsonb_build_object('status', v_status, 'rows', coalesce(jsonb_array_length(p_rows), 0),
                       'sha256', p_sha256));
  return jsonb_build_object('status', v_status, 'errors', coalesce(p_errors, '[]'::jsonb) || v_problems,
                            'summary', v_diff -> 'summary');
end
$$;

-- Preview, apply and discard (the person managing the directory) ----------------------------------

-- The difference in full, with the hash the apply must present. Because it shows formal ratings,
-- every preview is logged as a view of them.
create function public.directory_upload_preview(p_upload_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upload public.directory_uploads;
  v_diff jsonb;
begin
  select * into v_upload from public.directory_uploads where id = p_upload_id;
  if not found or not private.can_manage_directory(v_upload.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session preview uploads');
  end if;
  if v_upload.status <> 'staged' then
    perform private.invalid('this upload is no longer awaiting a decision');
  end if;
  v_diff := private.directory_diff(p_upload_id);
  perform private.record_event(v_upload.organisation_id, 'directory.upload_previewed', 'directory_uploads',
    p_upload_id, jsonb_build_object('formal_rating_changes', v_diff -> 'summary' -> 'formal_rating_changes'));
  return v_diff || jsonb_build_object('upload_id', p_upload_id, 'preview_hash', private.diff_hash(v_diff));
end
$$;

create function public.apply_directory_upload(
  p_upload_id uuid,
  p_preview_hash text,
  p_confirm_leavers boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upload public.directory_uploads;
  v_org uuid;
  v_diff jsonb;
  v_now timestamptz := now();
begin
  select * into v_upload from public.directory_uploads where id = p_upload_id;
  if not found or not private.can_manage_directory(v_upload.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session apply uploads');
  end if;
  v_org := v_upload.organisation_id;
  -- One directory change at a time per organisation: uploads, and campaign snapshots, lock here.
  perform 1 from public.organisations where id = v_org for update;
  select * into v_upload from public.directory_uploads where id = p_upload_id;
  if v_upload.status <> 'staged' then
    perform private.invalid('this upload is no longer awaiting a decision');
  end if;
  v_diff := private.directory_diff(p_upload_id);
  if private.diff_hash(v_diff) is distinct from p_preview_hash then
    perform private.invalid('the directory has changed since this preview was shown; preview the upload again');
  end if;
  if (v_diff ->> 'leaver_confirmation_required')::boolean and not p_confirm_leavers then
    perform private.invalid('this upload deactivates many people; confirm the leavers to apply it');
  end if;

  -- Units: new codes are created at the top of the hierarchy (it is arranged in the portal);
  -- renames keep the code and the history.
  insert into public.business_units (organisation_id, unit_code, name)
  select v_org, min(r.unit_code), min(r.unit_name)
  from public.directory_upload_rows r
  where r.organisation_id = v_org and r.upload_id = p_upload_id
  group by lower(r.unit_code)
  having not exists (
    select 1 from public.business_units u where u.organisation_id = v_org and lower(u.unit_code) = lower(min(r.unit_code))
  );
  update public.business_units u
  set name = su.unit_name
  from (
    select lower(r.unit_code) as code_key, min(r.unit_name) as unit_name
    from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id
    group by lower(r.unit_code)
  ) su
  where u.organisation_id = v_org and lower(u.unit_code) = su.code_key and u.status = 'active'
    and u.name is distinct from su.unit_name;

  insert into public.role_families (organisation_id, name)
  select v_org, min(r.role_family_name)
  from public.directory_upload_rows r
  where r.organisation_id = v_org and r.upload_id = p_upload_id and r.role_family_name is not null
  group by lower(r.role_family_name)
  having not exists (
    select 1 from public.role_families rf where rf.organisation_id = v_org and lower(rf.name) = lower(min(r.role_family_name))
  );

  insert into public.teams (organisation_id, unit_id, name)
  select v_org, u.id, t.team_name
  from (
    select lower(r.unit_code) as code_key, min(r.team_name) as team_name
    from public.directory_upload_rows r
    where r.organisation_id = v_org and r.upload_id = p_upload_id and r.team_name is not null
    group by lower(r.unit_code), lower(r.team_name)
  ) t
  join public.business_units u on u.organisation_id = v_org and lower(u.unit_code) = t.code_key
  where not exists (
    select 1 from public.teams tm where tm.organisation_id = v_org and tm.unit_id = u.id and lower(tm.name) = lower(t.team_name)
  );

  -- People, first without their managers (a manager may be a joiner in the same file).
  with resolved as (
    select r.*, u.id as unit_id, tm.id as team_id, rf.id as role_family_id
    from public.directory_upload_rows r
    join public.business_units u on u.organisation_id = v_org and lower(u.unit_code) = lower(r.unit_code)
    left join public.teams tm on tm.organisation_id = v_org and tm.unit_id = u.id and lower(tm.name) = lower(r.team_name)
    left join public.role_families rf on rf.organisation_id = v_org and lower(rf.name) = lower(r.role_family_name)
    where r.organisation_id = v_org and r.upload_id = p_upload_id
  ),
  updated as (
    update public.employees e
    set first_name = s.first_name, last_name = s.last_name, work_email = s.work_email,
        unit_id = s.unit_id, team_id = s.team_id, role_title = s.role_title,
        role_family_id = s.role_family_id, start_date = s.start_date, fte = s.fte,
        is_team_leader = s.is_team_leader, is_leadership_team = s.is_leadership_team,
        employment_status = s.employment_status, status = 'active'
    from resolved s
    where e.organisation_id = v_org and lower(e.employee_ref) = lower(s.employee_ref)
    returning e.id
  )
  insert into public.employees (
    organisation_id, employee_ref, first_name, last_name, work_email, unit_id, team_id, role_title,
    role_family_id, start_date, fte, is_team_leader, is_leadership_team, employment_status
  )
  select v_org, s.employee_ref, s.first_name, s.last_name, s.work_email, s.unit_id, s.team_id, s.role_title,
         s.role_family_id, s.start_date, s.fte, s.is_team_leader, s.is_leadership_team, s.employment_status
  from resolved s
  where not exists (
    select 1 from public.employees e where e.organisation_id = v_org and lower(e.employee_ref) = lower(s.employee_ref)
  );

  -- Then the reporting lines.
  update public.employees e
  set manager_employee_id = mgr.id
  from public.directory_upload_rows r
  left join public.employees mgr on mgr.organisation_id = v_org and lower(mgr.employee_ref) = lower(r.manager_ref)
  where r.organisation_id = v_org and r.upload_id = p_upload_id
    and e.organisation_id = v_org and lower(e.employee_ref) = lower(r.employee_ref)
    and e.manager_employee_id is distinct from mgr.id;

  -- Leavers: everyone active who is not in the file.
  update public.employees e
  set status = 'inactive'
  where e.organisation_id = v_org and e.status = 'active'
    and not exists (
      select 1 from public.directory_upload_rows r
      where r.organisation_id = v_org and r.upload_id = p_upload_id and lower(r.employee_ref) = lower(e.employee_ref)
    );

  -- Formal ratings follow the file.
  delete from public.formal_ratings fr
  using public.employees e, public.directory_upload_rows r
  where fr.organisation_id = v_org and e.organisation_id = v_org and e.id = fr.employee_id
    and r.organisation_id = v_org and r.upload_id = p_upload_id
    and lower(r.employee_ref) = lower(e.employee_ref) and r.formal_rating_label is null;
  insert into public.formal_ratings (organisation_id, employee_id, rating_label, rating_date, source_upload_id, recorded_by)
  select v_org, e.id, r.formal_rating_label, r.formal_rating_date, p_upload_id, private.acting_user_id()
  from public.directory_upload_rows r
  join public.employees e on e.organisation_id = v_org and lower(e.employee_ref) = lower(r.employee_ref)
  where r.organisation_id = v_org and r.upload_id = p_upload_id and r.formal_rating_label is not null
  on conflict (organisation_id, employee_id) do update
  set rating_label = excluded.rating_label, rating_date = excluded.rating_date,
      source_upload_id = excluded.source_upload_id, recorded_by = excluded.recorded_by, recorded_at = now()
  where (public.formal_ratings.rating_label, public.formal_ratings.rating_date)
        is distinct from (excluded.rating_label, excluded.rating_date);

  delete from public.directory_upload_rows where organisation_id = v_org and upload_id = p_upload_id;
  update public.directory_uploads
  set status = 'applied', decided_by = private.acting_user_id(), decided_at = v_now,
      diff_summary = v_diff -> 'summary'
  where id = p_upload_id;
  perform private.record_event(v_org, 'directory.upload_applied', 'directory_uploads', p_upload_id,
    v_diff -> 'summary');
  return v_diff -> 'summary';
end
$$;

create function public.discard_directory_upload(p_upload_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upload public.directory_uploads;
begin
  select * into v_upload from public.directory_uploads where id = p_upload_id;
  if not found or not private.can_manage_directory(v_upload.organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session discard uploads');
  end if;
  if v_upload.status <> 'staged' then
    perform private.invalid('this upload is no longer awaiting a decision');
  end if;
  delete from public.directory_upload_rows where organisation_id = v_upload.organisation_id and upload_id = p_upload_id;
  update public.directory_uploads
  set status = 'discarded', decided_by = private.acting_user_id(), decided_at = now()
  where id = p_upload_id;
end
$$;

-- Formal ratings (identified; administrators and staff under a session) ------------------------------

-- Sets or clears (null label) one person's formal rating.
create function public.set_formal_rating(p_employee_id uuid, p_label text, p_rating_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organisation_id into v_org from public.employees where id = p_employee_id;
  if v_org is null or not private.can_manage_directory(v_org) then
    perform private.refuse('only administrators, the account owner and staff under a session set formal ratings');
  end if;
  if p_label is null then
    delete from public.formal_ratings where organisation_id = v_org and employee_id = p_employee_id;
    return;
  end if;
  if p_rating_date is null or p_rating_date > private.today() then
    perform private.invalid('a formal rating needs its rating date, which cannot be in the future');
  end if;
  insert into public.formal_ratings (organisation_id, employee_id, rating_label, rating_date, recorded_by)
  values (v_org, p_employee_id, btrim(p_label), p_rating_date, auth.uid())
  on conflict (organisation_id, employee_id) do update
  set rating_label = excluded.rating_label, rating_date = excluded.rating_date,
      recorded_by = excluded.recorded_by, recorded_at = now(), source_upload_id = null;
end
$$;

-- The one way to read formal ratings: checked, and logged as a view or an export with its filter
-- and row count (PORTAL_BUILD_PLAN.md 3.5; Online Measurement Specification Part 7). An export also
-- needs TOTP verified within private.step_up_minutes().
create function public.read_formal_ratings(
  p_organisation_id uuid,
  p_unit_id uuid default null,
  p_purpose text default 'view'
)
returns table (
  employee_id uuid,
  employee_ref text,
  first_name text,
  last_name text,
  unit_id uuid,
  rating_label text,
  rating_date date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if not (private.is_org_admin(p_organisation_id) or private.is_support_for(p_organisation_id)) then
    perform private.refuse('formal ratings are visible to administrators, the account owner and staff under a session');
  end if;
  if p_purpose not in ('view', 'export') then
    perform private.invalid('the purpose is view or export');
  end if;
  if p_purpose = 'export' and not private.recent_totp(private.step_up_minutes()) then
    perform private.refuse('confirm your authenticator code again before exporting ratings');
  end if;
  return query
    select e.id, e.employee_ref, e.first_name, e.last_name, e.unit_id, fr.rating_label, fr.rating_date
    from public.formal_ratings fr
    join public.employees e on e.organisation_id = fr.organisation_id and e.id = fr.employee_id
    where fr.organisation_id = p_organisation_id
      and (p_unit_id is null or e.unit_id = p_unit_id)
    order by lower(e.employee_ref);
  get diagnostics v_rows = row_count;
  perform private.record_event(p_organisation_id, 'ratings.' || case when p_purpose = 'export' then 'exported' else 'viewed' end,
    'formal_ratings', null, jsonb_build_object('kind', 'formal', 'unit_id', p_unit_id, 'rows', v_rows));
end
$$;

-- Snapshots ---------------------------------------------------------------------------------------------

-- Freezes every active employee of the organisation (a manager can sit outside the units being
-- measured), with their formal ratings, for one campaign. Called by the campaign launch
-- (Milestone 5).
create function private.take_directory_snapshot(p_campaign_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_snapshot uuid;
  v_count integer;
begin
  select organisation_id into v_org from public.campaigns where id = p_campaign_id;
  if v_org is null then
    perform private.invalid('no such campaign');
  end if;
  perform 1 from public.organisations where id = v_org for update;

  insert into public.directory_snapshots (organisation_id, campaign_id, taken_by)
  values (v_org, p_campaign_id, private.acting_user_id())
  returning id into v_snapshot;

  with source as materialized (
    select e.*, gen_random_uuid() as member_id
    from public.employees e
    where e.organisation_id = v_org and e.status = 'active'
  )
  insert into public.snapshot_members (
    id, organisation_id, snapshot_id, employee_id, employee_ref, first_name, last_name, role_title,
    unit_id, team_id, manager_employee_id, manager_snapshot_member_id, role_family_id, start_date, fte,
    is_team_leader, is_leadership_team
  )
  select s.member_id, v_org, v_snapshot, s.id, s.employee_ref, s.first_name, s.last_name, s.role_title,
         s.unit_id, s.team_id, s.manager_employee_id,
         (select m.member_id from source m where m.id = s.manager_employee_id),
         s.role_family_id, s.start_date, s.fte, s.is_team_leader, s.is_leadership_team
  from source s;
  get diagnostics v_count = row_count;

  insert into public.snapshot_formal_ratings (organisation_id, snapshot_member_id, rating_label, rating_date)
  select v_org, sm.id, fr.rating_label, fr.rating_date
  from public.snapshot_members sm
  join public.formal_ratings fr on fr.organisation_id = sm.organisation_id and fr.employee_id = sm.employee_id
  where sm.organisation_id = v_org and sm.snapshot_id = v_snapshot;

  update public.directory_snapshots set member_count = v_count where id = v_snapshot;

  perform private.record_event(v_org, 'directory.snapshot_taken', 'directory_snapshots', v_snapshot,
    jsonb_build_object('campaign_id', p_campaign_id, 'members', v_count));
  return v_snapshot;
end
$$;

-- The daily jobs (service role, called by the /api/jobs/daily route) ------------------------------------

-- Records deactivated at least private.purge_after_days() ago (Sydney calendar) are purged:
--   1. the person's manager membership is revoked and unlinked;
--   2. their snapshot rows are redacted (employee ID to 'purged:<row id>', names and role title
--      removed), which keeps them distinct, so earlier inputs stay reproducible;
--   3. the formal rating and the directory record are deleted, and every link to the record is set
--      to null by the foreign keys (ratings, sessions, snapshots, reporting lines);
--   4. an account left with no membership and no staff designation is deleted.
-- Link clearing writes no row audit; each organisation gets one event with the counts.
create function public.purge_deactivated_employees(p_as_of date default null)
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

-- Staged uploads not decided within private.staged_upload_days() expire; their staged rows go.
create function public.expire_directory_uploads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.directory_uploads
    set status = 'expired', decided_at = now()
    where status = 'staged' and uploaded_at < now() - make_interval(days => private.staged_upload_days())
    returning id
  ),
  removed as (
    delete from public.directory_upload_rows r using expired e where r.upload_id = e.id
  )
  select count(*) into v_count from expired;
  return v_count;
end
$$;

-- Decided uploads whose file is still in the bucket; the daily job removes each file through the
-- Storage API (a row deleted from storage.objects in SQL would leave the file behind) and then
-- marks it removed.
create function public.uploads_awaiting_file_removal()
returns table (upload_id uuid, storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, storage_path from public.directory_uploads
  where status <> 'staged' and file_removed_at is null
  order by decided_at
$$;

create function public.mark_upload_file_removed(p_upload_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.directory_uploads set file_removed_at = now() where id = p_upload_id and file_removed_at is null
$$;

-- Audit ----------------------------------------------------------------------------------------------

-- Employees image only structural links and flags; names, email, employee ID, role title, dates and
-- FTE are recorded as changed but never copied. Formal ratings image nothing but their ids.
insert into private.audit_image_columns (table_name, column_name) values
  ('employees', 'id'), ('employees', 'unit_id'), ('employees', 'team_id'),
  ('employees', 'manager_employee_id'), ('employees', 'role_family_id'), ('employees', 'status'),
  ('employees', 'is_team_leader'), ('employees', 'is_leadership_team'),
  ('formal_ratings', 'id'), ('formal_ratings', 'employee_id'),
  ('directory_uploads', 'id'), ('directory_uploads', 'status'), ('directory_uploads', 'row_count'),
  ('directory_uploads', 'sha256'), ('directory_uploads', 'decided_at'),
  ('campaigns', 'id'), ('campaigns', 'cadence'), ('campaigns', 'status'), ('campaigns', 'opens_at'),
  ('campaigns', 'closes_at'), ('campaigns', 'launched_at'), ('campaigns', 'closed_at');

create trigger employees_audit after insert or update or delete on public.employees
  for each row execute function private.audit_row_change();
create trigger formal_ratings_audit after insert or update or delete on public.formal_ratings
  for each row execute function private.audit_row_change();
create trigger directory_uploads_audit after update or delete on public.directory_uploads
  for each row execute function private.audit_row_change();
create trigger campaigns_audit after insert or update or delete on public.campaigns
  for each row execute function private.audit_row_change();

-- Row level security ------------------------------------------------------------------------------

alter table public.campaigns enable row level security;
alter table public.campaign_units enable row level security;
alter table public.employees enable row level security;
alter table public.formal_ratings enable row level security;
alter table public.directory_uploads enable row level security;
alter table public.directory_upload_rows enable row level security;
alter table public.directory_snapshots enable row level security;
alter table public.snapshot_members enable row level security;
alter table public.snapshot_formal_ratings enable row level security;

-- The directory: administrators, the account owner and staff under a session; a manager reads their
-- own active direct reports. Written by administrators, the account owner and staff under a session
-- (flag 4, 23 September 2026) while the organisation is writable.
create policy employees_select on public.employees for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or (status = 'active' and manager_employee_id in (select private.my_employee_ids()))
  );
create policy employees_insert on public.employees for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy employees_update on public.employees for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

-- Uploads: their metadata and outcome, for the same people. Written only through functions.
create policy directory_uploads_select on public.directory_uploads for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );

-- Campaigns and snapshots: administrators, the account owner and staff under a session; a manager
-- where they rate (step 6), and their own direct reports' snapshot rows.
create policy campaigns_select on public.campaigns for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or id in (select private.my_rated_campaign_ids())
  );
create policy campaign_units_select on public.campaign_units for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or campaign_id in (select private.my_rated_campaign_ids())
  );
create policy directory_snapshots_select on public.directory_snapshots for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or campaign_id in (select private.my_rated_campaign_ids())
  );
create policy snapshot_members_select on public.snapshot_members for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
    or manager_employee_id in (select private.my_employee_ids())
  );

-- formal_ratings, snapshot_formal_ratings and directory_upload_rows have no policy and no grant:
-- they are read only through the logged functions.

-- Grants -----------------------------------------------------------------------------------------

grant select, insert on public.employees to authenticated;
grant update (
  first_name, last_name, work_email, unit_id, team_id, manager_employee_id, role_title, role_family_id,
  start_date, fte, is_team_leader, is_leadership_team, employment_status, status
) on public.employees to authenticated;
grant select on public.directory_uploads to authenticated;
grant select on public.campaigns to authenticated;
grant select on public.campaign_units to authenticated;
grant select on public.directory_snapshots to authenticated;
grant select on public.snapshot_members to authenticated;

grant execute on function private.my_employee_ids() to authenticated;
grant execute on function private.my_rated_campaign_ids() to authenticated;
grant execute on function public.directory_upload_preview(uuid) to authenticated;
grant execute on function public.apply_directory_upload(uuid, text, boolean) to authenticated;
grant execute on function public.discard_directory_upload(uuid) to authenticated;
grant execute on function public.set_formal_rating(uuid, text, date) to authenticated;
grant execute on function public.read_formal_ratings(uuid, uuid, text) to authenticated;

grant execute on function public.stage_directory_upload(uuid, uuid, uuid, text, integer, text, text, text, jsonb, jsonb) to service_role;
grant execute on function public.purge_deactivated_employees(date) to service_role;
grant execute on function public.expire_directory_uploads() to service_role;
grant execute on function public.uploads_awaiting_file_removal() to service_role;
grant execute on function public.mark_upload_file_removed(uuid) to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
