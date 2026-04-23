import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PlayerPage() {
  const { publicId } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading') // loading | error | ready | locked
  const [errorMsg, setErrorMsg] = useState('')
  const [screen, setScreen] = useState(null)
  const [items, setItems] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)

  const wakeLockRef = useRef(null)
  const reloadTimerRef = useRef(null)
  const advanceTimerRef = useRef(null)
  const videoRef = useRef(null)

  // --------------------------------------------------------------------------
  // تحميل البيانات الأولية
  // --------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      // 1) جلب بيانات الشاشة عبر الدالة العامة
      const { data: screenData, error: screenErr } = await supabase
        .rpc('get_public_screen', { _public_id: publicId })
        .maybeSingle()

      if (screenErr) throw screenErr
      if (!screenData) {
        setStatus('error')
        setErrorMsg('الشاشة غير موجودة')
        return
      }
      if (!screenData.is_active) {
        setStatus('error')
        setErrorMsg('الشاشة متوقفة حالياً')
        return
      }
      if (!screenData.organization_active) {
        setStatus('error')
        setErrorMsg('الجهة غير نشطة')
        return
      }

      setScreen(screenData)

      // 2) التحقق من الحماية بكلمة سر
      if (screenData.has_password) {
        const unlocked = sessionStorage.getItem(`smarats_unlock_${publicId}`) ||
                         localStorage.getItem(`smarats_unlock_${publicId}`)
        if (!unlocked) {
          navigate(`/s/${publicId}/unlock`)
          return
        }
      }

      // 3) جلب عناصر قائمة العرض
      const { data: itemsData, error: itemsErr } = await supabase
        .rpc('get_public_playlist_items', { _public_id: publicId })

      if (itemsErr) throw itemsErr

      if (!itemsData || itemsData.length === 0) {
        setStatus('error')
        setErrorMsg('لا توجد عناصر في قائمة العرض')
        return
      }

      setItems(itemsData)
      setCurrentIdx(0)
      setStatus('ready')
    } catch (err) {
      console.error('Player load error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'حدث خطأ')
    }
  }, [publicId, navigate])

  useEffect(() => { loadData() }, [loadData])

  // --------------------------------------------------------------------------
  // Wake Lock — منع شاشة التوقف
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'ready') return

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch (e) {
        console.warn('Wake lock failed:', e)
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
      }
    }
  }, [status])

  // --------------------------------------------------------------------------
  // إعادة تحميل تلقائية كل ساعة لجلب التحديثات
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'ready') return
    reloadTimerRef.current = setTimeout(() => {
      window.location.reload()
    }, 60 * 60 * 1000)
    return () => clearTimeout(reloadTimerRef.current)
  }, [status])

  // --------------------------------------------------------------------------
  // إعادة محاولة عند الخطأ كل 30 ثانية
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'error') return
    const t = setTimeout(() => loadData(), 30000)
    return () => clearTimeout(t)
  }, [status, loadData])

  // --------------------------------------------------------------------------
  // منطق التقدم بين العناصر
  // --------------------------------------------------------------------------
  function goNext() {
    setCurrentIdx(idx => (idx + 1) % items.length)
  }

  function scheduleAdvance(seconds) {
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(goNext, seconds * 1000)
  }

  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return
    const item = items[currentIdx]
    if (!item) return

    if (item.item_type !== 'mp4') {
      scheduleAdvance(item.duration_seconds)
    }

    return () => clearTimeout(advanceTimerRef.current)
  }, [currentIdx, status, items])

  // --------------------------------------------------------------------------
  // معالجة أخطاء الوسائط — تخطي للعنصر التالي
  // --------------------------------------------------------------------------
  function handleMediaError(e) {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || item?.resolved_url
    )
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(goNext, 1500)
  }

  if (status === 'loading') {
    return (
      <div className="player-root flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">📺</div>
          <div className="text-xl opacity-70">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="player-root flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4 opacity-50">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">{errorMsg}</h1>
          <p className="text-sm opacity-60 mb-4">سيتم المحاولة مرة أخرى تلقائياً خلال 30 ثانية</p>
          <button onClick={loadData} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">
            إعادة المحاولة الآن
          </button>
        </div>
      </div>
    )
  }

  const item = items[currentIdx]
  if (!item) return null

  return (
    <div className="player-root">
      <div key={item.id} className="player-media">
        {(item.item_type === 'image' || item.item_type === 'drive_image') && (
          <img
            src={item.resolved_url}
            alt={item.title || ''}
            onError={handleMediaError}
          />
        )}

        {item.item_type === 'youtube' && (
          <iframe
            src={item.resolved_url}
            title={item.title || 'YouTube'}
            allow="autoplay; encrypted-media"
            allowFullScreen
            onError={handleMediaError}
          />
        )}

        {item.item_type === 'drive_video' && (
          <iframe
            src={item.resolved_url}
            title={item.title || 'Drive video'}
            allow="autoplay"
            allowFullScreen
            onError={handleMediaError}
          />
        )}

        {item.item_type === 'mp4' && (
          <video
            ref={videoRef}
            src={item.resolved_url}
            autoPlay
            muted
            playsInline
            onEnded={goNext}
            onError={handleMediaError}
          />
        )}
      </div>
    </div>
  )
}
