# Categorias: Melhorias de UX/UI Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/categorias-ux/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (só exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso), AD-008 (UI sem teste automático). Não há teste de componente no projeto. Strong defaults aplicados à lógica de domínio.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| UI / componentes (`src/components/*`) | none | - (sem teste de componente; e2e suspenso, AD-005) | - | build gate only |
| e2e (`e2e/*.spec.ts`) | none | - (ajuste de spec existente, não roda, AD-005) | - | typecheck apenas |

## Gate Check Commands

> Do `package.json`. Usar Node 20 (`PATH` com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Regras de domínio

```
T1 → T2
```

### Phase 2: Componentes novos

Seta vinda da fase 1 marca dependência já concluída.

```
T3
T4
T2 → T5
```

### Phase 3: Integração no editor (P1, P2, P3)

Todas as tasks alteram `category-editor.tsx` (exceto T9, `category-card.tsx`), então rodam em ordem. Setas vindas de fases anteriores marcam dependências já concluídas.

```
T1 → T6 → T7 → T8
T3 → T6
T4 → T7
T5 → T7
T9 → T10
T8 → T10
```

### Phase 4: e2e

```
T10 → T11
```

---

## Task Breakdown

### T1: Criar formatação a 2 casas e rótulo da soma

**What**: Funções `formatPercentFixed`, `percentFieldText`, `sumLabel` e `defaultAdjustIndex` com testes.
**Where**: `src/lib/domain/percent.ts`
**Depends on**: None
**Reuses**: `formatPercent`, `parsePercent`, `TOTAL_MICRO`
**Requirement**: CATUX-01, CATUX-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `formatPercentFixed(6_303_138)` = "6,30", `formatPercentFixed(30_000_000)` = "30,00", `formatPercentFixed(4_999)` = "0,00", `formatPercentFixed(5_000)` = "0,01"
- [x] `percentFieldText("6,303138", false)` = "6,30"; com foco `true` devolve "6,303138"; texto vazio e inválido ("abc") devolvem o texto sem alteração
- [x] `sumLabel(100_005_248)` = "100,01%"; `sumLabel(99_999_999)` = "99,999999%"; `sumLabel(100_000_000)` = "100,00%"; `sumLabel(99_000_000)` = "99,00%"
- [x] `defaultAdjustIndex([null, 10_000_000, 30_000_000, 30_000_000])` = 2 (primeiro em empate); `defaultAdjustIndex([null])` = null
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `percent.test.ts` passam e nenhum existente é removido

**Tests**: unit
**Gate**: quick

**Status**: ✅ Complete

**Commit**: `feat(percent): add fixed two-decimal formatting and sum label`

---

### T2: Criar texto do aviso de soma

**What**: Função `sumWarning` que monta `A soma deve ser 100%. Atual: <soma> (<+|->R$ <dif>)` com testes.
**Where**: `src/lib/domain/sum-warning.ts`
**Depends on**: T1
**Reuses**: `allocateCents`, `formatBRL`, `sumLabel`
**Requirement**: CATUX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `sumWarning(100_005_248, 1_905_400)` = "A soma deve ser 100%. Atual: 100,01% (+R$ 1,00)" com espaço comum, não U+00A0
- [x] `sumWarning(99_994_752, 1_905_400)` = "A soma deve ser 100%. Atual: 99,99% (-R$ 1,00)"
- [x] `sumWarning(100_005_248, null)` = "A soma deve ser 100%. Atual: 100,01%"
- [x] Diferença que arredonda para R$ 0,00 (ex.: soma 100_000_001 com receita 100) omite o trecho entre parênteses
- [x] Soma 99_999_999 usa "99,999999%" no texto (herdado de `sumLabel`)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: testes novos em `sum-warning.test.ts` passam

**Tests**: unit
**Gate**: quick

**Status**: ✅ Complete

**Commit**: `feat(percent): add sum warning text`

---

### T3: Criar InputAffix

**What**: Componente que envolve um `Input` com "%" à direita ou "R$" à esquerda.
**Where**: `src/components/input-affix.tsx`
**Depends on**: None
**Reuses**: `Input` (`src/components/ui/input.tsx`), tokens `text-muted-foreground`
**Requirement**: CATUX-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Aceita `prefix` ou `suffix` e renderiza o texto com `aria-hidden` e `pointer-events-none`
- [ ] O filho recebe espaço interno via padding para o símbolo não cobrir o texto
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add input affix component`

---

### T4: Criar ReferenceIncomeCard

**What**: Card "Base de cálculo mensal: R$ X" com "Editar base", ou campo em edição.
**Where**: `src/components/reference-income-card.tsx`
**Depends on**: None
**Reuses**: `parseBRL`, `formatBRL`, `Input`, `Label`, `Button`
**Requirement**: CATUX-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com valor válido e fora de edição mostra `Base de cálculo mensal: <formatBRL>` e o botão "Editar base", sem o campo
- [ ] "Editar base" mostra o campo `reference-income` com label "Receita de referência (R$)", texto atual e foco
- [ ] Enter ou blur com texto vazio ou válido volta ao card (vazio volta ao campo vazio, sem card)
- [ ] Texto inválido mantém o campo aberto e mostra o erro de `parseBRL`
- [ ] Valor vazio mostra o campo com placeholder "5.000,00"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add reference income card`

---

### T5: Criar AdjustSumBar

**What**: Aviso de soma com select de categoria e botão "Aplicar".
**Where**: `src/components/adjust-sum-bar.tsx`
**Depends on**: T2
**Reuses**: `sumWarning`, `defaultAdjustIndex`, `SelectField`, `Button`
**Requirement**: CATUX-02, CATUX-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mostra o texto de `sumWarning` e, abaixo ou ao lado, o rótulo "Descontar a diferença em" (soma acima de 100%) ou "Acrescentar a diferença em" (abaixo), o select e "Aplicar"
- [ ] O select lista todas as categorias (nome ou "Categoria N") e abre no maior percentual válido; escolha para linha que sumiu cai no padrão
- [ ] "Aplicar" chama `onApply(índice)`; `error` aparece com `role="alert"`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add adjust sum bar`

---

### T6: Exibir percentual a 2 casas com sufixo e prefixo no editor

**What**: Campos de percentual e valor usam `InputAffix`; percentual sem foco usa `percentFieldText`; rodapé usa `sumLabel`.
**Where**: `src/components/category-editor.tsx` (modify)
**Depends on**: T1, T3
**Reuses**: `percentFieldText`, `sumLabel`, `InputAffix`
**Requirement**: CATUX-01, CATUX-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Campo sem foco mostra "6,30"; com foco mostra o texto completo; sair do foco não altera `row.percent`
- [ ] Texto inválido ou vazio aparece como digitado
- [ ] "%" fixo no campo de percentual e "R$" fixo no campo de valor, sem placeholders "%" e "R$"; `aria-label` iguais aos atuais
- [ ] Rodapé "Soma" mostra `sumLabel(sumMicro)`
- [ ] Valor enviado a `saveCategories` continua com o texto completo da linha
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): show percentages with two decimals and unit affixes`

---

### T7: Trocar "Ajustar" por AdjustSumBar e usar o card da base

**What**: Remove o botão "Ajustar" por linha e a mensagem antiga de soma; renderiza `AdjustSumBar` e `ReferenceIncomeCard`.
**Where**: `src/components/category-editor.tsx` (modify)
**Depends on**: T4, T5, T6
**Reuses**: `adjust`, `adjustError`, `adjustToTotal`
**Requirement**: CATUX-02, CATUX-03, CATUX-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma linha tem botão "Ajustar"
- [ ] Com soma ≠ 100% aparece `AdjustSumBar` com o aviso, select e "Aplicar"; com soma 100% nada disso aparece
- [ ] "Aplicar" fecha a soma em exatamente 100% na categoria escolhida; fora do intervalo mostra a mensagem existente e mantém os percentuais
- [ ] Editar qualquer campo remove a mensagem de ajuste
- [ ] A base de cálculo aparece como `ReferenceIncomeCard` ligado ao estado `income`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): replace per-row adjust with actionable sum bar`

---

### T8: Lixeira com confirmação e Salvar bloqueado

**What**: Ação de remover vira ícone `Trash2` com diálogo de confirmação para categorias com subcategorias; Salvar desabilitado ganha opacidade 40% e cursor `not-allowed`.
**Where**: `src/components/category-editor.tsx` (modify)
**Depends on**: T7
**Reuses**: `Dialog*`, `subcategoryCountLabel`, `categoryDisplayName`
**Requirement**: CATUX-04, CATUX-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão `size-4` com `aria-label` "Remover categoria N", opacidade 40% e 100% com cor destrutiva no hover ou foco da linha (`group/row`)
- [ ] Categoria com 1+ subcategorias abre o diálogo "Remover categoria?" com o texto da spec ("suas N subcategorias", "sua 1 subcategoria") e botões "Cancelar" e "Remover"
- [ ] "Remover" no diálogo remove a linha; "Cancelar" ou fechar mantém tudo
- [ ] Categoria sem subcategorias remove na hora
- [ ] Salvar desabilitado mostra opacidade 40% e `cursor-not-allowed`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): confirm removal and style the disabled save button`

