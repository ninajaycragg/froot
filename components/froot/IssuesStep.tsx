'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface IssuesStepProps {
  onNext: (issues: string[]) => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const OPTIONS = [
  { value: 'straps_falling', label: 'Straps won\u2019t stay put' },
  { value: 'wire_pain', label: 'Underwire digs in or sits on tissue' },
  { value: 'gore_not_flat', label: 'Center gore doesn\u2019t lay flat' },
  { value: 'band_rides_up', label: 'Band rides up in back' },
  { value: 'none', label: 'None of these \u2014 lucky me' },
]

export default function IssuesStep({ onNext }: IssuesStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (value === 'none') return new Set(['none'])
      next.delete('none')
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const canProceed = selected.size > 0

  function handleSubmit() {
    if (!canProceed) return
    onNext(selected.has('none') ? [] : Array.from(selected))
  }

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
        04
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
        Sound familiar?
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
        select anything that resonates &mdash; these help us narrow things down
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
        style={{ maxWidth: '400px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {OPTIONS.map((opt) => {
          const isSelected = selected.has(opt.value)
          return (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => toggle(opt.value)}
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
        onClick={handleSubmit}
        disabled={!canProceed}
        whileHover={canProceed ? { scale: 1.04 } : undefined}
        whileTap={canProceed ? { scale: 0.97 } : undefined}
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
          background: canProceed ? '#D4A020' : 'rgba(212,160,32,0.15)',
          color: canProceed ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
          cursor: canProceed ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          boxShadow: canProceed ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
        }}
      >
        Next
      </motion.button>
    </div>
  )
}
