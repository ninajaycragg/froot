'use client'

import { motion, AnimatePresence } from 'framer-motion'
import BraRunsBadge from './BraRunsBadge'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// House palette (warm poppy-red / bone — NOT the file's gold)
const BONE = '#FAF6EE'
const INK = '#1A0808'
const POPPY = '#C5352C'

// ── The owned-bra feed: each rating is a "ping" the radar refines on. ──
// One bra reads, two bras triangulate. The copy below makes that product rule
// felt — the shelf nudges toward the second bra, then keeps the streak warm.
export interface OwnedBra {
  id: string
  brand: string
  style: string
  size: string
  rating: 'perfect' | 'good' | 'okay' | 'bad'
  bandFit?: string
  cupFit?: string
  notes?: string
  createdAt: string
}

interface BraShelfProps {
  /** the user's owned-bra ratings (profile.fitFeedback) */
  feedback: OwnedBra[]
  /** open the add-a-bra flow (integrator wires this to FitFeedbackModal) */
  onAddBra: () => void
  /** how many of those ratings actually informed the belief (refinedSize.nPings) */
  nPings?: number
}

// A single, plain-language fit verdict distilled from rating + band/cup signals.
function fitVerdict(b: OwnedBra): { label: string; tone: 'good' | 'mixed' | 'off' } {
  if (b.rating === 'perfect') return { label: 'fits perfectly', tone: 'good' }

  const band = b.bandFit && b.bandFit !== 'good'
    ? b.bandFit === 'too_tight' ? 'band tight' : 'band loose'
    : null
  const cup = b.cupFit && b.cupFit !== 'good'
    ? b.cupFit === 'too_small' ? 'cups small' : 'cups big'
    : null

  if (band || cup) {
    const parts = [band, cup].filter(Boolean) as string[]
    return { label: parts.join(' · '), tone: b.rating === 'bad' ? 'off' : 'mixed' }
  }

  if (b.rating === 'good') return { label: 'good fit', tone: 'good' }
  if (b.rating === 'okay') return { label: 'wearable', tone: 'mixed' }
  return { label: "didn't work", tone: 'off' }
}

const TONE: Record<'good' | 'mixed' | 'off', { fg: string; bg: string }> = {
  good: { fg: POPPY, bg: 'rgba(197,53,44,0.08)' },
  mixed: { fg: 'rgba(26,8,8,0.55)', bg: 'rgba(26,8,8,0.05)' },
  off: { fg: 'rgba(26,8,8,0.4)', bg: 'rgba(26,8,8,0.035)' },
}

// The product rule made into a sentence: 0 → ask, 1 → push for the second,
// 2+ → the radar is real and sharpening.
function progressCopy(n: number): { lead: string; sub: string } {
  if (n <= 0) {
    return {
      lead: 'tell froot a bra you already own',
      sub: 'one bra in your drawer is one real reading of your true size',
    }
  }
  if (n === 1) {
    return {
      lead: '1 bra in — add another to sharpen your size',
      sub: 'two bras let froot triangulate; the guess becomes a reading',
    }
  }
  return {
    lead: `${n} bras read — your size is sharpening`,
    sub: 'every bra you add pulls the estimate tighter',
  }
}

export default function BraShelf({ feedback, onAddBra, nPings }: BraShelfProps) {
  const bras = feedback ?? []
  const count = typeof nPings === 'number' ? nPings : bras.length
  const copy = progressCopy(count)

  // progress toward "real intelligence" at 2 owned bras
  const filled = Math.min(count, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      style={{
        borderRadius: '20px',
        background: `linear-gradient(160deg, ${BONE} 0%, #F4EDDF 100%)`,
        boxShadow: '0 8px 28px rgba(26,8,8,0.07), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(26,8,8,0.04)',
        padding: '24px 22px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* poppy hairline along the top edge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${POPPY} 30%, #E0594F 50%, ${POPPY} 70%, transparent)`,
        opacity: 0.55,
      }} />

      {/* ── Header: title + the radar progress dots ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <p style={{
          fontFamily: 'var(--font-space-mono)', fontSize: '8px',
          letterSpacing: '0.26em', textTransform: 'uppercase',
          color: 'rgba(26,8,8,0.4)',
        }}>
          Bras you own
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} title={`${count} bra${count === 1 ? '' : 's'} feeding your size`}>
          {[0, 1].map(i => (
            <span key={i} style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: i < filled ? POPPY : 'rgba(26,8,8,0.12)',
              boxShadow: i < filled ? '0 0 0 3px rgba(197,53,44,0.12)' : 'none',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {/* ── Progress line ── */}
      <p style={{
        fontFamily: 'var(--font-dm-serif)',
        fontSize: '17px', lineHeight: 1.3, color: INK, marginBottom: '4px',
      }}>
        {copy.lead}
      </p>
      <p style={{
        fontFamily: 'var(--font-space-mono)', fontSize: '9.5px',
        lineHeight: 1.6, color: 'rgba(26,8,8,0.4)', marginBottom: '18px',
      }}>
        {copy.sub}
      </p>

      {/* ── The shelf of owned bras ── */}
      {bras.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <AnimatePresence initial={false}>
            {bras.map((b, i) => {
              const v = fitVerdict(b)
              const styleName = b.style?.replace(/\s*\([^)]*\)\s*$/, '').trim()
              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.4, ease: EASE, delay: Math.min(i * 0.04, 0.2) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', padding: '12px 14px',
                    borderRadius: '13px',
                    background: 'rgba(255,255,255,0.55)',
                    boxShadow: '0 1px 3px rgba(26,8,8,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'var(--font-dm-serif)',
                      fontSize: '14px', color: INK, marginBottom: '2px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {b.brand}{styleName ? <span style={{ color: 'rgba(26,8,8,0.4)' }}> · {styleName}</span> : null}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{
                        fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                        letterSpacing: '0.08em', color: 'rgba(26,8,8,0.35)',
                      }}>
                        {b.size}
                      </p>
                      {/* brand sizing personality — now that brands are catalog-canonical */}
                      <span style={{ display: 'inline-flex', transform: 'scale(0.82)', transformOrigin: 'left center' }}>
                        <BraRunsBadge brand={b.brand} hideWhenEmpty />
                      </span>
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                    letterSpacing: '0.04em', whiteSpace: 'nowrap',
                    color: TONE[v.tone].fg, background: TONE[v.tone].bg,
                    padding: '5px 9px', borderRadius: '999px',
                  }}>
                    {v.label}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── The CTA: add a bra you own ── */}
      <motion.button
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        onClick={onAddBra}
        style={{
          width: '100%', padding: '14px',
          borderRadius: '14px', border: 'none',
          background: bras.length === 0 ? POPPY : 'rgba(197,53,44,0.08)',
          color: bras.length === 0 ? BONE : POPPY,
          fontFamily: 'var(--font-space-mono)', fontSize: '10.5px',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: bras.length === 0
            ? '0 4px 14px rgba(197,53,44,0.28), inset 0 1px 0 rgba(255,255,255,0.18)'
            : 'inset 0 0 0 1px rgba(197,53,44,0.18)',
          transition: 'background 0.2s ease, color 0.2s ease',
        }}
      >
        + add a bra you own
      </motion.button>
    </motion.div>
  )
}
