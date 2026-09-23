-- Milestone 3, step 4: the unit structure and the context tables personal data references.
--
-- Units carry a stable code (Online Measurement Specification 6.2): unique within the organisation
-- including retired units, never changed, never reused. A rename keeps the code and the history.
-- A merge or split retires the predecessors and records lineage to the successors, which is how
-- trends survive a restructure. Teams sit inside a unit. Role families, skills and knowledge
-- domains are the context the manager modules rate against (PORTAL_BUILD_PLAN.md 2.3); their
-- setup screens are Milestone 4, and the other four context tables arrive then.
--
-- Structure and context carry no personal data and every role's screens need them, so every
-- member of the organisation reads them. Administrators, the account owner and staff under a
-- session write them while the organisation is writable. Nothing here is deleted: a unit, team,
-- family, skill or domain is retired.

-- Tables ------------------------------------------------------------------------------------------

create table public.business_units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  unit_code text not null check (unit_code ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$'),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  parent_unit_id uuid,
  unit_type text check (
    unit_type in (
      'operations', 'sales', 'technology', 'support_functions', 'professional_services',
      'research_and_development', 'other'
    )
  ),
  status text not null default 'active' check (status in ('active', 'retired')),
  retired_on date,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, parent_unit_id) references public.business_units (organisation_id, id),
  check (parent_unit_id <> id),
  check ((status = 'retired') = (retired_on is not null))
);
create unique index business_units_code on public.business_units (organisation_id, lower(unit_code));
create index business_units_parent_idx on public.business_units (organisation_id, parent_unit_id);
comment on column public.business_units.unit_code is
  'The stable key (Online Measurement Specification 6.2). Unique within the organisation, case '
  'aside, including retired units; never changed and never reused.';
comment on column public.business_units.unit_type is
  'Unit type (Measurement Reference Part 2, 7.1). Metadata only.';

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  unit_id uuid not null,
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  -- The target of employees' (organisation_id, unit_id, team_id), so a person's team is always
  -- inside their unit.
  unique (organisation_id, unit_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);
create unique index teams_name on public.teams (organisation_id, unit_id, lower(name));

create table public.unit_lineage (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  predecessor_unit_id uuid not null,
  successor_unit_id uuid not null,
  kind text not null check (kind in ('merge', 'split')),
  effective_date date not null,
  recorded_by uuid,
  recorded_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, predecessor_unit_id, successor_unit_id),
  foreign key (organisation_id, predecessor_unit_id) references public.business_units (organisation_id, id),
  foreign key (organisation_id, successor_unit_id) references public.business_units (organisation_id, id),
  check (predecessor_unit_id <> successor_unit_id)
);
create index unit_lineage_successor_idx on public.unit_lineage (organisation_id, successor_unit_id);

create table public.role_families (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  is_people_leader boolean not null default false,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id)
);
create unique index role_families_name on public.role_families (organisation_id, lower(name));

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  role_family_id uuid not null,
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  is_critical boolean not null default false,
  kind text not null check (kind in ('technical', 'behavioural')),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, role_family_id) references public.role_families (organisation_id, id)
);
create unique index skills_name on public.skills (organisation_id, role_family_id, lower(name));

create table public.knowledge_domains (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  unit_id uuid not null,
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  criticality smallint not null check (criticality between 1 and 3),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);
create unique index knowledge_domains_name on public.knowledge_domains (organisation_id, unit_id, lower(name));

create table public.unit_access (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  membership_id uuid not null,
  unit_id uuid not null,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, membership_id, unit_id),
  foreign key (organisation_id, membership_id) references public.org_memberships (organisation_id, id)
    on delete cascade,
  foreign key (organisation_id, unit_id) references public.business_units (organisation_id, id)
);
comment on table public.unit_access is
  'Scopes a unit viewer to nominated units and their descendants (PORTAL_BUILD_PLAN.md 2.1).';

-- Integrity triggers ----------------------------------------------------------------------------------

create function private.guard_unit_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.unit_code is distinct from old.unit_code then
    raise exception 'a unit code never changes: rename the unit, or record a merge or split'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger business_units_guard_code
  before update of unit_code on public.business_units
  for each row execute function private.guard_unit_code();

