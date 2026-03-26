'use client'

import { motion } from 'framer-motion'

interface MeasurementGuideProps {
  step: string
}

// Shared body outline paths (front view)
const BODY_LEFT = 'M 80 10 C 70 10, 52 18, 48 28 C 44 36, 40 44, 36 56 C 32 66, 30 72, 34 80 C 37 86, 42 92, 46 98 C 48 104, 46 112, 44 122'
const BODY_RIGHT = 'M 80 10 C 90 10, 108 18, 112 28 C 116 36, 120 44, 124 56 C 128 66, 130 72, 126 80 C 123 86, 118 92, 114 98 C 112 104, 114 112, 116 122'
const NECKLINE = 'M 48 28 Q 58 22, 80 20 Q 102 22, 112 28'

const bodyStyle = {
  fill: 'none',
  stroke: 'rgba(26,8,8,0.08)',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
}

const measureStyle = {
  fill: 'none',
  stroke: '#D4A020',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
}

const measureDashed = {
  ...measureStyle,
  strokeDasharray: '4 3',
}

function FrontTorso() {
  return (
    <>
      <path d={BODY_LEFT} {...bodyStyle} />
      <path d={BODY_RIGHT} {...bodyStyle} />
      <path d={NECKLINE} {...bodyStyle} />
    </>
  )
}

// Side view body path (for leaning/lying)
const SIDE_BACK = 'M 70 14 C 68 14, 64 20, 62 30 C 60 40, 60 50, 60 62 L 60 100 C 60 108, 62 116, 64 122'
const SIDE_FRONT = 'M 70 14 C 72 14, 76 20, 78 30 C 80 38, 84 46, 90 56 C 94 62, 92 68, 86 76 C 82 82, 78 90, 76 98 C 74 106, 72 114, 70 122'

function SideTorso({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <path d={SIDE_BACK} {...bodyStyle} />
      <path d={SIDE_FRONT} {...bodyStyle} />
    </g>
  )
}

function LooseUnderbust() {
  return (
    <svg viewBox="0 0 160 134" width="140" height="118" style={{ overflow: 'visible' }}>
      <FrontTorso />
      {/* Loose measurement line - slightly away from body with gaps */}
      <path d="M 28 82 Q 80 88, 132 82" {...measureDashed} opacity={0.6} />
      <path d="M 28 82 Q 80 86, 132 82" {...measureStyle} opacity={0.35} />
      {/* Small gap indicators */}
      <line x1="34" y1="78" x2="34" y2="84" stroke="#D4A020" strokeWidth="1" opacity={0.5} />
      <line x1="126" y1="78" x2="126" y2="84" stroke="#D4A020" strokeWidth="1" opacity={0.5} />
      {/* Label */}
      <text x="80" y="132" textAnchor="middle" fontFamily="var(--font-space-mono), monospace" fontSize="7" fill="rgba(26,8,8,0.2)" letterSpacing="0.1em">RELAXED</text>
    </svg>
  )
}

function SnugUnderbust() {
  return (
    <svg viewBox="0 0 160 134" width="140" height="118" style={{ overflow: 'visible' }}>
      <FrontTorso />
      {/* Snug measurement line - fits body */}
      <path d="M 30 82 Q 80 86, 130 82" {...measureStyle} />
      {/* Small tick marks */}
      <line x1="30" y1="80" x2="30" y2="84" stroke="#D4A020" strokeWidth="1.5" />
      <line x1="130" y1="80" x2="130" y2="84" stroke="#D4A020" strokeWidth="1.5" />
      <text x="80" y="132" textAnchor="middle" fontFamily="var(--font-space-mono), monospace" fontSize="7" fill="rgba(26,8,8,0.2)" letterSpacing="0.1em">SNUG FIT</text>
    </svg>
  )
}

function TightUnderbust() {
  return (
    <svg viewBox="0 0 160 134" width="140" height="118" style={{ overflow: 'visible' }}>
      <FrontTorso />
      {/* Tight measurement line */}
      <path d="M 32 82 Q 80 85, 128 82" {...measureStyle} />
      {/* Inward arrows */}
      <path d="M 24 82 L 32 82" stroke="#D4A020" strokeWidth="1.5" markerEnd="url(#arrowIn)" />
      <path d="M 136 82 L 128 82" stroke="#D4A020" strokeWidth="1.5" markerEnd="url(#arrowIn)" />
      <defs>
        <marker id="arrowIn" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6" fill="none" stroke="#D4A020" strokeWidth="1" />
        </marker>
      </defs>
      <text x="80" y="132" textAnchor="middle" fontFamily="var(--font-space-mono), monospace" fontSize="7" fill="rgba(26,8,8,0.2)" letterSpacing="0.1em">AS TIGHT AS POSSIBLE</text>
    </svg>
  )
}

