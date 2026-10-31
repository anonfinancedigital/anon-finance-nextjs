/**
 * Full-screen brand splash shown while the vault opens: the favicon mark, centered on the same
 * `#0D111A` as the native launch splash. The pulse only runs without `prefers-reduced-motion`.
 * Static on purpose: it holds no user data (SPLASH-10).
 */
export function BrandSplash() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D111A]"
    >
      <svg
        aria-hidden
        viewBox="0 0 64 64"
        fill="none"
        className="size-[30vw] max-w-40 min-w-24 motion-safe:animate-pulse"
      >
        <defs>
          <linearGradient id="splashGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="45%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="splashAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <rect
          width="64"
          height="64"
          rx="16"
          fill="#0D111A"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.5"
        />
        <path
          d="M32 14 L15 49 H25.5 L32 35.5 L38.5 49 H49 Z"
          fill="url(#splashGrad)"
        />
        <circle cx="32" cy="27.8" r="1.4" fill="#0D111A" />
        <path d="M31.2 28.8 L30.6 32.5 H33.4 L32.8 28.8 Z" fill="#0D111A" />
        <path
          d="M32 14 L49 49"
          stroke="url(#splashAccent)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
