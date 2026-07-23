import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square, Brain } from 'lucide-react'
import type { VoiceStatus } from '@/types'

interface Props {
  status: VoiceStatus
  onStart: () => void
  onStop: () => void
  hasSession: boolean
}

export function MicButton({ status, onStart, onStop, hasSession }: Props) {
  const isListening = status === 'listening'
  const isThinking = status === 'thinking'
  const isSpeaking = status === 'speaking'
  const isConnecting = status === 'connecting'
  const isEnded = status === 'ended'

  const handleClick = () => {
    if (isListening || isThinking || isSpeaking) {
      onStop()
    } else {
      onStart()
    }
  }

  const getLabel = () => {
    if (isConnecting) return 'Connecting...'
    if (isListening) return 'Listening...'
    if (isThinking) return 'Processing...'
    if (isSpeaking) return 'Asha speaking...'
    if (isEnded) return 'Start new call'
    if (hasSession) return 'Tap to speak'
    return 'Start call'
  }

  const getIcon = () => {
    if (isThinking) return <Brain size={32} className="text-white" />
    if (isEnded) return <MicOff size={32} className="text-gray-300" />
    return <Mic size={32} className="text-white" />
  }

  const getRingClass = () => {
    if (isListening) return 'ring-4 ring-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.5)]'
    if (isThinking) return 'ring-4 ring-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.5)]'
    if (isSpeaking) return 'ring-4 ring-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
    if (isConnecting) return 'ring-4 ring-yellow-500/40'
    return 'ring-2 ring-white/10 hover:ring-accent/50'
  }

  const getBgClass = () => {
    if (isListening) return 'bg-blue-600'
    if (isThinking) return 'bg-violet-600'
    if (isSpeaking) return 'bg-emerald-600'
    if (isEnded) return 'bg-accent hover:bg-accent-hover'
    return 'bg-accent hover:bg-accent-hover'
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onClick={handleClick}
        disabled={isConnecting}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer disabled:cursor-not-allowed ${getBgClass()} ${getRingClass()}`}
        whileTap={{ scale: 0.94 }}
        whileHover={!isConnecting ? { scale: 1.04 } : {}}
      >
        <AnimatePresence mode="wait">
          {isListening && (
            <motion.div
              key="pulse"
              className="absolute inset-0 rounded-full bg-blue-500/30"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {isThinking && (
            <motion.div
              key="spin"
              className="absolute inset-0 rounded-full border-2 border-violet-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {isSpeaking && (
            <motion.div
              key="wave"
              className="absolute inset-0 rounded-full bg-emerald-500/20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
        <motion.div key={status} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          {getIcon()}
        </motion.div>
      </motion.button>

      <p className="text-sm font-medium text-text-muted tracking-wide">{getLabel()}</p>

      {(isListening || isThinking || isSpeaking) && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-xs hover:bg-danger/20 transition-colors"
        >
          <Square size={12} />
          Stop
        </motion.button>
      )}
    </div>
  )
}
