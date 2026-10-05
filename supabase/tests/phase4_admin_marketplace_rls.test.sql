begin;

select plan(30);

insert into auth.users (id, email)
values
  ('66666666-6666-4666-8666-666666666666', 'phase4-owner@example.com'),
  ('77777777-7777-4777-8777-777777777777', 'phase4-buyer@example.com'),
  ('88888888-8888-4888-8888-888888888888', 'phase4-admin@example.com');

update public.profiles
set username = case id
  when '66666666-6666-4666-8666-666666666666' then 'PhaseSeller'
  when '77777777-7777-4777-8777-777777777777' then 'PhaseBuyer'
  else 'PhaseAdmin'
end,
onboarding_completed = true
where id in (
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888'
);

update public.user_roles
set role = 'ADMIN'
where user_id = '88888888-8888-4888-8888-888888888888';

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values ('66666666-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', 'Private Issuer', 'Private Card');

insert into public.offers (id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date, status)
values
  ('bbbbbbbb-1000-4000-8000-000000000001', (select id from public.merchants where slug = 'adobe'), 'Adobe phase four credit', 'Canonical Adobe promotion.', 600, 250, 'STATEMENT_CREDIT', current_date + 30, 'ACTIVE'),
  ('bbbbbbbb-1000-4000-8000-000000000002', (select id from public.merchants where slug = 'dell'), 'Dell phase four credit', 'Canonical Dell promotion.', 500, 100, 'STATEMENT_CREDIT', current_date + 30, 'ACTIVE'),
  ('bbbbbbbb-1000-4000-8000-000000000003', (select id from public.merchants where slug = 'nike'), 'Nike phase four reward', 'Canonical Nike promotion.', 100, 20, 'CASH_BACK', current_date + 30, 'ACTIVE'),
  ('bbbbbbbb-1000-4000-8000-000000000004', (select id from public.merchants where slug = 'fedex'), 'Expired phase four reward', 'Expired canonical promotion.', 100, 20, 'CASH_BACK', current_date - 1, 'EXPIRED');

insert into public.offer_listings (
  id, offer_id, user_id, card_id, min_spend, ask_amount, is_obo,
  verification_status, listing_status, verification_timestamp, reviewer_id
)
values
  ('66666666-1000-4000-8000-000000000001', 'bbbbbbbb-1000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666', '66666666-0000-4000-8000-000000000001', 600, 500, true, 'PENDING', 'PENDING_VERIFICATION', null, null),
  ('66666666-1000-4000-8000-000000000002', 'bbbbbbbb-1000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', '66666666-0000-4000-8000-000000000001', 500, 450, false, 'PENDING', 'PENDING_VERIFICATION', null, null),
  ('66666666-1000-4000-8000-000000000003', 'bbbbbbbb-1000-4000-8000-000000000003', '66666666-6666-4666-8666-666666666666', '66666666-0000-4000-8000-000000000001', 100, 80, true, 'PENDING', 'PENDING_VERIFICATION', null, null),
  ('66666666-1000-4000-8000-000000000004', 'bbbbbbbb-1000-4000-8000-000000000004', '66666666-6666-4666-8666-666666666666', '66666666-0000-4000-8000-000000000001', 100, 80, false, 'VERIFIED', 'ACTIVE', now(), '88888888-8888-4888-8888-888888888888');

insert into storage.objects (bucket_id, name)
values
  ('offer-verification-evidence', '66666666-6666-4666-8666-666666666666/66666666-1000-4000-8000-000000000001/66666666-2000-4000-8000-000000000001.png'),
  ('offer-verification-evidence', '66666666-6666-4666-8666-666666666666/66666666-1000-4000-8000-000000000002/66666666-2000-4000-8000-000000000002.png'),
  ('offer-verification-evidence', '66666666-6666-4666-8666-666666666666/66666666-1000-4000-8000-000000000003/66666666-2000-4000-8000-000000000003.png');

insert into public.offer_listing_verifications (user_id, offer_listing_id, card_id, evidence_path)
values
  ('66666666-6666-4666-8666-666666666666', '66666666-1000-4000-8000-000000000001', '66666666-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666/66666666-1000-4000-8000-000000000001/66666666-2000-4000-8000-000000000001.png'),
  ('66666666-6666-4666-8666-666666666666', '66666666-1000-4000-8000-000000000002', '66666666-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666/66666666-1000-4000-8000-000000000002/66666666-2000-4000-8000-000000000002.png'),
  ('66666666-6666-4666-8666-666666666666', '66666666-1000-4000-8000-000000000003', '66666666-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666/66666666-1000-4000-8000-000000000003/66666666-2000-4000-8000-000000000003.png');

