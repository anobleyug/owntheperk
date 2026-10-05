-- Production security hardening: durable rate limits, Stripe replay tracking,
-- admin audit events, active-account boundaries, and stale listing protection.

create table public.rate_limit_buckets (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash),
  constraint rate_limit_scope_format check (scope ~ '^[A-Z_]{3,40}$'),
  constraint rate_limit_subject_hash_format check (subject_hash ~ '^[0-9a-f]{64}$'),
  constraint rate_limit_count_positive check (request_count > 0)
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'PROCESSING',
  attempts integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint stripe_webhook_event_id_format check (event_id ~ '^evt_[A-Za-z0-9_]{8,255}$'),
  constraint stripe_webhook_event_type_length check (char_length(event_type) between 3 and 100),
  constraint stripe_webhook_event_status check (status in ('PROCESSING', 'PROCESSED', 'FAILED')),
  constraint stripe_webhook_event_attempts_positive check (attempts > 0)
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  constraint admin_audit_action_format check (action ~ '^[A-Z_]{3,64}$'),
  constraint admin_audit_target_type_format check (target_type ~ '^[A-Z_]{3,40}$')
);

alter table public.rate_limit_buckets enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on table public.rate_limit_buckets, public.stripe_webhook_events, public.admin_audit_logs
  from public, anon, authenticated;
grant all on table public.rate_limit_buckets, public.stripe_webhook_events, public.admin_audit_logs
  to service_role;
grant select on table public.admin_audit_logs to authenticated;

create policy "Admins read admin audit logs"
on public.admin_audit_logs for select to authenticated
using ((select public.current_user_is_admin()));

