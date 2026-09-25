-- The manager's rating form (Milestone 5 plan, 3.4; D14). A manager opens only their own form: their
-- direct reports in the units the campaign measures, with the frozen framework, their ratings so far
-- and their own earlier ratings of the same people for the pre-fill. They save through
-- save_manager_ratings while the campaign is open, where the guard and the evidence constraints hold.
--
-- Alpha: E002 (alpha_mgr) manages E003 to E008 in C1 and E014 in G1, and rated E003 in the
-- fixture's two earlier campaigns.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(10);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_rate', array['C1']);
select tests.launch(tests.id('alpha_rate'), 'alpha_admin');

create function pg_temp.form(p_persona text)
returns jsonb
language sql
as $$
  select tests.value_as(p_persona, format($f$select public.my_rating_form(%L)::text$f$, tests.id('alpha_rate')),
    'aal1', array['otp'])::jsonb
$$;
create function pg_temp.subject(p_ref text)
returns uuid
language sql
stable
as $$
  select sm.id from public.snapshot_members sm join public.directory_snapshots d on d.id = sm.snapshot_id
  where d.campaign_id = tests.id('alpha_rate') and sm.employee_id = tests.id('alpha_' || p_ref)
$$;
create function pg_temp.save(p_persona text, p_ref text, p_ratings jsonb)
returns text
language sql
as $$
  select tests.attempt(p_persona, format($f$select public.save_manager_ratings(
      (select s.id from public.rating_sessions s where s.campaign_id = %L and s.manager_employee_id = %L), %L, %L::jsonb)$f$,
    tests.id('alpha_rate'), tests.id('alpha_E002'), pg_temp.subject(p_ref), p_ratings), 'aal1', array['otp'], true)
$$;

-- 1 and 2: whose form.
select is(
  array[
    tests.attempt('alpha_admin', format($$select public.my_rating_form(%L)$$, tests.id('alpha_rate'))),
    tests.attempt('beta_mgr', format($$select public.my_rating_form(%L)$$, tests.id('alpha_rate')), 'aal1', array['otp'])
  ],
  array['denied', 'denied'],
  'only the rating manager opens the form: not an administrator, not another organisation'
);
select is(
  (select array_agg(r ->> 'name' order by r ->> 'name') from jsonb_array_elements(pg_temp.form('alpha_mgr') -> 'reports') r),
  (select array_agg(e.first_name || ' ' || e.last_name order by e.first_name || ' ' || e.last_name) from public.employees e
   where e.organisation_id = tests.id('alpha') and e.status = 'active' and e.manager_employee_id = tests.id('alpha_E002')
     and e.unit_id = tests.id('alpha_C1')),
  'it lists the manager''s direct reports in the units this campaign measures, and no one else'
);

-- 3: the frozen framework and the manager modules asked.
select ok(
  (select jsonb_array_length(u -> 'roleFamilies') > 0 and jsonb_array_length(u -> 'knowledgeDomains') > 0
          and u -> 'items' = '["c1", "c2", "c3"]'::jsonb
   from jsonb_array_elements(pg_temp.form('alpha_mgr') -> 'units') u),
  'with each unit''s frozen skills and domains, and whether the band is asked'
);

-- 4: the pre-fill is the manager's own latest earlier rating of the same person.
select is(
  (select (p ->> 'value')::integer from jsonb_array_elements(pg_temp.form('alpha_mgr') -> 'previous' -> 'skills') p
   where (p ->> 'subject')::uuid = pg_temp.subject('E003') and (p ->> 'id')::uuid = tests.id('alpha_skill_modelling')),
  (select x.rating::integer from public.skill_ratings x
   join public.rating_sessions s on s.id = x.rating_session_id
   join public.campaigns c on c.id = s.campaign_id
   where x.employee_id = tests.id('alpha_E003') and x.skill_id = tests.id('alpha_skill_modelling')
     and c.id <> tests.id('alpha_rate')
   order by c.launched_at desc limit 1),
  'the pre-fill is the manager''s own latest earlier rating of the same person'
);

-- 5 to 7: saving.
select is(
  pg_temp.save('alpha_mgr', 'E003', jsonb_build_object(
    'skills', jsonb_build_array(jsonb_build_object('id', tests.id('alpha_skill_modelling'), 'value', 4)),
    'knowledge', jsonb_build_array(jsonb_build_object('id', tests.id('alpha_domain_c1'), 'value', 3)),
    'band', jsonb_build_object('value', 3))),
  '1',
  'a manager saves a report''s skills, knowledge and band'
);
select pg_temp.save('alpha_mgr', 'E003', jsonb_build_object(
  'skills', jsonb_build_array(jsonb_build_object('id', tests.id('alpha_skill_modelling'), 'value', 5, 'note', 'Rebuilt the forecast model'))));
select is(
  (select array_agg(r.rating || ':' || coalesce(r.evidence_note, '')) from public.skill_ratings r
   join public.rating_sessions s on s.id = r.rating_session_id
   where s.campaign_id = tests.id('alpha_rate') and r.subject_snapshot_member_id = pg_temp.subject('E003')),
  array['5:Rebuilt the forecast model'],
  'saving again replaces the rating, and a 5 carries its evidence'
);
select is(
  array[
    pg_temp.save('alpha_mgr', 'E004', jsonb_build_object(
      'skills', jsonb_build_array(jsonb_build_object('id', tests.id('alpha_skill_modelling'), 'value', 5)))),
    pg_temp.save('alpha_mgr', 'E004', jsonb_build_object('band', jsonb_build_object('value', 1)))
  ],
  array[
    'error: 23514 new row for relation "skill_ratings" violates check constraint "skill_ratings_evidence"',
    'error: 23514 new row for relation "talent_bands" violates check constraint "talent_bands_evidence"'
  ],
  'a 5 without evidence, or a band of 1 without it, is refused'
);

-- 8 and 9: only the caller's own session, and only while open.
select is(
  tests.attempt('beta_mgr', format($$select public.save_manager_ratings(
      (select s.id from public.rating_sessions s where s.campaign_id = %L limit 1), %L, '{}'::jsonb)$$,
    tests.id('alpha_rate'), pg_temp.subject('E003')), 'aal1', array['otp']),
  'denied',
  'no one saves into another manager''s form'
);
update public.campaigns set status = 'closed', closed_at = now() where id = tests.id('alpha_rate');
select is(
  pg_temp.save('alpha_mgr', 'E003', jsonb_build_object('band', jsonb_build_object('value', 4))),
  'denied',
  'nothing is saved once the campaign closes'
);

-- 10: the list of open forms.
select is(
  tests.value_as('alpha_mgr', format($$select jsonb_array_length(public.my_rating_campaigns(%L))::text$$, tests.id('alpha')),
    'aal1', array['otp']),
  '0',
  'a closed campaign is no longer among the manager''s open forms'
);

select * from finish();

rollback;
