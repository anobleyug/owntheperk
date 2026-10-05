-- Owner-only in-app notifications and saved merchant alerts.

create type public.notification_type as enum (
  'NEW_MESSAGE',
  'CHAT_UNLOCKED',
  'LISTING_APPROVED',
  'LISTING_REJECTED',
  'NEW_RATING',
  'MERCHANT_LISTING',
  'REPORT_RESOLVED',
  'REPORT_DISMISSED'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  related_listing_id uuid references public.offer_listings (id) on delete set null,
  related_conversation_id uuid references public.conversations (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint notifications_body_length check (char_length(btrim(body)) between 1 and 500)
);

create table public.merchant_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, merchant_id)
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc)
where read_at is null;
create index merchant_follows_merchant_idx on public.merchant_follows (merchant_id, user_id);

create or replace function private.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_conversation public.conversations%rowtype;
  recipient_id uuid;
  sender_username text;
begin
  select * into target_conversation
  from public.conversations
  where id = new.conversation_id;

  if not found then return new; end if;
  recipient_id := case
    when new.sender_id = target_conversation.seller_user_id then target_conversation.buyer_user_id
    else target_conversation.seller_user_id
  end;
  select username into sender_username from public.profiles where id = new.sender_id;

  insert into public.notifications (
    user_id, type, title, body, related_listing_id, related_conversation_id
  ) values (
    recipient_id,
    'NEW_MESSAGE'::public.notification_type,
    'New message from ' || coalesce(sender_username, 'a marketplace member'),
    'You have a new message about ' || target_conversation.merchant_name || '.',
    target_conversation.listing_id,
    target_conversation.id
  );
  return new;
end;
$$;

create trigger messages_create_notification
after insert on public.messages
for each row execute function private.notify_new_message();

create or replace function private.notify_chat_unlocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.unlock_status = 'LOCKED'::public.conversation_unlock_status
    and new.unlock_status = 'UNLOCKED'::public.conversation_unlock_status then
    insert into public.notifications (
      user_id, type, title, body, related_listing_id, related_conversation_id
    ) values (
      new.seller_user_id,
      'CHAT_UNLOCKED'::public.notification_type,
      'Chat unlocked',
      'A marketplace member unlocked chat for your ' || new.merchant_name || ' listing.',
      new.listing_id,
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger conversations_create_unlock_notification
after update of unlock_status on public.conversations
for each row
when (old.unlock_status is distinct from new.unlock_status)
execute function private.notify_chat_unlocked();

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
  became_available boolean;
begin
  select merchant.id, merchant.name, offer.title
  into listing_merchant_id, listing_merchant_name, listing_offer_title
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

  became_available := new.verification_status = 'VERIFIED'::public.offer_verification_status
    and new.listing_status = 'ACTIVE'::public.offer_listing_status
    and not (
      old.verification_status = 'VERIFIED'::public.offer_verification_status
      and old.listing_status = 'ACTIVE'::public.offer_listing_status
    );

  if became_available and listing_merchant_id is not null then
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
      and profile.account_status = 'ACTIVE'::public.account_status;
  end if;
  return new;
end;
$$;

create trigger offer_listings_create_notifications
after update of verification_status, listing_status on public.offer_listings
for each row
when (
  old.verification_status is distinct from new.verification_status
  or old.listing_status is distinct from new.listing_status
)
execute function private.notify_listing_status_change();

create or replace function private.notify_new_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rating_conversation public.conversations%rowtype;
begin
  select * into rating_conversation
  from public.conversations
  where id = new.conversation_id;

  insert into public.notifications (
    user_id, type, title, body, related_listing_id, related_conversation_id
  ) values (
    new.reviewed_user_id,
    'NEW_RATING'::public.notification_type,
    'New peer rating',
    'You received a new rating from a completed interaction.',
    rating_conversation.listing_id,
    new.conversation_id
  );
  return new;
end;
$$;

create trigger ratings_create_notification
after insert on public.ratings
for each row execute function private.notify_new_rating();

create or replace function private.notify_report_outcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'RESOLVED'::public.report_status then
    insert into public.notifications (
      user_id, type, title, body, related_listing_id, related_conversation_id
    ) values (
      new.reporter_id,
      'REPORT_RESOLVED'::public.notification_type,
      'Report reviewed',
      'The moderation team reviewed and resolved your report.',
      new.offer_listing_id,
      new.conversation_id
    );
  elsif new.status = 'DISMISSED'::public.report_status then
    insert into public.notifications (
      user_id, type, title, body, related_listing_id, related_conversation_id
    ) values (
      new.reporter_id,
      'REPORT_DISMISSED'::public.notification_type,
      'Report reviewed',
      'The moderation team reviewed and closed your report.',
      new.offer_listing_id,
      new.conversation_id
    );
  end if;
  return new;
end;
$$;

create trigger reports_create_outcome_notification
after update of status on public.reports
for each row
when (old.status is distinct from new.status)
execute function private.notify_report_outcome();

alter table public.notifications enable row level security;
alter table public.merchant_follows enable row level security;

revoke all on table public.notifications, public.merchant_follows from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant select, insert, delete on table public.merchant_follows to authenticated;
grant all on table public.notifications, public.merchant_follows to service_role;

create policy "Users read their notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));
create policy "Users mark their notifications read"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users read their merchant follows"
on public.merchant_follows for select to authenticated
using (user_id = (select auth.uid()));
create policy "Active users follow merchants"
on public.merchant_follows for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select public.current_account_is_active())
);
create policy "Users unfollow merchants"
on public.merchant_follows for delete to authenticated
using (user_id = (select auth.uid()));

create or replace view public.marketplace_listings
with (security_invoker = false, security_barrier = true)
as
select
  listing.id as listing_id,
  listing.user_id as seller_user_id,
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
  profile.username as seller_username,
  profile.avatar_url as seller_avatar_url,
  profile.rating_average as seller_rating_average,
  profile.rating_count as seller_rating_count,
  profile.completed_interaction_count as seller_completed_interaction_count,
  true as verification_badge,
  listing.created_at,
  merchant.id as merchant_id
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

revoke execute on function private.notify_new_message(), private.notify_chat_unlocked(),
  private.notify_listing_status_change(), private.notify_new_rating(),
  private.notify_report_outcome() from public, anon, authenticated;

comment on table public.notifications is
  'Owner-only in-app activity notifications. Bodies intentionally exclude message text and sensitive evidence.';
comment on table public.merchant_follows is
  'Private saved-merchant preferences used only for in-app listing alerts.';
