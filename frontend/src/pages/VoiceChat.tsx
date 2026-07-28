import React, { useState, useEffect } from 'react'
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
import {
  PhoneOff, User, Info, Phone, Mic, PhoneCall, Sparkles, Cpu,
  PhoneIncoming, PhoneOutgoing, Hash, Volume2, VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'

type MobileTab = 'chat' | 'profile' | 'inspector'

const LEAD_TIER_COLORS: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400 border-red-500/40',
  warm: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  cold: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  dead: 'bg-zinc-600/30 text-zinc-400 border-zinc-600/40',
}

const DTMF_LABELS: Record<string, string> = {
  '1': '1 - Buy Policy',
  '2': '2 - Renew',
  '3': '3 - Claims',
  '4': '4 - Hospital',
  '5': '5 - Talk to Agent',
}

export function VoiceChat() {
  const {
    startSession, stopSession, startManualListening,
    sendTurn, triggerPhoneCall, clearCustomerProfile,
  } = useVoiceSession()

  const {
    status, messages, currentCustomer, currentStage, currentModel,
    lastLatencyMs, sessionStartTime, lastTurn, sessionId,
    callDirection, callGreeting, setCallDirection,
  } = useVoiceStore()

  const { devPhone } = useSettingsStore()

  const [phoneNumberInput, setPhoneNumberInput] = useState('')
  const [liveTranscript] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')

  const hasSession = !!sessionId && status !== 'ended'
  const isActive = hasSession && status !== 'ended' && status !== 'error'

  // Lead tier from last turn
  const leadTier = lastTurn?.leadTier || null

  // Direction config
  const isOutbound = callDirection === 'outbound'
  const isInbound = callDirection === 'inbound'

  const handleSwitchDirection = (dir: 'inbound' | 'outbound') => {
    if (isActive) {
      toast.warning('End the current session before switching modes.')
      return
    }
    setCallDirection(dir)
    toast.info(`Switched to ${dir === 'inbound' ? '📞 Inbound' : '📤 Outbound'} mode`)
  }

  const handleStartInbound = () => {
    startSession('inbound', '+916000000000')
  }

  const handleStartOutbound = () => {
    startSession('outbound', phoneNumberInput || devPhone || '+918567890273')
  }

  const handleEndCall = () => {
    stopSession()
    toast.success('Call ended.')
  }

  const handleDialCall = () => {
    if (phoneNumberInput) {
      triggerPhoneCall(phoneNumberInput)
    } else {
      toast.error('Enter a phone number first')
    }
  }

  const handleTestPreset = async (text: string) => {
    if (!hasSession) {
      try {
        toast.info('Starting session first...')
        await startSession(callDirection, phoneNumberInput || devPhone || '+918567890273')
        setTimeout(() => sendTurn(text), 1200)
      } catch {
        toast.error('Failed to start session for test preset')
      }
    } else {
      sendTurn(text)
    }
  }

  const handleDtmf = (digit: string) => {
    if (!hasSession) {
      toast.error('Start a session first')
      return
    }
    sendTurn(digit)
  }

  // ── Mode Selector Banner ──────────────────────────────────────────────────
  const ModeSelector = () => (
    <div className="px-4 pt-4 pb-3 border-b border-border bg-bg-card/80">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">Call Mode</p>
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-bg-surface rounded-xl border border-border">
        <button
          onClick={() => handleSwitchDirection('inbound')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            isInbound
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <PhoneIncoming size={13} />
          Inbound
        </button>
        <button
          onClick={() => handleSwitchDirection('outbound')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            isOutbound
              ? 'bg-accent text-white shadow-md shadow-accent/30'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
          }`}
        >
          <PhoneOutgoing size={13} />
          Outbound
        </button>
      </div>

      {/* Dynamic greeting preview from DB */}
      {callGreeting && !hasSession && (
        <div className="mt-2 px-2 py-1.5 rounded-lg bg-accent/5 border border-accent/20 text-[10px] text-text-muted leading-relaxed">
          <span className="text-accent font-bold">Greeting preview: </span>
          "{callGreeting}"
        </div>
      )}
    </div>
  )

  // ── Inbound Panel ─────────────────────────────────────────────────────────
  const InboundPanel = () => (
    <div className="px-4 py-4 border-b border-border bg-emerald-500/5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2">
        <PhoneIncoming size={14} />
        <span>Inbound Simulation</span>
      </div>
      <p className="text-xs text-text-muted mb-3 leading-relaxed">
        Simulates a customer calling in. Asha responds with dynamic greeting from DB.
      </p>

      {/* DTMF Keypad */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">DTMF Menu</p>
      <div className="grid grid-cols-5 gap-1 mb-3">
        {Object.entries(DTMF_LABELS).map(([digit, label]) => (
          <button
            key={digit}
            onClick={() => handleDtmf(digit)}
            title={label}
            disabled={!hasSession}
            className={`flex items-center justify-center h-9 rounded-lg text-sm font-bold border transition-all ${
              hasSession
                ? 'bg-bg-surface border-border hover:bg-accent/15 hover:border-accent text-text-primary cursor-pointer'
                : 'bg-bg-surface/40 border-border/30 text-text-muted cursor-not-allowed opacity-50'
            }`}
          >
            {digit}
          </button>
        ))}
      </div>

      {!hasSession ? (
        <button
          onClick={handleStartInbound}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
        >
          <PhoneIncoming size={14} />
          Simulate Inbound Call
        </button>
      ) : (
        <button
          onClick={handleEndCall}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <PhoneOff size={14} />
          End Call
        </button>
      )}
    </div>
  )

  // ── Outbound Panel ────────────────────────────────────────────────────────
  const OutboundPanel = () => (
    <div className="px-4 py-4 border-b border-border bg-accent/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <PhoneOutgoing size={14} className="text-accent" />
          <span>Outbound Call</span>
        </div>
        {leadTier && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${LEAD_TIER_COLORS[leadTier] || LEAD_TIER_COLORS.cold}`}>
            {leadTier.toUpperCase()} LEAD
          </span>
        )}
      </div>

      {/* Outbound permission beat indicator */}
      {hasSession && currentStage === 'welcome' && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 leading-snug">
          <span className="font-bold block mb-0.5">⏳ Permission Step Active</span>
          Asha is asking: "Is now an okay time to talk?" — wait for customer response before proceeding.
        </div>
      )}

      {/* Phone number input */}
      <input
        type="tel"
        value={phoneNumberInput}
        onChange={(e) => setPhoneNumberInput(e.target.value)}
        placeholder="+91 98765 43210"
        disabled={hasSession}
        className="w-full bg-bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors mb-2 disabled:opacity-50"
      />

      <div className="flex gap-2 mb-2">
        {['+919876543210', '+919988776655'].map((num) => (
          <button
            key={num}
            onClick={() => setPhoneNumberInput(num)}
            disabled={hasSession}
            className="flex-1 py-1 rounded bg-bg-surface border border-border hover:border-accent text-[10px] font-mono text-text-muted hover:text-text-primary transition-all disabled:opacity-40"
          >
            {num.slice(-4)}
          </button>
        ))}
      </div>

      {!hasSession ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleStartOutbound}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md shadow-accent/20 transition-all cursor-pointer"
          >
            <Mic size={14} />
            Web Voice Session
          </button>
          <button
            onClick={handleDialCall}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
          >
            <Phone size={14} />
            Twilio Phone Call
          </button>
        </div>
      ) : (
        <button
          onClick={handleEndCall}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <PhoneOff size={14} />
          End Call
        </button>
      )}
    </div>
  )

  // ── Shared Control Panel ──────────────────────────────────────────────────
  const ControlPanelContent = () => (
    <>
      <ModeSelector />
      {isInbound ? <InboundPanel /> : <OutboundPanel />}

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
          <span className="text-sm font-semibold text-text-primary">Quick Test Phrases</span>
        </div>
        <div className="flex flex-col gap-2">
          {(isInbound ? [
            { label: 'Intent: Buy Policy', text: 'I want to buy a health insurance policy' },
            { label: 'Intent: Claim', text: 'I need to file a claim' },
            { label: 'Intent: Renewal', text: 'I want to renew my policy' },
            { label: 'Age (SLOT_FILL)', text: 'my age is 34' },
            { label: 'DTMF "1" (Local)', text: '1' },
            { label: 'Talk to Agent', text: 'transfer me to a human' },
          ] : [
            { label: 'Permission: Yes', text: 'yes this is a good time' },
            { label: 'Buy Policy', text: 'I want to buy a policy' },
            { label: 'Age 21 (SLOT_FILL)', text: 'my age is 21' },
            { label: 'Multi-field (Local)', text: 'I am 34 from Pune, family of 4, budget 20k' },
            { label: 'Hindi (Gemini)', text: 'mera age 21 hai aur family ke liye 20 hazar ka policy chahiye' },
            { label: 'Objection', text: 'your premiums seem too expensive' },
          ]).map((preset) => (
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
            <span className="text-text-muted">Mode</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isInbound ? 'bg-emerald-500/15 text-emerald-400' : 'bg-accent/15 text-accent'}`}>
              {callDirection}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Stage</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${stageColor(currentStage)}`}>{currentStage || 'idle'}</span>
          </div>
          {lastTurn?.detectedIntent && (
            <div className="flex justify-between">
              <span className="text-text-muted">Intent</span>
              <span className="text-text-primary font-mono text-[10px]">{lastTurn.detectedIntent}</span>
            </div>
          )}
          {sessionId && (
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Session ID</span>
              <span className="text-text-primary font-mono text-right truncate max-w-[120px]">{sessionId.slice(0, 12)}…</span>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full overflow-hidden"
    >
      {/* ════════════════════════════════════════════════════════════ */}
      {/*  DESKTOP LAYOUT  (md+): 3-column                           */}
      {/* ════════════════════════════════════════════════════════════ */}

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

          {/* Big End Call button when active */}
          {isActive ? (
            <div className="flex items-center gap-4">
              <MicButton status={status} onStart={startManualListening} onStop={handleEndCall} hasSession={hasSession} />
              <button
                onClick={handleEndCall}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
              >
                <PhoneOff size={16} />
                End Call
              </button>
            </div>
          ) : (
            <MicButton
              status={status}
              onStart={() => isInbound ? handleStartInbound() : handleStartOutbound()}
              onStop={handleEndCall}
              hasSession={hasSession}
            />
          )}

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

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  MOBILE LAYOUT  (<md): tabbed single-column                */}
      {/* ════════════════════════════════════════════════════════════ */}

      <div className="md:hidden flex-1 flex flex-col min-w-0 overflow-hidden">
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

                  {isActive ? (
                    <div className="flex items-center gap-3">
                      <MicButton status={status} onStart={startManualListening} onStop={handleEndCall} hasSession={hasSession} />
                      <button
                        onClick={handleEndCall}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <PhoneOff size={14} />
                        End
                      </button>
                    </div>
                  ) : (
                    <MicButton
                      status={status}
                      onStart={() => isInbound ? handleStartInbound() : handleStartOutbound()}
                      onStop={handleEndCall}
                      hasSession={hasSession}
                    />
                  )}

                  {liveTranscript && (
                    <p className="text-sm text-text-muted italic text-center">{liveTranscript}</p>
                  )}
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
