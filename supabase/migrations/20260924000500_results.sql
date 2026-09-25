-- Milestone 5, step 3: what the close stores (PORTAL_BUILD_PLAN.md 2.6; Milestone 5 plan, 6.2 and 6.3).
--
-- One measurement cycle per campaign unit. A full cadence stores one calculation run: the engine
-- input the intake assembled, the engine's full result, the methodology the footer reads, the
-- seventeen sub-dimension scores, the composites with all fourteen ranking rows, the trip-wires and
-- the intake's unit-level aggregates, written in one transaction by store_calculation_run. A
-- quarterly pulse stores its aggregates and no run: it never recalculates P (Cadence Master 7.2).
--
-- Everything here is immutable once written, apart from a cycle's release. Administrators, the
-- account owner and staff under a session read every cycle; executive viewers read released cycles,
-- and unit viewers released cycles of the measurement units in their scope. Viewers never read the
-- engine input, the full engine result or the aggregates; they read a run's methodology, because
-- every results view carries the footer (Milestone 5 plan, D17). Suppression holds by construction:
-- a block below its threshold never reached the engine input, and per-team values are stored only
-- for teams that passed the team rule.

create table public.measurement_cycles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  campaign_unit_id uuid not null,
  measurement_unit_id uuid not null,
  kind text not null check (kind in ('baseline', 'quarterly_pulse', 'half_yearly', 'annual', 'event_triggered')),
  c3_source text check (c3_source in ('formal', 'module', 'none')),
  measured_on date not null,
  status text not null default 'under_review' check (status in ('under_review', 'released')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid,
  unique (organisation_id, id),
  unique (organisation_id, campaign_unit_id),
  foreign key (organisation_id, campaign_unit_id) references public.campaign_units (organisation_id, id),
  foreign key (organisation_id, measurement_unit_id) references public.measurement_units (organisation_id, id),
  check ((status = 'released') = (released_at is not null))
);
create index measurement_cycles_unit_idx on public.measurement_cycles (organisation_id, measurement_unit_id, measured_on);
comment on table public.measurement_cycles is
  'One per campaign unit: what a campaign measured for a measurement unit, and whether the '
  'administrator has released it to viewers.';

create table public.engine_inputs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  cycle_id uuid not null,
  input jsonb not null check (jsonb_typeof(input) = 'object'),
  intake_version text not null,
  created_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, cycle_id),
  foreign key (organisation_id, cycle_id) references public.measurement_cycles (organisation_id, id)
);
comment on table public.engine_inputs is
  'The engine''s UnitMeasurementInput as the intake assembled it. The next cycle carries forward '
  'from it, and projectImpact runs against it.';

create table public.calculation_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  cycle_id uuid not null,
  engine_version text not null,
  intake_version text not null,
  recommendations_version text,
  intake_input_sha256 text not null check (intake_input_sha256 ~ '^[0-9a-f]{64}$'),
  run_at timestamptz not null default now(),
  methodology jsonb not null check (jsonb_typeof(methodology) = 'object'),
  unique (organisation_id, id),
  unique (organisation_id, cycle_id),
  foreign key (organisation_id, cycle_id) references public.measurement_cycles (organisation_id, id)
);
comment on table public.calculation_runs is
  'Every released score traces to one run. The IntakeInput is not stored (it holds the raw rows); its '
  'digest lets a replay prove the run reproduces from the immutable inputs.';

create table public.calculation_run_details (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  run_id uuid not null,
  engine_result jsonb not null check (jsonb_typeof(engine_result) = 'object'),
  unique (organisation_id, id),
  unique (organisation_id, run_id),
  foreign key (organisation_id, run_id) references public.calculation_runs (organisation_id, id)
);

create table public.sub_dimension_scores (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  run_id uuid not null,
  code text not null check (
    code in ('C1', 'C2', 'C3', 'C4', 'C5', 'M1', 'M2', 'M3', 'M4', 'O1', 'O2', 'O3', 'O4', 'O5', 'S1', 'S2', 'S3')
  ),
  score numeric,
  status text not null check (status in ('reported', 'carried_forward', 'insufficient')),
  reason text,
  tier text,
  source text,
  vintage date,
  confidence text check (confidence in ('High', 'Medium', 'Low', 'n/a', '-')),
  band text check (band in ('Green', 'Amber', 'Red', 'Neutral')),
  weight numeric,
  normalised_weight numeric,
  structural numeric,
  perception numeric,
  gap numeric,
  gap_flag text,
  unique (organisation_id, id),
  unique (organisation_id, run_id, code),
  foreign key (organisation_id, run_id) references public.calculation_runs (organisation_id, id)
);

