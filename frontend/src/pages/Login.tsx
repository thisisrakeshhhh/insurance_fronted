import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    if (email === 'dev@tataig.local' && password === 'admin123') {
      localStorage.setItem('isLoggedIn', 'true')
      navigate('/dashboard')
    } else {
      toast.error('Invalid credentials. Use dev@tataig.local / admin123')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
            <Bot size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Asha AI Dashboard</h1>
            <p className="text-sm text-text-muted mt-1">Voice Agent Development Console</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@tataig.local"
              className="px-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-muted text-sm outline-none focus:border-accent/60 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-muted text-sm outline-none focus:border-accent/60 transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="mt-2 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          Dev credentials: <span className="text-accent">dev@tataig.local</span> / <span className="text-accent">admin123</span>
        </p>
      </motion.div>
    </div>
  )
}
