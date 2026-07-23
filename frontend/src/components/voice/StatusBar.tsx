import React, { useEffect, useState } from 'react'
import { Wifi, WifiOff, Clock, Zap, Layers } from 'lucide-react'
import type { VoiceStatus } from '@/types'
import { stageColor, formatMs } from '@/utils/format'

interface Props {
  status: VoiceStatus
  stage: string
  model: string
  latencyMs: number
  sessionStartTime: number | null
}

export function StatusBar({ status, stage, model, latencyMs, sessionStartTime }: Props) {
  const [elapsed, setElapsed] = useState('0:00')

  useEffect(() => {
    if (!sessionStartTime) return
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStartTime) / 1000)
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime])

  const isOnline = status !== 'idle' && status !== 'error' && status !== 'ended'

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-bg-card/50">
      <div className="flex items-center gap-1.5 text-xs">
        {isOnline ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-text-muted" />}
        <span className={isOnline ? 'text-emerald-400' : 'text-text-muted'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${stageColor(stage)}`}>
        <Layers size={11} />
        <span>{stage || 'idle'}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Zap size={12} />
        <span>{latencyMs > 0 ? formatMs(latencyMs) : '—'}</span>
      </div>

      {sessionStartTime && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Clock size={12} />
          <span>{elapsed}</span>
        </div>
      )}

      <div className="ml-auto text-xs text-text-muted font-mono">{model || '—'}</div>
    </div>
  )
}
