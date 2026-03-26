import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Static data imports (bundled at build time) ──
import brandMeasurements from '@/data/brand-measurements.json'
import brandRanges from '@/data/brand-ranges.json'
import brandMeta from '@/data/brand-meta.json'
import communityInsights from '@/data/community-insights.json'
import fitDiagnostics from '@/data/fit-diagnostics.json'
import sizeTransitions from '@/data/size-transitions.json'

// ── Style data (loaded at runtime to avoid huge bundle) ──
let styleData: Record<string, StyleEntry> | null = null

interface StyleEntry {
  brand: string
  style: string
  url: string
  tags: string[]
  sizes: Record<string, Record<string, number>>
}

function getStyleData(): Record<string, StyleEntry> {
  if (!styleData) {
    try {
      const raw = readFileSync(join(process.cwd(), 'data', 'style-measurements.json'), 'utf-8')
      styleData = JSON.parse(raw)
    } catch {
      styleData = {}
    }
  }
  return styleData!
}

const client = new Anthropic()

function shopUrl(brand: string, style: string, size: string): string {
  const q = encodeURIComponent(`${brand} ${style.replace(/\s*\([^)]*\)\s*$/, '')} ${size}`)
  return `https://www.google.com/search?tbm=shop&q=${q}`
}

// ── Types ──

interface StyleMatch {
  brand: string
  style: string
  bestSize: string
  score: number
  measurements: Record<string, number>
  tags: string[]
  url?: string
  sentiment?: { positive: number; negative: number; score: number }
}

// UK cup progression for index mapping
const UK_CUPS = ['A','B','C','D','DD','E','F','FF','G','GG','H','HH','J','JJ','K','KK','L']

function cupToIndex(cup: string): number {
  const idx = UK_CUPS.indexOf(cup.toUpperCase())
  return idx >= 0 ? idx : -1
}

// ── Target measurements ──

function getTargetMeasurements(bandSize: number, cupIndex: number): { cd: number; cw: number; wl: number } | null {
  const sizeKey = `${bandSize}${UK_CUPS[cupIndex] || 'D'}`
  const allBrands = brandMeasurements as Record<string, Record<string, Record<string, number>>>
  let cdSum = 0, cwSum = 0, wlSum = 0, count = 0

  for (const brand of Object.keys(allBrands)) {
    const sizeData = allBrands[brand][sizeKey]
    if (sizeData?.cd && sizeData?.cw) {
      cdSum += sizeData.cd
      cwSum += sizeData.cw
      wlSum += sizeData.wl || 0
      count++
    }
  }

  if (count === 0) return null
  return { cd: cdSum / count, cw: cwSum / count, wl: wlSum / count }
}

// ── Style matching engine ──

