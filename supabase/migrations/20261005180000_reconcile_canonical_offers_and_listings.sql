-- Reconcile the original user-owned offer model into:
--   merchants -> credit card offers -> user/card offer listings.
-- Historical listing UUIDs and evidence object paths are retained.

create type public.canonical_offer_status as enum ('ACTIVE', 'INACTIVE', 'EXPIRED');

drop policy if exists "Owners upload evidence objects to owned editable offers" on storage.objects;
drop policy if exists "Owners read registered evidence objects" on storage.objects;
drop policy if exists "Owners delete evidence objects from editable offers" on storage.objects;

drop function if exists public.submit_offer_for_verification(uuid);

alter table public.offer_verifications
  drop constraint offer_verifications_owned_offer_fk,
  drop constraint offer_verifications_opaque_path;

alter table public.offers rename to legacy_offer_listings;
alter table public.offer_verifications rename to offer_listing_verifications;
alter table public.offer_listing_verifications rename column offer_id to offer_listing_id;
alter trigger offer_verifications_set_updated_at on public.offer_listing_verifications
  rename to offer_listing_verifications_set_updated_at;

drop policy "Owners read their evidence records" on public.offer_listing_verifications;
drop policy "Owners create evidence for editable owned offers" on public.offer_listing_verifications;
drop policy "Owners replace evidence for editable owned offers" on public.offer_listing_verifications;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete restrict,
  title text not null,
  description text not null default '',
  required_spend numeric(12, 2) not null,
  reward_amount numeric(12, 2) not null,
  reward_type public.offer_reward_type not null,
  expiration_date date not null,
  status public.canonical_offer_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint canonical_offers_title_length check (char_length(btrim(title)) between 5 and 140),
  constraint canonical_offers_description_length check (char_length(description) <= 1200),
  constraint canonical_offers_spend_nonnegative check (required_spend >= 0),
  constraint canonical_offers_reward_nonnegative check (reward_amount >= 0)
);

-- Exact matches become one shared catalog entry. We intentionally avoid fuzzy
-- matching financial terms during a schema migration.
insert into public.offers (
  merchant_id,
  title,
  description,
  required_spend,
  reward_amount,
  reward_type,
  expiration_date,
  status,
  created_at,
  updated_at
)
select
  merchant_id,
  min(title),
  min(description),
  spend_requirement,
  reward_amount,
  reward_type,
  expiration_date,
  case
    when expiration_date < current_date then 'EXPIRED'::public.canonical_offer_status
    else 'ACTIVE'::public.canonical_offer_status
  end,
  min(created_at),
  max(updated_at)
from public.legacy_offer_listings
group by
  merchant_id,
  lower(btrim(title)),
  spend_requirement,
  reward_amount,
  reward_type,
  expiration_date;

create table public.offer_listings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null,
  min_spend numeric(12, 2) not null,
  ask_amount numeric(12, 2),
  is_obo boolean not null default false,
  verification_status public.offer_verification_status not null default 'DRAFT',
  verification_timestamp timestamptz,
  listing_status public.offer_listing_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offer_listings_owner_card_fk
    foreign key (user_id, card_id)
    references public.credit_card_profiles (user_id, id)
    on delete restrict,
  constraint offer_listings_min_spend_nonnegative check (min_spend >= 0),
  constraint offer_listings_ask_nonnegative check (ask_amount is null or ask_amount >= 0),
  constraint offer_listings_verification_timestamp_consistency
    check (
      (verification_status = 'VERIFIED' and verification_timestamp is not null)
      or (verification_status <> 'VERIFIED' and verification_timestamp is null)
    ),
  constraint offer_listings_active_requires_verification
    check (listing_status <> 'ACTIVE' or verification_status = 'VERIFIED'),
  unique (user_id, id, card_id)
);

insert into public.offer_listings (
  id,
  offer_id,
  user_id,
  card_id,
  min_spend,
  ask_amount,
  is_obo,
  verification_status,
  verification_timestamp,
  listing_status,
  created_at,
  updated_at
)
select
  legacy.id,
  canonical.id,
  legacy.user_id,
  legacy.card_id,
  legacy.spend_requirement,
  null,
  false,
  legacy.verification_status,
  legacy.verification_timestamp,
  legacy.listing_status,
  legacy.created_at,
  legacy.updated_at
from public.legacy_offer_listings legacy
join public.offers canonical
  on canonical.merchant_id = legacy.merchant_id
  and lower(btrim(canonical.title)) = lower(btrim(legacy.title))
  and canonical.required_spend = legacy.spend_requirement
  and canonical.reward_amount = legacy.reward_amount
  and canonical.reward_type = legacy.reward_type
  and canonical.expiration_date = legacy.expiration_date;

