# Recorrentes: pago e não pago Validation

**Date**: 2026-11-04
**Spec**: `.specs/features/recorrentes-pago/spec.md`
**Diff range**: `c605e5a..HEAD` (`37e4b82`), 19 commits de feature (T1-T19) mais o commit de docs da spec/tasks
**Verifier**: sub-agente independente (author ≠ verifier), re-derivado da spec

**Verdict**: PASS
**Result**: PASS

Todos os ACs têm evidência `file:line`, com o valor da asserção batendo com o resultado da spec. O sensor matou 14/14 mutações. Gate verde: unit 1845/1845 e integration 900/900. Ficam ressalvas não bloqueantes: dois spec-precision gaps parciais, um SPEC_DEVIATION aceito e três riscos residuais (seção final).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T19 | ✅ Done | Todos marcados `[x]` em `tasks.md`; um commit por task (`git log c605e5a..HEAD`) |

---

## Spec-Anchored Acceptance Criteria

Convenção: os caminhos de teste são relativos a `src/`. "Inspeção" = evidência de UI por código, já que não há e2e nem teste de componente (AD-005).

### P1: Marcar uma ocorrência recorrente como paga (PAGO-01, PAGO-02)

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | -------------------- | ----------------------- | ------ |
| 1 Marcar só aquele mês | Linha só de M; os outros meses ficam como estavam | `lib/db/repos/transactions.sealed.int.test.ts:869` - `expect(await paidRows()).toEqual([...])` (M inserido, 10 e 12 intactos); `actions/transactions-paid.int.test.ts:60` - `toEqual({ ok: true })`, `paidRows()` = `[{ userId, seriesId: id, month: "2026-11-01" }]`, `revalidatePath("/")` | ✅ PASS |
| 2 Desmarcar só aquele mês | Só M some | `transactions.sealed.int.test.ts:882` - `months).toEqual(["2026-10-01","2026-12-01"])`; `transactions-paid.int.test.ts:69` - restam só `2026-12-01` | ✅ PASS |
| 3 Nova, futura ou do mês atual sem marcação = não paga | `paid` false/ausente = não pago | `transactions.sealed.int.test.ts:803` - `byId.get(unpaid.id)).toBe(false)`, avulso `toBeNull()`; `lib/domain/paid.test.ts:38` - `countsInTotals({recurring:true, paid:false/null/undefined})).toBe(false)`; `lib/domain/paid.test.ts:126` - rótulo "Não pago" com `null`/ausente | ✅ PASS |
| 4 Controle só em recorrentes | Nunca em avulsos | Inspeção `components/transaction-list.tsx:259` - `{t.recurring && onTogglePaid && (<button ...>)}`; `lib/domain/paid.test.ts:96` (override ignorado em avulso) | ✅ PASS (inspeção) |
| 5 Rótulos | "Pago"/"Não pago" e "Recebido"/"Não recebido" | `lib/domain/paid.test.ts:116-124` - `toBe("Pago")`, `toBe("Não pago")`, `toBe("Recebido")`, `toBe("Não recebido")`; ligação: `transaction-list.tsx:268` `paidLabel(t.kind, counts)`, `aria-pressed={counts}` `:262` | ✅ PASS |
| 6 Rejeita outro dono ou mês fora da série, sem alterar estado | `false`/"Transação não encontrada" e nenhuma escrita | `transactions.sealed.int.test.ts:936,945,955,960,968` - `setPaid(...)).toBe(false)` e `paidRows()` igual ao anterior; `transactions-paid.int.test.ts:94,103` - `toEqual({ ok:false, error:"Transação não encontrada" })`, `paidRows()).toEqual([])` | ✅ PASS |
| 7 Editar valor, categoria, descrição ou dia mantém os estados | Todos os meses intactos | `transactions.sealed.int.test.ts:1012` - `paidMonthsOf(tx.id)).toEqual(["2026-10","2026-11","2026-12","2027-01"])` e `orphans()).toBe(0)`; `:1030` (in place); `:1156` (primeiro mês sem mover início) | ✅ PASS |

