# Identidade Vértice Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: pulado (só rótulos, metadata e um componente visual; decisões na tabela de premissas do spec)
**Spec**: `.specs/features/identidade-vertice/spec.md`
**Status**: Draft

**Estratégia de ordem:** cada tarefa deixa `typecheck`, `lint` e os testes verdes e termina em um commit. `Logo` (T3) vem antes de quem o usa (T5, T6). Os títulos de aba dependem do template da T4. Os specs e2e só mudam na fase 6, depois dos rótulos novos existirem; a suíte e2e não roda (AD-005), então o gate deles é `typecheck`.

**Antes de rodar `test:int`:** usar Node 20 no `PATH` e um banco de teste privado via `DATABASE_URL` (ver memória do projeto), para não colidir com outras sessões.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (consultar `node_modules/next/dist/docs/` antes de mexer em metadata e ícones), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso). Sem guideline de cobertura para UI; o projeto não tem teste de componente (nenhum `*.test.tsx`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Não é alterado nesta feature; a suíte existente precisa manter a mesma contagem | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Validação, repositórios e Server Actions | integration | Não alterados; a suíte existente precisa continuar verde | `src/**/*.int.test.ts` | `npm run test:int` |
| UI / páginas / metadata (`src/app/*`, `src/components/*`) | none | - (só rótulos e estrutura visual; sem teste de componente no projeto, e2e suspenso. Os ACs de rótulo são conferidos no HTML do build e pelo Verifier com `grep`) | - | build gate only |
| Specs e2e (`e2e/*.spec.ts`) | none | - (atualizados sem rodar, AD-005) | `e2e/*.spec.ts` | `npm run typecheck` |
| Arquivos SVG e assets (`public/*`, `src/app/icon.svg`) | none | - (build gate; conteúdo conferido com `diff`) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de rótulo, componente e e2e | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Não usado nesta feature (sem teste de integração novo) | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Última task de cada fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Marca e metadata

Favicon, logo, metadata raiz e aplicação no shell e no login.

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Navegação e títulos

Rótulos do menu e título, eyebrow e `<title>` de cada tela. A seta vinda da fase anterior marca uma dependência já concluída.

```
T6 → T7 → T8 → T9 → T10 → T11
```

### Phase 3: Tela Alocação

Rótulos, cabeçalho, botão de rebalanceio e lixeira das subcategorias. A seta vinda da fase anterior marca uma dependência já concluída.

```
T11 → T12 → T13 → T14 → T15
```

### Phase 4: Tela Ápice

Indicadores, gráfico e botão de calibrar. A seta vinda da fase anterior marca uma dependência já concluída.

```
T15 → T16 → T17 → T18
```

### Phase 5: Modal de lançamento

Seletor de tipo, títulos e rodapé. A seta vinda da fase anterior marca uma dependência já concluída.

```
T18 → T19 → T20 → T21 → T22
```

### Phase 6: Specs e2e existentes

Mantém os specs coerentes com os novos rótulos, sem rodar a suíte (AD-005). A seta vinda da fase anterior marca uma dependência já concluída.

```
T22 → T23 → T24 → T25 → T26 → T27 → T28
```

---

## Task Breakdown

### T1: Copiar o favicon vetorial para public

**What**: Create `public/favicon.svg` with the exact content of `docs/vertice_favicon.svg`.
**Where**: `public/favicon.svg`
**Depends on**: None
**Reuses**: docs/vertice_favicon.svg
**Requirement**: BRAND-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Arquivo idêntico ao `docs/vertice_favicon.svg` (`diff` sem saída)
- [x] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(brand): add vertice favicon to public`

---

### T2: Adicionar o ícone de metadata do Next

**What**: Create `src/app/icon.svg` with the same content and delete `src/app/favicon.ico` with `git rm`, so the SVG is the only favicon the Next metadata convention emits.
**Where**: `src/app/icon.svg`
**Depends on**: T1
**Reuses**: docs/vertice_favicon.svg
**Requirement**: BRAND-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/app/icon.svg` idêntico ao favicon
- [x] `src/app/favicon.ico` removido
- [x] `npm run build` lista o ícone sem erro (tag `<link rel="icon">` com `icon.svg` no HTML de `/login`)
- [x] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(brand): serve the vertice svg as the app icon`

---

### T3: Criar o componente Logo

**What**: Create the `Logo` component: inline SVG squircle with the gradient "V" and emerald dot (geometry from `docs/vertice_logo.svg`), next to HTML text "VÉRTICE" (`font-display`, `text-foreground`) and the subtitle "Gestão Patrimonial" (`text-muted-foreground`); accessible name "Vértice", symbol `aria-hidden`; gradient ids made unique with `useId`.
**Where**: `src/components/brand/Logo.tsx`
**Depends on**: T2
**Reuses**: `docs/vertice_logo.svg`, `cn` from `src/lib/utils.ts`
**Requirement**: BRAND-01, BRAND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Componente exporta `Logo` com prop `className` opcional
- [x] Squircle e gradiente fixos; texto usa tokens `foreground` e `muted-foreground`
- [x] Nome acessível "Vértice" lido uma vez
- [x] `npm run typecheck && npm run lint` passam
- [x] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(brand): add Vertice logo component`

---

### T4: Trocar a metadata raiz

**What**: Set root `metadata` to `title: { default: "Vértice", template: "Vértice • %s" }` and `description: "Vértice – Gestão Patrimonial Familiar"`.
**Where**: `src/app/layout.tsx`
**Depends on**: T3
**Reuses**: `Metadata` já importado no arquivo
**Requirement**: BRAND-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `title.default`, `title.template` e `description` exatamente como no spec
- [x] Nenhuma ocorrência de "Orçamento" em `src/app/layout.tsx`
- [x] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(brand): set Vertice root metadata and title template`

---

### T5: Usar o Logo na sidebar e na barra superior

**What**: Replace the `WalletIcon` tile and the "Orçamento" / "Visão da família" texts in the signed-in shell with `Logo`; drop the unused `WalletIcon` import.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T4
**Reuses**: `Logo` (T3)
**Requirement**: BRAND-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `Logo` aparece na sidebar (`md+`) e na barra superior (mobile)
- [x] Alternador de tema e "Sair" continuam visíveis em largura mobile
- [x] Nenhuma ocorrência de "Orçamento" no arquivo
- [x] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(brand): show the logo in the app shell`

---

### T6: Aplicar a marca no login

**What**: Replace the wallet tile and the heading "Orçamento doméstico" with `Logo`, add the subtitle "Gestão Patrimonial Familiar" and set `metadata.title` to "Entrar" (rendered "Vértice • Entrar" by the template).
**Where**: `src/app/login/page.tsx`
**Depends on**: T5
**Reuses**: `Logo` (T3)
**Requirement**: BRAND-02, BRAND-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Página mostra `Logo` e o subtítulo "Gestão Patrimonial Familiar"
- [ ] `metadata.title` é "Entrar" e o `<title>` renderizado é "Vértice • Entrar" (conferido no HTML de `npm run build`/`next start`)
- [ ] Mantém exatamente um `<h1>` na página (o nome acessível do `Logo` ou um `h1` visível)
- [ ] Gate build passa
- [ ] Gate build: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: build

**Commit**: `feat(brand): apply the logo and title on the login page`

---

### T7: Renomear os itens de navegação

**What**: Change the nav labels to "Cockpit", "Alocação" and "Ápice", keeping hrefs and icons.
**Where**: `src/components/app-nav.tsx`
**Depends on**: T6
**Reuses**: itens `items` existentes
**Requirement**: NAV-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Três rótulos exatamente como no spec
- [ ] Hrefs `/`, `/categorias`, `/liberdade` intactos
- [ ] `aria-current="page"` continua no item ativo
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(nav): rename menu items to Cockpit, Alocação and Ápice`

---

### T8: Renomear a tela Resumo para Cockpit

**What**: Set the `PageHeader` title to "Cockpit" (eyebrow "Visão geral" unchanged) and export `metadata = { title: "Cockpit" }`.
**Where**: `src/app/(app)/page.tsx`
**Depends on**: T7
**Reuses**: `Metadata` como em `liberdade/page.tsx`
**Requirement**: BRAND-05, NAV-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Título da página "Cockpit"
- [ ] `<title>` renderizado "Vértice • Cockpit"
- [ ] Nenhum valor ou card do resumo muda
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(brand): rename the summary page to Cockpit`

---

### T9: Renomear a tela Categorias para Alocação

**What**: Set `metadata.title` to "Alocação", the `PageHeader` title to "Alocação", the eyebrow to "Planejamento", and add under the header the support text "Alocação total obrigatória: 100% da receita" (`text-sm text-muted-foreground`).
**Where**: `src/app/(app)/categorias/page.tsx`
**Depends on**: T8
**Reuses**: `PageHeader`, parágrafo de apoio de `liberdade/page.tsx`
**Requirement**: BRAND-05, NAV-01, ALOC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `<title>` renderizado "Vértice • Alocação"
- [ ] Título, eyebrow e texto de apoio exatamente como no spec
- [ ] Texto de apoio aparece sempre, independente da soma
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(alocacao): rename the categories page and add the 100% rule text`

---

### T10: Renomear a tela Liberdade para Ápice

**What**: Set `metadata.title` to "Ápice", the `PageHeader` title to "Ápice", the eyebrow to "Independência financeira" and the description to the exact text from the spec's Assumptions table.
**Where**: `src/app/(app)/liberdade/page.tsx`
**Depends on**: T9
**Reuses**: `PageHeader` e parágrafo existentes
**Requirement**: BRAND-05, NAV-01, APICE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `<title>` renderizado "Vértice • Ápice"
- [ ] Título, eyebrow e descrição exatamente como no spec
- [ ] Valores, resumo e formulário inalterados
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(apice): rename the freedom page to Ápice`

---

### T11: Tirar "Orçamento" da página design-system

**What**: Replace the text "Tokens e componentes base do Orçamento." with "Tokens e componentes base do Vértice.".
**Where**: `src/app/design-system/page.tsx`
**Depends on**: T10
**Reuses**: -
**Requirement**: BRAND-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma ocorrência de "Orçamento" no arquivo
- [ ] Gate build passa e `grep -rn "Orçamento" src` só retorna comentários e identificadores
- [ ] Gate build: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: build

**Commit**: `chore(brand): drop the old name from the design-system page`

---

### T12: Renomear o campo de receita base

**What**: Change the field label "Receita de referência (R$)" to "Receita Base Mensal" (the "Base de cálculo mensal: R$ X" text and "Editar base" stay).
**Where**: `src/components/reference-income-card.tsx`
**Depends on**: T11
**Reuses**: -
**Requirement**: ALOC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Rótulo exatamente "Receita Base Mensal"
- [ ] `getByLabel` do campo continua associado ao `Input` via `htmlFor`
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(alocacao): rename reference income field to Receita Base Mensal`

---

### T13: Atualizar cabeçalho da lista e o estilo do Salvar

**What**: Change the list header texts to "CATEGORIA", "ALOCAÇÃO (%)", "VALOR PREVISTO (R$)", "SUBCATEGORIAS", "AÇÕES" and the disabled classes of "Salvar" to `opacity-50 cursor-not-allowed`; confirm the existing suffix "%", prefix "R$", 2-decimal display and category trash icon are untouched.
**Where**: `src/components/category-editor.tsx`
**Depends on**: T12
**Reuses**: `COL_*`, `InputAffix`, `percentFieldText` existentes
**Requirement**: ALOC-02, ALOC-03, ALOC-05, ALOC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cinco colunas na ordem do spec, alinhadas com as linhas
- [ ] "Salvar" desabilitado com soma ≠ 100% tem `opacity-50` e `cursor-not-allowed` (sem `opacity-40`)
- [ ] Sufixo "%", prefixo "R$", lixeira da categoria e `percentFieldText` inalterados
- [ ] Nenhum texto "Remover" visível na linha da categoria
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(alocacao): rename list columns and strengthen the disabled save state`

---

### T14: Renomear o botão da barra de ajuste

**What**: Change the button text "Aplicar" to "Rebalancear"; behavior and error handling unchanged.
**Where**: `src/components/adjust-sum-bar.tsx`
**Depends on**: T13
**Reuses**: -
**Requirement**: ALOC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão exibe "Rebalancear"
- [ ] `onApply` e `disabled={selected === null}` inalterados
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(alocacao): rename the adjust button to Rebalancear`

---

### T15: Trocar o Remover das subcategorias por lixeira

**What**: Replace the text button "Remover" with a `Trash2Icon` icon button keeping its `aria-label`, using the destructive color on hover and focus, like the category trash in `category-editor.tsx`.
**Where**: `src/components/subcategory-editor.tsx`
**Depends on**: T14
**Reuses**: botão de lixeira em `category-editor.tsx:340-352`
**Requirement**: ALOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão é só ícone, `aria-label` existente preservado
- [ ] Hover e focus em tom destrutivo
- [ ] Nenhum texto "Remover" visível na linha da subcategoria
- [ ] Gate build: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: build

**Commit**: `feat(alocacao): use a trash icon to remove subcategories`

---

### T16: Renomear os indicadores do hero

**What**: Rename the hero labels: "Patrimônio-alvo" → "Meta Patrimonial", "Guardado" → "Patrimônio Acumulado", "Aporte mensal necessário" → "Aporte Estratégico Mensal", "Falta" → "Distância do Alvo", "Prazo restante" → "Tempo até o Ápice"; "Progresso" stays.
**Where**: `src/components/goal-hero.tsx`
**Depends on**: T15
**Reuses**: -
**Requirement**: APICE-02, APICE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cinco rótulos exatamente como no spec
- [ ] Valores, fórmulas e `formatTerm` inalterados
- [ ] `npm run test:unit` mantém a mesma contagem de testes
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(apice): rename the hero indicators`

---

### T17: Renomear o título do gráfico

**What**: Change the visible heading "Evolução do patrimônio" and the start of the chart `aria-label` to "Trajetória dos Juros Compostos".
**Where**: `src/components/goal-chart.tsx`
**Depends on**: T16
**Reuses**: -
**Requirement**: APICE-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Título visível e `aria-label` usam "Trajetória dos Juros Compostos"
- [ ] Dados e série do gráfico inalterados
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(apice): rename the chart to Trajetória dos Juros Compostos`

---

### T18: Renomear o botão de edição do objetivo

**What**: Change the button "Editar objetivo" to "Calibrar Parâmetros" (and the doc comment); confirm the birth-date field already has the label "Data de nascimento", placeholder "DD/MM/AAAA" and `maskDateInput`.
**Where**: `src/components/goal-form.tsx`
**Depends on**: T17
**Reuses**: -
**Requirement**: APICE-04, APICE-05, APICE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão exibe "Calibrar Parâmetros"
- [ ] Rótulo, placeholder e máscara da data inalterados
- [ ] Mensagem "Data de nascimento inválida" continua vinda da validação
- [ ] Gate build: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: build

**Commit**: `feat(apice): rename the edit button to Calibrar Parâmetros`

---

### T19: Renomear as opções do seletor de tipo

**What**: Change the labels "Gasto" → "Saída de Caixa" and "Ganho" → "Entrada de Capital", keeping values `expense` / `income` and the destructive/success checked colors.
**Where**: `src/components/kind-toggle.tsx`
**Depends on**: T18
**Reuses**: -
**Requirement**: LANC-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Rótulos exatamente como no spec
- [ ] Valores e cores de seleção inalterados
- [ ] `radiogroup` continua com `aria-label="Tipo"`
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(lancamento): rename the kind options`

---

### T20: Renomear o título do modal de criação

**What**: Change the `DialogTitle` "Nova transação" to "Registrar Lançamento"; the floating button keeps its `aria-label` "Nova transação".
**Where**: `src/components/new-transaction-button.tsx`
**Depends on**: T19
**Reuses**: -
**Requirement**: LANC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Título do diálogo "Registrar Lançamento"
- [ ] `aria-label` do botão flutuante inalterado
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(lancamento): rename the create dialog title`

---

### T21: Renomear o título do modal de edição e garantir o Cancelar

**What**: Change the `DialogTitle` "Editar transação" to "Editar Lançamento" and make sure the edit `TransactionForm` receives `onCancel` that closes the dialog without saving.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T20
**Reuses**: `onCancel` de `new-transaction-button.tsx`
**Requirement**: LANC-01, LANC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Título "Editar Lançamento"
- [ ] "Cancelar" aparece no rodapé da edição e fecha o modal sem salvar
- [ ] Fluxo de exclusão pela lista inalterado
- [ ] Gate quick: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `feat(lancamento): rename the edit dialog title and keep cancel in the footer`

---

### T22: Atualizar aria-label e rodapé do formulário

**What**: Change the form `aria-label` to "Registrar Lançamento" when creating and "Editar Lançamento" when editing, and the footer delete button text "Excluir" to "Excluir lançamento" (edit mode only; "Cancelar" stays in both modes).
**Where**: `src/components/transaction-form.tsx`
**Depends on**: T21
**Reuses**: rodapé existente `onDelete` / `onCancel`
**Requirement**: LANC-01, LANC-03, LANC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `aria-label` do formulário conforme o modo
- [ ] "Excluir lançamento" só quando há `onDelete`, em destrutivo
- [ ] "Cancelar" visível em criação e edição
- [ ] Gate build passa
- [ ] Gate build: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: build

**Commit**: `feat(lancamento): rename the form label and the delete action`

---

### T23: Atualizar o e2e do design-system

**What**: In `e2e/design-system.spec.ts` replace the nav link name "Resumo" with "Cockpit" and any other changed label.
**Where**: `e2e/design-system.spec.ts`
**Depends on**: T22
**Reuses**: -
**Requirement**: NAV-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Spec usa os novos rótulos; `npx tsc --noEmit` passa (suíte não roda, AD-005)
- [ ] `npm run typecheck` passa
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `test(e2e): update the design-system spec for the new nav labels`

---

### T24: Atualizar o e2e de categorias

**What**: In `e2e/categories.spec.ts` replace "Receita de referência (R$)" with "Receita Base Mensal", "Aplicar" with "Rebalancear" and the changed header and nav texts.
**Where**: `e2e/categories.spec.ts`
**Depends on**: T23
**Reuses**: -
**Requirement**: ALOC-01, ALOC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Spec usa os novos rótulos; `grep` não acha os textos antigos no arquivo
- [ ] `npm run typecheck` passa
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `test(e2e): update the categories spec for the Alocação labels`

---

### T25: Atualizar o e2e do formulário de transação

**What**: In `e2e/transaction-form.spec.ts` replace the form name "Nova transação" with "Registrar Lançamento" and the kinds "Gasto"/"Ganho" with "Saída de Caixa"/"Entrada de Capital".
**Where**: `e2e/transaction-form.spec.ts`
**Depends on**: T24
**Reuses**: -
**Requirement**: LANC-01, LANC-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Tipo `kind` e `getByRole("form")` usam os novos nomes
- [ ] `grep` não acha os textos antigos no arquivo
- [ ] `npm run typecheck` passa
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `test(e2e): update the transaction form spec for the Lançamento labels`

---

### T26: Atualizar o e2e do month-picker

**What**: In `e2e/month-picker.spec.ts` update the form name and the kind radio label to the new texts.
**Where**: `e2e/month-picker.spec.ts`
**Depends on**: T25
**Reuses**: -
**Requirement**: LANC-01, LANC-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `grep` não acha "Nova transação" nem "Gasto" como rótulo no arquivo
- [ ] `npm run typecheck` passa
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `test(e2e): update the month-picker spec for the Lançamento labels`

---

### T27: Atualizar o e2e do resumo

**What**: In `e2e/summary.spec.ts` update the form name and the kind radio label to the new texts.
**Where**: `e2e/summary.spec.ts`
**Depends on**: T26
**Reuses**: -
**Requirement**: LANC-01, LANC-02, NAV-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `grep` não acha "Nova transação" nem "Gasto" como rótulo de rádio no arquivo
- [ ] `npm run typecheck` passa
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `test(e2e): update the summary spec for the Lançamento labels`

---

### T28: Atualizar o e2e da lista de transações

**What**: In `e2e/transaction-list.spec.ts` replace the form name "Editar transação" with "Editar Lançamento" and the delete button name with "Excluir lançamento" where used in the modal.
**Where**: `e2e/transaction-list.spec.ts`
**Depends on**: T27
**Reuses**: -
**Requirement**: LANC-01, LANC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `grep` não acha "Editar transação" no arquivo
- [ ] `npm run typecheck` passa
- [ ] Contagem de testes unit/int igual à anterior (nenhum teste removido)

**Tests**: none
**Gate**: quick

**Commit**: `test(e2e): update the transaction list spec for the Lançamento labels`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5 ------→ T6
Phase 2:  T7 ------→ T8 ------→ T9 ------→ T10 ------→ T11
Phase 3:  T12 ------→ T13 ------→ T14 ------→ T15
Phase 4:  T16 ------→ T17 ------→ T18
Phase 5:  T19 ------→ T20 ------→ T21 ------→ T22
Phase 6:  T23 ------→ T24 ------→ T25 ------→ T26 ------→ T27 ------→ T28
```

Execução estritamente sequencial; 28 tarefas: oferecer batches de sub-agentes (fases 1+2 = 11 tarefas é o primeiro lote natural; ver sub-agents.md).
