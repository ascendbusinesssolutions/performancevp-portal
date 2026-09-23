-- Milestone 3, step 9: what the directory screens and the daily job need.
--
-- The upload route asks, as the signed-in person, whether they may manage the directory before it
-- stores or parses anything (the staging function asks again for the named person). The daily job
-- records each run, so a run that did not happen is visible as a gap in the log.

-- Security definer so the private helpers run as their owner; they still judge the caller, from the
-- session's claims.
create function public.can_manage_directory(p_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_directory(p_organisation_id)
$$;

create function public.record_job_run(p_job text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_job !~ '^[a-z_]+$' then
    perform private.invalid('a job name is lower case letters and underscores');
  end if;
  perform private.record_event(null, 'job.' || p_job || '_completed', null, null, p_detail);
end
$$;

grant execute on function public.can_manage_directory(uuid) to authenticated;
grant execute on function public.record_job_run(text, jsonb) to service_role;

-- The sweep (foundations migration).
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
