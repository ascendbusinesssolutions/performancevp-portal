-- Milestone 3, step 8: what the PerformanceVP console and the account owner's access page need.
--
-- Staff see every organisation's name, state, band and term to provision, renew and choose where to
-- open a session; the state is computed, so it comes from a function. The Owner designates support
-- staff by email address, because the Owner cannot read a person's profile until they are staff
-- (least privilege).

-- Every organisation, for staff: name, computed subscription state, current band and term, and
-- whether the caller holds an open session on it.
create function public.staff_organisations()
returns table (
  organisation_id uuid,
  name text,
  state text,
  employee_band text,
  period_start date,
  period_end date,
  open_session_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    perform private.refuse('only PerformanceVP staff see every organisation');
  end if;
  return query
    select o.id, o.name, private.subscription_state(o.id), t.employee_band, t.period_start, t.period_end,
           (select s.id from public.support_sessions s
            where s.organisation_id = o.id and s.staff_user_id = auth.uid()
              and s.ended_at is null and s.expires_at > now()
            limit 1)
    from public.organisations o
    left join lateral (
      select sub.employee_band, sub.period_start, sub.period_end
      from public.subscriptions sub
      where sub.organisation_id = o.id
      -- The governing term: the latest that has started, or else the next to start.
      order by (sub.period_start <= private.today()) desc,
               case when sub.period_start <= private.today() then sub.period_start end desc nulls last,
               sub.period_start
      limit 1
    ) t on true
    order by o.name;
end
$$;

-- The Owner designates a person as support staff by email. Returns 'designated', or 'needs_account'
-- when the address has no account yet (the server then invites it and calls again).
create function public.designate_support_staff(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not private.is_owner() then
    perform private.refuse('only the Owner designates support staff');
  end if;
  select * into v_profile from public.profiles where lower(email) = private.normalise_email(p_email);
  if not found then
    return 'needs_account';
  end if;
  perform public.set_support_staff(v_profile.id, true);
  return 'designated';
end
$$;

grant execute on function public.staff_organisations() to authenticated;
grant execute on function public.designate_support_staff(text) to authenticated;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
