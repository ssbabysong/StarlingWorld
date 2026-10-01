import { useId } from 'react'

const INKS = ['#b8432f', '#2f5a7a', '#4f6b3f', '#7b3f5e', '#a86a1f', '#3d4f8a']

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

interface Props {
  code: string
  name: string
  english: string
  year?: string
  size?: number
  /** Plays the "stamped" animation on mount. */
  fresh?: boolean
}

/** A passport-style ink stamp. Shape, ink and tilt are derived from the country code. */
export default function Stamp({ code, name, english, year, size = 108, fresh }: Props) {
  const uid = useId().replace(/:/g, '')
  const h = hash(code)
  const ink = INKS[h % INKS.length]
  const shape = (['circle', 'rect', 'oval'] as const)[(h >>> 4) % 3]
  const tilt = ((h >>> 8) % 25) - 12
  const seed = h % 97
  const label = english.toUpperCase()
  const nameSize = Math.min(22, 92 / Math.max(name.length, 2))
  const sub = year ?? 'VISITED'

  return (
    <svg
      className={`stamp ${fresh ? 'fresh' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{ ['--tilt' as string]: `${tilt}deg`, color: ink }}
      role="img"
      aria-label={`${name} 印章`}
    >
      <defs>
        <filter id={`ink-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed={seed + 7} result="blot" />
          <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
        <path id={`arc-top-${uid}`} d="M 22 60 A 38 38 0 0 1 98 60" />
        <path id={`arc-bot-${uid}`} d="M 26 64 A 34 34 0 0 0 94 64" />
      </defs>

      <g filter={`url(#ink-${uid})`} fill="none" stroke="currentColor" opacity="0.88">
        {shape === 'circle' && (
          <>
            <circle cx="60" cy="60" r="52" strokeWidth="3" />
            <circle cx="60" cy="60" r="46" strokeWidth="1.2" />
            <text fontSize="8" letterSpacing="1.5" fill="currentColor" stroke="none" textAnchor="middle">
              <textPath href={`#arc-top-${uid}`} startOffset="50%">
                {label.length > 18 ? label.slice(0, 18) : label}
              </textPath>
            </text>
            <text x="60" y={66} fontSize={nameSize} fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">
              {name}
            </text>
            <text x="60" y="88" fontSize="8.5" letterSpacing="1.2" fill="currentColor" stroke="none" textAnchor="middle">
              ★ {sub} ★
            </text>
          </>
        )}

        {shape === 'rect' && (
          <>
            <rect x="10" y="22" width="100" height="76" rx="9" strokeWidth="3" />
            <rect x="16" y="28" width="88" height="64" rx="5" strokeWidth="1.2" />
            <text x="60" y="42" fontSize="7.5" letterSpacing="1.4" fill="currentColor" stroke="none" textAnchor="middle">
              ARRIVED · 入境
            </text>
            <text x="60" y={68} fontSize={nameSize} fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">
              {name}
            </text>
            <line x1="26" y1="76" x2="94" y2="76" strokeWidth="0.8" />
            <text x="60" y="86" fontSize="7.5" letterSpacing="1.2" fill="currentColor" stroke="none" textAnchor="middle">
              {sub}
            </text>
          </>
        )}

        {shape === 'oval' && (
          <>
            <ellipse cx="60" cy="60" rx="54" ry="40" strokeWidth="3" />
            <ellipse cx="60" cy="60" rx="47" ry="33" strokeWidth="1.2" />
            <text x="60" y="44" fontSize="7.5" letterSpacing="1.4" fill="currentColor" stroke="none" textAnchor="middle">
              {label.length > 16 ? label.slice(0, 16) : label}
            </text>
            <text x="60" y={67} fontSize={nameSize} fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">
              {name}
            </text>
            <text x="60" y="82" fontSize="8" letterSpacing="1.2" fill="currentColor" stroke="none" textAnchor="middle">
              {sub}
            </text>
          </>
        )}
      </g>
    </svg>
  )
}
