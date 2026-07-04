// bra-data — types + loader for the curated, validated fit-field catalog
// (site/public/data/froot/fit-field-bras.json: 64 styles, 1038 sizes, joined
// fabric + construction + per-size cup geometry).
import type { BraGeom } from './fit-math'

export interface FabricPart {
  pct: number
  fiber: string
}

export interface BraSize {
  size: string
  band: number
  cupUK: string
  cupIndex: number
  cd: number
  cw: number
  wl: number
  gh: number
  wh: number
  n: number
}

export interface BraStyle {
  id: string
  brand: string
  style: string
  cupShape: string | null
  wireStyle: string | null
  padding: string | null
  fabric: FabricPart[]
  /** 0..1 fraction of elastic fiber — drives perceived stretch / forgiveness */
  stretchHint: number
  confidence: 'high' | 'med'
  sizes: BraSize[]
}

export function sizeToGeom(s: BraSize): BraGeom {
  return { cd: s.cd, cw: s.cw, wl: s.wl, gh: s.gh, wh: s.wh }
}

/** A short, human fabric line, e.g. "73% polyamide · 27% elastane". */
export function fabricLine(fabric: FabricPart[]): string {
  // de-dupe + keep the real blend (the join sometimes stacks per-zone rows)
  const seen = new Map<string, number>()
  for (const f of fabric) {
    if (f.pct > 0 && f.pct < 100) seen.set(f.fiber, Math.max(seen.get(f.fiber) ?? 0, f.pct))
  }
  const parts = [...seen.entries()].sort((a, b) => b[1] - a[1])
  if (parts.length === 0) return 'composition varies'
  return parts.map(([fiber, pct]) => `${pct}% ${fiber.toLowerCase()}`).join(' · ')
}

/** Pick the size in a style closest to a target (band, cupIndex). */
export function nearestSize(style: BraStyle, band: number, cupIndex: number): BraSize {
  let best = style.sizes[0]
  let bestD = Infinity
  for (const s of style.sizes) {
    const d = Math.abs(s.band - band) * 1.5 + Math.abs(s.cupIndex - cupIndex)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}
