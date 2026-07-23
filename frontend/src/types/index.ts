export interface Customer {
  phone: string
  name: string
  email: string
  age: number | null
  city: string
  pincode: string
  family_members: number | null
  existing_insurer: string
  renewal_date: string
  medical_history: string
  coverage_needed: string
  budget: string
  buying_timeline: string
}

export interface Quote {
  planName: string
  coverage: string
  premiumRange: string
  benefits: string[]
  reasoning: string
}

export interface SessionResponse {
  sessionId: string
  greeting: string
  stage: string
  direction: string
  customer: Customer
  missingFields: string[]
  model: string
}

export interface TurnResponse {
  spokenResponse: string
  stage: string
  ended: boolean
  detectedIntent: string
  intentConfidence: number
  objectionType: string | null
  wantsHuman: boolean
  extractedFields: Partial<Customer>
  customer: Customer
  missingFields: string[]
  quote: Quote | null
  summary: string
  turnCount: number
  latencyMs: number
  model: string
}

export interface Message {
  id: string
  role: 'asha' | 'customer' | 'system'
  text: string
  timestamp: number
  latencyMs?: number
  confidence?: number
  stage?: string
}

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended' | 'error'

export interface VoiceState {
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
}

export interface HealthStatus {
  status: string
  agent: string
  model: string
  latencyMs: number
}

export interface DbTableResponse {
  rows: Record<string, unknown>[]
  total: number
  page: number
  limit: number
}

export interface SettingsState {
  workerUrl: string
  speechLang: string
  ttsVoice: string
  ttsRate: number
  ttsPitch: number
  autoSpeak: boolean
  continuousListening: boolean
  geminiModel: string
  darkMode: boolean
  devPhone: string
}
