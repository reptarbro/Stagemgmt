/**
 * Monochrome line-icon set for navigation — inherits `currentColor` so it
 * tints with the nav state (sage when idle, emerald when active). Keeps the
 * whole app in the favicon's restrained palette instead of full-color emoji.
 */

const P = {
  stroke: 'currentColor',
  strokeWidth: 1.7,
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export type IconName =
  | 'hub'
  | 'people'
  | 'schedule'
  | 'scenes'
  | 'props'
  | 'notes'
  | 'script'
  | 'cues'
  | 'reports'
  | 'settings'

export function NavIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...P} aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

const ICONS: Record<IconName, JSX.Element> = {
  hub: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3.1 2.5-5.3 5.5-5.3s5.5 2.2 5.5 5.3" />
      <path d="M16.2 5.2a3 3 0 0 1 0 5.9" />
      <path d="M17.5 14.4c2.2.5 3.9 2.3 3.9 5.1" />
    </>
  ),
  schedule: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  scenes: (
    <>
      <path d="M12 3.2 21 7.6l-9 4.4-9-4.4z" />
      <path d="M3 12.2 12 16.6l9-4.4" />
      <path d="M3 16.6 12 21l9-4.4" />
    </>
  ),
  props: (
    <>
      <path d="M20.6 13.4 13 21a2 2 0 0 1-2.8 0l-6.7-6.7a2 2 0 0 1-.6-1.4V5.3a2 2 0 0 1 2-2h7.6a2 2 0 0 1 1.4.6l6.7 6.7a2 2 0 0 1 0 2.8z" />
      <circle cx="7.7" cy="7.7" r="1.4" />
    </>
  ),
  notes: (
    <>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z" />
      <path d="M13.3 6.7l3 3" />
    </>
  ),
  script: (
    <>
      <path d="M6.5 3.5H13l5 5V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M13 3.5V9h5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  cues: (
    <>
      <path d="M9.5 17.5h5" />
      <path d="M10.5 20.5h3" />
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z" />
    </>
  ),
  reports: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2.2" />
      <rect x="9" y="3" width="6" height="3.4" rx="1.2" />
      <path d="M8.5 11h7M8.5 14.5h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.6v2.6M12 18.8v2.6M4.2 4.2l1.9 1.9M17.9 17.9l1.9 1.9M2.6 12h2.6M18.8 12h2.6M4.2 19.8l1.9-1.9M17.9 6.1l1.9-1.9" />
    </>
  ),
}
