# Visão Geral: Primeiros Passos e Estados Vazios Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/visao-geral-primeiros-passos/design.md`
**Status**: Draft

**Atenção ao working tree:** `src/components/summary-table.tsx`, `src/components/transaction-form.tsx`, `src/app/(app)/categorias/page.tsx` e `e2e/transaction-form.spec.ts` têm alterações não commitadas de outra feature. Nas tasks que tocam esses arquivos, rodar `git diff <arquivo>` antes e commitar só as hunks da task (`git add -p`).

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (consultar `node_modules/next/dist/docs/` antes de codar), `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso, sem teste de componente). Memória do projeto: Node 20 do nvm e banco de teste privado para `test:int`. Regras de decisão ficam em funções puras com unit; UI é verificada no gate de build e na verificação manual do Verifier.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*.ts`) | unit | Todos os ramos; 1:1 com os ACs VG-01..06 e VG-08/09/18 (partes puras); cada borda listada (virada de ano, dezembro/janeiro) | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Repositório (`src/lib/db/repos/*.ts`) | integration | Caminho principal + isolamento por usuário + usuário sem transações | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| UI / componentes (`src/components/*`) | none | - (build gate; regras de decisão já cobertas no domínio; UAT manual no Verifier) | - | build gate only |
| Páginas (`src/app/*`) | none | - (build gate; UAT manual no Verifier) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Prefixar com `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`. Integração com `DATABASE_URL` de um banco `*_test` privado.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks com unit apenas | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com integration | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Domínio e dados

```
T1 → T2 → T3
```

### Phase 2: Componentes novos e alterados

```
T4 → T5 → T6 → T7
```

### Phase 3: Integração nas telas

```
T8 → T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Mover `shift` para month.ts e criar nomes de mês pt-BR

**Status**: ✅ Done

**What**: Exportar `shiftMonth(m, delta)` (hoje `shift` privado em `month-picker.tsx`) e `monthNamesPtBR()` (12 nomes, `Janeiro`..`Dezembro`) em `month.ts`.
**Where**: `src/lib/domain/month.ts`
**Depends on**: None
**Reuses**: `shift` de `src/components/month-picker.tsx`
**Requirement**: VG-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `shiftMonth({2026,12}, 1)` → `{2027,1}`; `shiftMonth({2026,1}, -1)` → `{2025,12}`; delta 0 devolve o mesmo mês
- [x] `monthNamesPtBR()` tem 12 itens, primeiro `Janeiro`, último `Dezembro`
- [x] Testes novos em `month.test.ts`; gate quick passa: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Contagem de testes não diminui

**Tests**: unit
**Gate**: quick

**Commit**: `feat(month): export shiftMonth and pt-BR month names`

---

### T2: Criar as regras de onboarding e de estado do mês

**Status**: ✅ Done

**What**: `deriveSetup`, `deriveMonthState`, `previousMonth` e `monthLongName` conforme as interfaces do design.
**Where**: `src/lib/domain/onboarding.ts`
**Depends on**: T1
**Reuses**: `YearMonth` e `shiftMonth` de `src/lib/domain/month.ts`
**Requirement**: VG-01, VG-02, VG-03, VG-04, VG-05, VG-06, VG-07, VG-08, VG-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `deriveSetup({categories:0, transactions:0, hasGoal:false})` → 0 concluídos, `currentId: "categories"`, `complete: false`
- [x] Com `categories:2, transactions:0, hasGoal:false` → 1 concluído, `currentId: "transaction"`; com `categories:0, transactions:3, hasGoal:true` → 2 concluídos, `currentId: "categories"` (primeiro pendente)
- [x] Com `categories:1, transactions:1, hasGoal:true` → `complete: true`, `currentId: null`, `doneCount: 3`
- [x] Rótulos dos passos exatos: `Definir sua receita e categorias`, `Registrar sua primeira transação`, `Definir seu Ápice`
- [x] `deriveMonthState`: `{0,0}` → `first-access`; `{0,5}` → `empty-month`; `{3,5}` → `has-data`
- [x] `previousMonth({2026,1})` → `{2025,12}`; `monthLongName({2026,9})` → `setembro`
- [x] Gate quick passa: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Testes em `onboarding.test.ts` cobrem todos os ramos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(onboarding): add setup checklist and month state rules`

---

### T3: Adicionar `transactionsRepo.countAll`

**Status**: ✅ Done

