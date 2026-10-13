import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Logo } from "@/components/brand/Logo";
import { BRAND_DESCRIPTOR } from "@/lib/brand";
import { isGoogleEnabled } from "@/lib/google";
import { loginNotice } from "@/lib/login-notice";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

/**
 * The Google callback sends refused sign-ins here as `?error=...`; for a blocked account it also set
 * the `anon_login_block` cookie. The cookie counts only together with `?error=`, so a reload of a
 * clean /login does not repeat an old notice.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error: rawError } = await searchParams;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;
  const blockStatus = error ? (await cookies()).get("anon_login_block")?.value : undefined;
  const notice = loginNotice({ blockStatus, error });

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">{BRAND_DESCRIPTOR}</p>
        </div>
        {notice !== null && (
          <p role="alert" className="text-sm text-destructive">
            {notice}
          </p>
        )}
        {isGoogleEnabled() && (
          <>
            <GoogleButton />
            <p className="text-center text-sm text-muted-foreground">ou</p>
          </>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
