-- Keep raw conversations private while allowing message RLS to verify participants.
-- The participant_conversations view replaced direct conversation access, so message
-- policies must not query public.conversations with the caller's table privileges.

create or replace function public.current_user_can_access_conversation(
  target_conversation_id uuid,
  require_active boolean default false,
  require_unblocked boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and public.current_account_is_active()
    and exists (
      select 1
      from public.conversations conversation
      where conversation.id = target_conversation_id
        and conversation.unlock_status = 'UNLOCKED'::public.conversation_unlock_status
        and (
          (require_active and conversation.status = 'ACTIVE'::public.conversation_status)
          or (not require_active and conversation.status <> 'LOCKED'::public.conversation_status)
        )
        and auth.uid() in (conversation.seller_user_id, conversation.buyer_user_id)
        and (
          not require_unblocked
          or not exists (
            select 1
            from public.user_blocks block
            where (block.blocker_id = conversation.seller_user_id and block.blocked_user_id = conversation.buyer_user_id)
               or (block.blocker_id = conversation.buyer_user_id and block.blocked_user_id = conversation.seller_user_id)
          )
        )
    );
$$;

revoke all on function public.current_user_can_access_conversation(uuid, boolean, boolean)
from public, anon;
grant execute on function public.current_user_can_access_conversation(uuid, boolean, boolean)
to authenticated, service_role;

drop policy "Participants read unlocked messages" on public.messages;
create policy "Participants read unlocked messages"
on public.messages for select to authenticated
using (public.current_user_can_access_conversation(conversation_id));

drop policy "Unblocked active participants send messages" on public.messages;
create policy "Unblocked active participants send messages"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and moderation_status = 'ALLOWED'::public.message_moderation_status
  and read_at is null
  and public.current_user_can_access_conversation(conversation_id, true, true)
);

drop policy "Recipients mark messages read" on public.messages;
create policy "Recipients mark messages read"
on public.messages for update to authenticated
using (
  sender_id <> (select auth.uid())
  and public.current_user_can_access_conversation(conversation_id)
)
with check (
  sender_id <> (select auth.uid())
  and read_at is not null
  and public.current_user_can_access_conversation(conversation_id)
);

comment on function public.current_user_can_access_conversation(uuid, boolean, boolean) is
  'Boolean-only SECURITY DEFINER guard used by message RLS after raw conversation access was revoked.';
