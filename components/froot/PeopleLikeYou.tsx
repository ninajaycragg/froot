'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StoryJourney {
  from: string | null
  to: string | null
  quote: string
  title: string
  emotion: number
  brands: string[]
  shapes: string[]
}

interface StoryQuote {
  text: string
  emotion: number
  shapes: string[]
}

interface PeopleLikeYouProps {
  journeys: StoryJourney[]
  quotes: StoryQuote[]
  sizeRange: string
  totalMentions: number
  oldSize?: string
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function PeopleLikeYou({
  journeys,
  quotes,
  sizeRange,
  totalMentions,
  oldSize,
}: PeopleLikeYouProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)

  // Sort quotes by emotion descending
  const sortedQuotes = useMemo(
    () => [...quotes].sort((a, b) => b.emotion - a.emotion),
    [quotes],
  )

  // Find the best featured journey
  const featuredJourney = useMemo(() => {
    if (journeys.length === 0) return null

    // Prefer a journey whose `from` matches the user's old size
    if (oldSize) {
      const match = journeys
        .filter((j) => j.from && j.from.toLowerCase() === oldSize.toLowerCase())
        .sort((a, b) => b.emotion - a.emotion)[0]
      if (match) return match
    }

    // Otherwise pick the highest-emotion journey
    return [...journeys].sort((a, b) => b.emotion - a.emotion)[0]
  }, [journeys, oldSize])

  // Auto-rotate quotes every 5 seconds
  useEffect(() => {
    if (sortedQuotes.length <= 1) return
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % sortedQuotes.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [sortedQuotes.length])

  // Nothing to show
  if (journeys.length === 0 && sortedQuotes.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        maxWidth: 480,
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        marginBottom: 56,
      }}
    >
      {/* ── Header ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-dm-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'rgba(212,160,32,0.55)',
          marginBottom: 24,
        }}
      >
        people like you
      </motion.p>

      {/* ── Featured Journey ── */}
      {featuredJourney && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
          style={{
            padding: '28px 24px',
            borderRadius: 16,
            background: 'rgba(26,8,8,0.015)',
            marginBottom: 24,
          }}
        >
          {/* Size transition */}
          {featuredJourney.from && featuredJourney.to && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: 13,
                  color: 'rgba(26,8,8,0.35)',
                  letterSpacing: '0.04em',
                }}
              >
                {featuredJourney.from}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: 10,
                  color: 'rgba(26,8,8,0.2)',
                  letterSpacing: '0.08em',
                }}
              >
                &rarr;
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: 13,
                  color: '#D4A020',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {featuredJourney.to}
              </span>
            </motion.div>
          )}

          {/* Quote */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: EASE }}
            style={{
              fontFamily: 'var(--font-dm-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              lineHeight: 1.6,
              color: '#1A0808',
              marginBottom: 16,
            }}
          >
            &ldquo;{featuredJourney.quote}&rdquo;
          </motion.p>

          {/* Attribution */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: 9,
              color: 'rgba(26,8,8,0.2)',
              letterSpacing: '0.06em',
            }}
          >
            from r/ABraThatFits
          </motion.p>
        </motion.div>
      )}

      {/* ── Quote Carousel ── */}
      {sortedQuotes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: featuredJourney ? 0.8 : 0.3, duration: 0.5, ease: EASE }}
          style={{
            padding: '24px',
            borderRadius: 16,
            background: 'rgba(212,160,32,0.04)',
            marginBottom: 20,
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', minHeight: 80 }}>
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: EASE }}
                style={{
                  fontFamily: 'var(--font-dm-serif)',
                  fontStyle: 'italic',
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: '#1A0808',
                }}
              >
                &ldquo;{sortedQuotes[quoteIndex].text}&rdquo;
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Position indicator */}
          {sortedQuotes.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
              }}
            >
              {/* Dots */}
              <div style={{ display: 'flex', gap: 5 }}>
                {sortedQuotes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setQuoteIndex(i)}
                    style={{
                      width: i === quoteIndex ? 14 : 5,
                      height: 5,
                      borderRadius: 3,
                      background:
                        i === quoteIndex ? '#D4A020' : 'rgba(26,8,8,0.1)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* Counter */}
              <span
                style={{
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: 9,
                  color: 'rgba(26,8,8,0.2)',
                  letterSpacing: '0.06em',
                }}
              >
                {quoteIndex + 1} of {sortedQuotes.length}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Social Proof Stat ── */}
      {totalMentions > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: featuredJourney ? 1.0 : sortedQuotes.length > 0 ? 0.6 : 0.3,
            duration: 0.4,
          }}
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: 10,
            color: 'rgba(26,8,8,0.25)',
            letterSpacing: '0.04em',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          {totalMentions.toLocaleString()} conversations in your size range
        </motion.p>
      )}
    </motion.div>
  )
}
