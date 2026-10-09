"use client";

import { LayoutGridIcon, ShieldIcon, TargetIcon, TagsIcon, UserIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Visão Geral", icon: LayoutGridIcon },
  { href: "/categorias", label: "Alocação", icon: TagsIcon },
  { href: "/liberdade", label: "Ápice", icon: TargetIcon },
  { href: "/conta", label: "Conta", icon: UserIcon },
  { href: "/privacidade", label: "Privacidade", icon: ShieldIcon },
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
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl text-[10px] font-medium transition-colors md:h-10 md:flex-row md:gap-3 md:px-3 md:text-sm",
              active
                ? "text-link md:bg-primary/15"
                : "text-muted-foreground hover:text-foreground md:hover:bg-hover",
            )}
          >
            <Icon aria-hidden className="size-5 md:size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
