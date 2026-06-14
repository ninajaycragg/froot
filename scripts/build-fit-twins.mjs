#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────────
// build-fit-twins.mjs — the FIT-TWIN engine builder
//
// Turns Froot's OWN community corpus (size-transitions / stories /
// community-insights) into a compact collaborative-filtering index:
//
//   (band-bucket, cup-bucket) neighborhood → the bras/brands that people
//   built like you LANDED ON and PRAISED, with a count + a fit-rate-ish score.
//
// The payoff is "people like you converged on these" — not a quote wall, a
// RANKED shortlist. Three independent community signals fuse per bucket:
//
//   1. community-insights[bucket].brands  — sentiment {positive,negative,score}
//      = the praise/complaint ledger. positive ⇒ it fit, negative ⇒ it didn't.
//   2. stories[bucket].journeys           — for journeys with a `to` size AND
//      named brands, those are the bras someone actually MIGRATED TO and kept.
//      A "landed-on" event is the strongest converged signal we have.
//   3. stories[bucket].brandStories       — extra brand mentions w/ sizes.
//
// fit-rate-ish score per brand-in-bucket (0..1):
//   fitRate   = (positive + landed) / (positive + landed + negative)   [Wilson-ish]
//   we shrink toward the bucket prior with a small pseudocount so a single
//   loud mention can't top a brand with 30 happy reports.
//   support   = positive + landed + neutral*0.15 + brandStory mentions
//   score     = fitRate * confidence(support)  — rank key.
//
// Output: data/froot/fit-twins.json — compact (per-bucket top ~12 brands).
// No RTR data is touched; that stays a recsys reference only.
// ──────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA = join(ROOT, 'data')
const OUT_DIR = join(DATA, 'froot')
const OUT = join(OUT_DIR, 'fit-twins.json')

const read = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'))
const community = read('community-insights.json')
const stories = read('stories.json')
const brandMeta = read('brand-meta.json')

// ── Brand canonicalization → exact Title-Case display key ───────────────────
// Downstream lookups (measurements, sentiment) are exact-string keyed off
// brand-meta.json, so the index must emit those exact display strings.
const displayByLower = new Map()
for (const k of Object.keys(brandMeta)) {
  const l = k.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!displayByLower.has(l)) displayByLower.set(l, k)
}
// Hand aliases for the noisy community shorthands that don't resolve directly.
const ALIASES = {
  vs: "Victoria's Secret",
  'savage x': 'Savage X Fenty',
  parfait: 'Parfait By Affinitas',
}
function canonBrand(raw) {
  if (!raw) return null
  const l = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!l) return null
  if (ALIASES[l]) return ALIASES[l]
  if (displayByLower.has(l)) return displayByLower.get(l)
  // tolerate sub/superstring (e.g. "victoria's secret pink")
  let best = null
  for (const [low, disp] of displayByLower) {
    if (l.includes(low) || low.includes(l)) {
      if (!best || low.length > best.low.length) best = { low, disp }
    }
  }
  return best ? best.disp : null
}

// Brands that are department-store catch-alls / non-brands → drop as noise.
const BRAND_STOPLIST = new Set([
  'lady', 'undies', 'understand', 'sister', 'everyone', 'someone',
  'target', 'walmart', 'amazon', 'nordstrom',
])

// ── Bucket geometry (mirrors community-insights / stories keys) ─────────────
// Bands: 28-30 / 32-34 / 36-38 / 40-42 / 44+   Cups: AA-C/D-DD/E-FF/G-HH/J+
const UK_CUPS = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L']
const CUP_ALIASES = {
  A: 0, AA: 0, B: 1, C: 2, D: 3, DD: 4, DDD: 5, E: 5, F: 6, FF: 7,
  G: 8, GG: 9, H: 10, HH: 11, I: 11, J: 12, JJ: 13, K: 14, KK: 15, L: 16,
}
const SIZE_RE = /^\s*(\d{2,3})\s*([A-Za-z]{1,3})\s*$/
function parseSize(s) {
  if (!s) return null
  const m = SIZE_RE.exec(s)
  if (!m) return null
  const band = parseInt(m[1], 10)
  const cup = m[2].toUpperCase()
  if (cup === 'AND' || !(cup in CUP_ALIASES)) return null
  if (band < 26 || band > 56) return null
  return { band, cupIndex: CUP_ALIASES[cup] }
}