### P1: Não pagas por último e com opacidade reduzida (PAGO-03, PAGO-04)

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | -------------------- | ----------------------- | ------ |
| 1 Não pagas depois de avulsos e pagas | Partição contam/não pagas | `lib/domain/paid.test.ts:55` - `orderByPaid(rows).map(id)).toEqual(["a1","p1","a2","n1","n2"])`; ligação `components/overview-client.tsx:164` `shown = orderByPaid(...)` | ✅ PASS |
| 2 Ordem atual dentro de cada grupo | Partição estável | Mesmo `paid.test.ts:55` (a1,p1,a2 e n1,n2 na ordem de entrada); `:79` não muta a entrada | ✅ PASS |
| 3 Opacidade 0,5 nas não pagas, 1 nas demais | `opacity-50` só quando não conta | Inspeção `transaction-list.tsx:183-185` - `data-paid=...` e `counts ? "" : "opacity-50"` (`counts = countsInTotals(t)`, `:163`) | ✅ PASS (inspeção) |
| 4 Marcar pago sobe e volta a opacidade 1, sem recarregar | Override otimista | Inspeção `overview-client.tsx:124` `effective = applyPaid(...)`, `:136` `setOverride(next)` antes de `await` (`:138`), `:164` reordena; `paid.test.ts:87` - override `[["n1",true],["p1",false]]` | ✅ PASS (inspeção + unit) |
| 5 Desmarcar desce e aplica 0,5 | Idem | Mesmas linhas; `paid.test.ts:87` (`p1` → `false`) | ✅ PASS (inspeção + unit) |
| 6 Dias por grupo e saldo só do que conta | Cabeçalho duplica entre grupos; sem saldo no grupo não pago | `paid.test.ts:156` - cabeçalhos `toEqual(["a1","n1"])`; `paid.test.ts:133` - `get("2026-11-10")).toBe(-1_000)`, `has("2026-11-09")).toBe(false)`; inspeção `transaction-list.tsx:89` `countedNetByDay`, `:162` `startsDay`, `:164` `net = counts ? ... : null`, `:173` `{net !== null && ...}` | ✅ PASS |
| 7 Busca/filtro com a mesma ordem e opacidade | Ordena depois do filtro | Inspeção `overview-client.tsx:164` - `orderByPaid(searchTransactions(filterTransactions(effective, filter), search))`; a opacidade é por linha (`transaction-list.tsx:185`) | ✅ PASS (inspeção) |

### P1: Não pagas fora dos totais (PAGO-05, PAGO-06)

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | -------------------- | ----------------------- | ------ |
| 1 Fora do total de ganhos | Ganho não recebido não soma | `lib/vault/month-totals.test.ts:113` - `incomeCents).toBe(500000)` (não recebido) e `toBe(620000)` (recebido) | ✅ PASS |
| 2 Fora de categoria e subcategoria | R$ 100 não pago → 0; pago → 100 (Independent Test) | `month-totals.test.ts:103` - `spentByCategory.get("A") ?? 0).toBe(0)`, subcategoria `0`; pago `toBe(10000)` nos dois | ✅ PASS |
| 3 Restante, excedente, metas e derivados sobre totais sem não pagas | Todos derivam de `computeMonthTotals(effective)` | Inspeção `overview-client.tsx:148-149` (`totals` → `buildMonthlySummary`, que alimenta resumo, categorias e gráficos `:195-213`) e `:154` ritmo de gasto com `effective.filter(countsInTotals)`; `components/categories-client.tsx:46` (receita de referência) | ✅ PASS (inspeção + unit) |
| 4 Totais atualizam sem recarregar | Totais sobre `effective` | Inspeção `overview-client.tsx:124,148` | ✅ PASS (inspeção) |
| 5 Avulsos sempre contam | Avulso soma com qualquer `paid` | `month-totals.test.ts:128` - `incomeCents).toBe(3000)`, `get("A")).toBe(700)`; `paid.test.ts:32` | ✅ PASS |

### P1: Migração preserva o histórico (PAGO-07)

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | -------------------- | ----------------------- | ------ |
| 1 Meses anteriores ao corrente (America/Sao_Paulo) pagos | Uma linha por mês passado | `lib/db/schema.int.test.ts:621` - `toEqual([{month: monthAt(-3)}, {monthAt(-2)}, {monthAt(-1)}])`; `:635` (série encerrada); `:664` (segmentos); `:683` (idempotente, `n).toBe(3)`) | ✅ PASS |
| 2 Mês corrente e futuros não pagos | Nenhuma linha >= mês corrente | `schema.int.test.ts:621` (sem `monthAt(0)`), `:644` (`[monthAt(-2), monthAt(-1)]` com fim futuro), `:653` (`toEqual([])`) | ✅ PASS |
| 3 Totais de meses passados iguais aos de antes | Ocorrências passadas contam como antes | Composição: backfill marca todo mês passado (`schema.int.test.ts:621-690`) + recorrente pago soma como antes (`month-totals.test.ts:316-326` fixture `paid: true` com os mesmos valores esperados pré-feature, e `:103`) | ⚠️ PASS por composição (sem teste único antes/depois) |

