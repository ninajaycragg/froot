// ─────────────────────────────────────────────────────────────────────────
// fit-math — the soul of the Fit Field.
//
// THE IDEA (the non-obvious collision):
// froot already collects standing/leaning/lying bust deltas *because they
// encode breast projection + ptosis*, and the catalog stores each bra's cup as
// real geometry (cup depth, cup width, wire length, gore, wing). So we can model
// the BODY and the GARMENT with the SAME surface primitive — a single-peaked
// forward bump rooted on the chest wall — and then DIFFERENCE them.
//
//   clearance(x,y) = cupSurface(x,y) − breastSurface(x,y)        [inches]
//
//   clearance > 0  → the cup sits forward of the breast        → GAP  (cool)
//   clearance ≈ 0  → cup rides on the breast                    → FIT  (green)
//   clearance < 0  → the cup is behind the breast surface, so   → DIG  (warm)
//                    the tissue is compressed / spills out.
//
// Everything here is PURE (no three.js, no DOM) so it is unit-testable with
// `node fit-math.test.ts` and importable by the R3F scene. All math is in INCHES;
// the mesh builder scales to world units.
//
// First-order honesty: these surfaces are the FRONT profile of the breast/cup as
// a height field over the chest-wall plane. Real tissue curves back at the root,
// but to first order the front of the breast and the inner face of the cup are
// single-valued in z over (x,y). That keeps the field exact, fast, and GPU-cheap
// while staying physically faithful where fit is actually decided (apex, poles,
// wire line). The mappings from measurements→shape are monotonic and plausible,
// not clinical — the magic is that the field responds correctly as you change
// size, shape, and body.
// ─────────────────────────────────────────────────────────────────────────

export interface BreastParams {
  /** forward projection at the apex, inches (chest wall → nipple) */
  proj: number
  /** horizontal half-width of the breast root on the chest, inches */
  rootHalfW: number
  /** vertical half-height of the breast root on the chest, inches */
  rootHalfH: number
  /** apex drop below root center (ptosis), inches (≥0) */
  apexDrop: number
  /** vertical spread of the UPPER pole (above apex), inches */
  sigUpper: number
  /** vertical spread of the LOWER pole (below apex), inches */
  sigLower: number
  /** horizontal spread, inches */
  sigX: number
}

export interface CupParams {
  /** raw cup depth (arc across the cup), inches */
  cd: number
  /** apex projection derived from cd (perpendicular, comparable to breast proj), inches */
  apexProj: number
  /** half the cup width, inches */
  cupHalfW: number
  /** half the cup height (derived from wire length), inches */
  cupHalfH: number
  /** cup apex drop below cup center, inches */
  apexDrop: number
  /** gore height (center tack), inches — secondary verdict */
  gore: number
  /** wing height (side coverage), inches — secondary verdict */
  wing: number
}

/** One bra size's raw Bratabase geometry, inches. */
export interface BraGeom {
  cd: number
  cw: number
  wl: number
  gh?: number
  wh?: number
}

export interface Measurements {
  looseUnderbust: number
  snugUnderbust: number
  tightUnderbust: number
  standingBust: number
  leaningBust: number
  lyingBust: number
  unit: 'in' | 'cm'
}

export interface ShapeProfile {
  projection: 'projected' | 'moderate' | 'shallow'
  fullness: 'full-on-top' | 'even' | 'full-on-bottom'
  rootWidth: 'narrow' | 'average' | 'wide'
}

// ── small helpers ──────────────────────────────────────────────────────────

export function toInches(v: number, unit: 'in' | 'cm'): number {
  return unit === 'cm' ? v / 2.54 : v
}
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
function gauss(d: number, sigma: number): number {
  const s = Math.max(sigma, 1e-4)
  return Math.exp(-0.5 * (d * d) / (s * s))
}

// ── BODY: measurements + shape → breast surface params ───────────────────────

