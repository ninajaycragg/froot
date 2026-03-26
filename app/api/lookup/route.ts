import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

import brandMeasurements from '@/data/brand-measurements.json'
import brandMeta from '@/data/brand-meta.json'

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

// UK cup progression
const UK_CUPS = ['A','B','C','D','DD','E','F','FF','G','GG','H','HH','J','JJ','K','KK','L']

function parseSizeKey(sizeStr: string): { band: number; cup: string } | null {
  const match = sizeStr.trim().match(/^(\d{2,3})\s*([A-Za-z]+)$/i)
  if (!match) return null
  return { band: parseInt(match[1], 10), cup: match[2].toUpperCase() }
}

function cupToIndex(cup: string): number {
  return UK_CUPS.indexOf(cup.toUpperCase())
}

function shopUrl(brand: string, style: string, size: string): string {
  const q = encodeURIComponent(`${brand} ${style.replace(/\s*\([^)]*\)\s*$/, '')} ${size}`)
  return `https://www.google.com/search?tbm=shop&q=${q}`
}

interface LookupMatch {
  style: string
  recommendedSize: string
  score: number
  measurements: { cupDepth: number; cupWidth: number; wireLength: number }
  tags: string[]
  url: string
  notes: string[]
  dataPoints: number
}

export async function POST(req: Request) {
  const body = await req.json()
  const { brand, style: targetStyle, sizeUS, sizeUK } = body as {
    brand: string
    style?: string
    sizeUS: string
    sizeUK: string
  }

  if (!brand || (!sizeUS && !sizeUK)) {
    return NextResponse.json({ error: 'brand and size required' }, { status: 400 })
  }

  // Parse user's size — prefer UK since our data uses UK sizing
  const sizeStr = sizeUK || sizeUS
  const parsed = parseSizeKey(sizeStr)
  if (!parsed) {
    return NextResponse.json({ error: 'invalid size format' }, { status: 400 })
  }

  const { band: userBand, cup: userCup } = parsed
  const userCupIndex = cupToIndex(userCup)

  // Get average measurements for this size across all brands to use as target
  const allBrands = brandMeasurements as Record<string, Record<string, Record<string, number>>>
  let targetCd = 0, targetCw = 0, targetWl = 0, avgCount = 0
  for (const b of Object.keys(allBrands)) {
    const sizeData = allBrands[b][sizeStr]
    if (sizeData?.cd && sizeData?.cw) {
      targetCd += sizeData.cd
      targetCw += sizeData.cw
      targetWl += sizeData.wl || 0
      avgCount++
    }
  }

  // Also check the target brand specifically for calibration
  const brandData = allBrands[brand]
  let brandSizeData: Record<string, number> | null = null
  if (brandData?.[sizeStr]?.cd) {
    brandSizeData = brandData[sizeStr]
  }

  if (avgCount > 0) {
    targetCd /= avgCount
    targetCw /= avgCount
    targetWl /= avgCount
  }

  // Scan style data for this brand
  const styles = getStyleData()
  const matches: LookupMatch[] = []
  const metaData = brandMeta as Record<string, Record<string, string | number>>
  const brandUrl = metaData[brand]?.url as string | undefined

  for (const [, entry] of Object.entries(styles)) {
    if (entry.brand.toLowerCase() !== brand.toLowerCase()) continue
    if (targetStyle && !entry.style.toLowerCase().includes(targetStyle.toLowerCase())) continue

    // Find best size match in this style
    let bestSize: { key: string; data: Record<string, number>; dist: number } | null = null

    for (const [sk, data] of Object.entries(entry.sizes)) {
      if (!data.cd || !data.cw) continue
      const sizeBand = parseInt(sk, 10)
      if (isNaN(sizeBand) || Math.abs(sizeBand - userBand) > 4) continue

      let dist: number
      if (avgCount > 0) {
        dist = Math.abs(data.cd - targetCd) * 2.5 + Math.abs(data.cw - targetCw) * 1.5
      } else {
        // No cross-brand reference, use simple band/cup distance
        const skParsed = parseSizeKey(sk)
        if (!skParsed) continue
        const skCupIdx = cupToIndex(skParsed.cup)
        dist = Math.abs(sizeBand - userBand) + Math.abs(skCupIdx - (userCupIndex >= 0 ? userCupIndex : 3)) * 2
      }

      if (!bestSize || dist < bestSize.dist) {
        bestSize = { key: sk, data, dist }
      }
    }

    // Also check exact size
    if (entry.sizes[sizeStr]?.cd) {
      const exactData = entry.sizes[sizeStr]
      const exactDist = avgCount > 0
        ? Math.abs(exactData.cd - targetCd) * 2.5 + Math.abs(exactData.cw - targetCw) * 1.5
        : 0
      if (!bestSize || exactDist <= bestSize.dist * 1.05) {
        bestSize = { key: sizeStr, data: exactData, dist: exactDist }
      }
    }

    if (!bestSize) continue

    const score = bestSize.dist <= 0.5 ? 1.0 : Math.max(0, 1 - bestSize.dist / 8)

    // Generate fit notes
    const notes: string[] = []

    if (brandSizeData && avgCount > 0) {
      // Compare this brand's measurements to average
      const brandCd = brandSizeData.cd
      const brandCw = brandSizeData.cw
      if (brandCd > targetCd + 0.3) notes.push('this brand runs deep in the cup')
      else if (brandCd < targetCd - 0.3) notes.push('this brand runs shallow in the cup')
      if (brandCw > targetCw + 0.3) notes.push('runs wide')
      else if (brandCw < targetCw - 0.3) notes.push('runs narrow')
    }

    // Style-specific notes based on measurements vs average
    if (avgCount > 0) {
      const cd = bestSize.data.cd
      const cw = bestSize.data.cw
      if (cd > targetCd + 0.5) notes.push('deeper cup than average for this size')
      else if (cd < targetCd - 0.5) notes.push('shallower cup than average for this size')
      if (cw > targetCw + 0.4) notes.push('wider wires than average')
      else if (cw < targetCw - 0.4) notes.push('narrower wires than average')
    }

    // Tag-based notes
    if (entry.tags.includes('molded')) notes.push('molded cups may run slightly shallow')
    if (entry.tags.includes('unlined')) notes.push('unlined construction adapts well to projected shapes')
    if (entry.tags.includes('plunge')) notes.push('plunge style \u2014 lower center gore')
    if (entry.tags.includes('balconette')) notes.push('balconette cut \u2014 open neckline')

    // Size difference note
    if (bestSize.key !== sizeStr) {
      notes.push(`closest available size is ${bestSize.key}`)
    }

    matches.push({
      style: entry.style,
      recommendedSize: bestSize.key,
      score: Math.round(score * 100) / 100,
      measurements: {
        cupDepth: bestSize.data.cd,
        cupWidth: bestSize.data.cw,
        wireLength: bestSize.data.wl || 0,
      },
      tags: entry.tags,
      url: entry.url || shopUrl(brand, entry.style, bestSize.key),
      notes: notes.length > 0 ? notes : ['good match for your size'],
      dataPoints: bestSize.data.n || 1,
    })
  }

  // Sort by score
  matches.sort((a, b) => b.score - a.score)

  // If no style data, try brand-level data
  let brandLevelMatch: {
    recommendedSize: string
    measurements: { cupDepth: number; cupWidth: number; wireLength: number } | null
    notes: string[]
  } | null = null

  if (matches.length === 0 && brandData) {
    // Find closest size in this brand's data
    let bestKey: string | null = null
    let bestDist = Infinity

    for (const [sk, data] of Object.entries(brandData)) {
      if (!data.cd || !data.cw) continue
      const skParsed = parseSizeKey(sk)
      if (!skParsed) continue
      const bandDiff = Math.abs(skParsed.band - userBand)
      const cupDiff = Math.abs(cupToIndex(skParsed.cup) - (userCupIndex >= 0 ? userCupIndex : 3))
      const dist = bandDiff + cupDiff * 2
      if (dist < bestDist) {
        bestDist = dist
        bestKey = sk
      }
    }

    if (bestKey) {
      const data = brandData[bestKey]
      const notes: string[] = []

      if (bestKey !== sizeStr) {
        notes.push(`closest size with measurement data is ${bestKey}`)
      }
      if (avgCount > 0 && data.cd) {
        if (data.cd > targetCd + 0.3) notes.push('this brand runs deep in the cup')
        else if (data.cd < targetCd - 0.3) notes.push('this brand runs shallow in the cup')
        if (data.cw > targetCw + 0.3) notes.push('runs wide')
        else if (data.cw < targetCw - 0.3) notes.push('runs narrow')
      }
      if (notes.length === 0) notes.push('good match for your size')

      brandLevelMatch = {
        recommendedSize: bestKey === sizeStr ? sizeStr : bestKey,
        measurements: data.cd ? { cupDepth: data.cd, cupWidth: data.cw, wireLength: data.wl || 0 } : null,
        notes,
      }
    }
  }

  // Brand info
  const meta = metaData[brand] || null

  return NextResponse.json({
    brand,
    requestedSize: sizeStr,
    matches: matches.slice(0, 20),
    brandLevelMatch,
    brandInfo: meta ? {
      url: meta.url || null,
      models: meta.models || 0,
      sizes: meta.sizes || 0,
      dataPoints: meta.dataPoints || 0,
    } : null,
  })
}
