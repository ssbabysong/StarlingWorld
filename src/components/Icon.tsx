const PATHS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 2.5a14 14 0 0 0 0 19 14 14 0 0 0 0-19" />
      <path d="M2.5 12h19" />
    </>
  ),
  journal: (
    <>
      <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z" />
      <path d="M9 3v18" />
      <path d="M12.5 8H16" />
      <path d="M12.5 11.5H16" />
    </>
  ),
  passport: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <circle cx="12" cy="10.5" r="3.5" />
      <path d="M8.5 10.5h7" />
      <path d="M9.5 17.5h5" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M21 20H3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="M17 7 7 17" />
      <path d="m7 7 10 10" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.5-4.5" />
    </>
  ),
  pin: (
    <>
      <path d="M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  rotate: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6l2.5 2.5" />
      <path d="M20.5 3.5v5h-5" />
    </>
  ),
  pause: (
    <>
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </>
  ),
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    </>
  ),
  edit: <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />,
  share: (
    <>
      <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="m16 7-4-4-4 4" />
      <path d="M12 3v12" />
    </>
  ),
  import: (
    <>
      <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="m8 11 4 4 4-4" />
      <path d="M12 3v12" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
