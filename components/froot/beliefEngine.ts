// ── Froot Belief Engine ──
// "Fit is radar, not a ruler." A bra size is a hidden target; every bra a person
// has owned + rated is a noisy PING at it. We hold a belief — a 2-D Gaussian over
// (band, cup) — and each owned-bra rating narrows it via a Bayesian update.
//
// Proven in a 600-person backtest (froot-frontier research, converge_test.py):
// with ONE rating this ties a rules calculator; from the SECOND owned bra on it
// pulls ahead and keeps sharpening (error ↓18%, uncertainty ↓~half by the 4th
// bra). So this is designed to FUSE a person's fitFeedback history — not to
// replace the one-shot calculator, but to refine it as she reports more bras.

// ── Cup ladder (UK spine; US aliased onto it) ──
const UK_CUPS = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L']
const CUP_ALIASES: Record<string, number> = {
  A: 0, AA: 0, B: 1, C: 2, D: 3, DD: 4, DDD: 5, E: 5, F: 6, FF: 7,
  G: 8, GG: 9, H: 10, HH: 11, I: 11, J: 12, JJ: 13, K: 14, KK: 15, L: 16,
}
const BAND_MIN = 26
const BAND_MAX = 48
const CUP_MIN = 0
const CUP_MAX = UK_CUPS.length - 1

const SIZE_RE = /^\s*(\d{2,3})\s*([A-Za-z]{1,3})\s*$/

