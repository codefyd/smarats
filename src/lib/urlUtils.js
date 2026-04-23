// ============================================================================
// أدوات اكتشاف نوع الرابط وتحويله للصيغة المناسبة للعرض
// ============================================================================

// يوتيوب: استخراج معرف الفيديو
export function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]

  for (const p of patterns) {
    const m = String(url || '').match(p)
    if (m) return m[1]
  }

  return null
}

// رابط يوتيوب embed نظيف
export function buildYouTubeEmbedUrl(videoId, loop = false) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    enablejsapi: '1'
  })

  if (loop) {
    params.set('loop', '1')
    params.set('playlist', videoId)
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

// Google Drive: استخراج معرف الملف
export function extractDriveFileId(url) {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/
  ]

  for (const p of patterns) {
    const m = String(url || '').match(p)
    if (m) return m[1]
  }

  return null
}

export function buildDriveImageUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
}

export function buildDriveVideoStreamUrl(fileId) {
  return `https://drive.googleusercontent.com/uc?id=${fileId}&export=download`
}

export function buildDriveVideoFallbackStreamUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

export function buildDrivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

// تحويل رابط درايف لصيغة عرض مباشرة
export function buildDriveDirectUrl(fileId, isVideo = false) {
  if (isVideo) {
    return buildDriveVideoStreamUrl(fileId)
  }

  return buildDriveImageUrl(fileId)
}

// اكتشاف ما إذا كان الرابط فيديو حسب الامتداد أو النوع
function looksLikeVideo(url) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
}

function looksLikeImage(url) {
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(url)
}

// ============================================================================
// الدالة الرئيسية
// ============================================================================
export function resolveMediaUrl(rawUrl, userHint = null) {
  const url = String(rawUrl || '').trim()

  if (!url) {
    return { type: null, resolvedUrl: '', error: 'رابط فارغ' }
  }

  // يوتيوب
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const id = extractYouTubeId(url)
    if (!id) return { type: null, resolvedUrl: url, error: 'رابط يوتيوب غير صالح' }
    return { type: 'youtube', resolvedUrl: buildYouTubeEmbedUrl(id, false) }
  }

  // Google Drive
  if (url.includes('drive.google.com') || url.includes('drive.googleusercontent.com')) {
    const id = extractDriveFileId(url)
    if (!id) return { type: null, resolvedUrl: url, error: 'رابط درايف غير صالح' }

    const isVideo = userHint === 'video'
    return {
      type: isVideo ? 'drive_video' : 'drive_image',
      resolvedUrl: buildDriveDirectUrl(id, isVideo)
    }
  }

  // رابط مباشر
  if (looksLikeVideo(url)) {
    return { type: 'mp4', resolvedUrl: url }
  }

  if (looksLikeImage(url)) {
    return { type: 'image', resolvedUrl: url }
  }

  return { type: 'image', resolvedUrl: url }
}

// تسمية قابلة للقراءة لنوع العنصر
export function itemTypeLabel(type) {
  const labels = {
    image: 'صورة',
    youtube: 'يوتيوب',
    drive_image: 'صورة درايف',
    drive_video: 'فيديو درايف',
    mp4: 'فيديو MP4'
  }

  return labels[type] || type
}
