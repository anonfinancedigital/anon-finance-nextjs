import {
  ArrowRightIcon,
  BanIcon,
  CheckIcon,
  DownloadCloudIcon,
  FileSpreadsheetIcon,
  GaugeIcon,
  LandmarkIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GrowthChart } from "@/components/landing/growth-chart";
import { Navbar } from "@/components/landing/navbar";
import { SiteFooter } from "@/components/landing/site-footer";
import { ghostButton, glassCard, heroButton } from "@/components/landing/styles";
import { redirectIfSignedIn } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Da renda mensal ao ápice patrimonial",
  description:
    "Gestão financeira de precisão e projeção da sua independência, com cifragem no seu navegador: seus números chegam ao servidor ilegíveis.",
};

const SPENDING = [
  { label: "Moradia", pct: 32, bar: "bg-purple-500" },
  { label: "Alimentação", pct: 18, bar: "bg-emerald-500" },
  { label: "Transporte", pct: 11, bar: "bg-cyan-500" },
  { label: "Lazer", pct: 8, bar: "bg-amber-500" },
];

const COMPARISON = [
  {
    name: "Planilhas tradicionais",
    icon: FileSpreadsheetIcon,
    highlight: false,
    points: [
      "Fórmulas quebram sem aviso",
      "Ruins de usar no celular",
      "Exigem atualização manual eterna",
      "Não projetam o futuro",
    ],
  },
  {
    name: "Fintechs e apps de banco",
    icon: LandmarkIcon,
    highlight: false,
    points: [
      "Muitos vivem de monetizar seus dados",
      "Empurram empréstimos e cartões",
      "Olham só para o retrovisor: quanto você já gastou",
    ],
  },
  {
    name: "Vértice",
    icon: TrendingUpIcon,
    highlight: true,
    points: [
      "Foco exclusivo na construção do seu ápice patrimonial",
      "Dados cifrados no seu navegador, antes do envio",
      "Simulação da sua independência financeira",
    ],
  },
];

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">{eyebrow}</p>
      <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="text-zinc-400">{text}</p>}
    </div>
  );
}

