import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

const PLAN_LABELS = {
  plus: 'بلس',
  pro: 'برو',
  max: 'ماكس',
  premium: 'بريميوم'
}

export default function DashboardPage() {
  const { orgId, role, org, canEdit } = useAuth()
  const [stats, setStats] = useState({ screens: 0, playlists: 0, items: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }

    async function loadData() {
      const [screens, playlists] = await Promise.all([
        supabase.from('screens').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('playlists').select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
      ])

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
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-slate-500 mt-1">
            {org.name}
            {org.plan && <span className="mx-2">·</span>}
            {org.plan && <span className="badge badge-blue text-xs">{PLAN_LABELS[org.plan]}</span>}
          </p>
        </div>
        <StatusBadge status={org.status} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="الشاشات" value={stats.screens} />
        <StatCard label="قوائم العرض" value={stats.playlists} />
        <StatCard label="إجمالي العناصر" value={stats.items} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <ActionCard to="/dashboard/screens" icon="📺" title="إدارة الشاشات" desc="إنشاء، ربط، وتوليد روابط" />
        <ActionCard to="/dashboard/playlists" icon="📋" title="قوائم العرض" desc="إضافة صور وفيديوهات" />
        <ActionCard to="/dashboard/settings" icon="⚙️" title="الإعدادات" desc="بيانات الجهة والاشتراك" />
      </div>

      {!canEdit && (
        <p className="text-xs text-slate-500 mt-6 text-center">
          الإضافة والتعديل غير متاحة حالياً — فقط العرض
        </p>
      )}
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

function ActionCard({ to, icon, title, desc }) {
  return (
    <Link to={to}>
      <div className="card hover:border-brand-300 transition cursor-pointer">
        <div className="text-3xl mb-3">{icon}</div>
        <div className="font-bold mb-1">{title}</div>
        <div className="text-sm text-slate-500">{desc}</div>
      </div>
    </Link>
  )
}
