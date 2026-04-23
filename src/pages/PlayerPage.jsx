import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PlayerPage() {
  const { publicId } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading') // loading | error | ready
  const [errorMsg, setErrorMsg] = useState('')
  const [screen, setScreen] = useState(null)
  const [items, setItems] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)

  const wakeLockRef = useRef(null)
  const reloadTimerRef = useRef(null)
  const advanceTimerRef = useRef(null)
  const pollTimerRef = useRef(null)
  const videoRef = useRef(null)

  // نخزن أحدث القيم داخل refs حتى لا يقع polling في stale closure
  const itemsRef = useRef([])
  const currentIdxRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  // --------------------------------------------------------------------------
  // تحميل البيانات
  // --------------------------------------------------------------------------
  const loadData = useCallback(async (preserveCurrent = false) => {
    try {
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

      if (screenData.has_password) {
        const unlocked =
          sessionStorage.getItem(`smarats_unlock_${publicId}`) ||
          localStorage.getItem(`smarats_unlock_${publicId}`)

        if (!unlocked) {
          navigate(`/s/${publicId}/unlock`)
          return
        }
      }

      const { data: itemsData, error: itemsErr } = await supabase
        .rpc('get_public_playlist_items', { _public_id: publicId })

      if (itemsErr) throw itemsErr

      if (!itemsData || itemsData.length === 0) {
        setStatus('error')
        setErrorMsg('لا توجد عناصر في قائمة العرض')
        return
      }

      const nextItems = itemsData

      if (!preserveCurrent) {
        setItems(nextItems)
        setCurrentIdx(0)
        setStatus('ready')
        return
      }

      const prevItems = itemsRef.current
      const prevIdx = currentIdxRef.current
      const currentItem = prevItems?.[prevIdx]

      setItems(nextItems)

      if (!currentItem) {
        setCurrentIdx(prev => {
          if (nextItems.length === 0) return 0
          return Math.min(prev, nextItems.length - 1)
        })
        setStatus('ready')
        return
      }

      const sameItemNewIndex = nextItems.findIndex(i => i.id === currentItem.id)

      if (sameItemNewIndex >= 0) {
        // نفس العنصر ما زال موجودًا، نحافظ عليه
        setCurrentIdx(sameItemNewIndex)
      } else {
        // العنصر الحالي انحذف، نثبت على أقرب عنصر ممكن
        setCurrentIdx(prev => {
          if (nextItems.length === 0) return 0
          return Math.min(prev, nextItems.length - 1)
        })
      }

      setStatus('ready')
    } catch (err) {
      console.error('Player load error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'حدث خطأ')
    }
  }, [publicId, navigate])

  useEffect(() => {
    loadData(false)
  }, [loadData])

  // --------------------------------------------------------------------------
  // Wake Lock
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
  // إعادة تحميل كاملة كل ساعة
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'ready') return

    reloadTimerRef.current = setTimeout(() => {
      window.location.reload()
    }, 60 * 60 * 1000)

    return () => clearTimeout(reloadTimerRef.current)
  }, [status])

  // --------------------------------------------------------------------------
  // Polling تلقائي بدون إرجاع للبداية
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'ready') return

    pollTimerRef.current = setInterval(() => {
      loadData(true)
    }, 10000)

    return () => clearInterval(pollTimerRef.current)
  }, [status, loadData])

  // --------------------------------------------------------------------------
  // إعادة محاولة عند الخطأ
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'error') return
    const t = setTimeout(() => loadData(false), 30000)
    return () => clearTimeout(t)
  }, [status, loadData])

  // --------------------------------------------------------------------------
  // التنقل بين العناصر
  // --------------------------------------------------------------------------
  function goNext() {
    setCurrentIdx(idx => {
      if (!itemsRef.current.length) return 0
      return (idx + 1) % itemsRef.current.length
    })
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
  // أخطاء الوسائط
  // --------------------------------------------------------------------------
  function handleMediaError(e) {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || itemsRef.current?.[currentIdxRef.current]?.resolved_url
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
          <p className="text-sm opacity-60 mb-4">
            سيتم المحاولة مرة أخرى تلقائياً خلال 30 ثانية
          </p>
          <button
            onClick={() => loadData(false)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
          >
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
