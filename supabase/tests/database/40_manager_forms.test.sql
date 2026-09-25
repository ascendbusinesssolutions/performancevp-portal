-- The manager rating form's rules in the database (Milestone 5 plan, 3.4): a manager rates only
-- their own direct reports that the campaign measures, on the skills of the report's role family and
-- the domains of the report's unit as frozen at launch, and gives no talent band where the unit
-- takes talent density from formal ratings. Evidence notes stay required at 5 and at Bands 5 and 1.
-- A manager reads the frozen context of the campaigns they rate in, for their form; no viewer does.
--
-- Alpha: E002 (alpha_mgr) manages E003 to E008 in C1 and E014 in G1. C1 is launched on the module
-- route and G1, in a second campaign, on the formal-ratings route.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(11);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_rate', array['C1']);
select tests.launch(tests.id('alpha_rate'), 'alpha_admin');
select tests.draft_campaign('alpha', 'alpha_formal', array['G1']);
select tests.launch(tests.id('alpha_formal'), 'alpha_admin', 'formal');

create function pg_temp.rating(p_campaign text, p_ref text, p_table text, p_column text, p_value uuid, p_rating integer, p_note text default null)
returns text
language sql
as $$
  select tests.attempt('alpha_mgr', format(
    $f$insert into public.%I (organisation_id, rating_session_id, subject_snapshot_member_id, %I, %s, evidence_note)
       values (%L, (select s.id from public.rating_sessions s where s.campaign_id = %L and s.manager_employee_id = %L),
               (select sm.id from public.snapshot_members sm join public.directory_snapshots d on d.id = sm.snapshot_id
                where d.campaign_id = %L and sm.employee_id = %L), %L, %s, %L)$f$,
    p_table, p_column, case when p_table = 'talent_bands' then 'band' else 'rating' end,
    tests.id('alpha'), tests.id('alpha_' || p_campaign), tests.id('alpha_E002'), tests.id('alpha_' || p_campaign), tests.id('alpha_' || p_ref),
    p_value, p_rating, p_note), 'aal1', array['otp'])
$$;
create function pg_temp.band(p_campaign text, p_ref text, p_band integer, p_note text default null)
returns text
language sql
as $$
  select tests.attempt('alpha_mgr', format(
    $f$insert into public.talent_bands (organisation_id, rating_session_id, subject_snapshot_member_id, band, evidence_note)
       values (%L, (select s.id from public.rating_sessions s where s.campaign_id = %L and s.manager_employee_id = %L),
               (select sm.id from public.snapshot_members sm join public.directory_snapshots d on d.id = sm.snapshot_id
                where d.campaign_id = %L and sm.employee_id = %L), %s, %L)$f$,
    tests.id('alpha'), tests.id('alpha_' || p_campaign), tests.id('alpha_E002'), tests.id('alpha_' || p_campaign), tests.id('alpha_' || p_ref),
    p_band, p_note), 'aal1', array['otp'])
$$;

-- 1 to 4: skills and domains of the frozen context.
select is(
  pg_temp.rating('rate', 'E003', 'skill_ratings', 'skill_id', tests.id('alpha_skill_modelling'), 4),
  '1',
  'a manager rates a direct report on a skill of the report''s role family'
);
select is(
  pg_temp.rating('rate', 'E003', 'skill_ratings', 'skill_id',
    (select id from public.skills where organisation_id = tests.id('alpha') and name = 'Coaching'), 4),
  'denied',
  'not on a skill of another role family'
);
select is(
  pg_temp.rating('rate', 'E003', 'knowledge_ratings', 'knowledge_domain_id', tests.id('alpha_domain_c1'), 3),
  '1',
  'on a knowledge domain of the report''s unit'
);
select is(
  pg_temp.rating('rate', 'E003', 'knowledge_ratings', 'knowledge_domain_id',
    (select id from public.knowledge_domains where organisation_id = tests.id('alpha') and name = 'Product range'), 3),
  'denied',
  'not on another unit''s domain'
);

-- 5 to 8: talent bands, the route and the evidence note.
select is(pg_temp.band('rate', 'E003', 3), '1', 'on the module route the manager gives a band');
select is(pg_temp.band('formal', 'E014', 3), 'denied', 'on the formal-ratings route the band section does not exist');
select alike(pg_temp.band('rate', 'E004', 5), 'error: 23514%', 'a Band 5 needs an evidence note');
select is(pg_temp.band('rate', 'E004', 5, 'Leads the hardest client work'), '1', 'and is accepted with one');

-- 9: only the manager's own reports this campaign measures.
select is(
  tests.attempt('alpha_mgr', format(
    $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
      values (%L, (select id from public.rating_sessions where campaign_id = %L and manager_employee_id = %L),
              (select sm.id from public.snapshot_members sm join public.directory_snapshots d on d.id = sm.snapshot_id
               where d.campaign_id = %L and sm.employee_id = %L), %L, 3)$$,
    tests.id('alpha'), tests.id('alpha_rate'), tests.id('alpha_E002'), tests.id('alpha_rate'), tests.id('alpha_E014'),
    (select id from public.skills where organisation_id = tests.id('alpha') and name = 'Coaching')), 'aal1', array['otp']),
  'denied',
  'not a report this campaign does not measure (E014 is in G1, outside this campaign)'
);

-- 10 and 11: who reads the frozen context.
select is(
  tests.count_as('alpha_mgr', format($$select count(*)::integer from public.campaign_unit_contexts x
    join public.campaign_units cu on cu.id = x.campaign_unit_id where cu.campaign_id = %L$$, tests.id('alpha_rate')), 'aal1', array['otp']),
  1,
  'a manager reads the frozen context of a campaign they rate in'
);
select is(
  array[
    tests.count_as('alpha_exec', $$select count(*)::integer from public.campaign_unit_contexts$$),
    tests.count_as('alpha_uv', $$select count(*)::integer from public.campaign_unit_contexts$$)
  ],
  array[0, 0],
  'viewers read none'
);

select * from finish();

rollback;
