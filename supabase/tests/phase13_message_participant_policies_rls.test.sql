begin;

select plan(10);

insert into auth.users (id, email) values
  ('97000000-0000-4000-8000-000000000001', 'phase13-seller@example.com'),
  ('97000000-0000-4000-8000-000000000002', 'phase13-buyer@example.com'),
  ('97000000-0000-4000-8000-000000000003', 'phase13-outsider@example.com'),
  ('97000000-0000-4000-8000-000000000004', 'phase13-reviewer@example.com');

update public.profiles set
  username = case id
    when '97000000-0000-4000-8000-000000000001' then 'MessageSeller'
    when '97000000-0000-4000-8000-000000000002' then 'MessageBuyer'
    when '97000000-0000-4000-8000-000000000003' then 'MessageOutsider'
    else 'MessageReviewer'
  end,
  onboarding_completed = true
where id::text like '97000000-%';

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values ('97000000-1000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', 'Private issuer', 'Private card');

insert into public.offers (id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date)
values (
  '97000000-2000-4000-8000-000000000001',
  (select id from public.merchants where slug = 'adobe'),
  'Message policy offer', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30
);

insert into public.offer_listings (
  id, user_id, card_id, offer_id, min_spend, ask_amount, is_obo,
  verification_status, verification_timestamp, listing_status, reviewer_id
) values (
  '97000000-3000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  '97000000-1000-4000-8000-000000000001',
  '97000000-2000-4000-8000-000000000001',
  600, 500, true, 'VERIFIED', now(), 'ACTIVE',
  '97000000-0000-4000-8000-000000000004'
);

insert into public.conversations (
  id, listing_id, seller_user_id, buyer_user_id, unlock_status, status,
  merchant_name, offer_title, reward_amount, reward_type, min_spend,
  ask_amount, is_obo, seller_username
) values (
  '97000000-4000-4000-8000-000000000001',
  '97000000-3000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000002',
  'UNLOCKED', 'ACTIVE', 'Adobe', 'Message policy offer', 250,
  'STATEMENT_CREDIT', 600, 500, true, 'MessageSeller'
);

insert into public.messages (id, conversation_id, sender_id, content)
values (
  '97000000-5000-4000-8000-000000000001',
  '97000000-4000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'Initial safe message'
);

select ok(
  not has_table_privilege('authenticated', 'public.conversations', 'select'),
  'authenticated users still cannot read raw conversations'
);
select ok(
  has_function_privilege('authenticated', 'public.current_user_can_access_conversation(uuid,boolean,boolean)', 'execute'),
  'authenticated users can invoke the boolean participant guard'
);
select ok(
  not has_function_privilege('anon', 'public.current_user_can_access_conversation(uuid,boolean,boolean)', 'execute'),
  'anonymous users cannot invoke the participant guard'
);

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*)::integer from public.messages where conversation_id = '97000000-4000-4000-8000-000000000001'),
  1,
  'a participant can read messages without raw conversation access'
);
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, content)
     values ('97000000-4000-4000-8000-000000000001', auth.uid(), 'Buyer reply') $$,
  'an active unblocked participant can send a message'
);
select lives_ok(
  $$ update public.messages set read_at = now()
     where id = '97000000-5000-4000-8000-000000000001' $$,
  'a recipient can mark a message as read'
);

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.messages where conversation_id = '97000000-4000-4000-8000-000000000001'),
  0,
  'a non-participant cannot read messages'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, content)
     values ('97000000-4000-4000-8000-000000000001', auth.uid(), 'Unauthorized reply') $$,
  '42501', null,
  'a non-participant cannot send a message'
);

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.user_blocks (blocker_id, blocked_user_id)
values (auth.uid(), '97000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, content)
     values ('97000000-4000-4000-8000-000000000001', auth.uid(), 'Blocked reply') $$,
  '42501', null,
  'a blocked participant cannot send a message'
);
select is(
  (select count(*)::integer from public.messages where conversation_id = '97000000-4000-4000-8000-000000000001'),
  2,
  'blocked participants retain their existing message history'
);

reset role;
select * from finish();
rollback;
