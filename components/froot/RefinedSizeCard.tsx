'use client'

import { motion } from 'framer-motion'
import type { RefinedSize } from './beliefEngine'
import ConfidenceMeter from './ConfidenceMeter'

interface RefinedSizeCardProps {
  /** the engine's sharpened belief, live from profile.refinedSize */
  refined: RefinedSize
  /** poppy-red house accent */
  accent?: string
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const INK = '#1A0808'
const BONE = '#FAF6EE'

/**
 * The refined-size reveal. Sits beneath the calculator's one-shot answer and
 * shows the size SHARPENED by the bras a person owns: the size big, a
 * confidence meter, the band/cup uncertainty range, sister sizes, and how many
 * owned bras informed it. Sharpens with every bra added. Presentational only —
 * pass `refined` (profile.refinedSize).
 */
export default function RefinedSizeCard({
  refined,
  accent = '#C5352C',
}: RefinedSizeCardProps) {
  const { sizeUK, bandSize, cupUK, sisters, bandRange, cupRange, confidence, nPings } = refined

  const [bandLo, bandHi] = bandRange
  const [cupLo, cupHi] = cupRange
  const bandSpans = bandLo !== bandHi
  const cupSpans = cupLo !== cupHi
  const needsMore = nPings < 2

  const bandLabel = bandSpans ? `${bandLo}–${bandHi}` : `${bandSize}`
  const cupLabel = cupSpans ? `${cupLo}–${cupHi}` : cupUK

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: EASE }}
      style={{
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto 72px',
        position: 'relative',
        borderRadius: '20px',
        padding: '28px 24px',
        // warm bone card with subtle depth — physical, not flat
        background: `linear-gradient(165deg, ${BONE} 0%, #F3ECDD 100%)`,
        border: '1px solid rgba(26,8,8,0.08)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 44px -28px rgba(26,8,8,0.45), 0 2px 8px -4px rgba(26,8,8,0.18)',
      }}
    >
      {/* thin accent seam at the top — the "sharpened" signal */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '24px',
          right: '24px',
          height: '2px',
          borderRadius: '0 0 999px 999px',
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.7,
        }}
      />

      {/* eyebrow */}
      <p
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '8px',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: '14px',
          textAlign: 'center',
        }}
      >
        sharpened by {nPings} {nPings === 1 ? 'bra you own' : 'bras you own'}
      </p>

      {/* the sharpened size */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <motion.h3
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
          style={{
            fontFamily: 'var(--font-dm-serif)',
            fontSize: 'clamp(44px, 9vw, 64px)',
            color: INK,
            fontWeight: 400,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {sizeUK}
        </motion.h3>
      </div>

      {/* range as an uncertainty band */}
      <p
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: '9px',
          letterSpacing: '0.06em',
          color: 'rgba(26,8,8,0.4)',
          textAlign: 'center',
          marginBottom: '22px',
        }}
      >
        band {bandLabel} &middot; cup {cupLabel}
      </p>

      {/* confidence meter */}
      <div style={{ marginBottom: '20px' }}>
        <ConfidenceMeter confidence={confidence} accent={accent} delay={0.25} />
      </div>

      {/* sister sizes */}
      {sisters.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '8px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.3)',
              alignSelf: 'center',
            }}
          >
            sisters
          </span>
          {sisters.map((s) => (
            <span
              key={s}
              style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: '11px',
                color: INK,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(26,8,8,0.05)',
                border: '1px solid rgba(26,8,8,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* the living message / gentle nudge */}
      <div
        style={{
          borderTop: '1px solid rgba(26,8,8,0.08)',
          paddingTop: '16px',
        }}
      >
        {needsMore ? (
          <p
            style={{
              fontFamily: 'var(--font-dm-serif)',
              fontSize: '14px',
              lineHeight: 1.5,
              color: accent,
              textAlign: 'center',
            }}
          >
            add one more bra you own and we lock this in.
          </p>
        ) : (
          <p
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: '9px',
              letterSpacing: '0.04em',
              lineHeight: 1.7,
              color: 'rgba(26,8,8,0.45)',
              textAlign: 'center',
            }}
          >
            sharpens with every bra you add
          </p>
        )}
      </div>
    </motion.div>
  )
}
