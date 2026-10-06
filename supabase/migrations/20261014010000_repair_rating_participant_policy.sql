-- Rating reads must use the protected participant guard because authenticated
-- users intentionally cannot select from the raw conversations table.

drop policy "Participants read conversation ratings" on public.ratings;
create policy "Participants read conversation ratings"
on public.ratings for select to authenticated
using (public.current_user_can_access_conversation(conversation_id));
