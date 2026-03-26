'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfile } from './FrootProfileContext'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface FrootProfileCardProps {
  resultData?: {
    sizeUK: string
    sizeUS: string
    bandSize: number
    shape: { projection: string; fullness: string; rootWidth: string }
    goal: string
    measurements?: Record<string, number | string>
    savedMatches?: Array<{ brand: string; style: string; bestSize: string; tags: string[] }>
  }
}

const shapeLabel: Record<string, string> = {
  projected: 'Projected', moderate: 'Moderate', shallow: 'Shallow',
  'full-on-top': 'Full on top', even: 'Even', 'full-on-bottom': 'Full on bottom',
  narrow: 'Narrow', average: 'Average', wide: 'Wide',
}

export default function FrootProfileCard({ resultData }: FrootProfileCardProps) {
  const { profile, loading, login, logout, saveResults } = useProfile()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [showFeedbackHint, setShowFeedbackHint] = useState(false)

  // Generate a stable "passport number" from profile ID
  const passportNo = useMemo(() => {
    if (!profile?.id) return ''
    return profile.id.slice(0, 8).toUpperCase()
  }, [profile?.id])

  // Issue date
  const issueDate = useMemo(() => {
    const d = profile?.createdAt ? new Date(profile.createdAt) : new Date()
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  }, [profile?.createdAt])

  if (loading) return null

  // ── Logged in: THE PASSPORT ──
  if (profile) {
    const hasSavedResults = !!profile.sizeUK
    const feedbackCount = profile.fitFeedback?.length || 0
    const sizeUK = profile.sizeUK || resultData?.sizeUK
    const sizeUS = profile.sizeUS || resultData?.sizeUS
    const shape = profile.shape || resultData?.shape
    const goal = profile.goal || resultData?.goal

    return (
      <motion.div
        initial={{ opacity: 0, y: 16, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ perspective: '800px' }}
      >
        <div style={{
          borderRadius: '20px',
          background: 'linear-gradient(145deg, #1A0808 0%, #2A1818 50%, #1A0808 100%)',
          boxShadow: '0 8px 32px rgba(26,8,8,0.25), 0 0 0 1px rgba(212,160,32,0.15), inset 0 1px 0 rgba(255,255,255,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Gold foil top edge */}
          <div style={{
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #D4A020 20%, #E8C840 50%, #D4A020 80%, transparent)',
            opacity: 0.7,
          }} />

          {/* Header strip */}
          <div style={{
            padding: '20px 24px 0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                letterSpacing: '0.3em', color: 'rgba(212,160,32,0.5)',
                textTransform: 'uppercase', marginBottom: '4px',
              }}>
                Size Passport
              </p>
              <p style={{
                fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                fontSize: '13px', color: 'rgba(250,246,238,0.4)',
              }}>
                froot
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                letterSpacing: '0.15em', color: 'rgba(212,160,32,0.35)',
              }}>
                NO. {passportNo}
              </p>
              <button
                onClick={logout}
                style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                  color: 'rgba(250,246,238,0.15)', background: 'none', border: 'none',
                  cursor: 'pointer', letterSpacing: '0.06em', padding: '4px 0 0',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(250,246,238,0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(250,246,238,0.15)'}
              >
                log out
              </button>
            </div>
          </div>

          {/* ── Main size display ── */}
          {(hasSavedResults || resultData) && (
            <div style={{
              padding: '24px 24px 20px',
              display: 'flex', alignItems: 'baseline', gap: '12px',
            }}>
              <span style={{
                fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                fontSize: '48px', color: '#FAF6EE',
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                {sizeUK}
              </span>
              <div>
                <span style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '11px',
                  color: 'rgba(212,160,32,0.7)', fontWeight: 600,
                }}>
                  {sizeUS}
                </span>
                <span style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                  color: 'rgba(250,246,238,0.2)', marginLeft: '4px',
                }}>
                  US
                </span>
              </div>
            </div>
          )}

          {/* ── Divider with dot pattern ── */}
          <div style={{
            margin: '0 24px',
            height: '1px',
            backgroundImage: 'radial-gradient(circle, rgba(212,160,32,0.3) 1px, transparent 1px)',
            backgroundSize: '8px 1px',
          }} />

          {/* ── Details grid ── */}
          <div style={{
            padding: '18px 24px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}>
            {/* Projection */}
            {shape && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                  letterSpacing: '0.2em', color: 'rgba(212,160,32,0.4)',
                  textTransform: 'uppercase', marginBottom: '4px',
                }}>
                  Projection
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                  fontSize: '14px', color: 'rgba(250,246,238,0.8)',
                }}>
                  {shapeLabel[shape.projection] || shape.projection}
                </p>
              </div>
            )}

            {/* Fullness */}
            {shape && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                  letterSpacing: '0.2em', color: 'rgba(212,160,32,0.4)',
                  textTransform: 'uppercase', marginBottom: '4px',
                }}>
                  Fullness
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                  fontSize: '14px', color: 'rgba(250,246,238,0.8)',
                }}>
                  {shapeLabel[shape.fullness] || shape.fullness?.replace(/-/g, ' ')}
                </p>
              </div>
            )}

            {/* Root width */}
            {shape && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                  letterSpacing: '0.2em', color: 'rgba(212,160,32,0.4)',
                  textTransform: 'uppercase', marginBottom: '4px',
                }}>
                  Roots
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                  fontSize: '14px', color: 'rgba(250,246,238,0.8)',
                }}>
                  {shapeLabel[shape.rootWidth] || shape.rootWidth}
                </p>
              </div>
            )}

            {/* Goal */}
            {goal && (
              <div>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                  letterSpacing: '0.2em', color: 'rgba(212,160,32,0.4)',
                  textTransform: 'uppercase', marginBottom: '4px',
                }}>
                  Aesthetic
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                  fontSize: '14px', color: 'rgba(250,246,238,0.8)',
                }}>
                  {goal.charAt(0).toUpperCase() + goal.slice(1)}
                </p>
              </div>
            )}
          </div>

          {/* ── Footer strip ── */}
          <div style={{
            padding: '14px 24px',
            background: 'rgba(212,160,32,0.04)',
            borderTop: '1px solid rgba(212,160,32,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '7px',
              letterSpacing: '0.1em', color: 'rgba(250,246,238,0.2)',
            }}>
              {profile.email}
            </p>
            <p style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '7px',
              letterSpacing: '0.1em', color: 'rgba(250,246,238,0.15)',
            }}>
              ISSUED {issueDate}
            </p>
          </div>

          {/* Gold foil bottom edge */}
          <div style={{
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #D4A020 30%, #E8C840 50%, #D4A020 70%, transparent)',
            opacity: 0.4,
          }} />
        </div>

        {/* ── Actions below the card ── */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Save button */}
          {resultData && !hasSavedResults && !saved && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                const success = await saveResults({
                  ...resultData,
                  savedMatches: resultData.savedMatches?.map(m => ({ ...m, savedAt: new Date().toISOString() })),
                })
                if (success) setSaved(true)
              }}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '14px', border: 'none',
                background: '#D4A020', color: '#FAF6EE',
                fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(212,160,32,0.2)',
              }}
            >
              Save to my passport
            </motion.button>
          )}

          {saved && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                color: '#5C8C4A', textAlign: 'center', padding: '8px 0',
              }}
            >
              Saved &mdash; your passport is ready
            </motion.p>
          )}

          {/* Fit feedback nudge */}
          {feedbackCount === 0 && (hasSavedResults || saved) && (
            <button
              onClick={() => setShowFeedbackHint(!showFeedbackHint)}
              style={{
                fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                color: 'rgba(26,8,8,0.3)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, transition: 'color 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#D4A020'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.3)'}
            >
              bought one of our picks? tell us how it fits &rarr;
            </button>
          )}

          <AnimatePresence>
            {showFeedbackHint && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                  color: 'rgba(26,8,8,0.25)', lineHeight: 1.7, textAlign: 'center',
                }}
              >
                your feedback makes froot smarter for every woman after you.
                <br />look for the &quot;rate fit&quot; button on any match above.
              </motion.p>
            )}
          </AnimatePresence>

          {feedbackCount > 0 && (
            <p style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '9px',
              color: 'rgba(26,8,8,0.25)', textAlign: 'center',
            }}>
              {feedbackCount} fit review{feedbackCount !== 1 ? 's' : ''} submitted &mdash; you&apos;re making froot smarter
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  // ── Logged out: teaser + login ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {/* Mini passport preview — dark card, locked */}
      <div style={{
        borderRadius: '20px',
        background: 'linear-gradient(145deg, #1A0808 0%, #2A1818 50%, #1A0808 100%)',
        boxShadow: '0 4px 20px rgba(26,8,8,0.2), 0 0 0 1px rgba(212,160,32,0.1)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Gold edge */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #D4A020 20%, #E8C840 50%, #D4A020 80%, transparent)',
          opacity: 0.5,
        }} />

        <div style={{ padding: '28px 24px' }}>
          {!sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                  letterSpacing: '0.3em', color: 'rgba(212,160,32,0.5)',
                  textTransform: 'uppercase', marginBottom: '8px',
                }}>
                  Size Passport
                </p>
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                  fontSize: '18px', color: '#FAF6EE', marginBottom: '8px',
                }}>
                  Save your fit forever
                </p>
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                  color: 'rgba(250,246,238,0.3)', lineHeight: 1.7,
                }}>
                  your size, shape, and picks &mdash; one link, no password
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!email.trim() || !email.includes('@') || sending) return
                  setSending(true)
                  setError('')
                  const result = await login(email)
                  setSending(false)
                  if (result.ok) {
                    setSent(true)
                  } else {
                    setError(result.error || 'Something went wrong')
                  }
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={sending}
                  style={{
                    flex: 1, padding: '13px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(212,160,32,0.15)',
                    background: 'rgba(250,246,238,0.04)',
                    fontFamily: 'var(--font-space-mono)', fontSize: '11px',
                    color: '#FAF6EE', outline: 'none',
                  }}
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={sending}
                  style={{
                    padding: '13px 22px',
                    borderRadius: '12px', border: 'none',
                    background: sending
                      ? 'rgba(212,160,32,0.3)'
                      : 'linear-gradient(135deg, #D4A020, #E8C840)',
                    color: '#1A0808',
                    fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                    letterSpacing: '0.1em', fontWeight: 600,
                    cursor: sending ? 'default' : 'pointer',
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(212,160,32,0.2)',
                  }}
                >
                  {sending ? '...' : 'send link'}
                </motion.button>
              </form>
              {error && (
                <p style={{
                  fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                  color: '#E8664A', marginTop: '8px', textAlign: 'center',
                }}>
                  {error}
                </p>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center' }}
            >
              <p style={{
                fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                fontSize: '18px', color: '#FAF6EE', marginBottom: '10px',
              }}>
                Check your email
              </p>
              <p style={{
                fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                color: 'rgba(250,246,238,0.35)', lineHeight: 1.7,
              }}>
                we sent a login link to <strong style={{ color: '#D4A020' }}>{email}</strong>
                <br />tap it and your passport saves automatically
              </p>
            </motion.div>
          )}
        </div>

        {/* Gold edge */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #D4A020 30%, #E8C840 50%, #D4A020 70%, transparent)',
          opacity: 0.3,
        }} />
      </div>
    </motion.div>
  )
}
