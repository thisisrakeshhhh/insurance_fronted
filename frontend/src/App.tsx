import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { VoiceChat } from '@/pages/VoiceChat'
import { Customers } from '@/pages/Customers'
import { Inspector } from '@/pages/Inspector'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <MainLayout>
                  <Routes>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="voice" element={<VoiceChat />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="inspector" element={<Inspector />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="settings" element={<Settings />} />
                  </Routes>
                </MainLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
