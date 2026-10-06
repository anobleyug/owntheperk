begin;

select plan(3);

select ok(
  not has_table_privilege('authenticated', 'public.conversations', 'select'),
  'authenticated users still cannot read raw conversations'
);

select ok(
  has_table_privilege('authenticated', 'public.ratings', 'select'),
  'authenticated users may read ratings allowed by RLS'
);

select like(
  (
    select pg_get_expr(policy.polqual, policy.polrelid)
    from pg_policy policy
    join pg_class relation on relation.oid = policy.polrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'ratings'
      and policy.polname = 'Participants read conversation ratings'
  ),
  '%current_user_can_access_conversation%',
  'rating reads use the protected participant guard'
);

select * from finish();
rollback;
