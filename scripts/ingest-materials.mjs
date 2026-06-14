#!/usr/bin/env node
// ingest-materials.mjs — BRA MATERIAL TOWER builder for Froot
//
// Reads the pre-joined fabric source (froot_fabric_join.json, already keyed by
// the canonical "Brand|Style (id)" key) plus the Curvy Kate-family Shopify
// products (ck_page_1/2.json) to extend coverage, and writes a compact,
// per-(brand,style) material table to data/froot/bra-materials.json.
//
// For each style we emit material features matching the froot_fabric_join prop
// shape exactly ({fabric:[{pct,fiber}], cup_shape, wire_style, padding}) plus a
// derived stretch_estimate (0..1 scalar + rigid/moderate/stretchy bucket) and an
// aggregate brand stretch under `_brands`.
//
// ROUGH EDGE handled: the `fabric` list is a FLAT concat of garment zones
// (cup+wing+lining), so we segment it by resetting at each running-sum==100
// boundary to recover per-zone compositions, then derive stretch from the FIRST
// (cup/support) zone only — not an average across lining/mesh.
//
// Run: node scripts/ingest-materials.mjs   (from /Users/ninajay/Desktop/froot)

import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const LAB = '/Users/ninajay/Desktop/baby/notes/froot-lab/data';
const OUT = resolve(REPO, 'data/froot/bra-materials.json');

// ---------------------------------------------------------------------------
// fiber → stretch coefficient (0..1). Elastic fibers high; structural low.
// ---------------------------------------------------------------------------
const STRETCH_COEFF = [
  [/elastane|spandex|lycra|elastam/i, 0.9],
  [/polyamide|nylon/i, 0.15],
  [/polyester/i, 0.1],
  [/viscose|rayon|modal|tencel|lyocell/i, 0.12],
  [/cotton/i, 0.05],
  [/silk|wool/i, 0.08],
  [/metallised|metallic|metal/i, 0.0],
];
function coeffFor(fiber) {
  for (const [re, c] of STRETCH_COEFF) if (re.test(fiber)) return c;
  return 0.1; // unknown → treat as low-stretch structural
}

// Normalize the messy fiber strings the join carries
// (e.g. "Elastane  Dd", "Polyamide Lace", "Viscose  All Other Si").
function cleanFiber(raw) {
  let f = String(raw || '').trim();
  // strip trailing size/zone noise tokens that leaked into the fiber name
  f = f.replace(
    /\s+(dd|gg|ee|ff|hh|lace|wing|mesh|lining|all other si.*)$/i,
    ''
  );
  f = f.replace(/\s{2,}/g, ' ').trim();
  // Title-case-ish single word canon
  return f || 'Unknown';
}

// ---------------------------------------------------------------------------
// Segment the flat fabric list into zones: reset at each running-sum == 100.
// Returns an array of zones, each zone = [{pct,fiber}].
// ---------------------------------------------------------------------------
function segmentZones(fabric) {
  const zones = [];
  let cur = [];
  let sum = 0;
  for (const item of fabric || []) {
    const pct = Math.max(0, Math.min(100, Number(item.pct) || 0));
    const fiber = cleanFiber(item.fiber);
    if (pct <= 0 && !fiber) continue;
    cur.push({ pct, fiber });
    sum += pct;
    if (sum >= 100) {
      zones.push(cur);
      cur = [];
      sum = 0;
    }
  }
  if (cur.length) zones.push(cur);
  return zones.filter((z) => z.length);
}

// Stretch scalar for a single zone = sum(pct/100 * coeff).
function zoneStretch(zone) {
  let s = 0;
  for (const { pct, fiber } of zone) s += (pct / 100) * coeffFor(fiber);
  return s;
}

function elastanePct(zone) {
  let e = 0;
  for (const { pct, fiber } of zone)
    if (/elastane|spandex|lycra/i.test(fiber)) e += pct;
  return e;
}

