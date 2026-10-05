# Percentuais de Categoria com Histórico por Mês - Relatório de Validação

## Validation: percentuais-historico - PASS ✅

**Date**: 2026-10-05
**Spec**: `.specs/features/percentuais-historico/spec.md`
**Diff range**: `2168991..HEAD` (HEAD = `e66eff4`), restrito aos commits da feature: 22cf612, b9505ba, 993941e, 22736ff, 9ca2998, 3e808ba, a255f7b, 925d50d, cb61f56, 26d8f40, 19190af + fix e66eff4 (iteração 1)
**Verifier**: sub-agente independente (author ≠ verifier)

Histórico: a 1ª verificação (HEAD `19190af`) deu FAIL com 2 gaps: P2 AC5 nos seletores e o mutante M6 sobrevivente. O fix `e66eff4` corrigiu os dois. Re-verificação da iteração 1: PASS. Esta passada re-verificou só o que mudou (P2 AC5 e HIST-04 AC2) e re-rodou o gate e o sensor do M6.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `resolvePercent`, `monthStartOf` (22cf612) |
| T2 | ✅ Done | omissão `hasPercent: false` sem gasto (b9505ba) |
| T3 | ✅ Done | `category_percent`, `deleted_from`, migração 0007 + teste de backfill (993941e) |
| T4 | ✅ Done | helper `insertCategory` (22736ff) |
| T5 | ✅ Done | `listForMonth` / `list` (9ca2998) |
| T6 | ✅ Done | `replaceSet` grava vigências (3e808ba) |
| T7 | ✅ Done | exclusão lógica (a255f7b) |
| T8 | ✅ Done | Fix 1 (`e66eff4`): os formulários recebem `list(userId)` (só ativas); resumo, gráficos e filtro seguem com `listForMonth` |
| T9 | ✅ Done | (cb61f56) |
| T10 | ✅ Done | asserções de faixa migradas para `category_percent` (26d8f40) |
| T11 | ✅ Done | migração 0008 remove a coluna (19190af) |

---

## Spec-Anchored Acceptance Criteria

### P1: Editar percentuais sem alterar o passado (HIST-01, HIST-02, HIST-03)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Status |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AC1 - salvar percentuais diferentes grava vigência no mês corrente (America/Sao_Paulo) | linha `(categoria, AAAA-MM-01 do mês corrente, novo %)` para cada alterada | `src/lib/db/repos/categories.int.test.ts:516` - `expect(await versionsOf(userId)).toEqual([... {name:"A", fromMonth:"2026-10-01", percentMicro:40000000} ... {name:"B", fromMonth:"2026-10-01", percentMicro:60000000}])`; só a alterada: `:538` - `expect(rows.filter(r=>r.name==="B")).toEqual([{... "0001-01-01", 50000000}])` | ✅ |
| AC2 - mês passado após edição mantém as metas | metas idênticas às de antes da edição | `src/lib/db/repos/categories-summary.int.test.ts:77` - `expect(view(await summaryFor(userId, SEP, OCT))).toEqual(sepBefore)` (com `sepBefore` fixado em `:62` como 50%/R$500 cada); repo: `categories.int.test.ts:523` - `expect(past.map(c=>c.percentMicro)).toEqual([50000000, 50000000])` | ✅ |
| AC3 - salvar só nome/cor/subcategorias não cria nem altera vigência | conjunto de vigências inalterado | `categories.int.test.ts:558` - `expect((await versionsOf(userId)).map(...)).toEqual(before.map(...))` + `:561` - `expect(await db.$count(categoryPercent)).toBe(2)` (renomeia A, recolore A/B, adiciona subcategoria) | ✅ |
| AC4 - várias vezes no mesmo mês: uma linha por categoria com o último valor | 1 linha `2026-10-01` por categoria, valor do último salvamento | `categories.int.test.ts:571` - `expect(octRows.map(r=>[r.name,r.percentMicro])).toEqual([["A",70000000],["B",30000000]])`; voltar ao valor anterior mantém a linha do mês: `:584` - `toEqual([["A",50000000],["B",50000000]])` | ✅ |
| AC5 - soma ≠ 100% rejeita com a mensagem existente e não grava vigência | `"A soma dos percentuais deve ser 100% (atual: X)"`; nenhuma vigência | `categories.int.test.ts:641` - `toMatchObject({ok:false, error:"A soma dos percentuais deve ser 100% (atual: 80%)"})` + `:642` - `expect(await db.$count(categoryPercent)).toBe(2)` | ✅ |
| AC6 - falha em qualquer escrita desfaz tudo e retorna o erro de salvamento existente | rollback de categorias, subcategorias e vigências; `SAVE_FAILED` ("Não foi possível salvar. Tente novamente") | rollback: `categories.int.test.ts:659` - `.rejects.toThrow()` + `:661-663` - `$count(categoryPercent)=2`, `$count(category)=2`, `$count(subcategory)=0` (falha forçada no 3º item com cor 99, após vigência, categoria nova e subcategoria gravadas); mensagem: `src/actions/categories.int.test.ts:172-176` - `toEqual({ok:false, error:"Não foi possível salvar. Tente novamente"})` quando `replaceSet` lança (pré-existente; `saveCategories` faz `catch` → `SAVE_FAILED`, `src/actions/categories.ts:21-23`) | ✅ |

