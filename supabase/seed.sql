-- Local development seed. Runs after the migrations on `supabase db reset` and `supabase db start`,
-- never against staging or production (`supabase db push` does not seed). Reference data is seeded
-- by migration (PORTAL_BUILD_PLAN.md 2.4), not here.
--
-- One organisation with a persona per role, for walking through the sign-in paths locally. Every
-- persona's password is Portal-local-2026. Email codes and invitations appear in the local mail
-- viewer (Mailpit, http://127.0.0.1:55324). Roles that need TOTP are asked to enrol at first
-- sign-in.
--
--   owner@pvp.local      the Owner
--   support@pvp.local    support staff
--   ao@local.test        account owner
--   admin@local.test     administrator
--   exec@local.test      executive viewer
--   uv@local.test        unit viewer, scoped to Operations
--   mgr@local.test       manager (email-code sign-in; no password)

do $$
declare
  v_org uuid;
  v_root uuid;
  v_ops uuid;
  v_sales uuid;
  v_ops_team uuid;
  v_sales_team uuid;
  v_analyst uuid;
  v_lead uuid;
  v_mgr_employee uuid;
  v_user uuid;
  v_persona record;
  i integer;
begin
  insert into public.ref_employee_bands (code, label, max_employees, sort_order)
  values ('local_band', 'Local development band', 500, 1)
  on conflict do nothing;

  -- Accounts. The auth.users trigger creates each profile.
  for v_persona in
    select * from (values
      ('owner@pvp.local', 'Olivia Owner', true),
      ('support@pvp.local', 'Sam Support', true),
      ('ao@local.test', 'Avery Accountowner', true),
      ('admin@local.test', 'Adrian Administrator', true),
      ('exec@local.test', 'Eden Executive', true),
      ('uv@local.test', 'Uma Unitviewer', true),
      ('mgr@local.test', 'Mia Manager', false)
    ) as p (email, full_name, has_password)
  loop
    v_user := gen_random_uuid();
    -- Supabase Auth reads the token columns as strings, so they are empty rather than null.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_persona.email,
      case when v_persona.has_password then extensions.crypt('Portal-local-2026', extensions.gen_salt('bf')) else '' end,
      now(), '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', v_persona.full_name), now(), now(), false, false,
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(), v_user, v_user::text, 'email',
      jsonb_build_object('sub', v_user::text, 'email', v_persona.email, 'email_verified', true),
      now(), now(), now()
    );
  end loop;
  update public.profiles set is_owner = true where email = 'owner@pvp.local';
  update public.profiles set is_support_staff = true where email = 'support@pvp.local';

  -- The organisation and its current term.
  insert into public.organisations (name, anzsic_division, size_band)
  values ('Local Demo Organisation', 'K', '50_to_200')
  returning id into v_org;
  insert into public.subscriptions (
    organisation_id, employee_band, period_start, period_end, agreement_date, invoice_reference, provisioned_by
  ) values (
    v_org, 'local_band', current_date - 30, current_date + 335, current_date - 30, 'INV-LOCAL-1',
    (select id from public.profiles where email = 'owner@pvp.local')
  );

  -- Structure and context.
  insert into public.business_units (organisation_id, unit_code, name, unit_type)
  values (v_org, 'GRP', 'Group', 'other') returning id into v_root;
  insert into public.business_units (organisation_id, unit_code, name, parent_unit_id, unit_type)
  values (v_org, 'OPS', 'Operations', v_root, 'operations') returning id into v_ops;
  insert into public.business_units (organisation_id, unit_code, name, parent_unit_id, unit_type)
  values (v_org, 'SAL', 'Sales', v_root, 'sales') returning id into v_sales;
  insert into public.teams (organisation_id, unit_id, name) values (v_org, v_ops, 'Service') returning id into v_ops_team;
  insert into public.teams (organisation_id, unit_id, name) values (v_org, v_sales, 'Accounts') returning id into v_sales_team;
  insert into public.role_families (organisation_id, name) values (v_org, 'Analyst') returning id into v_analyst;
  insert into public.role_families (organisation_id, name, is_people_leader) values (v_org, 'Team Lead', true) returning id into v_lead;
  insert into public.skills (organisation_id, role_family_id, name, is_critical, kind) values
    (v_org, v_analyst, 'Case handling', true, 'technical'),
    (v_org, v_analyst, 'Customer communication', false, 'behavioural'),
    (v_org, v_lead, 'Coaching', true, 'behavioural');
  insert into public.knowledge_domains (organisation_id, unit_id, name, criticality) values
    (v_org, v_ops, 'Service standards', 3),
    (v_org, v_sales, 'Product range', 2);

  -- A small directory: a head of group, the manager persona running Operations, a Sales lead.
  insert into public.employees (organisation_id, employee_ref, first_name, last_name, work_email, unit_id,
                                role_title, role_family_id, start_date, fte, is_leadership_team)
  values (v_org, 'L001', 'Hana', 'Head', 'head@local.test', v_root, 'General Manager', v_lead, current_date - 2000, 1, true);
  insert into public.employees (organisation_id, employee_ref, first_name, last_name, work_email, unit_id, team_id,
                                manager_employee_id, role_title, role_family_id, start_date, fte, is_team_leader, is_leadership_team)
  select v_org, 'L002', 'Mia', 'Manager', 'mgr@local.test', v_ops, v_ops_team, e.id, 'Operations Lead', v_lead,
         current_date - 1500, 1, true, true
  from public.employees e where e.organisation_id = v_org and e.employee_ref = 'L001'
  returning id into v_mgr_employee;
  insert into public.employees (organisation_id, employee_ref, first_name, last_name, work_email, unit_id, team_id,
                                manager_employee_id, role_title, role_family_id, start_date, fte, is_team_leader)
  select v_org, 'L003', 'Sol', 'Saleslead', 'saleslead@local.test', v_sales, v_sales_team, e.id, 'Sales Lead', v_lead,
         current_date - 1200, 1, true
  from public.employees e where e.organisation_id = v_org and e.employee_ref = 'L001';
  for i in 4..11 loop
    insert into public.employees (organisation_id, employee_ref, first_name, last_name, work_email, unit_id, team_id,
                                  manager_employee_id, role_title, role_family_id, start_date, fte)
    select v_org, 'L' || lpad(i::text, 3, '0'), 'Person', 'Number' || i, 'person' || i || '@local.test',
           case when i <= 8 then v_ops else v_sales end,
           case when i <= 8 then v_ops_team else v_sales_team end,
           m.id, 'Analyst', v_analyst, current_date - 400 - i * 30, case when i = 7 then 0.6 else 1 end
    from public.employees m
    where m.organisation_id = v_org and m.employee_ref = case when i <= 8 then 'L002' else 'L003' end;
  end loop;

  -- Memberships.
  insert into public.org_memberships (organisation_id, user_id, role)
  select v_org, p.id, r.role
  from (values ('ao@local.test', 'account_owner'), ('admin@local.test', 'administrator'),
               ('exec@local.test', 'executive_viewer'), ('uv@local.test', 'unit_viewer')) as r (email, role)
  join public.profiles p on p.email = r.email;
  insert into public.org_memberships (organisation_id, user_id, role, employee_id)
  select v_org, p.id, 'manager_respondent', v_mgr_employee from public.profiles p where p.email = 'mgr@local.test';
  insert into public.unit_access (organisation_id, membership_id, unit_id)
  select v_org, m.id, v_ops
  from public.org_memberships m join public.profiles p on p.id = m.user_id
  where m.organisation_id = v_org and p.email = 'uv@local.test';
end
$$;
