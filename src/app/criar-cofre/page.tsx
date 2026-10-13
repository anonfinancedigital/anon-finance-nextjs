import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { requireSessionForPage } from "@/lib/auth-guard";
import { vaultRepo } from "@/lib/db/repos/vault";
import { CreateVaultForm } from "./create-vault-form";

export const metadata: Metadata = { title: "Criar cofre" };

/**
 * Vault creation for an approved account that entered only through Google. Outside the (app) group:
 * the (app) layout sends accounts that need a vault here, so it must not guard itself; any other
 * account goes to /. Protected by the proxy (not in PUBLIC_PATHS).
 */
export default async function CreateVaultPage() {
  const { userId } = await requireSessionForPage();
  if (!(await vaultRepo.needsVault(userId))) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie a senha do seu cofre. Ela protege seus dados e fica só no seu navegador
          </p>
        </div>
        <CreateVaultForm userId={userId} />
      </div>
    </main>
  );
}