---

### T9: Fixar a largura do botão de subcategorias

**What**: O botão de contagem e chevron do `CategoryCard` ganha largura fixa para alinhar com o cabeçalho.
**Where**: `src/components/category-card.tsx` (modify)
**Depends on**: None
**Reuses**: Classes do botão atual
**Requirement**: CATUX-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O botão com `controls` tem largura fixa `w-32` com contagem à esquerda e chevron à direita
- [ ] O modo sem `controls` (cabeçalho inteiro como botão) não muda
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `refactor(categories): give the subcategory toggle a fixed width`

---

### T10: Linha de cabeçalhos das colunas

**What**: Cabeçalho "CATEGORIA, % DO TOTAL, VALOR ESTIMADO, SUBCATEGORIAS, AÇÕES" acima da lista, visível a partir de `sm`, com larguras iguais às das colunas.
**Where**: `src/components/category-editor.tsx` (modify)
**Depends on**: T8, T9
**Reuses**: Larguras compartilhadas em constantes do arquivo
**Requirement**: CATUX-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cabeçalho `hidden sm:flex` com os cinco títulos em texto pequeno e discreto
- [ ] Larguras do percentual, valor, subcategorias e ações vêm de constantes usadas também nas linhas
- [ ] Conferência manual em 640, 1024 e 1440px: títulos alinhados às colunas
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(categories): add column header row`

---

### T11: Ajustar o e2e de categorias ao novo fluxo

**What**: Atualizar `e2e/categories.spec.ts` para a mensagem de soma, o card da base, o "Aplicar" e a confirmação de remoção. Não roda (AD-005).
**Where**: `e2e/categories.spec.ts` (modify)
**Depends on**: T10
**Reuses**: Helpers atuais de `e2e/helpers.ts`
**Requirement**: CATUX-02, CATUX-03, CATUX-04, CATUX-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma referência ao texto antigo "A soma dos percentuais deve ser 100% (atual: ...)" nem ao botão "Ajustar"
- [ ] Testes que preenchem a receita passam pelo "Editar base" quando o card está visível
- [ ] Remover categoria com subcategorias confirma no diálogo
- [ ] `npm run typecheck` passa e `npx playwright test --list` lista os testes sem erro de sintaxe

**Tests**: none
**Gate**: build

**Commit**: `test(e2e): update categories spec for the new editor flow`

---

## Phase Execution Map

Fases em sequência; as dependências por task estão nos diagramas de cada fase acima.

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 4 funções coesas em `percent.ts` | ✅ Granular (cohesive) |
| T2 | 1 função | ✅ Granular |
| T3-T5 | 1 componente cada | ✅ Granular |
| T6-T8, T10 | 1 arquivo, 1 preocupação cada | ✅ Granular |
| T9 | 1 arquivo, 1 classe | ✅ Granular |
| T11 | 1 arquivo de spec | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | - | ✅ Match |
| T4 | None | - | ✅ Match |
| T5 | T2 | T2 → T5 | ✅ Match |
| T6 | T1, T3 | T1 → T6, T3 → T6 | ✅ Match |
| T7 | T4, T5, T6 | T4 → T7, T5 → T7, T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | None | - | ✅ Match |
| T10 | T8, T9 | T8 → T10, T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: formatação e rótulo | Domínio | unit | unit | ✅ OK |
| T2: aviso de soma | Domínio | unit | unit | ✅ OK |
| T3-T10: componentes e editor | UI / componentes | none | none | ✅ OK |
| T11: e2e | e2e | none | none | ✅ OK |

**Cobertura de requisitos:** CATUX-01 (T1, T6), CATUX-02 (T2, T5, T7), CATUX-03 (T1, T5, T7), CATUX-04 (T8), CATUX-05 (T8), CATUX-06 (T3, T6, T9, T10), CATUX-07 (T4, T7). Todos os 7 mapeados.