### P1: Resumo e gráficos usam o percentual do mês exibido (HIST-04, HIST-05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Status |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 - mês M usa a vigência de maior mês inicial ≤ M | `allocateCents` e coluna % com essa vigência | domínio: `src/lib/domain/percent-history.test.ts:17` - `resolvePercent(versions,"2026-03-01")` → `40_000_000` (mês igual ao início), `:21` (mês entre versões), `:37-40` (ordem embaralhada); repo: `categories.int.test.ts:401-408`; resumo: `categories-summary.int.test.ts:78-81` - `{name:"A", percentMicro:40000000, targetCents:80000}` | ✅ |
| AC2 - mês posterior ao corrente usa as vigências do mês corrente | % do mês corrente | `categories-summary.int.test.ts:82` - NOV com now=OUT → `[40000000, 60000000]`; `categories.int.test.ts:416` - mar/2027 → `{percentMicro:40000000, hasPercent:true}`; vigência posterior ao mês corrente é ignorada: `categories-summary.int.test.ts:126-136` - DEZ com now=OUT e vigência `2026-12-01` de 10% → `toEqual([50000000, 50000000])` (mata M6); `percent-history.test.ts:33` | ✅ |
| AC3 - gráficos a partir do mesmo resumo, sem leitura separada | `BudgetCharts` recebe `summary.rows` | `src/app/(app)/page.tsx:110` - `<BudgetCharts rows={summary.rows} .../>`; `grep categoriesRepo` em `src` (fora de testes) só acha `page.tsx:34`, `categorias/page.tsx:15`, `actions/transactions.ts:32`, `actions/categories.ts:19` | ✅ (estrutural; UI sem teste por AD-005, gate de build) |
| AC4 - M anterior à 1ª vigência, com gasto em M → 0% e meta R$ 0,00 | linha com `percentMicro` 0, `targetCents` 0 | `categories-summary.int.test.ts:109` - `toMatchObject({percentMicro:0, targetCents:0, spentCents:7000, overspent:true, overspentCents:7000})`; domínio: `src/lib/domain/budget.test.ts:399` - `toMatchObject({targetCents:0, spentCents:2500, overspent:true, overspentCents:2500})` | ✅ |
| AC5 - M anterior à 1ª vigência, sem gasto → omitida | categoria ausente das linhas | `categories-summary.int.test.ts:102` - `expect(sepClean.rows.map(r=>r.name)).toEqual(["A","B"])` (+ soma 100% em `:103-104`); domínio: `src/lib/domain/budget.test.ts:389` - `expect(rows.map(r=>r.id)).toEqual(["c1"])` | ✅ |

