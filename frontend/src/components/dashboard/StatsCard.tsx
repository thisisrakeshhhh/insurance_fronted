import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  trend?: number
  color?: string
}

export function StatsCard({ label, value, sub, icon, trend, color = '#6366f1' }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      className="bg-bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          <span>{Math.abs(trend)}% vs yesterday</span>
        </div>
      )}
    </motion.div>
  )
}