function StandingBust() {
  return (
    <svg viewBox="0 0 160 134" width="140" height="118" style={{ overflow: 'visible' }}>
      <FrontTorso />
      {/* Bust measurement line at fullest point */}
      <path d="M 26 66 Q 80 72, 134 66" {...measureStyle} />
      <line x1="26" y1="64" x2="26" y2="68" stroke="#D4A020" strokeWidth="1.5" />
      <line x1="134" y1="64" x2="134" y2="68" stroke="#D4A020" strokeWidth="1.5" />
      {/* Subtle highlight behind measurement area */}
      <path d="M 26 66 Q 80 72, 134 66" fill="none" stroke="rgba(212,160,32,0.12)" strokeWidth="12" strokeLinecap="round" />
      <text x="80" y="132" textAnchor="middle" fontFamily="var(--font-space-mono), monospace" fontSize="7" fill="rgba(26,8,8,0.2)" letterSpacing="0.1em">STANDING UPRIGHT</text>
    </svg>
  )
}

function LeaningBust() {
  return (
    <svg viewBox="0 0 160 134" width="140" height="118" style={{ overflow: 'visible' }}>
      {/* Leaning forward - rotated side view */}
      <g transform="translate(80, 65)">
        {/* Back line - horizontal */}
        <path d="M -50 -30 C -48 -30, -40 -28, -30 -24 C -20 -20, -10 -16, 0 -12 C 10 -8, 20 -6, 30 -6" fill="none" stroke="rgba(26,8,8,0.08)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Front/bottom line with bust hanging down */}
        <path d="M -50 -22 C -46 -18, -38 -10, -30 -4 C -22 2, -16 10, -10 16 C -4 20, 2 18, 8 12 C 14 6, 20 0, 30 -2" fill="none" stroke="rgba(26,8,8,0.08)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Head suggestion */}
        <circle cx="-54" cy="-34" r="8" fill="none" stroke="rgba(26,8,8,0.06)" strokeWidth="1.2" />
        {/* Legs suggestion */}
        <line x1="30" y1="-6" x2="34" y2="40" stroke="rgba(26,8,8,0.06)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Measurement line around bust */}
        <ellipse cx="-10" cy="4" rx="6" ry="22" fill="none" stroke="#D4A020" strokeWidth="2" transform="rotate(-70, -10, 4)" />
        {/* Highlight */}
        <ellipse cx="-10" cy="4" rx="6" ry="22" fill="none" stroke="rgba(212,160,32,0.1)" strokeWidth="10" transform="rotate(-70, -10, 4)" />
      </g>
      <text x="80" y="128" textAnchor="middle" fontFamily="var(--font-space-mono), monospace" fontSize="7" fill="rgba(26,8,8,0.2)" letterSpacing="0.1em">BENT 90°</text>
    </svg>
  )
}

function LyingBust() {
  return (
    <svg viewBox="0 0 160 134" width="140" height="118" style={{ overflow: 'visible' }}>
      {/* Lying on back - side view */}
      <g transform="translate(10, 50)">
        {/* Surface/bed line */}
        <line x1="0" y1="28" x2="140" y2="28" stroke="rgba(26,8,8,0.05)" strokeWidth="1" />
        {/* Back (bottom, resting on surface) */}
        <path d="M 20 26 C 30 26, 40 26, 50 26 C 70 26, 90 26, 110 26 L 120 26" fill="none" stroke="rgba(26,8,8,0.08)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Front (top, with bust rise) */}
        <path d="M 20 22 C 28 18, 36 12, 44 8 C 52 4, 58 2, 66 0 C 72 -2, 78 0, 84 4 C 90 8, 96 14, 104 18 C 108 20, 114 22, 120 24" fill="none" stroke="rgba(26,8,8,0.08)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Head suggestion */}
        <ellipse cx="14" cy="18" rx="8" ry="10" fill="none" stroke="rgba(26,8,8,0.06)" strokeWidth="1.2" />
        {/* Measurement line */}
        <ellipse cx="66" cy="13" rx="5" ry="16" fill="none" stroke="#D4A020" strokeWidth="2" />
        <ellipse cx="66" cy="13" rx="5" ry="16" fill="none" stroke="rgba(212,160,32,0.1)" strokeWidth="10" />
      </g>
      <text x="80" y="128" textAnchor="middle" fontFamily="var(--font-space-mono), monospace" fontSize="7" fill="rgba(26,8,8,0.2)" letterSpacing="0.1em">LYING FLAT</text>
    </svg>
  )
}

const GUIDES: Record<string, () => React.ReactNode> = {
  looseUnderbust: LooseUnderbust,
  snugUnderbust: SnugUnderbust,
  tightUnderbust: TightUnderbust,
  standingBust: StandingBust,
  leaningBust: LeaningBust,
  lyingBust: LyingBust,
}

export default function MeasurementGuide({ step }: MeasurementGuideProps) {
  const Guide = GUIDES[step]
  if (!Guide) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px',
        userSelect: 'none',
      }}
    >
      <Guide />
    </motion.div>
  )
}
