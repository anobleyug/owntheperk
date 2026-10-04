-- Phase 3: private card profiles, merchant catalog, private offer management,
-- and private verification evidence. No marketplace offer read surface is exposed.

create type public.card_profile_status as enum ('ACTIVE', 'INACTIVE', 'REMOVED');
create type public.merchant_status as enum ('ACTIVE', 'INACTIVE');
create type public.offer_reward_type as enum (
  'STATEMENT_CREDIT',
  'CASH_BACK',
  'PERCENT_BACK',
  'POINTS',
  'OTHER'
);
create type public.offer_verification_status as enum (
  'DRAFT',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'NEEDS_REVIEW',
  'EXPIRED'
);
create type public.offer_listing_status as enum (
  'DRAFT',
  'PENDING_VERIFICATION',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'REMOVED'
);
create type public.evidence_verification_status as enum (
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'NEEDS_REVIEW'
);

create table public.credit_card_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  issuer text not null,
  nickname text not null,
  card_type_optional text,
  last4_optional text,
  status public.card_profile_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint credit_card_profiles_issuer_length
    check (char_length(btrim(issuer)) between 2 and 64),
  constraint credit_card_profiles_nickname_length
    check (char_length(btrim(nickname)) between 2 and 64),
  constraint credit_card_profiles_card_type_length
    check (card_type_optional is null or char_length(btrim(card_type_optional)) between 2 and 64),
  constraint credit_card_profiles_last4_format
    check (last4_optional is null or last4_optional ~ '^[0-9]{4}$'),
  unique (user_id, id)
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  category text,
  status public.merchant_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint merchants_name_length check (char_length(btrim(name)) between 2 and 100),
  constraint merchants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint merchants_logo_url_format
    check (logo_url is null or (char_length(logo_url) <= 2048 and logo_url ~ '^https://[^[:space:]]+$')),
  constraint merchants_category_length
    check (category is null or char_length(btrim(category)) between 2 and 80),
  constraint merchants_slug_unique unique (slug)
);

create unique index merchants_name_case_insensitive_unique on public.merchants (lower(name));
create index merchants_active_name_idx on public.merchants (status, name);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null,
  merchant_id uuid not null references public.merchants (id) on delete restrict,
  title text not null,
  description text not null default '',
  spend_requirement numeric(12, 2) not null,
  reward_amount numeric(12, 2) not null,
  reward_type public.offer_reward_type not null,
  expiration_date date not null,
  verification_status public.offer_verification_status not null default 'DRAFT',
  verification_timestamp timestamptz,
  listing_status public.offer_listing_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offers_owner_card_fk
    foreign key (user_id, card_id)
    references public.credit_card_profiles (user_id, id)
    on delete restrict,
  constraint offers_title_length check (char_length(btrim(title)) between 5 and 140),
  constraint offers_description_length check (char_length(description) <= 1200),
  constraint offers_spend_nonnegative check (spend_requirement >= 0),
  constraint offers_reward_nonnegative check (reward_amount >= 0),
  constraint offers_verification_timestamp_consistency
    check (
      (verification_status = 'VERIFIED' and verification_timestamp is not null)
      or (verification_status <> 'VERIFIED' and verification_timestamp is null)
    ),
  constraint offers_active_requires_verification
    check (listing_status <> 'ACTIVE' or verification_status = 'VERIFIED'),
  unique (user_id, id, card_id)
);

create index offers_owner_created_idx on public.offers (user_id, created_at desc);
create index offers_owner_status_idx
  on public.offers (user_id, verification_status, listing_status);
create index offers_card_idx on public.offers (card_id, created_at desc);
create index offers_merchant_idx on public.offers (merchant_id);
create index offers_expiration_idx on public.offers (expiration_date);

create table public.offer_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_id uuid not null,
  card_id uuid not null,
  evidence_path text not null,
  status public.evidence_verification_status not null default 'PENDING',
  reviewer_id uuid references auth.users (id) on delete set null,
  extracted_merchant text,
  extracted_spend_requirement numeric(12, 2),
  extracted_reward numeric(12, 2),
  extracted_expiration date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offer_verifications_owned_offer_fk
    foreign key (user_id, offer_id, card_id)
    references public.offers (user_id, id, card_id)
    on delete cascade,
  constraint offer_verifications_one_per_offer unique (offer_id),
  constraint offer_verifications_path_unique unique (evidence_path),
  constraint offer_verifications_opaque_path
    check (
      evidence_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$'
      and split_part(evidence_path, '/', 1) = user_id::text
      and split_part(evidence_path, '/', 2) = offer_id::text
    ),
  constraint offer_verifications_extracted_spend_nonnegative
    check (extracted_spend_requirement is null or extracted_spend_requirement >= 0),
  constraint offer_verifications_extracted_reward_nonnegative
    check (extracted_reward is null or extracted_reward >= 0)
);

