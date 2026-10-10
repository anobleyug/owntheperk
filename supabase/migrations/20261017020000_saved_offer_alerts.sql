-- In-app alerts for saved canonical offers. Alert payloads intentionally contain
-- only canonical offer, merchant, listing ID, and marketplace pricing metadata.

alter table public.notifications
  add column offer_id uuid references public.offers (id) on delete set null,
  add column event_key text,
  add constraint notifications_event_key_length
    check (event_key is null or char_length(event_key) between 8 and 200);

create unique index notifications_user_event_key_unique_idx
  on public.notifications (user_id, event_key)
  where event_key is not null;
create index notifications_offer_created_idx
  on public.notifications (offer_id, created_at desc)
  where offer_id is not null;

create or replace function private.notify_listing_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing_merchant_id uuid;
  listing_merchant_name text;
  listing_offer_title text;
  parent_available boolean;
  became_available boolean;
  was_available boolean;
  remains_available boolean;
  previous_lowest numeric;
begin
  select
    merchant.id,
    merchant.name,
    offer.title,
    offer.status = 'ACTIVE'::public.canonical_offer_status
      and offer.expiration_date >= current_date
      and merchant.status = 'ACTIVE'::public.merchant_status
  into listing_merchant_id, listing_merchant_name, listing_offer_title, parent_available
  from public.offers offer
  join public.merchants merchant on merchant.id = offer.merchant_id
  where offer.id = new.offer_id;

  if old.verification_status is distinct from new.verification_status then
    if new.verification_status = 'VERIFIED'::public.offer_verification_status then
      insert into public.notifications (user_id, type, title, body, related_listing_id)
      values (
        new.user_id,
        'LISTING_APPROVED'::public.notification_type,
        'Listing approved',
        'Your ' || coalesce(listing_merchant_name, 'merchant') || ' listing is verified and available.',
        new.id
      );
    elsif new.verification_status = 'REJECTED'::public.offer_verification_status then
      insert into public.notifications (user_id, type, title, body, related_listing_id)
      values (
        new.user_id,
        'LISTING_REJECTED'::public.notification_type,
        'Listing not approved',
        'Your ' || coalesce(listing_merchant_name, 'merchant') || ' listing was not approved. Review it from My Offers.',
        new.id
      );
    end if;
  end if;

  was_available := old.verification_status = 'VERIFIED'::public.offer_verification_status
    and old.listing_status = 'ACTIVE'::public.offer_listing_status
    and old.ask_amount is not null;
  remains_available := new.verification_status = 'VERIFIED'::public.offer_verification_status
    and new.listing_status = 'ACTIVE'::public.offer_listing_status
    and new.ask_amount is not null;
  became_available := remains_available and not was_available;

  if became_available and listing_merchant_id is not null and parent_available then
    insert into public.notifications (user_id, type, title, body, related_listing_id)
    select
      follow.user_id,
      'MERCHANT_LISTING'::public.notification_type,
      'New ' || listing_merchant_name || ' listing',
      listing_offer_title || ' is now available in the marketplace.',
      new.id
    from public.merchant_follows follow
    join public.profiles profile on profile.id = follow.user_id
    where follow.merchant_id = listing_merchant_id
      and follow.user_id <> new.user_id
      and profile.account_status = 'ACTIVE'::public.account_status
      and not exists (
        select 1 from public.saved_offers saved
        where saved.user_id = follow.user_id
          and saved.offer_id = new.offer_id
      );

    select min(listing.ask_amount)
    into previous_lowest
    from public.offer_listings listing
    join public.profiles seller on seller.id = listing.user_id
    where listing.offer_id = new.offer_id
      and listing.id <> new.id
      and listing.verification_status = 'VERIFIED'::public.offer_verification_status
      and listing.listing_status = 'ACTIVE'::public.offer_listing_status
      and listing.ask_amount is not null
      and seller.onboarding_completed
      and seller.account_status = 'ACTIVE'::public.account_status;

    insert into public.notifications (
      user_id, offer_id, related_listing_id, type, title, body, event_key
    )
    select
      saved.user_id,
      new.offer_id,
      new.id,
      'SAVED_OFFER_NEW_LISTING'::public.notification_type,
      'New ' || listing_merchant_name || ' listing available',
      'A new listing was posted for your saved offer.',
      'saved-offer:new-listing:' || new.id::text
    from public.saved_offers saved
    join public.profiles recipient on recipient.id = saved.user_id
    where saved.offer_id = new.offer_id
      and saved.user_id <> new.user_id
      and recipient.account_status = 'ACTIVE'::public.account_status
    on conflict do nothing;

    if previous_lowest is not null and new.ask_amount < previous_lowest then
      insert into public.notifications (
        user_id, offer_id, related_listing_id, type, title, body, event_key
      )
      select
        saved.user_id,
        new.offer_id,
        new.id,
        'SAVED_OFFER_LOWER_ASK'::public.notification_type,
        'Lower Ask available',
        listing_merchant_name || ' now has a listing for '
          || to_char(new.ask_amount, 'FM$999,999,990.00')
          || '. Previous lowest: '
          || to_char(previous_lowest, 'FM$999,999,990.00') || '.',
        'saved-offer:lower-ask:' || new.id::text
      from public.saved_offers saved
      join public.profiles recipient on recipient.id = saved.user_id
      where saved.offer_id = new.offer_id
        and saved.user_id <> new.user_id
        and recipient.account_status = 'ACTIVE'::public.account_status
      on conflict do nothing;
    end if;
  end if;

  if was_available and not remains_available and parent_available and not exists (
    select 1
    from public.offer_listings listing
    join public.profiles seller on seller.id = listing.user_id
    where listing.offer_id = new.offer_id
      and listing.verification_status = 'VERIFIED'::public.offer_verification_status
      and listing.listing_status = 'ACTIVE'::public.offer_listing_status
      and listing.ask_amount is not null
      and seller.onboarding_completed
      and seller.account_status = 'ACTIVE'::public.account_status
  ) then
    insert into public.notifications (
      user_id, offer_id, related_listing_id, type, title, body, event_key
    )
    select
      saved.user_id,
      new.offer_id,
      new.id,
      'SAVED_OFFER_NO_LISTINGS'::public.notification_type,
      'No listings currently available',
      'The last active listing for your saved ' || listing_merchant_name || ' offer has closed.',
      'saved-offer:no-listings:' || new.id::text
    from public.saved_offers saved
    join public.profiles recipient on recipient.id = saved.user_id
    where saved.offer_id = new.offer_id
      and saved.user_id <> new.user_id
      and recipient.account_status = 'ACTIVE'::public.account_status
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger offer_listings_create_notifications on public.offer_listings;
create trigger offer_listings_create_notifications
after update of verification_status, listing_status, ask_amount on public.offer_listings
for each row
when (
  old.verification_status is distinct from new.verification_status
  or old.listing_status is distinct from new.listing_status
  or old.ask_amount is distinct from new.ask_amount
)
execute function private.notify_listing_status_change();

