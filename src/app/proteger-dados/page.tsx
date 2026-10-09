import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { requireSessionForPage } from "@/lib/auth-guard";
import { legacyRepo } from "@/lib/db/repos/legacy";
import { ProtectForm } from "./protect-form";

export const metadata: Metadata = { title: "Proteger dados" };

/**
 * One-time migration of a legacy account (SIGILO-22). Outside the (app) group: the (app) layout sends
 * legacy accounts here, so it must not guard itself; an account that already has a vault goes to /.
 */
export default async function ProtectDataPage() {
  const { userId } = await requireSessionForPage();
  if (!(await legacyRepo.isLegacy(userId))) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">Proteja seus dados para continuar</p>
        </div>
        <ProtectForm userId={userId} />
      </div>
    </main>
  );
}