**What**: Contagem de transações armazenadas do usuário, em qualquer mês.
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: T2
**Reuses**: `db`, `transaction`, filtro por `userId` das demais consultas
**Requirement**: VG-07, VG-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Usuário sem transações → `0`; com 3 transações em 2 meses diferentes → `3`
- [x] Transações de outro usuário não entram na contagem
- [x] Teste em `transactions.int.test.ts`; gate full passa (banco `*_test` privado): `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [x] Contagem de testes não diminui

**Tests**: integration
**Gate**: full

**Commit**: `feat(transactions): add countAll for onboarding state`

---

### T4: Extrair os cards de totais com estado neutro

**Status**: ✅ Done

**What**: Componente `SummaryCards` (Receita, Gasto, Saldo) com prop `empty`: cor neutra e legendas `Registre receitas para ver aqui`, `Registre gastos para ver aqui`, `Receitas menos gastos do mês`; cores atuais quando `empty` é falso.
**Where**: `src/components/summary-cards.tsx`
**Depends on**: None
**Reuses**: markup dos cards em `src/app/(app)/page.tsx:63-100`
**Requirement**: VG-13, VG-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `empty` verdadeiro: nenhuma das classes `text-income`, `text-destructive`, `text-link` no valor nem nos ícones; valor `R$ 0,00`; legenda visível
- [x] `empty` falso: cores idênticas às de hoje, Saldo vermelho se negativo
- [x] `data-testid` `total-income`, `total-spent`, `total-balance` preservados
- [x] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): extract summary cards with neutral empty state`

---

### T5: Dar ênfase configurável ao botão de nova transação

**Status**: ✅ Done

**What**: Prop `emphasis?: "primary" | "secondary"` (secundário = `outline`); FAB `md:hidden`; novo `variant: "inline"` com rótulo `Registrar transação`, visível em todas as larguras.
**Where**: `src/components/new-transaction-button.tsx`
**Depends on**: T4
**Reuses**: `Button` `variant="outline"`, diálogo atual do componente
**Requirement**: VG-10, VG-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem `emphasis`, o comportamento atual é mantido (preenchido)
- [x] `emphasis="secondary"` usa `outline` nos três formatos
- [x] FAB com `md:hidden`; formato `header` continua `hidden md:inline-flex`
- [x] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(transacao): add button emphasis and inline variant, FAB mobile only`

---

### T6: Criar o card "Comece por aqui"

**Status**: ✅ Done

**What**: Card com os 3 passos, check e texto `concluído` nos feitos, barra `role="progressbar"` (`aria-valuenow`, `aria-valuemax=3`, texto `{n} de 3 passos`) e botão primário só no passo atual (passo 1 → `/categorias`, 2 → `NewTransactionButton` inline, 3 → `/liberdade`).
**Where**: `src/components/getting-started-card.tsx`
**Depends on**: T5
**Reuses**: `deriveSetup` (T2), `Progress`, `NewTransactionButton` (T5), padrão de `src/components/allocation-progress.tsx`
**Requirement**: VG-01, VG-02, VG-03, VG-04, VG-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Renderiza `null` quando `setup.complete`
- [x] Exatamente um botão preenchido (o do `currentId`); passos concluídos sem botão e com `concluído` acessível
- [x] Barra com `aria-valuenow` igual a `doneCount`
- [x] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): add getting started checklist card`

---

### T7: Trocar o seletor de mês por um único controle pt-BR

**What**: Remover o `Input type="month"`; o nome do mês vira `PopoverTrigger` que abre grade de 12 meses com setas de ano; escolher navega e fecha; escolher o mês exibido só fecha; atualizar as 3 asserções de `e2e/month-picker.spec.ts`.
**Where**: `src/components/month-picker.tsx`
**Depends on**: T6
**Reuses**: `Popover`, `monthHref`, `shiftMonth` e `monthNamesPtBR` (T1)
**Requirement**: VG-17, VG-18, VG-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum `input[type=month]` no componente; `data-testid="month-label"` mantido no gatilho
- [ ] Grade mostra `Janeiro`..`Dezembro` e setas `Ano anterior` / `Próximo ano`
- [ ] Escolha navega para `?mes=AAAA-MM` preservando os demais parâmetros e fecha; escolha igual ao exibido não navega
- [ ] `e2e/month-picker.spec.ts` (linhas 14, 38, 53) reescrito para o novo seletor (o spec não é executado, AD-005)
- [ ] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): replace native month input with pt-BR picker`

---

### T8: Aceitar linha explicativa no `ContentCard`

**What**: Prop opcional `description` renderizada sob o título.
**Where**: `src/components/content-card.tsx`
**Depends on**: None
**Reuses**: estilo `text-muted-foreground` do `note`
**Requirement**: VG-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem `description`, a marcação atual não muda
- [ ] Com `description`, aparece como `<p>` abaixo do `<h2>`
- [ ] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add description to content card`

---

### T9: Estado vazio de "Gastos por categoria" sem botão preenchido

