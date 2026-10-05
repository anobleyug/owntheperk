begin;

select plan(33);

insert into auth.users (id, email)
values
  ('44444444-4444-4444-8444-444444444444', 'phase3-owner@example.com'),
  ('55555555-5555-4555-8555-555555555555', 'phase3-other@example.com');

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values ('55555555-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555', 'Other Issuer', 'Other User Card');

insert into public.offers (id, merchant_id, title, description, required_spend, reward_amount, reward_type, expiration_date)
values
  ('aaaaaaaa-1000-4000-8000-000000000001', (select id from public.merchants where slug = 'adobe'), 'Adobe shared statement credit', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30),
  ('aaaaaaaa-1000-4000-8000-000000000002', (select id from public.merchants where slug = 'dell'), 'Dell shared statement credit', '', 500, 100, 'STATEMENT_CREDIT', current_date + 30),
  ('aaaaaaaa-1000-4000-8000-000000000003', (select id from public.merchants where slug = 'nike'), 'Nike shared cash back offer', '', 100, 20, 'CASH_BACK', current_date + 30),
  ('aaaaaaaa-1000-4000-8000-000000000004', (select id from public.merchants where slug = 'fedex'), 'Expired shared cash back offer', '', 10, 5, 'CASH_BACK', current_date - 1);
update public.offers set status = 'EXPIRED' where id = 'aaaaaaaa-1000-4000-8000-000000000004';

select is((select relrowsecurity from pg_class where oid = 'public.credit_card_profiles'::regclass), true, 'cards have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.merchants'::regclass), true, 'merchants have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.offers'::regclass), true, 'credit card offers have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.offer_listings'::regclass), true, 'offer listings have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.offer_listing_verifications'::regclass), true, 'listing evidence has RLS');
select is((select public from storage.buckets where id = 'offer-verification-evidence'), false, 'evidence bucket is private');

select ok(
  not has_table_privilege('authenticated', 'public.offers', 'INSERT')
  and not has_table_privilege('authenticated', 'public.offers', 'UPDATE'),
  'normal users cannot mutate credit card offers'
);
select ok(
  not has_column_privilege('authenticated', 'public.offer_listings', 'verification_status', 'update')
  and not has_column_privilege('authenticated', 'public.offer_listings', 'verification_timestamp', 'update')
  and not has_column_privilege('authenticated', 'public.offer_listings', 'listing_status', 'update'),
  'protected listing workflow fields are not user-updatable'
);

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;

insert into public.credit_card_profiles (id, user_id, issuer, nickname, last4_optional)
values
  ('44444444-0000-4000-8000-000000000001', auth.uid(), 'Issuer One', 'Business Card', '1234'),
  ('44444444-0000-4000-8000-000000000002', auth.uid(), 'Issuer Two', 'Travel Card', null);

select is((select count(*)::integer from public.credit_card_profiles), 2, 'a user can add multiple private cards and sees only their own');
select is((select count(*)::integer from public.credit_card_profiles where id = '55555555-0000-4000-8000-000000000001'), 0, 'another user card is not visible');
select results_eq(
  $$ update public.credit_card_profiles set nickname = 'Unauthorized' where id = '55555555-0000-4000-8000-000000000001' returning nickname $$,
  array[]::text[],
  'another user card cannot be updated'
);
select throws_ok(
  $$ insert into public.credit_card_profiles (user_id, issuer, nickname, last4_optional) values (auth.uid(), 'Issuer', 'Invalid Card', '4111111111111111') $$,
  '23514', null, 'full card numbers are rejected'
);

insert into public.offer_listings (id, user_id, card_id, offer_id, min_spend, ask_amount, is_obo)
values
  ('44444444-1000-4000-8000-000000000001', auth.uid(), '44444444-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001', 600, 500, true),
  ('44444444-1000-4000-8000-000000000002', auth.uid(), '44444444-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000001', 600, 475, false),
  ('44444444-1000-4000-8000-000000000003', auth.uid(), '44444444-0000-4000-8000-000000000002', 'aaaaaaaa-1000-4000-8000-000000000003', 100, 80, false);

select is((select count(*)::integer from public.offer_listings where card_id = '44444444-0000-4000-8000-000000000001'), 2, 'one card can have multiple listings');
select is((select count(distinct card_id)::integer from public.offer_listings), 2, 'a user can list across multiple cards');
select is((select count(*)::integer from public.offer_listings where offer_id = 'aaaaaaaa-1000-4000-8000-000000000001'), 2, 'multiple listings can share one credit card offer');

