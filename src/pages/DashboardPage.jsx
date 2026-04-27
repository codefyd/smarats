import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

export default function DashboardPage() {
  const { orgId, role } = useAuth()
  const [org, setOrg] = useState(null)
  const [stats, setStats] = useState({ screens: 0, playlists: 0, items: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) {
      setLoading(false)
      return
    }

    async function loadData() {
      // جلب بيانات الجهة
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
      setOrg(orgData)

      // الإحصائيات
      const [screens, playlists] = await Promise.all([
        supabase.from('screens').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('playlists').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
      ])

      // عدد العناصر (عبر join)
      const { data: plIds } = await supabase.from('playlists').select('id').eq('organization_id', orgId)
      let itemsCount = 0
      if (plIds && plIds.length > 0) {
        const { count } = await supabase
          .from('playlist_items')
          .select('id', { count: 'exact', head: true })
          .in('playlist_id', plIds.map(p => p.id))
        itemsCount = count || 0
      }

      setStats({
        screens: screens.count || 0,
        playlists: playlists.count || 0,
        items: itemsCount
      })
      setLoading(false)
    }

    loadData()
  }, [orgId])

  if (loading) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">جاري التحميل...</div></DashboardLayout>
  }

  // السوبر أدمن بدون جهة
  if (role === 'super_admin' && !orgId) {
    return (
      <DashboardLayout>
        <div className="card text-center py-10">
          <h1 className="text-xl font-bold mb-2">مرحباً بك أيها السوبر أدمن</h1>
          <p className="text-slate-600 mb-5">لديك صلاحيات الإشراف على جميع الجهات في النظام</p>
          <Link to="/admin" className="btn btn-primary">فتح لوحة الإشراف</Link>
        </div>
      </DashboardLayout>
    )
  }

  if (!org) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">لا توجد جهة مرتبطة بحسابك</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 mt-1">{org.name}</p>
        </div>
        <StatusBadge status={org.status} />
      </div>

      {/* تنبيه الجهة المعلقة */}
      {org.status === 'pending' && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
          <div className="font-bold text-yellow-800 mb-1">⏳ جهتك بانتظار الموافقة</div>
          <p className="text-sm text-yellow-700">لن تتمكن من إضافة شاشات أو قوائم عرض حتى تتم الموافقة على جهتك من الإدارة.</p>
        </div>
      )}

      {org.status === 'suspended' && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="font-bold text-red-800 mb-1">🚫 جهتك معلّقة</div>
          <p className="text-sm text-red-700">تم تعليق حسابك. تواصل مع الإدارة لمعرفة التفاصيل.</p>
        </div>
      )}

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="الشاشات" value={stats.screens} />
        <StatCard label="قوائم العرض" value={stats.playlists} />
        <StatCard label="إجمالي العناصر" value={stats.items} />
      </div>

      {/* بطاقات الإجراءات */}
      <div className="grid md:grid-cols-3 gap-4">
        <ActionCard to="/dashboard/screens" icon="📺" title="إدارة الشاشات" desc="إنشاء، ربط، وتوليد روابط" disabled={org.status !== 'active'} />
        <ActionCard to="/dashboard/playlists" icon="📋" title="قوائم العرض" desc="إضافة صور وفيديوهات" disabled={org.status !== 'active'} />
        <ActionCard to="/dashboard/settings" icon="⚙️" title="الإعدادات" desc="اسم الجهة، معلومات التواصل" />
      </div>
    </DashboardLayout>
  )
}

function StatusBadge({ status }) {
  const map = {
    active: { label: 'نشطة', cls: 'badge-green' },
    pending: { label: 'بانتظار الموافقة', cls: 'badge-yellow' },
    suspended: { label: 'معلّقة', cls: 'badge-red' }
  }
  const s = map[status] || { label: status, cls: 'badge-gray' }
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  )
}

function ActionCard({ to, icon, title, desc, disabled }) {
  const content = (
    <div className={`card hover:border-brand-300 transition cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-bold mb-1">{title}</div>
      <div className="text-sm text-slate-500">{desc}</div>
    </div>
  )
  return disabled ? content : <Link to={to}>{content}</Link>
}
