/* eslint-disable no-restricted-globals */
// ============================================================================
// سماراتس — Service Worker لشاشات العرض
// ----------------------------------------------------------------------------
// المسؤوليات:
//   1. كاش الصور والفيديوهات بعد أول تحميل (Cache First)
//   2. تجاهل طلبات Supabase RPC (ديناميكية)
//   3. تجاهل طلبات React/JS/CSS (تتولاها strategies المتصفح العادية)
//   4. استقبال أوامر invalidation من PlayerPage عند تغيّر القائمة
//   5. حد أقصى للحجم 500MB مع LRU
// ----------------------------------------------------------------------------
// الـ scope: '/' (root) — يعمل مع smarats.com مباشرةً
// ============================================================================

const SW_VERSION = '1';
const CACHE_NAME = `smarats-media-v${SW_VERSION}`;
const META_CACHE = `smarats-meta-v${SW_VERSION}`;
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_ITEM_BYTES = 100 * 1024 * 1024;  // لا نخزّن عنصراً واحداً > 100MB

// ============================================================================
// Install / Activate
// ============================================================================
self.addEventListener('install', (event) => {
  // تفعيل فوري للنسخة الجديدة بدون انتظار إغلاق التبويبات
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // حذف الكاشات القديمة (نسخ سابقة)
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('smarats-') && k !== CACHE_NAME && k !== META_CACHE)
        .map((k) => caches.delete(k))
    );
    // السيطرة على الصفحات المفتوحة فوراً
    await self.clients.claim();
  })());
});

// ============================================================================
// تصنيف الطلبات
// ============================================================================
function isMediaRequest(url) {
  const u = new URL(url);
  // YouTube embed نتجاهله — Cross-Origin محمي + YouTube له CDN خاص
  if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
    return false;
  }
  // Drive — صور وفيديوهات
  if (u.hostname.includes('drive.google.com') ||
      u.hostname.includes('drive.googleusercontent.com') ||
      u.hostname.includes('googleusercontent.com')) {
    return true;
  }
  // امتدادات ميديا مباشرة
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif|mp4|webm|mov|m4v)(\?|$)/i.test(u.pathname)) {
    return true;
  }
  return false;
}

function isSupabaseRequest(url) {
  return url.includes('.supabase.co') || url.includes('.supabase.in');
}

// ============================================================================
// Fetch interceptor
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET فقط — لا نلمس POST/PATCH/DELETE
  if (request.method !== 'GET') return;

  const url = request.url;

  // Supabase RPC → نمر بدون تدخل
  if (isSupabaseRequest(url)) return;

  // ميديا → استراتيجية Cache First
  if (isMediaRequest(url)) {
    event.respondWith(handleMediaRequest(request));
    return;
  }

  // باقي الطلبات (HTML, JS, CSS) → نمر طبيعياً، Vite/CDN يتولى الكاش
});

// ============================================================================
// استراتيجية Cache First للميديا
// ============================================================================
async function handleMediaRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);

    // 1) فحص الكاش أولاً
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) {
      // تحديث الميتاداتا (آخر استخدام) للـ LRU — best effort
      bumpLastUsed(request.url).catch(() => {});
      return cached;
    }

    // 2) لم يوجد → جلب من الشبكة
    const response = await fetch(request, {
      // mode: 'cors' للـ Drive، Drive يدعم CORS للصور والفيديوهات
      // إذا فشل CORS، نقع على opaque response (جزئي لكنه يعمل للعرض)
      credentials: 'omit'
    });

    // إذا الرد ليس ناجحاً، لا نخزّن
    if (!response || (response.status !== 200 && response.status !== 0)) {
      return response;
    }

    // 3) فحص الحجم قبل الحفظ
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_ITEM_BYTES) {
      return response; // أكبر من اللازم — أرجع بدون كاش
    }

    // 4) نسخة للكاش (response stream يُستهلك مرة واحدة)
    const responseToCache = response.clone();

    // 5) تعديل headers إذا كانت Drive تمنع الكاش
    let cachableResponse = responseToCache;
    const cacheControl = responseToCache.headers.get('cache-control') || '';
    if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
      // نعيد بناء Response بـ headers جديدة تسمح بالكاش
      const newHeaders = new Headers(responseToCache.headers);
      newHeaders.set('cache-control', 'public, max-age=86400');
      const body = await responseToCache.blob();
      cachableResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: newHeaders
      });
    }

    // 6) حفظ في الكاش (في الخلفية، لا ننتظر)
    storeInCache(cache, request, cachableResponse).catch((err) => {
      console.warn('[SW] cache put failed:', err);
    });

    return response;
  } catch (err) {
    // فشل الشبكة كلياً → آخر محاولة من الكاش (حتى لو ignore-search)
    const fallback = await caches.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    throw err;
  }
}

