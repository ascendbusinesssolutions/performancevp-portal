-- Milestone 4b, step 1: measurement units (Online Measurement Specification 6.2, "Combining small
-- units for measurement"; Milestone 4b plan, Sections 1, 2, 4, 5 and 8).
--
-- The directory keeps the organisation as the HRIS has it; measurement units sit on top of it.
-- Every org unit has its own single measurement unit, created with it, which carries its code and
-- follows its name and status. An administrator combines a unit under 10 with others in its branch
-- into a combined measurement unit; its singles are then inactive and return if the combination is
-- undone. Context, campaigns and, from Milestone 6, results and trends key on the measurement unit.
--
-- The database holds what must never be wrong: tenancy, active and exclusive membership, and that
-- a measurement unit a campaign has measured is not changed (retire-and-lineage is Milestone 5).
-- Which units may combine (the same branch) and that one side is under 10 are the portal's rules,
-- with the intake's constants, rechecked by the readiness check at every run and at launch.
--
-- Measurement units are read like the org units, by every member of the organisation and by staff
-- under a session. They are written only through the functions below, apart from a combined
-- unit's name and leader, which administrators, the account owner and staff under a session set.

-- Tables ------------------------------------------------------------------------------------------

create table public.measurement_units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  -- A single's code is its unit's code. A combined unit's code joins its units' codes with '+',
  -- which no unit code may contain, so the two can never collide.
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9_.+#-]*$' and length(code) <= 250),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  kind text not null check (kind in ('single', 'combined')),
  -- inactive: a single held inside a combination, restored if the combination is undone.
  status text not null default 'active' check (status in ('active', 'inactive', 'retired')),
  retired_on date,
  single_unit_id uuid,
  unit_leader_employee_id uuid,
  grouping_kept_at timestamptz,
  grouping_kept_by uuid,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, single_unit_id) references public.business_units (organisation_id, id),
  foreign key (organisation_id, unit_leader_employee_id)
    references public.employees (organisation_id, id) on delete set null (unit_leader_employee_id),
  check ((kind = 'single') = (single_unit_id is not null)),
  check ((kind = 'combined') = (position('+' in code) > 0)),
  check (kind = 'combined' or unit_leader_employee_id is null),
  check (kind = 'single' or grouping_kept_at is null),
  check (kind = 'single' or status <> 'inactive'),
  check ((status = 'retired') = (retired_on is not null))
);
create unique index measurement_units_code on public.measurement_units (organisation_id, lower(code));
create unique index measurement_units_single on public.measurement_units (organisation_id, single_unit_id)
  where single_unit_id is not null;
comment on table public.measurement_units is
  'What a campaign measures (Online Measurement Specification 6.2): an org unit on its own (single), '
  'or units under 10 combined by the administrator (combined). Context, campaign units and results '
  'key on it.';
comment on column public.measurement_units.unit_leader_employee_id is
  'A combined unit''s chosen leader, where siblings combine. A single''s leader is its unit''s; a '
  'combination that rolls up takes its top unit''s.';
comment on column public.measurement_units.grouping_kept_at is
  'When the administrator chose to keep this single, a unit under 10 with units below it, as a '
  'grouping unit rather than combine it downward.';

create table public.measurement_unit_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  measurement_unit_id uuid not null,
  business_unit_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (organisation_id, id),
  foreign key (organisation_id, measurement_unit_id)
    references public.measurement_units (organisation_id, id) on delete cascade,
  foreign key (organisation_id, business_unit_id) references public.business_units (organisation_id, id),
  check (ended_at is null or ended_at >= started_at)
);
-- An org unit belongs to one measurement unit at a time.
create unique index measurement_unit_members_current
  on public.measurement_unit_members (organisation_id, business_unit_id) where ended_at is null;
create index measurement_unit_members_unit_idx
  on public.measurement_unit_members (organisation_id, measurement_unit_id);
comment on table public.measurement_unit_members is
  'The org units a measurement unit holds, current (ended_at null) and past.';

create table public.measurement_unit_lineage (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  predecessor_id uuid not null,
  successor_id uuid not null,
  kind text not null check (kind in ('merge', 'split', 'combine', 'separate')),
  effective_date date not null,
  recorded_by uuid,
  recorded_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, predecessor_id, successor_id),
  foreign key (organisation_id, predecessor_id) references public.measurement_units (organisation_id, id),
  foreign key (organisation_id, successor_id) references public.measurement_units (organisation_id, id),
  check (predecessor_id <> successor_id)
);
comment on table public.measurement_unit_lineage is
  'How trends carry across a change of measurement unit: an org unit merge or split, and from '
  'Milestone 5 a combination changed after a campaign has measured it.';

