// ============================================================================
// BrandMark — أيقونة شاشة موحّدة (نفس favicon)
// تستخدم في كل أنحاء التطبيق بدل حرف "س"
// ============================================================================

export default function BrandMark({ size = 36, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="سماراتس"
    >
      <rect width="64" height="64" rx="14" fill="#0284c7" />
      <rect
        x="12"
        y="16"
        width="40"
        height="26"
        rx="3"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
      />
      <rect x="26" y="46" width="12" height="3" fill="#fff" />
      <circle cx="32" cy="29" r="5" fill="#fff" />
    </svg>
  )
}