function findMatchingStyles(
  bandSize: number,
  cupIndex: number,
  shape: { projection: string; fullness: string; rootWidth: string },
): StyleMatch[] {
  const styles = getStyleData()
  const ranges = brandRanges as Record<string, Record<string, number | string>>
  const metaData = brandMeta as Record<string, Record<string, string | number>>

  const target = getTargetMeasurements(bandSize, cupIndex)
  if (!target) return []

  const matches: StyleMatch[] = []
  const sizeKey = `${bandSize}${UK_CUPS[cupIndex] || 'D'}`

  // Shape-based tag preferences
  const preferredTags: string[] = []
  const avoidTags: string[] = []
  if (shape.projection === 'projected') {
    preferredTags.push('seamed', 'unlined', 'balconette', 'plunge')
    avoidTags.push('molded', 't-shirt', 'push up', 'minimizer')
  } else if (shape.projection === 'shallow') {
    preferredTags.push('molded', 'padded', 'demi', 't-shirt', 'push up')
    avoidTags.push('unlined')
  }
  if (shape.fullness === 'full-on-top') {
    preferredTags.push('balconette', 'full coverage')
  } else if (shape.fullness === 'full-on-bottom') {
    preferredTags.push('demi', 'plunge')
  }

  for (const [, entry] of Object.entries(styles)) {
    // Check brand range
    const range = ranges[entry.brand]
    if (range) {
      if (range.bandMin && bandSize < (range.bandMin as number) - 2) continue
      if (range.bandMax && bandSize > (range.bandMax as number) + 2) continue
    }

    // Find best size match in this style
    let bestSize: { key: string; data: Record<string, number>; dist: number } | null = null
    for (const [sk, data] of Object.entries(entry.sizes)) {
      if (!data.cd || !data.cw) continue
      const sizeBand = parseInt(sk, 10)
      if (isNaN(sizeBand) || Math.abs(sizeBand - bandSize) > 2) continue
      const dist = Math.abs(data.cd - target.cd) * 2 + Math.abs(data.cw - target.cw)
      if (!bestSize || dist < bestSize.dist) {
        bestSize = { key: sk, data, dist }
      }
    }

    if (!bestSize) continue

    // Also check if exact size exists (prefer it)
    if (entry.sizes[sizeKey]?.cd) {
      const exactData = entry.sizes[sizeKey]
      const exactDist = Math.abs(exactData.cd - target.cd) * 2 + Math.abs(exactData.cw - target.cw)
      if (exactDist <= bestSize.dist * 1.1) {
        bestSize = { key: sizeKey, data: exactData, dist: exactDist }
      }
    }

    const { cd: cupDepth, cw: cupWidth, wl: wireLength = 0 } = bestSize.data

    // Score
    let score = 0.5

    // Measurement proximity (max +0.25)
    const cdDiff = Math.abs(cupDepth - target.cd)
    const cwDiff = Math.abs(cupWidth - target.cw)
    score += Math.max(0.25 - (cdDiff * 0.05 + cwDiff * 0.03), 0)

    // Projection scoring
    if (shape.projection === 'projected') {
      const depthRatio = cupDepth / cupWidth
      score += Math.min(depthRatio / 4, 0.15)
    } else if (shape.projection === 'shallow') {
      const depthRatio = cupDepth / cupWidth
      score += Math.max(0.15 - depthRatio / 4, 0)
    }

    // Root width scoring
    if (shape.rootWidth === 'narrow') {
      const expectedWidth = 4.5 + 0.3 * cupIndex
      if (cupWidth < expectedWidth) score += 0.08
    } else if (shape.rootWidth === 'wide') {
      const expectedWidth = 4.5 + 0.3 * cupIndex
      if (cupWidth > expectedWidth) score += 0.08
    }

    // Tag matching bonus
    const matchedTags = entry.tags.filter(t => preferredTags.includes(t))
    const avoidedTags = entry.tags.filter(t => avoidTags.includes(t))
    score += matchedTags.length * 0.06
    score -= avoidedTags.length * 0.04

    // Data quality bonus
    const sampleCount = bestSize.data.n || 1
    if (sampleCount >= 10) score += 0.04
    if (sampleCount >= 30) score += 0.04

    const brandUrl = metaData[entry.brand]?.url as string | undefined

    matches.push({
      brand: entry.brand,
      style: entry.style,
      bestSize: bestSize.key,
      score: Math.round(score * 100) / 100,
      measurements: {
        cupWidth,
        cupDepth,
        wireLength,
        bandLength: bestSize.data.bl || 0,
        stretchedBand: bestSize.data.sb || 0,
      },
      tags: entry.tags,
      url: entry.url || brandUrl,
    })
  }

  // Sort by score, deduplicate brands (keep top style per brand, max 2 per brand)
  matches.sort((a, b) => b.score - a.score)

  const brandCount: Record<string, number> = {}
  const filtered: StyleMatch[] = []
  for (const m of matches) {
    const count = brandCount[m.brand] || 0
    if (count < 2) {
      filtered.push(m)
      brandCount[m.brand] = count + 1
    }
    if (filtered.length >= 20) break
  }

  return filtered
}

// ── Size converter ──