### P1: Meses existentes não mudam com a migração (HIST-06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Status |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 - migração cria vigência `0001-01-01` com o `percent_micro` atual por categoria | 1 linha por categoria, `from_month = 0001-01-01`, mesmo % | `src/lib/db/migration-0007.int.test.ts:75-80` - `expect(rows).toHaveLength(ids.size)`, `expect(row.from_month).toBe("0001-01-01")`, `expect(row.percent_micro).toBe(ids.get(row.category_id))`, `expect(new Set(...)).toEqual(new Set(ids.keys()))` (aplica 0000..0006 em schema isolado, semeia 2 usuários, aplica 0007) | ✅ |
| AC2 - resumo de qualquer mês existente idêntico logo após a migração | metas e % iguais aos de antes | Evidência composta: backfill sentinela (acima) + `percent-history.test.ts:12-13` (sentinela vale para qualquer mês, inclusive `0001-01-01`) + `categories.int.test.ts:401-404` (categorias com sentinela resolvem o mesmo % em mês passado, `hasPercent: true`) + `buildMonthlySummary` só muda para `hasPercent === false` (`src/lib/domain/budget.ts:152-154`), que nunca ocorre com sentinela. Mutante M13 (sentinela errada) morto | ✅ (sem teste direto "antes/depois" do resumo como o Independent Test sugere; cadeia verificada) |

### P2: Categoria criada ou excluída no meio do histórico (HIST-07, HIST-08)

| Criterion | Spec-defined outcome | `file:line` + assertion | Status |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 - criar categoria grava vigência no mês corrente | `(nova, 2026-10-01, %)` | `categories.int.test.ts:610` - `expect(c).toEqual([{name:"C", fromMonth:"2026-10-01", percentMicro:20000000}])`; `:613` - `hasPercent:false` em SET | ✅ |
| AC2 - excluir sem gastos registra mês corrente e mantém vigências | `deleted_from = 2026-10-01`; vigências preservadas | `categories.int.test.ts:696` - `expect(row.deletedFrom).toBe("2026-10-01")` + `:697` - `$count(categoryPercent, categoria)=1` + `:698` subcategoria mantida | ✅ |
| AC3 - mês anterior à exclusão inclui a categoria com o % da época | presente, % vigente | `categories.int.test.ts:747` - `toEqual(["A","B","C"])` + `:751` - `toEqual([50000000, 30000000, 20000000])`; `:436` | ✅ |
| AC4 - mês igual/posterior à exclusão omite | ausente | `categories.int.test.ts:748` - `toEqual(["A","B"])`; `:437-438` (OUT e NOV) | ✅ |
| AC5 - omitir excluídas da tela de Categorias, dos seletores e da validação de propriedade | ausente em todos | Tela de Categorias (`categorias/page.tsx:15`) e propriedade (`actions/transactions.ts:32`) usam `list()`: `categories.int.test.ts:746` / `:448` (`list` não traz a excluída). **Seletores, evidência por inspeção de código (AD-005: UI sem teste automatizado):** `src/app/(app)/page.tsx:36` carrega `categoriesRepo.list(userId)` como `activeCategories` e o passa a `TransactionList` (`page.tsx:124`, formulário de edição em `transaction-list.tsx:161`) e a `NewTransactionButton` (`page.tsx:130`); o select `transaction-form.tsx:217` só lista essas. `list` = só ativas está provado por teste (`categories.int.test.ts:746`, `:448`). O filtro de transações (`page.tsx:120`) segue com as categorias do mês, como o design pede; uma categoria excluída nunca tem gasto, então a opção não afeta o filtro | ✅ (seletores: por inspeção; a fiação da página não tem teste nem mutante que a discrimine) |
| AC6 - criar categoria com o nome de uma excluída é aceito | `{ok:true}` | `categories.int.test.ts:735-736` - `toEqual({ok:true})` e `list` → `["A","B","c"]`; índice parcial: `src/lib/db/schema.int.test.ts:426-431`, ativo duplicado ainda rejeitado `:437` (`UNIQUE_VIOLATION`) | ✅ |
| AC7 - excluir com gastos mantém a mensagem e não altera dado | `"Esta categoria tem N gasto(s) e não pode ser excluída"`; nada muda | `categories.int.test.ts:711` - `toEqual({ok:false, error:"Esta categoria tem 2 gastos e não pode ser excluída"})` + `:712` nenhum `deleted_from` + `:713` vigências = 3 (a edição de A/B no mesmo envio não foi gravada); também `:91-95` (3 gastos, `list` igual a antes) | ✅ |

