import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { startBrowserSession, sendBrowserTurn, makeTestCall } from '@/api/worker'
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
    const currentStatus = useVoiceStore.getState().status
    if (currentStatus === 'ended' || currentStatus === 'error') return

    listeningRef.current = true
    store.setStatus('listening')

    speech.startListening(
      async (text, isFinal, confidence) => {
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
              const latestStatus = useVoiceStore.getState().status
              if (latestStatus !== 'ended' && latestStatus !== 'error') {
                if (settings.continuousListening) {
                  startListeningLoop()
                } else {
                  store.setStatus('idle')
                }
              }
            })
          } else {
            const latestStatus = useVoiceStore.getState().status
            if (latestStatus !== 'ended' && latestStatus !== 'error') {
              if (settings.continuousListening) {
                startListeningLoop()
              } else {
                store.setStatus('idle')
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          toast.error(`Asha error: ${msg}`)
          store.setStatus('error')
          addMsg('system', `Error: ${msg}`)
        }
      },
      () => {
        // onSilence callback: if recognition ended due to silence, automatically re-arm if call is active
        const latestStatus = useVoiceStore.getState().status
        if (listeningRef.current && latestStatus === 'listening') {
          setTimeout(() => {
            const s = useVoiceStore.getState().status
            if (s !== 'ended' && s !== 'error') {
              startListeningLoop()
            }
          }, 300)
        }
      }
    )
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
      toast.error(msg)
      store.setStatus('error')
    }
  }, [store, settings, speech, addMsg, startListeningLoop])

  const startManualListening = useCallback(() => {
    listeningRef.current = false
    speech.stopListening()
    startListeningLoop()
  }, [speech, startListeningLoop])

  const toggleMute = useCallback(() => {
    store.setMuted(!store.isMuted)
    if (!store.isMuted) {
      speech.stopSpeaking()
    }
  }, [store, speech])

  const triggerPhoneCall = useCallback(async (phone: string) => {
    if (!phone) {
      toast.error('Please enter a valid phone number')
      return
    }
    store.setStatus('connecting')
    toast.info(`Initiating phone call to ${phone}...`)
    try {
      const res = await makeTestCall(phone)
      if (res.success && res.callSid) {
        toast.success(`Call placed! SID: ${res.callSid}`)
        store.setSessionId(res.callSid)
        store.setStatus('speaking')
        addMsg('system', `Outbound Twilio call placed to ${phone} (CallSid: ${res.callSid})`)
      } else {
        const errorMsg = res.error || 'Failed to place call'
        toast.error(errorMsg)
        store.setStatus('error')
        addMsg('system', `Call Error: ${errorMsg}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Call failed'
      toast.error(`Call failed: ${msg}`)
      store.setStatus('error')
      addMsg('system', `Call Error: ${msg}`)
    }
  }, [store, addMsg])

  return {
    startSession,
    stopSession,
    sendTurn,
    startManualListening,
    toggleMute,
    triggerPhoneCall,
    isStarting: startingRef.current,
  }
}
