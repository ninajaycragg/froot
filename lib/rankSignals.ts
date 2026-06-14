// ── Twin-personalized ranking signals ──
//
// findMatchingStyles in app/api/froot/route.ts ranks every style for a person
// from population-mean geometry + their shape profile. That's a good base, but
// it's the SAME ranking for everyone of a given size+shape. This module layers
// four PERSONAL signals on top — purely additive nudges to the base score, so
// the existing behavior is preserved and nothing regresses when no personal
// data is present (every helper returns 0 / a no-op on missing input).
//
// The four signals, and the intuition for each:
//
//   1. BELIEF — when the person has owned-bra fitFeedback, the belief engine
//      (refineSizeFromFeedback) sharpens their true band/cup from the noisy
//      calculator size. We reward candidate sizes that sit inside that belief
//      band/cup range and penalize ones that drift outside it. So a style that
//      only carries the body she actually fits — not just the size the
//      calculator guessed — floats up.
//
//   2. BRA-RUNS (de-bias by vanity sizing) — a brand's label is a noisy reading
//      of the body it fits. getBraRuns gives each brand's signed gap (runs-small
//      brands map their label onto a BIGGER body). We shift the candidate's
//      effective size by that gap before judging proximity to the belief, so a
//      "34D" from a run-small brand is treated like the bigger body it actually
//      holds — and rewarded/penalized accordingly.
//
//   3. MATERIAL STRETCH (forgiving vs precise) — getStretch tells us whether a
//      style runs rigid, moderate, or stretchy. Stretchy fabric forgives a
//      slightly-off match (it gives), so we WIDEN tolerance and add a gentle
//      bonus when the geometry is already close. Rigid fabric must match more
//      exactly to be worn comfortably, so we TIGHTEN tolerance: a rigid style
//      with mediocre proximity gets docked, a rigid style with a near-perfect
//      match gets a small precision reward.
//
//   4. OWNED-FEEDBACK memory — the person has already told us what works. We
//      gently downrank styles/brands she rated 'bad', and uprank brands whose
//      neighbors she rated 'perfect' (a halo: the brand that nailed one bra is
//      a good bet for its siblings).
//
// All four are clamped into the same 0.04–0.15 magnitude band the base scorer
// uses, so no single personal signal can dwarf measurement proximity (max
// +0.25). Tunable weights live at the top of this file.

import { getBraRuns } from '@/lib/braRuns'
import { getStretch } from '@/lib/braMaterials'
import type { RefinedSize, FitFeedbackPing } from '@/components/froot/beliefEngine'

// ── Tunable weights — one place to dial the personalization strength ──
export const SIGNAL_WEIGHTS = {
  // 1. belief: reward candidates inside the belief range, penalize drift out.
  beliefInBandBonus: 0.10, // candidate band sits within the belief band range
  beliefInCupBonus: 0.10, // candidate cup sits within the belief cup range
  beliefDriftPenalty: 0.05, // per step (band step or cup step) outside the range
  beliefMaxPenalty: 0.15, // cap total drift penalty
  // belief signals scale by belief confidence (0..1) so a one-ping shaky belief
  // nudges gently and a sharp 4-ping belief nudges hard.

  // 2. bra-runs: how much a brand's vanity gap shifts its effective size.
  //    (the shift feeds back into the belief check — there's no standalone term;
  //    runsShiftScale just damps the raw signed gap so noisy single-report
  //    brands don't swing too far.)
  runsShiftScale: 0.6,

  // 3. material stretch: precision reward / forgiveness.
  stretchyForgiveBonus: 0.06, // stretchy style that's already a close match
  rigidPrecisionBonus: 0.06, // rigid style that's a near-perfect match
  rigidLoosePenalty: 0.08, // rigid style whose proximity is mediocre/poor
  // proximity thresholds (on the base proximity bonus, which maxes at 0.25):
  closeProxThreshold: 0.16, // >= this is "a close match"
  looseProxThreshold: 0.10, // < this is "mediocre" for a rigid style

  // 4. owned feedback memory.
  ratedBadPenalty: 0.12, // exact style/brand the user rated 'bad'
  ratedBadBrandPenalty: 0.05, // softer hit for other styles from a 'bad' brand
  perfectHaloBonus: 0.08, // brand whose neighbor the user rated 'perfect'
  perfectExactBonus: 0.04, // small extra if it's literally the perfect style
} as const