select throws_ok(
  $$ insert into public.offer_listings (user_id, card_id, offer_id, min_spend, ask_amount) values (auth.uid(), '55555555-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000002', 10, 5) $$,
  '42501', null, 'a listing cannot use another user card'
);
select throws_ok(
  $$ insert into public.offer_listings (user_id, card_id, offer_id, min_spend, ask_amount) values (auth.uid(), '44444444-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000002', 10, -1) $$,
  '23514', null, 'negative listing values are rejected'
);
select throws_ok(
  $$ insert into public.offer_listings (user_id, card_id, offer_id, min_spend, ask_amount, verification_status) values (auth.uid(), '44444444-0000-4000-8000-000000000001', 'aaaaaaaa-1000-4000-8000-000000000002', 10, 5, 'VERIFIED') $$,
  '42501', null, 'a user cannot insert a verified listing'
);
select throws_ok(
  $$ update public.offer_listings set listing_status = 'ACTIVE' where id = '44444444-1000-4000-8000-000000000001' $$,
  '42501', null, 'a user cannot activate a listing'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('offer-verification-evidence', '44444444-4444-4444-8444-444444444444/44444444-1000-4000-8000-000000000001/44444444-2000-4000-8000-000000000001.png') $$,
  'an owner can upload an opaque-path object for an editable listing'
);
select lives_ok(
  $$ insert into public.offer_listing_verifications (user_id, offer_listing_id, card_id, evidence_path) values (auth.uid(), '44444444-1000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444/44444444-1000-4000-8000-000000000001/44444444-2000-4000-8000-000000000001.png') $$,
  'an owner can register evidence for their listing'
);
select throws_ok(
  $$ update public.offer_listings set offer_id = 'aaaaaaaa-1000-4000-8000-000000000002' where id = '44444444-1000-4000-8000-000000000001' $$,
  '42501', 'The credit card offer cannot change after evidence is attached.', 'attached evidence remains bound to its credit card offer'
);
select throws_ok(
  $$ insert into public.offer_listing_verifications (user_id, offer_listing_id, card_id, evidence_path) values ('55555555-5555-4555-8555-555555555555', '44444444-1000-4000-8000-000000000002', '44444444-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555/44444444-1000-4000-8000-000000000002/55555555-2000-4000-8000-000000000001.png') $$,
  '42501', null, 'evidence cannot be registered as another user'
);
select lives_ok(
  $$ select public.submit_offer_listing_for_verification('44444444-1000-4000-8000-000000000001') $$,
  'an owned listing with uploaded evidence can be submitted'
);
select results_eq(
  $$ select verification_status::text, listing_status::text from public.offer_listings where id = '44444444-1000-4000-8000-000000000001' $$,
  $$ values ('PENDING'::text, 'PENDING_VERIFICATION'::text) $$,
  'submission moves the listing to pending verification'
);

reset role;
insert into public.offer_listings (id, user_id, card_id, offer_id, min_spend, ask_amount)
values ('44444444-1000-4000-8000-000000000004', '44444444-4444-4444-8444-444444444444', '44444444-0000-4000-8000-000000000002', 'aaaaaaaa-1000-4000-8000-000000000004', 10, 5);
set local role authenticated;

select throws_ok(
  $$ select public.submit_offer_listing_for_verification('44444444-1000-4000-8000-000000000004') $$,
  '22023', 'Expired offers cannot be submitted.', 'expired credit card offers cannot be submitted'
);
select is((select count(*)::integer from public.merchants), 10, 'authenticated users read active seeded merchants');
select is((select count(*)::integer from public.offers), 4, 'authenticated users read credit card offers');
select throws_ok($$ insert into public.merchants (name, slug) values ('Unauthorized', 'unauthorized') $$, '42501', null, 'normal users cannot create merchants');
select throws_ok(
  $$ update public.offers set title = 'Unauthorized canonical edit' where id = 'aaaaaaaa-1000-4000-8000-000000000001' $$,
  '42501', null, 'normal users cannot edit credit card offers'
);

select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
select is((select count(*)::integer from public.offer_listing_verifications), 0, 'another user cannot read evidence metadata');
select is((select count(*)::integer from storage.objects where bucket_id = 'offer-verification-evidence'), 0, 'another user cannot read evidence objects');
select is((select count(*)::integer from public.offer_listings), 0, 'another user cannot read private listings');
select is((select count(*)::integer from public.offers), 4, 'credit card offers remain shared read-only catalog data');

reset role;
select * from finish();
rollback;
