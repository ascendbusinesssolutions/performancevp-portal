-- The directory: uploads, the difference preview, the apply, formal ratings and snapshots (Online
-- Measurement Specification 6.1 and 6.4; Milestone 3 plan, Sections 5.2 to 5.4).
--
-- An upload is staged by the service role for a named person, compared with the live directory in
-- SQL, previewed (logged, because it shows formal ratings) and applied against the hash of what was
-- shown. The upload is the whole directory: missing IDs are deactivated. Problems visible only
-- across rows reject the upload. Snapshots never change.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(54);

select tests.seed_fixture();

-- Helpers for this file ----------------------------------------------------------------------------

-- The live directory of an organisation in upload form.
create function pg_temp.live_rows(p_org uuid)
returns table (
  row_number integer, employee_ref text, first_name text, last_name text, work_email text,
  unit_code text, unit_name text, team_name text, manager_ref text, role_title text,
  role_family_name text, start_date date, fte numeric, is_team_leader boolean,
  is_leadership_team boolean, employment_status text, formal_rating_label text, formal_rating_date date
)
language sql
as $$
  select (row_number() over (order by e.employee_ref) + 1)::integer, e.employee_ref, e.first_name,
         e.last_name, e.work_email, u.unit_code, u.name, t.name, m.employee_ref, e.role_title, rf.name,
         e.start_date, e.fte, e.is_team_leader, e.is_leadership_team, e.employment_status,
         fr.rating_label, fr.rating_date
  from public.employees e
  join public.business_units u on u.id = e.unit_id
  left join public.teams t on t.id = e.team_id
  left join public.employees m on m.id = e.manager_employee_id
  left join public.role_families rf on rf.id = e.role_family_id
  left join public.formal_ratings fr on fr.employee_id = e.id
  where e.organisation_id = p_org and e.status = 'active'
$$;

