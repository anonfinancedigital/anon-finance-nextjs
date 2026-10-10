"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { primaryButton } from "./styles";

const LINKS = [
  { href: "#cockpit", label: "Cockpit" },
  { href: "#apice", label: "O Ápice" },
  { href: "/privacidade", label: "Segurança" },
  { href: "#manifesto", label: "Manifesto" },
];

const linkClass = "text-sm text-zinc-400 transition hover:text-white";

/** Sticky glass header; links collapse into a hamburger panel below `md`. */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Vértice, página inicial" onClick={close}>
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className={`${linkClass} px-2`}>
            Entrar
          </Link>
          <Link href="/cadastro" className={primaryButton}>
            Começar agora
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/5 md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <XIcon aria-hidden className="size-5" /> : <MenuIcon aria-hidden className="size-5" />}
        </button>
      </div>

      <div
        id="landing-mobile-menu"
        className={`grid transition-[grid-template-rows] duration-300 md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <nav aria-label="Principal (mobile)" className="flex flex-col gap-1 border-t border-white/[0.08] px-6 py-4">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={close} className={`${linkClass} py-2 text-base`}>
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-3">
              <Link href="/login" onClick={close} className="py-2 text-base text-zinc-300">
                Entrar
              </Link>
              <Link href="/cadastro" onClick={close} className={`${primaryButton} py-2.5`}>
                Começar agora
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
