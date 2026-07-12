import { supa } from './client'
import type { Production } from '../types'

/** What a shared, read-only snapshot can contain. Deliberately excludes private
    data (line notes, reports, emergency/contact details). */
export interface SharePayload {
  v: 1
  title: string
  company?: string
  includes: ('schedule' | 'company')[]
  companyList?: { name: string; role?: string; character?: string; group?: string }[]
  schedule?: {
    date: string
    type: string
    title?: string
    callTime?: string
    startTime?: string
    endTime?: string
    location?: string
    agenda?: { time?: string; what: string }[]
  }[]
  generatedAt: string
}

export interface ShareRow {
  token: string
  title: string | null
  created_at: string
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** A 16-char (~95-bit) unguessable token from the browser CSPRNG. */
function randomToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** The app's own base URL (before the hash route). */
export function appBaseUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

/** Build a share URL for a token. */
export function shareUrl(token: string): string {
  return `${appBaseUrl()}#/view/${token}`
}

/** Assemble a read-only snapshot from the production, limited to the chosen sections. */
export function buildSharePayload(prod: Production, includes: SharePayload['includes']): SharePayload {
  const payload: SharePayload = {
    v: 1,
    title: prod.title,
    company: prod.company,
    includes,
    generatedAt: new Date().toISOString(),
  }
  if (includes.includes('company')) {
    payload.companyList = prod.people.map((p) => ({
      name: p.name,
      role: p.role || undefined,
      character: p.character || undefined,
      group: p.group,
    }))
  }
  if (includes.includes('schedule')) {
    payload.schedule = [...prod.events]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        type: e.type,
        title: e.title || undefined,
        callTime: e.callTime,
        startTime: e.startTime,
        endTime: e.endTime,
        location: e.location,
        agenda: (e.agenda ?? [])
          .slice()
          .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
          .map((a) => ({ time: a.time || undefined, what: a.what })),
      }))
  }
  return payload
}

export async function createShare(payload: SharePayload): Promise<{ token: string } | { error: string }> {
  const { data: sess } = await supa().auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return { error: 'Sign in (Settings → Cloud Sync) to create a share link.' }
  const token = randomToken()
  const { error } = await supa()
    .from('shared_views')
    .insert({ token, owner_id: uid, title: payload.title, payload })
  if (error) return { error: error.message }
  return { token }
}

export async function listShares(): Promise<ShareRow[]> {
  const { data } = await supa()
    .from('shared_views')
    .select('token,title,created_at')
    .order('created_at', { ascending: false })
  return (data as ShareRow[]) ?? []
}

export async function revokeShare(token: string): Promise<void> {
  await supa().from('shared_views').delete().eq('token', token)
}

/** Public read of one snapshot by token (via the security-definer function). */
export async function fetchSharedView(token: string): Promise<SharePayload | null> {
  const { data, error } = await supa().rpc('get_shared_view', { p_token: token })
  if (error || !data) return null
  return data as SharePayload
}
