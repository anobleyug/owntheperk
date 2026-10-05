begin;

select plan(16);

insert into auth.users (id, email) values
  ('94000000-0000-4000-8000-000000000001', 'analytics-user@example.com'),
  ('94000000-0000-4000-8000-000000000002', 'analytics-moderator@example.com');

update public.profiles
set username = case id
  when '94000000-0000-4000-8000-000000000001' then 'AnalyticsUser'
  else 'AnalyticsModerator'
end,
onboarding_completed = true
where id::text like '94000000-%';

update public.user_roles set role = 'MODERATOR'
where user_id = '94000000-0000-4000-8000-000000000002';

select is((select relrowsecurity from pg_class where oid = 'public.search_events'::regclass), true, 'search events use RLS');
select ok(not has_table_privilege('authenticated', 'public.search_events', 'select'), 'authenticated users cannot read raw search events');
select ok(not has_table_privilege('authenticated', 'public.search_events', 'insert'), 'authenticated users cannot directly insert search events');
select ok(not has_table_privilege('anon', 'public.search_events', 'select'), 'anonymous users cannot read search events');
select is(
  (select count(*)::integer from information_schema.columns where table_schema = 'public' and table_name = 'search_events'),
  5,
  'search events contain only the minimal columns'
);
select is(
  (select count(*)::integer from information_schema.columns where table_schema = 'public' and table_name = 'search_events' and column_name in ('email', 'phone', 'card_id', 'evidence_path', 'message_id')),
  0,
  'search events have no sensitive columns'
);

select set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$ select public.record_marketplace_search(E'  Adobe\n ') $$, 'users can record a sanitized search');
select lives_ok($$ select public.record_marketplace_search(repeat('x', 150)) $$, 'long search queries are limited');
select throws_ok(
  $$ select public.get_marketplace_analytics() $$,
  '42501', 'Moderator access required.', 'normal users cannot read analytics'
);

reset role;
select is((select query from public.search_events where merchant_id is not null limit 1), 'Adobe', 'search query whitespace is sanitized');
select is((select max(char_length(query))::integer from public.search_events), 100, 'stored query text is limited to 100 characters');
select is((select count(*)::integer from public.search_events where user_id = '94000000-0000-4000-8000-000000000001'), 2, 'searches are attributed only to the authenticated user');

select set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select lives_ok($$ select public.get_marketplace_analytics() $$, 'moderators can read aggregate analytics');
select ok((public.get_marketplace_analytics() ? 'total_users'), 'analytics include total users');
select is(jsonb_typeof(public.get_marketplace_analytics() -> 'top_merchants_by_searches'), 'array', 'top search merchants are aggregated');
select ok(
  not (public.get_marketplace_analytics() ?| array['email', 'phone', 'message', 'card_id', 'evidence_path']),
  'analytics response has no sensitive top-level fields'
);

reset role;
select * from finish();
rollback;
