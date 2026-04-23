import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  extractYouTubeId,
  buildYouTubeEmbedUrl,
  buildYouTubeThumbUrl,
  extractDriveFileId,
  buildDriveImageUrl,
  buildDriveVideoStreamUrl,
  buildDriveVideoFallbackStreamUrl
} from '../lib/urlUtils'

let youtubeApiPromise = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')

    if (!existing) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }

    const timer = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(timer)
        resolve(window.YT)
      }
    }, 200)
  })

  return youtubeApiPromise
}

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

function safeNextIndex(index, itemsLength) {
  if (!itemsLength) return 0
  return (index + 1) % itemsLength
}

function getPosterUrl(item) {
  if (!item) return ''

  if (item.item_type === 'image' || item.item_type === 'drive_image') {
    return item.resolved_url
  }

  if (item.item_type === 'youtube') {
    const id = extractYouTubeId(item.original_url || item.resolved_url)
    return id ? buildYouTubeThumbUrl(id) : ''
  }

  if (item.item_type === 'drive_video') {
    const fileId = extractDriveFileId(item.original_url || item.resolved_url)
    return fileId ? buildDriveImageUrl(fileId) : ''
  }

  return ''
}

function getVideoSources(item) {
  if (!item) return []

  if (item.item_type === 'mp4') {
    return [item.resolved_url]
  }

  if (item.item_type === 'drive_video') {
    const fileId = extractDriveFileId(item.original_url || item.resolved_url)
    if (!fileId) return [item.resolved_url]

    return [
      buildDriveVideoStreamUrl(fileId),
      buildDriveVideoFallbackStreamUrl(fileId)
    ]
  }

  return []
}

function preconnectOnce(href) {
  if (!href) return
  const exists = document.head.querySelector(`link[data-preconnect="${href}"]`)
  if (exists) return

  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = href
  link.setAttribute('data-preconnect', href)
  document.head.appendChild(link)
}

function preloadItem(item) {
  if (!item) return

  if (item.item_type === 'image' || item.item_type === 'drive_image') {
    const img = new Image()
    img.src = item.resolved_url
    return
  }

  if (item.item_type === 'youtube') {
    const id = extractYouTubeId(item.original_url || item.resolved_url)
    if (id) {
      const img = new Image()
      img.src = buildYouTubeThumbUrl(id)
    }
    return
  }

  if (item.item_type === 'mp4' || item.item_type === 'drive_video') {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const sources = getVideoSources(item)
    if (sources[0]) {
      video.src = sources[0]
      video.load()
    }
  }
}

function AmbientBackdrop({ posterUrl }) {
  return (
    <>
      <div className="player-ambient-gradient" />
      {posterUrl ? (
        <div
          className="player-ambient-poster"
          style={{ backgroundImage: `url("${posterUrl}")` }}
        />
      ) : null}
      <div className="player-ambient-overlay" />
      <div className="player-ambient-noise" />
      <div className="player-ambient-glow" />
    </>
  )
}

