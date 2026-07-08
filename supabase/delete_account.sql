-- Standby — self-serve account deletion (Stage 2.1 "Account basics").
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL). It installs a
-- SECURITY DEFINER function that lets a signed-in user delete their OWN auth
-- account. The app calls it via supa().rpc('delete_account') after it has
-- already removed the user's cloud data (app_state row + Storage files).
--
-- Until this is installed, the app still deletes the user's cloud data and
-- signs them out; only the (now-empty) auth record lingers. Installing this
-- closes that gap so "Delete account & cloud data" also removes the account.
--
-- NOTE: the body is intentionally flush-left (no indentation). Some editors
-- turn pasted leading whitespace into non-breaking spaces, which Postgres
-- rejects with "syntax error at or near ' '". Keeping lines flush-left avoids
-- that. Straight quotes ('') and double dollar signs ($$) are required.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
delete from public.app_state where user_id = auth.uid();
delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call it, and only ever for themselves (auth.uid()).
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
