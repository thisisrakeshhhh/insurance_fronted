import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { startBrowserSession, sendBrowserTurn } from '@/api/worker'
import { useVoiceStore, useSettingsStore } from '@/store'
import { useSpeech } from './useSpeech'
import type { Message } from '@/types'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function useVoiceSession() {
  const store = useVoiceStore()
  const settings = useSettingsStore()
  const speech = useSpeech()
  const listeningRef = useRef(false)
  const startingRef = useRef(false)

  const addMsg = useCallback(
    (role: Message['role'], text: string, extras: Partial<Message> = {}) => {
      store.addMessage({ id: makeId(), role, text, timestamp: Date.now(), ...extras })
    },
    [store]
  )

  const startListeningLoop = useCallback(() => {
    if (store.status === 'ended' || store.status === 'error') return
    listeningRef.current = true
    store.setStatus('listening')

    speech.startListening(async (text, isFinal, confidence) => {
      if (!isFinal || !listeningRef.current) return
      listeningRef.current = false
      speech.stopListening()

      addMsg('customer', text, { confidence })
      store.setStatus('thinking')

      const sid = useVoiceStore.getState().sessionId
      if (!sid) return

      try {
        const turn = await sendBrowserTurn(sid, text)
        store.setLastTurn(turn)
        store.setLastLatencyMs(turn.latencyMs)
        store.setCurrentCustomer(turn.customer)
        store.setCurrentStage(turn.stage)
        store.setCurrentModel(turn.model)

        addMsg('asha', turn.spokenResponse, { latencyMs: turn.latencyMs, stage: turn.stage })

        if (turn.ended) {
          store.setStatus('ended')
          if (settings.autoSpeak) {
            speech.speak(turn.spokenResponse)
          }
          return
        }

        if (settings.autoSpeak) {
          store.setStatus('speaking')
          speech.speak(turn.spokenResponse, () => {
            if (settings.continuousListening) {
              startListeningLoop()
            } else {
              store.setStatus('idle')
            }
          })
        } else {
          if (settings.continuousListening) {
            startListeningLoop()
          } else {
            store.setStatus('idle')
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`Asha error: ${msg}`)
        store.setStatus('error')
        addMsg('system', `Error: ${msg}`)
      }
    })
  }, [store, speech, addMsg, settings])

  const startSession = useCallback(async (direction: 'outbound' | 'inbound' = 'outbound', phone?: string) => {
    if (startingRef.current) return
    startingRef.current = true
    store.resetSession()
    store.setStatus('connecting')
    try {
      const session = await startBrowserSession(direction, phone || settings.devPhone)
      store.setSessionId(session.sessionId)
      store.setCurrentStage(session.stage)
      store.setCurrentModel(session.model)
      store.setCurrentCustomer(session.customer)
      store.setSessionStartTime(Date.now())

      addMsg('asha', session.greeting, { stage: session.stage })

      if (settings.autoSpeak) {
        store.setStatus('speaking')
        speech.speak(session.greeting, () => {
          startListeningLoop()
        })
      } else {
        startListeningLoop()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to start session: ${msg}`)
      store.setStatus('error')
    } finally {
      startingRef.current = false
    }
  }, [store, settings, speech, addMsg, startListeningLoop])

  const stopSession = useCallback(() => {
    listeningRef.current = false
    speech.stopListening()
    speech.stopSpeaking()
    store.setStatus('ended')
  }, [speech, store])

  const sendTurn = useCallback(async (text: string) => {
    const sid = useVoiceStore.getState().sessionId
    if (!sid) return
    addMsg('customer', text)
    store.setStatus('thinking')
    try {
      const turn = await sendBrowserTurn(sid, text)
      store.setLastTurn(turn)
      store.setLastLatencyMs(turn.latencyMs)
      store.setCurrentCustomer(turn.customer)
      store.setCurrentStage(turn.stage)
      store.setCurrentModel(turn.model)
      addMsg('asha', turn.spokenResponse, { latencyMs: turn.latencyMs, stage: turn.stage })
      if (turn.ended) {
        store.setStatus('ended')
      } else if (settings.autoSpeak) {
        store.setStatus('speaking')
        speech.speak(turn.spokenResponse, () => store.setStatus('idle'))
      } else {
        store.setStatus('idle')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(msg)
      store.setStatus('error')
    }
  }, [store, settings, speech, addMsg])

  const startManualListening = useCallback(() => {
    if (store.status === 'listening' || store.status === 'thinking') return
    startListeningLoop()
  }, [store.status, startListeningLoop])

  const toggleMute = useCallback(() => {
    store.setMuted(!store.isMuted)
    if (!store.isMuted) {
      speech.stopSpeaking()
    }
  }, [store, speech])

  return {
    startSession,
    stopSession,
    sendTurn,
    startManualListening,
    toggleMute,
    isStarting: startingRef.current,
  }
}
