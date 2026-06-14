// ──────────────────────────────────────────────────────────────────────────
// fitTwins.ts — "people built like you converged on these bras"
//
// The collaborative-filtering payoff on top of fit-twins.json (built by
// scripts/build-fit-twins.mjs). Given a body — {band, cupIndex, shape} — we
// find the (band|cup) neighborhood it falls in, then do a NEAREST-NEIGHBOR
// gather over adjacent neighborhoods using SISTER-SIZE adjacency: a body one
// cup up + one band down is the same cup volume, so its twins are relevant too.
//
// Each neighbor contributes its ranked brands weighted by how close it is
// (distance-decayed). Brands fuse across neighbors (score-weighted sum + a
// shape-match boost when the user's shape matches the brand's leaning). The
// result is a single ranked list of brands with a confidence/count and a
// one-line `why` — the recsys turns a quote wall into a shortlist.
// ──────────────────────────────────────────────────────────────────────────

import fitTwinsData from '@/data/froot/fit-twins.json'

// ── Types ───────────────────────────────────────────────────────────────────
interface BrandRow {
  brand: string
  score: number
  fitRate: number
  n: number
  landed: number
  pos: number
  neg: number
  shapes: string[]
}
interface BucketEntry {
  mentions: number
  priorFit: number
  shapes: string[]
  brands: BrandRow[]
}
interface FitTwinsFile {
  __meta: { bandBuckets: string[]; cupBuckets: string[] }
  buckets: Record<string, BucketEntry>
}

const DATA = fitTwinsData as unknown as FitTwinsFile

export interface FitTwinInput {
  band: number
  cupIndex: number
  shape?: string | null
}

export interface FitTwin {
  brand: string
  score: number // 0..1 fused confidence-weighted fit score (rank key)
  n: number // ~ how many people-like-you back this brand
  fitRate: number // share who fit / stayed (0..1) — the graded color driver
  landed: number // # who literally migrated TO this brand in your range
  why: string // one-line human reason
  shapes: string[] // body-shapes this brand leans toward
  shapeMatch: boolean // true if the user's shape is in this brand's leaning
}

// ── Bucket geometry (mirror of the build script) ────────────────────────────
const BAND_BUCKETS: Array<[number, number, string]> = [
  [0, 30, '28-30'],
  [31, 34, '32-34'],
  [35, 38, '36-38'],
  [39, 42, '40-42'],
  [43, 999, '44+'],
]
// cup index ranges (UK ladder index): A=0 B=1 C=2 D=3 DD=4 E=5 F=6 FF=7 G=8 ...
const CUP_BUCKETS: Array<[number, number, string]> = [
  [0, 2, 'AA-C'],
  [3, 4, 'D-DD'],
  [5, 7, 'E-FF'],
  [8, 11, 'G-HH'],
  [12, 999, 'J+'],
]

function bandBucketIndex(band: number): number {
  for (let i = 0; i < BAND_BUCKETS.length; i++) {
    if (band <= BAND_BUCKETS[i][1]) return i
  }
  return BAND_BUCKETS.length - 1
}
function cupBucketIndex(cupIndex: number): number {
  for (let i = 0; i < CUP_BUCKETS.length; i++) {
    if (cupIndex <= CUP_BUCKETS[i][1]) return i
  }
  return CUP_BUCKETS.length - 1
}
function keyFromIdx(bi: number, ci: number): string {
  return `${BAND_BUCKETS[bi][2]}|${CUP_BUCKETS[ci][2]}`
}

// ── Neighbor set with sister-size adjacency weights ──────────────────────────
// Distance cost is asymmetric-aware: a pure cup step and a pure band step are
// both 1; the SISTER move (band −1 / cup +1, or band +1 / cup −1) keeps the
// same cup volume, so we treat it as CLOSER than two independent steps (0.75
// instead of 1.5). Weight = decay^cost.
const DECAY = 0.55
function neighborWeights(bi: number, ci: number): Array<{ key: string; w: number }> {
  const nB = BAND_BUCKETS.length
  const nC = CUP_BUCKETS.length
  const out: Array<{ key: string; w: number }> = []
  for (let b = 0; b < nB; b++) {
    for (let c = 0; c < nC; c++) {
      const db = b - bi
      const dc = c - ci
      if (db === 0 && dc === 0) {
        out.push({ key: keyFromIdx(b, c), w: 1 })
        continue
      }
      // sister move: opposite-sign band/cup of equal magnitude = same volume
      const isSister = Math.sign(db) === -Math.sign(dc) && Math.abs(db) === Math.abs(dc)
      const cost = isSister ? 0.75 * Math.abs(db) : Math.abs(db) + Math.abs(dc)
      if (cost > 2) continue // only gather the close neighborhood
      out.push({ key: keyFromIdx(b, c), w: Math.pow(DECAY, cost) })
    }
  }
  return out
}

