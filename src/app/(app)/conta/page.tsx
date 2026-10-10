import type { Metadata } from "next";
import Link from "next/link";
import { ContentCard } from "@/components/content-card";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { ExportButton } from "@/components/export-button";
import { ImportCard } from "@/components/import-card";
import { PageHeader } from "@/components/page-header";
import { requireSessionForPage } from "@/lib/auth-guard";
import { importRepo } from "@/lib/db/repos/import";
import { vaultRepo } from "@/lib/db/repos/vault";

export const metadata: Metadata = { title: "Privacidade e conta" };

/** What is sealed, the full policy, and the user's own export, import and deletion (SIGILO-35, 36, 38; IMPORT-01). Guarded by the (app) layout. */
export default async function AccountPage() {
  const { userId } = await requireSessionForPage();
  const [canImport, accountBirthDateCt] = await Promise.all([
    importRepo.isEmpty(userId),
    vaultRepo.getBirthDateSealed(userId),
  ]);

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
        title="Importar dados"
        description="Carregue o arquivo exportado de outra conta. A importação só funciona em uma conta sem transações nem categorias."
        bodyClassName="px-6 pb-6"
      >
        <ImportCard canImport={canImport} accountBirthDateCt={accountBirthDateCt} />
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
