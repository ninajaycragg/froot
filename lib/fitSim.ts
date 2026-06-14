// ──────────────────────────────────────────────────────────────────────────
// fitSim.ts — the Fit Sim core. Physics-lite, pure TS, no deps, no React.
//
// THE NOVEL PRIMITIVE
// ───────────────────
// Froot's existing fit logic is a *scalar* distance: |cd − targetCd|·2.5 +
// |cw − targetCw|·1.5 (app/api/lookup/route.ts). That tells you a number but
// not a *picture*. This module turns that scalar into geometry: it models the
// breast and the bra cup as two 2-D side-profile CURVES and compares them
// pointwise, so a UI can DRAW both arcs and shade the gap/spill between them.
// "Fit" stops being a verdict and becomes a shape you can see.
//
// GEOMETRY (all internal math in MILLIMETRES)
// ───────────────────────────────────────────
// We work in the SAGITTAL (side) plane. Grounded in the liRBSM mean torso mesh
// (notes/froot-lab/lirbsm/out/mean_mm.obj, 111k verts, MIT, N-N=200mm): slicing
// the mesh at the nipple-x gives depth z as a single-valued function of height
// y — the breast is a single-peaked bump rising off the chest wall (verified:
// apex ≈ +73mm, chest-wall baseline ≈ +25mm ⇒ ~48mm true projection, spanning
// ~150mm of height). Because depth is single-valued in y, the whole problem is
// 1-D: two functions of a normalized height coordinate, sampled to arrays.
//
//   x-axis of the plot  = HEIGHT along the breast (top pole → bottom pole),
//                         normalized t ∈ [0,1]. profile[i] ↔ t = i/(N-1).
//   y-axis of the plot  = DEPTH (anterior projection) in mm, above the
//                         chest-wall baseline (0 = flat against the chest).
//
//   z_tissue(t) = the breast's anterior surface — a skewed bump:
//       peak height       ← projectionIn (how far it sticks out)
//       apex position      ← fullnessUpper (volume high vs low ⇒ apex up/down)
//       droop+forward shift← ptosis (apex slides down, upper pole hollows)
//       horizontal span    ← rootWidthIn (wider root ⇒ broader, flatter bump)
//       overall area       ← volumeCc (scales the bump's amplitude, the fill)
//
//   z_cup(t) = the cup pocket the bra offers — an arc:
//       arc apex depth     ← cupDepthIn (cd):  how deep the pocket is
//       arc span / mouth   ← cupWidthIn (cw) + wireLengthIn (wl): how much
//                            height the cup encircles before the wire cuts in
//       give               ← stretch: the cup can yield outward by `give` mm
//                            before tissue is judged to spill (rigid = hard
//                            boundary, stretchy = forgiving tolerance band)
//
// THE FIT VERDICT (pointwise over t, then integrated)
// ───────────────────────────────────────────────────
//   GAP   where  z_cup(t) > z_tissue(t)              → empty pocket
//                magnitude = mean over t of max(0, z_cup − z_tissue)
//   SPILL where  z_tissue(t) > z_cup(t) + give(t)    → tissue overflows
//                magnitude = mean over t of max(0, z_tissue − z_cup − give)
//   SEAT  where the curves track within the give band (forgiving = stretch)
//
//   The cup's *volume capacity* vs the breast's *fill* sets the dominant mode:
//   under-capacity → spill, over-capacity → gap. Stretch SHRINKS spill (it
//   absorbs the overflow) and PRESSURE rises as the cup hugs tighter than the
//   tissue wants and as stretch is low (a rigid cup pressing in = high load).
//
// NOT a soft-body solve. No compression physics, no per-person mesh at runtime
// — it's a geometric cross-section comparison warped by froot's ShapeProfile
// vector. Frame it as such: a clean, legible primitive, not a simulation of
// flesh. The point is the *picture* and a score that agrees with the scalar.
// ──────────────────────────────────────────────────────────────────────────

// ── Public input shapes ─────────────────────────────────────────────────────

/** Body twin — froot's ShapeProfile, resolved to side-profile scalars (mm/cc). */
export interface BreastTwin {
  /** Max anterior projection above the chest wall, in INCHES. ~1.5–4.0. */
  projectionIn: number
  /** Breast footprint width at the chest wall, in INCHES. ~3.5–7.0. */
  rootWidthIn: number
  /** Where volume sits vertically: 0 = full-on-bottom, 1 = full-on-top. */
  fullnessUpper: number
  /** Droop of the apex: 0 = perky, 1 = strongly ptotic. */
  ptosis: number
  /** Tissue volume per breast, cc. Sets the bump's fill/amplitude. */
  volumeCc: number
}

