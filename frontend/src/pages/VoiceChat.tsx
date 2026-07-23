import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MicButton } from '@/components/voice/MicButton'
import { TranscriptPanel } from '@/components/voice/TranscriptPanel'
import { StatusBar } from '@/components/voice/StatusBar'
import { Waveform } from '@/components/voice/Waveform'
import { AIInspector } from '@/components/inspector/AIInspector'
import { useVoiceSession } from '@/hooks/useVoiceSession'
import { useVoiceStore } from '@/store'
import { useSettingsStore } from '@/store'
import { stageColor } from '@/utils/format'
import { PhoneOff, User, Info } from 'lucide-react'

export function VoiceChat() {
  const { startSession, stopSession, startManualListening } = useVoiceSession()
  const { status, messages, currentCustomer, currentStage, currentModel, lastLatencyMs, sessionStartTime, lastTurn, sessionId } = useVoiceStore()
  const { devPhone } = useSettingsStore()
  const [liveTranscript] = useState('')

  const hasSession = !!sessionId && status !== 'ended'

  const handleStart = () => {
    if (!hasSession || status === 'ended') {
      startSession('outbound', devPhone || '+918567890273')
    } else {
      startManualListening()
    }
  }

  const handleStop = () => {
    stopSession()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full overflow-hidden"
    >
      <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-border bg-bg-card/50 overflow-y-auto">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Customer</span>
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
                <div key={String(k)} className="flex justify-between gap-2">
                  <span className="text-text-muted">{String(k)}</span>
                  <span className="text-text-primary font-medium text-right">{String(v)}</span>
                </div>
              ) : null)}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Start a session to load customer data.</p>
          )}
        </div>

        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Session</span>
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
              End Call
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <StatusBar status={status} stage={currentStage} model={currentModel} latencyMs={lastLatencyMs} sessionStartTime={sessionStartTime} />

        <TranscriptPanel messages={messages} liveTranscript={liveTranscript} />

        <div className="flex flex-col items-center gap-4 px-6 py-5 border-t border-border bg-bg-card/30">
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
