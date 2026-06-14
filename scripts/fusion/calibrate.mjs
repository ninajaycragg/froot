// ──────────────────────────────────────────────────────────────────────────
// calibrate.mjs — bend the physics until it agrees with reality.
//
// THE LOOP (this is the research contribution)
// ────────────────────────────────────────────
// generate-synthetic.mjs gave us the sim's opinion everywhere. But the sim has
// free parameters — the forgiveness band (give0 / givePerStretch) and how hard
// overflow scores (spillScale) — and nothing has yet pinned them to the real
// world. This harness does the pinning.
//
// THE REAL SIGNAL: data/size-transitions.json. Each pair {from, to, count} is a
// person who was wearing a LABEL size `from` and, after a real fitting, landed
// on `to`. The population truth (stats): people move -0.4 bands and +1.6 cups —
// i.e. most people are in a band too big and a cup too SMALL, so the cup spills.
// community-insights.json is a secondary signal: brand-level fit satisfaction.
//
// THE TEST: for each real transition, build the breast twin that actually fits
// `to` (their true size), then ask the sim — at the candidate params — what it
// says about wearing `from` (the label they left). If the physics is right, the
// sim should call `from` UNDER-cupped (spill) in the same DIRECTION and roughly
// the same MAGNITUDE as the cup-step they actually climbed. We score each param
// set by how often the sim's verdict agrees with the real move, and how well
// the predicted spill correlates with the real cup-jump size.
//
// WHAT IT CAN SHOW (honest): that a single geometric tolerance band, once
// tuned, reproduces the population's "size down a band, up a cup" tendency from
// pure geometry — physics bootstraps the signal where per-person data is thin.
// WHAT IT CAN'T (yet): per-individual ground-truth gap/spill in mm (no one logs
// it), or causality beyond the band/cup label. So we calibrate to AGREEMENT
// RATE + DIRECTIONAL CORRELATION, not to a fictional mm error.
// ──────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { simulateFit, UK_CUPS, DEFAULT_PARAMS } from './generate-synthetic.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const D = (p) => join(ROOT, 'data', p)

const CM_TO_IN = 1 / 2.54
const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x)
const round = (x, dp) => {
  const f = 10 ** dp
  return Math.round(x * f) / f
}

const BANDS = [28, 30, 32, 34, 36, 38, 40, 42]
function parseSize(sz) {
  const m = /^(\d{2})([A-Z]+)$/.exec(sz)
  if (!m) return null
  const band = +m[1]
  const cupIdx = UK_CUPS.indexOf(m[2])
  if (cupIdx < 0) return null
  return { band, cupIdx }
}

// ── twin + cup builders (identical mapping to generate-synthetic.mjs) ─────────
const PROJ_AVG = 2.9
function sizeBaseline(cupIdx) {
  return {
    projIn: clamp(2.1 + cupIdx * 0.16, 2.0, 4.2),
    volumeCc: clamp(180 + cupIdx * 110, 150, 1500),
  }
}
function makeTwin(band, cupIdx) {
  const base = sizeBaseline(cupIdx)
  const bandRoot = clamp(4.0 + (band - 28) * 0.18, 3.8, 6.6)
  return {
    projectionIn: base.projIn,
    rootWidthIn: (bandRoot + 5.2) / 2,
    fullnessUpper: 0.5,
    ptosis: 0.25,
    volumeCc: base.volumeCc,
  }
}