/** Bra cup cross-section — a single style×size row (cd/cw/wl in INCHES here). */
export interface BraCup {
  /** cup depth (cd) — pocket apex depth, INCHES. (data is cm ÷ 2.54). */
  cupDepthIn: number
  /** cup width (cw) — wire-to-wire mouth span, INCHES. */
  cupWidthIn: number
  /** wire length (wl) — cup perimeter / how much root it encircles, INCHES. */
  wireLengthIn: number
  /** fabric give: 0 = rigid, 1 = very stretchy (braMaterials scalar). */
  stretch: number
}

export type SeatVerdict = 'gap' | 'seat' | 'spill'

export interface FitResult {
  seat: SeatVerdict
  /** mm of empty pocket (cup proud of tissue), integrated mean. */
  gapIn: number
  /** mm of overflow (tissue proud of cup beyond give), integrated mean. */
  spillIn: number
  /** 0..1 — how hard the cup presses the tissue (load). */
  pressure: number
  /** 0..1 — overall fit quality (1 = curves track inside the give band). */
  score: number
  /** Human one-liner. */
  diagnosis: string
  /** Sampled depth curves (mm) for a UI to draw, same x-grid. */
  profile: { breast: number[]; cup: number[] }
}

// ── Constants ────────────────────────────────────────────────────────────────

const N = 64 // samples along the height axis
const MM = (inches: number) => inches * 25.4

// Population baselines (grounded in the liRBSM mean slice + froot's measured
// spread). These set the resting geometry the twin warps away from.
const ROOT_SPAN_MM = 150 // breast height extent at average root width
const PRESSURE_REF_MM = 18 // hug depth that reads as "firm but fine" pressure

// ── Curve builders ────────────────────────────────────────────────────────────

/**
 * Breast side profile: a skewed Gaussian bump.
 *  - amplitude  ← projection, modulated by how much volumeCc fills it
 *  - center     ← fullnessUpper (apex high) minus ptosis (apex droops down)
 *  - width      ← rootWidth (wider root spreads the bump)
 * Returns depth in mm at each t = i/(N-1), i in [0, N).
 */
function breastProfile(t: number[], twin: BreastTwin): number[] {
  const peak = MM(twin.projectionIn)
  // Volume nudges amplitude: a bigger fill at the same projection reads fuller.
  // Reference ~450cc → factor 1.0; scales gently so projection stays dominant.
  const volFactor = 0.7 + 0.3 * clamp(twin.volumeCc / 450, 0, 2.2)
  const amp = peak * volFactor

  // Apex center in t: fullness pushes it up (toward t=0=top), ptosis drops it.
  // t increases top→bottom, so "up" = smaller t.
  const center = clamp(0.5 - (twin.fullnessUpper - 0.5) * 0.42 + twin.ptosis * 0.3, 0.12, 0.9)

  // Width of the bump in t — wider root spreads it flatter.
  const rootFactor = clamp(MM(twin.rootWidthIn) / ROOT_SPAN_MM, 0.55, 1.7)
  const sigma = 0.22 * rootFactor

  // Ptosis also hollows the upper pole and shoves the lower-front out: skew the
  // bump asymmetrically — steeper above the apex, longer tail below.
  const skewUp = 1 - twin.ptosis * 0.35 // tighter upper sigma when ptotic
  const skewDn = 1 + twin.ptosis * 0.55 // longer lower tail when ptotic

  return t.map((ti) => {
    const d = ti - center
    const s = (d < 0 ? sigma * skewUp : sigma * skewDn)
    return amp * Math.exp(-(d * d) / (2 * s * s))
  })
}

/**
 * Cup side profile: a cosine arc that swells to cupDepth at its apex and
 * tapers to ~0 at the wire ends. The span the arc covers in t is set by the
 * cup mouth (cw) and perimeter (wl); a bigger cup encircles more height.
 * Returns depth in mm at each t.
 */
