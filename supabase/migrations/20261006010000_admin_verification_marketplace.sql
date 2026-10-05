-- Admin review workflow and the sanitized buyer marketplace read model.

create type public.app_role as enum ('USER', 'MODERATOR', 'ADMIN');
create type public.listing_review_decision as enum ('APPROVE', 'REJECT', 'NEEDS_REVIEW');

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_roles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function private.set_updated_at();

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'ADMIN'::public.app_role
  );
$$;

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from public, anon, authenticated;
grant select (user_id, role) on public.user_roles to authenticated;
grant all on table public.user_roles to service_role;

create policy "Users read their own role"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins read role assignments"
on public.user_roles for select to authenticated
using ((select public.current_user_is_admin()));

alter table public.offer_listings
  add column reviewer_id uuid references auth.users (id) on delete set null;

-- Earlier phases had no reviewer identity. Do not publish unverifiable legacy approvals.
update public.offer_listing_verifications evidence
set status = 'NEEDS_REVIEW'::public.evidence_verification_status
from public.offer_listings listing
where evidence.offer_listing_id = listing.id
  and listing.verification_status = 'VERIFIED'::public.offer_verification_status;

update public.offer_listings
set
  verification_status = 'NEEDS_REVIEW'::public.offer_verification_status,
  verification_timestamp = null,
  listing_status = 'PAUSED'::public.offer_listing_status
where verification_status = 'VERIFIED'::public.offer_verification_status;

alter table public.offer_listings
  drop constraint offer_listings_verification_timestamp_consistency;

alter table public.offer_listings
  add constraint offer_listings_verification_timestamp_consistency
  check (
    (verification_status = 'VERIFIED' and verification_timestamp is not null and reviewer_id is not null)
    or (verification_status <> 'VERIFIED' and verification_timestamp is null)
  );

create policy "Admins read listings for verification"
on public.offer_listings for select to authenticated
using ((select public.current_user_is_admin()));

create policy "Admins read listing evidence metadata"
on public.offer_listing_verifications for select to authenticated
using ((select public.current_user_is_admin()));

create policy "Admins read profiles for verification"
on public.profiles for select to authenticated
using ((select public.current_user_is_admin()));

create policy "Admins read all merchants for verification"
on public.merchants for select to authenticated
using ((select public.current_user_is_admin()));

create policy "Admins read private verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'offer-verification-evidence'
  and (select public.current_user_is_admin())
  and exists (
    select 1
    from public.offer_listing_verifications evidence
    where evidence.evidence_path = name
  )
);