### P2: Ciclo de vida do estado (PAGO-08, PAGO-09)

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | -------------------- | ----------------------- | ------ |
| 1 Excluir apaga os meses removidos e mantém os anteriores | Fev fica, mar em diante some (Independent Test) | `lib/db/repos/transactions.int.test.ts:182` - `paidRows()).toEqual([[tx,"2027-01"],[tx,"2027-02"],[other,...]])`; `:202` (segmento posterior); `:214` (série inteira → `[]`); `:224,239` | ✅ PASS |
| 2 "Não recorrente" apaga os removidos e o avulso conta | Estados >= M somem; linha vira avulsa | `transactions.sealed.int.test.ts:1041` - `paidMonthsOf).toEqual(["2026-10","2026-11"])`; `:1053` (`[]`); `:425` (linha de dez com `recurring: false`) + `paid.test.ts:32` (avulso conta) | ✅ PASS |
| 3 Exportar inclui o estado por série e mês | `paidMonths` AAAA-MM do usuário | `lib/db/repos/export.int.test.ts:147` - `toEqual([{seriesId: first, month:"2026-03"}, ...])`, sem linha do outro usuário; `:167` (`[]`); `lib/vault/export.test.ts:138` (arquivo contém `paidMonths`) | ✅ PASS |
| 4 Importar restaura por série e mês | Mesmos meses sob o novo id da série | `lib/vault/import-file.test.ts:197`; `lib/vault/import-payload.test.ts:128` - `seriesId: t2.id` (id novo); `lib/db/repos/import.int.test.ts:135` - `month:"2026-01-01"`, `u: userId`; `:167` ida e volta `toEqual(payload.paidMonths)` | ✅ PASS |
| 5 Arquivo sem estados → todas não pagas | `paidMonths: []` | `import-file.test.ts:205` - `toEqual([])`; `import-payload.test.ts:137`; `import.int.test.ts:150` - `recurringPaid).toEqual([])` | ✅ PASS |
| 6 Excluir a conta apaga os estados | Cascade por `user_id` | `schema.int.test.ts:565` - `rows.map(userId)).toEqual([otherId])` | ✅ PASS |
| 7 Mover o início para frente apaga os anteriores | Jan/fev somem, mar em diante fica | `transactions.sealed.int.test.ts:1111` - `paidMonthsOf).toEqual(["2026-03","2026-04","2026-12"])`, `orphans()).toBe(0)`; `:1123,1134,1145` (não move → não apaga) | ✅ PASS |

### Edge Cases

| Edge case | Resultado definido pela spec | `file:line` + asserção | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Mês sem recorrentes | Lista como hoje | `paid.test.ts:58` - `toEqual(["a1","a2","a3"])`; avulso conta → sem `opacity-50` (`transaction-list.tsx:185`) e sem `data-paid` (`:183`) | ✅ PASS |
| Todas pagas | Ordem atual, nada esmaecido | `paid.test.ts:63` - `toEqual(["p1","a1","p2"])` | ✅ PASS |
| Todas não pagas | Todas com 0,5 e totais zerados | `paid.test.ts:68` (nenhuma conta); `month-totals.test.ts:139` - `incomeCents).toBe(0)`, `size).toBe(0)` | ✅ PASS |
| Duas marcações simultâneas | Um estado final, o da última recebida, sem duplicata | `transactions.sealed.int.test.ts:923` - `Promise.all([setPaid(true), setPaid(true)])` → `paidRows()` com uma linha. "Última recebida vence" com valores opostos não tem teste; garantido por serialização (`lockSeries` com `FOR UPDATE`, `lib/db/repos/transactions.ts:143`, dentro de `db.transaction` `:199`) | ⚠️ Spec-precision gap parcial |
| Falha no servidor | Reverte a linha e mostra "Não foi possível atualizar o estado. Tente novamente." | `transactions-paid.int.test.ts:121` - `toEqual({ ok:false, error:"Não foi possível atualizar o estado. Tente novamente." })`, `paidRows()).toEqual([])`; constante `lib/action-result.ts:14`; inspeção `overview-client.tsx:139-142` (`setOverride(null)` + `setPaidError(PAID_FAILED)`) e `transaction-list.tsx:153-155` (`role="alert"`) | ✅ PASS |

**Status**: ✅ Todos os ACs cobertos; ⚠️ 2 spec-precision gaps parciais (não bloqueantes)

