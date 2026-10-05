import type { ReactNode } from "react";

/** Page title, and optional actions on the right. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
