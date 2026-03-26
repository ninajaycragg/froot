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
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 3600),
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
    const text = `The sizing system said ${displayOld}. My body says ${displayNew}. 80% of women don\u2019t know their real size \u2014 froot.fit`
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE }}
      >
        <div
          ref={cardRef}
          style={{
            width: 380,
            maxWidth: '100%',
            padding: '64px 48px 56px',
            borderRadius: 28,
            background: 'linear-gradient(170deg, #1E0E0A 0%, #140808 50%, #1A0C08 100%)',
            color: '#FAF6EE',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        >
          {/* Warm glow behind hero size */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : {}}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,160,32,0.1) 0%, transparent 65%)',
              top: '42%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              filter: 'blur(40px)',
            }}
          />

          {/* ── "the sizing system said" + old size ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: EASE }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              marginBottom: 40,
            }}
          >
            <span style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 8,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.3,
            }}>
              the sizing system said
            </span>
            <span style={{
              fontFamily: 'var(--font-dm-serif), Georgia, serif',
              fontStyle: 'italic',
              fontSize: 28,
              opacity: 0.25,
              lineHeight: 1,
            }}>
              {displayOld}
            </span>
          </motion.div>

          {/* ── "your body says" ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 8,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#D4A020',
              marginBottom: 16,
            }}
          >
            your body says
          </motion.div>

          {/* ── THE SIZE — hero ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(12px)' }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
            transition={{
              opacity: { duration: 0.8, ease: EASE },
              filter: { duration: 1.2, ease: EASE },
              scale: { type: 'spring', stiffness: 80, damping: 12, delay: 0.15 },
            }}
            style={{
              fontFamily: 'var(--font-dm-serif), Georgia, serif',
              fontStyle: 'italic',
              fontSize: 88,
              color: '#D4A020',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              marginBottom: 44,
              position: 'relative',
              textShadow: '0 0 80px rgba(212,160,32,0.08)',
            }}
          >
            {displayNew}
          </motion.div>

          {/* ── Social proof line ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'rgba(250,246,238,0.25)',
              lineHeight: 1.8,
            }}
          >
            80% of women don&rsquo;t know their real size.
            <br />
            <span style={{ color: 'rgba(212,160,32,0.45)' }}>now you do.</span>
          </motion.div>

          {/* ── Watermark ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 4 ? { opacity: 0.1 } : {}}
            transition={{ duration: 1 }}
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontSize: 8,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginTop: 44,
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
