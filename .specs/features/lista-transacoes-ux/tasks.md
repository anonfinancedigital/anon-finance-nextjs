# Lista de Transações: Filtros e Ações Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/lista-transacoes-ux/design.md`
**Status**: Draft

**Dívida registrada (AD-005):** `e2e/transaction-list.spec.ts:37,45` clica "Editar" e "Excluir" direto na linha e vai quebrar com o menu "⋯". Como o e2e está suspenso, o spec não é ajustado aqui (mesmo tratamento de `lancamento-flutuante`). Reativar o e2e exige abrir o menu "Ações do lançamento" antes de cada ação e escopar "Nova transação" (cabeçalho do bloco × `.fixed`).

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (consultar `node_modules/next/dist/docs/` antes de codar), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso, sem teste de componente). Esta feature só muda apresentação: não há lógica pura nem action nova para testar.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| UI / componentes (`src/components/*`, `src/components/ui/*`) | none | - (build gate; critérios de layout e menu verificados no navegador na task T7) | - | build gate only |
| Páginas (`src/app/*`) | none | - (build gate; verificação no navegador na task T7) | - | build gate only |
| Validação, domínio, actions, repositórios | none | Não tocados por esta feature; os testes existentes seguem como regressão | `src/**/*.test.ts`, `src/**/*.int.test.ts` | `npm run test:unit` / `npm run test:int` |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (PATH com o Node 20 do nvm). Integração exige `npm run db:up` e `DATABASE_URL` apontando para um banco `*_test` próprio da sessão.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Não usado nesta feature (sem testes unitários novos) | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Não usado nesta feature | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Todas as tasks (só UI) | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também. As três fases são independentes entre si em conteúdo.

### Phase 1: Menu de ações por linha

```
T1 → T2 → T3
```

### Phase 2: Filtros em uma linha

```
T4
```

### Phase 3: Botão "Nova transação" no cabeçalho

```
T5 → T6 → T7
```

---

## Task Breakdown

### T1: Criar o wrapper de DropdownMenu

**What**: Wrapper shadcn-style de `DropdownMenu` da `radix-ui` com `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent` e `DropdownMenuItem` (com `variant="destructive"`).
**Where**: `src/components/ui/dropdown-menu.tsx`
**Depends on**: None
**Reuses**: classes do popover em `src/components/ui/select.tsx:72`; convenção `data-slot` dos demais `ui/*`
**Requirement**: LISTA-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Exporta os quatro componentes, importando `DropdownMenu` de `radix-ui` (sem dependência nova no `package.json`)
- [x] `DropdownMenuContent` usa o mesmo visual do `SelectContent` (`rounded-xl border bg-popover shadow-xl`, animações) e `collisionPadding` para não sair da tela
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Contagem de testes unit e int igual à de antes (nenhum teste removido)

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add dropdown menu component`

---

### T2: Criar o menu de ações da linha

**What**: Componente `TransactionRowMenu({ onEdit, onDelete })` com botão "⋯" e itens "Editar" e "Excluir".
**Where**: `src/components/transaction-row-menu.tsx`
**Depends on**: T1
**Reuses**: `Button` (`ghost`, `icon-sm`) de `src/components/ui/button.tsx`; `EllipsisIcon` do `lucide-react`; `ui/dropdown-menu` (T1)
**Requirement**: LISTA-03, LISTA-04, LISTA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O gatilho tem `aria-label="Ações do lançamento"` e mostra o ícone "⋯"
- [x] O menu tem exatamente dois itens: "Editar" (chama `onEdit`) e "Excluir" (chama `onDelete`, tom destrutivo)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Contagem de testes unit e int igual à de antes

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add row actions menu component`

---

### T3: Usar o menu de ações na lista de transações

