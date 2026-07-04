'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import FilmGrain from '@/components/FilmGrain'
import myths from '@/data/froot/myths.json'
import stats from '@/data/froot/stats.json'
import transitions from '@/data/froot/size-transitions.json'

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

interface Myth {
  from: string
  to: string
  count: number
}

interface Transition {
  from: string
  to: string
  title: string
  snippet: string
  date: string
  comments: number
}

interface Stats {
  totalPosts: number
  totalSizeTransitions: number
  mostCommonOldSize: { size: string; count: number }[]
  mostCommonNewSize: { size: string; count: number }[]
  dateRange: { from: string; to: string }
}

// ────────────────────────────────────────────────────────
// Size parsing helpers
// ────────────────────────────────────────────────────────

const CUP_ORDER = [
  'AAA', 'AA', 'A', 'B', 'C', 'D', 'DD', 'DDD',
  'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'I', 'J',
  'JJ', 'K', 'KK', 'L', 'M',
]

function parseSize(size: string): { band: number; cup: string; cupIndex: number } | null {
  const match = size.match(/^(\d{2,3})\s*([A-Z]+)$/i)
  if (!match) return null
  const band = parseInt(match[1], 10)
  const cup = match[2].toUpperCase()
  const cupIndex = CUP_ORDER.indexOf(cup)
  if (cupIndex === -1) return null
  return { band, cup, cupIndex }
}

function cupJump(fromSize: string, toSize: string): number {
  const f = parseSize(fromSize)
  const t = parseSize(toSize)
  if (!f || !t) return 0
  return t.cupIndex - f.cupIndex
}

function bandChange(fromSize: string, toSize: string): number {
  const f = parseSize(fromSize)
  const t = parseSize(toSize)
  if (!f || !t) return 0
  return t.band - f.band
}

// ────────────────────────────────────────────────────────
// Color palette
// ────────────────────────────────────────────────────────

const COLORS = {
  bg: '#FAF6EE',
  ink: '#1A0808',
  poppy: '#C5352C',
  rose: '#D4789A',
  meadow: '#5C8C4A',
  gold: '#C9881F',
  muted: '#8A7060',
}

// ────────────────────────────────────────────────────────
// Animated counter component
// ────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value, duration])

  return <span ref={ref}>{display.toLocaleString()}</span>
}

// ────────────────────────────────────────────────────────
// Section wrapper with scroll-triggered entrance
// ────────────────────────────────────────────────────────

function Section({ children, style, delay = 0 }: { children: React.ReactNode; style?: React.CSSProperties; delay?: number }) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      style={{ padding: '0 24px', maxWidth: 960, margin: '0 auto', ...style }}
    >
      {children}
    </motion.section>
  )
}

// ────────────────────────────────────────────────────────
// SECTION 1: Hero stat
// ────────────────────────────────────────────────────────

function HeroStat({ stats: s }: { stats: Stats }) {
  // The subreddit has 45k posts and 231 documented size transitions
  // The real insight: virtually everyone who measures discovers a mismatch
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <div
      ref={ref}
      style={{
        minHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 40px',
        position: 'relative',
      }}
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '10px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: COLORS.muted,
          marginBottom: 32,
        }}
      >
        Data from {s.totalPosts.toLocaleString()} posts on r/ABraThatFits
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(48px, 8vw, 100px)',
          fontWeight: 300,
          lineHeight: 1.05,
          color: COLORS.ink,
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        Almost{' '}
        <span style={{ fontStyle: 'italic', color: COLORS.poppy }}>everyone</span>{' '}
        was wearing the wrong size.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 0.8 }}
        style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(18px, 2.5vw, 24px)',
          color: COLORS.muted,
          marginTop: 28,
          maxWidth: 600,
          lineHeight: 1.6,
        }}
      >
        We collected <AnimatedNumber value={s.totalSizeTransitions} /> documented size transitions
        from people who measured themselves and discovered their true size.
        Here is what the data shows.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 1.2 }}
        style={{
          marginTop: 60,
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'rgba(138,112,96,0.5)',
        }}
      >
        scroll to explore
      </motion.div>
    </div>
  )
}

