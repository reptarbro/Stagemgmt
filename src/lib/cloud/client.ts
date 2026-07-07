import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

let client: SupabaseClient | null = null

/** Lazy singleton Supabase client. OTP (email-code) sign-in, so we don't parse
    the URL for a session — that keeps it clear of the app's HashRouter hash. */
export function supa(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'standby.auth',
      },
    })
  }
  return client
}
