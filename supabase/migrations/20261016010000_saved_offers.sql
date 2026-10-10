-- User-owned bookmarks for shared canonical offers.

create table public.saved_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid not null references public.offers (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_offers_user_offer_unique unique (user_id, offer_id)
);

create index saved_offers_offer_idx on public.saved_offers (offer_id, user_id);

alter table public.saved_offers enable row level security;

revoke all on table public.saved_offers from public, anon, authenticated;
grant select, insert, delete on table public.saved_offers to authenticated;
grant all on table public.saved_offers to service_role;

create policy "Users read their saved offers"
on public.saved_offers for select to authenticated
using (user_id = (select auth.uid()));

create policy "Active users save offers"
on public.saved_offers for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select public.current_account_is_active())
);

create policy "Users remove their saved offers"
on public.saved_offers for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function public.get_saved_offers()
returns table (
  saved_offer_id uuid,
  offer_id uuid,
  merchant_id uuid,
  merchant_name text,
  offer_title text,
  reward_amount numeric,
  reward_type public.offer_reward_type,
  canonical_spend_requirement numeric,
  expiration_date date,
  offer_status public.canonical_offer_status,
  active_listing_count bigint,
  lowest_ask numeric,
  saved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with owned_saves as (
    select saved.id, saved.offer_id, saved.created_at
    from public.saved_offers saved
    where saved.user_id = (select auth.uid())
      and (select public.current_account_is_active())
  ), listing_aggregates as (
    select
      listing.offer_id,
      count(*) as active_listing_count,
      min(listing.ask_amount) as lowest_ask
    from public.offer_listings listing
    join owned_saves saved on saved.offer_id = listing.offer_id
    join public.profiles profile on profile.id = listing.user_id
    where listing.verification_status = 'VERIFIED'::public.offer_verification_status
      and listing.listing_status = 'ACTIVE'::public.offer_listing_status
      and listing.ask_amount is not null
      and profile.onboarding_completed
      and profile.account_status = 'ACTIVE'::public.account_status
    group by listing.offer_id
  )
  select
    saved.id,
    offer.id,
    merchant.id,
    merchant.name,
    offer.title,
    offer.reward_amount,
    offer.reward_type,
    offer.required_spend,
    offer.expiration_date,
    offer.status,
    case
      when offer.status = 'ACTIVE'::public.canonical_offer_status
        and offer.expiration_date >= current_date
        and merchant.status = 'ACTIVE'::public.merchant_status
      then coalesce(aggregate.active_listing_count, 0)
      else 0
    end,
    case
      when offer.status = 'ACTIVE'::public.canonical_offer_status
        and offer.expiration_date >= current_date
        and merchant.status = 'ACTIVE'::public.merchant_status
      then aggregate.lowest_ask
      else null
    end,
    saved.created_at
  from owned_saves saved
  join public.offers offer on offer.id = saved.offer_id
  join public.merchants merchant on merchant.id = offer.merchant_id
  left join listing_aggregates aggregate on aggregate.offer_id = offer.id
  order by saved.created_at desc, saved.id;
$$;

revoke all on function public.get_saved_offers() from public, anon;
grant execute on function public.get_saved_offers() to authenticated, service_role;

comment on table public.saved_offers is
  'Owner-only bookmarks referencing shared canonical offers; no listing or seller identity is stored.';
comment on function public.get_saved_offers() is
  'Returns owner-only saved offer summaries with sanitized current marketplace aggregates in one query.';
