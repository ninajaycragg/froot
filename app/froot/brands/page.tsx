'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import FilmGrain from '@/components/FilmGrain'
import brandDataRaw from '@/data/froot/brand-sentiment.json'

// ── Types ──

interface YearData {
  positive: number
  negative: number
  neutral: number
  total: number
}

interface Quote {
  quote: string
  sentiment: string
  date: string
}

interface Brand {
  name: string
  positive: number
  negative: number
  neutral: number
  total: number
  byYear: Record<string, YearData>
  topQuotes: Quote[]
}

const brandData = brandDataRaw as Brand[]

// ── Helpers ──

function getVibe(b: Brand): { label: string; color: string } {
  const posPct = b.positive / b.total
  const negPct = b.negative / b.total
  if (posPct > 0.6) return { label: 'loved', color: '#5C8C4A' }
  if (negPct > 0.4) return { label: 'controversial', color: '#C5352C' }
  if (negPct > 0.15) return { label: 'divisive', color: '#C9881F' }
  return { label: 'mixed', color: '#8A7060' }
}

function getVerdict(b: Brand): string {
  const posPct = b.positive / b.total
  const negPct = b.negative / b.total
  if (posPct > 0.85) return `The community overwhelmingly recommends ${b.name}. A trusted go-to.`
  if (posPct > 0.7) return `${b.name} gets consistent love from the community. Most people have great experiences.`
  if (negPct > 0.15) return `${b.name} is a mixed bag. Some people swear by them, others have strong opinions.`
  return `${b.name} is generally well-received, with the occasional caveat.`
}

type FilterMode = 'all' | 'loved' | 'discussed' | 'rising' | 'controversial'

function isRising(b: Brand): boolean {
  const years = Object.keys(b.byYear).sort()
  if (years.length < 2) return false
  const recent = years.slice(-2)
  const older = years.slice(-4, -2)
  if (older.length === 0) return true
  const recentAvg = recent.reduce((s, y) => s + (b.byYear[y]?.total || 0), 0) / recent.length
  const olderAvg = older.reduce((s, y) => s + (b.byYear[y]?.total || 0), 0) / older.length
  return olderAvg > 0 && recentAvg / olderAvg > 1.5
}

// ── Sentiment Bar ──

function SentimentBar({ brand, height = 6 }: { brand: Brand; height?: number }) {
  const posPct = (brand.positive / brand.total) * 100
  const negPct = (brand.negative / brand.total) * 100
  const neuPct = 100 - posPct - negPct

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height,
      borderRadius: height / 2,
      overflow: 'hidden',
      background: 'rgba(26,8,8,0.06)',
    }}>
      <div style={{ width: `${posPct}%`, background: '#5C8C4A', transition: 'width 0.4s ease' }} />
      <div style={{ width: `${neuPct}%`, background: '#8A7060', opacity: 0.3, transition: 'width 0.4s ease' }} />
      <div style={{ width: `${negPct}%`, background: '#C5352C', transition: 'width 0.4s ease' }} />
    </div>
  )
}

// ── Year Chart (SVG) ──

