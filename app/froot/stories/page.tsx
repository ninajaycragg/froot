'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import FilmGrain from '@/components/FilmGrain'

const serif: React.CSSProperties = { fontFamily: 'var(--font-cormorant), Georgia, serif' }
const mono: React.CSSProperties = { fontFamily: 'var(--font-space-mono), monospace' }

const BG = '#FAF6EE'
const INK = '#1A0808'
const POPPY = '#C5352C'
const ROSE = '#D4789A'
const MEADOW = '#5C8C4A'
const GOLD = '#C9881F'
const MUTED = '#8A7060'
const FAINT = '#E8E2D8'

type Story = {
  title: string
  snippet: string
  date: string
  commentCount: number
  topComments: string[]
  tags: string[]
}

type FitIssue = {
  title: string
  snippet: string
  date: string
  topComment: string
}

const VIBES = [
  { id: 'all', label: 'All Stories', emoji: '✨' },
  { id: 'gapping', label: 'Gapping', emoji: '👀' },
  { id: 'spillage', label: 'Spillage', emoji: '😤' },
  { id: 'straps-falling', label: 'Strap Problems', emoji: '🩹' },
  { id: 'underwire-pain', label: 'Underwire Pain', emoji: '😣' },
  { id: 'shape-mismatch', label: 'Shape Mismatch', emoji: '🔄' },
  { id: 'sizing-confusion', label: 'Sizing Shock', emoji: '🤯' },
  { id: 'small-bust', label: 'Small Bust', emoji: '🌸' },
  { id: 'large-bust', label: 'Large Bust', emoji: '🌺' },
  { id: 'sports-bra', label: 'Sports Bras', emoji: '🏃‍♀️' },
  { id: 'nursing', label: 'Nursing/Pregnancy', emoji: '🤱' },
  { id: 'first-bra', label: 'First Time', emoji: '💫' },
  { id: 'strapless', label: 'Strapless', emoji: '👗' },
  { id: 'band-too-tight', label: 'Tight Band', emoji: '😖' },
  { id: 'band-too-loose', label: 'Loose Band', emoji: '📏' },
]

const EMPATHY_LINES: Record<string, string> = {
  'gapping': "Gapping is one of the most misunderstood fit issues — it doesn't always mean the cup is too big.",
  'spillage': "Quad-boob happens to the best of us. Usually means the cup is too shallow, not just too small.",
  'straps-falling': "Straps sliding off? Your band might be doing too little work. These people figured it out.",
  'underwire-pain': "Underwire should never hurt. If it does, something's off — and it's probably not your body's fault.",
  'shape-mismatch': "The most underrated fit factor. Two people in the same size can need completely different bras.",
  'sizing-confusion': "Sticker shock is real. But the number on the tag matters way less than how it feels.",
  'small-bust': "Small bust ≠ small problems. Finding bras that don't gap, slide, or feel pointless is a real thing.",
  'large-bust': "The weight, the pain, the limited options — this community gets it deeply.",
  'sports-bra': "The bounce struggle. Finding a sports bra that actually works is its own quest.",
  'nursing': "Your body is doing amazing things. Your bras should keep up.",
  'first-bra': "Starting from scratch? You're in the right place. No judgment, just help.",
  'strapless': "The white whale of bras. These stories might actually help you find one.",
  'band-too-tight': "A too-tight band is miserable. But sometimes what feels tight is actually the right support.",
  'band-too-loose': "If your band rides up in the back, you're getting zero support from where it matters most.",
  'all': "45,000 real people sharing their bra journeys. Every frustration, every discovery, every 'finally!'",
}

