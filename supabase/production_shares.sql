-- StandBy - team collaboration on ONE production. Run ONCE in the Supabase SQL
-- editor (after app_state / cloud sync is already set up).
--
-- Model: a stage manager turns a show into a shared, editable book. They get a
-- single join link they hand to their team (co-SMs, ASMs, directors). Each
-- teammate opens the link, signs in to THEIR OWN account once, and the show
-- lands in their app. From then on every member reads and writes the same cloud
-- copy; the app's record-level merge (newest edit wins per item, deletes
-- tombstoned) reconciles concurrent edits, so no one clobbers anyone.

-- The shared production itself: one row per shared show, holding the whole
-- Production as jsonb, addressable by an unguessable join token.
create table if not exists public.shared_productions (
  share_id       uuid primary key default gen_random_uuid(),
  production_id  text not null,
  owner_id       uuid not null references auth.users(id) on delete cascade,
  join_token     text not null unique,
  title          text,
  payload        jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Who is on the team for a given shared show.
create table if not exists public.shared_production_members (
  share_id   uuid not null references public.shared_productions(share_id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor',
  joined_at  timestamptz not null default now(),
  primary key (share_id, user_id)
);

alter table public.shared_productions        enable row level security;
alter table public.shared_production_members enable row level security;

-- Membership test as SECURITY DEFINER so the policies below don't recurse
-- through the members table's own RLS.
create or replace function public.is_share_member(p_share uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.shared_production_members m
    where m.share_id = p_share and m.user_id = auth.uid()
  );
$$;

-- shared_productions: any member can read and write the row; only the owner can
-- create it or delete it outright.
drop policy if exists "sp_member_select" on public.shared_productions;
create policy "sp_member_select" on public.shared_productions
  for select to authenticated using (public.is_share_member(share_id));

drop policy if exists "sp_owner_insert" on public.shared_productions;
create policy "sp_owner_insert" on public.shared_productions
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "sp_member_update" on public.shared_productions;
create policy "sp_member_update" on public.shared_productions
  for update to authenticated
  using (public.is_share_member(share_id))
  with check (public.is_share_member(share_id));

drop policy if exists "sp_owner_delete" on public.shared_productions;
create policy "sp_owner_delete" on public.shared_productions
  for delete to authenticated using (owner_id = auth.uid());

-- members: you can see your own membership rows, and the owner can see everyone
-- on their shows. Rows are added through the SECURITY DEFINER join function
-- below (no direct INSERT policy on purpose), so a token is required to join.
drop policy if exists "spm_self_or_owner_select" on public.shared_production_members;
create policy "spm_self_or_owner_select" on public.shared_production_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists(select 1 from public.shared_productions s
              where s.share_id = shared_production_members.share_id
                and s.owner_id = auth.uid())
  );

-- A member can leave; the owner can remove anyone from their show.
drop policy if exists "spm_self_or_owner_delete" on public.shared_production_members;
create policy "spm_self_or_owner_delete" on public.shared_production_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists(select 1 from public.shared_productions s
              where s.share_id = shared_production_members.share_id
                and s.owner_id = auth.uid())
  );

-- Create a share for a production. The caller becomes owner and first member.
-- Returns the new share id and the join token to build the team link.
create or replace function public.create_production_share(
  p_production_id text,
  p_title text,
  p_payload jsonb
)
returns table(share_id uuid, join_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share uuid;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;
  v_token := encode(gen_random_bytes(12), 'hex');
  insert into public.shared_productions(production_id, owner_id, join_token, title, payload)
  values (p_production_id, auth.uid(), v_token, p_title, p_payload)
  returning public.shared_productions.share_id into v_share;
  insert into public.shared_production_members(share_id, user_id, role)
  values (v_share, auth.uid(), 'owner');
  return query select v_share, v_token;
end;
$$;

-- Join a share by token: add the caller as a member (idempotent) and hand back
-- the show to seed their local copy.
create or replace function public.join_production_share(p_token text)
returns table(share_id uuid, production_id text, title text, payload jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share uuid;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;
  select s.share_id into v_share from public.shared_productions s where s.join_token = p_token;
  if v_share is null then
    raise exception 'invalid or revoked link';
  end if;
  insert into public.shared_production_members(share_id, user_id, role)
  values (v_share, auth.uid(), 'editor')
  on conflict (share_id, user_id) do nothing;
  return query
    select s.share_id, s.production_id, s.title, s.payload
    from public.shared_productions s where s.share_id = v_share;
end;
$$;

grant execute on function public.is_share_member(uuid)                      to authenticated;
grant execute on function public.create_production_share(text, text, jsonb) to authenticated;
grant execute on function public.join_production_share(text)                to authenticated;

-- Realtime so a teammate's edit lands in ~1s (best-effort; the poll still
-- converges if realtime is off). Guarded so re-running the file is harmless.
do $$
begin
  begin
    alter publication supabase_realtime add table public.shared_productions;
  exception when duplicate_object then null;
  end;
end $$;
