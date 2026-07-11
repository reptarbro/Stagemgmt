-- StandBy — beta feedback inbox.
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--
-- Model: anyone using the app (signed in or not) can SUBMIT feedback with the
-- publishable key; nobody can READ it with that key. You read the notes in the
-- Supabase Table editor, where the service role bypasses row-level security.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  category   text,
  message    text not null,
  context    jsonb
);

alter table public.feedback enable row level security;

-- Allow INSERTs from the browser (both anonymous and signed-in users).
drop policy if exists "feedback_insert_anyone" on public.feedback;
create policy "feedback_insert_anyone"
  on public.feedback
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT / UPDATE / DELETE policies are defined on purpose: the anon and
-- authenticated keys therefore cannot read, edit, or delete feedback. View and
-- manage it from the Supabase Dashboard → Table editor → feedback.