create index offer_verifications_owner_idx on public.offer_verifications (user_id, created_at desc);

create trigger credit_card_profiles_set_updated_at
before update on public.credit_card_profiles
for each row execute function private.set_updated_at();

create trigger merchants_set_updated_at
before update on public.merchants
for each row execute function private.set_updated_at();

create trigger offers_set_updated_at
before update on public.offers
for each row execute function private.set_updated_at();

create trigger offer_verifications_set_updated_at
before update on public.offer_verifications
for each row execute function private.set_updated_at();

create or replace function private.enforce_card_update_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '42501', message = 'Protected card fields cannot be updated.';
  end if;
  if current_user = 'authenticated'
    and old.status = 'REMOVED'::public.card_profile_status
    and new.status <> 'REMOVED'::public.card_profile_status
  then
    raise exception using errcode = '42501', message = 'Removed card profiles cannot be restored.';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_offer_update_boundary()
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
    raise exception using errcode = '42501', message = 'Protected offer fields cannot be updated.';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_evidence_update_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.offer_id is distinct from old.offer_id
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

revoke execute on function private.enforce_card_update_boundary() from public, anon, authenticated;
revoke execute on function private.enforce_offer_update_boundary() from public, anon, authenticated;
revoke execute on function private.enforce_evidence_update_boundary() from public, anon, authenticated;

create trigger credit_card_profiles_enforce_update_boundary
before update on public.credit_card_profiles
for each row execute function private.enforce_card_update_boundary();

create trigger offers_enforce_update_boundary
before update on public.offers
for each row execute function private.enforce_offer_update_boundary();

create trigger offer_verifications_enforce_update_boundary
before update on public.offer_verifications
for each row execute function private.enforce_evidence_update_boundary();

alter table public.credit_card_profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.offers enable row level security;
alter table public.offer_verifications enable row level security;

revoke all on table public.credit_card_profiles from public, anon, authenticated;
revoke all on table public.merchants from public, anon, authenticated;
revoke all on table public.offers from public, anon, authenticated;
revoke all on table public.offer_verifications from public, anon, authenticated;

grant select on table public.credit_card_profiles to authenticated;
grant insert (id, user_id, issuer, nickname, card_type_optional, last4_optional)
  on table public.credit_card_profiles to authenticated;
grant update (issuer, nickname, card_type_optional, last4_optional, status)
  on table public.credit_card_profiles to authenticated;

grant select on table public.merchants to authenticated;

grant select on table public.offers to authenticated;
grant insert (
  id, user_id, card_id, merchant_id, title, description,
  spend_requirement, reward_amount, reward_type, expiration_date
) on table public.offers to authenticated;
grant update (
  card_id, merchant_id, title, description,
  spend_requirement, reward_amount, reward_type, expiration_date
) on table public.offers to authenticated;

grant select on table public.offer_verifications to authenticated;
grant insert (user_id, offer_id, card_id, evidence_path)
  on table public.offer_verifications to authenticated;
grant update (evidence_path) on table public.offer_verifications to authenticated;

grant all on table public.credit_card_profiles to service_role;
grant all on table public.merchants to service_role;
grant all on table public.offers to service_role;
grant all on table public.offer_verifications to service_role;

create policy "Owners read their card profiles"
on public.credit_card_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners create card profiles"
on public.credit_card_profiles for insert to authenticated
with check (
  (select auth.uid()) = user_id
);

create policy "Owners update card profiles"
on public.credit_card_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Authenticated users read active merchants"
on public.merchants for select to authenticated
using (status = 'ACTIVE'::public.merchant_status);

create policy "Owners read their offers"
on public.offers for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners create draft offers for owned active cards"
on public.offers for insert to authenticated
with check (
  (select auth.uid()) = user_id
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
    select 1 from public.merchants merchant
    where merchant.id = merchant_id
      and merchant.status = 'ACTIVE'::public.merchant_status
  )
);

create policy "Owners update editable offers"
on public.offers for update to authenticated
using (
  (select auth.uid()) = user_id
  and verification_status in (
    'DRAFT'::public.offer_verification_status,
    'NEEDS_REVIEW'::public.offer_verification_status
  )
)
with check (
  (select auth.uid()) = user_id
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
    select 1 from public.merchants merchant
    where merchant.id = merchant_id
      and merchant.status = 'ACTIVE'::public.merchant_status
  )
);

create policy "Owners read their evidence records"
on public.offer_verifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners create evidence for editable owned offers"
on public.offer_verifications for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'PENDING'::public.evidence_verification_status
  and reviewer_id is null
  and exists (
    select 1 from public.offers offer
    where offer.id = offer_id
      and offer.card_id = card_id
      and offer.user_id = (select auth.uid())
      and offer.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
);

