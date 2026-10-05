## Validation: recorrencia-parcelas - PASS

**Veredito**: PASS. Reverificação, iteração 2 de 3. A única lacuna da iteração 1 (o mutante M12 sobrevivia) foi fechada pelo commit de teste `0c8d067`. O gate Build está verde no `0c8d067`, com unit 619/619 e integração 323/323. O M12 agora é morto, e todos os 13 mutantes do sensor estão mortos. Todos os critérios de aceitação têm evidência `file:line`. Os critérios de UI (formulário e selo da lista) foram conferidos só por inspeção de código, porque o e2e está suspenso (AD-005). Isso é limitação aceita, não lacuna. A verificação manual no navegador da T8 continua pendente com o usuário.

**Date**: 2026-10-05
**Spec**: `.specs/features/recorrencia-parcelas/spec.md`
**Diff range**: commits da feature 024c60d fec9761 4e9c490 c19653e 01d4394 23e289d f961fb6 d295cf3, mais o commit de correção 0c8d067, verificados em `0c8d067`. Os commits `liberdade` intercalados e posteriores (8904827, 60c0769) são de outra sessão e foram ignorados.
**Verifier**: sub-agente independente (author != verifier). Usou um `git worktree` isolado do HEAD com `node_modules` em hard link (`cp -al`) e o banco privado `orcamento_verify_parc_test`. Os dois foram removidos no fim. As mudanças não commitadas de outra sessão na árvore real não foram tocadas.

---

## Lacuna da iteração 1: resolução

| Lacuna (iteração 1) | Resolução | Evidência |
| ------------------- | --------- | --------- |
| M12 sobrevivia: `loadSeries` sem o filtro `userId` não derrubava nenhum teste, porque o teste de outro usuário usava `series_id` distintos | `0c8d067` adiciona um teste que insere via `db` uma linha de outro usuário com o mesmo `series_id`, `date` 2026-01-10 e fim 2027-12 | `src/lib/db/repos/transactions.int.test.ts:1059-1092`: `july.installment toEqual({number: 3, total: 8})`, `july.seriesStart toBe("2026-05")`, `findStored toMatchObject({seriesStart: "2026-05"})`. M12 agora é morto (1 int) |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T6 | ✅ Done | Todos os itens Done-when marcados. Os testes existem como descrito |
| T7 | ✅ Done | UI sem teste (AD-005). Conferida por inspeção de código |
| Fix 1 (M12) | ✅ Done | `0c8d067` |
| T8 | ⚠️ Partial | Código e gate OK. O item "Verificação manual no app" (`tasks.md:578`) está desmarcado: não foi executado e fica para o usuário |

---

## Spec-Anchored Acceptance Criteria

Tipo de evidência: **T** = asserção de teste. **C** = só inspeção de código, porque o e2e está suspenso (AD-005).