-- Stages the rows of a temp table as the service role, for alpha_admin; remembers the upload id.
create function pg_temp.stage(p_rows text, p_key text, p_errors jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_json jsonb;
  v_id uuid := gen_random_uuid();
begin
  execute format('select coalesce(jsonb_agg(to_jsonb(r) order by r.row_number), ''[]'') from %s r', p_rows)
    into v_json;
  perform tests.remember(p_key, v_id);
  return tests.value_as('service', format(
    'select public.stage_directory_upload(%L::uuid, %L::uuid, %L::uuid, %L, 2048, %L, %L, ''v1'', %L::jsonb, %L::jsonb)::text',
    tests.user_id('alpha_admin'), tests.id('alpha'), v_id, p_key || '.xlsx', repeat('a', 64),
    'org/' || tests.id('alpha') || '/directory/' || v_id || '.xlsx', v_json, p_errors
  ))::jsonb;
end
$$;

create function pg_temp.preview(p_key text, p_persona text default 'alpha_admin')
returns jsonb
language sql
as $$
  select tests.value_as(p_persona, format('select public.directory_upload_preview(%L)::text', tests.id(p_key)))::jsonb
$$;

create function pg_temp.apply(p_key text, p_hash text, p_confirm boolean default false, p_persona text default 'alpha_admin')
returns text
language sql
as $$
  select tests.attempt(p_persona,
    format('select public.apply_directory_upload(%L, %L, %L)', tests.id(p_key), p_hash, p_confirm),
    p_keep => true)
$$;

-- Staging is for the service role ------------------------------------------------------------------

select is(
  tests.attempt('alpha_admin', format(
    'select public.stage_directory_upload(%L::uuid, %L::uuid, gen_random_uuid(), ''x.xlsx'', 1, %L, ''x'', ''v1'', ''[]''::jsonb, ''[]''::jsonb)',
    tests.user_id('alpha_admin'), tests.id('alpha'), repeat('a', 64))),
  'denied',
  'a signed-in user cannot stage an upload, so the route''s checks cannot be skipped'
);
select alike(
  tests.attempt('service', format(
    'select public.stage_directory_upload(%L::uuid, %L::uuid, gen_random_uuid(), ''x.xlsx'', 1, %L, ''x'', ''v1'', ''[]''::jsonb, ''[]''::jsonb)',
    tests.user_id('alpha_exec'), tests.id('alpha'), repeat('a', 64))),
  'denied',
  'the service role stages only for a person who may manage the directory'
);

-- A full upload ------------------------------------------------------------------------------------

create temp table upload_a as select * from pg_temp.live_rows(tests.id('alpha'));
delete from upload_a where employee_ref = 'E018';                                     -- a leaver
insert into upload_a (row_number, employee_ref, first_name, last_name, work_email, unit_code, unit_name, team_name, manager_ref, fte, is_team_leader, is_leadership_team)
values (100, 'E100', 'Nina', 'Joiner', 'e100@alpha.test', 'C1', 'Operations', 'Team One', 'E002', 0.8, false, false); -- a joiner
insert into upload_a (row_number, employee_ref, first_name, last_name, work_email, unit_code, unit_name, manager_ref, fte, is_team_leader, is_leadership_team)
values (101, 'E101', 'Omar', 'Newunit', 'e101@alpha.test', 'C3', 'New Unit', 'E001', 1, false, false); -- a new unit
insert into upload_a (row_number, employee_ref, first_name, last_name, work_email, unit_code, unit_name, team_name, manager_ref, role_title, role_family_name, start_date, fte, is_team_leader, is_leadership_team)
values (102, 'E020', 'Person', 'Number20', 'e020@alpha.test', 'C2', 'Sales', 'Team One', 'E009', 'Analyst', 'Analyst', tests.today() - 900, 1, false, false); -- returning
update upload_a set unit_code = 'G1', unit_name = 'Field Operations', team_name = 'Team One' where employee_ref = 'E005';
update upload_a set manager_ref = 'E002' where employee_ref = 'E010';
update upload_a set role_title = 'Principal Analyst' where employee_ref = 'E006';
update upload_a set team_name = 'Team Three' where employee_ref = 'E007';
update upload_a set role_family_name = 'Engineer' where employee_ref = 'E008';
update upload_a set formal_rating_label = 'Exceeds' where employee_ref = 'E004';
update upload_a set unit_name = 'Sales and Service' where unit_code = 'C2';

select is((pg_temp.stage('upload_a', 'upload_a') ->> 'status'), 'staged', 'a valid upload is staged');
select is(
  (select count(*)::integer from public.directory_upload_rows where upload_id = tests.id('upload_a')),
  20, 'its rows are held for the decision'
);

create temp table preview_a as select pg_temp.preview('upload_a') as diff;
select results_eq(
  $$ select diff -> 'summary' from preview_a $$,
  $$ values ('{"rows": 20, "moves": 2, "leavers": 1, "joiners": 2, "updates": 6, "new_teams": 1, "new_units": 1,
              "returning": 1, "emptied_units": 0, "renamed_units": 1, "manager_changes": 1,
              "new_role_families": 1, "formal_rating_changes": 1}'::jsonb) $$,
  'the preview counts joiners, returning staff, leavers, moves, manager changes, updates and structural changes'
);
select is(
  (select p -> 'fields' -> 'unit' from preview_a, jsonb_array_elements(diff -> 'people') p where p ->> 'employee_ref' = 'E005'),
  '{"from": "C1", "to": "G1"}'::jsonb,
  'each change names the field, from and to'
);
select is(
  (select p -> 'fields' -> 'formal_rating' -> 'to' ->> 'label' from preview_a, jsonb_array_elements(diff -> 'people') p where p ->> 'employee_ref' = 'E004'),
  'Exceeds',
  'formal-rating changes are shown'
);
select is((select diff -> 'entitlement' ->> 'over_band' from preview_a), 'false', 'the preview reports the entitlement position');
select is((select (diff ->> 'leaver_confirmation_required')::boolean from preview_a), false, 'one leaver needs no confirmation');
select ok(
  exists (select 1 from public.audit_logs where action = 'directory.upload_previewed' and entity_id = tests.id('upload_a')
          and actor_user_id = tests.user_id('alpha_admin')),
  'every preview is logged, because it shows formal ratings'
);
select is(
  tests.attempt('alpha_exec', format('select public.directory_upload_preview(%L)', tests.id('upload_a'))),
  'denied', 'an executive viewer cannot preview'
);

select alike(pg_temp.apply('upload_a', 'not-the-hash'), 'error: 22023%', 'an apply must present the hash of the preview it follows');
select is(pg_temp.apply('upload_a', (select diff ->> 'preview_hash' from preview_a)), '1', 'the administrator applies the upload');
select lives_ok('set constraints all immediate', 'the result has no reporting loops');

select is((select count(*)::integer from public.employees where organisation_id = tests.id('alpha') and status = 'active'), 20,
  'the directory now matches the file');
select is((select status from public.employees where id = tests.id('alpha_E018')), 'inactive', 'a person missing from the file is deactivated');
select is((select status from public.employees where id = tests.id('alpha_E020')), 'active', 'a returning person is reactivated');
select results_eq(
  $$ select u.unit_code, t.name from public.employees e join public.business_units u on u.id = e.unit_id
     join public.teams t on t.id = e.team_id where e.id = tests.id('alpha_E005') $$,
  $$ values ('G1'::text, 'Team One'::text) $$,
  'a move is applied, team and unit together'
);
select is((select m.employee_ref from public.employees e join public.employees m on m.id = e.manager_employee_id where e.id = tests.id('alpha_E010')),
  'E002', 'a manager change is applied');
select is((select name from public.business_units where id = tests.id('alpha_C2')), 'Sales and Service', 'a unit is renamed under its code');
select ok(exists (select 1 from public.employees e join public.business_units u on u.id = e.unit_id
                  where e.employee_ref = 'E101' and u.unit_code = 'C3' and u.organisation_id = tests.id('alpha')),
  'a new unit code creates the unit');
select is((select rating_label from public.formal_ratings where employee_id = tests.id('alpha_E004')), 'Exceeds', 'formal ratings follow the file');
select results_eq(
  $$ select status, (select count(*)::integer from public.directory_upload_rows where upload_id = tests.id('upload_a'))
     from public.directory_uploads where id = tests.id('upload_a') $$,
  $$ values ('applied'::text, 0) $$,
  'the upload is recorded as applied and its staged rows are gone'
);
select is(
  (select u.unit_code from public.snapshot_members sm join public.business_units u on u.id = sm.unit_id
   where sm.snapshot_id = tests.id('alpha_open_snapshot') and sm.employee_id = tests.id('alpha_E005')),
  'C1',
  'a campaign snapshot is unchanged by the upload'
);

-- A stale preview is refused ------------------------------------------------------------------------

create temp table upload_b as select * from pg_temp.live_rows(tests.id('alpha'));
select pg_temp.stage('upload_b', 'upload_b');
create temp table preview_b as select pg_temp.preview('upload_b') as diff;
update public.employees set role_title = 'Edited meanwhile' where id = tests.id('alpha_E003');
select alike(pg_temp.apply('upload_b', (select diff ->> 'preview_hash' from preview_b)), 'error: 22023%',
  'if the directory changed after the preview, the apply is refused');
select is(tests.attempt('alpha_admin', format('select public.discard_directory_upload(%L)', tests.id('upload_b')), p_keep => true),
  '1', 'the administrator discards it');
select is((select status from public.directory_uploads where id = tests.id('upload_b')), 'discarded', 'and it is recorded as discarded');

-- Uploads that are rejected -------------------------------------------------------------------------

create temp table upload_loop as select * from pg_temp.live_rows(tests.id('alpha'));
update upload_loop set manager_ref = 'E004' where employee_ref = 'E003';
update upload_loop set manager_ref = 'E003' where employee_ref = 'E004';
select results_eq(
  $$ select r ->> 'status', (r -> 'errors' -> 0 ->> 'message') from (select pg_temp.stage('upload_loop', 'upload_loop') as r) x $$,
  $$ values ('rejected'::text, 'this reporting line loops back to the same person'::text) $$,
  'a reporting loop rejects the upload'
);

create temp table upload_retired as select * from pg_temp.live_rows(tests.id('alpha'));
update upload_retired set unit_code = 'OLD', unit_name = 'Former Sales' where employee_ref = 'E011';
select is((pg_temp.stage('upload_retired', 'upload_retired') ->> 'status'), 'rejected', 'a retired unit code rejects the upload');

create temp table upload_orphan as select * from pg_temp.live_rows(tests.id('alpha'));
update upload_orphan set manager_ref = 'E999' where employee_ref = 'E011';
select is((pg_temp.stage('upload_orphan', 'upload_orphan') -> 'errors' -> 0 ->> 'message'),
  'the manager''s employee ID is not in this file', 'a manager missing from the file rejects the upload');

create temp table upload_errors as select * from pg_temp.live_rows(tests.id('alpha')) limit 0;
select results_eq(
  $$ select r ->> 'status', (select count(*)::integer from public.directory_upload_rows where upload_id = tests.id('upload_errors'))
     from (select pg_temp.stage('upload_errors', 'upload_errors', '[{"row": 4, "column": "fte", "message": "FTE must be above 0 and at most 1"}]') as r) x $$,
  $$ values ('rejected'::text, 0) $$,
  'row errors found by the route reject the upload, and nothing is staged'
);
select is(
  (select errors from public.directory_uploads where id = tests.id('upload_errors')),
  '[{"row": 4, "column": "fte", "message": "FTE must be above 0 and at most 1"}]'::jsonb,
  'errors are kept as row, column and message'
);

-- Many leavers need confirming ----------------------------------------------------------------------

create temp table upload_few as select * from pg_temp.live_rows(tests.id('alpha')) where employee_ref in ('E001', 'E002', 'E003', 'E004', 'E009');
select pg_temp.stage('upload_few', 'upload_few');
create temp table preview_few as select pg_temp.preview('upload_few') as diff;
select is((select (diff ->> 'leaver_confirmation_required')::boolean from preview_few), true,
  'deactivating more than five people, and more than a tenth of the directory, needs confirming');
select is((select (diff ->> 'leaver_threshold')::integer from preview_few), 5,
  'and the preview states the threshold it was judged against (the greater of 5 and a tenth of 18 active)');
select alike(pg_temp.apply('upload_few', (select diff ->> 'preview_hash' from preview_few)), 'error: 22023%',
  'so it is refused without the confirmation');
select is(tests.attempt('alpha_admin', format('select public.discard_directory_upload(%L)', tests.id('upload_few')), p_keep => true), '1',
  'and can be discarded');

-- A manager swap, applied in one go -----------------------------------------------------------------

create temp table upload_swap as select * from pg_temp.live_rows(tests.id('alpha'));
update upload_swap set manager_ref = 'E014' where employee_ref = 'E002';
update upload_swap set manager_ref = 'E001' where employee_ref = 'E014';
select pg_temp.stage('upload_swap', 'upload_swap');
select is(pg_temp.apply('upload_swap', (select pg_temp.preview('upload_swap') ->> 'preview_hash')), '1',
  'two people can swap places in the reporting line in one upload');
select lives_ok('set constraints all immediate', 'judged on the end state, which has no loop');

-- Expiry and file removal ---------------------------------------------------------------------------

create temp table upload_old as select * from pg_temp.live_rows(tests.id('alpha'));
select pg_temp.stage('upload_old', 'upload_old');
update public.directory_uploads set uploaded_at = now() - interval '8 days' where id = tests.id('upload_old');
select is(tests.value_as('service', 'select public.expire_directory_uploads()::text'), '1', 'an upload left undecided for seven days expires');
select is((select count(*)::integer from public.directory_upload_rows where upload_id = tests.id('upload_old')), 0, 'and its staged rows are deleted');
select ok(
  tests.id('upload_old') in (select (x ->> 'upload_id')::uuid from jsonb_array_elements(
    tests.value_as('service', 'select jsonb_agg(to_jsonb(u)) from public.uploads_awaiting_file_removal() u')::jsonb) x),
  'every decided upload''s file is listed for removal from the bucket'
);

-- Formal ratings are read only through the logged function ------------------------------------------

select is(tests.count_as('alpha_admin', $$select count(*) from public.read_formal_ratings(tests.id('alpha'))$$), 4,
  'an administrator reads formal ratings through the logged function');
select ok(
  exists (select 1 from public.audit_logs where action = 'ratings.viewed' and actor_user_id = tests.user_id('alpha_admin')
          and detail ->> 'kind' = 'formal' and (detail ->> 'rows')::integer = 4),
  'and the view is logged with its row count'
);
select is(tests.attempt('alpha_exec', $$select * from public.read_formal_ratings(tests.id('alpha'))$$), 'denied',
  'an executive viewer cannot read formal ratings');
select is(tests.attempt('alpha_mgr', $$select * from public.read_formal_ratings(tests.id('alpha'))$$, 'aal1', array['otp']), 'denied',
  'a manager cannot read formal ratings');
select tests.authenticate_as('alpha_admin', 'aal2', null, null, interval '20 minutes');
select throws_ok($$select * from public.read_formal_ratings(tests.id('alpha'), null, 'export')$$, '42501', null,
  'an export needs TOTP verified within the last 15 minutes');
select tests.as_postgres();

-- Milestone 4: one person's rating, and the readiness check's read.
select is(tests.count_as('alpha_admin',
  $$select count(*) from public.read_formal_ratings(tests.id('alpha'), null, 'view', tests.id('alpha_E003'))$$), 1,
  'the edit page reads one person''s formal rating');
select ok(
  exists (select 1 from public.audit_logs where action = 'ratings.viewed' and actor_user_id = tests.user_id('alpha_admin')
          and (detail ->> 'employee_id')::uuid = tests.id('alpha_E003') and (detail ->> 'rows')::integer = 1),
  'and the view is logged as that person''s, with one row'
);
create temp table views_before as
  select count(*)::integer as n from public.audit_logs
  where action = 'ratings.viewed' and actor_user_id = tests.user_id('alpha_admin');
select is(tests.count_as('alpha_admin',
  $$select count(*) from public.read_formal_ratings(tests.id('alpha'), null, 'check')$$), 4,
  'the readiness check reads the formal ratings through the same function');
select ok(
  exists (select 1 from public.audit_logs where action = 'ratings.checked' and actor_user_id = tests.user_id('alpha_admin')
          and (detail ->> 'rows')::integer = 4),
  'and that read is logged as ratings.checked'
);
select is(
  (select count(*)::integer from public.audit_logs
   where action = 'ratings.viewed' and actor_user_id = tests.user_id('alpha_admin')),
  (select n from views_before),
  'and not as a view, so the ratings area''s count of views stays true'
);
select is(tests.attempt('alpha_exec', $$select * from public.read_formal_ratings(tests.id('alpha'), null, 'check')$$), 'denied',
  'an executive viewer cannot read formal ratings for a check either');

-- Snapshots never change ----------------------------------------------------------------------------

select throws_ok($$update public.snapshot_members set unit_id = unit_id, fte = 0.5 where snapshot_id = tests.id('alpha_open_snapshot')$$,
  '42501', 'a campaign snapshot never changes', 'a snapshot row cannot be altered, even by the table owner');
select throws_ok($$delete from public.snapshot_members where snapshot_id = tests.id('alpha_open_snapshot')$$,
  '42501', 'a campaign snapshot never changes', 'or removed');

select * from finish();

rollback;