function convertSize(
  sourceBrand: string,
  sourceSize: string,
): StyleMatch[] {
  const styles = getStyleData()

  // Find source style measurements
  let sourceMeasurements: Record<string, number> | null = null
  let sourceBandSize = 0

  // Try style data first
  for (const [, entry] of Object.entries(styles)) {
    if (entry.brand.toLowerCase() !== sourceBrand.toLowerCase()) continue
    if (entry.sizes[sourceSize]?.cd) {
      sourceMeasurements = entry.sizes[sourceSize]
      sourceBandSize = parseInt(sourceSize, 10)
      break
    }
  }

  // Fall back to brand-level data
  if (!sourceMeasurements) {
    const allBrands = brandMeasurements as Record<string, Record<string, Record<string, number>>>
    const brandData = allBrands[sourceBrand]
    if (brandData?.[sourceSize]?.cd) {
      sourceMeasurements = brandData[sourceSize]
      sourceBandSize = parseInt(sourceSize, 10)
    }
  }

  if (!sourceMeasurements || !sourceBandSize) return []

  const targetCd = sourceMeasurements.cd
  const targetCw = sourceMeasurements.cw

  const matches: StyleMatch[] = []

  for (const [, entry] of Object.entries(styles)) {
    if (entry.brand.toLowerCase() === sourceBrand.toLowerCase()) continue

    let bestSize: { key: string; data: Record<string, number>; dist: number } | null = null
    for (const [sk, data] of Object.entries(entry.sizes)) {
      if (!data.cd || !data.cw) continue
      const sizeBand = parseInt(sk, 10)
      if (isNaN(sizeBand) || Math.abs(sizeBand - sourceBandSize) > 4) continue
      const dist = Math.abs(data.cd - targetCd) * 2.5 + Math.abs(data.cw - targetCw) * 1.5
      if (!bestSize || dist < bestSize.dist) {
        bestSize = { key: sk, data, dist }
      }
    }

    if (!bestSize || bestSize.dist > 3) continue

    const score = Math.max(0, 1 - bestSize.dist / 5)

    matches.push({
      brand: entry.brand,
      style: entry.style,
      bestSize: bestSize.key,
      score: Math.round(score * 100) / 100,
      measurements: {
        cupDepth: bestSize.data.cd,
        cupWidth: bestSize.data.cw,
        wireLength: bestSize.data.wl || 0,
        bandLength: bestSize.data.bl || 0,
        stretchedBand: bestSize.data.sb || 0,
      },
      tags: entry.tags,
      url: entry.url,
    })
  }

  matches.sort((a, b) => b.score - a.score)

  // Max 2 per brand
  const brandCount: Record<string, number> = {}
  const filtered: StyleMatch[] = []
  for (const m of matches) {
    const count = brandCount[m.brand] || 0
    if (count < 2) {
      filtered.push(m)
      brandCount[m.brand] = count + 1
    }
    if (filtered.length >= 15) break
  }

  return filtered
}

// ── Community insights lookup ──

function getCommunityInsights(bandSize: number, cupIndex: number) {
  let bandRange: string
  if (bandSize <= 30) bandRange = '28-30'
  else if (bandSize <= 34) bandRange = '32-34'
  else if (bandSize <= 38) bandRange = '36-38'
  else if (bandSize <= 42) bandRange = '40-42'
  else bandRange = '44+'

  let cupRange: string
  if (cupIndex <= 3) cupRange = 'AA-C'
  else if (cupIndex <= 5) cupRange = 'D-DD'
  else if (cupIndex <= 8) cupRange = 'E-FF'
  else if (cupIndex <= 12) cupRange = 'G-HH'
  else cupRange = 'J+'

  const bucket = `${bandRange}|${cupRange}`
  const insights = communityInsights as Record<string, Record<string, unknown>>
  return { bucket, data: insights[bucket] || null }
}

// ── Size transition stats ──

function getTransitionStats(bandSize: number, cupIndex: number) {
  const transitions = sizeTransitions as {
    stats: { avgBandChange: number; avgCupChange: number; totalTransitions: number }
    pairs: { from: string; to: string; count: number }[]
  }

  const targetSize = `${bandSize}${UK_CUPS[cupIndex] || 'D'}`
  const toThis = transitions.pairs.filter(p => p.to === targetSize)
  const fromSizes = toThis
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => `${p.from} (${p.count} people)`)

  return {
    avgCupChange: transitions.stats.avgCupChange,
    commonTransitions: fromSizes,
    totalDataPoints: transitions.stats.totalTransitions,
  }
}