create table public.composite_scores (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  run_id uuid not null,
  c numeric,
  m numeric,
  o numeric,
  s_internal numeric not null,
  s numeric not null,
  p numeric,
  p_confidence text,
  binding_component text,
  statement text not null,
  trip_wire_override text,
  ranking jsonb not null check (jsonb_typeof(ranking) = 'array' and jsonb_array_length(ranking) = 14),
  top_six jsonb not null check (jsonb_typeof(top_six) = 'array'),
  weight_sums jsonb not null,
  unique (organisation_id, id),
  unique (organisation_id, run_id),
  foreign key (organisation_id, run_id) references public.calculation_runs (organisation_id, id)
);

create table public.trip_wire_results (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  run_id uuid not null,
  code text not null check (code in ('TW1', 'TW2', 'TW3')),
  mean numeric,
  score numeric,
  critical boolean not null,
  measured boolean not null,
  unique (organisation_id, id),
  unique (organisation_id, run_id, code),
  foreign key (organisation_id, run_id) references public.calculation_runs (organisation_id, id),
  check (measured or (score is null and not critical))
);

create table public.unit_aggregates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  cycle_id uuid not null,
  aggregates jsonb,
  instruments jsonb not null,
  screening jsonb not null,
  adjustments jsonb not null,
  c3_route jsonb,
  teams jsonb not null,
  pulse jsonb,
  unique (organisation_id, id),
  unique (organisation_id, cycle_id),
  foreign key (organisation_id, cycle_id) references public.measurement_cycles (organisation_id, id)
);
comment on table public.unit_aggregates is
  'The intake''s unit-level aggregates, instrument statuses, screening summaries, adjustments and '
  'C3 route record; team values only for teams that passed the team rule. At a pulse, the item '
  'means of the blocks that passed and the trip-wire means (pulse), for the trajectory layer.';

-- Immutability. A cycle changes once: its release.
create function private.guard_measurement_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     or old.status <> 'under_review' or new.status <> 'released'
     or (to_jsonb(new) - array['status', 'released_at', 'released_by'])
        is distinct from (to_jsonb(old) - array['status', 'released_at', 'released_by']) then
    raise exception 'a measurement cycle changes only by being released' using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$$;
create trigger measurement_cycles_guard before update or delete on public.measurement_cycles
  for each row execute function private.guard_measurement_cycle();
create trigger engine_inputs_guard before update or delete on public.engine_inputs
  for each row execute function private.refuse_change();
create trigger calculation_runs_guard before update or delete on public.calculation_runs
  for each row execute function private.refuse_change();
create trigger calculation_run_details_guard before update or delete on public.calculation_run_details
  for each row execute function private.refuse_change();
create trigger sub_dimension_scores_guard before update or delete on public.sub_dimension_scores
  for each row execute function private.refuse_change();
create trigger composite_scores_guard before update or delete on public.composite_scores
  for each row execute function private.refuse_change();
create trigger trip_wire_results_guard before update or delete on public.trip_wire_results
  for each row execute function private.refuse_change();
create trigger unit_aggregates_guard before update or delete on public.unit_aggregates
  for each row execute function private.refuse_change();

-- Who sees which cycle -------------------------------------------------------------------------------

create function private.visible_cycle_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.measurement_cycles c
  where c.organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
     or c.organisation_id in (select private.support_org_ids())
     or (c.status = 'released' and (
       c.organisation_id in (select private.org_ids(array['executive_viewer']))
       or (c.organisation_id in (select private.org_ids(array['unit_viewer']))
           and c.measurement_unit_id in (select private.viewable_measurement_unit_ids()))
     ))
$$;

create function private.visible_run_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id from public.calculation_runs r where r.cycle_id in (select private.visible_cycle_ids())
$$;

-- Storing a run (Milestone 5 plan, 6.1 step 4) ----------------------------------------------------

