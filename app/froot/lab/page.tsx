'use client'

// /froot/lab — the FIT LAB. A live, in-browser simulatable breast↔bra side-profile twin.
// Drag the shape sliders to sculpt your tissue curve; step a bra size + material stretch;
// watch the cup arc draw over the tissue and the GAP / SPILL shade in live. The magic:
// finding the size where gap and spill resolve to a clean seat.
//
// Drives the real cross-section sim: simulateFit / bestCupFor from '@/lib/fitSim'.
// Guarded so the page still renders even if that module is missing at build/runtime.

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import FilmGrain from '@/components/FilmGrain'
import { FrootProfileProvider } from '@/components/froot/FrootProfileContext'
import FitCanvas from '@/components/froot/lab/FitCanvas'
import FitAgent, { type FitObservation, type LiveBelief } from '@/components/froot/FitAgent'
import { refineSizeFromFeedback, type FitFeedbackPing } from '@/components/froot/beliefEngine'
import { getStretch, type BrandStretch } from '@/lib/braMaterials'
import {
  simulateFit as realSimulateFit,
  bestCupFor as realBestCupFor,
  type BreastTwin,
  type BraCup,
  type FitResult,
} from '@/lib/fitSim'

// ── sim binding ──
// If '@/lib/fitSim' is ever absent, a tiny inline fallback keeps the page rendering
// (a flat seat result) rather than crashing. The real module is the source of truth.
const simulateFit: (twin: BreastTwin, cup: BraCup) => FitResult =
  typeof realSimulateFit === 'function' ? realSimulateFit : fallbackSimulate
const bestCupFor: (twin: BreastTwin, cups: BraCup[]) => { cup: BraCup; result: FitResult }[] =
  typeof realBestCupFor === 'function'
    ? realBestCupFor
    : (twin, cups) => cups.map((cup) => ({ cup, result: simulateFit(twin, cup) })).sort((a, b) => b.result.score - a.result.score)

function fallbackSimulate(twin: BreastTwin, cup: BraCup): FitResult {
  const n = 64
  const breast = Array.from({ length: n }, (_, i) => 25.4 * twin.projectionIn * Math.exp(-((i / (n - 1) - 0.5) ** 2) / 0.1))
  const cv = Array.from({ length: n }, (_, i) => 25.4 * cup.cupDepthIn * Math.exp(-((i / (n - 1) - 0.56) ** 2) / 0.1))
  return { seat: 'seat', gapIn: 0, spillIn: 0, pressure: 0.4, score: 0.7, diagnosis: 'sim module unavailable — showing approximate curves.', profile: { breast, cup: cv } }
}

const C = { bone: '#FAF6EE', ink: '#1A0808', poppy: '#C5352C', jade: '#3E7D6B', cup: '#7A6A58' }

// ── shape axes → continuous BreastTwin scalars (the sim wants inches/cc) ──
type Projection = 'shallow' | 'average' | 'projected'
type RootWidth = 'narrow' | 'average' | 'wide'
type Fullness = 'full-on-top' | 'even' | 'full-on-bottom'

const PROJ: Projection[] = ['shallow', 'average', 'projected']
const ROOT: RootWidth[] = ['narrow', 'average', 'wide']
const FULL: Fullness[] = ['full-on-top', 'even', 'full-on-bottom']

const PROJ_IN: Record<Projection, number> = { shallow: 2.1, average: 2.9, projected: 3.7 }
const ROOT_IN: Record<RootWidth, number> = { narrow: 4.2, average: 5.2, wide: 6.4 }
const FULL_U: Record<Fullness, number> = { 'full-on-top': 0.78, even: 0.5, 'full-on-bottom': 0.24 }

interface ShapeState {
  projection: Projection
  rootWidth: RootWidth
  fullness: Fullness
  ptosis: number // 0..1
  volumeCc: number
}
const DEFAULT_SHAPE: ShapeState = { projection: 'average', rootWidth: 'average', fullness: 'even', ptosis: 0.2, volumeCc: 450 }

function toTwin(s: ShapeState): BreastTwin {
  return {
    projectionIn: PROJ_IN[s.projection],
    rootWidthIn: ROOT_IN[s.rootWidth],
    fullnessUpper: FULL_U[s.fullness],
    ptosis: s.ptosis,
    volumeCc: s.volumeCc,
  }
}

