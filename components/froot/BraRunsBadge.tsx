'use client'

// ── Bra "personality" badge ──
// A small, tactile pill that tells you how a brand's sizing behaves before you
// buy: "runs small — size up", "true to size", or "runs big — size down". The
// verdict comes from getBraRuns(brand), which folds the community's real fit
// reports (size-migration journeys) into a per-brand IRT-style runs-small /
// runs-big parameter. Hover/focus reveals a tooltip that says how many reports
// backed the call, so the number — not vibes — earns the badge its authority.
//
// Warm-cinematic, house palette (no gold): poppy-red = size up, sage = true to
// size, terracotta = size down. Missing brands degrade to a quiet "no fit
// reports yet" chip (or render nothing, if you pass hideWhenEmpty).

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getBraRuns, type BraRunsResult } from '@/lib/braRuns'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const INK = '#1A0808'
const BONE = '#FAF6EE'

type Verdict = {
  text: string
  fg: string
  bg: string
  ring: string
  dot: string
  detail: string
}

function verdictFor(runs: BraRunsResult): Verdict {
  // Signed magnitude in the same space inferBraRuns scored on: cup steps weigh
  // full, band inches half. Positive → body bigger than label → runs small.
  const signed = runs.cup + runs.band / 2

  if (runs.label === 'runs small') {
    const cups = Math.max(1, Math.round(runs.cup))
    return {
      text: 'runs small — size up',
      fg: '#8E2018',
      bg: 'rgba(216,57,43,0.14)',
      ring: 'rgba(216,57,43,0.4)',
      dot: '#D8392B',
      detail:
        `In the community's fit reports, people who wore this brand ended up about ` +
        `${cups} cup${cups === 1 ? '' : 's'} bigger than the label — it tends to run small, so size up.`,
    }
  }
  if (runs.label === 'runs big') {
    const cups = Math.max(1, Math.round(Math.abs(signed)))
    return {
      text: 'runs big — size down',
      fg: '#7A3A1A',
      bg: 'rgba(188,91,62,0.15)',
      ring: 'rgba(188,91,62,0.42)',
      dot: '#BC5B3E',
      detail:
        `Fit reports show this brand needs less of a size jump than the typical brand — ` +
        `roughly ${cups} step${cups === 1 ? '' : 's'} gentler — so it tends to run big. Try sizing down.`,
    }
  }
  return {
    text: 'true to size',
    fg: '#235247',
    bg: 'rgba(62,140,114,0.13)',
    ring: 'rgba(62,140,114,0.4)',
    dot: '#3E8C72',
    detail:
      `The community's fit reports land right where the label says — this brand tends to fit true to size.`,
  }
}

export interface BraRunsBadgeProps {
  /** Brand name (any casing) — looked up against the community fit-report table. */
  brand: string | undefined | null
  /** Hide entirely when there's no data, instead of showing the "no reports" chip. */
  hideWhenEmpty?: boolean
  /** Optional sizing pass-through for layout. */
  className?: string
}

export default function BraRunsBadge({ brand, hideWhenEmpty, className }: BraRunsBadgeProps) {
  const [open, setOpen] = useState(false)
  const runs = getBraRuns(brand)

  // ── No data for this brand ──
  if (!runs) {
    if (hideWhenEmpty || !brand) return null
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(26,8,8,0.45)',
          background: 'rgba(26,8,8,0.05)',
          border: '1px solid rgba(26,8,8,0.1)',
          whiteSpace: 'nowrap',
        }}
      >
        no fit reports yet
      </span>
    )
  }

  const v = verdictFor(runs)
  const reports = `${runs.n} real fit report${runs.n === 1 ? '' : 's'}`

  return (
    <span
      className={className}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <motion.button
        type="button"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        aria-label={`${v.text} — based on ${reports}`}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 12px',
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: v.fg,
          // gradient + layered shadow → tactile pill, not a flat fill
          background: `linear-gradient(180deg, ${v.bg}, rgba(255,255,255,0.25)), ${BONE}`,
          border: `1px solid ${v.ring}`,
          boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 3px rgba(26,8,8,0.12)',
          cursor: 'help',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: v.dot,
            boxShadow: `0 0 0 3px ${v.bg}`,
            flexShrink: 0,
          }}
        />
        {v.text}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              width: 'max-content',
              maxWidth: 260,
              padding: '10px 12px',
              borderRadius: 12,
              background: INK,
              color: BONE,
              fontSize: 12,
              lineHeight: 1.45,
              letterSpacing: '0.01em',
              textTransform: 'none',
              fontWeight: 400,
              boxShadow: '0 8px 24px rgba(26,8,8,0.35)',
              pointerEvents: 'none',
            }}
          >
            {v.detail}
            <span
              style={{
                display: 'block',
                marginTop: 6,
                fontSize: 10.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(250,246,238,0.55)',
              }}
            >
              from {reports}
            </span>
            {/* little pointer down to the pill */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `6px solid ${INK}`,
              }}
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
