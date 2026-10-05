import type { ReactNode } from "react";

/** Page title with a small uppercase eyebrow, and optional actions on the right. */
export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
