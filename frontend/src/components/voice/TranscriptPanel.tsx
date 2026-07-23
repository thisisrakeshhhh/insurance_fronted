import React, { useRef, useEffect } from 'react'
import { ConversationMessage } from './ConversationMessage'
import type { Message } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  messages: Message[]
  liveTranscript: string
}

export function TranscriptPanel({ messages, liveTranscript }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, liveTranscript])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <ConversationMessage key={msg.id} message={msg} />
        ))}
      </AnimatePresence>

      {liveTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-row-reverse gap-3"
        >
          <div className="max-w-[78%] flex flex-col items-end gap-1">
            <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-accent/10 border border-accent/20 text-text-muted italic">
              {liveTranscript}
              <span className="inline-block w-1.5 h-4 bg-accent ml-1 animate-pulse rounded-sm" />
            </div>
          </div>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
