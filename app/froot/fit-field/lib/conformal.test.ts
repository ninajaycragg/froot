// Tests for conformal. Run: `node conformal.test.ts`.
// THE proof: the "order two, ≥90% one fits" promise is real ONLY with weighted
// conformal. We construct a returns-style covariate shift (calibration oversamples
// easy bodies; the model is worse on hard ones) and show: (1) NAIVE conformal
// silently UNDER-covers on the true population (the lawsuit), (2) WEIGHTED conformal
// restores coverage to the promised level, (3) in the product regime (a decent,
// calibrated model) the guaranteed sets stay small (useful).
//
// NOTE on (2): conformal's guarantee is MARGINAL — ≥1−α on average over calibration
// draws, not on every single draw. A single-seed `coverage ≥ 90%` assertion is a
// coin-flip near the boundary (it once failed at 89.6% from draw luck alone), so we
// assert the MEAN over several independent worlds, plus weighted>naive on every one.
import {
  makeRng, conformalQuantile, predictionSet, empiricalCoverage, meanSetSize,
  type CalibPoint, type SizeScore,
} from './conformal.ts'

let pass = 0, fail = 0
const check = (n: string, c: boolean, d = '') => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}  ${d}`)) }
const approx = (n: string, g: number, w: number, tol: number) => check(n, Math.abs(g - w) <= tol, `got ${g.toFixed(3)} want ${w}±${tol}`)

// World: a body has "hardness" x∈[0,1] (e.g. larger/ptotic cup). The model's
// nonconformity score for the true size grows with x (model worse on hard bodies):
//   score(x) = x + noise.  The TRUE population is uniform in x. But CALIBRATION
// oversamples easy bodies (returns bias) ∝ (1−x), so naive calibration sees mostly
// low scores → its quantile is too small → under-coverage on the real population.
function sampleScore(x: number, rng: () => number): number {
  return Math.max(0, Math.min(1, x + (rng() - 0.5) * 0.2))
}

const ALPHA = 0.1 // promise ≥90% coverage
const BIAS = 0.6  // realistic (not pathological) returns shift

interface World { calibNaive: CalibPoint[]; calibWeighted: CalibPoint[]; testScores: number[] }
function makeWorld(seed: number, nCalib = 10000, nTest = 20000): World {
  const rng = makeRng(seed)
  const calibNaive: CalibPoint[] = []
  const calibWeighted: CalibPoint[] = []
  let n = 0
  while (n < nCalib) {
    const x = rng()
    if (rng() < 1 - BIAS * x) { // oversample easy bodies (returns bias)
      const score = sampleScore(x, rng)
      calibNaive.push({ score, weight: 1 }) // naive: ignores the shift
      // weighted: target(uniform)/source(∝1−B·x) ∝ 1/(1−B·x)
      calibWeighted.push({ score, weight: 1 / Math.max(0.1, 1 - BIAS * x) })
      n++
    }
  }
  // fresh TEST set from the TRUE (uniform) population — what shoppers actually are
  const testScores: number[] = []
  for (let i = 0; i < nTest; i++) testScores.push(sampleScore(rng(), rng))
  return { calibNaive, calibWeighted, testScores }
}

const world = makeWorld(11)

console.log('\n── weighted quantile basics ──')
{
  const q = conformalQuantile([{ score: 0.2, weight: 1 }, { score: 0.5, weight: 1 }, { score: 0.9, weight: 1 }], 0.5)
  check('quantile is a calibration score', [0.2, 0.5, 0.9].includes(q), `${q}`)
  const qHi = conformalQuantile(world.calibNaive, 0.01)
  const qLo = conformalQuantile(world.calibNaive, 0.5)
  check('smaller α → larger cutoff (wider sets)', qHi >= qLo)
}

console.log('\n── THE PROOF: naive under-covers, weighted repairs (target 90%, marginal over draws) ──')
{
  const SEEDS = [11, 23, 42, 77, 101, 137, 199, 256]
  let sumNaive = 0
  let sumWeighted = 0
  let weightedBeatsNaiveEverywhere = true
  for (const s of SEEDS) {
    const w = s === 11 ? world : makeWorld(s)
    const covN = empiricalCoverage(w.testScores, conformalQuantile(w.calibNaive, ALPHA))
    const covW = empiricalCoverage(w.testScores, conformalQuantile(w.calibWeighted, ALPHA))
    sumNaive += covN
    sumWeighted += covW
    if (covW <= covN) weightedBeatsNaiveEverywhere = false
  }
  const meanNaive = sumNaive / SEEDS.length
  const meanWeighted = sumWeighted / SEEDS.length
  console.log(`    mean over ${SEEDS.length} worlds: naive ${(meanNaive * 100).toFixed(1)}%  weighted ${(meanWeighted * 100).toFixed(1)}%  (PROMISED 90%)`)
  check('naive conformal SILENTLY under-covers (mean <88%)', meanNaive < 0.88, `${(meanNaive * 100).toFixed(1)}%`)
  // marginal guarantee: mean ≥ 1−α within Monte-Carlo tolerance (finite calib + finite test)
  check('weighted conformal restores coverage to ≈≥90% (marginal)', meanWeighted >= 0.893, `${(meanWeighted * 100).toFixed(1)}%`)
  check('weighted beats naive on EVERY draw', weightedBeatsNaiveEverywhere)
  check('weighted beats naive by a real margin', meanWeighted > meanNaive + 0.02)
}

console.log('\n── prediction sets stay small IN THE PRODUCT REGIME ──')
{
  // The product regime: froot's calibrated model, whose nonconformity for the TRUE
  // size is usually small (right + confident ~80% of bodies, harder tail beyond).
  // These scores live on the SAME scale as the shopper's 1−predFit below — the
  // earlier version of this test mixed the synthetic hardness world (q≈0.9) with
  // product-scale candidates, which made the set-size assertions meaningless.
  const rng = makeRng(7)
  const calibProduct: CalibPoint[] = []
  for (let i = 0; i < 5000; i++) {
    const easy = rng() < 0.8
    const score = easy ? 0.05 + rng() * 0.25 : 0.30 + rng() * 0.30
    calibProduct.push({ score, weight: 1 })
  }
  const q = conformalQuantile(calibProduct, ALPHA)
  // a typical shopper: model fairly confident in 1-2 adjacent sizes
  const candidates: SizeScore[] = [
    { size: '30E', predFit: 0.55 },
    { size: '30F', predFit: 0.88 }, // best
    { size: '30FF', predFit: 0.72 },
    { size: '30G', predFit: 0.30 },
    { size: '28F', predFit: 0.40 },
  ]
  const set = predictionSet(candidates, q, ALPHA)
  console.log(`    set for a typical shopper: {${set.sizes.join(', ')}}  (q=${q.toFixed(2)})`)
  check('set is non-empty', set.sizes.length >= 1)
  check('set includes the best size', set.sizes.includes('30F'))
  check('set excludes clearly-wrong sizes (30G/28F)', !set.sizes.includes('30G') && !set.sizes.includes('28F'))
  check('"order two-ish" — set is small (≤3)', set.sizes.length <= 3, `size ${set.sizes.length}`)
}

console.log('\n── empty-cutoff safety: always return at least the best size ──')
{
  const set = predictionSet([{ size: '30F', predFit: 0.2 }, { size: '30E', predFit: 0.1 }], 0.0001, ALPHA)
  check('never returns an empty set', set.sizes.length >= 1)
  check('falls back to the best', set.sizes[0] === '30F')
}

console.log('\n── mean set size aggregates ──')
{
  const sets = [predictionSet([{ size: 'a', predFit: 0.9 }], 0.5, ALPHA), predictionSet([{ size: 'a', predFit: 0.9 }, { size: 'b', predFit: 0.8 }], 0.5, ALPHA)]
  approx('mean set size', meanSetSize(sets), 1.5, 0.01)
}

console.log(fail === 0 ? `\n✅ ALL PASS — ${pass} passed, 0 failed` : `\n❌ FAILURES — ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
