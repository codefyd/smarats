import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

export default function PlaylistsPage() {
  const { orgId, canEdit, org } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [counts, setCounts] = useState({})
  const [usedPlaylistIds, setUsedPlaylistIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [limits, setLimits] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: pls }, { data: scrs }, { data: limitsData }] = await Promise.all([
      supabase.from('playlists').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('screens').select('playlist_id').eq('organization_id', orgId).not('playlist_id', 'is', null),
      supabase.rpc('check_can_create', { _org_id: orgId, _resource: 'playlist' })
    ])

    setPlaylists(pls || [])
    setLimits(limitsData || null)
    setUsedPlaylistIds(new Set((scrs || []).map(s => s.playlist_id)))

    if (pls && pls.length > 0) {
      const countsMap = {}
      for (const p of pls) {
        const { count } = await supabase
          .from('playlist_items')
          .select('id', { count: 'exact', head: true })
          .eq('playlist_id', p.id)
        countsMap[p.id] = count || 0
      }
      setCounts(countsMap)
    }

    setLoading(false)
  }

  useEffect(() => { if (orgId) load() }, [orgId])

  async function createPlaylist(e) {
    e.preventDefault()
    const { error } = await supabase.from('playlists').insert({
      organization_id: orgId,
      name: newName.trim()
    })
    if (error) return alert('خطأ: ' + error.message)
    setNewName('')
    setShowNew(false)
    load()
  }

  async function deletePlaylist(id) {
    if (!confirm('هل أنت متأكد من حذف هذه القائمة؟ سيتم حذف كل عناصرها.')) return
    const { error } = await supabase.from('playlists').delete().eq('id', id)
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  const limitInfo = limits ? (
    limits.max === null
      ? `${limits.current} قائمة (غير محدود)`
      : `${limits.current} / ${limits.max} قائمة`
  ) : ''

  const canCreateMore = canEdit && limits?.allowed

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">قوائم العرض</h1>
          <p className="text-sm text-slate-500 mt-1">
            نظّم المحتوى في قوائم واربطها بالشاشات
            {limitInfo && <span className="mx-2">·</span>}
            {limitInfo && <span className="font-medium text-slate-700">{limitInfo}</span>}
          </p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          disabled={!canCreateMore}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + قائمة جديدة
        </button>
      </div>

      {!canEdit && org && (
        <div className="mb-5 p-3 rounded-lg bg-slate-100 text-slate-700 text-sm">
          التعديل والإضافة غير متاحة حالياً. تقدر تشوف القوائم فقط.
        </div>
      )}

      {canEdit && limits && !limits.allowed && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
          لقد وصلت إلى حد باقتك ({limits.max} قوائم). احذف قائمة قائمة أو ترقّى الباقة.
        </div>
      )}

      {showNew && canCreateMore && (
        <form onSubmit={createPlaylist} className="card mb-5">
          <h3 className="font-bold mb-3">قائمة جديدة</h3>
          <label className="label">اسم القائمة</label>
          <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="input mb-3" placeholder="مثال: الحملات الرمضانية" />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">إنشاء</button>
            <button type="button" onClick={() => setShowNew(false)} className="btn btn-secondary">إلغاء</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
      ) : playlists.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-bold mb-1">لا توجد قوائم عرض بعد</h3>
          <p className="text-sm text-slate-500 mb-4">أنشئ قائمة للبدء بإضافة محتوى</p>
          {canCreateMore && (
            <button onClick={() => setShowNew(true)} className="btn btn-primary">+ قائمة جديدة</button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {playlists.map(p => {
            const isUsed = usedPlaylistIds.has(p.id)
            return (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{counts[p.id] || 0} عنصر</span>
                      {isUsed ? (
                        <span className="badge badge-green text-xs">مرتبطة بشاشة</span>
                      ) : (
                        <span className="badge badge-gray text-xs">غير مرتبطة</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link to={`/dashboard/playlists/${p.id}`} className="btn btn-secondary text-xs flex-1">
                    {canEdit ? 'تعديل المحتوى' : 'عرض المحتوى'}
                  </Link>
                  {canEdit && (
                    <button onClick={() => deletePlaylist(p.id)} className="btn btn-ghost text-xs text-red-600">حذف</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
