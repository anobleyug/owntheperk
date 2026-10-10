begin;

select plan(24);

insert into auth.users (id, email) values
  ('97000000-0000-4000-8000-000000000001', 'alert-seller-one@example.com'),
  ('97000000-0000-4000-8000-000000000002', 'alert-seller-two@example.com'),
  ('97000000-0000-4000-8000-000000000003', 'alert-saver@example.com');

update public.profiles set
  username = case id
    when '97000000-0000-4000-8000-000000000001' then 'AlertSellerOne'
    when '97000000-0000-4000-8000-000000000002' then 'AlertSellerTwo'
    else 'AlertSaver'
  end,
  onboarding_completed = true
where id::text like '97000000-%';

insert into public.credit_card_profiles (id, user_id, issuer, nickname) values
  ('97000000-1000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', 'Private issuer', 'Seller one card'),
  ('97000000-1000-4000-8000-000000000002', '97000000-0000-4000-8000-000000000002', 'Private issuer', 'Seller two card');

insert into public.offers (
  id, merchant_id, title, description, required_spend, reward_amount,
  reward_type, expiration_date, status
) values
  (
    '97000000-2000-4000-8000-000000000001',
    (select id from public.merchants where slug = 'adobe'),
    'Saved alert listing offer', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30, 'ACTIVE'
  ),
  (
    '97000000-2000-4000-8000-000000000002',
    (select id from public.merchants where slug = 'dell'),
    'Saved alert expiring offer', '', 500, 100, 'STATEMENT_CREDIT', current_date + 7, 'ACTIVE'
  ),
  (
    '97000000-2000-4000-8000-000000000003',
    (select id from public.merchants where slug = 'nike'),
    'Saved alert expired offer', '', 100, 20, 'STATEMENT_CREDIT', current_date - 1, 'ACTIVE'
  );

insert into public.saved_offers (user_id, offer_id) values
  ('97000000-0000-4000-8000-000000000003', '97000000-2000-4000-8000-000000000001'),
  ('97000000-0000-4000-8000-000000000001', '97000000-2000-4000-8000-000000000001');

insert into public.offer_listings (id, user_id, card_id, offer_id, min_spend, ask_amount, is_obo) values
  (
    '97000000-3000-4000-8000-000000000001',
    '97000000-0000-4000-8000-000000000001',
    '97000000-1000-4000-8000-000000000001',
    '97000000-2000-4000-8000-000000000001', 600, 190, false
  ),
  (
    '97000000-3000-4000-8000-000000000002',
    '97000000-0000-4000-8000-000000000002',
    '97000000-1000-4000-8000-000000000002',
    '97000000-2000-4000-8000-000000000001', 600, 175, false
  );

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type::text like 'SAVED_OFFER_%'),
  0,
  'draft and unverified listings do not generate saved-offer alerts'
);

reset role;
update public.offer_listings set
  verification_status = 'VERIFIED',
  listing_status = 'ACTIVE',
  verification_timestamp = now()
where id = '97000000-3000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_NEW_LISTING'),
  1,
  'a saver receives a new-listing alert'
);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_LOWER_ASK'),
  0,
  'the first active listing does not generate a lower-ask alert'
);
select is(
  (select offer_id from public.notifications where type = 'SAVED_OFFER_NEW_LISTING'),
  '97000000-2000-4000-8000-000000000001'::uuid,
  'new-listing alert stores canonical offer context'
);

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type::text like 'SAVED_OFFER_%'),
  0,
  'a saver is not alerted about their own listing activation'
);

reset role;
update public.offer_listings set
  verification_status = 'VERIFIED',
  listing_status = 'ACTIVE',
  verification_timestamp = now()
