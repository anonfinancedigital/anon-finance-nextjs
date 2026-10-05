import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { requireSessionForPage } from "@/lib/auth-guard";

const colorTokens = [
  "background", "foreground", "card", "primary", "secondary", "muted", "accent",
  "destructive", "income", "success", "warning", "info", "border", "ring",
] as const;
const vizTokens = ["target", "spent", "over", "1", "2", "3", "4", "5", "6", "7", "8", "other"] as const;
const buttonVariants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const stateVariants = ["success", "warning", "info"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Living catalog of the design tokens and `components/ui` primitives. Rules live in docs/design-system.md. */
export default async function DesignSystemPage() {
  await requireSessionForPage();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Design system</h1>
        <p className="text-muted-foreground">Tokens e componentes base do Orçamento.</p>
      </header>

      <Section title="Cores">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {colorTokens.map((name) => (
            <li key={name} className="space-y-1 text-sm">
              <div className="h-10 rounded-lg border" style={{ background: `var(--${name})` }} />
              {name}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Gráficos (--viz-*)">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {vizTokens.map((name) => (
            <li key={name} className="space-y-1 text-sm">
              <div className="h-8 rounded-lg border" style={{ background: `var(--viz-${name})` }} />
              {name}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia e raios">
        <p className="font-display text-2xl font-bold">Título Sora 2xl bold</p>
        <p className="font-display text-3xl font-bold tabular-nums text-income">R$ 19.053,75</p>
        <p className="text-base">Texto base (Manrope)</p>
        <p className="text-sm text-muted-foreground">Texto auxiliar sm muted</p>
        <p className="font-mono text-sm">Geist Mono 1.234,56</p>
        <div className="flex gap-3">
          {["sm", "md", "lg", "xl", "2xl"].map((r) => (
            <div key={r} className="grid size-14 place-items-center border bg-muted text-xs" style={{ borderRadius: `var(--radius-${r})` }}>
              {r}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap gap-2">
          {buttonVariants.map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
          <Button disabled>disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button>default</Button>
          <Button size="lg">lg</Button>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ds-input">Input</Label>
            <Input id="ds-input" placeholder="Digite algo" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ds-invalid">Input inválido</Label>
            <Input id="ds-invalid" aria-invalid defaultValue="valor" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ds-select">SelectField</Label>
            <SelectField
              id="ds-select"
              options={[
                { value: "", label: "Todas" },
                { value: "lazer", label: "Lazer" },
              ]}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ds-textarea">Textarea</Label>
            <Textarea id="ds-textarea" />
          </div>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          {(["default", "secondary", "destructive", "outline", ...stateVariants] as const).map((v) => (
            <Badge key={v} variant={v}>{v}</Badge>
          ))}
        </div>
      </Section>

      <Section title="Alert">
        <div className="space-y-2">
          {(["default", "destructive", ...stateVariants] as const).map((v) => (
            <Alert key={v} variant={v}>
              <InfoIcon />
              <AlertTitle>{v}</AlertTitle>
              <AlertDescription>Mensagem de exemplo para a variante {v}.</AlertDescription>
            </Alert>
          ))}
        </div>
      </Section>

      <Section title="Card e Progress">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Conforto</CardTitle>
            <CardDescription>30% da renda</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={60} aria-label="Gasto do mês" />
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
