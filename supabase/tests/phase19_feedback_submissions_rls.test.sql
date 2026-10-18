begin;

select plan(16);

insert into auth.users (id, email) values
  ('97000000-0000-4000-8000-000000000001', 'feedback-owner@example.com'),
  ('97000000-0000-4000-8000-000000000002', 'feedback-other@example.com'),
  ('97000000-0000-4000-8000-000000000003', 'feedback-moderator@example.com');

update public.profiles set
  username = case id
    when '97000000-0000-4000-8000-000000000001' then 'FeedbackOwner'
    when '97000000-0000-4000-8000-000000000002' then 'FeedbackOther'
    else 'FeedbackModerator'
  end,
  onboarding_completed = true
where id::text like '97000000-%';

insert into public.user_roles (user_id, role)
values ('97000000-0000-4000-8000-000000000003', 'MODERATOR');

select is((select relrowsecurity from pg_class where oid = 'public.feedback_submissions'::regclass), true, 'feedback submissions use RLS');
select ok(has_table_privilege('authenticated', 'public.feedback_submissions', 'INSERT'), 'authenticated users can submit feedback');
select ok(has_table_privilege('authenticated', 'public.feedback_submissions', 'SELECT'), 'moderator reads can be authorized by RLS');
select ok(has_table_privilege('authenticated', 'public.feedback_submissions', 'UPDATE'), 'moderator updates can be authorized by RLS');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'DELETE'), 'feedback cannot be deleted through the client role');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.feedback_submissions (user_id, type, category, subject, message, page_url)
values (auth.uid(), 'BUG', 'MARKETPLACE', '  Search problem  ', '  Results did not load.  ', '/search');
select is((select count(*)::integer from public.feedback_submissions), 0, 'submitter cannot read their submission afterward');
select throws_ok(
  $$ insert into public.feedback_submissions (user_id, type, subject, message) values ('97000000-0000-4000-8000-000000000002', 'FEEDBACK', 'Wrong owner', 'Not allowed') $$,
  '42501', null, 'user cannot submit feedback for another account'
);
select throws_ok(
  $$ insert into public.feedback_submissions (user_id, type, subject, message, status) values (auth.uid(), 'FEEDBACK', 'Bad status', 'Not allowed', 'REVIEWED') $$,
  '42501', null, 'user cannot create pre-reviewed feedback'
);
select lives_ok(
  $$ update public.feedback_submissions set status = 'CLOSED' $$,
  'submitter update affects no hidden rows'
);

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.feedback_submissions), 0, 'another user cannot read submissions');

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::integer from public.feedback_submissions), 1, 'moderator can read the feedback queue');
select is((select subject from public.feedback_submissions limit 1), 'Search problem', 'submission text is trimmed');
update public.feedback_submissions set status = 'REVIEWED';
select is((select status::text from public.feedback_submissions limit 1), 'REVIEWED', 'moderator can mark feedback reviewed');
select ok((select reviewed_at is not null from public.feedback_submissions limit 1), 'review timestamp is recorded');
select is((select count(*)::integer from public.admin_audit_logs where action = 'FEEDBACK_REVIEWED'), 1, 'status change is audit logged');
select throws_ok(
  $$ update public.feedback_submissions set subject = 'Changed by moderator' $$,
  '42501', null, 'moderator cannot edit submission content'
);

reset role;
select * from finish();
rollback;