-- Every existing unit gets its single, and existing lineage is carried across ----------------------

insert into public.measurement_units (organisation_id, code, name, kind, status, retired_on, single_unit_id, created_at)
select u.organisation_id, u.unit_code, u.name, 'single',
       case when u.status = 'retired' then 'retired' else 'active' end, u.retired_on, u.id, u.created_at
from public.business_units u;

insert into public.measurement_unit_members (organisation_id, measurement_unit_id, business_unit_id, started_at, ended_at)
select mu.organisation_id, mu.id, mu.single_unit_id, mu.created_at,
       case when mu.status = 'retired' then greatest(now(), mu.created_at) end
from public.measurement_units mu;

insert into public.measurement_unit_lineage (
  organisation_id, predecessor_id, successor_id, kind, effective_date, recorded_by, recorded_at
)
select l.organisation_id, p.id, s.id, l.kind, l.effective_date, l.recorded_by, l.recorded_at
from public.unit_lineage l
join public.measurement_units p on p.organisation_id = l.organisation_id and p.single_unit_id = l.predecessor_unit_id
join public.measurement_units s on s.organisation_id = l.organisation_id and s.single_unit_id = l.successor_unit_id;

-- Context moves to the measurement unit ----------------------------------------------------------

alter table public.knowledge_domains add column measurement_unit_id uuid;
update public.knowledge_domains k set measurement_unit_id = mu.id
from public.measurement_units mu where mu.organisation_id = k.organisation_id and mu.single_unit_id = k.unit_id;
alter table public.knowledge_domains
  alter column measurement_unit_id set not null,
  add foreign key (organisation_id, measurement_unit_id) references public.measurement_units (organisation_id, id);
drop index public.knowledge_domains_name;
alter table public.knowledge_domains drop column unit_id;
create unique index knowledge_domains_name on public.knowledge_domains (organisation_id, measurement_unit_id, lower(name));

alter table public.decision_types add column measurement_unit_id uuid;
update public.decision_types k set measurement_unit_id = mu.id
from public.measurement_units mu where mu.organisation_id = k.organisation_id and mu.single_unit_id = k.unit_id;
alter table public.decision_types
  alter column measurement_unit_id set not null,
  add foreign key (organisation_id, measurement_unit_id) references public.measurement_units (organisation_id, id);
drop index public.decision_types_name;
alter table public.decision_types drop column unit_id;
create unique index decision_types_name on public.decision_types (organisation_id, measurement_unit_id, lower(name));

alter table public.critical_processes add column measurement_unit_id uuid;
update public.critical_processes k set measurement_unit_id = mu.id
from public.measurement_units mu where mu.organisation_id = k.organisation_id and mu.single_unit_id = k.unit_id;
alter table public.critical_processes
  alter column measurement_unit_id set not null,
  add foreign key (organisation_id, measurement_unit_id) references public.measurement_units (organisation_id, id);
drop index public.critical_processes_name;
alter table public.critical_processes drop column unit_id;
create unique index critical_processes_name on public.critical_processes (organisation_id, measurement_unit_id, lower(name));

alter table public.primary_systems add column measurement_unit_id uuid;
update public.primary_systems k set measurement_unit_id = mu.id
from public.measurement_units mu where mu.organisation_id = k.organisation_id and mu.single_unit_id = k.unit_id;
alter table public.primary_systems
  alter column measurement_unit_id set not null,
  add foreign key (organisation_id, measurement_unit_id) references public.measurement_units (organisation_id, id);
drop index public.primary_systems_name;
alter table public.primary_systems drop column unit_id;
create unique index primary_systems_name on public.primary_systems (organisation_id, measurement_unit_id, lower(name));

comment on table public.knowledge_domains is
  'The 3 to 6 knowledge domains of a measurement unit, with criticality 1 to 3 (Online Measurement '
  'Specification 3.1). Defined once for a combined unit.';

-- A campaign measures measurement units ----------------------------------------------------------

