// off-policy — the clean-label exploration policy (the moat substrate).
//
// A fit recommender that always shows its top pick can NEVER learn whether the
// 2nd/3rd choice would have fit better — the outcomes only ever cover what was
// shown (survivorship), re-encoding the broken size convention. To get unbiased
// counterfactual labels you must (a) inject controlled randomness and (b) log the
// PROPENSITY — P(shown | policy) — so real outcomes can be reweighted (IPS / SNIPS)
// into "would candidate j have fit this body?" for options we never showed.
//
// Pure + deterministically seeded, so a given (body, style) yields ONE stable draw
// (no hero flicker across re-renders) and the whole thing unit-tests reproducibly.
// Generic over the candidate type — the fit-field ranks BraSizes; nothing here
// depends on that. Ported from baby's app/froot/fit/lib/off-policy.ts, generalized.

// ── deterministic RNG (mulberry32) — seeded so a draw is reproducible ───────────
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable 32-bit hash of a string → an RNG seed (so the draw is keyed to the body/style). */
export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type Arm = 'exploit' | 'explore'

/** The logged policy draw over a pre-sorted candidate list (index 0 = argmax). */
export interface PolicyDraw<T> {
  shown: T
  /** index into the (top-K) candidate window that was actually shown */
  index: number
  /** P(this candidate shown | policy) — the logging propensity for IPS/SNIPS */
  propensity: number
  arm: Arm
  epsilon: number
  candidateCount: number
}

export interface PolicyOpts {
  /** exploration rate (default 0.08 — ~1 in 12 shows a close alternative) */
  epsilon?: number
  /** seeded RNG; pass makeRng(hashSeed(bodyStyleKey)) so the draw is stable per session */
  rng?: () => number
  /** candidate-window size — exploration only ever picks a near-fit (default 6) */
  k?: number
}

/**
 * ε-greedy logging policy over the top-K of a PRE-SORTED candidate list:
 *   P(show j) = (1−ε)·1[j = 0] + ε·(1/K)
 * With prob (1−ε) show the top pick (exploit); with prob ε show a uniform-random
 * candidate from the window (explore). Either way we log the policy-level propensity
 * of the candidate actually shown — that's what turns the outcome into an unbiased
 * counterfactual label. Returns null for an empty list.
 */
export function drawRecommendation<T>(ranked: readonly T[], opts: PolicyOpts = {}): PolicyDraw<T> | null {
  if (ranked.length === 0) return null
  const epsilon = opts.epsilon ?? 0.08
  const rng = opts.rng ?? makeRng(1)
  const k = Math.min(opts.k ?? 6, ranked.length)

  const r = rng()
  let index: number
  let arm: Arm
  if (r < epsilon && k > 1) {
    index = Math.min(k - 1, Math.floor(rng() * k))
    arm = 'explore'
  } else {
    index = 0
    arm = 'exploit'
  }

  const propensity = (index === 0 ? 1 - epsilon : 0) + epsilon * (1 / k)
  return { shown: ranked[index], index, propensity, arm, epsilon, candidateCount: k }
}

// ── off-policy estimation (IPS / SNIPS) — grade a NEW policy from logged data ────
export type Outcome = 'kept' | 'returned' | 'fit' | 'too-small' | 'too-big' | null

/** Symptom-space return reasons (community vocabulary) that are genuine FIT failures. */
export const FIT_SYMPTOMS: ReadonlySet<string> = new Set([
  'band-rode-up', 'band-too-tight', 'cup-gaped', 'cup-overflowed',
  'gore-floated', 'gore-dug', 'wire-on-tissue', 'straps-dug', 'uncomfortable-by-hour',
])

export interface LoggedRound {
  /** propensity under the LOGGING policy when this was shown */
  propensity: number
  /** reward: 1 = kept/fit, 0 = returned-for-fit. Non-fit returns dropped upstream. */
  reward: number
  /** would the NEW (target) policy have shown this same candidate? */
  targetWouldShow: boolean
}

/** Inverse-propensity score: unbiased estimate of a deterministic target policy's reward. */
export function ipsValue(rounds: LoggedRound[]): number {
  if (rounds.length === 0) return 0
  let acc = 0
  for (const r of rounds) {
    if (r.targetWouldShow && r.propensity > 0) acc += r.reward / r.propensity
  }
  return acc / rounds.length
}

/** Self-normalized IPS — lower variance, the safer default in production. */
export function snipsValue(rounds: LoggedRound[]): number {
  let num = 0
  let den = 0
  for (const r of rounds) {
    if (r.targetWouldShow && r.propensity > 0) {
      num += r.reward / r.propensity
      den += 1 / r.propensity
    }
  }
  return den > 0 ? num / den : 0
}

/** A real outcome → reward, dropping non-fit confounds (style/changed-mind) as abstain (null). */
export function rewardFromOutcome(outcome: Outcome, symptom?: string): number | null {
  if (outcome === 'kept' || outcome === 'fit') return 1
  if (outcome === 'returned' || outcome === 'too-small' || outcome === 'too-big') {
    if (symptom && !FIT_SYMPTOMS.has(symptom)) return null // not a fit failure → abstain
    return 0
  }
  return null
}
