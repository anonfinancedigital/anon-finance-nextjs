import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Privacidade" };

// The three sentences required word for word (SIGILO-32, SIGILO-33, SIGILO-34).
const SEALED =
  "Seus dados financeiros são cifrados no seu navegador com uma chave protegida pela sua senha; o servidor guarda só texto cifrado e não tem a chave.";
const NO_RECOVERY =
  "Se você perder a senha e a chave de recuperação, ninguém, nem o administrador, consegue recuperar seus dados.";
const LIMIT =
  "Limite: quem opera o servidor controla o código que o seu navegador executa e, em tese, poderia publicar uma versão que capture a sua senha.";

/** Public privacy policy (SIGILO-30 to 34): static, no session needed (`/privacidade` is public in the proxy). */
export default function PrivacyPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="space-y-2">
          <h1>
            <Logo />
          </h1>
          <p className="text-sm text-muted-foreground">Privacidade</p>
        </div>

        <section className="space-y-2 text-sm">
          <p>{SEALED}</p>
          <p>{NO_RECOVERY}</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="font-semibold">O que guardamos</h2>
          <p>Cifrado no seu navegador antes de chegar ao servidor:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>valores das transações;</li>
            <li>descrições das transações;</li>
            <li>nomes de categorias e subcategorias;</li>
            <li>percentuais das categorias;</li>
            <li>meta de Liberdade;</li>
            <li>data de nascimento.</li>
          </ul>
          <p>Não cifrado, porque o servidor precisa dele para funcionar:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>e-mail e nome;</li>
            <li>datas e tipo (receita ou despesa) das transações;</li>
            <li>estrutura das categorias, como cor e agrupamento.</li>
          </ul>
          <p>
            A senha nunca é guardada: o servidor recebe só um segredo derivado dela no seu navegador e guarda apenas o
            hash desse segredo.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="font-semibold">Seus direitos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Você pode exportar todos os seus dados a qualquer momento.</li>
            <li>
              Você pode excluir a sua conta. A exclusão apaga tudo: transações, categorias, meta, data de nascimento,
              dados de acesso e o cofre com as suas chaves. Nada pode ser recuperado depois.
            </li>
          </ul>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="font-semibold">Contas existentes</h2>
          <p>
            Contas criadas antes da cifragem passam uma única vez pela tela Proteger dados. Nessa única passagem o
            servidor ainda vê a sua senha e os seus dados em texto puro; depois disso eles ficam cifrados e o texto
            puro é removido.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="font-semibold">Limite</h2>
          <p>{LIMIT}</p>
        </section>

        <p className="text-center text-sm">
          <Link href="/login" className="text-link hover:underline">
            Voltar
          </Link>
        </p>
      </div>
    </main>
  );
}
