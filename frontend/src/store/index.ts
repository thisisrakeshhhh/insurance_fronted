import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, TurnResponse, VoiceStatus, SettingsState } from '@/types'

interface VoiceStore {
  status: VoiceStatus
  sessionId: string | null
  messages: Message[]
  currentStage: string
  currentModel: string
  lastLatencyMs: number
  lastTurn: TurnResponse | null
  sessionStartTime: number | null
  isMuted: boolean
  setStatus: (status: VoiceStatus) => void
  setSessionId: (id: string | null) => void
  addMessage: (msg: Message) => void
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
  currentStage: 'idle',
  currentModel: 'llama-3.3-70b-versatile',
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
  setCurrentStage: (currentStage) => set({ currentStage }),
  setCurrentModel: (currentModel) => set({ currentModel }),
  setLastLatencyMs: (lastLatencyMs) => set({ lastLatencyMs }),
  setLastTurn: (lastTurn) => set({ lastTurn }),
  setSessionStartTime: (sessionStartTime) => set({ sessionStartTime }),
  setMuted: (isMuted) => set({ isMuted }),
  resetSession: () => set({ ...defaultVoiceState }),
}))

interface SettingsStore extends SettingsState {
  update: (patch: Partial<SettingsState>) => void
  setWorkerUrl: (v: string) => void
  setSpeechLang: (v: string) => void
  setAutoSpeak: (v: boolean) => void
  setContinuousListening: (v: boolean) => void
  setDarkMode: (v: boolean) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      workerUrl: import.meta.env.VITE_WORKER_URL || 'https://tata-aig-voice-agent.whatsappai.workers.dev',
      speechLang: 'en-IN',
      autoSpeak: true,
      continuousListening: true,
      darkMode: true,
      update: (patch) => set((s) => ({ ...s, ...patch })),
      setWorkerUrl: (workerUrl) => set({ workerUrl }),
      setSpeechLang: (speechLang) => set({ speechLang }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      setContinuousListening: (continuousListening) => set({ continuousListening }),
      setDarkMode: (darkMode) => set({ darkMode }),
    }),
    { name: 'asha-settings' }
  )
)
