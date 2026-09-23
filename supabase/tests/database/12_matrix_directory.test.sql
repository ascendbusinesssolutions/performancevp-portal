-- The Section 3.3 matrix for the directory, uploads, campaigns and snapshots, with the manager
-- personas (Milestone 3 plan, 3.3; flag 4 of 23 September 2026).
--
-- Per organisation: 20 people (18 active), 4 formal ratings, 1 upload, 2 campaigns with 3 units
-- each, 2 snapshots holding 20 and 18 people, 7 snapshot formal ratings. alpha_mgr manages E003 to
-- E008 and E014 (seven active reports; eight in the closed snapshot, seven in the open one).
-- alpha_mgr2 manages E010 to E013 (four active; five and four in the snapshots). alpha_gone_mgr's
-- directory record is inactive, so the role no longer counts. Managers see the campaigns they rate
-- in (alpha_mgr both, alpha_mgr2 the open one). Managers sign in with an email code.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(9);

select tests.seed_fixture();

create temp table visibility (
  tbl text, org text,
  alpha_ao integer, alpha_admin integer, alpha_exec integer, alpha_uv integer, beta_ao integer,
  owner integer, support_a integer, support_b integer, outsider integer, anon integer
);
insert into visibility values
  --                                     ao adm exe  uv b_ao own s_a s_b out anon
  ('employees',               'alpha',   20, 20, 0,  0,   0,  0, 20,  0,  0,  -1),
  ('employees',               'beta',     0,  0, 0,  0,  20,  0,  0,  0,  0,  -1),
  ('formal_ratings',          'alpha',   -1, -1, -1, -1, -1, -1, -1, -1, -1,  -1),
  ('directory_uploads',       'alpha',    1,  1, 0,  0,   0,  0,  1,  0,  0,  -1),
  ('directory_uploads',       'beta',     0,  0, 0,  0,   1,  0,  0,  0,  0,  -1),
  ('directory_upload_rows',   'alpha',   -1, -1, -1, -1, -1, -1, -1, -1, -1,  -1),
  ('campaigns',               'alpha',    2,  2, 0,  0,   0,  0,  2,  0,  0,  -1),
  ('campaign_units',          'alpha',    6,  6, 0,  0,   0,  0,  6,  0,  0,  -1),
  ('directory_snapshots',     'alpha',    2,  2, 0,  0,   0,  0,  2,  0,  0,  -1),
  ('snapshot_members',        'alpha',   38, 38, 0,  0,   0,  0, 38,  0,  0,  -1),
  ('snapshot_members',        'beta',     0,  0, 0,  0,  38,  0,  0,  0,  0,  -1),
  ('snapshot_formal_ratings', 'alpha',   -1, -1, -1, -1, -1, -1, -1, -1, -1,  -1);

select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl in ('employees', 'directory_uploads') $$,
  'the directory and its uploads: administrators, the account owner and staff under a session'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl in ('formal_ratings', 'snapshot_formal_ratings', 'directory_upload_rows') $$,
  'formal ratings and staged rows: no role reads them directly'
);
select is_empty(
  $$ select * from tests.visibility_mismatches('visibility') where tbl in ('campaigns', 'campaign_units', 'directory_snapshots', 'snapshot_members') $$,
  'campaigns and snapshots: administrators, the account owner and staff under a session'
);

-- Managers, on an email-code session.
create temp table manager_visibility (persona text, tbl text, org text, expected integer);
insert into manager_visibility values
  ('alpha_mgr', 'employees', 'alpha', 7), ('alpha_mgr2', 'employees', 'alpha', 4),
  ('alpha_gone_mgr', 'employees', 'alpha', 0), ('alpha_mgr', 'employees', 'beta', 0),
  ('alpha_mgr', 'snapshot_members', 'alpha', 15), ('alpha_mgr2', 'snapshot_members', 'alpha', 9),
  ('alpha_gone_mgr', 'snapshot_members', 'alpha', 0),
  ('alpha_mgr', 'directory_uploads', 'alpha', 0), ('alpha_mgr', 'campaigns', 'alpha', 2),
  ('alpha_mgr', 'campaign_units', 'alpha', 6), ('alpha_mgr', 'directory_snapshots', 'alpha', 2),
  ('alpha_mgr2', 'campaigns', 'alpha', 1), ('alpha_mgr2', 'directory_snapshots', 'alpha', 1),
  ('alpha_gone_mgr', 'campaigns', 'alpha', 0),
  ('alpha_mgr', 'org_memberships', 'alpha', 1), ('alpha_mgr', 'organisations', 'alpha', 1),
  ('alpha_mgr', 'business_units', 'alpha', 5), ('alpha_mgr', 'teams', 'alpha', 4),
  ('alpha_mgr', 'role_families', 'alpha', 2), ('alpha_mgr', 'skills', 'alpha', 4),
  ('alpha_mgr', 'knowledge_domains', 'alpha', 2), ('alpha_mgr', 'unit_lineage', 'alpha', 1),
  ('alpha_mgr', 'subscriptions', 'alpha', 0), ('alpha_mgr', 'support_sessions', 'alpha', 0),
  ('alpha_mgr', 'audit_logs', 'alpha', 0), ('alpha_mgr', 'membership_invitations', 'alpha', 0),
  ('alpha_mgr', 'unit_access', 'alpha', 0), ('alpha_mgr', 'formal_ratings', 'alpha', -1),
  ('alpha_gone_mgr', 'organisations', 'alpha', 0), ('alpha_gone_mgr', 'business_units', 'alpha', 0);

