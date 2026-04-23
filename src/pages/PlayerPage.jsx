import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  extractYouTubeId,
  extractDriveFileId,
  buildDriveVideoStreamUrl,
  buildDriveVideoFallbackStreamUrl,
  buildDriveImageUrl
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

export default function PlayerPage() {
  const { publicId } = useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [screen, setScreen] = useState(null)
  const [items, setItems] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const wakeLockRef = useRef(null)
  const reloadTimerRef = useRef(null)
  const advanceTimerRef = useRef(null)
  const pollTimerRef = useRef(null)

  const itemsRef = useRef([])
  const currentIdxRef = useRef(0)
  const transitionLockRef = useRef(false)

  const activeVideoRef = useRef(null)
  const preloadVideoRef = useRef(null)

  const youtubeContainerRef = useRef(null)
  const youtubePlayerRef = useRef(null)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  const cleanupYoutubePlayer = useCallback(() => {
    if (youtubePlayerRef.current?.destroy) {
      try {
        youtubePlayerRef.current.destroy()
      } catch (_) {}
    }
    youtubePlayerRef.current = null
  }, [])

  const animateToIndex = useCallback((targetIndex) => {
    if (transitionLockRef.current) return
    transitionLockRef.current = true

    setIsVisible(false)

    setTimeout(() => {
      setCurrentIdx(targetIndex)
      setTimeout(() => {
        setIsVisible(true)
        transitionLockRef.current = false
      }, 60)
    }, 220)
  }, [])

  const goNext = useCallback(() => {
    const list = itemsRef.current
    if (!list.length) return

    const nextIndex = (currentIdxRef.current + 1) % list.length
    animateToIndex(nextIndex)
  }, [animateToIndex])

  const replayCurrentVideoIfSingle = useCallback(() => {
    const list = itemsRef.current
    if (list.length !== 1) return false

    const video = activeVideoRef.current
    if (!video) return false

    try {
      video.currentTime = 0
      const p = video.play()
      if (p?.catch) p.catch(() => {})
      return true
    } catch (_) {
      return false
    }
  }, [])

  const handleVideoEnded = useCallback(() => {
    if (itemsRef.current.length <= 1) {
      if (!replayCurrentVideoIfSingle()) {
        goNext()
      }
      return
    }

    goNext()
  }, [goNext, replayCurrentVideoIfSingle])

  const scheduleAdvance = useCallback((seconds) => {
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, Math.max(1, Number(seconds) || 10) * 1000)
  }, [goNext])

  const handleMediaError = useCallback((e) => {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || itemsRef.current?.[currentIdxRef.current]?.resolved_url
    )

    clearTimeout(advanceTimerRef.current)
    cleanupYoutubePlayer()

    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, 1200)
  }, [cleanupYoutubePlayer, goNext])

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

      if (arraysEqualByIdentity(prevItems, nextItems)) {
        setStatus('ready')
        return
      }

      setItems(nextItems)

      if (!currentItem) {
        setCurrentIdx((prev) => Math.min(prev, Math.max(nextItems.length - 1, 0)))
        setStatus('ready')
        return
      }

      const sameItemNewIndex = nextItems.findIndex((i) => i.id === currentItem.id)

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

  // preload للعنصر القادم
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const nextIndex = (currentIdx + 1) % items.length
    const nextItem = items[nextIndex]
    if (!nextItem) return

    if (nextItem.item_type === 'image' || nextItem.item_type === 'drive_image') {
      const img = new Image()
      img.src = nextItem.resolved_url
    }

    if (nextItem.item_type === 'mp4') {
      const video = preloadVideoRef.current
      if (video) {
        video.src = nextItem.resolved_url
        video.load()
      }
    }

    if (nextItem.item_type === 'drive_video') {
      const fileId = extractDriveFileId(nextItem.original_url || nextItem.resolved_url)
      const primary = fileId ? buildDriveVideoStreamUrl(fileId) : nextItem.resolved_url

      const video = preloadVideoRef.current
      if (video) {
        video.src = primary
        video.load()
      }
    }
  }, [currentIdx, items, status])

  // الصور فقط: مؤقت
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = items[currentIdx]
    if (!item) return

    clearTimeout(advanceTimerRef.current)
    cleanupYoutubePlayer()

    if (item.item_type === 'image' || item.item_type === 'drive_image') {
      scheduleAdvance(item.duration_seconds)
    }

    return () => clearTimeout(advanceTimerRef.current)
  }, [currentIdx, items, status, scheduleAdvance, cleanupYoutubePlayer])

  // يوتيوب عبر API
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = items[currentIdx]
    if (!item || item.item_type !== 'youtube') {
      cleanupYoutubePlayer()
      return
    }

    let cancelled = false
    clearTimeout(advanceTimerRef.current)

    const videoId = extractYouTubeId(item.original_url || item.resolved_url)
    if (!videoId) {
      handleMediaError()
      return
    }

    async function setupYoutube() {
      try {
        await loadYouTubeApi()
        if (cancelled || !youtubeContainerRef.current || !window.YT?.Player) return

        cleanupYoutubePlayer()
        youtubeContainerRef.current.innerHTML = ''

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
                if (itemsRef.current.length <= 1) {
                  try {
                    event.target.seekTo(0, true)
                    event.target.playVideo()
                  } catch (_) {}
                } else {
                  goNext()
                }
              }
            },
            onError: () => {
              handleMediaError()
            }
          }
        })
      } catch (e) {
        console.warn('YouTube init failed:', e)
        handleMediaError()
      }
    }

    setupYoutube()

    return () => {
      cancelled = true
    }
  }, [currentIdx, items, status, cleanupYoutubePlayer, goNext, handleMediaError])

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

  let driveVideoId = null
  let driveVideoPrimary = null
  let driveVideoFallback = null
  let driveVideoPoster = null

  if (item.item_type === 'drive_video') {
    driveVideoId = extractDriveFileId(item.original_url || item.resolved_url)
    driveVideoPrimary = driveVideoId ? buildDriveVideoStreamUrl(driveVideoId) : item.resolved_url
    driveVideoFallback = driveVideoId ? buildDriveVideoFallbackStreamUrl(driveVideoId) : null
    driveVideoPoster = driveVideoId ? buildDriveImageUrl(driveVideoId) : undefined
  }

  return (
    <div className="player-root">
      <div className={`player-media ${isVisible ? 'player-media-enter' : 'player-media-leave'}`}>
        {(item.item_type === 'image' || item.item_type === 'drive_image') && (
          <img
            src={item.resolved_url}
            alt={item.title || ''}
            onError={handleMediaError}
            draggable="false"
          />
        )}

        {item.item_type === 'youtube' && (
          <div className="player-youtube-shell">
            <div ref={youtubeContainerRef} className="player-youtube-api" />
          </div>
        )}

        {item.item_type === 'drive_video' && (
          <video
            ref={activeVideoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            controls={false}
            poster={driveVideoPoster}
            onEnded={handleVideoEnded}
            onError={handleMediaError}
          >
            <source src={driveVideoPrimary} type="video/mp4" />
            {driveVideoFallback && <source src={driveVideoFallback} type="video/mp4" />}
          </video>
        )}

        {item.item_type === 'mp4' && (
          <video
            ref={activeVideoRef}
            src={item.resolved_url}
            autoPlay
            muted
            playsInline
            preload="auto"
            controls={false}
            onEnded={handleVideoEnded}
            onError={handleMediaError}
          />
        )}
      </div>

      <video
        ref={preloadVideoRef}
        className="player-preload-video"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    </div>
  )
}
