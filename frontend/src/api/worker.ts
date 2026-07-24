import { useSettingsStore } from '@/store'
import type { DbTableResponse, HealthStatus, SessionResponse, TurnResponse } from '@/types'

function getWorkerUrl() {
  if (import.meta.env.DEV) return ''
  return useSettingsStore.getState().workerUrl || import.meta.env.VITE_WORKER_URL || 'https://tata-aig-voice-agent.whatsappai.workers.dev'
}

async function workerFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getWorkerUrl()}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Worker error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function startBrowserSession(direction: 'outbound' | 'inbound', phone: string): Promise<SessionResponse> {
  return workerFetch<SessionResponse>('/voice/browser-session', {
    method: 'POST',
    body: JSON.stringify({ direction, phone }),
  })
}

export async function makeTestCall(to: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
  return workerFetch<{ success: boolean; callSid?: string; error?: string }>('/test-call', {
    method: 'POST',
    body: JSON.stringify({ to }),
  })
}

export async function sendBrowserTurn(sessionId: string, speechResult: string): Promise<TurnResponse> {
  return workerFetch<TurnResponse>('/voice/browser-turn', {
    method: 'POST',
    body: JSON.stringify({ sessionId, speechResult }),
  })
}

export async function checkHealth(): Promise<HealthStatus> {
  const t0 = Date.now()
  const data = await workerFetch<{ status: string; agent: string; model: string; services?: Record<string, string> }>('/api/health')
  return { ...data, latencyMs: Date.now() - t0 }
}

export async function fetchStatus() {
  return workerFetch<{
    status: string
    activeSessions: number
    totalCustomers: number
    db: string
    gemini: string
    openai: string
    whatsapp: string
    twilio: string
  }>('/api/status')
}

export async function fetchConfig() {
  return workerFetch<{
    agentName: string
    companyName: string
    model: string
    language: string
    stages: string[]
    intents: string[]
    plans: { id: string; name: string; coverage: string }[]
    cashlessNetworkCities: string[]
  }>('/api/config')
}

export async function fetchAnalytics() {
  return workerFetch<{
    totalCalls: number
    completedCalls: number
    failedCalls: number
    avgDurationSec: number
    leadScores: { hot: number; warm: number; cold: number }
    quotesSent: number
    appointments: number
    humanTransfers: number
    stageDistribution: { stage: string; count: number }[]
  }>('/api/analytics')
}

export async function fetchSession(sessionId: string) {
  return workerFetch<Record<string, unknown>>(`/api/session/${sessionId}`)
}

export async function endSession(sessionId: string) {
  return workerFetch<{ ok: boolean; sessionId: string; stage: string }>('/api/session/end', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function fetchCustomer(phone: string) {
  return workerFetch<Record<string, unknown>>(`/api/customer/${encodeURIComponent(phone)}`)
}

export async function fetchHistory(sessionId: string) {
  return workerFetch<{ sessionId: string; turns: { speaker: string; message: string; stage: string; created_at: string }[] }>(`/api/history/${sessionId}`)
}

export async function sendFeedback(sessionId: string, rating: number, comment?: string) {
  return workerFetch<{ ok: boolean; sessionId: string; rating: number }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ sessionId, rating, comment }),
  })
}

export async function fetchDbTable(
  table: string,
  page = 1,
  limit = 50,
  search = ''
): Promise<DbTableResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search })
  return workerFetch<DbTableResponse>(`/api/db/${table}?${params}`)
}