alter table public.campaign_units add column measurement_unit_id uuid;
update public.campaign_units cu set measurement_unit_id = mu.id
from public.measurement_units mu where mu.organisation_id = cu.organisation_id and mu.single_unit_id = cu.unit_id;
alter table public.campaign_units
  alter column measurement_unit_id set not null,
  add foreign key (organisation_id, measurement_unit_id) references public.measurement_units (organisation_id, id),
  drop column unit_id,
  add unique (organisation_id, campaign_id, measurement_unit_id);

-- Helpers -----------------------------------------------------------------------------------------

-- The measurement unit an org unit belongs to now.
create function private.current_measurement_unit_id(p_organisation_id uuid, p_unit_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.measurement_unit_id from public.measurement_unit_members m
  where m.organisation_id = p_organisation_id and m.business_unit_id = p_unit_id and m.ended_at is null
$$;

-- The org units a measurement unit holds now.
create function private.measurement_unit_constituents(p_organisation_id uuid, p_measurement_unit_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.business_unit_id), '{}') from public.measurement_unit_members m
  where m.organisation_id = p_organisation_id and m.measurement_unit_id = p_measurement_unit_id
    and m.ended_at is null
$$;

-- Whether a campaign has measured the measurement unit. Until Milestone 5 builds retire-and-lineage,
-- such a unit is not changed.
create function private.measurement_unit_in_use(p_organisation_id uuid, p_measurement_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaign_units cu
    where cu.organisation_id = p_organisation_id and cu.measurement_unit_id = p_measurement_unit_id
  )
$$;

