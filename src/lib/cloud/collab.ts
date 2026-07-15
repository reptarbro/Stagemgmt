// Team collaboration: several accounts co-editing ONE production. Layered on top
// of the per-account Cloud Sync - a shared show also reconciles against a
// `shared_productions` row that every teammate can read and write. The existing
// record-level merge (mergeProduction) reconciles concurrent edits, so members
// never clobber each other. Requires supabase/production_shares.sql to be run.
import { supa } from './client'
import { mergeProduction } from './merge'
import type { Production } from '../types'

/** The app's base URL (before the hash route) - the join link's origin. */
export function appBaseUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

/** localStorage key holding a share token to join after sign-in. Sign-in
    redirects to the clean root (a hash-route redirect would collide with the
    returning auth token, which the implicit flow also puts in the URL hash), so
    the token is stashed here and resumed once a session appears. */
export const PENDING_JOIN_KEY = 'standby.pendingJoin'

/** The team join link for a token. Opening it (signed in) joins the show. */
export function joinUrl(token: string): string {
  return `${appBaseUrl()}#/join/${token}`
}

/** Canonical serialization so two structurally-equal productions compare equal
    regardless of key order (jsonb round-trips reorder keys). */
function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']'
  const o = v as Record<string, unknown>
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
}

/** Turn a production into a shared team book. The caller becomes owner + first
    member. Returns the new share id and the token for the join link. */
export async function createProductionShare(
  prod: Production,
): Promise<{ shareId: string; token: string } | { error: string }> {
  const { data: sess } = await supa().auth.getSession()
  if (!sess.session?.user) return { error: 'Sign in (Settings -> Cloud Sync) to share with your team.' }
  const { data, error } = await supa().rpc('create_production_share', {
    p_production_id: prod.id,
    p_title: prod.title,
    p_payload: { ...prod, shareId: undefined },
  })
  if (error) return { error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.share_id || !row?.join_token) return { error: 'Share was not created. Try again.' }
  return { shareId: row.share_id as string, token: row.join_token as string }
}

/** Look up the join token for a share the caller owns/belongs to, to re-show the
    link later without keeping the secret in the synced payload. */
export async function fetchJoinToken(shareId: string): Promise<string | null> {
  const { data, error } = await supa()
    .from('shared_productions')
    .select('join_token')
    .eq('share_id', shareId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { join_token: string }).join_token
}

/** Accept a team link by token: join as a member and get the show to seed
    locally. `production` carries `shareId` so this device starts syncing it. */
export async function joinProductionShare(
  token: string,
): Promise<{ production: Production } | { error: string }> {
  const { data: sess } = await supa().auth.getSession()
  if (!sess.session?.user) return { error: 'not-signed-in' }
  // Trim in case the link picked up stray whitespace from an email/chat client.
  const { data, error } = await supa().rpc('join_production_share', { p_token: token.trim() })
  if (error) return { error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.payload || !row?.share_id) return { error: 'This link is invalid or has been revoked.' }
  const production: Production = { ...(row.payload as Production), id: row.production_id as string, shareId: row.share_id as string }
  return { production }
}

/** Read the shared cloud copy of a production. */
async function fetchSharedProduction(shareId: string): Promise<Production | null> {
  const { data, error } = await supa()
    .from('shared_productions')
    .select('payload')
    .eq('share_id', shareId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { payload: Production }).payload
}

/** Write the merged copy back to the shared row for teammates to pull. */
async function pushSharedProduction(shareId: string, prod: Production): Promise<void> {
  await supa()
    .from('shared_productions')
    .update({ payload: { ...prod, shareId: undefined }, updated_at: new Date().toISOString() })
    .eq('share_id', shareId)
}

/**
 * Reconcile one shared production with its cloud row: merge the cloud copy into
 * the freshest local copy (never clobbers a concurrent local edit, because the
 * apply step re-merges against live state), and push the merged result up when
 * the cloud is behind. Convergent and safe to call on every trigger.
 * Returns true if the row still exists (false = revoked/removed upstream).
 */
export async function reconcileSharedProduction(
  local: Production,
  apply: (p: Production) => void,
): Promise<boolean> {
  if (!local.shareId) return true
  const remote = await fetchSharedProduction(local.shareId)
  if (!remote) return false
  const merged = mergeProduction(local, remote)
  if (stable(merged) !== stable(local)) apply(merged)
  if (stable(merged) !== stable(remote)) await pushSharedProduction(local.shareId, merged)
  return true
}
