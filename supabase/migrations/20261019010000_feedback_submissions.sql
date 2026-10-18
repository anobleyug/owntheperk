-- One-way product feedback with private submissions and a moderator-only review queue.

create type public.feedback_type as enum ('BUG', 'FEEDBACK');
create type public.feedback_category as enum (
  'BUG',
  'FEATURE_REQUEST',
  'USABILITY',
  'PAYMENT',
  'MARKETPLACE',
  'ACCOUNT',
  'OTHER'
);
create type public.feedback_status as enum ('NEW', 'REVIEWED', 'CLOSED');

create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  type public.feedback_type not null,
  category public.feedback_category,
  subject text not null,
  message text not null,
  page_url text,
  user_agent text,
  status public.feedback_status not null default 'NEW',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,

  constraint feedback_subject_length check (char_length(btrim(subject)) between 1 and 120),
  constraint feedback_message_length check (char_length(btrim(message)) between 1 and 4000),
  constraint feedback_page_url_safe check (
    page_url is null
    or (char_length(page_url) between 1 and 500 and (page_url = '/' or page_url ~ '^/[^/]'))
  ),
  constraint feedback_user_agent_length check (
    user_agent is null or char_length(user_agent) between 1 and 500
  ),
  constraint feedback_review_consistency check (
    (status = 'NEW'::public.feedback_status and reviewed_at is null)
    or (status in ('REVIEWED'::public.feedback_status, 'CLOSED'::public.feedback_status) and reviewed_at is not null)
  )
);

create index feedback_submissions_status_created_idx
  on public.feedback_submissions (status, created_at desc);
create index feedback_submissions_user_created_idx
  on public.feedback_submissions (user_id, created_at desc);

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from public, anon, authenticated;
grant insert, select, update on table public.feedback_submissions to authenticated;
grant all on table public.feedback_submissions to service_role;

create policy "Active users create their own feedback"
on public.feedback_submissions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'NEW'::public.feedback_status
  and reviewed_at is null
  and (select public.current_account_is_active())
);

create policy "Moderators read feedback"
on public.feedback_submissions for select to authenticated
using ((select public.current_user_can_moderate()));

create policy "Moderators update feedback status"
on public.feedback_submissions for update to authenticated
using ((select public.current_user_can_moderate()))
with check ((select public.current_user_can_moderate()));

create or replace function private.prepare_feedback_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.subject := btrim(new.subject);
  new.message := btrim(new.message);
  new.page_url := nullif(btrim(new.page_url), '');
  new.user_agent := nullif(btrim(new.user_agent), '');

  if auth.role() = 'authenticated' and (
    select count(*)
    from public.feedback_submissions submission
    where submission.user_id = new.user_id
      and submission.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception using errcode = '22023', message = 'Feedback submission limit reached.';
  end if;

  return new;
end;
$$;

create trigger feedback_submissions_prepare
before insert on public.feedback_submissions
for each row execute function private.prepare_feedback_submission();

create or replace function private.prepare_feedback_status_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.type is distinct from old.type
    or new.category is distinct from old.category
    or new.subject is distinct from old.subject
    or new.message is distinct from old.message
    or new.page_url is distinct from old.page_url
    or new.user_agent is distinct from old.user_agent
    or new.created_at is distinct from old.created_at)
  then
    raise exception using errcode = '42501', message = 'Only feedback status may be updated.';
  end if;
  if (old.status = 'CLOSED'::public.feedback_status and new.status <> old.status)
    or (old.status = 'REVIEWED'::public.feedback_status and new.status = 'NEW'::public.feedback_status)
  then
    raise exception using errcode = '22023', message = 'Feedback status cannot be reopened.';
  end if;
  if new.status is distinct from old.status then
    new.reviewed_at := now();
  elsif new.reviewed_at is distinct from old.reviewed_at then
    raise exception using errcode = '42501', message = 'Review timestamps are managed automatically.';
  end if;
  return new;
end;
$$;

create trigger feedback_submissions_prepare_status
before update on public.feedback_submissions
for each row execute function private.prepare_feedback_status_update();

create or replace function private.audit_feedback_status_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and auth.uid() is not null then
    insert into public.admin_audit_logs (actor_id, action, target_type, target_id)
    values (auth.uid(), 'FEEDBACK_' || new.status::text, 'FEEDBACK_SUBMISSION', new.id);
  end if;
  return new;
end;
$$;

create trigger feedback_submissions_audit_status
after update of status on public.feedback_submissions
for each row execute function private.audit_feedback_status_update();

revoke execute on function private.prepare_feedback_submission(),
  private.prepare_feedback_status_update(), private.audit_feedback_status_update()
  from public, anon, authenticated;

comment on table public.feedback_submissions is
  'Private, one-way bug reports and product feedback. Submitters cannot read, update, or reopen submissions.';

