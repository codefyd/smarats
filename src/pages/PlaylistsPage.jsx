import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

export default function PlaylistsPage() {
  const { orgId } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    setPlaylists(data || [])

    // جلب عدد العناصر لكل قائمة
    if (data && data.length > 0) {
      const countsMap = {}
      for (const p of data) {
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
      name: newName
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

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">قوائم العرض</h1>
          <p className="text-sm text-slate-500 mt-1">نظّم المحتوى في قوائم واربطها بالشاشات</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn btn-primary">+ قائمة جديدة</button>
      </div>

      {showNew && (
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
          <button onClick={() => setShowNew(true)} className="btn btn-primary">+ قائمة جديدة</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {playlists.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold">{p.name}</h3>
                <span className="text-sm text-slate-500">{counts[p.id] || 0} عنصر</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Link to={`/dashboard/playlists/${p.id}`} className="btn btn-secondary text-xs flex-1">تعديل المحتوى</Link>
                <button onClick={() => deletePlaylist(p.id)} className="btn btn-ghost text-xs text-red-600">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
