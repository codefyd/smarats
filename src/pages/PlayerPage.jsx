import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  extractYouTubeId,
  extractDriveFileId,
  buildYouTubeEmbedUrl,
  buildDriveImageUrl
} from '../lib/urlUtils'
import {
  registerPlayerSW,
  precacheUrls,
  invalidateUrls
} from '../lib/swManager'

// ============================================================================
// سياسة Polling التكيّفية (Adaptive Polling)
//   - بداية: 10 ثوانٍ
//   - بعد 6 محاولات بدون تغيير (دقيقة): نرفع لـ 30 ثانية
//   - بعد 30 محاولة بدون تغيير (15 دقيقة): نرفع لـ 60 ثانية
//   - عند أي تغيير: نعيد لـ 10 ثوانٍ
// ============================================================================
const POLL_FAST = 10_000   // 10s
const POLL_MED = 30_000    // 3000s
const POLL_SLOW = 60_000   // 6000s
const STEP_TO_MED = 6      // 6 × 10s = دقيقة
const STEP_TO_SLOW = 30    // 30 × 10s/30s متراكم

// ============================================================================
// أدوات مساعدة
// ============================================================================
function arraysEqualByIdentity(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false
    if (a[i]?.resolved_url !== b[i]?.resolved_url) return false
    if (a[i]?.duration_seconds !== b[i]?.duration_seconds) return false
    if (a[i]?.order_index !== b[i]?.order_index) return false
  }
  return true
}

function isVideoItem(item) {
  return item?.item_type === 'mp4' || item?.item_type === 'drive_video'
}

function getEffectiveDurationSeconds(item) {
  const seconds = Number(item?.duration_seconds)
  if (Number.isFinite(seconds) && seconds > 0) return seconds
  return null
}

function normalizePlayableItem(item) {
  if (!item) return item

  if (item.item_type === 'drive_video') {
    const fileId = extractDriveFileId(item.original_url || item.resolved_url)
    return {
      ...item,
      resolved_url: item.resolved_url,
      poster_url: fileId ? buildDriveImageUrl(fileId) : item.poster_url || ''
    }
  }

  if (item.item_type === 'drive_image') {
    return { ...item, resolved_url: item.resolved_url }
  }

  if (item.item_type === 'youtube') {
    const videoId = extractYouTubeId(item.original_url || item.resolved_url)
    if (!videoId) return item
    return {
      ...item,
      resolved_url: buildYouTubeEmbedUrl(videoId, false)
    }
  }

  return item
}

function preloadItem(item) {
  return new Promise((resolve) => {
    if (!item) { resolve(false); return }

    let settled = false
    const safeResolve = () => { if (settled) return; settled = true; resolve(true) }

    if (item.item_type === 'image' || item.item_type === 'drive_image') {
      const img = new Image()
      img.onload = safeResolve
      img.onerror = safeResolve
      img.src = item.resolved_url
      return
    }

    if (item.item_type === 'mp4' || item.item_type === 'drive_video') {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      video.oncanplay = safeResolve
      video.onloadeddata = safeResolve
      video.onerror = safeResolve
      video.src = item.resolved_url
      video.load()
      setTimeout(safeResolve, 1500)
      return
    }

    if (item.item_type === 'youtube') {
      setTimeout(safeResolve, 250)
      return
    }

    safeResolve()
  })
}

// ============================================================================
// استخراج URLs للـ precache من قائمة العناصر
// نتجاهل YouTube (Cross-Origin)، نخزّن فقط الصور والفيديوهات المباشرة و Drive
// ============================================================================
function getCachableUrls(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((it) => it && it.item_type !== 'youtube')
    .map((it) => it.resolved_url)
    .filter(Boolean)
}

function MediaNode({ item, isActive, onEnded, onError, videoRef }) {
  useEffect(() => {
    const video = videoRef?.current
    if (!video || !isVideoItem(item)) return

    if (isActive) {
      const playNow = async () => {
        try {
          video.pause()
          video.currentTime = 0
          video.muted = true
          video.playsInline = true
          const p = video.play()
          if (p?.catch) p.catch((err) => console.warn('Video autoplay failed:', err))
        } catch (err) { console.warn('Video autoplay failed:', err) }
      }
      playNow()
    } else {
      try { video.pause(); video.currentTime = 0 } catch (_) {}
    }
  }, [isActive, item, videoRef])

  if (!item) return null

  if (item.item_type === 'image' || item.item_type === 'drive_image') {
    return <img src={item.resolved_url} alt={item.title || ''} onError={onError} draggable="false" />
  }

  if (item.item_type === 'youtube') {
    return (
      <iframe
        src={item.resolved_url}
        title={item.title || 'YouTube'}
        allow="autoplay; encrypted-media"
        allowFullScreen={false}
        onError={onError}
      />
    )
  }

  if (isVideoItem(item)) {
    return (
      <video
        ref={videoRef}
        src={item.resolved_url}
        poster={item.poster_url}
        muted
        playsInline
        preload="auto"
        controls={false}
        onEnded={onEnded}
        onError={onError}
      />
    )
  }

  return null
}

