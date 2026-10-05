-- Buyer-paid chat unlocks and participant-only realtime messaging.

create type public.conversation_unlock_status as enum ('LOCKED', 'UNLOCKED');
create type public.conversation_status as enum (
  'LOCKED', 'ACTIVE', 'COMPLETED', 'NO_AGREEMENT', 'CLOSED', 'REPORTED'
);
create type public.message_moderation_status as enum ('ALLOWED', 'FLAGGED');
create type public.platform_payment_status as enum ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.offer_listings (id) on delete restrict,
  seller_user_id uuid not null references auth.users (id) on delete restrict,
  buyer_user_id uuid not null references auth.users (id) on delete restrict,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  unlock_status public.conversation_unlock_status not null default 'LOCKED',
  status public.conversation_status not null default 'LOCKED',
  merchant_name text not null,
  offer_title text not null,
  reward_amount numeric(12, 2) not null,
  reward_type public.offer_reward_type not null,
  min_spend numeric(12, 2) not null,
  ask_amount numeric(12, 2) not null,
  is_obo boolean not null,
  seller_username text not null,
  seller_rating_average numeric(3, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversations_distinct_participants check (seller_user_id <> buyer_user_id),
  constraint conversations_unlock_consistency check (
    (unlock_status = 'LOCKED' and status = 'LOCKED')
    or (unlock_status = 'UNLOCKED' and status <> 'LOCKED')
  ),
  constraint conversations_one_buyer_per_listing unique (buyer_user_id, listing_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete restrict,
  content text not null,
  moderation_status public.message_moderation_status not null default 'ALLOWED',
  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint messages_content_length check (char_length(btrim(content)) between 1 and 2000)
);

create table public.platform_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  conversation_id uuid not null references public.conversations (id) on delete restrict,
  amount integer not null,
  currency text not null default 'usd',
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  status public.platform_payment_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_payments_amount_positive check (amount > 0),
  constraint platform_payments_currency_format check (currency ~ '^[a-z]{3}$')
);

create index conversations_seller_updated_idx on public.conversations (seller_user_id, updated_at desc);
create index conversations_buyer_updated_idx on public.conversations (buyer_user_id, updated_at desc);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx on public.messages (conversation_id, read_at) where read_at is null;
create index platform_payments_user_created_idx on public.platform_payments (user_id, created_at desc);

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function private.set_updated_at();

create trigger platform_payments_set_updated_at
before update on public.platform_payments
for each row execute function private.set_updated_at();

