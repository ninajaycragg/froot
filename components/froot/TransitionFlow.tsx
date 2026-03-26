'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface TransitionFlowProps {
  transitionStats: {
    avgCupChange: number
    commonTransitions: string[]
    totalDataPoints: number
  }
  journeys: Array<{
    from: string | null
    to: string | null
    quote: string
    title: string
    emotion: number
    brands: string[]
    shapes: string[]
  }>
  targetSize: string
  sizeRange: string
}

interface ParsedTransition {
  size: string
  count: number
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

function parseTransition(raw: string): ParsedTransition | null {
  const match = raw.match(/^(.+?)\s*\((\d+)\s*people?\)$/i)
  if (!match) return null
  return { size: match[1].trim(), count: parseInt(match[2], 10) }
}

export default function TransitionFlow({
  transitionStats,
  journeys,
  targetSize,
}: TransitionFlowProps) {
  const transitions = useMemo(() => {
    return transitionStats.commonTransitions
      .map(parseTransition)
      .filter((t): t is ParsedTransition => t !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [transitionStats.commonTransitions])

  const featuredJourney = useMemo(() => {
    return journeys
      .filter((j) => j.from && j.to && j.quote)
      .sort((a, b) => b.emotion - a.emotion)[0] || null
  }, [journeys])

  if (transitions.length === 0 && !featuredJourney) return null

  const maxCount = transitions.length > 0 ? transitions[0].count : 1

  return (
    <div style={{
      width: '100%',
      maxWidth: 480,
      marginBottom: 56,
    }}>
      {/* Header */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'rgba(26,8,8,0.35)',
          margin: 0,
          marginBottom: 4,
        }}
      >
        the journey to {targetSize}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: 9,
          color: 'rgba(26,8,8,0.2)',
          margin: 0,
          marginBottom: 28,
          lineHeight: 1.6,
        }}
      >
        how people found this size range
      </motion.p>

      {/* Flow Visualization */}
      {transitions.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 24,
        }}>
          {transitions.map((t, i) => {
            const widthFraction = 0.35 + 0.65 * (t.count / maxCount)

            return (
              <motion.div
                key={t.size}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.2 + i * 0.15,
                  duration: 0.5,
                  ease: EASE,
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                {/* From size pill */}
                <div style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#1A0808',
                  background: 'rgba(26,8,8,0.04)',
                  borderRadius: 100,
                  padding: '5px 12px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minWidth: 48,
                  textAlign: 'center',
                }}>
                  {t.size}
                </div>

                {/* Flow line */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 6px',
                  position: 'relative',
                  minWidth: 40,
                }}>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      delay: 0.35 + i * 0.15,
                      duration: 0.6,
                      ease: EASE,
                    }}
                    style={{
                      width: `${widthFraction * 100}%`,
                      height: 1.5,
                      background: `linear-gradient(90deg, rgba(26,8,8,0.08), rgba(212,160,32,${0.2 + 0.3 * (t.count / maxCount)}))`,
                      borderRadius: 1,
                      transformOrigin: 'left center',
                    }}
                  />
                  {/* Count label */}
                  <span style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: 8,
                    color: 'rgba(26,8,8,0.2)',
                    marginLeft: 6,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {t.count}
                  </span>
                </div>

                {/* Arrow tip */}
                <div style={{
                  width: 0,
                  height: 0,
                  borderTop: '3px solid transparent',
                  borderBottom: '3px solid transparent',
                  borderLeft: '4px solid rgba(212,160,32,0.3)',
                  flexShrink: 0,
                  marginRight: 8,
                }} />
              </motion.div>
            )
          })}

          {/* Target size badge (right side) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.2 + transitions.length * 0.15 + 0.1,
              duration: 0.5,
              ease: EASE,
            }}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 4,
            }}
          >
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0px rgba(212,160,32,0)',
                  '0 0 0 6px rgba(212,160,32,0.08)',
                  '0 0 0 0px rgba(212,160,32,0)',
                ],
              }}
              transition={{
                delay: 0.2 + transitions.length * 0.15 + 0.4,
                duration: 1.2,
                ease: 'easeOut',
              }}
              style={{
                fontFamily: 'var(--font-dm-serif), Georgia, serif',
                fontStyle: 'italic',
                fontSize: 22,
                color: '#D4A020',
                background: 'rgba(212,160,32,0.06)',
                borderRadius: 14,
                padding: '8px 20px',
                letterSpacing: '0.02em',
              }}
            >
              {targetSize}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Stat line */}
      {transitionStats.totalDataPoints > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: transitions.length > 0 ? 0.2 + transitions.length * 0.15 + 0.6 : 0.3,
            duration: 0.4,
          }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 9,
            color: 'rgba(26,8,8,0.2)',
            margin: 0,
            marginBottom: 28,
            letterSpacing: '0.03em',
          }}
        >
          {transitionStats.totalDataPoints.toLocaleString()} size journeys tracked
        </motion.p>
      )}

      {/* Featured quote */}
      {featuredJourney && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: transitions.length > 0 ? 0.2 + transitions.length * 0.15 + 0.8 : 0.5,
            duration: 0.6,
            ease: EASE,
          }}
          style={{
            borderLeft: '2px solid rgba(212,160,32,0.3)',
            paddingLeft: 20,
            marginBottom: 0,
          }}
        >
          {/* From → To label */}
          <p style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 9,
            color: 'rgba(26,8,8,0.25)',
            margin: 0,
            marginBottom: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {featuredJourney.from}
            <span style={{ margin: '0 6px', color: 'rgba(26,8,8,0.12)' }}>&rarr;</span>
            {featuredJourney.to}
          </p>

          {/* Quote */}
          <p style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'rgba(26,8,8,0.55)',
            lineHeight: 1.65,
            margin: 0,
            marginBottom: 10,
          }}>
            &ldquo;{featuredJourney.quote}&rdquo;
          </p>

          {/* Attribution */}
          <p style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 8,
            color: 'rgba(26,8,8,0.15)',
            margin: 0,
            letterSpacing: '0.04em',
          }}>
            r/ABraThatFits
          </p>
        </motion.div>
      )}
    </div>
  )
}
