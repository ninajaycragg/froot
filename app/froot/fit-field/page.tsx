'use client'

// froot · fit field — this page IS a fitting-room mirror that x-rays the fit.
// Pick a bra; froot finds the size that fits YOUR shape and shows you why, warm
// where it digs, cool where it gapes, green where it lands. Every verdict shown
// becomes a labeled row in the loop (the moat). Warm-cinematic, scrolls at 375px.
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  measurementsToBreast, braGeomToCup, zoneVerdicts, fitScore, bandVerdict,
  clearanceColor, type Measurements, type ShapeProfile,
} from './lib/fit-math'
import {
  sizeToGeom, fabricLine, type BraStyle, type BraSize,
} from './lib/bra-data'
import { logFitEvent, type FitEvent } from './lib/fit-loop'
import { drawRecommendation, makeRng, hashSeed } from './lib/off-policy'
import { conformalQuantile, predictionSet, type CalibPoint } from './lib/conformal'
import BodyControls, { type BodyControlsState } from './components/BodyControls'

const FitFieldScene = dynamic(() => import('./components/FitFieldScene'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-[#8A7060] text-sm">warming the mirror…</div>,
})

// ── body controls → a synthetic measurement set → breast params (one code path) ──
function controlsToMeasurements(c: BodyControlsState): Measurements {
  const bust = c.band + c.bustDiff
  return {
    looseUnderbust: c.band + 1,
    snugUnderbust: c.band,
    tightUnderbust: c.band - 1,
    standingBust: bust - 0.4,
    leaningBust: bust,
    lyingBust: bust - (c.fullness === 'full-on-bottom' ? 1.4 : 0.8),
    unit: 'in',
  }
}

const css = {
  micro: 'text-[10px] uppercase tracking-[0.22em] text-[#8A7060]',
  ink: 'text-[#1A0808]',
}

const STATE_COLOR: Record<string, string> = { dig: '#C5352C', gap: '#5E7787', good: '#7E9B52' }

export default function FitFieldPage() {
  const [styles, setStyles] = useState<BraStyle[] | null>(null)
  const [styleId, setStyleId] = useState<string>('')
  const [body, setBody] = useState<BodyControlsState>({
    band: 32, bustDiff: 5, projection: 'projected', fullness: 'even', rootWidth: 'average',
  })
  const [showBra, setShowBra] = useState(true)
  const [pickedSize, setPickedSize] = useState<string | null>(null)
  const [logged, setLogged] = useState<'idle' | 'fit' | 'too-small' | 'too-big'>('idle')
  // conformal calibration — the nonconformity of the TRUE size on past bodies.
  // Only events graded "fit" reveal the true size's predicted score, so those are
  // the calibration rows. Grows as real outcomes accumulate in the loop.
  const [calib, setCalib] = useState<CalibPoint[]>([])
  useEffect(() => {
    try {
      const evs: FitEvent[] = JSON.parse(localStorage.getItem('froot.fitEvents') || '[]')
      setCalib(
        evs
          .filter((e) => e.outcome === 'fit' && typeof e.prediction?.fitScore === 'number')
          .map((e) => ({ score: 1 - Math.max(0, Math.min(1, e.prediction.fitScore / 100)), weight: 1 })),
      )
    } catch { /* fresh browser — window starts uncalibrated */ }
  }, [])

  useEffect(() => {
    fetch('/data/froot/fit-field-bras.json')
      .then((r) => r.json())
      .then((d: BraStyle[]) => {
        setStyles(d)
        setStyleId(d[0]?.id ?? '')
      })
      .catch(() => setStyles([]))
  }, [])

  const style = useMemo(() => styles?.find((s) => s.id === styleId) ?? null, [styles, styleId])

  const shape: ShapeProfile = {
    projection: body.projection, fullness: body.fullness, rootWidth: body.rootWidth,
  }
  const measurements = useMemo(() => controlsToMeasurements(body), [body])
  const bp = useMemo(() => measurementsToBreast(measurements, shape), [measurements, shape])

  // froot's recommendation: the size in THIS bra that best fits her shape.
  const ranked = useMemo(() => {
    if (!style) return []
    return style.sizes
      .map((s) => ({ s, score: fitScore(bp, braGeomToCup(sizeToGeom(s))) }))
      .sort((a, b) => b.score - a.score)
  }, [style, bp])
  // froot's recommendation is an ε-greedy DRAW over the ranked sizes, not a blind
  // argmax: ~8% of the time it shows a close alternative so the loop can learn
  // whether the 2nd-best size would have fit better (the counterfactual moat). The
  // draw is seeded by (body, style) so it's stable across re-renders — no flicker —
  // and re-rolls only when she changes her shape or the bra.
  const draw = useMemo(() => {
    if (ranked.length === 0) return null
    const key = `${styleId}|${body.band}|${body.bustDiff}|${body.projection}|${body.fullness}|${body.rootWidth}`
    return drawRecommendation(ranked, { epsilon: 0.08, k: 6, rng: makeRng(hashSeed(key)) })
  }, [ranked, styleId, body])
  const recommended = draw?.shown.s ?? null

  // the two-size window — a conformal prediction SET over this bra's sizes.
  // Calibrated (≥30 real "fit" outcomes): the set carries a distribution-free
  // ≥90% coverage guarantee. Uncalibrated: default to the top-2 sizes and say
  // "calibrating" honestly — the promise only appears once the data backs it.
  const sizeWindow = useMemo(() => {
    if (ranked.length === 0) return null
    const candidates = ranked
      .slice(0, 6)
      .map((r) => ({ size: r.s.size, predFit: Math.max(0, Math.min(1, r.score / 100)) }))
    const calibrated = calib.length >= 30
    const q = calibrated
      ? conformalQuantile(calib, 0.1)
      : 1 - candidates[Math.min(1, candidates.length - 1)].predFit // top-2 fallback
    const set = predictionSet(candidates, q, 0.1)
    return { sizes: set.sizes.slice(0, 3), calibrated }
  }, [ranked, calib])

  // active size = what she's picked, else froot's pick. Reset pick on style/body change.
  useEffect(() => { setPickedSize(null); setLogged('idle') }, [styleId, body])
  const active: BraSize | null = useMemo(() => {
    if (!style) return null
    if (pickedSize) return style.sizes.find((s) => s.size === pickedSize) ?? recommended
    return recommended
  }, [style, pickedSize, recommended])

  const cp = useMemo(() => (active ? braGeomToCup(sizeToGeom(active)) : null), [active])
  const score = useMemo(() => (cp ? fitScore(bp, cp) : 0), [bp, cp])
  const zones = useMemo(() => (cp ? zoneVerdicts(bp, cp) : []), [bp, cp])
  const band = active ? bandVerdict(measurements, active.band) : null

  // size stepper — always move monotonically in the requested direction, snapping
  // to the nearest real catalog size (never backtracks when an exact size is absent).
  function step(axis: 'band' | 'cup', dir: 1 | -1) {
    if (!style || !active) return
    const a = active
    const cands = style.sizes.filter((s) =>
      axis === 'band'
        ? (dir > 0 ? s.band > a.band : s.band < a.band)
        : (dir > 0 ? s.cupIndex > a.cupIndex : s.cupIndex < a.cupIndex),
    )
    if (!cands.length) return // already at the edge of the run
    let best = cands[0]
    let bd = Infinity
    for (const s of cands) {
      const move = axis === 'band' ? Math.abs(s.band - a.band) : Math.abs(s.cupIndex - a.cupIndex)
      const other = axis === 'band' ? Math.abs(s.cupIndex - a.cupIndex) : Math.abs(s.band - a.band) * 1.5
      const d = move * 2 + other
      if (d < bd) { bd = d; best = s }
    }
    setPickedSize(best.size)
  }

  function logOutcome(outcome: 'fit' | 'too-small' | 'too-big') {
    if (!style || !active || !cp || !band) return
    setLogged(outcome)
    void logFitEvent({
      body: {
        band: body.band, bustDiff: body.bustDiff, proj: bp.proj, rootHalfW: bp.rootHalfW,
        apexDrop: bp.apexDrop, projection: body.projection, fullness: body.fullness, rootWidth: body.rootWidth,
      },
      sku: {
        styleId: style.id, brand: style.brand, style: style.style,
        size: active.size, band: active.band, cupUK: active.cupUK,
      },
      prediction: {
        fitScore: score,
        zones: zones.map((z) => ({ zone: z.zone, state: z.state, clr: +z.clr.toFixed(3) })),
        bandState: band.state,
      },
      outcome,
      // Attach the logging propensity ONLY when she's grading the drawn pick (not a
      // manual size override) — that's the row IPS/SNIPS can reweight into a
      // counterfactual label. Manual picks are honest labels but carry no policy.
      ...(draw && recommended && active.size === recommended.size
        ? {
            policy: {
              epsilon: draw.epsilon,
              propensity: draw.propensity,
              arm: draw.arm,
              candidateCount: draw.candidateCount,
            },
          }
        : {}),
    })
  }

  const onRecommended = active && recommended && active.size === recommended.size
  const scoreColor = score >= 78 ? '#7E9B52' : score >= 55 ? '#C9881F' : '#C5352C'

  return (
    <main className="min-h-screen bg-[#F3E7D6] text-[#1A0808] overflow-x-hidden">
      {/* header */}
      <div className="px-5 md:px-10 pt-10 md:pt-14 pb-3">
        <div className={css.micro}>froot · fit field</div>
        <h1 className="mt-3 text-3xl md:text-4xl font-normal leading-tight max-w-xl" style={{ fontFamily: 'var(--font-serif)' }}>
          see it fit your shape — before you ever put it on.
        </h1>
        <p className="mt-1.5 text-sm text-[#1A0808]/60 max-w-md">
          we don&apos;t guess a size. we drape the real bra on your real shape and show you where it lands.
        </p>
      </div>

      {/* main: scene + controls */}
      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-0 lg:gap-4 px-3 md:px-6 pb-12">
        {/* the mirror */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#f6ecdd] to-[#ecdcc6] min-h-[52vh] lg:min-h-[78vh] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_20px_50px_-30px_rgba(80,50,30,0.5)]">
          {cp && (
            <FitFieldScene bp={bp} cp={cp} band={body.band} showBra={showBra} />
          )}
          {/* legend (top-left, clear of the floating controls + global badges) */}
          <div className="absolute left-4 top-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] bg-[#F3E7D6]/70 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Swatch clr={-0.9} label="digs in" />
            <Swatch clr={0} label="fits" />
            <Swatch clr={0.9} label="gapes" />
          </div>
          <button
            onClick={() => setShowBra((v) => !v)}
            className="absolute right-4 top-4 text-[10px] uppercase tracking-[0.18em] bg-[#1A0808]/80 text-[#F3E7D6] rounded-full px-3 py-1.5"
          >
            {showBra ? 'hide bra' : 'show bra'}
          </button>

          {/* floating size control — touch it here, watch the body react in the SAME frame */}
          {active && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-2 bg-[#F3E7D6]/82 backdrop-blur-md rounded-2xl px-2.5 py-2 shadow-[0_8px_24px_-12px_rgba(80,50,30,0.5)]">
              <div className="px-1 text-center">
                <div className="text-xl font-light tabular-nums leading-none" style={{ fontFamily: 'var(--font-serif)' }}>{active.size}</div>
                {onRecommended ? (
                  <div className="text-[8px] uppercase tracking-[0.16em] text-[#7E9B52] mt-0.5">froot pick</div>
                ) : (
                  <button onClick={() => setPickedSize(null)} className="text-[8px] uppercase tracking-[0.16em] text-[#C5352C] mt-0.5">↺ froot pick</button>
                )}
              </div>
              <Stepper label="band" onDown={() => step('band', -1)} onUp={() => step('band', 1)} value={`${active.band}`} />
              <Stepper label="cup" onDown={() => step('cup', -1)} onUp={() => step('cup', 1)} value={active.cupUK} />
            </div>
          )}
        </div>

        {/* controls + verdict */}
        <div className="px-2 md:px-2 pt-5 lg:pt-2 space-y-7">
          {/* style picker */}
          <div className="space-y-2">
            <span className={css.micro}>the bra</span>
            {style && (
              <div>
                <select
                  value={styleId}
                  onChange={(e) => setStyleId(e.target.value)}
                  className="w-full bg-transparent border-b border-[#1A0808]/20 py-2 text-lg font-light focus:outline-none focus:border-[#C5352C]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {styles?.map((s) => (
                    <option key={s.id} value={s.id}>{s.brand} — {s.style}</option>
                  ))}
                </select>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#8A7060]">
                  {style.cupShape && <span>{style.cupShape.toLowerCase()}</span>}
                  <span>{fabricLine(style.fabric)}</span>
                  <span>{Math.round(style.stretchHint * 100)}% stretch</span>
                </div>
              </div>
            )}
          </div>

          {/* the verdict — score + size */}
          {active && band && (
            <div className="rounded-xl bg-[#1A0808]/[0.04] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={css.micro}>{onRecommended ? 'your fit in this bra' : 'trying'}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-3xl font-light tabular-nums" style={{ fontFamily: 'var(--font-serif)' }}>{active.size}</span>
                    {onRecommended && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#7E9B52]">froot pick</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-light tabular-nums leading-none" style={{ color: scoreColor, fontFamily: 'var(--font-serif)' }}>{score}</div>
                  <div className={`${css.micro} mt-1`}>fit score</div>
                </div>
              </div>
              {/* the two-size window — conformal set, tap either size to preview its field */}
              {sizeWindow && sizeWindow.sizes.length > 1 && (
                <div className="mt-3 pt-3 border-t border-[#1A0808]/10">
                  <div className="flex items-center justify-between">
                    <span className={css.micro}>the two-size window</span>
                    <span
                      className="text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
                      style={sizeWindow.calibrated
                        ? { color: '#7E9B52', background: 'rgba(126,155,82,0.12)' }
                        : { color: '#8A7060', background: 'rgba(138,112,96,0.12)' }}
                    >
                      {sizeWindow.calibrated ? '≥90% one fits' : 'calibrating'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {sizeWindow.sizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setPickedSize(sz)}
                        className={`px-3.5 py-1.5 rounded-full border text-sm tabular-nums transition-colors ${
                          active.size === sz
                            ? 'border-[#C5352C]/60 bg-[#C5352C]/10'
                            : 'border-[#1A0808]/15 text-[#1A0808]/70 hover:border-[#C5352C]/40'
                        }`}
                        style={{ fontFamily: 'var(--font-serif)' }}
                      >
                        {sz}
                      </button>
                    ))}
                    <span className="text-[11px] text-[#8A7060]">order both, keep the one that fits</span>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-[#1A0808]/55">
                adjust the size on the mirror &mdash; the field repaints live.
              </p>
            </div>
          )}

          {/* zone verdicts */}
          {zones.length > 0 && (
            <div className="space-y-2">
              <span className={css.micro}>what the mirror sees</span>
              <div className="space-y-1.5">
                {band && (
                  <ZoneRow label="band" state={band.state === 'good' ? 'good' : 'dig'} message={band.message} />
                )}
                {zones
                  .slice()
                  .sort((a, b) => b.severity - a.severity)
                  .map((z) => (
                    <ZoneRow key={z.zone} label={z.label} state={z.state} message={z.message} />
                  ))}
              </div>
            </div>
          )}

          {/* body editor */}
          <div className="space-y-3">
            <span className={css.micro}>your shape</span>
            <BodyControls state={body} onChange={setBody} />
          </div>

          {/* the loop — capture the outcome (the moat) */}
          {active && (
            <div className="rounded-xl border border-[#1A0808]/10 p-4">
              <div className="text-sm text-[#1A0808]/80">
                {logged === 'idle' ? 'if you own this bra in this size — was it right?' : 'logged. that&apos;s how froot learns your body.'}
              </div>
              {logged === 'idle' && (
                <div className="mt-3 flex gap-2">
                  <OutcomeBtn label="it fit" onClick={() => logOutcome('fit')} primary />
                  <OutcomeBtn label="too small" onClick={() => logOutcome('too-small')} />
                  <OutcomeBtn label="too big" onClick={() => logOutcome('too-big')} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function Swatch({ clr, label }: { clr: number; label: string }) {
  const [r, g, b] = clearanceColor(clr)
  const rgb = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
  return (
    <span className="flex items-center gap-1.5 text-[#1A0808]/70">
      <span className="w-3 h-3 rounded-full" style={{ background: rgb }} />
      {label}
    </span>
  )
}

function Stepper({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  return (
    <div className="flex-1 rounded-lg bg-[#F3E7D6] border border-[#1A0808]/10 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.2em] text-[#8A7060] text-center">{label}</div>
      <div className="flex items-center justify-between mt-0.5">
        <button data-testid={`${label}-down`} aria-label={`${label} down`} onClick={onDown} className="w-6 h-6 grid place-items-center text-[#1A0808]/60 hover:text-[#C5352C]">−</button>
        <span className="text-sm tabular-nums">{value}</span>
        <button data-testid={`${label}-up`} aria-label={`${label} up`} onClick={onUp} className="w-6 h-6 grid place-items-center text-[#1A0808]/60 hover:text-[#C5352C]">+</button>
      </div>
    </div>
  )
}

function ZoneRow({ label, state, message }: { label: string; state: string; message: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: STATE_COLOR[state] ?? '#7E9B52' }} />
      <div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#8A7060]">{label}</span>
        <div className="text-[#1A0808]/80 leading-snug">{message}</div>
      </div>
    </div>
  )
}

function OutcomeBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-full text-xs transition-colors ${
        primary ? 'bg-[#C5352C] text-white hover:bg-[#a82c24]' : 'bg-[#1A0808]/[0.06] text-[#1A0808]/70 hover:bg-[#1A0808]/10'
      }`}
    >
      {label}
    </button>
  )
}
