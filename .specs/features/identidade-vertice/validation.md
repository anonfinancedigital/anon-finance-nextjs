# Identidade Vértice Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/identidade-vertice/spec.md`
**Diff range**: `06650f6..01e32f3` (code from a19d1a4 to 01e32f3). Everything was verified in a temporary `git worktree` at `01e32f3`, not at the current HEAD (see Warnings).
**Verifier**: independent sub-agent (author ≠ verifier)

## Validation: identidade-vertice - PASS ✅

**Verdict: PASS ✅** (with warnings and spec-precision gaps listed below; no AC uncovered, no gate failing)

Evidence cites `file:line` in the worktree at `01e32f3` (the same paths and lines exist in the repo at that commit). The feature is UI and labels only and has no component tests (tasks.md matrix: `none`), so each AC is proved by the exact text or attribute in code, compared character by character with the spec, and by the HTML of `npm run build` for the behavioral ACs.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T28 | ✅ Done | All 28 tasks are checked `[x]` in tasks.md. The diff range contains the files each task names, and the e2e specs for T23-T28 no longer contain the old labels (`grep` of "Nova transação", "Editar transação", "Gasto", "Ganho", "Resumo", "Receita de referência", "Aplicar", "Editar objetivo" and "Orçamento" in `e2e/` returns nothing). |

`git diff --name-only 06650f6..01e32f3` touches only `public/favicon.svg`, `src/app/**`, `src/components/**`, `e2e/**` and `.specs/**`. No file in `src/lib`, `src/actions` or `src/db` changed (`git diff --stat 06650f6..01e32f3 -- src/lib src/actions src/db` is empty).

---

## Spec-Anchored Acceptance Criteria

### P1: Marca Vértice em todo o app

