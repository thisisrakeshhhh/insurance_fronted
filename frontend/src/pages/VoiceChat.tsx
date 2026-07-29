import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MicButton } from '@/components/voice/MicButton'
import { TranscriptPanel } from '@/components/voice/TranscriptPanel'
import { StatusBar } from '@/components/voice/StatusBar'
import { Waveform } from '@/components/voice/Waveform'
import { AIInspector } from '@/components/inspector/AIInspector'
import { useVoiceSession, PRESET_OUTBOUND_LEADS } from '@/hooks/useVoiceSession'
import { useVoiceStore } from '@/store'
import { Mic, PhoneOff, Sparkles, Cpu, MessageSquare, Play, HelpCircle, PhoneIncoming, PhoneOutgoing, User, Volume2 } from 'lucide-react'
import { toast } from 'sonner'

type MobileTab = 'chat' | 'inspector'

export function VoiceChat() {
  const {
    startSession,
    stopSession,
    startManualListening,
    sendTurn,
    callDirection,
    setCallDirection,
    selectedLead,
    setSelectedLead,
  } = useVoiceSession()
  const { status, messages, currentStage, currentModel, lastLatencyMs, sessionStartTime, lastTurn, sessionId } = useVoiceStore()

  const [textInput, setTextInput] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')

  const hasSession = !!sessionId

  const handleToggleSession = () => {
    if (!hasSession) {
      startSession()
      toast.success(`${callDirection === 'inbound' ? 'Inbound' : 'Outbound'} voice call started!`)
    } else {
      stopSession()
      toast.info('Call ended')
    }
  }

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!textInput.trim()) return
    if (!hasSession) {
      startSession()
    }
    sendTurn(textInput.trim())
    setTextInput('')
  }

  const handleTestPreset = (text: string) => {
    if (!hasSession) {
      startSession()
      setTimeout(() => sendTurn(text), 700)
    } else {
      sendTurn(text)
    }
  }

  // Pre-configured Client Demo Scenarios
  const clientDemoScenarios = [
    {
      title: 'Buy Family Plan',
      tag: 'Inbound (5 Members)',
      text: 'I am 21 years old with 21k of budget and I need to cover all 5 family members',
      desc: 'Collects data in real-time & calculates family floater quote',
    },
    {
      title: 'Cashless Hospital',
      tag: 'Network Locator',
      text: 'Which cashless network hospitals are available in Mumbai?',
      desc: 'Lists Lilavati & Kokilaben with WhatsApp locator link',
    },
    {
      title: 'Outbound Renewal',
      tag: 'Outbound DB Lead',
      text: 'Yes speaking, I want to renew my Medicare policy',
      desc: 'Fetches Rakesh Kumar details dynamically from DB',
    },
    {
      title: 'File Claim',
      tag: 'Claim Support',
      text: 'I need to submit a cashless claim for hospital admission',
      desc: 'Initiates claim guide & required document checklist',
    },
    {
      title: 'Speak to Advisor',
      tag: 'Human Transfer',
      text: 'Can I connect with a senior health advisor directly?',
      desc: 'Transfers call & updates CRM lead score to HOT',
    },
  ]

  // Interactive Quick Chips
  const quickChips = [
    'I want to buy new policy',
    'Age 21, budget 21k, family of 5',
    'Cashless hospitals in Mumbai',
    'Renew policy POL-882194',
    'Yes, schedule appointment',
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full overflow-hidden">
      {/* ════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT (md+): 3 columns                              */}
      {/* ════════════════════════════════════════════════════════════ */}

      {/* Left panel: Client Demo Scenarios */}
      <div className="hidden md:flex w-[290px] flex-shrink-0 flex-col border-r border-border bg-bg-card/60 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border bg-bg-card/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Client Demo Scenarios</span>
          </div>
          <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">1-Click</span>
        </div>

        {/* Call Direction Mode Switcher */}
        <div className="p-3 border-b border-border/60 bg-bg-surface/50 flex flex-col gap-2">
          <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Select Call Mode:</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-bg-card rounded-xl border border-border">
            <button
              onClick={() => {
                if (!hasSession) setCallDirection('inbound')
              }}
              disabled={hasSession}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                callDirection === 'inbound'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <PhoneIncoming size={13} />
              Inbound
            </button>
            <button
              onClick={() => {
                if (!hasSession) setCallDirection('outbound')
              }}
              disabled={hasSession}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                callDirection === 'outbound'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <PhoneOutgoing size={13} />
              Outbound
            </button>
          </div>

          {/* Outbound Dynamic DB Customer Selector */}
          {callDirection === 'outbound' && (
            <div className="flex flex-col gap-1 mt-1 p-2 rounded-lg bg-purple-950/20 border border-purple-500/30">
              <span className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                <User size={11} /> Outbound DB Target:
              </span>
              <select
                value={selectedLead.phone}
                onChange={(e) => {
                  const found = PRESET_OUTBOUND_LEADS.find((l) => l.phone === e.target.value)
                  if (found) setSelectedLead(found)
                }}
                disabled={hasSession}
                className="w-full bg-bg-card border border-border text-xs rounded-lg px-2 py-1 text-text-primary font-medium focus:outline-none"
              >
                {PRESET_OUTBOUND_LEADS.map((lead) => (
                  <option key={lead.phone} value={lead.phone}>
                    {lead.name} ({lead.city} - {lead.notes})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col gap-2.5">
          {clientDemoScenarios.map((scenario) => (
            <button
              key={scenario.title}
              onClick={() => handleTestPreset(scenario.text)}
              className="w-full text-left p-3 rounded-xl bg-bg-surface hover:bg-accent/10 border border-border hover:border-accent/40 transition-all text-xs text-text-muted hover:text-text-primary flex flex-col gap-1.5 cursor-pointer group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary group-hover:text-accent flex items-center gap-1">
                  <Play size={10} className="text-accent fill-accent" />
                  {scenario.title}
                </span>
                <span className="text-[9px] bg-border px-1.5 py-0.5 rounded text-text-muted font-mono">{scenario.tag}</span>
              </div>
              <span className="text-[11px] text-text-muted italic line-clamp-2">"{scenario.text}"</span>
              <span className="text-[10px] text-accent/80 font-medium">{scenario.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Centre: Transcript & Mic Controls */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        <StatusBar
          status={status}
          stage={currentStage}
          model={currentModel}
          latencyMs={lastLatencyMs}
          sessionStartTime={sessionStartTime}
        />
        <TranscriptPanel messages={messages} liveTranscript="" />

        {/* Quick Option Chips */}
        <div className="px-6 py-2 border-t border-border/50 bg-bg-card/20 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1 flex-shrink-0">
            <HelpCircle size={12} className="text-accent" /> Quick Chips:
          </span>
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleTestPreset(chip)}
              className="flex-shrink-0 text-[11px] px-3 py-1 rounded-full bg-bg-surface hover:bg-accent/15 border border-border hover:border-accent/40 text-text-primary hover:text-accent font-medium transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 px-6 py-3 border-t border-border bg-bg-card/30">
          <Waveform status={status} hasSession={hasSession} />

          {/* Voice Response Status Indicator */}
          {status === 'listening' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Listening to your voice microphone... Speak now
            </div>
          )}
          {status === 'speaking' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <Volume2 size={14} className="animate-bounce" />
              Asha is speaking via ElevenLabs voice...
            </div>
          )}

          <div className="flex items-center gap-4">
            {!hasSession ? (
              <button
                onClick={handleToggleSession}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer ${
                  callDirection === 'inbound'
                    ? 'bg-accent hover:bg-accent-hover text-white shadow-accent/25'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25'
                }`}
              >
                {callDirection === 'inbound' ? <PhoneIncoming size={18} /> : <PhoneOutgoing size={18} />}
                Start {callDirection === 'inbound' ? 'Inbound' : 'Outbound'} Call
              </button>
            ) : (
              <>
                <MicButton status={status} onStart={startManualListening} onStop={stopSession} hasSession={hasSession} />
                <button
                  onClick={stopSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <PhoneOff size={16} />
                  End Call
                </button>
              </>
            )}
          </div>

          {/* Text fallback input */}
          <form onSubmit={handleSendText} className="w-full max-w-md flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Speak with microphone or type a response..."
              className="flex-1 bg-bg-surface border border-border rounded-xl px-3.5 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-bg-surface hover:bg-accent/15 border border-border hover:border-accent text-accent font-bold text-xs rounded-xl transition-all"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: AI Inspector */}
      <div className="hidden md:flex w-[320px] flex-shrink-0 flex-col border-l border-border bg-bg-card/50">
        <div className="px-4 py-3 border-b border-border bg-bg-card/80 flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">AI & CRM Inspector</span>
          <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
            Groq Llama-3.3
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AIInspector lastTurn={lastTurn} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT (<md): Tabbed single column                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex-1 flex flex-col min-w-0 overflow-hidden">
        <StatusBar
          status={status}
          stage={currentStage}
          model={currentModel}
          latencyMs={lastLatencyMs}
          sessionStartTime={sessionStartTime}
        />

        {/* Mobile Tab Switcher */}
        <div className="flex border-b border-border bg-bg-card/80 flex-shrink-0">
          {[
            { id: 'chat' as MobileTab, label: 'Voice & Call', icon: MessageSquare },
            { id: 'inspector' as MobileTab, label: 'AI & CRM Inspector', icon: Cpu },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                mobileTab === id ? 'text-accent border-accent' : 'text-text-muted border-transparent'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Mobile Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {mobileTab === 'chat' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <TranscriptPanel messages={messages} liveTranscript="" />
              <div className="flex flex-col items-center gap-3 px-4 py-3 border-t border-border bg-bg-card/30">
                <Waveform status={status} hasSession={hasSession} />
                {!hasSession ? (
                  <button
                    onClick={handleToggleSession}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs shadow-md"
                  >
                    <Mic size={16} />
                    Start Session
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <MicButton status={status} onStart={startManualListening} onStop={stopSession} hasSession={hasSession} />
                    <button
                      onClick={stopSession}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
                    >
                      End
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendText} className="w-full flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Speak or type..."
                    className="flex-1 bg-bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-accent text-white text-xs font-bold rounded-xl">
                    Send
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <AIInspector lastTurn={lastTurn} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
