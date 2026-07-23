import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          main: '#0a0a0f',
          card: '#111118',
          surface: '#1a1a24',
          hover: '#1e1e2e',
        },
        border: {
          DEFAULT: '#1e1e2e',
          subtle: 'rgba(255,255,255,0.05)',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: 'rgba(99,102,241,0.15)',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          muted: 'rgba(139,92,246,0.15)',
        },
        success: { DEFAULT: '#10b981', muted: 'rgba(16,185,129,0.15)' },
        warning: { DEFAULT: '#f59e0b', muted: 'rgba(245,158,11,0.15)' },
        danger: { DEFAULT: '#ef4444', muted: 'rgba(239,68,68,0.15)' },
        text: {
          primary: '#f8fafc',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
          faint: '#475569',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'wave': 'wave 1.2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #6366f1, 0 0 10px #6366f1' },
          '100%': { boxShadow: '0 0 20px #6366f1, 0 0 40px #6366f1' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      backdropBlur: { xs: '4px' },
    },
  },
  plugins: [],
}

export default config