| Criterion | Spec-defined outcome | `file:line` + exact text | Result |
| --------- | -------------------- | ------------------------ | ------ |
| BRAND AC1 Logo component | Squircle escuro, "V" em gradiente #8b5cf6 → #10b981, ponto esmeralda, "VÉRTICE" em `font-display`, "Gestão Patrimonial" | `src/components/brand/Logo.tsx:28` `<rect ... rx="18" fill=bg>`; `:20-21` `stopColor="#8b5cf6"` / `"#10b981"`; `:30-36` path "V" stroke gradient; `:37` `<circle cx="32" cy="15" r="3.5" fill="#10b981" />`; `:40` `font-display ... VÉRTICE`; `:42` `Gestão Patrimonial` | ✅ PASS |
| BRAND AC2 shell | Logo na sidebar `md+` e na barra superior abaixo de `md`, no lugar do tile `WalletIcon` e do texto "Orçamento" | `src/app/(app)/layout.tsx:4` import, `:16` `<Logo className="md:px-1 md:pt-2" />` dentro do único `<aside>` (barra superior no mobile, sidebar no `md+`); sem `WalletIcon` nem "Orçamento" no arquivo | ✅ PASS |
| BRAND AC3 login | Logo e "Gestão Patrimonial Familiar" no login, sem tile nem "Orçamento doméstico" | `src/app/login/page.tsx:13` `<Logo />`, `:15` `Gestão Patrimonial Familiar`; `.next/server/app/login.html` contém "Gestão Patrimonial Familiar" e 0 ocorrências de "Orçamento" | ✅ PASS |
| BRAND AC4 tema claro | Texto com `foreground` e `muted-foreground`; squircle e gradiente fixos | `Logo.tsx:40` `text-foreground`, `:41` `text-muted-foreground`; cores do quadrado e do gradiente fixas em hex (`:20-25`) | ✅ PASS (não verificado visualmente; ver Observações) |
| BRAND AC5 favicon | `public/favicon.svg` e `src/app/icon.svg` com o conteúdo de `docs/vertice_favicon.svg`; `<head>` linka o ícone | `diff docs/vertice_favicon.svg public/favicon.svg` e `... src/app/icon.svg` sem saída; `src/app/favicon.ico` ausente; `login.html`: `<link rel="icon" href="/icon.svg?icon.3_f25fzmc9pq-.svg" sizes="any" type="image/svg+xml"/>`; a rota `/icon.svg` aparece no build como estática | ✅ PASS |
| BRAND AC6 metadata raiz | `title.default` "Vértice", `title.template` "Vértice • %s", `description` "Vértice – Gestão Patrimonial Familiar" | `src/app/layout.tsx:25` `title: { default: "Vértice", template: "Vértice • %s" }`, `:26` `description: "Vértice – Gestão Patrimonial Familiar"`; `login.html`: `<meta name="description" content="Vértice – Gestão Patrimonial Familiar"/>` | ✅ PASS |
| BRAND AC7 título Cockpit | "Vértice • Cockpit" | `src/app/(app)/page.tsx:28` `metadata = { title: "Cockpit" }` + template `layout.tsx:25` (página dinâmica, sem HTML estático) | ✅ PASS em `01e32f3` (⚠️ HEAD atual diverge; ver Warnings) |
| BRAND AC8 título Alocação | "Vértice • Alocação" | `src/app/(app)/categorias/page.tsx:10` `{ title: "Alocação" }` + template | ✅ PASS |
| BRAND AC9 título Ápice | "Vértice • Ápice" | `src/app/(app)/liberdade/page.tsx:9` `{ title: "Ápice" }` + template | ✅ PASS |
| BRAND AC10 título login | "Vértice • Entrar" | `src/app/login/page.tsx:5` `{ title: "Entrar" }`; `login.html`: `<title>Vértice • Entrar</title>` | ✅ PASS |
| BRAND AC11 nome acessível | Nome "Vértice", símbolo decorativo, lido uma vez | `Logo.tsx:16` `role="img" aria-label="Vértice"`, `:17` `<svg aria-hidden`, `:39` texto `aria-hidden`; `login.html` contém `aria-label="Vértice"` e exatamente um `<h1>` | ✅ PASS |
| BRAND AC12 sem "Orçamento" | Nenhuma ocorrência visível, em `<title>` ou metadata, inclusive login, eyebrow de Alocação e design-system | `grep -rn "Orçamento" src` e `grep -rni "orcamento" src` retornam vazio; `src/app/design-system/page.tsx:38` `Tokens e componentes base do Vértice.`; `categorias/page.tsx:21` eyebrow `Planejamento` | ✅ PASS |

### P1: Navegação Cockpit, Alocação, Ápice

| Criterion | Spec-defined outcome | `file:line` + exact text | Result |
| --------- | -------------------- | ------------------------ | ------ |
| NAV AC1 rótulos | "Cockpit" (`/`), "Alocação" (`/categorias`), "Ápice" (`/liberdade`), ícones mantidos | `src/components/app-nav.tsx:9` `{ href: "/", label: "Cockpit", icon: LayoutGridIcon }`, `:10` `"/categorias" ... "Alocação" ... TagsIcon`, `:11` `"/liberdade" ... "Ápice" ... TargetIcon` | ✅ PASS em `01e32f3` (⚠️ HEAD atual diverge) |
| NAV AC2 título da página | "Cockpit", "Alocação", "Ápice" | `(app)/page.tsx:85` `title="Cockpit"`; `categorias/page.tsx:21` `title="Alocação"`; `liberdade/page.tsx:20` `title="Ápice"` | ✅ PASS em `01e32f3` (⚠️ HEAD atual diverge) |
| NAV AC3 eyebrows | `/categorias` "Planejamento"; `/liberdade` "Independência financeira" | `categorias/page.tsx:21` `eyebrow="Planejamento"`; `liberdade/page.tsx:20` `eyebrow="Independência financeira"` | ✅ PASS |
| NAV AC4 `aria-current` | Item ativo com `aria-current="page"` | `app-nav.tsx:24` regra `active`, `:29` `aria-current={active ? "page" : undefined}`; sem diff nessas linhas na faixa | ✅ PASS |

