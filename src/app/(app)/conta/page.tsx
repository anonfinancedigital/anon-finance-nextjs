import type { Metadata } from "next";
import Link from "next/link";
import { ContentCard } from "@/components/content-card";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Privacidade e conta" };

/** What is sealed, the full policy, and the user's own export and deletion (SIGILO-35, 36, 38). Guarded by the (app) layout. */
export default function AccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Privacidade e conta" />

      <ContentCard title="Seus dados" bodyClassName="space-y-3 px-6 pb-6 text-sm">
        <p>
          Valores, descrições, nomes de categorias e subcategorias, percentuais, meta e data de nascimento são
          cifrados no seu navegador com uma chave protegida pela sua senha. O servidor guarda só texto cifrado.
        </p>
        <p className="text-muted-foreground">
          Ficam sem cifra: e-mail, nome, datas e tipo das transações.
        </p>
        <p>
          <Link href="/privacidade" className="text-link hover:underline">
            Leia a política de privacidade
          </Link>
        </p>
      </ContentCard>

      <ContentCard
        title="Exportar meus dados"
        description="Baixe um arquivo JSON com todas as suas transações, categorias, meta e data de nascimento."
        bodyClassName="px-6 pb-6"
      >
        <ExportButton />
      </ContentCard>

      <ContentCard
        title="Excluir minha conta"
        description="Apaga a conta, todos os seus dados e as sessões abertas. Não há como desfazer."
        bodyClassName="px-6 pb-6"
      >
        <DeleteAccountDialog />
      </ContentCard>
    </div>
  );
}
