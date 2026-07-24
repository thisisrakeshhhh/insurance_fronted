import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MicButton } from '@/components/voice/MicButton'
import { TranscriptPanel } from '@/components/voice/TranscriptPanel'
import { StatusBar } from '@/components/voice/StatusBar'
import { Waveform } from '@/components/voice/Waveform'
import { AIInspector } from '@/components/inspector/AIInspector'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useVoiceStore, useSettingsStore } from '@/store'
import { stageColor } from '@/utils/format'
import { PhoneOff, User, Info, Phone, Mic, PhoneCall, Sparkles } from 'lucide-react'

export function VoiceChat() {
  const { startSession, stopSession, startManualListening, sendTurn, triggerPhoneCall } = useVoiceSession()
  const { status, messages, currentCustomer, currentStage, currentModel, lastLatencyMs, sessionStartTime, lastTurn, sessionId } = useVoiceStore()
  const { devPhone } = useSettingsStore()
  
  const [callMode, setCallMode] = useState<'web' | 'phone'>('phone')
  const [phoneNumberInput, setPhoneNumberInput] = useState(devPhone || '+918567890273')
  const [liveTranscript] = useState('')

  const hasSession = !!sessionId && status !== 'ended'

  const handleStart = () => {
    if (!hasSession) {
      startSession('outbound', phoneNumberInput || devPhone || '+918567890273')
    } else {
      startManualListening()
    }
  }

  const handleStop = () => {
    stopSession()
  }

  const handlePhoneCallSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneNumberInput) {
      triggerPhoneCall(phoneNumberInput)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full overflow-hidden"
    >
      {/* Left Control & Customer Panel */}
      <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-border bg-bg-card/60 overflow-y-auto">
        {/* Mode Selector Tabs */}
        <div className="px-4 pt-4 pb-2 border-b border-border bg-bg-card/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Select Connection Mode</p>
          <div className="grid grid-cols-2 gap-1 p-1 bg-bg-surface rounded-xl border border-border">
            <button
              onClick={() => setCallMode('phone')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                callMode === 'phone'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Phone size={13} />
              Phone Call
            </button>
            <button
              onClick={() => setCallMode('web')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                callMode === 'web'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Mic size={13} />
              Web Voice
            </button>
          </div>
        </div>

        {/* Left Side Phone Dialer / Web Option Section */}
        <div className="px-4 py-4 border-b border-border bg-accent/5">
          {callMode === 'phone' ? (
            <form onSubmit={handlePhoneCallSubmit} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                  <PhoneCall size={14} className="text-emerald-400" />
                  <span>Outbound Twilio Dialer</span>
                </div>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono">src/index.js</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-text-muted">Target Phone Number</label>
                <input
                  type="text"
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border text-sm font-mono text-text-primary focus:border-accent outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
              >
                <Phone size={14} />
                Call Number Now
              </button>
              <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                <span>Presets:</span>
                <div className="flex gap-1">
                  {['+918567890273', '+919988776655'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPhoneNumberInput(num)}
                      className="px-1.5 py-0.5 rounded bg-bg-surface border border-border hover:border-accent text-[10px] font-mono text-text-muted hover:text-text-primary"
                    >
                      {num.slice(-4)}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                <Mic size={14} className="text-accent" />
                <span>Web Speech AI Session</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Talk directly with Asha AI through your browser microphone and audio output.
              </p>
              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md shadow-accent/20 transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                {hasSession ? 'Resume Web Mic' : 'Start Web Voice Session'}
              </button>
            </div>
          )}
        </div>

        {/* Customer Details Panel */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Customer Details</span>
          </div>
          {currentCustomer ? (
            <div className="flex flex-col gap-2 text-xs">
              {[
                ['Name', currentCustomer.name],
                ['Phone', currentCustomer.phone],
                ['City', currentCustomer.city],
                ['Age', currentCustomer.age],
                ['Budget', currentCustomer.budget],
                ['Coverage', currentCustomer.coverage_needed],
                ['Insurer', currentCustomer.existing_insurer],
              ].map(([k, v]) => v ? (
                <div key={String(k)} className="flex justify-between gap-2 py-0.5 border-b border-border/30 last:border-0">
                  <span className="text-text-muted">{String(k)}</span>
                  <span className="text-text-primary font-medium text-right">{String(v)}</span>
                </div>
              ) : null)}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Start a session or call to view customer data.</p>
          )}
        </div>

        {/* Session Status Panel */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Session Info</span>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Stage</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${stageColor(currentStage)}`}>{currentStage || 'idle'}</span>
            </div>
            {sessionId && (
              <div className="flex justify-between gap-2">
                <span className="text-text-muted">Session / Call SID</span>
                <span className="text-text-primary font-mono text-right truncate max-w-[120px]">{sessionId.slice(0, 12)}…</span>
              </div>
            )}
          </div>
        </div>

        {hasSession && (
          <div className="px-4 py-4">
            <button
              onClick={handleStop}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-danger/10 text-danger text-xs hover:bg-danger/20 transition-colors"
            >
              <PhoneOff size={13} />
              End Active Session
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <StatusBar status={status} stage={currentStage} model={currentModel} latencyMs={lastLatencyMs} sessionStartTime={sessionStartTime} />

        <TranscriptPanel messages={messages} liveTranscript={liveTranscript} />

        <div className="flex flex-col items-center gap-4 px-6 py-5 border-t border-border bg-bg-card/30">
          {hasSession && (currentStage === 'welcome' || currentStage === 'intent_selection' || currentStage === 'greeting') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md mb-2 p-4 rounded-2xl border border-border/80 bg-bg-card/40 backdrop-blur-sm shadow-lg"
            >
              <p className="text-[10px] font-bold text-text-muted text-center mb-3 tracking-widest uppercase">Direct Keypad Routing</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: '1', label: 'Buy Policy', desc: 'Find plan' },
                  { key: '2', label: 'Renewal', desc: 'Renew policy' },
                  { key: '3', label: 'Claims', desc: 'Claims help' },
                  { key: '4', label: 'Hospitals', desc: 'Find hospital' },
                  { key: '5', label: 'Advisor', desc: 'Talk to advisor' },
                  { key: '9', label: 'Complaint', desc: 'File complaint' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => sendTurn(opt.key)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-bg-surface border border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-center group cursor-pointer text-text-primary"
                  >
                    <span className="text-md font-bold text-accent group-hover:scale-115 transition-transform">{opt.key}</span>
                    <span className="text-[11px] font-semibold mt-0.5">{opt.label}</span>
                    <span className="text-[9px] text-text-muted leading-tight mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          <Waveform status={status} />
          <MicButton status={status} onStart={handleStart} onStop={handleStop} hasSession={hasSession} />
          {liveTranscript && (
            <p className="text-sm text-text-muted italic text-center max-w-md">{liveTranscript}</p>
          )}
        </div>
      </div>

      <div className="w-[280px] flex-shrink-0 flex flex-col border-l border-border bg-bg-card/50">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-text-primary">AI Inspector</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AIInspector lastTurn={lastTurn} />
        </div>
      </div>
    </motion.div>
  )
}