function YearChart({ brand, width = 400, height = 180 }: { brand: Brand; width?: number; height?: number }) {
  const years = Object.keys(brand.byYear).sort()
  if (years.length === 0) return null

  // Only show years with meaningful data
  const meaningfulYears = years.filter(y => brand.byYear[y].total >= 1)
  if (meaningfulYears.length === 0) return null

  const padding = { top: 20, right: 20, bottom: 36, left: 10 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxTotal = Math.max(...meaningfulYears.map(y => brand.byYear[y].total))
  const barWidth = Math.min(28, (chartW / meaningfulYears.length) * 0.6)
  const gap = chartW / meaningfulYears.length

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartH * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartH * (1 - pct)}
          stroke="rgba(26,8,8,0.06)"
          strokeWidth={1}
        />
      ))}

      {meaningfulYears.map((year, i) => {
        const d = brand.byYear[year]
        const x = padding.left + gap * i + gap / 2
        const totalH = (d.total / maxTotal) * chartH
        const posH = (d.positive / maxTotal) * chartH
        const negH = (d.negative / maxTotal) * chartH
        const neuH = totalH - posH - negH
        const baseY = padding.top + chartH

        return (
          <g key={year}>
            {/* Positive (bottom) */}
            <rect
              x={x - barWidth / 2}
              y={baseY - posH}
              width={barWidth}
              height={Math.max(posH, 0)}
              fill="#5C8C4A"
              rx={2}
              opacity={0.85}
            />
            {/* Neutral (middle) */}
            <rect
              x={x - barWidth / 2}
              y={baseY - posH - neuH}
              width={barWidth}
              height={Math.max(neuH, 0)}
              fill="#8A7060"
              rx={0}
              opacity={0.25}
            />
            {/* Negative (top) */}
            <rect
              x={x - barWidth / 2}
              y={baseY - posH - neuH - negH}
              width={barWidth}
              height={Math.max(negH, 0)}
              fill="#C5352C"
              rx={2}
              opacity={0.85}
            />
            {/* Year label */}
            <text
              x={x}
              y={baseY + 16}
              textAnchor="middle"
              fill="rgba(26,8,8,0.35)"
              fontSize={9}
              fontFamily="var(--font-space-mono), monospace"
            >
              {year.slice(-2)}
            </text>
            {/* Total on top */}
            {d.total > 0 && (
              <text
                x={x}
                y={baseY - totalH - 4}
                textAnchor="middle"
                fill="rgba(26,8,8,0.3)"
                fontSize={8}
                fontFamily="var(--font-space-mono), monospace"
              >
                {d.total > 999 ? `${(d.total / 1000).toFixed(1)}k` : d.total}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Comparison Chart ──

function ComparisonChart({ brands }: { brands: Brand[] }) {
  // Gather all years across selected brands
  const allYears = Array.from(
    new Set(brands.flatMap(b => Object.keys(b.byYear)))
  ).sort()

  // Only years with data in at least one brand
  const years = allYears.filter(y =>
    brands.some(b => b.byYear[y]?.total > 0)
  )

  if (years.length === 0) return null

  const width = 520
  const height = 220
  const padding = { top: 30, right: 20, bottom: 36, left: 10 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const colors = ['#5C8C4A', '#C5352C', '#C9881F']

  // Use positive ratio as the metric
  const getPosPct = (b: Brand, y: string) => {
    const d = b.byYear[y]
    if (!d || d.total === 0) return null
    return d.positive / d.total
  }

  return (
    <div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: '100%' }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <g key={pct}>
            <line
              x1={padding.left}
              y1={padding.top + chartH * (1 - pct)}
              x2={width - padding.right}
              y2={padding.top + chartH * (1 - pct)}
              stroke="rgba(26,8,8,0.06)"
              strokeWidth={1}
            />
            <text
              x={padding.left - 2}
              y={padding.top + chartH * (1 - pct) + 3}
              textAnchor="end"
              fill="rgba(26,8,8,0.2)"
              fontSize={7}
              fontFamily="var(--font-space-mono), monospace"
            >
              {Math.round(pct * 100)}%
            </text>
          </g>
        ))}

        {/* Lines for each brand */}
        {brands.map((brand, bi) => {
          const points: { x: number; y: number }[] = []
          years.forEach((year, yi) => {
            const pct = getPosPct(brand, year)
            if (pct !== null) {
              points.push({
                x: padding.left + (yi / (years.length - 1 || 1)) * chartW,
                y: padding.top + chartH * (1 - pct),
              })
            }
          })
          if (points.length < 2) return null
          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
          return (
            <g key={brand.name}>
              <path d={pathD} fill="none" stroke={colors[bi]} strokeWidth={2.5} opacity={0.8} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={colors[bi]} opacity={0.9} />
              ))}
            </g>
          )
        })}

        {/* X-axis labels */}
        {years.map((year, yi) => (
          <text
            key={year}
            x={padding.left + (yi / (years.length - 1 || 1)) * chartW}
            y={height - 8}
            textAnchor="middle"
            fill="rgba(26,8,8,0.35)"
            fontSize={9}
            fontFamily="var(--font-space-mono), monospace"
          >
            {year.slice(-2)}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
        {brands.map((b, i) => (
          <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i] }} />
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 10,
              letterSpacing: '0.05em',
              color: 'rgba(26,8,8,0.5)',
            }}>
              {b.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Quote Card ──

function QuoteCard({ quote }: { quote: Quote }) {
  const sentimentColor = quote.sentiment === 'positive' ? '#5C8C4A' :
    quote.sentiment === 'negative' ? '#C5352C' : '#8A7060'

  return (
    <div style={{
      padding: '16px 20px',
      background: 'rgba(26,8,8,0.02)',
      borderLeft: `3px solid ${sentimentColor}`,
      borderRadius: '0 8px 8px 0',
    }}>
      <p style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 15,
        lineHeight: 1.6,
        color: 'rgba(26,8,8,0.7)',
        margin: 0,
        fontStyle: 'italic',
      }}>
        &ldquo;{quote.quote.length > 280 ? quote.quote.slice(0, 280) + '...' : quote.quote}&rdquo;
      </p>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: sentimentColor,
          opacity: 0.7,
        }}>
          {quote.sentiment}
        </span>
        <span style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: 9,
          color: 'rgba(26,8,8,0.25)',
        }}>
          {quote.date}
        </span>
      </div>
    </div>
  )
}