// ── Shapes: the per-bucket shape histogram is the "body twin" tag set ───────
function topShapes(hist, n = 3) {
  if (!hist) return []
  return Object.entries(hist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
}

// ── Accumulate per-(bucket, brand) tallies from the three signals ───────────
// tally: { positive, negative, neutral, landed, mentions, shapes:Set }
const buckets = {}
function bucketOf(key) {
  if (!buckets[key]) buckets[key] = { brands: {} }
  return buckets[key]
}
function tallyOf(bucketKey, brand) {
  const b = bucketOf(bucketKey)
  if (!b.brands[brand]) {
    b.brands[brand] = { positive: 0, negative: 0, neutral: 0, landed: 0, mentions: 0, shapes: {} }
  }
  return b.brands[brand]
}

// Signal 1 — community-insights sentiment ledger (the praise/complaint counts).
for (const [bucketKey, data] of Object.entries(community)) {
  for (const [rawBrand, s] of Object.entries(data.brands || {})) {
    if (BRAND_STOPLIST.has(rawBrand.trim().toLowerCase())) continue
    const brand = canonBrand(rawBrand)
    if (!brand) continue
    const t = tallyOf(bucketKey, brand)
    t.positive += s.positive || 0
    t.negative += s.negative || 0
    t.neutral += s.neutral || 0
    t.mentions += (s.positive || 0) + (s.negative || 0) + (s.neutral || 0)
  }
}

// Signal 2 — journeys: brands people MIGRATED TO and kept (strongest converge).
// We bucket the journey by its DESTINATION size (where she landed), not the key.
for (const bucket of Object.values(stories)) {
  for (const j of bucket.journeys || []) {
    if (!j.brands || j.brands.length === 0) continue
    const to = parseSize(j.to)
    const destKey = to ? bucketKeyFor(to.band, to.cupIndex) : null
    const shapes = j.shapes || []
    for (const rawBrand of j.brands) {
      if (BRAND_STOPLIST.has(rawBrand.trim().toLowerCase())) continue
      const brand = canonBrand(rawBrand)
      if (!brand) continue
      // attribute the landed-on event to the destination bucket (and the source
      // bucket too only if no destination parsed — keep the signal local).
      const key = destKey || keyContaining(bucket)
      if (!key) continue
      const t = tallyOf(key, brand)
      t.landed += 1
      t.mentions += 1
      for (const sh of shapes) t.shapes[sh] = (t.shapes[sh] || 0) + 1
    }
  }
}

// Signal 3 — brandStories: extra brand mentions tied to a bucket key.
for (const [bucketKey, bucket] of Object.entries(stories)) {
  for (const [rawBrand, arr] of Object.entries(bucket.brandStories || {})) {
    if (BRAND_STOPLIST.has(rawBrand.trim().toLowerCase())) continue
    const brand = canonBrand(rawBrand)
    if (!brand) continue
    const t = tallyOf(bucketKey, brand)
    t.mentions += Array.isArray(arr) ? arr.length : 0
  }
}

// helper: which community bucket key contains a given band/cup index
function bucketKeyFor(band, cupIndex) {
  let bandBucket
  if (band <= 30) bandBucket = '28-30'
  else if (band <= 34) bandBucket = '32-34'
  else if (band <= 38) bandBucket = '36-38'
  else if (band <= 42) bandBucket = '40-42'
  else bandBucket = '44+'
  let cupBucket
  if (cupIndex <= 2) cupBucket = 'AA-C'          // A,B,C
  else if (cupIndex <= 4) cupBucket = 'D-DD'     // D,DD
  else if (cupIndex <= 7) cupBucket = 'E-FF'     // E,F,FF
  else if (cupIndex <= 11) cupBucket = 'G-HH'    // G,GG,H,HH
  else cupBucket = 'J+'
  return `${bandBucket}|${cupBucket}`
}
// when a journey has no parseable destination, fall back to its own bucket key
function keyContaining(bucketObj) {
  for (const [k, v] of Object.entries(stories)) if (v === bucketObj) return k
  return null
}

// ── Score + rank per bucket ─────────────────────────────────────────────────
// fitRate shrunk toward bucket prior; score = fitRate * confidence(support).
const PSEUDO = 4 // shrinkage pseudocount toward bucket prior

const out = {}
let totalRows = 0
for (const [bucketKey, b] of Object.entries(buckets)) {
  // bucket prior fit-rate (population of this neighborhood)
  let pPos = 0, pNeg = 0, pLanded = 0
  for (const t of Object.values(b.brands)) {
    pPos += t.positive; pNeg += t.negative; pLanded += t.landed
  }
  const priorFit = (pPos + pLanded + 1) / (pPos + pLanded + pNeg + 2)

  const ciShapes = topShapes(community[bucketKey]?.shapes, 3)

  const ranked = []
  for (const [brand, t] of Object.entries(b.brands)) {
    const good = t.positive + t.landed
    const bad = t.negative
    // shrink fit-rate toward the bucket prior so low-n brands regress
    const fitRate = (good + PSEUDO * priorFit) / (good + bad + PSEUDO)
    // support = how much evidence backs this brand in this neighborhood
    const support = good + t.neutral * 0.15 + Math.min(t.mentions, 200) * 0.02
    // confidence saturates with support (people-like-you N)
    const confidence = support / (support + 6)
    const score = fitRate * confidence
    const n = Math.round(good + t.neutral * 0.15) // human-facing "people" count
    if (good <= 0 && t.neutral < 3) continue // require a real positive signal

    // brand's own shape leanings = journey shapes ∪ bucket top shapes
    const brandShapes = topShapes(t.shapes, 2)
    const shapes = [...new Set([...brandShapes, ...ciShapes])].slice(0, 3)

    ranked.push({
      brand,
      score: Math.round(score * 1000) / 1000,
      fitRate: Math.round(fitRate * 1000) / 1000,
      n,
      landed: t.landed,
      pos: t.positive,
      neg: t.negative,
      shapes,
    })
  }
  ranked.sort((a, b2) => b2.score - a.score || b2.n - a.n)
  const top = ranked.slice(0, 12)
  totalRows += top.length
  out[bucketKey] = {
    mentions: community[bucketKey]?.mentions || 0,
    priorFit: Math.round(priorFit * 1000) / 1000,
    shapes: ciShapes,
    brands: top,
  }
}

// ── Emit ────────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true })
const payload = {
  __meta: {
    generated: new Date().toISOString(),
    source: ['community-insights.json', 'stories.json', 'size-transitions.json'],
    note: 'Fit-twin CF index: per (band|cup) bucket, the bras people built like you landed on / praised. RTR dataset NOT used (reference only).',
    bandBuckets: ['28-30', '32-34', '36-38', '40-42', '44+'],
    cupBuckets: ['AA-C', 'D-DD', 'E-FF', 'G-HH', 'J+'],
  },
  buckets: out,
}
writeFileSync(OUT, JSON.stringify(payload))
const bytes = statSync(OUT).size
console.log(`✓ wrote ${OUT}`)
console.log(`  buckets: ${Object.keys(out).length}`)
console.log(`  brand rows total: ${totalRows}`)
console.log(`  file size: ${(bytes / 1024).toFixed(1)} KB (${bytes} bytes)`)
if (bytes > 1_000_000) console.warn('  ⚠ over 1MB budget!')
// quick peek
const peek = Object.entries(out)[5]
console.log(`  sample bucket "${peek[0]}":`, JSON.stringify(peek[1].brands.slice(0, 4)))