// ── Cup ladder (mirror of beliefEngine / route spine) ──
const UK_CUPS = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L']
const CUP_ALIASES: Record<string, number> = {
  A: 0, AA: 0, B: 1, C: 2, D: 3, DD: 4, DDD: 5, E: 5, F: 6, FF: 7,
  G: 8, GG: 9, H: 10, HH: 11, I: 11, J: 12, JJ: 13, K: 14, KK: 15, L: 16,
}

function cupToIndex(cup: string): number {
  const c = cup.toUpperCase()
  return c in CUP_ALIASES ? CUP_ALIASES[c] : -1
}

// Parse a size label like "34DD" → { band, cupIndex }.
function parseSizeLabel(size: string): { band: number; cupIndex: number } | null {
  const m = /^\s*(\d{2,3})\s*([A-Za-z]{1,3})\s*$/.exec(size)
  if (!m) return null
  const band = parseInt(m[1], 10)
  const cupIndex = cupToIndex(m[2])
  if (isNaN(band) || cupIndex < 0) return null
  return { band, cupIndex }
}

function canon(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// ── The personal context the route assembles once per request ──
export interface TwinContext {
  refined: RefinedSize | null
  feedback: FitFeedbackPing[]
}

// A candidate style as findMatchingStyles knows it at scoring time.
export interface Candidate {
  brand: string
  style: string
  bestSize: string // size-key chosen for this style, e.g. "34" or "34DD"
  cupIndex: number // resolved cup index for the request
  proximityBonus: number // the base measurement-proximity term (0..0.25)
}

// ── 1+2. Belief signal, with bra-runs de-bias folded in ──
// We take the candidate's effective body size = its label size shifted by the
// brand's vanity gap (runs-small → bigger body), then reward/penalize how that
// body sits relative to the person's sharpened belief band/cup range.
function beliefSignal(c: Candidate, refined: RefinedSize | null): number {
  if (!refined || refined.nPings < 1) return 0

  // The candidate's nominal band/cup. bestSize may be band-only ("34") — fall
  // back to the request's resolved cupIndex for the cup axis.
  const parsed = parseSizeLabel(c.bestSize)
  const nominalBand = parsed ? parsed.band : parseInt(c.bestSize, 10)
  const nominalCup = parsed ? parsed.cupIndex : c.cupIndex
  if (isNaN(nominalBand)) return 0

  // De-bias by how the brand runs: +gap (runs small) means the label maps to a
  // bigger body, so the EFFECTIVE body the candidate holds is label + gap.
  const runs = getBraRuns(c.brand)
  const bandShift = runs ? runs.band * SIGNAL_WEIGHTS.runsShiftScale : 0
  const cupShift = runs ? runs.cup * SIGNAL_WEIGHTS.runsShiftScale : 0
  const effBand = nominalBand + bandShift
  const effCup = nominalCup + cupShift

  const [bandLo, bandHi] = refined.bandRange
  const cupLo = cupToIndex(refined.cupRange[0])
  const cupHi = cupToIndex(refined.cupRange[1])

  let signal = 0
  let drift = 0

  // Band axis
  if (effBand >= bandLo && effBand <= bandHi) {
    signal += SIGNAL_WEIGHTS.beliefInBandBonus
  } else {
    drift += effBand < bandLo ? (bandLo - effBand) / 2 : (effBand - bandHi) / 2 // band steps are 2"
  }

  // Cup axis (guard against unparsed cup range)
  if (cupLo >= 0 && cupHi >= 0) {
    if (effCup >= cupLo && effCup <= cupHi) {
      signal += SIGNAL_WEIGHTS.beliefInCupBonus
    } else {
      drift += effCup < cupLo ? cupLo - effCup : effCup - cupHi
    }
  }

  if (drift > 0) {
    signal -= Math.min(drift * SIGNAL_WEIGHTS.beliefDriftPenalty, SIGNAL_WEIGHTS.beliefMaxPenalty)
  }

  // Scale the whole belief nudge by confidence: a shaky one-ping belief moves
  // gently; a sharp multi-ping belief moves with authority.
  return signal * refined.confidence
}

// ── 3. Material-stretch signal (forgiving vs precise) ──
// Stretchy fabric forgives a slightly-off match; rigid fabric must match more
// exactly. We read the candidate's geometric proximity (the base term) and
// translate the stretch class into a precision reward or forgiveness.
function stretchSignal(c: Candidate): number {
  const stretch = getStretch(c.brand)
  if (!stretch) return 0
  const prox = c.proximityBonus
  const W = SIGNAL_WEIGHTS

  if (stretch.value === 'stretchy') {
    // Forgiving: reward when already close (it'll mold to her), and never
    // penalize a slightly-off stretchy style — the give absorbs it.
    return prox >= W.looseProxThreshold ? W.stretchyForgiveBonus : 0
  }
  if (stretch.value === 'rigid') {
    // Precise: a rigid style lives or dies on exact geometry.
    if (prox >= W.closeProxThreshold) return W.rigidPrecisionBonus
    if (prox < W.looseProxThreshold) return -W.rigidLoosePenalty
    return 0
  }
  return 0 // 'moderate' → neutral
}

// ── 4. Owned-feedback memory signal ──
// Downrank what she rated 'bad'; uprank brands whose neighbors she rated
// 'perfect'. Exact style match counts strongest on both directions.
function feedbackSignal(c: Candidate, feedback: FitFeedbackPing[]): number {
  if (!feedback || feedback.length === 0) return 0
  const W = SIGNAL_WEIGHTS
  const cBrand = canon(c.brand)
  const cStyle = canon(c.style)

  let signal = 0
  let sawBadExact = false
  let sawBadBrand = false
  let sawPerfectExact = false
  let sawPerfectBrand = false

  for (const fb of feedback) {
    // FitFeedbackPing as seen by the belief engine carries size+rating; the
    // richer profile feedback also carries brand/style. Read them defensively.
    const f = fb as FitFeedbackPing & { brand?: string; style?: string }
    if (!f.rating) continue
    const fBrand = canon(f.brand || '')
    const fStyle = canon(f.style || '')
    if (!fBrand) continue
    const sameBrand = fBrand === cBrand
    const sameStyle = sameBrand && !!fStyle && fStyle === cStyle

    if (f.rating === 'bad') {
      if (sameStyle) sawBadExact = true
      else if (sameBrand) sawBadBrand = true
    } else if (f.rating === 'perfect') {
      if (sameStyle) sawPerfectExact = true
      else if (sameBrand) sawPerfectBrand = true
    }
  }

  // Penalties (worst case wins; don't stack a brand hit on top of an exact hit).
  if (sawBadExact) signal -= W.ratedBadPenalty
  else if (sawBadBrand) signal -= W.ratedBadBrandPenalty

  // Halo bonus: a perfect neighbor lifts the brand; a literal perfect re-show
  // gets a touch more (she loved this exact one).
  if (sawPerfectBrand || sawPerfectExact) signal += W.perfectHaloBonus
  if (sawPerfectExact) signal += W.perfectExactBonus

  return signal
}

// ── Public: total additive personalization for one candidate ──
// Returns the sum of all personal nudges (can be negative). The route adds this
// straight onto the base score before sorting. With no personal data, every
// term is 0 and the score is identical to the pre-personalization behavior.
export function personalScore(c: Candidate, ctx: TwinContext): number {
  if (!ctx) return 0
  return (
    beliefSignal(c, ctx.refined) +
    stretchSignal(c) +
    feedbackSignal(c, ctx.feedback)
  )
}
