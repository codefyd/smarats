import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      // نتركه للـ AuthProvider ليحمّل الدور، ثم نوجّه
      setTimeout(() => navigate('/dashboard'), 100)
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'بيانات الدخول غير صحيحة' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">س</div>
          <span className="text-xl font-bold">سماراتس</span>
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold mb-1 text-center">تسجيل الدخول</h1>
          <p className="text-sm text-slate-500 mb-6 text-center">أدخل بياناتك للوصول للوحة التحكم</p>

          <form onSubmit={onSubmit}>
            <div className="mb-4">
              <label className="label">البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="name@example.com" dir="ltr" />
            </div>
            <div className="mb-5">
              <label className="label">كلمة السر</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" dir="ltr" />
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            ما عندك حساب؟ <Link to="/register" className="text-brand-600 font-medium">سجّل جهتك</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
