-- StandBy — view-only share links. Run ONCE in the Supabase SQL editor.
--
-- Model: the stage manager creates an unguessable-token snapshot of the parts
-- of a show they choose to share. Anyone with the exact link can read that one
-- snapshot; nobody can list or enumerate links. The owner can revoke anytime.

create table if not exists public.shared_views (
  token       text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.shared_views enable row level security;

-- The owner (signed in) can create, list, and revoke their OWN links.
drop policy if exists "shared_owner_all" on public.shared_views;
create policy "shared_owner_all"
  on public.shared_views
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- No public SELECT policy on purpose: the anon/publishable key cannot read the
-- table directly, so links can't be enumerated. Public read happens ONLY through
-- this function, which returns exactly one snapshot for an exact token.
create or replace function public.get_shared_view(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select payload from public.shared_views where token = p_token;
$$;

grant execute on function public.get_shared_view(text) to anon, authenticated;
