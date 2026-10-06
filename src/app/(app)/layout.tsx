import { LogOutIcon } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireSessionForPage } from "@/lib/auth-guard";

/** Shell of the signed-in area: sidebar (top bar on mobile) with navigation and sign-out. Pages still guard their own data. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { isAdmin } = await requireSessionForPage();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 md:fixed md:inset-y-0 md:left-0 md:w-[218px] md:flex-col md:items-stretch md:gap-6 md:border-r md:border-b-0 md:bg-sidebar md:p-3">
        <Logo className="md:px-1 md:pt-2" />
        <AppNav isAdmin={isAdmin} />
        <div className="ml-auto flex items-center gap-1 md:mt-auto md:ml-0 md:flex-col md:items-stretch">
          <ThemeToggle className="md:w-full md:justify-start" />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="md:w-full md:justify-start">
              <LogOutIcon aria-hidden />
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 md:ml-[218px] md:max-w-none md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
