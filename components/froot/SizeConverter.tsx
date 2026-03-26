'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ConvertMatch {
  brand: string
  style: string
  bestSize: string
  score: number
  cupDepth: number
  cupWidth: number
  wireLength: number
  tags: string[]
  url?: string
}

interface ConvertResult {
  sourceInfo: { cd: number; cw: number; wl: number } | null
  matches: ConvertMatch[]
}

interface SizeConverterProps {
  brands: string[]
  onStartOver: () => void
}

export default function SizeConverter({ brands, onStartOver }: SizeConverterProps) {
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filtered, setFiltered] = useState<string[]>([])
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (brand.length >= 1) {
      const lower = brand.toLowerCase()
      setFiltered(brands.filter(b => b.toLowerCase().includes(lower)).slice(0, 8))
      setShowDropdown(true)
    } else {
      setFiltered([])
      setShowDropdown(false)
    }
  }, [brand, brands])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sizeValid = /^\d{2,3}\s*[A-Za-z]+$/i.test(size.trim())
  const canSearch = brand.trim().length > 0 && sizeValid && !loading

  async function handleSearch() {
    if (!canSearch) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/froot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'convert', brand: brand.trim(), size: size.trim().toUpperCase() }),
      })
      if (!res.ok) throw new Error('api error')
      const data = await res.json()
      if (!data.matches?.length && !data.sourceInfo) {
        setError(`no data found for ${brand.trim()} in ${size.trim().toUpperCase()}`)
      } else {
        setResult(data)
      }
    } catch {
      setError('something went wrong — try again')
    } finally {
      setLoading(false)
    }
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

  const hasResults = result && (result.matches.length > 0 || result.sourceInfo)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: hasResults ? '80px 24px 80px' : '0 24px',
      minHeight: '100vh',
      justifyContent: hasResults ? 'flex-start' : 'center',
    }}>
      {!hasResults && (
        <>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: 'clamp(22px, 4vw, 30px)', color: '#1A0808', fontWeight: 400, marginBottom: '12px', textAlign: 'center' }}
          >
            Translate Your Size
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{ fontFamily: 'var(--font-space-mono)', fontSize: '11px', color: 'rgba(26,8,8,0.45)', marginBottom: '40px', textAlign: 'center', maxWidth: '380px', lineHeight: 1.7 }}
          >
            enter a bra you already love &mdash; we&apos;ll find your size in 1,400+ other styles
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            style={{ maxWidth: '320px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div style={{ position: 'relative' }}>
              <label style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(26,8,8,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Brand</label>
              <input ref={inputRef} type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
                onFocus={() => { if (filtered.length > 0) setShowDropdown(true) }}
                placeholder="e.g. Freya, Panache, Natori" style={inputStyle} />
              {showDropdown && filtered.length > 0 && (
                <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FAF6EE', border: '1px solid rgba(26,8,8,0.12)', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(26,8,8,0.08)' }}>
                  {filtered.map((b) => (
                    <button key={b} onClick={() => { setBrand(b); setShowDropdown(false) }}
                      style={{ fontFamily: 'var(--font-space-mono)', fontSize: '12px', padding: '10px 16px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', color: '#1A0808', cursor: 'pointer', borderBottom: '1px solid rgba(26,8,8,0.05)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,160,32,0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(26,8,8,0.35)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Size</label>
              <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 32DD, 34F, 30G"
                style={inputStyle} onKeyDown={(e) => { if (e.key === 'Enter' && canSearch) handleSearch() }} />
            </div>
          </motion.div>

          {error && (
            <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', color: '#C5352C', marginTop: '16px' }}>{error}</p>
          )}

          <motion.button
            onClick={handleSearch}
            disabled={!canSearch}
            whileHover={canSearch ? { scale: 1.04 } : undefined}
            whileTap={canSearch ? { scale: 0.97 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '14px 48px', marginTop: '44px', border: 'none', borderRadius: '28px',
              background: canSearch ? '#D4A020' : 'rgba(212,160,32,0.15)', color: canSearch ? '#FAF6EE' : 'rgba(212,160,32,0.4)',
              cursor: canSearch ? 'pointer' : 'default', transition: 'all 0.3s ease',
              boxShadow: canSearch ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
            }}
          >
            {loading ? 'Searching\u2026' : 'Find my size'}
          </motion.button>
        </>
      )}

      {/* ── Results ── */}
      {hasResults && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          style={{ maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Source */}
          <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(26,8,8,0.35)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Your bra
          </p>
          <h3 style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: 'clamp(28px, 5vw, 40px)', color: '#1A0808', fontWeight: 400, marginBottom: '8px' }}>
            {brand} {size.toUpperCase()}
          </h3>
          {result!.sourceInfo && (
            <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', color: 'rgba(26,8,8,0.35)', marginBottom: '32px' }}>
              {result!.sourceInfo.cd}&quot; depth &middot; {result!.sourceInfo.cw}&quot; width{result!.sourceInfo.wl ? ` \u00b7 ${result!.sourceInfo.wl}" wire` : ''}
            </p>
          )}

          <div style={{ width: '40px', height: '1px', background: 'rgba(26,8,8,0.1)', marginBottom: '32px' }} />

          {result!.matches.length > 0 ? (
            <>
              <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(26,8,8,0.3)', textTransform: 'uppercase', marginBottom: '16px', alignSelf: 'flex-start' }}>
                Equivalent sizes across brands
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                {result!.matches.map((m, i) => {
                  const inner = (
                    <motion.div
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{
                        padding: '16px', borderRadius: '14px',
                        background: i === 0 ? 'rgba(212,160,32,0.03)' : 'rgba(26,8,8,0.015)',
                        border: 'none',
                        boxShadow: i === 0 ? '0 2px 12px rgba(212,160,32,0.08)' : '0 1px 4px rgba(26,8,8,0.04)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        cursor: m.url ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '11px', color: '#1A0808', fontWeight: i === 0 ? 700 : 400 }}>{m.brand}</span>
                          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', color: 'rgba(26,8,8,0.5)' }}>{m.style.replace(/\s*\([^)]*\)\s*$/, '')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '11px', color: '#D4A020', fontWeight: 600 }}>{m.bestSize}</span>
                          {m.tags.slice(0, 3).map(tag => (
                            <span key={tag} style={{ fontFamily: 'var(--font-space-mono)', fontSize: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '8px', background: 'rgba(26,8,8,0.05)', color: 'rgba(26,8,8,0.4)' }}>{tag}</span>
                          ))}
                        </div>
                        <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', color: 'rgba(26,8,8,0.25)' }}>
                          {m.cupDepth}&quot; depth &middot; {m.cupWidth}&quot; width{m.wireLength ? ` \u00b7 ${m.wireLength}" wire` : ''}
                        </span>
                      </div>
                      {m.url && <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,8,8,0.25)', flexShrink: 0, marginLeft: '12px', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(26,8,8,0.08)' }}>shop &#8599;</span>}
                    </motion.div>
                  )
                  if (m.url) return <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a>
                  return <div key={i}>{inner}</div>
                })}
              </div>

              <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '8px', color: 'rgba(26,8,8,0.15)', marginTop: '16px', textAlign: 'center' }}>
                matched by actual cup depth, width, and wire measurements
              </p>
            </>
          ) : (
            <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '11px', color: 'rgba(26,8,8,0.4)', textAlign: 'center' }}>
              no close matches found for this size. try a different brand or size.
            </p>
          )}

          {/* Try another / start over */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => { setResult(null); setError('') }}
              style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '12px 28px', border: 'none', borderRadius: '24px', background: 'rgba(212,160,32,0.1)', color: '#D4A020', cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,160,32,0.18)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212,160,32,0.1)' }}
            >
              Try another
            </button>
            <button
              onClick={onStartOver}
              style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '12px 28px', border: 'none', borderRadius: '24px', background: 'rgba(26,8,8,0.04)', color: 'rgba(26,8,8,0.35)', cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,8,8,0.08)'; e.currentTarget.style.color = '#1A0808' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,8,8,0.04)'; e.currentTarget.style.color = 'rgba(26,8,8,0.35)' }}
            >
              Back to start
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
