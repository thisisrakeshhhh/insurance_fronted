import React from 'react'
import { stageColor, formatMs } from '@/utils/format'
import type { TurnResponse } from '@/types'
import { Brain, Target, Zap, FileText, User, ChevronRight } from 'lucide-react'

interface Props {
  lastTurn: TurnResponse | null
}

export function AIInspector({ lastTurn }: Props) {
  if (!lastTurn) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted p-6">
        <Brain size={36} className="opacity-30" />
        <p className="text-sm text-center">AI data will appear here after the first conversation turn.</p>
      </div>
    )
  }

  const fields = Object.entries(lastTurn.extractedFields || {}).filter(([, v]) => v != null && v !== '')

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full text-sm">
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${stageColor(lastTurn.stage)}`}>
          {lastTurn.stage}
        </span>
        <span className="ml-auto text-text-muted text-xs">Turn #{lastTurn.turnCount}</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium uppercase tracking-wider mb-1">
          <Target size={11} />
          Intent
        </div>
        <div className="text-text-primary font-medium">{lastTurn.detectedIntent || '—'}</div>
        <div className="h-1.5 rounded-full bg-bg-surface mt-1 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(lastTurn.intentConfidence || 0) * 100}%` }}
          />
        </div>
        <div className="text-xs text-text-muted">{((lastTurn.intentConfidence || 0) * 100).toFixed(0)}% confidence</div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Zap size={11} />
          Latency
        </div>
        <span className="text-accent font-mono">{formatMs(lastTurn.latencyMs)}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Brain size={11} />
          Model
        </div>
        <span className="text-text-muted font-mono text-xs truncate max-w-[120px]">{lastTurn.model}</span>
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium uppercase tracking-wider">
            <User size={11} />
            Extracted Fields
          </div>
          <div className="flex flex-col gap-1.5">
            {fields.map(([key, val]) => (
              <div key={key} className="flex items-start justify-between gap-2">
                <span className="text-text-muted text-xs capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="text-text-primary text-xs text-right font-medium max-w-[120px] truncate">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {lastTurn.quote && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-bg-surface border border-border">
          <div className="text-xs font-semibold text-accent">{lastTurn.quote.planName}</div>
          <div className="text-xs text-text-muted">{lastTurn.quote.coverage}</div>
          <div className="text-xs text-emerald-400 font-medium">{lastTurn.quote.premiumRange}</div>
          {lastTurn.quote.benefits.slice(0, 3).map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted">
              <ChevronRight size={10} className="text-accent flex-shrink-0" />
              {b}
            </div>
          ))}
        </div>
      )}

      {lastTurn.summary && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-medium uppercase tracking-wider">
            <FileText size={11} />
            Summary
          </div>
          <p className="text-xs text-text-muted leading-relaxed">{lastTurn.summary}</p>
        </div>
      )}

      {(lastTurn.wantsHuman || lastTurn.objectionType) && (
        <div className="flex flex-col gap-1.5">
          {lastTurn.wantsHuman && (
            <div className="text-xs px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 text-center">
              Wants human agent
            </div>
          )}
          {lastTurn.objectionType && (
            <div className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 text-center">
              Objection: {lastTurn.objectionType}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
