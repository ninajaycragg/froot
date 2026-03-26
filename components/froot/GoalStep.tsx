'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AestheticGoal } from './sizing'

interface GoalStepProps {
  onNext: (goal: AestheticGoal) => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const GOALS: { value: AestheticGoal; title: string; desc: string }[] = [
  {
    value: 'lifted',
    title: 'Lift me up',
    desc: 'perky, defies gravity, rounded',
  },
  {
    value: 'cleavage',
    title: 'All about cleavage',
    desc: 'pushed together, deep V, centered',
  },
  {
    value: 'natural',
    title: 'Keep it natural',
    desc: 'my shape, just supported',
  },
  {
    value: 'smooth',
    title: 'Smooth me out',
    desc: 'invisible under clothes, no lines',
  },
  {
    value: 'comfortable',
    title: 'Just comfy',
    desc: 'all-day ease, forget it\u2019s there',
  },
]

export default function GoalStep({ onNext }: GoalStepProps) {
  const [selected, setSelected] = useState<AestheticGoal | null>(null)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '40px 24px',
    }}>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(24px, 5vw, 34px)',
          color: '#1A0808',
          fontWeight: 400,
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        What are you going for?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '11px',
          color: 'rgba(26,8,8,0.35)',
          marginBottom: '44px',
          textAlign: 'center',
          letterSpacing: '0.02em',
          lineHeight: 1.7,
          maxWidth: '340px',
        }}
      >
        fit is one thing &mdash; how you want to look is another
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: EASE }}
        style={{ maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {GOALS.map((goal, i) => {
          const isSelected = selected === goal.value
          return (
            <motion.button
              key={goal.value}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.35, ease: EASE }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelected(goal.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                padding: '18px 20px',
                borderRadius: '14px',
                border: 'none',
                background: isSelected ? '#1A0808' : 'rgba(26,8,8,0.02)',
                boxShadow: isSelected ? '0 4px 16px rgba(26,8,8,0.15)' : '0 1px 3px rgba(26,8,8,0.04)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-dm-serif), Georgia, serif',
                fontStyle: 'italic',
                fontSize: '16px',
                color: isSelected ? '#FAF6EE' : '#1A0808',
                fontWeight: 400,
                transition: 'color 0.3s ease',
              }}>
                {goal.title}
              </span>
              <span style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '10px',
                color: isSelected ? 'rgba(250,246,238,0.5)' : 'rgba(26,8,8,0.3)',
                letterSpacing: '0.02em',
                transition: 'color 0.3s ease',
              }}>
                {goal.desc}
              </span>
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
          marginTop: '40px',
          border: 'none',
          borderRadius: '28px',
          background: selected ? '#D4A020' : 'rgba(212,160,32,0.15)',
          color: selected ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
          cursor: selected ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          boxShadow: selected ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
        }}
      >
        Find my bras
      </motion.button>
    </div>
  )
}