// ---------------------------------------------------------------------------
// Derive stretch_estimate from segmented zones + construction modifiers.
// Uses the FIRST (cup/support) zone as the support fingerprint.
// ---------------------------------------------------------------------------
function deriveStretch(fabric, { wire_style, padding } = {}) {
  const zones = segmentZones(fabric);
  if (!zones.length) return null;

  // Support zone = the zone with the most elastane (the structural stretch
  // zone); fall back to the first zone. This is more robust than always-first
  // because some rows lead with a 100% lining.
  let support = zones[0];
  let bestE = elastanePct(zones[0]);
  for (const z of zones) {
    const e = elastanePct(z);
    if (e > bestE) {
      bestE = e;
      support = z;
    }
  }

  let scalar = zoneStretch(support);

  // Construction modifiers: rigid structure suppresses effective stretch.
  if (wire_style && /underwire|underwired|wired/i.test(wire_style)) scalar *= 0.85;
  if (padding && /(mould|mold|foam|padded|t-?shirt)/i.test(padding)) scalar *= 0.8;
  if (padding && /(non.?padded|unlined|soft)/i.test(padding)) scalar *= 1.05;
  if (wire_style && /(non.?wire|wireless|wirefree)/i.test(wire_style)) scalar *= 1.1;

  scalar = Math.max(0, Math.min(1, scalar));

  let bucket;
  if (scalar < 0.25) bucket = 'rigid';
  else if (scalar < 0.55) bucket = 'moderate';
  else bucket = 'stretchy';

  return {
    value: bucket,
    scalar: Math.round(scalar * 100) / 100,
    elastane_pct: Math.round(bestE),
    zones: zones.length,
  };
}

// Key material phrase, e.g. "stretchy lace", "rigid molded".
// (component renders its own; this is a convenience cache.)
function keyMaterial(support, cup_shape, padding) {
  // dominant fiber of support zone
  if (!support || !support.length) return null;
  const dom = [...support].sort((a, b) => b.pct - a.pct)[0];
  const f = (dom.fiber || '').toLowerCase();
  if (/polyamide|nylon|polyester|microfib/.test(f)) return 'microfiber';
  if (/elastane|spandex/.test(f)) return 'power-mesh';
  if (/cotton/.test(f)) return 'cotton';
  if (/viscose|modal|rayon/.test(f)) return 'modal';
  return dom.fiber || null;
}

// ---------------------------------------------------------------------------
// Build a row in the bra-materials schema.
// ---------------------------------------------------------------------------
function buildRow(brand, style, src) {
  const fabric = (src.fabric || []).map((f) => ({
    pct: Number(f.pct) || 0,
    fiber: cleanFiber(f.fiber),
  }));
  const cup_shape = src.cup_shape || null;
  const wire_style = src.wire_style || null;
  const padding = src.padding || null;
  const stretch = deriveStretch(src.fabric, { wire_style, padding });
  if (!stretch && !cup_shape && !wire_style && !padding) return null;

  const zones = segmentZones(src.fabric);
  let support = zones[0] || null;
  if (zones.length > 1) {
    let bestE = -1;
    for (const z of zones) {
      const e = elastanePct(z);
      if (e > bestE) { bestE = e; support = z; }
    }
  }

  return {
    brand,
    style,
    fabric,
    cup_shape,
    coverage: cup_shape, // join's cup_shape is the coverage word (Plunge/Balconette/...)
    wire_style,
    padding,
    stretch_estimate: stretch,
    key_material: keyMaterial(support, cup_shape, padding),
    source: src.shopify_title || src.__source || null,
  };
}

// ---------------------------------------------------------------------------
// SOURCE 1 — froot_fabric_join.json (pre-keyed canonical, primary)
// ---------------------------------------------------------------------------
const join = JSON.parse(readFileSync(`${LAB}/froot_fabric_join.json`, 'utf8'));
const out = {};
let fromJoin = 0;
for (const [key, src] of Object.entries(join)) {
  const [brand, style] = key.split('|');
  if (!brand || !style) continue;
  if (/^unknown$/i.test(brand)) continue;
  const row = buildRow(brand, style, src);
  if (row) {
    out[key] = row;
    fromJoin++;
  }
}

// ---------------------------------------------------------------------------
// SOURCE 2 — Curvy Kate / Scantilly products.json (extend gaps).
// Match each style-measurements CK/Scantilly key by its distinctive line word
// against product titles; parse fabric% from body_html and namespaced tags.
// ---------------------------------------------------------------------------
const styleMeas = JSON.parse(
  readFileSync('/Users/ninajay/Desktop/baby/site/data/style-measurements.json', 'utf8')
);
const ckKeys = Object.keys(styleMeas).filter((k) =>
  /^(Curvy Kate|Scantilly)\|/.test(k)
);

