# Rebrand ANON Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (seção "Decisões de design" abaixo; sem `design.md`)
**Spec**: `.specs/features/rebrand-anon/spec.md`
**Status**: In Progress

**Ordem:** primeiro a fonte única dos textos da marca e os ativos (fase 1), depois cópia de domínio e telas do app (fase 2), por fim landing, arquivos e o teste-guarda que impede a volta dos nomes antigos (fase 3). Cada commit compila e passa o gate. Nenhuma task toca banco, rotas, criptografia ou cálculos.

**Next.js:** T3 mexe em `metadata.icons`; `AGENTS.md` manda ler `node_modules/next/dist/docs/` (metadata/icons) antes de escrever, porque esta versão do Next tem mudanças incompatíveis. As demais tasks são cópia e componentes já existentes.

**Concorrência e ambiente:** há arquivos não rastreados (`docs/marca/`, `.specs/features/apice-folga-meta/validation.md`); cada commit inclui só os arquivos da task e o status do `tasks.md`. `docs/marca/` entra no commit de T2. Node 20 no `PATH` (memória do projeto). Testes unitários, sem banco.

**Verificação manual (AD-005, sem teste de componente):** o Verifier fecha com conferência no app (skill `run`): `/login`, `/bem-vindo`, `/liberdade`, `/privacidade` em tema claro e escuro, favicon na aba nos dois temas do sistema, download da chave de recuperação. Evidência de UI vem de `file:line`.

**Supersede testes existentes:** T5 troca as expectativas de `onboarding.test.ts` ("Definir seu Ápice") e `freedom-copy.test.ts` ("Você já atingiu seu Ápice.") pelos textos da spec. É consequência da spec nova, não enfraquecimento.

---

## Decisões de design (inline)

