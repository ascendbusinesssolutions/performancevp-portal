-- The Section 3.3 matrix for units, teams, lineage and the context parents (Milestone 3 plan, 3.3).
--
-- Structure and context are read by every member of the organisation and by staff under a session,
-- and written by administrators, the account owner and staff under a session. Unit scopes are read
-- by the unit viewer they belong to and by administrators. Rows per organisation: 5 units (one
-- retired), 4 teams, 1 lineage row, 2 role families, 4 skills, 2 knowledge domains, 1 unit scope.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(4);

select tests.seed_fixture();

create temp table visibility (
  tbl text, org text,
  alpha_ao integer, alpha_admin integer, alpha_exec integer, alpha_uv integer, beta_ao integer,
  owner integer, support_a integer, support_b integer, outsider integer, anon integer
);
insert into visibility values
  --                               ao adm exe  uv b_ao own s_a s_b out anon
  ('business_units',    'alpha',   5,  5,  5,  5,   0,  0,  5,  0,  0,  -1),
  ('business_units',    'beta',    0,  0,  0,  0,   5,  0,  0,  0,  0,  -1),
  ('teams',             'alpha',   4,  4,  4,  4,   0,  0,  4,  0,  0,  -1),
  ('teams',             'beta',    0,  0,  0,  0,   4,  0,  0,  0,  0,  -1),
  ('unit_lineage',      'alpha',   1,  1,  1,  1,   0,  0,  1,  0,  0,  -1),
  ('unit_lineage',      'beta',    0,  0,  0,  0,   1,  0,  0,  0,  0,  -1),
  ('role_families',     'alpha',   2,  2,  2,  2,   0,  0,  2,  0,  0,  -1),
  ('role_families',     'beta',    0,  0,  0,  0,   2,  0,  0,  0,  0,  -1),
  ('skills',            'alpha',   4,  4,  4,  4,   0,  0,  4,  0,  0,  -1),
  ('skills',            'beta',    0,  0,  0,  0,   4,  0,  0,  0,  0,  -1),
  ('knowledge_domains', 'alpha',   2,  2,  2,  2,   0,  0,  2,  0,  0,  -1),
  ('knowledge_domains', 'beta',    0,  0,  0,  0,   2,  0,  0,  0,  0,  -1),
  ('unit_access',       'alpha',   1,  1,  0,  1,   0,  0,  1,  0,  0,  -1),
  ('unit_access',       'beta',    0,  0,  0,  0,   1,  0,  0,  0,  0,  -1);

select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl <> 'unit_access' $$,
  'structure and context: every member and staff under a session read them, nobody else'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl = 'unit_access' $$,
  'unit scopes: the unit viewer''s own, and all of them for administrators and staff under a session'
);

create temp table writes (
  label text, stmt text,
  alpha_ao text, alpha_admin text, alpha_exec text, alpha_uv text, beta_ao text,
  owner text, support_a text, support_b text, outsider text, anon text
);
insert into writes values
  ('add a team',
   $$insert into public.teams (organisation_id, unit_id, name) values (tests.id('alpha'), tests.id('alpha_C1'), 'New Team')$$,
   '1', '1', 'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied'),
  ('rename a unit',
   $$update public.business_units set name = 'Renamed' where id = tests.id('alpha_C1')$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('add a skill',
   $$insert into public.skills (organisation_id, role_family_id, name, kind) values (tests.id('alpha'), tests.id('alpha_analyst'), 'Forecasting', 'technical')$$,
   '1', '1', 'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied'),
  ('add a knowledge domain in beta',
   $$insert into public.knowledge_domains (organisation_id, unit_id, name, criticality) values (tests.id('beta'), tests.id('beta_C1'), 'Pricing', 2)$$,
   'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('move a unit to another organisation',
   $$update public.business_units set organisation_id = tests.id('beta') where id = tests.id('alpha_C1')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('change a unit code',
   $$update public.business_units set unit_code = 'X1' where id = tests.id('alpha_C1')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('delete a unit',
   $$delete from public.business_units where id = tests.id('alpha_G1')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('record lineage directly',
   $$insert into public.unit_lineage (organisation_id, predecessor_unit_id, successor_unit_id, kind, effective_date)
     values (tests.id('alpha'), tests.id('alpha_C1'), tests.id('alpha_C2'), 'merge', current_date)$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('scope a unit viewer directly',
   $$insert into public.unit_access (organisation_id, membership_id, unit_id)
     values (tests.id('alpha'), (select id from public.org_memberships where user_id = tests.user_id('alpha_uv')), tests.id('alpha_C2'))$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied');

select is_empty(
  $$ select * from tests.write_mismatches('writes') where label in ('add a team', 'rename a unit', 'add a skill', 'add a knowledge domain in beta') $$,
  'structure and context: written by administrators, the account owner and staff under a session, in their own organisation'
);
select is_empty(
  $$ select * from tests.write_mismatches('writes') where label not in ('add a team', 'rename a unit', 'add a skill', 'add a knowledge domain in beta') $$,
  'no unit is moved, recoded or deleted, and lineage and unit scopes are written only through functions'
);

select * from finish();

rollback;
