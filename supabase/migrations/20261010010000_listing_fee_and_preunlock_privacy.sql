-- Require a one-time listing submission fee and remove seller identity from all
-- pre-unlock marketplace data surfaces.

create type public.platform_payment_type as enum ('CHAT_UNLOCK', 'LISTING_FEE');

alter table public.platform_payments
  add column payment_type public.platform_payment_type,
  add column offer_listing_id uuid references public.offer_listings (id) on delete restrict,
  add column checkout_attempt integer not null default 1;

update public.platform_payments
set payment_type = 'CHAT_UNLOCK'::public.platform_payment_type
where payment_type is null;

alter table public.platform_payments
  alter column payment_type set not null,
  alter column payment_type set default 'CHAT_UNLOCK'::public.platform_payment_type,
  alter column conversation_id drop not null,
  alter column stripe_checkout_session_id drop not null,
  add constraint platform_payments_checkout_attempt_positive check (checkout_attempt > 0),
  add constraint platform_payments_target_matches_type check (
    (payment_type = 'CHAT_UNLOCK'::public.platform_payment_type
      and conversation_id is not null and offer_listing_id is null)
    or
    (payment_type = 'LISTING_FEE'::public.platform_payment_type
      and offer_listing_id is not null and conversation_id is null)
  );

create unique index platform_payments_one_listing_fee_idx
on public.platform_payments (offer_listing_id)
where payment_type = 'LISTING_FEE'::public.platform_payment_type;

create index platform_payments_listing_idx
on public.platform_payments (offer_listing_id, status)
where offer_listing_id is not null;

drop view public.marketplace_listings;
create view public.marketplace_listings
with (security_invoker = false, security_barrier = true)
as
select
  listing.id as listing_id,
  merchant.id as merchant_id,
  merchant.name as merchant_name,
  merchant.slug as merchant_slug,
  offer.title as offer_title,
  offer.description as offer_description,
  offer.reward_amount,
  offer.reward_type,
  offer.required_spend as canonical_spend_requirement,
  listing.min_spend,
  listing.ask_amount,
  listing.is_obo,
  offer.expiration_date,
  profile.rating_average as seller_rating_average,
  profile.rating_count as seller_rating_count,
  profile.completed_interaction_count as seller_completed_interaction_count,
  true as verification_badge,
  listing.created_at
from public.offer_listings listing
join public.offers offer on offer.id = listing.offer_id
join public.merchants merchant on merchant.id = offer.merchant_id
join public.profiles profile on profile.id = listing.user_id
where listing.verification_status = 'VERIFIED'::public.offer_verification_status
  and listing.listing_status = 'ACTIVE'::public.offer_listing_status
  and listing.ask_amount is not null
  and offer.status = 'ACTIVE'::public.canonical_offer_status
  and offer.expiration_date >= current_date
  and merchant.status = 'ACTIVE'::public.merchant_status
  and profile.onboarding_completed
  and profile.account_status = 'ACTIVE'::public.account_status;

revoke all on table public.marketplace_listings from public, anon, authenticated;
grant select on table public.marketplace_listings to authenticated, service_role;

-- Authenticated clients no longer receive raw conversation rows. This view reveals
-- participant identifiers only after Stripe has unlocked the conversation.
create view public.participant_conversations
with (security_invoker = false, security_barrier = true)
as
select
  conversation.id,
  conversation.listing_id,
  conversation.seller_user_id,
  conversation.buyer_user_id,
  conversation.status,
  conversation.merchant_name,
  conversation.offer_title,
  conversation.reward_amount,
  conversation.reward_type,
  conversation.min_spend,
  conversation.ask_amount,
  conversation.is_obo,
  conversation.seller_username,
  conversation.seller_rating_average,
  conversation.updated_at
from public.conversations conversation
where conversation.unlock_status = 'UNLOCKED'::public.conversation_unlock_status
  and conversation.status <> 'LOCKED'::public.conversation_status
  and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id);

revoke select on table public.conversations from authenticated;
revoke all on table public.participant_conversations from public, anon, authenticated;
grant select on table public.participant_conversations to authenticated, service_role;

