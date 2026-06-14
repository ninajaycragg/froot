// ──────────────────────────────────────────────────────────────────────────
// generate-synthetic.mjs — MANUFACTURE the sim's half of the fusion loop.
//
// WHAT THIS IS
// ────────────
// Real bra-fit outcome data is THIN and biased: people only report a fitting
// when something went wrong, and almost never log the (gap/spill/seat) physics
// of WHY. So we bootstrap the missing physics: we take the geometry rules that
// live behind lib/fitSim.ts (ported here as plain JS — we do NOT import the TS
// at runtime, per the build contract) and run them across a dense, realistic
// grid of (breast-twin × real bra geometry). Every cell is a fully-labelled
// example — twin params → cup geometry → simulated gap/spill/seat + score —
// the kind of row real data can't give us at volume.
//
// This synthetic set is the SIM SIDE of the moat. calibrate.mjs then bends the
// sim's free parameters until these synthetic outcomes line up with the REAL
// outcomes we do have (size-transitions.json: who relabelled from X to Y).
//
// PORTED PHYSICS (kept 1:1 with lib/fitSim.ts so calibration is honest)
// ─────────────────────────────────────────────────────────────────────
// Sagittal-plane curve comparison, all math in mm. Breast = skewed Gaussian
// bump (projection/fullness/ptosis/rootWidth/volume); cup = raised-cosine arc
// (cupDepth apex, cw/wl span, stretch→give band). gap where cup proud of
// tissue; spill where tissue proud of cup beyond give; seat where they track.
// The THREE free params we expose for calibration are pulled out as PARAMS:
//   give0 / givePerStretch  — the forgiveness band (tolerance + stretch effect)
//   spillScale              — how hard overflow is scored as a defect
// Everything else is frozen to match fitSim.ts exactly.
//
// OUTPUT: data/froot/fusion-synthetic.json — COMPACT (<2MB). We do NOT dump the
// 64-point curves (that'd be ~10x the budget and calibration never needs them);
// we keep the scalar outcome per cell plus light aggregates for inspection.
// ──────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const D = (p) => join(ROOT, 'data', p)

// ── ported fitSim constants ──────────────────────────────────────────────────
const N = 64
const MM = (inches) => inches * 25.4
const CM_TO_IN = 1 / 2.54
const ROOT_SPAN_MM = 150
const PRESSURE_REF_MM = 18
const CUP_FLOOR = 3
const GAP_T = 1.6
const SPILL_T = 1.6

// The free parameters the calibrator sweeps. These DEFAULTS mirror fitSim.ts
// today (give = 2 + stretch*12, spill scored at face value inside score).
export const DEFAULT_PARAMS = {
  give0: 2, // mm forgiveness at zero stretch (cup tolerance)
  givePerStretch: 12, // extra mm of give at stretch = 1 (the stretch effect)
  spillScale: 1, // multiplier on spill magnitude before it counts as a defect
}

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x)
const round = (x, dp) => {
  const f = 10 ** dp
  return Math.round(x * f) / f
}

// ── ported curve builders (verbatim shape from fitSim.ts) ─────────────────────
function breastProfile(t, twin) {
  const peak = MM(twin.projectionIn)
  const volFactor = 0.7 + 0.3 * clamp(twin.volumeCc / 450, 0, 2.2)
  const amp = peak * volFactor
  const center = clamp(0.5 - (twin.fullnessUpper - 0.5) * 0.42 + twin.ptosis * 0.3, 0.12, 0.9)
  const rootFactor = clamp(MM(twin.rootWidthIn) / ROOT_SPAN_MM, 0.55, 1.7)
  const sigma = 0.22 * rootFactor
  const skewUp = 1 - twin.ptosis * 0.35
  const skewDn = 1 + twin.ptosis * 0.55
  return t.map((ti) => {
    const d = ti - center
    const s = d < 0 ? sigma * skewUp : sigma * skewDn
    return amp * Math.exp(-(d * d) / (2 * s * s))
  })
}

