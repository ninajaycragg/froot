'use client'

// ── MaterialChip — tiny on-brand material/stretch tag for a recommended bra ──
//
// Surfaces the fabric tower in one glance: a stretch dot + a short phrase like
// "stretchy lace" / "rigid molded". Pure presentational — the integrator feeds
// it a brand/style (it looks the material up itself) or a pre-fetched material.
// hideWhenEmpty (default true) renders nothing when there's no data, so it's
// safe to drop onto every recommended bra unconditionally.

import { motion } from 'framer-motion'
import { getMaterial, type BraMaterial } from '@/lib/braMaterials'

const INK = '#1A0808'
const GOLD = '#D4A020'

// stretch bucket → dot color (2026 graded coding, warm range, no gold-as-status)
const STRETCH_COLOR: Record<string, string> = {
  rigid: '#9E4B3C', // structured / clay-red
  moderate: '#C08A2E', // mid / amber
  stretchy: '#5C7A4A', // give / sage-green
}

const STRETCH_WORD: Record<string, string> = {
  rigid: 'rigid',
  moderate: 'moderate',
  stretchy: 'stretchy',
}

// fabric → short material word for the chip phrase
function materialWord(m: BraMaterial): string | null {
  if (m.key_material) {
    const k = m.key_material.toLowerCase()
    if (k.includes('microfiber')) return 'molded' // smooth synthetic reads as molded/smooth
  }
  // dominant fiber + construction → readable phrase
  const pad = (m.padding || '').toLowerCase()
  const cup = (m.cup_shape || m.coverage || '').toLowerCase()
  if (/mould|mold|foam/.test(pad)) return 'molded'
  if (/lace/.test((m.fabric || []).map((f) => f.fiber).join(' ').toLowerCase()))
    return 'lace'
  if (/cotton/.test((m.fabric || []).map((f) => f.fiber).join(' ').toLowerCase()))
    return 'cotton'
  if (m.key_material) return m.key_material.toLowerCase()
  if (cup) return cup
  return null
}

interface MaterialChipProps {
  brand?: string | null
  style?: string | null
  /** Pre-fetched material row (skips the lookup). */
  material?: BraMaterial | null
  hideWhenEmpty?: boolean
  className?: string
}

export default function MaterialChip({
  brand,
  style,
  material,
  hideWhenEmpty = true,
  className,
}: MaterialChipProps) {
  const m = material ?? getMaterial(brand, style)
  const stretch = m?.stretch_estimate?.value

  // nothing useful to show
  if ((!m || !stretch) && hideWhenEmpty) return null
  if (!m) return null

  const word = materialWord(m)
  const stretchLabel = stretch ? STRETCH_WORD[stretch] : null
  const dot = stretch ? STRETCH_COLOR[stretch] : INK
  const phrase = [stretchLabel, word].filter(Boolean).join(' ')
  if (!phrase && hideWhenEmpty) return null

  return (
    <motion.span
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      title={
        m.fabric?.length
          ? m.fabric
              .slice(0, 4)
              .map((f) => `${f.pct}% ${f.fiber}`)
              .join('  ')
          : undefined
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px 3px 7px',
        borderRadius: 999,
        background: 'rgba(26,8,8,0.04)',
        border: '0.5px solid rgba(26,8,8,0.08)',
        fontFamily: 'var(--font-space-mono)',
        fontSize: 10,
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        color: INK,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: dot,
          boxShadow: `0 0 0 2px ${dot}22`,
          flexShrink: 0,
        }}
      />
      <span style={{ opacity: 0.85 }}>{phrase || stretchLabel}</span>
      {m.stretch_estimate?.elastane_pct ? (
        <span
          style={{
            color: GOLD,
            opacity: 0.75,
            fontSize: 9,
          }}
        >
          {m.stretch_estimate.elastane_pct}% el
        </span>
      ) : null}
    </motion.span>
  )
}