### P1: Tela Alocação

| Criterion | Spec-defined outcome | `file:line` + exact text | Result |
| --------- | -------------------- | ------------------------ | ------ |
| ALOC AC1 rótulo | "Receita Base Mensal" | `src/components/reference-income-card.tsx:57` `<Label htmlFor="reference-income">Receita Base Mensal</Label>` | ✅ PASS |
| ALOC AC2 texto de apoio | "Alocação total obrigatória: 100% da receita" sob o cabeçalho | `categorias/page.tsx:22` `<p className="text-sm text-muted-foreground">Alocação total obrigatória: 100% da receita</p>` (sem condição) | ✅ PASS |
| ALOC AC3 cabeçalho | CATEGORIA, ALOCAÇÃO (%), VALOR PREVISTO (R$), SUBCATEGORIAS, AÇÕES, nessa ordem, alinhado às linhas | `src/components/category-editor.tsx:257-261` (cinco `<span>` na ordem pedida, com `COL_PERCENT`/`COL_AMOUNT`/`COL_COUNT`/`COL_ACTION` das linhas, `:49-54`) | ✅ PASS (alinhamento por classes de largura iguais; não conferido visualmente) |
| ALOC AC4 afixos | Sufixo "%" e prefixo "R$" em toda linha | `category-editor.tsx:308` `<InputAffix suffix="%">`, `:322` `<InputAffix prefix="R$">` (inalterados na faixa) | ✅ PASS |
| ALOC AC5 2 casas | Sem foco, máximo de 2 casas ("6,30") | `category-editor.tsx:312` `value={percentFieldText(row.percent, focusedRow === i)}`; linha inalterada na faixa e coberta por testes unit existentes (440 verdes) | ✅ PASS (comportamento preexistente, não alterado) |
| ALOC AC6 Rebalancear | Botão "Rebalancear" no lugar de "Aplicar" | `src/components/adjust-sum-bar.tsx:59` `Rebalancear`; `:56` `disabled={selected === null}`, `:57` `onApply(selected)` inalterados; sem "Aplicar" no arquivo | ✅ PASS |
| ALOC AC7 lixeira categoria | `Trash2Icon`, `aria-label` "Remover categoria N", destrutivo em hover e foco, sem texto "Remover" na linha | `category-editor.tsx:345` `aria-label={`Remover categoria ${i + 1}`}`, `:347` `hover:text-destructive group-hover/row:text-destructive ... group-focus-within/row:text-destructive`, `:349` `<Trash2Icon aria-hidden .../>`. O "Remover" de `:427` é o botão do diálogo de confirmação, fora da linha | ✅ PASS |
| ALOC AC8 lixeira subcategoria | `Trash2Icon`, `aria-label` existente, destrutivo em hover e foco, sem texto "Remover" | `src/components/subcategory-editor.tsx:95` `aria-label={`Remover subcategoria ${j + 1} da ${label}`}`, `:97` `hover:text-destructive ... focus-visible:text-destructive`, `:99` `<Trash2Icon aria-hidden className="size-4" />`; sem texto "Remover" no arquivo | ✅ PASS |
| ALOC AC9 Salvar desabilitado | Desabilitado com soma ≠ 100%, com as classes `opacity-50` e `cursor-not-allowed` | `category-editor.tsx:396` `disabled={!sumOk || pending}`, `:397` `className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"` (era `disabled:opacity-40`) | ⚠️ Spec-precision gap (as classes existem só como variantes `disabled:`; ver Gaps) |
| ALOC AC10 Salvar habilitado | Habilitado sem `opacity-50` com soma = 100% e sem save pendente | `category-editor.tsx:396` (`!sumOk || pending`) combinado com `disabled:` na `:397`: sem o atributo `disabled` o `opacity-50` não se aplica | ✅ PASS |

### P1: Tela Ápice