// ============================================================================
// تخزين في الكاش مع تنفيذ LRU عند الامتلاء
// ============================================================================
async function storeInCache(cache, request, response) {
  await cache.put(request, response);
  // تحديث الميتاداتا
  await bumpLastUsed(request.url);
  // فحص الحد الأقصى (lazy، كل ~10 إضافات)
  if (Math.random() < 0.1) {
    await enforceCacheLimit();
  }
}

// ============================================================================
// ميتاداتا LRU — نخزّن timestamp آخر استخدام لكل URL
// نستخدم Cache API بدل IndexedDB لتبسيط (خفيف ولا حاجة لمكتبات)
// ============================================================================
async function bumpLastUsed(url) {
  const meta = await caches.open(META_CACHE);
  const metaUrl = `https://meta.smarats.local/${encodeURIComponent(url)}`;
  await meta.put(
    metaUrl,
    new Response(String(Date.now()), {
      headers: { 'content-type': 'text/plain' }
    })
  );
}

async function getLastUsedMap() {
  const meta = await caches.open(META_CACHE);
  const keys = await meta.keys();
  const map = new Map();
  await Promise.all(keys.map(async (req) => {
    const decoded = decodeURIComponent(req.url.replace('https://meta.smarats.local/', ''));
    const resp = await meta.match(req);
    const ts = resp ? parseInt(await resp.text(), 10) : 0;
    map.set(decoded, ts);
  }));
  return map;
}

// ============================================================================
// تطبيق حد الحجم الأقصى — LRU eviction
// ============================================================================
async function enforceCacheLimit() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return;
    const { usage = 0 } = await navigator.storage.estimate();
    if (usage < MAX_CACHE_BYTES) return;

    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    if (requests.length === 0) return;

    const lruMap = await getLastUsedMap();
    // ترتيب من الأقدم للأحدث
    const sorted = requests.slice().sort((a, b) => {
      return (lruMap.get(a.url) || 0) - (lruMap.get(b.url) || 0);
    });

    // حذف 20٪ من الأقدم
    const toDelete = Math.ceil(sorted.length * 0.2);
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(sorted[i]);
    }
  } catch (err) {
    console.warn('[SW] enforceCacheLimit failed:', err);
  }
}

// ============================================================================
// رسائل من PlayerPage
// أنواع الرسائل:
//   - INVALIDATE: { urls: [...] } → احذف هذه الـ URLs من الكاش
//   - PRECACHE:   { urls: [...] } → نزّل وخزّن مسبقاً
//   - CLEAR_ALL:  امسح كل شيء
//   - GET_STATS:  أرجع إحصائيات
// ============================================================================
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;

  if (type === 'INVALIDATE' && Array.isArray(data.urls)) {
    event.waitUntil(invalidateUrls(data.urls));
  } else if (type === 'PRECACHE' && Array.isArray(data.urls)) {
    event.waitUntil(precacheUrls(data.urls));
  } else if (type === 'CLEAR_ALL') {
    event.waitUntil(clearAllCaches());
  } else if (type === 'GET_STATS' && event.ports && event.ports[0]) {
    getCacheStats().then((stats) => event.ports[0].postMessage(stats));
  }
});

async function invalidateUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(urls.map((u) => cache.delete(u, { ignoreVary: true })));
}

async function precacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  // نتجاهل الفشل لكل URL على حدة
  await Promise.allSettled(urls.map(async (url) => {
    try {
      // لا نحمّل لو موجود مسبقاً
      const existing = await cache.match(url, { ignoreVary: true });
      if (existing) {
        await bumpLastUsed(url);
        return;
      }
      const req = new Request(url, { credentials: 'omit', mode: 'cors' });
      const response = await fetch(req);
      if (response && (response.status === 200 || response.status === 0)) {
        const len = parseInt(response.headers.get('content-length') || '0', 10);
        if (len <= MAX_ITEM_BYTES) {
          await cache.put(req, response.clone());
          await bumpLastUsed(url);
        }
      }
    } catch (err) {
      // تجاهل — قد يكون CORS أو شبكة
    }
  }));
}

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith('smarats-')).map((k) => caches.delete(k)));
}

async function getCacheStats() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let usage = 0;
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    usage = est.usage || 0;
  }
  return {
    items: keys.length,
    bytes: usage,
    version: SW_VERSION
  };
}
