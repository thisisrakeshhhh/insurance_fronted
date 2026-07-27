import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Mic, Users, Database, BarChart2, Settings, LogOut, Bot } from 'lucide-react'
import { WorkerStatusBadge } from '@/components/dashboard/WorkerStatusBadge'
import { Toaster } from 'sonner'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/voice', icon: Mic, label: 'Voice' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/inspector', icon: Database, label: 'DB' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface Props {
  children: React.ReactNode
}

export function MainLayout({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden">
      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col border-r border-border bg-bg-card">
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

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-bg-card pt-safe flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <Bot size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold text-text-primary">Asha AI</span>
          </div>
          <div className="flex items-center gap-2">
            <WorkerStatusBadge />
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-bg-surface transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>

        {/* ── Mobile Bottom Tab Bar (hidden on desktop) ── */}
        <nav className="md:hidden flex-shrink-0 flex items-stretch border-t border-border bg-bg-card pb-safe">
          {NAV.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors min-w-0 ${
                  isActive
                    ? 'text-accent'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-accent/15' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className="truncate w-full text-center px-0.5">{label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      <Toaster position="top-right" theme="dark" richColors />
    </div>
  )
}