| Criterion | Spec-defined outcome | `file:line` + exact text | Result |
| --------- | -------------------- | ------------------------ | ------ |
| APICE AC1 título e descrição | "Ápice" e a descrição exata do spec | `liberdade/page.tsx:20` `title="Ápice"`; `:22-25` JSX multilinha cujo texto, com os espaços colapsados, é "Defina a renda mensal que quer ter, o patrimônio acumulado e a idade do seu ápice patrimonial. A meta é o patrimônio que gera essa renda, sem consumir o principal, na taxa esperada escolhida: a base da sua independência financeira." (idêntico ao spec) | ✅ PASS |
| APICE AC2 indicadores | Meta Patrimonial, Patrimônio Acumulado, Aporte Estratégico Mensal, Distância do Alvo, Tempo até o Ápice | `src/components/goal-hero.tsx:36` `Meta Patrimonial`, `:48` `Patrimônio Acumulado`, `:58` `Aporte Estratégico Mensal`, `:66` `Distância do Alvo`, `:70` `Tempo até o Ápice`; "Progresso" `:52` mantido | ✅ PASS |
| APICE AC3 gráfico | "Trajetória dos Juros Compostos" no título visível e no `aria-label` | `src/components/goal-chart.tsx:84` `<span ...>Trajetória dos Juros Compostos</span>`; `:80` `aria-label={`Trajetória dos Juros Compostos: alvo ...`}` | ✅ PASS (ver Observações sobre o `sr-only` `:162`) |
| APICE AC4 botão | "Calibrar Parâmetros" | `src/components/goal-form.tsx:93` `Calibrar Parâmetros` | ✅ PASS |
| APICE AC5 data | Rótulo "Data de nascimento", placeholder "DD/MM/AAAA", máscara | `goal-form.tsx:128` `Data de nascimento`, `:132` `placeholder="DD/MM/AAAA"`, `:135` `maskDateInput(e.target.value)` (inalterados na faixa) | ✅ PASS |
| APICE AC6 mensagem inválida | "Data de nascimento inválida" | `src/lib/validation/goal.ts:60` `fail("birthDate", "Data de nascimento inválida")`, coberto por `src/lib/validation/goal.test.ts:76` `toBe("Data de nascimento inválida")` e `src/actions/goals.int.test.ts:72` (verdes) | ✅ PASS |
| APICE AC7 valores inalterados | Nenhum valor, cálculo, campo salvo ou preview muda | `git diff 06650f6..01e32f3` de `goal-hero.tsx`, `goal-chart.tsx` e `goal-form.tsx` só tem linhas de rótulo e comentário; `src/lib`, `src/actions` e `src/db` sem diff | ✅ PASS |

### P2: Modal de lançamentos