// ── Brand Detail Panel ──

function BrandDetail({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const vibe = getVibe(brand)
  const verdict = getVerdict(brand)
  const posPct = Math.round((brand.positive / brand.total) * 100)
  const negPct = Math.round((brand.negative / brand.total) * 100)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        padding: '28px 24px',
        background: 'rgba(255,255,255,0.5)',
        borderRadius: '0 0 16px 16px',
        borderTop: '1px solid rgba(26,8,8,0.04)',
      }}>
        {/* Header stats */}
        <div style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.3)',
              marginBottom: 4,
            }}>Positive</div>
            <div style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 28,
              fontWeight: 600,
              color: '#5C8C4A',
            }}>{posPct}%</div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.3)',
              marginBottom: 4,
            }}>Negative</div>
            <div style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 28,
              fontWeight: 600,
              color: '#C5352C',
            }}>{negPct}%</div>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.3)',
              marginBottom: 4,
            }}>Vibe</div>
            <div style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 28,
              fontWeight: 600,
              color: vibe.color,
              fontStyle: 'italic',
            }}>{vibe.label}</div>
          </div>
        </div>

        {/* Community verdict */}
        <p style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 17,
          lineHeight: 1.6,
          color: 'rgba(26,8,8,0.6)',
          margin: '0 0 28px 0',
          maxWidth: 560,
        }}>
          {verdict}
        </p>

        {/* Year chart */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(26,8,8,0.25)',
            marginBottom: 12,
          }}>
            Sentiment over time
          </div>
          <div style={{ overflowX: 'auto' }}>
            <YearChart brand={brand} width={Math.max(400, Object.keys(brand.byYear).length * 42)} />
          </div>
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 8,
          }}>
            {[
              { label: 'positive', color: '#5C8C4A' },
              { label: 'neutral', color: '#8A7060' },
              { label: 'negative', color: '#C5352C' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: l.color,
                  opacity: l.label === 'neutral' ? 0.3 : 0.85,
                }} />
                <span style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: 8,
                  letterSpacing: '0.05em',
                  color: 'rgba(26,8,8,0.3)',
                }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quotes */}
        {brand.topQuotes.length > 0 && (
          <div>
            <div style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.25)',
              marginBottom: 12,
            }}>
              What people actually said
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {brand.topQuotes.slice(0, 5).map((q, i) => (
                <QuoteCard key={i} quote={q} />
              ))}
            </div>
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(26,8,8,0.3)',
            background: 'none',
            border: '1px solid rgba(26,8,8,0.1)',
            padding: '8px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(26,8,8,0.6)'; e.currentTarget.style.borderColor = 'rgba(26,8,8,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(26,8,8,0.3)'; e.currentTarget.style.borderColor = 'rgba(26,8,8,0.1)' }}
        >
          collapse
        </button>
      </div>
    </motion.div>
  )
}

// ── VS Callout ──

