-- Local development account only. Supabase does not apply seed.sql during a normal
-- remote `db push`; do not use these credentials in a deployed environment.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'tester@owntheperk.local',
  extensions.crypt('TestPassword123!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
)
on conflict (id) do update
set
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  updated_at = now();

-- The auth-user trigger creates this profile shell before the seed reaches here.
update public.profiles
set
  username = 'PerkTester',
  bio = 'Local test profile for Own the Perk development.',
  onboarding_completed = true
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