function cupProfile(t, cup) {
  const apex = MM(cup.cupDepthIn)
  const spanFactor = clamp((cup.cupWidthIn / 2.4) * 0.6 + (cup.wireLengthIn / 4.3) * 0.4, 0.55, 1.7)
  const half = clamp(0.46 * spanFactor, 0.3, 0.72)
  const center = 0.56
  return t.map((ti) => {
    const d = (ti - center) / half
    if (Math.abs(d) >= 1) return 0
    return apex * 0.5 * (1 + Math.cos(Math.PI * d))
  })
}

// ── ported simulateFit, parameterised by the 3 free knobs ─────────────────────
export function simulateFit(twin, cup, P = DEFAULT_PARAMS) {
  const t = Array.from({ length: N }, (_, i) => i / (N - 1))
  const breast = breastProfile(t, twin)
  const cupCurve = cupProfile(t, cup)
  const give = P.give0 + cup.stretch * P.givePerStretch

  let gapSum = 0
  let spillSum = 0
  let hugSum = 0
  let active = 0
  for (let i = 0; i < N; i++) {
    const b = breast[i]
    const c = cupCurve[i]
    if (b < 1 && c < 1) continue
    active++
    const overflow = b - c
    if (c > b && c > CUP_FLOOR) gapSum += c - b
    else if (overflow > give) spillSum += overflow - give
    else if (overflow > 0) hugSum += overflow
  }
  const n = Math.max(active, 1)
  const gapMm = gapSum / n
  const spillMm = (spillSum / n) * P.spillScale
  const hugMm = hugSum / n

  const hugLoad = (hugMm + spillMm * 0.6) / PRESSURE_REF_MM
  const rigidity = 1 - cup.stretch * 0.7
  const pressure = clamp(hugLoad * (0.5 + 0.5 * rigidity), 0, 1)

  let seat
  if (spillMm > GAP_T && spillMm >= gapMm) seat = 'spill'
  else if (gapMm > SPILL_T) seat = 'gap'
  else seat = 'seat'

  const defect = gapMm + spillMm
  const score = clamp(1 - defect / 18 - Math.max(0, pressure - 0.6) * 0.5, 0, 1)
  return { seat, gapMm: round(gapMm, 2), spillMm: round(spillMm, 2), pressure: round(pressure, 3), score: round(score, 3) }
}

// ── size spine (UK), shared with the route's UK_CUPS ──────────────────────────
export const UK_CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK']
const BANDS = [28, 30, 32, 34, 36, 38, 40, 42]

function parseSize(sz) {
  const m = /^(\d{2})([A-Z]+)$/.exec(sz)
  if (!m) return null
  const band = +m[1]
  const cupIdx = UK_CUPS.indexOf(m[2])
  if (cupIdx < 0 || !BANDS.includes(band)) return null
  return { band, cupIdx }
}

// ── twin generator: map a UK size to a realistic breast twin ──────────────────
// Grounds the body in the SAME shape→scalar mapping the lab UI uses, so a
// synthetic twin is the same object a real user would produce. Cup index drives
// projection + volume (bigger cup ⇒ more projection + more cc); band drives
// root width (wider chest ⇒ wider footprint). We sweep the shape axes (fullness,
// projection bias, ptosis) so each size yields a small family, not one point.
const PROJ_IN = { shallow: 2.1, average: 2.9, projected: 3.7 }
const ROOT_IN = { narrow: 4.2, average: 5.2, wide: 6.4 }
const FULL_U = { 'full-on-top': 0.78, even: 0.5, 'full-on-bottom': 0.24 }

// cup index → baseline projection (in) and volume (cc). Calibrated to the lab's
// own ranges: ~C/D ≈ average/450cc, climbing ~110cc + ~0.16in per cup step.
function sizeBaseline(cupIdx) {
  const projIn = clamp(2.1 + cupIdx * 0.16, 2.0, 4.2)
  const volumeCc = clamp(180 + cupIdx * 110, 150, 1500)
  return { projIn, volumeCc }
}

