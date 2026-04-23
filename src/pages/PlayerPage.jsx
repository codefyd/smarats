import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  extractYouTubeId,
  extractDriveFileId,
  buildYouTubeEmbedUrl,
  buildDriveImageUrl,
  buildDriveVideoUrl
} from '../lib/urlUtils'

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

function normalizePlayableItem(item) {
  if (!item) return item

  if (item.item_type === 'drive_video') {
    const fileId = extractDriveFileId(item.original_url || item.resolved_url)
    if (!fileId) return item

    return {
      ...item,
      resolved_url: buildDriveVideoUrl(fileId),
      poster_url: buildDriveImageUrl(fileId)
    }
  }

  if (item.item_type === 'drive_image') {
    const fileId = extractDriveFileId(item.original_url || item.resolved_url)
    if (!fileId) return item

    return {
      ...item,
      resolved_url: buildDriveImageUrl(fileId)
    }
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
    if (!item) {
      resolve(false)
      return
    }

    const safeResolve = () => resolve(true)

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
      video.onerror = safeResolve
      video.src = item.resolved_url
      video.load()

      setTimeout(safeResolve, 1200)
      return
    }

    if (item.item_type === 'youtube') {
      setTimeout(safeResolve, 250)
      return
    }

    safeResolve()
  })
}

