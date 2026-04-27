import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import DashboardLayout from '../components/DashboardLayout'

const PLAN_LABELS = {
  plus: 'Plus',
  pro: 'Pro',
  max: 'Max',
  premium: 'Premium'
}

const STATUS_LABELS = {
  pending: 'بانتظار الموافقة',
  active: 'نشطة',
  suspended: 'معلّقة'
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export default function AdminPage() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  async function loadOrganizations() {
    setLoading(true)

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        org_type,
        contact_info,
        status,
        plan,
        subscription_end_date,
        created_at,
        screens: screens(count),
        playlists: playlists(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      alert('خطأ في تحميل الجهات: ' + error.message)
      setOrganizations([])
    } else {
      setOrganizations(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  async function approveOrganization(orgId) {
    const plan = prompt('اختر الباقة: plus / pro / max / premium', 'plus')
    if (!plan) return

    if (!['plus', 'pro', 'max', 'premium'].includes(plan)) {
      alert('الباقة غير صحيحة')
      return
    }

    const endDate = prompt('تاريخ نهاية الاشتراك بصيغة YYYY-MM-DD', addMonths(new Date(), 1))
    if (!endDate) return

    setSavingId(orgId)

    const { error } = await supabase.rpc('approve_organization_with_plan', {
      _org_id: orgId,
      _plan: plan,
      _end_date: endDate
    })

    setSavingId(null)

    if (error) {
      alert('تعذر اعتماد الجهة: ' + error.message)
      return
    }

    await loadOrganizations()
  }

  async function updatePlan(org) {
    const plan = prompt('اختر الباقة: plus / pro / max / premium', org.plan || 'plus')
    if (!plan) return

    if (!['plus', 'pro', 'max', 'premium'].includes(plan)) {
      alert('الباقة غير صحيحة')
      return
    }

    const endDate = prompt(
      'تاريخ نهاية الاشتراك بصيغة YYYY-MM-DD',
      org.subscription_end_date || addMonths(new Date(), 1)
    )
    if (!endDate) return

    setSavingId(org.id)

    const { error } = await supabase.rpc('update_organization_plan', {
      _org_id: org.id,
      _plan: plan,
      _end_date: endDate
    })

    setSavingId(null)

    if (error) {
      alert('تعذر تحديث الاشتراك: ' + error.message)
      return
    }

    await loadOrganizations()
  }

  async function suspendOrganization(orgId) {
    if (!confirm('هل تريد تعليق هذه الجهة؟')) return

    setSavingId(orgId)

    const { error } = await supabase
      .from('organizations')
      .update({ status: 'suspended' })
      .eq('id', orgId)

    setSavingId(null)

    if (error) {
      alert('تعذر تعليق الجهة: ' + error.message)
      return
    }

    await loadOrganizations()
  }

  async function activateOrganization(orgId) {
    if (!confirm('هل تريد تفعيل هذه الجهة؟')) return

    setSavingId(orgId)

    const { error } = await supabase
      .from('organizations')
      .update({ status: 'active' })
      .eq('id', orgId)

    setSavingId(null)

    if (error) {
      alert('تعذر تفعيل الجهة: ' + error.message)
      return
    }

    await loadOrganizations()
  }

  async function deleteOrganization(orgId) {
    if (!confirm('حذف الجهة سيحذف قوائمها وشاشاتها. هل أنت متأكد؟')) return

    setSavingId(orgId)

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId)

    setSavingId(null)

    if (error) {
      alert('تعذر حذف الجهة: ' + error.message)
      return
    }

    await loadOrganizations()
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">لوحة تحكم السوبر أدمن</h1>
        <p className="text-sm text-slate-500 mt-1">
          إدارة الجهات، الموافقات، الباقات، وحالة الاشتراك.
        </p>
      </div>

      {loading ? (
        <div className="card text-center py-10 text-slate-500">
          جاري تحميل الجهات...
        </div>
      ) : organizations.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🏢</div>
          <h3 className="font-bold mb-1">لا توجد جهات حتى الآن</h3>
          <p className="text-sm text-slate-500">ستظهر طلبات التسجيل هنا بعد إنشاء الجهات.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="text-right py-3 px-2">الجهة</th>
                <th className="text-right py-3 px-2">الحالة</th>
                <th className="text-right py-3 px-2">الباقة</th>
                <th className="text-right py-3 px-2">نهاية الاشتراك</th>
                <th className="text-right py-3 px-2">الشاشات</th>
                <th className="text-right py-3 px-2">القوائم</th>
                <th className="text-right py-3 px-2">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {organizations.map(org => {
                const screensCount = org.screens?.[0]?.count ?? 0
                const playlistsCount = org.playlists?.[0]?.count ?? 0
                const isSaving = savingId === org.id

                return (
                  <tr key={org.id} className="border-b last:border-0">
                    <td className="py-3 px-2">
                      <div className="font-bold">{org.name}</div>
                      <div className="text-xs text-slate-500">{org.contact_info}</div>
                    </td>

                    <td className="py-3 px-2">
                      <span className={
                        org.status === 'active'
                          ? 'badge badge-green'
                          : org.status === 'pending'
                            ? 'badge badge-blue'
                            : 'badge badge-red'
                      }>
                        {STATUS_LABELS[org.status] || org.status}
                      </span>
                    </td>

                    <td className="py-3 px-2">
                      {org.plan ? (
                        <span className="badge badge-blue">{PLAN_LABELS[org.plan]}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-2">
                      {org.subscription_end_date || '—'}
                    </td>

                    <td className="py-3 px-2">{screensCount}</td>
                    <td className="py-3 px-2">{playlistsCount}</td>

                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-2">
                        {org.status === 'pending' && (
                          <button
                            disabled={isSaving}
                            onClick={() => approveOrganization(org.id)}
                            className="btn btn-primary text-xs py-1 px-3"
                          >
                            اعتماد
                          </button>
                        )}

                        {org.status !== 'pending' && (
                          <button
                            disabled={isSaving}
                            onClick={() => updatePlan(org)}
                            className="btn btn-secondary text-xs py-1 px-3"
                          >
                            تعديل الاشتراك
                          </button>
                        )}

                        {org.status === 'active' ? (
                          <button
                            disabled={isSaving}
                            onClick={() => suspendOrganization(org.id)}
                            className="btn btn-secondary text-xs py-1 px-3"
                          >
                            تعليق
                          </button>
                        ) : org.status === 'suspended' ? (
                          <button
                            disabled={isSaving}
                            onClick={() => activateOrganization(org.id)}
                            className="btn btn-secondary text-xs py-1 px-3"
                          >
                            تفعيل
                          </button>
                        ) : null}

                        <button
                          disabled={isSaving}
                          onClick={() => deleteOrganization(org.id)}
                          className="btn text-xs py-1 px-3 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}