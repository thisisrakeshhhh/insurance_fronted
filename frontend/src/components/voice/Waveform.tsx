import React, { useRef, useEffect } from 'react'
import type { VoiceStatus } from '@/types'

interface Props {
  status: VoiceStatus
  hasSession?: boolean
}

export function Waveform({ status, hasSession }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const bars = 32
      const barW = width / bars - 2

      for (let i = 0; i < bars; i++) {
        let amplitude = 4
        if (status === 'listening') {
          amplitude = Math.sin(frameRef.current * 0.12 + i * 0.4) * 20 + Math.random() * 14 + 8
        } else if (status === 'speaking') {
          amplitude = Math.sin(frameRef.current * 0.09 + i * 0.3) * 16 + 10
        } else if (status === 'thinking') {
          amplitude = Math.sin(frameRef.current * 0.06 + i * 0.5) * 10 + 6
        } else if (hasSession) {
          amplitude = Math.sin(frameRef.current * 0.04 + i * 0.2) * 6 + 6
        }

        const x = i * (barW + 2)
        const barHeight = Math.max(4, amplitude)
        const y = (height - barHeight) / 2

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        if (status === 'listening') {
          gradient.addColorStop(0, '#6366f1')
          gradient.addColorStop(1, '#8b5cf6')
        } else if (status === 'speaking') {
          gradient.addColorStop(0, '#10b981')
          gradient.addColorStop(1, '#34d399')
        } else if (status === 'thinking') {
          gradient.addColorStop(0, '#8b5cf6')
          gradient.addColorStop(1, '#a78bfa')
        } else if (hasSession) {
          gradient.addColorStop(0, '#10b981')
          gradient.addColorStop(1, '#059669')
        } else {
          gradient.addColorStop(0, '#334155')
          gradient.addColorStop(1, '#475569')
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barW, barHeight, 2)
        ctx.fill()
      }

      frameRef.current++
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [status, hasSession])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={56}
      className="w-full opacity-90"
    />
  )
}
