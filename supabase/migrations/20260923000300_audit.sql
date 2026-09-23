-- Milestone 3, step 3: the audit trail, and the identity functions that write to it.
--
-- Two mechanisms (CLAUDE.md Section 4; PORTAL_BUILD_PLAN.md 2.8; Milestone 3 plan, Section 6).
-- Row triggers record who changed which columns of which row, copying values into the before and
-- after images only for columns in private.audit_image_columns. Semantic events are written by the
-- functions that perform them. Nobody can change or remove an entry: no Data API role holds a
-- write privilege, and a trigger refuses update, delete and truncate for every role, the owner
-- included. (Milestone 9's organisation deletion will add the one exception, with its function.)
--
-- The actor is the signed-in person, or, for a service-role function acting on a person's behalf,
-- the person that function names. Staff actions carry the support session they were made under,
-- so the client sees exactly what was done in each session.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organisation_id uuid,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_kind text not null check (actor_kind in ('client', 'manager', 'support', 'owner', 'system')),
  support_session_id uuid,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text,
  entity_id uuid,
  changed_columns text[],
  before jsonb,
  after jsonb,
  detail jsonb
);
create index audit_logs_organisation_idx on public.audit_logs (organisation_id, occurred_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, occurred_at desc);
create index audit_logs_session_idx on public.audit_logs (support_session_id) where support_session_id is not null;
comment on table public.audit_logs is
  'Append-only. Row changes and semantic events. Values appear in images only for allowlisted '
  'columns (private.audit_image_columns); rating values never do.';

-- Who is acting ----------------------------------------------------------------------------------

-- The acting user: the signed-in person, or the person a service-role function names through the
-- transaction-local app.actor_user_id (set only by service-role functions; no Data API role can
-- set a configuration parameter).
create function private.acting_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.uid(), nullif(current_setting('app.actor_user_id', true), '')::uuid)
$$;

