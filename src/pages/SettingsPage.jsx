import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

const PLAN_LABELS = {
  plus: 'بلس',
  pro: 'برو',
  max: 'ماكس',
  premium: 'بريميوم'
}

const PLAN_DESC = {
  plus: '5 شاشات + 5 قوائم عرض',
  pro: '10 شاشات + 10 قوائم عرض',
  max: '20 شاشة + 20 قائمة عرض',
  premium: 'لا محدود'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  } catch { return dateStr }
}

export default function SettingsPage() {
  const { orgId, user, org, subscription, canEdit, refreshOrg } = useAuth()
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // تغيير كلمة السر
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState(false)

  useEffect(() => {
    if (org) {
      setName(org.name || '')
      setLogoUrl(org.logo_url || '')
      setContactInfo(org.contact_info || '')
    }
  }, [org])

  async function saveOrg(e) {
    e.preventDefault()
    if (!canEdit) return

    if (!contactInfo.trim() || contactInfo.trim().replace(/\D/g,'').length < 7) {
      alert('رقم التواصل مطلوب — أدخل رقم جوال صحيح')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('organizations').update({
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      contact_info: contactInfo.trim()
    }).eq('id', orgId)
    setSaving(false)
    if (error) return alert('خطأ: ' + error.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    refreshOrg()
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMessage('')
    setPwError(false)

    if (!currentPassword) {
      setPwError(true); setPwMessage('أدخل كلمة السر الحالية')
      return
    }
    if (newPassword.length < 8) {
      setPwError(true); setPwMessage('كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError(true); setPwMessage('كلمة السر الجديدة وتأكيدها غير متطابقتين')
      return
    }
    if (newPassword === currentPassword) {
      setPwError(true); setPwMessage('كلمة السر الجديدة يجب أن تختلف عن الحالية')
      return
    }

    setPwSaving(true)

    // الخطوة 1: التحقق من كلمة السر الحالية بمحاولة تسجيل دخول
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInErr) {
      setPwSaving(false)
      setPwError(true); setPwMessage('كلمة السر الحالية غير صحيحة')
      return
    }

    // الخطوة 2: تحديث كلمة السر
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })

    setPwSaving(false)

    if (updateErr) {
      setPwError(true)
      setPwMessage('خطأ: ' + updateErr.message)
      return
    }

    setPwError(false)
    setPwMessage('تم تغيير كلمة السر بنجاح')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  if (!org) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">جاري التحميل...</div></DashboardLayout>
  }

  const isExpired = subscription?.status === 'expired'

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-slate-500 mt-1">معلومات الجهة والاشتراك والحساب</p>
      </div>

      {/* بطاقة الاشتراك */}
      <div className="card mb-5">
        <h3 className="font-bold mb-4">الاشتراك</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">الباقة</div>
            <div className="font-bold text-lg">
              {org.plan ? PLAN_LABELS[org.plan] : '—'}
            </div>
            {org.plan && (
              <div className="text-xs text-slate-500 mt-0.5">{PLAN_DESC[org.plan]}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">تاريخ نهاية الاشتراك</div>
            <div className={`font-bold text-lg ${isExpired ? 'text-red-600' : ''}`}>
              {formatDate(org.subscription_end_date)}
            </div>
            {subscription && subscription.days_remaining !== null && (
              <div className={`text-xs mt-0.5 ${
                subscription.status === 'expired' ? 'text-red-600' :
                subscription.status === 'expiring_soon' ? 'text-amber-600' :
                'text-slate-500'
              }`}>
                {subscription.status === 'expired' ?
                  `منتهي منذ ${-subscription.days_remaining} يوم` :
                  `متبقي ${subscription.days_remaining} يوم`
                }
              </div>
            )}
          </div>
        </div>
        {(isExpired || subscription?.status === 'expiring_soon') && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
            للتجديد، تواصل مع إدارة سماراتس.
          </div>
        )}
      </div>

      {/* بيانات الجهة */}
      <form onSubmit={saveOrg} className="card mb-5">
        <h3 className="font-bold mb-4">بيانات الجهة</h3>
        {!canEdit && (
          <div className="mb-4 p-2.5 rounded-lg bg-slate-100 text-slate-600 text-xs">
            التعديل غير متاح حالياً (الاشتراك منتهي أو الجهة معلّقة)
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="label">اسم الجهة</label>
            <input type="text" required disabled={!canEdit} value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">رابط الشعار (اختياري)</label>
            <input type="url" disabled={!canEdit} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="input" placeholder="https://..." dir="ltr" />
          </div>
          <div>
            <label className="label">رقم التواصل <span className="text-red-500">*</span></label>
            <input type="tel" required disabled={!canEdit} value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="input" dir="ltr" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || !canEdit} className="btn btn-primary">
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            {saved && <span className="text-sm text-green-600">✓ تم الحفظ</span>}
          </div>
        </div>
      </form>

      {/* تغيير كلمة السر */}
      <form onSubmit={changePassword} className="card">
        <h3 className="font-bold mb-1">تغيير كلمة السر</h3>
        <p className="text-xs text-slate-500 mb-4">البريد الحالي: <span dir="ltr">{user?.email}</span></p>
        <div className="space-y-3">
          <div>
            <label className="label">كلمة السر الحالية <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              dir="ltr"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">كلمة السر الجديدة (8 أحرف على الأقل) <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">تأكيد كلمة السر الجديدة <span className="text-red-500">*</span></label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              dir="ltr"
              autoComplete="new-password"
            />
          </div>

          {pwMessage && (
            <div className={`p-2.5 rounded-lg text-sm ${pwError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {pwMessage}
            </div>
          )}

          <button type="submit" disabled={pwSaving} className="btn btn-primary">
            {pwSaving ? 'جاري التغيير...' : 'تغيير كلمة السر'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}
