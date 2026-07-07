import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

let client: SupabaseClient | null = null

/** Lazy singleton Supabase client. Magic-link sign-in via the implicit flow so
    the email link completes sign-in in ANY browser that opens it, not only the
    one that requested it (people read email on a different device than the app).
    The client is created at app boot, so it captures and consumes the returning
    token from the URL before anything else runs. Uses the default email, so no
    custom SMTP or template is needed. */
export function supa(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        storageKey: 'standby.auth',
      },
    })
  }
  return client
}
