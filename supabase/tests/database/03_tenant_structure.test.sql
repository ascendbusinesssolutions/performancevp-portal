-- Standing invariants on tenancy (CLAUDE.md Section 4; Milestone 3 plan, Section 2).
--
-- Every table in public is classified: a tenant table carrying organisation_id, the organisations
-- table itself, or a named exception. On every tenant table organisation_id is not null and leads
-- an index, and (organisation_id, id) is unique so children can reference it. Every foreign key
-- from one tenant table to another includes organisation_id, so a row can never point into
-- another organisation. Every "set null" action names its columns, so a purge can never null
-- organisation_id. Every tenant unique index leads with organisation_id, so a constraint error can
-- never reveal another organisation's data.
begin;

select plan(7);

-- Tables that carry no organisation_id, with the reason.
create temp table non_tenant_tables (name text primary key, reason text not null);
insert into non_tenant_tables values
  ('organisations', 'the tenant itself; its id is the organisation id'),
  ('profiles', 'one row per signed-in person, across organisations');

-- Tables whose organisation_id may be null, with the reason.
create temp table nullable_organisation (name text primary key, reason text not null);
insert into nullable_organisation values
  ('audit_logs', 'platform events (provisioning, staff designation) belong to no organisation');

-- Unique indexes on tenant tables that need not lead with organisation_id, with the reason.
create temp table global_unique_indexes (name text primary key, reason text not null);
-- (None since Milestone 5: invitations no longer hold a token hash, and live tokens are private.)

create temp view public_tables as
  select c.oid, c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p');

create temp view tenant_tables as
  select t.oid, t.relname, a.attnum as org_attnum, a.attnotnull
  from public_tables t
  join pg_attribute a on a.attrelid = t.oid and a.attname = 'organisation_id' and not a.attisdropped;

-- 1: classification.
select is_empty(
  $$
    select relname from public_tables t
    where not exists (select 1 from tenant_tables tt where tt.oid = t.oid)
      and relname not in (select name from non_tenant_tables)
      and relname not like 'ref\_%'
  $$,
  'every public table is a tenant table, a reference table or a named exception'
);

-- 2: organisation_id not null.
select is_empty(
  $$
    select relname from tenant_tables
    where not attnotnull and relname not in (select name from nullable_organisation)
  $$,
  'organisation_id is not null on every tenant table'
);

-- 3: organisation_id leads an index.
select is_empty(
  $$
    select relname from tenant_tables t
    where not exists (
      select 1 from pg_index i where i.indrelid = t.oid and i.indkey[0] = t.org_attnum
    )
  $$,
  'organisation_id leads an index on every tenant table'
);

-- 4: (organisation_id, id) is unique, as the target of composite foreign keys.
select is_empty(
  $$
    select relname from tenant_tables t
    where relname not in (select name from nullable_organisation)
      and not exists (
        select 1
        from pg_index i
        join pg_attribute idc on idc.attrelid = t.oid and idc.attname = 'id'
        where i.indrelid = t.oid and i.indisunique
          and i.indnatts = 2
          and i.indkey[0] = t.org_attnum and i.indkey[1] = idc.attnum
      )
  $$,
  '(organisation_id, id) is unique on every tenant table'
);

-- 5: foreign keys between tenant tables carry organisation_id in the same position on both sides;
-- foreign keys to organisations are exactly (organisation_id) references organisations (id).
select is_empty(
  $$
    select format('%s: %s', src.relname, con.conname)
    from pg_constraint con
    join tenant_tables src on src.oid = con.conrelid
    left join tenant_tables dst on dst.oid = con.confrelid
    where con.contype = 'f'
      and (
        (con.confrelid = to_regclass('public.organisations') and con.conkey <> array[src.org_attnum])
        or (
          dst.oid is not null
          and not exists (
            select 1 from generate_subscripts(con.conkey, 1) i
            where con.conkey[i] = src.org_attnum and con.confkey[i] = dst.org_attnum
          )
        )
      )
  $$,
  'every foreign key between tenant tables includes organisation_id'
);

-- 6: "on delete set null" names its columns and never includes organisation_id.
select is_empty(
  $$
    select format('%s: %s', src.relname, con.conname)
    from pg_constraint con
    join tenant_tables src on src.oid = con.conrelid
    where con.contype = 'f'
      and con.confdeltype in ('n', 'd')
      and (con.confdelsetcols is null or src.org_attnum = any (con.confdelsetcols))
  $$,
  'every set-null foreign key on a tenant table names its columns and leaves organisation_id alone'
);

-- 7: unique indexes lead with organisation_id (the primary key and named exceptions aside).
select is_empty(
  $$
    select format('%s: %s', t.relname, ic.relname)
    from tenant_tables t
    join pg_index i on i.indrelid = t.oid and i.indisunique and not i.indisprimary
    join pg_class ic on ic.oid = i.indexrelid
    where i.indkey[0] <> t.org_attnum
      and ic.relname not in (select name from global_unique_indexes)
  $$,
  'every unique index on a tenant table leads with organisation_id'
);

select * from finish();

rollback;
