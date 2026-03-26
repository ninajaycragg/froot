'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SisterSizeGrid from './SisterSizeGrid'
import ShapeViz from './ShapeViz'
import BraStyleIcon from './BraStyleIcon'
import FrootChat from './FrootChat'
import FrootProfileCard from './FrootProfileCard'
import FitFeedbackModal from './FitFeedbackModal'
import { useProfile } from './FrootProfileContext'
import { goalAffinity, getLookDescription } from './lookDescriptions'
import type { SizeResult, Measurements, ShapeProfile, AestheticGoal } from './sizing'

interface CommunityDetail {
  positive: number
  negative: number
  neutral: number
  score: number
  mentions: number
  shapeCount: number
  topIssue: string | null
  topIssueCount: number
}

interface StyleMatchData {
  brand: string
  style: string
  bestSize: string
  score: number
  cupDepth: number
  cupWidth: number
  wireLength?: number
  tags: string[]
  communityScore?: number
  url?: string
  communityDetail?: CommunityDetail | null
}

interface DataContext {
  targetMeasurements?: { cupDepth: number; cupWidth: number; wireLength: number } | null
  styleMatches: StyleMatchData[]
  sizeRange: string
  communityMentions: number
  transitionStats: {
    avgCupChange: number
    commonTransitions: string[]
    totalDataPoints: number
  }
  currentBraMeasurements?: {
    cupDepth: number
    cupWidth: number
    wireLength: number
  } | null
}

interface ClaudeAdvice {
  headline: string
  summary: string
  topPickNote: string
  tips: string[]
  styles: string[]
  brandSuggestions: string[]
  dataContext?: DataContext | null
}

interface FitCheckDataProp {
  currentBrand: string
  currentSize: string
  bandFit: string
  cupFit: string
  issues: string[]
}

interface FrootResultsProps {
  result: SizeResult
  measurements?: Measurements
  shapeProfile: ShapeProfile
  aestheticGoal: AestheticGoal
  onStartOver: () => void
  fitCheckData?: FitCheckDataProp
}

