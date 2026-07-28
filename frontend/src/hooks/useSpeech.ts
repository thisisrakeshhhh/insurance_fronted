import { useRef, useCallback } from 'react'
import { useSettingsStore } from '@/store'
import { getWorkerBaseUrl } from '@/api/worker'
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isSpeakingRef = useRef<boolean>(false)
  const lastTranscriptRef = useRef<string>('')
  const settings = useSettingsStore()

  const isSupported = !!SR

  const stopSpeaking = useCallback(() => {
    isSpeakingRef.current = false
    try {
      window.speechSynthesis?.cancel()
    } catch {}
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {}
      audioRef.current = null
    }
  }, [])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {}
    recognitionRef.current = null
  }, [])

  const startListening = useCallback((onTranscript: TranscriptCallback, onSilence?: () => void) => {
    if (!SR) {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome/Edge.')
      return
    }

    // Force stop previous speech synthesis / audio stream so listening can begin
    stopSpeaking()
    stopListening()
    lastTranscriptRef.current = ''

    try {
      const recognition = new SR()
      recognition.lang = settings.speechLang || 'en-IN'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim()
          const confidence = event.results[i][0].confidence || 1
          const isFinal = event.results[i].isFinal
          if (transcript) {
            lastTranscriptRef.current = transcript
            if (isFinal) {
              onTranscript(transcript, true, confidence)
            } else {
              interim = transcript
              onTranscript(transcript, false, confidence)
            }
          }
        }
      }

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          toast.error('Microphone access blocked. Please allow microphone permission in your browser address bar.')
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error)
        }
      }

      recognition.onend = () => {
        recognitionRef.current = null
        // If user spoke something before onend fired without explicit isFinal flag, trigger with last known transcript
        if (lastTranscriptRef.current) {
          const finalSpeech = lastTranscriptRef.current
          lastTranscriptRef.current = ''
          onTranscript(finalSpeech, true, 1.0)
        } else {
          onSilence?.()
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (e) {
      console.error('Speech recognition start failed:', e)
    }
  }, [settings.speechLang, stopListening, stopSpeaking])

  const speakNative = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      isSpeakingRef.current = false
      onEnd?.()
      return
    }

    try {
      window.speechSynthesis.cancel()
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = settings.speechLang || 'en-IN'

    let endedHandled = false
    const wrapEnd = () => {
      if (endedHandled) return
      endedHandled = true
      isSpeakingRef.current = false
      onEnd?.()
    }

    utterance.onend = wrapEnd
    utterance.onerror = wrapEnd
    isSpeakingRef.current = true
    window.speechSynthesis.speak(utterance)
  }, [settings.speechLang])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    stopSpeaking()
    isSpeakingRef.current = true

    const workerUrl = getWorkerBaseUrl()
    const ttsAudioUrl = `${workerUrl}/tts?text=${encodeURIComponent(text)}`
    const audio = new Audio(ttsAudioUrl)
    audioRef.current = audio

    let endedOrFailed = false

    const handleEnd = () => {
      if (endedOrFailed) return
      endedOrFailed = true
      audioRef.current = null
      isSpeakingRef.current = false
      onEnd?.()
    }

    const triggerFallback = () => {
      if (endedOrFailed) return
      endedOrFailed = true
      audioRef.current = null
      speakNative(text, onEnd)
    }

    audio.onended = handleEnd
    audio.onerror = () => triggerFallback()

    audio.play().catch(() => {
      triggerFallback()
    })
  }, [stopSpeaking, speakNative])

  return { startListening, stopListening, speak, stopSpeaking, isSupported }
}
