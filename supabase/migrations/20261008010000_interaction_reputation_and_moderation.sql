-- Interaction outcomes, immutable peer ratings, blocking, reporting, and minimal moderation.

create type public.report_reason as enum (
  'FAKE_OFFER',
  'SCAM_ATTEMPT',
  'HARASSMENT',
  'SPAM',
  'CREDENTIAL_REQUEST',
  'STOLEN_CARD_BEHAVIOR',
  'MISLEADING_LISTING',
  'OTHER'
);
create type public.report_status as enum ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete restrict,
  reviewer_id uuid not null references auth.users (id) on delete restrict,
  reviewed_user_id uuid not null references auth.users (id) on delete restrict,
  overall_score smallint not null,
  communication_score smallint not null,
  reliability_score smallint not null,
  accuracy_score smallint not null,
  review_text text,
  created_at timestamptz not null default now(),

  constraint ratings_no_self_review check (reviewer_id <> reviewed_user_id),
  constraint ratings_overall_range check (overall_score between 1 and 5),
  constraint ratings_communication_range check (communication_score between 1 and 5),
  constraint ratings_reliability_range check (reliability_score between 1 and 5),
  constraint ratings_accuracy_range check (accuracy_score between 1 and 5),
  constraint ratings_review_text_length check (
    review_text is null or char_length(review_text) between 1 and 500
  ),
  constraint ratings_one_per_reviewer_conversation unique (conversation_id, reviewer_id)
);

create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete restrict,
  reported_user_id uuid not null references auth.users (id) on delete restrict,
  conversation_id uuid references public.conversations (id) on delete set null,
  offer_listing_id uuid references public.offer_listings (id) on delete set null,
  reason public.report_reason not null,
  description text not null,
  status public.report_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,

  constraint reports_no_self_report check (reporter_id <> reported_user_id),
  constraint reports_context_required check (
    conversation_id is not null or offer_listing_id is not null
  ),
  constraint reports_description_length check (char_length(btrim(description)) between 10 and 1000),
  constraint reports_resolution_consistency check (
    (status in ('RESOLVED', 'DISMISSED') and resolved_at is not null and resolved_by is not null)
    or (status in ('OPEN', 'REVIEWING') and resolved_at is null and resolved_by is null)
  )
);

create table public.moderation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users (id) on delete restrict,
  report_id uuid not null references public.reports (id) on delete restrict,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  target_listing_id uuid references public.offer_listings (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint moderation_audit_action_length check (char_length(action) between 3 and 64)
);

create index ratings_reviewed_user_created_idx on public.ratings (reviewed_user_id, created_at desc);
create index user_blocks_blocked_user_idx on public.user_blocks (blocked_user_id);
create index reports_status_created_idx on public.reports (status, created_at);
create index reports_reported_user_idx on public.reports (reported_user_id, created_at desc);
create index moderation_audit_report_idx on public.moderation_audit_logs (report_id, created_at);

create or replace function public.current_user_can_moderate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('MODERATOR'::public.app_role, 'ADMIN'::public.app_role)
  );
$$;

create or replace function public.current_account_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_status = 'ACTIVE'::public.account_status
  );
$$;

create or replace function private.refresh_completed_interaction_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles profile
  set completed_interaction_count = (
    select count(*)::integer
    from public.conversations conversation
    where conversation.status = 'COMPLETED'::public.conversation_status
      and profile.id in (conversation.seller_user_id, conversation.buyer_user_id)
  )
  where profile.id in (new.seller_user_id, new.buyer_user_id);
  return new;
end;
$$;

create trigger conversations_refresh_completed_counts
after update of status on public.conversations
for each row
when (old.status is distinct from new.status)
execute function private.refresh_completed_interaction_counts();

create or replace function private.refresh_rating_aggregate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid := coalesce(new.reviewed_user_id, old.reviewed_user_id);
begin
  update public.profiles
  set
    rating_average = coalesce((
      select round(avg(overall_score)::numeric, 2)
      from public.ratings
      where reviewed_user_id = target_user_id
    ), 0),
    rating_count = (
      select count(*)::integer
      from public.ratings
      where reviewed_user_id = target_user_id
    )
  where id = target_user_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger ratings_refresh_profile_aggregate
after insert or update or delete on public.ratings
for each row execute function private.refresh_rating_aggregate();

