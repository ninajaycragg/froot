'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FilmGrain from '@/components/FilmGrain'
import brandMeasurementsJson from '@/data/brand-measurements.json'

const brandData = brandMeasurementsJson as Record<string, Record<string, Record<string, number>>>
const allBrands = Object.keys(brandData).sort()

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface LookupMatch {
  style: string
  recommendedSize: string
  score: number
  measurements: { cupDepth: number; cupWidth: number; wireLength: number }
  tags: string[]
  url: string
  notes: string[]
  dataPoints: number
}

interface LookupResult {
  brand: string
  requestedSize: string
  matches: LookupMatch[]
  brandLevelMatch: {
    recommendedSize: string
    measurements: { cupDepth: number; cupWidth: number; wireLength: number } | null
    notes: string[]
  } | null
  brandInfo: {
    url: string | null
    models: number
    sizes: number
    dataPoints: number
  } | null
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-space-mono), monospace',
  fontSize: '14px',
  padding: '14px 16px',
  border: 'none',
  borderRadius: '12px',
  background: 'rgba(26,8,8,0.025)',
  boxShadow: '0 1px 3px rgba(26,8,8,0.04)',
  color: '#1A0808',
  width: '100%',
  outline: 'none',
  letterSpacing: '0.03em',
  transition: 'box-shadow 0.2s ease',
}

