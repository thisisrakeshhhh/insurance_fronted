import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MicButton } from '@/components/voice/MicButton'
import { TranscriptPanel } from '@/components/voice/TranscriptPanel'
import { StatusBar } from '@/components/voice/StatusBar'
import { Waveform } from '@/components/voice/Waveform'
import { AIInspector } from '@/components/inspector/AIInspector'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useVoiceStore } from '@/store'
import { Mic, PhoneOff, Sparkles, Cpu, MessageSquare, Play, HelpCircle, Volume2 } from 'lucide-react'
import { toast } from 'sonner'

type MobileTab = 'chat' | 'inspector'

export function VoiceChat() {
  const {
    startSession,
    stopSession,
    startManualListening,
    sendTurn,
    isTyping,
    wantsHumanBanner,
    isEnded,
  } = useVoiceSession()
  const { status, messages, currentStage, currentModel, lastLatencyMs, sessionStartTime, lastTurn, sessionId } = useVoiceStore()

  const [textInput, setTextInput] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')

  const hasSession = !!sessionId

  const handleToggleSession = () => {
    if (!hasSession || isEnded) {
      startSession()
      toast.success('Voice session started')
    } else {
      stopSession()
      toast.info('Call ended')
    }
  }

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!textInput.trim()) return
    if (!hasSession || isEnded) {
      startSession()
    }
    sendTurn(textInput.trim())
    setTextInput('')
  }

  const handleTestPreset = (text: string) => {
    if (!hasSession || isEnded) {
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
      tag: 'Family (5 Members)',
      text: 'I am 21 years old with 21k of budget and I need to cover all 5 family members',
      desc: 'Triggers instant family floater quote & 80D tax benefits',
    },
    {
      title: 'Cashless Hospital',
      tag: '7000+ Hospitals',
      text: 'Which cashless network hospitals are available in Mumbai?',
      desc: 'Lists Lilavati & Kokilaben with WhatsApp locator link',
    },
    {
      title: 'Policy Renewal',
      tag: 'Direct Link',
      text: 'I want to renew my TATA AIG policy number 987654321',
      desc: 'Checks eligibility & sends WhatsApp payment link',
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
      desc: 'Transfers call to specialist & flags lead score',
    },
  ]

  // Interactive Quick Response Chips
  const quickChips = [
    'I want to buy new policy',
    'Age 21, budget 21k, family of 5',
    'Cashless hospitals in Mumbai',
    'Renew policy 987654321',
    'Yes, schedule appointment',
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full overflow-hidden">
      {/* ════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT (md+): 3 columns                              */}
      {/* ════════════════════════════════════════════════════════════ */}

      {/* Left panel: Client Demo Scenarios */}
      <div className="hidden md:flex w-[280px] flex-shrink-0 flex-col border-r border-border bg-bg-card/60 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border bg-bg-card/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Client Demo Scenarios</span>
          </div>
          <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">1-Click</span>
        </div>

        <div className="p-3.5 flex flex-col gap-2.5">
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
        <TranscriptPanel
          messages={messages}
          liveTranscript=""
          isTyping={isTyping}
          wantsHumanBanner={wantsHumanBanner}
          isEnded={isEnded}
          currentStage={currentStage}
          lastTurn={lastTurn}
        />

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
          <Waveform status={status} hasSession={hasSession && !isEnded} />

          {/* Voice Response Status Indicator */}
          {status === 'listening' && !isEnded && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Listening to microphone... Speak now
            </div>
          )}
          {status === 'speaking' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <Volume2 size={14} className="animate-bounce" />
              Asha is speaking via ElevenLabs TTS...
            </div>
          )}

          <div className="flex items-center gap-4">
            {!hasSession || isEnded ? (
              <button
                onClick={handleToggleSession}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-lg shadow-accent/25 transition-all cursor-pointer"
              >
                <Mic size={18} />
                Start Voice Session
              </button>
            ) : (
              <>
                <MicButton status={status} onStart={startManualListening} onStop={stopSession} hasSession={hasSession} />
                <button
                  onClick={stopSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <PhoneOff size={16} />
                  End Session
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
            { id: 'chat' as MobileTab, label: 'Voice & Chat', icon: MessageSquare },
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
              <TranscriptPanel
                messages={messages}
                liveTranscript=""
                isTyping={isTyping}
                wantsHumanBanner={wantsHumanBanner}
                isEnded={isEnded}
                currentStage={currentStage}
                lastTurn={lastTurn}
              />
              <div className="flex flex-col items-center gap-3 px-4 py-3 border-t border-border bg-bg-card/30">
                <Waveform status={status} hasSession={hasSession && !isEnded} />
                {!hasSession || isEnded ? (
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
