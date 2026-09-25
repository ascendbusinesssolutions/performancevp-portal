-- Milestone 5, step 3: the campaign engine's schema (Milestone 5 plan, Sections 2 to 4 and 6).
--
-- The campaign lifecycle and its schedule; what a launch freezes (the audiences, the team keys, the
-- unit context, the scale map); invitations that never record whether anyone responded, and the
-- live survey tokens whose deletion is what makes a token single use (plan 4.1, D4); the anonymous
-- responses with their snapshot team key and the leadership module's role answers; the
-- administrator checklists; the manager rating guard over the frozen context; and retire-and-lineage
-- for measurement units a campaign has measured.
--
-- Anonymity (CLAUDE.md Section 4; Milestone 3 plan, Section 4): the anonymous tables are reached
-- only through two functions, ingest_survey_response and close_campaign_responses. Nothing about a
-- response records a time or a person; no invitation records that its person responded; a live
-- token names a campaign unit and an audience and nothing else, and the database cannot map it to
-- an invitation without SURVEY_TOKEN_SECRET, which it never holds. None of these tables carries an
-- audit trigger, because an audit row carries a time and an actor.

-- The lifecycle ----------------------------------------------------------------------------------

alter table public.campaigns drop constraint campaigns_status_check;
alter table public.campaigns
  add constraint campaigns_status_check check (
    status in ('draft', 'scheduled', 'open', 'closed', 'under_review', 'released', 'cancelled')
  ),
  add column name text check (name is null or (btrim(name) <> '' and length(name) <= 120)),
  add column pulse_rotation smallint check (pulse_rotation between 1 and 4),
  add column event_trigger text references public.ref_event_triggers (code),
  add column created_by uuid,
  add column approved_by uuid,
  add column approved_at timestamptz,
  add column setup_version bigint,
  add column launch_blockers jsonb,
  add column tokens_issued_at timestamptz,
  add column settled_at timestamptz,
  add column responses_rewritten_at timestamptz,
  add check (opens_at is null or closes_at is null or opens_at < closes_at),
  add check ((cadence = 'quarterly_pulse') = (pulse_rotation is not null)),
  add check ((cadence = 'event_triggered') = (event_trigger is not null)),
  add check (status <> 'scheduled' or (approved_at is not null and opens_at is not null and closes_at is not null));
comment on column public.campaigns.pulse_rotation is
  'The Survey Blueprint rotation row a quarterly pulse deploys: the organisation''s pulse count, '
  'cycling 1 to 4, fixed at creation (Milestone 5 plan, D6).';
comment on column public.campaigns.setup_version is
  'The organisation''s setup version the launch''s readiness read saw (Milestone 5 plan, D27).';

-- Only these moves; everything else about a campaign after launch is fixed.
create function private.guard_campaign()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and (old.status, new.status) not in (
    ('draft', 'scheduled'), ('scheduled', 'draft'), ('draft', 'open'), ('scheduled', 'open'),
    ('draft', 'cancelled'), ('scheduled', 'cancelled'), ('open', 'closed'), ('closed', 'under_review'),
    ('under_review', 'released')
  ) then
    raise exception 'a campaign cannot move from % to %', old.status, new.status using errcode = 'check_violation';
  end if;
  if new.organisation_id <> old.organisation_id or new.cadence <> old.cadence
     or new.event_trigger is distinct from old.event_trigger
     or (old.status not in ('draft', 'scheduled') and (
       new.pulse_rotation is distinct from old.pulse_rotation
       or new.launched_at is distinct from old.launched_at
       or new.setup_version is distinct from old.setup_version
       or new.opens_at is distinct from old.opens_at
     )) then
    raise exception 'a launched campaign keeps its cadence, trigger, rotation and launch' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger campaigns_guard before update on public.campaigns
  for each row execute function private.guard_campaign();

alter table public.campaign_units
  add column headcount integer check (headcount >= 0),
  add column fte numeric(8, 3) check (fte >= 0),
  add column c3_route text check (c3_route in ('formal', 'module')),
  add column scoring_attempts integer not null default 0 check (scoring_attempts >= 0),
  add column scoring_error text;