// ────────────────────────────────────────────────────────
// SECTION 2: Sankey-style flow visualization
// ────────────────────────────────────────────────────────

function SankeyFlow({ data }: { data: Myth[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  // Filter to parseable sizes and take top transitions
  const validMyths = useMemo(() => {
    return data.filter(m => parseSize(m.from) && parseSize(m.to))
  }, [data])

  // Group by from and to, aggregate counts
  const { fromSizes, toSizes, links } = useMemo(() => {
    // Aggregate counts per unique "from" and "to" label
    const fromMap = new Map<string, number>()
    const toMap = new Map<string, number>()

    // Take top transitions (enough to fill the diagram nicely)
    const topLinks = validMyths.slice(0, 40)

    topLinks.forEach(m => {
      fromMap.set(m.from, (fromMap.get(m.from) || 0) + m.count)
      toMap.set(m.to, (toMap.get(m.to) || 0) + m.count)
    })

    // Sort by total flow, take top entries
    const sortedFrom = [...fromMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
    const sortedTo = [...toMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)

    const fromSet = new Set(sortedFrom.map(e => e[0]))
    const toSet = new Set(sortedTo.map(e => e[0]))

    const filteredLinks = topLinks.filter(m => fromSet.has(m.from) && toSet.has(m.to))

    return {
      fromSizes: sortedFrom,
      toSizes: sortedTo,
      links: filteredLinks,
    }
  }, [validMyths])

  // Responsive sizing
  useEffect(() => {
    function measure() {
      if (ref.current) {
        const w = Math.min(ref.current.offsetWidth, 900)
        setDims({ w, h: Math.max(420, Math.min(w * 0.75, 600)) })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Layout calculations
  const layout = useMemo(() => {
    const { w, h } = dims
    // Narrow screens can't afford 120px gutters on each side — the flow band
    // would collapse. Scale the label gutter down with width so the diagram
    // stays legible at 375px.
    const padX = Math.max(54, Math.min(120, w * 0.18))
    const padY = 30
    const nodeW = 14

    const totalFrom = fromSizes.reduce((s, e) => s + e[1], 0)
    const totalTo = toSizes.reduce((s, e) => s + e[1], 0)
    const usableH = h - padY * 2
    const gapFrom = Math.min(8, usableH / (fromSizes.length * 3))
    const gapTo = Math.min(8, usableH / (toSizes.length * 3))

    // Positions for from-side nodes
    let yOffsetFrom = padY
    const fromNodes = fromSizes.map(([label, count]) => {
      const height = Math.max(12, (count / totalFrom) * (usableH - gapFrom * (fromSizes.length - 1)))
      const node = { label, count, x: padX, y: yOffsetFrom, height }
      yOffsetFrom += height + gapFrom
      return node
    })

    // Positions for to-side nodes
    let yOffsetTo = padY
    const toNodes = toSizes.map(([label, count]) => {
      const height = Math.max(12, (count / totalTo) * (usableH - gapTo * (toSizes.length - 1)))
      const node = { label, count, x: w - padX - nodeW, y: yOffsetTo, height }
      yOffsetTo += height + gapTo
      return node
    })

    // Track how much of each node is "consumed" by links so far
    const fromConsumed = new Map<string, number>()
    const toConsumed = new Map<string, number>()
    fromNodes.forEach(n => fromConsumed.set(n.label, 0))
    toNodes.forEach(n => toConsumed.set(n.label, 0))

    const fromNodeMap = new Map(fromNodes.map(n => [n.label, n]))
    const toNodeMap = new Map(toNodes.map(n => [n.label, n]))

    const paths = links.map(link => {
      const fn = fromNodeMap.get(link.from)
      const tn = toNodeMap.get(link.to)
      if (!fn || !tn) return null

      const fromTotal = fn.count
      const toTotal = tn.count

      const thickness = Math.max(2, Math.min(
        (link.count / fromTotal) * fn.height,
        (link.count / toTotal) * tn.height,
        20
      ))

      const fConsumed = fromConsumed.get(link.from) || 0
      const tConsumed = toConsumed.get(link.to) || 0

      const y1 = fn.y + fConsumed + thickness / 2
      const y2 = tn.y + tConsumed + thickness / 2

      fromConsumed.set(link.from, fConsumed + thickness + 1)
      toConsumed.set(link.to, tConsumed + thickness + 1)

      const x1 = padX + nodeW
      const x2 = w - padX - nodeW
      const cx1 = x1 + (x2 - x1) * 0.4
      const cx2 = x1 + (x2 - x1) * 0.6

      // Color based on cup direction
      const jump = cupJump(link.from, link.to)
      let color = COLORS.gold
      if (jump > 0) color = COLORS.poppy  // cup went up
      if (jump < 0) color = COLORS.meadow // cup went down

      return {
        d: `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`,
        thickness,
        color,
        from: link.from,
        to: link.to,
        count: link.count,
      }
    }).filter(Boolean) as { d: string; thickness: number; color: string; from: string; to: string; count: number }[]

    return { fromNodes, toNodes, paths, nodeW, padX }
  }, [dims, fromSizes, toSizes, links])

  return (
    <div ref={ref} style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* Links */}
        {layout.paths.map((p, i) => (
          <motion.path
            key={`link-${i}`}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.thickness}
            strokeOpacity={0.35}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <title>{p.from} → {p.to} ({p.count})</title>
          </motion.path>
        ))}

        {/* From nodes */}
        {layout.fromNodes.map((n, i) => (
          <g key={`from-${n.label}`}>
            <motion.rect
              x={n.x}
              y={n.y}
              width={layout.nodeW}
              height={n.height}
              rx={3}
              fill={COLORS.ink}
              fillOpacity={0.15}
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.04 }}
              style={{ transformOrigin: `${n.x + layout.nodeW / 2}px ${n.y}px` }}
            />
            <motion.text
              x={n.x - 8}
              y={n.y + n.height / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fill={COLORS.ink}
              fillOpacity={0.7}
              fontSize={11}
              fontFamily="var(--font-space-mono), monospace"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.04 }}
            >
              {n.label}
            </motion.text>
          </g>
        ))}

        {/* To nodes */}
        {layout.toNodes.map((n, i) => (
          <g key={`to-${n.label}`}>
            <motion.rect
              x={n.x}
              y={n.y}
              width={layout.nodeW}
              height={n.height}
              rx={3}
              fill={COLORS.poppy}
              fillOpacity={0.2}
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.04 }}
              style={{ transformOrigin: `${n.x + layout.nodeW / 2}px ${n.y}px` }}
            />
            <motion.text
              x={n.x + layout.nodeW + 8}
              y={n.y + n.height / 2}
              textAnchor="start"
              dominantBaseline="middle"
              fill={COLORS.ink}
              fillOpacity={0.7}
              fontSize={11}
              fontFamily="var(--font-space-mono), monospace"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.04 }}
            >
              {n.label}
            </motion.text>
          </g>
        ))}

        {/* Column labels */}
        <text
          x={layout.padX + layout.nodeW / 2}
          y={16}
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize={9}
          fontFamily="var(--font-space-mono), monospace"
          letterSpacing="0.15em"
        >
          THOUGHT THEY WERE
        </text>
        <text
          x={dims.w - layout.padX - layout.nodeW / 2}
          y={16}
          textAnchor="middle"
          fill={COLORS.muted}
          fontSize={9}
          fontFamily="var(--font-space-mono), monospace"
          letterSpacing="0.15em"
        >
          ACTUALLY ARE
        </text>
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        rowGap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 16,
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: '9px',
        letterSpacing: '0.1em',
        color: COLORS.muted,
      }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 3, background: COLORS.poppy, marginRight: 6, verticalAlign: 'middle', borderRadius: 1 }} />Cup went up</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 3, background: COLORS.meadow, marginRight: 6, verticalAlign: 'middle', borderRadius: 1 }} />Cup went down</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 3, background: COLORS.gold, marginRight: 6, verticalAlign: 'middle', borderRadius: 1 }} />Same cup</span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────