create or replace function public.set_interaction_status(
  target_conversation_id uuid,
  target_status public.conversation_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_conversation public.conversations%rowtype;
begin
  if current_user_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;
  if target_status not in (
    'COMPLETED'::public.conversation_status,
    'NO_AGREEMENT'::public.conversation_status,
    'CLOSED'::public.conversation_status
  ) then
    raise exception using errcode = '22023', message = 'Invalid interaction status.';
  end if;

  select * into target_conversation
  from public.conversations
  where id = target_conversation_id
  for update;

  if not found or current_user_id not in (
    target_conversation.seller_user_id,
    target_conversation.buyer_user_id
  ) then
    raise exception using errcode = '42501', message = 'Conversation participant access required.';
  end if;
  if target_conversation.status = target_status then
    return;
  end if;
  if target_conversation.status <> 'ACTIVE'::public.conversation_status then
    raise exception using errcode = '22023', message = 'This interaction already has a final status.';
  end if;

  update public.conversations set status = target_status where id = target_conversation_id;
end;
$$;

create or replace function public.submit_rating(
  target_conversation_id uuid,
  submitted_overall_score smallint,
  submitted_communication_score smallint,
  submitted_reliability_score smallint,
  submitted_accuracy_score smallint,
  submitted_review_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_reviewer_id uuid := auth.uid();
  target_conversation public.conversations%rowtype;
  other_user_id uuid;
  new_rating_id uuid;
begin
  if current_reviewer_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;

  select * into target_conversation
  from public.conversations
  where id = target_conversation_id;

  if not found or current_reviewer_id not in (
    target_conversation.seller_user_id,
    target_conversation.buyer_user_id
  ) then
    raise exception using errcode = '42501', message = 'Conversation participant access required.';
  end if;
  if target_conversation.status <> 'COMPLETED'::public.conversation_status then
    raise exception using errcode = '22023', message = 'Only completed interactions can be rated.';
  end if;

  other_user_id := case
    when current_reviewer_id = target_conversation.seller_user_id then target_conversation.buyer_user_id
    else target_conversation.seller_user_id
  end;

  insert into public.ratings (
    conversation_id, reviewer_id, reviewed_user_id, overall_score,
    communication_score, reliability_score, accuracy_score, review_text
  ) values (
    target_conversation_id, current_reviewer_id, other_user_id, submitted_overall_score,
    submitted_communication_score, submitted_reliability_score, submitted_accuracy_score,
    nullif(btrim(submitted_review_text), '')
  )
  returning id into new_rating_id;

  return new_rating_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'You already rated this interaction.';
end;
$$;

create or replace function public.submit_report(
  target_reported_user_id uuid,
  target_conversation_id uuid,
  target_offer_listing_id uuid,
  submitted_reason public.report_reason,
  submitted_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_reporter_id uuid := auth.uid();
  target_conversation public.conversations%rowtype;
  target_listing public.offer_listings%rowtype;
  expected_reported_user_id uuid;
  new_report_id uuid;
begin
  if current_reporter_id is null or not public.current_account_is_active() then
    raise exception using errcode = '42501', message = 'An active account is required.';
  end if;
  if current_reporter_id = target_reported_user_id then
    raise exception using errcode = '22023', message = 'You cannot report yourself.';
  end if;
  if target_conversation_id is null and target_offer_listing_id is null then
    raise exception using errcode = '22023', message = 'A conversation or listing is required.';
  end if;
  if (
    select count(*) from public.reports
    where reporter_id = current_reporter_id and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception using errcode = '22023', message = 'Report limit reached. Please try again later.';
  end if;

  if target_conversation_id is not null then
    select * into target_conversation
    from public.conversations where id = target_conversation_id;
    if not found then
      raise exception using errcode = '42501', message = 'Invalid conversation report context.';
    end if;
    if current_reporter_id not in (
      target_conversation.seller_user_id,
      target_conversation.buyer_user_id
    ) then
      raise exception using errcode = '42501', message = 'Invalid conversation report context.';
    end if;
    expected_reported_user_id := case
      when current_reporter_id = target_conversation.seller_user_id then target_conversation.buyer_user_id
      else target_conversation.seller_user_id
    end;
    if target_reported_user_id <> expected_reported_user_id then
      raise exception using errcode = '42501', message = 'Invalid conversation report context.';
    end if;
    if target_offer_listing_id is not null
      and target_offer_listing_id <> target_conversation.listing_id then
      raise exception using errcode = '22023', message = 'Report contexts do not match.';
    end if;
  end if;

  if target_offer_listing_id is not null then
    select * into target_listing
    from public.offer_listings where id = target_offer_listing_id;
    if not found then
      raise exception using errcode = '42501', message = 'Invalid listing report context.';
    end if;
    if target_listing.user_id <> target_reported_user_id then
      raise exception using errcode = '42501', message = 'Invalid listing report context.';
    end if;
  end if;

  if exists (
    select 1 from public.reports
    where reporter_id = current_reporter_id
      and reported_user_id = target_reported_user_id
      and conversation_id is not distinct from target_conversation_id
      and offer_listing_id is not distinct from target_offer_listing_id
      and reason = submitted_reason
      and status in ('OPEN'::public.report_status, 'REVIEWING'::public.report_status)
  ) then
    raise exception using errcode = '23505', message = 'You already submitted this report.';
  end if;

  insert into public.reports (
    reporter_id, reported_user_id, conversation_id, offer_listing_id, reason, description
  ) values (
    current_reporter_id, target_reported_user_id, target_conversation_id,
    target_offer_listing_id, submitted_reason, btrim(submitted_description)
  ) returning id into new_report_id;
  return new_report_id;
end;
$$;

create or replace function public.moderate_report(
  target_report_id uuid,
  target_status public.report_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_moderator_id uuid := auth.uid();
begin
  if current_moderator_id is null or not public.current_user_can_moderate() then
    raise exception using errcode = '42501', message = 'Moderator access required.';
  end if;
  if target_status not in (
    'REVIEWING'::public.report_status,
    'RESOLVED'::public.report_status,
    'DISMISSED'::public.report_status
  ) then
    raise exception using errcode = '22023', message = 'Invalid moderation status.';
  end if;

  update public.reports
  set
    status = target_status,
    resolved_at = case when target_status in ('RESOLVED', 'DISMISSED') then now() else null end,
    resolved_by = case when target_status in ('RESOLVED', 'DISMISSED') then current_moderator_id else null end
  where id = target_report_id;
  if not found then raise exception using errcode = 'P0002', message = 'Report not found.'; end if;

  insert into public.moderation_audit_logs (moderator_id, report_id, action)
  values (current_moderator_id, target_report_id, 'REPORT_' || target_status::text);
end;
$$;

create or replace function public.suspend_reported_user(target_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_moderator_id uuid := auth.uid();
  target_report public.reports%rowtype;
begin
  if current_moderator_id is null or not public.current_user_can_moderate() then
    raise exception using errcode = '42501', message = 'Moderator access required.';
  end if;
  select * into target_report from public.reports where id = target_report_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Report not found.'; end if;
  if target_report.reported_user_id = current_moderator_id then
    raise exception using errcode = '22023', message = 'Moderators cannot suspend themselves.';
  end if;

  update public.profiles
  set account_status = 'SUSPENDED'::public.account_status
  where id = target_report.reported_user_id;
  update public.offer_listings
  set listing_status = 'REMOVED'::public.offer_listing_status
  where user_id = target_report.reported_user_id
    and listing_status <> 'REMOVED'::public.offer_listing_status;
  update public.reports set status = 'REVIEWING'::public.report_status,
    resolved_at = null, resolved_by = null where id = target_report_id;
  insert into public.moderation_audit_logs (
    moderator_id, report_id, action, target_user_id
  ) values (
    current_moderator_id, target_report_id, 'USER_SUSPENDED', target_report.reported_user_id
  );
end;
$$;

create or replace function public.remove_reported_listing(target_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_moderator_id uuid := auth.uid();
  target_report public.reports%rowtype;
begin
  if current_moderator_id is null or not public.current_user_can_moderate() then
    raise exception using errcode = '42501', message = 'Moderator access required.';
  end if;
  select * into target_report from public.reports where id = target_report_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Report not found.'; end if;
  if target_report.offer_listing_id is null then
    raise exception using errcode = '22023', message = 'This report has no listing.';
  end if;

  update public.offer_listings
  set listing_status = 'REMOVED'::public.offer_listing_status
  where id = target_report.offer_listing_id;
  update public.reports set status = 'REVIEWING'::public.report_status,
    resolved_at = null, resolved_by = null where id = target_report_id;
  insert into public.moderation_audit_logs (
    moderator_id, report_id, action, target_listing_id
  ) values (
    current_moderator_id, target_report_id, 'LISTING_REMOVED', target_report.offer_listing_id
  );
end;
$$;

-- Prevent blocked or suspended accounts from starting and continuing interactions.
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
    if exists (
      select 1
      from public.conversations conversation
      join public.user_blocks block on
        (block.blocker_id = conversation.seller_user_id and block.blocked_user_id = conversation.buyer_user_id)
        or (block.blocker_id = conversation.buyer_user_id and block.blocked_user_id = conversation.seller_user_id)
      where conversation.id = existing_conversation_id
        and conversation.unlock_status = 'LOCKED'::public.conversation_unlock_status
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

drop policy "Participants send unlocked messages" on public.messages;
create policy "Unblocked active participants send messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and moderation_status = 'ALLOWED'::public.message_moderation_status
  and read_at is null
  and (select public.current_account_is_active())
  and exists (
    select 1 from public.conversations conversation
    where conversation.id = conversation_id
      and conversation.status = 'ACTIVE'::public.conversation_status
      and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id)
      and not exists (
        select 1 from public.user_blocks block
        where (block.blocker_id = conversation.seller_user_id and block.blocked_user_id = conversation.buyer_user_id)
           or (block.blocker_id = conversation.buyer_user_id and block.blocked_user_id = conversation.seller_user_id)
      )
  )
);

alter table public.ratings enable row level security;
alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_audit_logs enable row level security;

revoke all on table public.ratings, public.user_blocks, public.reports, public.moderation_audit_logs
  from public, anon, authenticated;
grant select on table public.ratings to authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;
grant select on table public.reports, public.moderation_audit_logs to authenticated;
grant all on table public.ratings, public.user_blocks, public.reports, public.moderation_audit_logs to service_role;

create policy "Participants read conversation ratings"
on public.ratings for select to authenticated
using (exists (
  select 1 from public.conversations conversation
  where conversation.id = conversation_id
    and (select auth.uid()) in (conversation.seller_user_id, conversation.buyer_user_id)
));

create policy "Users read their own blocks"
on public.user_blocks for select to authenticated
using (blocker_id = (select auth.uid()));
create policy "Active users create their own blocks"
on public.user_blocks for insert to authenticated
with check (blocker_id = (select auth.uid()) and (select public.current_account_is_active()));
create policy "Users remove their own blocks"
on public.user_blocks for delete to authenticated
using (blocker_id = (select auth.uid()));

create policy "Moderators read reports"
on public.reports for select to authenticated
using ((select public.current_user_can_moderate()));
create policy "Moderators read audit logs"
on public.moderation_audit_logs for select to authenticated
using ((select public.current_user_can_moderate()));

create view public.public_reviews
with (security_invoker = false, security_barrier = true)
as
select
  rating.id,
  rating.reviewed_user_id,
  rating.overall_score,
  rating.review_text,
  reviewer.username as reviewer_username,
  rating.created_at
from public.ratings rating
join public.profiles reviewer on reviewer.id = rating.reviewer_id
join public.profiles reviewed on reviewed.id = rating.reviewed_user_id
where reviewer.onboarding_completed
  and reviewer.account_status = 'ACTIVE'::public.account_status
  and reviewed.onboarding_completed
  and reviewed.account_status = 'ACTIVE'::public.account_status;

create view public.moderation_report_queue
with (security_invoker = false, security_barrier = true)
as
select
  report.id,
  report.reported_user_id,
  report.conversation_id,
  report.offer_listing_id,
  report.reason,
  report.description,
  report.status,
  report.created_at,
  reporter.username as reporter_username,
  reported.username as reported_username,
  reported.account_status as reported_account_status,
  conversation.merchant_name as conversation_merchant_name,
  conversation.offer_title as conversation_offer_title,
  merchant.name as listing_merchant_name,
  offer.title as listing_offer_title
from public.reports report
join public.profiles reporter on reporter.id = report.reporter_id
join public.profiles reported on reported.id = report.reported_user_id
left join public.conversations conversation on conversation.id = report.conversation_id
left join public.offer_listings listing on listing.id = report.offer_listing_id
left join public.offers offer on offer.id = listing.offer_id
left join public.merchants merchant on merchant.id = offer.merchant_id
where public.current_user_can_moderate();

drop view public.marketplace_listings;
create view public.marketplace_listings
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

revoke all on table public.public_reviews, public.moderation_report_queue, public.marketplace_listings
  from public, anon, authenticated;
grant select on table public.public_reviews, public.marketplace_listings to authenticated, service_role;
grant select on table public.moderation_report_queue to authenticated, service_role;

revoke all on function public.current_user_can_moderate(), public.current_account_is_active() from public, anon;
grant execute on function public.current_user_can_moderate(), public.current_account_is_active() to authenticated, service_role;
revoke all on function public.set_interaction_status(uuid, public.conversation_status) from public, anon;
grant execute on function public.set_interaction_status(uuid, public.conversation_status) to authenticated, service_role;
revoke all on function public.submit_rating(uuid, smallint, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.submit_rating(uuid, smallint, smallint, smallint, smallint, text) to authenticated, service_role;
revoke all on function public.submit_report(uuid, uuid, uuid, public.report_reason, text) from public, anon;
grant execute on function public.submit_report(uuid, uuid, uuid, public.report_reason, text) to authenticated, service_role;
revoke all on function public.moderate_report(uuid, public.report_status), public.suspend_reported_user(uuid), public.remove_reported_listing(uuid) from public, anon;
grant execute on function public.moderate_report(uuid, public.report_status), public.suspend_reported_user(uuid), public.remove_reported_listing(uuid) to authenticated, service_role;
revoke execute on function private.refresh_completed_interaction_counts(), private.refresh_rating_aggregate() from public, anon, authenticated;

comment on view public.public_reviews is
  'Pseudonymous review DTO. Conversation identifiers and private participant data are intentionally excluded.';
comment on table public.reports is
  'Private trust and safety reports. Reporters have no direct read or status-update access.';
comment on view public.moderation_report_queue is
  'Role-gated, field-whitelisted report context for moderators and administrators.';
