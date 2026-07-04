'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import FilmGrain from '@/components/FilmGrain'

interface Story {
  title: string
  snippet: string
  date: string
  commentCount: number
  insight: string
}

interface OracleResult {
  stories: Story[]
  summary: string
}

const EXAMPLE_QUERIES = [
  'My straps keep falling down no matter what I do',
  'There is gapping at the top of the cup but it feels tight everywhere else',
  'I was measured as a 34B but nothing fits right',
  'I need a sports bra for running that actually works for large busts',
  'My underwire digs into my ribs and it hurts by the end of the day',
  'I just had a baby and nothing fits anymore',
]

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function OraclePage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OracleResult | null>(null)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  async function handleSearch() {
    const trimmed = query.trim()
    if (trimmed.length < 3) return

    setLoading(true)
    setError('')
    setResult(null)
    setHasSearched(true)

    try {
      const res = await fetch('/api/froot/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      const data: OracleResult = await res.json()
      setResult(data)

      // Scroll to results after a brief delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleExampleClick(example: string) {
    setQuery(example)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF6EE',
      color: '#1A0808',
    }}>
      {/* Back link */}
      <div style={{
        padding: '20px 24px',
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <Link
          href="/froot"
          style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: 13,
            color: '#8A7060',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#C5352C')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A7060')}
        >
          <span style={{ fontSize: 16 }}>&larr;</span> back to froot
        </Link>
      </div>

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '40px 24px 0',
          textAlign: 'center',
        }}
      >
        <h1 style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 300,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: 12,
          color: '#1A0808',
        }}>
          The Fit Oracle
        </h1>
        <p style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 'clamp(18px, 2.5vw, 22px)',
          fontWeight: 400,
          fontStyle: 'italic',
          color: '#8A7060',
          maxWidth: 520,
          margin: '0 auto 40px',
          lineHeight: 1.5,
        }}>
          Tell us what&apos;s going on and we&apos;ll find real stories
          from people who&apos;ve been exactly where you are.
        </p>

        {/* Search input */}
        <div style={{
          position: 'relative',
          maxWidth: 640,
          margin: '0 auto',
        }}>
          <textarea
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="tell us what's going on with your bra situation..."
            rows={3}
            style={{
              width: '100%',
              padding: '20px 24px',
              fontFamily: 'var(--font-cormorant)',
              fontSize: 18,
              lineHeight: 1.5,
              color: '#1A0808',
              backgroundColor: '#fff',
              border: '1.5px solid #D4C4B0',
              borderRadius: 12,
              outline: 'none',
              resize: 'vertical',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#C5352C'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(197, 53, 44, 0.1)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#D4C4B0'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || query.trim().length < 3}
            style={{
              marginTop: 12,
              padding: '12px 36px',
              fontFamily: 'var(--font-space-mono)',
              fontSize: 14,
              fontWeight: 700,
              color: '#FAF6EE',
              backgroundColor: loading || query.trim().length < 3 ? '#C4B8A8' : '#C5352C',
              border: 'none',
              borderRadius: 8,
              cursor: loading || query.trim().length < 3 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, transform 0.1s',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => {
              if (!loading && query.trim().length >= 3) {
                e.currentTarget.style.backgroundColor = '#A82D25'
              }
            }}
            onMouseLeave={e => {
              if (!loading && query.trim().length >= 3) {
                e.currentTarget.style.backgroundColor = '#C5352C'
              }
            }}
          >
            {loading ? 'searching...' : 'find my people'}
          </button>
        </div>

        {/* Example queries */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              marginTop: 40,
              maxWidth: 640,
              margin: '40px auto 0',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#8A7060',
              marginBottom: 14,
            }}>
              or try something like
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
            }}>
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(example)}
                  style={{
                    padding: '8px 14px',
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: 14,
                    fontStyle: 'italic',
                    color: '#8A7060',
                    backgroundColor: 'transparent',
                    border: '1px solid #D4C4B0',
                    borderRadius: 20,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    lineHeight: 1.3,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#C5352C'
                    e.currentTarget.style.color = '#C5352C'
                    e.currentTarget.style.backgroundColor = 'rgba(197, 53, 44, 0.04)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#D4C4B0'
                    e.currentTarget.style.color = '#8A7060'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              maxWidth: 640,
              margin: '48px auto 0',
              padding: '0 24px',
              textAlign: 'center',
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 32,
                  height: 32,
                  border: '2.5px solid #E8DDD0',
                  borderTopColor: '#C5352C',
                  borderRadius: '50%',
                }}
              />
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 18,
                fontStyle: 'italic',
                color: '#8A7060',
              }}>
                Reading through thousands of stories...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              maxWidth: 640,
              margin: '32px 24px 0',
              marginLeft: 'auto',
              marginRight: 'auto',
              width: 'calc(100% - 48px)',
              padding: '16px 24px',
              backgroundColor: 'rgba(197, 53, 44, 0.08)',
              border: '1px solid rgba(197, 53, 44, 0.2)',
              borderRadius: 10,
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 16,
              color: '#C5352C',
            }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              maxWidth: 720,
              margin: '48px auto 0',
              padding: '0 24px 80px',
            }}
          >
            {/* Summary */}
            {result.summary && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  padding: '24px 28px',
                  backgroundColor: 'rgba(212, 160, 32, 0.08)',
                  border: '1px solid rgba(212, 160, 32, 0.2)',
                  borderRadius: 14,
                  marginBottom: 36,
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 19,
                  lineHeight: 1.6,
                  color: '#1A0808',
                  fontStyle: 'italic',
                }}>
                  {result.summary}
                </p>
              </motion.div>
            )}

            {/* Story count label */}
            {result.stories.length > 0 && (
              <p style={{
                fontFamily: 'var(--font-space-mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#8A7060',
                marginBottom: 20,
              }}>
                {result.stories.length} {result.stories.length === 1 ? 'story' : 'stories'} from r/ABraThatFits
              </p>
            )}

            {/* Story cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {result.stories.map((story, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  style={{
                    padding: '22px 24px',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    border: '1px solid #E8DDD0',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#D4C4B0'
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(26, 8, 8, 0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E8DDD0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Title */}
                  <h3 style={{
                    fontFamily: 'var(--font-cormorant)',
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: '#1A0808',
                    marginBottom: 8,
                  }}>
                    {story.title.length > 120 ? story.title.slice(0, 120) + '...' : story.title}
                  </h3>

                  {/* Meta line */}
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-space-mono)',
                      fontSize: 11,
                      color: '#8A7060',
                    }}>
                      {formatDate(story.date)}
                    </span>
                    {story.commentCount > 0 && (
                      <span style={{
                        fontFamily: 'var(--font-space-mono)',
                        fontSize: 11,
                        color: '#8A7060',
                      }}>
                        {story.commentCount} comments
                      </span>
                    )}
                  </div>

                  {/* Snippet */}
                  {story.snippet && (
                    <p style={{
                      fontFamily: 'var(--font-cormorant)',
                      fontSize: 15,
                      lineHeight: 1.55,
                      color: '#4A3A30',
                      marginBottom: story.insight ? 12 : 0,
                    }}>
                      {story.snippet.length > 250 ? story.snippet.slice(0, 250) + '...' : story.snippet}
                    </p>
                  )}

                  {/* Insight from Claude */}
                  {story.insight && (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: 'rgba(92, 140, 74, 0.07)',
                      borderRadius: 8,
                      borderLeft: '3px solid #5C8C4A',
                    }}>
                      <p style={{
                        fontFamily: 'var(--font-cormorant)',
                        fontSize: 14,
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                        color: '#3A5A2E',
                      }}>
                        {story.insight}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Encouragement footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              style={{
                marginTop: 40,
                padding: '20px 24px',
                textAlign: 'center',
                borderTop: '1px solid #E8DDD0',
              }}
            >
              <p style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 16,
                fontStyle: 'italic',
                color: '#8A7060',
                lineHeight: 1.6,
              }}>
                These are real stories from real people on r/ABraThatFits.
                <br />
                You&apos;re not imagining it, and you&apos;re not alone.
              </p>
              <button
                onClick={() => {
                  setResult(null)
                  setQuery('')
                  setHasSearched(false)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  setTimeout(() => inputRef.current?.focus(), 300)
                }}
                style={{
                  marginTop: 16,
                  padding: '10px 24px',
                  fontFamily: 'var(--font-space-mono)',
                  fontSize: 12,
                  color: '#8A7060',
                  backgroundColor: 'transparent',
                  border: '1px solid #D4C4B0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#C5352C'
                  e.currentTarget.style.color = '#C5352C'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#D4C4B0'
                  e.currentTarget.style.color = '#8A7060'
                }}
              >
                search again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state after search */}
      <AnimatePresence>
        {hasSearched && !loading && result && result.stories.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              maxWidth: 640,
              margin: '40px auto 0',
              padding: '0 24px',
              textAlign: 'center',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 18,
              lineHeight: 1.6,
              color: '#8A7060',
              fontStyle: 'italic',
            }}>
              {result.summary}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <FilmGrain />
    </div>
  )
}
