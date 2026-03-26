'use client'

import { motion } from 'framer-motion'
import type { ShapeProfile } from './sizing'

interface ShapeVizProps {
  shape: ShapeProfile
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface ScaleProps {
  label: string
  left: string
  right: string
  position: number // 0 = left, 0.5 = center, 1 = right
  delay: number
}

function Scale({ label, left, right, position, delay }: ScaleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
    >
      <span style={{
        fontFamily: 'var(--font-space-mono)', fontSize: '8px', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'rgba(26,8,8,0.3)',
      }}>
        {label}
      </span>
      <div style={{ position: 'relative', height: '20px' }}>
        {/* Track */}
        <div style={{
          position: 'absolute', top: '9px', left: 0, right: 0, height: '2px',
          background: 'rgba(26,8,8,0.06)', borderRadius: '1px',
        }} />
        {/* Filled portion */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${position * 100}%` }}
          transition={{ delay: delay + 0.15, duration: 0.5, ease: EASE }}
          style={{
            position: 'absolute', top: '9px', left: 0, height: '2px',
            background: 'rgba(212,160,32,0.3)', borderRadius: '1px',
          }}
        />
        {/* Marker */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3, duration: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
          style={{
            position: 'absolute', top: '4px',
            left: `${position * 100}%`,
            transform: 'translateX(-50%)',
            width: '12px', height: '12px', borderRadius: '50%',
            background: '#D4A020',
            boxShadow: '0 0 0 3px rgba(212,160,32,0.12)',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '7px', color: 'rgba(26,8,8,0.2)' }}>{left}</span>
        <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: '7px', color: 'rgba(26,8,8,0.2)' }}>{right}</span>
      </div>
    </motion.div>
  )
}

export default function ShapeViz({ shape }: ShapeVizProps) {
  const projectionPos = shape.projection === 'shallow' ? 0.15 : shape.projection === 'moderate' ? 0.5 : 0.85
  const fullnessPos = shape.fullness === 'full-on-bottom' ? 0.15 : shape.fullness === 'even' ? 0.5 : 0.85
  const rootPos = shape.rootWidth === 'narrow' ? 0.15 : shape.rootWidth === 'average' ? 0.5 : 0.85

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px 24px',
      borderRadius: '12px',
      background: 'rgba(26,8,8,0.02)',
      width: '100%',
    }}>
      <Scale label="projection" left="shallow" right="projected" position={projectionPos} delay={0.5} />
      <Scale label="fullness" left="bottom" right="top" position={fullnessPos} delay={0.6} />
      <Scale label="root width" left="narrow" right="wide" position={rootPos} delay={0.7} />
    </div>
  )
}
