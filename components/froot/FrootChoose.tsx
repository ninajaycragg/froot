'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface FrootChooseProps {
  unit: 'in' | 'cm'
  onUnitChange: (u: 'in' | 'cm') => void
  onMeasure: () => void
  onFitCheck: () => void
  onConvert: () => void
  onDemo?: () => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

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
]

const PROOF_STATS = [
  { value: '265K+', label: 'real measurements' },
  { value: '1,400+', label: 'styles analyzed' },
  { value: '25K+', label: 'community reviews' },
]

export default function FrootChoose({ unit, onUnitChange, onMeasure, onFitCheck, onConvert, onDemo }: FrootChooseProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const actions: Record<string, () => void> = {
    measure: onMeasure,
    fitcheck: onFitCheck,
    convert: onConvert,
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 24px',
    }}>

      {/* ═══════════ HERO — the hook ═══════════ */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        paddingTop: '40px',
        paddingBottom: '20px',
      }}>
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(52px, 9vw, 80px)',
            color: '#1A0808',
            fontWeight: 400,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Froot
        </motion.h1>

        {/* Thin gold accent line */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '32px', opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
          style={{ height: '1.5px', background: '#D4A020', marginBottom: '20px', borderRadius: '1px' }}
        />

        {/* The hook — make it personal, make it urgent */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(18px, 3.5vw, 24px)',
            lineHeight: 1.6,
            color: '#1A0808',
            maxWidth: '380px',
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          80% of women are wearing the wrong bra size
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '11px',
            lineHeight: 2,
            color: 'rgba(26,8,8,0.4)',
            maxWidth: '340px',
            textAlign: 'center',
            letterSpacing: '0.02em',
            marginBottom: '48px',
          }}
        >
          we use your real measurements and shape to match you with bras that actually work — not a generic calculator
        </motion.p>

        {/* Social proof stats */}
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
                fontFamily: 'var(--font-dm-serif), Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(20px, 3vw, 28px)',
                color: '#D4A020',
                fontWeight: 400,
                lineHeight: 1.2,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '8px',
                color: 'rgba(26,8,8,0.25)',
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
          whileHover={{ scale: 1.04, boxShadow: '0 4px 16px rgba(212,160,32,0.25)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onMeasure}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '16px 48px',
            border: 'none',
            borderRadius: '28px',
            background: '#D4A020',
            color: '#FAF6EE',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(212,160,32,0.2)',
            transition: 'all 0.3s ease',
            marginBottom: '14px',
          }}
        >
          Find my size
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            color: 'rgba(26,8,8,0.2)',
            letterSpacing: '0.04em',
          }}
        >
          takes 2 minutes &middot; free &middot; no signup
        </motion.p>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
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
            color: 'rgba(26,8,8,0.25)',
            letterSpacing: '0.1em',
          }}>
            or choose your path
          </span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '14px', color: 'rgba(26,8,8,0.15)' }}
          >
            &#8964;
          </motion.span>
        </motion.div>
      </div>


      {/* ═══════════ PATHS — below the fold ═══════════ */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        paddingTop: '40px',
        paddingBottom: '60px',
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
            fontSize: '16px',
            color: 'rgba(26,8,8,0.35)',
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
                fontFamily: 'var(--font-dm-serif), Georgia, serif',
                fontStyle: 'italic',
                fontSize: '14px',
                color: 'rgba(212,160,32,0.3)',
                minWidth: '24px',
              }}>
                {item.step}
              </span>
              <span style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '11px',
                color: 'rgba(26,8,8,0.45)',
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
            borderRadius: '16px',
            background: 'rgba(212,160,32,0.03)',
            boxShadow: '0 1px 4px rgba(212,160,32,0.06)',
            marginBottom: '56px',
          }}
        >
          <p style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '15px',
            color: '#1A0808',
            marginBottom: '10px',
            lineHeight: 1.5,
          }}>
            This isn&apos;t a calculator that adds 4 inches to your band.
          </p>
          <p style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '10px',
            color: 'rgba(26,8,8,0.4)',
            lineHeight: 1.8,
          }}>
            We weight your bust measurements based on your projection profile, cross-reference community data from 25K+ fitting discussions, and match you against real measured dimensions from 1,400+ bra styles. Your shape matters as much as your size.
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
            fontSize: '16px',
            color: 'rgba(26,8,8,0.35)',
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
                  borderTop: i === 0 ? '1px solid rgba(26,8,8,0.06)' : 'none',
                  borderBottom: '1px solid rgba(26,8,8,0.06)',
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
                  fontSize: '28px',
                  color: isHovered ? 'rgba(212,160,32,0.5)' : 'rgba(26,8,8,0.06)',
                  fontWeight: 400,
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
                    fontSize: 'clamp(18px, 3vw, 22px)',
                    color: isHovered ? '#1A0808' : 'rgba(26,8,8,0.7)',
                    fontWeight: 400,
                    lineHeight: 1.3,
                    transition: 'color 0.3s ease',
                  }}>
                    {path.title}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '10px',
                    color: isHovered ? 'rgba(26,8,8,0.45)' : 'rgba(26,8,8,0.2)',
                    letterSpacing: '0.03em',
                    transition: 'color 0.3s ease',
                  }}>
                    {path.desc}
                  </span>
                </div>
                <motion.span
                  animate={{ x: isHovered ? 6 : 0, opacity: isHovered ? 1 : 0.3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  style={{
                    fontSize: '16px',
                    color: isHovered ? '#D4A020' : 'rgba(26,8,8,0.2)',
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
            border: '1px solid rgba(26,8,8,0.08)',
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
                  background: unit === u ? '#1A0808' : 'transparent',
                  color: unit === u ? '#FAF6EE' : 'rgba(26,8,8,0.3)',
                }}
              >
                {u}
              </button>
            ))}
          </div>
          <span style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            color: 'rgba(26,8,8,0.15)',
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
                color: 'rgba(26,8,8,0.15)',
                letterSpacing: '0.05em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                padding: 0,
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.4)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.15)'}
            >
              or try with sample data
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
