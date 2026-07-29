export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function truncate(str: string, max = 60): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function stageColor(stage: string): string {
  const map: Record<string, string> = {
    greeting: 'text-blue-400 bg-blue-400/10',
    permission: 'text-violet-400 bg-violet-400/10',
    need_analysis: 'text-cyan-400 bg-cyan-400/10',
    profiling: 'text-amber-400 bg-amber-400/10',
    recommendation: 'text-green-400 bg-green-400/10',
    objection_handling: 'text-orange-400 bg-orange-400/10',
    appointment: 'text-pink-400 bg-pink-400/10',
    closing: 'text-emerald-400 bg-emerald-400/10',
    ended: 'text-gray-400 bg-gray-400/10',
    welcome: 'text-blue-400 bg-blue-400/10',
    intent_selection: 'text-indigo-400 bg-indigo-400/10',
    buy_policy: 'text-green-400 bg-green-400/10',
    renewal: 'text-yellow-400 bg-yellow-400/10',
    claims: 'text-red-400 bg-red-400/10',
    hospital: 'text-teal-400 bg-teal-400/10',
    human_transfer: 'text-rose-400 bg-rose-400/10',
  }
  return map[stage] || 'text-gray-400 bg-gray-400/10'
}