// ── a real representative size run (Freya Deco Moulded Plunge, cm from data) ──
// The steppable UK cup ladder at band 32. cd/cw/wl in cm → BraCup wants inches (cm÷2.54).
const RAW: Record<string, { cd: number; cw: number; wl: number }> = {
  '32D': { cd: 7.4, cw: 4.9, wl: 7.8 },
  '32DD': { cd: 8.1, cw: 5.1, wl: 8.4 },
  '32E': { cd: 8.7, cw: 5.4, wl: 8.8 },
  '32F': { cd: 9.2, cw: 5.7, wl: 9.6 },
  '32FF': { cd: 9.9, cw: 5.9, wl: 10.1 },
  '32G': { cd: 10.5, cw: 6.2, wl: 10.8 },
  '32GG': { cd: 11.3, cw: 6.6, wl: 11.3 },
}
const CM_TO_IN = 1 / 2.54
const SIZE_LABELS = Object.keys(RAW)
function rowToCup(label: string, stretch: number): BraCup {
  const m = RAW[label]
  return { cupDepthIn: m.cd * CM_TO_IN, cupWidthIn: m.cw * CM_TO_IN, wireLengthIn: m.wl * CM_TO_IN, stretch }
}

const mono = { fontFamily: 'var(--font-space-mono), monospace' }
const serif = { fontFamily: 'var(--font-dm-serif), serif' }

export default function FitLabPage() {
  return (
    <FrootProfileProvider>
      <main
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(120% 80% at 50% -10%, #FBF8F1 0%, #F3ECDF 55%, #EBE0CE 100%)',
          color: C.ink,
          overflowX: 'hidden',
        }}
      >
        <FilmGrain />
        <Lab />
      </main>
    </FrootProfileProvider>
  )
}

// real fabric fingerprint for the demo ladder's brand (Freya), graceful on miss
const BRAND = 'Freya'
const BRAND_STRETCH: BrandStretch | null = getStretch(BRAND)