-- The cadence calendar (Milestone 5 plan, 2.2): proposals written when a baseline or annual
-- launches, each opened only once an administrator approves it.
create table public.campaign_schedule (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  anchor_campaign_id uuid not null,
  cadence text not null check (cadence in ('quarterly_pulse', 'half_yearly', 'annual')),
  due_on date not null,
  status text not null default 'proposed' check (status in ('proposed', 'scheduled', 'dismissed')),
  campaign_id uuid,
  noticed_at timestamptz,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, anchor_campaign_id, cadence, due_on),
  foreign key (organisation_id, anchor_campaign_id) references public.campaigns (organisation_id, id),
  foreign key (organisation_id, campaign_id) references public.campaigns (organisation_id, id),
  check ((status = 'scheduled') = (campaign_id is not null))
);
comment on table public.campaign_schedule is
  'The cadence calendar: pulse at 3 months, half-yearly at 6, pulse at 9, annual at 12 from each '
  'baseline or annual (Cadence Master 7.7, refreshed 24 September 2026).';

-- The setup version (Milestone 5 plan, D27) --------------------------------------------------------

-- Bumped by every write to a readiness input, in the writer's transaction. The launch locks the row,
-- so it waits for any write in flight, and refuses when the version moved after readiness read it.
-- Not an audit table, and not silenced by the purge's audit suppression.
create table private.setup_versions (
  organisation_id uuid primary key references public.organisations (id),
  version bigint not null default 0
);

create function private.bump_setup_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := coalesce((to_jsonb(new) ->> 'organisation_id')::uuid, (to_jsonb(old) ->> 'organisation_id')::uuid);
begin
  insert into private.setup_versions (organisation_id, version) values (v_org, 1)
  on conflict (organisation_id) do update set version = private.setup_versions.version + 1;
  return null;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'employees', 'formal_ratings', 'business_units', 'teams', 'role_families', 'skills',
    'knowledge_domains', 'decision_types', 'critical_processes', 'primary_systems',
    'measurement_units', 'measurement_unit_members', 'rating_scale_maps', 'rating_scale_map_entries'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.bump_setup_version()',
      v_table || '_setup_version', v_table
    );
  end loop;
end
$$;

create function public.setup_version(p_organisation_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select version from private.setup_versions where organisation_id = p_organisation_id), 0)
$$;

-- What a launch freezes ------------------------------------------------------------------------

-- The scale map, beside the snapshot's formal ratings (Milestone 4 decision: the snapshot freezes
-- the map). Read like the live map, by the people who manage the directory.
create table public.snapshot_scale_maps (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  snapshot_id uuid not null,
  decision text not null check (decision in ('mapped', 'skipped')),
  calibrated boolean,
  unique (organisation_id, id),
  unique (organisation_id, snapshot_id),
  foreign key (organisation_id, snapshot_id) references public.directory_snapshots (organisation_id, id)
);
create table public.snapshot_scale_map_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  snapshot_scale_map_id uuid not null,
  label text not null,
  band smallint not null check (band between 1 and 5),
  unique (organisation_id, id),
  unique (organisation_id, snapshot_scale_map_id, label),
  foreign key (organisation_id, snapshot_scale_map_id) references public.snapshot_scale_maps (organisation_id, id)
);

-- The team keys a campaign unit's members choose from (Milestone 5 plan, 3.2): each unit's own
-- teams, one entry for a constituent without teams (E7 as amended), and one for people without a
-- team in a unit with teams (D21). A key exists only for this campaign unit.
create table public.campaign_teams (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  name text not null check (btrim(name) <> ''),
  team_id uuid,
  business_unit_id uuid not null,
  kind text not null check (kind in ('team', 'unit')),
  headcount integer not null check (headcount >= 0),
  fte numeric(8, 3) not null check (fte >= 0),
  position integer not null check (position > 0),
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id, position),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  foreign key (organisation_id, team_id) references public.teams (organisation_id, id),
  foreign key (organisation_id, business_unit_id) references public.business_units (organisation_id, id),
  check ((kind = 'team') = (team_id is not null))
);
comment on table public.campaign_teams is
  'The frozen team keys of a campaign unit. A response names one only where the team has four or '
  'more people (Milestone 5 plan, D5): a smaller team can never meet the team floor.';