export default function LookupPage() {
  const [brand, setBrand] = useState('')
  const [styleFilter, setStyleFilter] = useState('')
  const [size, setSize] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filtered, setFiltered] = useState<string[]>([])
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const brandInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Brand filtering
  useEffect(() => {
    if (brand.length >= 1) {
      const lower = brand.toLowerCase()
      setFiltered(allBrands.filter(b => b.toLowerCase().includes(lower)).slice(0, 8))
      setShowDropdown(true)
    } else {
      setFiltered(allBrands.slice(0, 8))
      setShowDropdown(false)
    }
  }, [brand])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        brandInputRef.current && !brandInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sizeValid = /^\d{2,3}\s*[A-Za-z]+$/i.test(size.trim())
  const canSearch = brand.trim().length > 0 && sizeValid && !loading

  // Check if brand is known
  const brandKnown = useMemo(() => {
    const lower = brand.trim().toLowerCase()
    return allBrands.some(b => b.toLowerCase() === lower)
  }, [brand])

  async function handleSearch() {
    if (!canSearch) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const sizeUpper = size.trim().toUpperCase()
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim(),
          style: styleFilter.trim() || undefined,
          sizeUS: sizeUpper,
          sizeUK: sizeUpper,
        }),
      })
      if (!res.ok) throw new Error('api error')
      const data: LookupResult = await res.json()
      if (!data.matches?.length && !data.brandLevelMatch) {
        setError(`no measurement data found for ${brand.trim()} in ${sizeUpper}`)
      } else {
        setResult(data)
      }
    } catch {
      setError('something went wrong \u2014 try again')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setError('')
    setStyleFilter('')
  }

  const hasResults = result && (result.matches.length > 0 || result.brandLevelMatch)

  return (
    <main style={{
      position: 'relative',
      width: '100vw',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAF6EE 0%, #F7F1E6 40%, #FAF6EE 100%)',
    }}>
      <FilmGrain />

      {/* Top nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '22px 28px',
        zIndex: 20,
        fontFamily: 'var(--font-space-mono), monospace',
      }}>
        <motion.a
          href="/froot"
          whileHover={{ x: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'rgba(26,8,8,0.3)',
            textTransform: 'uppercase',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.6)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.3)'}
        >
          &larr; froot
        </motion.a>
        <span style={{
          fontSize: '9px',
          letterSpacing: '0.15em',
          color: 'rgba(26,8,8,0.2)',
          textTransform: 'uppercase',
        }}>
          lookup
        </span>
      </nav>

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: hasResults ? '80px 24px 80px' : '0 24px',
        minHeight: '100vh',
        justifyContent: hasResults ? 'flex-start' : 'center',
      }}>
        <AnimatePresence mode="wait">
          {!hasResults ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
            >
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
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
                What&apos;s my size in this?
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '11px',
                  color: 'rgba(26,8,8,0.45)',
                  marginBottom: '40px',
                  textAlign: 'center',
                  maxWidth: '400px',
                  lineHeight: 1.7,
                }}
              >
                pick a brand, enter your size &mdash; we&apos;ll tell you what to order
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4, ease: EASE }}
                style={{ maxWidth: '340px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {/* Brand input */}
                <div style={{ position: 'relative' }}>
                  <label style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    color: 'rgba(26,8,8,0.35)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '8px',
                  }}>
                    Brand
                  </label>
                  <input
                    ref={brandInputRef}
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    onFocus={() => { if (filtered.length > 0) setShowDropdown(true) }}
                    placeholder="e.g. Freya, Panache, Natori"
                    style={inputStyle}
                  />
                  {showDropdown && filtered.length > 0 && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#FAF6EE',
                        border: '1px solid rgba(26,8,8,0.12)',
                        borderRadius: '8px',
                        marginTop: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 10,
                        boxShadow: '0 4px 12px rgba(26,8,8,0.08)',
                      }}
                    >
                      {filtered.map((b) => (
                        <button
                          key={b}
                          onClick={() => { setBrand(b); setShowDropdown(false) }}
                          style={{
                            fontFamily: 'var(--font-space-mono), monospace',
                            fontSize: '12px',
                            padding: '10px 16px',
                            width: '100%',
                            textAlign: 'left',
                            border: 'none',
                            background: 'transparent',
                            color: '#1A0808',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(26,8,8,0.05)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,160,32,0.06)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Style filter (optional) */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    color: 'rgba(26,8,8,0.35)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '8px',
                  }}>
                    Style <span style={{ color: 'rgba(26,8,8,0.15)' }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={styleFilter}
                    onChange={(e) => setStyleFilter(e.target.value)}
                    placeholder="e.g. Deco, Envy, Clara"
                    style={inputStyle}
                  />
                </div>

                {/* Size input */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    color: 'rgba(26,8,8,0.35)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '8px',
                  }}>
                    Your size
                  </label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 32DD, 34F, 30G"
                    style={inputStyle}
                    onKeyDown={(e) => { if (e.key === 'Enter' && canSearch) handleSearch() }}
                  />
                  <p style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '9px',
                    color: 'rgba(26,8,8,0.2)',
                    marginTop: '6px',
                    letterSpacing: '0.03em',
                  }}>
                    UK or US sizing &mdash; we&apos;ll figure it out
                  </p>
                </div>
              </motion.div>

              {!brandKnown && brand.trim().length > 2 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '9px',
                    color: 'rgba(212,160,32,0.7)',
                    marginTop: '12px',
                    textAlign: 'center',
                  }}
                >
                  we don&apos;t have measurement data for this brand yet
                </motion.p>
              )}

              {error && (
                <p style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '10px',
                  color: '#C5352C',
                  marginTop: '16px',
                }}>
                  {error}
                </p>
              )}

              <motion.button
                onClick={handleSearch}
                disabled={!canSearch}
                whileHover={canSearch ? { scale: 1.04 } : undefined}
                whileTap={canSearch ? { scale: 0.97 } : undefined}
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
                  background: canSearch ? '#D4A020' : 'rgba(212,160,32,0.15)',
                  color: canSearch ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
                  cursor: canSearch ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  boxShadow: canSearch ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
                }}
              >
                {loading ? 'Looking up\u2026' : 'Find my size'}
              </motion.button>

              {/* Link back to full sizing */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '9px',
                  color: 'rgba(26,8,8,0.2)',
                  marginTop: '24px',
                  textAlign: 'center',
                  lineHeight: 1.8,
                }}
              >
                don&apos;t know your size?{' '}
                <a
                  href="/froot"
                  style={{
                    color: 'rgba(26,8,8,0.35)',
                    borderBottom: '1px solid rgba(26,8,8,0.1)',
                    paddingBottom: '1px',
                  }}
                >
                  find it first &rarr;
                </a>
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{ maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Header */}
              <p style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '9px',
                letterSpacing: '0.2em',
                color: 'rgba(26,8,8,0.35)',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}>
                Your size in
              </p>
              <h3 style={{
                fontFamily: 'var(--font-dm-serif), Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(28px, 5vw, 40px)',
                color: '#1A0808',
                fontWeight: 400,
                marginBottom: '6px',
                textAlign: 'center',
              }}>
                {result!.brand}
              </h3>
              <p style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '10px',
                color: 'rgba(26,8,8,0.35)',
                marginBottom: '8px',
              }}>
                based on {result!.requestedSize}
              </p>

              {/* Brand info badges */}
              {result!.brandInfo && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}>
                  {result!.brandInfo.models > 0 && (
                    <span style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      fontSize: '8px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      background: 'rgba(26,8,8,0.04)',
                      color: 'rgba(26,8,8,0.35)',
                    }}>
                      {result!.brandInfo.models} styles tracked
                    </span>
                  )}
                  {result!.brandInfo.dataPoints > 0 && (
                    <span style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      fontSize: '8px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      background: 'rgba(26,8,8,0.04)',
                      color: 'rgba(26,8,8,0.35)',
                    }}>
                      {result!.brandInfo.dataPoints} measurements
                    </span>
                  )}
                </div>
              )}

              <div style={{ width: '40px', height: '1px', background: 'rgba(26,8,8,0.1)', marginBottom: '28px' }} />

              {/* Brand-level match (when no style matches) */}
              {result!.matches.length === 0 && result!.brandLevelMatch && (
                <div style={{ width: '100%', marginBottom: '24px' }}>
                  <div style={{
                    padding: '20px',
                    borderRadius: '14px',
                    background: 'rgba(212,160,32,0.03)',
                    boxShadow: '0 2px 12px rgba(212,160,32,0.08)',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      fontSize: '9px',
                      letterSpacing: '0.15em',
                      color: 'rgba(26,8,8,0.3)',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                    }}>
                      Recommended size
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-dm-serif), Georgia, serif',
                      fontStyle: 'italic',
                      fontSize: '28px',
                      color: '#D4A020',
                      fontWeight: 400,
                      marginBottom: '12px',
                    }}>
                      {result!.brandLevelMatch.recommendedSize}
                    </p>
                    {result!.brandLevelMatch.measurements && (
                      <p style={{
                        fontFamily: 'var(--font-space-mono), monospace',
                        fontSize: '9px',
                        color: 'rgba(26,8,8,0.3)',
                        marginBottom: '12px',
                      }}>
                        {result!.brandLevelMatch.measurements.cupDepth}&quot; depth &middot; {result!.brandLevelMatch.measurements.cupWidth}&quot; width
                        {result!.brandLevelMatch.measurements.wireLength > 0 && (
                          <> &middot; {result!.brandLevelMatch.measurements.wireLength}&quot; wire</>
                        )}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {result!.brandLevelMatch.notes.map((note, i) => (
                        <p key={i} style={{
                          fontFamily: 'var(--font-space-mono), monospace',
                          fontSize: '10px',
                          color: 'rgba(26,8,8,0.45)',
                          lineHeight: 1.6,
                        }}>
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Style matches */}
              {result!.matches.length > 0 && (
                <>
                  <p style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    color: 'rgba(26,8,8,0.3)',
                    textTransform: 'uppercase',
                    marginBottom: '16px',
                    alignSelf: 'flex-start',
                  }}>
                    {result!.matches.length} style{result!.matches.length !== 1 ? 's' : ''} found
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {result!.matches.map((m, i) => (
                      <a
                        key={i}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <motion.div
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          style={{
                            padding: '16px',
                            borderRadius: '14px',
                            background: i === 0 ? 'rgba(212,160,32,0.03)' : 'rgba(26,8,8,0.015)',
                            boxShadow: i === 0 ? '0 2px 12px rgba(212,160,32,0.08)' : '0 1px 4px rgba(26,8,8,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          {/* Top row: style name + size */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{
                                fontFamily: 'var(--font-space-mono), monospace',
                                fontSize: '11px',
                                color: '#1A0808',
                                fontWeight: i === 0 ? 700 : 400,
                                lineHeight: 1.4,
                                display: 'block',
                              }}>
                                {m.style.replace(/\s*\([^)]*\)\s*$/, '')}
                              </span>
                            </div>
                            <span style={{
                              fontFamily: 'var(--font-space-mono), monospace',
                              fontSize: '13px',
                              color: '#D4A020',
                              fontWeight: 600,
                              flexShrink: 0,
                              marginLeft: '12px',
                            }}>
                              {m.recommendedSize}
                            </span>
                          </div>

                          {/* Tags */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {m.tags.slice(0, 4).map(tag => (
                              <span key={tag} style={{
                                fontFamily: 'var(--font-space-mono), monospace',
                                fontSize: '8px',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: '8px',
                                background: 'rgba(26,8,8,0.05)',
                                color: 'rgba(26,8,8,0.4)',
                              }}>
                                {tag}
                              </span>
                            ))}
                            {m.dataPoints > 1 && (
                              <span style={{
                                fontFamily: 'var(--font-space-mono), monospace',
                                fontSize: '8px',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: '8px',
                                background: 'rgba(212,160,32,0.06)',
                                color: 'rgba(212,160,32,0.6)',
                              }}>
                                {m.dataPoints} measurements
                              </span>
                            )}
                          </div>

                          {/* Measurements */}
                          <span style={{
                            fontFamily: 'var(--font-space-mono), monospace',
                            fontSize: '9px',
                            color: 'rgba(26,8,8,0.25)',
                          }}>
                            {m.measurements.cupDepth}&quot; depth &middot; {m.measurements.cupWidth}&quot; width
                            {m.measurements.wireLength > 0 && (
                              <> &middot; {m.measurements.wireLength}&quot; wire</>
                            )}
                          </span>

                          {/* Notes */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {m.notes.slice(0, 2).map((note, ni) => (
                              <span key={ni} style={{
                                fontFamily: 'var(--font-space-mono), monospace',
                                fontSize: '9px',
                                color: 'rgba(26,8,8,0.35)',
                                lineHeight: 1.5,
                              }}>
                                {note}
                              </span>
                            ))}
                          </div>

                          {/* Shop link hint */}
                          <span style={{
                            fontFamily: 'var(--font-space-mono), monospace',
                            fontSize: '8px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'rgba(26,8,8,0.2)',
                            alignSelf: 'flex-end',
                          }}>
                            shop &#8599;
                          </span>
                        </motion.div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* Footer note */}
              <p style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '8px',
                color: 'rgba(26,8,8,0.15)',
                marginTop: '20px',
                textAlign: 'center',
              }}>
                sized by actual cup depth, width, and wire measurements
              </p>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '28px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <button
                  onClick={handleReset}
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '12px 28px',
                    border: 'none',
                    borderRadius: '24px',
                    background: 'rgba(212,160,32,0.1)',
                    color: '#D4A020',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,160,32,0.18)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,160,32,0.1)' }}
                >
                  Try another brand
                </button>
                <a
                  href="/froot"
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '12px 28px',
                    border: 'none',
                    borderRadius: '24px',
                    background: 'rgba(26,8,8,0.04)',
                    color: 'rgba(26,8,8,0.35)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,8,8,0.08)'; e.currentTarget.style.color = '#1A0808' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,8,8,0.04)'; e.currentTarget.style.color = 'rgba(26,8,8,0.35)' }}
                >
                  Back to froot
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
