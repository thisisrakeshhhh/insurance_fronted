import React from 'react'
import { motion } from 'framer-motion'
import { useVoiceStore } from '@/store'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { WorkerStatusBadge } from '@/components/dashboard/WorkerStatusBadge'
import { Phone, Users, Zap, CheckCircle, BarChart2, Clock } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const mockDaily = Array.from({ length: 7 }, (_, i) => ({
  day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
  sessions: Math.floor(Math.random() * 40) + 10,
  latency: Math.floor(Math.random() * 400) + 800,
}))

export function Dashboard() {
  const { messages, currentStage, lastLatencyMs } = useVoiceStore()
  const totalMessages = messages.length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 p-6 overflow-y-auto h-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Asha AI Voice Agent Overview</p>
        </div>
        <WorkerStatusBadge />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="Total Messages" value={totalMessages} icon={<Phone size={16} />} trend={12} />
        <StatsCard label="Active Stage" value={currentStage || 'idle'} icon={<BarChart2 size={16} />} color="#8b5cf6" />
        <StatsCard label="Last Latency" value={lastLatencyMs > 0 ? `${lastLatencyMs}ms` : '—'} icon={<Zap size={16} />} color="#f59e0b" />
        <StatsCard label="Session Status" value="Ready" sub="Worker connected" icon={<CheckCircle size={16} />} color="#10b981" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Daily Sessions</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockDaily}>
              <defs>
                <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="sessions" stroke="#6366f1" fill="url(#sessGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-amber-400" />
            <span className="text-sm font-semibold text-text-primary">Avg Latency (ms)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockDaily}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="latency" stroke="#f59e0b" fill="url(#latGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}
