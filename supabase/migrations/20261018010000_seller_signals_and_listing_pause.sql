-- Privacy-safe seller activity/response aggregates and owner-controlled listing pause.

alter table public.profiles
  add column last_active_at timestamptz,
  add column response_sample_count integer not null default 0,
  add column median_response_seconds integer,
  add constraint profiles_response_sample_count_nonnegative
    check (response_sample_count >= 0),
  add constraint profiles_median_response_seconds_nonnegative
    check (median_response_seconds is null or median_response_seconds >= 0);

create index profiles_last_active_idx on public.profiles (last_active_at desc)
  where last_active_at is not null;

create or replace function private.enforce_profile_update_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if
      new.id is distinct from old.id
      or new.phone_verified is distinct from old.phone_verified
      or new.optional_identity_verified is distinct from old.optional_identity_verified
      or new.rating_average is distinct from old.rating_average
      or new.rating_count is distinct from old.rating_count
      or new.completed_interaction_count is distinct from old.completed_interaction_count
      or new.response_rate is distinct from old.response_rate
      or new.response_sample_count is distinct from old.response_sample_count
      or new.median_response_seconds is distinct from old.median_response_seconds
      or new.last_active_at is distinct from old.last_active_at
      or new.account_status is distinct from old.account_status
      or new.risk_status is distinct from old.risk_status
      or new.created_at is distinct from old.created_at
    then
      raise exception using
        errcode = '42501',
        message = 'Protected profile fields cannot be updated.';
    end if;

    if old.onboarding_completed and not new.onboarding_completed then
      raise exception using
        errcode = '42501',
        message = 'Profile onboarding cannot be reversed.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.refresh_seller_response_metrics(target_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  eligible_count integer;
  replied_count integer;
  median_seconds integer;
begin
  with eligible_conversations as (
    select
      conversation.id,
      min(message.created_at) as first_buyer_message_at
    from public.conversations conversation
    join public.messages message
      on message.conversation_id = conversation.id
      and message.sender_id = conversation.buyer_user_id
      and message.moderation_status = 'ALLOWED'::public.message_moderation_status
    where conversation.seller_user_id = target_seller_id
      and conversation.seller_user_id <> conversation.buyer_user_id
      and conversation.unlock_status = 'UNLOCKED'::public.conversation_unlock_status
      and conversation.status <> 'REPORTED'::public.conversation_status
      and not exists (
        select 1 from public.user_blocks block
        where (block.blocker_id = conversation.seller_user_id and block.blocked_user_id = conversation.buyer_user_id)
           or (block.blocker_id = conversation.buyer_user_id and block.blocked_user_id = conversation.seller_user_id)
      )
      and not exists (
        select 1 from public.reports report
        where report.conversation_id = conversation.id
          and report.reason = 'SPAM'::public.report_reason
      )
    group by conversation.id
  ), response_samples as (
    select
      eligible.id,
      eligible.first_buyer_message_at,
      (
        select min(reply.created_at)
        from public.messages reply
        where reply.conversation_id = eligible.id
          and reply.sender_id = target_seller_id
          and reply.moderation_status = 'ALLOWED'::public.message_moderation_status
          and reply.created_at >= eligible.first_buyer_message_at
      ) as first_seller_reply_at
    from eligible_conversations eligible
  )
  select
    count(*)::integer,
    count(first_seller_reply_at)::integer,
    case when count(first_seller_reply_at) >= 3 then
      round(percentile_cont(0.5) within group (
        order by extract(epoch from (first_seller_reply_at - first_buyer_message_at))
      ) filter (where first_seller_reply_at is not null))::integer
    else null end
  into eligible_count, replied_count, median_seconds
  from response_samples;

  update public.profiles
  set
    response_sample_count = eligible_count,
    response_rate = case when eligible_count >= 3
      then round((replied_count::numeric / eligible_count::numeric) * 100, 2)
      else null end,
    median_response_seconds = median_seconds
  where id = target_seller_id;
end;
$$;

create or replace function private.record_message_activity_and_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller_id uuid;
begin
  update public.profiles
  set last_active_at = greatest(coalesce(last_active_at, '-infinity'::timestamptz), new.created_at)
  where id = new.sender_id;

  select conversation.seller_user_id into seller_id
  from public.conversations conversation
  where conversation.id = new.conversation_id;

  if seller_id is not null then
    perform private.refresh_seller_response_metrics(seller_id);
  end if;
  return new;
end;
$$;

create trigger messages_record_activity_and_response_metrics
after insert or update of moderation_status on public.messages
for each row execute function private.record_message_activity_and_metrics();

create or replace function private.refresh_blocked_pair_response_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user uuid := coalesce(new.blocker_id, old.blocker_id);
  second_user uuid := coalesce(new.blocked_user_id, old.blocked_user_id);
begin
  perform private.refresh_seller_response_metrics(first_user);
  perform private.refresh_seller_response_metrics(second_user);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger user_blocks_refresh_response_metrics
after insert or delete on public.user_blocks
for each row execute function private.refresh_blocked_pair_response_metrics();

create or replace function private.refresh_reported_conversation_response_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_conversation_id uuid := coalesce(new.conversation_id, old.conversation_id);
  seller_id uuid;
begin
  if target_conversation_id is not null then
    select conversation.seller_user_id into seller_id
    from public.conversations conversation
    where conversation.id = target_conversation_id;
    if seller_id is not null then
      perform private.refresh_seller_response_metrics(seller_id);
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger reports_refresh_response_metrics
after insert or update or delete on public.reports
for each row execute function private.refresh_reported_conversation_response_metrics();

create or replace function private.refresh_conversation_status_response_metrics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
    and (
      old.status = 'REPORTED'::public.conversation_status
      or new.status = 'REPORTED'::public.conversation_status
    )
  then
    perform private.refresh_seller_response_metrics(new.seller_user_id);
  end if;
  return new;
