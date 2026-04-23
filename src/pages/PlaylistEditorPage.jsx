import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import DashboardLayout from '../components/DashboardLayout'
import { resolveMediaUrl, itemTypeLabel } from '../lib/urlUtils'

export default function PlaylistEditorPage() {
  const { id } = useParams()
  const [playlist, setPlaylist] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // نموذج إضافة
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(10)
  const [driveHint, setDriveHint] = useState('image')
  const [preview, setPreview] = useState(null)
  const [adding, setAdding] = useState(false)

  async function load() {
    const [{ data: pl }, { data: it }] = await Promise.all([
      supabase.from('playlists').select('*').eq('id', id).single(),
      supabase.from('playlist_items').select('*').eq('playlist_id', id).order('order_index', { ascending: true })
    ])
    setPlaylist(pl)
    setItems(it || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  // توليد المعاينة أثناء الكتابة
  useEffect(() => {
    if (!url.trim()) { setPreview(null); return }
    const resolved = resolveMediaUrl(url, url.includes('drive.google.com') ? driveHint : null)
    setPreview(resolved)
  }, [url, driveHint])

  async function addItem(e) {
    e.preventDefault()
    if (!preview || preview.error) {
      alert('تأكد من صحة الرابط')
      return
    }

    setAdding(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) : -1
    const { error } = await supabase.from('playlist_items').insert({
      playlist_id: id,
      title: title || null,
      original_url: url,
      resolved_url: preview.resolvedUrl,
      item_type: preview.type,
      duration_seconds: Number(duration),
      order_index: maxOrder + 1
    })
    setAdding(false)

    if (error) return alert('خطأ: ' + error.message)

    setUrl('')
    setTitle('')
    setDuration(10)
    setPreview(null)
    load()
  }

  async function deleteItem(itemId) {
    if (!confirm('حذف هذا العنصر؟')) return
    const { error } = await supabase.from('playlist_items').delete().eq('id', itemId)
    if (error) return alert('خطأ: ' + error.message)
    load()
  }

  async function moveItem(itemId, direction) {
    const idx = items.findIndex(i => i.id === itemId)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= items.length) return

    const item = items[idx]
    const target = items[targetIdx]

    // تبديل order_index
    await Promise.all([
      supabase.from('playlist_items').update({ order_index: target.order_index }).eq('id', item.id),
      supabase.from('playlist_items').update({ order_index: item.order_index }).eq('id', target.id)
    ])
    load()
  }

  async function updateDuration(itemId, newDuration) {
    await supabase.from('playlist_items').update({ duration_seconds: Number(newDuration) }).eq('id', itemId)
    load()
  }

  if (loading) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">جاري التحميل...</div></DashboardLayout>
  }

  if (!playlist) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">القائمة غير موجودة</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <Link to="/dashboard/playlists" className="text-sm text-slate-500 hover:text-slate-700 mb-3 inline-block">← العودة للقوائم</Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">{playlist.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{items.length} عنصر</p>
      </div>

      {/* نموذج إضافة */}
      <form onSubmit={addItem} className="card mb-5">
        <h3 className="font-bold mb-4">إضافة عنصر جديد</h3>
        <div className="space-y-3">
          <div>
            <label className="label">الرابط *</label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="input"
              placeholder="الصق رابط صورة / درايف / يوتيوب / MP4"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">يتم اكتشاف نوع الرابط تلقائياً</p>
          </div>

          {url.includes('drive.google.com') && (
            <div>
              <label className="label">نوع المحتوى من درايف</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2">
                  <input type="radio" value="image" checked={driveHint === 'image'} onChange={e => setDriveHint(e.target.value)} />
                  <span>صورة</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" value="video" checked={driveHint === 'video'} onChange={e => setDriveHint(e.target.value)} />
                  <span>فيديو</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">العنوان (اختياري)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="وصف قصير" />
            </div>
            <div>
              <label className="label">المدة بالثواني</label>
              <input type="number" min={3} max={300} value={duration} onChange={e => setDuration(e.target.value)} className="input" />
            </div>
          </div>

          {/* معاينة */}
          {preview && !preview.error && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <span className="font-medium">النوع المكتشف: </span>
              <span className="badge badge-blue">{itemTypeLabel(preview.type)}</span>
            </div>
          )}
          {preview?.error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{preview.error}</div>
          )}

          <button type="submit" disabled={adding || !preview || preview.error} className="btn btn-primary">
            {adding ? 'جاري الإضافة...' : 'إضافة'}
          </button>
        </div>
      </form>

      {/* قائمة العناصر */}
      {items.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🎞️</div>
          <h3 className="font-bold mb-1">لا توجد عناصر بعد</h3>
          <p className="text-sm text-slate-500">ابدأ بإضافة رابط من النموذج أعلاه</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              onDelete={() => deleteItem(item.id)}
              onMoveUp={() => moveItem(item.id, 'up')}
              onMoveDown={() => moveItem(item.id, 'down')}
              onDurationChange={(d) => updateDuration(item.id, d)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function ItemRow({ item, index, isFirst, isLast, onDelete, onMoveUp, onMoveDown, onDurationChange }) {
  const [editingDuration, setEditingDuration] = useState(false)
  const [tempDuration, setTempDuration] = useState(item.duration_seconds)

  const typeIcons = {
    image: '🖼️',
    youtube: '▶️',
    drive_image: '📁',
    drive_video: '📹',
    mp4: '🎬'
  }

  return (
    <div className="card flex items-center gap-3 py-3">
      <div className="text-slate-400 text-sm w-6 text-center">{index + 1}</div>
      <div className="text-2xl">{typeIcons[item.item_type] || '📄'}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.title || item.original_url}</div>
        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
          <span className="badge badge-gray text-xs">{itemTypeLabel(item.item_type)}</span>
          {editingDuration ? (
            <input
              type="number"
              min={3}
              max={300}
              value={tempDuration}
              onChange={e => setTempDuration(e.target.value)}
              onBlur={() => { onDurationChange(tempDuration); setEditingDuration(false) }}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
              autoFocus
              className="w-16 px-2 py-0.5 text-xs border rounded"
            />
          ) : (
            <button onClick={() => setEditingDuration(true)} className="hover:text-slate-700">
              {item.duration_seconds} ث
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={onMoveUp} disabled={isFirst} className="btn btn-ghost text-xs px-2 disabled:opacity-30">↑</button>
        <button onClick={onMoveDown} disabled={isLast} className="btn btn-ghost text-xs px-2 disabled:opacity-30">↓</button>
        <button onClick={onDelete} className="btn btn-ghost text-xs text-red-600">حذف</button>
      </div>
    </div>
  )
}