export function measurementsToBreast(m: Measurements, shape: ShapeProfile): BreastParams {
  const snug = toInches(m.snugUnderbust, m.unit)
  const standing = toInches(m.standingBust, m.unit)
  const leaning = toInches(m.leaningBust, m.unit)
  const lying = toInches(m.lyingBust, m.unit)

  // Leaning bust is the truest volume read (gravity pulls the tissue into the
  // cup, the way a bra holds it). Difference over the snug band ≈ cup count.
  const bustDiff = Math.max(0, leaning - snug)
  const cupCount = bustDiff // ~1 inch per cup (ABTF)

  // Projection: base grows with cup count, scaled by self-reported profile.
  // Calibrated to the cup's apexProj scale (28D≈1.7", 28F≈2.2") so a correctly-
  // sized bra lands near-zero clearance. cupCount 3→1.7, 5→2.4, 8→3.4 inches.
  const projFactor = shape.projection === 'projected' ? 1.22 : shape.projection === 'shallow' ? 0.82 : 1.0
  const proj = clamp((0.7 + 0.34 * cupCount) * projFactor, 0.7, 4.2)

  // Root width on the chest: grows with cup, scaled by self-reported root width.
  // Calibrated to cupHalfW (cw/2 ≈ 2.1–2.6") for matched sizes.
  const rootFactor = shape.rootWidth === 'wide' ? 1.2 : shape.rootWidth === 'narrow' ? 0.83 : 1.0
  const rootHalfW = clamp((1.9 + 0.12 * cupCount) * rootFactor, 1.6, 3.6)

  // Ptosis (apex drop): the standing→lying collapse reveals how much the tissue
  // falls; 'full-on-bottom' adds droop. Larger cups droop more.
  const collapse = Math.max(0, standing - lying) // ptotic tissue collapses lying down
  const bottomHeavy = shape.fullness === 'full-on-bottom' ? 0.45 : 0
  const apexDrop = clamp(0.28 + 0.22 * collapse + 0.06 * cupCount + bottomHeavy, 0.1, 1.8)

  // Vertical root extent: a touch taller than wide, taller with droop.
  const rootHalfH = clamp(rootHalfW * 1.12 + apexDrop * 0.35, 1.9, 4.6)

  // Pole fullness: where the tissue concentrates relative to the apex.
  // full-on-top → fuller upper pole (larger upper spread); full-on-bottom → lower.
  let sigUpper = rootHalfH * 0.62
  let sigLower = rootHalfH * 0.62
  if (shape.fullness === 'full-on-top') {
    sigUpper *= 1.28
    sigLower *= 0.86
  } else if (shape.fullness === 'full-on-bottom') {
    sigUpper *= 0.82
    sigLower *= 1.3
  }
  const sigX = rootHalfW * 0.66

  return { proj, rootHalfW, rootHalfH, apexDrop, sigUpper, sigLower, sigX }
}

/** Her ideal band size (snug underbust, rounded to nearest even) and bust diff. */
export function idealBand(m: Measurements): number {
  const snug = toInches(m.snugUnderbust, m.unit)
  // UK/US bands are even; many fitters add 0 for the snug method.
  const r = Math.round(snug)
  return r % 2 === 0 ? r : r + 1
}

// ── GARMENT: bra geometry → cup surface params ───────────────────────────────

/**
 * Half-perimeter of an ellipse with semi-axes (a,b), Ramanujan II.
 * The underwire arc length `wl` ≈ the semi-perimeter of the cup-opening ellipse
 * (one strap point, under the breast, to the other). So given cup width (→a) and
 * wire length (→ semi-perimeter) we can SOLVE for the cup's vertical half-height.
 */
function ellipseSemiPerimeter(a: number, b: number): number {
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b))
  const full = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  return full / 2
}

/** Test hook: expose the semi-perimeter for round-trip verification. */
export function ellipseSemiPerimeterTest(a: number, b: number): number {
  return ellipseSemiPerimeter(a, b)
}

/** Invert: given cupHalfW (a) and target semi-perimeter (wl), solve for halfH (b). */
export function cupHalfHFromWire(cupHalfW: number, wireLen: number): number {
  let lo = 0.4
  let hi = 6.0
  // semi-perimeter is monotincreasing in b → bisection.
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (ellipseSemiPerimeter(cupHalfW, mid) < wireLen) lo = mid
    else hi = mid
  }
  return clamp((lo + hi) / 2, 0.6, 6.0)
}

/**
 * Cup depth `cd` is measured as the fabric ARC across the cup (wire→apex→top edge),
 * NOT perpendicular projection. Model that cross-section as a half-ellipse with
 * vertical half-extent = cupHalfH and forward depth = apexProj; then cd ≈ its
 * semi-perimeter, so we invert for apexProj. Verified against real catalog sizes:
 * 28D→1.7", 28F→2.2", anatomically faithful and monotonic in cup size.
 */
export function apexProjFromCd(cupHalfH: number, cd: number): number {
  let lo = 0.3
  let hi = 6.0
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (ellipseSemiPerimeter(cupHalfH, mid) < cd) lo = mid
    else hi = mid
  }
  return clamp((lo + hi) / 2, 0.3, 5.5)
}

