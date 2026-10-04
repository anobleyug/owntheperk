-- Phase 2: pseudonymous profiles and their access boundary.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create type public.account_status as enum (
  'ACTIVE',
  'SUSPENDED',
  'BANNED'
);

create type public.risk_status as enum (
  'NORMAL',
  'REVIEW',
  'HIGH_RISK'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  username_normalized text generated always as (lower(username)) stored,
  avatar_url text,
  bio text,
  phone_verified boolean not null default false,
  optional_identity_verified boolean not null default false,
  rating_average numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  completed_interaction_count integer not null default 0,
  response_rate numeric(5, 2),
  account_status public.account_status not null default 'ACTIVE',
  risk_status public.risk_status not null default 'NORMAL',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_required_after_onboarding
    check (not onboarding_completed or username is not null),
  constraint profiles_username_format
    check (
      username is null
      or (
        char_length(username) between 3 and 24
        and username ~ '^[A-Za-z][A-Za-z0-9_-]{2,23}$'
        and username !~ '[0-9]{7,}'
        and lower(username) <> all (
          array[
            'admin',
            'administrator',
            'moderator',
            'root',
            'security',
            'staff',
            'support',
            'system',
            'help',
            'official',
            'owntheperk',
            'own_the_perk',
            'own-the-perk',
            'null',
            'undefined'
          ]::text[]
        )
        and lower(username) !~ '(fuck|shit|bitch|cunt|nigger|faggot)'
      )
    ),
  constraint profiles_avatar_url_format
    check (
      avatar_url is null
      or (
        char_length(avatar_url) <= 2048
        and avatar_url ~ '^https://[^[:space:]]+$'
      )
    ),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 240),
  constraint profiles_rating_average_range
    check (rating_average between 0 and 5),
  constraint profiles_rating_count_nonnegative
    check (rating_count >= 0),
  constraint profiles_completed_interaction_count_nonnegative
    check (completed_interaction_count >= 0),
  constraint profiles_response_rate_range
    check (response_rate is null or response_rate between 0 and 100)
);

create unique index profiles_username_normalized_unique
  on public.profiles (username_normalized)
  where username_normalized is not null;

create index profiles_marketplace_visibility_idx
  on public.profiles (onboarding_completed, account_status, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

create or replace function private.enforce_profile_update_boundary()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if
      new.id is distinct from old.id
      or new.phone_verified is distinct from old.phone_verified
      or new.optional_identity_verified is distinct from old.optional_identity_verified
      or new.rating_average is distinct from old.rating_average
      or new.rating_count is distinct from old.rating_count
      or new.completed_interaction_count is distinct from old.completed_interaction_count
      or new.response_rate is distinct from old.response_rate
      or new.account_status is distinct from old.account_status
      or new.risk_status is distinct from old.risk_status
      or new.created_at is distinct from old.created_at
    then
      raise exception using
        errcode = '42501',
        message = 'Protected profile fields cannot be updated.';
    end if;

    if old.onboarding_completed and not new.onboarding_completed then
      raise exception using
        errcode = '42501',
        message = 'Profile onboarding cannot be reversed.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_profile_update_boundary()
  from public, anon, authenticated;

create trigger profiles_enforce_update_boundary
before update on public.profiles
for each row
execute function private.enforce_profile_update_boundary();

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

  return new;
end;
$$;

revoke execute on function private.handle_new_auth_user()
  from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_auth_user();

-- Safely create profile shells for users who predate this migration.
insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

revoke all privileges on table public.profiles from anon, authenticated;

grant select (
  id,
  username,
  avatar_url,
  bio,
  phone_verified,
  optional_identity_verified,
  rating_average,
  rating_count,
  completed_interaction_count,
  response_rate,
  onboarding_completed,
  created_at,
  updated_at
) on table public.profiles to authenticated;

grant update (
  username,
  avatar_url,
  bio,
  onboarding_completed
) on table public.profiles to authenticated;

grant all privileges on table public.profiles to service_role;

create policy "Authenticated users read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Authenticated users read active marketplace profiles"
on public.profiles
for select
to authenticated
using (
  onboarding_completed
  and account_status = 'ACTIVE'::public.account_status
);

create policy "Authenticated users update their own active profile"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) = id
  and account_status = 'ACTIVE'::public.account_status
)
with check (
  (select auth.uid()) = id
  and account_status = 'ACTIVE'::public.account_status
);

create view public.public_profiles
with (
  security_invoker = true,
  security_barrier = true
)
as
select
  id,
  username,
  avatar_url,
  bio,
  rating_average,
  rating_count,
  completed_interaction_count,
  response_rate,
  phone_verified,
  optional_identity_verified,
  created_at
from public.profiles
where onboarding_completed;

revoke all privileges on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to authenticated, service_role;

comment on table public.profiles is
  'Pseudonymous marketplace profiles. Auth identity remains in auth.users.';

comment on view public.public_profiles is
  'Authenticated marketplace DTO containing only fields safe to show to other users.';

comment on column public.profiles.risk_status is
  'Internal trust and safety state. Never include in marketplace DTOs.';

comment on column public.profiles.username_normalized is
  'Database-generated lowercase username used for case-insensitive uniqueness.';