select is((select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass), true, 'role assignments have RLS');
select ok(to_regclass('public.marketplace_listings') is not null, 'sanitized marketplace view exists');
select ok(not has_table_privilege('anon', 'public.marketplace_listings', 'select'), 'anonymous users cannot query marketplace listings');
select ok(not has_table_privilege('authenticated', 'public.user_roles', 'update'), 'authenticated users cannot change roles');
select is(
  (select count(*)::integer from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_listings' and column_name in ('card_id', 'user_id', 'evidence_path', 'reviewer_id', 'risk_status', 'email', 'phone')),
  0,
  'marketplace view has no private columns'
);

select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}', true);
set local role authenticated;

select is(public.current_user_is_admin(), false, 'normal user is not an admin');
select is((select count(*)::integer from public.user_roles), 1, 'normal user sees only their role');
select is((select count(*)::integer from public.marketplace_listings), 0, 'pending and expired listings are hidden');
select throws_ok(
  $$ select public.review_offer_listing('66666666-1000-4000-8000-000000000001', 'APPROVE') $$,
  '42501', 'Administrator access required.', 'normal user cannot approve a listing'
);
select throws_ok(
  $$ update public.offer_listings set verification_status = 'VERIFIED' where id = '66666666-1000-4000-8000-000000000001' $$,
  '42501', null, 'listing owner cannot self-verify'
);

select set_config('request.jwt.claims', '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}', true);
select is(public.current_user_is_admin(), true, 'admin role is recognized');
select is((select count(*)::integer from public.offer_listings), 4, 'admin can read submitted listings');
select is((select count(*)::integer from public.offer_listing_verifications), 3, 'admin can read evidence metadata');
select is((select count(*)::integer from storage.objects where bucket_id = 'offer-verification-evidence'), 3, 'admin can read private evidence objects');

select lives_ok(
  $$ select public.review_offer_listing('66666666-1000-4000-8000-000000000001', 'APPROVE') $$,
  'admin can approve a pending listing'
);
select results_eq(
  $$ select verification_status::text, listing_status::text from public.offer_listings where id = '66666666-1000-4000-8000-000000000001' $$,
  $$ values ('VERIFIED'::text, 'ACTIVE'::text) $$,
  'approval verifies and activates the listing'
);
select is(
  (select reviewer_id from public.offer_listings where id = '66666666-1000-4000-8000-000000000001'),
  '88888888-8888-4888-8888-888888888888'::uuid,
  'approval records the admin reviewer'
);
select results_eq(
  $$ select status::text, reviewer_id from public.offer_listing_verifications where offer_listing_id = '66666666-1000-4000-8000-000000000001' $$,
  $$ values ('VERIFIED'::text, '88888888-8888-4888-8888-888888888888'::uuid) $$,
  'approval verifies evidence and records its reviewer'
);

select lives_ok(
  $$ select public.review_offer_listing('66666666-1000-4000-8000-000000000002', 'REJECT') $$,
  'admin can reject a pending listing'
);
select results_eq(
  $$ select verification_status::text, listing_status::text from public.offer_listings where id = '66666666-1000-4000-8000-000000000002' $$,
  $$ values ('REJECTED'::text, 'PAUSED'::text) $$,
  'rejected listing is not active'
);
select lives_ok(
  $$ select public.review_offer_listing('66666666-1000-4000-8000-000000000003', 'NEEDS_REVIEW') $$,
  'admin can request another review'
);
select results_eq(
  $$ select verification_status::text, listing_status::text from public.offer_listings where id = '66666666-1000-4000-8000-000000000003' $$,
  $$ values ('NEEDS_REVIEW'::text, 'PAUSED'::text) $$,
  'needs-review listing is not active'
);

select set_config('request.jwt.claims', '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}', true);
select is((select count(*)::integer from public.marketplace_listings), 1, 'buyer sees only active verified unexpired listing');
select results_eq(
  $$ select merchant_name, seller_username, ask_amount from public.marketplace_listings $$,
  $$ values ('Adobe'::text, 'PhaseSeller'::text, 500.00::numeric) $$,
  'marketplace exposes whitelisted seller and listing terms'
);
select is((select bool_and(verification_badge) from public.marketplace_listings), true, 'published listings carry verification badge');
select is((select count(*)::integer from public.offer_listing_verifications), 0, 'buyer cannot read evidence metadata');
select is((select count(*)::integer from storage.objects where bucket_id = 'offer-verification-evidence'), 0, 'buyer cannot read evidence objects');
select is((select count(*)::integer from public.offer_listings), 0, 'buyer cannot query private listing rows');
select is((select count(*)::integer from public.marketplace_listings where listing_id = '66666666-1000-4000-8000-000000000004'), 0, 'expired verified listing remains hidden');
select throws_ok(
  $$ select card_id from public.marketplace_listings $$,
  '42703', null, 'marketplace DTO cannot return a private card id'
);

reset role;
select * from finish();
rollback;