create or replace function public.submit_offer_listing_for_verification(target_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_listing public.offer_listings%rowtype;
  canonical_expiration date;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select * into target_listing
  from public.offer_listings
  where id = target_listing_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Listing not found.';
  end if;

  if target_listing.verification_status not in (
    'DRAFT'::public.offer_verification_status,
    'NEEDS_REVIEW'::public.offer_verification_status
  ) then
    raise exception using errcode = '22023', message = 'Listing is not editable.';
  end if;

  if not exists (
    select 1 from public.platform_payments payment
    where payment.offer_listing_id = target_listing_id
      and payment.user_id = current_user_id
      and payment.payment_type = 'LISTING_FEE'::public.platform_payment_type
      and payment.status = 'SUCCEEDED'::public.platform_payment_status
      and payment.amount = 99
      and payment.currency = 'usd'
  ) then
    raise exception using errcode = '22023', message = 'The listing submission fee must be paid first.';
  end if;

  if target_listing.ask_amount is null then
    raise exception using errcode = '22023', message = 'An asking amount is required.';
  end if;

  select expiration_date into canonical_expiration
  from public.offers
  where id = target_listing.offer_id
    and status = 'ACTIVE'::public.canonical_offer_status;

  if canonical_expiration is null or canonical_expiration < current_date then
    raise exception using errcode = '22023', message = 'Expired offers cannot be submitted.';
  end if;

  if not exists (
    select 1 from public.credit_card_profiles
    where id = target_listing.card_id
      and user_id = current_user_id
      and status = 'ACTIVE'::public.card_profile_status
  ) then
    raise exception using errcode = '22023', message = 'An active card profile is required.';
  end if;

  if not exists (
    select 1 from public.offer_listing_verifications evidence
    join storage.objects object
      on object.bucket_id = 'offer-verification-evidence'
      and object.name = evidence.evidence_path
    where evidence.offer_listing_id = target_listing_id
      and evidence.user_id = current_user_id
  ) then
    raise exception using errcode = '22023', message = 'Uploaded verification evidence is required.';
  end if;

  update public.offer_listing_verifications
  set status = 'PENDING'::public.evidence_verification_status, reviewer_id = null
  where offer_listing_id = target_listing_id and user_id = current_user_id;

  update public.offer_listings
  set
    verification_status = 'PENDING'::public.offer_verification_status,
    verification_timestamp = null,
    reviewer_id = null,
    listing_status = 'PENDING_VERIFICATION'::public.offer_listing_status
  where id = target_listing_id and user_id = current_user_id;
end;
$$;

-- Called only by the service role after Stripe signature, amount, and metadata checks.
create or replace function public.complete_listing_fee(
  target_checkout_session_id text,
  target_payment_intent_id text,
  target_listing_id uuid,
  target_user_id uuid,
  paid_amount integer,
  paid_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment public.platform_payments%rowtype;
  target_listing public.offer_listings%rowtype;
  canonical_expiration date;
begin
  if paid_amount <> 99 or lower(paid_currency) <> 'usd' then
    raise exception using errcode = '22023', message = 'Unexpected listing fee amount.';
  end if;

  select * into target_payment
  from public.platform_payments
  where stripe_checkout_session_id = target_checkout_session_id
    and offer_listing_id = target_listing_id
    and user_id = target_user_id
    and payment_type = 'LISTING_FEE'::public.platform_payment_type
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Matching listing payment not found.';
  end if;

  if target_payment.status = 'SUCCEEDED'::public.platform_payment_status then
    return target_listing_id;
  end if;

  select * into target_listing
  from public.offer_listings
  where id = target_listing_id and user_id = target_user_id
  for update;

  if not found or target_listing.verification_status not in (
    'DRAFT'::public.offer_verification_status,
    'NEEDS_REVIEW'::public.offer_verification_status
  ) then
    raise exception using errcode = '22023', message = 'Listing is not eligible for submission.';
  end if;

  if target_listing.ask_amount is null then
    raise exception using errcode = '22023', message = 'An asking amount is required.';
  end if;

  select expiration_date into canonical_expiration
  from public.offers
  where id = target_listing.offer_id
    and status = 'ACTIVE'::public.canonical_offer_status;

  if canonical_expiration is null or canonical_expiration < current_date then
    raise exception using errcode = '22023', message = 'Expired offers cannot be submitted.';
  end if;

  if not exists (
    select 1 from public.credit_card_profiles
    where id = target_listing.card_id
      and user_id = target_user_id
      and status = 'ACTIVE'::public.card_profile_status
  ) then
    raise exception using errcode = '22023', message = 'An active card profile is required.';
  end if;

  if not exists (
    select 1 from public.offer_listing_verifications evidence
    join storage.objects object
      on object.bucket_id = 'offer-verification-evidence'
      and object.name = evidence.evidence_path
    where evidence.offer_listing_id = target_listing_id
      and evidence.user_id = target_user_id
  ) then
    raise exception using errcode = '22023', message = 'Uploaded verification evidence is required.';
  end if;

  update public.platform_payments
  set
    stripe_payment_intent_id = target_payment_intent_id,
    status = 'SUCCEEDED'::public.platform_payment_status,
    amount = paid_amount,
    currency = lower(paid_currency)
  where id = target_payment.id;

  update public.offer_listing_verifications
  set status = 'PENDING'::public.evidence_verification_status, reviewer_id = null
  where offer_listing_id = target_listing_id and user_id = target_user_id;

  update public.offer_listings
  set
    verification_status = 'PENDING'::public.offer_verification_status,
    verification_timestamp = null,
    reviewer_id = null,
    listing_status = 'PENDING_VERIFICATION'::public.offer_listing_status
  where id = target_listing_id and user_id = target_user_id;

  return target_listing_id;
end;
$$;

revoke all on function public.complete_listing_fee(text, text, uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.complete_listing_fee(text, text, uuid, uuid, integer, text)
  to service_role;

comment on view public.marketplace_listings is
  'Pre-unlock marketplace DTO. Seller identity and stable seller identifiers are intentionally excluded.';
comment on view public.participant_conversations is
  'Unlocked participant-only conversation DTO. Anonymous marketplace identity is revealed only after payment.';
comment on table public.platform_payments is
  'Fixed platform fees for listing submission or chat access. No user-to-user payment data is stored.';
