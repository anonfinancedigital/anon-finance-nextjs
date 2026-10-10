import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { SiteFooter } from "@/components/landing/site-footer";
import { PrivacyContent } from "@/components/privacy/privacy-content";

export const metadata: Metadata = { title: "Privacidade e segurança" };

/**
 * Public frame of the privacy page: landing header and footer on the dark canvas. Signed-in users never get
 * here: the proxy rewrites `/privacidade` to `/seguranca`, the same content inside the app shell.
 */
export default function PrivacyPage() {
  return (
    <div className="dark flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <PrivacyContent />
        <p className="text-center">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-5 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            Voltar ao início
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
