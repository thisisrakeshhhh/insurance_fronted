import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Mic, Users, Database, BarChart2, Settings, LogOut, Bot } from 'lucide-react'
import { WorkerStatusBadge } from '@/components/dashboard/WorkerStatusBadge'
import { Toaster } from 'sonner'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/voice', icon: Mic, label: 'Voice Chat' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/inspector', icon: Database, label: 'DB Inspector' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface Props {
  children: React.ReactNode
}

export function MainLayout({ children }: Props) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden">
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-border bg-bg-card">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary">Asha AI</div>
            <div className="text-xs text-text-muted">Voice Dashboard</div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-surface'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border space-y-3">
          <WorkerStatusBadge />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>

      <Toaster position="top-right" theme="dark" richColors />
    </div>
  )
}
