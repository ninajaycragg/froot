'use client'

// FitCanvas — the side-profile twin. Draws the breast tissue curve + the cup arc
// over a chest-wall plane, shades GAP (cup>tissue) and SPILL (tissue>cup+give) live.
// Pure SVG. Consumes fitSim's FitResult.profile (two depth arrays, mm, on a shared
// top→bottom t-grid). The body faces left; anterior depth (+) reads to the right.

import { useMemo } from 'react'
import type { FitResult } from '@/lib/fitSim'

// 2026 graded hues (not flat): gap = cool jade (empty pocket), spill = warm poppy
const C = {
  ink: '#1A0808',
  poppy: '#C5352C',
  cup: '#7A6A58',
  gap: '#3E7D6B', // jade — empty cup
  gapFill: 'rgba(62,125,107,0.22)',
  spill: '#C5352C', // poppy — overflow
  spillFill: 'rgba(197,53,44,0.24)',
}

const VB = { w: 280, h: 320, padTop: 26, padBottom: 30 }
const DEPTH_MAX = 110 // mm of anterior depth shown (max projection ~4in = 102mm)
const WALL_X = 70
const GIVE_VIS = 6 // mm visual give band for the spill threshold (fitSim uses 2–14)

// t in [0,1] top→bottom → screen y; depth mm → screen x off the chest wall
function project(t: number, depthMm: number) {
  const py = VB.padTop + t * (VB.h - VB.padTop - VB.padBottom)
  const px = WALL_X + (Math.min(depthMm, DEPTH_MAX) / DEPTH_MAX) * (VB.w - WALL_X - 16)
  return [px, py] as const
}

function pathFrom(depths: number[]) {
  const n = depths.length
  return depths
    .map((d, i) => {
      const [px, py] = project(i / (n - 1), d)
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(' ')
}

// closed band between the two curves wherever one is proud of the other
function bandPath(breast: number[], cup: number[], pick: 'gap' | 'spill') {
  const n = breast.length
  const top: string[] = []
  const bottom: string[] = []
  let open = false
  const segs: string[] = []
  const flush = () => {
    if (open) {
      segs.push(top.join(' ') + ' ' + bottom.join(' ') + ' Z')
      top.length = 0
      bottom.length = 0
      open = false
    }
  }
  for (let i = 0; i < n; i++) {
    const b = breast[i]
    const c = cup[i]
    let hi: number, lo: number, active: boolean
    if (pick === 'gap') {
      active = c > b + 3 && c > 3 // cup proud of tissue (real pocket)
      hi = c
      lo = b
    } else {
      active = b > c + GIVE_VIS + 2 && b > 3 // tissue proud beyond give
      hi = b
      lo = c + GIVE_VIS
    }
    if (active) {
      const t = i / (n - 1)
      const [hx, hy] = project(t, hi)
      const [lx, ly] = project(t, lo)
      top.push(`${open ? 'L' : 'M'}${hx.toFixed(1)},${hy.toFixed(1)}`)
      bottom.unshift(`L${lx.toFixed(1)},${ly.toFixed(1)}`)
      open = true
    } else {
      flush()
    }
  }
  flush()
  return segs.join(' ')
}

export default function FitCanvas({ fit }: { fit: FitResult }) {
  const breast = fit.profile.breast
  const cup = fit.profile.cup
  const n = breast.length

  const tissuePath = useMemo(() => pathFrom(breast), [breast])
  const cupPath = useMemo(() => pathFrom(cup), [cup])
  const gapBand = useMemo(() => bandPath(breast, cup, 'gap'), [breast, cup])
  const spillBand = useMemo(() => bandPath(breast, cup, 'spill'), [breast, cup])

  // close the tissue curve to the wall for a soft body fill
  const tissueFill = useMemo(() => {
    const p = pathFrom(breast)
    const first = project(0, 0)
    const last = project(1, 0)
    return `${p} L${last[0].toFixed(1)},${last[1].toFixed(1)} L${first[0].toFixed(1)},${first[1].toFixed(1)} Z`
  }, [breast])

  // apex (max-depth) sample → nipple tick
  const apex = useMemo(() => {
    let mi = 0
    for (let i = 1; i < n; i++) if (breast[i] > breast[mi]) mi = i
    return project(mi / (n - 1), breast[mi])
  }, [breast, n])

  const wallTop = project(0, 0)
  const wallBot = project(1, 0)

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      width="100%"
      style={{ display: 'block', maxWidth: 520, margin: '0 auto', overflow: 'visible' }}
      role="img"
      aria-label="breast and cup side-profile fit twin"
    >
      <defs>
        <linearGradient id="fl-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#EDE3D2" />
          <stop offset="1" stopColor="#E2D2BC" />
        </linearGradient>
        <radialGradient id="fl-light" cx="0.62" cy="0.4" r="0.7">
          <stop offset="0" stopColor="rgba(255,250,240,0.55)" />
          <stop offset="1" stopColor="rgba(255,250,240,0)" />
        </radialGradient>
        <filter id="fl-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1A0808" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* chest-wall plane */}
      <line
        x1={wallTop[0]}
        y1={wallTop[1] - 8}
        x2={wallBot[0]}
        y2={wallBot[1] + 8}
        stroke={C.ink}
        strokeOpacity={0.22}
        strokeWidth={1}
        strokeDasharray="2 4"
      />
      <text
        x={wallTop[0] - 6}
        y={wallTop[1]}
        fontSize="7"
        fill={C.ink}
        fillOpacity={0.4}
        textAnchor="end"
        style={{ fontFamily: 'var(--font-space-mono), monospace', letterSpacing: '0.12em' }}
      >
        CHEST WALL
      </text>

      {/* soft tissue body fill */}
      <path d={tissueFill} fill="url(#fl-body)" filter="url(#fl-soft)" />
      <path d={tissueFill} fill="url(#fl-light)" />

      {/* shaded fit regions */}
      {gapBand && <path d={gapBand} fill={C.gapFill} stroke={C.gap} strokeWidth={0.6} strokeOpacity={0.6} />}
      {spillBand && <path d={spillBand} fill={C.spillFill} stroke={C.spill} strokeWidth={0.6} strokeOpacity={0.6} />}

      {/* tissue outline */}
      <path d={tissuePath} fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* cup arc — drawn over */}
      <path d={cupPath} fill="none" stroke={C.cup} strokeWidth={2} strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />

      {/* nipple / apex tick */}
      <circle cx={apex[0]} cy={apex[1]} r={2.6} fill={C.poppy} />

      {/* depth ruler ticks */}
      {[40, 80].map((d) => {
        const [px] = project(1, d)
        return (
          <g key={d}>
            <line x1={px} y1={VB.h - VB.padBottom + 2} x2={px} y2={VB.h - VB.padBottom + 6} stroke={C.ink} strokeOpacity={0.3} strokeWidth={0.8} />
            <text
              x={px}
              y={VB.h - VB.padBottom + 16}
              fontSize="6.5"
              fill={C.ink}
              fillOpacity={0.4}
              textAnchor="middle"
              style={{ fontFamily: 'var(--font-space-mono), monospace' }}
            >
              {d}
            </text>
          </g>
        )
      })}
      <text
        x={VB.w - 16}
        y={VB.h - VB.padBottom + 16}
        fontSize="6.5"
        fill={C.ink}
        fillOpacity={0.4}
        textAnchor="end"
        style={{ fontFamily: 'var(--font-space-mono), monospace', letterSpacing: '0.1em' }}
      >
        PROJECTION (mm)
      </text>
    </svg>
  )
}
