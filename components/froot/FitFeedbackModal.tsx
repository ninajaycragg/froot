'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfile } from './FrootProfileContext'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface FitFeedbackModalProps {
  brand: string
  style: string
  size: string
  open: boolean
  onClose: () => void
}

const RATINGS = [
  { value: 'perfect', label: 'Perfect', emoji: '', desc: 'wouldn\'t change a thing' },
  { value: 'good', label: 'Good', emoji: '', desc: 'minor tweaks needed' },
  { value: 'okay', label: 'Okay', emoji: '', desc: 'wearable but not ideal' },
  { value: 'bad', label: 'Nope', emoji: '', desc: 'didn\'t work at all' },
] as const

const BAND_OPTIONS = [
  { value: 'too_tight', label: 'Too tight' },
  { value: 'good', label: 'Just right' },
  { value: 'too_loose', label: 'Too loose' },
]

const CUP_OPTIONS = [
  { value: 'too_small', label: 'Too small' },
  { value: 'good', label: 'Just right' },
  { value: 'too_big', label: 'Too big' },
]

export default function FitFeedbackModal({ brand, style, size, open, onClose }: FitFeedbackModalProps) {
  const { submitFeedback } = useProfile()
  const [rating, setRating] = useState<typeof RATINGS[number]['value'] | null>(null)
  const [bandFit, setBandFit] = useState<string | null>(null)
  const [cupFit, setCupFit] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const styleName = style.replace(/\s*\([^)]*\)\s*$/, '')

  async function handleSubmit() {
    if (!rating || submitting) return
    setSubmitting(true)
    const success = await submitFeedback({
      brand, style, size, rating,
      bandFit: bandFit || undefined,
      cupFit: cupFit || undefined,
      notes: notes.trim() || undefined,
    })
    setSubmitting(false)
    if (success) setDone(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(26,8,8,0.3)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px',
              background: '#FAF6EE',
              borderRadius: '20px',
              boxShadow: '0 16px 48px rgba(26,8,8,0.15)',
              padding: '28px 24px',
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
            }}
          >
            {!done ? (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                      fontSize: '18px', color: '#1A0808', marginBottom: '4px',
                    }}>
                      How did it fit?
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                      color: 'rgba(26,8,8,0.35)',
                    }}>
                      {brand} {styleName} &middot; {size}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                      color: 'rgba(26,8,8,0.25)', padding: '4px 8px',
                    }}
                  >
                    &times;
                  </button>
                </div>

                {/* Overall rating */}
                <div style={{ marginBottom: '20px' }}>
                  <p style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                    color: 'rgba(26,8,8,0.4)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: '10px',
                  }}>
                    Overall fit
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {RATINGS.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setRating(r.value)}
                        style={{
                          flex: 1, padding: '10px 6px',
                          borderRadius: '10px',
                          border: 'none',
                          background: rating === r.value ? 'rgba(212,160,32,0.12)' : 'rgba(26,8,8,0.02)',
                          boxShadow: rating === r.value ? '0 2px 8px rgba(212,160,32,0.1)' : '0 1px 3px rgba(26,8,8,0.03)',
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{
                          fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                          fontSize: '12px',
                          color: rating === r.value ? '#D4A020' : 'rgba(26,8,8,0.5)',
                          display: 'block', marginBottom: '2px',
                        }}>
                          {r.label}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                          color: 'rgba(26,8,8,0.25)',
                        }}>
                          {r.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Band fit */}
                {rating && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '16px' }}
                  >
                    <p style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                      color: 'rgba(26,8,8,0.4)', letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: '8px',
                    }}>
                      Band
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {BAND_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => setBandFit(o.value)}
                          style={{
                            flex: 1, padding: '8px',
                            borderRadius: '8px', border: 'none',
                            background: bandFit === o.value ? 'rgba(212,160,32,0.1)' : 'rgba(26,8,8,0.02)',
                            fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                            color: bandFit === o.value ? '#D4A020' : 'rgba(26,8,8,0.4)',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Cup fit */}
                {rating && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    style={{ marginBottom: '16px' }}
                  >
                    <p style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                      color: 'rgba(26,8,8,0.4)', letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: '8px',
                    }}>
                      Cups
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {CUP_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => setCupFit(o.value)}
                          style={{
                            flex: 1, padding: '8px',
                            borderRadius: '8px', border: 'none',
                            background: cupFit === o.value ? 'rgba(212,160,32,0.1)' : 'rgba(26,8,8,0.02)',
                            fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                            color: cupFit === o.value ? '#D4A020' : 'rgba(26,8,8,0.4)',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Notes */}
                {rating && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ marginBottom: '20px' }}
                  >
                    <p style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                      color: 'rgba(26,8,8,0.4)', letterSpacing: '0.1em',
                      textTransform: 'uppercase', marginBottom: '8px',
                    }}>
                      Anything else? <span style={{ color: 'rgba(26,8,8,0.2)', textTransform: 'none' }}>(optional)</span>
                    </p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. straps were a little long, wires sat perfectly..."
                      maxLength={500}
                      rows={2}
                      style={{
                        width: '100%', padding: '10px 12px',
                        borderRadius: '10px', border: 'none',
                        background: 'rgba(26,8,8,0.02)',
                        boxShadow: '0 1px 3px rgba(26,8,8,0.04) inset',
                        fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                        color: '#1A0808', outline: 'none', resize: 'none',
                        lineHeight: 1.6,
                      }}
                    />
                  </motion.div>
                )}

                {/* Submit */}
                {rating && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '14px',
                      borderRadius: '14px', border: 'none',
                      background: submitting ? 'rgba(212,160,32,0.4)' : '#D4A020',
                      color: '#FAF6EE',
                      fontFamily: 'var(--font-space-mono)', fontSize: '11px',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      cursor: submitting ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {submitting ? 'Saving...' : 'Submit review'}
                  </motion.button>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                  fontSize: '20px', color: '#1A0808', marginBottom: '8px',
                }}>
                  Thank you
                </p>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                  color: 'rgba(26,8,8,0.35)', lineHeight: 1.6, marginBottom: '20px',
                }}>
                  your feedback just made froot smarter for the next woman
                </p>
                <button
                  onClick={onClose}
                  style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                    color: '#D4A020', background: 'rgba(212,160,32,0.08)',
                    border: 'none', padding: '10px 24px', borderRadius: '12px',
                    cursor: 'pointer', letterSpacing: '0.08em',
                  }}
                >
                  close
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
