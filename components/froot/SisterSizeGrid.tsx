'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface SisterSizeGridProps {
  bandSize: number
  cupIndex: number
}

const UK_CUPS = ['A','B','C','D','DD','E','F','FF','G','GG','H','HH','J','JJ','K','KK','L']

export default function SisterSizeGrid({ bandSize, cupIndex }: SisterSizeGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const bands: number[] = []
  for (let b = bandSize - 4; b <= bandSize + 4; b += 2) {
    if (b >= 26 && b <= 48) bands.push(b)
  }

  const cupStart = Math.max(0, cupIndex - 2)
  const cupEnd = Math.min(UK_CUPS.length - 1, cupIndex + 2)
  const cups: number[] = []
  for (let c = cupStart; c <= cupEnd; c++) cups.push(c)

  function isSisterDiagonal(band: number, cup: number): boolean {
    const bandDiff = (band - bandSize) / 2
    const cupDiff = cup - cupIndex
    return bandDiff + cupDiff === 0
  }

  function isUserSize(band: number, cup: number): boolean {
    return band === bandSize && cup === cupIndex
  }

  return (
    <div style={{ width: '100%' }}>
      <p style={{
        fontFamily: 'var(--font-dm-serif)',
        fontStyle: 'italic',
        fontSize: '14px',
        color: 'rgba(26,8,8,0.45)',
        marginBottom: '8px',
      }}>
        Sister sizes
      </p>
      <p style={{
        fontFamily: 'var(--font-space-mono)',
        fontSize: '9px',
        color: 'rgba(26,8,8,0.25)',
        marginBottom: '20px',
        lineHeight: 1.7,
      }}>
        the gold diagonal holds the same cup volume &mdash; try one if you need a different band
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `32px repeat(${cups.length}, 1fr)`,
        gap: '3px',
        maxWidth: '100%',
        overflowX: 'auto',
      }}>
        {/* Header row - cup labels */}
        <div /> {/* empty corner */}
        {cups.map(c => (
          <div key={`header-${c}`} style={{
            fontFamily: 'var(--font-space-mono)',
            fontSize: 'clamp(7px, 2vw, 8px)',
            color: 'rgba(26,8,8,0.25)',
            textAlign: 'center',
            padding: '4px 0',
            letterSpacing: '0.05em',
          }}>
            {UK_CUPS[c]}
          </div>
        ))}

        {/* Grid rows */}
        {bands.map(band => (
          <div key={`row-${band}`} style={{ display: 'contents' }}>
            {/* Band label */}
            <div style={{
              fontFamily: 'var(--font-space-mono)',
              fontSize: 'clamp(8px, 2vw, 9px)',
              color: band === bandSize ? '#1A0808' : 'rgba(26,8,8,0.25)',
              fontWeight: band === bandSize ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 0',
            }}>
              {band}
            </div>

            {/* Size cells */}
            {cups.map(cup => {
              const isUser = isUserSize(band, cup)
              const isSister = isSisterDiagonal(band, cup)
              const cellKey = `${band}-${cup}`
              const isHovered = hoveredCell === cellKey

              return (
                <motion.div
                  key={cellKey}
                  onMouseEnter={() => setHoveredCell(cellKey)}
                  onMouseLeave={() => setHoveredCell(null)}
                  whileHover={{ scale: 1.06 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    fontFamily: 'var(--font-space-mono)',
                    fontSize: isUser ? 'clamp(8px, 2.5vw, 10px)' : 'clamp(7px, 2vw, 9px)',
                    fontWeight: isUser ? 700 : isSister ? 500 : 400,
                    color: isUser ? '#FAF6EE' : isSister ? '#D4A020' : 'rgba(26,8,8,0.2)',
                    background: isUser
                      ? '#D4A020'
                      : isSister
                        ? (isHovered ? 'rgba(212,160,32,0.12)' : 'rgba(212,160,32,0.05)')
                        : (isHovered ? 'rgba(26,8,8,0.04)' : 'rgba(26,8,8,0.015)'),
                    borderRadius: isUser ? '10px' : '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'clamp(6px, 2vw, 10px) 2px',
                    cursor: 'default',
                    transition: 'background 0.2s ease, color 0.2s ease',
                    border: 'none',
                    boxShadow: isUser ? '0 2px 6px rgba(212,160,32,0.25)' : isSister ? '0 1px 3px rgba(212,160,32,0.1)' : 'none',
                  }}
                >
                  {band}{UK_CUPS[cup]}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '14px',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '4px', background: '#D4A020', boxShadow: '0 1px 3px rgba(212,160,32,0.25)' }} />
          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '8px', color: 'rgba(26,8,8,0.3)' }}>your size</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(212,160,32,0.05)', boxShadow: '0 1px 3px rgba(212,160,32,0.1)' }} />
          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '8px', color: 'rgba(26,8,8,0.3)' }}>same volume</span>
        </div>
      </div>
    </div>
  )
}
