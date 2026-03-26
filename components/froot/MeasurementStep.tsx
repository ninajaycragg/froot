'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import MeasurementGuide from './MeasurementGuide'

interface MeasurementStepProps {
  stepNumber: number
  stepKey: string
  title: string
  instruction: string
  unit: 'in' | 'cm'
  value: number | null
  onNext: (value: number) => void
}

export default function MeasurementStep({
  stepNumber,
  stepKey,
  title,
  instruction,
  unit,
  value,
  onNext,
}: MeasurementStepProps) {
  const [input, setInput] = useState(value ? String(value) : '')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(input)
    if (isNaN(num) || num <= 0) {
      setError('enter a valid measurement')
      return
    }
    const minVal = unit === 'cm' ? 50 : 20
    const maxVal = unit === 'cm' ? 170 : 65
    if (num < minVal || num > maxVal) {
      setError(`expected between ${minVal}\u2013${maxVal} ${unit}`)
      return
    }
    setError('')
    onNext(num)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontSize: 'clamp(56px, 10vw, 80px)',
          color: 'rgba(26,8,8,0.05)',
          fontWeight: 400,
          lineHeight: 1,
          marginBottom: '4px',
          userSelect: 'none',
        }}
      >
        {String(stepNumber).padStart(2, '0')}
      </motion.span>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 4vw, 30px)',
          color: '#1A0808',
          fontWeight: 400,
          marginBottom: '20px',
        }}
      >
        {title}
      </motion.h2>

      <MeasurementGuide step={stepKey} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '11px',
          lineHeight: 1.9,
          color: 'rgba(26,8,8,0.5)',
          maxWidth: '360px',
          marginBottom: '32px',
        }}
      >
        {instruction}
      </motion.p>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <input
            ref={inputRef}
            type="number"
            step="0.25"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError('') }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="\u2014"
            style={{
              fontFamily: 'var(--font-dm-serif), Georgia, serif',
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontStyle: 'italic',
              color: '#1A0808',
              background: 'transparent',
              border: 'none',
              borderBottom: focused ? '2px solid #D4A020' : '1.5px solid rgba(26,8,8,0.15)',
              outline: 'none',
              width: '120px',
              textAlign: 'center',
              padding: '4px 0',
              caretColor: '#D4A020',
              transition: 'border-color 0.3s ease',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '12px',
            color: '#8A7060',
            letterSpacing: '0.08em',
          }}>
            {unit}
          </span>
        </div>

        {error && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '10px',
              color: '#C5352C',
              letterSpacing: '0.05em',
            }}
          >
            {error}
          </motion.span>
        )}

        <motion.button
          type="submit"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '11px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '12px 40px',
            marginTop: '8px',
            border: 'none',
            borderRadius: '24px',
            background: '#1A0808',
            color: '#FAF6EE',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(26,8,8,0.12)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,8,8,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,8,8,0.12)'
          }}
        >
          Next
        </motion.button>
      </motion.form>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}
