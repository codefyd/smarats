import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BrandMark from './BrandMark'
import SubscriptionBanner from './SubscriptionBanner'

export default function DashboardLayout({ children }) {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BrandMark size={32} />
            <span className="font-bold">سماراتس</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard" active={isActive('/dashboard') && location.pathname === '/dashboard'}>الرئيسية</NavLink>
            <NavLink to="/dashboard/screens" active={isActive('/dashboard/screens')}>الشاشات</NavLink>
            <NavLink to="/dashboard/playlists" active={isActive('/dashboard/playlists')}>قوائم العرض</NavLink>
            <NavLink to="/dashboard/settings" active={isActive('/dashboard/settings')}>الإعدادات</NavLink>
            {role === 'super_admin' && (
              <NavLink to="/admin" active={isActive('/admin')}>السوبر أدمن</NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs text-slate-500">{user?.email}</span>
            <button onClick={handleSignOut} className="btn btn-ghost text-xs">خروج</button>
          </div>
        </div>

        <nav className="md:hidden border-t border-slate-200 px-4 py-2 flex gap-1 overflow-x-auto">
          <NavLink to="/dashboard" active={location.pathname === '/dashboard'}>الرئيسية</NavLink>
          <NavLink to="/dashboard/screens" active={isActive('/dashboard/screens')}>الشاشات</NavLink>
          <NavLink to="/dashboard/playlists" active={isActive('/dashboard/playlists')}>القوائم</NavLink>
          <NavLink to="/dashboard/settings" active={isActive('/dashboard/settings')}>الإعدادات</NavLink>
          {role === 'super_admin' && <NavLink to="/admin" active={isActive('/admin')}>سوبر أدمن</NavLink>}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <SubscriptionBanner />
        {children}
      </main>
    </div>
  )
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </Link>
  )
}