-- The unit context the campaign asks and scores against: the intake's UnitContext (role families
-- with skills, knowledge domains, decision types, processes, systems, the team keys) and the
-- position titles M-O1-LT offers, each with a key that exists only for this campaign unit.
create table public.campaign_unit_contexts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  context jsonb not null check (jsonb_typeof(context) = 'object'),
  positions jsonb not null check (jsonb_typeof(positions) = 'array'),
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id)
);

-- What each audience of a campaign unit is asked (the intake's Deployment, frozen), and at close how
-- many were asked and how many responded (the counts outlive the invitations).
create table public.campaign_audiences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  audience text not null check (
    audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team', 'managers', 'admin_checklists')
  ),
  items text[] not null default '{}',
  process_ids uuid[] not null default '{}',
  issued integer check (issued >= 0),
  responded integer check (responded >= 0),
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id, audience),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  check (responded is null or responded <= issued)
);
comment on column public.campaign_audiences.items is
  'Part A or Part B item codes, C5L items, the manager modules (c1, c2, c3) or the checklists.';

-- Who was in each audience, as frozen at launch: the members (with their team key), the team
-- leaders, the leadership team (a leader from a unit above included) and the managers. Who was
-- asked, never who responded.
create table public.campaign_audience_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  audience text not null check (audience in ('members', 'team_leaders', 'leadership_team', 'managers')),
  snapshot_member_id uuid not null,
  campaign_team_id uuid,
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id, audience, snapshot_member_id),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  foreign key (organisation_id, snapshot_member_id) references public.snapshot_members (organisation_id, id),
  foreign key (organisation_id, campaign_team_id) references public.campaign_teams (organisation_id, id),
  check ((audience = 'members') = (campaign_team_id is not null))
);
create index campaign_audience_members_member_idx
  on public.campaign_audience_members (organisation_id, snapshot_member_id);

create trigger snapshot_scale_maps_guard before update or delete on public.snapshot_scale_maps
  for each row execute function private.refuse_change();
create trigger snapshot_scale_map_entries_guard before update or delete on public.snapshot_scale_map_entries
  for each row execute function private.refuse_change();
create trigger campaign_teams_guard before update or delete on public.campaign_teams
  for each row execute function private.refuse_change();
create trigger campaign_unit_contexts_guard before update or delete on public.campaign_unit_contexts
  for each row execute function private.refuse_change();
create trigger campaign_audience_members_guard before update or delete on public.campaign_audience_members
  for each row execute function private.refuse_change();

-- An audience's deployment is fixed; only its closing counts are written, once.
create function private.guard_campaign_audience()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     or (to_jsonb(new) - array['issued', 'responded']) is distinct from (to_jsonb(old) - array['issued', 'responded'])
     or old.issued is not null then
    raise exception 'campaign_audiences rows never change' using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$$;
create trigger campaign_audiences_guard before update or delete on public.campaign_audiences
  for each row execute function private.guard_campaign_audience();

-- Invitations and live tokens (Milestone 5 plan, 4.1; D4) ---------------------------------------

-- An invitation says whom to ask, and never whether they answered. Its token is derived from its id
-- and salt with SURVEY_TOKEN_SECRET, so the database holds neither the token nor its hash. The
-- existing rows are fixture rows only: invitations have never been issued.
delete from public.invitations;
alter table public.invitations drop column token_hash;
alter table public.invitations drop constraint invitations_status_check;
alter table public.invitations
  add column token_salt text not null default encode(extensions.gen_random_bytes(16), 'hex')
    check (token_salt ~ '^[0-9a-f]{32}$'),
  add constraint invitations_status_check check (status in ('issued', 'sent', 'bounced'));
comment on table public.invitations is
  'Whom each campaign unit''s anonymous audiences ask. No token, no hash, and no record of a '
  'response (Milestone 5 plan, D4). Deleted at close, once the counts are recorded.';