**Status**: ✅ 20/20 ACs cobertos · 0 spec-precision gaps · 3 itens com evidência indireta, composta ou por inspeção: HIST-06 AC2 (composta), edge case de concorrência (por construção), P2 AC5 seletores (inspeção, AD-005)

---

## Edge Cases

- [x] Virada do mês com a tela aberta: `categories.int.test.ts:618-631` - 31/out 23:30 (-03) grava `2026-10-01`, 01/nov 00:30 (-03) grava `2026-11-01`; `now` é lido dentro de `replaceSet` (`categories.ts:110-112`) e a action não passa `now`. Mutante M11 (UTC) morto.
- [x] Percentual igual ao vigente não cria vigência: `categories.int.test.ts:590-594` - `$count(categoryPercent)=2`; `:538-540` (só B inalterada). Mutantes M2 e M14 mortos.
- [x] Vigência só a partir do mês corrente aparece na tela de Categorias: `categories.int.test.ts:424-425` (`listForMonth` do mês de `now` → `{percentMicro:100000000, hasPercent:true}`; `list` é `listForMonth(currentMonth(now))`, `categories.ts:94-96`); `:615` para categoria criada via `replaceSet`.
- [~] Concorrência na mesma (categoria, mês): coberto por `ON CONFLICT (category_id, from_month) DO UPDATE` (`categories.ts:224-230`), PK testada em `schema.int.test.ts:408` (`UNIQUE_VIOLATION`) e salvamento duplo sequencial (`categories.int.test.ts:571`). Não há teste com duas transações realmente simultâneas; mutantes M3 (insert simples) e M4 (`DO NOTHING`) mortos pelo teste sequencial. Aceito como coberto por construção (o Postgres serializa o upsert na PK).
- [x] Backfill `0001-01-01`: ver HIST-06 AC1.
- [x] Mensagens exatas: soma (`:641`), gastos (`:711`, `:93`), "Categoria não encontrada" para id excluído (`categories.int.test.ts:722`), `SAVE_FAILED` (`actions/categories.int.test.ts:176`).

---

## Discrimination Sensor

Executado em `git worktree` descartável no scratchpad (node_modules por symlink, `.env.test` copiado), mutação por mutação, testes rodados sequencialmente contra o banco `_test` (unit + integration completos; M13 só o teste da migração). Árvore real: `git status --porcelain` vazio antes e depois (idêntico); worktree removido e `git worktree prune` executado.

| # | File:line | Mutação | Testes que falharam | Killed? |
| - | --------- | ------- | ------------------- | ------- |
| M1 | `src/lib/domain/percent-history.ts:10` | `v.fromMonth <= monthStart` → `<` | 3 unit, 34 int | ✅ |
| M2 | `src/lib/db/repos/categories.ts:223` | `if (inForce !== percentMicro)` → `if (true)` (grava sempre) | 3 int | ✅ |
| M3 | `src/lib/db/repos/categories.ts:227-230` | remove `onConflictDoUpdate` (insert simples) | 6 int | ✅ |
| M4 | `src/lib/db/repos/categories.ts:227-230` | `onConflictDoUpdate` → `onConflictDoNothing` | 4 int | ✅ |
| M5 | `src/lib/db/repos/categories.ts:55` | `gt(deletedFrom, monthStart)` → `gte` | 6 int | ✅ |
| M6 | `src/lib/db/repos/categories.ts:48` | remove o clamp ao mês corrente (`resolveAt = monthStart`) | 1ª passada: nenhum (sobreviveu). Re-verificação em `e66eff4`: 1 int (`categories-summary.int.test.ts:126`) | ✅ (após Fix 2) |
| M7 | `src/lib/domain/budget.ts:153` | ignora `hasPercent` (não omite) | 1 unit, 1 int | ✅ |
| M8 | `src/lib/db/repos/categories.ts:87` | `hasPercent: true` sempre | 3 int | ✅ |
| M9 | `src/lib/db/repos/categories.ts:190-195` | soft delete → `DELETE` físico | 3 int | ✅ |
| M10 | `src/lib/db/repos/categories.ts:123` | `replaceSet` considera excluídas como existentes | 1 int | ✅ |
| M11 | `src/lib/db/repos/categories.ts:112` | mês da vigência em UTC em vez de America/Sao_Paulo | 5 int | ✅ |
| M12 | `src/lib/db/repos/categories.ts:48` | `listForMonth` resolve sempre no mês corrente | 8 int | ✅ |
| M13 | `drizzle/0007_category_percent_history.sql:14` | sentinela do backfill `0001-01-01` → `2000-01-01` | 1 int (migração) | ✅ |
| M14 | `src/lib/db/repos/categories.ts:222` | `inForce = null` (compara sempre com nada) | 3 int | ✅ |

