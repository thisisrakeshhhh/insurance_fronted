import React from 'react'
import { useWorkerHealth } from '@/hooks/useWorkerHealth'
import { Activity } from 'lucide-react'

export function WorkerStatusBadge() {
  const { data, isLoading, isError } = useWorkerHealth()

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <span>Checking...</span>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span>Worker offline</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Worker online</span>
      </div>
      <span className="text-text-muted">·</span>
      <span className="text-text-muted font-mono">{data.model}</span>
      <div className="flex items-center gap-1 text-text-muted">
        <Activity size={11} />
        <span>{data.latencyMs}ms</span>
      </div>
    </div>
  )
}