create or replace function private.notify_saved_offer_unavailable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  merchant_name text;
  was_available boolean;
  is_available boolean;
  expired boolean;
begin
  -- A stale ACTIVE row is still a meaningful transition when the daily sweep
  -- changes it to EXPIRED after its date has elapsed.
  was_available := old.status = 'ACTIVE'::public.canonical_offer_status;
  is_available := new.status = 'ACTIVE'::public.canonical_offer_status
    and new.expiration_date >= current_date;

  if new.status = 'ACTIVE'::public.canonical_offer_status
    and new.expiration_date between current_date and current_date + 7
    and (
      old.status is distinct from new.status
      or old.expiration_date is distinct from new.expiration_date
    )
  then
    select merchant.name into merchant_name
    from public.merchants merchant
    where merchant.id = new.merchant_id;

    insert into public.notifications (user_id, offer_id, type, title, body, event_key)
    select
      saved.user_id,
      new.id,
      'SAVED_OFFER_EXPIRING_SOON'::public.notification_type,
      'Offer expiring soon',
      'Your saved ' || merchant_name || ' offer expires in '
        || (new.expiration_date - current_date)::text
        || case when new.expiration_date - current_date = 1 then ' day.' else ' days.' end,
      'saved-offer:expiring:' || new.id::text || ':' || new.expiration_date::text
    from public.saved_offers saved
    join public.profiles recipient on recipient.id = saved.user_id
    where saved.offer_id = new.id
      and recipient.account_status = 'ACTIVE'::public.account_status
    on conflict do nothing;
  end if;

  if was_available and not is_available then
    select merchant.name into merchant_name
    from public.merchants merchant
    where merchant.id = new.merchant_id;
    expired := new.status = 'EXPIRED'::public.canonical_offer_status
      or new.expiration_date < current_date;

    insert into public.notifications (
      user_id, offer_id, type, title, body, event_key
    )
    select
      saved.user_id,
      new.id,
      'SAVED_OFFER_UNAVAILABLE'::public.notification_type,
      case when expired then 'Saved offer expired' else 'Saved offer unavailable' end,
      case
        when expired then 'The ' || merchant_name || ' offer you saved has expired.'
        else 'The ' || merchant_name || ' offer you saved is no longer active.'
      end,
      'saved-offer:unavailable:' || new.id::text || ':'
        || case when expired then 'expired' else 'inactive' end
    from public.saved_offers saved
    join public.profiles recipient on recipient.id = saved.user_id
    where saved.offer_id = new.id
      and recipient.account_status = 'ACTIVE'::public.account_status
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger offers_create_saved_offer_unavailable_notifications
after update of status, expiration_date on public.offers
for each row
when (old.status is distinct from new.status or old.expiration_date is distinct from new.expiration_date)
execute function private.notify_saved_offer_unavailable();

