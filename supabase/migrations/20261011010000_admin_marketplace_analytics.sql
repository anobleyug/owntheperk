-- Privacy-safe marketplace analytics and minimal merchant-search tracking.

create table public.search_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  merchant_id uuid references public.merchants (id) on delete set null,
  query text not null,
  created_at timestamptz not null default now(),

  constraint search_events_query_length
    check (char_length(query) between 1 and 100),
  constraint search_events_query_sanitized
    check (
      query = btrim(query)
      and query !~ '[[:cntrl:]]'
      and query !~ '[[:space:]]{2,}'
    )
);

create index search_events_merchant_created_idx
  on public.search_events (merchant_id, created_at desc)
  where merchant_id is not null;
create index search_events_user_created_idx
  on public.search_events (user_id, created_at desc)
  where user_id is not null;

alter table public.search_events enable row level security;
revoke all on table public.search_events from public, anon, authenticated;
grant all on table public.search_events to service_role;

create or replace function public.record_marketplace_search(search_query text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  sanitized_query text;
  matched_merchant_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  sanitized_query := btrim(left(
    regexp_replace(
      regexp_replace(btrim(coalesce(search_query, '')), '[[:cntrl:]]+', ' ', 'g'),
      '[[:space:]]+', ' ', 'g'
    ),
    100
  ));

  if sanitized_query = '' then
    return;
  end if;

  select merchant.id into matched_merchant_id
  from public.merchants merchant
  where merchant.status = 'ACTIVE'::public.merchant_status
    and (
      lower(merchant.name) = lower(sanitized_query)
      or lower(merchant.slug) = lower(sanitized_query)
    )
  order by merchant.name
  limit 1;

  insert into public.search_events (user_id, merchant_id, query)
  values (current_user_id, matched_merchant_id, sanitized_query);
end;
$$;

revoke all on function public.record_marketplace_search(text) from public, anon;
grant execute on function public.record_marketplace_search(text) to authenticated, service_role;

create or replace function public.get_marketplace_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  active_verified_listing_count bigint;
  listings_with_unlock_count bigint;
  total_listing_count bigint;
begin
  if auth.uid() is null or not public.current_user_can_moderate() then
    raise exception using errcode = '42501', message = 'Moderator access required.';
  end if;

  select count(*) into active_verified_listing_count
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

  select count(*) into total_listing_count
  from public.offer_listings;

  select count(distinct conversation.listing_id) into listings_with_unlock_count
  from public.platform_payments payment
  join public.conversations conversation on conversation.id = payment.conversation_id
  where payment.payment_type = 'CHAT_UNLOCK'::public.platform_payment_type
    and payment.status = 'SUCCEEDED'::public.platform_payment_status;

  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (
      select count(*) from public.profiles
      where onboarding_completed
        and account_status = 'ACTIVE'::public.account_status
    ),
    'active_verified_listings', active_verified_listing_count,
    'pending_verifications', (
      select count(*) from public.offer_listings
      where verification_status = 'PENDING'::public.offer_verification_status
        and listing_status = 'PENDING_VERIFICATION'::public.offer_listing_status
    ),
    'completed_interactions', (
      select count(*) from public.conversations
      where status = 'COMPLETED'::public.conversation_status
    ),
    'chat_unlock_count', (
      select count(distinct conversation_id) from public.platform_payments
      where payment_type = 'CHAT_UNLOCK'::public.platform_payment_type
        and status = 'SUCCEEDED'::public.platform_payment_status
    ),
    'platform_revenue_cents', (
      select coalesce(sum(amount), 0) from public.platform_payments
      where status = 'SUCCEEDED'::public.platform_payment_status
        and currency = 'usd'
    ),
    'open_reports', (
      select count(*) from public.reports
      where status = 'OPEN'::public.report_status
    ),
    'listing_to_chat_conversion', case
      when total_listing_count = 0 then 0
      else round((listings_with_unlock_count::numeric / total_listing_count::numeric) * 100, 1)
    end,
    'repeat_buyer_count', (
      select count(*) from (
        select payment.user_id
        from public.platform_payments payment
        where payment.payment_type = 'CHAT_UNLOCK'::public.platform_payment_type
          and payment.status = 'SUCCEEDED'::public.platform_payment_status
        group by payment.user_id
        having count(distinct payment.conversation_id) >= 2
      ) repeat_buyers
    ),
    'top_merchants_by_listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'merchant_id', ranked.id,
        'merchant_name', ranked.name,
        'count', ranked.listing_count
      ) order by ranked.listing_count desc, ranked.name)
      from (
        select merchant.id, merchant.name, count(*) as listing_count
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
          and profile.account_status = 'ACTIVE'::public.account_status
        group by merchant.id, merchant.name
        order by listing_count desc, merchant.name
        limit 5
      ) ranked
    ), '[]'::jsonb),
    'top_merchants_by_searches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'merchant_id', ranked.id,
        'merchant_name', ranked.name,
        'count', ranked.search_count
      ) order by ranked.search_count desc, ranked.name)
      from (
        select merchant.id, merchant.name, count(*) as search_count
        from public.search_events event
        join public.merchants merchant on merchant.id = event.merchant_id
        group by merchant.id, merchant.name
        order by search_count desc, merchant.name
        limit 5
      ) ranked
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_marketplace_analytics() from public, anon;
grant execute on function public.get_marketplace_analytics() to authenticated, service_role;

comment on table public.search_events is
  'Minimal marketplace search analytics. Query text is normalized and limited; no contact, card, evidence, or message data is stored.';
comment on function public.get_marketplace_analytics() is
  'Moderator-only aggregate marketplace metrics. Returns no user-level or sensitive records.';