function makeTwin(band, cupIdx, shapeKey) {
  const base = sizeBaseline(cupIdx)
  // band sets root width: bigger band ⇒ wider footprint, blended with the axis.
  const bandRoot = clamp(4.0 + (band - 28) * 0.18, 3.8, 6.6)
  const root = (bandRoot + ROOT_IN[shapeKey.root]) / 2
  // projection axis nudges the size-baseline projection up/down.
  const projAdj = PROJ_IN[shapeKey.proj] - PROJ_IN.average // -0.8..+0.8
  return {
    projectionIn: clamp(base.projIn + projAdj, 1.6, 4.4),
    rootWidthIn: root,
    fullnessUpper: FULL_U[shapeKey.full],
    ptosis: shapeKey.ptosis,
    volumeCc: base.volumeCc,
  }
}

// the shape family swept per size — kept small so the grid stays compact.
const SHAPE_FAMILY = []
for (const proj of ['shallow', 'average', 'projected'])
  for (const full of ['full-on-top', 'even', 'full-on-bottom'])
    for (const ptosis of [0.1, 0.45])
      SHAPE_FAMILY.push({ proj, root: 'average', full, ptosis })
// 3 × 3 × 2 = 18 shapes per size.

// ── real bra geometry: sample from brand-measurements.json ────────────────────
// Each brand has size→{cd,cw,wl,...} in CM. We convert to inches and attach a
// per-brand stretch scalar from bra-materials.json. We sample a manageable set
// of (brand,size) rows so the grid is real geometry, not a synthetic ladder.
function loadBraCups() {
  const meas = JSON.parse(readFileSync(D('brand-measurements.json'), 'utf-8'))
  let materials = { _brands: {} }
  try {
    materials = JSON.parse(readFileSync(D('froot/bra-materials.json'), 'utf-8'))
  } catch {}
  const brandStretch = materials._brands || {}
  const canon = (b) => b.trim().toLowerCase().replace(/\s+/g, ' ')
  const stretchCanon = {}
  for (const b in brandStretch) stretchCanon[canon(b)] = brandStretch[b].scalar
  const POP_STRETCH = 0.2 // population median scalar (from bra-materials)

  const cups = []
  for (const brand in meas) {
    const stretch = stretchCanon[canon(brand)] ?? POP_STRETCH
    for (const sz in meas[brand]) {
      const m = meas[brand][sz]
      if (!m.cd || !m.cw) continue
      const p = parseSize(sz)
      if (!p) continue
      cups.push({
        brand,
        size: sz,
        band: p.band,
        cupIdx: p.cupIdx,
        cupDepthIn: round(m.cd * CM_TO_IN, 3),
        cupWidthIn: round(m.cw * CM_TO_IN, 3),
        wireLengthIn: round((m.wl || m.cw * 1.6) * CM_TO_IN, 3),
        stretch: round(stretch, 3),
        n: m.n || 1,
      })
    }
  }
  return cups
}

