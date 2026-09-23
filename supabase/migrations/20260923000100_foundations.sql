-- Milestone 3, step 1: foundations.
--
-- The privilege posture every later migration relies on (PORTAL_BUILD_PLAN.md 3.1 and the
-- Milestone 0 note in Section 12). Nothing is granted to a Data API role by default: every
-- table, sequence and function receives exactly the grants its policies need, stated beside it.
-- `anon` receives nothing in any schema this project owns. The platform constants the policies
-- and jobs read are defined once, here.
--
-- Row level security is enabled on every table and not forced. Every table is owned by
-- `postgres`, which the Data API never uses, and the security-definer helpers rely on the
-- owner's exemption to read membership tables without recursing through the policies that
-- call them. The pgTAP suite asserts the invariants that matter instead: ownership, no
-- BYPASSRLS for `anon` or `authenticated`, and the exact grant list.

-- Extensions --------------------------------------------------------------------------------

-- The exclusion constraint that forbids overlapping subscription terms.
create extension if not exists btree_gist with schema extensions;

-- The private schema --------------------------------------------------------------------------

-- Helpers, constants and service-side functions. PostgREST does not expose this schema, so
-- nothing in it can be called through the API. `authenticated` needs usage and execute on the
-- helpers only because policy expressions run with the querying role's privileges.
create schema private;
comment on schema private is
  'Helpers, constants and internal functions. Not exposed through the Data API.';
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Default privileges -------------------------------------------------------------------------

-- Supabase's local image grants everything on new objects in `public` to anon, authenticated
-- and service_role; the hosted default no longer does. Neither is assumed: both schemas start
-- from nothing. One gap remains. Postgres grants PUBLIC execute on every new function by a global
-- default that a per-schema default cannot revoke, and changing the global default would also
-- strip the rights on extension functions such as pgTAP's. So every migration that creates
-- functions ends with an explicit sweep that revokes PUBLIC and anon, and 02_privileges fails if
-- one is missed.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke all on functions from public, anon, authenticated, service_role;

-- Anything that already exists in public (nothing at the time of writing) loses anon and PUBLIC.
revoke all on all tables in schema public from public, anon;
revoke all on all sequences in schema public from public, anon;
revoke all on all functions in schema public from public, anon;

-- Platform constants ---------------------------------------------------------------------------

-- One definition each. The helpers and jobs are security definer and call these as the owner,
-- so no Data API role needs execute on them.

create function private.local_timezone()
returns text
language sql
immutable
set search_path = ''
as $$
  -- Subscription terms, grace and the purge run on the Australian calendar, not the database's
  -- UTC date, which would move every boundary by 10 or 11 hours.
  select 'Australia/Sydney'::text
$$;

create function private.today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone private.local_timezone())::date
$$;

create function private.grace_days()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- The read-only grace period after a subscription term ends (PORTAL_BUILD_PLAN.md 11;
  -- DECISIONS.md 5.5).
  select 30
$$;

create function private.purge_after_days()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- Deactivated directory records are purged this many days after deactivation
  -- (DECISIONS.md 2.5; Online Measurement Specification Part 7).
  select 30
$$;

create function private.support_session_minutes()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- How long a support session stays open before it expires (Milestone 3 plan, Section 2.1).
  select 120
$$;

create function private.step_up_minutes()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- How recently TOTP must have been verified for a ratings export or a factor reset
  -- (Milestone 3 plan, Section 3.2).
  select 15
$$;

create function private.staged_upload_days()
returns integer
language sql
immutable
set search_path = ''
as $$
  -- A staged directory upload that is neither applied nor discarded expires after this many
  -- days; its file and staged rows are then deleted (Milestone 3 plan, Section 2.3).
  select 7
$$;

-- The audit image allowlist -------------------------------------------------------------------

-- Which columns of each audited table may have their values copied into an audit entry's before
-- and after images. Any other column that changes is recorded by name only. Allowlisting rather
-- than denylisting means a new column stays out of the log until someone decides otherwise, and
-- it keeps rating values out of the log entirely, so the log is never an unlogged way to read
-- ratings and never outlives the directory purge (Milestone 3 plan, Section 6). Each migration
-- that adds an audited table adds its rows here.
create table private.audit_image_columns (
  table_name text not null,
  column_name text not null,
  primary key (table_name, column_name)
);
alter table private.audit_image_columns enable row level security;
comment on table private.audit_image_columns is
  'Columns whose values may appear in audit images. Everything else is recorded by name only.';

-- The sweep (see "Default privileges" above). Every migration that creates functions ends with it.
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
