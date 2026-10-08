import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { requireSessionForPage } from "@/lib/auth-guard";
import { usersRepo } from "@/lib/db/repos/users";
import { isoToBR } from "@/lib/domain/date-br";
import { BirthDateForm } from "./birth-date-form";

export const metadata: Metadata = { title: "Data de nascimento" };

/** Outside the (app) group: the (app) layout sends accounts without a date here, so it must not guard itself. */
export default async function BirthDatePage() {
  const { userId } = await requireSessionForPage();
  const birthDate = await usersRepo.getBirthDate(userId);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">
            {birthDate === null
              ? "Informe sua data de nascimento para continuar"
              : "Altere sua data de nascimento"}
          </p>
        </div>
        <BirthDateForm initial={birthDate === null ? "" : isoToBR(birthDate)} />
        {birthDate !== null && (
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