function MediaLayer({
  item,
  visible,
  isActive,
  onEnded,
  onError
}) {
  const layerRef = useRef(null)
  const videoRef = useRef(null)
  const youtubeContainerRef = useRef(null)
  const youtubePlayerRef = useRef(null)

  const cleanupYoutube = useCallback(() => {
    if (youtubePlayerRef.current?.destroy) {
      try {
        youtubePlayerRef.current.destroy()
      } catch (_) {}
    }
    youtubePlayerRef.current = null
    if (youtubeContainerRef.current) {
      youtubeContainerRef.current.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    return () => cleanupYoutube()
  }, [cleanupYoutube])

  // تشغيل/إيقاف الفيديو العادي بحسب الطبقة النشطة
  useEffect(() => {
    if (!item) return
    if (item.item_type !== 'mp4' && item.item_type !== 'drive_video') return

    const video = videoRef.current
    if (!video) return

    if (isActive) {
      try {
        video.currentTime = 0
      } catch (_) {}

      const p = video.play()
      if (p?.catch) {
        p.catch(() => {
          onError?.({ target: video })
        })
      }
    } else {
      try {
        video.pause()
      } catch (_) {}
    }
  }, [item, isActive, onError])

  // يوتيوب عبر API فقط في الطبقة النشطة
  useEffect(() => {
    if (!item || item.item_type !== 'youtube') {
      cleanupYoutube()
      return
    }

    if (!isActive) {
      cleanupYoutube()
      return
    }

    let cancelled = false
    const videoId = extractYouTubeId(item.original_url || item.resolved_url)

    if (!videoId) {
      onError?.()
      return
    }

    async function mountYoutubePlayer() {
      try {
        await loadYouTubeApi()
        if (cancelled || !youtubeContainerRef.current || !window.YT?.Player) return

        cleanupYoutube()

        youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            mute: 1,
            fs: 0,
            iv_load_policy: 3,
            disablekb: 1
          },
          events: {
            onReady: (event) => {
              try {
                event.target.mute()
                event.target.playVideo()
              } catch (_) {}
            },
            onStateChange: (event) => {
              if (cancelled) return

              if (event.data === window.YT.PlayerState.ENDED) {
                onEnded?.()
              }
            },
            onError: () => {
              onError?.()
            }
          }
        })
      } catch (e) {
        console.warn('YouTube init failed:', e)
        onError?.()
      }
    }

    mountYoutubePlayer()

    return () => {
      cancelled = true
      cleanupYoutube()
    }
  }, [item, isActive, onEnded, onError, cleanupYoutube])

  if (!item) {
    return (
      <div
        ref={layerRef}
        className={`player-layer ${visible ? 'player-layer-visible' : 'player-layer-hidden'}`}
      />
    )
  }

  const posterUrl = getPosterUrl(item)
  const videoSources = getVideoSources(item)

  return (
    <div
      ref={layerRef}
      className={`player-layer ${visible ? 'player-layer-visible' : 'player-layer-hidden'}`}
    >
      <AmbientBackdrop posterUrl={posterUrl} />

      <div className="player-content-wrap">
        {(item.item_type === 'image' || item.item_type === 'drive_image') && (
          <img
            src={item.resolved_url}
            alt={item.title || ''}
            className={`player-media-element player-image ${isActive ? 'player-kenburns' : ''}`}
            onError={onError}
            draggable="false"
          />
        )}

        {(item.item_type === 'mp4' || item.item_type === 'drive_video') && (
          <video
            ref={videoRef}
            className="player-media-element"
            muted
            playsInline
            preload="auto"
            controls={false}
            poster={posterUrl || undefined}
            onEnded={onEnded}
            onError={onError}
          >
            {videoSources.map((src, i) => (
              <source key={`${item.id}-source-${i}`} src={src} type="video/mp4" />
            ))}
          </video>
        )}

        {item.item_type === 'youtube' && (
          <div className="player-youtube-shell">
            {!isActive && posterUrl ? (
              <img
                src={posterUrl}
                alt={item.title || ''}
                className="player-media-element player-image"
                draggable="false"
              />
            ) : null}

            <div
              ref={youtubeContainerRef}
              className={`player-youtube-api ${isActive ? 'player-youtube-api-visible' : 'player-youtube-api-hidden'}`}
            />
          </div>
        )}
      </div>

      <div className="player-decorative-frame" />
      <div className="player-decorative-vignette" />
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

  const wakeLockRef = useRef(null)
  const reloadTimerRef = useRef(null)
  const advanceTimerRef = useRef(null)
  const pollTimerRef = useRef(null)
  const transitionLockRef = useRef(false)

  const itemsRef = useRef([])
  const currentIdxRef = useRef(0)

  const [layerA, setLayerA] = useState(null)
  const [layerB, setLayerB] = useState(null)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  useEffect(() => {
    preconnectOnce('https://www.youtube.com')
    preconnectOnce('https://i.ytimg.com')
    preconnectOnce('https://drive.google.com')
    preconnectOnce('https://drive.googleusercontent.com')
    preconnectOnce('https://googleusercontent.com')
  }, [])

  const prepareLayersForIndex = useCallback((index, list) => {
    if (!list.length) return

    const currentItem = list[index]
    const nextIndex = safeNextIndex(index, list.length)
    const nextItem = list[nextIndex]

    setLayerA({ item: currentItem, index })
    setLayerB({ item: nextItem, index: nextIndex })
    setActiveLayer('a')

    preloadItem(nextItem)
    preloadItem(list[safeNextIndex(nextIndex, list.length)])
  }, [])

  const syncLayersAfterSwap = useCallback((newCurrentIndex, newItems) => {
    const currentItem = newItems[newCurrentIndex]
    const nextIndex = safeNextIndex(newCurrentIndex, newItems.length)
    const nextItem = newItems[nextIndex]

    if (activeLayer === 'a') {
      setLayerB({ item: currentItem, index: newCurrentIndex })
      setLayerA({ item: nextItem, index: nextIndex })
      setActiveLayer('b')
    } else {
      setLayerA({ item: currentItem, index: newCurrentIndex })
      setLayerB({ item: nextItem, index: nextIndex })
      setActiveLayer('a')
    }

    preloadItem(nextItem)
    preloadItem(newItems[safeNextIndex(nextIndex, newItems.length)])
  }, [activeLayer])

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
        prepareLayersForIndex(0, nextItems)
        setStatus('ready')
        return
      }

      const prevItems = itemsRef.current
      const prevIdx = currentIdxRef.current
      const currentItem = prevItems?.[prevIdx]

      if (arraysEqualByIdentity(prevItems, nextItems)) {
        setStatus('ready')
        return
      }

      let resolvedIndex = 0

      if (currentItem) {
        const sameItemNewIndex = nextItems.findIndex(i => i.id === currentItem.id)
        if (sameItemNewIndex >= 0) {
          resolvedIndex = sameItemNewIndex
        } else {
          resolvedIndex = Math.min(prevIdx, Math.max(nextItems.length - 1, 0))
        }
      }

      setItems(nextItems)
      setCurrentIdx(resolvedIndex)
      prepareLayersForIndex(resolvedIndex, nextItems)
      setStatus('ready')
    } catch (err) {
      console.error('Player load error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'حدث خطأ')
    }
  }, [publicId, navigate, prepareLayersForIndex])

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

  const goToIndex = useCallback((nextIndex) => {
    const list = itemsRef.current
    if (!list.length) return
    if (transitionLockRef.current) return

    transitionLockRef.current = true
    clearTimeout(advanceTimerRef.current)

    syncLayersAfterSwap(nextIndex, list)
    setCurrentIdx(nextIndex)

    setTimeout(() => {
      transitionLockRef.current = false
    }, 520)
  }, [syncLayersAfterSwap])

  const goNext = useCallback(() => {
    const list = itemsRef.current
    if (!list.length) return
    goToIndex(safeNextIndex(currentIdxRef.current, list.length))
  }, [goToIndex])

  const scheduleAdvance = useCallback((seconds) => {
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, Math.max(1, Number(seconds) || 10) * 1000)
  }, [goNext])

  const handleMediaEnded = useCallback(() => {
    if (itemsRef.current.length <= 1) {
      goToIndex(0)
      return
    }

    goNext()
  }, [goNext, goToIndex])

  const handleMediaError = useCallback((e) => {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || itemsRef.current?.[currentIdxRef.current]?.resolved_url
    )

    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, 1200)
  }, [goNext])

  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = items[currentIdx]
    if (!item) return

    clearTimeout(advanceTimerRef.current)

    if (item.item_type === 'image' || item.item_type === 'drive_image') {
      scheduleAdvance(item.duration_seconds)
    }

    return () => clearTimeout(advanceTimerRef.current)
  }, [currentIdx, items, status, scheduleAdvance])

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

  const showLayerA = activeLayer === 'a'

  return (
    <div className="player-root">
      <MediaLayer
        item={layerA?.item}
        visible={showLayerA}
        isActive={showLayerA}
        onEnded={handleMediaEnded}
        onError={handleMediaError}
      />

      <MediaLayer
        item={layerB?.item}
        visible={!showLayerA}
        isActive={!showLayerA}
        onEnded={handleMediaEnded}
        onError={handleMediaError}
      />
    </div>
  )
}