create or replace function public.review_offer_listing(
  target_listing_id uuid,
  review_decision public.listing_review_decision
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_reviewer_id uuid := auth.uid();
  target_listing public.offer_listings%rowtype;
begin
  if current_reviewer_id is null or not public.current_user_is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required.';
  end if;

  if review_decision is null then
    raise exception using errcode = '22023', message = 'A review decision is required.';
  end if;

  select * into target_listing
  from public.offer_listings
  where id = target_listing_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Listing not found.';
  end if;

  if target_listing.verification_status <> 'PENDING'::public.offer_verification_status
    or target_listing.listing_status <> 'PENDING_VERIFICATION'::public.offer_listing_status
  then
    raise exception using errcode = '22023', message = 'Only pending listings can be reviewed.';
  end if;

  if not exists (
    select 1
    from public.offer_listing_verifications evidence
    join storage.objects object
      on object.bucket_id = 'offer-verification-evidence'
      and object.name = evidence.evidence_path
    where evidence.offer_listing_id = target_listing_id
  ) then
    raise exception using errcode = '22023', message = 'Uploaded verification evidence is required.';
  end if;

  if review_decision = 'APPROVE'::public.listing_review_decision then
    if not exists (
      select 1
      from public.offers offer
      join public.merchants merchant on merchant.id = offer.merchant_id
      where offer.id = target_listing.offer_id
        and offer.status = 'ACTIVE'::public.canonical_offer_status
        and offer.expiration_date >= current_date
        and merchant.status = 'ACTIVE'::public.merchant_status
    ) then
      raise exception using errcode = '22023', message = 'Expired or inactive offers cannot be approved.';
    end if;

    update public.offer_listings
    set
      verification_status = 'VERIFIED'::public.offer_verification_status,
      listing_status = 'ACTIVE'::public.offer_listing_status,
      verification_timestamp = now(),
      reviewer_id = current_reviewer_id
    where id = target_listing_id;

    update public.offer_listing_verifications
    set
      status = 'VERIFIED'::public.evidence_verification_status,
      reviewer_id = current_reviewer_id
    where offer_listing_id = target_listing_id;
  elsif review_decision = 'REJECT'::public.listing_review_decision then
    update public.offer_listings
    set
      verification_status = 'REJECTED'::public.offer_verification_status,
      listing_status = 'PAUSED'::public.offer_listing_status,
      verification_timestamp = null,
      reviewer_id = current_reviewer_id
    where id = target_listing_id;

    update public.offer_listing_verifications
    set
      status = 'REJECTED'::public.evidence_verification_status,
      reviewer_id = current_reviewer_id
    where offer_listing_id = target_listing_id;
  else
    update public.offer_listings
    set
      verification_status = 'NEEDS_REVIEW'::public.offer_verification_status,
      listing_status = 'PAUSED'::public.offer_listing_status,
      verification_timestamp = null,
      reviewer_id = current_reviewer_id
    where id = target_listing_id;

    update public.offer_listing_verifications
    set
      status = 'NEEDS_REVIEW'::public.evidence_verification_status,
      reviewer_id = current_reviewer_id
    where offer_listing_id = target_listing_id;
  end if;
end;
$$;

revoke all on function public.review_offer_listing(uuid, public.listing_review_decision)
  from public, anon;
grant execute on function public.review_offer_listing(uuid, public.listing_review_decision)
  to authenticated, service_role;

-- Resubmission clears the prior reviewer while returning the listing and evidence to pending.
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
    select 1
    from public.offer_listing_verifications evidence
    join storage.objects object
      on object.bucket_id = 'offer-verification-evidence'
      and object.name = evidence.evidence_path
    where evidence.offer_listing_id = target_listing_id
      and evidence.user_id = current_user_id
  ) then
    raise exception using errcode = '22023', message = 'Uploaded verification evidence is required.';
  end if;

  update public.offer_listing_verifications
  set
    status = 'PENDING'::public.evidence_verification_status,
    reviewer_id = null
  where offer_listing_id = target_listing_id and user_id = current_user_id;

  update public.offer_listings
  set
    verification_status = 'PENDING'::public.offer_verification_status,
    verification_timestamp = null,
    listing_status = 'PENDING_VERIFICATION'::public.offer_listing_status,
    reviewer_id = null
  where id = target_listing_id and user_id = current_user_id;
end;
$$;

create view public.marketplace_listings
with (
  security_invoker = false,
  security_barrier = true
)
as
select
  listing.id as listing_id,
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

revoke all on table public.marketplace_listings from public, anon, authenticated;
grant select on table public.marketplace_listings to authenticated, service_role;

create index offers_marketplace_filter_idx
  on public.offers (merchant_id, status, expiration_date, reward_amount);
create index offer_listings_marketplace_terms_idx
  on public.offer_listings (
    listing_status,
    verification_status,
    ask_amount,
    min_spend,
    created_at desc
  );
create index profiles_marketplace_rating_idx
  on public.profiles (account_status, onboarding_completed, rating_average desc);

comment on table public.user_roles is
  'Private authorization assignments. Roles are never part of marketplace profile DTOs.';
comment on view public.marketplace_listings is
  'Field-whitelisted authenticated marketplace DTO. Excludes card, evidence, auth, contact, and risk data.';