// real geometry pool, keyed (band,cupIdx) → averaged cup, with brand stretch.
function loadCupTable() {
  const meas = JSON.parse(readFileSync(D('brand-measurements.json'), 'utf-8'))
  let materials = { _brands: {} }
  try {
    materials = JSON.parse(readFileSync(D('froot/bra-materials.json'), 'utf-8'))
  } catch {}
  const canon = (b) => b.trim().toLowerCase().replace(/\s+/g, ' ')
  const stretchCanon = {}
  for (const b in materials._brands || {}) stretchCanon[canon(b)] = materials._brands[b].scalar
  const POP_STRETCH = 0.2

  const table = new Map() // `${band}|${cupIdx}` → {cd,cw,wl,stretch,n}
  for (const brand in meas) {
    const st = stretchCanon[canon(brand)] ?? POP_STRETCH
    for (const sz in meas[brand]) {
      const m = meas[brand][sz]
      if (!m.cd || !m.cw) continue
      const p = parseSize(sz)
      if (!p) continue
      const k = `${p.band}|${p.cupIdx}`
      if (!table.has(k)) table.set(k, { cd: 0, cw: 0, wl: 0, st: 0, n: 0 })
      const e = table.get(k)
      e.cd += m.cd
      e.cw += m.cw
      e.wl += m.wl || m.cw * 1.6
      e.st += st
      e.n++
    }
  }
  const cups = new Map()
  for (const [k, e] of table) {
    cups.set(k, {
      cupDepthIn: (e.cd / e.n) * CM_TO_IN,
      cupWidthIn: (e.cw / e.n) * CM_TO_IN,
      wireLengthIn: (e.wl / e.n) * CM_TO_IN,
      stretch: e.st / e.n,
      n: e.n,
    })
  }
  return cups
}

// nearest available cup row to (band,cupIdx) within ±2 band / ±2 cup.
function nearestCup(cups, band, cupIdx) {
  let best = null
  let bestD = Infinity
  for (const b of BANDS) {
    for (let c = Math.max(0, cupIdx - 2); c <= cupIdx + 2; c++) {
      const k = `${b}|${c}`
      if (!cups.has(k)) continue
      const d = Math.abs(b - band) + Math.abs(c - cupIdx) * 1.5
      if (d < bestD) {
        bestD = d
        best = cups.get(k)
      }
    }
  }
  return best
}

// ── load real transitions ─────────────────────────────────────────────────────
function loadTransitions() {
  const t = JSON.parse(readFileSync(D('size-transitions.json'), 'utf-8'))
  const out = []
  for (const p of t.pairs) {
    const f = parseSize(p.from)
    const to = parseSize(p.to)
    if (!f || !to) continue
    out.push({ from: f, to, count: p.count, cupJump: to.cupIdx - f.cupIdx, bandJump: to.band - f.band })
  }
  return { pairs: out, stats: t.stats }
}

// ── scoring a param set against reality ───────────────────────────────────────
// For each transition where the person sized UP a cup (cupJump>0 — the dominant
// real pattern), the sim should call their LABEL (`from`) size a SPILL (cup too
// small). Where they sized DOWN, it should lean gap. Where they stayed, seat.
// We weight by transition count and report agreement + spill/cup-jump corr.
function scoreParams(P, cups, transitions) {
  let wTotal = 0
  let wAgree = 0
  // for correlation between predicted spill mm and real cup jump
  const xs = [] // predicted spill at label size
  const ys = [] // real cup jump
  let seatConf = { upSpill: 0, upNot: 0, downGap: 0, downNot: 0, sameSeat: 0, sameNot: 0 }

  for (const tr of transitions.pairs) {
    // build the twin that TRULY fits (their `to` size) and test the LABEL.
    const twin = makeTwin(tr.to.band, tr.to.cupIdx)
    const labelCup = nearestCup(cups, tr.from.band, tr.from.cupIdx)
    if (!labelCup) continue
    const r = simulateFit(twin, labelCup, P)
    const w = tr.count
    wTotal += w

    const expected = tr.cupJump > 0 ? 'spill' : tr.cupJump < 0 ? 'gap' : 'seat'
    const agree = r.seat === expected
    if (agree) wAgree += w

    if (tr.cupJump > 0) {
      xs.push(r.spillMm)
      ys.push(tr.cupJump)
      if (r.seat === 'spill') seatConf.upSpill += w
      else seatConf.upNot += w
    } else if (tr.cupJump < 0) {
      if (r.seat === 'gap') seatConf.downGap += w
      else seatConf.downNot += w
    } else {
      if (r.seat === 'seat') seatConf.sameSeat += w
      else seatConf.sameNot += w
    }
  }

  // Pearson r between predicted spill and real cup jump (directional validity).
  const corr = pearson(xs, ys)
  const agreement = wTotal ? wAgree / wTotal : 0
  // composite fit: reward agreement AND a positive spill↔jump correlation.
  const fit = agreement * 0.7 + clamp((corr + 1) / 2, 0, 1) * 0.3
  return { agreement: round(agreement, 4), corr: round(corr, 4), fit: round(fit, 4), wTotal, seatConf }
}

