// translate — the cross-brand FIT-TRUTH oracle, built honestly.
//
// HARD-WON FINDING (verified against the 1,499-style catalog): flat catalog cup
// geometry does NOT predict how a brand fits on a body. At matched labels Panache
// cups measure *deeper* (cd +0.30") yet every fitter says Panache "runs small, size
// up" — because Bratabase measures the garment LAID FLAT, while "runs small" is an
// on-body, under-tension, fabric-stretch+firmness effect flat dimensions can't see.
// So a geometry-only translation gives BACKWARDS advice. We therefore lead with the
// community consensus (the on-body truth, thousands of corroborations), use geometry
// only as a volume cross-check + confidence signal, and flag disagreement loudly.
// The whole table is an explicit PRIOR that froot's body→SKU→outcome loop corrects.

export const UK_CUPS = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K', 'KK', 'L']

export interface ProfileCell { band: number; cupIndex: number; cup: string; cd: number; cw: number; wl: number; n: number; styles: number }
export type FitTruthProfile = Record<string, Record<string, ProfileCell>>

// ── community consensus deltas (from the 1.06M-post r/ABraThatFits mining) ───
// cup/band offsets from a NEUTRAL fitter size: how many cup/band steps you ADD to
// your true size to land on THIS brand's label. (+cup = brand's label runs SMALL in
// cup, so you size up; −cup = runs large; +band = band runs small, size up.)
// evidence = relative corroboration weight from the mining (for confidence).
interface Consensus { cup: number; band: number; evidence: number; note: string }
const CONSENSUS: Record<string, Consensus> = {
  Comexim: { cup: 2, band: 0, evidence: 0.95, note: 'runs ~2 cups small — size up two cups' },
  Panache: { cup: 1, band: 0, evidence: 0.95, note: 'runs small in the cup — size up a cup' },
  Cleo: { cup: 1, band: 0, evidence: 0.8, note: 'runs small in the cup' },
  Sculptresse: { cup: 1, band: 0, evidence: 0.6, note: 'runs small in the cup (Panache line)' },
  'Ewa Michalak': { cup: 1, band: 0, evidence: 0.85, note: 'runs small — size up' },
  Natori: { cup: 1, band: 0, evidence: 0.7, note: 'runs small' },
  Freya: { cup: -1, band: 0, evidence: 0.85, note: 'cups run large — size down a cup' },
  Elomi: { cup: 0, band: -1, evidence: 0.8, note: 'bands run large — size down a band (sister up a cup)' },
  Wacoal: { cup: 0, band: 1, evidence: 0.75, note: 'bands run small, cups tall — size up a band' },
  Fantasie: { cup: 0, band: 0, evidence: 0.7, note: 'fits close to true to size' },
  'Curvy Kate': { cup: 0, band: 0, evidence: 0.5, note: 'true-ish but wide/tall wires' },
}

