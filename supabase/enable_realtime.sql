-- Standby — enable Realtime on the Cloud Sync row (Stage 2.1 "auto-sync").
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL). It adds the
-- app_state table to the `supabase_realtime` publication so each signed-in
-- browser gets a push the instant another device saves — the app then pulls
-- automatically, with no 30-second wait and no manual Push/Pull.
--
-- Row-Level Security still applies: a client only receives change events for
-- rows it is allowed to SELECT, i.e. its own app_state row. The app subscribes
-- filtered to user_id, so a user only ever hears about their own data.
--
-- Safe to run more than once — the DO block is a no-op if the table is already
-- in the publication. If this is NOT installed, sync still works; devices just
-- fall back to the existing focus / 30-second-poll reconcile.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end
$$;
