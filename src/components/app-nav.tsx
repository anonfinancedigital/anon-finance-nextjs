"use client";

import { LayoutGridIcon, PlusIcon, TargetIcon, TagsIcon, UserIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Visão Geral", icon: LayoutGridIcon },
  { href: "/categorias", label: "Alocação", icon: TagsIcon },
  { href: "/liberdade", label: "Liberdade", icon: TargetIcon },
  { href: "/conta", label: "Conta", icon: UserIcon },
] as const;

const adminItem = { href: "/admin/cadastros", label: "Cadastros", icon: UsersIcon } as const;

/** Main navigation: a bottom bar on small screens, the sidebar list from `md` up. */
export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = isAdmin ? [...items, adminItem] : items;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-lg md:static md:h-auto md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none"
    >
      {navItems.map(({ href, label, icon: Icon }, index) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Fragment key={href}>
            {/*
              Room for the "Nova transação" button, which sits over the middle of the bar on every page. It
              only exists once the vault is open and the categories are decrypted in the browser, so a dimmed
              stand-in is drawn from the first paint in the same spot; the real button covers it.
            */}
            {index === 2 && (
              <>
                <span aria-hidden className="w-14 md:hidden" />
                <span
                  aria-hidden
                  className="pointer-events-none fixed bottom-3 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary/40 ring-4 ring-background md:hidden"
                >
                  <PlusIcon className="size-7 text-primary-foreground/60" />
                </span>
              </>
            )}
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl text-[10px] font-medium transition-colors md:h-10 md:flex-row md:gap-3 md:px-3 md:text-sm",
                active ? "text-link md:bg-primary/15" : "text-muted-foreground hover:text-foreground md:hover:bg-hover",
              )}
            >
              <Icon aria-hidden className="size-5 md:size-4" />
              {label}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
