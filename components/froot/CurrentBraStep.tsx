'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface CurrentBraStepProps {
  brands: string[]
  onNext: (brand: string, size: string) => void
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function CurrentBraStep({ brands, onNext }: CurrentBraStepProps) {
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filtered, setFiltered] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (brand.length >= 1) {
      const lower = brand.toLowerCase()
      const matches = brands.filter(b => b.toLowerCase().includes(lower)).slice(0, 8)
      setFiltered(matches)
      setShowDropdown(matches.length > 0)
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
  const canProceed = brand.trim().length > 0 && sizeValid

  function handleSubmit() {
    if (!canProceed) return
    onNext(brand.trim(), size.trim().toUpperCase())
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
        01
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
        What are you wearing?
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
          maxWidth: '380px',
          lineHeight: 1.7,
        }}
      >
        doesn&apos;t matter if it fits perfectly &mdash; that&apos;s what we&apos;re here to figure out
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
        style={{ maxWidth: '320px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        <div style={{ position: 'relative' }}>
          <label style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'rgba(26,8,8,0.3)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '8px',
          }}>
            Brand
          </label>
          <input
            ref={inputRef}
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            onFocus={() => { if (filtered.length > 0) setShowDropdown(true) }}
            placeholder="e.g. Freya, Wacoal, Victoria's Secret"
            style={inputStyle}
          />
          {showDropdown && (
            <div ref={dropdownRef} style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#FAF6EE',
              border: 'none',
              borderRadius: '12px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(26,8,8,0.1)',
            }}>
              {filtered.map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBrand(b)
                    setShowDropdown(false)
                  }}
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontSize: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    color: '#1A0808',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(26,8,8,0.03)',
                    transition: 'background 0.15s ease',
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

        <div>
          <label style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'rgba(26,8,8,0.3)',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '8px',
          }}>
            Size
          </label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="e.g. 34C, 32DD, 36FF"
            style={inputStyle}
            onKeyDown={(e) => { if (e.key === 'Enter' && canProceed) handleSubmit() }}
          />
        </div>
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
