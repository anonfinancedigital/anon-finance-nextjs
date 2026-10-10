import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BRAND_DESCRIPTOR } from "@/lib/brand";
import { redirectIfSignedIn } from "@/lib/auth-guard";
import { passwordResetsRepo } from "@/lib/db/repos/password-resets";
import { INVALID_LINK_MESSAGE } from "@/lib/validation/password-reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await redirectIfSignedIn();

  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const valid = await passwordResetsRepo.isValid(value);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">{BRAND_DESCRIPTOR}</p>
        </div>
        {valid ? (
          <ResetForm token={value} />
        ) : (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {INVALID_LINK_MESSAGE}
            </p>
            <p className="text-sm">
              <Link href="/esqueci-senha" className="text-link hover:underline">
                Pedir outro link
              </Link>
            </p>
          </div>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="text-link hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </main>
  );
}
