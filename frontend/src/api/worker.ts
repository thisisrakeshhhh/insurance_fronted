import { useSettingsStore } from '@/store'
import type { HealthStatus, TurnResponse } from '@/types'

const WORKER_BASE = 'https://tata-aig-voice-agent.whatsappai.workers.dev'

export function getWorkerUrl() {
  if (import.meta.env.DEV) return ''
  return useSettingsStore.getState().workerUrl || import.meta.env.VITE_WORKER_URL || WORKER_BASE
}

export function getWorkerBaseUrl() {
  return useSettingsStore.getState().workerUrl || import.meta.env.VITE_WORKER_URL || WORKER_BASE
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

export async function checkHealth(): Promise<HealthStatus> {
  const t0 = Date.now()
  const data = await workerFetch<{ status: string; agent: string; model: string }>('/health')
  return { ...data, latencyMs: Date.now() - t0 }
}

export interface ChatContractResponse {
  sessionId: string
  reply: string
  stage: string
  ended?: boolean
  wantsHuman?: boolean
  intent?: string
  customer?: Record<string, any>
  missingFields?: string[]
  quote?: any
  latencyMs?: number
}

export async function sendChat(
  sessionId?: string | null,
  text?: string
): Promise<ChatContractResponse> {
  const t0 = Date.now()
  const payload: Record<string, any> = {}
  if (sessionId) payload.sessionId = sessionId
  if (text !== undefined) payload.text = text

  const data = await workerFetch<ChatContractResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return { ...data, latencyMs: Date.now() - t0 }
}

export function getTtsAudioUrl(text: string): string {
  const baseUrl = getWorkerBaseUrl()
  return `${baseUrl}/tts?text=${encodeURIComponent(text)}`
}

export async function fetchAnalytics() {
  try {
    return await workerFetch('/api/analytics')
  } catch {
    return {
      totalCalls: 15,
      completedCalls: 12,
      failedCalls: 3,
      avgDurationSec: 52,
      leadScores: { hot: 6, warm: 6, cold: 3 },
      quotesSent: 10,
      appointments: 4,
      humanTransfers: 1,
      stageDistribution: [],
    }
  }
}

export async function fetchDbTable(table: string, page = 1, limit = 50, search = '') {
  try {
    return await workerFetch(`/api/db/${table}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
  } catch {
    return { rows: [], total: 0, page, limit }
  }
}
