// ── Bra material tower — material composition + derived stretch, per style ──
//
// Loads data/froot/bra-materials.json (built by scripts/ingest-materials.mjs)
// at module init and exposes two lookups:
//   getMaterial(brand, style?) → the per-style material row, or a brand-level
//     fallback when no style is given / no exact style match exists.
//   getStretch(brand)          → the brand's aggregate stretch fingerprint.
//
// Keys mirror style-measurements.json ("Brand|Style (id)"). Brand matching is
// casing-tolerant (same canonicalization braRuns uses) so a non-canonical brand
// string still resolves. Everything is graceful on misses — never throws.

import materials from '@/data/froot/bra-materials.json'

export type Fiber = { pct: number; fiber: string }

export type StretchEstimate = {
  value: 'rigid' | 'moderate' | 'stretchy'
  scalar: number
  elastane_pct: number
  zones: number
}

export type BraMaterial = {
  brand: string
  style: string
  fabric: Fiber[]
  cup_shape: string | null
  coverage: string | null
  wire_style: string | null
  padding: string | null
  stretch_estimate: StretchEstimate | null
  key_material: string | null
  source: string | null
}

export type BrandStretch = {
  scalar: number
  value: 'rigid' | 'moderate' | 'stretchy'
  n: number
}

type Payload = {
  _brands: Record<string, BrandStretch>
  styles: Record<string, BraMaterial>
}

const DATA = materials as unknown as Payload
const STYLES: Record<string, BraMaterial> = DATA.styles || {}
const BRANDS: Record<string, BrandStretch> = DATA._brands || {}

// Same canonicalization braRuns.canonicalBrand uses, so lookups agree.
function canon(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Lazy brand → [styleKey] index for brand-level fallback + style scans.
let byBrand: Map<string, string[]> | null = null
function brandIndex(): Map<string, string[]> {
  if (byBrand) return byBrand
  byBrand = new Map()
  for (const [key, row] of Object.entries(STYLES)) {
    const b = canon(row.brand)
    const arr = byBrand.get(b)
    if (arr) arr.push(key)
    else byBrand.set(b, [key])
  }
  return byBrand
}

// Lazy canon(brand) → BrandStretch index (keys in JSON are display-case).
let brandStretchIdx: Map<string, BrandStretch> | null = null
function brandStretchIndex(): Map<string, BrandStretch> {
  if (brandStretchIdx) return brandStretchIdx
  brandStretchIdx = new Map()
  for (const [b, v] of Object.entries(BRANDS)) brandStretchIdx.set(canon(b), v)
  return brandStretchIdx
}

function styleWords(s: string): string[] {
  return canon(s)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
}

/**
 * Material row for a (brand, style).
 * - With a style: tries the exact "Brand|Style" key first, then a fuzzy
 *   word-overlap match within that brand, then a brand-level fallback row.
 * - Without a style: returns a representative row for the brand (best stretch
 *   coverage), or null if the brand has no material data.
 * Never throws.
 */
export function getMaterial(
  brand: string | undefined | null,
  style?: string | null
): BraMaterial | null {
  if (!brand) return null
  const cb = canon(brand)

  if (style) {
    // exact key (display-case) — cheap path
    const exact = STYLES[`${brand}|${style}`]
    if (exact) return exact
    // scan brand's styles for an exact canon match or best word overlap
    const keys = brandIndex().get(cb)
    if (keys && keys.length) {
      const target = styleWords(style)
      let best: BraMaterial | null = null
      let bestScore = 0
      for (const k of keys) {
        const row = STYLES[k]
        if (canon(row.style) === canon(style)) return row
        const w = new Set(styleWords(row.style))
        let score = 0
        for (const t of target) if (w.has(t)) score++
        if (score > bestScore) {
          bestScore = score
          best = row
        }
      }
      if (best && bestScore >= 1) return best
    }
  }

  // brand-level fallback: a representative row (prefer one with a stretch est)
  const keys = brandIndex().get(cb)
  if (keys && keys.length) {
    return (
      keys.map((k) => STYLES[k]).find((r) => r.stretch_estimate) ||
      STYLES[keys[0]]
    )
  }
  return null
}

/**
 * Aggregate stretch fingerprint for a brand (mean across its known styles).
 * Falls back to deriving from getMaterial's brand-level row if the brand isn't
 * in the precomputed _brands table. Returns null when there's no data.
 */
export function getStretch(brand: string | undefined | null): BrandStretch | null {
  if (!brand) return null
  const cb = canon(brand)
  const pre = brandStretchIndex().get(cb)
  if (pre) return pre
  // derive from a representative style row if present
  const row = getMaterial(brand)
  if (row?.stretch_estimate) {
    return {
      scalar: row.stretch_estimate.scalar,
      value: row.stretch_estimate.value,
      n: 1,
    }
  }
  return null
}

/** True if we have any material/stretch data for this brand. */
export function hasMaterial(brand: string | undefined | null): boolean {
  if (!brand) return false
  return brandIndex().has(canon(brand))
}
