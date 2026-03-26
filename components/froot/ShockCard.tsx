'use client'

import { useRef, useState, useEffect } from 'react'
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

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function ShockCard({ result, measurements, oldSize }: ShockCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [saved, setSaved] = useState(false)
  const [phase, setPhase] = useState(0)

  const before = oldSize || (measurements ? plusFourSize(measurements) : null)
  if (!before) return null

  const oldParsed = parseBandCup(before)
  const newParsed = parseBandCup(result.sizeUS)
  if (!oldParsed || !newParsed) return null

  const cupDiff = newParsed.cupI - oldParsed.cupI
  if (cupDiff < 1 && before.toLowerCase() === result.sizeUS.toLowerCase()) return null

  const displayOld = before.toUpperCase()
  const displayNew = result.sizeUS

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

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
          title: `My real size is ${displayNew}`,
          url: 'https://froot.fit',
        })
      }
    }
  }

  async function handleShare() {
    const text = `Turns out I\u2019m a ${displayNew}, not a ${displayOld}. Found my real size at froot.fit`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My real size', text, url: 'https://froot.fit' })
        return
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(text)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 56 }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <div
          ref={cardRef}
          style={{
            width: 360,
            maxWidth: '100%',
            padding: '56px 44px 48px',
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
            boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(212,160,32,0.06)',
          }}
        >
          {/* Warm ambient glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : {}}
            transition={{ duration: 3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,160,32,0.08) 0%, transparent 70%)',
              top: '35%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              filter: 'blur(30px)',
            }}
          />

          {/* ── Old size — quiet, small, just context ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 0.2 } : {}}
            transition={{ duration: 0.8, ease: EASE }}
            style={{
              fontSize: 9,
              letterSpacing: '0.15em',
              marginBottom: 12,
            }}
          >
            {displayOld}
          </motion.div>

          {/* ── Arrow ── */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={phase >= 1 ? { opacity: 0.15, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.5, ease: EASE }}
            style={{ fontSize: 14, marginBottom: 28 }}
          >
            &darr;
          </motion.div>

          {/* ── The size ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(16px)' }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
            transition={{
              duration: 1.2,
              ease: EASE,
              scale: { type: 'spring', stiffness: 100, damping: 14 },
            }}
            style={{
              fontFamily: 'var(--font-dm-serif), Georgia, serif',
              fontStyle: 'italic',
              fontSize: 80,
              color: '#D4A020',
              lineHeight: 1,
              marginBottom: 0,
              textShadow: '0 0 60px rgba(212,160,32,0.12)',
            }}
          >
            {displayNew}
          </motion.div>

          {/* ── Watermark ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 4 ? { opacity: 0.1 } : {}}
            transition={{ duration: 1 }}
            style={{
              fontSize: 8,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginTop: 40,
            }}
          >
            froot.fit
          </motion.div>
        </div>
      </motion.div>

      {/* ── Buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ display: 'flex', gap: 12, marginTop: 24 }}
      >
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          style={{
            padding: '14px 30px',
            background: '#1A0808',
            color: '#FAF6EE',
            border: '1px solid rgba(212,160,32,0.1)',
            borderRadius: 100,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'border-color 0.3s ease',
          }}
        >
          {saved ? 'saved \u2713' : 'save this'}
        </motion.button>
        <motion.button
          whileHover={{ y: -2, background: 'rgba(26,8,8,0.04)' }}
          whileTap={{ scale: 0.96 }}
          onClick={handleShare}
          style={{
            padding: '14px 30px',
            background: 'transparent',
            color: '#1A0808',
            border: '1px solid rgba(26,8,8,0.1)',
            borderRadius: 100,
            fontFamily: 'var(--font-space-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          share
        </motion.button>
      </motion.div>
    </div>
  )
}