function parseSize(s: string | undefined | null): { band: number; cup: number } | null {
  if (!s) return null
  const m = SIZE_RE.exec(s)
  if (!m) return null
  const band = parseInt(m[1], 10)
  const cupRaw = m[2].toUpperCase()
  if (cupRaw === 'AND' || !(cupRaw in CUP_ALIASES)) return null
  if (band % 2 !== 0) return null
  if (band < BAND_MIN || band > BAND_MAX) return null
  return { band, cup: CUP_ALIASES[cupRaw] }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function formatSize(band: number, cupIndex: number): string {
  const c = clamp(Math.round(cupIndex), CUP_MIN, CUP_MAX)
  const b = clamp(Math.round(band / 2) * 2, BAND_MIN, BAND_MAX)
  return `${b}${UK_CUPS[c]}`
}

function sisterSizes(band: number, cupIndex: number): string[] {
  const out: string[] = []
  if (band + 2 <= BAND_MAX && cupIndex - 1 >= CUP_MIN) out.push(formatSize(band + 2, cupIndex - 1))
  if (band - 2 >= BAND_MIN && cupIndex + 1 <= CUP_MAX) out.push(formatSize(band - 2, cupIndex + 1))
  return out
}

// ── The belief: an axis-aligned 2-D Gaussian over (band inches, cup steps) ──
export interface Belief {
  bandMu: number
  bandSd: number
  cupMu: number
  cupSd: number
}

function populationPrior(): Belief {
  // Wide enough that two good pings dominate it. Modal corrected size ≈ 34, DD-ish.
  return { bandMu: 34, bandSd: 4, cupMu: 3.5, cupSd: 3.5 }
}

interface Observation {
  bandX?: number
  bandPrec?: number
  cupX?: number
  cupPrec?: number
  why: string
}

// One conjugate Gaussian narrowing step, per axis independently.
//   precisionPost = precisionPrior + precisionObs
//   muPost = (precisionPrior*muPrior + precisionObs*x) / precisionPost
export function updateBelief(prior: Belief, obs: Observation): Belief {
  let { bandMu, bandSd, cupMu, cupSd } = prior
  if (obs.bandX != null && obs.bandPrec && obs.bandPrec > 0) {
    const pPrior = 1 / (bandSd * bandSd)
    const pPost = pPrior + obs.bandPrec
    bandMu = (pPrior * prior.bandMu + obs.bandPrec * obs.bandX) / pPost
    bandSd = Math.sqrt(1 / pPost)
  }
  if (obs.cupX != null && obs.cupPrec && obs.cupPrec > 0) {
    const pPrior = 1 / (cupSd * cupSd)
    const pPost = pPrior + obs.cupPrec
    cupMu = (pPrior * prior.cupMu + obs.cupPrec * obs.cupX) / pPost
    cupSd = Math.sqrt(1 / pPost)
  }
  return { bandMu, bandSd, cupMu, cupSd }
}

// ── A fit-feedback record → one or more pings ──
// Matches FrootProfile.fitFeedback[]: { size, rating, bandFit, cupFit, notes }
export interface FitFeedbackPing {
  size: string
  rating?: 'perfect' | 'good' | 'okay' | 'bad'
  bandFit?: string // 'too_tight' | 'good' | 'too_loose'
  cupFit?: string // 'too_small' | 'good' | 'too_big'
  notes?: string
}

// free-text cue → directional (band step, cup step). +cup = true cup bigger.
const TEXT_CUES: Array<[RegExp, { db: number; dc: number }]> = [
  [/spill|quad|popping out|overflow/i, { db: 0, dc: 1 }],
  [/gor[e]?\b.*(not|wont|won't).*flat|gore.*float|tack/i, { db: 0, dc: 1 }],
  [/wire.*(pain|dig|poke|hurt)/i, { db: 0, dc: 1 }],
  [/gap|wrinkl|fold|empty.*cup/i, { db: 0, dc: -1 }],
  [/rides? up|band.*loose|too loose|bigger band/i, { db: -2, dc: 1 }],
  [/straps?.*(fall|slip)/i, { db: -2, dc: 1 }],
  [/too tight|can'?t breathe|digging.*band|tight band/i, { db: 2, dc: -1 }],
]

function observationsFromFeedback(fb: FitFeedbackPing): Observation[] {
  const parsed = parseSize(fb.size)
  if (!parsed) return []
  const { band, cup } = parsed
  const obs: Observation[] = []

  // A "perfect" rating is gold: this exact size fit → strong anchor on both axes.
  if (fb.rating === 'perfect') {
    obs.push({ bandX: band, bandPrec: 5, cupX: cup, cupPrec: 5, why: `perfect-fit ${fb.size}` })
    return obs // it fit — directional complaints are moot
  }

  // The worn size itself: band is a decent default (anchors when no band complaint),
  // cup enters only weakly because cup is the axis people systematically get wrong.
  obs.push({ bandX: band, bandPrec: 0.35, cupX: cup, cupPrec: 0.05, why: `wears ${fb.size}` })

  // Structured band fit → directional band ping (strong enough to move the band).
  if (fb.bandFit === 'too_tight') obs.push({ bandX: band + 2, bandPrec: 1.0, why: 'band too tight' })
  else if (fb.bandFit === 'too_loose') obs.push({ bandX: band - 2, bandPrec: 1.0, why: 'band too loose' })

  // Structured cup fit → directional cup ping.
  if (fb.cupFit === 'too_small') obs.push({ cupX: cup + 1, cupPrec: 0.6, why: 'cup too small' })
  else if (fb.cupFit === 'too_big') obs.push({ cupX: cup - 1, cupPrec: 0.6, why: 'cup too big' })

  // Free-text notes → mined directional cues.
  if (fb.notes) {
    for (const [re, { db, dc }] of TEXT_CUES) {
      if (re.test(fb.notes)) {
        obs.push({
          bandX: db ? band + db : undefined,
          bandPrec: db ? 1.0 : 0,
          cupX: dc ? cup + dc : undefined,
          cupPrec: dc ? 0.3 : 0,
          why: `notes:${re.source.slice(0, 16)}`,
        })
      }
    }
  }
  return obs
}

export interface RefinedSize {
  sizeUK: string
  bandSize: number
  cupUK: string
  sisters: string[]
  bandRange: [number, number]
  cupRange: [string, string]
  confidence: number // 0..1, tighter belief → higher
  nPings: number // how many owned bras fed the belief
  trace: string[]
}

// Fold a person's owned-bra fitFeedback into a sharpened size belief.
// Optionally seed the prior from their calculator result (currentSizeUK) so the
// feedback REFINES that starting point rather than starting cold.
export function refineSizeFromFeedback(
  feedback: FitFeedbackPing[],
  currentSizeUK?: string,
): RefinedSize | null {
  if (!feedback || feedback.length === 0) return null

  let belief = populationPrior()
  const seed = parseSize(currentSizeUK)
  if (seed) {
    // Seed the prior on the calculator's size, but keep it loose so 2+ pings win.
    belief = { bandMu: seed.band, bandSd: 3, cupMu: seed.cup, cupSd: 2.5 }
  }

  const trace: string[] = []
  let nPings = 0
  for (const fb of feedback) {
    const obsList = observationsFromFeedback(fb)
    if (obsList.length) nPings += 1
    for (const obs of obsList) {
      belief = updateBelief(belief, obs)
      trace.push(obs.why)
    }
  }

  const band = clamp(Math.round(belief.bandMu / 2) * 2, BAND_MIN, BAND_MAX)
  const cup = clamp(Math.round(belief.cupMu), CUP_MIN, CUP_MAX)
  const bandLo = clamp(Math.round((belief.bandMu - belief.bandSd) / 2) * 2, BAND_MIN, BAND_MAX)
  const bandHi = clamp(Math.round((belief.bandMu + belief.bandSd) / 2) * 2, BAND_MIN, BAND_MAX)
  const cupLo = clamp(Math.round(belief.cupMu - belief.cupSd), CUP_MIN, CUP_MAX)
  const cupHi = clamp(Math.round(belief.cupMu + belief.cupSd), CUP_MIN, CUP_MAX)

  return {
    sizeUK: formatSize(band, cup),
    bandSize: band,
    cupUK: UK_CUPS[cup],
    sisters: sisterSizes(band, cup),
    bandRange: [bandLo, bandHi],
    cupRange: [UK_CUPS[cupLo], UK_CUPS[cupHi]],
    confidence: Math.round((1 / (1 + belief.bandSd + belief.cupSd)) * 1000) / 1000,
    nPings,
    trace,
  }
}

// ── IRT-style bra "personality": runs-small / runs-big, learned across people ──
// Each record ties a garment's printed label to the body that actually fit it.
// The mean signed gap is the brand's latent vanity-sizing parameter.
export interface BraRuns {
  band: number // +inches body exceeds label → runs SMALL
  cup: number // +cup steps body exceeds label → runs SMALL
  n: number
  label: 'runs small' | 'runs big' | 'true-to-size'
}

export function inferBraRuns(
  records: Array<{ brand: string; labelSize: string; trueSize: string }>,
): Record<string, BraRuns> {
  const acc: Record<string, Array<[number, number]>> = {}
  for (const r of records) {
    const lab = parseSize(r.labelSize)
    const tru = parseSize(r.trueSize)
    if (!lab || !tru || !r.brand) continue
    ;(acc[r.brand] ||= []).push([tru.band - lab.band, tru.cup - lab.cup])
  }
  const out: Record<string, BraRuns> = {}
  for (const [brand, gaps] of Object.entries(acc)) {
    const band = gaps.reduce((s, g) => s + g[0], 0) / gaps.length
    const cup = gaps.reduce((s, g) => s + g[1], 0) / gaps.length
    const mag = Math.abs(cup) + Math.abs(band) / 2
    const label = mag < 0.4 ? 'true-to-size' : cup + band / 2 > 0 ? 'runs small' : 'runs big'
    out[brand] = { band, cup, n: gaps.length, label }
  }
  return out
}