/** Product preview: a cockpit panel and the Ápice curve in a browser frame. Illustrative, fictional figures. */
function HeroMockup() {
  return (
    <div
      id="cockpit"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-950/60 p-2 shadow-2xl shadow-purple-950/20 backdrop-blur-sm"
    >
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="mx-auto rounded-md bg-white/5 px-4 py-0.5 text-[11px] text-zinc-500">vértice · cockpit</span>
      </div>
      <div className="grid gap-3 rounded-xl border border-white/[0.06] bg-zinc-950 p-3 sm:p-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Receitas",
                value: "R$ 12.400",
                tone: "text-emerald-400",
              },
              { label: "Despesas", value: "R$ 7.850", tone: "text-zinc-100" },
              { label: "Saldo", value: "R$ 4.550", tone: "text-purple-300" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[11px] text-zinc-500">{item.label}</p>
                <p className={`mt-1 text-sm font-semibold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-xs font-medium text-zinc-300">Distribuição do mês</p>
            {SPENDING.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>{item.label}</span>
                  <span>{item.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${item.pct * 2.5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-zinc-300">Ápice · patrimônio projetado</p>
              <p className="mt-1 font-display text-2xl font-bold">
                R$ 1,0 mi <span className="text-sm font-normal text-zinc-500">em ~14 anos</span>
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-300">
              rendimento cobre o custo de vida
            </span>
          </div>
          <GrowthChart className="mt-3 h-auto w-full" />
          <div className="mt-2 flex gap-4 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-linear-to-r from-purple-500 to-emerald-500" /> Patrimônio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t border-dashed border-zinc-400" /> Total depositado
            </span>
          </div>
        </div>
      </div>
      <p className="px-3 py-2 text-center text-[11px] text-zinc-600">Ilustração com valores fictícios.</p>
    </div>
  );
}

/** Public landing page, served at `/` to visitors without a session (see `proxy.ts`). */
export default async function LandingPage() {
  await redirectIfSignedIn();

  return (
    <div data-landing className="relative flex-1 overflow-x-clip bg-zinc-950 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(139,92,246,0.22),transparent),radial-gradient(40%_40%_at_85%_20%,rgba(16,185,129,0.10),transparent)]"
      />
      <Navbar />

      <main className="relative">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 text-center sm:pt-24">
          <Link
            href="/privacidade"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur transition hover:border-white/20 sm:text-sm"
          >
            <ShieldCheckIcon aria-hidden className="size-4 shrink-0 text-emerald-400" />
            <span className="truncate sm:whitespace-normal">
              Arquitetura Zero-Knowledge: seus números chegam ao servidor já cifrados
            </span>
            <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
          </Link>

          <h1 className="mx-auto mt-8 max-w-4xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Da renda mensal ao{" "}
            <span className="bg-linear-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
              ápice patrimonial.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-balance text-zinc-400 sm:text-lg">
            Gestão financeira de precisão e projeção matemática da sua independência. Uma plataforma feita para quem
            quer prever o futuro do patrimônio sem abrir mão do sigilo absoluto.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className={`${heroButton} w-full sm:w-auto`}>
              Criar meu cofre gratuito
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
            <Link href="/privacidade" className={`${ghostButton} w-full sm:w-auto`}>
              <ShieldCheckIcon aria-hidden className="size-4 text-emerald-400" />
              Conhecer a privacidade
            </Link>
          </div>

          <div className="mt-16 text-left">
            <HeroMockup />
          </div>
        </section>

        <section id="pilares" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <SectionTitle
            eyebrow="Pilares"
            title="Precisão para projetar. Sigilo para confiar."
            text="Tudo o que você precisa para enxergar o caminho até a independência, e nada que exponha o seu dinheiro."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article id="apice" className={`${glassCard} scroll-mt-24 space-y-4 md:col-span-2`}>
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/30">
                <TrendingUpIcon aria-hidden className="size-5 text-purple-300" />
              </span>
              <h3 className="text-xl font-semibold">O Ápice: engenharia de juros compostos</h3>
              <p className="max-w-xl text-sm text-zinc-400">
                Descubra com exatidão matemática o momento em que seus rendimentos cobrirão seu custo de vida. Simule
                taxas reais, retiradas seguras e marcos de patrimônio em tempo real.
              </p>
              <GrowthChart className="h-auto w-full max-w-xl" />
            </article>

            <article className={`${glassCard} space-y-4`}>
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <GaugeIcon aria-hidden className="size-5 text-cyan-300" />
              </span>
              <h3 className="text-xl font-semibold">Cockpit em tempo real</h3>
              <p className="text-sm text-zinc-400">
                Controle o ritmo de gastos do mês e a distribuição percentual sem a neurose de planilhas lentas ou
                categorizações manuais infinitas.
              </p>
              <div className="space-y-2 pt-2">
                {SPENDING.slice(0, 3).map((item) => (
                  <div key={item.label} className="h-1.5 rounded-full bg-white/[0.06]">
                    <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${item.pct * 2.5}%` }} />
                  </div>
                ))}
              </div>
            </article>

            <article className={`${glassCard} space-y-4`}>
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <LockKeyholeIcon aria-hidden className="size-5 text-emerald-300" />
              </span>
              <h3 className="text-xl font-semibold">Privacidade Zero-Knowledge (AES-256)</h3>
              <p className="text-sm text-zinc-400">
                Seus dados financeiros são cifrados localmente antes de trafegar. Nem a equipe do Vértice tem acesso aos
                seus saldos, investimentos ou compras.
              </p>
            </article>

            <article className={`${glassCard} space-y-4 md:col-span-2`}>
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
                <DownloadCloudIcon aria-hidden className="size-5 text-amber-300" />
              </span>
              <h3 className="text-xl font-semibold">Soberania e exportação</h3>
              <p className="max-w-xl text-sm text-zinc-400">
                Seus dados são uma propriedade sua. Exporte o histórico integral em JSON ou apague tudo definitivamente
                a qualquer instante.
              </p>
              <pre
                aria-hidden
                className="overflow-x-auto rounded-lg border border-white/[0.06] bg-black/40 p-4 font-mono text-xs text-zinc-400"
              >
                {`{ "transacoes": [ … ], "categorias": [ … ], "meta": { … } }`}
              </pre>
            </article>
          </div>
        </section>

        <section id="manifesto" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
          <SectionTitle eyebrow="Manifesto" title="Por que o Vértice?" text="Direto ao ponto, sem enrolação." />
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {COMPARISON.map(({ name, icon: Icon, highlight, points }) => (
              <article
                key={name}
                className={`rounded-2xl border p-6 ${
                  highlight
                    ? "border-purple-500/40 bg-linear-to-b from-purple-500/10 to-emerald-500/[0.06] shadow-xl shadow-purple-950/20"
                    : "border-white/10 bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon aria-hidden className={`size-5 ${highlight ? "text-emerald-400" : "text-zinc-500"}`} />
                  <h3 className="font-semibold">{name}</h3>
                </div>
                <ul className="mt-5 space-y-3 text-sm">
                  {points.map((point) => (
                    <li
                      key={point}
                      className={`flex items-start gap-2.5 ${highlight ? "text-zinc-200" : "text-zinc-400"}`}
                    >
                      {highlight ? (
                        <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      ) : (
                        <XIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-zinc-600" />
                      )}
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="rounded-3xl border border-white/10 bg-linear-to-br from-purple-500/[0.10] via-zinc-900/40 to-emerald-500/[0.08] p-8 backdrop-blur-sm sm:p-12">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400 uppercase">Segurança e confiança</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Feito para ser confiável por princípio.
              </h2>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: BanIcon,
                  title: "Sem anúncios ou patrocinadores",
                  text: "Seu orçamento não é produto de ninguém.",
                },
                {
                  icon: LockKeyholeIcon,
                  title: "Cifragem no navegador",
                  text: "Seus números são trancados no seu dispositivo, antes de qualquer envio.",
                },
                {
                  icon: DownloadCloudIcon,
                  title: "Exportação completa",
                  text: "Leve todo o seu histórico embora, em JSON, quando quiser.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="space-y-2">
                  <Icon aria-hidden className="size-5 text-emerald-400" />
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-zinc-400">{text}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/privacidade"
              className="mt-8 inline-flex items-center gap-2 text-sm text-purple-300 hover:text-white"
            >
              Ver como a privacidade funciona
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <SparklesIcon aria-hidden className="mx-auto size-6 text-purple-300" />
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Construa o caminho para a sua independência com clareza matemática e sigilo absoluto.
          </h2>
          <Link href="/cadastro" className={`${heroButton} mt-8`}>
            Começar agora gratuitamente
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