where id = '97000000-3000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_NEW_LISTING'),
  2,
  'another active listing generates one new-listing alert'
);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_LOWER_ASK'),
  1,
  'a new lowest ask generates one lower-ask alert'
);
select like(
  (select body from public.notifications where type = 'SAVED_OFFER_LOWER_ASK'),
  '%$175.00%$190.00%',
  'lower-ask alert includes new and previous lowest asks'
);
select is(
  (select related_listing_id from public.notifications where type = 'SAVED_OFFER_LOWER_ASK'),
  '97000000-3000-4000-8000-000000000002'::uuid,
  'lower-ask alert links only to the public listing context'
);

reset role;
update public.offer_listings set listing_status = 'PAUSED'
where id = '97000000-3000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_NO_LISTINGS'),
  0,
  'closing a listing does not alert while another active listing remains'
);

reset role;
update public.offer_listings set listing_status = 'PAUSED'
where id = '97000000-3000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_NO_LISTINGS'),
  1,
  'closing the last active listing generates an unavailable-listings alert'
);

reset role;
update public.offer_listings set listing_status = 'ACTIVE'
where id = '97000000-3000-4000-8000-000000000002';
update public.offer_listings set listing_status = 'PAUSED'
where id = '97000000-3000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_NEW_LISTING'),
  2,
  'reactivating the same listing does not duplicate its new-listing event'
);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_NO_LISTINGS'),
  1,
  'repeating the same close transition does not duplicate its no-listings event'
);

reset role;
update public.offers set status = 'INACTIVE'
where id = '97000000-2000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_UNAVAILABLE'),
  1,
  'an inactive parent offer generates one unavailable alert'
);
select like(
  (select body from public.notifications where type = 'SAVED_OFFER_UNAVAILABLE'),
  '%no longer active%',
  'inactive parent alert describes the parent offer state'
);

reset role;
insert into public.saved_offers (user_id, offer_id)
values ('97000000-0000-4000-8000-000000000003', '97000000-2000-4000-8000-000000000002');
select private.process_saved_offer_expiration_alerts();
select private.process_saved_offer_expiration_alerts();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_EXPIRING_SOON'),
  1,
  'the seven-day expiration alert is idempotent across repeated sweeps'
);
select like(
  (select body from public.notifications where type = 'SAVED_OFFER_EXPIRING_SOON'),
  '%expires in 7 days%',
  'the expiration alert identifies the seven-day window'
);

reset role;
insert into public.saved_offers (user_id, offer_id)
values ('97000000-0000-4000-8000-000000000003', '97000000-2000-4000-8000-000000000003');
select private.process_saved_offer_expiration_alerts();
select private.process_saved_offer_expiration_alerts();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_UNAVAILABLE' and offer_id = '97000000-2000-4000-8000-000000000003'),
  1,
  'the daily sweep emits one expired-parent alert'
);
select is(
  (select status::text from public.offers where id = '97000000-2000-4000-8000-000000000003'),
  'EXPIRED',
  'the daily sweep marks elapsed parent offers expired'
);

reset role;
delete from public.saved_offers
where user_id = '97000000-0000-4000-8000-000000000003'
  and offer_id = '97000000-2000-4000-8000-000000000002';
update public.offers set expiration_date = current_date + 6
where id = '97000000-2000-4000-8000-000000000002';
select private.process_saved_offer_expiration_alerts();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.notifications where type = 'SAVED_OFFER_EXPIRING_SOON'),
  1,
  'unsaving prevents future expiration alerts'
);
select is(
  (select count(*)::integer from public.notifications where event_key is not null),
  (select count(distinct event_key)::integer from public.notifications where event_key is not null),
  'all saved-offer notification event keys are unique per user'
);
select is(
  (select count(*)::integer from public.notifications where body ilike '%AlertSeller%'),
  0,
  'saved-offer alerts never expose seller usernames'
);
select is(
  (select count(*)::integer from public.notifications where body ilike '%Private issuer%' or body ilike '%card%'),
  0,
  'saved-offer alerts never expose private card data'
);
select ok(
  exists (select 1 from cron.job where jobname = 'saved-offer-expiration-alerts-daily'),
  'daily saved-offer expiration cron is installed'
);

reset role;
select * from finish();
rollback;