export function braGeomToCup(g: BraGeom): CupParams {
  const cupHalfW = clamp(g.cw / 2, 1.4, 5.0)
  const cupHalfH = cupHalfHFromWire(cupHalfW, g.wl)
  const apexProj = apexProjFromCd(cupHalfH, g.cd)
  const gore = g.gh ?? 1.2
  const wing = g.wh ?? 3.0
  // Cups carry their apex slightly low; a tall gore lifts it, a deep cup drops it.
  const apexDrop = clamp(0.15 + 0.12 * (apexProj / 2.5) + 0.08 * (1.3 - gore), 0.05, 1.0)
  return { cd: g.cd, apexProj, cupHalfW, cupHalfH, apexDrop, gore, wing }
}

// ── SURFACES (height fields over the chest plane, per breast, local frame) ───
// Local frame, right breast: x = lateral+ / medial−, y = up+, apex at (0,−drop).

export function breastHeight(x: number, y: number, p: BreastParams): number {
  const dy = y - -p.apexDrop // apex sits below center
  const sigY = dy >= 0 ? p.sigUpper : p.sigLower
  return p.proj * gauss(x, p.sigX) * gauss(dy, sigY)
}

export function cupHeight(x: number, y: number, c: CupParams): number {
  const dy = y - -c.apexDrop
  // cup footprint spreads set so the bump fills the wire footprint
  const sigX = c.cupHalfW * 0.66
  const sigY = c.cupHalfH * 0.62
  return c.apexProj * gauss(x, sigX) * gauss(dy, sigY)
}

/** Is (x,y) inside the wire footprint ellipse (cup exists here)? */
export function insideWire(x: number, y: number, c: CupParams): boolean {
  const ex = x / (c.cupHalfW * 1.04)
  const ey = (y + c.apexDrop) / (c.cupHalfH * 1.04)
  return ex * ex + ey * ey <= 1
}

/**
 * Signed clearance at (x,y), inches.
 * Outside the wire footprint the cup does not exist (z=0 = chest wall), so any
 * breast tissue there reads as escaping the wire (negative → dig/spill ring).
 */
export function clearance(x: number, y: number, b: BreastParams, c: CupParams): number {
  const cz = insideWire(x, y, c) ? cupHeight(x, y, c) : 0
  const bz = breastHeight(x, y, b)
  return cz - bz
}

// ── ZONES → human verdicts ───────────────────────────────────────────────────

export type ZoneKey = 'apex' | 'upper' | 'lower' | 'medial' | 'lateral'

export interface ZoneVerdict {
  zone: ZoneKey
  /** mean clearance in the zone, inches (− dig, + gap) */
  clr: number
  /** 'dig' | 'gap' | 'good' */
  state: 'dig' | 'gap' | 'good'
  severity: number // 0..1
  label: string
  message: string
}

const FIT_TOL = 0.18 // inches: within this, the cup is "on" the breast

function zoneSamples(b: BreastParams): { x: number; y: number; w: number }[][] {
  // sample points per zone over the breast footprint (local frame)
  const out: Record<ZoneKey, { x: number; y: number; w: number }[]> = {
    apex: [], upper: [], lower: [], medial: [], lateral: [],
  }
  const N = 22
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = (i / N - 0.5) * 2 * b.rootHalfW * 1.2
      const y = (j / N - 0.5) * 2 * b.rootHalfH * 1.2
      const ax = x
      const ay = y + b.apexDrop // relative to apex
      const r = Math.sqrt((ax / b.rootHalfW) ** 2 + (ay / b.rootHalfH) ** 2)
      if (r > 1.25) continue
      const w = breastHeight(x, y, b) + 0.05 // weight by tissue present
      if (r < 0.42) out.apex.push({ x, y, w })
      else if (ay > 0.35 * b.rootHalfH) out.upper.push({ x, y, w })
      else if (ay < -0.35 * b.rootHalfH) out.lower.push({ x, y, w })
      else if (x > 0.2 * b.rootHalfW) out.lateral.push({ x, y, w })
      else if (x < -0.2 * b.rootHalfW) out.medial.push({ x, y, w })
    }
  }
  return [out.apex, out.upper, out.lower, out.medial, out.lateral]
}

const ZONE_COPY: Record<ZoneKey, { label: string; dig: string; gap: string; good: string }> = {
  apex: {
    label: 'cup depth',
    dig: 'cup runs shallow — you spill at the front',
    gap: 'cup gapes at the front — too much room',
    good: 'cup depth matches your projection',
  },
  upper: {
    label: 'upper pole',
    dig: 'tissue overflows the top edge',
    gap: 'cup wrinkles empty at the top',
    good: 'top edge lies flat',
  },
  lower: {
    label: 'lower pole',
    dig: 'the wire cuts into the underside',
    gap: 'the underside has slack',
    good: 'the cradle holds the underside',
  },
  medial: {
    label: 'gore / center',
    dig: 'the gore presses into tissue',
    gap: 'the gore floats off your chest',
    good: 'the gore tacks flat',
  },
  lateral: {
    label: 'wing / side',
    dig: 'the wire sits on breast tissue — side spillage',
    gap: 'roomy at the side wall',
    good: 'the wire wraps the root',
  },
}

