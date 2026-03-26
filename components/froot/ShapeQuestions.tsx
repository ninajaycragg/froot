'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ShapeProfile } from './sizing'

interface ShapeQuestionsProps {
  onNext: (shape: ShapeProfile) => void
}

interface Question {
  key: keyof ShapeProfile
  prompt: string
  options: { value: string; label: string; hint: string }[]
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const questions: Question[] = [
  {
    key: 'projection',
    prompt: 'When you lean forward, how much do your breasts project outward?',
    options: [
      { value: 'projected', label: 'Projected', hint: 'extend out noticeably' },
      { value: 'moderate', label: 'Moderate', hint: 'somewhere in between' },
      { value: 'shallow', label: 'Shallow', hint: 'stay close to chest wall' },
    ],
  },
  {
    key: 'fullness',
    prompt: 'Where does most of your breast tissue sit?',
    options: [
      { value: 'full-on-top', label: 'More on top', hint: 'above the nipple line' },
      { value: 'even', label: 'Even', hint: 'balanced distribution' },
      { value: 'full-on-bottom', label: 'More on bottom', hint: 'below the nipple line' },
    ],
  },
  {
    key: 'rootWidth',
    prompt: 'How far does your breast tissue extend toward your armpits?',
    options: [
      { value: 'narrow', label: 'Narrow', hint: 'stays centered' },
      { value: 'average', label: 'Average', hint: 'in between' },
      { value: 'wide', label: 'Wide', hint: 'extends toward armpit' },
    ],
  },
]

export default function ShapeQuestions({ onNext }: ShapeQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const allAnswered = questions.every((q) => answers[q.key])

  function handleSelect(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!allAnswered) return
    onNext(answers as unknown as ShapeProfile)
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
        07
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
        Almost there &mdash; your shape
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
          maxWidth: '360px',
        }}
      >
        every body is different &mdash; this helps us get really specific about what will work for you
      </motion.p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
        maxWidth: '440px',
        width: '100%',
      }}>
        {questions.map((q, qi) => (
          <motion.div
            key={q.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + qi * 0.1, duration: 0.4, ease: EASE }}
          >
            <p style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '11px',
              lineHeight: 1.7,
              color: 'rgba(26,8,8,0.55)',
              marginBottom: '14px',
              textAlign: 'center',
            }}>
              {q.prompt}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              {q.options.map((opt) => {
                const selected = answers[q.key] === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => handleSelect(q.key, opt.value)}
                    style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      fontSize: '10px',
                      letterSpacing: '0.06em',
                      padding: '10px 18px',
                      borderRadius: '20px',
                      border: 'none',
                      background: selected ? '#1A0808' : 'rgba(26,8,8,0.03)',
                      boxShadow: selected ? '0 2px 8px rgba(26,8,8,0.12)' : '0 1px 3px rgba(26,8,8,0.04)',
                      color: selected ? '#FAF6EE' : '#8A7060',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>{opt.label}</span>
                    <span style={{
                      fontSize: '8px',
                      opacity: selected ? 0.7 : 0.45,
                      letterSpacing: '0.03em',
                    }}>
                      {opt.hint}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        onClick={handleSubmit}
        disabled={!allAnswered}
        whileHover={allAnswered ? { scale: 1.04 } : undefined}
        whileTap={allAnswered ? { scale: 0.97 } : undefined}
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
          background: allAnswered ? '#D4A020' : 'rgba(212,160,32,0.15)',
          color: allAnswered ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
          cursor: allAnswered ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          boxShadow: allAnswered ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
        }}
      >
        See my results
      </motion.button>
    </div>
  )
}