create function private.actor_for(p_organisation_id uuid)
returns table (user_id uuid, kind text, support_session_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := private.acting_user_id();
  v_profile public.profiles;
begin
  if v_user is null then
    return query select null::uuid, 'system'::text, null::uuid;
    return;
  end if;
  select * into v_profile from public.profiles where id = v_user;
  if v_profile.is_owner or v_profile.is_support_staff then
    return query
      select v_user,
             case when v_profile.is_owner then 'owner' else 'support' end,
             (select s.id from public.support_sessions s
              where s.staff_user_id = v_user and s.organisation_id = p_organisation_id
                and s.ended_at is null and s.expires_at > now()
              order by s.started_at desc limit 1);
    return;
  end if;
  if exists (
    select 1 from public.org_memberships m
    where m.user_id = v_user and m.organisation_id = p_organisation_id and m.revoked_at is null
      and m.role = 'manager_respondent'
  ) and not exists (
    select 1 from public.org_memberships m
    where m.user_id = v_user and m.organisation_id = p_organisation_id and m.revoked_at is null
      and m.role <> 'manager_respondent'
  ) then
    return query select v_user, 'manager'::text, null::uuid;
    return;
  end if;
  return query select v_user, 'client'::text, null::uuid;
end
$$;

-- The event writer ---------------------------------------------------------------------------------

create function private.record_event(
  p_organisation_id uuid,
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
begin
  select * into v_actor from private.actor_for(p_organisation_id);
  insert into public.audit_logs (
    organisation_id, actor_user_id, actor_kind, support_session_id, action, entity_type, entity_id, detail
  ) values (
    p_organisation_id, v_actor.user_id, v_actor.kind, v_actor.support_session_id, p_action,
    p_entity_type, p_entity_id, p_detail
  );
end
$$;

-- The row trigger ----------------------------------------------------------------------------------

create function private.allowlisted(p_image jsonb, p_table text, p_keys text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_object_agg(e.key, e.value)
  from jsonb_each(p_image) as e
  where e.key = any (p_keys)
    and e.key in (select c.column_name from private.audit_image_columns c where c.table_name = p_table)
$$;

create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_org uuid;
  v_changed text[];
  v_actor record;
begin
  -- The directory purge clears links through cascades and records one event with its counts
  -- instead of one entry per cleared link (step 5).
  if current_setting('app.suppress_row_audit', true) = 'on' then
    return null;
  end if;

  v_org := case
    when tg_table_name = 'organisations' then (v_row ->> 'id')::uuid
    else (v_row ->> 'organisation_id')::uuid
  end;

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_changed
    from jsonb_object_keys(v_new) as k
    where v_new -> k is distinct from v_old -> k;
    if v_changed is null then
      return null;
    end if;
  else
    select array_agg(k order by k) into v_changed
    from jsonb_each(v_row) as e (k, v)
    where e.v <> 'null'::jsonb;
  end if;

  select * into v_actor from private.actor_for(v_org);

  insert into public.audit_logs (
    organisation_id, actor_user_id, actor_kind, support_session_id, action, entity_type, entity_id,
    changed_columns, before, after
  ) values (
    v_org, v_actor.user_id, v_actor.kind, v_actor.support_session_id,
    'row.' || lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid, v_changed,
    case when v_old is not null then private.allowlisted(v_old, tg_table_name, v_changed) end,
    case when v_new is not null then private.allowlisted(v_new, tg_table_name, v_changed) end
  );
  return null;
end
$$;

-- Immutability -----------------------------------------------------------------------------------

create function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit entries cannot be changed or removed'
    using errcode = 'insufficient_privilege';
end
$$;

create trigger audit_logs_no_update_or_delete
  before update or delete on public.audit_logs
  for each row execute function private.audit_logs_immutable();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.audit_logs_immutable();

-- Row audit on the step 2 tables, and what their images may carry --------------------------------

insert into private.audit_image_columns (table_name, column_name) values
  ('organisations', 'id'), ('organisations', 'name'), ('organisations', 'anzsic_division'),
  ('organisations', 'anzsic_class'), ('organisations', 'size_band'),
  ('organisations', 'data_contribution_opt_out'),
  ('subscriptions', 'id'), ('subscriptions', 'employee_band'), ('subscriptions', 'period_start'),
  ('subscriptions', 'period_end'), ('subscriptions', 'agreement_date'),
  ('subscriptions', 'invoice_reference'), ('subscriptions', 'state_override'),
  ('subscriptions', 'override_reason'),
  ('profiles', 'id'), ('profiles', 'is_owner'), ('profiles', 'is_support_staff'),
  ('org_memberships', 'id'), ('org_memberships', 'user_id'), ('org_memberships', 'role'),
  ('org_memberships', 'employee_id'), ('org_memberships', 'revoked_at'),
  ('membership_invitations', 'id'), ('membership_invitations', 'role'),
  ('membership_invitations', 'unit_ids'), ('membership_invitations', 'claimed_at'),
  ('support_sessions', 'id'), ('support_sessions', 'staff_user_id'),
  ('support_sessions', 'staff_name'), ('support_sessions', 'kind'), ('support_sessions', 'reason'),
  ('support_sessions', 'started_at'), ('support_sessions', 'expires_at'),
  ('support_sessions', 'ended_at');

create trigger organisations_audit after insert or update or delete on public.organisations
  for each row execute function private.audit_row_change();
create trigger subscriptions_audit after insert or update or delete on public.subscriptions
  for each row execute function private.audit_row_change();
-- Profiles: only the staff designations are audited; names and email follow the person.
create trigger profiles_audit after update of is_owner, is_support_staff on public.profiles
  for each row execute function private.audit_row_change();
create trigger org_memberships_audit after insert or update or delete on public.org_memberships
  for each row execute function private.audit_row_change();
create trigger membership_invitations_audit after insert or update or delete on public.membership_invitations
  for each row execute function private.audit_row_change();
create trigger support_sessions_audit after insert or update or delete on public.support_sessions
  for each row execute function private.audit_row_change();

-- Reading the log ------------------------------------------------------------------------------------

alter table public.audit_logs enable row level security;

-- An organisation's administrators read its entries, every staff entry included; the account owner
-- also in suspension. The Owner reads platform events and the entries made by staff.
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (
    organisation_id in (select private.org_ids(array['account_owner', 'administrator']))
    or organisation_id in (select private.account_owner_org_ids())
    or (
      (select private.is_owner())
      and (organisation_id is null or actor_kind in ('support', 'owner'))
    )
  );

grant select on public.audit_logs to authenticated;

-- Identity functions -----------------------------------------------------------------------------

-- A refusal reads as a privilege error, so the application and the tests see one kind of "no".
create function private.refuse(p_message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = 'insufficient_privilege';
end
$$;

create function private.invalid(p_message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_message using errcode = 'invalid_parameter_value';
end
$$;

create function private.normalise_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(p_email))
$$;

-- Grants a client role to an address: a membership straight away when the address already has an
-- account, otherwise an invitation claimed when the account is created. Returns whether the
-- address still needs an account, which only the server uses; the person granting access sees
-- the same message either way. Unit scopes arrive with units (step 4).
create function private.grant_access(
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
  v_profile public.profiles;
  v_membership_id uuid;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    perform private.invalid('not an email address');
  end if;
  if p_role not in ('account_owner', 'administrator', 'executive_viewer', 'unit_viewer') then
    perform private.invalid('this role cannot be granted');
  end if;
  if p_role = 'unit_viewer' then
    perform private.invalid('unit viewers are granted with their units, which arrive with the unit structure');
  end if;
  if cardinality(coalesce(p_unit_ids, '{}')) > 0 then
    perform private.invalid('only unit viewers carry unit scopes');
  end if;

  select * into v_profile from public.profiles where lower(email) = v_email;
  if found then
    if v_profile.is_owner or v_profile.is_support_staff then
      perform private.invalid('PerformanceVP staff reach client data through support sessions, not memberships');
    end if;
    if exists (
      select 1 from public.org_memberships
      where organisation_id = p_organisation_id and user_id = v_profile.id and role = p_role
        and revoked_at is null
    ) then
      return false;
    end if;
    insert into public.org_memberships (organisation_id, user_id, role, granted_by)
    values (p_organisation_id, v_profile.id, p_role, private.acting_user_id())
    returning id into v_membership_id;
    return false;
  end if;

  insert into public.membership_invitations (organisation_id, email, role, invited_by)
  values (p_organisation_id, v_email, p_role, private.acting_user_id())
  on conflict (organisation_id, lower(email), role) where claimed_at is null do nothing;
  return true;
end
$$;

-- Invitations are claimed when the auth user, and so the profile, is created.
create function private.claim_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.membership_invitations;
begin
  for v_invitation in
    select * from public.membership_invitations
    where lower(email) = lower(new.email) and claimed_at is null and expires_at > now()
    order by invited_at
  loop
    insert into public.org_memberships (organisation_id, user_id, role, granted_by)
    values (v_invitation.organisation_id, new.id, v_invitation.role, v_invitation.invited_by)
    on conflict do nothing;
    update public.membership_invitations
    set claimed_at = now(), claimed_by = new.id
    where id = v_invitation.id;
  end loop;
  return null;
end
$$;

create trigger profiles_claim_invitations after insert on public.profiles
  for each row execute function private.claim_invitations();

-- Provisioning (Owner or support staff; PORTAL_BUILD_PLAN.md 11): the organisation, its first
-- term and the account owner's access, in one audited call.
create function public.provision_organisation(
  p_name text,
  p_employee_band text,
  p_period_start date,
  p_period_end date,
  p_agreement_date date,
  p_invoice_reference text,
  p_account_owner_email text
)
returns table (organisation_id uuid, needs_account boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_needs_account boolean;
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff provision organisations');
  end if;
  insert into public.organisations (name, created_by)
  values (btrim(p_name), auth.uid())
  returning id into v_org;
  insert into public.subscriptions (
    organisation_id, employee_band, period_start, period_end, agreement_date, invoice_reference,
    provisioned_by
  ) values (
    v_org, p_employee_band, p_period_start, p_period_end, p_agreement_date, btrim(p_invoice_reference),
    auth.uid()
  );
  v_needs_account := private.grant_access(v_org, p_account_owner_email, 'account_owner', '{}');
  perform private.record_event(v_org, 'organisation.provisioned', 'organisations', v_org,
    jsonb_build_object('employee_band', p_employee_band, 'period_start', p_period_start,
      'period_end', p_period_end, 'invoice_reference', btrim(p_invoice_reference)));
  return query select v_org, v_needs_account;
end
$$;

-- A new term, for a renewal or a change of band.
create function public.record_subscription_term(
  p_organisation_id uuid,
  p_employee_band text,
  p_period_start date,
  p_period_end date,
  p_agreement_date date,
  p_invoice_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff record subscription terms');
  end if;
  insert into public.subscriptions (
    organisation_id, employee_band, period_start, period_end, agreement_date, invoice_reference,
    provisioned_by
  ) values (
    p_organisation_id, p_employee_band, p_period_start, p_period_end, p_agreement_date,
    btrim(p_invoice_reference), auth.uid()
  )
  returning id into v_id;
  perform private.record_event(p_organisation_id, 'subscription.term_recorded', 'subscriptions', v_id, null);
  return v_id;
end
$$;

-- Suspends or cancels a term by hand, or clears the override (p_override null).
create function public.set_subscription_override(
  p_subscription_id uuid,
  p_override text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff override a subscription');
  end if;
  update public.subscriptions
  set state_override = p_override,
      override_reason = case when p_override is null then null else btrim(p_reason) end
  where id = p_subscription_id
  returning organisation_id into v_org;
  if v_org is null then
    perform private.invalid('no such subscription term');
  end if;
  perform private.record_event(v_org, 'subscription.override_set', 'subscriptions', p_subscription_id,
    jsonb_build_object('override', p_override));
end
$$;

-- The Owner designates support staff, or removes the designation (which ends their sessions).
create function public.set_support_staff(p_user_id uuid, p_is_support_staff boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_owner() then
    perform private.refuse('only the Owner designates support staff');
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and is_owner) then
    perform private.invalid('the Owner is not designated as support staff');
  end if;
  update public.profiles set is_support_staff = p_is_support_staff where id = p_user_id;
  if not found then
    perform private.invalid('no such person');
  end if;
  if not p_is_support_staff then
    update public.support_sessions
    set ended_at = now(), ended_by = auth.uid()
    where staff_user_id = p_user_id and ended_at is null;
  end if;
  perform private.record_event(null,
    case when p_is_support_staff then 'staff.designated' else 'staff.removed' end,
    'profiles', p_user_id, null);
end
$$;

-- Staff open a support session on one organisation with a written reason. It lasts
-- private.support_session_minutes() and works in any subscription state.
create function public.open_support_session(p_organisation_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_id uuid;
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff open support sessions');
  end if;
  if not exists (select 1 from public.organisations where id = p_organisation_id) then
    perform private.invalid('no such organisation');
  end if;
  select * into v_profile from public.profiles where id = auth.uid();
  -- An expired session still counts as open until it is closed; close it at its expiry.
  update public.support_sessions
  set ended_at = expires_at, ended_by = auth.uid()
  where staff_user_id = auth.uid() and organisation_id = p_organisation_id
    and ended_at is null and expires_at <= now();
  if exists (
    select 1 from public.support_sessions
    where staff_user_id = auth.uid() and organisation_id = p_organisation_id and ended_at is null
  ) then
    perform private.invalid('a session on this organisation is already open');
  end if;
  insert into public.support_sessions (
    organisation_id, staff_user_id, staff_name, staff_email, kind, reason, expires_at
  ) values (
    p_organisation_id, auth.uid(), coalesce(v_profile.full_name, v_profile.email), v_profile.email,
    case when v_profile.is_owner then 'owner' else 'support' end, btrim(p_reason),
    now() + make_interval(mins => private.support_session_minutes())
  )
  returning id into v_id;
  return v_id;
end
$$;

-- A staff member closes their own session.
create function public.close_support_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff close support sessions');
  end if;
  update public.support_sessions
  set ended_at = now(), ended_by = auth.uid()
  where id = p_session_id and staff_user_id = auth.uid() and ended_at is null;
  if not found then
    perform private.invalid('no open session of yours with that id');
  end if;
end
$$;

-- The account owner's opt-out from the research dataset.
create function public.set_data_contribution_opt_out(p_organisation_id uuid, p_opt_out boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_account_owner(p_organisation_id) then
    perform private.refuse('only the account owner changes the data-contribution opt-out');
  end if;
  update public.organisations set data_contribution_opt_out = p_opt_out where id = p_organisation_id;
end
$$;

-- The account owner grants an administrator or viewer role. Returns whether the address still
-- needs an account (the server then sends the Supabase invitation).
create function public.invite_member(
  p_organisation_id uuid,
  p_email text,
  p_role text,
  p_unit_ids uuid[] default '{}'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_organisation_id not in (select private.writable_org_ids(array['account_owner'])) then
    perform private.refuse('only the account owner grants access');
  end if;
  if p_role not in ('administrator', 'executive_viewer', 'unit_viewer') then
    perform private.invalid('the account owner grants administrator and viewer roles only');
  end if;
  return private.grant_access(p_organisation_id, p_email, p_role, p_unit_ids);
end
$$;

-- The account owner revokes a membership. Their own account-owner role is changed only by staff
-- (replace_account_owner).
create function public.revoke_membership(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.org_memberships;
begin
  select * into v_membership from public.org_memberships where id = p_membership_id and revoked_at is null;
  if not found or not private.is_account_owner(v_membership.organisation_id) then
    perform private.refuse('only the account owner revokes access');
  end if;
  if v_membership.role = 'account_owner' then
    perform private.invalid('the account owner is changed by PerformanceVP');
  end if;
  update public.org_memberships
  set revoked_at = now(), revoked_by = auth.uid()
  where id = p_membership_id;
end
$$;

-- Staff hand an organisation to a new account owner (the previous one leaves or changes role).
create function public.replace_account_owner(p_organisation_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff change the account owner');
  end if;
  update public.org_memberships
  set revoked_at = now(), revoked_by = auth.uid()
  where organisation_id = p_organisation_id and role = 'account_owner' and revoked_at is null;
  update public.membership_invitations
  set expires_at = now()
  where organisation_id = p_organisation_id and role = 'account_owner' and claimed_at is null;
  return private.grant_access(p_organisation_id, p_email, 'account_owner', '{}');
end
$$;

-- Removes a person's second factors and signs them out everywhere, so they enrol again at next
-- sign-in. The caller must have verified TOTP within private.step_up_minutes(). Staff may reset
-- anyone except the Owner (whose factor is managed in the Supabase dashboard); only the Owner may
-- reset support staff; an account owner may reset only a person whose every membership sits in
-- their organisation and who is not staff, so one client can never strip another's factor.
create function public.reset_factors(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
  v_orgs uuid[];
  v_org uuid;
begin
  if not private.recent_totp(private.step_up_minutes()) then
    perform private.refuse('confirm your authenticator code again before resetting a factor');
  end if;
  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    perform private.invalid('no such person');
  end if;
  if p_user_id = auth.uid() then
    perform private.refuse('a person cannot reset their own factor');
  end if;
  select coalesce(array_agg(distinct m.organisation_id), '{}') into v_orgs
  from public.org_memberships m
  where m.user_id = p_user_id and m.revoked_at is null;

  if v_target.is_owner then
    perform private.refuse('the Owner''s factor is managed in the Supabase dashboard');
  elsif v_target.is_support_staff then
    if not private.is_owner() then
      perform private.refuse('only the Owner resets a support staff factor');
    end if;
  elsif not private.is_staff() then
    if cardinality(v_orgs) <> 1 or not private.is_account_owner(v_orgs[1]) then
      perform private.refuse('an account owner resets factors only for people who belong to their organisation alone');
    end if;
  end if;

  delete from auth.mfa_factors where user_id = p_user_id;
  delete from auth.sessions where user_id = p_user_id;

  -- Every organisation the person belongs to sees the reset; a staff reset is a platform event.
  if cardinality(v_orgs) = 0 then
    perform private.record_event(null, 'mfa.factors_reset', 'profiles', p_user_id, null);
  else
    foreach v_org in array v_orgs loop
      perform private.record_event(v_org, 'mfa.factors_reset', 'profiles', p_user_id, null);
    end loop;
  end if;
end
$$;

grant execute on function public.provision_organisation(text, text, date, date, date, text, text) to authenticated;
grant execute on function public.record_subscription_term(uuid, text, date, date, date, text) to authenticated;
grant execute on function public.set_subscription_override(uuid, text, text) to authenticated;
grant execute on function public.set_support_staff(uuid, boolean) to authenticated;
grant execute on function public.open_support_session(uuid, text) to authenticated;
grant execute on function public.close_support_session(uuid) to authenticated;
grant execute on function public.set_data_contribution_opt_out(uuid, boolean) to authenticated;
grant execute on function public.invite_member(uuid, text, text, uuid[]) to authenticated;
grant execute on function public.revoke_membership(uuid) to authenticated;
grant execute on function public.replace_account_owner(uuid, text) to authenticated;
grant execute on function public.reset_factors(uuid) to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