### P1: Escolher mês inicial e mês final (PARC-01, PARC-02, PARC-03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 "até mês/ano" mostra Mês inicial e Mês final, inicial = mês da Data | dois campos; inicial preenchido com o mês da Data | C: `src/components/transaction-form.tsx:305` `recurrenceStart: v.recurrenceStart \|\| v.date.slice(0, 7)`; `:331-348` campo `type="month"` "Mês inicial" antes do Mês final (`:350`) | ✅ C only |
| AC2 "Não recorrente"/"sem data final" oculta o Mês inicial e começa no mês da Data | campo oculto; início = Data | C: `src/components/transaction-form.tsx:331` `recurrenceMode === "until" &&`. T: `src/lib/db/repos/transactions.int.test.ts:913-914` `date toBe("2026-04-10")`/`("2026-04-12")` com `recurrenceStartMonth: "2026-08"`; `src/lib/validation/transaction.test.ts:270-283` `recurrenceStartMonth toBeNull()` | ✅ (ocultar: C only) |
| AC3 grava uma transação com 1ª ocorrência no dia D de S e mês final E | 1 linha; `date` = D de S; fim = E | T: `src/lib/db/repos/transactions.int.test.ts:889-893` `toMatchObject({date: "2026-05-10", recurrenceDay: 10, recurrenceEnd: "2026-12-01"})`; `src/actions/transactions.int.test.ts:250-252` (o teste independente: Data 10/04, início 05/2026, fim 12/2026) | ✅ |
| AC4 mês S mostra a 1ª ocorrência na lista e no resumo | maio lista 10/05/2026 | T: `src/lib/db/repos/transactions.int.test.ts:895` `toEqual(["2026-05-10"])`; `src/actions/transactions.int.test.ts:254-256` parcela `[{number: 1, total: 8}]`. Resumo: evidência composta, porque `monthTotals` usa o mesmo `applicableInMonth` sobre a `date` gravada (asserida em `:889-893`) | ✅ (resumo composto) |
| AC5 mês antes de S sem ocorrência na lista e no resumo | abril vazio | T: `src/lib/db/repos/transactions.int.test.ts:894` `listIn("2026-04") toEqual([])`; `src/actions/transactions.int.test.ts:253`. Resumo: composto, como no AC4 | ✅ (resumo composto) |
| AC6 edição do 1º mês carrega o início da série e permite alterá-lo | campo com `seriesStart`, habilitado | C: `src/components/transaction-list.tsx:180` `recurrenceStart: editing.seriesStart ?? monthKey(editing.date)`; `:166` `startLocked` falso quando `seriesStart === editing.month`. T (dado): `src/lib/db/repos/transactions.int.test.ts:989` `seriesStart toBe("2026-05")`; `:1074-1077` `findStored` | ✅ C only (UI) |
| AC7 salvar o 1º mês com novo início mostra ocorrências só a partir dele | abril e maio vazios; junho 10/06 | T: `src/lib/db/repos/transactions.int.test.ts:928-932` `$count 1`, `date: "2026-06-10"`, `listIn(04)`/`listIn(05) toEqual([])`; `src/actions/transactions.int.test.ts:545-549`; `src/lib/domain/recurrence.test.ts:448` `updateInPlace toMatchObject({date: "2026-06-10", recurringDay: 10})` | ✅ |
| AC8 ocorrência fora do 1º mês mostra o início desabilitado | campo desabilitado com o início da série | C: `src/components/transaction-list.tsx:166` `startLocked={editing.seriesStart !== null && editing.seriesStart !== editing.month}`; `src/components/transaction-form.tsx:338` `disabled={startLocked}`. Servidor ignora o início enviado: T `src/lib/db/repos/transactions.int.test.ts:947-950`; `src/lib/domain/recurrence.test.ts:471-472,484` | ✅ C only (UI) |

### P1: Validar mês inicial e final (PARC-04)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 sem Mês inicial | "Informe o mês inicial" em `recurrenceStart` | T: `src/lib/validation/transaction.test.ts:188-195` `toEqual({recurrenceStart: ["Informe o mês inicial"]})` (ausente e `""`); `src/actions/transactions.int.test.ts:261,274` `fieldErrors: {recurrenceStart: "Informe o mês inicial"}`, `$count 0` | ✅ |
| AC2 Mês inicial inválido / fora de 2000-01..2100-12 | "Mês inicial inválido" em `recurrenceStart` | T: `src/lib/validation/transaction.test.ts:197-204` (2026-13, 1999-12, 2101-01, "outubro", 2026-1, 2026-00) `toEqual({recurrenceStart: ["Mês inicial inválido"]})`; `:206-215` limites 2000-01 e 2100-12 aceitos; `src/actions/transactions.int.test.ts:262` | ✅ |
| AC3 Mês final antes do inicial | "O mês final deve ser igual ou posterior ao mês inicial" em `recurrenceEnd` | T: `src/lib/validation/transaction.test.ts:217-226` (06/2026 → 05/2026, o teste independente) `toEqual({recurrenceEnd: [...]})`; `:228-237` compara com o início, não com a Data; `src/actions/transactions.int.test.ts:211-212,263-267`; edição: `:561-568` (1º mês) e `:580-585` (meio da série, fim antes do mês editado) | ✅ |
| AC4 "Não recorrente"/"sem data final" ignoram o Mês inicial | início = mês da Data | T: `src/lib/validation/transaction.test.ts:270-283` `recurrenceStartMonth toBeNull()`; `src/lib/db/repos/transactions.int.test.ts:907-915` | ✅ |
| AC5 mensagens do Mês final mantidas | "Informe o mês final", "Mês final inválido" | T: `src/lib/validation/transaction.test.ts:179-186`, `:250-257`; `src/actions/transactions.int.test.ts:208,214,220` | ✅ |

