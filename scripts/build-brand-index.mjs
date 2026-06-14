#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// build-brand-index.mjs — compile the BrandAutocomplete suggestion index.
//
// WHY: the catalog (brand-meta.json, brand-measurements.json, the `brand` field
// inside style-measurements.json) is keyed by the brand's EXACT Title-Case
// display string ("Freya", "Adore Me", "Victoria's Secret", "1st & Curve").
// The API's measurement + sentiment lookups are exact-string keyed, so a
// non-canonical brand silently returns nothing. The typeahead's whole job is to
// emit that exact string — this script produces the list it picks from.
//
// SOURCE: data/brand-meta.json is the WIDEST list (1551 brands) and is the
// superset of brand-measurements.json (839, all contained in meta). So meta is
// the canonical universe. We DO NOT dedupe casing/spacing variants ("1st &
// Curve" vs "1st And Curve") — they're distinct catalog entries with distinct
// keys, so each must stay selectable.
//
// OUTPUT: data/froot/brand-index.json — a compact, ALPHABETICALLY-SORTED array.
// Each row carries just enough for ranked fuzzy match without re-reading the
// big catalog files at runtime:
//   { n: canonicalName, k: normalizedSearchKey, w: popularityWeight, m: hasMeasurements, a?: [aliases] }
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const META_PATH = resolve(ROOT, 'data/brand-meta.json')
const MEAS_PATH = resolve(ROOT, 'data/brand-measurements.json')
const OUT_PATH = resolve(ROOT, 'data/froot/brand-index.json')

// Normalize for matching: lowercase, fold "&"→"and", strip punctuation, collapse
// whitespace. This is ONLY the match key — the emitted brand is always `n`, the
// untouched canonical string downstream lookups expect.
function normKey(s) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

// A few hand-curated aliases for the brands people actually type shorthand for.
// Keyed by EXACT canonical name → list of alternate spellings users may enter.
// Kept tiny and high-confidence; the fuzzy matcher covers the long tail.
const ALIAS_MAP = {
  "Victoria's Secret": ['vs', 'vickys', 'victorias secret'],
  'Calvin Klein': ['ck'],
  'Curvy Kate': ['ck curvy'],
  'Marks & Spencer': ['m&s', 'ms', 'marks and spencer'],
  'Third Love': ['thirdlove'],
  'ThirdLove': ['third love'],
  'Pour Moi': ['pourmoi'],
  'Parfait By Affinitas': ['parfait', 'affinitas'],
  'Ann Summers': ['annsummers'],
}

function main() {
  const meta = JSON.parse(readFileSync(META_PATH, 'utf8'))
  const meas = JSON.parse(readFileSync(MEAS_PATH, 'utf8'))
  const hasMeas = new Set(Object.keys(meas))

  const names = Object.keys(meta)

  // Popularity weight: brands with more real data points should float to the top
  // of an otherwise-tied fuzzy match (they're the ones with measurements +
  // sentiment + braRuns to show). Normalize dataPoints onto a 0..1 log scale,
  // give a floor so unknown brands are still rankable, and a small bump for
  // having measurements at all.
  let maxDP = 1
  for (const n of names) {
    const dp = meta[n]?.dataPoints || 0
    if (dp > maxDP) maxDP = dp
  }
  const logMax = Math.log1p(maxDP)

  const rows = names.map((n) => {
    const e = meta[n] || {}
    const dp = e.dataPoints || 0
    const m = hasMeas.has(n)
    // 0..100 integer weight (compact). log-scaled data points (0..~85) + meas bump.
    const w = Math.round((Math.log1p(dp) / logMax) * 85) + (m ? 10 : 0)
    const row = { n, k: normKey(n), w, m }
    if (ALIAS_MAP[n]) row.a = ALIAS_MAP[n].map((x) => normKey(x))
    return row
  })

  // Alphabetical by canonical name (case-insensitive) — stable, predictable list.
  rows.sort((x, y) => x.n.toLowerCase().localeCompare(y.n.toLowerCase()))

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  // Compact: no pretty-print whitespace.
  writeFileSync(OUT_PATH, JSON.stringify(rows))

  const { size } = statSync(OUT_PATH)
  const withMeas = rows.filter((r) => r.m).length
  const withAlias = rows.filter((r) => r.a).length
  console.log(`brand-index.json written: ${OUT_PATH}`)
  console.log(`rows: ${rows.length} | with measurements: ${withMeas} | with aliases: ${withAlias}`)
  console.log(`size: ${(size / 1024).toFixed(1)} KB`)
}

main()
