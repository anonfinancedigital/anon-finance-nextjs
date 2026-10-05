# Design System & UI Guidelines: Dark Finance / Budget Dashboard

Guia completo e padronizado do design system extraído do projeto **App Design Helper** no Lovable. Estruturado para ser consumido diretamente pelo **Claude Code**, **Cursor** ou engenheiros React para construir interfaces consistentes, acessíveis e altamente polidas.

---

## 1. Visão Geral e Identidade Visual

- **Estilo**: Dark mode nativo com atmosfera sofisticada, iluminação sutil (radial glow), cards translúcidos e bordas discretas.
- **Domínio**: Gestão financeira, orçamentos, métricas, fluxos de caixa e extratos.
- **Stack Recomendada**:
  - React 18 / 19 + TypeScript
  - Tailwind CSS (v3 ou v4)
  - Primitivas: Radix UI / Shadcn UI
  - Ícones: `lucide-react`
  - Utilitário de classes: `cn()` (`clsx` + `tailwind-merge`)

---

## 2. Tipografia e Fontes

- **Interface & Textos Corridos (`font-sans`)**: `"Manrope", sans-serif`
- **Valores Monetários & Títulos (`font-display`)**: `"Sora", sans-serif`

```html
<!-- Importação no index.html ou layout -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
```

---

## 3. Tokens de Cor (OKLCH) e Configuração CSS

Adicione as variáveis no seu CSS global (`src/index.css` ou `src/globals.css`):

```css
:root {
  --radius: 0.5rem;
  --background: oklch(0.15 0.015 270);
  --foreground: oklch(0.96 0.005 270);
  --card: oklch(0.20 0.02 270);
  --card-foreground: oklch(0.96 0.005 270);
  --popover: oklch(0.20 0.02 270);
  --popover-foreground: oklch(0.96 0.005 270);
  --primary: oklch(0.62 0.21 293);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.25 0.025 270);
  --secondary-foreground: oklch(0.96 0.005 270);
  --muted: oklch(0.24 0.02 270);
  --muted-foreground: oklch(0.70 0.02 270);
  --accent: oklch(0.29 0.05 280);
  --accent-foreground: oklch(0.96 0.005 270);
  --destructive: oklch(0.68 0.19 20);
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(1 0 0 / 9%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.62 0.21 293);
  --income: oklch(0.82 0.19 155);

  /* Categorias semânticas */
  --soft-blue: oklch(0.70 0.19 293);
  --soft-green: oklch(0.82 0.19 155);
  --soft-coral: oklch(0.75 0.15 45);
  --soft-yellow: oklch(0.85 0.14 95);
  --soft-pink: oklch(0.74 0.16 350);
  --soft-lime: oklch(0.84 0.16 135);
}

body {
  background-color: var(--background);
  background-image:
    radial-gradient(60rem 30rem at 85% -10%, oklch(0.62 0.21 293 / 0.08), transparent 60%),
    radial-gradient(50rem 26rem at -10% 110%, oklch(0.82 0.19 155 / 0.04), transparent 60%);
  background-attachment: fixed;
  color: var(--foreground);
  font-family: var(--font-sans);
}
```

---

## 4. Helper de Classes (`src/lib/utils.ts`)

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
```

---

## 5. Componentes Práticos

### 5.1 Botões (`src/components/ui/button.tsx`)

Suporta variantes semânticas, tamanhos, botões com ícone e estado de carregamento com spinner:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-[0_0_16px_oklch(0.62_0.21_293/0.3)]",
        secondary:
          "border border-white/10 bg-card text-foreground hover:bg-white/[0.06] active:bg-white/[0.09]",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/25",
        income:
          "bg-income/15 text-income border border-income/20 hover:bg-income/25",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-4 text-sm rounded-xl",
        lg: "h-12 px-6 text-base rounded-2xl",
        icon: "h-10 w-10 p-0 rounded-xl",
        "icon-sm": "h-8 w-8 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

**Exemplo de uso:**
```tsx
<Button variant="primary">Novo Registro</Button>
<Button variant="secondary" size="sm">Exportar CSV</Button>
<Button variant="destructive" size="sm">Excluir</Button>
<Button variant="primary" isLoading>Salvando...</Button>
<Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
```

---

### 5.2 Cards e Contêineres

#### A. Card de Métrica / KPI Financeiro
Exibe valor monetário, subtítulo, variação percentual com indicador de tendência e glow sutil.

```tsx
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  amount: number;
  change?: number; // Ex: +12.5 ou -4.2
  period?: string;
  icon: LucideIcon;
  variant?: "income" | "expense" | "neutral";
}