create or replace function public.consume_rate_limit(
  request_scope text,
  request_subject_hash text,
  request_limit integer,
  request_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket public.rate_limit_buckets%rowtype;
  now_at timestamptz := clock_timestamp();
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception using errcode = '42501', message = 'Service access required.';
  end if;
  if request_scope !~ '^[A-Z_]{3,40}$'
    or request_subject_hash !~ '^[0-9a-f]{64}$'
    or request_limit not between 1 and 1000
    or request_window_seconds not between 1 and 86400
  then
    raise exception using errcode = '22023', message = 'Invalid rate limit request.';
  end if;

  insert into public.rate_limit_buckets (
    scope, subject_hash, window_started_at, request_count, updated_at
  ) values (
    request_scope, request_subject_hash, now_at, 1, now_at
  )
  on conflict (scope, subject_hash) do update set
    window_started_at = case
      when public.rate_limit_buckets.window_started_at + make_interval(secs => request_window_seconds) <= now_at
        then now_at
      else public.rate_limit_buckets.window_started_at
    end,
    request_count = case
      when public.rate_limit_buckets.window_started_at + make_interval(secs => request_window_seconds) <= now_at
        then 1
      else public.rate_limit_buckets.request_count + 1
    end,
    updated_at = now_at
  returning * into bucket;

  return jsonb_build_object(
    'allowed', bucket.request_count <= request_limit,
    'retry_after_seconds', greatest(
      0,
      ceil(extract(epoch from (
        bucket.window_started_at + make_interval(secs => request_window_seconds) - now_at
      )))::integer
    )
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

create or replace function public.claim_stripe_webhook_event(
  target_event_id text,
  target_event_type text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_event_id text;
  existing_status text;
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception using errcode = '42501', message = 'Service access required.';
  end if;
  if target_event_id !~ '^evt_[A-Za-z0-9_]{8,255}$'
    or char_length(target_event_type) not between 3 and 100
  then
    raise exception using errcode = '22023', message = 'Invalid webhook event.';
  end if;

  insert into public.stripe_webhook_events (event_id, event_type)
  values (target_event_id, target_event_type)
  on conflict (event_id) do update set
    status = 'PROCESSING',
    attempts = public.stripe_webhook_events.attempts + 1,
    updated_at = now(),
    processed_at = null
  where public.stripe_webhook_events.status = 'FAILED'
     or (
       public.stripe_webhook_events.status = 'PROCESSING'
       and public.stripe_webhook_events.updated_at < now() - interval '5 minutes'
     )
  returning event_id into claimed_event_id;

  if claimed_event_id is not null then return 'CLAIMED'; end if;
  select status into existing_status
  from public.stripe_webhook_events
  where event_id = target_event_id;
  return case when existing_status = 'PROCESSED' then 'PROCESSED' else 'BUSY' end;
end;
$$;

create or replace function public.finish_stripe_webhook_event(
  target_event_id text,
  succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('service_role', 'postgres') then
    raise exception using errcode = '42501', message = 'Service access required.';
  end if;
  update public.stripe_webhook_events set
    status = case when succeeded then 'PROCESSED' else 'FAILED' end,
    processed_at = case when succeeded then now() else null end,
    updated_at = now()
  where event_id = target_event_id and status = 'PROCESSING';
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text),
  public.finish_stripe_webhook_event(text, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text),
  public.finish_stripe_webhook_event(text, boolean)
  to service_role;

alter table public.conversations
  add column checkout_attempt integer not null default 1,
  add constraint conversations_checkout_attempt_positive check (checkout_attempt > 0);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles role_assignment
    join public.profiles profile on profile.id = role_assignment.user_id
    where role_assignment.user_id = auth.uid()
      and role_assignment.role = 'ADMIN'::public.app_role
      and profile.account_status = 'ACTIVE'::public.account_status
  );
$$;

create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles role_assignment
    join public.profiles profile on profile.id = role_assignment.user_id
    where role_assignment.user_id = auth.uid()
      and role_assignment.role in ('MODERATOR'::public.app_role, 'ADMIN'::public.app_role)
      and profile.account_status = 'ACTIVE'::public.account_status
  );
$$;

create or replace function private.audit_offer_listing_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reviewer_id is not null
    and (
      old.verification_status is distinct from new.verification_status
      or old.listing_status is distinct from new.listing_status
    )
  then
    insert into public.admin_audit_logs (actor_id, action, target_type, target_id)
    values (
      new.reviewer_id,
      case new.verification_status
        when 'VERIFIED'::public.offer_verification_status then 'LISTING_APPROVED'
        when 'REJECTED'::public.offer_verification_status then 'LISTING_REJECTED'
        else 'LISTING_REVIEW_REQUESTED'
      end,
      'OFFER_LISTING',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger offer_listings_audit_admin_review
after update of verification_status, listing_status on public.offer_listings
for each row execute function private.audit_offer_listing_review();
revoke execute on function private.audit_offer_listing_review() from public, anon, authenticated;

create or replace function private.enforce_message_rate_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    select count(*) from public.messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception using errcode = '22023', message = 'Message rate limit reached.';
  end if;
  return new;
end;
$$;

create trigger messages_enforce_rate_limit
before insert on public.messages
for each row execute function private.enforce_message_rate_limit();
revoke execute on function private.enforce_message_rate_limit() from public, anon, authenticated;

create or replace function private.enforce_listing_creation_rate_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    select count(*) from public.offer_listings
    where user_id = new.user_id and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception using errcode = '22023', message = 'Listing creation rate limit reached.';
  end if;
  return new;
end;
$$;

create trigger offer_listings_enforce_creation_rate_limit
before insert on public.offer_listings
for each row execute function private.enforce_listing_creation_rate_limit();
revoke execute on function private.enforce_listing_creation_rate_limit() from public, anon, authenticated;

create or replace function private.enforce_report_listing_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.conversation_id is null and not exists (
    select 1
    from public.offer_listings listing
    join public.offers offer on offer.id = listing.offer_id
    join public.merchants merchant on merchant.id = offer.merchant_id
    join public.profiles seller on seller.id = listing.user_id
    where listing.id = new.offer_listing_id
      and listing.verification_status = 'VERIFIED'::public.offer_verification_status
      and listing.listing_status = 'ACTIVE'::public.offer_listing_status
      and offer.status = 'ACTIVE'::public.canonical_offer_status
      and offer.expiration_date >= current_date
      and merchant.status = 'ACTIVE'::public.merchant_status
      and seller.account_status = 'ACTIVE'::public.account_status
  ) then
    raise exception using errcode = '42501', message = 'Invalid listing report context.';
  end if;
  return new;
end;
$$;

create trigger reports_enforce_listing_visibility
before insert on public.reports
for each row execute function private.enforce_report_listing_visibility();
revoke execute on function private.enforce_report_listing_visibility() from public, anon, authenticated;

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
  if current_buyer_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;

  select id into existing_conversation_id from public.conversations
  where buyer_user_id = current_buyer_id and listing_id = target_listing_id;

  if existing_conversation_id is not null then
    if not exists (
      select 1
      from public.conversations conversation
      join public.offer_listings listing on listing.id = conversation.listing_id
      join public.offers offer on offer.id = listing.offer_id
      join public.merchants merchant on merchant.id = offer.merchant_id
      join public.profiles seller on seller.id = listing.user_id
      where conversation.id = existing_conversation_id
        and conversation.unlock_status = 'LOCKED'::public.conversation_unlock_status
        and listing.verification_status = 'VERIFIED'::public.offer_verification_status
        and listing.listing_status = 'ACTIVE'::public.offer_listing_status
        and offer.status = 'ACTIVE'::public.canonical_offer_status
        and offer.expiration_date >= current_date
        and merchant.status = 'ACTIVE'::public.merchant_status
        and seller.account_status = 'ACTIVE'::public.account_status
        and not exists (
          select 1 from public.user_blocks block
          where (block.blocker_id = conversation.seller_user_id and block.blocked_user_id = conversation.buyer_user_id)
             or (block.blocker_id = conversation.buyer_user_id and block.blocked_user_id = conversation.seller_user_id)
        )
    ) then
      raise exception using errcode = '22023', message = 'This listing is not available for chat unlock.';
    end if;
    return existing_conversation_id;
  end if;

  insert into public.conversations (
    listing_id, seller_user_id, buyer_user_id, merchant_name, offer_title,
    reward_amount, reward_type, min_spend, ask_amount, is_obo,
    seller_username, seller_rating_average
  )
  select listing.id, listing.user_id, current_buyer_id, merchant.name, offer.title,
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
    and not exists (
      select 1 from public.user_blocks block
      where (block.blocker_id = current_buyer_id and block.blocked_user_id = listing.user_id)
         or (block.blocker_id = listing.user_id and block.blocked_user_id = current_buyer_id)
    )
  on conflict (buyer_user_id, listing_id) do nothing
  returning id into reserved_conversation_id;

  if reserved_conversation_id is null then
    select id into reserved_conversation_id from public.conversations
    where buyer_user_id = current_buyer_id and listing_id = target_listing_id;
  end if;
  if reserved_conversation_id is null then
    raise exception using errcode = '22023', message = 'This listing is not available for chat unlock.';
  end if;
  return reserved_conversation_id;
end;
$$;

create policy "Active accounts access profiles"
on public.profiles as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access cards"
on public.credit_card_profiles as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access listings"
on public.offer_listings as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access evidence metadata"
on public.offer_listing_verifications as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access conversations"
on public.conversations as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access messages"
on public.messages as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access payments"
on public.platform_payments as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access ratings"
on public.ratings as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access blocks"
on public.user_blocks as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access notifications"
on public.notifications as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));
create policy "Active accounts access follows"
on public.merchant_follows as restrictive for all to authenticated
using ((select public.current_account_is_active()))
with check ((select public.current_account_is_active()));

