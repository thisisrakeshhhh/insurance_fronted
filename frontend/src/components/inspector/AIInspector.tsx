import React from 'react'
import { formatMs } from '@/utils/format'
import type { TurnResponse } from '@/types'
import { Brain, Target, Zap, Activity, ShieldCheck, CheckCircle2, FileText, UserCheck, HeartPulse, Sparkles } from 'lucide-react'

interface Props {
  lastTurn: TurnResponse | null
}

export function AIInspector({ lastTurn }: Props) {
  if (!lastTurn) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-text-muted p-6 border border-border/40 rounded-2xl bg-bg-card/20 m-4">
        <Brain size={32} className="opacity-40 animate-pulse text-accent" />
        <p className="text-xs text-center font-medium">
          Live AI Inspector & CRM Lead Data will populate automatically during your voice session.
        </p>
      </div>
    )
  }

  // Dynamic values extracted from active customer session
  const customer = lastTurn.customer || {}
  const quote = lastTurn.quote
  const intent = lastTurn.intent || 'buy_policy'
  const age = customer.age || lastTurn.extractedFields?.age
  const familyMembers = customer.family_members || lastTurn.extractedFields?.family_members
  const budget = customer.budget || lastTurn.extractedFields?.budget
  const city = customer.city || lastTurn.extractedFields?.city

  const coverTypeLabel = familyMembers && parseInt(String(familyMembers), 10) > 1
    ? `Family Floater (${familyMembers} Members)`
    : 'Individual'

  return (
    <div className="flex flex-col gap-3.5 p-4 text-sm">
      {/* Live AI Spoken Reply */}
      <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-bg-surface border border-accent/30 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-accent">
          <span className="flex items-center gap-1.5">
            <Brain size={13} />
            AI Spoken Output
          </span>
          <span className="text-[10px] bg-accent/15 px-2 py-0.5 rounded-full text-accent">Groq Llama-3.3</span>
        </div>
        <p className="text-xs text-text-primary italic leading-relaxed font-medium">"{lastTurn.reply}"</p>
      </div>

      {/* Recommended Quote Card (Dynamic from session) */}
      {quote && (
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            Generated Plan Quote
          </div>
          <div className="text-sm font-bold text-text-primary">{quote.planName}</div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Coverage Sum</span>
            <span className="text-emerald-300 font-semibold">{quote.coverage}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Estimated Premium</span>
            <span className="text-emerald-400 font-bold font-mono">{quote.premiumRange}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-300/90 mt-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            7,000+ Cashless Network Hospitals
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-300/90">
            <CheckCircle2 size={12} className="text-emerald-400" />
            Section 80D Tax Deduction Eligible
          </div>
        </div>
      )}

      {/* Extracted Customer Profile (Dynamic CRM Sync) */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-bg-surface border border-border">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-bold uppercase tracking-wider">
          <UserCheck size={13} className="text-accent" />
          Extracted Lead Profile
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between py-0.5 border-b border-border/40">
            <span className="text-text-muted">Intent Category</span>
            <span className="text-accent font-mono font-semibold">{intent}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-border/40">
            <span className="text-text-muted">Age / Cover Type</span>
            <span className="text-text-primary font-medium">
              {age ? `${age} yrs` : 'Not collected'} • {coverTypeLabel}
            </span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-border/40">
            <span className="text-text-muted">Family Size</span>
            <span className="text-text-primary font-medium">{familyMembers ? `${familyMembers} Members` : '1 Member'}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-border/40">
            <span className="text-text-muted">Customer Budget</span>
            <span className="text-emerald-400 font-mono font-semibold">{budget || 'Not specified'}</span>
          </div>
          {city && (
            <div className="flex justify-between py-0.5 border-b border-border/40">
              <span className="text-text-muted">City</span>
              <span className="text-text-primary font-medium">{city}</span>
            </div>
          )}
          <div className="flex justify-between py-0.5">
            <span className="text-text-muted">WhatsApp Summary</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={11} /> Sent
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Customer Emotion & Response Tone */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-bg-surface border border-border">
          <div className="flex items-center gap-1 text-text-muted text-[10px] font-bold uppercase tracking-wider">
            <HeartPulse size={11} className="text-rose-400" />
            Detected Emotion
          </div>
          <div className="text-rose-400 font-mono text-xs font-bold capitalize truncate">
            {lastTurn.customerEmotion || 'neutral'}
          </div>
        </div>

        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-bg-surface border border-border">
          <div className="flex items-center gap-1 text-text-muted text-[10px] font-bold uppercase tracking-wider">
            <Sparkles size={11} className="text-sky-400" />
            Adaptive Tone
          </div>
          <div className="text-sky-400 font-mono text-xs font-bold capitalize truncate">
            {lastTurn.responseTone || 'professional'}
          </div>
        </div>
      </div>

      {/* Detected Intent & Next Action */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-bg-surface border border-border">
          <div className="flex items-center gap-1 text-text-muted text-[10px] font-bold uppercase tracking-wider">
            <Target size={11} className="text-emerald-400" />
            Intent
          </div>
          <div className="text-emerald-400 font-mono text-xs font-bold truncate">{intent}</div>
        </div>

        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-bg-surface border border-border">
          <div className="flex items-center gap-1 text-text-muted text-[10px] font-bold uppercase tracking-wider">
            <Activity size={11} className="text-amber-400" />
            Next Action
          </div>
          <div className="text-amber-400 font-mono text-xs font-bold truncate">{lastTurn.action || lastTurn.stage || 'RECOMMENDATION'}</div>
        </div>
      </div>

      {/* Real-time Latency Metrics */}
      <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-bg-surface/50 border border-border/50">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Zap size={12} className="text-accent" />
          End-to-End Latency
        </div>
        <span className="text-accent font-mono font-bold">{formatMs(lastTurn.latencyMs)}</span>
      </div>

      {/* Engine & Provider */}
      <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-bg-surface/50 border border-border/50">
        <div className="flex items-center gap-1.5 text-text-muted">
          <FileText size={12} />
          AI & Voice Engine
        </div>
        <span className="text-text-muted font-mono text-[11px]">Groq + ElevenLabs</span>
      </div>
    </div>
  )
}