// ── the sweep ─────────────────────────────────────────────────────────────────
function run() {
  const allCups = loadBraCups()
  // Index cups by (band, cupIdx) for fast neighbourhood lookup.
  const byBand = new Map()
  for (const c of allCups) {
    if (!byBand.has(c.band)) byBand.set(c.band, [])
    byBand.get(c.band).push(c)
  }

  // For each twin (size × shape), we simulate against the bra cups in its band
  // neighbourhood (±2 bands) — the same gate findMatchingStyles uses — and
  // record the BEST cup's outcome plus the seat distribution. Compact rows.
  const rows = []
  const seatTally = { gap: 0, seat: 0, spill: 0 }
  let cellCount = 0

  for (const band of BANDS) {
    // candidate cups in this band ±2
    const cand = []
    for (const b2 of BANDS) if (Math.abs(b2 - band) <= 2) cand.push(...(byBand.get(b2) || []))
    if (!cand.length) continue

    for (let cupIdx = 0; cupIdx < UK_CUPS.length; cupIdx++) {
      // require at least one real cup near this size, else skip (no data)
      const near = cand.filter((c) => Math.abs(c.cupIdx - cupIdx) <= 3)
      if (near.length < 3) continue

      for (const shape of SHAPE_FAMILY) {
        const twin = makeTwin(band, cupIdx, shape)
        let best = null
        let sumScore = 0
        const localSeat = { gap: 0, seat: 0, spill: 0 }
        for (const cup of near) {
          const r = simulateFit(twin, cup)
          sumScore += r.score
          localSeat[r.seat]++
          if (!best || r.score > best.r.score) best = { cup, r }
        }
        cellCount++
        seatTally[best.r.seat]++

        // The fusion-relevant signal: at this body size, what cup SIZE does the
        // sim's best geometric match land on, and what's the seat verdict if we
        // force the LABEL size (band,cupIdx) itself? That label-vs-best delta is
        // exactly what calibrate.mjs compares to real size-transitions.
        const labelCups = near.filter((c) => c.band === band && c.cupIdx === cupIdx)
        let labelSeat = null
        let labelScore = null
        if (labelCups.length) {
          let ls = 0
          const tally = { gap: 0, seat: 0, spill: 0 }
          for (const c of labelCups) {
            const r = simulateFit(twin, c)
            ls += r.score
            tally[r.seat]++
          }
          labelScore = round(ls / labelCups.length, 3)
          labelSeat = tally.spill >= tally.gap && tally.spill >= tally.seat ? 'spill' : tally.gap >= tally.seat ? 'gap' : 'seat'
        }

        rows.push({
          band,
          cup: UK_CUPS[cupIdx],
          cupIdx,
          shape: `${shape.proj[0]}${shape.full === 'even' ? 'e' : shape.full === 'full-on-top' ? 't' : 'b'}${shape.ptosis < 0.3 ? 'P' : 'd'}`,
          twin: {
            proj: round(twin.projectionIn, 2),
            root: round(twin.rootWidthIn, 2),
            full: round(twin.fullnessUpper, 2),
            pto: round(twin.ptosis, 2),
            vol: Math.round(twin.volumeCc),
          },
          // best geometric match across the neighbourhood
          bestBand: best.cup.band,
          bestCupIdx: best.cup.cupIdx,
          bestSeat: best.r.seat,
          bestScore: best.r.score,
          bestGap: best.r.gapMm,
          bestSpill: best.r.spillMm,
          // outcome when forced to the LABEL size (null if no real label-size cup)
          labelSeat,
          labelScore,
          meanScore: round(sumScore / near.length, 3),
          seatDist: localSeat,
        })
      }
    }
  }

  const out = {
    _about:
      'Synthetic sim outcomes for the fusion loop. Each row: a breast twin at a UK size (× a shape family) simulated against REAL bra geometry sampled from brand-measurements.json. bestCupIdx = the cup the geometry prefers; labelSeat = verdict if forced to the label size. The label→best cup delta is the sim signal calibrate.mjs aligns to real size-transitions.',
    _generated_at: new Date().toISOString(),
    _params: DEFAULT_PARAMS,
    _meta: {
      bands: BANDS,
      cups: UK_CUPS,
      shapesPerSize: SHAPE_FAMILY.length,
      cellsSimulated: cellCount,
      realCupRows: allCups.length,
      seatTally,
    },
    rows,
  }

  const path = D('froot/fusion-synthetic.json')
  const json = JSON.stringify(out)
  writeFileSync(path, json)
  const bytes = Buffer.byteLength(json)
  console.log(`rows: ${rows.length}`)
  console.log(`cells simulated: ${cellCount} (× ${allCups.length} real cup rows in pool)`)
  console.log(`seat tally (best match): ${JSON.stringify(seatTally)}`)
  console.log(`size: ${(bytes / 1024).toFixed(1)} KB (${(bytes / 1e6).toFixed(3)} MB) → ${path}`)
  if (bytes > 2_000_000) console.error('WARN: exceeds 2MB budget')
}

// Only sweep when run directly — calibrate.mjs imports simulateFit/UK_CUPS from
// this module and must NOT trigger a regeneration as a side-effect.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run()