-- Whether a person may lead the given units (one org unit, or a measurement unit's units): an active
-- member of one of them or of a unit above them (Online Measurement Specification 6.1, the unit
-- leader: a member of the unit or of a grouping unit above it, such as the executive the unit's
-- staff report to). "Above" is checked here by structure; the readiness check reads the rest.
create function private.leader_eligible(p_organisation_id uuid, p_unit_ids uuid[], p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive above as (
    select u.id, u.parent_unit_id from public.business_units u
    where u.organisation_id = p_organisation_id and u.id = any (p_unit_ids)
    union
    select u.id, u.parent_unit_id from public.business_units u
    join above a on u.organisation_id = p_organisation_id and u.id = a.parent_unit_id
  )
  select exists (
    select 1 from public.employees e
    where e.organisation_id = p_organisation_id and e.id = p_employee_id and e.status = 'active'
      and e.unit_id in (select id from above)
  )
$$;

-- Measurement units whose results the caller may see (Milestone 6 is the first reader; proven now,
-- as can_view_unit was): those holding, now or before, any org unit the caller may see.
create function private.viewable_measurement_unit_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.measurement_unit_id from public.measurement_unit_members m
  where m.business_unit_id in (select private.viewable_unit_ids())
$$;

create function private.can_view_measurement_unit(p_measurement_unit_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_measurement_unit_id in (select private.viewable_measurement_unit_ids())
$$;

-- Singles follow their unit -----------------------------------------------------------------------

create function private.create_single_measurement_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.measurement_units (organisation_id, code, name, kind, status, retired_on, single_unit_id)
  values (new.organisation_id, new.unit_code, new.name, 'single',
          case when new.status = 'retired' then 'retired' else 'active' end, new.retired_on, new.id)
  returning id into v_id;
  insert into public.measurement_unit_members (organisation_id, measurement_unit_id, business_unit_id, ended_at)
  values (new.organisation_id, v_id, new.id, case when new.status = 'retired' then now() end);
  return null;
end
$$;

create trigger business_units_single_measurement_unit
  after insert on public.business_units
  for each row execute function private.create_single_measurement_unit();

create function private.sync_single_measurement_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_single uuid;
begin
  select id into v_single from public.measurement_units
  where organisation_id = new.organisation_id and single_unit_id = new.id;
  if new.name is distinct from old.name then
    update public.measurement_units set name = new.name where id = v_single;
  end if;
  if new.status is distinct from old.status then
    update public.measurement_units
    set status = case when new.status = 'retired' then 'retired' else 'active' end,
        retired_on = case when new.status = 'retired' then new.retired_on end
    where id = v_single;
    update public.measurement_unit_members
    set ended_at = case when new.status = 'retired' then now() end
    where organisation_id = new.organisation_id and measurement_unit_id = v_single and business_unit_id = new.id;
  end if;
  return null;
end
$$;

create trigger business_units_sync_single
  after update of name, status on public.business_units
  for each row execute function private.sync_single_measurement_unit();

-- A unit inside a combination is taken out of it, by undoing it, before the unit is retired.
create function private.guard_combined_unit_retirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'retired' and old.status = 'active' and exists (
    select 1 from public.measurement_unit_members m
    join public.measurement_units mu on mu.organisation_id = m.organisation_id and mu.id = m.measurement_unit_id
    where m.organisation_id = new.organisation_id and m.business_unit_id = new.id and m.ended_at is null
      and mu.kind = 'combined'
  ) then
    raise exception 'undo the combination that holds this unit before retiring it' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger business_units_guard_combined_retirement
  before update of status on public.business_units
  for each row execute function private.guard_combined_unit_retirement();

-- An org unit merge or split is also a change of measurement unit.
create function private.record_measurement_lineage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.measurement_unit_lineage (
    organisation_id, predecessor_id, successor_id, kind, effective_date, recorded_by
  )
  select new.organisation_id, p.id,
         coalesce(private.current_measurement_unit_id(new.organisation_id, new.successor_unit_id), s.id),
         new.kind, new.effective_date, new.recorded_by
  from public.measurement_units p
  join public.measurement_units s on s.organisation_id = p.organisation_id and s.single_unit_id = new.successor_unit_id
  where p.organisation_id = new.organisation_id and p.single_unit_id = new.predecessor_unit_id
  on conflict (organisation_id, predecessor_id, successor_id) do nothing;
  return null;
end
$$;

create trigger unit_lineage_measurement_lineage
  after insert on public.unit_lineage
  for each row execute function private.record_measurement_lineage();

-- A combined unit's name and leader ---------------------------------------------------------------

create function private.guard_measurement_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'single' and new.name is distinct from old.name
     and new.name is distinct from (
       select u.name from public.business_units u
       where u.organisation_id = new.organisation_id and u.id = new.single_unit_id
     ) then
    raise exception 'a single unit is measured under its own name: rename the unit' using errcode = 'check_violation';
  end if;
  if new.unit_leader_employee_id is not null
     and new.unit_leader_employee_id is distinct from old.unit_leader_employee_id
     and not private.leader_eligible(
       new.organisation_id, private.measurement_unit_constituents(new.organisation_id, new.id),
       new.unit_leader_employee_id
     ) then
    raise exception 'the leader must be an active member of one of the units, or of a unit above them'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger measurement_units_guard
  before update of name, unit_leader_employee_id on public.measurement_units
  for each row execute function private.guard_measurement_unit();

-- The unit leader, widened (Online Measurement Specification 6.1, refreshed 23 September 2026) ------

-- Replaces the Milestone 4 guard: the leader may be a member of the unit or of a unit above it.
create or replace function private.guard_unit_leader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.unit_leader_employee_id is not null
     and not private.leader_eligible(new.organisation_id, array[new.id], new.unit_leader_employee_id) then
    raise exception 'the unit leader must be an active member of the unit or of a unit above it'
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

-- Replaces the Milestone 4 release: a person who leaves, or moves where they can no longer lead a
-- unit or a combined unit they were leading, stops leading it.
create or replace function private.release_unit_leader()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' or new.unit_id is distinct from old.unit_id then
    update public.business_units u
    set unit_leader_employee_id = null
    where u.organisation_id = new.organisation_id and u.unit_leader_employee_id = new.id
      and not private.leader_eligible(u.organisation_id, array[u.id], new.id);
    update public.measurement_units mu
    set unit_leader_employee_id = null
    where mu.organisation_id = new.organisation_id and mu.unit_leader_employee_id = new.id
      and not private.leader_eligible(
        mu.organisation_id, private.measurement_unit_constituents(mu.organisation_id, mu.id), new.id
      );
  end if;
  return null;
end
$$;

-- A unit moved in the hierarchy releases any leader, below it or of a combination, who is no longer
-- in or above the units they lead.
create function private.release_leaders_after_move()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  with recursive below as (
    select u.id from public.business_units u where u.organisation_id = new.organisation_id and u.id = new.id
    union
    select u.id from public.business_units u
    join below b on u.organisation_id = new.organisation_id and u.parent_unit_id = b.id
  )
  update public.business_units u
  set unit_leader_employee_id = null
  where u.organisation_id = new.organisation_id and u.id in (select id from below)
    and u.unit_leader_employee_id is not null
    and not private.leader_eligible(u.organisation_id, array[u.id], u.unit_leader_employee_id);
  update public.measurement_units mu
  set unit_leader_employee_id = null
  where mu.organisation_id = new.organisation_id and mu.unit_leader_employee_id is not null
    and not private.leader_eligible(
      mu.organisation_id, private.measurement_unit_constituents(mu.organisation_id, mu.id),
      mu.unit_leader_employee_id
    );
  return null;
end
$$;

create trigger business_units_release_leaders_after_move
  after update of parent_unit_id on public.business_units
  for each row execute function private.release_leaders_after_move();

-- The choice (Milestone 4b plan, Section 2) -------------------------------------------------------

-- Combines two or more active measurement units, at most one of them a combination, into one. Two
-- singles make a new combination; a single joining a combination extends it. The singles become
-- inactive. The code joins the units' codes with '+' (a '#n' suffix where a retired combination
-- already holds it) and follows the units until a campaign first measures it. The name comes from
-- the portal, which words the default. Nothing a campaign has measured is changed.
create function public.combine_measurement_units(
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
  if exists (select 1 from unnest(v_ids) as x where private.measurement_unit_in_use(p_organisation_id, x)) then
    perform private.invalid('a measurement unit that a campaign has measured cannot be changed yet');
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

  select id into v_target from public.measurement_units
  where organisation_id = p_organisation_id and id = any (v_ids) and kind = 'combined';

  v_code := v_base;
  while exists (
    select 1 from public.measurement_units
    where organisation_id = p_organisation_id and lower(code) = lower(v_code) and id is distinct from v_target
  ) loop
    v_code := v_base || '#' || v_n;
    v_n := v_n + 1;
  end loop;

  if v_target is null then
    insert into public.measurement_units (organisation_id, code, name, kind)
    values (p_organisation_id, v_code, btrim(p_name), 'combined')
    returning id into v_target;
  else
    update public.measurement_units set code = v_code, name = btrim(p_name) where id = v_target;
  end if;

  -- The singles leave their own measurement unit, then join the combination.
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
  where organisation_id = p_organisation_id and id = any (v_ids) and id <> v_target;

  perform private.record_event(p_organisation_id, 'measurement.combined', 'measurement_units', v_target,
    jsonb_build_object('units', cardinality(v_units)));
  return v_target;
end
$$;

-- Undoes a combination a campaign has not measured: its units are measured on their own again, with
-- the context their singles kept, and the context entered for the combination is removed with it.
create function public.undo_measurement_unit(p_organisation_id uuid, p_measurement_unit_id uuid)
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
  if private.measurement_unit_in_use(p_organisation_id, p_measurement_unit_id) then
    perform private.invalid('a measurement unit that a campaign has measured cannot be changed yet');
  end if;

  v_units := private.measurement_unit_constituents(p_organisation_id, p_measurement_unit_id);

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
    and m.organisation_id = s.organisation_id and m.measurement_unit_id = s.id and m.business_unit_id = s.single_unit_id;

  perform private.record_event(p_organisation_id, 'measurement.undone', 'measurement_units', p_measurement_unit_id,
    jsonb_build_object('units', cardinality(v_units)));
end
$$;

-- Records, or withdraws, the choice to keep a unit under 10 with units below it as a grouping unit
-- rather than combine it downward. Whether it is under 10 is the readiness check's to judge.
create function public.keep_grouping_unit(p_organisation_id uuid, p_measurement_unit_id uuid, p_keep boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_org(p_organisation_id) then
    perform private.refuse('only administrators, the account owner and staff under a session choose a grouping unit');
  end if;
  if not exists (
    select 1 from public.measurement_units mu
    where mu.organisation_id = p_organisation_id and mu.id = p_measurement_unit_id
      and mu.kind = 'single' and mu.status = 'active'
      and exists (
        select 1 from public.business_units c
        where c.organisation_id = mu.organisation_id and c.parent_unit_id = mu.single_unit_id and c.status = 'active'
      )
  ) then
    perform private.invalid('only an active unit with units below it can be kept as a grouping unit');
  end if;
  update public.measurement_units
  set grouping_kept_at = case when p_keep then now() end,
      grouping_kept_by = case when p_keep then private.acting_user_id() end
  where organisation_id = p_organisation_id and id = p_measurement_unit_id;
end
$$;

drop function public.invitation_status_counts(uuid);

-- As Milestone 3, per measurement unit.
create function public.invitation_status_counts(p_campaign_id uuid)
returns table (
  campaign_unit_id uuid, measurement_unit_id uuid, audience text, issued integer, sent integer,
  bounced integer, responded integer, expired integer
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
    select cu.id, cu.measurement_unit_id, i.audience,
           count(*) filter (where i.status = 'issued')::integer,
           count(*) filter (where i.status = 'sent')::integer,
           count(*) filter (where i.status = 'bounced')::integer,
           count(*) filter (where i.status = 'responded')::integer,
           count(*) filter (where i.status = 'expired')::integer
    from public.invitations i
    join public.campaign_units cu on cu.organisation_id = i.organisation_id and cu.id = i.campaign_unit_id
    where cu.organisation_id = v_org and cu.campaign_id = p_campaign_id
    group by cu.id, cu.measurement_unit_id, i.audience
    order by cu.measurement_unit_id, i.audience;
end
$$;

-- Audit ----------------------------------------------------------------------------------------------

delete from private.audit_image_columns
where column_name = 'unit_id'
  and table_name in ('knowledge_domains', 'decision_types', 'critical_processes', 'primary_systems');

insert into private.audit_image_columns (table_name, column_name) values
  ('knowledge_domains', 'measurement_unit_id'), ('decision_types', 'measurement_unit_id'),
  ('critical_processes', 'measurement_unit_id'), ('primary_systems', 'measurement_unit_id'),
  ('measurement_units', 'id'), ('measurement_units', 'code'), ('measurement_units', 'name'),
  ('measurement_units', 'kind'), ('measurement_units', 'status'), ('measurement_units', 'retired_on'),
  ('measurement_units', 'single_unit_id'), ('measurement_units', 'unit_leader_employee_id'),
  ('measurement_units', 'grouping_kept_at'),
  ('measurement_unit_members', 'id'), ('measurement_unit_members', 'measurement_unit_id'),
  ('measurement_unit_members', 'business_unit_id'), ('measurement_unit_members', 'ended_at'),
  ('measurement_unit_lineage', 'id'), ('measurement_unit_lineage', 'predecessor_id'),
  ('measurement_unit_lineage', 'successor_id'), ('measurement_unit_lineage', 'kind'),
  ('measurement_unit_lineage', 'effective_date');

create trigger measurement_units_audit after insert or update or delete on public.measurement_units
  for each row execute function private.audit_row_change();
create trigger measurement_unit_members_audit after insert or update or delete on public.measurement_unit_members
  for each row execute function private.audit_row_change();
create trigger measurement_unit_lineage_audit after insert or update or delete on public.measurement_unit_lineage
  for each row execute function private.audit_row_change();

-- Row level security ------------------------------------------------------------------------------

alter table public.measurement_units enable row level security;
alter table public.measurement_unit_members enable row level security;
alter table public.measurement_unit_lineage enable row level security;

-- As the org units: every member of the organisation and staff under a session read them.
create policy measurement_units_select on public.measurement_units for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
-- A combined unit's name and leader: administrators, the account owner and staff under a session,
-- while the organisation is writable (the column grants limit what can change).
create policy measurement_units_update on public.measurement_units for update to authenticated
  using (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  )
  with check (
    organisation_id in (select private.writable_org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_writable_org_ids())
  );
create policy measurement_unit_members_select on public.measurement_unit_members for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );
create policy measurement_unit_lineage_select on public.measurement_unit_lineage for select to authenticated
  using (
    organisation_id in (select private.org_ids(
      array['account_owner', 'administrator', 'executive_viewer', 'unit_viewer', 'manager_respondent']))
    or organisation_id in (select private.support_org_ids())
  );

-- Grants -----------------------------------------------------------------------------------------

grant select on public.measurement_units to authenticated;
grant update (name, unit_leader_employee_id) on public.measurement_units to authenticated;
grant select on public.measurement_unit_members to authenticated;
grant select on public.measurement_unit_lineage to authenticated;

grant execute on function private.viewable_measurement_unit_ids() to authenticated;
grant execute on function private.can_view_measurement_unit(uuid) to authenticated;
grant execute on function public.combine_measurement_units(uuid, uuid[], text) to authenticated;
grant execute on function public.undo_measurement_unit(uuid, uuid) to authenticated;
grant execute on function public.keep_grouping_unit(uuid, uuid, boolean) to authenticated;
grant execute on function public.invitation_status_counts(uuid) to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