// ── Main handler ──

export async function POST(req: Request) {
  const body = await req.json()

  // ── Size converter mode ──
  if (body.mode === 'convert') {
    const { brand, size } = body
    const matches = convertSize(brand, size)

    // Look up source measurements for display
    const styles = getStyleData()
    let sourceInfo: { cd: number; cw: number; wl: number } | null = null
    for (const [, entry] of Object.entries(styles)) {
      if (entry.brand.toLowerCase() === brand.toLowerCase() && entry.sizes[size]?.cd) {
        sourceInfo = { cd: entry.sizes[size].cd, cw: entry.sizes[size].cw, wl: entry.sizes[size].wl || 0 }
        break
      }
    }
    if (!sourceInfo) {
      const allBrands = brandMeasurements as Record<string, Record<string, Record<string, number>>>
      const bd = allBrands[brand]?.[size]
      if (bd?.cd) sourceInfo = { cd: bd.cd, cw: bd.cw, wl: bd.wl || 0 }
    }

    return NextResponse.json({
      sourceInfo,
      matches: matches.map(m => ({
        brand: m.brand,
        style: m.style,
        bestSize: m.bestSize,
        score: m.score,
        cupDepth: m.measurements.cupDepth,
        cupWidth: m.measurements.cupWidth,
        wireLength: m.measurements.wireLength,
        tags: m.tags,
        url: shopUrl(m.brand, m.style, m.bestSize),
      })),
    })
  }

  // ── Sizing / fit check mode ──
  const { measurements, sizeResult, shapeProfile, fitCheckData } = body

  const cupIndex = cupToIndex(sizeResult.sizeUK?.replace(/\d+/, '') || 'D')
  const resolvedCupIndex = cupIndex >= 0 ? cupIndex : 4

  // Layer 1: Style matching from measurement data
  const topStyles = findMatchingStyles(sizeResult.bandSize, resolvedCupIndex, shapeProfile)

  // Layer 2: Community insights
  const community = getCommunityInsights(sizeResult.bandSize, resolvedCupIndex)

  // Layer 3: Size transition context
  const transitions = getTransitionStats(sizeResult.bandSize, resolvedCupIndex)

  // Get community brand sentiment
  const communityBrands = community.data
    ? (community.data as Record<string, unknown>).brands as Record<string, { positive: number; negative: number; score: number }> || {}
    : {}

  for (const match of topStyles) {
    const sentiment = communityBrands[match.brand]
    if (sentiment) match.sentiment = sentiment
  }

  const communityIssues = community.data
    ? (community.data as Record<string, unknown>).issues as Record<string, number> || {}
    : {}

  // Fit check: look up current bra measurements
  let currentBraMeasurements: Record<string, number> | null = null
  if (fitCheckData) {
    const allMeasurements = brandMeasurements as Record<string, Record<string, Record<string, number>>>
    const brandSizeData = allMeasurements[fitCheckData.currentBrand]?.[fitCheckData.currentSize.toUpperCase()]
    if (brandSizeData) currentBraMeasurements = brandSizeData
  }

  const targetMeasurements = getTargetMeasurements(sizeResult.bandSize, resolvedCupIndex)

  // Shape mapping for community data
  const shapeKeys: string[] = []
  if (shapeProfile.projection === 'projected') shapeKeys.push('projected')
  else if (shapeProfile.projection === 'shallow') shapeKeys.push('shallow')
  if (shapeProfile.fullness === 'full-on-top') shapeKeys.push('full_on_top')
  else if (shapeProfile.fullness === 'full-on-bottom') shapeKeys.push('full_on_bottom')
  if (shapeProfile.rootWidth === 'narrow') shapeKeys.push('narrow_root')
  else if (shapeProfile.rootWidth === 'wide') shapeKeys.push('wide_root')

  const communityShapes = community.data
    ? (community.data as Record<string, unknown>).shapes as Record<string, number> || {}
    : {}
  const shapeCount = shapeKeys.reduce((sum, k) => sum + (communityShapes[k] || 0), 0)

  const topIssue = Object.entries(communityIssues).sort((a, b) => b[1] - a[1])[0]

  const dataContext = {
    targetMeasurements: targetMeasurements ? {
      cupDepth: targetMeasurements.cd,
      cupWidth: targetMeasurements.cw,
      wireLength: targetMeasurements.wl,
    } : null,
    styleMatches: topStyles.slice(0, 10).map(s => {
      const brandSentiment = communityBrands[s.brand]
      return {
        brand: s.brand,
        style: s.style,
        bestSize: s.bestSize,
        score: s.score,
        cupDepth: s.measurements.cupDepth,
        cupWidth: s.measurements.cupWidth,
        wireLength: s.measurements.wireLength,
        tags: s.tags,
        communityScore: s.sentiment?.score,
        url: shopUrl(s.brand, s.style, s.bestSize),
        communityDetail: brandSentiment ? {
          positive: brandSentiment.positive,
          negative: brandSentiment.negative,
          neutral: (brandSentiment as Record<string, number>).neutral || 0,
          score: brandSentiment.score,
          mentions: community.data ? (community.data as Record<string, unknown>).mentions as number : 0,
          shapeCount,
          topIssue: topIssue ? topIssue[0].replace(/_/g, ' ') : null,
          topIssueCount: topIssue ? topIssue[1] : 0,
        } : null,
      }
    }),
    sizeRange: community.bucket,
    communityMentions: community.data ? (community.data as Record<string, unknown>).mentions : 0,
    transitionStats: transitions,
    currentBraMeasurements: currentBraMeasurements ? {
      cupDepth: currentBraMeasurements.cd,
      cupWidth: currentBraMeasurements.cw,
      wireLength: currentBraMeasurements.wl || 0,
    } : null,
  }

  // ── Claude layer ──

  try {
    const styleContext = topStyles.slice(0, 8).map(s => {
      const parts = [`${s.brand} ${s.style} in ${s.bestSize} (score: ${s.score})`]
      parts.push(`cup depth: ${s.measurements.cupDepth}", cup width: ${s.measurements.cupWidth}"`)
      if (s.tags.length > 0) parts.push(`tags: ${s.tags.join(', ')}`)
      if (s.sentiment) {
        parts.push(`community: ${s.sentiment.positive} positive, ${s.sentiment.negative} negative reviews`)
      }
      return parts.join(' \u2014 ')
    }).join('\n')

    const issueContext = Object.entries(communityIssues)
      .slice(0, 5)
      .map(([issue, count]) => `${issue.replace(/_/g, ' ')}: ${count} mentions`)
      .join(', ')

    const transitionContext = transitions.commonTransitions.length > 0
      ? `Common previous sizes for people now in this range: ${transitions.commonTransitions.join(', ')}`
      : ''

    let fitCheckContext = ''
    if (fitCheckData) {
      const bandFitLabels: Record<string, string> = {
        too_tight: 'way too tight', slightly_tight: 'a little tight',
        good: 'fits well', too_loose: 'too loose',
      }
      const cupFitLabels: Record<string, string> = {
        spilling: 'spilling over', gaping: 'gaps at top',
        too_shallow: 'cups too flat/shallow', good: 'fits well',
      }
      const fitIssueLabels: Record<string, string> = {
        straps_falling: 'straps fall off', wire_pain: 'underwire digs in',
        gore_not_flat: 'gore doesn\'t tack', band_rides_up: 'band rides up',
      }
      const issuesList = fitCheckData.issues?.map((i: string) => fitIssueLabels[i] || i).join(', ') || 'none'

      fitCheckContext = `
FIT CHECK DATA:
Currently wearing: ${fitCheckData.currentBrand} ${fitCheckData.currentSize}.
Band: ${bandFitLabels[fitCheckData.bandFit] || fitCheckData.bandFit}
Cup: ${cupFitLabels[fitCheckData.cupFit] || fitCheckData.cupFit}
Other issues: ${issuesList}
${currentBraMeasurements ? `Current bra measures: cup depth ${currentBraMeasurements.cd}", cup width ${currentBraMeasurements.cw}", wire length ${currentBraMeasurements.wl || '?'}"` : ''}
`
    }

    const measurementSection = measurements
      ? `MEASUREMENTS (${measurements.unit}):
Underbust: ${measurements.looseUnderbust} loose / ${measurements.snugUnderbust} snug / ${measurements.tightUnderbust} tight
Bust: ${measurements.standingBust} standing / ${measurements.leaningBust} leaning / ${measurements.lyingBust} lying`
      : '(No measurements \u2014 size from fit check feedback)'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `You are an expert bra fitter writing for a premium, confidence-driven brand. Your tone is warm, direct, and empowering — like a best friend who also happens to be a fitting expert. Think Il Makiage meets personal stylist. Never clinical, never hedging, never "try this and hope for the best."

${measurementSection}
${fitCheckContext}
CALCULATED SIZE: ${sizeResult.sizeUK} (UK) / ${sizeResult.sizeUS} (US)
Band: ${sizeResult.bandSize} | Bust diff: ${sizeResult.bustDifference.toFixed(1)}"

SHAPE: ${shapeProfile.projection} projection, ${shapeProfile.fullness} fullness, ${shapeProfile.rootWidth} roots

TOP STYLE MATCHES (from measurement data, ranked by shape compatibility):
${styleContext}

COMMUNITY DATA (r/ABraThatFits, ${community.data ? (community.data as Record<string, unknown>).mentions : 0} discussions):
Issues: ${issueContext || 'none'}
${transitionContext}

INSTRUCTIONS:
- "headline": a punchy 4-8 word line about their result. Confident and personal. Examples: "You've been wearing the wrong size.", "This changes everything.", "Your shape deserves better." Make it specific to their situation.
- "summary": 2-3 sentences that make them feel SEEN. Reference their specific shape. Be confident about the recommendation. Don't say "try" — say this IS their size. If fit check, acknowledge the specific problems they've been having and explain why they won't have them anymore.
- "topPickNote": 1 sentence about the #1 style match specifically — why it's perfect FOR THEM. Reference the style by name. Make it feel curated.
- "tips": 3-4 specific, actionable tips. Frame as insider knowledge, not generic advice. Start with verbs.
- "styles": bra style types that work for their shape
- "brandSuggestions": specific "Brand StyleName" from the matches

Return ONLY JSON:
{"headline": "<punchy line>", "summary": "<2-3 sentences, confident>", "topPickNote": "<why #1 pick is perfect for them>", "tips": ["<tip>", "<tip>", "<tip>"], "styles": ["<type>", "<type>"], "brandSuggestions": ["<Brand Style>", "<Brand Style>", "<Brand Style>"]}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'

    const objects: string[] = []
    let depth = 0, start = -1
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '{') { if (depth === 0) start = i; depth++ }
      else if (raw[i] === '}') { depth--; if (depth === 0 && start >= 0) objects.push(raw.slice(start, i + 1)) }
    }

    let parsed = null
    for (const obj of objects.reverse()) {
      try {
        const p = JSON.parse(obj)
        if (typeof p.summary === 'string') { parsed = p; break }
      } catch { /* skip */ }
    }
    if (!parsed) throw new Error('no valid response')

    parsed.dataContext = dataContext
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Claude advice failed, returning data-only response:', err)

    const diagnostics = fitDiagnostics as Record<string, { symptom: string; solutions: string[] }>
    const fallbackTips = Object.values(diagnostics).slice(0, 3).map(d => d.solutions[0])

    const fallbackHeadline = fitCheckData
      ? 'No wonder it wasn\u2019t working.'
      : 'We found your fit.'

    const fallbackSummary = fitCheckData
      ? `Your ${fitCheckData.currentBrand} ${fitCheckData.currentSize} wasn't doing you justice. Your new size is going to change the way everything fits — and the styles below are matched specifically for your shape.`
      : 'Your measurements tell a clear story, and your shape profile narrows it down even further. The styles below are hand-picked for how you\'re built — not just your size, but your shape.'

    return NextResponse.json({
      headline: fallbackHeadline,
      summary: fallbackSummary,
      topPickNote: '',
      tips: fallbackTips,
      styles: [],
      brandSuggestions: [],
      dataContext,
    }, { status: 200 })
  }
}