function MediaNode({ item, isActive, onEnded, onError, videoRef }) {
  useEffect(() => {
    const video = videoRef?.current
    if (!video) return

    if (isActive) {
      const playNow = async () => {
        try {
          video.pause()
          video.currentTime = video.currentTime || 0
          video.muted = true
          video.playsInline = true
          const p = video.play()
          if (p?.catch) {
            p.catch((err) => console.warn('Video autoplay failed:', err))
          }
        } catch (err) {
          console.warn('Video autoplay failed:', err)
        }
      }

      playNow()
    } else {
      try {
        video.pause()
      } catch (_) {}
    }
  }, [isActive, item?.resolved_url, videoRef])

  if (!item) return null

  if (item.item_type === 'image' || item.item_type === 'drive_image') {
    return (
      <img
        src={item.resolved_url}
        alt={item.title || ''}
        onError={onError}
        draggable="false"
        className={isActive ? 'player-kenburns' : ''}
      />
    )
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

  if (item.item_type === 'drive_video' || item.item_type === 'mp4') {
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
  const [screen, setScreen] = useState(null)
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

  const videoARef = useRef(null)
  const videoBRef = useRef(null)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  useEffect(() => {
    activeLayerRef.current = activeLayer
  }, [activeLayer])

  const clearAdvanceTimer = useCallback(() => {
    clearTimeout(advanceTimerRef.current)
  }, [])

  const getCurrentItem = useCallback(() => {
    return itemsRef.current[currentIdxRef.current] || null
  }, [])

  const getNextIndex = useCallback(() => {
    const list = itemsRef.current
    if (!list.length) return 0
    return (currentIdxRef.current + 1) % list.length
  }, [])

  const scheduleAdvance = useCallback((seconds) => {
    clearAdvanceTimer()
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, Math.max(1, Number(seconds) || 10) * 1000)
  }, [clearAdvanceTimer])

  const handleMediaError = useCallback((e) => {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || getCurrentItem()?.resolved_url
    )

    clearAdvanceTimer()
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, 1200)
  }, [clearAdvanceTimer, getCurrentItem])

  const prepareInactiveLayer = useCallback(async (item) => {
    const normalized = normalizePlayableItem(item)
    const inactiveLayer = activeLayerRef.current === 'a' ? 'b' : 'a'

    if (inactiveLayer === 'a') {
      setLayerAItem(normalized)
    } else {
      setLayerBItem(normalized)
    }

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

      setTimeout(() => {
        transitionRef.current = false
      }, 520)
    }, 60)
  }, [clearAdvanceTimer, prepareInactiveLayer])


  const replayCurrentIfSingle = useCallback(() => {
  const list = itemsRef.current
  if (list.length !== 1) return false

  const activeVideo =
    activeLayerRef.current === 'a'
      ? videoARef.current
      : videoBRef.current

  if (!activeVideo) return false

  try {
    activeVideo.pause()
    activeVideo.currentTime = 0
    activeVideo.muted = true
    activeVideo.playsInline = true

    const promise = activeVideo.play()
    if (promise?.catch) {
      promise.catch((err) => console.warn('Replay failed:', err))
    }

    return true
  } catch (err) {
    console.warn('Replay current video failed:', err)
    return false
  }
}, [])

 const goNext = useCallback(async () => {
  const list = itemsRef.current
  if (!list.length) return

  const currentItem = list[currentIdxRef.current]

  // إذا كان عنصر واحد فقط
  if (list.length === 1) {
    if (currentItem?.item_type === 'mp4' || currentItem?.item_type === 'drive_video') {
      const replayed = replayCurrentIfSingle()
      if (replayed) return
    }

    // للصور/يوتيوب: لا تبدل طبقات لنفس العنصر
    clearAdvanceTimer()
    scheduleAdvance(currentItem?.duration_seconds || 10)
    return
  }

  const nextIndex = getNextIndex()
  await swapToIndex(nextIndex)
}, [getNextIndex, swapToIndex, replayCurrentIfSingle, clearAdvanceTimer, scheduleAdvance])
  

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

      const nextItems = itemsData.map(normalizePlayableItem)

      if (!preserveCurrent) {
        setItems(nextItems)
        setCurrentIdx(0)
        setLayerAItem(nextItems[0] || null)
        setLayerBItem(nextItems[1] || null)
        setActiveLayer('a')
        setStatus('ready')
        return
      }

      const prevItems = itemsRef.current
      const currentItem = prevItems[currentIdxRef.current]

      if (arraysEqualByIdentity(prevItems, nextItems)) {
        setStatus('ready')
        return
      }

      setItems(nextItems)

      if (!currentItem) {
        setCurrentIdx(0)
        setLayerAItem(nextItems[0] || null)
        setLayerBItem(nextItems[1] || null)
        setActiveLayer('a')
        setStatus('ready')
        return
      }

      const sameItemNewIndex = nextItems.findIndex(i => i.id === currentItem.id)

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
    } catch (err) {
      console.error('Player load error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'حدث خطأ')
    }
  }, [publicId, navigate])

  useEffect(() => {
    loadData(false)
  }, [loadData])

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

  useEffect(() => {
    if (status !== 'ready') return

    reloadTimerRef.current = setTimeout(() => {
      window.location.reload()
    }, 60 * 60 * 1000)

    return () => clearTimeout(reloadTimerRef.current)
  }, [status])

  useEffect(() => {
    if (status !== 'ready') return

    pollTimerRef.current = setInterval(() => {
      loadData(true)
    }, 10000)

    return () => clearInterval(pollTimerRef.current)
  }, [status, loadData])

  useEffect(() => {
    if (status !== 'error') return

    const t = setTimeout(() => loadData(false), 30000)
    return () => clearTimeout(t)
  }, [status, loadData])

  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = getCurrentItem()
    if (!item) return

    clearAdvanceTimer()

    if (
      item.item_type === 'image' ||
      item.item_type === 'drive_image' ||
      item.item_type === 'youtube'
    ) {
      scheduleAdvance(item.duration_seconds)
    }

    const nextIndex = getNextIndex()
    prepareInactiveLayer(items[nextIndex])

    return () => clearAdvanceTimer()
  }, [
    status,
    items,
    currentIdx,
    activeLayer,
    getCurrentItem,
    getNextIndex,
    clearAdvanceTimer,
    scheduleAdvance,
    prepareInactiveLayer
  ])


  const handleVideoEnded = useCallback(() => {
  const current = itemsRef.current[currentIdxRef.current]

  if (!current) {
    goNext()
    return
  }

  if (
    (current.item_type === 'mp4' || current.item_type === 'drive_video') &&
    itemsRef.current.length === 1
  ) {
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
