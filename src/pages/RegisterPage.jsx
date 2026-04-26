import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import BrandMark from '../components/BrandMark'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('charity')
  const [contactInfo, setContactInfo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function validateContact(value) {
    const trimmed = value.trim()
    if (trimmed.length < 7) return false
    const digits = trimmed.replace(/\D/g, '')
    return digits.length >= 7
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')

    if (!validateContact(contactInfo)) {
      setError('رقم التواصل مطلوب — أدخل رقم جوال صحيح (7 أرقام على الأقل)')
      return
    }

    if (password.length < 8) {
      setError('كلمة السر يجب أن تكون 8 أحرف على الأقل')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password)

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) throw signInErr

      const { error: rpcErr } = await supabase.rpc('register_organization', {
        _name: orgName.trim(),
        _org_type: orgType,
        _contact_info: contactInfo.trim()
      })
      if (rpcErr) throw rpcErr

      setSuccess(true)
    } catch (err) {
      let msg = err.message
      if (msg?.includes('already registered') || msg?.includes('already been registered')) {
        msg = 'هذا البريد مسجل مسبقاً'
      } else if (msg?.includes('already has an organization')) {
        msg = 'هذا الحساب مسجّل جهة بالفعل'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md card text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">✓</div>
          <h1 className="text-xl font-bold mb-2">تم التسجيل بنجاح</h1>
          <p className="text-slate-600 mb-5 leading-relaxed">
            جهتك الآن بانتظار موافقة الإدارة. سيتم تفعيل حسابك خلال فترة قصيرة،
            وتقدر تسجل دخول مرة ثانية بعد الموافقة لتبدأ استخدام النظام.
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary">العودة لصفحة الدخول</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <BrandMark size={40} />
          <span className="text-xl font-bold">سماراتس</span>
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold mb-1 text-center">تسجيل جهة جديدة</h1>
          <p className="text-sm text-slate-500 mb-6 text-center">سيتم تفعيل حسابك بعد موافقة الإدارة</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">اسم الجهة</label>
              <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className="input" placeholder="مثال: جمعية البر" />
            </div>
            <div>
              <label className="label">نوع الجهة</label>
              <select value={orgType} onChange={e => setOrgType(e.target.value)} className="input">
                <option value="company">شركة</option>
                <option value="charity">جمعية خيرية</option>
                <option value="government">مؤسسة حكومية</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className="label">رقم التواصل <span className="text-red-500">*</span></label>
              <input
                type="tel"
                required
                value={contactInfo}
                onChange={e => setContactInfo(e.target.value)}
                className="input"
                placeholder="مثال: 0501234567"
                dir="ltr"
              />
              <p className="text-xs text-slate-500 mt-1">رقم جوال للتواصل بشأن الاشتراك والتجديد</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div>
                <label className="label">البريد الإلكتروني</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="admin@org.com" dir="ltr" />
              </div>
              <div className="mt-4">
                <label className="label">كلمة السر (8 أحرف على الأقل)</label>
                <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" dir="ltr" />
              </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            عندك حساب؟ <Link to="/login" className="text-brand-600 font-medium">سجّل دخول</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
