'use client'

// Minimal bra style silhouettes — 28x20 SVGs

const iconStyle = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Plunge() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 4 Q 2 16, 10 16 Q 14 16, 14 10 Q 14 16, 18 16 Q 26 16, 26 4" {...iconStyle} />
      <path d="M 14 10 L 14 16" {...iconStyle} strokeWidth={0.8} opacity={0.4} />
    </svg>
  )
}

function Balconette() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 6 L 2 8 Q 2 16, 10 16 L 14 16 L 18 16 Q 26 16, 26 8 L 26 6" {...iconStyle} />
      <line x1="14" y1="8" x2="14" y2="16" {...iconStyle} strokeWidth={0.8} opacity={0.4} />
    </svg>
  )
}

function FullCoverage() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 2 Q 2 16, 10 16 Q 14 16, 14 8 Q 14 16, 18 16 Q 26 16, 26 2" {...iconStyle} />
      <path d="M 2 2 L 26 2" {...iconStyle} strokeWidth={0.8} opacity={0.3} />
    </svg>
  )
}

function Molded() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 14 Q 2 4, 8 4 Q 14 4, 14 10 Q 14 4, 20 4 Q 26 4, 26 14" {...iconStyle} />
      <line x1="2" y1="14" x2="26" y2="14" {...iconStyle} strokeWidth={0.8} opacity={0.3} />
    </svg>
  )
}

function Sports() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 2 Q 2 14, 8 14 Q 14 14, 14 8 Q 14 14, 20 14 Q 26 14, 26 2" {...iconStyle} />
      {/* Wide straps */}
      <line x1="6" y1="2" x2="4" y2="0" {...iconStyle} strokeWidth={1.5} />
      <line x1="22" y1="2" x2="24" y2="0" {...iconStyle} strokeWidth={1.5} />
    </svg>
  )
}

function Strapless() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 6 Q 2 16, 10 16 Q 14 16, 14 10 Q 14 16, 18 16 Q 26 16, 26 6" {...iconStyle} />
      <line x1="2" y1="6" x2="26" y2="6" {...iconStyle} strokeWidth={0.8} opacity={0.3} />
    </svg>
  )
}

function Wireless() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 3 4 Q 6 16, 14 14 Q 22 16, 25 4" {...iconStyle} />
      {/* Soft/relaxed lines */}
      <path d="M 3 4 Q 3 2, 6 2" {...iconStyle} strokeWidth={0.8} opacity={0.3} />
      <path d="M 25 4 Q 25 2, 22 2" {...iconStyle} strokeWidth={0.8} opacity={0.3} />
    </svg>
  )
}

function Demi() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 8 Q 2 16, 10 16 Q 14 16, 14 12 Q 14 16, 18 16 Q 26 16, 26 8" {...iconStyle} />
      <line x1="2" y1="8" x2="26" y2="8" {...iconStyle} strokeWidth={0.8} opacity={0.3} />
    </svg>
  )
}

function Default() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20">
      <path d="M 2 4 Q 2 16, 10 16 Q 14 16, 14 10 Q 14 16, 18 16 Q 26 16, 26 4" {...iconStyle} />
    </svg>
  )
}

const ICONS: Record<string, () => React.ReactNode> = {
  plunge: Plunge,
  balconette: Balconette,
  'full coverage': FullCoverage,
  molded: Molded,
  't-shirt': Molded,
  padded: Molded,
  sports: Sports,
  strapless: Strapless,
  wireless: Wireless,
  demi: Demi,
  'push up': Plunge,
  unlined: Default,
  seamed: Default,
  longline: Default,
  minimizer: FullCoverage,
}

export default function BraStyleIcon({ tags }: { tags: string[] }) {
  // Pick the most specific tag that has an icon
  const Icon = tags.reduce<(() => React.ReactNode) | null>((found, tag) => {
    if (found && found !== Default) return found
    return ICONS[tag] || found
  }, null) || Default

  return (
    <span style={{ color: 'rgba(26,8,8,0.15)', display: 'flex', alignItems: 'center' }}>
      <Icon />
    </span>
  )
}