-- The live tokens: a hash per unanswered invitation, written in one shuffled batch before the first
-- email, and deleted by the submission that spends it. Nothing here names an invitation.
create table private.survey_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  audience text not null check (audience in ('members_part_a', 'members_part_b', 'team_leaders', 'leadership_team')),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id)
);
create index survey_tokens_unit_idx on private.survey_tokens (campaign_unit_id, audience);

-- The email outbox: what to send, never a token or a body (plan 5.2). Deleted at close.
create table private.email_outbox (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_id uuid,
  kind text not null check (
    kind in (
      'survey_invitation', 'survey_reminder', 'manager_invitation', 'manager_reminder',
      'checklist_reminder', 'schedule_notice', 'launch_refused', 'scores_ready'
    )
  ),
  recipient_snapshot_member_id uuid,
  recipient_user_id uuid,
  invitation_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  foreign key (organisation_id, campaign_id) references public.campaigns (organisation_id, id),
  check (recipient_snapshot_member_id is not null or recipient_user_id is not null)
);
create index email_outbox_pending_idx on private.email_outbox (status, created_at) where status in ('pending', 'sending');

-- Anonymous responses: the snapshot team key and the leadership module's answers ------------------

-- The self-selected team becomes a key of this campaign unit's frozen teams (E7), named only on
-- Part A and only for a team of four or more (D5). The existing rows are fixture rows only.
delete from public.survey_item_responses;
delete from public.survey_responses;
alter table public.survey_responses drop constraint survey_responses_organisation_id_team_id_fkey;
alter table public.survey_responses drop constraint survey_responses_check;
alter table public.survey_responses rename column team_id to campaign_team_id;
alter table public.survey_responses
  add foreign key (organisation_id, campaign_team_id) references public.campaign_teams (organisation_id, id),
  add check (campaign_team_id is null or audience = 'members_part_a');

-- The clarity item of M-O1-LT is answered per decision type.
alter table public.survey_item_responses add column decision_type_id uuid;
alter table public.survey_item_responses drop constraint survey_item_responses_organisation_id_response_id_item_code_key;
alter table public.survey_item_responses
  add constraint survey_item_responses_answer_key
    unique nulls not distinct (organisation_id, response_id, item_code, process_id, decision_type_id),
  add check (process_id is null or decision_type_id is null);

-- M-O1-LT's RAPID answers: per decision type and role, a position key of this campaign unit or
-- "unclear or varies"; several rows where a role takes several positions (Module Library 3.1).
create table public.survey_role_answers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  response_id uuid not null,
  decision_type_id uuid not null,
  role text not null check (role in ('recommend', 'agree', 'perform', 'input', 'decides')),
  position_id uuid,
  unique (organisation_id, id),
  unique nulls not distinct (organisation_id, response_id, decision_type_id, role, position_id),
  foreign key (organisation_id, response_id) references public.survey_responses (organisation_id, id)
);
comment on table public.survey_role_answers is
  'Anonymous. The leadership module''s role answers; a null position is "unclear or varies". No Data '
  'API role holds any privilege on it.';
alter table public.survey_role_answers enable row level security;

-- Old row versions go as soon as they are dead (Milestone 5 plan, D3): after the rewrite at close,
-- after a token is spent, after invitations are deleted.
alter table public.survey_responses set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 1);
alter table public.survey_item_responses set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 1);
alter table public.survey_role_answers set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 1);
alter table public.invitations set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 1);
alter table private.survey_tokens set (autovacuum_vacuum_scale_factor = 0, autovacuum_vacuum_threshold = 1);

-- The administrator checklists (Online Measurement Specification 4.2, 4.3, 4.3a) --------------

-- Each save is a new version; the close uses the latest. Answers are keyed by the frozen context's
-- role families (ADM-O1) and systems (ADM-O2); ADM-O4 holds up to five figures.
create table public.checklist_responses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  checklist_code text not null references public.ref_admin_checklists (code),
  version integer not null check (version > 0),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  entered_by uuid,
  entered_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id, checklist_code, version),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id)
);
create trigger checklist_responses_guard before update or delete on public.checklist_responses
  for each row execute function private.refuse_change();
