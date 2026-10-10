import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BRAND_DESCRIPTOR } from "@/lib/brand";
import { redirectIfSignedIn } from "@/lib/auth-guard";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

const MAX_EMAIL_LENGTH = 254;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await redirectIfSignedIn();
  const { email } = await searchParams;
  const defaultEmail = typeof email === "string" ? email.slice(0, MAX_EMAIL_LENGTH) : "";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">{BRAND_DESCRIPTOR}</p>
        </div>
        <RequestForm defaultEmail={defaultEmail} />
        <p className="text-center text-sm">
          <Link href="/login" className="text-link hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </main>
  );
}
