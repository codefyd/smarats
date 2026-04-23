import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { extractYouTubeId, buildYouTubeEmbedUrl } from '../lib/urlUtils'

let youtubeApiPromise = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)

  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }

    const checkReady = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(checkReady)
        resolve(window.YT)
      }
    }, 200)
  })

  return youtubeApiPromise
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
  const preloadRef = useRef({ image: null, video: null })

  const itemsRef = useRef([])
  const currentIdxRef = useRef(0)
  const transitionLockRef = useRef(false)

  const youtubeIframeRef = useRef(null)
  const youtubePlayerRef = useRef(null)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  const animateNext = useCallback((nextFn) => {
    if (transitionLockRef.current) return
    transitionLockRef.current = true
    setIsVisible(false)

    setTimeout(() => {
      nextFn()
      setTimeout(() => {
        setIsVisible(true)
        transitionLockRef.current = false
      }, 60)
    }, 220)
  }, [])

  const goNext = useCallback(() => {
    animateNext(() => {
      setCurrentIdx((idx) => {
        const list = itemsRef.current
        if (!list.length) return 0
        return (idx + 1) % list.length
      })
    })
  }, [animateNext])

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

  function scheduleAdvance(seconds) {
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, Math.max(1, seconds) * 1000)
  }

  function handleMediaError(e) {
    console.warn(
      'Media failed, skipping to next:',
      e?.target?.currentSrc || e?.target?.src || itemsRef.current?.[currentIdxRef.current]?.resolved_url
    )

    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = setTimeout(() => {
      goNext()
    }, 1200)
  }

  // preload للعنصر القادم
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const nextIndex = (currentIdx + 1) % items.length
    const nextItem = items[nextIndex]
    if (!nextItem) return

    if (nextItem.item_type === 'image' || nextItem.item_type === 'drive_image') {
      const img = new Image()
      img.src = nextItem.resolved_url
      preloadRef.current.image = img
    }

    if (nextItem.item_type === 'mp4') {
      const v = document.createElement('video')
      v.src = nextItem.resolved_url
      v.preload = 'auto'
      v.muted = true
      v.playsInline = true
      preloadRef.current.video = v
    }
  }, [currentIdx, items, status])

  // تنظيم الصور / الفيديو المباشر / فيديو درايف
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = items[currentIdx]
    if (!item) return

    clearTimeout(advanceTimerRef.current)

    if (
      item.item_type === 'image' ||
      item.item_type === 'drive_image' ||
      item.item_type === 'drive_video'
    ) {
      scheduleAdvance(item.duration_seconds)
    }

    return () => clearTimeout(advanceTimerRef.current)
  }, [currentIdx, items, status, goNext])

  // تشغيل يوتيوب عبر API والانتقال التلقائي بعد النهاية
  useEffect(() => {
    if (status !== 'ready' || items.length === 0) return

    const item = items[currentIdx]
    if (!item || item.item_type !== 'youtube') {
      if (youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy()
        youtubePlayerRef.current = null
      }
      return
    }

    let cancelled = false
    clearTimeout(advanceTimerRef.current)

    const videoId = extractYouTubeId(item.original_url || item.resolved_url)
    if (!videoId) {
      handleMediaError()
      return
    }

    const singleItemLoop = items.length === 1

    async function setupYoutube() {
      try {
        await loadYouTubeApi()
        if (cancelled || !youtubeIframeRef.current) return

        youtubePlayerRef.current?.destroy?.()

        youtubePlayerRef.current = new window.YT.Player(youtubeIframeRef.current, {
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
            disablekb: 1,
            loop: singleItemLoop ? 1 : 0,
            playlist: singleItemLoop ? videoId : undefined
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
                    event.target.seekTo(0)
                    event.target.playVideo()
                  } catch (_) {}
                } else {
                  goNext()
                }
              }

              if (event.data === window.YT.PlayerState.UNSTARTED) {
                scheduleAdvance(item.duration_seconds || 30)
              }
            },
            onError: () => {
              handleMediaError()
            }
          }
        })
      } catch (e) {
        console.warn('YouTube API setup failed:', e)
        scheduleAdvance(item.duration_seconds || 30)
      }
    }

    setupYoutube()

    return () => {
      cancelled = true
    }
  }, [currentIdx, items, status, goNext])

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

  const youtubeVideoId =
    item.item_type === 'youtube'
      ? extractYouTubeId(item.original_url || item.resolved_url)
      : null

  const cleanYoutubeSrc =
    youtubeVideoId
      ? buildYouTubeEmbedUrl(youtubeVideoId, items.length === 1)
      : null

  return (
    <div className="player-root">
      <div
        key={item.id}
        className={`player-media ${isVisible ? 'player-media-enter' : 'player-media-leave'}`}
      >
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
            <iframe
              ref={youtubeIframeRef}
              src={cleanYoutubeSrc}
              title={item.title || 'YouTube'}
              allow="autoplay; encrypted-media"
              allowFullScreen={false}
              onError={handleMediaError}
            />
          </div>
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
            src={item.resolved_url}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={goNext}
            onError={handleMediaError}
          />
        )}
      </div>
    </div>
  )
}