const LOADING_MESSAGES = [
  'reading your measurements\u2026',
  'mapping your shape\u2026',
  'finding your perfect styles\u2026',
  'almost there\u2026',
]

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function FrootResults({
  result,
  measurements,
  shapeProfile,
  aestheticGoal,
  onStartOver,
  fitCheckData,
}: FrootResultsProps) {
  const [advice, setAdvice] = useState<ClaudeAdvice | null>(null)
  const [adviceLoading, setAdviceLoading] = useState(true)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<{ brand: string; style: string; size: string } | null>(null)
  const { profile } = useProfile()

  // Legacy email capture state (kept for backward compat, hidden when profile card is shown)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState(false)

  useEffect(() => {
    if (!adviceLoading) return
    const interval = setInterval(() => setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2400)
    return () => clearInterval(interval)
  }, [adviceLoading])

  useEffect(() => {
    async function fetchAdvice() {
      try {
        const res = await fetch('/api/froot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            measurements: measurements || null,
            sizeResult: { sizeUS: result.sizeUS, sizeUK: result.sizeUK, bustDifference: result.bustDifference, bandSize: result.bandSize },
            shapeProfile,
            fitCheckData: fitCheckData || undefined,
          }),
        })
        if (!res.ok) throw new Error('api error')
        setAdvice(await res.json())
      } catch {
        setAdvice({
          headline: fitCheckData ? 'No wonder it wasn\u2019t working.' : 'We found your fit.',
          summary: '',
          topPickNote: '',
          tips: result.notes,
          styles: [],
          brandSuggestions: [],
          dataContext: null,
        })
      } finally {
        setAdviceLoading(false)
      }
    }
    fetchAdvice()
  }, [measurements, result, shapeProfile, fitCheckData])

  const shapeLabels: Record<string, string> = {
    projected: 'Projected', moderate: 'Moderate', shallow: 'Shallow',
    'full-on-top': 'Full on top', even: 'Even', 'full-on-bottom': 'Full on bottom',
    narrow: 'Narrow roots', average: 'Average roots', wide: 'Wide roots',
  }

  const dataCtx = advice?.dataContext

  // Tag filtering
  const allTags = useMemo(() => {
    if (!dataCtx?.styleMatches) return []
    const tagSet = new Set<string>()
    dataCtx.styleMatches.forEach(s => s.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [dataCtx])

  const filteredMatches = useMemo(() => {
    if (!dataCtx?.styleMatches) return []
    let matches = activeTag
      ? dataCtx.styleMatches.filter(s => s.tags.includes(activeTag))
      : [...dataCtx.styleMatches]

    // Re-rank by blending fit score with goal affinity
    matches = matches.map(s => ({
      ...s,
      _goalScore: goalAffinity(s.tags, aestheticGoal, shapeProfile),
      _blendedScore: s.score * 0.55 + goalAffinity(s.tags, aestheticGoal, shapeProfile) * 0.45,
    })).sort((a, b) => b._blendedScore - a._blendedScore)

    return matches
  }, [dataCtx, activeTag, aestheticGoal, shapeProfile])

  const topMatch = filteredMatches[0]
  const visibleCount = showAllMatches ? 8 : 3
  const otherMatches = filteredMatches.slice(1, visibleCount)
  const hiddenCount = Math.max(0, filteredMatches.length - 1 - visibleCount)

  // Share — includes the current page URL with hash for direct link to results
  async function handleShare() {
    const matches = dataCtx?.styleMatches?.slice(0, 5) || []
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    const text = [
      `My bra size: ${result.sizeUK} (UK) / ${result.sizeUS} (US)`,
      '',
      matches.length > 0 ? 'Top matches:' : '',
      ...matches.map((m, i) => `${i + 1}. ${m.brand} ${m.style.replace(/\s*\([^)]*\)\s*$/, '')} \u2014 ${m.bestSize}`),
      '',
      `Sized with Froot`,
      currentUrl,
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Froot Size', text, url: currentUrl })
        return
      } catch { /* fall through */ }
    }

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading state ──
  if (adviceLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '40px 24px',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            border: '1.5px solid rgba(212,160,32,0.1)',
            borderTopColor: '#D4A020',
            marginBottom: '36px',
          }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
            fontSize: '18px', color: 'rgba(26,8,8,0.35)', marginBottom: '16px',
          }}
        >
          One moment&hellip;
        </motion.p>
        <AnimatePresence mode="wait">
          <motion.p
            key={loadingMsgIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.5, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '10px',
              color: 'rgba(26,8,8,0.25)', letterSpacing: '0.04em',
            }}
          >
            {LOADING_MESSAGES[loadingMsgIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    )
  }

  // ── Results ──
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '100px 24px 80px', minHeight: '100vh',
    }}>

      {/* ═══════════ SECTION 1: The Reveal ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{ textAlign: 'center', maxWidth: '480px', marginBottom: '72px' }}
      >
        {/* Headline — one punchy line */}
        {advice?.headline && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{
              fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
              fontSize: 'clamp(18px, 3.5vw, 24px)', color: '#D4A020',
              fontWeight: 400, marginBottom: '40px', lineHeight: 1.5,
            }}
          >
            {advice.headline}
          </motion.p>
        )}

        {/* Size — the big moment */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
        >
          <p style={{
            fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.25em',
            color: 'rgba(26,8,8,0.3)', textTransform: 'uppercase', marginBottom: '16px',
          }}>
            {fitCheckData ? 'Your new size' : 'Your size'}
          </p>
          <h2 style={{
            fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
            fontSize: 'clamp(56px, 10vw, 80px)', color: '#1A0808',
            fontWeight: 400, marginBottom: '8px', letterSpacing: '-0.03em', lineHeight: 1,
          }}>
            {result.sizeUK}
          </h2>
          <p style={{
            fontFamily: 'var(--font-space-mono)', fontSize: '11px',
            color: 'rgba(26,8,8,0.3)', letterSpacing: '0.1em',
          }}>
            UK &middot; {result.sizeUS} US
          </p>
        </motion.div>

        {/* Sister sizes — subtle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-space-mono)', fontSize: '9px',
            color: 'rgba(26,8,8,0.2)', letterSpacing: '0.04em', marginTop: '24px',
          }}
        >
          also works in <span style={{ color: '#8A7060' }}>{result.sisterDown.uk}</span> or <span style={{ color: '#8A7060' }}>{result.sisterUp.uk}</span>
        </motion.p>
      </motion.div>


      {/* ═══════════ SECTION 2: Top Pick — THE hero card ═══════════ */}
      {topMatch && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: EASE }}
          style={{ maxWidth: '480px', width: '100%', marginBottom: '56px' }}
        >
          <p style={{
            fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: '16px',
            color: 'rgba(26,8,8,0.45)', marginBottom: '16px',
          }}>
            Start here
          </p>

          <motion.div
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(212,160,32,0.12)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              padding: '28px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(212,160,32,0.04) 0%, rgba(212,160,32,0.01) 100%)',
              boxShadow: '0 4px 20px rgba(212,160,32,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flexShrink: 0, marginTop: '4px', opacity: 0.5 }}>
                <BraStyleIcon tags={topMatch.tags} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                    fontSize: '20px', color: '#1A0808', fontWeight: 400,
                  }}>
                    {topMatch.brand}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: '11px',
                    color: 'rgba(26,8,8,0.4)',
                  }}>
                    {topMatch.style.replace(/\s*\([^)]*\)\s*$/, '')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '14px', color: '#1A0808', fontWeight: 600 }}>
                    {topMatch.bestSize}
                  </span>
                  {topMatch.communityScore != null && topMatch.communityScore >= 0.8 && (
                    <span style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                      color: '#5C8C4A', fontWeight: 500,
                    }}>
                      &#9829; {Math.round(topMatch.communityScore * 100)}% loved
                    </span>
                  )}
                </div>
                {/* What this does for you — the visual hook */}
                <p style={{
                  fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: '14px', lineHeight: 1.6,
                  color: '#D4A020', marginBottom: '12px',
                }}>
                  {getLookDescription(topMatch.tags, aestheticGoal, shapeProfile)}
                </p>
                {advice?.topPickNote && (
                  <p style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: '10px', lineHeight: 1.7,
                    color: 'rgba(26,8,8,0.35)', marginBottom: '16px',
                  }}>
                    {advice.topPickNote}
                  </p>
                )}
                {/* Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {topMatch.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '8px', letterSpacing: '0.08em',
                      textTransform: 'uppercase', padding: '4px 10px', borderRadius: '10px',
                      background: 'rgba(26,8,8,0.04)', color: 'rgba(26,8,8,0.3)',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Community deep-dive toggle */}
                {topMatch.communityDetail && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedMatch(expandedMatch === -1 ? null : -1) }}
                    style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '9px',
                      color: 'rgba(26,8,8,0.35)', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#D4A020'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.35)'}
                  >
                    what {topMatch.communityDetail.positive + topMatch.communityDetail.negative + topMatch.communityDetail.neutral} women say
                    <span style={{
                      fontSize: '10px', transition: 'transform 0.3s ease',
                      transform: expandedMatch === -1 ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>&#8964;</span>
                  </button>
                )}
              </div>
            </div>

            {/* Community deep-dive panel */}
            <AnimatePresence>
              {expandedMatch === -1 && topMatch.communityDetail && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    padding: '16px 0 8px',
                    borderTop: '1px solid rgba(212,160,32,0.1)',
                    marginTop: '12px',
                  }}>
                    {/* Sentiment bar */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                        <span style={{
                          fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                          color: '#5C8C4A', fontWeight: 600,
                        }}>
                          {Math.round(topMatch.communityDetail.score * 100)}% positive
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                          color: 'rgba(26,8,8,0.2)', letterSpacing: '0.04em',
                        }}>
                          r/ABraThatFits
                        </span>
                      </div>
                      <div style={{
                        height: '4px', borderRadius: '2px', background: 'rgba(26,8,8,0.04)',
                        overflow: 'hidden', display: 'flex',
                      }}>
                        <div style={{
                          width: `${Math.round(topMatch.communityDetail.score * 100)}%`,
                          background: 'linear-gradient(90deg, #5C8C4A, #7AAC5A)',
                          borderRadius: '2px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <div>
                        <span style={{
                          fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                          fontSize: '18px', color: '#1A0808',
                        }}>
                          {topMatch.communityDetail.positive}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                          color: 'rgba(26,8,8,0.3)', marginLeft: '4px',
                        }}>
                          love it
                        </span>
                      </div>
                      {topMatch.communityDetail.shapeCount > 0 && (
                        <div>
                          <span style={{
                            fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                            fontSize: '18px', color: '#1A0808',
                          }}>
                            {topMatch.communityDetail.shapeCount}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                            color: 'rgba(26,8,8,0.3)', marginLeft: '4px',
                          }}>
                            with your shape
                          </span>
                        </div>
                      )}
                      <div>
                        <span style={{
                          fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic',
                          fontSize: '18px', color: '#1A0808',
                        }}>
                          {topMatch.communityDetail.mentions}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                          color: 'rgba(26,8,8,0.3)', marginLeft: '4px',
                        }}>
                          in your size range
                        </span>
                      </div>
                    </div>

                    {/* Top issue callout */}
                    {topMatch.communityDetail.topIssue && topMatch.communityDetail.topIssueCount > 10 && (
                      <p style={{
                        fontFamily: 'var(--font-space-mono)', fontSize: '9px', lineHeight: 1.6,
                        color: 'rgba(26,8,8,0.35)', paddingLeft: '10px',
                        borderLeft: '2px solid rgba(212,160,32,0.15)',
                      }}>
                        heads up &mdash; {topMatch.communityDetail.topIssue} is the #1 issue in your size range ({topMatch.communityDetail.topIssueCount} mentions). your shape + this style should avoid it.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Big CTA */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {topMatch.url && (
                <a href={topMatch.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', flex: 1 }}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '11px', letterSpacing: '0.15em',
                      textTransform: 'uppercase', textAlign: 'center',
                      padding: '14px 24px', borderRadius: '28px',
                      background: '#D4A020', color: '#FAF6EE',
                      boxShadow: '0 2px 8px rgba(212,160,32,0.25)',
                      cursor: 'pointer', transition: 'all 0.3s ease',
                    }}
                  >
                    Shop this bra &#8599;
                  </motion.div>
                </a>
              )}
              {profile && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFeedbackTarget({ brand: topMatch.brand, style: topMatch.style, size: topMatch.bestSize })}
                  style={{
                    fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.08em',
                    color: 'rgba(26,8,8,0.3)', background: 'rgba(26,8,8,0.03)',
                    border: 'none', borderRadius: '28px', padding: '14px 18px',
                    cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                  }}
                >
                  rate fit
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}


      {/* ═══════════ SECTION 3: More matches — compact ═══════════ */}
      {dataCtx && filteredMatches.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease: EASE }}
          style={{ maxWidth: '480px', width: '100%', marginBottom: '56px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <p style={{
              fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: '16px',
              color: 'rgba(26,8,8,0.45)',
            }}>
              More for you
            </p>
            {/* Tag filter — inline, minimal */}
            {allTags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                {allTags.slice(0, 5).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '7px', letterSpacing: '0.06em',
                      textTransform: 'uppercase', padding: '4px 10px', borderRadius: '12px',
                      border: 'none',
                      background: activeTag === tag ? 'rgba(212,160,32,0.12)' : 'rgba(26,8,8,0.03)',
                      color: activeTag === tag ? '#D4A020' : 'rgba(26,8,8,0.25)',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {otherMatches.map((s, i) => {
              const styleName = s.style.replace(/\s*\([^)]*\)\s*$/, '')
              const isExpanded = expandedMatch === i
              const cd = s.communityDetail
              const totalReviews = cd ? cd.positive + cd.negative + cd.neutral : 0
              return (
                <div key={i}>
                  <motion.div
                    whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(26,8,8,0.06)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: isExpanded ? '14px 14px 0 0' : '14px',
                      background: 'rgba(26,8,8,0.015)',
                      boxShadow: '0 1px 4px rgba(26,8,8,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{ flexShrink: 0, opacity: 0.4 }}>
                          <BraStyleIcon tags={s.tags} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: '14px', color: '#1A0808' }}>
                              {s.brand}
                            </span>
                            <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', color: 'rgba(26,8,8,0.35)' }}>
                              {styleName}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '11px', color: '#1A0808', fontWeight: 600 }}>
                              {s.bestSize}
                            </span>
                            {s.communityScore != null && s.communityScore >= 0.8 && (
                              <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '8px', color: '#5C8C4A' }}>
                                &#9829; {Math.round(s.communityScore * 100)}%
                              </span>
                            )}
                          </div>
                          <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', color: 'rgba(212,160,32,0.7)', marginTop: '3px', fontStyle: 'italic' }}>
                            {getLookDescription(s.tags, aestheticGoal, shapeProfile)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {cd && totalReviews > 3 && (
                          <button
                            onClick={() => setExpandedMatch(isExpanded ? null : i)}
                            style={{
                              fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                              color: isExpanded ? '#D4A020' : 'rgba(26,8,8,0.25)',
                              background: isExpanded ? 'rgba(212,160,32,0.08)' : 'rgba(26,8,8,0.03)',
                              border: 'none', cursor: 'pointer',
                              padding: '5px 10px', borderRadius: '10px',
                              transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                            }}
                          >
                            {totalReviews} reviews {isExpanded ? '\u25B4' : '\u25BE'}
                          </button>
                        )}
                        {s.url && (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <span style={{
                              fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.1em',
                              textTransform: 'uppercase', color: '#D4A020', flexShrink: 0,
                              padding: '6px 14px', borderRadius: '16px',
                              background: 'rgba(212,160,32,0.08)',
                              transition: 'all 0.2s ease',
                            }}>
                              shop &#8599;
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Expanded community deep-dive */}
                  <AnimatePresence>
                    {isExpanded && cd && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          padding: '14px 16px 16px',
                          borderRadius: '0 0 14px 14px',
                          background: 'rgba(26,8,8,0.015)',
                          borderTop: '1px solid rgba(26,8,8,0.04)',
                        }}>
                          {/* Sentiment bar */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                              <span style={{
                                fontFamily: 'var(--font-space-mono)', fontSize: '10px',
                                color: cd.score >= 0.8 ? '#5C8C4A' : cd.score >= 0.6 ? '#B8963E' : 'rgba(26,8,8,0.4)',
                                fontWeight: 600,
                              }}>
                                {Math.round(cd.score * 100)}% positive
                              </span>
                              <span style={{
                                fontFamily: 'var(--font-space-mono)', fontSize: '7px',
                                color: 'rgba(26,8,8,0.18)', letterSpacing: '0.06em',
                              }}>
                                r/ABraThatFits
                              </span>
                            </div>
                            <div style={{
                              height: '3px', borderRadius: '2px', background: 'rgba(26,8,8,0.04)',
                              overflow: 'hidden', display: 'flex', gap: '1px',
                            }}>
                              <div style={{
                                width: `${Math.round((cd.positive / totalReviews) * 100)}%`,
                                background: '#5C8C4A', borderRadius: '2px 0 0 2px',
                              }} />
                              <div style={{
                                width: `${Math.round((cd.neutral / totalReviews) * 100)}%`,
                                background: 'rgba(26,8,8,0.08)',
                              }} />
                              {cd.negative > 0 && (
                                <div style={{
                                  width: `${Math.round((cd.negative / totalReviews) * 100)}%`,
                                  background: '#C4664A', borderRadius: '0 2px 2px 0',
                                }} />
                              )}
                            </div>
                          </div>

                          {/* Quick stats */}
                          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', color: 'rgba(26,8,8,0.35)' }}>
                              <strong style={{ color: '#1A0808', fontWeight: 600 }}>{cd.positive}</strong> love it
                            </span>
                            {cd.shapeCount > 0 && (
                              <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', color: 'rgba(26,8,8,0.35)' }}>
                                <strong style={{ color: '#1A0808', fontWeight: 600 }}>{cd.shapeCount}</strong> with your shape
                              </span>
                            )}
                            <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '9px', color: 'rgba(26,8,8,0.35)' }}>
                              <strong style={{ color: '#1A0808', fontWeight: 600 }}>{cd.mentions}</strong> in your range
                            </span>
                            {profile && (
                              <button
                                onClick={() => setFeedbackTarget({ brand: s.brand, style: s.style, size: s.bestSize })}
                                style={{
                                  fontFamily: 'var(--font-space-mono)', fontSize: '8px',
                                  color: '#D4A020', background: 'rgba(212,160,32,0.08)',
                                  border: 'none', borderRadius: '8px', padding: '4px 10px',
                                  cursor: 'pointer', marginLeft: 'auto',
                                }}
                              >
                                rate fit
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Show more / less */}
          {!showAllMatches && hiddenCount > 0 && (
            <button
              onClick={() => setShowAllMatches(true)}
              style={{
                fontFamily: 'var(--font-space-mono)', fontSize: '9px', letterSpacing: '0.1em',
                color: 'rgba(26,8,8,0.3)', background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 0', width: '100%', textAlign: 'center',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#D4A020'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.3)'}
            >
              Show {filteredMatches.length - 4} more matches
            </button>
          )}

          {activeTag && filteredMatches.length === 0 && (
            <p style={{ fontFamily: 'var(--font-space-mono)', fontSize: '10px', color: 'rgba(26,8,8,0.3)', textAlign: 'center', padding: '24px 0' }}>
              no {activeTag} styles in your size &mdash; try another filter
            </p>
          )}
        </motion.div>
      )}


      {/* ═══════════ SECTION 4: Shape + Details — collapsible ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        style={{ maxWidth: '480px', width: '100%', marginBottom: '24px' }}
      >
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: '14px',
            color: 'rgba(26,8,8,0.35)', background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.6)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.35)'}
        >
          Your shape profile
          <span style={{
            fontSize: '12px', transition: 'transform 0.3s ease',
            transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            &#8964;
          </span>
        </button>
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ paddingTop: '12px', paddingBottom: '16px' }}>
                <ShapeViz shape={shapeProfile} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>


      {/* ═══════════ SECTION 5: Tips — collapsible ═══════════ */}
      {advice && advice.tips && advice.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.4 }}
          style={{ maxWidth: '480px', width: '100%', marginBottom: '24px' }}
        >
          <button
            onClick={() => setShowTips(!showTips)}
            style={{
              fontFamily: 'var(--font-dm-serif)', fontStyle: 'italic', fontSize: '14px',
              color: 'rgba(26,8,8,0.35)', background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.6)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.35)'}
          >
            Fit tips for you
            <span style={{
              fontSize: '12px', transition: 'transform 0.3s ease',
              transform: showTips ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
              &#8964;
            </span>
          </button>
          <AnimatePresence>
            {showTips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingTop: '12px' }}>
                  {advice.tips.map((tip, i) => (
                    <p key={i} style={{
                      fontFamily: 'var(--font-space-mono)', fontSize: '11px', lineHeight: 1.8,
                      color: 'rgba(26,8,8,0.45)', marginBottom: '10px', paddingLeft: '14px',
                      borderLeft: '2px solid rgba(212,160,32,0.15)',
                    }}>
                      {tip}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}


      {/* ═══════════ SECTION 6: Sister Sizes — collapsible ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.4 }}
        style={{ maxWidth: '480px', width: '100%', marginBottom: '48px' }}
      >
        <button
          onClick={() => { /* already shown inline above, this is the explorer grid */ }}
          style={{ display: 'none' }}
        />
        {/* Thin divider before footer */}
        <div style={{ width: '32px', height: '1px', background: 'rgba(212,160,32,0.2)', borderRadius: '1px', margin: '24px 0' }} />
      </motion.div>


      {/* ═══════════ PROFILE / SIZE PASSPORT ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.15, duration: 0.4 }}
        style={{ maxWidth: '480px', width: '100%', marginBottom: '48px' }}
      >
        <FrootProfileCard
          resultData={{
            sizeUK: result.sizeUK,
            sizeUS: result.sizeUS,
            bandSize: result.bandSize,
            shape: shapeProfile,
            goal: aestheticGoal,
            measurements: measurements as Record<string, number | string> | undefined,
            savedMatches: dataCtx?.styleMatches?.slice(0, 8).map(s => ({
              brand: s.brand,
              style: s.style,
              bestSize: s.bestSize,
              tags: s.tags,
            })),
          }}
        />
      </motion.div>

      {/* ═══════════ FOOTER ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '12px 28px',
              border: 'none', borderRadius: '24px',
              background: copied ? '#D4A020' : 'rgba(212,160,32,0.1)',
              color: copied ? '#FAF6EE' : '#D4A020',
              cursor: 'pointer', transition: 'all 0.3s ease',
              boxShadow: copied ? '0 2px 8px rgba(212,160,32,0.2)' : 'none',
            }}
          >
            {copied ? 'Copied!' : 'Share'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartOver}
            style={{
              fontFamily: 'var(--font-space-mono)', fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '12px 28px',
              border: 'none', borderRadius: '24px',
              background: 'rgba(26,8,8,0.04)', color: 'rgba(26,8,8,0.35)',
              cursor: 'pointer', transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,8,8,0.08)'; e.currentTarget.style.color = '#1A0808' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,8,8,0.04)'; e.currentTarget.style.color = 'rgba(26,8,8,0.35)' }}
          >
            Start over
          </motion.button>
        </div>

        <p style={{
          fontFamily: 'var(--font-space-mono)', fontSize: '8px', color: 'rgba(26,8,8,0.12)',
          letterSpacing: '0.06em', textAlign: 'center',
        }}>
          sized with froot &middot; 265K+ real measurements &middot; 1,400+ styles
        </p>
      </motion.div>

      {/* ═══════════ FIT FEEDBACK MODAL ═══════════ */}
      {feedbackTarget && profile && (
        <FitFeedbackModal
          brand={feedbackTarget.brand}
          style={feedbackTarget.style}
          size={feedbackTarget.size}
          open={true}
          onClose={() => setFeedbackTarget(null)}
        />
      )}

      {/* ═══════════ AI FITTING CHAT ═══════════ */}
      <FrootChat
        sizeResult={result}
        shapeProfile={shapeProfile}
        aestheticGoal={aestheticGoal}
        measurements={measurements}
        topMatches={dataCtx?.styleMatches?.slice(0, 8).map(s => ({
          brand: s.brand,
          style: s.style,
          bestSize: s.bestSize,
          score: s.score,
          tags: s.tags,
        }))}
        fitCheckData={fitCheckData}
      />
    </div>
  )
}