- **Fonte única dos textos:** `src/lib/brand.ts` exporta `BRAND_NAME` "ANON", `BRAND_DESCRIPTOR` "Finanças Privadas", `BRAND_TAGLINE` (slogan da opção 3), `BRAND_TITLE_TEMPLATE` "ANON • %s", `BRAND_DESCRIPTION` "ANON – Finanças Privadas" e `RECOVERY_KEY_FILE_NAME` "chave-de-recuperacao-anon.txt". Layout, Logo, telas de acesso, landing e diálogo da chave leem dali.
- **Logo por tema:** `Logo.tsx` renderiza o monograma "A" com a fenda (geometria de `docs/marca/anon_logo_*.svg`) em duas variantes SVG, alternadas por classes `dark:hidden` / `hidden dark:block`, como o app já alterna temas. Os ids dos gradientes levam o `useId` por instância e o sufixo da variante. O texto "ANON" (Sora, `font-display`) e o descritor são HTML com tokens `foreground` e `muted-foreground`.
- **Favicon:** `public/favicon.svg` (escuro, `anon_favicon_dark.svg`) e `public/favicon-light.svg` (claro). `src/app/icon.svg` é removido e `metadata.icons` declara os dois com `media`, o escuro como padrão. Se a leitura da doc do Next mostrar que a convenção de arquivo é obrigatória, T3 mantém `icon.svg` escuro e declara só o claro em `icons`.
- **Vocabulário da meta:** menu e título "Liberdade"; "Definir meta"; "Definir sua meta"; "Você já atingiu sua meta."; "Meta de liberdade e percentuais das categorias"; "patrimônio-alvo" no lugar de "ápice patrimonial". Nomes de arquivo de domínio e IDs `APICE-xx` ficam.
- **Teste-guarda:** `src/lib/brand-guard.test.ts` varre `src/` e `public/` por `vértice|vertice|ápice|apice` (sem diferenciar maiúsculas) e falha com a lista de ocorrências, ignorando linhas de comentário, nomes de teste e IDs `APICE-xx` por regra explícita no próprio teste.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` em `src/**/*.test.ts` e `integration` em `*.int.test.ts`), AD-005 (e2e suspenso), `.specs/STATE.md`. Lição L-002 (texto exato nas mensagens): os textos dos AC já estão literais na spec e entram literais nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio e constantes (`src/lib/**`) | unit | Cada texto exato da spec afirmado; 1:1 com os AC; edge cases listados | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Componentes e páginas (`src/app/**`, `src/components/**`) | none | Sem teste de componente no projeto; evidência por inspeção de código (`file:line`) e pelo teste-guarda de T12 (AD-005) | - | gate de build |
| Ativos estáticos e docs (`public/**`, `docs/**`) | none | - (gate de build) | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks com teste unitário | `PATH=<node20>:$PATH npm run test:unit` |
| Full | Sem integração nesta feature; igual ao Quick | `PATH=<node20>:$PATH npm run test:unit` |
| Build | Tasks sem teste (componentes, ativos, docs) e fim de fase | `PATH=<node20>:$PATH npm run typecheck && npm run lint && npm run test:unit` |

---

## Execution Plan

### Phase 1: Marca e ativos

```
T1 → T2 → T3 → T4
```

### Phase 2: Cópia e telas do app

```
T5 → T6 → T7 → T8
```

### Phase 3: Landing, arquivos e guarda

```
T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Criar constantes da marca

**What**: Criar `brand.ts` com nome, descritor, slogan, template de título, descrição e nome do arquivo da chave, mais o teste com os textos exatos.
**Where**: `src/lib/brand.ts`
**Depends on**: None
**Reuses**: padrão de módulos puros em `src/lib/`
**Requirement**: ANON-03, ANON-09, ANON-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Constantes exportadas com os valores da seção de design
- [x] `brand.test.ts` afirma cada string literal da spec
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 6 testes novos passam, nenhum removido

**Tests**: unit
**Gate**: quick

**Commit**: `feat(brand): add the ANON brand constants`

**Status**: ✅ Done

---

### T2: Trazer os favicons novos e aposentar os ativos antigos

**What**: Copiar o favicon escuro e o claro para `public/`, remover `src/app/icon.svg` e os dois SVGs `docs/vertice_*`, e versionar `docs/marca/`.
**Where**: `public/favicon.svg`
**Depends on**: T1
**Reuses**: `docs/marca/anon_favicon_dark.svg`, `docs/marca/anon_favicon_light.svg`
**Requirement**: ANON-04, ANON-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `public/favicon.svg` igual ao favicon escuro e `public/favicon-light.svg` igual ao claro
- [x] `docs/vertice_logo.svg`, `docs/vertice_favicon.svg` e `src/app/icon.svg` não existem mais
- [x] `docs/marca/` com os 8 SVGs e o PNG está no commit
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): add the ANON favicons and brand assets`


**Status**: ✅ Done

---

### T3: Metadados do layout com a marca nova

**What**: Trocar título, template, descrição e ícones (escuro padrão, claro por `prefers-color-scheme`) lendo as constantes.
**Where**: `src/app/layout.tsx`
**Depends on**: T2
**Reuses**: `src/lib/brand.ts`; doc de metadata do Next em `node_modules/next/dist/docs/`
**Requirement**: ANON-03, ANON-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `title` com `default` "ANON" e `template` "ANON • %s"
- [x] `description` "ANON – Finanças Privadas"
- [x] `icons` declara o favicon escuro e o claro com `media`, o escuro como fallback
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): switch the app metadata and icons to ANON`


**Status**: ✅ Done

---

### T4: Componente Logo com o monograma A

**What**: Reescrever o `Logo` com o monograma, "ANON" e "Finanças Privadas", em variante escura e clara alternadas por tema.
**Where**: `src/components/brand/Logo.tsx`
**Depends on**: T3
**Reuses**: geometria de `docs/marca/anon_logo_dark.svg` e `anon_logo_light.svg`; `useId`; `src/lib/brand.ts`
**Requirement**: ANON-01, ANON-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `aria-label` "ANON"; texto "ANON" e descritor exibidos
- [ ] Duas variantes SVG com gradientes e superfícies dos SVGs dark e light, alternadas por `dark:`
- [ ] Ids de gradiente únicos por instância e por variante
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): redraw the Logo as the ANON monogram`

---

### T5: Copy de domínio da meta (onboarding e frase de meta atingida)

**What**: Trocar "Definir seu Ápice" e "Você já atingiu seu Ápice." e atualizar as expectativas dos testes.
**Where**: `src/lib/domain/freedom-copy.ts`
**Depends on**: None (fase 1 concluída)
**Reuses**: `src/lib/domain/onboarding.ts`, `onboarding.test.ts`, `freedom-copy.test.ts`
**Requirement**: ANON-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Frase termina com "Você já atingiu sua meta." quando o restante é zero
- [ ] Item do checklist "Definir sua meta"
- [ ] Testes existentes atualizados para os textos da spec, sem remover casos
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: igual ao anterior ao começar a task, todos passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(brand): rename the goal wording in domain copy`

---

### T6: Navegação, página e cartões da meta como "Liberdade"

**What**: Trocar o rótulo do menu, o título da página, o cabeçalho da experiência e a ação do card de primeiros passos.
**Where**: `src/components/app-nav.tsx`
**Depends on**: T5
**Reuses**: `src/app/(app)/liberdade/page.tsx`, `src/components/goal-experience.tsx`, `src/components/getting-started-card.tsx`
**Requirement**: ANON-06, ANON-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Menu "Liberdade"; `metadata.title` e `PageHeader` "Liberdade"
- [ ] Card de primeiros passos com "Definir meta"
- [ ] Nenhum texto visível da página usa "Ápice"/"ápice"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): rename the Ápice screen to Liberdade`

---

### T7: Telas de acesso com o descritor novo

**What**: Trocar "Gestão Patrimonial Familiar" por `BRAND_DESCRIPTOR` em login, cadastro, esqueci-senha e redefinir-senha.
**Where**: `src/app/login/page.tsx`
**Depends on**: T6
**Reuses**: `src/app/cadastro/page.tsx`, `src/app/esqueci-senha/page.tsx`, `src/app/redefinir-senha/page.tsx`, `src/lib/brand.ts`
**Requirement**: ANON-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As quatro páginas exibem "Finanças Privadas" lendo a constante
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): show the ANON descriptor on the access pages`

---

### T8: Política de privacidade com ANON

**What**: Trocar "a equipe do Vértice", "O que o Vértice processa" e "Meta do Ápice" pelos textos da spec.
**Where**: `src/components/privacy/privacy-content.tsx`
**Depends on**: T7
**Reuses**: `src/lib/brand.ts`
**Requirement**: ANON-08, ANON-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] "a equipe da ANON", "O que a ANON processa" e "Meta de liberdade e percentuais das categorias"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): rename the product in the privacy page`

---

### T9: Landing com a marca, o slogan e a seção Liberdade

**What**: Trocar nome, slogan, metadado, mock "anon · visão geral", âncora `#liberdade` e títulos de seção, e tirar "ápice patrimonial".
**Where**: `src/app/bem-vindo/page.tsx`
**Depends on**: None (fase 2 concluída)
**Reuses**: `src/lib/brand.ts`
**Requirement**: ANON-09, ANON-10, ANON-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Slogan da opção 3 como tagline; `metadata.title` "ANON – Finanças Privadas"
- [ ] `id="liberdade"` e título "A Liberdade: engenharia de juros compostos"
- [ ] Manifesto "Por que a ANON?" e demais menções sem "Vértice"/"Ápice"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): rewrite the landing page for ANON`

---

### T10: Navbar e rodapé da landing

**What**: Trocar o aria-label, os links `#liberdade`, o slogan e o copyright.
**Where**: `src/components/landing/navbar.tsx`
**Depends on**: T9
**Reuses**: `src/components/landing/site-footer.tsx`, `src/lib/brand.ts`
**Requirement**: ANON-09, ANON-10, ANON-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] aria-label "ANON, página inicial"; item "A Liberdade" com `href="/#liberdade"`
- [ ] Rodapé: link "Liberdade", slogan e "© 2026 ANON. Desenvolvido para quem leva patrimônio a sério."
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): update the landing navbar and footer for ANON`

---

### T11: Arquivo da chave, design-system e roadmap mobile

**What**: Usar `RECOVERY_KEY_FILE_NAME` no diálogo da chave, trocar o texto da página design-system e o nome e a origem do ícone no roadmap.
**Where**: `src/components/recovery-key-dialog.tsx`
**Depends on**: T10
**Reuses**: `src/app/design-system/page.tsx`, `docs/mobile-roadmap.md`, `src/lib/brand.ts`
**Requirement**: ANON-12, ANON-13, ANON-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Download chamado "chave-de-recuperacao-anon.txt"
- [ ] design-system: "Tokens e componentes base do ANON."
- [ ] Roadmap cita "ANON", `name: "ANON"` e `docs/marca/anon_favicon_dark.svg`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): rename the recovery file, design system page and roadmap`

---

### T12: Teste-guarda contra os nomes antigos

**What**: Criar o teste que varre `src/` e `public/` e falha se "Vértice" ou "Ápice" voltarem fora das exceções.
**Where**: `src/lib/brand-guard.test.ts`
**Depends on**: T11
**Reuses**: `node:fs`; lista de exceções (comentários, nomes de teste, `APICE-xx`)
**Requirement**: ANON-06, ANON-07, ANON-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O teste passa no estado atual e falha ao reinserir "Vértice" em um componente (conferido por mutação manual)
- [ ] A lista de exceções está escrita no próprio teste, com o motivo
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: 1 teste novo passa, nenhum removido

**Tests**: unit
**Gate**: build

**Commit**: `test(brand): guard against the old brand names in the app`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
Phase 3:  T9 ------→ T10 -----→ T11 -----→ T12
```

Execução estritamente sequencial; 12 tasks, mais de um lote de ~7, então o Execute oferece sub-agentes antes de começar. O Verifier roda sozinho depois de T12.
