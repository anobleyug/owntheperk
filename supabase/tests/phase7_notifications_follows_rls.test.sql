begin;

select plan(23);

insert into auth.users (id, email) values
  ('92000000-0000-4000-8000-000000000001', 'phase7-seller@example.com'),
  ('92000000-0000-4000-8000-000000000002', 'phase7-buyer@example.com'),
  ('92000000-0000-4000-8000-000000000003', 'phase7-follower@example.com'),
  ('92000000-0000-4000-8000-000000000004', 'phase7-outsider@example.com'),
  ('92000000-0000-4000-8000-000000000005', 'phase7-admin@example.com');

update public.profiles set
  username = case id
    when '92000000-0000-4000-8000-000000000001' then 'NotifySeller'
    when '92000000-0000-4000-8000-000000000002' then 'NotifyBuyer'
    when '92000000-0000-4000-8000-000000000003' then 'MerchantFollower'
    when '92000000-0000-4000-8000-000000000004' then 'NotifyOutsider'
    else 'NotifyAdmin'
  end,
  onboarding_completed = true
where id::text like '92000000-%';
update public.user_roles set role = 'ADMIN'
where user_id = '92000000-0000-4000-8000-000000000005';

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values ('92000000-1000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 'Private issuer', 'Private card');
insert into public.offers (id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date)
values ('92000000-2000-4000-8000-000000000001', (select id from public.merchants where slug = 'adobe'), 'Phase seven offer', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30);
insert into public.offer_listings (id, user_id, card_id, offer_id, min_spend, ask_amount, is_obo)
values
  ('92000000-3000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '92000000-1000-4000-8000-000000000001', '92000000-2000-4000-8000-000000000001', 600, 500, true),
  ('92000000-3000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', '92000000-1000-4000-8000-000000000001', '92000000-2000-4000-8000-000000000001', 600, 490, false);
insert into public.conversations (
  id, listing_id, seller_user_id, buyer_user_id, unlock_status, status,
  merchant_name, offer_title, reward_amount, reward_type, min_spend, ask_amount, is_obo, seller_username
) values
  ('92000000-4000-4000-8000-000000000001', '92000000-3000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', 'UNLOCKED', 'ACTIVE', 'Adobe', 'Phase seven offer', 250, 'STATEMENT_CREDIT', 600, 500, true, 'NotifySeller'),
  ('92000000-4000-4000-8000-000000000002', '92000000-3000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000003', 'LOCKED', 'LOCKED', 'Adobe', 'Phase seven offer', 250, 'STATEMENT_CREDIT', 600, 490, false, 'NotifySeller');

select is((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass), true, 'notifications use RLS');
select is((select relrowsecurity from pg_class where oid = 'public.merchant_follows'::regclass), true, 'merchant follows use RLS');
select ok(not has_table_privilege('authenticated', 'public.notifications', 'INSERT'), 'users cannot forge notifications');
select ok(not has_column_privilege('authenticated', 'public.notifications', 'body', 'UPDATE'), 'users cannot alter notification content');
select is(
  (select array_agg(column_name order by ordinal_position)::text from information_schema.columns where table_schema = 'public' and table_name = 'notifications'),
  '{id,user_id,type,title,body,related_listing_id,related_conversation_id,read_at,created_at,offer_id,event_key}',
  'notification table contains only intended fields'
);

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
insert into public.merchant_follows (user_id, merchant_id)
values (auth.uid(), (select id from public.merchants where slug = 'adobe'));
select is((select count(*)::integer from public.merchant_follows), 1, 'user can follow a merchant and read their own follow');

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into public.messages (conversation_id, sender_id, content)
values ('92000000-4000-4000-8000-000000000001', auth.uid(), 'A safe message');
select is((select count(*)::integer from public.notifications), 0, 'message sender cannot see recipient notification');

reset role;
update public.conversations set unlock_status = 'UNLOCKED', status = 'ACTIVE'
where id = '92000000-4000-4000-8000-000000000002';
update public.offer_listings set
  verification_status = 'VERIFIED', listing_status = 'ACTIVE', verification_timestamp = now(),
  reviewer_id = '92000000-0000-4000-8000-000000000005'
where id = '92000000-3000-4000-8000-000000000001';
update public.offer_listings set verification_status = 'REJECTED', listing_status = 'PAUSED'
where id = '92000000-3000-4000-8000-000000000002';
update public.conversations set status = 'COMPLETED'
where id = '92000000-4000-4000-8000-000000000001';
insert into public.ratings (
  conversation_id, reviewer_id, reviewed_user_id, overall_score,
  communication_score, reliability_score, accuracy_score, review_text
) values (
  '92000000-4000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000001', 5, 5, 5, 5, 'Great communication'
);
insert into public.reports (
  id, reporter_id, reported_user_id, conversation_id, offer_listing_id, reason, description
) values (
  '92000000-5000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000001', '92000000-4000-4000-8000-000000000001',
  '92000000-3000-4000-8000-000000000001', 'OTHER', 'A sufficiently detailed test report.'
);
update public.reports set status = 'RESOLVED', resolved_at = now(), resolved_by = '92000000-0000-4000-8000-000000000005'
where id = '92000000-5000-4000-8000-000000000001';
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.notifications), 5, 'seller receives message, unlock, review, rejection, and rating notifications');
select results_eq(
  $$ select type::text from public.notifications order by type::text $$,
  $$ values ('CHAT_UNLOCKED'::text), ('LISTING_APPROVED'::text), ('LISTING_REJECTED'::text), ('NEW_MESSAGE'::text), ('NEW_RATING'::text) $$,
  'seller notification types are generated by database events'
);
select is((select count(*)::integer from public.notifications where read_at is null), 5, 'new notifications start unread');
update public.notifications set read_at = now() where read_at is null;
select is((select count(*)::integer from public.notifications where read_at is null), 0, 'owner can mark notifications read');
select throws_ok(
  $$ update public.notifications set title = 'Tampered' $$,
  '42501', null, 'owner cannot alter notification content'
);

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*)::integer from public.notifications), 1, 'merchant follower receives new verified listing alert');
select is((select type::text from public.notifications limit 1), 'MERCHANT_LISTING', 'follow alert has merchant listing type');
select is((select related_listing_id from public.notifications limit 1), '92000000-3000-4000-8000-000000000001'::uuid, 'follow alert links only to the public listing');

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.notifications), 1, 'reporter receives moderation outcome');
select is((select type::text from public.notifications limit 1), 'REPORT_RESOLVED', 'resolved report creates outcome notification');

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*)::integer from public.notifications), 0, 'unrelated user sees no notifications');
select is((select count(*)::integer from public.merchant_follows), 0, 'unrelated user sees no merchant follows');
select throws_ok(
  $$ insert into public.merchant_follows (user_id, merchant_id) values ('92000000-0000-4000-8000-000000000003', (select id from public.merchants where slug = 'dell')) $$,
  '42501', null, 'user cannot create a follow for another user'
);

select set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
delete from public.merchant_follows where merchant_id = (select id from public.merchants where slug = 'adobe');
select is((select count(*)::integer from public.merchant_follows), 0, 'owner can unfollow merchant');
select is((select count(*)::integer from public.marketplace_listings where merchant_id is not null), 1, 'marketplace exposes opaque merchant ID for follow controls');
select is((select count(*)::integer from public.notifications where body ilike '%safe message%'), 0, 'notification bodies never copy private message text');

reset role;
select * from finish();
rollback;
