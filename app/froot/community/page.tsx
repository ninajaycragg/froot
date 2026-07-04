'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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

type Stats = {
  totalPosts: number
  dateRange: { from: string; to: string }
  totalSizeTransitions: number
  topBrands: string[]
  avgCommentsPerPost: number
  mostCommonOldSize: { size: string; count: number }[]
  mostCommonNewSize: { size: string; count: number }[]
}

const FEATURES = [
  {
    href: '/froot/oracle',
    title: 'Fit Oracle',
    subtitle: 'Search 45,000 real stories',
    description: 'Type your bra frustration. Get back real advice from people who had the exact same problem.',
    emoji: '🔮',
    color: ROSE,
  },
  {
    href: '/froot/myths',
    title: 'Size Myths',
    subtitle: 'The data doesn\'t lie',
    description: '"I was a 34B my whole life" — until they weren\'t. See the most common sizing revelations, visualized.',
    emoji: '🤯',
    color: POPPY,
  },
  {
    href: '/froot/stories',
    title: 'Real Stories',
    subtitle: 'Filtered by what you\'re going through',
    description: 'Gapping? Spillage? First bra? Sports bra? Find stories from people with your exact situation.',
    emoji: '💬',
    color: GOLD,
  },
  {
    href: '/froot/brands',
    title: 'Brand Truth',
    subtitle: 'What the community actually thinks',
    description: '56 brands ranked by real sentiment. See who\'s loved, who\'s controversial, and how opinions changed over time.',
    emoji: '🏷️',
    color: MEADOW,
  },
]

export default function CommunityPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/data/froot/stats.json').then(r => r.json()).then(setStats)
  }, [])

  return (
    <main style={{ background: BG, color: INK, minHeight: '100vh', position: 'fixed', inset: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px' }}>

        <Link href="/froot" style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none' }}>
          ← back to froot
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ marginTop: 24 }}>
          <h1 style={{
            ...serif, fontSize: 'clamp(2.2rem, 6vw, 3.2rem)', fontWeight: 300,
            fontStyle: 'italic', lineHeight: 1.08, margin: 0,
          }}>
            Community<br />
            <span style={{ color: POPPY }}>Intelligence</span>
          </h1>
          <p style={{ ...serif, fontSize: 16, color: MUTED, marginTop: 10, fontStyle: 'italic', maxWidth: 440, lineHeight: 1.6 }}>
            We read 45,000 posts from r/ABraThatFits so you don&apos;t have to.
            Every frustration, every discovery, every &ldquo;finally!&rdquo; &mdash; distilled into
            tools that actually help.
          </p>
        </motion.div>

        {/* Stats ribbon */}
        {stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{
              display: 'flex', gap: 20, marginTop: 28, padding: '16px 20px',
              background: '#fff', borderRadius: 12, border: `1px solid ${FAINT}`,
              flexWrap: 'wrap',
            }}>
            {[
              { label: 'Posts analyzed', value: stats.totalPosts.toLocaleString() },
              { label: 'Size revelations', value: stats.totalSizeTransitions.toString() },
              { label: 'Brands tracked', value: stats.topBrands.length + '+' },
              { label: 'Years of data', value: '4+' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 0 100px' }}>
                <div style={{ ...serif, fontSize: 24, fontWeight: 600, color: INK }}>{s.value}</div>
                <div style={{ ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: MUTED, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Feature cards */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}>
              <Link href={f.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  padding: '20px 22px', background: '#fff', borderRadius: 12,
                  border: `1px solid ${FAINT}`, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = f.color + '40';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${f.color}15`;
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = FAINT;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.transform = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span style={{ fontSize: 28 }}>{f.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <h2 style={{ ...serif, fontSize: 20, fontWeight: 400, margin: 0, color: INK }}>{f.title}</h2>
                        <span style={{ ...mono, fontSize: 8, color: f.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{f.subtitle}</span>
                      </div>
                      <p style={{ ...serif, fontSize: 14, color: MUTED, margin: '6px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                        {f.description}
                      </p>
                    </div>
                    <span style={{ ...serif, fontSize: 18, color: FAINT, marginTop: 4 }}>→</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ ...serif, fontSize: 13, fontStyle: 'italic', color: MUTED, lineHeight: 1.6 }}>
            All data is anonymized and sourced from public Reddit posts.
            We don&apos;t store personal information &mdash; just the wisdom.
          </p>
          <p style={{ ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: FAINT, marginTop: 12 }}>
            ninas.ai/froot
          </p>
        </motion.div>
      </div>
      <FilmGrain />
    </main>
  )
}
