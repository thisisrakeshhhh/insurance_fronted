import { useRef, useCallback } from 'react'
import { useSettingsStore } from '@/store'
import { toast } from 'sonner'

type TranscriptCallback = (text: string, isFinal: boolean, confidence: number) => void

interface SpeechHook {
  startListening: (onTranscript: TranscriptCallback, onSilence?: () => void) => void
  stopListening: () => void
  speak: (text: string, onEnd?: () => void) => void
  stopSpeaking: () => void
  isSupported: boolean
}

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)
  : undefined

export function useSpeech(): SpeechHook {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const hasSpokenRef = useRef<boolean>(false)
  const settings = useSettingsStore()

  const isSupported = !!SR

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {}
    recognitionRef.current = null
  }, [])

  const startListening = useCallback((onTranscript: TranscriptCallback, onSilence?: () => void) => {
    if (!SR) {
      toast.error('Speech recognition is not supported in this browser.')
      return
    }
    stopListening()
    hasSpokenRef.current = false

    try {
      const recognition = new SR()
      recognition.lang = settings.speechLang
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1]
        const transcript = result[0].transcript.trim()
        const confidence = result[0].confidence || 1
        const isFinal = result.isFinal
        if (transcript) {
          if (isFinal) hasSpokenRef.current = true
          onTranscript(transcript, isFinal, confidence)
        }
      }

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast.error(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        recognitionRef.current = null
        if (!hasSpokenRef.current) {
          onSilence?.()
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      logError('Speech recognition start failed', e)
    }
  }, [settings.speechLang, stopListening])

  const stopSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel()
    } catch {}
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      onEnd?.()
      return
    }
    stopSpeaking()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = settings.ttsRate
    utterance.pitch = settings.ttsPitch
    utterance.lang = settings.speechLang

    if (settings.ttsVoice) {
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find((v) => v.name === settings.ttsVoice)
      if (voice) utterance.voice = voice
    }

    utterance.onend = () => onEnd?.()
    utterance.onerror = () => onEnd?.()

    window.speechSynthesis.speak(utterance)
  }, [settings.ttsRate, settings.ttsPitch, settings.speechLang, settings.ttsVoice, stopSpeaking])

  return { startListening, stopListening, speak, stopSpeaking, isSupported }
}

function logError(_msg: string, _err: unknown) {}
