import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Standard section container: titled header (optional note on the right) over a bordered card. */
export function ContentCard({
  title,
  note,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  note?: ReactNode;
  /** Explanatory line under the title. */
  description?: ReactNode;
  /** Control shown at the right end of the header, after the note. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const heading = <h2 className="font-display text-base font-semibold md:text-lg">{title}</h2>;
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-lg", className)}>
      <header className="flex items-center justify-between gap-2 px-6 py-5">
        {description ? (
          <div className="min-w-0">
            {heading}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        ) : (
          heading
        )}
        {(note || action) && (
          <div className="flex items-center gap-3">
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
            {action}
          </div>
        )}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
