'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CupFit } from './sizing'

interface CupFitStepProps {
  onNext: (fit: CupFit) => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const OPTIONS: { value: CupFit; label: string }[] = [
  { value: 'spilling', label: 'Spilling over the top' },
  { value: 'gaping', label: 'Gaps or wrinkles at the top' },
  { value: 'too_shallow', label: 'Cups feel too flat for me' },
  { value: 'good', label: 'Cups fit pretty well, actually' },
]

export default function CupFitStep({ onNext }: CupFitStepProps) {
  const [selected, setSelected] = useState<CupFit | null>(null)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '40px 24px',
    }}>
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(56px, 10vw, 80px)',
          color: 'rgba(26,8,8,0.04)',
          fontWeight: 400,
          lineHeight: 1,
          marginBottom: '4px',
          userSelect: 'none',
        }}
      >
        03
      </motion.span>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 4vw, 30px)',
          color: '#1A0808',
          fontWeight: 400,
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        And the cups?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '11px',
          color: 'rgba(26,8,8,0.4)',
          marginBottom: '40px',
          textAlign: 'center',
          letterSpacing: '0.02em',
          lineHeight: 1.7,
          maxWidth: '340px',
        }}
      >
        picture the bra you reach for most &mdash; be honest, we&apos;ve all been there
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
        style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value
          return (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => setSelected(opt.value)}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '12px',
                padding: '16px 20px',
                borderRadius: '12px',
                border: 'none',
                background: isSelected ? '#1A0808' : 'rgba(26,8,8,0.025)',
                boxShadow: isSelected ? '0 2px 8px rgba(26,8,8,0.15)' : '0 1px 3px rgba(26,8,8,0.04)',
                color: isSelected ? '#FAF6EE' : 'rgba(26,8,8,0.6)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                textAlign: 'left',
                letterSpacing: '0.02em',
                lineHeight: 1.5,
              }}
            >
              {opt.label}
            </motion.button>
          )
        })}
      </motion.div>

      <motion.button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        whileHover={selected ? { scale: 1.04 } : undefined}
        whileTap={selected ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '14px 48px',
          marginTop: '44px',
          border: 'none',
          borderRadius: '28px',
          background: selected ? '#D4A020' : 'rgba(212,160,32,0.15)',
          color: selected ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
          cursor: selected ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          boxShadow: selected ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
        }}
      >
        Next
      </motion.button>
    </div>
  )
}