alter table public.offer_listing_verifications
  add constraint offer_listing_verifications_owned_listing_fk
    foreign key (user_id, offer_listing_id, card_id)
    references public.offer_listings (user_id, id, card_id)
    on delete cascade,
  add constraint offer_listing_verifications_opaque_path
    check (
      evidence_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$'
      and split_part(evidence_path, '/', 1) = user_id::text
      and split_part(evidence_path, '/', 2) = offer_listing_id::text
    );

alter table public.offer_listing_verifications
  rename constraint offer_verifications_one_per_offer to offer_listing_verifications_one_per_listing;
alter table public.offer_listing_verifications
  rename constraint offer_verifications_path_unique to offer_listing_verifications_path_unique;
alter table public.offer_listing_verifications
  rename constraint offer_verifications_pkey to offer_listing_verifications_pkey;
alter index public.offer_verifications_owner_idx rename to offer_listing_verifications_owner_idx;

drop table public.legacy_offer_listings;
drop function private.enforce_offer_update_boundary();

create index canonical_offers_merchant_idx on public.offers (merchant_id);
create index canonical_offers_expiration_idx on public.offers (expiration_date);
create index canonical_offers_status_created_idx on public.offers (status, created_at desc);
create unique index canonical_offers_exact_match_unique on public.offers (
  merchant_id,
  lower(btrim(title)),
  required_spend,
  reward_amount,
  reward_type,
  expiration_date
);
create index offer_listings_owner_created_idx on public.offer_listings (user_id, created_at desc);
create index offer_listings_card_created_idx on public.offer_listings (card_id, created_at desc);
create index offer_listings_offer_created_idx on public.offer_listings (offer_id, created_at desc);
create index offer_listings_marketplace_status_idx
  on public.offer_listings (listing_status, verification_status, created_at desc);
create index offer_listings_ask_idx on public.offer_listings (ask_amount);
create index offer_listings_min_spend_idx on public.offer_listings (min_spend);

create trigger offers_set_updated_at
before update on public.offers
for each row execute function private.set_updated_at();

create trigger offer_listings_set_updated_at
before update on public.offer_listings
for each row execute function private.set_updated_at();

create or replace function private.enforce_offer_listing_update_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.verification_status is distinct from old.verification_status
    or new.verification_timestamp is distinct from old.verification_timestamp
    or new.listing_status is distinct from old.listing_status
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '42501', message = 'Protected listing fields cannot be updated.';
  end if;
  if current_user = 'authenticated'
    and new.offer_id is distinct from old.offer_id
    and exists (
      select 1
      from public.offer_listing_verifications evidence
      where evidence.offer_listing_id = old.id
    )
  then
    raise exception using errcode = '42501', message = 'The credit card offer cannot change after evidence is attached.';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_listing_evidence_update_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.offer_listing_id is distinct from old.offer_listing_id
    or new.card_id is distinct from old.card_id
    or new.status is distinct from old.status
    or new.reviewer_id is distinct from old.reviewer_id
    or new.extracted_merchant is distinct from old.extracted_merchant
    or new.extracted_spend_requirement is distinct from old.extracted_spend_requirement
    or new.extracted_reward is distinct from old.extracted_reward
    or new.extracted_expiration is distinct from old.extracted_expiration
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '42501', message = 'Protected evidence fields cannot be updated.';
  end if;
  return new;
end;
$$;

revoke execute on function private.enforce_offer_listing_update_boundary() from public, anon, authenticated;
revoke execute on function private.enforce_listing_evidence_update_boundary() from public, anon, authenticated;

create trigger offer_listings_enforce_update_boundary
before update on public.offer_listings
for each row execute function private.enforce_offer_listing_update_boundary();

drop trigger offer_verifications_enforce_update_boundary on public.offer_listing_verifications;
drop function private.enforce_evidence_update_boundary();
create trigger offer_listing_verifications_enforce_update_boundary
before update on public.offer_listing_verifications
for each row execute function private.enforce_listing_evidence_update_boundary();

alter table public.offers enable row level security;
alter table public.offer_listings enable row level security;

revoke all on table public.offers from public, anon, authenticated;
revoke all on table public.offer_listings from public, anon, authenticated;
revoke all on table public.offer_listing_verifications from public, anon, authenticated;

grant select on table public.offers to authenticated;
grant select on table public.offer_listings to authenticated;
grant insert (id, offer_id, user_id, card_id, min_spend, ask_amount, is_obo)
  on table public.offer_listings to authenticated;
grant update (offer_id, card_id, min_spend, ask_amount, is_obo)
  on table public.offer_listings to authenticated;
grant select on table public.offer_listing_verifications to authenticated;
grant insert (user_id, offer_listing_id, card_id, evidence_path)
  on table public.offer_listing_verifications to authenticated;
grant update (evidence_path) on table public.offer_listing_verifications to authenticated;

grant all on table public.offers to service_role;
grant all on table public.offer_listings to service_role;
grant all on table public.offer_listing_verifications to service_role;

