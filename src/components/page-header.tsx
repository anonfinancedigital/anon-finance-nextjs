import type { ReactNode } from "react";

/** Page title, an optional subtitle below it, and optional actions on the right. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const heading = <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      {subtitle ? (
        <div className="space-y-1">
          {heading}
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      ) : (
        heading
      )}
      {children}
    </div>
  );
}
