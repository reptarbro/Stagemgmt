-- Standby — self-serve account deletion (Stage 2.1 "Account basics").
--
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL). It installs a
-- SECURITY DEFINER function that lets a signed-in user delete their OWN auth
-- account. The app calls it via `supa().rpc('delete_account')` after it has
-- already removed the user's cloud data (app_state row + Storage files).
--
-- Until this is installed, the app still deletes the user's cloud data and
-- signs them out; only the (now-empty) auth record lingers. Installing this
-- closes that gap so "Delete account & cloud data" also removes the account.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Belt-and-suspenders: drop any data the caller still owns.
  delete from public.app_state where user_id = auth.uid();
  -- Remove the caller's own auth user.
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call it, and only ever for themselves (auth.uid()).
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