function cupProfile(t: number[], cup: BraCup): number[] {
  const apex = MM(cup.cupDepthIn)

  // Span in t: cw/wl set how much height the pocket covers. A well-matched cup
  // WRAPS the breast bump rather than towering above it, so the reference span
  // is tuned (cw ~2.4in/6cm, wl ~4.3in/10.9cm → factor 1.0) to a half-width
  // close to the breast bump's own sigma; bigger cw/wl spreads the pocket
  // higher (more "cup" above the apex), which is exactly where over-cupping
  // reads as gap. Clamp so it always covers a real band.
  const spanFactor = clamp((cup.cupWidthIn / 2.4) * 0.6 + (cup.wireLengthIn / 4.3) * 0.4, 0.55, 1.7)
  const half = clamp(0.46 * spanFactor, 0.3, 0.72)

  // Cup apex sits just below mid (wires cradle the lower pole) — fixed, because
  // the cup doesn't know the body's fullness; that mismatch IS part of the fit.
  const center = 0.56

  return t.map((ti) => {
    const d = (ti - center) / half // −1..+1 across the cup mouth
    if (Math.abs(d) >= 1) return 0
    // raised cosine: 1 at center, 0 at the wire ends → smooth pocket
    return apex * 0.5 * (1 + Math.cos(Math.PI * d))
  })
}

// ── The simulation ─────────────────────────────────────────────────────────

/**
 * simulateFit — compare a body twin against one cup, pointwise.
 * Returns the verdict, gap/spill magnitudes, pressure, score, a diagnosis,
 * and both sampled curves (mm) on a shared x-grid for drawing.
 */
export function simulateFit(twin: BreastTwin, cup: BraCup): FitResult {
  const t = Array.from({ length: N }, (_, i) => i / (N - 1))
  const breast = breastProfile(t, twin)
  const cupCurve = cupProfile(t, cup)

  // Stretch widens the forgiveness band: rigid ⇒ ~2mm, stretchy ⇒ ~14mm of
  // give before tissue counts as spilling. This is THE "stretch is forgiving"
  // encoding — it scales the tolerance, not the geometry.
  const give = 2 + cup.stretch * 12

  let gapSum = 0 // cup proud of tissue (empty pocket)
  let spillSum = 0 // tissue proud of cup beyond give (overflow)
  let hugSum = 0 // signed inward press where cup < tissue but within give
  let active = 0 // samples where either curve is meaningfully present

  // A cup only meaningfully GAPS where its pocket is actually present — the
  // raised-cosine arc tapers to ~0 at the wire ends, and a near-zero pocket
  // edge sitting proud of a flat chest shoulder is not an empty cup, it's just
  // the wire. Gate gap on the cup being a real pocket (above a small floor).
  const CUP_FLOOR = 3 // mm — below this the cup is "at the wire", not pocketing

  for (let i = 0; i < N; i++) {
    const b = breast[i]
    const c = cupCurve[i]
    if (b < 1 && c < 1) continue // both flat here, ignore
    active++

    const overflow = b - c // +ve: tissue deeper than cup
    if (c > b && c > CUP_FLOOR) {
      gapSum += c - b
    } else if (overflow > give) {
      spillSum += overflow - give
    } else if (overflow > 0) {
      // tissue sits inside the give band — the cup is hugging it. The closer
      // the cup is forced under the tissue, the more it presses.
      hugSum += overflow
    }
  }
  const n = Math.max(active, 1)
  const gapMm = gapSum / n
  const spillMm = spillSum / n
  const hugMm = hugSum / n

  // Pressure rises with how hard the cup hugs AND when stretch is low (a rigid
  // cup can't relieve the load by yielding). Spill also loads the wire.
  const hugLoad = (hugMm + spillMm * 0.6) / PRESSURE_REF_MM
  const rigidity = 1 - cup.stretch * 0.7
  const pressure = clamp(hugLoad * (0.5 + 0.5 * rigidity), 0, 1)

  // Verdict: whichever defect dominates; SEAT when both are negligible.
  // Thresholds in mm — small because these are averaged over the whole arc.
  const GAP_T = 1.6
  const SPILL_T = 1.6
  let seat: SeatVerdict
  if (spillMm > GAP_T && spillMm >= gapMm) seat = 'spill'
  else if (gapMm > SPILL_T) seat = 'gap'
  else seat = 'seat'

  // Score: 1 when curves track inside the give band with no excess press.
  // Penalize gap and spill (mm) and the pressure load.
  const defect = gapMm + spillMm
  const score = clamp(1 - defect / 18 - Math.max(0, pressure - 0.6) * 0.5, 0, 1)

  return {
    seat,
    gapIn: round(gapMm, 2),
    spillIn: round(spillMm, 2),
    pressure: round(pressure, 3),
    score: round(score, 3),
    diagnosis: diagnose(seat, gapMm, spillMm, pressure, cup.stretch),
    profile: { breast: breast.map((v) => round(v, 2)), cup: cupCurve.map((v) => round(v, 2)) },
  }
}

