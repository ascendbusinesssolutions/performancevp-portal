-- The reference data the setup screens start from (Milestone 4 plan, Sections 3 and 5): who reads it,
-- that nobody writes it at run time, and that the template library has the shape the Online
-- Measurement Specification requires of what it seeds (4.5: 8 to 15 skills per role family, a
-- technical and behavioural mix, critical skills marked; 3.3: 8 to 12 decision types per unit, from
-- a starter list for each unit type).
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(10);

select tests.seed_fixture();

-- 1 to 3: every signed-in person reads the reference data; the anonymous role reads nothing.
select is(
  array[
    tests.count_as('alpha_exec', $$select count(*)::integer from public.ref_anzsic_divisions$$),
    tests.count_as('alpha_mgr', $$select count(*)::integer from public.ref_anzsic_divisions$$, 'aal1', array['otp']),
    tests.count_as('outsider', $$select count(*)::integer from public.ref_anzsic_divisions$$)
  ],
  array[19, 19, 19],
  'the 19 ANZSIC divisions are readable by every signed-in person'
);
select is(
  array[
    tests.count_as('alpha_admin', $$select count(*)::integer from public.ref_templates$$),
    tests.count_as('alpha_admin', $$select count(*)::integer from public.ref_template_items$$)
  ],
  array[
    (select count(*)::integer from public.ref_templates),
    (select count(*)::integer from public.ref_template_items)
  ],
  'and so is the whole template library'
);
select is(
  array[
    tests.count_as('anon', $$select count(*)::integer from public.ref_anzsic_divisions$$),
    tests.count_as('anon', $$select count(*)::integer from public.ref_templates$$),
    tests.count_as('anon', $$select count(*)::integer from public.ref_template_items$$)
  ],
  array[-1, -1, -1],
  'the anonymous role holds no privilege on any of it'
);

-- 4: nobody writes it at run time, the Owner included.
select is(
  array[
    tests.attempt('owner', $$insert into public.ref_templates (code, kind, name, is_placeholder, sort_order) values ('x', 'role_family', 'X', true, 99)$$),
    tests.attempt('alpha_admin', $$update public.ref_template_items set name = 'Changed' where template_code = 'sales'$$),
    tests.attempt('support_a', $$delete from public.ref_anzsic_divisions where code = 'S'$$),
    tests.attempt('service', $$insert into public.ref_anzsic_divisions (code, name, sort_order) values ('T', 'T', 20)$$)
  ],
  array['denied', 'denied', 'denied', 'denied'],
  'no role writes reference data; it changes by migration only'
);

-- 5 to 9: the shape of the library.
select is_empty(
  $$
    select t.code from public.ref_templates t
    left join public.ref_template_items i on i.template_code = t.code
    where t.kind = 'role_family'
    group by t.code
    having count(i.*) not between 8 and 15
        or count(*) filter (where i.skill_kind = 'technical') = 0
        or count(*) filter (where i.skill_kind = 'behavioural') = 0
        or count(*) filter (where i.is_critical) = 0
        or count(*) filter (where i.skill_kind is null) > 0
  $$,
  'every role family template has 8 to 15 skills, both kinds, and at least one critical skill'
);
select is(
  (select array_agg(unit_type order by unit_type) from public.ref_templates where kind = 'decision_types'),
  array['operations', 'other', 'professional_services', 'research_and_development', 'sales',
        'support_functions', 'technology'],
  'there is one decision-type starter list for each unit type'
);
select is_empty(
  $$
    select t.code from public.ref_templates t
    left join public.ref_template_items i on i.template_code = t.code
    where t.kind = 'decision_types'
    group by t.code
    having count(i.*) < 8 or count(*) filter (where i.skill_kind is not null) > 0
  $$,
  'every starter list offers at least 8 decision types and carries no skill tags'
);
select is_empty(
  $$
    select t.code from public.ref_templates t
    left join public.ref_template_items i on i.template_code = t.code
    where t.kind like '%_prompts'
    group by t.code
    having count(i.*) = 0 or count(*) filter (where i.skill_kind is not null) > 0
  $$,
  'each prompt set has prompts and no skill tags'
);
select is(
  (select count(*)::integer from public.ref_templates where not is_placeholder),
  0,
  'every template is flagged as placeholder content until the Role-Family Template Library is written'
);

-- 10: an organisation's sector must be a real division.
select alike(
  tests.attempt('alpha_admin', $$update public.organisations set anzsic_division = 'T' where id = tests.id('alpha')$$),
  'error: 23%',
  'an organisation''s ANZSIC division is one of the 19'
);

select * from finish();

rollback;
