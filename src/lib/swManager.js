// ============================================================================
// swManager — إدارة Service Worker للشاشة فقط
// ----------------------------------------------------------------------------
// الاستخدام:
//   import { registerPlayerSW, invalidateUrls, precacheUrls } from '../lib/swManager'
//   registerPlayerSW()      // نسجّل الـ SW عند تحميل PlayerPage
//   precacheUrls([...])     // نطلب تحميل عناصر القائمة مسبقاً
//   invalidateUrls([...])   // عند تغيّر القائمة، نحذف العناصر القديمة
// ============================================================================

const SW_PATH = '/player-sw.js';
const SW_SCOPE = '/';

let registrationPromise = null;

// ============================================================================
// التسجيل — يحدث مرة واحدة فقط في عمر التبويب
// ============================================================================
export function registerPlayerSW() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker غير مدعوم في هذا المتصفح');
    return Promise.resolve(null);
  }

  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, {
        scope: SW_SCOPE,
        updateViaCache: 'none' // لا نسمح بكاش الـ SW نفسه (للتحديثات السريعة)
      });

      // فحص دوري للتحديثات (كل ساعة)
      setInterval(() => {
        reg.update().catch(() => {});
      }, 60 * 60 * 1000);

      return reg;
    } catch (err) {
      console.error('[SW] فشل التسجيل:', err);
      return null;
    }
  })();

  return registrationPromise;
}

// ============================================================================
// إرسال رسالة للـ SW
// ============================================================================
async function postToSW(message) {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await registrationPromise;
  if (!reg) return false;
  // controller أو active worker
  const sw = navigator.serviceWorker.controller || reg.active;
  if (!sw) return false;
  sw.postMessage(message);
  return true;
}

// ============================================================================
// API عام
// ============================================================================
export function precacheUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return Promise.resolve(false);
  return postToSW({ type: 'PRECACHE', urls });
}

export function invalidateUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return Promise.resolve(false);
  return postToSW({ type: 'INVALIDATE', urls });
}

export function clearAllCache() {
  return postToSW({ type: 'CLEAR_ALL' });
}

// ============================================================================
// إحصائيات الكاش (للمستقبل — لوحة تشخيص)
// ============================================================================
export async function getCacheStats() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await registrationPromise;
  if (!reg) return null;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data);
    const sw = navigator.serviceWorker.controller || reg.active;
    if (!sw) { resolve(null); return; }
    sw.postMessage({ type: 'GET_STATS' }, [channel.port2]);
    setTimeout(() => resolve(null), 3000); // timeout
  });
}
