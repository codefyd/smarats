import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ScreensPage from './pages/ScreensPage'
import PlaylistsPage from './pages/PlaylistsPage'
import PlaylistEditorPage from './pages/PlaylistEditorPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import PlayerPage from './pages/PlayerPage'
import PlayerUnlockPage from './pages/PlayerUnlockPage'

function ProtectedRoute({ children, requireRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireRole && role !== requireRole) return <Navigate to="/dashboard" replace />

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* مسارات عامة */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* الشاشة — رابط عام بدون مصادقة */}
        <Route path="/s/:publicId" element={<PlayerPage />} />
        <Route path="/s/:publicId/unlock" element={<PlayerUnlockPage />} />

        {/* مسارات محمية — أدمن الجهة */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/screens" element={<ProtectedRoute><ScreensPage /></ProtectedRoute>} />
        <Route path="/dashboard/playlists" element={<ProtectedRoute><PlaylistsPage /></ProtectedRoute>} />
        <Route path="/dashboard/playlists/:id" element={<ProtectedRoute><PlaylistEditorPage /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        {/* مسار السوبر أدمن */}
        <Route path="/admin" element={<ProtectedRoute requireRole="super_admin"><AdminPage /></ProtectedRoute>} />

        {/* افتراضي */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
