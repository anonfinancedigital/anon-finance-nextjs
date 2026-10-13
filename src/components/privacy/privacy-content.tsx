import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadCloudIcon,
  DownloadIcon,
  EyeIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PILLARS: {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: string;
  glow: string;
}[] = [
  {
    icon: ShieldCheckIcon,
    title: "Criptografia de ponta a ponta",
    text: "Seus dados saem do seu navegador já blindados com criptografia de padrão bancário.",
    tone: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/30",
    glow: "bg-emerald-500/20",
  },
  {
    icon: KeyRoundIcon,
    title: "Arquitetura Zero-Knowledge",
    text: "Não temos a chave mestra. Sem a sua senha ou chave de emergência, ninguém consegue abrir seu cofre.",
    tone: "text-violet-400 bg-violet-500/10 ring-violet-500/30",
    glow: "bg-violet-500/20",
  },
  {
    icon: DownloadCloudIcon,
    title: "Você no controle total",
    text: "Exporte todos os seus lançamentos ou exclua sua conta em definitivo a qualquer instante.",
    tone: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/30",
    glow: "bg-cyan-500/20",
  },
];

const ENCRYPTED = [
  "Valores e descrições exatas de cada lançamento",
  "Nomes das suas categorias e subcategorias",
  "Meta de liberdade e percentuais das categorias",
  "Data de nascimento",
];

const PROCESSED = [
  "Seu e-mail e nome, para autenticar a conta",
  "Se você entra com Google: o Google sabe que seu e-mail usa o app; nenhum dado financeiro vai para o Google",
  "Datas e tipo de registro (receita ou despesa), para organizar os lançamentos",
  "Cores e agrupamento das categorias, para montar a interface",
];

const cardClass = "rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6";

/** Privacy and security content; the public page and the signed-in shell page each add their own frame. */
export function PrivacyContent() {
  return (
    <div className="w-full max-w-5xl space-y-6">
      <header className="space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Seu dinheiro é assunto exclusivamente seu.
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Arquitetura Zero-Knowledge: seus registros financeiros são cifrados no seu dispositivo antes de trafegar. Nem
          mesmo a equipe da ANON tem acesso aos seus números.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, text, tone, glow }) => (
          <li key={title} className={cn(cardClass, "relative space-y-3 overflow-hidden")}>
            <span aria-hidden className={cn("absolute -top-8 left-4 size-24 rounded-full blur-2xl", glow)} />
            <span className={cn("relative inline-flex size-10 items-center justify-center rounded-xl ring-1", tone)}>
              <Icon aria-hidden className="size-5" />
            </span>
            <h2 className="relative font-semibold">{title}</h2>
            <p className="relative text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <section className={cn(cardClass, "space-y-3")}>
            <h2 className="font-semibold">A lógica do cofre</h2>
            <p className="text-sm">
              Pense no seu dispositivo como um cofre digital. Sua senha gera a chave privada que tranca os dados
              localmente. Nosso servidor armazena apenas o conteúdo cifrado e ilegível.
            </p>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Especificação: cifragem autenticada AES-GCM de 256 bits, com derivação de chave via Argon2id. Criptografia
              no cliente antes do envio.
            </p>
          </section>

          <section
            className="rounded-2xl bg-linear-to-br from-violet-500/60 to-emerald-500/60 p-px shadow-xl"
            aria-labelledby="recovery-title"
          >
            <div className="space-y-2 rounded-[calc(1rem-1px)] bg-card p-5 sm:p-6">
              <h2 id="recovery-title" className="flex items-start gap-2 font-semibold">
                <AlertTriangleIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-amber-400" />
                Atenção: guarde sua Chave de Recuperação
              </h2>
              <p className="text-sm">
                Como nem nós temos a chave do seu cofre, é tecnicamente impossível recuperar seus dados se você perder a
                senha e a Chave de Recuperação. Ao criar a conta, guarde essa chave em local seguro. Quem entra com Google cria uma senha de cofre própria, que nunca sai do navegador.
              </p>
            </div>
          </section>
        </div>

        <section className={cn(cardClass, "space-y-6")}>
          <h2 className="font-semibold">O que você vê vs. o que nós vemos</h2>

          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <LockIcon aria-hidden className="size-4" />
              Só você tem a chave
              <span className="font-normal text-muted-foreground">· cifrado no dispositivo</span>
            </p>
            <ul className="space-y-2 text-sm">
              {ENCRYPTED.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <EyeIcon aria-hidden className="size-4 text-muted-foreground" />O que a ANON processa
              <span className="font-normal text-muted-foreground">· metadados técnicos necessários</span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PROCESSED.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className={cn(cardClass, "space-y-4")}>
        <h2 className="font-semibold">Seus direitos e autonomia</h2>
        <p className="text-sm text-muted-foreground">Portabilidade e exclusão definitiva</p>
        <ul className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <li className="space-y-2">
            <p className="flex items-center gap-2 font-medium">
              <DownloadIcon aria-hidden className="size-4 text-cyan-400" />
              Exportar dados
            </p>
            <p className="text-muted-foreground">
              Download imediato de todo o seu histórico em arquivo JSON, um formato aberto e padrão.
            </p>
            <Link href="/conta" className="inline-flex text-link hover:underline">
              Ir para Meus dados →
            </Link>
          </li>
          <li className="space-y-2">
            <p className="flex items-center gap-2 font-medium">
              <Trash2Icon aria-hidden className="size-4 text-rose-400" />
              Excluir conta
            </p>
            <p className="text-muted-foreground">
              Elimina permanentemente transações, categorias, meta, dados de acesso e as chaves do seu cofre.
            </p>
            <Link href="/conta" className="inline-flex text-link hover:underline">
              Ir para Excluir conta →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