function diagnose(
  seat: SeatVerdict,
  gapMm: number,
  spillMm: number,
  pressure: number,
  stretch: number,
): string {
  if (seat === 'seat') {
    if (pressure > 0.6) return 'sits clean but presses firm — fine for a soft style, tight in a rigid one.'
    return 'curves track within tolerance — this cup seats the tissue cleanly.'
  }
  if (seat === 'spill') {
    const soft = stretch > 0.55 ? ' the stretch is absorbing some of it, but' : ''
    return `tissue overflows the cup —${soft} the pocket runs ~${round(spillMm, 1)}mm too shallow. size up a cup.`
  }
  return `the cup runs ~${round(gapMm, 1)}mm proud of the tissue — empty pocket up top. size down a cup or pick a shallower style.`
}

// ── Try-sizes: rank candidate cups for a twin ────────────────────────────────

export interface RankedCup {
  cup: BraCup
  result: FitResult
}

/**
 * bestCupFor — score every candidate cup against the twin and return them
 * ranked best→worst, so a UI can 'try sizes' and show the podium.
 */
export function bestCupFor(twin: BreastTwin, candidateCups: BraCup[]): RankedCup[] {
  return candidateCups
    .map((cup) => ({ cup, result: simulateFit(twin, cup) }))
    .sort((a, b) => b.result.score - a.result.score)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}
function round(x: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(x * f) / f
}

// ── Self-check (a tiny in-source test harness) ───────────────────────────────

/**
 * runSelfTest — asserts the core invariants. Returns { pass, log }.
 * Run it from a scratch script: `import { runSelfTest } from '@/lib/fitSim'`.
 *  - too-small cup  → spill
 *  - too-big cup    → gap
 *  - matched cup    → seat
 *  - higher stretch → less spill
 */
export function runSelfTest(): { pass: boolean; log: string[] } {
  const log: string[] = []
  let pass = true
  const assert = (cond: boolean, msg: string) => {
    log.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
    if (!cond) pass = false
  }

  // A moderately projected, average body twin (~D-ish).
  const twin: BreastTwin = {
    projectionIn: 2.6,
    rootWidthIn: 5.0,
    fullnessUpper: 0.5,
    ptosis: 0.2,
    volumeCc: 480,
  }

  // Cups: deliberately too small / matched / too big in depth + width.
  const tooSmall: BraCup = { cupDepthIn: 1.5, cupWidthIn: 1.8, wireLengthIn: 3.2, stretch: 0.15 }
  const matched: BraCup = { cupDepthIn: 2.6, cupWidthIn: 2.4, wireLengthIn: 4.3, stretch: 0.15 }
  const tooBig: BraCup = { cupDepthIn: 4.2, cupWidthIn: 3.4, wireLengthIn: 6.0, stretch: 0.15 }

  const rSmall = simulateFit(twin, tooSmall)
  const rMatch = simulateFit(twin, matched)
  const rBig = simulateFit(twin, tooBig)

  assert(rSmall.seat === 'spill', `too-small cup → spill (got '${rSmall.seat}', spill=${rSmall.spillIn}mm)`)
  assert(rBig.seat === 'gap', `too-big cup → gap (got '${rBig.seat}', gap=${rBig.gapIn}mm)`)
  assert(rMatch.seat === 'seat', `matched cup → seat (got '${rMatch.seat}', score=${rMatch.score})`)

  // Higher stretch reduces spill: same too-small cup, rigid vs stretchy.
  const rigid = simulateFit(twin, { ...tooSmall, stretch: 0.12 })
  const stretchy = simulateFit(twin, { ...tooSmall, stretch: 0.9 })
  assert(
    stretchy.spillIn < rigid.spillIn,
    `higher stretch → less spill (rigid=${rigid.spillIn}mm > stretchy=${stretchy.spillIn}mm)`,
  )

  // Sanity: matched should out-score the mismatches, and ranking is sorted.
  assert(rMatch.score > rSmall.score && rMatch.score > rBig.score, `matched out-scores mismatches`)
  const ranked = bestCupFor(twin, [tooBig, tooSmall, matched])
  assert(ranked[0].cup === matched, `bestCupFor ranks matched #1 (got depth ${ranked[0].cup.cupDepthIn}in)`)
  for (let i = 1; i < ranked.length; i++) {
    assert(ranked[i - 1].result.score >= ranked[i].result.score, `ranking sorted desc at #${i}`)
  }

  return { pass, log }
}
