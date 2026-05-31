'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseOpacity: number
  phase: number
  colorIdx: number
}

const PALETTE = [
  [0, 200, 255],   // cyan
  [168, 85, 247],  // purple
  [59, 130, 246],  // blue
  [0, 220, 130],   // green
]

const COUNT = 70
const MAX_DIST = 130
const SPEED = 0.28

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let particles: Particle[] = []
    let W = 0, H = 0

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    const spawn = (): Particle => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      radius: Math.random() * 1.4 + 0.4,
      baseOpacity: Math.random() * 0.45 + 0.1,
      phase: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * PALETTE.length),
    })

    const tick = () => {
      ctx.clearRect(0, 0, W, H)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.phase += 0.018

        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        const [r, g, b] = PALETTE[p.colorIdx]
        const alpha = (Math.sin(p.phase) * 0.3 + 0.7) * p.baseOpacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.12
            const [r, g, bl] = PALETTE[a.colorIdx]
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`
            ctx.lineWidth = 0.6
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }

    resize()
    particles = Array.from({ length: COUNT }, spawn)
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -8 }}
    />
  )
}
