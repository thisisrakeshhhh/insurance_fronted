import React, { useRef, useEffect, useState } from 'react'
import { ConversationMessage } from './ConversationMessage'
import type { Message } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, ChevronDown, ChevronUp, Cpu, PhoneForwarded, CheckCircle2 } from 'lucide-react'

interface Props {
  messages: Message[]
  liveTranscript: string
  isTyping?: boolean
  wantsHumanBanner?: boolean
  isEnded?: boolean
  currentStage?: string
  lastTurn?: any
}

export function TranscriptPanel({
  messages,
  liveTranscript,
  isTyping = false,
  wantsHumanBanner = false,
  isEnded = false,
  currentStage = 'welcome',
  lastTurn = null,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [debugOpen, setDebugOpen] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveTranscript, isTyping])

  const missingFields = lastTurn?.missingFields || []

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-main/30 relative">
      {/* Small Collapsible Debug Drawer */}
      <div className="border-b border-border/60 bg-bg-card/90 backdrop-blur-md z-10">
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="w-full px-4 py-1.5 flex items-center justify-between text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Cpu size={12} className="text-accent" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">State Machine Inspector</span>
            <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.2 rounded font-mono font-bold text-[10px]">
              Stage: {currentStage}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-muted font-mono">
              Missing: {missingFields.length > 0 ? missingFields.join(', ') : 'None'}
            </span>
            {debugOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        <AnimatePresence>
          {debugOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2.5 border-t border-border/40 text-xs flex flex-wrap gap-4 bg-bg-surface/50 overflow-hidden"
            >
              <div>
                <span className="text-text-muted font-semibold">Active Stage: </span>
                <code className="text-accent font-mono">{currentStage}</code>
              </div>
              <div>
                <span className="text-text-muted font-semibold">Missing Fields: </span>
                <span className="text-amber-400 font-mono">
                  {missingFields.length > 0 ? JSON.stringify(missingFields) : '[] (Ready)'}
                </span>
              </div>
              {lastTurn?.intent && (
                <div>
                  <span className="text-text-muted font-semibold">Detected Intent: </span>
                  <span className="text-emerald-400 font-mono">{lastTurn.intent}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Wants Human Transfer Banner */}
      {wantsHumanBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-2 font-bold">
            <PhoneForwarded size={16} className="text-purple-400 animate-bounce" />
            Connecting to Human Health Specialist...
          </div>
          <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded font-mono">Advisor Routed</span>
        </motion.div>
      )}

      {/* Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ConversationMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Live Microphone Interim Speech Bubble */}
        {liveTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-row-reverse gap-3"
          >
            <div className="max-w-[78%] flex flex-col items-end gap-1">
              <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-accent/15 border border-accent/30 text-text-primary italic shadow-sm">
                {liveTranscript}
                <span className="inline-block w-1.5 h-4 bg-accent ml-1 animate-pulse rounded-sm" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Bouncing Dots Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex gap-3 items-end"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot size={16} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-bg-card border border-border/80 text-text-primary flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 rounded-full bg-accent animate-bounce"></span>
            </div>
          </motion.div>
        )}

        {/* Call Ended Banner */}
        {isEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center my-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={14} />
              Voice Session Completed & Summary Saved
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