function pearson(x, y) {
  const n = x.length
  if (n < 3) return 0
  const mx = x.reduce((a, b) => a + b, 0) / n
  const my = y.reduce((a, b) => a + b, 0) / n
  let sxy = 0,
    sxx = 0,
    syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return 0
  return sxy / Math.sqrt(sxx * syy)
}

// secondary cross-check against community-insights: a well-calibrated sim should
// give HIGHER mean fit scores to brands the community rates highly. We compute
// the rank correlation between sim mean-score-per-brand and community sentiment.
function communityCheck(P, cups) {
  let insights = {}
  try {
    insights = JSON.parse(readFileSync(D('community-insights.json'), 'utf-8'))
  } catch {
    return null
  }
  const meas = JSON.parse(readFileSync(D('brand-measurements.json'), 'utf-8'))
  let materials = { _brands: {} }
  try {
    materials = JSON.parse(readFileSync(D('froot/bra-materials.json'), 'utf-8'))
  } catch {}
  const canon = (b) => b.trim().toLowerCase().replace(/\s+/g, ' ')
  const stretchCanon = {}
  for (const b in materials._brands || {}) stretchCanon[canon(b)] = materials._brands[b].scalar

  // aggregate community sentiment per brand across buckets
  const sent = {}
  for (const bucket in insights) {
    const br = insights[bucket].brands || {}
    for (const b in br) {
      if (!sent[b]) sent[b] = { score: 0, w: 0 }
      const s = br[b]
      const vol = (s.positive || 0) + (s.negative || 0)
      if (vol < 3) continue
      sent[b].score += s.score * vol
      sent[b].w += vol
    }
  }

  // sim mean score per brand: for each brand, simulate a representative twin
  // (D-ish) against the brand's own size rows at that body, take mean score.
  const simScore = {}
  const twin = makeTwin(34, 5) // 34DD-ish representative body
  for (const brand in meas) {
    const rows = []
    const st = stretchCanon[canon(brand)] ?? 0.2
    for (const sz in meas[brand]) {
      const m = meas[brand][sz]
      if (!m.cd || !m.cw) continue
      const p = parseSize(sz)
      if (!p) continue
      // only sizes near the representative body
      if (Math.abs(p.cupIdx - 5) > 3 || Math.abs(p.band - 34) > 4) continue
      rows.push({
        cupDepthIn: m.cd * CM_TO_IN,
        cupWidthIn: m.cw * CM_TO_IN,
        wireLengthIn: (m.wl || m.cw * 1.6) * CM_TO_IN,
        stretch: st,
      })
    }
    if (rows.length < 2) continue
    // best achievable fit this brand offers the representative body
    let best = 0
    for (const c of rows) best = Math.max(best, simulateFit(twin, c, P).score)
    simScore[brand] = best
  }

  // correlate community sentiment vs sim best-fit, over brands present in both
  const xs = [],
    ys = []
  for (const b in sent) {
    if (sent[b].w < 5) continue
    if (!(b in simScore)) continue
    xs.push(simScore[b])
    ys.push(sent[b].score / sent[b].w)
  }
  return { corr: round(pearson(xs, ys), 4), nBrands: xs.length }
}