create policy "Authenticated users read credit card offers"
on public.offers for select to authenticated
using (true);

create policy "Owners read their offer listings"
on public.offer_listings for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners create draft listings for owned active cards"
on public.offer_listings for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and ask_amount is not null
  and verification_status = 'DRAFT'::public.offer_verification_status
  and listing_status = 'DRAFT'::public.offer_listing_status
  and verification_timestamp is null
  and exists (
    select 1 from public.credit_card_profiles card
    where card.id = card_id
      and card.user_id = (select auth.uid())
      and card.status = 'ACTIVE'::public.card_profile_status
  )
  and exists (
    select 1 from public.offers canonical
    join public.merchants merchant on merchant.id = canonical.merchant_id
    where canonical.id = offer_id
      and canonical.status = 'ACTIVE'::public.canonical_offer_status
      and canonical.expiration_date >= current_date
      and merchant.status = 'ACTIVE'::public.merchant_status
  )
);

create policy "Owners update editable offer listings"
on public.offer_listings for update to authenticated
using (
  (select auth.uid()) = user_id
  and verification_status in (
    'DRAFT'::public.offer_verification_status,
    'NEEDS_REVIEW'::public.offer_verification_status
  )
)
with check (
  (select auth.uid()) = user_id
  and ask_amount is not null
  and verification_status in (
    'DRAFT'::public.offer_verification_status,
    'NEEDS_REVIEW'::public.offer_verification_status
  )
  and exists (
    select 1 from public.credit_card_profiles card
    where card.id = card_id
      and card.user_id = (select auth.uid())
      and card.status = 'ACTIVE'::public.card_profile_status
  )
  and exists (
    select 1 from public.offers canonical
    join public.merchants merchant on merchant.id = canonical.merchant_id
    where canonical.id = offer_id
      and canonical.status = 'ACTIVE'::public.canonical_offer_status
      and canonical.expiration_date >= current_date
      and merchant.status = 'ACTIVE'::public.merchant_status
  )
);

create policy "Owners read their listing evidence records"
on public.offer_listing_verifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners create evidence for editable owned listings"
on public.offer_listing_verifications for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'PENDING'::public.evidence_verification_status
  and reviewer_id is null
  and exists (
    select 1 from public.offer_listings listing
    where listing.id = offer_listing_id
      and listing.card_id = card_id
      and listing.user_id = (select auth.uid())
      and listing.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
);

create policy "Owners replace evidence for editable owned listings"
on public.offer_listing_verifications for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.offer_listings listing
    where listing.id = offer_listing_id
      and listing.user_id = (select auth.uid())
      and listing.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
)
with check ((select auth.uid()) = user_id);

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
    select 1 from public.offer_listing_verifications evidence
    join storage.objects object
      on object.bucket_id = 'offer-verification-evidence'
      and object.name = evidence.evidence_path
    where evidence.offer_listing_id = target_listing_id
      and evidence.user_id = current_user_id
  ) then
    raise exception using errcode = '22023', message = 'Uploaded verification evidence is required.';
  end if;

  update public.offer_listing_verifications
  set status = 'PENDING'::public.evidence_verification_status
  where offer_listing_id = target_listing_id and user_id = current_user_id;

  update public.offer_listings
  set
    verification_status = 'PENDING'::public.offer_verification_status,
    verification_timestamp = null,
    listing_status = 'PENDING_VERIFICATION'::public.offer_listing_status
  where id = target_listing_id and user_id = current_user_id;
end;
$$;

revoke all on function public.submit_offer_listing_for_verification(uuid) from public, anon;
grant execute on function public.submit_offer_listing_for_verification(uuid) to authenticated, service_role;

create policy "Owners upload evidence objects to owned editable listings"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'offer-verification-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$'
  and exists (
    select 1 from public.offer_listings listing
    where listing.id::text = (storage.foldername(name))[2]
      and listing.user_id = (select auth.uid())
      and listing.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
);

create policy "Owners read registered listing evidence objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'offer-verification-evidence'
  and exists (
    select 1 from public.offer_listing_verifications evidence
    where evidence.evidence_path = name
      and evidence.user_id = (select auth.uid())
  )
);

create policy "Owners delete evidence objects from editable listings"
on storage.objects for delete to authenticated
using (
  bucket_id = 'offer-verification-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.offer_listings listing
    where listing.id::text = (storage.foldername(name))[2]
      and listing.user_id = (select auth.uid())
      and listing.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
);

comment on table public.offers is
  'Shared canonical merchant promotion definitions. Normal users have read-only access.';
comment on table public.offer_listings is
  'Owner-private cardholder listings referencing credit card offers; marketplace terms and verification live here.';
comment on table public.offer_listing_verifications is
  'Private evidence for a specific user/card offer listing. Never expose in marketplace DTOs.';
