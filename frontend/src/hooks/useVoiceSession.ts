import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { sendChat, type ChatContractResponse } from '@/api/worker'
import { useVoiceStore, useSettingsStore } from '@/store'
import { useSpeech } from './useSpeech'
import type { Message, TurnResponse } from '@/types'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function useVoiceSession() {
  const store = useVoiceStore()
  const settings = useSettingsStore()
  const speech = useSpeech()
  
  const listeningRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [wantsHumanBanner, setWantsHumanBanner] = useState(false)
  const [isEnded, setIsEnded] = useState(false)

  const addMsg = useCallback(
    (role: Message['role'], text: string, extras: Partial<Message> = {}) => {
      store.addMessage({ id: makeId(), role, text, timestamp: Date.now(), ...extras })
    },
    [store]
  )

  const sendTurn = useCallback(
    async (text: string) => {
      if (isEnded) return
      listeningRef.current = false
      speech.stopListening()
      speech.stopSpeaking()

      addMsg('customer', text)
      store.setStatus('thinking')
      setIsTyping(true)

      const activeSessionId = sessionIdRef.current || store.sessionId

      try {
        const res: ChatContractResponse = await sendChat(activeSessionId, text)
        
        // Persist sessionId across the whole session
        sessionIdRef.current = res.sessionId
        store.setSessionId(res.sessionId)
        
        setIsTyping(false)

        const turnObj: TurnResponse = {
          reply: res.reply,
          intent: res.intent || 'buy_policy',
          action: res.stage,
          latencyMs: res.latencyMs || 0,
          customer: res.customer,
          missingFields: res.missingFields,
          quote: res.quote,
          stage: res.stage,
          wantsHuman: res.wantsHuman,
          ended: res.ended,
        }

        store.setLastTurn(turnObj)
        if (res.latencyMs) store.setLastLatencyMs(res.latencyMs)
        if (res.stage) store.setCurrentStage(res.stage)

        addMsg('asha', res.reply, {
          latencyMs: res.latencyMs,
          intent: res.intent,
          action: res.stage,
        })

        if (res.wantsHuman) {
          setWantsHumanBanner(true)
        }

        if (res.ended) {
          setIsEnded(true)
          store.setStatus('idle')
          toast.info('Call has completed. Thank you!')
          return
        }

        if (settings.autoSpeak) {
          store.setStatus('speaking')
          speech.speak(res.reply, () => {
            if (settings.continuousListening && !res.ended) {
              startListeningLoop()
            } else {
              store.setStatus('idle')
            }
          })
        } else {
          if (settings.continuousListening && !res.ended) {
            startListeningLoop()
          } else {
            store.setStatus('idle')
          }
        }
      } catch (err) {
        setIsTyping(false)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`Chat error: ${msg}`)
        store.setStatus('error')
        addMsg('system', `Error: ${msg}`)
      }
    },
    [store, settings, speech, addMsg, isEnded]
  )

  const startListeningLoop = useCallback(() => {
    if (isEnded) return
    listeningRef.current = true
    store.setStatus('listening')

    speech.startListening(
      async (text, isFinal) => {
        if (!isFinal || !listeningRef.current) return
        listeningRef.current = false
        speech.stopListening()
        await sendTurn(text)
      },
      () => {
        if (listeningRef.current && useVoiceStore.getState().status === 'listening' && !isEnded) {
          setTimeout(() => {
            startListeningLoop()
          }, 300)
        }
      }
    )
  }, [store, speech, sendTurn, isEnded])

  const startSession = useCallback(async () => {
    store.resetSession()
    sessionIdRef.current = null
    setIsEnded(false)
    setWantsHumanBanner(false)
    setIsTyping(true)
    store.setStatus('thinking')

    try {
      // First call to /chat with empty sessionId to initialize backend conversation state
      const res: ChatContractResponse = await sendChat(null, '')
      
      sessionIdRef.current = res.sessionId
      store.setSessionId(res.sessionId)
      store.setSessionStartTime(Date.now())
      store.setCurrentStage(res.stage)
      setIsTyping(false)

      const greeting = res.reply || 'Hello! Welcome to TATA AIG Health Insurance. How can I help you today?'
      addMsg('asha', greeting)

      if (settings.autoSpeak) {
        store.setStatus('speaking')
        speech.speak(greeting, () => {
          startListeningLoop()
        })
      } else {
        startListeningLoop()
      }
    } catch (e) {
      setIsTyping(false)
      store.setStatus('error')
      toast.error('Failed to initialize session with backend.')
    }
  }, [store, settings, speech, addMsg, startListeningLoop])

  const stopSession = useCallback(() => {
    listeningRef.current = false
    speech.stopListening()
    speech.stopSpeaking()
    store.setStatus('idle')
    setIsEnded(true)
  }, [speech, store])

  const startManualListening = useCallback(() => {
    listeningRef.current = false
    speech.stopListening()
    startListeningLoop()
  }, [speech, startListeningLoop])

  return {
    startSession,
    stopSession,
    sendTurn,
    startManualListening,
    isTyping,
    wantsHumanBanner,
    isEnded,
  }
}
