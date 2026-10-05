begin;

select plan(18);

select is(
  (
    select count(*)::integer
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relkind in ('r', 'p')
      and not class.relrowsecurity
  ),
  0,
  'all public tables have RLS enabled'
);
select is((select public from storage.buckets where id = 'offer-verification-evidence'), false, 'evidence bucket is private');
select ok(not has_table_privilege('anon', 'public.stripe_webhook_events', 'select'), 'anonymous users cannot read webhook state');
select ok(not has_table_privilege('authenticated', 'public.stripe_webhook_events', 'select'), 'users cannot read webhook state');
select ok(not has_table_privilege('authenticated', 'public.rate_limit_buckets', 'select'), 'users cannot read rate limit state');
select ok(not has_table_privilege('authenticated', 'public.admin_audit_logs', 'insert'), 'users cannot forge admin audit events');
select ok(not has_function_privilege('authenticated', 'public.consume_rate_limit(text,text,integer,integer)', 'execute'), 'users cannot invoke privileged rate limits');
select ok(not has_function_privilege('authenticated', 'public.claim_stripe_webhook_event(text,text)', 'execute'), 'users cannot claim Stripe events');
select ok(not has_function_privilege('authenticated', 'public.finish_stripe_webhook_event(text,boolean)', 'execute'), 'users cannot finish Stripe events');
select is(
  (
    select count(*)::integer from information_schema.columns
    where table_schema = 'public' and table_name = 'marketplace_listings'
      and column_name in ('seller_user_id', 'seller_username', 'seller_avatar_url', 'card_id', 'evidence_path', 'email', 'phone')
  ),
  0,
  'marketplace DTO contains no identity or private fields'
);
select is(
  (
    select count(*)::integer from information_schema.columns
    where table_schema = 'public' and table_name = 'participant_conversations'
      and column_name in ('stripe_checkout_session_id', 'stripe_payment_intent_id')
  ),
  0,
  'conversation DTO excludes internal payment identifiers'
);
select ok(not has_table_privilege('anon', 'public.marketplace_listings', 'select'), 'anonymous users cannot read marketplace listings');
select ok(not has_table_privilege('anon', 'public.public_profiles', 'select'), 'anonymous users cannot read profiles');

set local role service_role;
select is(
  (public.consume_rate_limit('TEST_SCOPE', repeat('a', 64), 1, 60) ->> 'allowed')::boolean,
  true,
  'first rate-limited operation is allowed'
);
select is(
  (public.consume_rate_limit('TEST_SCOPE', repeat('a', 64), 1, 60) ->> 'allowed')::boolean,
  false,
  'subsequent operation over the limit is denied'
);
select is(public.claim_stripe_webhook_event('evt_12345678', 'checkout.session.completed'), 'CLAIMED', 'new webhook is claimed');
select is(public.claim_stripe_webhook_event('evt_12345678', 'checkout.session.completed'), 'BUSY', 'concurrent webhook claim is rejected');
select lives_ok($$ select public.finish_stripe_webhook_event('evt_12345678', true) $$, 'webhook completion is recorded');

reset role;
select * from finish();
rollback;
