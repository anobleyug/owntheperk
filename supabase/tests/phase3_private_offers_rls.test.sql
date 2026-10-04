begin;

select plan(27);

insert into auth.users (id, email)
values
  ('44444444-4444-4444-8444-444444444444', 'phase3-owner@example.com'),
  ('55555555-5555-4555-8555-555555555555', 'phase3-other@example.com');

insert into public.credit_card_profiles (id, user_id, issuer, nickname)
values (
  '55555555-0000-4000-8000-000000000001',
  '55555555-5555-4555-8555-555555555555',
  'Other Issuer',
  'Other User Card'
);

select is((select relrowsecurity from pg_class where oid = 'public.credit_card_profiles'::regclass), true, 'cards have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.merchants'::regclass), true, 'merchants have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.offers'::regclass), true, 'offers have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.offer_verifications'::regclass), true, 'evidence records have RLS');
select is((select public from storage.buckets where id = 'offer-verification-evidence'), false, 'evidence bucket is private');

select ok(
  not has_column_privilege('authenticated', 'public.offers', 'verification_status', 'update')
  and not has_column_privilege('authenticated', 'public.offers', 'verification_timestamp', 'update')
  and not has_column_privilege('authenticated', 'public.offers', 'listing_status', 'update'),
  'protected offer workflow fields are not user-updatable'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.credit_card_profiles (id, user_id, issuer, nickname, last4_optional)
values
  ('44444444-0000-4000-8000-000000000001', auth.uid(), 'Issuer One', 'Business Card', '1234'),
  ('44444444-0000-4000-8000-000000000002', auth.uid(), 'Issuer Two', 'Travel Card', null);

select is(
  (select count(*)::integer from public.credit_card_profiles),
  2,
  'a user can add multiple private cards and sees only their own'
);

select is(
  (select count(*)::integer from public.credit_card_profiles where id = '55555555-0000-4000-8000-000000000001'),
  0,
  'another user card is not visible'
);

select results_eq(
  $$
    update public.credit_card_profiles
    set nickname = 'Unauthorized'
    where id = '55555555-0000-4000-8000-000000000001'
    returning nickname
  $$,
  array[]::text[],
  'another user card cannot be updated'
);

select throws_ok(
  $$
    insert into public.credit_card_profiles (user_id, issuer, nickname, last4_optional)
    values (auth.uid(), 'Issuer', 'Invalid Card', '4111111111111111')
  $$,
  '23514',
  null,
  'full card numbers are rejected'
);

insert into public.offers (
  id, user_id, card_id, merchant_id, title, description,
  spend_requirement, reward_amount, reward_type, expiration_date
)
values
  (
    '44444444-1000-4000-8000-000000000001', auth.uid(),
    '44444444-0000-4000-8000-000000000001',
    (select id from public.merchants where slug = 'adobe'),
    'Adobe statement credit offer', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30
  ),
  (
    '44444444-1000-4000-8000-000000000002', auth.uid(),
    '44444444-0000-4000-8000-000000000001',
    (select id from public.merchants where slug = 'dell'),
    'Dell statement credit offer', '', 500, 100, 'STATEMENT_CREDIT', current_date + 30
  ),
  (
    '44444444-1000-4000-8000-000000000003', auth.uid(),
    '44444444-0000-4000-8000-000000000002',
    (select id from public.merchants where slug = 'nike'),
    'Nike cash back offer', '', 100, 20, 'CASH_BACK', current_date + 30
  );

select is(
  (select count(*)::integer from public.offers where card_id = '44444444-0000-4000-8000-000000000001'),
  2,
  'one card can have multiple offers'
);

select is(
  (select count(distinct card_id)::integer from public.offers),
  2,
  'a user can add offers across multiple cards'
);

select throws_ok(
  $$
    insert into public.offers (
      user_id, card_id, merchant_id, title, spend_requirement,
      reward_amount, reward_type, expiration_date
    ) values (
      auth.uid(), '55555555-0000-4000-8000-000000000001',
      (select id from public.merchants where slug = 'adobe'),
      'Offer on another user card', 10, 5, 'CASH_BACK', current_date + 30
    )
  $$,
  '42501',
  null,
  'an offer cannot be attached to another user card'
);

select throws_ok(
  $$
    insert into public.offers (
      user_id, card_id, merchant_id, title, spend_requirement,
      reward_amount, reward_type, expiration_date
    ) values (
      auth.uid(), '44444444-0000-4000-8000-000000000001',
      (select id from public.merchants where slug = 'adobe'),
      'Invalid negative reward offer', 10, -1, 'CASH_BACK', current_date + 30
    )
  $$,
  '23514',
  null,
  'negative offer values are rejected'
);

select throws_ok(
  $$
    insert into public.offers (
      user_id, card_id, merchant_id, title, spend_requirement,
      reward_amount, reward_type, expiration_date, verification_status
    ) values (
      auth.uid(), '44444444-0000-4000-8000-000000000001',
      (select id from public.merchants where slug = 'adobe'),
      'Self verified forbidden offer', 10, 5, 'CASH_BACK', current_date + 30, 'VERIFIED'
    )
  $$,
  '42501',
  null,
  'a user cannot insert a verified offer'
);

select throws_ok(
  $$
    update public.offers
    set listing_status = 'ACTIVE'
    where id = '44444444-1000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'a user cannot activate an offer'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'offer-verification-evidence',
      '44444444-4444-4444-8444-444444444444/44444444-1000-4000-8000-000000000001/44444444-2000-4000-8000-000000000001.png'
    )
  $$,
  'an owner can upload an opaque-path object for an editable offer'
);