function Lab() {
  const [shape, setShape] = useState<ShapeState>({ ...DEFAULT_SHAPE })
  const [sizeIdx, setSizeIdx] = useState(2) // 32E
  const [stretch, setStretch] = useState(BRAND_STRETCH?.scalar ?? 0.18)
  const [trying, setTrying] = useState(false)

  const twin = useMemo(() => toTwin(shape), [shape])
  const cup = useMemo(() => rowToCup(SIZE_LABELS[sizeIdx], stretch), [sizeIdx, stretch])
  const fit = useMemo(() => simulateFit(twin, cup), [twin, cup])

  // "try my size" — animate the cup stepping toward the best-seating size
  const tryRef = useRef<number | null>(null)
  const tryMySize = () => {
    const ranked = bestCupFor(twin, SIZE_LABELS.map((l) => rowToCup(l, stretch)))
    if (!ranked.length) return
    // find which label the top-ranked cup corresponds to (match by cupDepthIn)
    const bestDepth = ranked[0].cup.cupDepthIn
    const target = SIZE_LABELS.findIndex((l) => Math.abs(RAW[l].cd * CM_TO_IN - bestDepth) < 1e-6)
    if (target < 0) return
    setTrying(true)
    if (tryRef.current) window.clearInterval(tryRef.current)
    tryRef.current = window.setInterval(() => {
      setSizeIdx((curr) => {
        if (curr === target) {
          if (tryRef.current) window.clearInterval(tryRef.current)
          setTrying(false)
          return curr
        }
        return curr < target ? curr + 1 : curr - 1
      })
    }, 280)
  }
  useEffect(() => () => { if (tryRef.current) window.clearInterval(tryRef.current) }, [])

  const score100 = Math.round(fit.score * 100)
  const scoreColor = score100 >= 80 ? C.jade : score100 >= 55 ? C.cup : C.poppy

  // ── instrument 03: the listening fitter ──
  // The agent extracts fit observations from chat; we fold each into the belief
  // engine and thread the sharpened size back so the radar narrows in place.
  const [pings, setPings] = useState<FitFeedbackPing[]>([])
  const belief: LiveBelief | undefined = useMemo(() => {
    const refined = refineSizeFromFeedback(pings)
    if (!refined) return undefined
    return {
      sizeUK: refined.sizeUK,
      bandSize: refined.bandSize,
      cupUK: refined.cupUK,
      confidence: refined.confidence,
      nPings: refined.nPings,
      sisters: refined.sisters,
    }
  }, [pings])
  const handleObservation = useCallback((obs: FitObservation) => {
    if (!obs.size) return // belief engine anchors on a real size
    setPings((prev) => [...prev, obs as FitFeedbackPing])
  }, [])

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 18px 80px' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '0.24em', opacity: 0.5, textTransform: 'uppercase' }}>
          froot · instrument 02
        </div>
        <h1 style={{ ...serif, fontSize: 'clamp(30px,7vw,48px)', lineHeight: 1.0, margin: '6px 0 4px', fontWeight: 400 }}>
          the fit lab
        </h1>
        <p style={{ fontSize: 14, opacity: 0.65, maxWidth: 460, lineHeight: 1.5 }}>
          a live side-profile twin. sculpt your shape, step a size, watch the cup find its seat —
          the green is empty cup, the red is overflow.
        </p>
        <a
          href="/froot/fit-field"
          style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.poppy, textDecoration: 'none' }}
        >
          see it in 3d — the mirror &rarr;
        </a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(160deg,#FFFDF8 0%,#F6EFE2 100%)',
          border: `1px solid ${C.ink}1A`,
          borderRadius: 18,
          padding: '20px 16px 8px',
          boxShadow: '0 18px 40px -24px rgba(26,8,8,0.4), inset 0 1px 0 rgba(255,255,255,0.7)',
          marginBottom: 18,
        }}
      >
        <FitCanvas fit={fit} />
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', margin: '4px 0 10px', ...mono, fontSize: 10, letterSpacing: '0.08em', opacity: 0.7 }}>
          <Legend swatch={C.ink} label="tissue" solid />
          <Legend swatch={C.cup} label="cup" dashed />
          <Legend swatch={C.jade} label="gap · empty" />
          <Legend swatch={C.poppy} label="spill · overflow" />
        </div>
      </motion.div>

      <Readout fit={fit} score100={score100} scoreColor={scoreColor} size={SIZE_LABELS[sizeIdx]} />

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr', marginTop: 18 }}>
        <Panel title="bra">
          <Row label={`size · ${SIZE_LABELS[sizeIdx]}`}>
            <Stepper idx={sizeIdx} max={SIZE_LABELS.length - 1} labels={SIZE_LABELS} onChange={(i) => { setTrying(false); setSizeIdx(i) }} />
          </Row>
          <Row label={`material stretch · ${stretchLabel(stretch)}${BRAND_STRETCH ? ` · ${BRAND} measured` : ''}`}>
            <Slider value={stretch} min={0} max={1} step={0.02} onChange={setStretch} />
          </Row>
          <button
            onClick={tryMySize}
            disabled={trying}
            style={{
              marginTop: 6, width: '100%', padding: '12px 14px', borderRadius: 12, border: 'none',
              background: trying ? `${C.poppy}99` : C.poppy, color: C.bone, ...mono, fontSize: 12,
              letterSpacing: '0.18em', textTransform: 'uppercase', cursor: trying ? 'default' : 'pointer',
              boxShadow: '0 8px 20px -10px rgba(197,53,44,0.7)', transition: 'background 0.2s',
            }}
          >
            {trying ? 'seating…' : 'try my size →'}
          </button>
        </Panel>

        <Panel title="shape · liRBSM axes">
          <Row label={`projection · ${shape.projection}`}>
            <Segment options={PROJ} value={shape.projection} onChange={(v) => setShape((s) => ({ ...s, projection: v }))} />
          </Row>
          <Row label={`root width · ${shape.rootWidth}`}>
            <Segment options={ROOT} value={shape.rootWidth} onChange={(v) => setShape((s) => ({ ...s, rootWidth: v }))} />
          </Row>
          <Row label={`fullness · ${shape.fullness}`}>
            <Segment options={FULL} value={shape.fullness} onChange={(v) => setShape((s) => ({ ...s, fullness: v }))} />
          </Row>
          <Row label={`ptosis · ${Math.round(shape.ptosis * 100)}%`}>
            <Slider value={shape.ptosis} min={0} max={1} step={0.02} onChange={(v) => setShape((s) => ({ ...s, ptosis: v }))} />
          </Row>
          <Row label={`volume · ${Math.round(shape.volumeCc)}cc`}>
            <Slider value={shape.volumeCc} min={150} max={1100} step={10} onChange={(v) => setShape((s) => ({ ...s, volumeCc: v }))} />
          </Row>
        </Panel>
      </div>

      <p style={{ ...mono, fontSize: 9.5, opacity: 0.4, marginTop: 22, lineHeight: 1.6, letterSpacing: '0.05em' }}>
        tissue curve = liRBSM mean torso sheet warped by your shape · cup arc = real bratabase
        geometry (cup depth / wire length). a geometric cross-section comparison, not a soft-body solve.
      </p>

      {/* ── instrument 03: the listening fitter ── */}
      <div style={{ marginTop: 44 }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: '0.24em', opacity: 0.5, textTransform: 'uppercase' }}>
          froot · instrument 03
        </div>
        <h2 style={{ ...serif, fontSize: 'clamp(22px,5vw,32px)', lineHeight: 1.05, margin: '6px 0 4px', fontWeight: 400 }}>
          fit by listening
        </h2>
        <p style={{ fontSize: 14, opacity: 0.65, maxWidth: 460, lineHeight: 1.5, marginBottom: 16 }}>
          name a bra you own and how it sits — the read sharpens with each one.
        </p>
        <FitAgent belief={belief} onObservation={handleObservation} />
      </div>
    </div>
  )
}