-- When the last unit of a closed campaign is stored, the campaign is under review and each
-- administrator and the account owner is told (copy C4).
create function private.finish_scoring(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;
  if v_campaign.status = 'closed' and not exists (
    select 1 from public.campaign_units cu
    where cu.campaign_id = p_campaign_id
      and not exists (select 1 from public.measurement_cycles c where c.campaign_unit_id = cu.id)
  ) then
    update public.campaigns set status = 'under_review' where id = p_campaign_id;
    insert into private.email_outbox (organisation_id, campaign_id, kind, recipient_user_id)
    select distinct v_campaign.organisation_id, p_campaign_id, 'scores_ready', m.user_id
    from public.org_memberships m
    where m.organisation_id = v_campaign.organisation_id and m.revoked_at is null
      and m.role in ('account_owner', 'administrator');
    perform private.record_event(v_campaign.organisation_id, 'results.ready_for_review', 'campaigns', p_campaign_id, null);
  end if;
end
$$;

create function private.cycle_for(p_campaign_unit_id uuid, p_payload jsonb, p_c3_source text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cu public.campaign_units;
  v_campaign public.campaigns;
  v_cycle uuid;
begin
  select * into v_cu from public.campaign_units where id = p_campaign_unit_id;
  if not found then
    perform private.invalid('no such campaign unit');
  end if;
  select * into v_campaign from public.campaigns where id = v_cu.campaign_id for update;
  if v_campaign.status <> 'closed' or v_campaign.responses_rewritten_at is null then
    perform private.invalid('a result is stored for a closed campaign whose responses have been rewritten');
  end if;
  if exists (select 1 from public.measurement_cycles where campaign_unit_id = v_cu.id) then
    perform private.invalid('this campaign unit already has its result');
  end if;
  insert into public.measurement_cycles (organisation_id, campaign_unit_id, measurement_unit_id, kind, c3_source, measured_on)
  values (v_cu.organisation_id, v_cu.id, v_cu.measurement_unit_id, v_campaign.cadence, p_c3_source,
          (p_payload #>> '{cycle,measuredOn}')::date)
  returning id into v_cycle;
  update public.campaign_units set scoring_error = null where id = v_cu.id;
  return v_cycle;
end
$$;

-- The whole result of one unit, in one transaction: the cycle, the engine input, the run with its
-- methodology and the engine's full result, the seventeen scores, the composites and ranking, the
-- trip-wires and the aggregates. Only the service role runs it, from the close job.
create function public.store_calculation_run(p_campaign_unit_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_cycle uuid;
  v_run uuid;
  v_campaign_id uuid;
begin
  select organisation_id, campaign_id into v_org, v_campaign_id from public.campaign_units where id = p_campaign_unit_id;
  if (select cadence from public.campaigns where id = v_campaign_id) = 'quarterly_pulse' then
    perform private.invalid('a pulse stores its aggregates and never a run');
  end if;
  if jsonb_array_length(coalesce(p_payload -> 'subDimensions', '[]'::jsonb)) <> 17
     or jsonb_array_length(coalesce(p_payload -> 'tripWires', '[]'::jsonb)) <> 3 then
    perform private.invalid('a run holds seventeen sub-dimensions and three trip-wires');
  end if;
  v_cycle := private.cycle_for(p_campaign_unit_id, p_payload, p_payload #>> '{cycle,c3Source}');

  insert into public.engine_inputs (organisation_id, cycle_id, input, intake_version)
  values (v_org, v_cycle, p_payload -> 'engineInput', p_payload ->> 'intakeVersion');
  insert into public.calculation_runs (
    organisation_id, cycle_id, engine_version, intake_version, intake_input_sha256, methodology
  ) values (
    v_org, v_cycle, p_payload ->> 'engineVersion', p_payload ->> 'intakeVersion',
    p_payload ->> 'intakeInputSha256', p_payload -> 'methodology'
  )
  returning id into v_run;
  insert into public.calculation_run_details (run_id, organisation_id, engine_result)
  values (v_run, v_org, p_payload -> 'engineResult');

  insert into public.sub_dimension_scores (
    organisation_id, run_id, code, score, status, reason, tier, source, vintage, confidence, band,
    weight, normalised_weight, structural, perception, gap, gap_flag
  )
  select v_org, v_run, s ->> 'code', (s ->> 'score')::numeric, s ->> 'status', s ->> 'reason', s ->> 'tier',
         s ->> 'source', (s ->> 'vintage')::date, s ->> 'confidence', s ->> 'band', (s ->> 'weight')::numeric,
         (s ->> 'normalisedWeight')::numeric, (s ->> 'structural')::numeric, (s ->> 'perception')::numeric,
         (s ->> 'gap')::numeric, s ->> 'gapFlag'
  from jsonb_array_elements(p_payload -> 'subDimensions') s;

  insert into public.composite_scores (
    run_id, organisation_id, c, m, o, s_internal, s, p, p_confidence, binding_component, statement,
    trip_wire_override, ranking, top_six, weight_sums
  )
  select v_run, v_org, (x ->> 'c')::numeric, (x ->> 'm')::numeric, (x ->> 'o')::numeric,
         (x ->> 'sInternal')::numeric, (x ->> 's')::numeric, (x ->> 'p')::numeric, x ->> 'pConfidence',
         x ->> 'bindingComponent', x ->> 'statement', x ->> 'tripWireOverride', x -> 'ranking', x -> 'topSix',
         x -> 'weightSums'
  from (select p_payload -> 'composite' as x) c;

  insert into public.trip_wire_results (organisation_id, run_id, code, mean, score, critical, measured)
  select v_org, v_run, t ->> 'code', (t ->> 'mean')::numeric, (t ->> 'score')::numeric,
         (t ->> 'critical')::boolean, (t ->> 'measured')::boolean
  from jsonb_array_elements(p_payload -> 'tripWires') t;

  insert into public.unit_aggregates (cycle_id, organisation_id, aggregates, instruments, screening, adjustments, c3_route, teams)
  values (
    v_cycle, v_org, p_payload #> '{aggregates,aggregates}', p_payload #> '{aggregates,instruments}',
    p_payload #> '{aggregates,screening}', p_payload #> '{aggregates,adjustments}',
    p_payload #> '{aggregates,c3Route}', p_payload #> '{aggregates,teams}'
  );

  perform private.record_event(v_org, 'results.calculated', 'calculation_runs', v_run,
    jsonb_build_object('cycle_id', v_cycle, 'engine_version', p_payload ->> 'engineVersion',
                       'intake_version', p_payload ->> 'intakeVersion'));
  perform private.finish_scoring(v_campaign_id);
  return v_run;
end
$$;

-- A pulse: the cycle and its aggregates, no run and no P (Cadence Master 7.2).
create function public.store_pulse_result(p_campaign_unit_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_cycle uuid;
  v_campaign_id uuid;
begin
  select organisation_id, campaign_id into v_org, v_campaign_id from public.campaign_units where id = p_campaign_unit_id;
  if (select cadence from public.campaigns where id = v_campaign_id) is distinct from 'quarterly_pulse' then
    perform private.invalid('only a pulse stores aggregates without a run');
  end if;
  v_cycle := private.cycle_for(p_campaign_unit_id, p_payload, null);
  insert into public.unit_aggregates (cycle_id, organisation_id, aggregates, instruments, screening, adjustments, c3_route, teams, pulse)
  values (
    v_cycle, v_org, null, p_payload #> '{aggregates,instruments}', p_payload #> '{aggregates,screening}',
    coalesce(p_payload #> '{aggregates,adjustments}', '[]'::jsonb), null,
    coalesce(p_payload #> '{aggregates,teams}', '[]'::jsonb), p_payload #> '{aggregates,pulse}'
  );
  perform private.record_event(v_org, 'results.calculated', 'measurement_cycles', v_cycle,
    jsonb_build_object('pulse', true));
  perform private.finish_scoring(v_campaign_id);
  return v_cycle;
end
$$;

-- A unit whose scoring threw: the error code, for the next run and the Owner (plan 6.1 step 5).
create function public.record_scoring_error(p_campaign_unit_id uuid, p_code text)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.campaign_units
  set scoring_attempts = scoring_attempts + 1, scoring_error = left(p_code, 200)
  where id = p_campaign_unit_id
  returning scoring_attempts
$$;

-- Release (Milestone 5 plan, 6.3; D16) ----------------------------------------------------------------

-- An administrator or the account owner, at aal2, releases a campaign's units under review, all of
-- them or those named. Staff under a session do not release: releasing is the client's decision.
-- Allowed in grace (D22). The campaign reads released once every unit is.
create function public.release_cycles(p_campaign_id uuid, p_measurement_unit_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns;
  v_count integer;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or not (private.is_org_admin(v_campaign.organisation_id) and private.org_readable(v_campaign.organisation_id)) then
    perform private.refuse('results are released by an administrator or the account owner');
  end if;
  if v_campaign.status <> 'under_review' then
    perform private.invalid('only a campaign under review has results to release');
  end if;
  update public.measurement_cycles c
  set status = 'released', released_at = now(), released_by = auth.uid()
  from public.campaign_units cu
  where cu.organisation_id = c.organisation_id and cu.id = c.campaign_unit_id and cu.campaign_id = p_campaign_id
    and c.status = 'under_review'
    and (p_measurement_unit_ids is null or c.measurement_unit_id = any (p_measurement_unit_ids));
  get diagnostics v_count = row_count;
  if v_count = 0 then
    perform private.invalid('nothing to release');
  end if;
  perform private.record_event(v_campaign.organisation_id, 'results.released', 'campaigns', p_campaign_id,
    jsonb_build_object('units', v_count));
  if not exists (
    select 1 from public.measurement_cycles c
    join public.campaign_units cu on cu.organisation_id = c.organisation_id and cu.id = c.campaign_unit_id
    where cu.campaign_id = p_campaign_id and c.status = 'under_review'
  ) then
    update public.campaigns set status = 'released' where id = p_campaign_id;
  end if;
  return v_count;
end
$$;

-- Row level security ------------------------------------------------------------------------------

alter table public.measurement_cycles enable row level security;
alter table public.engine_inputs enable row level security;
alter table public.calculation_runs enable row level security;
alter table public.calculation_run_details enable row level security;
alter table public.sub_dimension_scores enable row level security;
alter table public.composite_scores enable row level security;
alter table public.trip_wire_results enable row level security;
alter table public.unit_aggregates enable row level security;

create policy measurement_cycles_select on public.measurement_cycles for select to authenticated
  using (id in (select private.visible_cycle_ids()));
create policy calculation_runs_select on public.calculation_runs for select to authenticated
  using (id in (select private.visible_run_ids()));
create policy sub_dimension_scores_select on public.sub_dimension_scores for select to authenticated
  using (run_id in (select private.visible_run_ids()));
create policy composite_scores_select on public.composite_scores for select to authenticated
  using (run_id in (select private.visible_run_ids()));
create policy trip_wire_results_select on public.trip_wire_results for select to authenticated
  using (run_id in (select private.visible_run_ids()));

-- What viewers never read: the engine input, the full engine result and the aggregates.
create policy engine_inputs_select on public.engine_inputs for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy calculation_run_details_select on public.calculation_run_details for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );
create policy unit_aggregates_select on public.unit_aggregates for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.support_org_ids())
  );

grant select on public.measurement_cycles to authenticated;
grant select on public.engine_inputs to authenticated;
grant select on public.calculation_runs to authenticated;
grant select on public.calculation_run_details to authenticated;
grant select on public.sub_dimension_scores to authenticated;
grant select on public.composite_scores to authenticated;
grant select on public.trip_wire_results to authenticated;
grant select on public.unit_aggregates to authenticated;

grant execute on function private.visible_cycle_ids() to authenticated;
grant execute on function private.visible_run_ids() to authenticated;
grant execute on function public.release_cycles(uuid, uuid[]) to authenticated;
grant execute on function public.store_calculation_run(uuid, jsonb) to service_role;
grant execute on function public.store_pulse_result(uuid, jsonb) to service_role;
grant execute on function public.record_scoring_error(uuid, text) to service_role;

-- Audit: a cycle's release is imaged; a run's identity is recorded with its insert.
insert into private.audit_image_columns (table_name, column_name) values
  ('measurement_cycles', 'id'), ('measurement_cycles', 'campaign_unit_id'),
  ('measurement_cycles', 'measurement_unit_id'), ('measurement_cycles', 'status'),
  ('measurement_cycles', 'released_at'), ('measurement_cycles', 'released_by');

create trigger measurement_cycles_audit after insert or update on public.measurement_cycles
  for each row execute function private.audit_row_change();

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
