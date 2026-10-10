import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const FOOTER_COLUMNS = [
  {
    title: "Produto",
    links: [
      { href: "/#cockpit", label: "Cockpit" },
      { href: "/#pilares", label: "Alocação" },
      { href: "/#apice", label: "Ápice" },
    ],
  },
  {
    title: "Segurança",
    links: [
      { href: "/privacidade", label: "Arquitetura Zero-Knowledge" },
      { href: "/privacidade", label: "Privacidade" },
    ],
  },
];

/** Public footer shared by the landing and the public privacy page. */
export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.08]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-xs text-sm text-zinc-500">Da renda mensal ao ápice patrimonial.</p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="space-y-3">
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-zinc-500 transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.08] px-6 py-5 text-center text-xs text-zinc-600">
        © 2026 Vértice. Desenvolvido para quem leva patrimônio a sério.
      </div>
    </footer>
  );
}