### P1: Parcela na lista de transações (PARC-05, PARC-06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 "N/T" ao lado da descrição; N = mês na série, T = meses início..fim | 05..12/2026: 1/8, 3/8, 8/8 (teste independente) | T: `src/lib/db/repos/transactions.int.test.ts:986-988` `installment toEqual({number: 1, total: 8})`/`{3, 8}`/`{8, 8}`; `src/lib/domain/recurrence.test.ts:393-397`. Exibição: C `src/components/transaction-list.tsx:98-104` `{t.installment.number}/{t.installment.total}` | ✅ (exibição C) |
| AC2 série de 12 meses: "1/12" no início, "12/12" no fim | 1/12, 12/12 | T: `src/lib/domain/recurrence.test.ts:388-390` | ✅ |
| AC3 parcela no lugar do selo "Recorrente" | sem "Recorrente" quando há parcela | C: `src/components/transaction-list.tsx:98-114` `t.installment ? <installment-badge> : t.recurring && <recurring-badge>` | ✅ C only |
| AC4 "sem data final" mantém "Recorrente" sem parcela | `installment` null; selo | T: `src/lib/db/repos/transactions.int.test.ts:999-1002` `[forever.id, null, "2026-10"]`; C: `transaction-list.tsx:106-113` | ✅ (selo C) |
| AC5 avulso sem parcela nem selo | `installment` null, `recurring` false | T: `src/lib/db/repos/transactions.int.test.ts:1000` `[single.id, null, null]`; `src/lib/domain/recurrence.test.ts:427-429`; C: `transaction-list.tsx:106` `t.recurring &&` | ✅ (selo C) |
| AC6 série editada no meio: N pelo início da série, T pelo fim atual | jul 3/12, dez 8/12 | T: `src/lib/db/repos/transactions.int.test.ts:1016-1018` `[4000, {3, 12}]`, `[5000, {8, 12}]`, `seriesStart "2026-05"`; `src/lib/domain/recurrence.test.ts:413-418` | ✅ |
| AC7 após excluir a partir de M, T recalculado até M-1 | 05..12 excluída de 09: ago 4/4, mai 1/4 | T: `src/lib/db/repos/transactions.int.test.ts:1026-1027` | ✅ |
| AC8 último segmento "sem data final": sem parcela em nenhuma ocorrência, selo "Recorrente" | `installment` null em jul e out | T: `src/lib/db/repos/transactions.int.test.ts:1040-1041` `toBeNull()`; `src/lib/domain/recurrence.test.ts:420-425`; selo: C `transaction-list.tsx:106-113` | ✅ (selo C) |

**Status**: ✅ Todos os 21 critérios têm evidência. 0 lacunas de AC. Por inspeção de código apenas (AD-005, limitação aceita): PARC AC1/AC2 (ocultar)/AC6/AC8 da história 1 e a exibição do selo nos ACs 1, 3, 4, 5 e 8 da história 3. O resumo nos ACs 4 e 5 da história 1 tem evidência composta.

---

## Edge Cases

- [x] Mês inicial = Mês final → uma ocorrência "1/1": `src/lib/domain/recurrence.test.ts:400-404` `toEqual({number: 1, total: 1})`; aceito na validação `src/lib/validation/transaction.test.ts:239-248`.
- [x] Data dia 31 e Mês inicial de 30 dias → dia 30: `src/lib/db/repos/transactions.int.test.ts:903-904` `{date: "2026-04-30", recurrenceDay: 31}` e maio `"2026-05-31"`; edição `src/lib/domain/recurrence.test.ts:460` `{date: "2026-04-30", recurringDay: 31}`.
- [x] Virada de ano 11/2026-02/2027 → 1/4 e 4/4: `src/lib/domain/recurrence.test.ts:407-411`.

---

## Payload / Conjunction Check