function VSCallout({ vs, topSpecialty }: { vs: Brand; topSpecialty: Brand }) {
  const vsPosPct = Math.round((vs.positive / vs.total) * 100)
  const specPosPct = Math.round((topSpecialty.positive / topSpecialty.total) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'linear-gradient(135deg, rgba(197,53,44,0.04) 0%, rgba(212,120,154,0.06) 100%)',
        border: '1px solid rgba(197,53,44,0.1)',
        borderRadius: 16,
        padding: '24px 22px',
        marginBottom: 40,
      }}
    >
      <div style={{
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: 9,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#C5352C',
        opacity: 0.6,
        marginBottom: 12,
      }}>
        The elephant in the room
      </div>
      <h3 style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 24,
        fontWeight: 600,
        color: '#1A0808',
        margin: '0 0 12px 0',
      }}>
        The truth about Victoria&apos;s Secret
      </h3>
      <p style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 16,
        lineHeight: 1.7,
        color: 'rgba(26,8,8,0.6)',
        margin: '0 0 20px 0',
        maxWidth: 600,
      }}>
        VS is one of the most-discussed brands on r/ABraThatFits with {vs.total.toLocaleString()} mentions.
        The community sentiment sits at {vsPosPct}% positive &mdash; compare that to specialty brands
        like {topSpecialty.name} at {specPosPct}% positive. This isn&apos;t about shaming anyone&apos;s choices.
        It&apos;s about knowing that when you walk into a VS store, their sizing system works differently
        from the measurement-based approach this community trusts.
      </p>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 8,
            letterSpacing: '0.1em',
            color: 'rgba(26,8,8,0.3)',
            marginBottom: 4,
          }}>VS sentiment</div>
          <SentimentBar brand={vs} height={8} />
        </div>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 8,
            letterSpacing: '0.1em',
            color: 'rgba(26,8,8,0.3)',
            marginBottom: 4,
          }}>{topSpecialty.name} sentiment</div>
          <SentimentBar brand={topSpecialty} height={8} />
        </div>
      </div>
    </motion.div>
  )
}

// ── Brand Card ──

function BrandCard({
  brand,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  compareMode,
  index,
}: {
  brand: Brand
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onSelect: () => void
  compareMode: boolean
  index: number
}) {
  const vibe = getVibe(brand)
  const isVS = brand.name === "Victoria's Secret"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.8), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: isVS
          ? 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(212,120,154,0.06) 100%)'
          : 'rgba(255,255,255,0.5)',
        borderRadius: 16,
        border: isSelected
          ? '2px solid #C9881F'
          : isVS
            ? '1px solid rgba(212,120,154,0.15)'
            : '1px solid rgba(26,8,8,0.05)',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: isSelected ? '0 0 0 3px rgba(212,160,32,0.1)' : 'none',
      }}
    >
      <div
        onClick={compareMode ? onSelect : onToggle}
        style={{
          padding: '20px 24px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget.parentElement as HTMLElement).style.boxShadow = isSelected
            ? '0 0 0 3px rgba(212,160,32,0.1)'
            : '0 2px 12px rgba(26,8,8,0.06)'
        }}
        onMouseLeave={e => {
          (e.currentTarget.parentElement as HTMLElement).style.boxShadow = isSelected
            ? '0 0 0 3px rgba(212,160,32,0.1)'
            : 'none'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 22,
              fontWeight: 600,
              color: '#1A0808',
              margin: 0,
              lineHeight: 1.2,
            }}>
              {compareMode && (
                <span style={{
                  display: 'inline-block',
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: isSelected ? '2px solid #C9881F' : '2px solid rgba(26,8,8,0.15)',
                  background: isSelected ? '#C9881F' : 'transparent',
                  marginRight: 10,
                  verticalAlign: 'middle',
                  position: 'relative',
                  top: -1,
                  transition: 'all 0.2s ease',
                }}>
                  {isSelected && (
                    <svg width={12} height={12} viewBox="0 0 16 16" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <path d="M3 8l3 3 7-7" stroke="#fff" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              )}
              {brand.name}
            </h3>
            <div style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 10,
              color: 'rgba(26,8,8,0.35)',
              marginTop: 4,
              letterSpacing: '0.05em',
            }}>
              {brand.total.toLocaleString()} mentions
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 14,
            fontStyle: 'italic',
            color: vibe.color,
            opacity: 0.9,
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}>
            {vibe.label}
          </span>
        </div>

        <SentimentBar brand={brand} />

        {isVS && !isExpanded && (
          <div style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 8,
            letterSpacing: '0.1em',
            color: '#D4789A',
            marginTop: 8,
            opacity: 0.6,
          }}>
            tap to see the full story
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <BrandDetail brand={brand} onClose={onToggle} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ──

