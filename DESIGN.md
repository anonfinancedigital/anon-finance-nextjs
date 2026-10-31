---
name: ANON
description: Finanças Privadas — um cofre escuro e luminoso para orçamento e patrimônio.
colors:
  primary: "oklch(0.53 0.21 293)"
  primary-on: "oklch(0.99 0 0)"
  link-dark: "oklch(0.76 0.14 293)"
  link-light: "oklch(0.48 0.2 293)"
  ring: "oklch(0.62 0.21 293)"
  vault-night: "oklch(0.15 0.015 270)"
  vault-card: "oklch(0.2 0.02 270)"
  vault-sidebar: "oklch(0.17 0.018 270)"
  vault-muted: "oklch(0.24 0.02 270)"
  vault-accent: "oklch(0.29 0.05 280)"
  ink: "oklch(0.96 0.005 270)"
  ink-soft: "oklch(0.7 0.02 270)"
  paper: "oklch(0.985 0.005 270)"
  paper-card: "oklch(1 0 0)"
  paper-ink: "oklch(0.2 0.02 270)"
  income-green: "oklch(0.82 0.19 155)"
  income-green-light: "oklch(0.5 0.14 155)"
  over-coral: "oklch(0.68 0.19 20)"
  warning-amber: "oklch(0.85 0.14 95)"
  info-blue: "oklch(0.76 0.12 240)"
  progress-teal: "oklch(0.76 0.11 215)"
  viz-violet: "oklch(0.7 0.19 293)"
  viz-orange: "oklch(0.75 0.15 45)"
  viz-pink: "oklch(0.74 0.16 350)"
  viz-lime: "oklch(0.84 0.16 135)"
  viz-sky: "oklch(0.72 0.13 250)"
typography:
  display:
    fontFamily: "Sora, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "0.05em"
  headline:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.15em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  xl: "11.2px"
  2xl: "14.4px"
  3xl: "17.6px"
  pill: "9999px"
spacing:
  card: "20px"
  card-sm: "12px"
  header-x: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-on}"
    rounded: "{rounded.xl}"
    height: "40px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.vault-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.xl}"
    height: "40px"
  input:
    backgroundColor: "{colors.vault-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    height: "40px"
    padding: "0 14px"
  card:
    backgroundColor: "{colors.vault-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  fab-add:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-on}"
    rounded: "{rounded.pill}"
    size: "60px"
---

# Design System: ANON

## Overview

**Creative North Star: "O Cofre Luminoso"**

A ANON é um cofre que se deixa ver por dentro: um fundo noturno profundo e silencioso, onde só o que importa emite luz. O roxo marca ação e marca; o verde marca dinheiro que entra, investimento e retorno; o coral marca gasto que estourou. Todo o resto é tom sobre tom. A sensação é de proteção calma, não de painel gritante.

O sistema é denso o suficiente para um instrumento financeiro (tabelas, metas, gráficos) e macio o bastante para ser aberto todo dia no celular. Tema escuro é o padrão e a identidade; o claro é uma tradução fiel, não um segundo mundo. Dois glows radiais fixos no fundo (roxo no canto superior direito, verde no inferior esquerdo) dão profundidade sem ornamento.

Componentes são macios, confiantes e silenciosos: cantos generosos, campos tonais, feedback tátil mínimo, nenhum enfeite que não carregue informação.

**Key Characteristics:**
- Escuro por padrão, com tema claro equivalente; azul-violeta frio (matiz 270) em todos os neutros.
- Roxo como único acento de ação; verde, coral, âmbar e azul só com significado fixo.
- Números e títulos em Sora; interface e texto corrido em Manrope.
- Profundidade por camadas tonais e dois glows de fundo; brilho de sombra só no botão primário.
- Mobile é cidadão de primeira: barra inferior, botão flutuante, safe areas, alvos de toque ampliados.

## Colors

Neutros azul-violeta quase pretos no escuro, quase brancos no claro, com roxo saturado como único acento de ação e uma paleta semântica pequena e de significado único. Valores abaixo seguem o tema escuro; o claro usa os mesmos matizes com luminosidade invertida (fundo `paper`, cartão branco, texto `paper-ink`).