// SECTION 3: Sticker shock stories
// ────────────────────────────────────────────────────────

function StickerShockStories({ transitions: t }: { transitions: Transition[] }) {
  // Find the most dramatic cup jumps
  const dramatic = useMemo(() => {
    return t
      .map(story => ({
        ...story,
        jump: Math.abs(cupJump(story.from, story.to)),
        direction: cupJump(story.from, story.to),
      }))
      .filter(s => s.jump >= 2 && parseSize(s.from) && parseSize(s.to))
      .sort((a, b) => b.jump - a.jump || b.comments - a.comments)
      .slice(0, 6)
  }, [t])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20,
    }}>
      {dramatic.map((story, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 12,
            padding: '28px 24px',
            border: '1px solid rgba(26,8,8,0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Size transition badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '13px',
              fontWeight: 700,
              color: COLORS.muted,
              background: 'rgba(26,8,8,0.05)',
              padding: '4px 10px',
              borderRadius: 6,
            }}>
              {story.from}
            </span>
            <span style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: '18px',
              fontStyle: 'italic',
              color: COLORS.poppy,
            }}>
              &rarr;
            </span>
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '13px',
              fontWeight: 700,
              color: COLORS.poppy,
              background: 'rgba(197,53,44,0.08)',
              padding: '4px 10px',
              borderRadius: 6,
            }}>
              {story.to}
            </span>
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '9px',
              color: COLORS.rose,
              marginLeft: 'auto',
            }}>
              +{story.jump} cups
            </span>
          </div>

          {/* Story snippet */}
          <p style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: '16px',
            lineHeight: 1.55,
            color: COLORS.ink,
            opacity: 0.8,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}>
            &ldquo;{story.snippet.trim()}&rdquo;
          </p>

          {/* Date */}
          <div style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '9px',
              color: COLORS.muted,
              opacity: 0.6,
              letterSpacing: '0.05em',
            }}>
              {new Date(story.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: '9px',
              color: COLORS.muted,
              opacity: 0.5,
            }}>
              {story.comments} comments
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────
// SECTION 4: Band number myths — bar chart
// ────────────────────────────────────────────────────────

