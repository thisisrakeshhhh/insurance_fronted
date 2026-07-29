import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { startBrowserSession, sendBrowserTurn } from '@/api/worker'
import { useVoiceStore, useSettingsStore } from '@/store'
import { useSpeech } from './useSpeech'
import type { Message, TurnResponse } from '@/types'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export interface OutboundLead {
  name: string
  phone: string
  age: number
  city: string
  existing_insurer?: string
  renewal_date?: string
  policy_number?: string
  notes?: string
}

export const PRESET_OUTBOUND_LEADS: OutboundLead[] = [
  {
    name: 'Rakesh Kumar',
    phone: '+919876543210',
    age: 32,
    city: 'Mumbai',
    existing_insurer: 'TATA AIG Health',
    renewal_date: '15th August',
    policy_number: 'POL-882194',
    notes: 'Medicare Family Floater renewal due soon',
  },
  {
    name: 'Anita Sharma',
    phone: '+919812345678',
    age: 45,
    city: 'Delhi',
    existing_insurer: 'Star Health',
    renewal_date: '1st September',
    policy_number: 'POL-441029',
    notes: 'Porting inquiry to TATA AIG Senior Citizen cover',
  },
  {
    name: 'Vikram Patel',
    phone: '+919711223344',
    age: 28,
    city: 'Pune',
    existing_insurer: 'None',
    notes: 'New family insurance lead requested callback',
  },
]

export function useVoiceSession() {
  const store = useVoiceStore()
  const settings = useSettingsStore()
  const speech = useSpeech()
  const listeningRef = useRef(false)
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('inbound')
  const [selectedLead, setSelectedLead] = useState<OutboundLead>(PRESET_OUTBOUND_LEADS[0])

  const addMsg = useCallback(
    (role: Message['role'], text: string, extras: Partial<Message> = {}) => {
      store.addMessage({ id: makeId(), role, text, timestamp: Date.now(), ...extras })
    },
    [store]
  )

  const sendTurn = useCallback(
    async (text: string) => {
      listeningRef.current = false
      speech.stopListening()
      speech.stopSpeaking()

      addMsg('customer', text)
      store.setStatus('thinking')

      const activeSessionId = useVoiceStore.getState().sessionId || `browser-${Date.now()}`

      try {
        const turn: TurnResponse = await sendBrowserTurn(activeSessionId, text)
        store.setLastTurn(turn)
        store.setLastLatencyMs(turn.latencyMs)
        store.setCurrentStage(turn.intent)

        addMsg('asha', turn.reply, {
          latencyMs: turn.latencyMs,
          intent: turn.intent,
          action: turn.action,
        })

        if (settings.autoSpeak) {
          store.setStatus('speaking')
          speech.speak(turn.reply, () => {
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
        toast.error(`Chat error: ${msg}`)
        store.setStatus('error')
        addMsg('system', `Error: ${msg}`)
      }
    },
    [store, settings, speech, addMsg]
  )

  const startListeningLoop = useCallback(() => {
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
        if (listeningRef.current && useVoiceStore.getState().status === 'listening') {
          setTimeout(() => {
            startListeningLoop()
          }, 300)
        }
      }
    )
  }, [store, speech, sendTurn])

  const startSession = useCallback(async () => {
    store.resetSession()

    const customerPayload = callDirection === 'outbound' ? selectedLead : { phone: '+916000000000' }
    const sessionRes = await startBrowserSession(callDirection, customerPayload.phone, customerPayload)

    store.setSessionId(sessionRes.sessionId)
    store.setSessionStartTime(Date.now())
    store.setCurrentStage(sessionRes.stage)

    const greeting = sessionRes.greeting
    addMsg('asha', greeting)

    if (settings.autoSpeak) {
      store.setStatus('speaking')
      speech.speak(greeting, () => {
        startListeningLoop()
      })
    } else {
      startListeningLoop()
    }
  }, [store, settings, speech, addMsg, startListeningLoop, callDirection, selectedLead])

  const stopSession = useCallback(() => {
    listeningRef.current = false
    speech.stopListening()
    speech.stopSpeaking()
    store.setStatus('idle')
  }, [speech, store])

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

  return {
    startSession,
    stopSession,
    sendTurn,
    startManualListening,
    toggleMute,
    callDirection,
    setCallDirection,
    selectedLead,
    setSelectedLead,
  }
}
