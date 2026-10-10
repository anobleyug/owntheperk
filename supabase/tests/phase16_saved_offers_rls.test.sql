begin;

select plan(13);

insert into auth.users (id, email) values
  ('96000000-0000-4000-8000-000000000001', 'saved-owner@example.com'),
  ('96000000-0000-4000-8000-000000000002', 'saved-other@example.com');

update public.profiles set
  username = case id
    when '96000000-0000-4000-8000-000000000001' then 'SavedOwner'
    else 'SavedOther'
  end,
  onboarding_completed = true
where id::text like '96000000-%';

insert into public.offers (
  id, merchant_id, title, description, required_spend, reward_amount,
  reward_type, expiration_date, status
) values (
  '96000000-1000-4000-8000-000000000001',
  (select id from public.merchants where slug = 'adobe'),
  'Saved offers RLS test', '', 600, 250, 'STATEMENT_CREDIT', current_date + 30, 'ACTIVE'
);

select is((select relrowsecurity from pg_class where oid = 'public.saved_offers'::regclass), true, 'saved offers use RLS');
select ok(has_table_privilege('authenticated', 'public.saved_offers', 'SELECT'), 'authenticated users can read saved offers');
select ok(has_table_privilege('authenticated', 'public.saved_offers', 'INSERT'), 'authenticated users can save offers');
select ok(has_table_privilege('authenticated', 'public.saved_offers', 'DELETE'), 'authenticated users can remove saves');
select ok(not has_table_privilege('authenticated', 'public.saved_offers', 'UPDATE'), 'authenticated users cannot update saved rows');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.saved_offers (user_id, offer_id)
values (auth.uid(), '96000000-1000-4000-8000-000000000001');
select is((select count(*)::integer from public.saved_offers), 1, 'owner can create and read a save');
select throws_ok(
  $$ insert into public.saved_offers (user_id, offer_id) values (auth.uid(), '96000000-1000-4000-8000-000000000001') $$,
  '23505', null, 'duplicate saves are rejected'
);
select is((select count(*)::integer from public.get_saved_offers()), 1, 'saved summary returns the owner saved offer');
select is((select active_listing_count::integer from public.get_saved_offers()), 0, 'saved summary retains offers without active listings');
select is((select lowest_ask from public.get_saved_offers()), null, 'saved summary has no lowest ask without active listings');

select set_config('request.jwt.claims', '{"sub":"96000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*)::integer from public.saved_offers), 0, 'another user cannot read the owner save');
select throws_ok(
  $$ insert into public.saved_offers (user_id, offer_id) values ('96000000-0000-4000-8000-000000000001', '96000000-1000-4000-8000-000000000001') $$,
  '42501', null, 'another user cannot create a save for the owner'
);

select set_config('request.jwt.claims', '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
delete from public.saved_offers where offer_id = '96000000-1000-4000-8000-000000000001';
select is((select count(*)::integer from public.saved_offers), 0, 'owner can remove a saved offer');

reset role;
select * from finish();
rollback;