// ── one-line why ─────────────────────────────────────────────────────────────
function buildWhy(b: BrandRow, shapeMatch: boolean, isHome: boolean): string {
  if (b.landed >= 2) return `${b.landed} people your size landed here and stayed`
  if (b.landed === 1 && shapeMatch) return `someone your size & shape switched to this`
  if (shapeMatch && b.shapes.length) return `loved by ${b.shapes[0].replace(/_/g, ' ')} shapes like you`
  if (b.pos >= 15) return `${b.pos} happy fit reports in your range`
  if (b.neg === 0 && b.pos > 0) return `${b.pos} praise it, zero complaints in your size`
  if (!isHome) return `fits people one sister-size from you`
  if (b.pos > 0) return `${b.pos} people your size rate it well`
  return `mentioned often by people your size`
}

// ── Main API ─────────────────────────────────────────────────────────────────
/**
 * fitTwinsFor — ranked bras that people built like you converged on.
 *
 * @param input.band      numeric UK band (e.g. 32). Even or odd both fine.
 * @param input.cupIndex  UK cup ladder index (A=0,B=1,C=2,D=3,DD=4,E=5,...).
 * @param input.shape     optional shape key (shallow/projected/wide_root/...).
 * @param limit           max brands to return (default 8).
 */
export function fitTwinsFor(input: FitTwinInput, limit = 8): FitTwin[] {
  const bi = bandBucketIndex(input.band)
  const ci = cupBucketIndex(input.cupIndex)
  const homeKey = keyFromIdx(bi, ci)
  const shape = input.shape || null

  const neighbors = neighborWeights(bi, ci)

  // fuse brand evidence across neighbors
  type Agg = {
    brand: string
    scoreSum: number
    wSum: number
    n: number
    landed: number
    pos: number
    neg: number
    fitRateW: number // weighted fitRate accumulator
    shapes: Set<string>
    fromHome: boolean
  }
  const agg = new Map<string, Agg>()

  for (const { key, w } of neighbors) {
    const bucket = DATA.buckets[key]
    if (!bucket) continue
    const isHome = key === homeKey
    for (const row of bucket.brands) {
      let a = agg.get(row.brand)
      if (!a) {
        a = {
          brand: row.brand,
          scoreSum: 0,
          wSum: 0,
          n: 0,
          landed: 0,
          pos: 0,
          neg: 0,
          fitRateW: 0,
          shapes: new Set(),
          fromHome: false,
        }
        agg.set(row.brand, a)
      }
      a.scoreSum += row.score * w
      a.fitRateW += row.fitRate * w
      a.wSum += w
      // only count people/positives at full weight from home; neighbors are
      // evidence but shouldn't inflate the headline count.
      a.n += Math.round(row.n * w)
      a.landed += row.landed * (isHome ? 1 : w >= 0.5 ? 1 : 0)
      a.pos += Math.round(row.pos * w)
      a.neg += Math.round(row.neg * w)
      row.shapes.forEach((s) => a!.shapes.add(s))
      if (isHome) a.fromHome = true
    }
  }

  const results: FitTwin[] = []
  for (const a of agg.values()) {
    const baseScore = a.wSum > 0 ? a.scoreSum / a.wSum : 0
    const fitRate = a.wSum > 0 ? a.fitRateW / a.wSum : 0
    const shapeMatch = !!shape && a.shapes.has(shape)
    // shape-aligned twins get a gentle boost; home-bucket presence too.
    const boost = (shapeMatch ? 0.12 : 0) + (a.fromHome ? 0.04 : 0)
    const score = Math.min(1, baseScore + boost)
    const shapesArr = [...a.shapes].slice(0, 3)
    results.push({
      brand: a.brand,
      score: Math.round(score * 1000) / 1000,
      n: Math.max(a.n, a.pos),
      fitRate: Math.round(fitRate * 1000) / 1000,
      landed: a.landed,
      shapes: shapesArr,
      shapeMatch,
      why: buildWhy(
        { ...a, score, fitRate, shapes: shapesArr } as unknown as BrandRow,
        shapeMatch,
        a.fromHome,
      ),
    })
  }

  results.sort((x, y) => y.score - x.score || y.n - x.n)
  return results.slice(0, limit)
}

/** The neighborhood label (e.g. "32-34|D-DD") for a body — handy for UI. */
export function fitTwinBucket(input: FitTwinInput): string {
  return keyFromIdx(bandBucketIndex(input.band), cupBucketIndex(input.cupIndex))
}
