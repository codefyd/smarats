import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

export default function SettingsPage() {
  const { orgId, user } = useAuth()
  const [org, setOrg] = useState(null)
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // تغيير كلمة السر
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')

  useEffect(() => {
    if (!orgId) return
    supabase.from('organizations').select('*').eq('id', orgId).single().then(({ data }) => {
      if (data) {
        setOrg(data)
        setName(data.name || '')
        setLogoUrl(data.logo_url || '')
        setContactInfo(data.contact_info || '')
      }
    })
  }, [orgId])

  async function saveOrg(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('organizations').update({
      name,
      logo_url: logoUrl || null,
      contact_info: contactInfo || null
    }).eq('id', orgId)
    setSaving(false)
    if (error) return alert('خطأ: ' + error.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function changePassword(e) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setPwMessage('كلمة السر يجب أن تكون 8 أحرف على الأقل')
      return
    }
    setPwSaving(true)
    setPwMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) {
      setPwMessage('خطأ: ' + error.message)
    } else {
      setPwMessage('تم تغيير كلمة السر بنجاح')
      setNewPassword('')
    }
  }

  if (!org && orgId) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">جاري التحميل...</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-slate-500 mt-1">معلومات الجهة والحساب</p>
      </div>

      {org && (
        <form onSubmit={saveOrg} className="card mb-5">
          <h3 className="font-bold mb-4">بيانات الجهة</h3>
          <div className="space-y-3">
            <div>
              <label className="label">اسم الجهة</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">رابط الشعار (اختياري)</label>
              <input type="url" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="input" placeholder="https://..." dir="ltr" />
            </div>
            <div>
              <label className="label">معلومات التواصل</label>
              <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="input" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              {saved && <span className="text-sm text-green-600">✓ تم الحفظ</span>}
            </div>
          </div>
        </form>
      )}

      {/* تغيير كلمة السر */}
      <form onSubmit={changePassword} className="card">
        <h3 className="font-bold mb-1">تغيير كلمة السر</h3>
        <p className="text-xs text-slate-500 mb-4">البريد الحالي: <span dir="ltr">{user?.email}</span></p>
        <div className="space-y-3">
          <div>
            <label className="label">كلمة السر الجديدة</label>
            <input type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" placeholder="8 أحرف على الأقل" dir="ltr" />
          </div>
          {pwMessage && (
            <div className={`p-2 rounded-lg text-sm ${pwMessage.startsWith('تم') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {pwMessage}
            </div>
          )}
          <button type="submit" disabled={pwSaving || !newPassword} className="btn btn-primary">
            {pwSaving ? 'جاري التغيير...' : 'تغيير كلمة السر'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}