| Criterion | Spec-defined outcome | `file:line` + exact text | Result |
| --------- | -------------------- | ------------------------ | ------ |
| LANC AC1 criar | Título do diálogo e `aria-label` do formulário "Registrar Lançamento" | `src/components/new-transaction-button.tsx:43` `<DialogTitle>Registrar Lançamento</DialogTitle>`; `src/components/transaction-form.tsx:149` `aria-label={transaction ? "Editar Lançamento" : "Registrar Lançamento"}`; botão flutuante `new-transaction-button.tsx:35` mantém `aria-label="Nova transação"` | ✅ PASS |
| LANC AC2 editar | "Editar Lançamento" no título e no `aria-label` | `src/components/transaction-list.tsx:157` `<DialogTitle>Editar Lançamento</DialogTitle>`; `transaction-form.tsx:149` | ✅ PASS |
| LANC AC3 tipo | "Saída de Caixa" (`expense`, destrutivo) e "Entrada de Capital" (`income`, success) | `src/components/kind-toggle.tsx:10` `{ kind: "expense", label: "Saída de Caixa", checked: "...bg-destructive/15 ...text-destructive" }`, `:11` `{ kind: "income", label: "Entrada de Capital", checked: "...bg-success/15 ...text-success" }`; `:18` `aria-label="Tipo"` | ✅ PASS |
| LANC AC4 Cancelar | "Cancelar" no rodapé em criar e editar, fecha sem salvar | `transaction-form.tsx:355-358` `{onCancel && <Button ... onClick={onCancel}>Cancelar`; criar `new-transaction-button.tsx:49` `onCancel={() => setOpen(false)}`; editar `transaction-list.tsx:180` `onCancel={() => setEditing(null)}` | ✅ PASS |
| LANC AC5 Excluir lançamento | Botão destrutivo "Excluir lançamento" no lugar de "Excluir" na edição | `transaction-form.tsx:344-353` `{onDelete && <Button variant="destructive" ...>Excluir lançamento`; `transaction-list.tsx:181-184` passa `onDelete` | ✅ PASS |
| LANC AC6 fluxo de exclusão | Aciona o fluxo existente de exclusão com confirmação | `transaction-list.tsx:181-184` `onDelete={() => { setDeleteError(null); setDeleting(editing); }}`; diálogo de confirmação `:195-196,213` inalterado (o texto "Excluir" da confirmação e o da lista permanecem) | ✅ PASS |
| LANC AC7 sem Excluir ao criar | Nenhum "Excluir lançamento" ao criar | `new-transaction-button.tsx:46-50` `TransactionForm` sem `onDelete`; `transaction-form.tsx:344` condicional | ✅ PASS |

**Status**: ⚠️ Todos os 45 ACs têm evidência `file:line` e batem com o texto esperado (um AC com spec-precision gap, ALOC AC9). Sem AC descoberto.

---

## Edge Cases

- [x] Viewport abaixo de `md`: o `Logo` fica no mesmo `<aside>` da barra superior, junto de `ThemeToggle` e "Sair" (`src/app/(app)/layout.tsx:15-26`), com `ml-auto` empurrando o grupo à direita. A ausência de overflow não foi medida em navegador (sem e2e, AD-005).
- [x] `Sora` ainda não carregada: o `Logo` usa a classe `font-display` (`Logo.tsx:40`), cujo token já tem a cadeia de fontes sans-serif do projeto; `min-w-0` em `Logo.tsx:39`.
- [x] Nome de categoria vazio em `AdjustSumBar`: não há diff na lógica do rótulo "Categoria N" em `adjust-sum-bar.tsx` (só `:59`, `:18`).
- [x] Sem objetivo salvo, o formulário abre e não há indicadores: `goal-form.tsx` e `liberdade/page.tsx` sem mudança de lógica na faixa.
- [x] "Rebalancear" faz o mesmo ajuste que "Aplicar": `adjust-sum-bar.tsx:56-57` (`onApply`, `disabled`) inalterados.

---

## Gate Check