create or replace function public.reserve_chat_conversation(target_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_buyer_id uuid := auth.uid();
  existing_conversation_id uuid;
  reserved_conversation_id uuid;
begin
  if current_buyer_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select id into existing_conversation_id
  from public.conversations
  where buyer_user_id = current_buyer_id and listing_id = target_listing_id;

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  insert into public.conversations (
    listing_id, seller_user_id, buyer_user_id, merchant_name, offer_title,
    reward_amount, reward_type, min_spend, ask_amount, is_obo,
    seller_username, seller_rating_average
  )
  select
    listing.id, listing.user_id, current_buyer_id, merchant.name, offer.title,
    offer.reward_amount, offer.reward_type, listing.min_spend, listing.ask_amount,
    listing.is_obo, profile.username, profile.rating_average
  from public.offer_listings listing
  join public.offers offer on offer.id = listing.offer_id
  join public.merchants merchant on merchant.id = offer.merchant_id
  join public.profiles profile on profile.id = listing.user_id
  where listing.id = target_listing_id
    and listing.user_id <> current_buyer_id
    and listing.listing_status = 'ACTIVE'::public.offer_listing_status
    and listing.verification_status = 'VERIFIED'::public.offer_verification_status
    and listing.ask_amount is not null
    and offer.status = 'ACTIVE'::public.canonical_offer_status
    and offer.expiration_date >= current_date
    and merchant.status = 'ACTIVE'::public.merchant_status
    and profile.account_status = 'ACTIVE'::public.account_status
    and profile.onboarding_completed
  on conflict (buyer_user_id, listing_id) do nothing
  returning id into reserved_conversation_id;

  if reserved_conversation_id is null then
    select id into reserved_conversation_id
    from public.conversations
    where buyer_user_id = current_buyer_id and listing_id = target_listing_id;
  end if;

  if reserved_conversation_id is null then
    raise exception using errcode = '22023', message = 'This listing is not available for chat unlock.';
  end if;

  return reserved_conversation_id;
end;
$$;

-- Called only by the service role after Stripe signature and payment checks.
create or replace function public.complete_chat_unlock(
  target_checkout_session_id text,
  target_payment_intent_id text,
  target_listing_id uuid,
  target_buyer_user_id uuid,
  paid_amount integer,
  paid_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_conversation public.conversations%rowtype;
begin
  if paid_amount <> 199 or lower(paid_currency) <> 'usd' then
    raise exception using errcode = '22023', message = 'Unexpected chat unlock payment amount.';
  end if;

  select * into target_conversation
  from public.conversations
  where listing_id = target_listing_id
    and buyer_user_id = target_buyer_user_id
    and stripe_checkout_session_id = target_checkout_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Matching conversation not found.';
  end if;

  insert into public.platform_payments (
    user_id, conversation_id, amount, currency, stripe_checkout_session_id,
    stripe_payment_intent_id, status
  ) values (
    target_buyer_user_id, target_conversation.id, paid_amount, lower(paid_currency),
    target_checkout_session_id, target_payment_intent_id, 'SUCCEEDED'
  )
  on conflict (stripe_checkout_session_id) do update
  set
    stripe_payment_intent_id = excluded.stripe_payment_intent_id,
    status = 'SUCCEEDED'::public.platform_payment_status;

  update public.conversations
  set
    stripe_payment_intent_id = target_payment_intent_id,
    unlock_status = 'UNLOCKED'::public.conversation_unlock_status,
    status = case
      when status = 'LOCKED'::public.conversation_status then 'ACTIVE'::public.conversation_status
      else status
    end
  where id = target_conversation.id;

  return target_conversation.id;
end;
$$;

create or replace function private.reject_sensitive_message()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.content ~* '(^|[^0-9])([0-9][ -]?){12,18}[0-9]([^0-9]|$)'
    or new.content ~* '\m(ssn|social[[:space:]-]*security)([[:space:]]*(number|no\.?))?[[:space:]:#-]*[0-9]{3}[ -]?[0-9]{2}[ -]?[0-9]{4}\M'
    or new.content ~* '\m(cvv|cvc|security[[:space:]]+code)[[:space:]:#-]*[0-9]{3,4}\M'
    or new.content ~* '\m(password|passcode|issuer[[:space:]]+login|bank[[:space:]]+login)[[:space:]:=-]+[^[:space:]]+'
    or new.content ~* '\m(routing|bank[[:space:]]+account)([[:space:]]*(number|no\.?))?[[:space:]:#-]*[0-9]{6,17}\M'
  then
    raise exception using errcode = '22023', message = 'Message appears to contain sensitive financial or login information.';
  end if;
  return new;
end;
$$;

create trigger messages_reject_sensitive_content
before insert or update of content on public.messages
for each row execute function private.reject_sensitive_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.platform_payments enable row level security;

revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;
revoke all on table public.platform_payments from public, anon, authenticated;

grant select on table public.conversations to authenticated;
grant select, insert on table public.messages to authenticated;
grant update (read_at) on table public.messages to authenticated;
grant select on table public.platform_payments to authenticated;
grant all on table public.conversations, public.messages, public.platform_payments to service_role;

create policy "Participants read conversations"
on public.conversations for select to authenticated
using ((select auth.uid()) in (seller_user_id, buyer_user_id));

create policy "Participants read unlocked messages"
on public.messages for select to authenticated
using (exists (
  select 1 from public.conversations conversation
  where conversation.id = conversation_id
    and conversation.status <> 'LOCKED'::public.conversation_status
    and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id)
));

create policy "Participants send unlocked messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and moderation_status = 'ALLOWED'::public.message_moderation_status
  and read_at is null
  and exists (
    select 1 from public.conversations conversation
    where conversation.id = conversation_id
      and conversation.status = 'ACTIVE'::public.conversation_status
      and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id)
  )
);

create policy "Recipients mark messages read"
on public.messages for update to authenticated
using (
  sender_id <> (select auth.uid())
  and exists (
    select 1 from public.conversations conversation
    where conversation.id = conversation_id
      and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id)
  )
)
with check (
  sender_id <> (select auth.uid())
  and read_at is not null
);

create policy "Buyers read their platform payments"
on public.platform_payments for select to authenticated
using (user_id = (select auth.uid()));

revoke all on function public.reserve_chat_conversation(uuid) from public, anon;
grant execute on function public.reserve_chat_conversation(uuid) to authenticated, service_role;
revoke all on function public.complete_chat_unlock(text, text, uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.complete_chat_unlock(text, text, uuid, uuid, integer, text) to service_role;
revoke execute on function private.reject_sensitive_message() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

comment on table public.conversations is
  'Participant-only chat records with an immutable safe listing snapshot. Only Stripe webhook service logic unlocks them.';
comment on table public.platform_payments is
  'Platform chat-access payments only. No user-to-user payment or card data is stored.';
