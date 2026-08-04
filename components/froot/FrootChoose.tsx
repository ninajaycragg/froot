'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface FrootChooseProps {
  unit: 'in' | 'cm'
  onUnitChange: (u: 'in' | 'cm') => void
  onMeasure: () => void
  onFitCheck: () => void
  onConvert: () => void
  onDemo?: () => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// palette — sampled for "The Instrument" direction, not the old cream/red/sage set
const INK = '#15170F'
const PAPER = '#F7F3EA'
const YELLOW = '#E8B923'
const TERRACOTTA = '#B5673F'
const STONE = '#948D7D'

const OPSZ_DISPLAY = "'opsz' 100"
const OPSZ_TEXT = "'opsz' 40"

const PATHS = [
  {
    key: 'measure' as const,
    number: '01',
    title: 'Measure me',
    desc: '6 quick measurements — the gold standard',
  },
  {
    key: 'fitcheck' as const,
    number: '02',
    title: 'I know my size (ish)',
    desc: 'tell us how your current bra fits — no tape needed',
  },
  {
    key: 'convert' as const,
    number: '03',
    title: 'Translate my size',
    desc: 'find your match across 1,400+ styles',
  },
  {
    key: 'lookup' as const,
    number: '04',
    title: 'What’s my size in this?',
    desc: 'look up your size in a specific brand or style',
  },
]

const PROOF_STATS = [
  { value: '265K+', label: 'real measurements' },
  { value: '1,400+', label: 'styles analyzed' },
  { value: '25K+', label: 'community reviews' },
]

