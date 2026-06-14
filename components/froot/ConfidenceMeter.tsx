'use client'

import { motion } from 'framer-motion'

interface ConfidenceMeterProps {
  /** 0..1 — how tight the belief is */
  confidence: number
  /** poppy-red house accent by default */
  accent?: string
  /** delay the fill animation (seconds) */
  delay?: number
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * A thin, tactile confidence bar. Reads a 0..1 confidence and renders it as a
 * filling meter with a soft inner shadow track + glowing fill, plus a tiny
 * percent + word label. Presentational only.
 */
export default function ConfidenceMeter({
  confidence,
  accent = '#C5352C',
  delay = 0.2,
}: ConfidenceMeterProps) {
  const pct = Math.max(0, Math.min(1, confidence))
  const percent = Math.round(pct * 100)

  // 2026 color coding: certainty is GRADED by hue, not just length — the fill
  // warms from quiet stone → terracotta → poppy → deep as the belief locks in.
  const STAGES = [
    { max: 0.35, word: 'forming', from: '#C6BAA8', to: '#B0A092' }, // warm stone
    { max: 0.6, word: 'sharpening', from: '#D89A6E', to: '#C97B5A' }, // terracotta
    { max: 0.82, word: 'sharp', from: '#D8493B', to: '#C5352C' }, // poppy
    { max: Infinity, word: 'locked in', from: '#C5352C', to: '#9E2B1E' }, // deep poppy
  ]
  const stage = STAGES.find((s) => pct < s.max) ?? STAGES[STAGES.length - 1]
  const word = stage.word
  const stateColor = stage.to
  const locked = pct >= 0.82

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '8px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(26,8,8,0.35)',
          }}
        >
          confidence &middot; {word}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: '11px',
            color: stateColor,
            fontWeight: 600,
            letterSpacing: '0.02em',
            transition: 'color 0.5s ease',
          }}
        >
          {percent}%
        </span>
      </div>

      {/* track */}
      <div
        style={{
          position: 'relative',
          height: '7px',
          borderRadius: '999px',
          background:
            'linear-gradient(180deg, rgba(26,8,8,0.10) 0%, rgba(26,8,8,0.04) 100%)',
          boxShadow:
            'inset 0 1px 2px rgba(26,8,8,0.18), inset 0 -1px 0 rgba(255,255,255,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, ease: EASE, delay }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            background: `linear-gradient(90deg, ${stage.from} 0%, ${stage.to} 100%)`,
            boxShadow: locked
              ? `0 0 12px ${stateColor}80, inset 0 1px 0 rgba(255,255,255,0.4)`
              : `0 0 4px ${stateColor}33, inset 0 1px 0 rgba(255,255,255,0.3)`,
            transition: 'background 0.5s ease, box-shadow 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
