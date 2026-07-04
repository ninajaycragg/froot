'use client'

// FitFieldScene — the magic surface. A warm clay torso; her breast shape tinted
// by the live fit field (warm = the cup digs, cool = it gapes, green = it fits);
// the bra as a translucent shell you watch press in or float off. Warm daylight,
// soft contact shadow, low emissive — never a dark stage with a neon glow.
import { useMemo, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { BreastParams, CupParams } from '../lib/fit-math'
import {
  buildBreastGeometry, colorizeBreast, buildCupGeometry, buildTorso, buildBand,
  breastTransform, type BreastMesh,
} from '../lib/build-geometry'

const CLAY = '#d9b9a3' // warm skin-clay
const BG = '#f3e7d6' // warm bone daylight
const BRA = '#e8dccb'

// Dispose a memoized BufferGeometry whenever it's replaced (slider change) and on
// unmount. These are built imperatively and passed via `geometry={...}`, so R3F's
// auto-dispose doesn't cover the previous generation — without this every slider
// drag orphans a GPU buffer.
function useGeoDispose(geo: THREE.BufferGeometry) {
  useEffect(() => () => geo.dispose(), [geo])
}

function Body({ bp, cp }: { bp: BreastParams; cp: CupParams }) {
  // positions depend only on the body → build once per body; recolor on cup change
  const mesh: BreastMesh = useMemo(() => buildBreastGeometry(bp), [bp])
  useGeoDispose(mesh.geometry)
  useEffect(() => {
    colorizeBreast(mesh, bp, cp)
  }, [mesh, bp, cp])

  const right = breastTransform(bp, 'right')
  const left = breastTransform(bp, 'left')
  const mountZ = 0.8

  return (
    <group>
      {[right, left].map((t, i) => (
        <mesh
          key={i}
          geometry={mesh.geometry}
          position={[t.position[0], t.position[1], mountZ]}
          castShadow
        >
          <meshStandardMaterial
            vertexColors
            roughness={0.85}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function Bra({ bp, cp, band }: { bp: BreastParams; cp: CupParams; band: number }) {
  const cup = useMemo(() => buildCupGeometry(cp), [cp])
  const bandGeo = useMemo(() => buildBand(band, cp), [band, cp])
  useGeoDispose(cup)
  useGeoDispose(bandGeo)
  const right = breastTransform(bp, 'right')
  const left = breastTransform(bp, 'left')
  const mountZ = 0.8
  return (
    <group>
      {[right, left].map((t, i) => (
        <mesh key={i} geometry={cup} position={[t.position[0], t.position[1], mountZ]}>
          <meshPhysicalMaterial
            color={BRA}
            roughness={0.35}
            transmission={0.55}
            thickness={0.4}
            transparent
            opacity={0.62}
            side={THREE.DoubleSide}
            clearcoat={0.4}
            clearcoatRoughness={0.4}
          />
        </mesh>
      ))}
      <mesh geometry={bandGeo} position={[0, 0, mountZ - 0.34]}>
        <meshStandardMaterial color={BRA} roughness={0.5} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Torso({ band }: { band: number }) {
  const geo = useMemo(() => buildTorso(band), [band])
  useGeoDispose(geo)
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={CLAY} roughness={0.78} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

export interface FitFieldSceneProps {
  bp: BreastParams
  cp: CupParams
  band: number
  showBra: boolean
}

export default function FitFieldScene({ bp, cp, band, showBra }: FitFieldSceneProps) {
  const controls = useRef(null)
  return (
    <Canvas
      camera={{ position: [0.8, 0.42, 5.7], fov: 30, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      shadows
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <color attach="background" args={[BG]} />
      {/* self-contained warm daylight — hemisphere sky/ground + key + cool fill.
          No network HDR (drei <Environment> suspends the scene if its CDN is slow). */}
      <hemisphereLight args={['#fff3e0', '#caa987', 0.85]} />
      <ambientLight intensity={0.35} color="#fff4e6" />
      <directionalLight
        position={[3, 5, 6]}
        intensity={1.7}
        color="#fff0dd"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-4, 2, 3]} intensity={0.45} color="#dfe8ef" />

      <Suspense fallback={null}>
        <group position={[0, -0.1, 0]}>
          <Torso band={band} />
          <Body bp={bp} cp={cp} />
          {showBra && <Bra bp={bp} cp={cp} band={band} />}
        </group>

        <ContactShadows
          position={[0, -2.45, 0]}
          scale={9}
          resolution={1024}
          blur={2.6}
          opacity={0.32}
          far={5}
          color="#9c7b63"
        />
      </Suspense>

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        minDistance={3.5}
        maxDistance={11}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.82}
        rotateSpeed={0.6}
        target={[0, -0.12, 0.78]}
      />
    </Canvas>
  )
}