**What**: Com 0 categorias, o CTA vira `outline` e some quando `hideCta` for verdadeiro.
**Where**: `src/components/summary-table.tsx` (modify)
**Depends on**: T8
**Reuses**: `Button variant="outline"`
**Requirement**: VG-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Prop `hideCta?: boolean`; com 0 linhas e `hideCta` falso, botão `Crie sua primeira categoria` em `outline`; com `hideCta`, nada é renderizado
- [ ] `git diff` mostra só as hunks desta task commitadas (alterações pendentes de outra feature ficam fora)
- [ ] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): make empty category CTA secondary and hideable`

---

### T10: Linha explicativa e contador condicional em `CategoryOverview`

**What**: Com 0 categorias, `ContentCard` sem `note` e com `description` `Veja para onde vai seu dinheiro, comparado com o que você planejou.`; repassa `hideCta` ao `SummaryTable`.
**Where**: `src/components/category-overview.tsx`
**Depends on**: T9
**Reuses**: `description` (T8), `hideCta` (T9)
**Requirement**: VG-12, VG-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 0 categorias: sem texto `0 categorias`, com a linha explicativa exata
- [ ] 1+ categorias: nota `{n} categorias` como hoje
- [ ] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): explain empty category block and hide zero counter`

---

### T11: Estados vazios de "Transações do mês"

**What**: `TransactionList` recebe `emptyState`, `monthName` e `previousHref`; com 0 transações e sem filtro/busca renderiza o texto de primeiro acesso ou `Nenhuma transação em {mês}` com botões `Nova transação` e `Ver {mês anterior}`; ramo filtrado/busca continua prioritário.
**Where**: `src/components/transaction-list.tsx`
**Depends on**: T10
**Reuses**: `deriveMonthState` (T2), `NewTransactionButton`, `Link`
**Requirement**: VG-07, VG-08, VG-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `first-access`: `Todas as receitas e gastos do mês aparecem aqui.` e nenhum `Nenhuma transação neste mês`
- [ ] `empty-month`: título `Nenhuma transação em {mês}`, botão `Nova transação` e link `Ver {mês anterior}` apontando ao `previousHref`
- [ ] `filtered` ou `searching` mantêm as mensagens atuais
- [ ] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(transacoes): distinguish first access from empty month`

---

### T12: Compor a Visão Geral

**What**: `page.tsx` lê `countAll` e objetivo, deriva `setup` e `monthState`, renderiza `GettingStartedCard`, `SummaryCards`, filtros só com dados ou filtro/busca ativos, nota `{n} lançamentos` só com n > 0, `emphasis` secundária enquanto houver passo pendente e `hideCta` quando o card estiver visível.
**Where**: `src/app/(app)/page.tsx`
**Depends on**: T11
**Reuses**: `deriveSetup`/`deriveMonthState`/`previousMonth`/`monthLongName` (T2), `countAll` (T3), `goalsRepo.get`, componentes T4..T11
**Requirement**: VG-01, VG-04, VG-10, VG-13, VG-14, VG-15, VG-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Conta sem dados: card `0 de 3 passos`, um único botão preenchido, cards neutros, sem busca/filtros, sem `0 lançamentos`
- [ ] Conta com histórico vendo mês vazio: `Nenhuma transação em {mês}`, filtros ocultos
- [ ] Mês com transações: filtros visíveis, cards coloridos
- [ ] Filtro/busca ativos com 0 resultados: controles visíveis
- [ ] Gate build passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(resumo): wire getting started and empty states into overview`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10 -----→ T11 -----→ T12
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: shiftMonth e nomes | 2 funções, 1 arquivo | ✅ Granular |
| T2: regras de onboarding | 4 funções coesas, 1 arquivo | ✅ Granular |
| T3: countAll | 1 função | ✅ Granular |
| T4: SummaryCards | 1 componente | ✅ Granular |
| T5: ênfase do botão | 1 componente | ✅ Granular |
| T6: card de primeiros passos | 1 componente | ✅ Granular |
| T7: seletor de mês | 1 componente (+ 3 asserções do spec e2e) | ⚠️ Coeso |
| T8: description no ContentCard | 1 prop | ✅ Granular |
| T9: CTA do SummaryTable | 1 ramo | ✅ Granular |
| T10: CategoryOverview | 1 ramo | ✅ Granular |
| T11: TransactionList | 1 ramo vazio | ✅ Granular |
| T12: page.tsx | 1 página (composição) | ⚠️ Coeso |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None (Fase 1 concluída antes) | - | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | None (Fase 2 concluída antes) | - | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | Domínio | unit | unit | ✅ OK |
| T3 | Repositório | integration | integration | ✅ OK |
| T4..T11 | UI / componentes | none | none | ✅ OK |
| T12 | Páginas | none | none | ✅ OK |

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| VG-01..05 | T2, T6, T12 |
| VG-06 | T2 |
| VG-07..09 | T2, T3, T11 |
| VG-10, VG-11 | T5, T12 |
| VG-12 | T8, T9, T10 |
| VG-13, VG-14 | T4, T12 |
| VG-15 | T12 |
| VG-16 | T10, T12 |
| VG-17..19 | T1, T7 |
