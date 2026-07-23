import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Customer, Message, TurnResponse, VoiceStatus, SettingsState } from '@/types'

interface VoiceStore {
  status: VoiceStatus
  sessionId: string | null
  messages: Message[]
  currentCustomer: Customer | null
  currentStage: string
  currentModel: string
  lastLatencyMs: number
  lastTurn: TurnResponse | null
  sessionStartTime: number | null
  isMuted: boolean
  setStatus: (status: VoiceStatus) => void
  setSessionId: (id: string | null) => void
  addMessage: (msg: Message) => void
  setCurrentCustomer: (c: Customer | null) => void
  setCurrentStage: (stage: string) => void
  setCurrentModel: (model: string) => void
  setLastLatencyMs: (ms: number) => void
  setLastTurn: (turn: TurnResponse | null) => void
  setSessionStartTime: (t: number | null) => void
  setMuted: (muted: boolean) => void
  resetSession: () => void
}

const defaultVoiceState = {
  status: 'idle' as VoiceStatus,
  sessionId: null,
  messages: [],
  currentCustomer: null,
  currentStage: 'idle',
  currentModel: 'gemini-2.5-flash',
  lastLatencyMs: 0,
  lastTurn: null,
  sessionStartTime: null,
  isMuted: false,
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  ...defaultVoiceState,
  setStatus: (status) => set({ status }),
  setSessionId: (sessionId) => set({ sessionId }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setCurrentCustomer: (currentCustomer) => set({ currentCustomer }),
  setCurrentStage: (currentStage) => set({ currentStage }),
  setCurrentModel: (currentModel) => set({ currentModel }),
  setLastLatencyMs: (lastLatencyMs) => set({ lastLatencyMs }),
  setLastTurn: (lastTurn) => set({ lastTurn }),
  setSessionStartTime: (sessionStartTime) => set({ sessionStartTime }),
  setMuted: (isMuted) => set({ isMuted }),
  resetSession: () => set(defaultVoiceState),
}))

interface SettingsStore extends SettingsState {
  update: (patch: Partial<SettingsState>) => void
  setWorkerUrl: (v: string) => void
  setDevPhone: (v: string) => void
  setGeminiModel: (v: string) => void
  setSpeechLang: (v: string) => void
  setTtsVoice: (v: string) => void
  setTtsRate: (v: number) => void
  setTtsPitch: (v: number) => void
  setAutoSpeak: (v: boolean) => void
  setContinuousListening: (v: boolean) => void
  setDarkMode: (v: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      workerUrl: import.meta.env.VITE_WORKER_URL || 'https://tata-aig-voice-agent.whatsappai.workers.dev',
      speechLang: 'en-IN',
      ttsVoice: '',
      ttsRate: 1,
      ttsPitch: 1,
      autoSpeak: true,
      continuousListening: true,
      geminiModel: 'gemini-2.5-flash',
      darkMode: true,
      devPhone: '+918567890273',
      update: (patch) => set((s) => ({ ...s, ...patch })),
      setWorkerUrl: (workerUrl) => set({ workerUrl }),
      setDevPhone: (devPhone) => set({ devPhone }),
      setGeminiModel: (geminiModel) => set({ geminiModel }),
      setSpeechLang: (speechLang) => set({ speechLang }),
      setTtsVoice: (ttsVoice) => set({ ttsVoice }),
      setTtsRate: (ttsRate) => set({ ttsRate }),
      setTtsPitch: (ttsPitch) => set({ ttsPitch }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      setContinuousListening: (continuousListening) => set({ continuousListening }),
      setDarkMode: (darkMode) => set({ darkMode }),
    }),
    { name: 'asha-settings' }
  )
)