export default function StoriesPage() {
  const [topStories, setTopStories] = useState<Story[]>([])
  const [fitIssues, setFitIssues] = useState<Record<string, FitIssue[]>>({})
  const [selectedVibe, setSelectedVibe] = useState('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/data/froot/top-stories.json').then(r => r.json()),
      fetch('/data/froot/fit-issues.json').then(r => r.json()),
    ]).then(([stories, issues]) => {
      setTopStories(stories)
      setFitIssues(issues)
      setLoaded(true)
    })
  }, [])

  const stories = useMemo(() => {
    if (selectedVibe === 'all') return topStories.slice(0, 60)
    const issueStories = fitIssues[selectedVibe] || []
    // Convert fit issue format to story-like format
    return issueStories.map((s, i) => ({
      title: s.title,
      snippet: s.snippet,
      date: s.date,
      commentCount: 0,
      topComments: s.topComment ? [s.topComment] : [],
      tags: [selectedVibe],
    }))
  }, [selectedVibe, topStories, fitIssues])

  return (
    <main style={{ background: BG, color: INK, minHeight: '100vh', position: 'fixed', inset: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <Link href="/froot" style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none' }}>
          ← back to froot
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
          <h1 style={{ ...serif, fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 300, fontStyle: 'italic', margin: 0, lineHeight: 1.1 }}>
            Real stories from<br />
            <span style={{ color: POPPY }}>real bodies</span>
          </h1>
          <p style={{ ...serif, fontSize: 16, color: MUTED, marginTop: 8, fontStyle: 'italic', maxWidth: 440 }}>
            45,000 people shared their bra journey on r/ABraThatFits.
            Here are the ones that might feel like yours.
          </p>
        </motion.div>

        {/* Vibe filter pills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VIBES.map(v => {
            const on = selectedVibe === v.id
            return (
              <button key={v.id} type="button" onClick={() => { setSelectedVibe(v.id); setExpanded(null) }}
                style={{
                  ...mono, fontSize: 9, padding: '5px 12px', borderRadius: 100,
                  border: `1px solid ${on ? INK : FAINT}`,
                  background: on ? INK : '#fff', color: on ? BG : MUTED,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {v.emoji} {v.label}
              </button>
            )
          })}
        </motion.div>

        {/* Empathy line */}
        <AnimatePresence mode="wait">
          <motion.p key={selectedVibe}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ ...serif, fontSize: 15, fontStyle: 'italic', color: MUTED, marginTop: 20, marginBottom: 24, lineHeight: 1.6 }}>
            {EMPATHY_LINES[selectedVibe] || ''}
          </motion.p>
        </AnimatePresence>

        {/* Story count */}
        {loaded && (
          <p style={{ ...mono, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, marginBottom: 12 }}>
            {stories.length} stories
          </p>
        )}

        {/* Stories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stories.map((story, i) => (
            <motion.div key={`${story.title}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                padding: '14px 16px',
                border: `1px solid ${expanded === i ? INK + '30' : FAINT}`,
                borderRadius: 10, background: '#fff', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <h3 style={{ ...serif, fontSize: 15, fontWeight: 400, margin: 0, lineHeight: 1.35, color: INK, flex: 1 }}>
                  {story.title || 'Untitled post'}
                </h3>
                <span style={{ ...mono, fontSize: 8, color: MUTED, whiteSpace: 'nowrap', marginTop: 2 }}>
                  {story.date}
                </span>
              </div>

              <AnimatePresence>
                {expanded === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}>
                    <p style={{ ...serif, fontSize: 14, color: MUTED, marginTop: 10, lineHeight: 1.6, fontStyle: 'italic' }}>
                      {story.snippet}
                    </p>
                    {story.topComments?.[0] && (
                      <div style={{
                        marginTop: 12, padding: '10px 14px', background: BG,
                        borderRadius: 8, borderLeft: `3px solid ${ROSE}`,
                      }}>
                        <p style={{ ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: ROSE, margin: '0 0 4px' }}>
                          Top reply
                        </p>
                        <p style={{ ...serif, fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                          &ldquo;{story.topComments[0]}&rdquo;
                        </p>
                      </div>
                    )}
                    {story.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                        {story.tags.slice(0, 6).map(tag => (
                          <span key={tag} style={{
                            ...mono, fontSize: 7, padding: '2px 6px', borderRadius: 100,
                            background: FAINT, color: MUTED,
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {!loaded && (
          <div style={{ textAlign: 'center', padding: 40, ...serif, fontStyle: 'italic', color: MUTED }}>
            Loading stories...
          </div>
        )}
      </div>
      <FilmGrain />
    </main>
  )
}
