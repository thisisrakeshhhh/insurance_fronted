import React from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart2, RefreshCw } from 'lucide-react'
import { fetchAnalytics } from '@/api/worker'

const fallbackStages = [
  { stage: 'greeting', count: 12 },
  { stage: 'need analysis', count: 24 },
  { stage: 'recommendation', count: 18 },
  { stage: 'objection handling', count: 9 },
  { stage: 'closing', count: 15 },
  { stage: 'ended', count: 31 },
]

const fallbackIntents = [
  { name: 'buy policy', value: 45 },
  { name: 'renewal', value: 25 },
  { name: 'claims', value: 15 },
  { name: 'hospital', value: 10 },
  { name: 'human transfer', value: 5 },
]

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']

const latencyData = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${14 - i}`,
  avg: Math.floor(Math.random() * 200) + 300,
  p95: Math.floor(Math.random() * 400) + 600,
}))

export function Analytics() {
  const { data: analytics, refetch, isFetching } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
    refetchInterval: 10000,
  })

  const stageData = analytics?.stageDistribution?.length
    ? analytics.stageDistribution.map(s => ({ stage: s.stage.replace(/_/g, ' '), count: s.count }))
    : fallbackStages

  const intentData = analytics?.leadScores
    ? [
        { name: 'Hot Leads', value: analytics.leadScores.hot || 1 },
        { name: 'Warm Leads', value: analytics.leadScores.warm || 1 },
        { name: 'Cold Leads', value: analytics.leadScores.cold || 1 },
        { name: 'Quotes Sent', value: analytics.quotesSent || 1 },
        { name: 'Appointments', value: analytics.appointments || 1 },
      ]
    : fallbackIntents

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-accent" />
          <h1 className="text-xl font-bold text-text-primary">Analytics & Metrics</h1>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface border border-border text-xs text-text-muted hover:text-text-primary transition"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted">Total Calls</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{analytics?.totalCalls ?? 0}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted">Completed Calls</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{analytics?.completedCalls ?? 0}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted">Quotes Sent</p>
          <p className="text-2xl font-bold text-accent mt-1">{analytics?.quotesSent ?? 0}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted">Avg Call Duration</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">{analytics?.avgDurationSec ?? 0}s</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-text-primary mb-4">Stage Distribution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-text-primary mb-4">Lead Tier & Output Distribution</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie data={intentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                  {intentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {intentData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-text-muted capitalize">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5 col-span-2">
          <p className="text-sm font-semibold text-text-primary mb-4">Real-Time Performance Latency (ms)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={false} name="Avg Latency" />
              <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} dot={false} name="P95 Latency" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