// ── the sweep ─────────────────────────────────────────────────────────────────
function run() {
  const cups = loadCupTable()
  const transitions = loadTransitions()

  // grid over the 3 free params, centred on the current fitSim defaults.
  const grid = []
  // Physically-bounded grid. We DON'T let give0 run away: a forgiveness band
  // above ~4mm at zero stretch stops meaning "tolerance" and starts erasing the
  // spill signal entirely. The fit surface is flat (see grid output), so we
  // prefer the SIMPLEST params among near-ties (parsimony tiebreak) instead of
  // chasing a noise-level peak at the grid edge — honest about 142 samples.
  for (const give0 of [1, 2, 3, 4])
    for (const givePerStretch of [8, 12, 16])
      for (const spillScale of [0.8, 1.0, 1.3]) grid.push({ give0, givePerStretch, spillScale })

  const EPS = 0.003 // fit differences below this are noise on 142 transitions.
  // complexity = distance from the current fitSim defaults; prefer minimal change.
  const complexity = (P) =>
    Math.abs(P.give0 - DEFAULT_PARAMS.give0) +
    Math.abs(P.givePerStretch - DEFAULT_PARAMS.givePerStretch) / 4 +
    Math.abs(P.spillScale - DEFAULT_PARAMS.spillScale) * 3

  let best = null
  const sample = []
  for (const P of grid) {
    const s = scoreParams(P, cups, transitions)
    const rec = { params: P, ...s }
    sample.push(rec)
    if (!best) best = rec
    else if (s.fit > best.fit + EPS) best = rec
    else if (s.fit >= best.fit - EPS && complexity(P) < complexity(best.params)) best = rec // parsimony tiebreak
  }

  const baseline = scoreParams(DEFAULT_PARAMS, cups, transitions)
  const community = communityCheck(best.params, cups)
  const communityBaseline = communityCheck(DEFAULT_PARAMS, cups)

  const out = {
    _about:
      'Calibration of the Fit Sim against REAL outcomes. We sweep the 3 free sim params and find the set whose label-size verdict best agrees with real size-transitions (people who sized up a cup should read as spill at their old label). Fit = 0.7·agreement + 0.3·normalized(spill↔cup-jump correlation). Community sentiment is a secondary cross-check, not part of the objective.',
    _generated_at: new Date().toISOString(),
    realSignal: {
      source: 'data/size-transitions.json',
      transitionsUsed: transitions.pairs.length,
      populationStats: transitions.stats,
      note: 'avgCupChange +1.6, avgBandChange -0.4 — population sizes DOWN a band, UP a cup. A correct sim must reproduce this from geometry alone.',
    },
    baseline: {
      params: DEFAULT_PARAMS,
      agreement: baseline.agreement,
      corr: baseline.corr,
      fit: baseline.fit,
      communityCorr: communityBaseline?.corr ?? null,
    },
    recommended: {
      params: best.params,
      agreement: best.agreement,
      corr: best.corr,
      fit: best.fit,
      seatConfusion: best.seatConf,
      communityCorr: community?.corr ?? null,
      communityBrands: community?.nBrands ?? null,
    },
    improvement: {
      fitDelta: round(best.fit - baseline.fit, 4),
      agreementDelta: round(best.agreement - baseline.agreement, 4),
    },
    honest_limits: [
      'No per-person mm ground truth exists; we calibrate to band/cup transition AGREEMENT + directional correlation, not to a measured gap/spill.',
      'size-transitions are self-reported relabellings, noisy and survivorship-biased toward people who refit.',
      'The twin per size is a population mean; individual shape variance is swept synthetically, not observed.',
      'Community correlation is weak-signal (brand-level sentiment vs best-achievable fit) and is a sanity cross-check only.',
    ],
    grid: sample.sort((a, b) => b.fit - a.fit).slice(0, 12),
  }

  const path = D('froot/fusion-calibration.json')
  writeFileSync(path, JSON.stringify(out, null, 1))

  console.log('── calibration fit ──')
  console.log(`real transitions used: ${transitions.pairs.length} (pop: ${JSON.stringify(transitions.stats)})`)
  console.log(`baseline    params=${JSON.stringify(DEFAULT_PARAMS)}`)
  console.log(`  agreement=${baseline.agreement}  spill↔jump corr=${baseline.corr}  fit=${baseline.fit}  communityCorr=${communityBaseline?.corr}`)
  console.log(`recommended params=${JSON.stringify(best.params)}`)
  console.log(`  agreement=${best.agreement}  spill↔jump corr=${best.corr}  fit=${best.fit}  communityCorr=${community?.corr}`)
  console.log(`improvement: fit +${round(best.fit - baseline.fit, 4)}, agreement +${round(best.agreement - baseline.agreement, 4)}`)
  console.log(`→ ${path}`)
}

run()
