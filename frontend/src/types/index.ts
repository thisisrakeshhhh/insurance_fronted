export interface ChatResponse {
  reply: string
  intent: string
  action: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface TurnResponse {
  reply: string
  intent: string
  action: string
  latencyMs: number
  model?: string
}

export interface Message {
  id: string
  role: 'asha' | 'customer' | 'system'
  text: string
  timestamp: number
  latencyMs?: number
  intent?: string
  action?: string
}

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

export interface HealthStatus {
  status: string
  agent: string
  model: string
  providers?: Record<string, string>
  latencyMs: number
}

export interface SettingsState {
  workerUrl: string
  speechLang: string
  autoSpeak: boolean
  continuousListening: boolean
  darkMode: boolean
}
