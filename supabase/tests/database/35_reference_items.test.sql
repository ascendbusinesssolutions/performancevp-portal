-- The instrument as reference data (Milestone 5 plan, Section 1): who reads it, that nobody writes
-- it at run time, and the counts the source documents fix. 36_reference_items_data, generated from
-- the source documents, proves every row.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(7);

select tests.seed_fixture();

-- 1 and 2: every signed-in person reads the instrument; the anonymous role reads nothing.
select is(
  array[
    tests.count_as('alpha_exec', $$select count(*)::integer from public.ref_survey_items$$),
    tests.count_as('alpha_mgr', $$select count(*)::integer from public.ref_module_items$$, 'aal1', array['otp']),
    tests.count_as('outsider', $$select count(*)::integer from public.ref_admin_checklist_bands$$),
    tests.count_as('alpha_uv', $$select count(*)::integer from public.ref_event_triggers$$)
  ],
  array[
    71,
    (select count(*)::integer from public.ref_module_items),
    (select count(*)::integer from public.ref_admin_checklist_bands),
    (select count(*)::integer from public.ref_event_triggers)
  ],
  'every signed-in person reads the instrument'
);
select is(
  array[
    tests.count_as('anon', $$select count(*)::integer from public.ref_survey_items$$),
    tests.count_as('anon', $$select count(*)::integer from public.ref_pulse_rotation$$),
    tests.count_as('anon', $$select count(*)::integer from public.ref_admin_checklists$$)
  ],
  array[-1, -1, -1],
  'the anonymous role holds no privilege on it'
);

-- 3: nobody changes the instrument at run time, the Owner and the service role included.
select is(
  array[
    tests.attempt('owner', $$update public.ref_survey_items set wording = 'Changed' where code = 'CII-01'$$),
    tests.attempt('alpha_admin', $$delete from public.ref_pulse_rotation where rotation = 1$$),
    tests.attempt('support_a', $$insert into public.ref_modules (code, audience, sub_dimension, repeats_over, disclosure, source, position) values ('M-X', 'managers', 'C1', 'none', 'none', 'x', 99)$$),
    tests.attempt('service', $$update public.ref_admin_checklist_bands set score = 0$$),
    tests.attempt('alpha_ao', $$update public.ref_event_triggers set affects = '{}'$$)
  ],
  array['denied', 'denied', 'denied', 'denied', 'denied'],
  'no role writes the instrument; it changes by migration only'
);

-- 4 to 7: the counts the Survey Blueprint and the Module Library fix.
select is(
  array[
    (select count(*)::integer from public.ref_survey_items where in_baseline),
    (select count(*)::integer from public.ref_survey_items where in_annual),
    (select count(*)::integer from public.ref_survey_items where in_half_yearly)
  ],
  array[71, 71, 57],
  '71 items at baseline and annual, 57 at half-yearly'
);
select is(
  (select array_agg(n order by rotation) from (
     select rotation, count(*)::integer as n from public.ref_pulse_rotation group by rotation
   ) r),
  array[17, 17, 17, 17],
  'every pulse rotation row holds 17 items'
);
select is(
  (select array_agg(module_code || ':' || n order by module_code) from (
     select module_code, count(*) filter (where online) as n from public.ref_module_items group by module_code
   ) m),
  array['M-C1-MGR:1', 'M-C2-MGR:1', 'M-C3-MGR:2', 'M-C5-TL:12', 'M-O1-CASCADE:5', 'M-O1-LT:6', 'M-O2-IA:6', 'M-O3-PF:6'],
  'each module deploys the items its source defines online'
);
select is(
  (select array_agg(checklist_code || ':' || n order by checklist_code) from (
     select checklist_code, count(*) as n from public.ref_admin_checklist_facts group by checklist_code
   ) c),
  array['ADM-O1:3', 'ADM-O2:4', 'ADM-O4:5'],
  'the checklists ask three, four and five facts'
);

select * from finish();

rollback;
