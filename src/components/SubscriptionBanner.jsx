// ============================================================================
// SubscriptionBanner — يظهر عند:
//   - الاشتراك منتهي
//   - الاشتراك على وشك الانتهاء (≤ 20 يوم)
//   - الجهة معلّقة أو بانتظار الموافقة
// ============================================================================

import { useAuth } from '../contexts/AuthContext'

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA-u-ca-gregory', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export default function SubscriptionBanner() {
  const { role, org, subscription } = useAuth()

  // السوبر أدمن لا يرى البانر
  if (role === 'super_admin') return null
  if (!org) return null

  // 1) جهة بانتظار الموافقة
  if (org.status === 'pending') {
    return (
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-lg leading-none mt-0.5">⏳</span>
          <div className="flex-1">
            <div className="font-semibold text-amber-900 text-sm">جهتك بانتظار الموافقة</div>
            <p className="text-amber-800 text-xs mt-0.5">
              سيتم تفعيل حسابك من الإدارة قريباً. لن تتمكن من إضافة شاشات أو قوائم حتى الموافقة.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 2) جهة معلّقة
  if (org.status === 'suspended') {
    return (
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-red-600 text-lg leading-none mt-0.5">🚫</span>
          <div className="flex-1">
            <div className="font-semibold text-red-900 text-sm">جهتك معلّقة</div>
            <p className="text-red-800 text-xs mt-0.5">
              تم تعليق الحساب من قبل الإدارة. تواصل معهم لمعرفة التفاصيل.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 3) لا يوجد اشتراك أصلاً
  if (!subscription || subscription.status === 'no_subscription') {
    return (
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-lg leading-none mt-0.5">ℹ️</span>
          <div className="flex-1">
            <div className="font-semibold text-amber-900 text-sm">لم يتم تحديد اشتراك للجهة</div>
            <p className="text-amber-800 text-xs mt-0.5">
              تواصل مع الإدارة لتفعيل اشتراكك واختيار الباقة المناسبة.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 4) منتهي
  if (subscription.status === 'expired') {
    return (
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-red-600 text-lg leading-none mt-0.5">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold text-red-900 text-sm">الاشتراك منتهي — تواصل للتجديد</div>
            <p className="text-red-800 text-xs mt-0.5">
              انتهى اشتراكك في {formatDate(subscription.end_date)}.
              الشاشات تعرض رسالة الانتهاء حالياً، ولا يمكنك تعديل المحتوى حتى التجديد.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 5) قارب على الانتهاء (≤ 20 يوم)
  if (subscription.status === 'expiring_soon') {
    const days = subscription.days_remaining
    const dayWord = days === 1 ? 'يوم' : days === 2 ? 'يومان' : 'أيام'
    return (
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-lg leading-none mt-0.5">⏰</span>
          <div className="flex-1">
            <div className="font-semibold text-amber-900 text-sm">
              الاشتراك ينتهي خلال {days} {dayWord}
            </div>
            <p className="text-amber-800 text-xs mt-0.5">
              تاريخ الانتهاء: {formatDate(subscription.end_date)} — تواصل مع الإدارة للتجديد قبل انقطاع العرض.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // active — لا نعرض شيء
  return null
}
