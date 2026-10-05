# Resumo: Visões e Ritmo Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/resumo-visoes/spec.md`
**Diff range**: commits da feature `e9b0a36, 6183ac9, 64dd44a, a576457, 0c3795d, 474e68b, 6065c5b, cbb7388` (commits de `liberdade/freedom` intercalados foram ignorados). Arquivos: `src/lib/domain/spending-pace.ts`, `spending-pace.test.ts`, `src/components/{category-overview,spending-pace-chart,budget-charts}.tsx`, `src/app/(app)/page.tsx`.
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | Done | `e9b0a36`, 23 testes unitários |
| T2 | Done | `6183ac9` |
| T3 | Done | `64dd44a` |
| T4 | Done | `a576457` |
| T5 | Done | `0c3795d` |
| T6 | Done | `474e68b` |
| T7 | Done (mesclada na T6) | desvio registrado em tasks.md; justificado (typecheck quebraria) |
| T8 | Done | `cbb7388`; verificação manual registrada em tasks.md |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit` (Node 20 via nvm)
- **Result**: typecheck OK, lint OK, 16 arquivos / 489 testes passaram, 0 falhas, 0 skipped
- **Testes da feature**: `spending-pace.test.ts` com 23 testes (20 `it` + `it.each` de 4 casos)
- **Failures**: nenhuma (nenhuma falha em arquivo alheio, ex.: `freedom.test.ts`)
- **NÃO executados (de propósito)**: `npm run test:int` e `npm run build` (outra sessão usa o banco e o `.next`). O gate Build de tasks.md não foi reproduzido aqui; fica como evidência do autor nos commits.
- **Contagem anterior**: não há baseline da contagem pré-feature; nenhum teste da feature foi removido ou enfraquecido (arquivo novo, sem exclusões no diff).

---

## Spec-Anchored Acceptance Criteria

Legenda: **Unit** = coberto por teste automatizado (evidence-or-zero). **UI** = "UI, verificado por leitura + verificação manual" (AD-005: sem teste automatizado de componentes); não conta como cobertura de teste.

### P1: Seletor Tabela / Barras (8 ACs)

| # | Critério | Resultado definido na spec | Evidência `file:line` | Tipo | Resultado |
| - | -------- | -------------------------- | --------------------- | ---- | --------- |
| 1 | Seletor com exatamente "Tabela" e "Barras" no cabeçalho | 2 opções no `action` do card | `category-overview.tsx:12-15` (array `views` com 2 itens), `:34-46` (`TabsList` em `action` do `ContentCard`) | UI | PASS |
| 2 | Ao carregar seleciona "Tabela" e mostra a tabela | estado inicial Tabela | `category-overview.tsx:19` `useState<View>("tabela")`, `:48-50` | UI | PASS |
| 3 | Selecionar "Barras" troca a tabela pelo gráfico no mesmo card | `SpentVsTarget` no lugar | `category-overview.tsx:30` (`onValueChange`), `:51-53` | UI | PASS |
| 4 | Voltar a "Tabela" mostra a tabela com expansão zerada | estado de expansão resetado | `TabsContent` (Radix) desmonta o painel inativo (sem `forceMount`, `ui/tabs.tsx:82-92`); `summary-table.tsx:22` guarda a expansão em `useState` local, que é perdido ao desmontar | UI | PASS (por leitura) |
| 5 | Só uma visão renderizada por vez | a outra não existe no DOM | `category-overview.tsx:48-53` + desmontagem do Radix; tasks.md T8: "barras e tabela nunca juntas" | UI | PASS |
| 6 | Nenhum card "Gasto × meta por categoria" | ausente | `budget-charts.tsx:153-168` só renderiza "Ritmo de gastos" e "Participação no gasto do mês"; `grep` do título não retorna card (a string permanece apenas como doc de `SpentVsTarget`, `:46`, sem título) | UI | PASS |
| 7 | `aria-selected` e teclado (Tab, setas) | estado selecionado exposto | Radix `Tabs` entrega `role=tab`/`aria-selected`/setas; `category-overview.tsx:35` `aria-label`; tasks.md T8: `aria-selected` correto e seta à esquerda voltou a "Tabela" | UI | PASS |
| 8 | Sem categorias: link "Crie suas categorias primeiro" e sem seletor | sem `TabsList` | `category-overview.tsx:21-27` (early return sem `Tabs`), link em `summary-table.tsx:36` | UI | PASS |

### P1: Card "Ritmo de gastos" (13 ACs)

| # | Critério | Resultado definido na spec | Evidência `file:line` + asserção | Tipo | Resultado |
| - | -------- | -------------------------- | -------------------------------- | ---- | --------- |
| 1 | Card "Ritmo de gastos" na grade, ao lado do donut | título e posição | `budget-charts.tsx:157-159` (`grid lg:grid-cols-2`, `SpendingPaceChart` antes do card do donut), `spending-pace-chart.tsx:34` | UI | PASS |
| 2 | Um ponto por dia, 28 a 31 | length = dias do mês | `spending-pace.test.ts:19` `expect(pace.points).toHaveLength(30)`; `:58-62` `it.each` 28/29/30/31 `toHaveLength(days)`; fev 2026=28, 2028=29 | Unit | PASS |
| 3 | spent(D) = soma de despesas dia 1..D (cents), recorrentes na data projetada | R$100 até dia 9, R$300 do 10 ao 30 | `spending-pace.test.ts:25-26` `expect(spent(pace).slice(0, 9)).toEqual(Array(9).fill(10000))` e `.slice(9)).toEqual(Array(21).fill(30000))`; `:36-37` soma no mesmo dia `toBe(3500)`. Recorrentes: `page.tsx:41,49` passa `transactions` de `listByMonth` (data projetada, AD-004) | Unit + leitura | PASS |
| 4 | Receitas fora da série | receita ignorada | `spending-pace.test.ts:47-48` `expect(withIncome.points[1].spentCents).toBe(0)`; `:48` `points[29].spentCents).toBe(700)` | Unit | PASS |
| 5 | Referência = meta × D ÷ dias quando meta > 0 | ideal(D), último dia = meta | `spending-pace.test.ts:74-76` `points[0].idealCents).toBe(10000)`, `[14]).toBe(150000)`, `[29]).toBe(300000)`; `:61` último dia `toBe(1000)` em todos os tamanhos; `:86-87` arredondamento `toBe(3)`, `toBe(7)`. Meta total = soma de `targetCents`: `page.tsx:48` | Unit + leitura | PASS |
| 6 | Meta 0: sem linha de referência | `hasReference=false`, ideal null | `spending-pace.test.ts:97-98` `expect(pace.hasReference).toBe(false)`; `every(idealCents === null)).toBe(true)`. UI: `spending-pace-chart.tsx:76` (`<Line ideal>` só com `hasReference`) | Unit + leitura | PASS |
| 7 | Mês corrente: curva termina em hoje | sem pontos após hoje | `spending-pace.test.ts:111-113` `points[14].spentCents).toBe(500)`, `points[15].spentCents).toBeNull()`, `[29]).toBeNull()`; `:119-120` dia 1; `:125` último dia. `today` em America/Sao_Paulo: `page.tsx:26-27` (`Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })`), `:47` | Unit + leitura | PASS |
| 8 | Mês futuro: sem pontos de gasto | todos null | `spending-pace.test.ts:130` `expect(pace.points.every((pt) => pt.spentCents === null)).toBe(true)`; `:131` referência mantida `toBe(1000)` | Unit | PASS |
| 9 | Mês passado: curva até o último dia | último dia com valor | `spending-pace.test.ts:136` `expect(pace.points[29].spentCents).toBe(500)` | Unit | PASS |
| 10 | Tooltip com dia, gasto acumulado e ideal (se houver) em BRL | "Dia D", "Gasto acumulado", "Ritmo ideal" | `spending-pace-chart.tsx:68-75` (`labelFormatter` "Dia ${day}", `formatter` com `formatBRL`); ideal só existe quando `<Line ideal>` é renderizada (`:76`). Foco: Recharts 3.10.1 com `accessibilityLayer` padrão. tasks.md T8: "Dia 2: Gasto acumulado R$ 1.000,00, Ritmo ideal R$ 645,16" | UI | PASS (por leitura + manual) |
| 11 | Sem despesas: texto "Sem gastos no mês" no lugar do gráfico | `hasSpending=false` | `spending-pace.test.ts:150` `expect(pace.hasSpending).toBe(false)` (receita não conta), `:160` `toBe(true)`; UI `spending-pace-chart.tsx:37,102-103` | Unit + leitura | PASS |
| 12 | "Acima do ritmo ideal" só quando último gasto > ideal do mesmo dia | `aboveIdeal` | `spending-pace.test.ts:170` `toBe(true)` (1001 > 1000), `:180` `toBe(false)` (igual), `:190` `toBe(true)` (compara o último dia com valor), `:200` sem referência `toBe(false)`, `:210` mês futuro `toBe(false)`; UI `spending-pace-chart.tsx:35` (texto só se `pace.aboveIdeal`) | Unit + leitura | PASS |
| 13 | Legenda "Gasto acumulado" e "Ritmo ideal" (esta só com referência) | 2 séries nomeadas | `spending-pace-chart.tsx:39-54` (`<ul>` com "Gasto acumulado" e `{pace.hasReference && ... "Ritmo ideal"}`) | UI | PASS |

### Edge cases

- [x] Fevereiro 28/29 pontos e referência atinge a meta no último dia: `spending-pace.test.ts:54-61`.
- [x] Vários gastos no mesmo dia somam num ponto: `spending-pace.test.ts:36-37`.
- [x] Categoria excluída depois do mês continua contando: `page.tsx:38,48` usa `listForMonth` e `summary.rows` (como o resumo); gasto vem das ocorrências do mês, sem filtro por categoria ativa. Verificado por leitura.
- [x] Viewport < 1024px empilha em uma coluna: `budget-charts.tsx:157` `grid gap-6 lg:grid-cols-2`; tasks.md T8: mobile 390px empilhado.

**Status**: todos os 21 ACs (13 + 8) satisfeitos pelo código. 10 ACs de Ritmo (2-9, 11, 12) com teste automatizado de domínio; os ACs 1, 10, 13 de Ritmo e os 8 do Seletor são de UI, verificados por leitura e pela verificação manual de T8, sem teste automatizado.

---

## Discrimination Sensor

Scratch: `git worktree add --detach` em `scratchpad/wt` com symlink de `node_modules`; comando `npx vitest run --project unit src/lib/domain/spending-pace.test.ts`. Baseline no scratch: 23 passed.

| # | File:line | Mutação | Testes que falharam | Killed? |
| - | --------- | ------- | ------------------- | ------- |
| 1 | `spending-pace.ts:54` | `day <= lastDay` para `day < lastDay` | 8 (ex.: "accumulates...", "ignores income") | Killed |
| 2 | `spending-pace.ts:43` | removido `if (o.kind !== "expense") continue;` (receitas entram) | 2 ("ignores income", "hasSpending is false without expenses") | Killed |
| 3 | `spending-pace.ts:60` | `>` para `>=` em `aboveIdeal` | 1 ("aboveIdeal is false when spent equals the ideal") | Killed |
| 4 | `spending-pace.ts:36` | `hasReference = true` (remove o guard de meta 0) | 2 ("has no reference when the total target is zero", "aboveIdeal is false without a reference") | Killed |
| 5 | `spending-pace.ts:55` | `mulDivRound(...)` para `Math.floor(total*day/days)` | 1 ("rounds to whole cents") | Killed |
| 6 | `spending-pace.ts:38` | `today >= endExclusive` para `today > endExclusive` | 1 ("past month: the curve reaches the last day") | Killed |
| 7 | `spending-pace.ts:38` | `today < start` para `today <= start` | 1 ("current month, first day...") | Killed |
| 8 | `spending-pace.ts:35` | `days` fixo em 30 | 3+ (testes de comprimento do mês) | Killed |

**Sensor depth**: lightweight ampliado (8 mutações)
**Result**: 8/8 killed - PASS
**Isolamento**: worktree removido (`git worktree remove --force` + `prune`); `git status --porcelain` do repo real idêntico ao inicial (apenas ` M docs/backlog.md`, de outra sessão). `git worktree list` mostra só o repo real.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | OK (função pura de 63 linhas, componentes enxutos) |
| Surgical changes | OK (`SpentVsTarget` só exportado; card antigo removido) |
| No scope creep | OK (sem projeção, sem persistência, sem consulta nova ao banco) |
| Matches patterns | OK (`ContentCard`, `--viz-*`, `tooltipStyle`/`compactBRL` repetidos) |
| Spec-anchored outcome check | OK para os ACs de domínio (valores numéricos da spec são os asseridos) |
| Per-layer Coverage Expectation | OK: domínio 1:1 com RITMO-02..04 e flags; UI sem teste por AD-005 |
| Every test maps to a spec requirement | OK (nenhum teste órfão) |
| Documented guidelines followed | `AGENTS.md`, AD-005, matriz de testes de tasks.md |

Observações menores (não bloqueiam):
- `tick`, `tooltipStyle` e `compactBRL` estão duplicados em `spending-pace-chart.tsx` e `budget-charts.tsx` (o design previa mover para `chart-style.ts` se surgisse importação circular; optou-se por duplicar para evitar o ciclo `budget-charts` -> `spending-pace-chart` -> `budget-charts`). Dívida de baixo risco.
- `spending-pace-chart.tsx:41,48` usam classes ad hoc em vez do `Swatch`, aceitável.

---

## Gaps (ranqueados)

Nenhum gap bloqueante.

1. (Baixo) ACs de UI (Seletor 1-8, Ritmo 1, 10, 13) sem teste automatizado; dependem da verificação manual de T8 e do e2e suspenso (AD-005). `e2e/charts.spec.ts:20,46,64` espera `bar-chart` sem clicar em "Barras" e não cobre `pace-chart` (dívida já registrada em tasks.md). Ao reativar o e2e, atualizar.
2. (Baixo) Critério de sucesso "curva fecha o mês no mesmo total do card Gasto": a curva vem de `transactions` (`listByMonth`) e o card de `monthTotals`; são consultas distintas. Não há teste que as compare; tasks.md T8 registra a conferência manual.
3. (Baixo) Estilo duplicado de gráfico entre os dois arquivos (ver acima).

## Spec-precision gaps

- Seletor AC 4 ("expansão reset"): a spec não define como observar o reset; o resultado depende do desmonte do Radix `TabsContent`, comportamento de biblioteca, não de asserção.
- Seletor AC 7 e Ritmo AC 10 ("hover or focus"): a spec não diz como o foco chega a um dia no gráfico; depende de `accessibilityLayer` do Recharts 3 (padrão). Sem teste.
- Ritmo AC 12 ("junto ao gráfico"): posição do texto não definida; implementado no `note` do cabeçalho do card, não dentro da figura.
- Ritmo AC 3 e 5 não especificam arredondamento do ideal em centavos; a decisão (`mulDivRound`, AD-003) está só no design e é pinada por `spending-pace.test.ts:86-87`.
- Ritmo AC 8 versus mês futuro: "curva sem pontos" é interpretado como `spentCents === null`.

---

## Requirement Traceability Update

Todos os 8 requisitos (VISOES-01..03, RITMO-01..05) já constam `Verified` em spec.md; a leitura independente confirma, sem alteração.

---

## Summary

**Overall**: Ready

**Spec-anchored check**: 21/21 ACs satisfeitos (13 Ritmo + 8 Seletor); 10 de Ritmo cobertos por teste de domínio com evidência `file:line`, 11 de UI por leitura + verificação manual; 5 spec-precision gaps sinalizados
**Sensor**: 8/8 mutações mortas
**Gate**: typecheck, lint e `test:unit` (489 passed, 0 failed); `test:int` e `build` não executados por instrução

**What works**: série diária, corte por hoje (mês corrente, passado, futuro), meta 0 sem referência, flag `aboveIdeal`, seletor em Radix Tabs com desmonte da visão inativa, remoção do card antigo, `today` em America/Sao_Paulo, meta total somada de `summary.rows`.

**Next steps**: nenhum obrigatório; considerar um teste de render quando o e2e for reativado (clicar em "Barras" e cobrir `pace-chart`).
