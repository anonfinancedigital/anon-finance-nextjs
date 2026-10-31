import type { Metadata } from "next";
import Link from "next/link";
import { BiometricCard } from "@/components/biometric-card";
import { ContentCard } from "@/components/content-card";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { ExportButton } from "@/components/export-button";
import { InstallCard } from "@/components/install-card";
import { ImportCard } from "@/components/import-card";
import { PageHeader } from "@/components/page-header";
import { PushSettingsCard } from "@/components/push-settings-card";
import { requireSessionForPage } from "@/lib/auth-guard";
import { importRepo } from "@/lib/db/repos/import";
import { pushRepo } from "@/lib/db/repos/push";
import { vaultRepo } from "@/lib/db/repos/vault";
import { resolvePushConfig } from "@/lib/push/config";

export const metadata: Metadata = { title: "Privacidade e conta" };

/** What is sealed, the full policy, and the user's own export, import and deletion (SIGILO-35, 36, 38; IMPORT-01). Guarded by the (app) layout. */
export default async function AccountPage() {
  const { userId } = await requireSessionForPage();
  // Without the full VAPID configuration the notification section is not rendered (PUSH-01).
  const pushPublicKey = resolvePushConfig(process.env)?.publicKey;
  const [canImport, accountBirthDateCt, pushSettings] = await Promise.all([
    importRepo.isEmpty(userId),
    vaultRepo.getBirthDateSealed(userId),
    pushPublicKey ? pushRepo.settingsFor(userId) : null,
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
        <p className="text-muted-foreground">
          Também ficam sem cifra as inscrições de notificação (o endereço que o navegador gera) e as preferências de
          notificação. O push passa pelo serviço do fabricante do navegador, e o texto enviado é genérico, nunca com
          valores ou nomes.
        </p>
        <p>
          <Link href="/privacidade" className="text-link hover:underline">
            Leia a política de privacidade
          </Link>
        </p>
      </ContentCard>

      <InstallCard />

      <BiometricCard userId={userId} />

      {pushPublicKey && pushSettings && (
        <PushSettingsCard publicKey={pushPublicKey} devices={pushSettings.devices} prefs={pushSettings.prefs} />
      )}

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