export default function PlayerPage() {
  const { publicId } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [errorKind, setErrorKind] = useState('') // 'expired' | 'inactive' | 'not_found' | 'no_items'
  const [, setScreen] = useState(null)
  const [items, setItems] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [activeLayer, setActiveLayer] = useState('a')
  const [layerAItem, setLayerAItem] = useState(null)
  const [layerBItem, setLayerBItem] = useState(null)

  const wakeLockRef = useRef(null)
  const reloadTimerRef = useRef(null)
  const advanceTimerRef = useRef(null)
  const pollTimerRef = useRef(null)
  const transitionRef = useRef(false)

  const itemsRef = useRef([])
  const currentIdxRef = useRef(0)
  const activeLayerRef = useRef('a')

  // ============== ETag state ==============
  const fingerprintRef = useRef(null)         // البصمة الحالية المعروفة للعميل
  const unchangedCountRef = useRef(0)         // عدد الـ polls المتتالية بدون تغيير
  const pollIntervalRef = useRef(POLL_FAST)   // الفترة الحالية

  const videoARef = useRef(null)
  const videoBRef = useRef(null)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { activeLayerRef.current = activeLayer }, [activeLayer])

  // ============================================================================
  // تسجيل الـ Service Worker مرة واحدة
  // ============================================================================
  useEffect(() => {
    registerPlayerSW().catch((err) => {
      console.warn('SW registration failed:', err)
    })
  }, [])

  const clearAdvanceTimer = useCallback(() => {
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = null
  }, [])

  const getCurrentItem = useCallback(() => {
    return itemsRef.current[currentIdxRef.current] || null
  }, [])

  const getNextIndex = useCallback(() => {
    const list = itemsRef.current
    if (!list.length) return 0
    return (currentIdxRef.current + 1) % list.length
  }, [])

  const getActiveVideoRef = useCallback(() => {
    return activeLayerRef.current === 'a' ? videoARef.current : videoBRef.current
  }, [])

  const stopCurrentVideoPlayback = useCallback(() => {
    const activeVideo = getActiveVideoRef()
    if (!activeVideo) return
    try { activeVideo.pause(); activeVideo.currentTime = 0 } catch (_) {}
  }, [getActiveVideoRef])

  const scheduleAdvance = useCallback((seconds) => {
    const normalizedSeconds = Number(seconds)
    if (!Number.isFinite(normalizedSeconds) || normalizedSeconds <= 0) return false

    clearAdvanceTimer()
    advanceTimerRef.current = setTimeout(() => {
      const current = getCurrentItem()
      if (isVideoItem(current)) stopCurrentVideoPlayback()
      goNext()
    }, normalizedSeconds * 1000)

    return true
  }, [clearAdvanceTimer, getCurrentItem, stopCurrentVideoPlayback])

  const handleMediaError = useCallback((e) => {
    console.warn('Media failed:', e?.target?.currentSrc || e?.target?.src || getCurrentItem()?.resolved_url)
    if (isVideoItem(getCurrentItem())) stopCurrentVideoPlayback()
    clearAdvanceTimer()
    advanceTimerRef.current = setTimeout(() => goNext(), 1200)
  }, [clearAdvanceTimer, getCurrentItem, stopCurrentVideoPlayback])

  const prepareInactiveLayer = useCallback(async (item) => {
    const normalized = normalizePlayableItem(item)
    const inactiveLayer = activeLayerRef.current === 'a' ? 'b' : 'a'
    if (inactiveLayer === 'a') setLayerAItem(normalized)
    else setLayerBItem(normalized)
    await preloadItem(normalized)
    return inactiveLayer
  }, [])

  const swapToIndex = useCallback(async (targetIndex) => {
    const list = itemsRef.current
    if (!list.length || transitionRef.current) return

    transitionRef.current = true
    clearAdvanceTimer()

    const targetItem = list[targetIndex]
    const preparedLayer = await prepareInactiveLayer(targetItem)

    setTimeout(() => {
      setCurrentIdx(targetIndex)
      setActiveLayer(preparedLayer)
      setTimeout(() => { transitionRef.current = false }, 520)
    }, 60)
  }, [clearAdvanceTimer, prepareInactiveLayer])

  const replayCurrentIfSingle = useCallback(() => {
    const list = itemsRef.current
    if (list.length !== 1) return false

    const activeVideo = getActiveVideoRef()
    if (!activeVideo) return false

    try {
      activeVideo.pause()
      activeVideo.currentTime = 0
      activeVideo.muted = true
      activeVideo.playsInline = true
      const promise = activeVideo.play()
      if (promise?.catch) promise.catch((err) => console.warn('Replay failed:', err))
      return true
    } catch (err) {
      console.warn('Replay current video failed:', err)
      return false
    }
  }, [getActiveVideoRef])

  const goNext = useCallback(async () => {
    const list = itemsRef.current
    if (!list.length) return

    const currentItem = list[currentIdxRef.current]

    if (list.length === 1) {
      if (isVideoItem(currentItem)) {
        const replayed = replayCurrentIfSingle()
        if (replayed) {
          const limited = getEffectiveDurationSeconds(currentItem)
          if (limited) scheduleAdvance(limited)
          return
        }
      }
      clearAdvanceTimer()
      scheduleAdvance(getEffectiveDurationSeconds(currentItem) || 10)
      return
    }

    const nextIndex = getNextIndex()
    await swapToIndex(nextIndex)
  }, [getNextIndex, swapToIndex, replayCurrentIfSingle, clearAdvanceTimer, scheduleAdvance])

  // ============================================================================
  // تحديد الفترة التالية حسب نشاط الشاشة
  // ============================================================================
  const computeNextInterval = useCallback((didChange) => {
    if (didChange) {
      unchangedCountRef.current = 0
      pollIntervalRef.current = POLL_FAST
      return POLL_FAST
    }
    unchangedCountRef.current += 1
    if (unchangedCountRef.current >= STEP_TO_SLOW) {
      pollIntervalRef.current = POLL_SLOW
    } else if (unchangedCountRef.current >= STEP_TO_MED) {
      pollIntervalRef.current = POLL_MED
    }
    return pollIntervalRef.current
  }, [])

  // ============================================================================
  // التحميل الموحّد عبر RPC الجديدة get_public_screen_state
  // preserveCurrent: true عند polling — نحاول الإبقاء على العنصر الحالي
  // ============================================================================
  const loadData = useCallback(async (preserveCurrent = false) => {
    try {
      const { data, error } = await supabase.rpc('get_public_screen_state', {
        _public_id: publicId,
        _client_fingerprint: fingerprintRef.current
      })

      if (error) throw error

      // الشاشة غير موجودة
      if (!data || data.error === 'not_found' || !data.screen) {
        setStatus('error')
        setErrorKind('not_found')
        setErrorMsg('الشاشة غير موجودة')
        return { changed: false }
      }

      const screenData = data.screen

      // تحقق الحالات قبل أي شيء
      if (!screenData.is_active) {
        setStatus('error')
        setErrorKind('inactive')
        setErrorMsg('الشاشة متوقفة حالياً')
        return { changed: false }
      }
      if (!data.org_active) {
        setStatus('error')
        setErrorKind('inactive')
        setErrorMsg('الجهة غير نشطة')
        return { changed: false }
      }
      if (!data.subscription_active) {
        setStatus('error')
        setErrorKind('expired')
        setErrorMsg('الاشتراك منتهي')
        return { changed: false }
      }

      setScreen(screenData)

      // التحقق من كلمة السر — قبل التعامل مع العناصر
      if (screenData.has_password) {
        const unlocked =
          sessionStorage.getItem(`smarats_unlock_${publicId}`) ||
          localStorage.getItem(`smarats_unlock_${publicId}`)

        if (!unlocked) {
          navigate(`/s/${publicId}/unlock`)
          return { changed: false }
        }
      }

      // ============== لا تغيير → نخرج بدون لمس state ==============
      if (data.changed === false) {
        // فقط تأكد أن البصمة محفوظة (في حال أول استدعاء كان null)
        if (data.fingerprint) fingerprintRef.current = data.fingerprint
        return { changed: false }
      }

      // ============== تغيّرت → نحدّث ==============
      const itemsData = data.items || []

      if (itemsData.length === 0) {
        // قائمة فارغة بعد التغيير
        setStatus('error')
        setErrorKind('no_items')
        setErrorMsg('لا توجد عناصر في قائمة العرض')
        fingerprintRef.current = data.fingerprint
        return { changed: true }
      }

      const nextItems = itemsData.map(normalizePlayableItem)

      // ============== Cache management ==============
      // قبل ما نطبّق التغيير، نلغي العناصر القديمة من الكاش
      const oldUrls = getCachableUrls(itemsRef.current)
      const newUrls = getCachableUrls(nextItems)
      const newUrlSet = new Set(newUrls)
      const removedUrls = oldUrls.filter((u) => !newUrlSet.has(u))
      if (removedUrls.length > 0) {
        invalidateUrls(removedUrls).catch(() => {})
      }
      // نطلب precache للعناصر الجديدة (في الخلفية)
      if (newUrls.length > 0) {
        precacheUrls(newUrls).catch(() => {})
      }

      // ============== أول تحميل ==============
      if (!preserveCurrent) {
        setItems(nextItems)
        setCurrentIdx(0)
        setLayerAItem(nextItems[0] || null)
        setLayerBItem(nextItems[1] || null)
        setActiveLayer('a')
        setStatus('ready')
        fingerprintRef.current = data.fingerprint
        return { changed: true }
      }

      // ============== تحديث أثناء العرض ==============
      const prevItems = itemsRef.current
      const currentItem = prevItems[currentIdxRef.current]

      if (arraysEqualByIdentity(prevItems, nextItems)) {
        setStatus('ready')
        fingerprintRef.current = data.fingerprint
        return { changed: true }
      }

      setItems(nextItems)

      if (!currentItem) {
        setCurrentIdx(0)
        setLayerAItem(nextItems[0] || null)
        setLayerBItem(nextItems[1] || null)
        setActiveLayer('a')
        setStatus('ready')
        fingerprintRef.current = data.fingerprint
        return { changed: true }
      }

      const sameItemNewIndex = nextItems.findIndex((i) => i.id === currentItem.id)

      if (sameItemNewIndex >= 0) {
        setCurrentIdx(sameItemNewIndex)
        const active = activeLayerRef.current
        if (active === 'a') {
          setLayerAItem(nextItems[sameItemNewIndex] || null)
          setLayerBItem(nextItems[(sameItemNewIndex + 1) % nextItems.length] || null)
        } else {
          setLayerBItem(nextItems[sameItemNewIndex] || null)
          setLayerAItem(nextItems[(sameItemNewIndex + 1) % nextItems.length] || null)
        }
      } else {
        setCurrentIdx(0)
        setLayerAItem(nextItems[0] || null)
        setLayerBItem(nextItems[1] || null)
        setActiveLayer('a')
      }

      setStatus('ready')
      fingerprintRef.current = data.fingerprint
      return { changed: true }
    } catch (err) {
      console.error('Player load error:', err)
      // ⚠ مهم: لا نعرض شاشة خطأ إذا عندنا محتوى يعرض حالياً (offline-tolerance)
      // فقط نعرض الخطأ في التحميل الأول
      if (!preserveCurrent || itemsRef.current.length === 0) {
        setStatus('error')
        setErrorKind('not_found')
        setErrorMsg(err.message || 'حدث خطأ')
      }
      return { changed: false, networkError: true }
    }
  }, [publicId, navigate])

  // التحميل الأول
  useEffect(() => { loadData(false) }, [loadData])

  // ============================================================================
  // Wake Lock (الإبقاء على الشاشة مضاءة)
  // ============================================================================
  useEffect(() => {
    if (status !== 'ready') return

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch (e) { console.warn('Wake lock failed:', e) }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') requestWakeLock()
    }

    requestWakeLock()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {})
    }
  }, [status])

  // ============================================================================
  // Soft reload كل ساعة (بدلاً من window.location.reload الكامل)
  // نعيد تحميل البيانات فقط، لا نمسح الـ SW أو الكاش
  // ============================================================================
  useEffect(() => {
    if (status !== 'ready') return
    reloadTimerRef.current = setTimeout(() => {
      // إعادة تعيين البصمة لإجبار جلب كامل (للتعافي من أي انحراف)
      fingerprintRef.current = null
      loadData(true)
    }, 60 * 60 * 1000)
    return () => clearTimeout(reloadTimerRef.current)
  }, [status, loadData])

  // ============================================================================
  // Adaptive Polling
  // ============================================================================
  useEffect(() => {
    if (status !== 'ready') return

    let isCancelled = false

    async function poll() {
      if (isCancelled) return
      if (document.visibilityState !== 'visible') {
        // التبويب في الخلفية — أجّل
        pollTimerRef.current = setTimeout(poll, POLL_SLOW)
        return
      }
      const result = await loadData(true)
      if (isCancelled) return
      const nextInterval = result.networkError
        ? POLL_FAST  // فشل شبكة — حاول بسرعة
        : computeNextInterval(result.changed)
      pollTimerRef.current = setTimeout(poll, nextInterval)
    }

    pollTimerRef.current = setTimeout(poll, pollIntervalRef.current)

    // عند العودة من background → poll فوري
    function onVisible() {
      if (document.visibilityState === 'visible') {
        clearTimeout(pollTimerRef.current)
        poll()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      isCancelled = true
      clearTimeout(pollTimerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [status, loadData, computeNextInterval])

  // ============================================================================
  // إعادة المحاولة عند الخطأ
  // ============================================================================
  useEffect(() => {
    if (status !== 'error') return
    const retryMs = errorKind === 'expired' ? 5 * 60 * 1000 : 30 * 1000
    const t = setTimeout(() => {
      fingerprintRef.current = null  // إعادة تعيين البصمة عند الخطأ
      loadData(false)
    }, retryMs)
    return () => clearTimeout(t)
  }, [status, errorKind, loadData])

  // ============================================================================
  // التقدّم بين العناصر
  // ============================================================================
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = getCurrentItem()
    if (!item) return

    clearAdvanceTimer()
    const hasLimitedDuration = scheduleAdvance(getEffectiveDurationSeconds(item))

    if (!hasLimitedDuration) {
      if (item.item_type === 'image' || item.item_type === 'drive_image' || item.item_type === 'youtube') {
        scheduleAdvance(10)
      }
    }

    const nextIndex = getNextIndex()
    prepareInactiveLayer(items[nextIndex])

    return () => clearAdvanceTimer()
  }, [status, items, currentIdx, activeLayer, getCurrentItem, getNextIndex, clearAdvanceTimer, scheduleAdvance, prepareInactiveLayer])

  const handleVideoEnded = useCallback(() => {
    const current = itemsRef.current[currentIdxRef.current]
    if (!current) { goNext(); return }

    const limitedDuration = getEffectiveDurationSeconds(current)
    if (limitedDuration) return

    if (isVideoItem(current) && itemsRef.current.length === 1) {
      replayCurrentIfSingle()
      return
    }

    goNext()
  }, [goNext, replayCurrentIfSingle])

  const currentItem = getCurrentItem()

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
    if (errorKind === 'expired') {
      return (
        <div className="player-root flex items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <div className="text-7xl mb-6 opacity-90">⏸️</div>
            <h1 className="text-4xl md:text-6xl font-black mb-4">الاشتراك منتهي</h1>
            <p className="text-xl md:text-2xl opacity-80 mb-2">
              يجب تجديد الاشتراك لاستمرار العرض
            </p>
            <p className="text-base opacity-50 mt-8">
              ستحاول الشاشة الاتصال تلقائياً كل 5 دقائق
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="player-root flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4 opacity-50">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">{errorMsg}</h1>
          <p className="text-sm opacity-60 mb-4">سيتم المحاولة مرة أخرى تلقائياً خلال 30 ثانية</p>
          <button
            onClick={() => { fingerprintRef.current = null; loadData(false) }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
          >
            إعادة المحاولة الآن
          </button>
        </div>
      </div>
    )
  }

  if (!currentItem) return null

  return (
    <div className="player-root">
      <div className="player-stage">
        <div className={`player-layer ${activeLayer === 'a' ? 'is-active' : 'is-next'}`}>
          <MediaNode
            item={layerAItem}
            isActive={activeLayer === 'a'}
            videoRef={videoARef}
            onEnded={handleVideoEnded}
            onError={handleMediaError}
          />
        </div>

        <div className={`player-layer ${activeLayer === 'b' ? 'is-active' : 'is-next'}`}>
          <MediaNode
            item={layerBItem}
            isActive={activeLayer === 'b'}
            videoRef={videoBRef}
            onEnded={handleVideoEnded}
            onError={handleMediaError}
          />
        </div>
      </div>
    </div>
  )
}
