import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import DashboardLayout from '../components/DashboardLayout'

const PLAN_LABELS = {
  plus: 'بلس (5/5)',
  pro: 'برو (10/10)',
  max: 'ماكس (20/20)',
  premium: 'بريميوم (لا محدود)'
}

const PLAN_LIMITS = {
  plus: { screens: 5, playlists: 5 },
  pro: { screens: 10, playlists: 10 },
  max: { screens: 20, playlists: 20 },
  premium: { screens: -1, playlists: -1 }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  } catch { return dateStr }
}

function defaultEndDate(months = 12) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export default function AdminPage() {
  const [orgs, setOrgs] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, suspended: 0, screens: 0, items: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modalOrg, setModalOrg] = useState(null)  // الجهة المفتوحة في نافذة التحكم

  async function load() {
    setLoading(true)
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    setOrgs(orgsData || [])

    const [screens, items] = await Promise.all([
      supabase.from('screens').select('id', { count: 'exact', head: true }),
      supabase.from('playlist_items').select('id', { count: 'exact', head: true })
    ])

    const total = orgsData?.length || 0
    const pending = orgsData?.filter(o => o.status === 'pending').length || 0
    const active = orgsData?.filter(o => o.status === 'active').length || 0
    const suspended = orgsData?.filter(o => o.status === 'suspended').length || 0

    setStats({
      total, pending, active, suspended,
      screens: screens.count || 0,
      items: items.count || 0
    })

    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="إجمالي الجهات" value={stats.total} />
        <StatCard label="بانتظار الموافقة" value={stats.pending} accent={stats.pending > 0 ? 'warning' : null} />
        <StatCard label="الشاشات" value={stats.screens} />
        <StatCard label="العناصر" value={stats.items} />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>الكل ({stats.total})</FilterBtn>
        <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')}>بانتظار ({stats.pending})</FilterBtn>
        <FilterBtn active={filter === 'active'} onClick={() => setFilter('active')}>نشطة ({stats.active})</FilterBtn>
        <FilterBtn active={filter === 'suspended'} onClick={() => setFilter('suspended')}>معلّقة ({stats.suspended})</FilterBtn>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
      ) : filteredOrgs.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">لا توجد جهات في هذا التصنيف</div>
      ) : (
        <div className="space-y-2">
          {filteredOrgs.map(org => (
            <OrgRow
              key={org.id}
              org={org}
              onOpenManage={() => setModalOrg(org)}
              onSetStatus={(s) => setStatus(org.id, s)}
            />
          ))}
        </div>
      )}

      {modalOrg && (
        <ManageOrgModal
          org={modalOrg}
          onClose={() => setModalOrg(null)}
          onSaved={() => { setModalOrg(null); load() }}
        />
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

function OrgRow({ org, onOpenManage, onSetStatus }) {
  const typeLabels = {
    company: 'شركة', charity: 'جمعية خيرية',
    government: 'مؤسسة حكومية', other: 'أخرى'
  }

  const statusBadge = {
    pending: { label: 'بانتظار الموافقة', cls: 'badge-yellow' },
    active: { label: 'نشطة', cls: 'badge-green' },
    suspended: { label: 'معلّقة', cls: 'badge-red' }
  }[org.status]

  // حساب حالة الاشتراك بصرياً
  let subInfo = null
  if (org.status === 'active' && org.subscription_end_date) {
    const today = new Date(); today.setHours(0,0,0,0)
    const end = new Date(org.subscription_end_date)
    const days = Math.ceil((end - today) / (1000*60*60*24))
    if (days < 0) subInfo = { text: `منتهي منذ ${-days} يوم`, cls: 'text-red-600' }
    else if (days <= 20) subInfo = { text: `ينتهي خلال ${days} يوم`, cls: 'text-amber-600' }
    else subInfo = { text: `ينتهي ${formatDate(org.subscription_end_date)}`, cls: 'text-slate-500' }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">{org.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 flex-wrap">
            <span>{typeLabels[org.org_type] || org.org_type}</span>
            <span>·</span>
            <span>{formatDate(org.created_at)}</span>
            {org.plan && (
              <>
                <span>·</span>
                <span className="badge badge-blue text-xs">{PLAN_LABELS[org.plan]}</span>
              </>
            )}
          </div>
          {org.contact_info && (
            <p className="text-xs text-slate-600 mt-1">📞 <span dir="ltr">{org.contact_info}</span></p>
          )}
          {subInfo && <p className={`text-xs mt-1 ${subInfo.cls}`}>{subInfo.text}</p>}
        </div>
        <span className={`badge ${statusBadge?.cls || 'badge-gray'}`}>{statusBadge?.label || org.status}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {org.status === 'pending' && (
          <>
            <button onClick={onOpenManage} className="btn btn-primary text-xs">✓ موافقة + تحديد باقة</button>
            <button onClick={() => onSetStatus('suspended')} className="btn btn-danger text-xs">رفض</button>
          </>
        )}
        {org.status === 'active' && (
          <>
            <button onClick={onOpenManage} className="btn btn-secondary text-xs">إدارة الباقة والاشتراك</button>
            <button onClick={() => onSetStatus('suspended')} className="btn btn-danger text-xs">تعليق</button>
          </>
        )}
        {org.status === 'suspended' && (
          <>
            <button onClick={onOpenManage} className="btn btn-primary text-xs">إعادة تفعيل + باقة</button>
          </>
        )}
      </div>
    </div>
  )
}

function ManageOrgModal({ org, onClose, onSaved }) {
  const isApproval = org.status !== 'active'
  const [plan, setPlan] = useState(org.plan || 'pro')
  const [endDate, setEndDate] = useState(
    org.subscription_end_date || defaultEndDate(12)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({ screens: 0, playlists: 0 })
  const [loadingCounts, setLoadingCounts] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ count: scrCount }, { count: plCount }] = await Promise.all([
        supabase.from('screens').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
        supabase.from('playlists').select('id', { count: 'exact', head: true }).eq('organization_id', org.id)
      ])
      setCounts({ screens: scrCount || 0, playlists: plCount || 0 })
      setLoadingCounts(false)
    })()
  }, [org.id])

  const limits = PLAN_LIMITS[plan]
  const willDisableScreens =
    limits.screens > 0 && counts.screens > limits.screens
      ? counts.screens - limits.screens : 0
  const playlistsExcess =
    limits.playlists > 0 && counts.playlists > limits.playlists
      ? counts.playlists - limits.playlists : 0

  async function save() {
    setError('')

    const today = new Date(); today.setHours(0,0,0,0)
    const end = new Date(endDate)
    if (end <= today) {
      setError('تاريخ نهاية الاشتراك يجب أن يكون في المستقبل')
      return
    }

    setSaving(true)
    try {
      // عند الموافقة الأولى: نستخدم approve_organization_with_plan
      // وإلا: نستخدم update_organization_plan
      const rpcName = isApproval
        ? 'approve_organization_with_plan'
        : 'update_organization_plan'

      const { data, error: rpcErr } = await supabase.rpc(rpcName, {
        _org_id: org.id,
        _plan: plan,
        _end_date: endDate
      })

      if (rpcErr) throw rpcErr

      // إذا تم تعطيل شاشات، نُعلم السوبر أدمن
      if (data && data.screens_disabled > 0) {
        alert(`تم حفظ التغييرات. تم تعطيل ${data.screens_disabled} شاشة لتجاوز حد الباقة الجديد.`)
      }

      onSaved()
    } catch (err) {
      setError(err.message || 'خطأ غير متوقع')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-lg">{isApproval ? 'الموافقة على الجهة' : 'إدارة الاشتراك'}</h2>
          <p className="text-xs text-slate-500 mt-1">{org.name}</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">الباقة</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} className="input">
              <option value="plus">بلس — 5 شاشات + 5 قوائم عرض</option>
              <option value="pro">برو — 10 شاشات + 10 قوائم عرض</option>
              <option value="max">ماكس — 20 شاشة + 20 قائمة عرض</option>
              <option value="premium">بريميوم — لا محدود (لا يُعرض للعملاء)</option>
            </select>
          </div>

          <div>
            <label className="label">تاريخ نهاية الاشتراك</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="input"
              min={new Date().toISOString().slice(0,10)}
              dir="ltr"
            />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setEndDate(defaultEndDate(1))} className="btn btn-ghost text-xs">شهر</button>
              <button type="button" onClick={() => setEndDate(defaultEndDate(3))} className="btn btn-ghost text-xs">3 أشهر</button>
              <button type="button" onClick={() => setEndDate(defaultEndDate(6))} className="btn btn-ghost text-xs">6 أشهر</button>
              <button type="button" onClick={() => setEndDate(defaultEndDate(12))} className="btn btn-ghost text-xs">سنة</button>
            </div>
          </div>

          {/* عرض الاستخدام الحالي والتأثير */}
          {!loadingCounts && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
              <div className="font-medium text-slate-700 mb-2">الاستخدام الحالي</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">الشاشات: </span>
                  <span className="font-medium">
                    {counts.screens} / {limits.screens === -1 ? '∞' : limits.screens}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">القوائم: </span>
                  <span className="font-medium">
                    {counts.playlists} / {limits.playlists === -1 ? '∞' : limits.playlists}
                  </span>
                </div>
              </div>

              {willDisableScreens > 0 && (
                <div className="mt-2 p-2 rounded bg-amber-50 text-amber-800 text-xs">
                  ⚠️ سيتم تعطيل {willDisableScreens} شاشة (الأحدث) تلقائياً عند الحفظ
                </div>
              )}
              {playlistsExcess > 0 && (
                <div className="mt-2 p-2 rounded bg-amber-50 text-amber-800 text-xs">
                  ⚠️ يوجد {playlistsExcess} قائمة زائدة عن الحد. لن يستطيع العميل إضافة قوائم حتى يحذف الزائد.
                </div>
              )}
            </div>
          )}

          {error && <div className="p-2 rounded bg-red-50 text-red-700 text-xs">{error}</div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">
            {saving ? 'جاري الحفظ...' : (isApproval ? 'موافقة وتفعيل' : 'حفظ التغييرات')}
          </button>
        </div>
      </div>
    </div>
  )
}
