begin;

select plan(32);

insert into auth.users (id, email) values
  ('91000000-0000-4000-8000-000000000001', 'phase6-seller@example.com'),
  ('91000000-0000-4000-8000-000000000002', 'phase6-buyer@example.com'),
  ('91000000-0000-4000-8000-000000000003', 'phase6-outsider@example.com'),
  ('91000000-0000-4000-8000-000000000004', 'phase6-moderator@example.com');

update public.profiles set
  username = case id
    when '91000000-0000-4000-8000-000000000001' then 'TrustSeller'
    when '91000000-0000-4000-8000-000000000002' then 'TrustBuyer'
    when '91000000-0000-4000-8000-000000000003' then 'TrustOutsider'
    else 'TrustModerator'
  end,
  onboarding_completed = true
where id::text like '91000000-%';
update public.user_roles set role = 'MODERATOR'
where user_id = '91000000-0000-4000-8000-000000000004';

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values ('91000000-1000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Private issuer', 'Private card');
insert into public.offers (id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date)
values ('91000000-2000-4000-8000-000000000001', (select id from public.merchants where slug = 'adobe'), 'Phase six offer', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30);
insert into public.offer_listings (
  id, user_id, card_id, offer_id, min_spend, ask_amount, is_obo,
  verification_status, verification_timestamp, listing_status, reviewer_id
) values
  ('91000000-3000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '91000000-1000-4000-8000-000000000001', '91000000-2000-4000-8000-000000000001', 600, 500, true, 'VERIFIED', now(), '91000000-0000-4000-8000-000000000004', 'ACTIVE'),
  ('91000000-3000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', '91000000-1000-4000-8000-000000000001', '91000000-2000-4000-8000-000000000001', 600, 490, false, 'VERIFIED', now(), '91000000-0000-4000-8000-000000000004', 'ACTIVE'),
  ('91000000-3000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000001', '91000000-1000-4000-8000-000000000001', '91000000-2000-4000-8000-000000000001', 600, 480, false, 'VERIFIED', now(), '91000000-0000-4000-8000-000000000004', 'ACTIVE');
insert into public.conversations (
  id, listing_id, seller_user_id, buyer_user_id, unlock_status, status,
  merchant_name, offer_title, reward_amount, reward_type, min_spend,
  ask_amount, is_obo, seller_username
) values (
  '91000000-4000-4000-8000-000000000001', '91000000-3000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002',
  'UNLOCKED', 'ACTIVE', 'Adobe', 'Phase six offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'TrustSeller'
), (
  '91000000-4000-4000-8000-000000000002', '91000000-3000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002',
  'UNLOCKED', 'ACTIVE', 'Adobe', 'Phase six offer', 250, 'STATEMENT_CREDIT', 600, 490, false, 'TrustSeller'
);
insert into public.messages (conversation_id, sender_id, content)
values ('91000000-4000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Initial safe message');

select is((select relrowsecurity from pg_class where oid = 'public.ratings'::regclass), true, 'ratings use RLS');
select is((select relrowsecurity from pg_class where oid = 'public.user_blocks'::regclass), true, 'blocks use RLS');
select is((select relrowsecurity from pg_class where oid = 'public.reports'::regclass), true, 'reports use RLS');
select ok(not has_table_privilege('authenticated', 'public.ratings', 'UPDATE'), 'ratings cannot be edited by users');
select ok(not has_table_privilege('authenticated', 'public.reports', 'INSERT') and not has_table_privilege('authenticated', 'public.reports', 'UPDATE'), 'reports are created and moderated only through controlled functions');
select is((select count(*)::integer from information_schema.columns where table_schema = 'public' and table_name = 'public_reviews' and column_name = 'conversation_id'), 0, 'public reviews omit conversation identifiers');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.set_interaction_status('91000000-4000-4000-8000-000000000001', 'COMPLETED') $$,
  '42501', 'Conversation participant access required.', 'non-participant cannot complete interaction'
);
select throws_ok(
  $$ select public.submit_rating('91000000-4000-4000-8000-000000000001', 5::smallint, 5::smallint, 5::smallint, 5::smallint, 'Unauthorized') $$,
  '42501', 'Conversation participant access required.', 'non-participant cannot rate'
);

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ select public.submit_rating('91000000-4000-4000-8000-000000000001', 5::smallint, 5::smallint, 5::smallint, 5::smallint, 'Too early') $$,
  '22023', 'Only completed interactions can be rated.', 'active interaction cannot be rated'
);
select lives_ok($$ select public.set_interaction_status('91000000-4000-4000-8000-000000000001', 'COMPLETED') $$, 'participant completes interaction');
select is((select status::text from public.participant_conversations where id = '91000000-4000-4000-8000-000000000001'), 'COMPLETED', 'conversation is completed');
select is((select completed_interaction_count from public.profiles where id = '91000000-0000-4000-8000-000000000001'), 1, 'seller completed count aggregates');
select is((select completed_interaction_count from public.profiles where id = '91000000-0000-4000-8000-000000000002'), 1, 'buyer completed count aggregates');
select lives_ok(
  $$ select public.submit_rating('91000000-4000-4000-8000-000000000001', 5::smallint, 4::smallint, 5::smallint, 4::smallint, 'Clear and reliable') $$,
  'participant can rate the other user once'
);
select throws_ok(
  $$ select public.submit_rating('91000000-4000-8000-000000000001', 4::smallint, 4::smallint, 4::smallint, 4::smallint, 'Duplicate') $$,
  '23505', 'You already rated this interaction.', 'duplicate rating is rejected'
);
select results_eq(
  $$ select rating_average, rating_count from public.profiles where id = '91000000-0000-4000-8000-000000000001' $$,
  $$ values (5.00::numeric, 1::integer) $$,
  'profile rating aggregate is database controlled'
);
select results_eq(
  $$ select reviewer_username, overall_score from public.public_reviews where reviewed_user_id = '91000000-0000-4000-8000-000000000001' $$,
  $$ values ('TrustBuyer'::text, 5::smallint) $$,
  'public review exposes only pseudonymous reviewer context'
);

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.user_blocks (blocker_id, blocked_user_id)
values (auth.uid(), '91000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.user_blocks), 1, 'blocker can read their block');

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.user_blocks), 0, 'blocked user cannot inspect who blocked them');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, content) values ('91000000-4000-4000-8000-000000000002', auth.uid(), 'Blocked message') $$,
  '42501', null, 'blocked participant cannot send a new message'
);
select throws_ok(
  $$ select public.reserve_chat_conversation('91000000-3000-4000-8000-000000000003') $$,
  '22023', 'This listing is not available for chat unlock.', 'blocked user cannot start a future conversation'
);
select is((select count(*)::integer from public.messages where conversation_id = '91000000-4000-4000-8000-000000000001'), 1, 'existing message history remains visible');
select lives_ok(
  $$ select public.submit_report('91000000-0000-4000-8000-000000000001', '91000000-4000-4000-8000-000000000001', '91000000-3000-4000-8000-000000000001', 'CREDENTIAL_REQUEST', 'Requested private issuer login credentials.') $$,
  'participant can submit a private contextual report'
);
select is((select count(*)::integer from public.reports), 0, 'normal user cannot read reports, including their own');
select throws_ok(
  $$ update public.reports set status = 'RESOLVED' $$,
  '42501', null, 'normal user cannot alter report status'
);

select set_config('request.jwt.claims', '{"sub":"91000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(public.current_user_can_moderate(), true, 'moderator role is recognized');
select is((select count(*)::integer from public.moderation_report_queue), 1, 'moderator sees field-whitelisted report queue');
select lives_ok($$ select public.moderate_report((select id from public.reports limit 1), 'REVIEWING') $$, 'moderator can review a report');
select is((select status::text from public.reports limit 1), 'REVIEWING', 'report status is server controlled');
select lives_ok($$ select public.suspend_reported_user((select id from public.reports limit 1)) $$, 'moderator can suspend reported user');
select is((select account_status::text from public.profiles where id = '91000000-0000-4000-8000-000000000001'), 'SUSPENDED', 'reported user is suspended');
select is((select count(*)::integer from public.moderation_audit_logs), 2, 'moderation actions are audit logged');

reset role;
select * from finish();
rollback;
