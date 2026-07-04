// conformal — the calibrated promise: "order these two, ≥90% one fits — or it's free."
//
// A fit recommender that just says "you're a 30F" is a guess. Conformal prediction
// turns the model into a SET with a finite-sample coverage guarantee: P(your true
// size ∈ the set) ≥ 1−α, distribution-free. So "order this 2-size set, one fits with
// probability ≥ 90%" becomes a mathematically real promise you can underwrite.
//
// THE CATCH (flagged in the audit): the guarantee assumes EXCHANGEABILITY, and
// returns data violates it — women who return are systematically different from those
// who keep (covariate shift), and the model is worse on harder bodies. Naive conformal
// then SILENTLY under-covers (a guarantee you'd get sued over). The fix is WEIGHTED
// conformal: reweight calibration points by the target/logging density ratio to restore
// valid coverage. conformal.test.ts proves naive under-covers and weighting repairs it.
// Pure + seeded so it unit-tests.

export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface CalibPoint {
  /** nonconformity score for the size that actually fit: s = 1 − predicted P(fit). lower = model was confident & right. */
  score: number
  /** importance weight = target-density / calibration-density (covariate-shift correction). 1 = no shift. */
  weight: number
}

/**
 * Weighted split-conformal quantile: the smallest threshold q such that the
 * weighted fraction of calibration scores ≤ q is at least (1−α). Weights are
 * normalized including a mass for the (worst-case) test point, the standard
 * finite-sample-valid construction. Returns the nonconformity cutoff.
 */
export function conformalQuantile(calib: CalibPoint[], alpha: number): number {
  if (calib.length === 0) return Infinity
  const sorted = [...calib].sort((a, b) => a.score - b.score)
  const totalW = sorted.reduce((s, c) => s + c.weight, 0)
  // include a +∞ point carrying the max single weight (conservative finite-sample term)
  const maxW = Math.max(...sorted.map((c) => c.weight))
  const denom = totalW + maxW
  const target = 1 - alpha
  let cum = 0
  for (const c of sorted) {
    cum += c.weight
    if (cum / denom >= target) return c.score
  }
  return Infinity // need the +∞ point → set must include everything
}

export interface SizeScore {
  size: string
  /** model's predicted probability this size fits this body */
  predFit: number
}

export interface PredictionSet {
  sizes: string[]
  /** the stated guarantee level (1−α) */
  coverage: number
  /** quantile threshold used */
  q: number
}

/**
 * The prediction SET for a new shopper: every candidate size whose nonconformity
 * (1 − predFit) is within the conformal cutoff q. Guarantee: the true size is in
 * this set with probability ≥ 1−α. "order two" = the set has size 2.
 */
export function predictionSet(candidates: SizeScore[], q: number, alpha: number): PredictionSet {
  const sizes = candidates.filter((c) => 1 - c.predFit <= q).map((c) => c.size)
  // never return empty — fall back to the single best if the cutoff excludes all
  if (sizes.length === 0 && candidates.length) {
    const best = candidates.reduce((a, b) => (b.predFit > a.predFit ? b : a))
    sizes.push(best.size)
  }
  return { sizes, coverage: 1 - alpha, q }
}

/** Measured coverage of a set rule on a labeled test set (for validation/audit). */
export function empiricalCoverage(testScores: number[], q: number): number {
  if (testScores.length === 0) return 0
  return testScores.filter((s) => s <= q).length / testScores.length
}

/** Mean set size (efficiency): a guarantee is only useful if the sets stay small. */
export function meanSetSize(sets: PredictionSet[]): number {
  if (sets.length === 0) return 0
  return sets.reduce((s, p) => s + p.sizes.length, 0) / sets.length
}