export default function BrandsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelection, setCompareSelection] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  const vs = useMemo(() => brandData.find(b => b.name === "Victoria's Secret"), [])
  const topSpecialty = useMemo(() => brandData.find(b => b.name === 'Panache')!, [])

  const filteredBrands = useMemo(() => {
    let result = [...brandData]

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(b => b.name.toLowerCase().includes(q))
    }

    // Filters
    switch (filter) {
      case 'loved':
        result = result.filter(b => b.positive / b.total > 0.6)
        result.sort((a, b) => (b.positive / b.total) - (a.positive / a.total))
        break
      case 'discussed':
        result.sort((a, b) => b.total - a.total)
        break
      case 'rising':
        result = result.filter(isRising)
        result.sort((a, b) => b.total - a.total)
        break
      case 'controversial':
        result = result.filter(b => b.negative / b.total > 0.05)
        result.sort((a, b) => (b.negative / b.total) - (a.negative / a.total))
        break
      default:
        result.sort((a, b) => b.total - a.total)
    }

    return result
  }, [search, filter])

  const compareBrands = useMemo(
    () => compareSelection.map(name => brandData.find(b => b.name === name)!).filter(Boolean),
    [compareSelection]
  )

  function toggleCompareSelect(name: string) {
    setCompareSelection(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name)
      if (prev.length >= 3) return prev
      return [...prev, name]
    })
  }

  function exitCompareMode() {
    setCompareMode(false)
    setCompareSelection([])
  }

  const filters: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'All brands' },
    { key: 'loved', label: 'Most loved' },
    { key: 'discussed', label: 'Most discussed' },
    { key: 'rising', label: 'Rising' },
    { key: 'controversial', label: 'Controversial' },
  ]

  return (
    <main style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAF6EE 0%, #F7F1E6 40%, #FAF6EE 100%)',
    }}>
      <FilmGrain />

      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: 900,
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Navigation */}
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '28px 0',
        }}>
          <Link
            href="/froot"
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(26,8,8,0.3)',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(26,8,8,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(26,8,8,0.3)'}
          >
            &larr; back to froot
          </Link>
          <span style={{
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(26,8,8,0.15)',
          }}>
            {brandData.length} brands tracked
          </span>
        </nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 48, paddingTop: 20 }}
        >
          <h1 style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 300,
            color: '#1A0808',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}>
            Brand Knowledge Graph
          </h1>
          <p style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 18,
            lineHeight: 1.6,
            color: 'rgba(26,8,8,0.5)',
            margin: '16px 0 0 0',
            maxWidth: 540,
          }}>
            What real people on r/ABraThatFits actually think about {brandData.length} brands,
            drawn from {brandData.reduce((s, b) => s + b.total, 0).toLocaleString()} mentions
            across years of community conversations.
          </p>
        </motion.div>

        {/* VS callout */}
        {vs && topSpecialty && <VSCallout vs={vs} topSpecialty={topSpecialty} />}

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ marginBottom: 32 }}
        >
          {/* Search bar */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <div style={{
              flex: 1,
              minWidth: 200,
              position: 'relative',
            }}>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search brands..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 38px',
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(26,8,8,0.08)',
                  borderRadius: 10,
                  color: '#1A0808',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  letterSpacing: '0.02em',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(26,8,8,0.15)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(26,8,8,0.08)'}
              />
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(26,8,8,0.25)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx={11} cy={11} r={8} />
                <line x1={21} y1={21} x2={16.65} y2={16.65} />
              </svg>
            </div>

            <button
              onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '12px 20px',
                borderRadius: 10,
                border: compareMode ? '1px solid #C9881F' : '1px solid rgba(26,8,8,0.1)',
                background: compareMode ? 'rgba(212,160,32,0.08)' : 'rgba(255,255,255,0.4)',
                color: compareMode ? '#C9881F' : 'rgba(26,8,8,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {compareMode ? `comparing ${compareSelection.length}/3` : 'compare'}
            </button>
          </div>

          {/* Filter pills */}
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: filter === f.key ? '1px solid rgba(26,8,8,0.2)' : '1px solid rgba(26,8,8,0.06)',
                  background: filter === f.key ? 'rgba(26,8,8,0.06)' : 'transparent',
                  color: filter === f.key ? 'rgba(26,8,8,0.6)' : 'rgba(26,8,8,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Comparison panel */}
        <AnimatePresence>
          {compareMode && compareBrands.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(212,160,32,0.15)',
                borderRadius: 16,
                padding: '24px 20px',
                marginBottom: 32,
              }}
            >
              <div style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: 9,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#C9881F',
                opacity: 0.6,
                marginBottom: 8,
              }}>
                Side-by-side comparison
              </div>
              <h3 style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 22,
                fontWeight: 600,
                color: '#1A0808',
                margin: '0 0 4px 0',
              }}>
                {compareBrands.map(b => b.name).join(' vs ')}
              </h3>
              <p style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 14,
                color: 'rgba(26,8,8,0.4)',
                margin: '0 0 20px 0',
              }}>
                Positive sentiment ratio over time (higher is better)
              </p>

              <div style={{ overflowX: 'auto' }}>
                <ComparisonChart brands={compareBrands} />
              </div>

              {/* Stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 16,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid rgba(26,8,8,0.05)',
              }}>
                {compareBrands.map((b, i) => {
                  const colors = ['#5C8C4A', '#C5352C', '#C9881F']
                  return (
                    <div key={b.name}>
                      <div style={{
                        fontFamily: 'var(--font-cormorant), serif',
                        fontSize: 18,
                        fontWeight: 600,
                        color: colors[i],
                        marginBottom: 8,
                      }}>{b.name}</div>
                      <div style={{ marginBottom: 8 }}>
                        <SentimentBar brand={b} height={6} />
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-space-mono), monospace',
                        fontSize: 9,
                        color: 'rgba(26,8,8,0.35)',
                        lineHeight: 1.8,
                      }}>
                        {b.total.toLocaleString()} mentions<br />
                        {Math.round(b.positive / b.total * 100)}% positive<br />
                        {getVibe(b).label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compare hint */}
        <AnimatePresence>
          {compareMode && compareBrands.length < 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: 10,
                color: '#C9881F',
                textAlign: 'center',
                padding: '12px 0 20px',
                letterSpacing: '0.05em',
              }}
            >
              Select {2 - compareBrands.length} more brand{compareBrands.length === 1 ? '' : 's'} to compare
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brand grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          paddingBottom: 80,
        }}>
          <AnimatePresence mode="popLayout">
            {filteredBrands.map((brand, i) => {
              const isExpanded = expandedBrand === brand.name
              return (
                <motion.div
                  key={brand.name}
                  layout
                  style={{
                    gridColumn: isExpanded ? '1 / -1' : undefined,
                  }}
                >
                  <BrandCard
                    brand={brand}
                    isExpanded={isExpanded}
                    isSelected={compareSelection.includes(brand.name)}
                    onToggle={() => setExpandedBrand(isExpanded ? null : brand.name)}
                    onSelect={() => toggleCompareSelect(brand.name)}
                    compareMode={compareMode}
                    index={i}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredBrands.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 0',
          }}>
            <p style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 20,
              color: 'rgba(26,8,8,0.3)',
              fontStyle: 'italic',
            }}>
              No brands match &ldquo;{search}&rdquo;
            </p>
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(26,8,8,0.3)',
                background: 'none',
                border: '1px solid rgba(26,8,8,0.1)',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              clear search
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '40px 0 60px',
          borderTop: '1px solid rgba(26,8,8,0.04)',
        }}>
          <p style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: 14,
            color: 'rgba(26,8,8,0.25)',
            fontStyle: 'italic',
            lineHeight: 1.6,
            maxWidth: 480,
            margin: '0 auto',
          }}>
            All data drawn from real conversations on r/ABraThatFits.
            Every brand has people who love it and people who don&apos;t &mdash;
            the goal here is to surface those real experiences, not to judge.
          </p>
        </div>
      </div>
    </main>
  )
}