**What**: Trocar os botões soltos "Editar" e "Excluir" de cada linha pelo `TransactionRowMenu`.
**Where**: `src/components/transaction-list.tsx` (modify)
**Depends on**: T2
**Reuses**: estado `editing`/`deleting`/`deleteError` e os `Dialog` já existentes no componente
**Requirement**: LISTA-03, LISTA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A linha não renderiza mais "Editar" nem "Excluir" como botões visíveis
- [x] `onEdit` chama `setEditing(t)`; `onDelete` chama `setDeleteError(null)` e `setDeleting(t)`; os diálogos de edição e exclusão continuam fora da linha, sem alteração
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Contagem de testes unit e int igual à de antes

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): replace row buttons with an actions menu`

---

### T4: Colocar busca e filtros na mesma linha no desktop

**What**: Grid dos filtros em uma linha a partir de 768px e empilhado abaixo disso.
**Where**: `src/components/transaction-filter.tsx` (modify)
**Depends on**: None
**Reuses**: lógica de `apply`, debounce e rótulos atuais, sem mudança
**Requirement**: LISTA-01, LISTA-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O container usa `grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]` e o campo de busca perde o `sm:col-span-2`
- [ ] Rótulos "Buscar por descrição", "Filtrar por categoria" e "Filtrar por subcategoria" intactos; nenhuma mudança em `apply`, `onSearch` ou nos parâmetros de URL
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit e int igual à de antes

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): lay out the list filters on one row on desktop`

---

### T5: Adicionar o slot de ação ao ContentCard

**What**: Prop opcional `action?: ReactNode` no cabeçalho do `ContentCard`, ao lado do `note`.
**Where**: `src/components/content-card.tsx` (modify)
**Depends on**: None
**Reuses**: estrutura atual do `header`
**Requirement**: LISTA-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `note` e `action` ficam agrupados em um `div flex items-center gap-3` à direita do título
- [ ] Sem `action`, o cabeçalho renderiza igual ao atual (os demais usos de `ContentCard` não mudam)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit e int igual à de antes

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add an action slot to the content card header`

---

### T6: Adicionar a variante de cabeçalho ao NewTransactionButton

**What**: Prop `variant?: "floating" | "header"` (padrão `"floating"`); a variante `header` é um botão primário "Nova transação" com ícone "+", visível só a partir de 768px.
**Where**: `src/components/new-transaction-button.tsx` (modify)
**Depends on**: T5
**Reuses**: `Dialog`, `TransactionForm` e o botão flutuante atuais
**Requirement**: LISTA-06, LISTA-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `floating` mantém o botão atual (aria-label "Nova transação", fixo no canto) sem mudança visual e sem restrição de largura
- [ ] `header` renderiza `Button` com `hidden md:inline-flex`, `PlusIcon` e o texto visível "Nova transação"
- [ ] As duas variantes abrem o mesmo modal "Registrar Lançamento", com formulário em branco, e fecham ao salvar ou cancelar
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit e int igual à de antes

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): add a header variant to the new transaction button`

---

### T7: Ligar o botão do cabeçalho na página Resumo e verificar no navegador

**What**: Passar o botão `header` em `ContentCard action` de "Transações do mês" e verificar a feature inteira (LISTA-01 a 07) no navegador a 390px e 1280px.
**Where**: `src/app/(app)/page.tsx` (modify)
**Depends on**: T6
**Reuses**: `todayInSaoPaulo()` e `activeCategories` já presentes na página
**Requirement**: LISTA-06, LISTA-07

**Tools**:

- MCP: NONE
- Skill: `run`

**Done when**:

- [ ] `ContentCard` "Transações do mês" recebe `action={<NewTransactionButton variant="header" categories={activeCategories} defaultDate={todayInSaoPaulo()} />}`; o botão flutuante segue no fim da página
- [ ] A 1280px: busca, categoria e subcategoria na mesma linha; "Nova transação" no cabeçalho do bloco e "+" flutuante visíveis; os dois abrem o mesmo modal
- [ ] A 390px: filtros empilhados; só o "+" flutuante aparece
- [ ] Menu "⋯": abre com Editar e Excluir; Editar abre "Editar Lançamento"; Excluir abre a confirmação sem apagar; Esc fecha o menu; a página segue clicável depois de fechar cada diálogo; o menu da última linha fica dentro da tela
- [ ] Lista vazia a 1280px ainda mostra o botão "Nova transação" do cabeçalho
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Contagem de testes unit e int igual à de antes

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions): show the new transaction button in the list header`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4
Phase 3:  T5 ------→ T6 ------→ T7
```

T7 verifica a feature inteira, então só roda com as fases 1 e 2 (T3 e T4) já concluídas. Sete tarefas cabem em um único lote: execução inline, sem sub-agentes.
