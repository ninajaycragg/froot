// Numeric sanity tests for fit-math. Run: `node fit-math.test.ts` (Node 25 strips types).
// These assert the FIELD behaves physically: right size → high score, wrong size →
// the correct zone lights up, and the mappings are monotonic.
import {
  measurementsToBreast, braGeomToCup, cupHalfHFromWire, ellipseSemiPerimeterTest,
  fitScore, zoneVerdicts, clearance, breastHeight, cupHeight, clearanceColor,
  bandVerdict, type Measurements, type ShapeProfile, type BraGeom, type BreastParams,
} from './fit-math.ts'

// Invert body params → the bra geometry of a cup MADE FOR that body (apexProj→cd
// via the same ellipse arc, rootHalf* → cw/wl). A bra cut to these numbers should
// score ~perfect — the honest definition of "matched."
function matchedGeom(b: BreastParams): BraGeom {
  const cw = b.rootHalfW * 2
  const wl = ellipseSemiPerimeterTest(b.rootHalfW, b.rootHalfH)
  const cd = ellipseSemiPerimeterTest(b.rootHalfH, b.proj) // cd is the arc, inverts back to proj
  return { cd, cw, wl, gh: 1.4, wh: 3.1 }
}

let pass = 0
let fail = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`) }
}
function approx(name: string, got: number, want: number, tol: number) {
  check(name, Math.abs(got - want) <= tol, `got ${got.toFixed(3)} want ${want}±${tol}`)
}

// A real-ish 30E body: snug 30, leaning bust ~35 (≈5" diff → big cup).
const body30E: Measurements = {
  looseUnderbust: 31, snugUnderbust: 30, tightUnderbust: 29,
  standingBust: 34.5, leaningBust: 35, lyingBust: 33.5, unit: 'in',
}
const shape: ShapeProfile = { projection: 'projected', fullness: 'even', rootWidth: 'average' }

console.log('\n── ellipse / wire inversion ──')
{
  // semi-perimeter monotonic in b; inversion round-trips.
  const a = 2.2
  const b = 2.8
  const sp = ellipseSemiPerimeterTest(a, b)
  const recovered = cupHalfHFromWire(a, sp)
  approx('cupHalfHFromWire round-trips', recovered, b, 0.05)
  check('semi-perimeter grows with b', ellipseSemiPerimeterTest(a, 3.0) > ellipseSemiPerimeterTest(a, 2.0))
}

console.log('\n── body params are physical ──')
{
  const bp = measurementsToBreast(body30E, shape)
  check('projection in plausible range', bp.proj > 1.5 && bp.proj < 5.2, `proj=${bp.proj.toFixed(2)}`)
  check('root half-width plausible', bp.rootHalfW > 1.7 && bp.rootHalfW < 4.2, `rootHalfW=${bp.rootHalfW.toFixed(2)}`)
  // breast height peaks near apex (0, -apexDrop) and is ~0 far outside footprint
  const peak = breastHeight(0, -bp.apexDrop, bp)
  approx('breast peak ≈ projection', peak, bp.proj, 0.02)
  check('breast height ~0 well outside root', breastHeight(bp.rootHalfW * 2.2, 0, bp) < 0.05 * bp.proj)
}

console.log('\n── monotonicity: bigger bust diff → more projection ──')
{
  const small = measurementsToBreast({ ...body30E, leaningBust: 32 }, shape)
  const big = measurementsToBreast({ ...body30E, leaningBust: 37 }, shape)
  check('more bust diff → more projection', big.proj > small.proj, `${small.proj.toFixed(2)} vs ${big.proj.toFixed(2)}`)
  const proj = measurementsToBreast(body30E, { ...shape, projection: 'projected' })
  const shal = measurementsToBreast(body30E, { ...shape, projection: 'shallow' })
  check('projected profile → more projection than shallow', proj.proj > shal.proj)
  const wide = measurementsToBreast(body30E, { ...shape, rootWidth: 'wide' })
  const narrow = measurementsToBreast(body30E, { ...shape, rootWidth: 'narrow' })
  check('wide root → larger root width', wide.rootHalfW > narrow.rootHalfW)
}

console.log('\n── THE KEY TEST: a well-matched cup scores higher than a too-small one ──')
{
  const bp = measurementsToBreast(body30E, shape)
  // a cup cut to this exact body (matched), vs a shallow, narrow cup (too-small bra)
  const goodCup: BraGeom = matchedGeom(bp)
  const smallCup: BraGeom = { cd: matchedGeom(bp).cd * 0.7, cw: bp.rootHalfW * 1.5, wl: 6.0, gh: 1.4, wh: 3.0 }
  const gc = braGeomToCup(goodCup)
  const sc = braGeomToCup(smallCup)
  const goodScore = fitScore(bp, gc)
  const smallScore = fitScore(bp, sc)
  console.log(`    good cup score=${goodScore}  small cup score=${smallScore}`)
  check('good cup outscores small cup', goodScore > smallScore + 8)
  check('good cup scores well (>70)', goodScore > 70, `=${goodScore}`)

  // too-small cup → apex should read 'dig' (spillage)
  const apex = zoneVerdicts(bp, sc).find((v) => v.zone === 'apex')!
  check('too-small cup digs at the apex', apex.state === 'dig', `apex state=${apex.state} clr=${apex.clr.toFixed(2)}`)

  // a too-BIG cup (matched footprint, much deeper arc) → apex should read 'gap'
  const m = matchedGeom(bp)
  const bigCup = braGeomToCup({ ...m, cd: m.cd * 1.5 })
  const apexBig = zoneVerdicts(bp, bigCup).find((v) => v.zone === 'apex')!
  check('too-big cup gaps at the apex', apexBig.state === 'gap', `apex state=${apexBig.state} clr=${apexBig.clr.toFixed(2)}`)
}

console.log('\n── narrow wire on a wide root → lateral dig (side spillage) ──')
{
  const wideBody = measurementsToBreast(body30E, { ...shape, rootWidth: 'wide' })
  const narrowCup = braGeomToCup({ cd: wideBody.proj * 2, cw: wideBody.rootHalfW * 1.3, wl: 6.0, gh: 1.4, wh: 2.6 })
  const lat = zoneVerdicts(wideBody, narrowCup).find((v) => v.zone === 'lateral')!
  check('narrow wire on wide root → lateral dig', lat.state === 'dig', `lateral=${lat.state} clr=${lat.clr.toFixed(2)}`)
}

console.log('\n── band verdict ──')
{
  check('big style band → loose', bandVerdict(body30E, 34).state === 'loose')
  check('matching band → good', bandVerdict(body30E, 30).state === 'good')
  check('small style band → tight', bandVerdict(body30E, 26).state === 'tight')
}

console.log('\n── colormap is warm-cinematic, finite, in-gamut ──')
{
  for (const clr of [-1.5, -0.5, 0, 0.5, 1.5]) {
    const c = clearanceColor(clr)
    check(`color(${clr}) in [0,1]`, c.every((v) => v >= 0 && v <= 1 && Number.isFinite(v)), JSON.stringify(c))
  }
  const dig = clearanceColor(-1.0)
  const gap = clearanceColor(1.0)
  check('dig is warm (R>B)', dig[0] > dig[2])
  check('gap is cool (B≥R)', gap[2] >= gap[0])
}

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`)
if (fail > 0) process.exit(1)
