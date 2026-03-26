'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FilmGrain from '@/components/FilmGrain'
import FruitCard from './FruitCard'
import {
  FRUIT_TYPES,
  getFruitType,
  type FruitType,
  type Projection,
  type Fullness,
  type RootWidth,
} from './fruitTypes'

const QUESTIONS = [
  {
    title: 'the bra problem you know too well',
    options: [
      { label: "Cups gap at the top — even when the size is 'right'", value: 'shallow' },
      { label: 'Fine standing up. Disaster leaning forward.', value: 'average' },
      { label: 'Bending over is a containment emergency', value: 'projected' },
    ],
  },
  {
    title: 'when a bra betrays you, it\u2019s usually\u2026',
    options: [
      { label: 'Spillage up top — always escaping upward', value: 'full-on-top' },
      { label: 'Even all around. Balanced chaos.', value: 'even' },
      { label: 'Settling south by end of day', value: 'full-on-bottom' },
    ],
  },
  {
    title: 'without a bra, where does everything sit?',
    options: [
      { label: 'Close together, straight ahead', value: 'narrow' },
      { label: 'Mostly forward, a bit to the sides', value: 'average' },
      { label: 'All the way to my armpits', value: 'wide' },
    ],
  },
]

type Phase = 'intro' | 0 | 1 | 2 | 'reveal' | 'result'

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
}