select lives_ok(
  $$
    insert into public.offer_verifications (
      user_id, offer_id, card_id, evidence_path
    ) values (
      auth.uid(),
      '44444444-1000-4000-8000-000000000001',
      '44444444-0000-4000-8000-000000000001',
      '44444444-4444-4444-8444-444444444444/44444444-1000-4000-8000-000000000001/44444444-2000-4000-8000-000000000001.png'
    )
  $$,
  'an owner can register evidence for their offer'
);

select throws_ok(
  $$
    insert into public.offer_verifications (user_id, offer_id, card_id, evidence_path)
    values (
      '55555555-5555-4555-8555-555555555555',
      '44444444-1000-4000-8000-000000000002',
      '44444444-0000-4000-8000-000000000001',
      '55555555-5555-4555-8555-555555555555/44444444-1000-4000-8000-000000000002/55555555-2000-4000-8000-000000000001.png'
    )
  $$,
  '42501',
  null,
  'evidence cannot be registered as another user'
);

select lives_ok(
  $$ select public.submit_offer_for_verification('44444444-1000-4000-8000-000000000001') $$,
  'an owned offer with uploaded evidence can be submitted'
);

select results_eq(
  $$
    select verification_status::text, listing_status::text
    from public.offers
    where id = '44444444-1000-4000-8000-000000000001'
  $$,
  $$ values ('PENDING'::text, 'PENDING_VERIFICATION'::text) $$,
  'submission moves the offer to pending verification'
);

insert into public.offers (
  id, user_id, card_id, merchant_id, title, spend_requirement,
  reward_amount, reward_type, expiration_date
)
values (
  '44444444-1000-4000-8000-000000000004', auth.uid(),
  '44444444-0000-4000-8000-000000000002',
  (select id from public.merchants where slug = 'fedex'),
  'Already expired offer record', 10, 5, 'CASH_BACK', current_date - 1
);

select throws_ok(
  $$ select public.submit_offer_for_verification('44444444-1000-4000-8000-000000000004') $$,
  '22023',
  'Expired offers cannot be submitted.',
  'expired offers cannot be submitted'
);

select is((select count(*)::integer from public.merchants), 10, 'authenticated users read active seeded merchants');

select throws_ok(
  $$ insert into public.merchants (name, slug) values ('Unauthorized', 'unauthorized') $$,
  '42501',
  null,
  'normal users cannot create merchants'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.offer_verifications),
  0,
  'another user cannot read evidence metadata'
);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'offer-verification-evidence'),
  0,
  'another user cannot read evidence objects'
);

select is(
  (select count(*)::integer from public.offers),
  0,
  'another user cannot read private offers'
);

reset role;
select * from finish();
rollback;
