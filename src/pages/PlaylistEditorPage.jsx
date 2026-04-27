import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import { resolveMediaUrl, itemTypeLabel } from '../lib/urlUtils'

export default function PlaylistEditorPage() {
  const { id } = useParams()
  const { canEdit } = useAuth()
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
    setLoading(true)

    const [{ data: pl, error: plError }, { data: it, error: itError }] = await Promise.all([
      supabase.from('playlists').select('*').eq('id', id).single(),
      supabase.from('playlist_items').select('*').eq('playlist_id', id).order('order_index', { ascending: true })
    ])

    if (plError) alert('خطأ في تحميل القائمة: ' + plError.message)
    if (itError) alert('خطأ في تحميل العناصر: ' + itError.message)

    setPlaylist(pl || null)
    setItems(it || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

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
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index ?? 0)) : -1

    const payload = {
      playlist_id: id,
      title: title.trim() || null,
      original_url: url.trim(),
      resolved_url: preview.resolvedUrl,
      item_type: preview.type,
      duration_seconds: Number(duration),
      order_index: maxOrder + 1
    }

    const { data, error } = await supabase
      .from('playlist_items')
      .insert(payload)
      .select('*')
      .single()

    setAdding(false)

    if (error) {
      alert('خطأ: ' + error.message)
      return
    }

    setItems(prev => [...prev, data])
    setUrl('')
    setTitle('')
    setDuration(10)
    setDriveHint('image')
    setPreview(null)
  }

  async function deleteItem(itemId) {
    if (!confirm('حذف هذا العنصر؟')) return
    const oldItems = items
    setItems(prev => prev.filter(i => i.id !== itemId))
    const { error } = await supabase.from('playlist_items').delete().eq('id', itemId)
    if (error) {
      setItems(oldItems)
      alert('خطأ: ' + error.message)
    }
  }

  async function moveItem(itemId, direction) {
    const idx = items.findIndex(i => i.id === itemId)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || targetIdx < 0 || targetIdx >= items.length) return

    const current = items[idx]
    const target = items[targetIdx]

    const swapped = [...items]
    swapped[idx] = { ...target, order_index: current.order_index }
    swapped[targetIdx] = { ...current, order_index: target.order_index }
    setItems(swapped)

    const { error: err1 } = await supabase
      .from('playlist_items')
      .update({ order_index: target.order_index })
      .eq('id', current.id)

    const { error: err2 } = await supabase
      .from('playlist_items')
      .update({ order_index: current.order_index })
      .eq('id', target.id)

    if (err1 || err2) {
      alert('تعذر تحديث الترتيب')
      load()
    }
  }

  async function updateDuration(itemId, newDuration) {
    const numericDuration = Number(newDuration)
    if (!numericDuration || numericDuration < 3 || numericDuration > 300) {
      alert('المدة يجب أن تكون بين 3 و 300 ثانية')
      return
    }

    const oldItems = items
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, duration_seconds: numericDuration } : i))

    const { error } = await supabase
      .from('playlist_items')
      .update({ duration_seconds: numericDuration })
      .eq('id', itemId)

    if (error) {
      setItems(oldItems)
      alert('خطأ: ' + error.message)
    }
  }

  if (loading) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">جاري التحميل...</div></DashboardLayout>
  }

  if (!playlist) {
    return <DashboardLayout><div className="text-center py-12 text-slate-500">القائمة غير موجودة</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <Link to="/dashboard/playlists" className="text-sm text-slate-500 hover:text-slate-700 mb-3 inline-block">
        ← العودة للقوائم
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold">{playlist.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{items.length} عنصر</p>
      </div>

      {!canEdit && (
        <div className="mb-5 p-3 rounded-lg bg-slate-100 text-slate-700 text-sm">
          التعديل غير متاح حالياً. تقدر تشوف العناصر فقط.
        </div>
      )}

      {canEdit && (
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
                <div className="flex gap-4">
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

            {preview && !preview.error && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <div className="mb-1">
                  <span className="font-medium">النوع المكتشف: </span>
                  <span className="badge badge-blue">{itemTypeLabel(preview.type)}</span>
                </div>
                <div className="text-xs text-slate-500 break-all" dir="ltr">{preview.resolvedUrl}</div>
              </div>
            )}

            {preview?.error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{preview.error}</div>
            )}

            <button type="submit" disabled={adding || !preview || !!preview.error} className="btn btn-primary">
              {adding ? 'جاري الإضافة...' : 'إضافة'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🎞️</div>
          <h3 className="font-bold mb-1">لا توجد عناصر بعد</h3>
          {canEdit && <p className="text-sm text-slate-500">ابدأ بإضافة رابط من النموذج أعلاه</p>}
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
              canEdit={canEdit}
              onDelete={() => deleteItem(item.id)}
              onMoveUp={() => moveItem(item.id, 'up')}
              onMoveDown={() => moveItem(item.id, 'down')}
              onDurationChange={d => updateDuration(item.id, d)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

function ItemThumbnail({ item }) {
  const { item_type, resolved_url, original_url } = item

  if (item_type === 'youtube') {
    const match = (original_url || resolved_url || '').match(
      /(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/
    )
    const vidId = match?.[1]
    if (!vidId) return <ThumbFallback icon="▶️" />
    return (
      <div style={{
        width: 72, height: 48, borderRadius: 8, overflow: 'hidden',
        flexShrink: 0, position: 'relative', background: '#000'
      }}>
        <img
          src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.25)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>
    )
  }

  if (item_type === 'image') {
    return (
      <div style={{ width: 72, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
        <img
          src={resolved_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.currentTarget.parentElement.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:22px">🖼️</span>' }}
        />
      </div>
    )
  }

  if (item_type === 'drive_image') {
    return (
      <div style={{ width: 72, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9' }}>
        <img
          src={resolved_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.currentTarget.parentElement.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:22px">📁</span>' }}
        />
      </div>
    )
  }

  if (item_type === 'drive_video') {
    // نحاول نجيب ثمبنيل من Drive
    const fileId = (original_url || '').match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
                   (original_url || '').match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
    if (fileId) {
      return (
        <div style={{
          width: 72, height: 48, borderRadius: 8, overflow: 'hidden',
          flexShrink: 0, background: '#000', position: 'relative'
        }}>
          <img
            src={`https://drive.google.com/thumbnail?id=${fileId}&sz=w200`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      )
    }
    return <ThumbFallback icon="📹" />
  }

  if (item_type === 'mp4') {
    return <ThumbFallback icon="🎬" />
  }

  return <ThumbFallback icon="📄" />
}

function ThumbFallback({ icon }) {
  return (
    <div style={{
      width: 72, height: 48, borderRadius: 8,
      background: '#f1f5f9', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 22, flexShrink: 0,
      border: '1px solid #e2e8f0'
    }}>
      {icon}
    </div>
  )
}

function ItemRow({ item, index, isFirst, isLast, canEdit, onDelete, onMoveUp, onMoveDown, onDurationChange }) {
  const [editingDuration, setEditingDuration] = useState(false)
  const [tempDuration, setTempDuration] = useState(item.duration_seconds)

  useEffect(() => { setTempDuration(item.duration_seconds) }, [item.duration_seconds])

  return (
    <div className="card flex items-center gap-3 py-3">
      <div className="text-slate-400 text-sm w-5 text-center shrink-0">{index + 1}</div>

      {/* ثمبنيل */}
      <ItemThumbnail item={item} />

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-sm">{item.title || item.original_url}</div>

        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="badge badge-gray text-xs">{itemTypeLabel(item.item_type)}</span>

          {canEdit && editingDuration ? (
            <input
              type="number" min={3} max={300} value={tempDuration}
              onChange={e => setTempDuration(e.target.value)}
              onBlur={() => { onDurationChange(tempDuration); setEditingDuration(false) }}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              autoFocus
              className="w-20 px-2 py-0.5 text-xs border rounded"
            />
          ) : canEdit ? (
            <button onClick={() => setEditingDuration(true)} className="hover:text-slate-700">
              {item.duration_seconds} ث
            </button>
          ) : (
            <span>{item.duration_seconds} ث</span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 truncate mt-1" dir="ltr">{item.resolved_url}</div>
      </div>

      {canEdit && (
        <div className="flex gap-1 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="btn btn-ghost text-xs px-2 disabled:opacity-30">↑</button>
          <button onClick={onMoveDown} disabled={isLast} className="btn btn-ghost text-xs px-2 disabled:opacity-30">↓</button>
          <button onClick={onDelete} className="btn btn-ghost text-xs text-red-600">حذف</button>
        </div>
      )}
    </div>
  )
}