/** EU/cm band (55,60,65,…) → UK band, so a Comexim "65G" input resolves correctly. */
function toUkBand(band: number): number {
  if (band >= 48) return Math.round((band - 60) / 5) * 2 + 28
  return band
}
export function parseSize(sz: string): { band: number; cupIndex: number; cup: string } | null {
  const m = /^(\d{2,3})\s*([A-Za-z/]+)$/.exec(sz.trim())
  if (!m) return null
  const band = toUkBand(parseInt(m[1], 10))
  const cup = m[2].toUpperCase().replace(/\//g, '')
  const cupIndex = UK_CUPS.indexOf(cup)
  if (cupIndex < 0 || band % 2 !== 0) return null
  return { band, cupIndex, cup }
}
export function sizeLabel(band: number, cupIndex: number): string {
  return `${band}${UK_CUPS[Math.max(0, Math.min(cupIndex, UK_CUPS.length - 1))]}`
}

function vol(c: ProfileCell): number { return c.cd * c.cw * c.wl }

export type Confidence = 'high' | 'medium' | 'low' | 'estimate'

export interface Translation {
  fromBrand: string
  toBrand: string
  fromSize: string
  /** the recommended equivalent size in the target brand */
  toSize: string
  band: number
  cupIndex: number
  confidence: Confidence
  /** which signal drove it */
  basis: 'consensus' | 'consensus+geometry' | 'geometry' | 'identity'
  /** consensus vs geometry agreement (cups apart); undefined if a signal is absent */
  disagreementCups?: number
  note: string
}

/** Geometry-only equivalent: find the target-brand label whose flat cup VOLUME
 *  matches the source label's, light penalty for changing band. (Volume cross-check;
 *  NOT the primary signal — see the file header.) */
function geometryEquivalent(profile: FitTruthProfile, from: ProfileCell, toBrand: string): { band: number; cupIndex: number } | null {
  const cells = profile[toBrand]
  if (!cells) return null
  const vFrom = vol(from)
  let best: ProfileCell | null = null
  let bestD = Infinity
  for (const c of Object.values(cells)) {
    const d = Math.abs(vol(c) - vFrom) + Math.abs(c.band - from.band) * 12 // band-change penalty
    if (d < bestD) { bestD = d; best = c }
  }
  return best ? { band: best.band, cupIndex: best.cupIndex } : null
}

/** Consensus-only equivalent: map source label → neutral → target label via deltas. */
function consensusEquivalent(from: { band: number; cupIndex: number }, fromBrand: string, toBrand: string): { band: number; cupIndex: number } | null {
  const a = CONSENSUS[fromBrand]
  const b = CONSENSUS[toBrand]
  if (!a || !b) return null
  const trueCup = from.cupIndex - a.cup
  const trueBand = from.band - a.band * 2
  return { cupIndex: Math.max(0, trueCup + b.cup), band: Math.max(24, trueBand + b.band * 2) }
}

export function translate(profile: FitTruthProfile, fromBrand: string, fromSize: string, toBrand: string): Translation | null {
  const p = parseSize(fromSize)
  if (!p) return null
  if (fromBrand === toBrand) {
    return { fromBrand, toBrand, fromSize, toSize: sizeLabel(p.band, p.cupIndex), band: p.band, cupIndex: p.cupIndex, confidence: 'high', basis: 'identity', note: 'same brand' }
  }
  const fromCell = profile[fromBrand]?.[sizeLabel(p.band, p.cupIndex)] ?? null
  const cons = consensusEquivalent(p, fromBrand, toBrand)
  const geom = fromCell ? geometryEquivalent(profile, fromCell, toBrand) : null

  // PRIMARY = consensus (on-body truth). Geometry only cross-checks confidence.
  if (cons) {
    let confidence: Confidence = 'high'
    let basis: Translation['basis'] = 'consensus'
    let disagreementCups: number | undefined
    let note = `${CONSENSUS[toBrand].note}`
    if (geom) {
      basis = 'consensus+geometry'
      disagreementCups = Math.abs(geom.cupIndex - cons.cupIndex)
      // geometry agrees (≤1 cup) → confirm high; disagrees → downgrade + flag honestly
      if (disagreementCups <= 1) confidence = 'high'
      else { confidence = 'medium'; note += ` · flat-geometry suggests a different size (${disagreementCups} cups apart) — unverified until fit outcomes confirm` }
    }
    const ev = Math.min(CONSENSUS[fromBrand].evidence, CONSENSUS[toBrand].evidence)
    if (ev < 0.7 && confidence === 'high') confidence = 'medium'
    return { fromBrand, toBrand, fromSize, toSize: sizeLabel(cons.band, cons.cupIndex), band: cons.band, cupIndex: cons.cupIndex, confidence, basis, disagreementCups, note }
  }

  // FALLBACK = geometry volume-match (no consensus for one/both brands). Flag clearly.
  if (geom) {
    return { fromBrand, toBrand, fromSize, toSize: sizeLabel(geom.band, geom.cupIndex), band: geom.band, cupIndex: geom.cupIndex, confidence: 'low', basis: 'geometry', note: 'matched by flat cup volume only — no fitter consensus for this brand yet; treat as a starting point, not a promise' }
  }
  return null
}

export interface CrossRow { brand: string; t: Translation }

/** Your size across every brand we can speak to, best-confidence first. */
export function crossBrandTable(profile: FitTruthProfile, fromBrand: string, fromSize: string, brands?: string[]): CrossRow[] {
  const list = brands ?? Object.keys(profile)
  const order: Confidence[] = ['high', 'medium', 'low', 'estimate']
  return list
    .filter((b) => b !== fromBrand)
    .map((b) => ({ brand: b, t: translate(profile, fromBrand, fromSize, b) }))
    .filter((r): r is CrossRow => r.t !== null)
    .sort((a, b) => order.indexOf(a.t.confidence) - order.indexOf(b.t.confidence))
}

/** Brands with community consensus (the high-confidence core). */
export function consensusBrands(): string[] { return Object.keys(CONSENSUS) }
export function brandRunsNote(brand: string): string | null { return CONSENSUS[brand]?.note ?? null }