export default function FrootChoose({ unit, onUnitChange, onMeasure, onFitCheck, onConvert, onDemo }: FrootChooseProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  // Apple hero-scroll pattern: the hero backdrop scales up slightly and fades
  // as the user scrolls past it, rather than sitting static or auto-animating.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.55])

  const actions: Record<string, () => void> = {
    measure: onMeasure,
    fitcheck: onFitCheck,
    convert: onConvert,
    lookup: () => { window.location.href = '/lookup' },
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
    }}>

      {/* ═══════════ HERO — the hook ═══════════ */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          paddingTop: '40px',
          paddingBottom: '20px',
          paddingLeft: '24px',
          paddingRight: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Hero photo — the single dominant focal ground, Apple hero-scroll pattern.
            Macro tape-measure shot, verified directly against unsplash.com (Unsplash
            License — free for commercial use, no attribution required).
            Photographer: josh A. D. (@mista_j), https://unsplash.com/photos/wTtBtw80erg */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            scale: heroScale,
            opacity: heroOpacity,
            backgroundImage: 'url(/images/hero-tape-measure.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: '30% 55%',
          }}
        />
        {/* Scrim — keeps headline/CTA legible over the photo without flattening it */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'linear-gradient(180deg, rgba(21,23,15,0.72) 0%, rgba(21,23,15,0.15) 30%, rgba(21,23,15,0.25) 55%, rgba(21,23,15,0.9) 100%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontVariationSettings: OPSZ_DISPLAY,
            fontSize: 'clamp(52px, 9vw, 80px)',
            color: PAPER,
            fontWeight: 480,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Froot
        </motion.h1>

        {/* Thin accent line */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '32px', opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
          style={{ height: '1.5px', background: YELLOW, marginBottom: '20px', borderRadius: '1px' }}
        />

        {/* The hook — make it personal, make it a dare */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontVariationSettings: OPSZ_TEXT,
            fontSize: 'clamp(20px, 4vw, 28px)',
            lineHeight: 1.5,
            color: PAPER,
            maxWidth: '400px',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          you&rsquo;re probably not the size you think you are
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '11px',
            lineHeight: 1.9,
            color: 'rgba(247,243,234,0.55)',
            maxWidth: '360px',
            textAlign: 'center',
            letterSpacing: '0.02em',
            marginBottom: '28px',
          }}
        >
          the average woman is 2&ndash;4 cup sizes off. not because your body is wrong &mdash; because the way you were measured is.
        </motion.p>

        {/* Size transformations — the ABTF viral format */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          style={{
            display: 'flex',
            gap: 'clamp(16px, 4vw, 32px)',
            marginBottom: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {['34B → 30DD', '36C → 32F', '38D → 34G'].map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '12px',
                fontVariantNumeric: 'tabular-nums',
                color: YELLOW,
                letterSpacing: '0.05em',
              }}
            >
              {t}
            </motion.span>
          ))}
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            color: 'rgba(247,243,234,0.35)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '40px',
          }}
        >
          these are real.
        </motion.p>

        {/* Social proof stats — real data, so mono + tabular numerals, not decorative serif */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
          style={{
            display: 'flex',
            gap: 'clamp(24px, 5vw, 48px)',
            marginBottom: '48px',
          }}
        >
          {PROOF_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.08, duration: 0.35 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 700,
                fontSize: 'clamp(18px, 2.6vw, 24px)',
                color: YELLOW,
                lineHeight: 1.2,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '8px',
                color: 'rgba(247,243,234,0.4)',
                letterSpacing: '0.06em',
                marginTop: '4px',
                textTransform: 'uppercase',
              }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Primary CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4, ease: EASE }}
          whileHover={{ scale: 1.04, boxShadow: '0 4px 16px rgba(232,185,35,0.3)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onMeasure}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '16px 48px',
            border: 'none',
            borderRadius: '3px',
            background: YELLOW,
            color: '#201A04',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(232,185,35,0.25)',
            transition: 'all 0.3s ease',
            marginBottom: '14px',
          }}
        >
          Find my real size
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            color: 'rgba(247,243,234,0.35)',
            letterSpacing: '0.04em',
          }}
        >
          takes 2 minutes &middot; free &middot; no signup
        </motion.p>

        {/* Quick quiz path */}
        <motion.a
          href="/quiz"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.4 }}
          whileHover={{ color: 'rgba(247,243,234,0.7)' }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '10px',
            color: 'rgba(247,243,234,0.4)',
            letterSpacing: '0.04em',
            marginTop: '20px',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(247,243,234,0.2)',
            paddingBottom: '2px',
            cursor: 'pointer',
          }}
        >
          or find your shape in 10 seconds &rarr;
        </motion.a>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '8px',
            color: 'rgba(247,243,234,0.4)',
            letterSpacing: '0.1em',
          }}>
            or choose your path
          </span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '14px', color: 'rgba(247,243,234,0.3)' }}
          >
            &#8964;
          </motion.span>
        </motion.div>
        </div>
      </div>


      {/* ═══════════ PATHS — below the fold ═══════════ */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        paddingTop: '40px',
        paddingBottom: '60px',
        paddingLeft: '24px',
        paddingRight: '24px',
        background: PAPER,
      }}>
        {/* How it works — quick and editorial */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: '56px' }}
        >
          <p style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontVariationSettings: OPSZ_TEXT,
            fontSize: '16px',
            color: STONE,
            marginBottom: '24px',
          }}>
            How it works
          </p>
          {[
            { step: '01', text: 'You give us measurements or tell us about your current bra' },
            { step: '02', text: 'We map your shape — projection, fullness, root width' },
            { step: '03', text: 'Our algorithm matches you against 265K real bra measurements' },
            { step: '04', text: 'You get your size, your perfect styles, and where to buy them' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'baseline',
                marginBottom: '16px',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '11px',
                color: TERRACOTTA,
                minWidth: '20px',
              }}>
                {item.step}
              </span>
              <span style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '11px',
                color: 'rgba(21,23,15,0.6)',
                lineHeight: 1.7,
              }}>
                {item.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* The "not like other calculators" differentiator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          style={{
            padding: '24px',
            borderRadius: '4px',
            background: 'rgba(232,185,35,0.07)',
            boxShadow: '0 1px 4px rgba(232,185,35,0.08)',
            marginBottom: '56px',
          }}
        >
          <p style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontVariationSettings: OPSZ_TEXT,
            fontSize: '15px',
            color: INK,
            marginBottom: '10px',
            lineHeight: 1.5,
          }}>
            Victoria&apos;s Secret sized you wrong. So did every department store.
          </p>
          <p style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '10px',
            color: 'rgba(21,23,15,0.55)',
            lineHeight: 1.8,
          }}>
            They use the +4 method from the 1950s, which inflates your band and shrinks your cup. We use 6 measurements, your actual shape profile, and 265K data points from real bras. The result is the size you should have been wearing this whole time.
          </p>
        </motion.div>

        {/* Choose your path */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
        >
          <p style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontVariationSettings: OPSZ_TEXT,
            fontSize: '16px',
            color: STONE,
            marginBottom: '16px',
          }}>
            Choose your path
          </p>

          {PATHS.map((path, i) => {
            const isHovered = hovered === path.key
            return (
              <motion.button
                key={path.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                onClick={actions[path.key]}
                onMouseEnter={() => setHovered(path.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '28px 0',
                  borderTop: i === 0 ? '1px solid rgba(21,23,15,0.08)' : 'none',
                  borderBottom: '1px solid rgba(21,23,15,0.08)',
                  borderLeft: 'none',
                  borderRight: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s ease',
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-dm-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontVariationSettings: OPSZ_TEXT,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '28px',
                  color: isHovered ? 'rgba(181,103,63,0.6)' : 'rgba(21,23,15,0.08)',
                  fontWeight: 480,
                  lineHeight: 1,
                  minWidth: '44px',
                  transition: 'color 0.4s ease',
                }}>
                  {path.number}
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-serif), Georgia, serif',
                    fontStyle: 'italic',
                    fontVariationSettings: OPSZ_TEXT,
                    fontSize: 'clamp(18px, 3vw, 22px)',
                    color: isHovered ? INK : 'rgba(21,23,15,0.75)',
                    fontWeight: 480,
                    lineHeight: 1.3,
                    transition: 'color 0.3s ease',
                  }}>
                    {path.title}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '10px',
                    color: isHovered ? 'rgba(21,23,15,0.5)' : 'rgba(21,23,15,0.28)',
                    letterSpacing: '0.03em',
                    transition: 'color 0.3s ease',
                  }}>
                    {path.desc}
                  </span>
                </div>
                <motion.span
                  animate={{ x: isHovered ? 6 : 0, opacity: isHovered ? 1 : 0.35 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{
                    fontSize: '16px',
                    color: isHovered ? TERRACOTTA : 'rgba(21,23,15,0.28)',
                    transition: 'color 0.3s ease',
                    flexShrink: 0,
                  }}
                >
                  &#8594;
                </motion.span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Unit toggle */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '40px',
          gap: '10px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid rgba(21,23,15,0.12)',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            {(['in', 'cm'] as const).map((u) => (
              <button
                key={u}
                onClick={() => onUnitChange(u)}
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  padding: '8px 20px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: unit === u ? INK : 'transparent',
                  color: unit === u ? PAPER : 'rgba(21,23,15,0.4)',
                }}
              >
                {u}
              </button>
            ))}
          </div>
          <span style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            color: 'rgba(21,23,15,0.25)',
            letterSpacing: '0.05em',
          }}>
            for the measurement path
          </span>
        </div>

        {onDemo && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={onDemo}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '9px',
                color: 'rgba(21,23,15,0.25)',
                letterSpacing: '0.05em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: 0,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(21,23,15,0.55)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(21,23,15,0.25)'}
            >
              or try with sample data
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
