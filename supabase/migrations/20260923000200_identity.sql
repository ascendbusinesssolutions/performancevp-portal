-- Milestone 3, step 2: identity, tenancy, plan and staff access.
--
-- The organisation is the tenant (CLAUDE.md Section 4). A person is a profile, one per auth user.
-- Client roles are memberships; PerformanceVP staff are profile flags and reach client data only
-- through a support session they open, which the client can always see (decided 23 September
-- 2026; Online Measurement Specification v0.9 Part 7). The subscription record holds the band and
-- the term; the subscription state is computed from the dates, never stored (Milestone 3 plan,
-- Section 7).
--
-- Every role fact lives in a table, so revocation takes effect on the next query. The helpers in
-- `private` are the only place those facts are interpreted, including the assurance rules: every
-- role except manager needs a password session, account owners, administrators and staff need
-- TOTP (aal2), anyone who has enrolled TOTP always needs it, and a session that has been signed
-- out or revoked counts for nothing even while its access token is unexpired.

-- Tables ------------------------------------------------------------------------------------------

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  anzsic_division text check (anzsic_division ~ '^[A-S]$'),
  anzsic_class text check (anzsic_class ~ '^[0-9]{4}$'),
  size_band text check (size_band in ('under_50', '50_to_200', '200_to_1000', 'over_1000')),
  data_contribution_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid
);
comment on table public.organisations is 'The tenant. Every client-owned row carries its id.';
comment on column public.organisations.anzsic_division is
  'Sector, ANZSIC division letter (Measurement Reference Part 2, 7.1). Metadata only.';
comment on column public.organisations.anzsic_class is
  'Sub-sector, ANZSIC class code (Measurement Reference Part 2, 7.1). Metadata only.';
comment on column public.organisations.size_band is
  'Organisation size band by FTE (Measurement Reference Part 2, 7.1). Metadata only.';
comment on column public.organisations.data_contribution_opt_out is
  'The account owner''s opt-out from contributing unit-level aggregates to the research dataset.';

create table public.ref_employee_bands (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  label text not null check (btrim(label) <> ''),
  max_employees integer not null check (max_employees > 0),
  sort_order integer not null unique
);
comment on table public.ref_employee_bands is
  'Subscription employee bands. Created empty: the values are the EMPLOYEE_BANDS placeholder, a '
  'commercial decision. Written by migration only.';

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  employee_band text not null references public.ref_employee_bands (code),
  period_start date not null,
  period_end date not null,
  agreement_date date not null,
  invoice_reference text not null check (btrim(invoice_reference) <> '' and length(invoice_reference) <= 100),
  state_override text check (state_override in ('suspended', 'cancelled')),
  override_reason text check (override_reason is null or btrim(override_reason) <> ''),
  provisioned_by uuid not null,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  check (period_end >= period_start),
  check ((state_override is null) = (override_reason is null)),
  constraint subscriptions_no_overlap exclude using gist (
    organisation_id with =,
    daterange(period_start, period_end, '[]') with &&
  )
);
comment on table public.subscriptions is
  'One row per subscription term (PORTAL_BUILD_PLAN.md 2.8 and 11). The state is computed by '
  'private.subscription_state from the dates and the override, never stored.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (full_name is null or length(full_name) <= 200),
  is_owner boolean not null default false,
  is_support_staff boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_one_staff_kind check (not (is_owner and is_support_staff))
);
create unique index profiles_single_owner on public.profiles ((true)) where is_owner;
create index profiles_email_idx on public.profiles (lower(email));
comment on table public.profiles is
  'One row per auth user, kept in step by a trigger on auth.users. is_owner marks the one Owner '
  'account and is_support_staff the designated PerformanceVP support staff.';

create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (
    role in ('account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent')
  ),
  -- The manager's own directory record. The composite foreign key to employees arrives with the
  -- directory (step 5).
  employee_id uuid,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid,
  unique (organisation_id, id),
  check (role = 'manager_respondent' or employee_id is null),
  check (role <> 'manager_respondent' or revoked_at is not null or employee_id is not null)
);
create unique index org_memberships_active_role
  on public.org_memberships (organisation_id, user_id, role) where revoked_at is null;
create unique index org_memberships_one_account_owner
  on public.org_memberships (organisation_id) where role = 'account_owner' and revoked_at is null;
create unique index org_memberships_one_manager_per_employee
  on public.org_memberships (organisation_id, employee_id)
  where role = 'manager_respondent' and revoked_at is null;
create index org_memberships_user_idx on public.org_memberships (user_id) where revoked_at is null;
comment on table public.org_memberships is
  'Client roles (PORTAL_BUILD_PLAN.md 3.2). A person may hold several roles in one organisation. '
  'Manager memberships are created by the system at campaign launch, never by a person.';

