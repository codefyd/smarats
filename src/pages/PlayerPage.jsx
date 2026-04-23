import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  extractDriveFileId,
  extractYouTubeId,
  buildDriveVideoStreamUrl,
  buildDriveVideoFallbackUrl,
  buildYouTubeEmbedUrl,
  buildPosterForItem,
  isImageType,
  isNativeVideoType
} from '../lib/urlUtils'

function otherLayerName(name) {
  return name === 'a' ? 'b' : 'a'
}

function itemsEqual(a, b) {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false
    if (a[i]?.resolved_url !== b[i]?.resolved_url) return false
    if (a[i]?.duration_seconds !== b[i]?.duration_seconds) return false
    if (a[i]?.order_index !== b[i]?.order_index) return false
  }

  return true
}

function ensurePreconnect(href) {
  if (!href) return
  const exists = document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)
  if (exists) return

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

function MediaLayer({
  layerName,
  item,
  visible,
  onReady,
  onError,
  onEnded
}) {
  const [iframeReady, setIframeReady] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    setIframeReady(false)
  }, [item?.id])

  const poster = useMemo(() => buildPosterForItem(item), [item])

  if (!item) {
    return (
      <div
        className={`player-layer ${visible ? 'player-layer-visible' : 'player-layer-hidden'}`}
        data-layer={layerName}
      />
    )
  }

  let body = null

  if (isImageType(item.item_type)) {
    body = (
      <img
        src={item.resolved_url}
        alt={item.title || ''}
        className="player-media-el"
        draggable="false"
        onLoad={onReady}
        onError={onError}
      />
    )
  } else if (item.item_type === 'youtube') {
    const videoId = extractYouTubeId(item.original_url || item.resolved_url)
    const src = videoId
      ? buildYouTubeEmbedUrl(videoId, false)
      : item.resolved_url

    body = (
      <div className="player-youtube-shell">
        {!iframeReady && poster ? (
          <img
            src={poster}
            alt=""
            className="player-media-el player-poster-overlay"
            draggable="false"
          />
        ) : null}

        <iframe
          src={src}
          title={item.title || 'YouTube'}
          className="player-media-el"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          onLoad={() => {
            setIframeReady(true)
            onReady?.()
          }}
          onError={onError}
        />
      </div>
    )
  } else if (item.item_type === 'drive_video') {
    const fileId = extractDriveFileId(item.original_url || item.resolved_url)
    const primary = fileId ? buildDriveVideoStreamUrl(fileId) : item.resolved_url
    const fallback = fileId ? buildDriveVideoFallbackUrl(fileId) : ''

    body = (
      <video
        ref={videoRef}
        className="player-media-el"
        autoPlay={visible}
        muted
        playsInline
        preload="auto"
        controls={false}
        poster={poster || undefined}
        onCanPlay={() => onReady?.()}
        onLoadedData={() => onReady?.()}
        onEnded={onEnded}
        onError={onError}
      >
        <source src={primary} type="video/mp4" />
        {fallback ? <source src={fallback} type="video/mp4" /> : null}
      </video>
    )
  } else if (item.item_type === 'mp4') {
    body = (
      <video
        ref={videoRef}
        className="player-media-el"
        src={item.resolved_url}
        autoPlay={visible}
        muted
        playsInline
        preload="auto"
        controls={false}
        poster={poster || undefined}
        onCanPlay={() => onReady?.()}
        onLoadedData={() => onReady?.()}
        onEnded={onEnded}
        onError={onError}
      />
    )
  } else {
    body = (
      <img
        src={item.resolved_url}
        alt={item.title || ''}
        className="player-media-el"
        draggable="false"
        onLoad={onReady}
        onError={onError}
      />
    )
  }

  return (
    <div
      className={`player-layer ${visible ? 'player-layer-visible' : 'player-layer-hidden'}`}
      data-layer={layerName}
    >
      {body}
    </div>
  )
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

  const [layers, setLayers] = useState({
    a: null,
    b: null
  })

  const wakeLockRef = useRef(null)
  const reloadTimerRef = useRef(null)
  const advanceTimerRef = useRef(null)
  const pollTimerRef = useRef(null)
  const pendingSwapRef = useRef(false)
  const layerReadyRef = useRef({ a: false, b: false })

  const itemsRef = useRef([])
  const currentIdxRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  useEffect(() => {
    ensurePreconnect('https://www.youtube.com')
    ensurePreconnect('https://www.youtube-nocookie.com')
    ensurePreconnect('https://i.ytimg.com')
    ensurePreconnect('https://drive.google.com')
    ensurePreconnect('https://drive.googleusercontent.com')
  }, [])

  const currentItem = items[currentIdx] || null
  const nextIdx = items.length ? (currentIdx + 1) % items.length : 0
  const nextItem = items[nextIdx] || null
  const inactiveLayer = otherLayerName(activeLayer)

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
      const currentVisible = prevItems[prevIdx]

      if (itemsEqual(prevItems, nextItems)) {
        setStatus('ready')
        return
      }

      setItems(nextItems)

      if (!currentVisible) {
        setCurrentIdx((prev) => Math.min(prev, Math.max(nextItems.length - 1, 0)))
        setStatus('ready')
        return
      }

      const sameItemNewIndex = nextItems.findIndex((x) => x.id === currentVisible.id)

      if (sameItemNewIndex >= 0) {
        setCurrentIdx(sameItemNewIndex)
      } else {
        setCurrentIdx((prev) => Math.min(prev, Math.max(nextItems.length - 1, 0)))
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

  // مزامنة الطبقتين: الحالية والآتية
  useEffect(() => {
    if (status !== 'ready' || !currentItem) return

    layerReadyRef.current[activeLayer] = false
    layerReadyRef.current[inactiveLayer] = false
    pendingSwapRef.current = false

    setLayers((prev) => ({
      ...prev,
      [activeLayer]: currentItem,
      [inactiveLayer]: nextItem || null
    }))
  }, [status, currentItem, nextItem, activeLayer, inactiveLayer])

  // Wake Lock
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

  // إعادة تحميل طويلة
  useEffect(() => {
    if (status !== 'ready') return

    reloadTimerRef.current = setTimeout(() => {
      window.location.reload()
    }, 60 * 60 * 1000)

    return () => clearTimeout(reloadTimerRef.current)
  }, [status])

  // polling للتحديث
  useEffect(() => {
    if (status !== 'ready') return

    pollTimerRef.current = setInterval(() => {
      loadData(true)
    }, 10000)

    return () => clearInterval(pollTimerRef.current)
  }, [status, loadData])

  // إعادة محاولة عند الخطأ
  useEffect(() => {
    if (status !== 'error') return
    const t = setTimeout(() => loadData(false), 30000)
    return () => clearTimeout(t)
  }, [status, loadData])

  const swapToNext = useCallback(() => {
    const hiddenLayer = otherLayerName(activeLayer)

    if (!layers[hiddenLayer]) {
      setCurrentIdx((idx) => {
        const list = itemsRef.current
        if (!list.length) return 0
        return (idx + 1) % list.length
      })
      setActiveLayer(hiddenLayer)
      return
    }

    setActiveLayer(hiddenLayer)
    setCurrentIdx((idx) => {
      const list = itemsRef.current
      if (!list.length) return 0
      return (idx + 1) % list.length
    })
  }, [activeLayer, layers])

  const requestAdvance = useCallback(() => {
    const hiddenLayer = otherLayerName(activeLayer)
    const prepared = layers[hiddenLayer]
    const ready = layerReadyRef.current[hiddenLayer]

    if (!prepared) {
      swapToNext()
      return
    }

    if (ready) {
      swapToNext()
      return
    }

    pendingSwapRef.current = true
  }, [activeLayer, layers, swapToNext])

  const scheduleAdvance = useCallback((seconds) => {
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      requestAdvance()
    }, Math.max(1, Number(seconds) || 10) * 1000)
  }, [requestAdvance])

  // إدارة توقيت العنصر الحالي
  useEffect(() => {
    if (status !== 'ready' || !currentItem) return

    clearTimeout(advanceTimerRef.current)

    if (isImageType(currentItem.item_type) || currentItem.item_type === 'youtube') {
      scheduleAdvance(currentItem.duration_seconds)
    }

    return () => clearTimeout(advanceTimerRef.current)
  }, [status, currentItem, scheduleAdvance])

  const handleLayerReady = useCallback((layerName) => {
    layerReadyRef.current[layerName] = true

    if (pendingSwapRef.current && layerName === otherLayerName(activeLayer)) {
      pendingSwapRef.current = false
      swapToNext()
    }
  }, [activeLayer, swapToNext])

  const handleMediaError = useCallback((e) => {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || itemsRef.current?.[currentIdxRef.current]?.resolved_url
    )

    clearTimeout(advanceTimerRef.current)

    const hiddenLayer = otherLayerName(activeLayer)
    layerReadyRef.current[hiddenLayer] = true

    setTimeout(() => {
      requestAdvance()
    }, 700)
  }, [activeLayer, requestAdvance])

  const handleNativeVideoEnded = useCallback(() => {
    if (itemsRef.current.length <= 1) {
      requestAdvance()
      return
    }

    requestAdvance()
  }, [requestAdvance])

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

  return (
    <div className="player-root">
      <div className="player-stage">
        <MediaLayer
          layerName="a"
          item={layers.a}
          visible={activeLayer === 'a'}
          onReady={() => handleLayerReady('a')}
          onError={handleMediaError}
          onEnded={handleNativeVideoEnded}
        />

        <MediaLayer
          layerName="b"
          item={layers.b}
          visible={activeLayer === 'b'}
          onReady={() => handleLayerReady('b')}
          onError={handleMediaError}
          onEnded={handleNativeVideoEnded}
        />
      </div>
    </div>
  )
}
