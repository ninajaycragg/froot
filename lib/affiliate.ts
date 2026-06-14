// lib/affiliate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Transaction close: turn a (brand, style, size) recommendation into a real,
// clickable shop URL. There is no affiliate NETWORK in this repo — the only
// tracking convention that exists is a static `?ref=froot` query param (added in
// FrootResults.withRef / commit 9fb1673). We reproduce that here so every link
// the buy surface emits carries the same provenance tag, and centralise the
// URL-building logic the API route previously inlined as `shopUrl(...)`.
//
// URL quality ladder (best → fallback), per the data we actually have:
//   1. Brand storefront from data/brand-meta.json[brand].url (1138/1551 brands),
//      decorated with a brand-site search query when we can.
//   2. Google Shopping search for "brand style size" — works for 100% of styles
//      even when the brand is unknown to us.
// Bratabase reference URLs are deliberately NOT used here — they are a reference
// DB, not a place to buy.
//
// Pure, dependency-free, and graceful: an unknown brand still returns a usable
// (Google Shopping) URL rather than throwing.

import brandMeta from '@/data/brand-meta.json'

// The affiliate/provenance param convention the repo already uses everywhere.
export const REF_KEY = 'ref'
export const REF_VALUE = 'froot'

interface BrandMetaEntry {
  sizes?: number
  dataPoints?: number
  url?: string
  models?: number
}

const META = brandMeta as Record<string, BrandMetaEntry>

// ── Brand keying ────────────────────────────────────────────────────────────
// brand-meta.json is keyed by display-case brand strings ("A Pea In The Pod").
// Callers pass StyleMatch.brand, which is display-case too — but casing/spacing
// drifts across the community data, so we canonicalize identically to
// lib/braRuns.canonicalBrand and build a lowercase index once.
function canon(brand: string): string {
  return brand.trim().toLowerCase().replace(/\s+/g, ' ')
}

let CANON_INDEX: Map<string, { key: string; url?: string }> | null = null
function brandIndex(): Map<string, { key: string; url?: string }> {
  if (CANON_INDEX) return CANON_INDEX
  const idx = new Map<string, { key: string; url?: string }>()
  for (const key of Object.keys(META)) {
    idx.set(canon(key), { key, url: META[key]?.url })
  }
  CANON_INDEX = idx
  return idx
}

/** Resolve a brand (any casing) to its display key + storefront url, if known. */
function resolveBrand(brand: string): { key: string; url?: string } | null {
  if (!brand) return null
  const idx = brandIndex()
  const c = canon(brand)
  const hit = idx.get(c)
  if (hit) return hit
  // Fall back to the longest sub/superstring match (mirrors braRuns' fuzzy step).
  let best: { key: string; url?: string } | null = null
  let bestLen = 0
  for (const [k, v] of idx) {
    if (k.includes(c) || c.includes(k)) {
      const len = Math.min(k.length, c.length)
      if (len > bestLen) {
        best = v
        bestLen = len
      }
    }
  }
  return best
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Drop a trailing bratabase id like " (4234)" from a style name. */
function cleanStyle(style: string): string {
  return style.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** Append the froot provenance param. Mirrors FrootResults.withRef exactly. */
export function withRef(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set(REF_KEY, REF_VALUE)
    return u.toString()
  } catch {
    return url + (url.includes('?') ? '&' : '?') + `${REF_KEY}=${REF_VALUE}`
  }
}

/** Google Shopping search — the universal fallback that always resolves. */
function googleShop(brand: string, style?: string, size?: string): string {
  const q = encodeURIComponent(
    [brand, style ? cleanStyle(style) : '', size || ''].filter(Boolean).join(' '),
  )
  return `https://www.google.com/search?tbm=shop&q=${q}`
}

/**
 * Try to point a brand's own storefront search at the style, so the click lands
 * closer to a PDP than the bare homepage. We can't know each site's search
 * route, so we attach a best-effort `?q=` / `?s=` on the brand origin — most
 * storefront platforms (Shopify `?q=`, WooCommerce `?s=`) honour one of these,
 * and a brand that ignores it simply shows its homepage. Falls back to the raw
 * homepage when there's nothing to search for.
 */
function brandSearch(homepage: string, style?: string, size?: string): string {
  const query = [style ? cleanStyle(style) : '', size || ''].filter(Boolean).join(' ').trim()
  try {
    const u = new URL(homepage)
    if (query) {
      // Shopify-style search is the most common; harmless on sites that ignore it.
      u.pathname = '/search'
      u.searchParams.set('q', query)
    }
    return u.toString()
  } catch {
    if (!query) return homepage
    const sep = homepage.includes('?') ? '&' : '?'
    return `${homepage}${sep}q=${encodeURIComponent(query)}`
  }
}

export interface ShopUrlInput {
  brand: string
  style?: string
  size?: string
}

export interface ShopUrlResult {
  url: string
  /** 'brand' = brand storefront search, 'search' = Google Shopping fallback. */
  source: 'brand' | 'search'
  /** Canonical display-case brand key we matched, or the raw brand on a miss. */
  matchedBrand: string
}

/**
 * Build the best available shop URL for a (brand, style?, size?) recommendation,
 * already carrying the `?ref=froot` provenance param. Always returns a usable
 * URL — unknown brands degrade to Google Shopping rather than throwing.
 */
export function buildShopUrlMeta({ brand, style, size }: ShopUrlInput): ShopUrlResult {
  const resolved = brand ? resolveBrand(brand) : null

  if (resolved?.url) {
    return {
      url: withRef(brandSearch(resolved.url, style, size)),
      source: 'brand',
      matchedBrand: resolved.key,
    }
  }

  return {
    url: withRef(googleShop(brand, style, size)),
    source: 'search',
    matchedBrand: resolved?.key ?? brand,
  }
}

/** Convenience: just the URL string (the common call site). */
export function buildShopUrl(input: ShopUrlInput): string {
  return buildShopUrlMeta(input).url
}
