import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { redirectIfSignedIn } from "@/lib/auth-guard";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default async function ForgotPasswordPage() {
  await redirectIfSignedIn();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">Gestão Patrimonial Familiar</p>
        </div>
        <RequestForm />
        <p className="text-center text-sm">
          <Link href="/login" className="text-link hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </main>
  );
}
