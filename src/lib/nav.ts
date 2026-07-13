import type { IconName } from '../components/icons'

/** One navigable section of the prompt book. Shared by the shell's binder rail
    and the Hub's folder-tile launcher so they never drift out of sync. */
export interface NavItem {
  to: string
  icon: IconName
  label: string
}

export const NAV: NavItem[] = [
  { to: '/hub', icon: 'hub', label: 'Production Hub' },
  { to: '/people', icon: 'people', label: 'People' },
  { to: '/schedule', icon: 'schedule', label: 'Schedule' },
  { to: '/scenes', icon: 'scenes', label: 'Scenes' },
  { to: '/props', icon: 'props', label: 'Props & Costumes' },
  { to: '/line-notes', icon: 'notes', label: 'Line Notes' },
  { to: '/script', icon: 'script', label: 'Script' },
  { to: '/assets', icon: 'assets', label: 'Assets' },
  { to: '/cues', icon: 'cues', label: 'Cue-to-Cue' },
  { to: '/reports', icon: 'reports', label: 'Reports' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

/** Gel color for each section - the color-coded binder edge / folder tab. */
export const TAB_COLOR: Record<string, string> = {
  '/hub': 'var(--gel-spot)',
  '/people': 'var(--go)',
  '/schedule': 'var(--standby)',
  '/scenes': 'var(--gel-sound)',
  '/props': 'var(--gel-projection)',
  '/line-notes': 'var(--gel-fly)',
  '/script': 'var(--gel-spot)',
  '/assets': 'var(--gel-deck)',
  '/cues': 'var(--gel-light)',
  '/reports': 'var(--info)',
  '/settings': 'var(--text-dim)',
}
