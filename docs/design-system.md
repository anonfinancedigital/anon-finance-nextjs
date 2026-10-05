# Design system

Catálogo vivo: rota `/design-system` (exige login). Base: shadcn/ui `radix-nova` + Tailwind v4 (config em `src/app/globals.css`).

## Camadas de token
1. **Primitivo**: valores em oklch/hex em `:root` e `.dark` (`--primary`, `--viz-1`…).
2. **Semântico**: mapeados em `@theme inline` como utilitários (`bg-primary`, `text-destructive`, `bg-success/20`).
3. **Componente**: variantes em `src/components/ui/*` via `cva`.

Estados: `destructive`, `success`, `warning`, `info`. Gráficos usam só `--viz-*`.

## Regras
- Use os componentes de `src/components/ui`; não repita classes de campo/botão em HTML cru.
- Sem cores hardcoded (`red-500`, hex) em `.tsx`; use tokens. Cores de gráfico via `colorVar` / `--viz-*`.
- Seleção única: `SelectField` (Radix, segue o layout). Não use `<select>` nativo. Em testes e2e escolha a opção com `chooseOption` (`e2e/helpers.ts`), não `selectOption`.
- Erros de campo: `text-sm text-destructive`; avisos de página: `Alert`.
- Novo componente: adicionar via `npx shadcn add`, registrar em `/design-system`.

## Tema e identidade
Dois temas: claro em `:root` e escuro em `.dark` (`src/app/globals.css`), alternados por `ThemeToggle` na barra lateral. Um script no `<head>` aplica `.dark` antes da pintura; escolha em `localStorage["theme"]`, padrão escuro (identidade do guia). Fundo com brilho radial sutil no `body` (`--glow-a/b`).

Nunca use `white/…` ou `black/…` fixos em componentes: use `border-border`, `border-input`, `bg-field`, `bg-hover`, `bg-hover-strong`, `bg-subtle`, que mudam com o tema. Texto/ícone roxo: `text-link` (AA nos dois temas), não `text-primary`.

- Fontes: Manrope (`font-sans`) para interface; Sora (`font-display`) para títulos e valores monetários. Geist Mono para `font-mono`.
- Cards: `rounded-2xl border border-white/[0.09] bg-card`; campos `rounded-xl border-white/10 bg-white/[0.04]`.
- Receita = `--income` (verde, também `--success`); gasto/estouro = `--destructive`; destaque = `--primary` (roxo).
- Cores de categoria 1..8 e de gráfico: `--viz-*` (nomes em `lib/domain/color.ts`).
- Estrutura: `ContentCard` (seção com título e nota), `PageHeader` (eyebrow + título), `AppNav` + sidebar em `(app)/layout.tsx` (barra inferior no mobile).

## Acessibilidade
- Todo campo com `Label`; botões só-ícone com `aria-label`.
- Contraste AA; foco visível (`focus-visible:ring`).
- `e2e/design-system.spec.ts` roda axe nos temas escuro e claro.