Payload/conjunction: as asserções de escrita conferem o conteúdo da tabela (`userId`, `seriesId`, `month`), não só o retorno; as de rejeição conferem a ausência de escrita **e** o retorno (`transactions-paid.int.test.ts:94-108`, `transactions.sealed.int.test.ts:936-974`).

---

## Discrimination Sensor

Executado num `git worktree` descartável em `/tmp/claude-1000/.../scratchpad/wt` (node_modules por symlink), banco próprio `orcamento_pago_verifier_test` (criado e depois apagado). Baseline de `git status --porcelain` da árvore real: vazio. Depois da limpeza (`git worktree remove --force` + `git worktree prune`) continuou vazio.

Observação: a primeira rodada sem mutação no worktree (banco recém-criado) teve 3 falhas transitórias. A segunda rodada sem mutação passou 191/191, e M4 foi repetida com o banco já aquecido (morta de novo). As falhas de cada mutante são os testes da regra mutada, não ruído.

| # | File:line | Descrição | Testes rodados | Killed? |
| - | --------- | ----------- | -------------- | ------- |
| M1 | `src/lib/domain/paid.ts:11` | `paid === true` → `paid !== false` (não pago ausente/null passa a contar) | paid, month-totals | ✅ Killed (3) |
| M2 | `src/lib/domain/paid.ts:16` | `orderByPaid` invertida (não pagas primeiro) | paid | ✅ Killed (3) |
| M3 | `src/lib/vault/month-totals.ts:24` | `computeMonthTotals` sem o filtro `countsInTotals` | month-totals | ✅ Killed (4) |
| M4 | `drizzle/0018_recurring_paid.sql:17-20` | Backfill incluindo o mês corrente (sem `- interval '1 month'`) | schema.int | ✅ Killed (5) |
| M5 | `src/lib/db/repos/transactions.ts:200` | `setPaid` sem checar o mês da série (consulta só por dono/id) | transactions.sealed.int, transactions-paid.int | ✅ Killed (2) |
| M6 | `src/lib/db/repos/transactions.ts:173` | Poda de `deleteFrom` `gte` → `gt` | transactions.int | ✅ Killed (3) |
| M7 | `src/lib/db/repos/transactions.ts:418` | `paidSeriesIn` sem filtrar o mês | transactions.sealed.int | ✅ Killed (2) |
| M8 | `src/lib/vault/import-payload.ts:105` | Import sem remapear `seriesId` | import-payload | ✅ Killed (1) |
| M9 | `src/lib/db/repos/transactions.ts:340` | Poda do fim `gt` → `gte` | transactions.sealed.int | ✅ Killed (3) |
| M10 | `src/lib/domain/paid.ts:38` | `startsDay` ignora a troca de grupo | paid | ✅ Killed (1) |
| M11 | `src/lib/db/repos/transactions.ts:343` | Poda do início movido desligada | transactions.sealed.int | ✅ Killed (1) |
| M12 | `src/lib/db/repos/transactions.ts:378` | `updateFromSealed` sem `prunePaidAfterEdit` | transactions.sealed.int | ✅ Killed (5) |
| M13 | `src/lib/db/repos/import.ts:59` | `importSealed` não grava `paidMonths` | import.int | ✅ Killed (4) |
| M14 | `src/lib/validation/import-sealed.ts:85` | Sem rejeição de par `(seriesId, month)` repetido | import-sealed | ✅ Killed (1) |

**Sensor depth**: expandido (totais e migração são caminhos críticos de integridade, ≥5 mutações)
**Result**: 14/14 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`paid.ts` com 39 linhas; poda concentrada em `prunePaidAfterEdit`, `transactions.ts:325-350`) |
| Surgical changes | ✅ (32 arquivos, todos no escopo do design) |
| No scope creep | ✅ |
| Matches patterns | ✅ (ação segue `transactions-sealed.ts`; tabela segue `push_dispatch`) |
| Spec-anchored outcome check | ✅ (2 gaps parciais sinalizados) |
| Per-layer Coverage Expectation | ✅ domínio 1:1 (`paid.test.ts`); repos e ação com sucesso, erro e escopo por usuário; UI sem teste (AD-005), coberta por inspeção |
| Every test maps to a requirement | ✅ (títulos citam PAGO-xx; teste de lote `import.int.test.ts:177` mapeia o Done-when de T18 "em lotes") |
| Documented guidelines | `AGENTS.md` (AD-005: e2e não exigido nem rodado) ✅ |

---

## Gate Check

Node 20 (`~/.nvm/versions/node/v20.20.2`). Integração só no banco privado `orcamento_pago_test` (container `orcamento-pg`, porta 5433).

