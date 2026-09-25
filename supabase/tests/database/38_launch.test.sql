-- What a launch freezes (Milestone 5 plan, 2.3, 2.4 and 3): the snapshot and the scale map; per
-- unit the team keys with their headcount (E7, D5), the audiences (a leader from a unit above in the
-- leadership team, the managers of the members wherever they sit), the context, the deployment and
-- the C3 route; one rating session per manager and a membership for each who has an account; the
-- invitations (which carry no token and no hash); the outbox; and the calendar's proposals. And what
-- it refuses in the plan: members who are not exactly the unit's people, a leader who may not lead
-- the unit, a C3 route that disagrees with the manager modules.
--
-- Alpha, launched over C1 (E002 to E008), C2 (E009 to E013) and G1 (E014 to E018). E019 and E020
-- have left. E001 heads the grouping unit R, is flagged leadership team and manages E002 and E009.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(22);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_base', array['C1', 'C2', 'G1']);
create temp table launched as select tests.launch(tests.id('alpha_base'), 'alpha_admin') as result;

create temp view cu as
  select cu.id, mu.code from public.campaign_units cu
  join public.measurement_units mu on mu.id = cu.measurement_unit_id
  where cu.campaign_id = tests.id('alpha_base');

create temp view audience as
  select c.code, cam.audience, sm.employee_ref, t.name as team
  from public.campaign_audience_members cam
  join cu c on c.id = cam.campaign_unit_id
  join public.snapshot_members sm on sm.id = cam.snapshot_member_id
  left join public.campaign_teams t on t.id = cam.campaign_team_id;

-- 1 to 3: the snapshot and the scale map.
select is(
  (select member_count from public.directory_snapshots where campaign_id = tests.id('alpha_base')),
  18,
  'the snapshot freezes every active person'
);
select ok(
  (select m.decision = 'mapped' and m.calibrated from public.snapshot_scale_maps m
   join public.directory_snapshots s on s.id = m.snapshot_id where s.campaign_id = tests.id('alpha_base')),
  'the scale map is frozen with its calibration declaration'
);
select is(
  (select array_agg(e.label || ':' || e.band order by e.label) from public.snapshot_scale_map_entries e
   join public.snapshot_scale_maps m on m.id = e.snapshot_scale_map_id
   join public.directory_snapshots s on s.id = m.snapshot_id where s.campaign_id = tests.id('alpha_base')),
  array['Exceeds:4', 'Meets:3'],
  'with its entries'
);

-- 4 to 9: per unit, the team keys and the audiences.
select is(
  (select array_agg(c.code || ' ' || t.name || ' ' || t.headcount order by c.code, t.position)
   from public.campaign_teams t join cu c on c.id = t.campaign_unit_id),
  array['C1 Team One 4', 'C1 Team Two 3', 'C2 Team One 5', 'G1 Team One 5'],
  'each unit''s team keys carry their frozen headcount'
);
select is(
  (select array_agg(code || ':' || n order by code) from (
     select code, count(*) as n from audience where audience = 'members' group by code) x),
  array['C1:7', 'C2:5', 'G1:5'],
  'the members are each unit''s active people'
);
select is(
  (select array_agg(code || ' ' || employee_ref order by code, employee_ref) from audience where audience = 'leadership_team'),
  array['C1 E001', 'C1 E002', 'C2 E001', 'C2 E009', 'G1 E001', 'G1 E002'],
  'the leadership team is the flagged people of the unit and flagged leaders from a unit above'
);
select is(
  (select array_agg(code || ' ' || employee_ref order by code, employee_ref) from audience where audience = 'team_leaders'),
  array['C1 E002', 'C2 E009', 'G1 E014'],
  'the team leaders are the flagged people of each unit'
);
select is(
  (select array_agg(code || ' ' || employee_ref order by code, employee_ref) from audience where audience = 'managers'),
  array['C1 E001', 'C1 E002', 'C2 E001', 'C2 E009', 'G1 E002', 'G1 E014'],
  'the managers are whoever manages a member, wherever they sit'
);
select is(
  (select array_agg(c.code || ' ' || cu2.c3_route || ' ' || cu2.headcount order by c.code)
   from public.campaign_units cu2 join cu c on c.id = cu2.id),
  array['C1 module 7', 'C2 module 5', 'G1 module 5'],
  'each campaign unit records its route for talent density and its headcount'
);

