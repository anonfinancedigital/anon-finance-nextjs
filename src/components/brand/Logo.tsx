import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Vértice brand mark: dark squircle with a purple-to-emerald "V" and an emerald dot,
 * next to the name and tagline. Geometry comes from docs/vertice_logo.svg; the text is HTML
 * (not SVG `<text>`) so it inherits Sora from `font-display` and follows the theme tokens.
 */
export function Logo({ className }: { className?: string }) {
  // Unique per instance: the logo can render twice on a page (sidebar and top bar).
  const uid = useId().replace(/:/g, "");
  const gradId = `vertice-grad-${uid}`;
  const bgId = `vertice-bg-${uid}`;

  return (
    <span role="img" aria-label="Vértice" className={cn("inline-flex items-center gap-3", className)}>
      <svg aria-hidden viewBox="0 0 64 64" fill="none" className="size-10 shrink-0">
        <defs>
          <linearGradient id={gradId} x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id={bgId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#231e3d" />
            <stop offset="100%" stopColor="#131024" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill={`url(#${bgId})`} />
        <rect width="64" height="64" rx="18" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <path
          d="M18 20L31.1 43.5C31.5 44.2 32.5 44.2 32.9 43.5L46 20"
          stroke={`url(#${gradId})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="15" r="3.5" fill="#10b981" />
      </svg>
      <span aria-hidden className="flex min-w-0 flex-col leading-tight">
        <span className="font-display text-xl font-extrabold tracking-wider text-foreground">VÉRTICE</span>
        <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
          Gestão Patrimonial
        </span>
      </span>
    </span>
  );
}