function BandChart({ data }: { data: Myth[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  // Compute band changes from all myths
  const bandChanges = useMemo(() => {
    const buckets = new Map<number, number>()
    data.forEach(m => {
      const change = bandChange(m.from, m.to)
      if (change === 0) return
      // Bucket by increments of 2 (band sizes go in 2s)
      const bucket = Math.round(change / 2) * 2
      buckets.set(bucket, (buckets.get(bucket) || 0) + m.count)
    })

    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .filter(([change]) => Math.abs(change) <= 14)
  }, [data])

  const maxCount = Math.max(...bandChanges.map(e => e[1]))

  // Count how many went down vs up
  const { down, up } = useMemo(() => {
    let down = 0, up = 0
    bandChanges.forEach(([change, count]) => {
      if (change < 0) down += count
      if (change > 0) up += count
    })
    return { down, up }
  }, [bandChanges])

  const downPct = Math.round((down / (down + up)) * 100)

  return (
    <div ref={ref}>
      <p style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 'clamp(20px, 3vw, 26px)',
        color: COLORS.ink,
        opacity: 0.7,
        marginBottom: 36,
        lineHeight: 1.5,
        maxWidth: 600,
      }}>
        <span style={{ color: COLORS.meadow, fontWeight: 600 }}>{downPct}%</span> of people discovered
        their band number was smaller than they thought. The most common shift?
        Going from a <span style={{ fontStyle: 'italic' }}>36</span> or <span style={{ fontStyle: 'italic' }}>34</span> down
        to a <span style={{ fontStyle: 'italic' }}>30</span> or <span style={{ fontStyle: 'italic' }}>28</span>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bandChanges.map(([change, count], i) => {
          const barWidth = (count / maxCount) * 100
          const isNegative = change < 0
          const label = change > 0 ? `+${change}` : `${change}`

          return (
            <div key={change} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '11px',
                color: COLORS.muted,
                width: 36,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {label}
              </span>
              <div style={{ flex: 1, position: 'relative', height: 22 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${barWidth}%` } : {}}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%',
                    background: isNegative ? COLORS.meadow : COLORS.rose,
                    opacity: 0.6,
                    borderRadius: 4,
                    position: 'relative',
                  }}
                />
              </div>
              <span style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '10px',
                color: COLORS.muted,
                opacity: 0.6,
                width: 28,
                textAlign: 'left',
                flexShrink: 0,
              }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        gap: 20,
        rowGap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 20,
        fontFamily: 'var(--font-space-mono), monospace',
        fontSize: '9px',
        letterSpacing: '0.1em',
        color: COLORS.muted,
      }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.meadow, opacity: 0.6, marginRight: 6, verticalAlign: 'middle', borderRadius: 2 }} />Band went down</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: COLORS.rose, opacity: 0.6, marginRight: 6, verticalAlign: 'middle', borderRadius: 2 }} />Band went up</span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────
// SECTION 5: "You're not alone" counter
// ────────────────────────────────────────────────────────

function YoureNotAlone({ data }: { data: Myth[] }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  // Build a lookup: old size → total count of transitions from that size
  const sizeCountMap = useMemo(() => {
    const map = new Map<string, number>()
    data.forEach(m => {
      map.set(m.from, (map.get(m.from) || 0) + m.count)
    })
    return map
  }, [data])

  // Common old sizes sorted by frequency
  const commonSizes = useMemo(() => {
    return [...sizeCountMap.entries()]
      .filter(([size]) => parseSize(size) !== null)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
  }, [sizeCountMap])

  // Get transitions for selected size
  const transitionsForSize = useMemo(() => {
    if (!selectedSize) return []
    return data
      .filter(m => m.from === selectedSize)
      .sort((a, b) => b.count - a.count)
  }, [data, selectedSize])

  return (
    <div>
      <p style={{
        fontFamily: 'var(--font-cormorant), serif',
        fontSize: 'clamp(18px, 2.5vw, 22px)',
        color: COLORS.muted,
        marginBottom: 28,
        lineHeight: 1.5,
      }}>
        Select the size you currently wear and see how many people shared that starting point.
      </p>

      {/* Size pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 32,
      }}>
        {commonSizes.map(([size, count]) => {
          const isSelected = selectedSize === size
          return (
            <motion.button
              key={size}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedSize(isSelected ? null : size)}
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontSize: '12px',
                padding: '8px 14px',
                borderRadius: 8,
                border: `1.5px solid ${isSelected ? COLORS.poppy : 'rgba(26,8,8,0.1)'}`,
                background: isSelected ? 'rgba(197,53,44,0.08)' : 'rgba(255,255,255,0.5)',
                color: isSelected ? COLORS.poppy : COLORS.ink,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {size}
              <span style={{ fontSize: '9px', opacity: 0.5, marginLeft: 6 }}>{count}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Results */}
      {selectedSize && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 16,
            padding: '32px 28px',
            border: '1px solid rgba(26,8,8,0.06)',
          }}>
            <p style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 300,
              color: COLORS.ink,
              margin: '0 0 8px',
              lineHeight: 1.2,
            }}>
              <span style={{ color: COLORS.poppy, fontWeight: 600 }}>
                {sizeCountMap.get(selectedSize) || 0}
              </span>{' '}
              {(sizeCountMap.get(selectedSize) || 0) === 1 ? 'person' : 'people'} who
              wore a {selectedSize} discovered a better fit.
            </p>

            {transitionsForSize.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontSize: '9px',
                  letterSpacing: '0.15em',
                  color: COLORS.muted,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                }}>
                  They discovered they were actually:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {transitionsForSize.map(t => (
                    <div key={t.to} style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      fontSize: '13px',
                      padding: '6px 14px',
                      borderRadius: 8,
                      background: 'rgba(197,53,44,0.06)',
                      color: COLORS.poppy,
                      fontWeight: 600,
                    }}>
                      {t.to}
                      {t.count > 1 && (
                        <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: 4 }}>
                          x{t.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────

export default function MythsPage() {
  const typedMyths = myths as Myth[]
  const typedTransitions = transitions as Transition[]
  const typedStats = stats as unknown as Stats

  return (
    <main style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      background: COLORS.bg,
      color: COLORS.ink,
      overflowX: 'hidden',
    }}>
      {/* Fixed nav */}
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
        <Link
          href="/froot"
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
          &larr; back to froot
        </Link>
        <span style={{
          fontSize: '9px',
          letterSpacing: '0.15em',
          color: 'rgba(26,8,8,0.15)',
          textTransform: 'uppercase',
        }}>
          size myth buster
        </span>
      </nav>

      {/* Hero */}
      <HeroStat stats={typedStats} />

      {/* Decorative divider */}
      <div style={{
        width: 40,
        height: 1,
        background: 'rgba(26,8,8,0.1)',
        margin: '0 auto 80px',
      }} />

      {/* Sankey flow */}
      <Section>
        <h2 style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 300,
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          Where the sizes <span style={{ fontStyle: 'italic', color: COLORS.poppy }}>actually</span> go
        </h2>
        <p style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: COLORS.muted,
          marginBottom: 40,
          lineHeight: 1.5,
          maxWidth: 560,
        }}>
          Each line connects what someone thought their size was (left) with what they
          actually measured as (right). Thicker lines mean more people made that same discovery.
        </p>
        <SankeyFlow data={typedMyths} />
      </Section>

      <div style={{ height: 100 }} />

      {/* Sticker shock */}
      <Section>
        <h2 style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 300,
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          The <span style={{ fontStyle: 'italic', color: COLORS.rose }}>sticker shock</span> moments
        </h2>
        <p style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(16px, 2vw, 20px)',
          color: COLORS.muted,
          marginBottom: 36,
          lineHeight: 1.5,
          maxWidth: 560,
        }}>
          The biggest cup-size jumps in our data. These are the people who had the most
          dramatic &ldquo;wait, really?!&rdquo; reaction.
        </p>
        <StickerShockStories transitions={typedTransitions} />
      </Section>

      <div style={{ height: 100 }} />

      {/* Band myths */}
      <Section>
        <h2 style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 300,
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          The band number <span style={{ fontStyle: 'italic', color: COLORS.meadow }}>myth</span>
        </h2>
        <p style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '10px',
          letterSpacing: '0.15em',
          color: COLORS.muted,
          marginBottom: 32,
          textTransform: 'uppercase',
        }}>
          How band sizes shift after measuring (in inches)
        </p>
        <BandChart data={typedMyths} />
      </Section>

      <div style={{ height: 100 }} />

      {/* You're not alone */}
      <Section style={{ paddingBottom: 120 }}>
        <h2 style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 300,
          lineHeight: 1.15,
          marginBottom: 8,
        }}>
          You&rsquo;re <span style={{ fontStyle: 'italic', color: COLORS.gold }}>not alone</span>
        </h2>
        <YoureNotAlone data={typedMyths} />
      </Section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 24px 60px',
        borderTop: '1px solid rgba(26,8,8,0.06)',
      }}>
        <p style={{
          fontFamily: 'var(--font-space-mono), monospace',
          fontSize: '9px',
          letterSpacing: '0.15em',
          color: COLORS.muted,
          opacity: 0.5,
          textTransform: 'uppercase',
        }}>
          Data sourced from r/ABraThatFits &middot; {typedStats.dateRange.from} to {typedStats.dateRange.to} &middot; {typedStats.totalPosts.toLocaleString()} posts analyzed
        </p>
        <Link
          href="/froot"
          style={{
            display: 'inline-block',
            marginTop: 20,
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: '18px',
            color: COLORS.poppy,
            textDecoration: 'none',
            borderBottom: `1px solid rgba(197,53,44,0.3)`,
            paddingBottom: 2,
            transition: 'border-color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = COLORS.poppy}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(197,53,44,0.3)'}
        >
          Find your real size
        </Link>
      </footer>
      <FilmGrain />
    </main>
  )
}
