import { WalletIcon } from "lucide-react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Orçamento" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_16px_oklch(0.57_0.21_293/0.35)]">
            <WalletIcon aria-hidden className="size-5" />
          </div>
          <h1 className="font-display text-xl font-bold">Orçamento doméstico</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
