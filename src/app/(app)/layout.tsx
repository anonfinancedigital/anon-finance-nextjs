import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { BiometricGate } from "@/components/biometric-gate";
import { BiometricInvite } from "@/components/biometric-invite";
import { GlobalNewTransaction } from "@/components/global-new-transaction";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { VaultProvider } from "@/components/vault-provider";
import { requireSessionForPage } from "@/lib/auth-guard";
import { categoriesRepo } from "@/lib/db/repos/categories";
import { legacyRepo } from "@/lib/db/repos/legacy";
import { vaultRepo } from "@/lib/db/repos/vault";
import { currentMonth } from "@/lib/domain/month";

/**
 * Shell of the signed-in area: sidebar (top bar on mobile) with navigation and sign-out. Pages render
 * inside `VaultProvider`, so none shows data before the DEK is open (SIGILO-17). Pages still guard their own data.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId, isAdmin } = await requireSessionForPage();
  // Legacy first: it has no vault, so no sealed birth date either (SIGILO-22).
  // /proteger-dados, /criar-cofre and /data-nascimento live outside this group, so no redirect loops.
  if (await legacyRepo.isLegacy(userId)) redirect("/proteger-dados");
  // Google-only account without a vault: it creates the vault (and the sealed birth date) there.
  if (await vaultRepo.needsVault(userId)) redirect("/criar-cofre");
  if ((await vaultRepo.getBirthDateSealed(userId)) === null) redirect("/data-nascimento");
  // The categories the "Nova transação" button of the bottom bar offers, sealed like on every page.
  const now = new Date();
  const categories = await categoriesRepo.listForMonthSealed(userId, currentMonth(now));

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 md:fixed md:inset-y-0 md:left-0 md:w-[218px] md:flex-col md:items-stretch md:gap-6 md:border-r md:border-b-0 md:bg-sidebar md:p-3">
        <Logo className="md:px-1 md:pt-2" />
        <AppNav isAdmin={isAdmin} />
        <div className="ml-auto flex items-center gap-1 md:mt-auto md:ml-0 md:flex-col md:items-stretch">
          <ThemeToggle className="md:w-full md:justify-start" />
          <SignOutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:ml-[218px] md:max-w-none md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          <VaultProvider userId={userId}>
            <BiometricGate userId={userId}>
              <BiometricInvite userId={userId} />
              {children}
              <GlobalNewTransaction categories={categories} nowIso={now.toISOString()} />
            </BiometricGate>
          </VaultProvider>
        </div>
      </main>
    </div>
  );
}
