import { useRef, useCallback } from 'react'
import { useSettingsStore } from '@/store'
import { getWorkerUrl } from '@/api/worker'
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
    if (isSpeakingRef.current) {
      // Pause mic start while assistant is speaking to avoid echo self-triggering
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

  const speakNative = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      isSpeakingRef.current = false
      onEnd?.()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = settings.ttsRate
    utterance.pitch = settings.ttsPitch
    utterance.lang = settings.speechLang

    if (settings.ttsVoice) {
      const voices = window.speechSynthesis.getVoices()
      const voice = voices.find((v) => v.name === settings.ttsVoice)
      if (voice) utterance.voice = voice
    }

    const wrapEnd = () => {
      isSpeakingRef.current = false
      onEnd?.()
    }

    utterance.onend = wrapEnd
    utterance.onerror = wrapEnd
    isSpeakingRef.current = true
    window.speechSynthesis.speak(utterance)
  }, [settings.ttsRate, settings.ttsPitch, settings.speechLang, settings.ttsVoice])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    stopSpeaking()
    isSpeakingRef.current = true

    const workerUrl = getWorkerUrl()
    const ttsAudioUrl = `${workerUrl}/api/tts?text=${encodeURIComponent(text)}`
    const audio = new Audio(ttsAudioUrl)
    audioRef.current = audio

    let endedHandled = false
    const handleEnd = () => {
      if (endedHandled) return
      endedHandled = true
      audioRef.current = null
      isSpeakingRef.current = false
      onEnd?.()
    }

    audio.onended = handleEnd
    audio.onerror = () => {
      logError('ElevenLabs audio error, falling back to native TTS', null)
      speakNative(text, onEnd)
    }

    audio.play().catch((err) => {
      logError('ElevenLabs audio play failed, falling back to native TTS', err)
      speakNative(text, onEnd)
    })
  }, [stopSpeaking, speakNative])

  return { startListening, stopListening, speak, stopSpeaking, isSupported }
}

function logError(_msg: string, _err: unknown) {}