- `npm run typecheck`: exit 0
- `npm run test:unit`: **1845 passed / 0 failed**, 107 arquivos
- `npm run test:int` (`DATABASE_URL=.../orcamento_pago_test`): **900 passed / 0 failed**, 43 arquivos
- `npm run lint`: 97 problemas (1 erro, 96 avisos), igual à baseline. O único erro é prévio e alheio (`src/app/layout.tsx:70`, `@next/next/no-sync-scripts`). `npx eslint` nos 28 `.ts/.tsx` do diff: exit 0, limpo
- Flaky conhecidos re-rodados: `client.test.ts` 2/2 e `auth.int.test.ts` (2 arquivos) 64/64 passaram
- Skipped: nenhum. E2e não rodado (AD-005)
- `npm run build` não foi rodado nesta verificação. O typecheck cobre os tipos, e o build gate foi registrado pelas tasks T11, T12 e T18

---

## Spec-precision gaps

1. **Concorrência "a última recebida vence"** (Edge Case 4). O teste `transactions.sealed.int.test.ts:923` só cobre duas marcações iguais (sem duplicata). Marcar e desmarcar em paralelo não tem teste; o resultado é garantido por serialização (`FOR UPDATE` em `transactions.ts:143`). "Última recebida" não é observável de forma determinística.
2. **PAGO-07 AC 3 "mesmos totais de antes"**: provado por composição (backfill + `countsInTotals` de pago), sem um teste que compare totais antes e depois da migração.

## SPEC_DEVIATION e riscos residuais

1. **SPEC_DEVIATION `seriesId` no arquivo** (`src/lib/vault/import-file.ts:83-86`): o arquivo aceita `seriesId` como id livre (1-64 caracteres), não uuid como dizia T15. É coerente com os outros ids do arquivo (os ids do arquivo são remapeados). O uuid é exigido no payload selado (`src/lib/validation/import-sealed.ts:70`, testado em `import-sealed.test.ts` "rejects a seriesId that is not a UUID"). Aceito.
2. **Duplicata no arquivo de importação não é rejeitada na leitura** (`src/lib/vault/import-file.ts:94-95` confere só a série). Um par `(seriesId, month)` repetido passa em `parseImportFile`, chega remapeado ao servidor e lá é rejeitado (`import-sealed.ts:85`, mutante M14 morto). O usuário vê o erro genérico do servidor em vez de "arquivo inválido" já na leitura. Nada é gravado (validação antes do repo; rollback em `import.int.test.ts:355`). Severidade: Minor.
3. **Receita de referência em categorias herda PAGO-05** (`src/components/categories-client.tsx:46`): `computeMonthTotals(opened.occurrences)` passou a ignorar ganho recorrente não recebido, então a receita de referência das metas cai até o salário ser marcado como recebido. É consequência direta e documentada da decisão (design, Risks). Fica registrada para a UAT, pois o usuário pode estranhar.
4. **Mensagem única para qualquer `ok: false`** (`overview-client.tsx:139-142`): "Transação não encontrada" e erros de validação também aparecem como `PAID_FAILED`. Isso cumpre o Edge Case da spec; o design (Error Handling) previa "Transação não encontrada" para ocorrência de outro usuário. Cosmetic.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAGO-01 | Implemented | ✅ Verified |
| PAGO-02 | Implemented | ✅ Verified |
| PAGO-03 | Implemented | ✅ Verified (UI por inspeção) |
| PAGO-04 | Implemented | ✅ Verified (UI por inspeção) |
| PAGO-05 | Implemented | ✅ Verified |
| PAGO-06 | Implemented | ✅ Verified (inspeção) |
| PAGO-07 | Implemented | ✅ Verified (AC 3 por composição) |
| PAGO-08 | Implemented | ✅ Verified |
| PAGO-09 | Implemented | ✅ Verified |
| PAGO-10 | Implemented | ✅ Verified (concorrência "última vence" por inspeção) |

---

## Summary

**Overall**: ✅ Ready (com ressalvas não bloqueantes)

**Spec-anchored check**: 34/34 critérios (29 ACs + 5 edge cases) com evidência; 2 spec-precision gaps parciais
**Sensor**: 14/14 mutações mortas
**Gate**: typecheck ok; unit 1845 passed; integration 900 passed; lint sem piora (1 erro prévio alheio)

**Next steps**: UAT manual da lista (ordem, opacidade, toque no controle, reversão em erro), porque a UI não tem teste automatizado (AD-005). Opcional: rejeitar duplicata de `paidMonths` já em `import-file.ts`.
