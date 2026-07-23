import React from 'react'
import { motion } from 'framer-motion'
import type { Message } from '@/types'
import { formatTime } from '@/utils/format'
import { Bot, User } from 'lucide-react'

interface Props {
  message: Message
}

export function ConversationMessage({ message }: Props) {
  const isAsha = message.role === 'asha'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <span className="text-xs text-text-muted px-3 py-1 rounded-full bg-bg-surface border border-border">
          {message.text}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isAsha ? 'flex-row' : 'flex-row-reverse'}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAsha ? 'bg-accent' : 'bg-bg-surface border border-border'}`}>
        {isAsha ? <Bot size={16} className="text-white" /> : <User size={16} className="text-text-muted" />}
      </div>

      <div className={`max-w-[78%] ${isAsha ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isAsha
          ? 'bg-bg-card border border-border text-text-primary rounded-tl-sm'
          : 'bg-accent/20 border border-accent/30 text-text-primary rounded-tr-sm'
        }`}>
          {message.text}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted px-1">
          <span>{formatTime(message.timestamp)}</span>
          {message.latencyMs && message.latencyMs > 0 && (
            <span className="text-accent">{message.latencyMs}ms</span>
          )}
          {message.confidence !== undefined && (
            <span>conf: {(message.confidence * 100).toFixed(0)}%</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
