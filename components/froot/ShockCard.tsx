'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { SizeResult, Measurements } from './sizing'

interface ShockCardProps {
  result: SizeResult
  measurements?: Measurements
  oldSize?: string
}

const US_CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']

function cupIdx(cup: string): number {
  const c = cup.toUpperCase().replace('/', '')
  for (let i = 0; i < US_CUPS.length; i++) {
    if (c === US_CUPS[i] || c.startsWith(US_CUPS[i])) return i
  }
  return 0
}

function parseBandCup(size: string): { band: number; cup: string; cupI: number } | null {
  const m = size.match(/^(\d+)\s*(.+)$/)
  if (!m) return null
  const cup = m[2].trim().split('/')[0]
  return { band: parseInt(m[1]), cup, cupI: cupIdx(cup) }
}

function plusFourSize(ms: Measurements): string {
  const toIn = (v: number) => ms.unit === 'cm' ? v / 2.54 : v
  const snug = toIn(ms.snugUnderbust)
  const standing = toIn(ms.standingBust)
  const band = Math.round((snug + 4) / 2) * 2
  const diff = Math.max(0, Math.round(standing - band))
  return `${band}${US_CUPS[Math.min(diff + 1, US_CUPS.length - 1)]}`
}

export default function ShockCard({ result, measurements, oldSize }: ShockCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [saved, setSaved] = useState(false)

  const before = oldSize || (measurements ? plusFourSize(measurements) : null)
  if (!before) return null

  const oldParsed = parseBandCup(before)
  const newParsed = parseBandCup(result.sizeUS)
  if (!oldParsed || !newParsed) return null

  // Cup difference = letter difference + band change (each band down ≈ 1 cup up)
  const cupDiff = Math.round((newParsed.cupI - oldParsed.cupI) + (oldParsed.band - newParsed.band) / 2)
  if (cupDiff < 1 && before.toLowerCase() === result.sizeUS.toLowerCase()) return null

  const diffText = cupDiff >= 1 ? `off by ${cupDiff} cup size${cupDiff !== 1 ? 's' : ''}` : null

  // Clean display sizes
  const displayOld = before.toUpperCase()
  const displayNew = result.sizeUS

  async function handleSave() {
    if (!cardRef.current) return
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true })
      const a = document.createElement('a')
      a.download = 'my-real-size-froot.png'
      a.href = url
      a.click()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      if (navigator.share) {
        navigator.share({
          title: `I was wearing ${displayOld}. I'm actually ${displayNew}.`,
          url: 'https://froot.fit',
        })
      }
    }
  }

  async function handleShare() {
    const text = `I was wearing ${displayOld}. I\u2019m actually ${displayNew}.${diffText ? ` ${diffText}.` : ''} \u2014 froot.fit`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My real bra size', text, url: 'https://froot.fit' })
        return
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(text)
  }

  const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 56 }}>
      {/* ── The Card ── */}
      <div
        ref={cardRef}
        style={{
          width: 360,
          maxWidth: '100%',
          padding: '52px 40px',
          borderRadius: 24,
          background: '#1A0808',
          color: '#FAF6EE',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          fontFamily: 'var(--font-space-mono), monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* "you were wearing" */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.4,
            marginBottom: 12,
          }}
        >
          you were wearing
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: EASE }}
          style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 36,
            opacity: 0.5,
            lineHeight: 1,
            marginBottom: 28,
            textDecoration: 'line-through',
            textDecorationColor: 'rgba(250,246,238,0.2)',
            textDecorationThickness: '1.5px',
          }}
        >
          {displayOld}
        </motion.div>

        {/* Gold divider */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 40 }}
          transition={{ delay: 0.8, duration: 0.4, ease: EASE }}
          style={{ height: 1.5, background: '#D4A020', marginBottom: 28, borderRadius: 1 }}
        />

        {/* "you're actually" */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          style={{
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#D4A020',
            marginBottom: 12,
          }}
        >
          you&rsquo;re actually
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 15 }}
          style={{
            fontFamily: 'var(--font-dm-serif), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 56,
            color: '#D4A020',
            lineHeight: 1,
            marginBottom: 28,
          }}
        >
          {displayNew}
        </motion.div>

        {/* Difference */}
        {diffText && (
          <>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 24 }}
              transition={{ delay: 1.6, duration: 0.3 }}
              style={{ height: 1, background: 'rgba(250,246,238,0.1)', marginBottom: 20, borderRadius: 1 }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.4 }}
              style={{
                fontSize: 12,
                letterSpacing: '0.08em',
                opacity: 0.6,
                marginBottom: 8,
              }}
            >
              {diffText}
            </motion.div>
          </>
        )}

        {/* Watermark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0, duration: 0.4 }}
          style={{
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            opacity: 0.15,
            marginTop: 24,
          }}
        >
          froot.fit
        </motion.div>
      </div>

      {/* ── Buttons ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.4 }}
        style={{ display: 'flex', gap: 12, marginTop: 24 }}
      >
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          style={{
            padding: '14px 28px',
            background: '#1A0808',
            color: '#FAF6EE',
            border: 'none',
            borderRadius: 100,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {saved ? 'saved \u2713' : 'save this'}
        </motion.button>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          style={{
            padding: '14px 28px',
            background: 'transparent',
            color: '#1A0808',
            border: '1px solid rgba(26,8,8,0.15)',
            borderRadius: 100,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          share
        </motion.button>
      </motion.div>
    </div>
  )
}
