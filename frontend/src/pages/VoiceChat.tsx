import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicButton } from '@/components/voice/MicButton'
import { TranscriptPanel } from '@/components/voice/TranscriptPanel'
import { StatusBar } from '@/components/voice/StatusBar'
import { Waveform } from '@/components/voice/Waveform'
import { AIInspector } from '@/components/inspector/AIInspector'
import { DialPad } from '@/components/voice/DialPad'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useVoiceStore, useSettingsStore } from '@/store'
import { stageColor } from '@/utils/format'
import { PhoneOff, User, Info, Phone, Mic, PhoneCall, Sparkles, Cpu } from 'lucide-react'
import { toast } from 'sonner'

type MobileTab = 'chat' | 'profile' | 'inspector'

export function VoiceChat() {
  const { startSession, stopSession, startManualListening, sendTurn, triggerPhoneCall, clearCustomerProfile } = useVoiceSession()
  const { status, messages, currentCustomer, currentStage, currentModel, lastLatencyMs, sessionStartTime, lastTurn, sessionId } = useVoiceStore()
  const { devPhone } = useSettingsStore()

  const [callMode, setCallMode] = useState<'web' | 'phone'>('phone')
  const [phoneNumberInput, setPhoneNumberInput] = useState('')
  const [liveTranscript] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')

  const hasSession = !!sessionId && status !== 'ended'

  const handleTestPreset = async (text: string) => {
    if (!hasSession) {
      try {
        toast.info('Starting Web Voice Session first...')
        await startSession('outbound', '+918567890273')
        setTimeout(async () => {
          await sendTurn(text)
        }, 1200)
      } catch (err) {
        toast.error('Failed to start session for test preset')
      }
    } else {
      await sendTurn(text)
    }
  }

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

  const handleDialCall = () => {
    if (phoneNumberInput) {
      triggerPhoneCall(phoneNumberInput)
    }
  }

  const handlePhoneCallSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleDialCall()
  }

  // ── Shared left-panel content (reused in both desktop sidebar & mobile profile tab) ──
  const ControlPanelContent = () => (
    <>
      {/* Mode Selector */}
      <div className="px-4 pt-4 pb-2 border-b border-border bg-bg-card/80">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Connection Mode</p>
        <div className="grid grid-cols-2 gap-1 p-1 bg-bg-surface rounded-xl border border-border">
          <button
            onClick={() => setCallMode('phone')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              callMode === 'phone' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Phone size={13} />
            Phone Call
          </button>
          <button
            onClick={() => setCallMode('web')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              callMode === 'web' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Mic size={13} />
            Web Voice
          </button>
        </div>
      </div>

      {/* Dialer / Web session */}
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
            <input
              type="tel"
              value={phoneNumberInput}
              onChange={(e) => setPhoneNumberInput(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
            >
              <Phone size={14} />
              Call Number Now
            </button>
            <div className="flex items-center justify-between text-[10px] text-text-muted">
              <span>Presets:</span>
              <div className="flex gap-1">
                {['+919876543210', '+919988776655'].map((num) => (
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

      {/* Customer Details */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Customer Details</span>
          </div>
          {hasSession && (
            <button
              onClick={clearCustomerProfile}
              className="text-[10px] bg-accent/10 hover:bg-accent/20 text-accent font-bold px-2 py-0.5 rounded transition-all cursor-pointer border border-accent/20"
            >
              Clear
            </button>
          )}
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
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-2 py-0.5 border-b border-border/30 last:border-0">
                <span className="text-text-muted">{String(k)}</span>
                <span className="text-text-primary font-medium text-right">{v ? String(v) : '-'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Start a session to view customer data.</p>
        )}
      </div>

      {/* Test Presets */}
      <div className="px-4 py-4 border-b border-border bg-bg-card/40">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-accent animate-pulse" />
          <span className="text-sm font-semibold text-text-primary">Hybrid Test Presets</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Case 1: Buy Policy (Local)', text: 'I want to buy a policy' },
            { label: 'Case 2: Short Age (Local)', text: 'my age is 21' },
            { label: 'Case 3: Complex Info (Local)', text: 'yes i am looking for to buy a policy for my age is 21 and i have 20k of budget which cover my family' },
            { label: 'Case 4: Mixed Hindi (Gemini)', text: 'mera age 21 hai aur family ke liye 20 hazar ka policy chahiye no disease' },
            { label: 'Case 5: DTMF "1" (Local)', text: '1' },
            { label: 'Case 6: Multi-field (Local)', text: 'I am 34 from Pune, family of 4, budget 20k, no disease' },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleTestPreset(preset.text)}
              className="w-full text-left p-2 rounded-xl bg-bg-surface hover:bg-accent/10 border border-border hover:border-accent/30 transition-all text-xs text-text-muted hover:text-text-primary flex flex-col gap-0.5 cursor-pointer"
            >
              <span className="font-bold text-accent text-[10px]">{preset.label}</span>
              <span className="truncate italic">"{preset.text}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* Session Info */}
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
              <span className="text-text-muted">Session ID</span>
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
    </>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full overflow-hidden"
    >
      {/* ══════════════════════════════════════════════════════════ */}
      {/*  DESKTOP LAYOUT  (md+): 3-column unchanged                */}
      {/* ══════════════════════════════════════════════════════════ */}

      {/* Left panel — desktop only */}
      <div className="hidden md:flex w-[300px] flex-shrink-0 flex-col border-r border-border bg-bg-card/60 overflow-y-auto">
        <ControlPanelContent />
      </div>

      {/* Centre: transcript + mic — desktop */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        <StatusBar status={status} stage={currentStage} model={currentModel} latencyMs={lastLatencyMs} sessionStartTime={sessionStartTime} />
        <TranscriptPanel messages={messages} liveTranscript={liveTranscript} />
        <div className="flex flex-col items-center gap-4 px-6 py-5 border-t border-border bg-bg-card/30">
          <Waveform status={status} hasSession={hasSession} />
          <MicButton status={status} onStart={handleStart} onStop={handleStop} hasSession={hasSession} />
          {liveTranscript && (
            <p className="text-sm text-text-muted italic text-center max-w-md">{liveTranscript}</p>
          )}
        </div>
      </div>

      {/* Right: AI inspector — desktop */}
      <div className="hidden md:flex w-[280px] flex-shrink-0 flex-col border-l border-border bg-bg-card/50">
        <div className="px-4 py-3 border-b border-border bg-bg-card/80">
          <span className="text-sm font-semibold text-text-primary">AI Inspector</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AIInspector lastTurn={lastTurn} />
        </div>
        <DialPad
          phoneNumberInput={phoneNumberInput}
          setPhoneNumberInput={setPhoneNumberInput}
          hasSession={hasSession}
          currentStage={currentStage}
          sendTurn={sendTurn}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  MOBILE LAYOUT  (<md): tabbed single-column               */}
      {/* ══════════════════════════════════════════════════════════ */}

      <div className="md:hidden flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Status bar */}
        <StatusBar status={status} stage={currentStage} model={currentModel} latencyMs={lastLatencyMs} sessionStartTime={sessionStartTime} />

        {/* Mobile tab switcher */}
        <div className="flex border-b border-border bg-bg-card/80 flex-shrink-0">
          {([
            { id: 'chat' as MobileTab, label: 'Chat', icon: Mic },
            { id: 'profile' as MobileTab, label: 'Profile', icon: User },
            { id: 'inspector' as MobileTab, label: 'Inspector', icon: Cpu },
          ] as { id: MobileTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                mobileTab === id
                  ? 'text-accent border-accent'
                  : 'text-text-muted border-transparent hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {/* CHAT tab */}
            {mobileTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TranscriptPanel messages={messages} liveTranscript={liveTranscript} />
                <div className="flex flex-col items-center gap-3 px-4 py-4 border-t border-border bg-bg-card/30 mobile-content-pb">
                  <Waveform status={status} hasSession={hasSession} />
                  <MicButton status={status} onStart={handleStart} onStop={handleStop} hasSession={hasSession} />
                  {liveTranscript && (
                    <p className="text-sm text-text-muted italic text-center">{liveTranscript}</p>
                  )}
                  {/* Inline DialPad for quick text input on mobile */}
                  <div className="w-full">
                    <DialPad
                      phoneNumberInput={phoneNumberInput}
                      setPhoneNumberInput={setPhoneNumberInput}
                      hasSession={hasSession}
                      currentStage={currentStage}
                      sendTurn={sendTurn}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* PROFILE tab */}
            {mobileTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto mobile-content-pb"
              >
                <ControlPanelContent />
              </motion.div>
            )}

            {/* INSPECTOR tab */}
            {mobileTab === 'inspector' && (
              <motion.div
                key="inspector"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto mobile-content-pb"
              >
                <div className="px-4 py-3 border-b border-border bg-bg-card/80">
                  <span className="text-sm font-semibold text-text-primary">AI Inspector</span>
                </div>
                <AIInspector lastTurn={lastTurn} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