end;
$$;

create trigger conversations_refresh_response_metrics
after update of status on public.conversations
for each row execute function private.refresh_conversation_status_response_metrics();

create or replace function public.touch_user_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;
  update public.profiles
  set last_active_at = clock_timestamp()
  where id = current_user_id
    and (last_active_at is null or last_active_at < clock_timestamp() - interval '15 minutes');
end;
$$;

create or replace function public.set_offer_listing_availability(
  target_listing_id uuid,
  target_paused boolean
)
returns public.offer_listing_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_listing public.offer_listings%rowtype;
  next_status public.offer_listing_status;
begin
  if current_user_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;

  select * into target_listing
  from public.offer_listings
  where id = target_listing_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Listing owner access required.';
  end if;
  if target_listing.verification_status <> 'VERIFIED'::public.offer_verification_status then
    raise exception using errcode = '22023', message = 'Only verified listings can be paused or resumed.';
  end if;

  if target_paused then
    if target_listing.listing_status <> 'ACTIVE'::public.offer_listing_status then
      raise exception using errcode = '22023', message = 'Only active listings can be paused.';
    end if;
    next_status := 'PAUSED'::public.offer_listing_status;
  else
    if target_listing.listing_status <> 'PAUSED'::public.offer_listing_status then
      raise exception using errcode = '22023', message = 'Only paused listings can be resumed.';
    end if;
    if target_listing.ask_amount is null or not exists (
      select 1
      from public.offers offer
      join public.merchants merchant on merchant.id = offer.merchant_id
      where offer.id = target_listing.offer_id
        and offer.status = 'ACTIVE'::public.canonical_offer_status
        and offer.expiration_date >= current_date
        and merchant.status = 'ACTIVE'::public.merchant_status
    ) then
      raise exception using errcode = '22023', message = 'This offer is no longer available to resume.';
    end if;
    next_status := 'ACTIVE'::public.offer_listing_status;
  end if;

  update public.offer_listings
  set listing_status = next_status
  where id = target_listing.id;

  update public.profiles set last_active_at = clock_timestamp()
  where id = current_user_id;
  return next_status;
end;
$$;

revoke all on function public.touch_user_activity(),
  public.set_offer_listing_availability(uuid, boolean)
  from public, anon;
grant execute on function public.touch_user_activity(),
  public.set_offer_listing_availability(uuid, boolean)
  to authenticated, service_role;
revoke execute on function private.refresh_seller_response_metrics(uuid),
  private.record_message_activity_and_metrics(),
  private.refresh_blocked_pair_response_metrics(),
  private.refresh_reported_conversation_response_metrics(),
  private.refresh_conversation_status_response_metrics()
  from public, anon, authenticated;

-- Backfill aggregates without exposing the underlying conversations or timestamps.
update public.profiles
set response_rate = null, response_sample_count = 0, median_response_seconds = null;
select private.refresh_seller_response_metrics(profile.id)
from public.profiles profile
where exists (
  select 1 from public.conversations conversation
  where conversation.seller_user_id = profile.id
);

drop view public.marketplace_listings;
create view public.marketplace_listings
with (security_invoker = false, security_barrier = true)
as
select
  listing.id as listing_id,
  offer.id as offer_id,
  merchant.id as merchant_id,
  merchant.name as merchant_name,
  merchant.slug as merchant_slug,
  offer.title as offer_title,
  offer.description as offer_description,
  offer.public_issuer,
  offer.public_card_product,
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
  case when profile.response_sample_count >= 3 then profile.response_rate else null end as seller_response_rate,
  case
    when profile.median_response_seconds is null then null
    when profile.median_response_seconds <= 3600 then 'WITHIN_ONE_HOUR'
    when profile.median_response_seconds <= 21600 then 'WITHIN_FEW_HOURS'
    when profile.median_response_seconds <= 86400 then 'WITHIN_ONE_DAY'
    else 'OVER_ONE_DAY'
  end as seller_response_bucket,
  case
    when profile.last_active_at >= now() - interval '15 minutes' then 'ACTIVE_NOW'
    when profile.last_active_at >= date_trunc('day', now()) then 'ACTIVE_TODAY'
    else null
  end as seller_activity_status,
  'AVAILABLE'::text as seller_availability_status,
  true as verification_badge,
  listing.created_at
from public.offer_listings listing
join public.offers offer on offer.id = listing.offer_id
join public.merchants merchant on merchant.id = offer.merchant_id
join public.profiles profile on profile.id = listing.user_id
where public.current_account_is_active()
  and listing.verification_status = 'VERIFIED'::public.offer_verification_status
  and listing.listing_status = 'ACTIVE'::public.offer_listing_status
  and listing.ask_amount is not null
  and offer.status = 'ACTIVE'::public.canonical_offer_status
  and offer.expiration_date >= current_date
  and merchant.status = 'ACTIVE'::public.merchant_status
  and profile.onboarding_completed
  and profile.account_status = 'ACTIVE'::public.account_status;

revoke all on table public.marketplace_listings from public, anon, authenticated;
grant select on table public.marketplace_listings to authenticated, service_role;

comment on column public.profiles.last_active_at is
  'Private activity timestamp. Public marketplace surfaces expose only coarse recent/today buckets.';
comment on column public.profiles.response_sample_count is
  'Private count of eligible unlocked buyer-initiated conversations used for response rate.';
comment on column public.profiles.median_response_seconds is
  'Private median first-response duration, exposed only as a coarse label after three replies.';
comment on function public.set_offer_listing_availability(uuid, boolean) is
  'Owner-only pause/resume transition for verified listings; preserves verification and prior listing payment.';
