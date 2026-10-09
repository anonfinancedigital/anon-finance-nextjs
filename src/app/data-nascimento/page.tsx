import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { VaultProvider } from "@/components/vault-provider";
import { requireSessionForPage } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { legacyRepo } from "@/lib/db/repos/legacy";
import { vaultRepo } from "@/lib/db/repos/vault";
import { BirthDateForm } from "./birth-date-form";

export const metadata: Metadata = { title: "Data de nascimento" };

/** Outside the (app) group: the (app) layout sends accounts without a date here, so it must not guard itself. */
export default async function BirthDatePage() {
  const { userId } = await requireSessionForPage();
  if (await legacyRepo.isLegacy(userId)) redirect("/proteger-dados");
  // Sealed rows only: whether there is a date decides the texts; the browser opens both.
  const [birthDateCt, goalDto] = await Promise.all([
    vaultRepo.getBirthDateSealed(userId),
    goalsRepo.getSealed(userId),
  ]);
  const hasDate = birthDateCt !== null;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasDate ? "Altere sua data de nascimento" : "Informe sua data de nascimento para continuar"}
          </p>
        </div>
        <VaultProvider userId={userId}>
          <BirthDateForm birthDateCt={birthDateCt} goalDto={goalDto} />
        </VaultProvider>
        {hasDate && (
          <p className="text-center text-sm">
            <Link href="/liberdade" className="text-link hover:underline">
              Voltar
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
