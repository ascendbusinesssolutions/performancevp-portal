-- Reminders and notices (Milestone 5 plan, 5.1 and 5.2). A survey reminder is recorded for the
-- campaign, never for a person: the job works out who still has a live token in memory. Manual
-- reminders are limited to one a day, per scope and per manager; a reminder day runs once, and
-- queues the managers' and the checklists' reminders with it. The calendar's notice goes once,
-- fourteen days before a proposal is due.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql
\ir helpers/campaign.psql

select plan(12);

select tests.seed_fixture();
select tests.clear_fixture_campaigns('alpha');
select tests.draft_campaign('alpha', 'alpha_remind', array['C1']);
select tests.launch(tests.id('alpha_remind'), 'alpha_admin');

-- 1: nothing about a survey reminder names a person.
select is(
  (select array_agg(column_name::text order by column_name::text) from information_schema.columns
   where table_schema = 'public' and table_name = 'campaign_reminders'),
  array['audience', 'campaign_id', 'campaign_unit_id', 'emails', 'id', 'kind', 'organisation_id',
        'reminder_day', 'requested_at', 'requested_by', 'sent_at'],
  'a survey reminder records when, for which units and audiences, and how many emails; never who'
);

-- 2 and 3: an administrator's survey reminder waits for the invitations, then one a day.
select alike(
  tests.attempt('alpha_admin', format($$select public.request_survey_reminder(%L)$$, tests.id('alpha_remind'))),
  'error: 22023 reminders go while the campaign is open, once its invitations have gone%',
  'no reminder before the invitations have gone'
);
select tests.issue_tokens(tests.id('alpha_remind'));
select tests.attempt('alpha_admin', format($$select public.request_survey_reminder(%L)$$, tests.id('alpha_remind')), p_keep => true);
select is(
  array[
    tests.attempt('alpha_admin', format($$select public.request_survey_reminder(%L)$$, tests.id('alpha_remind'))),
    tests.attempt('alpha_exec', format($$select public.request_survey_reminder(%L)$$, tests.id('alpha_remind')))
  ],
  array['error: 22023 a reminder went to these people less than a day ago', 'denied'],
  'one a day, and only administrators, the account owner and staff under a session'
);

-- 4 and 5: the job reads the invitations, with their addresses, and nothing else may.
select is(
  tests.attempt('alpha_admin', format($$select public.invitations_for_reminders(%L)$$, tests.id('alpha_remind'))),
  'denied',
  'only the service role reads the invitations for a reminder'
);
select is(
  (select jsonb_array_length(public.invitations_for_reminders(tests.id('alpha_remind')) -> 'invitations')),
  (select count(*)::integer from public.invitations i join public.campaign_units cu on cu.id = i.campaign_unit_id
   where cu.campaign_id = tests.id('alpha_remind')),
  'every invitation not bounced, for the job to test against the live tokens'
);

-- 6 and 7: a reminder day runs once, and brings the managers' and checklists' reminders.
select ok(public.claim_automatic_reminder(tests.id('alpha_remind'), 4) is not null, 'a reminder day is claimed');
select ok(
  public.claim_automatic_reminder(tests.id('alpha_remind'), 4) is null
  and (select count(*) from private.email_outbox where campaign_id = tests.id('alpha_remind') and kind = 'manager_reminder') > 0
  and (select count(*) from private.email_outbox where campaign_id = tests.id('alpha_remind') and kind = 'checklist_reminder') = 2,
  'once, with a reminder to each manager with reports to rate and to the account owner and administrator'
);

-- 8 and 9: managers, one a day each.
select is(
  tests.value_as('alpha_admin', format($$select public.remind_managers(%L)::text$$, tests.id('alpha_remind'))),
  '0',
  'a manager reminded within the day is not reminded again'
);
update public.rating_sessions set last_reminded_at = now() - interval '2 days' where campaign_id = tests.id('alpha_remind');
select is(
  tests.value_as('alpha_admin', format($$select public.remind_managers(%L)::text$$, tests.id('alpha_remind'))),
  (select count(*)::text from private.session_progress(tests.id('alpha_remind')) p where p.rated < p.reports),
  'after a day, each manager with reports still to rate is reminded'
);

-- 10: a fully rated report counts.
select is(
  (select sum(reports)::integer from private.session_progress(tests.id('alpha_remind'))),
  (select count(*)::integer from public.campaign_audience_members cam join public.campaign_units cu on cu.id = cam.campaign_unit_id
   join public.snapshot_members sm on sm.id = cam.snapshot_member_id
   where cu.campaign_id = tests.id('alpha_remind') and cam.audience = 'members' and sm.manager_snapshot_member_id is not null),
  'every measured person with a manager is a report of one session'
);

-- 11 and 12: the calendar's notice.
select is(public.queue_schedule_notices(), 0, 'nothing is due within fourteen days of the launch');
update public.campaign_schedule set due_on = private.today() + 10
where anchor_campaign_id = tests.id('alpha_remind') and cadence = 'quarterly_pulse' and due_on = (
  select min(due_on) from public.campaign_schedule where anchor_campaign_id = tests.id('alpha_remind'));
select ok(
  public.queue_schedule_notices() = 2 and public.queue_schedule_notices() = 0
  and (select bool_and(r -> 'schedule' ->> 'cadence' = 'quarterly_pulse')
       from jsonb_array_elements(public.claim_outbox(100, tests.id('alpha_remind'))) r where r ->> 'kind' = 'schedule_notice'),
  'fourteen days before a proposal is due, the account owner and administrator are told, once'
);

select * from finish();

rollback;