### Primary
- **Roxo Cofre** (`oklch(0.53 0.21 293)`): preenchimento de botões primários, item ativo da navegação, marca. Sempre com texto branco.
- **Roxo Legível** (`oklch(0.76 0.14 293)` escuro / `oklch(0.48 0.2 293)` claro): texto e ícones roxos sobre a superfície, ajustados para contraste AA. Nunca usar o Roxo Cofre como cor de texto.
- **Roxo de Foco** (`oklch(0.62 0.21 293)`): anel de foco e brilho do acento.

### Secondary
- **Verde Receita** (`oklch(0.82 0.19 155)` escuro / `oklch(0.5 0.14 155)` claro): receita, sucesso, retorno/rendimento. Em uma única acepção por tela.
- **Azul-petróleo Progresso** (`oklch(0.76 0.11 215)`): progresso rumo à meta de Liberdade.

### Tertiary
- **Coral Estouro** (`oklch(0.68 0.19 20)`): destrutivo e gasto que passou do teto.
- **Âmbar Atenção** (`oklch(0.85 0.14 95)`) e **Azul Informação** (`oklch(0.76 0.12 240)`): avisos e dicas.

### Neutral
- **Noite do Cofre** (`oklch(0.15 0.015 270)`): fundo da página (tema escuro; `#090b12` na barra do navegador).
- **Cartão do Cofre** (`oklch(0.2 0.02 270)`): cards, popovers.
- **Lateral do Cofre** (`oklch(0.17 0.018 270)`): barra lateral.
- **Muted / Accent** (`oklch(0.24 0.02 270)` / `oklch(0.29 0.05 280)`): áreas apagadas e seleção/hover forte.
- **Tinta** (`oklch(0.96 0.005 270)`) e **Tinta Suave** (`oklch(0.7 0.02 270)`): texto principal e secundário.
- **Bordas e campos**: branco a 9% (borda), 12% (borda de campo), 4% (fundo de campo), 6–9% (hover). No claro, preto nas mesmas opacidades.

### Dataviz
Oito cores de categoria com mesma luminosidade percebida (violeta, azul, laranja, verde, amarelo, rosa, lima, coral) mais cinza para "outros". Valem como identidade da categoria, não como estado.

### Named Rules
**The Single Meaning Rule.** Cada cor semântica tem um significado só: verde é dinheiro que entra ou rende, coral é estouro, roxo é ação/aporte, azul-petróleo é progresso da meta.
**The Overshoot Is Not a Sin Rule.** Investir acima da meta nunca é coral. Só despesa real que passa do teto é alerta.
**The Legible Purple Rule.** Roxo preenche; roxo-claro escreve. Texto roxo usa o token de link, nunca o primário.

## Typography

**Display Font:** Sora (sans-serif)
**Body Font:** Manrope (sans-serif)
**Label/Mono Font:** Geist Mono para valores tabulares técnicos, quando necessário

**Character:** Sora, geométrica e firme, carrega marca, títulos de seção e os valores em R$; Manrope, humanista e neutra, mantém tabelas e formulários legíveis. O contraste entre elas separa "número que importa" de "texto que explica".

### Hierarchy
- **Display** (800, tracking 0.05em): só o nome ANON no logotipo.
- **Headline** (Sora 600, 1rem no celular / 1.125rem no desktop): títulos de cartão e seção.
- **Title** (Sora 600–700): valores monetários de destaque e KPIs.
- **Body** (Manrope 400–500, 0.875rem; 1rem em campos no celular para evitar zoom do iOS): tabelas, descrições, formulários. Linhas de texto até ~65ch.
- **Label** (Manrope 600, 10px, caixa alta, tracking 0.15em): descritor "Finanças Privadas" e legendas minúsculas.

### Named Rules
**The Numbers Speak Sora Rule.** Valores de dinheiro e títulos usam a fonte de display; texto explicativo nunca.
**The No-Zoom Field Rule.** Campos têm 16px no celular e 14px a partir de `md`.

## Layout

Aplicativo com barra de navegação fixa na parte de baixo no celular (altura 4rem + safe area) e lateral no desktop (`md`). Conteúdo em colunas de cartões empilhados, grade em duas ou mais colunas a partir de `md`. O botão flutuante "+" aparece só no celular (canto inferior direito, acima da barra); no desktop vira botão "Nova transação" no cabeçalho. O layout respeita `env(safe-area-inset-*)`, `viewport-fit=cover` e `100dvh`. Ritmo: respiro de 20px dentro de cartões, 24px nos cabeçalhos de seção, `gap` de 4–6 entre cartões. Alvos de toque crescem com `pointer-coarse` sem aumentar o visual. A landing (`/bem-vindo`) é sempre escura, independente do tema do app.