create policy "Owners replace evidence for editable owned offers"
on public.offer_verifications for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.offers offer
    where offer.id = offer_id
      and offer.user_id = (select auth.uid())
      and offer.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
)
with check ((select auth.uid()) = user_id);

create or replace function public.submit_offer_for_verification(target_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_offer public.offers%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select * into target_offer
  from public.offers
  where id = target_offer_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Offer not found.';
  end if;

  if target_offer.verification_status not in (
    'DRAFT'::public.offer_verification_status,
    'NEEDS_REVIEW'::public.offer_verification_status
  ) then
    raise exception using errcode = '22023', message = 'Offer is not editable.';
  end if;

  if target_offer.expiration_date < current_date then
    raise exception using errcode = '22023', message = 'Expired offers cannot be submitted.';
  end if;

  if not exists (
    select 1 from public.credit_card_profiles
    where id = target_offer.card_id
      and user_id = current_user_id
      and status = 'ACTIVE'::public.card_profile_status
  ) then
    raise exception using errcode = '22023', message = 'An active card profile is required.';
  end if;

  if not exists (
    select 1 from public.merchants
    where id = target_offer.merchant_id
      and status = 'ACTIVE'::public.merchant_status
  ) then
    raise exception using errcode = '22023', message = 'An active merchant is required.';
  end if;

  if not exists (
    select 1 from public.offer_verifications
    where offer_id = target_offer_id and user_id = current_user_id
  ) then
    raise exception using errcode = '22023', message = 'Verification evidence is required.';
  end if;

  if not exists (
    select 1
    from public.offer_verifications evidence
    join storage.objects object
      on object.bucket_id = 'offer-verification-evidence'
      and object.name = evidence.evidence_path
    where evidence.offer_id = target_offer_id
      and evidence.user_id = current_user_id
  ) then
    raise exception using errcode = '22023', message = 'Uploaded verification evidence is required.';
  end if;

  update public.offer_verifications
  set status = 'PENDING'::public.evidence_verification_status
  where offer_id = target_offer_id and user_id = current_user_id;

  update public.offers
  set
    verification_status = 'PENDING'::public.offer_verification_status,
    verification_timestamp = null,
    listing_status = 'PENDING_VERIFICATION'::public.offer_listing_status
  where id = target_offer_id and user_id = current_user_id;
end;
$$;

revoke all on function public.submit_offer_for_verification(uuid) from public, anon;
grant execute on function public.submit_offer_for_verification(uuid) to authenticated, service_role;

-- Private Storage bucket. Storage paths contain only opaque UUIDs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-verification-evidence',
  'offer-verification-evidence',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners upload evidence objects to owned editable offers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'offer-verification-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|pdf)$'
  and exists (
    select 1 from public.offers offer
    where offer.id::text = (storage.foldername(name))[2]
      and offer.user_id = (select auth.uid())
      and offer.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
);

create policy "Owners read registered evidence objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'offer-verification-evidence'
  and exists (
    select 1 from public.offer_verifications evidence
    where evidence.evidence_path = name
      and evidence.user_id = (select auth.uid())
  )
);

create policy "Owners delete evidence objects from editable offers"
on storage.objects for delete to authenticated
using (
  bucket_id = 'offer-verification-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.offers offer
    where offer.id::text = (storage.foldername(name))[2]
      and offer.user_id = (select auth.uid())
      and offer.verification_status in (
        'DRAFT'::public.offer_verification_status,
        'NEEDS_REVIEW'::public.offer_verification_status
      )
  )
);

insert into public.merchants (name, slug, category)
values
  ('Adobe', 'adobe', 'Software'),
  ('Dell', 'dell', 'Electronics'),
  ('Nike', 'nike', 'Retail'),
  ('Best Buy', 'best-buy', 'Electronics'),
  ('Samsung', 'samsung', 'Electronics'),
  ('Marriott', 'marriott', 'Travel'),
  ('Walmart', 'walmart', 'Retail'),
  ('Target', 'target', 'Retail'),
  ('Dropbox', 'dropbox', 'Software'),
  ('FedEx', 'fedex', 'Shipping')
on conflict (slug) do nothing;

comment on table public.credit_card_profiles is
  'Owner-only organizational card records. Never expose through marketplace DTOs.';
comment on column public.credit_card_profiles.last4_optional is
  'Optional owner-only organizational value. Never expose publicly or use in URLs.';
comment on table public.offers is
  'Owner-only offer management records in Phase 3. No public marketplace access policy exists.';
comment on table public.offer_verifications is
  'Sensitive owner-only evidence metadata. evidence_path must never enter public DTOs.';
