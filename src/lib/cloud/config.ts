// Supabase connection for optional Cloud Sync (beta).
// These are the *publishable* credentials — safe to ship in a browser bundle;
// Row-Level Security (each user only sees their own rows) is what protects data.
export const SUPABASE_URL = 'https://owqthtxmwsjxqdmehkgz.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_purupPYZEG_SXsPyvPG3Tw_lUqmRATR'

export const CLOUD_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
