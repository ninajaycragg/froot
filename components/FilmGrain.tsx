'use client'

import { useEffect, useRef } from 'react'

export default function FilmGrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let frame = 0

    // Lower res + fewer updates on mobile to save battery
    const mobile = window.innerWidth < 768
    const SCALE = mobile ? 0.15 : 0.25
    const FRAME_SKIP = mobile ? 8 : 4

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * SCALE)
      canvas.height = Math.floor(window.innerHeight * SCALE)
    }

    let imageData = ctx.createImageData(canvas.width, canvas.height)

    const tick = () => {
      frame++
      if (frame % FRAME_SKIP === 0) {
        const w = canvas.width
        const h = canvas.height
        // Re-create only if canvas was resized
        if (imageData.width !== w || imageData.height !== h) {
          imageData = ctx.createImageData(w, h)
        }
        const d = imageData.data

        for (let i = 0; i < d.length; i += 4) {
          const v = (Math.random() * 255) | 0
          // Warm shift — slightly different per channel for color grain
          d[i]     = v + 12   // R
          d[i + 1] = v + 4    // G
          d[i + 2] = v - 6    // B
          // Variable alpha — some grains are heavier than others
          d[i + 3] = Math.random() < 0.15 ? 35 : 15
        }

        ctx.putImageData(imageData, 0, 0)
      }

      animId = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 50,
        pointerEvents: 'none',
        opacity: 0.3,
        mixBlendMode: 'overlay',
        imageRendering: 'auto',
      }}
    />
  )
}
