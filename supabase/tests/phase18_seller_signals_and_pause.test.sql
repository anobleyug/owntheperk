begin;

select plan(20);

insert into auth.users (id, email) values
  ('98000000-0000-4000-8000-000000000001', 'signals-seller@example.com'),
  ('98000000-0000-4000-8000-000000000002', 'signals-buyer-one@example.com'),
  ('98000000-0000-4000-8000-000000000003', 'signals-buyer-two@example.com'),
  ('98000000-0000-4000-8000-000000000004', 'signals-buyer-three@example.com'),
  ('98000000-0000-4000-8000-000000000005', 'signals-buyer-four@example.com'),
  ('98000000-0000-4000-8000-000000000006', 'signals-buyer-five@example.com'),
  ('98000000-0000-4000-8000-000000000007', 'signals-outsider@example.com');

update public.profiles set
  username = case id
    when '98000000-0000-4000-8000-000000000001' then 'SignalSeller'
    when '98000000-0000-4000-8000-000000000002' then 'SignalBuyerOne'
    when '98000000-0000-4000-8000-000000000003' then 'SignalBuyerTwo'
    when '98000000-0000-4000-8000-000000000004' then 'SignalBuyerThree'
    when '98000000-0000-4000-8000-000000000005' then 'SignalBuyerFour'
    when '98000000-0000-4000-8000-000000000006' then 'SignalBuyerFive'
    else 'SignalOutsider'
  end,
  onboarding_completed = true
where id::text like '98000000-%';

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values ('98000000-1000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', 'Private issuer', 'Private card');

insert into public.offers (id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date)
values (
  '98000000-2000-4000-8000-000000000001',
  (select id from public.merchants where slug = 'adobe'),
  'Seller signal test offer', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30
);

insert into public.offer_listings (
  id, user_id, card_id, offer_id, min_spend, ask_amount, is_obo,
  verification_status, verification_timestamp, listing_status
) values (
  '98000000-3000-4000-8000-000000000001',
  '98000000-0000-4000-8000-000000000001',
  '98000000-1000-4000-8000-000000000001',
  '98000000-2000-4000-8000-000000000001',
  600, 500, true, 'VERIFIED', now(), 'ACTIVE'
);

