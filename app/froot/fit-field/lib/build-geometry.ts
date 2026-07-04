// build-geometry — turns the pure fit-math field into three.js meshes.
//
// The BODY is a clay torso with two breast domes (z = breastHeight over an
// elliptical footprint), each vertex tinted by the SIGNED CLEARANCE to the cup —
// warm where the cup digs, cool where it gapes, green where it fits.
// The BRA is a translucent cup shell (z = cupHeight) + a band ring, so you watch
// the breast poke through (dig) or the cup float off (gap) in real space.
//
// Perf: breast POSITIONS depend only on the body, so we build them once and only
// recolor (cheap attribute update) when the size changes. Cup positions rebuild
// on size change. ~2.6k verts/side — trivial for the GPU and for per-frame React.
import * as THREE from 'three'
import {
  breastHeight, cupHeight, clearance, clearanceColor, insideWire,
  type BreastParams, type CupParams,
} from './fit-math'

/** inches → world units. A ~30" torso → ~3.6 units; breast proj ~2" → ~0.24. */
export const IN2WORLD = 0.12

const GRID = 48 // radial + angular resolution of each dome

/** Half the gap between breast centers, world units. A small gore gap, no overlap. */
function breastSeparation(bp: BreastParams): number {
  return bp.rootHalfW * IN2WORLD * 1.02 + 0.05
}
/** Vertical center of the breasts on the torso, world units. */
const BREAST_CENTER_Y = 0.08

// ── BREAST DOME ──────────────────────────────────────────────────────────────
// Polar grid over the elliptical footprint (r∈[0,1], θ∈[0,2π]); z = breastHeight,
// skirted to 0 at the rim so it seats on the chest. sRGB-correct vertex colors.

export interface BreastMesh {
  geometry: THREE.BufferGeometry
  /** local-frame (x,y) inches per vertex, for recoloring against a new cup */
  samples: Float32Array
}

export function buildBreastGeometry(bp: BreastParams): BreastMesh {
  const positions: number[] = []
  const samples: number[] = []
  const indices: number[] = []
  const rings = GRID
  const seg = GRID

  for (let i = 0; i <= rings; i++) {
    const r = i / rings
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2
      // elliptical footprint in inches (local frame: x lateral, y up)
      const x = r * bp.rootHalfW * Math.cos(t)
      const y = r * bp.rootHalfH * Math.sin(t)
      // skirt: fade the bump to 0 at the rim so the dome meets the chest cleanly
      const skirt = 1 - r * r
      const z = breastHeight(x, y, bp) * skirt
      positions.push(x * IN2WORLD, y * IN2WORLD, z * IN2WORLD)
      samples.push(x, y)
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j
      const b = a + seg + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array((positions.length / 3) * 3).fill(0.8), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return { geometry, samples: new Float32Array(samples) }
}

/** Recolor a breast mesh by the clearance to a given cup. Cheap; call on size change. */
export function colorizeBreast(mesh: BreastMesh, bp: BreastParams, cp: CupParams): void {
  const colorAttr = mesh.geometry.getAttribute('color') as THREE.BufferAttribute
  const arr = colorAttr.array as Float32Array
  const s = mesh.samples
  const col = new THREE.Color()
  for (let v = 0; v < s.length / 2; v++) {
    const x = s[v * 2]
    const y = s[v * 2 + 1]
    const clr = clearance(x, y, bp, cp)
    const [r, g, b] = clearanceColor(clr)
    col.setRGB(r, g, b, THREE.SRGBColorSpace) // treat colormap as sRGB → correct linear
    arr[v * 3] = col.r
    arr[v * 3 + 1] = col.g
    arr[v * 3 + 2] = col.b
  }
  colorAttr.needsUpdate = true
}

// ── CUP SHELL (translucent bra) ──────────────────────────────────────────────
// z = cupHeight over the wire footprint, nudged out a hair so it reads as a shell
// hovering over the breast. Clipped to the wire ellipse (the open-top cup).

export function buildCupGeometry(cp: CupParams): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const rings = 40
  const seg = 40
  const idx: number[] = [] // flat index map, -1 where outside wire
  let count = 0
  const map = new Int32Array((rings + 1) * (seg + 1)).fill(-1)

  for (let i = 0; i <= rings; i++) {
    const r = i / rings
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2
      const x = r * cp.cupHalfW * Math.cos(t)
      const y = r * cp.cupHalfH * Math.sin(t) - cp.apexDrop
      if (!insideWire(x, y, cp)) continue
      const skirt = 1 - r * r
      const z = cupHeight(x, y, cp) * skirt + 0.08 // hover a hair off the breast
      map[i * (seg + 1) + j] = count++
      positions.push(x * IN2WORLD, y * IN2WORLD, z * IN2WORLD)
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = map[i * (seg + 1) + j]
      const b = map[(i + 1) * (seg + 1) + j]
      const c = map[i * (seg + 1) + (j + 1)]
      const d = map[(i + 1) * (seg + 1) + (j + 1)]
      if (a >= 0 && b >= 0 && c >= 0) indices.push(a, b, c)
      if (b >= 0 && d >= 0 && c >= 0) indices.push(b, d, c)
    }
  }
  void idx
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// ── TORSO ────────────────────────────────────────────────────────────────────
// A soft elliptical chest the domes seat on — front-facing, rounded shoulders and
// underbust, curving gently back. Clay material set in the scene. Width tracks the
// band so a bigger body reads bigger.

export function buildTorso(bandInches: number): THREE.BufferGeometry {
  const halfW = (bandInches * 0.16) * IN2WORLD + 0.62 // chest half-width
  const top = 1.0
  const bottom = -1.1
  const depth = 0.62
  const cols = 60
  const rows = 48
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= rows; i++) {
    const v = i / rows
    const y = top + (bottom - top) * v
    // taper: narrower at the shoulders (top) and waist (bottom), fullest at chest
    const chest = Math.sin(Math.PI * (0.18 + 0.7 * v))
    const w = halfW * (0.78 + 0.22 * chest)
    for (let j = 0; j <= cols; j++) {
      const u = j / cols
      const ang = Math.PI * (u - 0.5) // front half-wrap, −90°..+90°
      const x = w * Math.sin(ang)
      // front bulge in +z; curve back toward the sides
      const z = depth * Math.cos(ang) * (0.62 + 0.38 * chest)
      positions.push(x, y, z)
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + cols + 1
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** A thin underband hugging the ribcage at the underbust, world units. */
export function buildBand(bandInches: number, cp: CupParams): THREE.BufferGeometry {
  const halfW = (bandInches * 0.16) * IN2WORLD + 0.62
  const y = BREAST_CENTER_Y - (cp.cupHalfH + cp.apexDrop) * IN2WORLD - 0.02
  // a flattened ring around the ribcage at the underbust — thin, elastic-looking
  const geo = new THREE.TorusGeometry(halfW * 0.88, 0.032, 10, 80)
  geo.scale(1, 1, 0.62) // flatten front-to-back to hug the body
  geo.rotateX(Math.PI / 2)
  geo.translate(0, y, 0.18)
  return geo
}

// ── placement helpers (used by the scene) ────────────────────────────────────

export function breastTransform(bp: BreastParams, side: 'left' | 'right'): {
  position: [number, number, number]
  scaleX: number
} {
  const sep = breastSeparation(bp)
  const sign = side === 'right' ? 1 : -1
  // seat the dome on the front of the torso
  const z = 0.78
  return { position: [sign * sep, BREAST_CENTER_Y, z], scaleX: sign }
}
