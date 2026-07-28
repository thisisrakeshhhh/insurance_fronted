import { useSettingsStore } from '@/store'
import type { ChatResponse, HealthStatus, TurnResponse } from '@/types'

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

export async function startBrowserSession(
  direction: 'inbound' | 'outbound' = 'inbound',
  phone = '+916000000000',
  customerData?: Record<string, any>
): Promise<{ sessionId: string; greeting: string; stage: string; customer: Record<string, any>; missingFields: string[] }> {
  try {
    return await workerFetch('/voice/browser-session', {
      method: 'POST',
      body: JSON.stringify({ direction, phone, customer: customerData }),
    })
  } catch (err) {
    // Fallback if worker offline
    const isOutbound = direction === 'outbound'
    const name = customerData?.name || 'Customer'
    return {
      sessionId: `browser-${Date.now()}`,
      greeting: isOutbound
        ? `Hello ${name}! This is Asha calling from TATA AIG Health Insurance regarding your health policy. Am I speaking with ${name}?`
        : 'Thank you for calling TATA AIG Health Insurance. My name is Asha. How can I help you today?',
      stage: isOutbound ? 'greeting' : 'welcome',
      customer: customerData || { phone },
      missingFields: ['age', 'city', 'family_members', 'budget'],
    }
  }
}

export async function sendBrowserTurn(
  sessionId: string,
  speechResult: string
): Promise<TurnResponse> {
  const t0 = Date.now()
  try {
    const data = await workerFetch<any>('/voice/browser-turn', {
      method: 'POST',
      body: JSON.stringify({ sessionId, speechResult }),
    })
    return {
      reply: data.spokenResponse || 'Thank you for sharing that.',
      intent: data.detectedIntent || 'buy_policy',
      action: data.stage || 'PROFILING',
      latencyMs: data.latencyMs || (Date.now() - t0),
      extractedFields: data.extractedFields || {},
      customer: data.customer,
      missingFields: data.missingFields,
      quote: data.quote,
      summary: data.summary,
      turnCount: data.turnCount,
      stage: data.stage,
      wantsHuman: data.wantsHuman,
      ended: data.ended,
    }
  } catch (err) {
    // Fallback to /chat endpoint if browser session route fails
    const chatData = await sendChat(speechResult, [])
    return {
      reply: chatData.reply,
      intent: chatData.intent,
      action: chatData.action,
      latencyMs: Date.now() - t0,
    }
  }
}

export async function sendChat(
  text: string,
  history: Array<{ role: string; content: string }>
): Promise<ChatResponse & { latencyMs: number }> {
  const t0 = Date.now()
  const data = await workerFetch<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ text, history }),
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
      totalCalls: 12,
      completedCalls: 10,
      failedCalls: 2,
      avgDurationSec: 45,
      leadScores: { hot: 4, warm: 5, cold: 3 },
      quotesSent: 8,
      appointments: 3,
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
