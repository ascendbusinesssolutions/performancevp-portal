-- The rating manager's rules (PORTAL_BUILD_PLAN.md 3.3 and 3.5; DECISIONS.md 5.2; Milestone 3
-- plan, Sections 2.4 and 3.3).
--
-- A manager writes ratings only in their own session, only for their direct reports in the
-- campaign snapshot, only while the campaign is open, and only the value and the note. The employee
-- link comes from the snapshot. Evidence notes are required at 5, and at bands 5 and 1. Once the
-- campaign closes nothing changes, for anyone, except the purge's unlinking. No rating value ever
-- reaches the audit log.
begin;
\ir helpers/tests.psql
\ir helpers/fixture.psql

select plan(24);

select tests.seed_fixture();

create function pg_temp.as_mgr(p_key text, p_sql text)
returns text
language sql
as $$
  select tests.attempt(p_key, p_sql, 'aal1', array['otp'], p_keep => true)
$$;

-- Writing.
select is(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E005'), tests.id('alpha_skill_modelling'), 2)$$),
  '1', 'a manager rates a direct report in the open campaign'
);
select is(
  (select employee_id from public.skill_ratings where subject_snapshot_member_id = tests.member('alpha', 'open', 'E005')),
  tests.id('alpha_E005'),
  'the employee link is taken from the snapshot, not from the client'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E011'), tests.id('alpha_skill_modelling'), 2)$$),
  'denied', 'but not someone else''s report'
);
select is(
  pg_temp.as_mgr('alpha_mgr2', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E006'), tests.id('alpha_skill_modelling'), 2)$$),
  'denied', 'nor in another manager''s session'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_closed_session_mgr'), tests.member('alpha', 'closed', 'E006'), tests.id('alpha_skill_modelling'), 2)$$),
  'denied', 'nor in a closed campaign'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, employee_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E006'), tests.id('alpha_E010'), tests.id('alpha_skill_modelling'), 2)$$),
  'denied', 'the employee link cannot be supplied'
);

select is(
  pg_temp.as_mgr('alpha_mgr', $$update public.skill_ratings set rating = 2 where subject_snapshot_member_id = tests.member('alpha', 'open', 'E003')$$),
  '1', 'a manager changes a rating while the campaign is open'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$update public.skill_ratings set subject_snapshot_member_id = tests.member('alpha', 'open', 'E006') where subject_snapshot_member_id = tests.member('alpha', 'open', 'E003')$$),
  'denied', 'but never who it is about'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$update public.skill_ratings set rating = 1 where rating_session_id = tests.id('alpha_closed_session_mgr')$$),
  '0', 'and nothing in a closed campaign'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$delete from public.talent_bands where rating_session_id = tests.id('alpha_closed_session_mgr')$$),
  '0', 'a closed campaign''s ratings cannot be deleted'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$delete from public.skill_ratings where subject_snapshot_member_id = tests.member('alpha', 'open', 'E005')$$),
  '1', 'an open campaign''s rating can be withdrawn by its manager'
);

-- Evidence notes.
select alike(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E007'), tests.id('alpha_skill_modelling'), 5)$$),
  'error: 23514%', 'a rating of 5 needs an evidence note'
);
select alike(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.talent_bands (organisation_id, rating_session_id, subject_snapshot_member_id, band)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E007'), 1)$$),
  'error: 23514%', 'so does band 1'
);
select is(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.talent_bands (organisation_id, rating_session_id, subject_snapshot_member_id, band, evidence_note)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E007'), 5, 'Carried the migration')$$),
  '1', 'band 5 with its note is accepted'
);
select alike(
  pg_temp.as_mgr('alpha_mgr', $$insert into public.knowledge_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, knowledge_domain_id, rating, evidence_note)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E007'), tests.id('alpha_domain_c1'), 5, '   ')$$),
  'error: 23514%', 'a blank note is not a note'
);

-- Nobody else writes ratings.
select is(
  tests.attempt('alpha_admin', $$insert into public.skill_ratings (organisation_id, rating_session_id, subject_snapshot_member_id, skill_id, rating)
    values (tests.id('alpha'), tests.id('alpha_open_session_mgr'), tests.member('alpha', 'open', 'E008'), tests.id('alpha_skill_modelling'), 2)$$),
  'denied', 'an administrator cannot enter a rating'
);
select is(
  tests.attempt('support_a', $$update public.talent_bands set band = 4 where organisation_id = tests.id('alpha')$$),
  '0', 'staff under a session cannot change one'
);

-- Once the campaign closes, nothing changes, for anyone.
select throws_ok(
  $$update public.skill_ratings set rating = 1 where rating_session_id = tests.id('alpha_closed_session_mgr')$$,
  '42501', 'ratings are fixed once the campaign closes', 'not even for the table owner'
);
select throws_ok(
  $$delete from public.talent_bands where rating_session_id = tests.id('alpha_closed_session_mgr')$$,
  '42501', 'ratings are fixed once the campaign closes', 'and they cannot be deleted'
);
update public.campaigns set status = 'closed', closed_at = now() where id = tests.id('alpha_open');
select is(
  pg_temp.as_mgr('alpha_mgr', $$update public.skill_ratings set rating = 3 where rating_session_id = tests.id('alpha_open_session_mgr')$$),
  '0', 'closing the campaign ends the manager''s writing'
);
select is(
  tests.count_as('alpha_mgr', 'select count(*) from public.skill_ratings', 'aal1', array['otp']),
  4, 'while their own ratings stay readable to them, for pre-filling the next cycle'
);

-- A manager who leaves loses access.
update public.employees set status = 'inactive' where id = tests.id('alpha_E002');
select is(tests.count_as('alpha_mgr', 'select count(*) from public.skill_ratings', 'aal1', array['otp']), 0,
  'a manager whose record is deactivated reads nothing');

-- No rating value reaches the log.
select is(
  (select count(*)::integer from public.audit_logs
   where (coalesce(before, '{}'::jsonb) || coalesce(after, '{}'::jsonb)) ?| array['rating', 'band', 'evidence_note', 'rating_label', 'rating_date']),
  0,
  'no rating, band, note or formal label appears anywhere in the audit log'
);
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'skill_ratings' and action = 'row.update'
          and changed_columns @> array['rating'] and actor_user_id = tests.user_id('alpha_mgr')),
  'while the change itself, and who made it, is recorded'
);

select * from finish();

rollback;
