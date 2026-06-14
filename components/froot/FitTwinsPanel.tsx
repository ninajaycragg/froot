'use client'

// ──────────────────────────────────────────────────────────────────────────
// FitTwinsPanel — "people built like you converged on these"
//
// The collaborative-filtering payoff rendered as a RANKED shortlist of bras,
// not a quote wall. Sits beside PeopleLikeYou in FrootResults. Each row is a
// brand people in the user's (band|cup) neighborhood landed on / praised, with
// a confidence bar (graded 2026 color coding), a people-count, and a one-line
// why. Data comes from lib/fitTwins.ts → fitTwinsFor({band, cupIndex, shape}).
//
// Palette: established Froot UI — bone #FAF6EE, ink #1A0808, gold accent
// #D4A020. NO italics. Mobile-first; scrolls at 375px.
// ──────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion'

export interface FitTwin {
  brand: string
  score: number
  n: number
  fitRate: number
  landed: number
  why: string
  shapes: string[]
  shapeMatch: boolean
}

interface FitTwinsPanelProps {
  twins: FitTwin[]
  /** the user's size, e.g. "32D" — shown in the header */
  size?: string
  /** neighborhood label e.g. "32-34|D-DD" (optional, for the subhead) */
  bucket?: string
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const INK = '#1A0808'

// ── 2026 graded fit-confidence color coding ─────────────────────────────────
// A continuous warm→green ramp keyed to fitRate: low confidence reads amber,
// strong consensus reads a calm sage-green. Distinct hues per band so the eye
// grades the list at a glance (not one flat accent).
function gradeColor(fitRate: number): { fill: string; soft: string; label: string } {
  if (fitRate >= 0.92) return { fill: '#3F7A53', soft: 'rgba(63,122,83,0.12)', label: 'strong fit' }
  if (fitRate >= 0.85) return { fill: '#6E9A4E', soft: 'rgba(110,154,78,0.12)', label: 'fits most' }
  if (fitRate >= 0.75) return { fill: '#C99A22', soft: 'rgba(201,154,34,0.13)', label: 'mostly fits' }
  return { fill: '#C5352C', soft: 'rgba(197,53,44,0.10)', label: 'mixed' }
}

function rankAccent(i: number): string {
  // top pick gets the warm gold crown; rest fade into ink.
  if (i === 0) return '#D4A020'
  return 'rgba(26,8,8,0.28)'
}

export default function FitTwinsPanel({ twins, size, bucket }: FitTwinsPanelProps) {
  if (!twins || twins.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
        marginBottom: 56,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ marginBottom: 20 }}
      >
        <p
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(212,160,32,0.7)',
            marginBottom: 8,
          }}
        >
          people built like you
        </p>
        <p
          style={{
            fontFamily: 'var(--font-dm-serif)',
            fontSize: 19,
            lineHeight: 1.35,
            color: INK,
          }}
        >
          the bras they kept{size ? <span style={{ color: 'rgba(26,8,8,0.4)' }}> &middot; {size}</span> : null}
        </p>
      </motion.div>

      {/* ── Ranked list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {twins.map((t, i) => {
          const pct = Math.round(t.fitRate * 100)
          const g = gradeColor(t.fitRate)
          return (
            <motion.div
              key={t.brand}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.45, ease: EASE }}
              style={{
                position: 'relative',
                padding: '16px 18px',
                borderRadius: 14,
                background: i === 0 ? 'rgba(212,160,32,0.05)' : 'rgba(26,8,8,0.018)',
                border: i === 0 ? '1px solid rgba(212,160,32,0.22)' : '1px solid rgba(26,8,8,0.04)',
                overflow: 'hidden',
              }}
            >
              {/* graded confidence wash on the left edge */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: g.fill,
                  opacity: 0.85,
                }}
              />

              {/* top row: rank · brand · pct */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 9,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: rankAccent(i),
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-dm-serif)',
                      fontSize: 17,
                      color: INK,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.brand}
                  </span>
                  {t.shapeMatch && (
                    <span
                      style={{
                        fontFamily: 'var(--font-space-mono)',
                        fontSize: 7.5,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: g.fill,
                        background: g.soft,
                        padding: '2px 6px',
                        borderRadius: 5,
                        flexShrink: 0,
                      }}
                    >
                      your shape
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: g.fill,
                    flexShrink: 0,
                  }}
                >
                  {pct}%
                </span>
              </div>

              {/* graded confidence bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 3,
                  background: g.soft,
                  overflow: 'hidden',
                  marginBottom: 9,
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.7, ease: EASE }}
                  style={{ height: '100%', borderRadius: 3, background: g.fill }}
                />
              </div>

              {/* why + count */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: 10,
                    lineHeight: 1.5,
                    color: 'rgba(26,8,8,0.55)',
                    minWidth: 0,
                  }}
                >
                  {t.why}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: 8.5,
                    letterSpacing: '0.06em',
                    color: 'rgba(26,8,8,0.3)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {t.n}+ like you
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Footer provenance ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 + twins.length * 0.05, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-space-mono)',
          fontSize: 9,
          letterSpacing: '0.04em',
          color: 'rgba(26,8,8,0.25)',
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        ranked from real fit reports{bucket ? ` in ${bucket.replace('|', ' / ')}` : ''} &middot; r/ABraThatFits
      </motion.p>
    </motion.div>
  )
}