create or replace function private.notify_new_save_expiring_soon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, offer_id, type, title, body, event_key)
  select
    new.user_id,
    offer.id,
    'SAVED_OFFER_EXPIRING_SOON'::public.notification_type,
    'Offer expiring soon',
    'Your saved ' || merchant.name || ' offer expires in '
      || (offer.expiration_date - current_date)::text
      || case when offer.expiration_date - current_date = 1 then ' day.' else ' days.' end,
    'saved-offer:expiring:' || offer.id::text || ':' || offer.expiration_date::text
  from public.offers offer
  join public.merchants merchant on merchant.id = offer.merchant_id
  join public.profiles recipient on recipient.id = new.user_id
  where offer.id = new.offer_id
    and offer.status = 'ACTIVE'::public.canonical_offer_status
    and offer.expiration_date between current_date and current_date + 7
    and recipient.account_status = 'ACTIVE'::public.account_status
  on conflict do nothing;
  return new;
end;
$$;

create trigger saved_offers_create_expiring_notification
after insert on public.saved_offers
for each row execute function private.notify_new_save_expiring_soon();

create or replace function private.process_saved_offer_expiration_alerts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, offer_id, type, title, body, event_key)
  select
    saved.user_id,
    offer.id,
    'SAVED_OFFER_EXPIRING_SOON'::public.notification_type,
    'Offer expiring soon',
    'Your saved ' || merchant.name || ' offer expires in 7 days.',
    'saved-offer:expiring:' || offer.id::text || ':' || offer.expiration_date::text
  from public.saved_offers saved
  join public.offers offer on offer.id = saved.offer_id
  join public.merchants merchant on merchant.id = offer.merchant_id
  join public.profiles recipient on recipient.id = saved.user_id
  where offer.status = 'ACTIVE'::public.canonical_offer_status
    and offer.expiration_date = current_date + 7
    and recipient.account_status = 'ACTIVE'::public.account_status
  on conflict do nothing;

  update public.offers
  set status = 'EXPIRED'::public.canonical_offer_status,
      updated_at = now()
  where status = 'ACTIVE'::public.canonical_offer_status
    and expiration_date < current_date;
end;
$$;

revoke execute on function private.notify_listing_status_change(),
  private.notify_saved_offer_unavailable(),
  private.notify_new_save_expiring_soon(),
  private.process_saved_offer_expiration_alerts()
  from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'saved-offer-expiration-alerts-daily',
  '5 0 * * *',
  $cron$select private.process_saved_offer_expiration_alerts();$cron$
);

comment on column public.notifications.offer_id is
  'Canonical offer context for saved-offer alerts; never identifies a seller.';
comment on column public.notifications.event_key is
  'Stable per-user idempotency key for notification-producing events.';
comment on function private.process_saved_offer_expiration_alerts() is
  'Daily set-based saved-offer expiration alert and canonical expiration sweep.';
comment on table public.notifications is
  'Owner-only in-app activity notifications. Saved-offer payloads contain only canonical offer, opaque listing, merchant, and marketplace pricing context.';