drop policy "Owners read registered listing evidence objects" on storage.objects;
create policy "Owners read registered listing evidence objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'offer-verification-evidence'
  and (select public.current_account_is_active())
  and exists (
    select 1 from public.offer_listing_verifications evidence
    where evidence.evidence_path = name and evidence.user_id = (select auth.uid())
  )
);

drop view public.participant_conversations;
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
where public.current_account_is_active()
  and conversation.unlock_status = 'UNLOCKED'::public.conversation_unlock_status
  and conversation.status <> 'LOCKED'::public.conversation_status
  and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id);

revoke all on table public.participant_conversations from public, anon, authenticated;
grant select on table public.participant_conversations to authenticated, service_role;

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
  if current_user_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;
  sanitized_query := btrim(left(
    regexp_replace(
      regexp_replace(btrim(coalesce(search_query, '')), '[[:cntrl:]]+', ' ', 'g'),
      '[[:space:]]+', ' ', 'g'
    ), 100
  ));
  if sanitized_query = '' then return; end if;
  select merchant.id into matched_merchant_id
  from public.merchants merchant
  where merchant.status = 'ACTIVE'::public.merchant_status
    and (lower(merchant.name) = lower(sanitized_query) or lower(merchant.slug) = lower(sanitized_query))
  order by merchant.name limit 1;
  insert into public.search_events (user_id, merchant_id, query)
  values (current_user_id, matched_merchant_id, sanitized_query);
end;
$$;

do $$
declare
  unsecured_tables text;
begin
  select string_agg(format('%I.%I', namespace.nspname, class.relname), ', ')
  into unsecured_tables
  from pg_class class
  join pg_namespace namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relkind in ('r', 'p')
    and not class.relrowsecurity;
  if unsecured_tables is not null then
    raise exception 'Public tables without RLS: %', unsecured_tables;
  end if;
end;
$$;

comment on table public.rate_limit_buckets is
  'Hashed, fixed-window abuse controls. Raw IP addresses, emails, and user identifiers are never stored.';
comment on table public.stripe_webhook_events is
  'Stripe event IDs and processing state only; webhook payloads and payment details are never logged or stored here.';
comment on table public.admin_audit_logs is
  'Minimal immutable audit trail for administrator verification decisions.';
