import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

export default function ScreensPage() {
  const { orgId } = useAuth()
  const [screens, setScreens] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlaylistId, setNewPlaylistId] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: scr }, { data: pls }] = await Promise.all([
      supabase.from('screens').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('playlists').select('id, name').eq('organization_id', orgId)
    ])
    setScreens(scr || [])
    setPlaylists(pls || [])
    setLoading(false)
  }

  useEffect(() => { if (orgId) load() }, [orgId])

  async function createScreen(e) {
    e.preventDefault()
    const { error } = await supabase.from('screens').insert({
      organization_id: orgId,
      name: newName,
      playlist_id: newPlaylistId || null
    })
    if (error) return alert('خطأ: ' + error.message)
    setNewName('')
    setNewPlaylistId('')
    setShowNew(false)
    load()
  }

  async function toggleActive(screen) {
    const { error } = await supabase.from('screens').update({ is_active: !screen.is_active }).eq('id', screen.id)
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  async function updateScreen(id, updates) {
    const { error } = await supabase.from('screens').update(updates).eq('id', id)
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  async function deleteScreen(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الشاشة؟')) return
    const { error } = await supabase.from('screens').delete().eq('id', id)
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  function copyLink(screen) {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}s/${screen.public_id}`
    navigator.clipboard.writeText(url)
    setCopiedId(screen.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">الشاشات</h1>
          <p className="text-sm text-slate-500 mt-1">كل شاشة لها رابط عرض فريد</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn btn-primary">+ شاشة جديدة</button>
      </div>

      {showNew && (
        <form onSubmit={createScreen} className="card mb-5">
          <h3 className="font-bold mb-4">إنشاء شاشة جديدة</h3>
          <div className="space-y-3">
            <div>
              <label className="label">اسم الشاشة</label>
              <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="مثال: شاشة الاستقبال" />
            </div>
            <div>
              <label className="label">قائمة العرض (اختياري)</label>
              <select value={newPlaylistId} onChange={e => setNewPlaylistId(e.target.value)} className="input">
                <option value="">— بدون —</option>
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary">إنشاء</button>
              <button type="button" onClick={() => setShowNew(false)} className="btn btn-secondary">إلغاء</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">جاري التحميل...</div>
      ) : screens.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📺</div>
          <h3 className="font-bold mb-1">لا توجد شاشات بعد</h3>
          <p className="text-sm text-slate-500 mb-4">أنشئ أول شاشة لك للبدء</p>
          <button onClick={() => setShowNew(true)} className="btn btn-primary">+ شاشة جديدة</button>
        </div>
      ) : (
        <div className="space-y-3">
          {screens.map(screen => (
            <ScreenRow
              key={screen.id}
              screen={screen}
              playlists={playlists}
              isEditing={editingId === screen.id}
              onEdit={() => setEditingId(screen.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(updates) => { updateScreen(screen.id, updates); setEditingId(null) }}
              onToggle={() => toggleActive(screen)}
              onDelete={() => deleteScreen(screen.id)}
              onCopy={() => copyLink(screen)}
              copied={copiedId === screen.id}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function ScreenRow({ screen, playlists, isEditing, onEdit, onCancelEdit, onSave, onToggle, onDelete, onCopy, copied }) {
  const [name, setName] = useState(screen.name)
  const [playlistId, setPlaylistId] = useState(screen.playlist_id || '')
  const [password, setPassword] = useState('')
  const [clearPassword, setClearPassword] = useState(false)

  const playlistName = playlists.find(p => p.id === screen.playlist_id)?.name
  const url = `${window.location.origin}${import.meta.env.BASE_URL}s/${screen.public_id}`

  if (isEditing) {
    return (
      <div className="card">
        <h3 className="font-bold mb-3">تعديل الشاشة</h3>
        <div className="space-y-3">
          <div>
            <label className="label">الاسم</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">قائمة العرض</label>
            <select value={playlistId} onChange={e => setPlaylistId(e.target.value)} className="input">
              <option value="">— بدون —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">كلمة سر الحماية (اختياري)</label>
            {screen.password_hash && !clearPassword && (
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-blue">🔒 محمية بكلمة سر</span>
                <button type="button" onClick={() => setClearPassword(true)} className="btn btn-ghost text-xs">إزالة الحماية</button>
              </div>
            )}
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder={screen.password_hash ? 'أدخل كلمة جديدة للتغيير' : 'اتركه فارغاً لعدم الحماية'}
              dir="ltr"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                const updates = { name, playlist_id: playlistId || null }
                if (password) updates.password_hash = password  // سنستخدم bcrypt لاحقاً، حالياً نحتفظ بها كنص
                if (clearPassword) updates.password_hash = null
                onSave(updates)
              }}
              className="btn btn-primary"
            >حفظ</button>
            <button onClick={onCancelEdit} className="btn btn-secondary">إلغاء</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold">{screen.name}</h3>
            {screen.password_hash && <span className="badge badge-blue text-xs">🔒 محمية</span>}
          </div>
          <p className="text-sm text-slate-500">
            {playlistName ? `قائمة: ${playlistName}` : 'لا توجد قائمة مرتبطة'}
          </p>
        </div>
        <span className={`badge ${screen.is_active ? 'badge-green' : 'badge-gray'}`}>
          {screen.is_active ? 'مفعلة' : 'متوقفة'}
        </span>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 mb-3">
        <code className="flex-1 text-xs text-slate-600 truncate" dir="ltr">{url}</code>
        <button onClick={onCopy} className="btn btn-secondary text-xs px-3 py-1">
          {copied ? '✓ تم النسخ' : 'نسخ'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-xs px-3 py-1">فتح</a>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={onEdit} className="btn btn-ghost text-xs">تعديل</button>
        <button onClick={onToggle} className="btn btn-ghost text-xs">
          {screen.is_active ? 'إيقاف' : 'تفعيل'}
        </button>
        <button onClick={onDelete} className="btn btn-ghost text-xs text-red-600">حذف</button>
      </div>
    </div>
  )
}