Rodado em worktree temporário em `01e32f3`, Node 20.20.2, `node_modules` do repositório principal.

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` (Build gate do tasks.md)
- `npm run typecheck`: exit 0
- `npm run lint`: exit 0
- `npm run build`: exit 0 (rotas: `/`, `/categorias`, `/design-system`, `/liberdade`, `/login`, `/icon.svg`)
- `npm run test:unit`: exit 0, **440 passed, 0 failed** (15 arquivos)
- `npm run test:int` (`DATABASE_URL` do banco privado `orcamento_vertice_test`): exit 0, **279 passed, 0 failed** (13 arquivos)
- **Test count before feature**: 440 unit + 279 int (baseline informado)
- **Test count after feature**: 440 unit + 279 int
- **Delta**: 0 (nenhum teste removido ou enfraquecido; a feature não altera nenhum `*.test.ts`)
- **Skipped tests**: nenhum
- **Failures**: nenhum

Notas de ambiente (não são falhas da feature):
- O primeiro `test:int` falhou (108 testes, violação de chave estrangeira em `account`) porque o `.env.test` copiado para o worktree aponta para `orcamento_test` e o `vitest.config.ts` (`loadEnv("test", ...)`) o usa em vez da `DATABASE_URL` do ambiente, colidindo com outra sessão. Depois de apontar o `.env.test` do worktree (cópia descartável) para o banco privado, o resultado foi 279/279. O `.env.test` do tree principal não foi tocado.
- O primeiro `build` falhou porque o Turbopack rejeita `node_modules` como symlink que sai da raiz do worktree; com `node_modules` replicado por hardlinks (`cp -al`) o build passou. Limitação do ambiente de verificação, não da feature.
- `npm run e2e` não foi rodado (AD-005).

---

## Discrimination Sensor

**Sensor não aplicável: UI sem testes automatizados.**

A feature só troca rótulos, metadata e um componente visual; o tasks.md declara `none` para UI e para e2e, e `grep` por "Cockpit", "Alocação", "Rebalancear" e "Saída de Caixa" em `src/**/*.test.*` não encontra nenhum teste que asserte esses textos. Os testes que tocam código próximo da feature (`src/lib/validation/goal.test.ts:76`, `src/actions/goals.int.test.ts:72`, validação e domínio) cobrem lógica que a feature não altera (`src/lib`, `src/actions`, `src/db` sem diff), então uma mutação ali não discriminaria o código novo. Nenhuma mutação foi injetada; 0 de 0 sobreviventes.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| - | - | Nenhuma: sem testes automatizados sobre o código novo | n/a |

**Sensor depth**: não aplicável
**Result**: n/a (a prova dos ACs é textual: `file:line` + HTML do build)

Isolamento: o worktree `verify-wt` foi removido com `git worktree remove --force` e `git worktree prune` (`git worktree list` mostra só o tree principal). O Verifier não alterou nenhum arquivo do tree principal além deste relatório. Ver Warnings sobre o `git status --porcelain`.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Só o componente `Logo` é novo; sem abstração além dele |
| Surgical changes | ✅ A faixa só toca arquivos de rótulo, metadata, ícones e e2e; `src/lib`, `src/actions`, `src/db` intactos |
| No scope creep | ✅ Rotas, cálculos, validações e mensagens de erro mantidos |
| Matches patterns | ✅ Lixeira da subcategoria segue o padrão de `category-editor.tsx`; metadata como em `liberdade/page.tsx` |
| Spec-anchored outcome check (asserted values match spec) | ✅ Texto comparado caractere a caractere; um spec-precision gap (ALOC AC9) |
| Per-layer Coverage Expectation met | ✅ Matriz do tasks.md: domínio e integração mantêm a contagem (440/279); UI `none` |
| Every test maps to a spec requirement | ✅ Nenhum teste novo ou alterado em `src`; e2e atualizados sem rodar (AD-005) |
| Documented guidelines followed | AGENTS.md (docs do Next para metadata/ícone: convenção `icon.svg`, `title.template`), vitest.config.ts, tasks.md Test Coverage Matrix |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| BRAND-01 | Pending | ✅ Verified |
| BRAND-02 | Pending | ✅ Verified |
| BRAND-03 | Pending | ✅ Verified |
| BRAND-04 | Pending | ✅ Verified |
| BRAND-05 | Pending | ✅ Verified em `01e32f3` (⚠️ HEAD atual diverge, ver Warnings) |
| BRAND-06 | Pending | ✅ Verified |
| NAV-01 | Pending | ✅ Verified em `01e32f3` (⚠️ HEAD atual diverge, ver Warnings) |
| ALOC-01 a ALOC-05 | Pending | ✅ Verified |
| ALOC-06 | Pending | ✅ Verified (⚠️ spec-precision gap em AC9) |
| APICE-01 a APICE-06 | Pending | ✅ Verified |
| LANC-01 a LANC-04 | Pending | ✅ Verified |

(O Verifier não edita `spec.md`; a tabela é a atualização recomendada ao orquestrador.)

---

## Warnings (fora da feature)

1. **HEAD atual diverge de NAV-01 / BRAND-05 (AC7)** por causa do commit `e8b8762` ("wip", outra sessão), que fica à frente de `01e32f3`:
   - `src/components/app-nav.tsx:9` `label: "Visão Geral"` (spec: "Cockpit")
   - `src/app/(app)/page.tsx:28` `metadata = { title: "Visão Geral" }` (spec: "Vértice • Cockpit")
   - `src/app/(app)/page.tsx:85` `title="Visão Geral"` (spec: "Cockpit")
   Não é falha da feature: o veredito vale para `01e32f3`. Quem manteve `e8b8762` deve decidir se atualiza o spec ou reverte o rótulo; enquanto isso, o spec e o HEAD não batem.
2. **`git status --porcelain` do tree principal mudou durante a verificação**: no início era ` M docs/backlog.md`; no fim apareceram também ` M .specs/features/liberdade-layout/design.md`, ` M .specs/features/liberdade-layout/spec.md` e `?? .specs/features/liberdade-layout/tasks.md`. O Verifier só operou no worktree em `/tmp` (removido) e não tocou esses arquivos; são de outra sessão em paralelo, junto com `docs/backlog.md`.

## Spec-precision gaps

1. **ALOC AC9** ("carry the classes `opacity-50` and `cursor-not-allowed`"): o spec não diz se são classes literais ou variantes condicionais. A implementação usa `disabled:cursor-not-allowed disabled:opacity-50` (`category-editor.tsx:397`); o efeito visual atende e o `Button` base já tem `disabled:opacity-50` (`src/components/ui/button.tsx:7`), mas um teste que procure a classe literal `opacity-50` no botão desabilitado não a encontraria. Refinar o spec ou aceitar a forma `disabled:`.
2. **BRAND AC4 / Edge Cases** ("legível", "compact", "sem overflow"): sem medida objetiva (contraste, largura), e sem e2e ou teste de componente; provado só pelos tokens usados no código.

## Observações

- `src/components/goal-chart.tsx:162` mantém `<caption>Evolução do patrimônio por idade</caption>` na tabela `sr-only`. O AC3 do Ápice fala só do título visível e do `aria-label`, então não é violação; mas um leitor de tela ainda lê "Evolução do patrimônio" na tabela. Sugestão de acabamento, não bloqueia.
- `src/app/(app)/page.tsx:77` usa `WalletIcon` como ícone de um card do Cockpit. Não é o tile da marca (AC2 trata só do shell); fica como está.
- O `Logo` é um único elemento no `<aside>`, que a CSS reposiciona de barra superior (mobile) para sidebar (`md+`); AC2 pede os dois posicionamentos e ambos são atendidos assim.
- As páginas logadas são dinâmicas (`ƒ`), então os títulos de Cockpit, Alocação e Ápice foram provados pelo `metadata` de cada página mais o `title.template` da raiz (`layout.tsx:25`), confirmado no HTML do `/login`; não há HTML estático dessas rotas.

---

## Summary

**Overall**: ✅ Ready (para `01e32f3`), com 2 spec-precision gaps e 1 aviso de divergência do HEAD

**Spec-anchored check**: 44/45 ACs bateram com o resultado do spec; 1 spec-precision gap (ALOC AC9)
**Sensor**: não aplicável (UI sem testes automatizados); 0 mutações
**Gate**: typecheck, lint e build exit 0; 440 unit e 279 int passaram, 0 falhas

**What works**: marca, favicon, metadata e títulos de aba; navegação; Alocação; Ápice; modal de lançamento; e2e atualizados; nenhum arquivo de `src/lib`, `src/actions` ou `src/db` alterado; `grep "Orçamento" src` vazio.

**Issues found**: nenhum que reprove a feature. Avisos: `e8b8762` renomeou "Cockpit" para "Visão Geral" no HEAD (`app-nav.tsx:9`, `(app)/page.tsx:28,85`).

**Next steps**: decidir, fora desta feature, se o HEAD volta a "Cockpit" ou o spec acompanha "Visão Geral"; opcionalmente trocar o caption `sr-only` do gráfico.