**Sensor depth**: P0-full (integridade de dados; 14 mutações manuais cobrindo os ramos novos)
**Resultado do sensor**: 14/14 mortos. Re-verificação (worktree descartável em `e66eff4`, porcelain idêntico antes/depois, worktree removido): M6 morto e, como regressão, M5 e M12 mortos de novo. O Fix 1 é fiação de página sem teste (AD-005), então não há mutante dele que possa ser morto; foi verificado por inspeção.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`minMonth` é um helper local de 2 linhas; reaproveita `monthRange`, `currentMonth`, transação existente) |
| Surgical changes | ✅ (cada commit só toca os arquivos da sua task + `tasks.md`; nenhum arquivo fora do escopo) |
| No scope creep | ✅ (sem tela de histórico, sem edição de meses passados, sem e2e novo) |
| Matches patterns | ✅ (migração SQL editada à mão no estilo da 0006; expand/contract 0007/0008; JSDoc no estilo do repo) |
| Spec-anchored outcome check | ✅ para os ACs cobertos (valores exatos de %, metas em centavos, mensagens literais) |
| Per-layer Coverage Expectation | ✅ domínio 1:1; repo/schema/migração ✅; UI só build (AD-005). A fiação da página (Fix 1) foi verificada por inspeção |
| Every test maps to a spec requirement | ✅ (testes novos mapeiam para ACs, edge cases ou Done-when de T1-T11) |
| Documented guidelines followed | ✅ `AGENTS.md`, `.specs/STATE.md` (AD-005; AD-007 registrada, AD-006 marcada superseded quanto ao armazenamento) |
| Uso residual da coluna removida | ✅ `grep -rn percentMicro / percent_micro`: em `category` só no teste da migração 0007 (schema legado intencional em schema isolado); `schema.ts:58,62` e `schema.int.test.ts:385,393` são de `category_percent` |
| `e2e/helpers.ts` compila | ✅ `npx tsc --noEmit` exit 0 (usa `replaceSet`/`list`, `e2e/helpers.ts:47,52`) |
| Test integrity | ✅ os 3 testes removidos de `schema.int.test.ts` (faixa de `category.percent_micro`) foram migrados para `category_percent` (`schema.int.test.ts:55,63,68` e `:385,393`); nenhuma asserção enfraquecida encontrada |

---

## Gate Check

- **Gate command**: `npm run build && npm run lint && npm run test:unit && npm run test:int` (Node 20.20.2, Postgres `orcamento-pg` porta 5433, banco `_test`)
- **Saída**: 1ª passada (`19190af`): build e lint OK, 361 unit e 269 integration, 0 falhas. Re-verificação (`e66eff4`): build exit 0, lint exit 0, unit 361 passed / 0 failed, integration 270 passed / 0 failed
- **Test count before feature**: 357 unit / 246 integration
- **Test count after feature**: 361 unit / 270 integration
- **Delta**: +4 unit, +24 integration
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans (aplicados no commit `e66eff4`, re-verificados na iteração 1)

### Fix 1: categoria excluída aparece nos seletores de lançamento de meses passados (Major)