insert into public.conversations (
  id, listing_id, seller_user_id, buyer_user_id, unlock_status, status,
  merchant_name, offer_title, reward_amount, reward_type, min_spend,
  ask_amount, is_obo, seller_username
) values
  ('98000000-4000-4000-8000-000000000001', '98000000-3000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000002', 'UNLOCKED', 'ACTIVE', 'Adobe', 'Seller signal test offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'SignalSeller'),
  ('98000000-4000-4000-8000-000000000002', '98000000-3000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000003', 'UNLOCKED', 'ACTIVE', 'Adobe', 'Seller signal test offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'SignalSeller'),
  ('98000000-4000-4000-8000-000000000003', '98000000-3000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000004', 'UNLOCKED', 'ACTIVE', 'Adobe', 'Seller signal test offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'SignalSeller'),
  ('98000000-4000-4000-8000-000000000004', '98000000-3000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000005', 'UNLOCKED', 'ACTIVE', 'Adobe', 'Seller signal test offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'SignalSeller'),
  ('98000000-4000-4000-8000-000000000005', '98000000-3000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000006', 'UNLOCKED', 'ACTIVE', 'Adobe', 'Seller signal test offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'SignalSeller');

insert into public.messages (conversation_id, sender_id, content, created_at) values
  ('98000000-4000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000002', 'Buyer one question', now() - interval '4 days'),
  ('98000000-4000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', 'Seller reply one', now() - interval '4 days' + interval '30 minutes'),
  ('98000000-4000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000003', 'Buyer two question', now() - interval '3 days'),
  ('98000000-4000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000001', 'Seller reply two', now() - interval '3 days' + interval '2 hours');

select is((select response_sample_count from public.profiles where id = '98000000-0000-4000-8000-000000000001'), 2, 'two eligible conversations are counted privately');
select is((select response_rate from public.profiles where id = '98000000-0000-4000-8000-000000000001'), null, 'response rate stays hidden below three eligible conversations');
select is((select median_response_seconds from public.profiles where id = '98000000-0000-4000-8000-000000000001'), null, 'response time stays hidden below three replies');

insert into public.messages (conversation_id, sender_id, content, moderation_status, created_at) values
  ('98000000-4000-4000-8000-000000000003', '98000000-0000-4000-8000-000000000004', 'Buyer three question', 'ALLOWED', now() - interval '2 days'),
  ('98000000-4000-4000-8000-000000000003', '98000000-0000-4000-8000-000000000001', 'Seller reply three', 'ALLOWED', now() - interval '2 days' + interval '4 hours'),
  ('98000000-4000-4000-8000-000000000004', '98000000-0000-4000-8000-000000000005', 'Buyer four question', 'ALLOWED', now() - interval '1 day'),
  ('98000000-4000-4000-8000-000000000005', '98000000-0000-4000-8000-000000000006', 'Flagged spam message', 'FLAGGED', now() - interval '1 day');

select is((select response_sample_count from public.profiles where id = '98000000-0000-4000-8000-000000000001'), 4, 'flagged buyer messages are excluded from eligible samples');
select is((select response_rate from public.profiles where id = '98000000-0000-4000-8000-000000000001'), 75.00::numeric, 'response rate derives from replied eligible conversations');
select is((select median_response_seconds from public.profiles where id = '98000000-0000-4000-8000-000000000001'), 7200, 'median first-response time is derived from three replies');

insert into public.user_blocks (blocker_id, blocked_user_id)
values ('98000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000003');
select is((select response_sample_count from public.profiles where id = '98000000-0000-4000-8000-000000000001'), 3, 'blocked conversations are removed from response metrics');
select is((select response_rate from public.profiles where id = '98000000-0000-4000-8000-000000000001'), 66.67::numeric, 'response rate refreshes after a block');
select is((select median_response_seconds from public.profiles where id = '98000000-0000-4000-8000-000000000001'), null, 'response-time label hides when fewer than three replies remain');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.touch_user_activity() $$, 'an active user can record throttled activity');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'last_active_at', 'SELECT'), 'exact activity timestamps are not client-readable');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'median_response_seconds', 'SELECT'), 'exact response durations are not client-readable');

select is(
  public.set_offer_listing_availability('98000000-3000-4000-8000-000000000001', true)::text,
  'PAUSED',
  'the listing owner can pause an active verified listing'
);
select is(
  (select verification_status::text from public.offer_listings where id = '98000000-3000-4000-8000-000000000001'),
  'VERIFIED',
  'pausing preserves verification'
);
select is((select count(*)::integer from public.marketplace_listings where listing_id = '98000000-3000-4000-8000-000000000001'), 0, 'paused listing immediately leaves the marketplace');
select is(
  public.set_offer_listing_availability('98000000-3000-4000-8000-000000000001', false)::text,
  'ACTIVE',
  'the owner can resume without payment or reverification'
);
select is((select count(*)::integer from public.marketplace_listings where listing_id = '98000000-3000-4000-8000-000000000001'), 1, 'resumed listing immediately returns to the marketplace');
select is((select seller_activity_status from public.marketplace_listings where listing_id = '98000000-3000-4000-8000-000000000001'), 'ACTIVE_NOW', 'marketplace exposes only a coarse current activity bucket');
select is((select seller_response_rate from public.marketplace_listings where listing_id = '98000000-3000-4000-8000-000000000001'), 66.67::numeric, 'marketplace exposes the qualified derived response rate');

select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
select throws_ok(
  $$ select public.set_offer_listing_availability('98000000-3000-4000-8000-000000000001', true) $$,
  '42501', null, 'another user cannot pause the listing'
);

reset role;
select * from finish();
rollback;