export function MetricCard({
  title,
  amount,
  change,
  period = "em relação ao mês anterior",
  icon: Icon,
  variant = "neutral",
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-card p-5 transition-all duration-300 hover:border-white/[0.16] hover:shadow-xl">
      {/* Glow de fundo sutil no hover */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-40" />

      <div className="flex items-center justify-between pb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            variant === "income" && "bg-income/15 text-income",
            variant === "expense" && "bg-destructive/15 text-destructive",
            variant === "neutral" && "bg-white/[0.06] text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {formatBRL(amount)}
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
                isPositive ? "bg-income/15 text-income" : "bg-destructive/15 text-destructive"
              )}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? `+${change}%` : `${change}%`}
            </span>
            <span>{period}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### B. Card Container Padrão com Cabeçalho e Ação
```tsx
interface ContentCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ContentCard({ title, description, action, children, className }: ContentCardProps) {
  return (
    <div className={cn("rounded-2xl border border-white/[0.09] bg-card p-5 shadow-lg md:p-6", className)}>
      <div className="flex flex-col gap-2 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06]">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground md:text-lg">
            {title}
          </h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="pt-5">{children}</div>
    </div>
  );
}
```

---

### 5.3 Campos de Formulário

#### A. Input de Texto com Ícone e Estado de Erro
```tsx
import * as React from "react";
import { AlertCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon: Icon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
              Icon && "pl-9",
              error && "border-destructive focus:border-destructive focus:ring-destructive/30",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
```

#### B. Campo de Busca (Search Input)
```tsx
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Buscar lançamentos..." }: SearchInputProps) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
```

#### C. Campo Monetário Especializado (Currency Input)
```tsx
interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function CurrencyInput({ label, value, onChange }: CurrencyInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground">{label}</label>
      <div className="relative rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <span className="text-xs font-semibold text-muted-foreground mr-1.5">R$</span>
        <input
          type="number"
          step="0.01"
          value={value === 0 ? "" : value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0,00"
          className="font-display w-40 bg-transparent text-lg font-bold text-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
```

---

## 6. Layouts e Padrões Responsivos

### 6.1 Grid de Métricas Responsivo
Muda fluidamente de 1 coluna no mobile para 2 no tablet e 3 ou 4 no desktop:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <MetricCard title="Saldo Total" amount={24850.32} change={8.4} icon={Wallet} variant="income" />
  <MetricCard title="Receitas" amount={18950.0} change={3.1} icon={ArrowDownLeft} variant="income" />
  <MetricCard title="Despesas" amount={14230.7} change={-2.4} icon={ArrowUpRight} variant="expense" />
  <MetricCard title="Investido" amount={4719.62} change={15.0} icon={Target} variant="neutral" />
</div>
```

### 6.2 Estrutura de Página Completa (Mobile First)
Navegação inferior no mobile e barra lateral/header no desktop:

```tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Top Header Desktop / Mobile */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display font-bold text-primary-foreground">
              F
            </div>
            <h1 className="font-display text-lg font-bold text-foreground">Finanças</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" aria-label="Notificações">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20" />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com padding responsivo */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {children}
      </main>

      {/* Bottom Bar para Mobile (< 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-card/95 backdrop-blur-lg md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          <button className="flex flex-col items-center gap-1 text-primary">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Início</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
            <Receipt className="h-5 w-5" />
            <span className="text-[10px] font-medium">Extrato</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
            <Target className="h-5 w-5" />
            <span className="text-[10px] font-medium">Metas</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
```

---

## 7. Dicas de Prompt para o Claude Code

Ao pedir novas telas para o **Claude Code**, use instruções diretas com base neste guia:

```text
"Siga rigorosamente o design system especificado no DESIGN_SYSTEM.md:
- Use dark theme com --background oklch(0.15 0.015 270) e --card oklch(0.20 0.02 270).
- Tipografia: Manrope para interface geral e Sora para números/valores monetários (font-display).
- Use os componentes Button e Input já com as variantes de estilo e tratamento de erros.
- Os cards devem ter borda 'border-white/[0.09]', cantos 'rounded-2xl' e suporte a layout responsivo (1 coluna no mobile, grid no desktop).
- Use os tokens semânticos --income para receitas e --destructive para despesas com seus respectivos efeitos de glow."
```
