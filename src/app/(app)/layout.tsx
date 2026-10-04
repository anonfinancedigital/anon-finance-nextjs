import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { requireSessionForPage } from "@/lib/auth-guard";

/** Shell of the signed-in area: navigation and sign-out. Pages still guard their own data. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSessionForPage();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">Orçamento</span>
          <nav aria-label="Principal" className="flex gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Resumo</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/categorias">Categorias</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/liberdade">Liberdade</Link>
            </Button>
          </nav>
          <form action={signOutAction} className="ml-auto">
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