- **Root cause**: `src/app/(app)/page.tsx:34` troca `list` por `listForMonth(userId, month)` e reutiliza o mesmo array para resumo, filtro, lista e formulários (`page.tsx:118,122,128`). Para um mês anterior ao `deleted_from`, a categoria excluída está nesse array, logo aparece no select de `transaction-form.tsx:217` (novo lançamento e edição). Ao salvar, `checkOwnership` (`src/actions/transactions.ts:32`, via `list`) responde "Categoria não encontrada". Viola P2 AC5. Reprodução: excluir D em outubro, abrir `/?mes=2026-09`, clicar em "Novo lançamento": D aparece no seletor.
- **Fix task**: os formulários (`NewTransactionButton` e o formulário de edição em `TransactionList`) devem receber só categorias ativas (por exemplo, `categoriesRepo.list(userId)` em paralelo, ou expor `deletedFrom`/flag ativa em `listForMonth` e filtrar), mantendo `listForMonth` para resumo e gráficos. Verificar se o filtro de transações deve seguir o design ("recebe as mesmas categorias do mês") ou também ficar só com ativas, e registrar a escolha.
- **Verify / Done when**: teste (integration da fiação da página, extraindo a montagem das props para uma função testável, ou teste do repo que a página usa para os seletores) prova que, em mês < `deleted_from`, a lista de categorias passada aos formulários não contém a excluída e o resumo do mesmo mês ainda a contém; gate Build verde.
- **Priority**: Major. **Estado: corrigido.** `page.tsx:36,124,130`, verificado por inspeção (AD-005)

### Fix 2: clamp de mês futuro sem teste discriminante (Minor)

- **Root cause**: `categories.ts:48` (`resolveAt = minMonth(month, currentMonth(now))`) não muda nenhum resultado testado (mutante M6 sobrevive): nenhum teste tem vigência com `fromMonth` posterior ao mês de `now`.
- **Fix task**: adicionar teste de `listForMonth` com uma vigência posterior ao mês de `now` (ex.: vigência `2026-12-01` inserida direto, `now` em outubro, mês exibido dezembro → percentual da vigência de outubro, conforme P1 "Resumo" AC2), ou, se a equipe concluir que o estado é inalcançável, remover o clamp como código morto e registrar a decisão.
- **Verify / Done when**: re-executar M6 e confirmar que é morto (ou que o código saiu).
- **Priority**: Minor. **Estado: corrigido.** Teste `categories-summary.int.test.ts:126-136`; M6 morto

---

## Requirement Traceability Update

Aplicada em spec.md (veredito PASS na iteração 1):

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| HIST-01 | Implementing | ✅ Verified |
| HIST-02 | Implementing | ✅ Verified |
| HIST-03 | Implementing | ✅ Verified |
| HIST-04 | Implementing | ✅ Verified |
| HIST-05 | Implementing | ✅ Verified |
| HIST-06 | Implementing | ✅ Verified |
| HIST-07 | Implementing | ✅ Verified |
| HIST-08 | Implementing | ✅ Verified (AC5 seletores por inspeção, AD-005) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/20 ACs da spec com evidência que bate com o resultado definido; P2 AC5 nos seletores foi verificado por inspeção de código (AD-005); 0 spec-precision gaps; 4/4 edge cases (concorrência coberta por construção e pelo teste sequencial)
**Sensor**: 14/14 mutações mortas (M6 morto após o Fix 2)
**Gate**: build e lint OK; 361 unit + 270 integration passaram, 0 falhas, 0 skips

**What works**: vigência gravada só quando o percentual muda, upsert no mês corrente, virada de mês em America/Sao_Paulo, rollback total, leitura por mês com `hasPercent`, clamp de mês futuro, omissão/0% no resumo, exclusão lógica com índice de nome parcial, formulários só com categorias ativas, backfill sentinela e remoção da coluna antiga sem uso residual.

**Issues found**: nenhum pendente. Fix 1 e Fix 2 foram aplicados e re-verificados.

**Next steps**: o orquestrador commita validation.md, spec.md, tasks.md e STATE.md.