-- 10 and 11: the frozen context and deployment.
select is(
  (select jsonb_array_length(x.context -> 'teams') || ' ' || jsonb_array_length(x.positions)
   from public.campaign_unit_contexts x join cu c on c.id = x.campaign_unit_id where c.code = 'C1'),
  '2 2',
  'the context carries the team keys and the position titles M-O1-LT offers'
);
select is(
  (select array_agg(a.audience || ':' || cardinality(a.items) order by a.audience)
   from public.campaign_audiences a join cu c on c.id = a.campaign_unit_id where c.code = 'C1'),
  array['admin_checklists:3', 'leadership_team:0', 'managers:3', 'members_part_a:71', 'members_part_b:11', 'team_leaders:12'],
  'the baseline deployment is frozen per audience'
);

-- 12 to 14: rating sessions, memberships, the accounts still to create.
select is(
  (select array_agg(sm.employee_ref order by sm.employee_ref) from public.rating_sessions s
   join public.snapshot_members sm on sm.id = s.manager_snapshot_member_id where s.campaign_id = tests.id('alpha_base')),
  array['E001', 'E002', 'E009', 'E014'],
  'one rating session per manager of a measured person'
);
select is(
  (select array_agg(x ->> 'email' order by x ->> 'email') from launched, jsonb_array_elements(result -> 'managersWithoutAccounts') x),
  array['e001@alpha.test', 'e014@alpha.test'],
  'the launch names the managers with no account yet'
);
select is(
  (select count(*)::integer from public.org_memberships m
   where m.organisation_id = tests.id('alpha') and m.role = 'manager_respondent' and m.revoked_at is null
     and m.employee_id in (tests.id('alpha_E002'), tests.id('alpha_E009'))),
  2,
  'managers with accounts keep or gain their manager membership'
);

-- 15 to 17: invitations and the outbox.
select is(
  (select array_agg(audience || ':' || n order by audience) from (
     select i.audience, count(*) as n from public.invitations i join cu c on c.id = i.campaign_unit_id group by i.audience) x),
  array['leadership_team:6', 'members_part_a:17', 'members_part_b:17', 'team_leaders:3'],
  'an invitation per person per anonymous audience'
);
select ok(
  (select bool_and(i.status = 'issued' and i.token_salt ~ '^[0-9a-f]{32}$') from public.invitations i join cu c on c.id = i.campaign_unit_id),
  'each carries only a salt: no token, no hash, no status of having answered'
);
select is(
  (select array_agg(kind || ':' || n order by kind) from (
     select kind, count(*) as n from private.email_outbox where campaign_id = tests.id('alpha_base') group by kind) x),
  array['manager_invitation:4', 'survey_invitation:18'],
  'one survey email per person asked, and a separate email per rating manager'
);

-- 18: the calendar.
select is(
  (select array_agg(cadence || ' +' || ((extract(year from age(due_on, private.today())) * 12 + extract(month from age(due_on, private.today())))::integer) order by due_on)
   from public.campaign_schedule where anchor_campaign_id = tests.id('alpha_base')),
  array['quarterly_pulse +3', 'half_yearly +6', 'quarterly_pulse +9', 'annual +12'],
  'a baseline proposes the year: pulse, half-yearly, pulse, annual (Cadence Master 7.7)'
);

-- 19 to 22: what the launch refuses in a plan.
select tests.clear_fixture_campaigns('beta');
select tests.draft_campaign('beta', 'beta_base', array['C1']);
select alike(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('beta_base'), public.setup_version(tests.id('beta')),
    jsonb_set(tests.launch_plan(tests.id('beta_base')), '{units,0,members}',
              (tests.launch_plan(tests.id('beta_base')) #> '{units,0,members}') - 0))),
  'error: 22023 the plan''s members for Operations are not the unit''s active people%',
  'a plan missing one of the unit''s people is refused'
);
select alike(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('beta_base'), public.setup_version(tests.id('beta')),
    jsonb_set(tests.launch_plan(tests.id('beta_base')), '{units,0,leadershipTeam}', to_jsonb(array[tests.id('beta_E010')])))),
  'error: 22023 the team leaders and leadership team of Operations must be its people or may lead it%',
  'a leadership team member from outside the unit and not above it is refused'
);
select alike(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('beta_base'), public.setup_version(tests.id('beta')),
    jsonb_set(tests.launch_plan(tests.id('beta_base')), '{units,0,c3Route}', '"formal"'))),
  'error: 22023 the talent-density route for Operations disagrees with the manager modules%',
  'a formal-ratings route with the manager band section deployed is refused'
);
select is(
  tests.attempt('service', format($$select public.launch_campaign(null, %L, %s, %L::jsonb)$$,
    tests.id('beta_base'), public.setup_version(tests.id('beta')), tests.launch_plan(tests.id('beta_base'), 'formal'))),
  '1',
  'on the formal route the manager modules are skills and knowledge only'
);

select * from finish();

rollback;
