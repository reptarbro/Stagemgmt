import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

let client: SupabaseClient | null = null

/** Lazy singleton Supabase client. Magic-link sign-in via the PKCE flow: the
    email link returns to the app with `?code=` (a query param, so it doesn't
    collide with the app's HashRouter `#` route), which the client exchanges for
    a session automatically on load. Uses the default email — no custom SMTP or
    template needed. */
export function supa(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'standby.auth',
      },
    })
  }
  return client
}
