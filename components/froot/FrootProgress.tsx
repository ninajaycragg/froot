'use client'

import { motion } from 'framer-motion'

interface FrootProgressProps {
  current: number
  total: number
}

export default function FrootProgress({ current, total }: FrootProgressProps) {
  if (current === 0 || current > total) return null
  const pct = ((current - 1) / (total - 1)) * 100

  return (
    <div style={{ width: '80px', height: '2px', background: 'rgba(26,8,8,0.06)', borderRadius: '1px', overflow: 'hidden' }}>
      <motion.div
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: '#D4A020', borderRadius: '1px' }}
      />
    </div>
  )
}