create table public.membership_invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and length(email) <= 320),
  role text not null check (role in ('account_owner', 'administrator', 'executive_viewer', 'unit_viewer')),
  unit_ids uuid[] not null default '{}',
  invited_by uuid,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  claimed_at timestamptz,
  claimed_by uuid references public.profiles (id) on delete set null (claimed_by),
  unique (organisation_id, id),
  check (role = 'unit_viewer' or cardinality(unit_ids) = 0)
);
create unique index membership_invitations_open
  on public.membership_invitations (organisation_id, lower(email), role) where claimed_at is null;
comment on table public.membership_invitations is
  'Access granted to an address that has no account yet. Claimed by a trigger when the auth user '
  'is created, so there is no separate acceptance step.';

create table public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  staff_user_id uuid references public.profiles (id) on delete set null (staff_user_id),
  staff_name text not null check (btrim(staff_name) <> ''),
  staff_email text not null,
  kind text not null check (kind in ('support', 'owner')),
  reason text not null check (length(btrim(reason)) between 10 and 1000),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_by uuid,
  unique (organisation_id, id),
  check (expires_at > started_at),
  check (ended_at is null or ended_at >= started_at)
);
create unique index support_sessions_one_open
  on public.support_sessions (organisation_id, staff_user_id) where ended_at is null;
create index support_sessions_staff_idx on public.support_sessions (staff_user_id) where ended_at is null;
comment on table public.support_sessions is
  'The one route by which PerformanceVP staff reach a client''s data: opened with a written reason, '
  'time-limited, and listed for the client with the staff member''s name. There is no client '
  'switch (decided 23 September 2026; Online Measurement Specification v0.9 Part 7).';

-- Profiles follow auth.users ----------------------------------------------------------------------

create function private.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, full_name)
    values (new.id, coalesce(new.email, ''), nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''));
  elsif new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end
$$;

create trigger auth_users_sync_profile
  after insert or update of email on auth.users
  for each row execute function private.sync_profile_from_auth();

-- Staff never hold client memberships ---------------------------------------------------------------

-- Staff reach client data only through a support session, which is logged and shown to the
-- client. A membership would be a second, unlogged route, so the two are kept exclusive.

create function private.guard_staff_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.revoked_at is null and exists (
    select 1 from public.profiles p
    where p.id = new.user_id and (p.is_owner or p.is_support_staff)
  ) then
    raise exception 'PerformanceVP staff reach client data through support sessions, not memberships'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger org_memberships_guard_staff
  before insert or update on public.org_memberships
  for each row execute function private.guard_staff_membership();

create function private.guard_staff_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.is_owner or new.is_support_staff) and exists (
    select 1 from public.org_memberships m where m.user_id = new.id and m.revoked_at is null
  ) then
    raise exception 'a person who holds a client membership cannot be designated PerformanceVP staff'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger profiles_guard_staff_flags
  before insert or update of is_owner, is_support_staff on public.profiles
  for each row execute function private.guard_staff_flags();

-- Session and assurance helpers ------------------------------------------------------------------

-- The signed-in session still exists and has not passed its not-after time. Sign-out, revocation
-- and a factor reset delete the session row, so they take effect on the next query rather than
-- when the access token expires.
create function private.session_is_live()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
      and (s.not_after is null or s.not_after > now())
  )
$$;

-- The session's first factor was a password (decision 1 of the Milestone 3 plan: everyone except
-- managers signs in with a password; a session opened by email code counts only for the manager
-- role). Supabase records the methods in the amr claim.
create function private.password_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method": "password"}]'::jsonb
      or coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '["password"]'::jsonb
$$;

create function private.aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create function private.has_verified_factor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors f
    where f.user_id = auth.uid() and f.status::text = 'verified'
  )
$$;

-- aal2, or a role that does not mandate it held by someone who has not enrolled a factor. Anyone
-- who has enrolled TOTP always needs it, so a password alone never works for them.
create function private.assurance_ok(p_mandatory boolean)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.aal2() or (not p_mandatory and not private.has_verified_factor())
$$;

-- TOTP verified within the last p_minutes: the step-up for ratings exports and factor resets.
create function private.recent_totp(p_minutes integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
    ) as e
    where jsonb_typeof(e) = 'object'
      and e ->> 'method' = 'totp'
      and (e ->> 'timestamp')::bigint >= extract(epoch from now())::bigint - p_minutes * 60
  )
$$;

-- Staff ----------------------------------------------------------------------------------------------

-- Staff flags count only on a live password session completed with TOTP.
create function private.staff_session_ok()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_is_live() and private.password_session() and private.aal2()
$$;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.staff_session_ok()
     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_owner)
$$;

create function private.is_support_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.staff_session_ok()
     and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_support_staff)
$$;

create function private.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_owner() or private.is_support_staff()
$$;

