// ── Bra "personality" table — runs-small / runs-big / true-to-size, per brand ──
//
// Same IRT idea as the belief engine: a printed label is a noisy reading of the
// body that actually fit it. Across many people, a brand's mean signed gap
// between the size someone *thought* they wore and the size they *actually* fit
// is that brand's latent vanity-sizing parameter. We reuse `inferBraRuns` (the
// estimator) and `BraRuns` (the type) straight from the belief engine — this
// file's only job is turning the community size-migration data into the
// { brand, labelSize, trueSize } records inferBraRuns wants, then caching the
// table at module load.
//
// THE NON-OBVIOUS MOVE — de-bias against the population migration.
// Froot's whole story corpus is the "I sized up" arc: r/ABraThatFits people
// arrive in a too-big-band / too-small-cup department size and migrate to a UK
// fit. The dataset average is avgBandChange -0.4, avgCupChange +1.6 (every
// journey trends the same way). Attributing that raw arc to a brand would label
// *everything* "runs small" — useless. So a brand's personality is its
// DEVIATION from the typical correction: subtract the population mean migration
// from each journey gap, and only brands that pull people further than average
// read "runs small", while brands that need less correction read "runs big".

import { inferBraRuns, type BraRuns } from '@/components/froot/beliefEngine'
import stories from '@/data/stories.json'
import sizeTransitions from '@/data/size-transitions.json'

export type { BraRuns }

// ── Source-data shapes (loose — only the fields we touch) ──
interface Journey {
  from?: string
  to?: string
  brands?: string[]
}
interface StoryBucket {
  journeys?: Journey[]
}
type StoriesFile = Record<string, StoryBucket>
interface TransitionsFile {
  stats?: { avgBandChange?: number; avgCupChange?: number }
}

// ── Cup ladder (mirror of beliefEngine's spine so we can shift trueSize) ──
const UK_CUPS = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L']
const CUP_ALIASES: Record<string, number> = {
  A: 0, AA: 0, B: 1, C: 2, D: 3, DD: 4, DDD: 5, E: 5, F: 6, FF: 7,
  G: 8, GG: 9, H: 10, HH: 11, I: 11, J: 12, JJ: 13, K: 14, KK: 15, L: 16,
}
const BAND_MIN = 26
const BAND_MAX = 48
const SIZE_RE = /^\s*(\d{2,3})\s*([A-Za-z]{1,3})\s*$/

function parseSize(s: string | undefined | null): { band: number; cup: number } | null {
  if (!s) return null
  const m = SIZE_RE.exec(s)
  if (!m) return null
  const band = parseInt(m[1], 10)
  const cup = m[2].toUpperCase()
  if (cup === 'AND' || !(cup in CUP_ALIASES)) return null
  if (band % 2 !== 0) return null
  if (band < BAND_MIN || band > BAND_MAX) return null
  return { band, cup: CUP_ALIASES[cup] }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function formatSize(band: number, cupIndex: number): string {
  const c = clamp(Math.round(cupIndex), 0, UK_CUPS.length - 1)
  const b = clamp(Math.round(band / 2) * 2, BAND_MIN, BAND_MAX)
  return `${b}${UK_CUPS[c]}`
}

// Normalize the messy community brand strings ("VS", "curvy Kate", "bravissimo")
// into a single canonical key so casing/spacing variants fold together.
export function canonicalBrand(brand: string): string {
  return brand.trim().toLowerCase().replace(/\s+/g, ' ')
}

// ── Build the { brand, labelSize, trueSize } records inferBraRuns consumes ──
// Each journey (from → to) that names brands contributes one record per brand,
// with the trueSize SHIFTED back by the population-mean migration so the table
// captures each brand's deviation from the typical correction, not the arc.
function buildRecords(
  storiesFile: StoriesFile,
  avgBandChange: number,
  avgCupChange: number,
): Array<{ brand: string; labelSize: string; trueSize: string }> {
  const records: Array<{ brand: string; labelSize: string; trueSize: string }> = []
  for (const bucket of Object.values(storiesFile)) {
    for (const j of bucket.journeys ?? []) {
      if (!j.from || !j.to || !j.brands || j.brands.length === 0) continue
      const from = parseSize(j.from)
      const to = parseSize(j.to)
      if (!from || !to) continue
      // De-bias: trueSize = to − population-mean migration. Brands that pull
      // further than average stay "runs small"; gentler brands flip "runs big".
      const debiasedBand = to.band - avgBandChange
      const debiasedCup = to.cup - avgCupChange
      const trueSize = formatSize(debiasedBand, debiasedCup)
      for (const raw of j.brands) {
        const brand = canonicalBrand(raw)
        if (!brand) continue
        // labelSize must round to an even band to survive beliefEngine.parseSize.
        records.push({ brand, labelSize: j.from, trueSize })
      }
    }
  }
  return records
}

function buildTable(): Record<string, BraRuns> {
  const stats = (sizeTransitions as TransitionsFile).stats ?? {}
  const avgBand = typeof stats.avgBandChange === 'number' ? stats.avgBandChange : 0
  const avgCup = typeof stats.avgCupChange === 'number' ? stats.avgCupChange : 0
  const records = buildRecords(stories as unknown as StoriesFile, avgBand, avgCup)
  return inferBraRuns(records)
}

// Cached at module load — the data is static (bundled JSON), so build once.
const TABLE: Record<string, BraRuns> = buildTable()

export interface BraRunsResult extends BraRuns {
  brand: string // the canonical key it matched on
}

/**
 * Look up a brand's runs-small / runs-big / true-to-size personality.
 * Returns null when the brand has no fit reports in the community data, so
 * callers can render a graceful "no data yet" state.
 */
export function getBraRuns(brand: string | undefined | null): BraRunsResult | null {
  if (!brand) return null
  const key = canonicalBrand(brand)
  const hit = TABLE[key]
  if (hit) return { brand: key, ...hit }
  // Fallback: tolerate sub/superstring brand names (e.g. "Victoria's Secret PINK"
  // → "victoria's secret"). Pick the longest matching key for the most specific hit.
  let best: BraRunsResult | null = null
  for (const k of Object.keys(TABLE)) {
    if (key.includes(k) || k.includes(key)) {
      if (!best || k.length > best.brand.length) best = { brand: k, ...TABLE[k] }
    }
  }
  return best
}

/** Every brand we have a personality for — handy for debug / directory UIs. */
export function getAllBraRuns(): Record<string, BraRuns> {
  return TABLE
}