| Field | Asserted on value? | Evidence |
| ----- | ------------------ | -------- |
| `date`, `recurrenceDay`, `recurrenceEnd` gravados | ✅ | `src/lib/db/repos/transactions.int.test.ts:889-893,903,929,964-968` |
| `Occurrence.installment` (`number` e `total`) | ✅ | `:986-988,1016-1017,1026-1027` (M1, M2, M3 mortos) |
| `Occurrence.seriesStart` / `findStored.seriesStart` | ✅ | `:989,999-1002,1018,1074-1081` (M4, M13 mortos) |
| `recurrenceStartMonth` na saída da validação | ✅ | `src/lib/validation/transaction.test.ts:206-215,228-248,270-283` |
| escopo por `userId` em `loadSeries` | ✅ | `src/lib/db/repos/transactions.int.test.ts:1059-1092` com linha estrangeira de mesmo `series_id` (M12 morto na iteração 2) |

---

## Discrimination Sensor

Iteração 1: rodou no worktree isolado do HEAD `d295cf3` com o banco privado. Cada mutante foi aplicado por substituição de texto, rodou contra `recurrence.test.ts` + `transaction.test.ts` (unit, 93 testes) e `transactions.int.test.ts` do repo + da action (integração, 128 testes), e o arquivo foi restaurado em seguida.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/domain/recurrence.ts:74` | `installmentOf`: N sem `+ 1` | ✅ Killed (5 unit, 5 int) |
| M2 | `src/lib/domain/recurrence.ts:74` | `installmentOf`: T sem `+ 1` | ✅ Killed (5 unit, 5 int) |
| M3 | `src/lib/domain/recurrence.ts:71` | T usa o fim do primeiro segmento (menor `date`) em vez do último | ✅ Killed (2 unit, 2 int) |
| M4 | `src/lib/domain/recurrence.ts:59` | `startOfSeries` usa o maior mês | ✅ Killed (3 unit, 2 int) |
| M5 | `src/lib/domain/recurrence.ts:149-150` | `planEdit` aplica `startMonth` em qualquer mês (`movesStart` sem a checagem de 1º mês) | ✅ Killed (2 unit, 3 int) |
| M6 | `src/lib/db/repos/transactions.ts:107` | `create` ignora o mês inicial | ✅ Killed (3 int) |
| M7 | `src/lib/db/repos/transactions.ts:110` | `create` monta `AAAA-MM-DD` sem o ajuste do dia 31 | ✅ Killed (1 int) |
| M8 | `src/lib/validation/transaction.ts:79` | `recurrenceEnd < start` → `<=` (rejeita início = fim) | ✅ Killed (1 unit) |
| M9 | `src/lib/validation/transaction.ts:79` | compara o fim com o mês da Data em vez do mês inicial | ✅ Killed (1 unit, 1 int) |
| M10 | `src/actions/transactions.ts:99` | regra do início efetivo invertida | ✅ Killed (1 int) |
| M11 | `src/actions/transactions.ts:102` | `recurrenceEndMonth < startMonth` → `<=` | ✅ Killed (1 int) |
| M12 | `src/lib/db/repos/transactions.ts:274` | `loadSeries` sem `eq(transaction.userId, userId)` | Iteração 1: ❌ Survived → Fix 1. Iteração 2 (`0c8d067`): ✅ Killed (1 int) |
| M13 | `src/lib/db/repos/transactions.ts:310` | `findStored` devolve `seriesStart: null` sempre | ✅ Killed (2 int) |

Precedência do selo na lista (`transaction-list.tsx:98`) não tem teste automático (AD-005), então um mutante ali não pode ser morto. Foi conferida por inspeção e fica registrada como limitação, não como mutante.

Iteração 2: no worktree isolado de `0c8d067` foram rodados de novo o M12 e, como controle, o M6 e o M13 no mesmo repositório (integração com 129 testes). Os três foram mortos. O `0c8d067` só adiciona um teste, então os demais mutantes continuam válidos contra o mesmo código.

**Sensor depth**: expandido (13 mutantes; a feature mexe na persistência de séries)
**Result**: 13/13 killed (após o Fix 1) - PASS ✅
**Isolation**: nas duas iterações, o `git status --porcelain` da árvore real ficou igual ao baseline tirado antes de começar, a não ser pelos arquivos gerados por esta verificação (`validation.md` e o armazenamento de lições). As mudanças não commitadas da outra sessão não foram tocadas.

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` (nível Build, de `tasks.md`). Iteração 2: rodou em `0c8d067` com Node v20.20.2 no worktree isolado e banco `orcamento_verify_parc_test`.
- **typecheck**: ✅ exit 0
- **lint**: ✅ exit 0
- **build**: ✅ exit 0
- **test:unit**: ✅ 619 passed, 0 failed, 0 skipped (18 files)
- **test:int**: ✅ 323 passed, 0 failed, 0 skipped (13 files). Na iteração 1 foram 322; o +1 é o teste do Fix 1
- **Test count delta (casos `it` nos arquivos da feature)**: `recurrence.test.ts` +14; `transaction.test.ts` +7 / -3 (os 3 removidos foram renomeados e reescritos para a nova mensagem e o novo limite, como pede a T3); `repos/transactions.int.test.ts` +13 (+1 no Fix 1); `actions/transactions.int.test.ts` +7. Nenhuma asserção enfraquecida.
- **Skipped tests**: nenhum.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ os 8 commits só tocam os arquivos do escopo e os documentos da feature |
| No scope creep | ✅ |
| Matches patterns | ✅ reaproveita `occurrenceDate`, `isValidMonth`, o bloco do Mês final e o selo existente |
| Spec-anchored outcome check | ✅ mensagens, datas e parcelas batem com a spec palavra por palavra |
| Per-layer Coverage Expectation met | ✅ escopo por `userId` agora discriminado (M12 morto) |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md`, Test Coverage Matrix de `tasks.md` | ✅ |

Observação de comportamento (sem lacuna): o Mês inicial só é preenchido quando ainda está vazio (`transaction-form.tsx:305`). Se o usuário escolhe "até mês/ano", muda a Data e volta a escolher a opção, o Mês inicial mantém o valor anterior. Isso segue a premissa da spec ("depois é independente dela").

---

## Fix Plans

### Fix 1 (iteração 1, ✅ resolvido em `0c8d067`): o teste de outro usuário não discrimina o filtro `userId` de `loadSeries`

- **Root cause**: `src/lib/db/repos/transactions.int.test.ts:1044-1056` cria séries de dois usuários com `series_id` distintos (UUID do primeiro segmento), então a consulta sem `userId` devolve o mesmo resultado. O banco não tem FK nem unicidade em `series_id` (`src/lib/db/schema.ts:113`), então uma linha de outro usuário com o mesmo `series_id` é representável e entraria no cálculo de N/T e de `seriesStart`.
- **Fix task**: no teste, inserir direto via `db` uma linha recorrente de outro usuário com o mesmo `series_id` da série do usuário, com `date` anterior e outro `recurrence_end`, e asserir que `listByMonth(userId, …)` e `findStored(userId, …)` mantêm `installment` `{3, 8}` e `seriesStart "2026-05"`.
- **Verify**: o mutante M12 (`loadSeries` sem `eq(transaction.userId, userId)`) passa a ser morto; o teste passa com o código atual.
- **Priority**: Minor (o código está correto; falta a proteção de regressão de um requisito do Done-when da T5).

### Pendência do usuário (não é tarefa de correção)

- T8, verificação manual no navegador (`tasks.md:578`): série 05/2026-12/2026 mostra 1/8 … 8/8; editar o mês inicial move o início.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PARC-01 | Pending | ✅ Verified (campos por inspeção de código, AD-005) |
| PARC-02 | Pending | ✅ Verified |
| PARC-03 | Pending | ✅ Verified (campo travado por inspeção de código) |
| PARC-04 | Pending | ✅ Verified |
| PARC-05 | ❌ Needs Fix (iteração 1) | ✅ Verified (exibição do selo por inspeção de código) |
| PARC-06 | Pending | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/21 critérios batem com o resultado da spec; 0 spec-precision gaps; parte da UI só por inspeção (AD-005, limitação aceita)
**Sensor**: 13/13 killed (o M12 sobreviveu na iteração 1 e foi morto na iteração 2)
**Gate**: typecheck, lint e build passam; unit 619/619; integração 323/323

**What works**: mês inicial na criação e na edição do 1º mês, ajuste do dia 31, validação com as mensagens exatas, início efetivo na action, N/T com edição no meio, exclusão e último segmento sem fim, escopo por usuário.

**Pendente com o usuário (não bloqueia)**: verificação manual da T8 no navegador (`tasks.md:578`).

**Next steps**: nenhum para o código. A feature está pronta.
