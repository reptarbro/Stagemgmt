/** App identity - the StandBy cue-light mark and name, used across the app. */

export const APP_NAME = 'StandBy'
export const APP_TAGLINE = 'Prompt Book'
/** Bump on notable releases; attached to feedback so notes are traceable. */
export const APP_VERSION = '4.0-beta'

/**
 * Backstage cue light: amber "standby" lamp lit, green "GO" lamp waiting.
 * `size` sets the rendered pixel box; the art is a 64×64 viewBox.
 */
export function StandbyMark({ size = 40 }: { size?: number }) {
  const gid = `sb-glow-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="StandBy">
      <defs>
        <radialGradient id={gid} cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#d9a441" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#d9a441" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="26" r="23" fill={`url(#${gid})`} />
      <rect x="21" y="9" width="22" height="46" rx="7" fill="#151b18" stroke="#9fb8a6" strokeWidth="2" />
      <circle cx="32" cy="24" r="9" fill="#d9a441" opacity="0.25" />
      <circle cx="32" cy="24" r="6" fill="#d9a441" />
      <circle cx="32" cy="41" r="6" fill="#1c7a4d" opacity="0.55" />
    </svg>
  )
}