select is_empty(
  $$
    select persona, tbl, org, expected,
           tests.visible_rows(persona, tbl, tests.id(org), 'aal1', array['otp']) as actual
    from manager_visibility
    where expected is distinct from tests.visible_rows(persona, tbl, tests.id(org), 'aal1', array['otp'])
  $$,
  'a manager reads their own active direct reports and their snapshot rows, the campaigns they rate in, the structure and context, and nothing else'
);

select is(
  tests.count_as('alpha_mgr', $$select count(*) from public.employees where id = tests.id('alpha_E019')$$, 'aal1', array['otp']),
  0,
  'a manager does not see a direct report who has left'
);

-- A manager's role lapses if their record's work email no longer matches the signed-in address.
update public.employees set work_email = 'moved@alpha.test' where id = tests.id('alpha_E002');
select is(tests.visible_rows('alpha_mgr', 'employees', tests.id('alpha'), 'aal1', array['otp']), 0,
  'the manager role holds only while the directory record''s work email is the signed-in address');
update public.employees set work_email = 'mgr@alpha.test' where id = tests.id('alpha_E002');

-- Writes.
create temp table writes (
  label text, stmt text,
  alpha_ao text, alpha_admin text, alpha_exec text, alpha_uv text, beta_ao text,
  owner text, support_a text, support_b text, outsider text, anon text
);
insert into writes values
  ('add a person',
   $$insert into public.employees (organisation_id, employee_ref, first_name, last_name, unit_id, fte)
     values (tests.id('alpha'), 'E900', 'New', 'Person', tests.id('alpha_C2'), 1)$$,
   '1', '1', 'denied', 'denied', 'denied', 'denied', '1', 'denied', 'denied', 'denied'),
  ('edit a person',
   $$update public.employees set role_title = 'Senior Analyst' where id = tests.id('alpha_E003')$$,
   '1', '1', '0', '0', '0', '0', '1', '0', '0', 'denied'),
  ('move a person to another organisation',
   $$update public.employees set organisation_id = tests.id('beta') where id = tests.id('alpha_E003')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('change an employee ID',
   $$update public.employees set employee_ref = 'X003' where id = tests.id('alpha_E003')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('delete a person',
   $$delete from public.employees where id = tests.id('alpha_E003')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('write a formal rating directly',
   $$insert into public.formal_ratings (organisation_id, employee_id, rating_label, rating_date)
     values (tests.id('alpha'), tests.id('alpha_E006'), 'Exceeds', current_date)$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('record an upload directly',
   $$insert into public.directory_uploads (id, organisation_id, file_name, byte_size, sha256, storage_path, status, uploaded_by)
     values (gen_random_uuid(), tests.id('alpha'), 'x.xlsx', 1, repeat('0', 64), 'x', 'applied', auth.uid())$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('alter a snapshot',
   $$update public.snapshot_members set fte = 0.5 where snapshot_id = tests.id('alpha_open_snapshot')$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied'),
  ('stage an upload as a signed-in user',
   $$select public.stage_directory_upload(auth.uid(), tests.id('alpha'), gen_random_uuid(), 'x.xlsx', 1,
     repeat('0', 64), 'x', 'v1', '[]'::jsonb, '[]'::jsonb)$$,
   'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied', 'denied');

select is_empty(
  $$ select * from tests.write_mismatches('writes') where label in ('add a person', 'edit a person') $$,
  'the directory is written by administrators, the account owner and staff under a session, in their own organisation'
);
select is_empty(
  $$ select * from tests.write_mismatches('writes') where label not in ('add a person', 'edit a person') $$,
  'no person is moved, rekeyed or deleted; ratings, uploads and snapshots are written only by functions; staging is for the service role'
);
select is(
  tests.attempt('alpha_mgr', $$update public.employees set role_title = 'Changed' where id = tests.id('alpha_E003')$$, 'aal1', array['otp']),
  '0',
  'a manager cannot edit the directory'
);

select * from finish();

rollback;
