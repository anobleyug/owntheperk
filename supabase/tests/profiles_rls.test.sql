begin;

select plan(19);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'incomplete@example.com');

update public.profiles
set
  username = 'DealOwner',
  onboarding_completed = true
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set
  username = 'DealOther',
  onboarding_completed = true
where id = '22222222-2222-2222-2222-222222222222';

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
  ),
  true,
  'profiles has row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anon has no table-level profile read privilege'
);

select ok(
  not has_table_privilege('anon', 'public.public_profiles', 'select'),
  'anon cannot read the public profile view'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'select'),
  'authenticated receives column grants instead of unrestricted table select'
);

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'username', 'select'),
  'authenticated can read a safe profile column'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'risk_status', 'select'),
  'authenticated cannot read internal risk status'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'rating_average', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'phone_verified', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'account_status', 'update'),
  'authenticated cannot update protected trust or account columns'
);

select results_eq(
  $$
    select column_name::text
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_profiles'
    order by ordinal_position
  $$,
  array[
    'id',
    'username',
    'avatar_url',
    'bio',
    'rating_average',
    'rating_count',
    'completed_interaction_count',
    'response_rate',
    'phone_verified',
    'optional_identity_verified',
    'created_at'
  ]::text[],
  'public profile view exposes only the approved DTO columns'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select username
    from public.profiles
    where username is not null
    order by username
  $$,
  array['DealOther', 'DealOwner']::text[],
  'an authenticated user reads only onboarded safe marketplace rows'
);

select results_eq(
  $$
    update public.profiles
    set bio = 'Updated by owner'
    where id = '11111111-1111-1111-1111-111111111111'
    returning bio
  $$,
  array['Updated by owner']::text[],
  'a user can update their own editable profile field'
);

select results_eq(
  $$
    update public.profiles
    set bio = 'Unauthorized update'
    where id = '22222222-2222-2222-2222-222222222222'
    returning bio
  $$,
  array[]::text[],
  'a user cannot update another profile'
);

select throws_ok(
  $$
    update public.profiles
    set rating_average = 5
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  null,
  'a user cannot update protected rating fields'
);

select throws_ok(
  $$
    select risk_status
    from public.profiles
    where id = '22222222-2222-2222-2222-222222222222'
  $$,
  '42501',
  null,
  'a user cannot read another profile internal risk data'
);

select throws_ok(
  $$
    update public.profiles
    set username = 'dealother'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23505',
  null,
  'case-insensitive duplicate usernames are rejected'
);

select throws_ok(
  $$
    update public.profiles
    set username = 'admin'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  null,
  'reserved usernames are rejected by the database'
);

select throws_ok(
  $$
    update public.profiles
    set username = 'Deal555-123-4567'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  null,
  'phone-like usernames are rejected even when digits use separators'
);

select results_eq(
  $$
    update public.profiles
    set username = 'Fresh_Handle'
    where id = '11111111-1111-1111-1111-111111111111'
    returning username
  $$,
  array['Fresh_Handle']::text[],
  'a valid unique username can be saved'
);

select throws_ok(
  $$
    update public.profiles
    set onboarding_completed = false
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  'Profile onboarding cannot be reversed.',
  'an authenticated user cannot reverse onboarding'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.public_profiles
  $$,
  array[2::bigint],
  'the public profile view excludes incomplete profiles'
);

reset role;

select * from finish();
rollback;