## Elevation & Depth

Híbrido discreto: profundidade vem de camadas tonais (fundo → cartão → popover, cada um um degrau mais claro) e dois glows radiais fixos no fundo; sombra de cartão (`shadow-lg`) é só para separar, nunca decorativa. O único elemento que emite luz é o botão primário.

### Shadow Vocabulary
- **Card** (`shadow-lg`): cartões e seções de conteúdo.
- **Accent Glow** (`box-shadow: 0 0 16px oklch(0.53 0.21 293 / 0.35)`): somente botão primário.
- **Background Glow** (`radial-gradient(60rem 30rem at 85% -10%, oklch(0.62 0.21 293 / 0.08), transparent 60%)` e `radial-gradient(50rem 26rem at -10% 110%, oklch(0.82 0.19 155 / 0.04), transparent 60%)`): atmosfera da página, `background-attachment: fixed`.

### Named Rules
**The One Light Rule.** Só a ação primária brilha. Se tudo emite luz, nada é cofre.

## Shapes

Cantos suaves em duas escalas: controles a `xl` (~11px: botões, campos), superfícies a `2xl` (~14px: cartões, seções); o botão flutuante e os botões da landing são pílulas completas. Raio-base 0.5rem, derivando sm/md/lg/xl/2xl por multiplicadores. Bordas de 1px translúcidas (9–12% branco) em vez de linhas sólidas. Ícones Lucide, traço fino, 16–20px.

## Components

### Buttons
- **Shape:** canto `xl` (~11px), altura 40px (lg 48px, sm 32px, xs 24px).
- **Primary:** fundo Roxo Cofre, texto branco, brilho roxo; hover clareia, pressionado desce 1px.
- **Outline / Secondary / Ghost:** outline com fundo de cartão e borda de campo; ghost só texto suave que ganha fundo de hover; destrutivo em coral a 15–20%.
- **Focus:** borda roxa + anel de 3px a 50%.
- **Landing:** pílula; hero com gradiente roxo→verde translúcido.

### Cards / Containers
- **Corner Style:** `2xl`; borda 1px, fundo Cartão do Cofre, `shadow-lg`.
- **Padding:** 20px (12px no tamanho `sm`); cabeçalho com título em Sora e nota/ação à direita (ContentCard).

### Inputs / Fields
- **Style:** altura 40px, canto `xl`, fundo tonal de 4% e borda de 12%; placeholder em Tinta Suave.
- **Focus:** borda roxa, fundo de hover, anel roxo a 30%.
- **Error / Disabled:** borda e anel coral; desabilitado a 50% de opacidade.

### Navigation
Barra inferior fixa no celular, com fundo de cartão a 95% e `backdrop-blur`, ícones de 20px; lateral no desktop com ícones de 16px. Item ativo em roxo; sem rótulos grandes.

### Floating Add Button (signature)
Círculo de 60px, Roxo Cofre, ícone "+" de 32px, canto inferior direito acima da barra e das safe areas; só no celular. Abre o modal de lançamento.

### Logo
Marca ANON com avatar vetorial (variantes clara/escura), nome em Sora 800 com tracking 0.05em e descritor "FINANÇAS PRIVADAS" em 10px caixa alta.

## Do's and Don'ts

### Do:
- **Do** usar roxo como único acento de ação e reservá-lo para o primário, item ativo e marca.
- **Do** usar Sora para valores e títulos, Manrope para o resto.
- **Do** manter neutros no matiz 270 e pares claro/escuro com o mesmo matiz.
- **Do** garantir AA em texto: usar o token de link para texto roxo.
- **Do** respeitar safe areas, `100dvh` e alvos de toque ≥ 44px (via `pointer-coarse`).
- **Do** respeitar `prefers-reduced-motion`; animações curtas (≈300ms, ease-out).

### Don't:
- **Don't** pintar investimento acima da meta de coral; é vitória.
- **Don't** usar uma cor semântica para dois significados.
- **Don't** adicionar sombra colorida/brilho a nada além do botão primário.
- **Don't** usar texto em Roxo Cofre sobre fundo escuro nem cartões com borda lateral colorida.
- **Don't** enviar fontes ou recursos de terceiros em runtime; fontes entram por `next/font`.
- **Don't** deixar o campo com menos de 16px no celular (zoom do iOS).