create function private.guard_unit_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_unit_id is not null and exists (
    with recursive ancestors as (
      select u.id, u.parent_unit_id from public.business_units u
      where u.organisation_id = new.organisation_id and u.id = new.parent_unit_id
      union
      select u.id, u.parent_unit_id from public.business_units u
      join ancestors a on u.organisation_id = new.organisation_id and u.id = a.parent_unit_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'a unit cannot sit below itself' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger business_units_guard_hierarchy
  before insert or update of parent_unit_id on public.business_units
  for each row execute function private.guard_unit_hierarchy();

create function private.guard_unit_access_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.org_memberships m
    where m.organisation_id = new.organisation_id and m.id = new.membership_id and m.role = 'unit_viewer'
  ) then
    raise exception 'unit scopes belong to unit viewers' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger unit_access_guard_role
  before insert or update on public.unit_access
  for each row execute function private.guard_unit_access_role();

-- Helpers -----------------------------------------------------------------------------------------

-- Units whose results the caller may see (PORTAL_BUILD_PLAN.md 3.2, can_view_unit): every unit of
-- an organisation where they are account owner, administrator or executive viewer, or where they
-- hold a support session; for a unit viewer, the nominated units and everything below them. The
-- results policies of Milestone 6 are its first users; it is proven now.
create function private.viewable_unit_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive scoped as (
    select ua.organisation_id, ua.unit_id as id
    from public.unit_access ua
    join public.org_memberships m on m.organisation_id = ua.organisation_id and m.id = ua.membership_id
    where m.user_id = auth.uid()
      and m.revoked_at is null
      and m.role = 'unit_viewer'
      and ua.organisation_id in (select private.org_ids(array['unit_viewer']))
    union
    select u.organisation_id, u.id
    from public.business_units u
    join scoped s on u.organisation_id = s.organisation_id and u.parent_unit_id = s.id
  )
  select id from scoped
  union
  select u.id
  from public.business_units u
  where u.organisation_id in (select private.org_ids(array['account_owner', 'administrator', 'executive_viewer']))
     or u.organisation_id in (select private.support_org_ids())
$$;

create function private.can_view_unit(p_unit_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_unit_id in (select private.viewable_unit_ids())
$$;

-- Whether a unit still has active staff. The directory arrives in step 5, which replaces this.
create function private.unit_has_active_staff(p_organisation_id uuid, p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false
$$;

-- Lineage (Online Measurement Specification 6.2) --------------------------------------------------

-- Recorded after people have moved: the successor units exist and the predecessors are empty. A
-- merge has several predecessors and one successor; a split has one predecessor and several
-- successors. The predecessors are retired on the effective date and keep their history.
create function public.record_unit_lineage(
  p_organisation_id uuid,
  p_kind text,
  p_predecessor_ids uuid[],
  p_successor_ids uuid[],
  p_effective_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_predecessor uuid;
  v_successor uuid;
begin
  if not private.can_manage_org(p_organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session record lineage');
  end if;
  if p_kind = 'merge' and (cardinality(p_predecessor_ids) < 2 or cardinality(p_successor_ids) <> 1) then
    perform private.invalid('a merge has two or more predecessors and one successor');
  end if;
  if p_kind = 'split' and (cardinality(p_predecessor_ids) <> 1 or cardinality(p_successor_ids) < 2) then
    perform private.invalid('a split has one predecessor and two or more successors');
  end if;
  if p_kind not in ('merge', 'split') then
    perform private.invalid('lineage is a merge or a split');
  end if;
  if p_predecessor_ids && p_successor_ids then
    perform private.invalid('a unit cannot succeed itself');
  end if;
  if (select count(*) from public.business_units
      where organisation_id = p_organisation_id and id = any (p_predecessor_ids || p_successor_ids)
        and status = 'active')
     <> cardinality(p_predecessor_ids) + cardinality(p_successor_ids) then
    perform private.invalid('every unit must be an active unit of this organisation');
  end if;
  foreach v_predecessor in array p_predecessor_ids loop
    if private.unit_has_active_staff(p_organisation_id, v_predecessor) then
      perform private.invalid('move everyone out of a unit before recording it as merged or split');
    end if;
  end loop;

  update public.business_units
  set status = 'retired', retired_on = p_effective_date
  where organisation_id = p_organisation_id and id = any (p_predecessor_ids);

  foreach v_predecessor in array p_predecessor_ids loop
    foreach v_successor in array p_successor_ids loop
      insert into public.unit_lineage (
        organisation_id, predecessor_unit_id, successor_unit_id, kind, effective_date, recorded_by
      ) values (
        p_organisation_id, v_predecessor, v_successor, p_kind, p_effective_date, auth.uid()
      );
    end loop;
  end loop;
end
$$;

-- Unit viewers are granted with their units ---------------------------------------------------------

create or replace function private.grant_access(
  p_organisation_id uuid,
  p_email text,
  p_role text,
  p_unit_ids uuid[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := private.normalise_email(p_email);
  v_units uuid[] := coalesce(p_unit_ids, '{}');
  v_profile public.profiles;
  v_membership_id uuid;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    perform private.invalid('not an email address');
  end if;
  if p_role not in ('account_owner', 'administrator', 'executive_viewer', 'unit_viewer') then
    perform private.invalid('this role cannot be granted');
  end if;
  if (p_role = 'unit_viewer') <> (cardinality(v_units) > 0) then
    perform private.invalid('a unit viewer is granted with one or more units, and only a unit viewer');
  end if;
  if (select count(*) from public.business_units
      where organisation_id = p_organisation_id and id = any (v_units) and status = 'active')
     <> cardinality(v_units) then
    perform private.invalid('every unit must be an active unit of this organisation');
  end if;

  select * into v_profile from public.profiles where lower(email) = v_email;
  if found then
    if v_profile.is_owner or v_profile.is_support_staff then
      perform private.invalid('PerformanceVP staff reach client data through support sessions, not memberships');
    end if;
    select id into v_membership_id from public.org_memberships
    where organisation_id = p_organisation_id and user_id = v_profile.id and role = p_role
      and revoked_at is null;
    if not found then
      insert into public.org_memberships (organisation_id, user_id, role, granted_by)
      values (p_organisation_id, v_profile.id, p_role, private.acting_user_id())
      returning id into v_membership_id;
    end if;
    insert into public.unit_access (organisation_id, membership_id, unit_id, granted_by)
    select p_organisation_id, v_membership_id, u, private.acting_user_id()
    from unnest(v_units) as u
    on conflict do nothing;
    return false;
  end if;

  insert into public.membership_invitations (organisation_id, email, role, unit_ids, invited_by)
  values (p_organisation_id, v_email, p_role, v_units, private.acting_user_id())
  on conflict (organisation_id, lower(email), role) where claimed_at is null
  do update set unit_ids = (
    select array_agg(distinct u) from unnest(membership_invitations.unit_ids || excluded.unit_ids) as u
  );
  return true;
end
$$;

create or replace function private.claim_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.membership_invitations;
  v_membership_id uuid;
begin
  for v_invitation in
    select * from public.membership_invitations
    where lower(email) = lower(new.email) and claimed_at is null and expires_at > now()
    order by invited_at
  loop
    insert into public.org_memberships (organisation_id, user_id, role, granted_by)
    values (v_invitation.organisation_id, new.id, v_invitation.role, v_invitation.invited_by)
    on conflict do nothing
    returning id into v_membership_id;
    if v_membership_id is not null then
      insert into public.unit_access (organisation_id, membership_id, unit_id, granted_by)
      select v_invitation.organisation_id, v_membership_id, u, v_invitation.invited_by
      from unnest(v_invitation.unit_ids) as u
      where exists (
        select 1 from public.business_units b
        where b.organisation_id = v_invitation.organisation_id and b.id = u and b.status = 'active'
      );
    end if;
    update public.membership_invitations
    set claimed_at = now(), claimed_by = new.id
    where id = v_invitation.id;
  end loop;
  return null;
end
$$;

-- The account owner replaces a unit viewer's scope.
create function public.set_unit_access(p_membership_id uuid, p_unit_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.org_memberships;
  v_units uuid[] := coalesce(p_unit_ids, '{}');
begin
  select * into v_membership from public.org_memberships where id = p_membership_id and revoked_at is null;
  if not found or v_membership.organisation_id not in (select private.writable_org_ids(array['account_owner'])) then
    perform private.refuse('only the account owner sets a unit viewer''s units');
  end if;
  if v_membership.role <> 'unit_viewer' or cardinality(v_units) = 0 then
    perform private.invalid('a unit viewer is scoped to one or more units');
  end if;
  if (select count(*) from public.business_units
      where organisation_id = v_membership.organisation_id and id = any (v_units) and status = 'active')
     <> cardinality(v_units) then
    perform private.invalid('every unit must be an active unit of this organisation');
  end if;
  delete from public.unit_access
  where organisation_id = v_membership.organisation_id and membership_id = p_membership_id
    and unit_id <> all (v_units);
  insert into public.unit_access (organisation_id, membership_id, unit_id, granted_by)
  select v_membership.organisation_id, p_membership_id, u, auth.uid()
  from unnest(v_units) as u
  on conflict do nothing;
end
$$;

-- Audit ---------------------------------------------------------------------------------------------

insert into private.audit_image_columns (table_name, column_name) values
  ('business_units', 'id'), ('business_units', 'unit_code'), ('business_units', 'name'),
  ('business_units', 'parent_unit_id'), ('business_units', 'unit_type'),
  ('business_units', 'status'), ('business_units', 'retired_on'),
  ('teams', 'id'), ('teams', 'unit_id'), ('teams', 'name'), ('teams', 'status'),
  ('unit_lineage', 'id'), ('unit_lineage', 'predecessor_unit_id'),
  ('unit_lineage', 'successor_unit_id'), ('unit_lineage', 'kind'), ('unit_lineage', 'effective_date'),
  ('role_families', 'id'), ('role_families', 'name'), ('role_families', 'is_people_leader'),
  ('role_families', 'status'),
  ('skills', 'id'), ('skills', 'role_family_id'), ('skills', 'name'), ('skills', 'is_critical'),
  ('skills', 'kind'), ('skills', 'status'),
  ('knowledge_domains', 'id'), ('knowledge_domains', 'unit_id'), ('knowledge_domains', 'name'),
  ('knowledge_domains', 'criticality'), ('knowledge_domains', 'status'),
  ('unit_access', 'id'), ('unit_access', 'membership_id'), ('unit_access', 'unit_id');

create trigger business_units_audit after insert or update or delete on public.business_units
  for each row execute function private.audit_row_change();
create trigger teams_audit after insert or update or delete on public.teams
  for each row execute function private.audit_row_change();
create trigger unit_lineage_audit after insert or update or delete on public.unit_lineage
  for each row execute function private.audit_row_change();
create trigger role_families_audit after insert or update or delete on public.role_families
  for each row execute function private.audit_row_change();
create trigger skills_audit after insert or update or delete on public.skills
  for each row execute function private.audit_row_change();
create trigger knowledge_domains_audit after insert or update or delete on public.knowledge_domains
  for each row execute function private.audit_row_change();
create trigger unit_access_audit after insert or update or delete on public.unit_access
  for each row execute function private.audit_row_change();

-- Row level security ------------------------------------------------------------------------------

alter table public.business_units enable row level security;
alter table public.teams enable row level security;
alter table public.unit_lineage enable row level security;
alter table public.role_families enable row level security;
alter table public.skills enable row level security;
alter table public.knowledge_domains enable row level security;
alter table public.unit_access enable row level security;

-- Structure and context: read by every member and by staff under a session; written by
-- administrators, the account owner and staff under a session while the organisation is writable.
create policy business_units_select on public.business_units for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy business_units_insert on public.business_units for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy business_units_update on public.business_units for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy teams_select on public.teams for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy teams_insert on public.teams for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy teams_update on public.teams for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy unit_lineage_select on public.unit_lineage for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );

create policy role_families_select on public.role_families for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy role_families_insert on public.role_families for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy role_families_update on public.role_families for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy skills_select on public.skills for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy skills_insert on public.skills for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy skills_update on public.skills for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

create policy knowledge_domains_select on public.knowledge_domains for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy knowledge_domains_insert on public.knowledge_domains for insert to authenticated
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy knowledge_domains_update on public.knowledge_domains for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );

-- Unit scopes: the unit viewer's own; all of them for administrators and staff under a session.
create policy unit_access_select on public.unit_access for select to authenticated
  using (
    membership_id in (select m.id from public.org_memberships m where m.user_id = (select auth.uid()))
    or organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );

-- Grants -----------------------------------------------------------------------------------------

-- Updates are column-level, so no row can be moved to another organisation or given another id.
grant select, insert on public.business_units to authenticated;
grant update (name, parent_unit_id, unit_type, status, retired_on) on public.business_units to authenticated;
grant select, insert on public.teams to authenticated;
grant update (name, status) on public.teams to authenticated;
grant select on public.unit_lineage to authenticated;
grant select, insert on public.role_families to authenticated;
grant update (name, is_people_leader, status) on public.role_families to authenticated;
grant select, insert on public.skills to authenticated;
grant update (name, is_critical, kind, status) on public.skills to authenticated;
grant select, insert on public.knowledge_domains to authenticated;
grant update (name, criticality, status) on public.knowledge_domains to authenticated;
grant select on public.unit_access to authenticated;

grant execute on function private.viewable_unit_ids() to authenticated;
grant execute on function private.can_view_unit(uuid) to authenticated;
grant execute on function public.record_unit_lineage(uuid, text, uuid[], uuid[], date) to authenticated;
grant execute on function public.set_unit_access(uuid, uuid[]) to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