export default function QuizFlow() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [answers, setAnswers] = useState<string[]>([])
  const [fruit, setFruit] = useState<FruitType | null>(null)
  const [direction, setDirection] = useState(1)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = phase === 'result' ? 'auto' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [phase])

  // Auto-advance from reveal → result
  useEffect(() => {
    if (phase === 'reveal' && fruit) {
      const t = setTimeout(() => {
        setDirection(1)
        setPhase('result')
      }, 1600)
      return () => clearTimeout(t)
    }
  }, [phase, fruit])

  function handleAnswer(value: string) {
    const next = [...answers, value]
    setAnswers(next)
    setDirection(1)
    if (next.length === 3) {
      const result = getFruitType(next[0] as Projection, next[1] as Fullness, next[2] as RootWidth)
      setFruit(result)
      setPhase('reveal')
    } else {
      setPhase(next.length as 1 | 2)
    }
  }

  function handleBack() {
    setDirection(-1)
    if (typeof phase === 'number' && phase > 0) {
      setAnswers(answers.slice(0, -1))
      setPhase((phase - 1) as Phase)
    } else if (phase === 0) {
      setPhase('intro')
    }
  }

  function handleRetake() {
    setAnswers([])
    setFruit(null)
    setDirection(-1)
    setPhase('intro')
  }

  async function handleSaveImage() {
    if (!cardRef.current || !fruit) return
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true })
      const a = document.createElement('a')
      a.download = `my-froot-${fruit.id}.png`
      a.href = url
      a.click()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // fallback to share API
      if (fruit && navigator.share) {
        navigator.share({
          title: `I'm a ${fruit.emoji} ${fruit.name}`,
          url: `https://froot.fit/result/${fruit.id}`,
        })
      }
    }
  }

  async function handleShare() {
    if (!fruit) return
    const url = `https://froot.fit/result/${fruit.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `I'm a ${fruit.emoji} ${fruit.name}`,
          text: `${fruit.tagline} \u2014 what's your froot?`,
          url,
        })
        return
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isQ = typeof phase === 'number'

  // ── Shared inline styles ──
  const fullCenter: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '0 24px',
    textAlign: 'center',
  }

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-space-mono), monospace',
  }

  const serif: React.CSSProperties = {
    fontFamily: 'var(--font-dm-serif), Georgia, serif',
    fontStyle: 'italic',
  }

  return (
    <main
      style={{
        position: 'relative',
        width: '100vw',
        minHeight: '100vh',
        background:
          phase === 'result' && fruit
            ? `linear-gradient(180deg, #FAF6EE 0%, ${fruit.colorEnd}15 50%, #FAF6EE 100%)`
            : 'linear-gradient(180deg, #FAF6EE 0%, #F7F1E6 40%, #FAF6EE 100%)',
        transition: 'background 0.8s ease',
      }}
    >
      <FilmGrain />

      {/* ── Nav ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '22px 28px',
          zIndex: 20,
          ...mono,
        }}
      >
        {isQ ? (
          <motion.button
            whileHover={{ x: -3 }}
            onClick={handleBack}
            style={{
              fontSize: 9,
              letterSpacing: '0.15em',
              color: 'rgba(26,8,8,0.3)',
              textTransform: 'uppercase',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            &larr; back
          </motion.button>
        ) : phase === 'result' ? (
          <motion.button
            whileHover={{ x: -3 }}
            onClick={handleRetake}
            style={{
              fontSize: 9,
              letterSpacing: '0.15em',
              color: 'rgba(26,8,8,0.3)',
              textTransform: 'uppercase',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            &larr; retake
          </motion.button>
        ) : (
          <a
            href="/"
            style={{
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'rgba(26,8,8,0.3)',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            froot.fit
          </a>
        )}

        {isQ && (
          <span
            style={{
              fontSize: 9,
              letterSpacing: '0.15em',
              color: 'rgba(26,8,8,0.2)',
              textTransform: 'uppercase',
            }}
          >
            {(phase as number) + 1} of 3
          </span>
        )}
      </nav>

      {/* ── Content ── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={String(phase)}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* INTRO */}
          {phase === 'intro' && (
            <div style={fullCenter}>
              <h1
                style={{
                  ...serif,
                  fontSize: 'clamp(42px, 10vw, 64px)',
                  color: '#1A0808',
                  lineHeight: 1.1,
                }}
              >
                what&rsquo;s your froot?
              </h1>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: 'rgba(26,8,8,0.4)',
                  marginTop: 20,
                  lineHeight: 1.8,
                }}
              >
                3 questions &middot; 10 seconds &middot; unhinged accuracy
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setDirection(1)
                  setPhase(0)
                }}
                style={{
                  marginTop: 48,
                  padding: '18px 48px',
                  background: '#1A0808',
                  color: '#FAF6EE',
                  border: 'none',
                  borderRadius: 100,
                  ...mono,
                  fontSize: 12,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                find out &rarr;
              </motion.button>
            </div>
          )}

          {/* QUESTIONS */}
          {isQ && (
            <div style={fullCenter}>
              <h2
                style={{
                  ...serif,
                  fontSize: 'clamp(24px, 6vw, 36px)',
                  color: '#1A0808',
                  lineHeight: 1.3,
                  maxWidth: 500,
                }}
              >
                {QUESTIONS[phase as number].title}
              </h2>
              <div
                style={{
                  marginTop: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  width: '100%',
                  maxWidth: 440,
                }}
              >
                {QUESTIONS[phase as number].options.map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(26,8,8,0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(opt.value)}
                    style={{
                      padding: '20px 24px',
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(26,8,8,0.06)',
                      borderRadius: 16,
                      ...mono,
                      fontSize: 13,
                      color: '#1A0808',
                      textAlign: 'left',
                      cursor: 'pointer',
                      lineHeight: 1.5,
                    }}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && fruit && (
            <div style={fullCenter}>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 12 }}
                style={{ fontSize: 120, lineHeight: 1 }}
              >
                {fruit.emoji}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{ ...serif, fontSize: 48, color: '#1A0808', marginTop: 16 }}
              >
                {fruit.name}
              </motion.div>
            </div>
          )}

          {/* RESULT */}
          {phase === 'result' && fruit && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 80,
                paddingBottom: 80,
                paddingLeft: 24,
                paddingRight: 24,
                minHeight: '100vh',
              }}
            >
              <FruitCard ref={cardRef} fruit={fruit} />

              {/* Share buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveImage}
                  style={{
                    padding: '14px 28px',
                    background: '#1A0808',
                    color: '#FAF6EE',
                    border: 'none',
                    borderRadius: 100,
                    ...mono,
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {saved ? 'saved \u2713' : 'save image'}
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
                    ...mono,
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'copied \u2713' : 'share'}
                </motion.button>
              </div>

              {/* All 8 types row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 40, alignItems: 'center' }}>
                {Object.values(FRUIT_TYPES).map((f) => (
                  <a
                    key={f.id}
                    href={`/result/${f.id}`}
                    style={{
                      fontSize: f.id === fruit.id ? 32 : 22,
                      opacity: f.id === fruit.id ? 1 : 0.35,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      filter: f.id === fruit.id ? 'none' : 'grayscale(0.5)',
                    }}
                    title={f.name}
                  >
                    {f.emoji}
                  </a>
                ))}
              </div>
              <p
                style={{
                  ...mono,
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'rgba(26,8,8,0.25)',
                  textTransform: 'uppercase',
                  marginTop: 8,
                }}
              >
                which one are your friends?
              </p>

              {/* CTA to full calculator */}
              <a
                href="/froot"
                style={{
                  marginTop: 48,
                  padding: '18px 40px',
                  background: 'linear-gradient(135deg, #D4A020, #C5932E)',
                  color: '#FAF6EE',
                  borderRadius: 100,
                  ...mono,
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                now find your exact size &rarr;
              </a>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}
