import { useId } from "react";
import { BRAND_DESCRIPTOR, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const MARK_PATH = "M40 18 L19 62 H32 L40 45 L48 62 H61 Z";
const LOCK_DOT = { cx: 40, cy: 36, r: 1.8 };
const LOCK_BODY = "M39.1 37.2 L38.4 42 H41.6 L40.9 37.2 Z";
const ACCENT_LINE = "M40 18 L61 62";

/**
 * ANON brand mark: the "A" monogram with the lock slit, next to the name and descriptor.
 * Geometry, gradients and surface colors come from docs/marca/anon_logo_dark.svg and
 * anon_logo_light.svg; both variants are rendered and swapped by the `dark` class, like the rest of
 * the app, so a theme switch changes variant without a layout shift. The text is HTML (not SVG
 * `<text>`) so it inherits Sora from `font-display` and follows the theme tokens.
 */
export function Logo({ className }: { className?: string }) {
  // Unique per instance and per variant: the logo can render twice on a page (sidebar and top bar).
  const uid = useId().replace(/:/g, "");
  const dark = { grad: `anon-grad-dark-${uid}`, line: `anon-line-dark-${uid}`, glow: `anon-glow-dark-${uid}` };
  const light = { grad: `anon-grad-light-${uid}`, line: `anon-line-light-${uid}`, shadow: `anon-shadow-light-${uid}` };

  return (
    <span role="img" aria-label={BRAND_NAME} className={cn("inline-flex items-center gap-3", className)}>
      <svg aria-hidden viewBox="-8 -8 96 96" fill="none" className="size-10 shrink-0 dark:hidden">
        <defs>
          <linearGradient id={light.grad} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="45%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id={light.line} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4338CA" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id={light.shadow} x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.06" />
          </filter>
        </defs>
        <g filter={`url(#${light.shadow})`}>
          <rect width="80" height="80" rx="20" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d={MARK_PATH} fill={`url(#${light.grad})`} />
          <circle {...LOCK_DOT} fill="#F8FAFC" />
          <path d={LOCK_BODY} fill="#F8FAFC" />
          <path d={ACCENT_LINE} stroke={`url(#${light.line})`} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
      <svg aria-hidden viewBox="-8 -8 96 96" fill="none" className="hidden size-10 shrink-0 dark:block">
        <defs>
          <linearGradient id={dark.grad} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="45%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id={dark.line} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <radialGradient id={dark.glow} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="-8" y="-8" width="96" height="96" rx="28" fill={`url(#${dark.glow})`} />
        <rect width="80" height="80" rx="20" fill="#0D111A" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />
        <path d={MARK_PATH} fill={`url(#${dark.grad})`} />
        <circle {...LOCK_DOT} fill="#0D111A" />
        <path d={LOCK_BODY} fill="#0D111A" />
        <path d={ACCENT_LINE} stroke={`url(#${dark.line})`} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span aria-hidden className="flex min-w-0 flex-col leading-tight">
        <span className="font-display text-xl font-extrabold tracking-wider text-foreground">{BRAND_NAME}</span>
        <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
          {BRAND_DESCRIPTOR}
        </span>
      </span>
    </span>
  );
}
