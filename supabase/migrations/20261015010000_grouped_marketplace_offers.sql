-- Group marketplace discovery by the shared canonical offer while retaining a
-- sanitized, paginatable listing surface for each offer.

alter table public.offers
  add column public_issuer text,
  add column public_card_product text,
  add constraint offers_public_issuer_length
    check (public_issuer is null or char_length(btrim(public_issuer)) between 2 and 80),
  add constraint offers_public_card_product_length
    check (public_card_product is null or char_length(btrim(public_card_product)) between 2 and 100);

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
  profile.response_rate as seller_response_rate,
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

create index offer_listings_public_offer_page_idx
  on public.offer_listings (offer_id, created_at desc, id)
  include (ask_amount, min_spend, is_obo, user_id)
  where listing_status = 'ACTIVE'::public.offer_listing_status
    and verification_status = 'VERIFIED'::public.offer_verification_status
    and ask_amount is not null;

create or replace function public.search_marketplace_offers(
  p_query text default null,
  p_issuer text default null,
  p_card_product text default null,
  p_max_required_spend numeric default null,
  p_min_reward numeric default null,
  p_expires_after date default null,
  p_max_ask numeric default null,
  p_max_min_spend numeric default null,
  p_obo_only boolean default false,
  p_min_rating numeric default null,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 12
)
returns table (
  offer_id uuid,
  merchant_id uuid,
  merchant_name text,
  merchant_slug text,
  offer_title text,
  offer_description text,
  public_issuer text,
  public_card_product text,
  reward_amount numeric,
  reward_type public.offer_reward_type,
  canonical_spend_requirement numeric,
  expiration_date date,
  active_listing_count bigint,
  lowest_ask numeric,
  lowest_min_spend numeric,
  highest_rating numeric,
  latest_listing_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with matching_listings as (
    select marketplace.*
    from public.marketplace_listings marketplace
    where (p_query is null or marketplace.merchant_name ilike '%' || btrim(p_query) || '%')
      and (p_issuer is null or marketplace.public_issuer ilike btrim(p_issuer))
      and (p_card_product is null or marketplace.public_card_product ilike '%' || btrim(p_card_product) || '%')
      and (p_max_required_spend is null or marketplace.canonical_spend_requirement <= p_max_required_spend)
      and (p_min_reward is null or marketplace.reward_amount >= p_min_reward)
      and (p_expires_after is null or marketplace.expiration_date >= p_expires_after)
      and (p_max_ask is null or marketplace.ask_amount <= p_max_ask)
      and (p_max_min_spend is null or marketplace.min_spend <= p_max_min_spend)
      and (not p_obo_only or marketplace.is_obo)
      and (p_min_rating is null or marketplace.seller_rating_average >= p_min_rating)
  ), grouped as (
    select
      matching.offer_id,
      matching.merchant_id,
      matching.merchant_name,
      matching.merchant_slug,
      matching.offer_title,
      matching.offer_description,
      matching.public_issuer,
      matching.public_card_product,
      matching.reward_amount,
      matching.reward_type,
      matching.canonical_spend_requirement,
      matching.expiration_date,
      count(*) as active_listing_count,
      min(matching.ask_amount) as lowest_ask,
      min(matching.min_spend) as lowest_min_spend,
      max(matching.seller_rating_average) as highest_rating,
      max(matching.created_at) as latest_listing_at
    from matching_listings matching
    group by
      matching.offer_id, matching.merchant_id, matching.merchant_name, matching.merchant_slug,
      matching.offer_title, matching.offer_description, matching.public_issuer,
      matching.public_card_product, matching.reward_amount, matching.reward_type,
      matching.canonical_spend_requirement, matching.expiration_date
  )
  select grouped.*, count(*) over() as total_count
  from grouped
  order by
    case when p_sort = 'lowest_ask' then grouped.lowest_ask end asc,
    case when p_sort = 'highest_reward' then grouped.reward_amount end desc,
    case when p_sort = 'lowest_min_spend' then grouped.lowest_min_spend end asc,
    case when p_sort = 'highest_rated' then grouped.highest_rating end desc,
    case when p_sort = 'expiring_soon' then grouped.expiration_date end asc,
    grouped.latest_listing_at desc,
    grouped.offer_id
  limit least(greatest(p_page_size, 1), 50)
  offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 50);
$$;

revoke all on function public.search_marketplace_offers(text, text, text, numeric, numeric, date, numeric, numeric, boolean, numeric, text, integer, integer)
  from public, anon;
grant execute on function public.search_marketplace_offers(text, text, text, numeric, numeric, date, numeric, numeric, boolean, numeric, text, integer, integer)
  to authenticated, service_role;

create or replace function public.get_marketplace_offer(p_offer_id uuid)
returns table (
  offer_id uuid,
  merchant_id uuid,
  merchant_name text,
  merchant_slug text,
  offer_title text,
  offer_description text,
  public_issuer text,
  public_card_product text,
  reward_amount numeric,
  reward_type public.offer_reward_type,
  canonical_spend_requirement numeric,
  expiration_date date,
  active_listing_count bigint,
  lowest_ask numeric,
  lowest_min_spend numeric,
  highest_rating numeric,
  latest_listing_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    marketplace.offer_id,
    marketplace.merchant_id,
    marketplace.merchant_name,
    marketplace.merchant_slug,
    marketplace.offer_title,
    marketplace.offer_description,
    marketplace.public_issuer,
    marketplace.public_card_product,
    marketplace.reward_amount,
    marketplace.reward_type,
    marketplace.canonical_spend_requirement,
    marketplace.expiration_date,
    count(*) as active_listing_count,
    min(marketplace.ask_amount) as lowest_ask,
    min(marketplace.min_spend) as lowest_min_spend,
    max(marketplace.seller_rating_average) as highest_rating,
    max(marketplace.created_at) as latest_listing_at
  from public.marketplace_listings marketplace
  where marketplace.offer_id = p_offer_id
  group by
    marketplace.offer_id, marketplace.merchant_id, marketplace.merchant_name,
    marketplace.merchant_slug, marketplace.offer_title, marketplace.offer_description,
    marketplace.public_issuer, marketplace.public_card_product, marketplace.reward_amount,
    marketplace.reward_type, marketplace.canonical_spend_requirement, marketplace.expiration_date;
$$;

revoke all on function public.get_marketplace_offer(uuid) from public, anon;
grant execute on function public.get_marketplace_offer(uuid) to authenticated, service_role;

comment on view public.marketplace_listings is
  'Authenticated-only sanitized marketplace listings. Seller identity, private card data, and evidence are intentionally excluded.';
comment on function public.search_marketplace_offers(text, text, text, numeric, numeric, date, numeric, numeric, boolean, numeric, text, integer, integer) is
  'Returns one sanitized marketplace search row per shared offer after applying parent and child listing filters.';
comment on function public.get_marketplace_offer(uuid) is
  'Returns sanitized aggregate metadata for one publicly eligible shared offer.';