function Readout({ fit, score100, scoreColor, size }: { fit: FitResult; score100: number; scoreColor: string; size: string }) {
  const seatLabel = fit.seat === 'seat' ? 'clean' : fit.seat
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
      <Stat label="seat" value={seatLabel} hint="verdict" color={fit.seat === 'seat' ? C.jade : C.ink} />
      <Stat label="gap" value={`${fit.gapIn.toFixed(1)}mm`} hint="empty cup" color={C.jade} />
      <Stat label="spill" value={`${fit.spillIn.toFixed(1)}mm`} hint="overflow" color={C.poppy} />
      <div style={{ background: C.ink, color: C.bone, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', opacity: 0.6 }}>FIT SCORE</span>
        <span style={{ ...serif, fontSize: 30, lineHeight: 1, color: scoreColor }}>
          {score100}<span style={{ fontSize: 13, opacity: 0.5 }}>/100</span>
        </span>
      </div>
      <div style={{ gridColumn: '1 / -1', background: '#FFFDF8', border: `1px solid ${C.ink}14`, borderRadius: 12, padding: '12px 14px', fontSize: 14, lineHeight: 1.45 }}>
        <span style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', opacity: 0.45 }}>DIAGNOSIS · {size}</span>
        <div style={{ marginTop: 4 }}>{fit.diagnosis}</div>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFDF8', border: `1px solid ${C.ink}14`, borderRadius: 16, padding: '14px 16px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)' }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.45, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...mono, fontSize: 10.5, letterSpacing: '0.06em', opacity: 0.6, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint: string; color?: string }) {
  return (
    <div style={{ background: '#FFFDF8', border: `1px solid ${C.ink}14`, borderRadius: 12, padding: '10px 12px' }}>
      <span style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', opacity: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ ...serif, fontSize: 22, lineHeight: 1.1, color: color || C.ink, textTransform: 'lowercase' }}>{value}</div>
      <span style={{ ...mono, fontSize: 8.5, opacity: 0.4 }}>{hint}</span>
    </div>
  )
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', height: 4, appearance: 'none', borderRadius: 999, background: `linear-gradient(90deg, ${C.poppy} ${pct}%, ${C.ink}1F ${pct}%)`, outline: 'none', cursor: 'pointer' }}
    />
  )
}

function Segment<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => {
        const active = o === value
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 9,
              border: `1px solid ${active ? C.ink : C.ink + '22'}`, background: active ? C.ink : 'transparent',
              color: active ? C.bone : C.ink, ...mono, fontSize: 9.5, letterSpacing: '0.04em',
              cursor: 'pointer', textTransform: 'lowercase', transition: 'all 0.15s', lineHeight: 1.2,
            }}
          >
            {o.replace(/-/g, ' ')}
          </button>
        )
      })}
    </div>
  )
}

function Stepper({ idx, max, labels, onChange }: { idx: number; max: number; labels: string[]; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StepBtn dir="−" onClick={() => onChange(Math.max(0, idx - 1))} disabled={idx === 0} />
      <div style={{ flex: 1, display: 'flex', gap: 3, justifyContent: 'center' }}>
        {labels.map((l, i) => (
          <button
            key={l}
            onClick={() => onChange(i)}
            title={l}
            style={{
              flex: 1, height: 30, borderRadius: 7, border: 'none',
              background: i === idx ? C.poppy : `${C.ink}14`, color: i === idx ? C.bone : C.ink,
              ...mono, fontSize: i === idx ? 11 : 9, cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden',
            }}
          >
            {i === idx ? l : l.replace(/^\d+/, '')}
          </button>
        ))}
      </div>
      <StepBtn dir="+" onClick={() => onChange(Math.min(max, idx + 1))} disabled={idx === max} />
    </div>
  )
}

function StepBtn({ dir, onClick, disabled }: { dir: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.ink}22`, background: '#FFFDF8',
        color: C.ink, fontSize: 16, lineHeight: 1, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1, flexShrink: 0,
      }}
    >
      {dir}
    </button>
  )
}

function Legend({ swatch, label, solid, dashed }: { swatch: string; label: string; solid?: boolean; dashed?: boolean }) {
  const line = solid || dashed
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 14, height: line ? 0 : 9, borderRadius: line ? 0 : 2,
          background: line ? 'transparent' : swatch,
          borderTop: dashed ? `2px dashed ${swatch}` : solid ? `2px solid ${swatch}` : 'none',
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}

function stretchLabel(s: number) {
  return s < 0.3 ? 'rigid' : s < 0.6 ? 'moderate' : 'stretchy'
}