const STOP = new Set(
  ('bra balcony balconette plunge moulded molded soft cup multiway padded non ' +
    'strapless wired underwired wireless full coverage demi push up the and a ' +
    'of by lace smooth side support sports sport bralette longline').split(' ')
);
function lineWords(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

function parseFabricFromHtml(html) {
  if (!html) return [];
  const m =
    html.match(/(\d{1,3})\s*%\s*([A-Za-z][A-Za-z ]{2,30})/g) || [];
  const out = [];
  for (const hit of m) {
    const mm = hit.match(/(\d{1,3})\s*%\s*([A-Za-z][A-Za-z ]{2,30})/);
    if (!mm) continue;
    const pct = Number(mm[1]);
    const fiber = mm[2].trim().split(/\s{2,}|\s(?=\d)/)[0].trim();
    if (pct > 0 && pct <= 100 && fiber) out.push({ pct, fiber });
    if (out.length >= 12) break; // cap concat noise
  }
  return out;
}
function tagVal(tags, ns) {
  const t = (tags || []).find((x) => x.startsWith(ns + ':'));
  return t ? t.slice(ns.length + 1).trim() : null;
}

const ckProducts = [];
for (const f of ['ck_page_1.json', 'ck_page_2.json']) {
  try {
    const j = JSON.parse(readFileSync(`${LAB}/${f}`, 'utf8'));
    for (const p of j.products || []) ckProducts.push(p);
  } catch {}
}
// index products by line-word
const prodIndex = ckProducts
  .filter((p) => /bra/i.test(p.product_type || '') || /Cup Shape:/.test((p.tags || []).join(',')))
  .map((p) => ({ p, words: new Set(lineWords(p.title)) }));

let fromCK = 0;
for (const key of ckKeys) {
  if (out[key]) continue; // join already covered it
  const [brand, style] = key.split('|');
  const sw = lineWords(style);
  if (!sw.length) continue;
  // best product: max overlap on distinctive words, same vendor
  let best = null,
    bestScore = 0;
  for (const { p, words } of prodIndex) {
    if (p.vendor !== brand) continue;
    let score = 0;
    for (const w of sw) if (words.has(w)) score++;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  if (!best || bestScore < 1) continue;
  const src = {
    fabric: parseFabricFromHtml(best.body_html),
    cup_shape: tagVal(best.tags, 'Cup Shape'),
    wire_style: tagVal(best.tags, 'Wire Style'),
    padding: tagVal(best.tags, 'Cup Padding'),
    shopify_title: best.title,
  };
  if (!src.fabric.length && !src.cup_shape) continue;
  const row = buildRow(brand, style, src);
  if (row) {
    out[key] = row;
    fromCK++;
  }
}

// ---------------------------------------------------------------------------
// AGGREGATE — per-brand stretch (mean scalar + bucket) for getStretch(brand).
// ---------------------------------------------------------------------------
const brandAgg = {};
for (const row of Object.values(out)) {
  if (!row.stretch_estimate) continue;
  (brandAgg[row.brand] ||= []).push(row.stretch_estimate.scalar);
}
const _brands = {};
for (const [brand, arr] of Object.entries(brandAgg)) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const scalar = Math.round(mean * 100) / 100;
  _brands[brand] = {
    scalar,
    value: scalar < 0.25 ? 'rigid' : scalar < 0.55 ? 'moderate' : 'stretchy',
    n: arr.length,
  };
}

// ---------------------------------------------------------------------------
// WRITE
// ---------------------------------------------------------------------------
const payload = {
  _about:
    'Bra material tower. Per-style material composition + derived stretch, ' +
    'keyed "Brand|Style (id)" matching style-measurements.json. fabric/cup_shape/' +
    'wire_style/padding prop shape matches froot_fabric_join. stretch_estimate ' +
    'derived from zone-segmented elastic fraction + construction modifiers. ' +
    '_brands = per-brand mean stretch for getStretch(brand).',
  _generated_at: new Date().toISOString(),
  _sources: { fabric_join: fromJoin, curvy_kate_family: fromCK },
  _brands,
  styles: out,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload));

const bytes = statSync(OUT).size;
const rows = Object.keys(out).length;
console.log(`bra-materials.json written`);
console.log(`  styles: ${rows} (join ${fromJoin} + CK-family ${fromCK})`);
console.log(`  brands aggregated: ${Object.keys(_brands).length}`);
console.log(`  size: ${(bytes / 1024).toFixed(1)} KB (${bytes} bytes)`);
if (bytes > 2 * 1024 * 1024) {
  console.error('  WARNING: exceeds 2MB budget');
  process.exit(1);
}
