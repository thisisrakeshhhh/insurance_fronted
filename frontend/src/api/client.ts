import axios from 'axios'
import { useSettingsStore } from '@/store'

const getBaseUrl = () => useSettingsStore.getState().workerUrl

export const apiClient = axios.create({ timeout: 30000 })

apiClient.interceptors.request.use((config) => {
  const base = getBaseUrl()
  if (base && !config.url?.startsWith('http')) {
    config.baseURL = base
  } else if (base && config.url && !config.url.startsWith('http')) {
    config.baseURL = base
  }
  if (!config.baseURL) config.baseURL = base
  config.metadata = { startTime: Date.now() }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const start = (response.config as { metadata?: { startTime: number } }).metadata?.startTime
    if (start) response.headers['x-latency-ms'] = String(Date.now() - start)
    return response
  },
  (error) => Promise.reject(error)
)

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: number }
  }
}