export function zoneVerdicts(b: BreastParams, c: CupParams): ZoneVerdict[] {
  const groups = zoneSamples(b)
  const keys: ZoneKey[] = ['apex', 'upper', 'lower', 'medial', 'lateral']
  return groups.map((pts, gi) => {
    const key = keys[gi]
    let sw = 0
    let acc = 0
    for (const p of pts) {
      const clr = clearance(p.x, p.y, b, c)
      acc += clr * p.w
      sw += p.w
    }
    const clr = sw > 0 ? acc / sw : 0
    const state: 'dig' | 'gap' | 'good' = clr < -FIT_TOL ? 'dig' : clr > FIT_TOL ? 'gap' : 'good'
    const severity = clamp((Math.abs(clr) - FIT_TOL) / 1.0, 0, 1)
    const copy = ZONE_COPY[key]
    return {
      zone: key,
      clr,
      state,
      severity,
      label: copy.label,
      message: state === 'dig' ? copy.dig : state === 'gap' ? copy.gap : copy.good,
    }
  })
}

/** Overall fit score 0..100 (100 = the cup matches the body everywhere). */
export function fitScore(b: BreastParams, c: CupParams): number {
  const verdicts = zoneVerdicts(b, c)
  // weight apex + lateral highest — that's where fit fails first.
  const wMap: Record<ZoneKey, number> = { apex: 1.5, lateral: 1.2, upper: 1.0, lower: 0.9, medial: 0.8 }
  let acc = 0
  let sw = 0
  for (const v of verdicts) {
    const w = wMap[v.zone]
    const penalty = clamp(Math.abs(v.clr) / 1.3, 0, 1) // 1.3in off → fully bad
    acc += (1 - penalty) * w
    sw += w
  }
  return Math.round(100 * clamp(acc / sw, 0, 1))
}

export interface BandVerdict {
  state: 'loose' | 'tight' | 'good'
  message: string
  idealBand: number
  styleBand: number
}

export function bandVerdict(m: Measurements, styleBand: number): BandVerdict {
  const ideal = idealBand(m)
  const d = styleBand - ideal
  if (d >= 2) return { state: 'loose', message: 'band is loose — it will ride up your back', idealBand: ideal, styleBand }
  if (d <= -2) return { state: 'tight', message: 'band digs in — size up a band and a cup', idealBand: ideal, styleBand }
  return { state: 'good', message: 'band anchors on your ribcage', idealBand: ideal, styleBand }
}

// ── COLORMAP: warm-cinematic diverging (NOT witchy red-on-black) ─────────────
// Cool clay-blue (gap) → warm bone (fit) → forge poppy-red (dig). Grounded warm,
// low emissive — reads like heat on clay, not a neon glow.

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const C_GAP: [number, number, number] = [0.46, 0.56, 0.6] // muted slate-blue (clay-cool)
const C_FIT: [number, number, number] = [0.49, 0.61, 0.32] // sage-green "yes" (== STATE good #7E9B52)
const C_NEUTRAL: [number, number, number] = [0.86, 0.79, 0.66] // warm bone
const C_DIG_MID: [number, number, number] = [0.82, 0.52, 0.36] // flushed clay-terracotta
const C_DIG: [number, number, number] = [0.66, 0.3, 0.22] // deep brick (forge heat, NOT poppy-glow)

/**
 * clearance (inches) → linear-space RGB 0..1.
 * Near zero biases to the green "fit" band. The warm (dig) side ramps bone →
 * flushed-clay → brick and is CHROMA-CAPPED so even a 0-score body reads as clay
 * that's pinched and flushed, never a uniform glowing-red balloon (no-witchy rule).
 */
export function clearanceColor(clr: number): [number, number, number] {
  const a = Math.abs(clr)
  if (a <= FIT_TOL) {
    // inside tolerance → blend bone→green by how centered it is
    const t = 1 - a / FIT_TOL
    return lerp3(C_NEUTRAL, C_FIT, t * 0.9)
  }
  const t = clamp((a - FIT_TOL) / (1.3 - FIT_TOL), 0, 1) // wider ramp → saturation builds slowly
  const e = t * t * (3 - 2 * t) // smoothstep
  if (clr > 0) return lerp3(C_NEUTRAL, C_GAP, e * 0.9)
  // warm side: two-stop through a clay midtone, capped so clay stays visible
  const ec = e * 0.82
  return ec < 0.5
    ? lerp3(C_NEUTRAL, C_DIG_MID, ec / 0.5)
    : lerp3(C_DIG_MID, C_DIG, (ec - 0.5) / 0.5)
}
