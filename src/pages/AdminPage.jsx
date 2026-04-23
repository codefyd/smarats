import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import DashboardLayout from '../components/DashboardLayout'

export default function AdminPage() {
  const [orgs, setOrgs] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, suspended: 0, screens: 0, items: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    setOrgs(orgsData || [])

    // الإحصائيات
    const [screens, items] = await Promise.all([
      supabase.from('screens').select('id', { count: 'exact', head: true }),
      supabase.from('playlist_items').select('id', { count: 'exact', head: true })
    ])

    const total = orgsData?.length || 0
    const pending = orgsData?.filter(o => o.status === 'pending').length || 0
    const active = orgsData?.filter(o => o.status === 'active').length || 0
    const suspended = orgsData?.filter(o => o.status === 'suspended').length || 0

    setStats({
      total,
      pending,
      active,
      suspended,
      screens: screens.count || 0,
      items: items.count || 0
    })

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(orgId) {
    const { error } = await supabase.rpc('approve_organization', { _org_id: orgId })
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  async function setStatus(orgId, status) {
    const { error } = await supabase.rpc('set_organization_status', { _org_id: orgId, _status: status })
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  const filteredOrgs = filter === 'all' ? orgs : orgs.filter(o => o.status === filter)

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="badge badge-blue mb-2">سوبر أدمن</div>
        <h1 className="text-2xl font-bold">لوحة الإشراف العامة</h1>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="إجمالي الجهات" value={stats.total} />
        <StatCard label="بانتظار الموافقة" value={stats.pending} accent={stats.pending > 0 ? 'warning' : null} />
        <StatCard label="الشاشات" value={stats.screens} />
        <StatCard label="العناصر" value={stats.items} />
      </div>

      {/* فلاتر */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>الكل ({stats.total})</FilterBtn>
        <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')}>بانتظار ({stats.pending})</FilterBtn>
        <FilterBtn active={filter === 'active'} onClick={() => setFilter('active')}>نشطة ({stats.active})</FilterBtn>
        <FilterBtn active={filter === 'suspended'} onClick={() => setFilter('suspended')}>معلّقة ({stats.suspended})</FilterBtn>
      </div>

      {/* قائمة الجهات */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
      ) : filteredOrgs.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">لا توجد جهات في هذا التصنيف</div>
      ) : (
        <div className="space-y-2">
          {filteredOrgs.map(org => (
            <OrgRow key={org.id} org={org} onApprove={() => approve(org.id)} onSetStatus={(s) => setStatus(org.id, s)} />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function StatCard({ label, value, accent }) {
  const accentClass = accent === 'warning' ? 'text-yellow-600' : ''
  return (
    <div className="card">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${accentClass}`}>{value}</div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function OrgRow({ org, onApprove, onSetStatus }) {
  const typeLabels = {
    company: 'شركة',
    charity: 'جمعية خيرية',
    government: 'مؤسسة حكومية',
    other: 'أخرى'
  }

  const statusBadge = {
    pending: { label: 'بانتظار الموافقة', cls: 'badge-yellow' },
    active: { label: 'نشطة', cls: 'badge-green' },
    suspended: { label: 'معلّقة', cls: 'badge-red' }
  }[org.status]

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">{org.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span>{typeLabels[org.org_type] || org.org_type}</span>
            <span>·</span>
            <span>{new Date(org.created_at).toLocaleDateString('ar-SA')}</span>
          </div>
          {org.contact_info && <p className="text-xs text-slate-500 mt-1">{org.contact_info}</p>}
        </div>
        <span className={`badge ${statusBadge?.cls || 'badge-gray'}`}>{statusBadge?.label || org.status}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {org.status === 'pending' && (
          <>
            <button onClick={onApprove} className="btn btn-primary text-xs">✓ موافقة</button>
            <button onClick={() => onSetStatus('suspended')} className="btn btn-danger text-xs">رفض</button>
          </>
        )}
        {org.status === 'active' && (
          <button onClick={() => onSetStatus('suspended')} className="btn btn-danger text-xs">تعليق</button>
        )}
        {org.status === 'suspended' && (
          <button onClick={() => onSetStatus('active')} className="btn btn-primary text-xs">إعادة تفعيل</button>
        )}
      </div>
    </div>
  )
}