-- Organisations the caller has an open, unexpired support session for. Sessions work in every
-- subscription state, so staff are never locked out.
create function private.support_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct s.organisation_id
  from public.support_sessions s
  where private.is_staff()
    and s.staff_user_id = auth.uid()
    and s.ended_at is null
    and s.expires_at > now()
$$;

-- Subscription state ---------------------------------------------------------------------------------

-- pending: no term has started yet. active: within the latest term that has started. grace: the
-- 30 days after it ends, read-only. suspended: after that, or with no term at all. An override on
-- the governing term (suspended or cancelled) takes precedence. Dates are on the Sydney calendar
-- (PORTAL_BUILD_PLAN.md 11; DECISIONS.md 5.5; Milestone 3 plan, Section 7).
create function private.subscription_state(p_organisation_id uuid, p_on date default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_on date := coalesce(p_on, private.today());
  v_term public.subscriptions;
begin
  if not exists (select 1 from public.subscriptions where organisation_id = p_organisation_id) then
    return 'suspended';
  end if;
  select * into v_term
  from public.subscriptions
  where organisation_id = p_organisation_id and period_start <= v_on
  order by period_start desc
  limit 1;
  if not found then
    return 'pending';
  end if;
  if v_term.state_override is not null then
    return v_term.state_override;
  end if;
  if v_on <= v_term.period_end then
    return 'active';
  end if;
  if v_on <= v_term.period_end + private.grace_days() then
    return 'grace';
  end if;
  return 'suspended';
end
$$;

create function private.org_readable(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.subscription_state(p_organisation_id) in ('pending', 'active', 'grace')
$$;

create function private.org_writable(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.subscription_state(p_organisation_id) in ('pending', 'active')
$$;

-- Client roles -----------------------------------------------------------------------------------

-- Whether a manager membership's link to its directory record still holds. Until the directory
-- exists (step 5) the link only has to be present; step 5 adds that the record is active and that
-- its work email is the signed-in address.
create function private.manager_link_ok(p_organisation_id uuid, p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_employee_id is not null
$$;

-- The caller's memberships that count on this session, in any subscription state.
create function private.caller_memberships()
returns table (organisation_id uuid, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.organisation_id, m.role
  from public.org_memberships m
  where m.user_id = auth.uid()
    and m.revoked_at is null
    and private.session_is_live()
    and case m.role
      when 'manager_respondent' then
        private.assurance_ok(false) and private.manager_link_ok(m.organisation_id, m.employee_id)
      when 'account_owner' then private.password_session() and private.aal2()
      when 'administrator' then private.password_session() and private.aal2()
      else private.password_session() and private.assurance_ok(false)
    end
$$;

-- Organisations where the caller holds one of the roles and the organisation is readable (pending,
-- active or grace). The set-returning form lets a policy evaluate it once per statement.
create function private.org_ids(p_roles text[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct cm.organisation_id
  from private.caller_memberships() cm
  where cm.role = any (p_roles) and private.org_readable(cm.organisation_id)
$$;

-- As org_ids, where the organisation is also writable (pending or active).
create function private.writable_org_ids(p_roles text[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct cm.organisation_id
  from private.caller_memberships() cm
  where cm.role = any (p_roles) and private.org_writable(cm.organisation_id)
$$;

-- Organisations where the caller is the account owner, in any subscription state. Used only where
-- the account owner keeps access in suspension: the organisation record, the subscription, staff
-- session history and the audit log (Milestone 3 plan, flag 5, confirmed 23 September 2026).
create function private.account_owner_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct cm.organisation_id
  from private.caller_memberships() cm
  where cm.role = 'account_owner'
$$;

-- Organisations the caller may write structure, context and the directory in as staff: an open
-- session, and a writable organisation.
create function private.support_writable_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.organisation_id
  from private.support_org_ids() as s (organisation_id)
  where private.org_writable(s.organisation_id)
$$;

-- Boolean forms, for functions.
create function private.is_member(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organisation_id in (
    select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']
    )
  )
$$;

create function private.is_org_admin(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
$$;

create function private.is_account_owner(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organisation_id in (select private.org_ids(array['account_owner']))
$$;

create function private.is_support_for(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organisation_id in (select private.support_org_ids())
$$;

-- The write rule for structure and context: an administrator or account owner, or staff with an
-- open session, in a writable organisation.
create function private.can_manage_org(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
      or p_organisation_id in (select private.support_writable_org_ids())
$$;

-- The write rule for the directory and its uploads. The same as can_manage_org today (staff write
-- the directory under an open session, flag 4, 23 September 2026); kept separate so the two rules
-- can diverge without touching policies.
create function private.can_manage_directory(p_organisation_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.can_manage_org(p_organisation_id)
$$;

-- Profiles the caller may see besides their own: the members of organisations they administer or
-- have a support session for, and, for the Owner, the staff.
create function private.visible_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id
  from public.org_memberships m
  where m.revoked_at is null
    and (
      m.organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
      or m.organisation_id in (select private.support_org_ids())
    )
  union
  select p.id
  from public.profiles p
  where (p.is_owner or p.is_support_staff) and private.is_owner()
$$;

-- What the application needs to route a signed-in person: who they are, which roles they hold and
-- in what state, and whether they must enrol or complete TOTP before anything else.
create function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'session_live', private.session_is_live(),
    'aal', auth.jwt() ->> 'aal',
    'password_session', private.password_session(),
    'has_verified_factor', private.has_verified_factor(),
    'is_owner', p.is_owner,
    'is_support_staff', p.is_support_staff,
    'mfa_required', p.is_owner or p.is_support_staff or exists (
      select 1 from public.org_memberships m
      where m.user_id = p.id and m.revoked_at is null and m.role in ('account_owner', 'administrator')
    ),
    'memberships', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'organisation_id', m.organisation_id,
          'organisation_name', o.name,
          'role', m.role,
          'state', private.subscription_state(m.organisation_id)
        )
        order by o.name, m.role
      )
      from public.org_memberships m
      join public.organisations o on o.id = m.organisation_id
      where m.user_id = p.id and m.revoked_at is null
    ), '[]'::jsonb),
    'open_support_sessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'session_id', s.id,
          'organisation_id', s.organisation_id,
          'organisation_name', o.name,
          'expires_at', s.expires_at
        )
        order by o.name
      )
      from public.support_sessions s
      join public.organisations o on o.id = s.organisation_id
      where s.staff_user_id = p.id and s.ended_at is null and s.expires_at > now()
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.id = auth.uid()
$$;

-- Row level security ------------------------------------------------------------------------------

alter table public.organisations enable row level security;
alter table public.ref_employee_bands enable row level security;
alter table public.subscriptions enable row level security;
alter table public.profiles enable row level security;
alter table public.org_memberships enable row level security;
alter table public.membership_invitations enable row level security;
alter table public.support_sessions enable row level security;

-- Organisations: every member reads their own; the account owner also in suspension; staff read
-- every organisation (to provision and to choose where to open a session). Name and sector are
-- written by administrators and by staff under a session; nothing else is written directly.
create policy organisations_select on public.organisations
  for select to authenticated
  using (
    id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']
    ))
    or id in (select private.account_owner_org_ids())
    or (select private.is_staff())
  );

create policy organisations_update on public.organisations
  for update to authenticated
  using (
    id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or id in (select private.support_writable_org_ids())
  )
  with check (
    id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or id in (select private.support_writable_org_ids())
  );

-- Reference bands: every signed-in user.
create policy ref_employee_bands_select on public.ref_employee_bands
  for select to authenticated
  using (true);

-- Subscriptions: the account owner (in any state) and staff. Written only through functions.
create policy subscriptions_select on public.subscriptions
  for select to authenticated
  using (
    organisation_id in (select private.account_owner_org_ids())
    or (select private.is_staff())
  );

-- Profiles: one's own, and those private.visible_profile_ids allows. A person changes only their
-- own name.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or id in (select private.visible_profile_ids()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Memberships: one's own; all of an organisation's for its administrators and for staff under a
-- session. Written only through functions.
create policy org_memberships_select on public.org_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );

create policy membership_invitations_select on public.membership_invitations
  for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );

-- Support sessions: the staff member's own, all of them for the Owner, and every session on an
-- organisation for its administrators and, in any state, its account owner.
create policy support_sessions_select on public.support_sessions
  for select to authenticated
  using (
    (staff_user_id = (select auth.uid()) and (select private.is_staff()))
    or (select private.is_owner())
    or organisation_id in (select private.account_owner_org_ids())
    or organisation_id in (select private.org_ids(array['administrator']))
  );

-- Grants -----------------------------------------------------------------------------------------

grant select on public.organisations to authenticated;
grant update (name, anzsic_division, anzsic_class, size_band) on public.organisations to authenticated;
grant select on public.ref_employee_bands to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.membership_invitations to authenticated;
grant select on public.support_sessions to authenticated;

-- Helpers that policies call directly run with the querying role's privileges, so it needs execute.
grant execute on function private.org_ids(text[]) to authenticated;
grant execute on function private.writable_org_ids(text[]) to authenticated;
grant execute on function private.account_owner_org_ids() to authenticated;
grant execute on function private.support_org_ids() to authenticated;
grant execute on function private.support_writable_org_ids() to authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_owner() to authenticated;
grant execute on function private.is_support_staff() to authenticated;
grant execute on function private.visible_profile_ids() to authenticated;
grant execute on function public.my_access() to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
