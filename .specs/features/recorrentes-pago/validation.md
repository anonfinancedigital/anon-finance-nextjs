# Recorrentes: pago e não pago Validation

**Date**: 2026-11-05
**Spec**: `.specs/features/recorrentes-pago/spec.md` (versão de `7fd73de`: AC 5 e AC 8 do botão, AC 3 da opacidade e a história "Alternar o estado ao editar a ocorrência")
**Diff range**: `1fcdb58..HEAD` (`a24ca2c`), commits de T20 a T24 (`155a7d4..a24ca2c`) mais o commit de docs `7fd73de`
**Verifier**: sub-agente independente (author ≠ verifier), re-derivado da spec

**Verdict**: FAIL
**Result**: FAIL

O gate passou: typecheck, lint sem piora, build, unit 1851/1851 e integration 906/906. Todos os ACs novos têm evidência `file:line`. O FAIL vem de um defeito que achei com um teste de sonda, rodado só no worktree descartável. Na edição do primeiro mês de uma série "até", quem adianta o início e salva com o switch ligado deixa um estado pago órfão no mês antigo. O switch já abre ligado quando o mês estava pago. Isso contradiz a premissa "Início da série movido para frente", a P2 AC 7 (PAGO-08) e a P1 "Alternar" AC 2: o estado foi gravado num mês que não tem mais ocorrência. O sensor matou 6 de 9 mutações. Uma das sobreviventes é equivalente; as outras duas apontam esse defeito e uma lacuna de teste.

---

## Histórico: ciclo 1 (T1-T19)

- Diff `c605e5a..1fcdb58`, em 2026-11-04. Verdict **PASS**
- 34/34 critérios com evidência; 14/14 mutações mortas (M1-M14); unit 1845/1845; integration 900/900
- Ressalvas não bloqueantes, que continuam valendo:
  - Concorrência "última recebida vence" coberta só com escritas iguais (`transactions.sealed.int.test.ts:923`)
  - PAGO-07 AC 3 provado por composição
  - SPEC_DEVIATION `seriesId` livre no arquivo (`import-file.ts:83-86`)
  - Par `(seriesId, month)` repetido só é rejeitado no servidor
  - Receita de referência herda PAGO-05
  - Mensagem única `PAID_FAILED`
- Os ACs do ciclo 1 que este ciclo não tocou mantêm a evidência daquele relatório. A seção "Regressão" abaixo cobre os que T20-T24 alteraram.

---

## Ciclo 2 (T20-T24)

### Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T20 | ✅ Done | `paidActionLabel` em `src/lib/domain/paid.ts:30` |
| T21 | ✅ Done | `paid` opcional em `src/lib/validation/transaction-sealed.ts:71`; `UpdateTransactionDto.paid` em `src/lib/vault/types.ts:44` |
| T22 | ⚠️ Done com defeito | `writePaidAfterEdit` (`src/lib/db/repos/transactions.ts:358`) é chamado depois da poda (`:397-398`) e grava um mês sem ocorrência quando o início é adiantado (Gap 1) |
| T23 | ✅ Done | Switch em `src/components/transaction-form.tsx:472-484` |
| T24 | ✅ Done | Botão e opacidade em `src/components/transaction-list.tsx:183-274` |

### Spec-Anchored Acceptance Criteria (novos e alterados)

Caminhos relativos a `src/`. "Inspeção" = evidência de UI por código (AD-005: sem e2e e sem teste de componente).

#### PAGO-11: P1 "Marcar uma ocorrência recorrente como paga", AC 5 e AC 8

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | ---------------------------- | ---------------------- | ------ |
| 5 Paga: botão "Pago"/"Recebido" com check preenchido; o toque desmarca | Rótulo exato, check preenchido, toque → não paga | `lib/domain/paid.test.ts:170-171`: `paidActionLabel("expense", true)).toBe("Pago")` e `("income", true)).toBe("Recebido")`. Ligação por inspeção em `components/transaction-list.tsx:271-272`: `<CheckIcon ... strokeWidth={counts ? 3 : 2} />` e `{paidActionLabel(t.kind, counts)}`. O toque chama `onTogglePaid(t)` (`:264`), que manda `next = t.paid !== true` (`overview-client.tsx:127`) | ✅ PASS (unit + inspeção). "Preenchido" é um traço mais grosso (`strokeWidth 3`), não um ícone sólido: ⚠️ ver spec-precision 3 |
| 8 Não paga: botão com check e "Marcar como pago"/"Marcar como recebido"; o toque marca | Rótulo exato, ícone de check, toque → paga | `paid.test.ts:165-166`: `toBe("Marcar como pago")`, `toBe("Marcar como recebido")`. `paid.test.ts:175-176`: `null` e `undefined` dão o rótulo de não pago. Inspeção `transaction-list.tsx:271` (`CheckIcon` com `opacity-60` quando não conta) | ✅ PASS |

#### PAGO-12: P1 "Alternar o estado ao editar a ocorrência"

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | ---------------------------- | ---------------------- | ------ |
| 1 Switch "Pago"/"Recebido" ao editar recorrente, refletindo o mês exibido | Rótulo por tipo; valor inicial = estado do mês | Inspeção `components/transaction-form.tsx:475`: `{values.kind === "income" ? "Recebido" : "Pago"}`. `:478`: `checked={values.paid === true}`. O valor inicial vem de `transaction-list.tsx:314`, `paid: editing.paid === true`. `editing` é a linha `t` do clique (`:196`, `:286`), tirada de `shown = orderByPaid(... effective ...)` (`overview-client.tsx:164`), que já tem o override otimista (`:124`). Um toque recente na linha, portanto, aparece no switch | ✅ PASS (inspeção). Risco R2 (snapshot) |
| 2 Salvar grava só o mês exibido, na mesma operação | Uma linha `(série, mês)` e mais nada; atômico com a edição | `lib/db/repos/transactions.sealed.int.test.ts:1207`: `paidMonthsOf(tx.id)).toEqual(["2026-10"])`. `:1218`: na divisão, `toEqual(["2026-10","2026-12","2027-01"])` e `$count(transaction)).toBe(2)`. `:1228`: `paid:false` → `toEqual(["2026-10","2026-12"])`. Atomicidade: `writePaidAfterEdit` roda dentro do `db.transaction` de `updateFromSealed` (`lib/db/repos/transactions.ts:383,398`). Ligação: a ação repassa `...extra.data` (`actions/transactions-sealed.ts:119-122`) e o form envia `paid` (`transaction-form.tsx:262-263`) | ❌ GAP: no primeiro mês com início adiantado, o mês "exibido" deixa de ter ocorrência e o estado vira órfão (Gap 1) |
| 3 Cancelar ou fechar sem salvar mantém o estado | Nada é gravado | Inspeção: o switch só muda o estado local (`transaction-form.tsx:479`, `set("paid", on)`). A única escrita é `updateTransactionSealed` dentro de `save` (`:263`). Cancelar chama `onCancel` → `setEditing(null)` (`transaction-list.tsx:321`; botão em `transaction-form.tsx:620`) | ✅ PASS (inspeção) |
| 4 Servidor rejeita → estado anterior | Nenhuma escrita em `recurring_paid` | `transactions.sealed.int.test.ts:1258-1261`: mês sem ocorrência e id de outro usuário → `toBe(false)` e `paidMonthsOf).toEqual(["2026-10"])`. As rejeições da ação (`DATE_OUTSIDE_MONTH`, `END_BEFORE_START`, esquema) retornam antes do repo (`actions/transactions-sealed.ts:89-117`, inspeção) | ✅ PASS |
| 5 Sem switch ao criar, em avulso ou com recorrência desligada | Switch ausente | Inspeção `transaction-form.tsx:472`: `{wasRecurring && recurrenceMode !== "none" && editedMonth && (...)}`, com `wasRecurring = !!transaction && recurrence !== "none"` (`:164`). Ao criar, `transaction` é indefinido (`new-transaction-button.tsx:74`). O envio tem o mesmo guarda (`:262`): `paid` só vai quando a recorrência está ligada. `transactionSchema.safeParse(input)` (`:232`) não recebe `paid` (`input` em `:217-229`) | ✅ PASS (inspeção) |
| 6 Divisão de série com switch ligado → só o mês exibido pago | Demais meses intactos | `transactions.sealed.int.test.ts:1218`: `toEqual(["2026-10","2026-12","2027-01"])`, com 10 e 01 marcados antes | ✅ PASS |

Edição que vira "Não recorrente" com `paid:true` não deixa estado: `transactions.sealed.int.test.ts:1250` → `toEqual(["2026-10"])`. Edição sem `paid` não altera o estado: `:1238`. Esquema: `lib/validation/transaction-sealed.test.ts:12` (ausente → `toBeUndefined()`), `:16-17` (`true`/`false` mantidos), `:21-22` (`"true"` e `null` → `success).toBe(false)`).

#### PAGO-03: P1 "Não pagas por último", AC 3 (alterado)

| AC | Resultado definido pela spec | `file:line` + asserção | Result |
| -- | ---------------------------- | ---------------------- | ------ |
| 3 Opacidade 0,5 só no conteúdo (ícone, descrição, categoria, valor); botão com opacidade 1; demais linhas 1 | `opacity-50` no ícone, no bloco de texto e no valor; nada no `<li>`, no botão nem no menu | Inspeção `transaction-list.tsx`: o `<li>` (`:184`) não tem mais opacidade. Ícone `:189`: `${counts ? "" : "opacity-50"}`. Bloco de texto com descrição e categoria `:198-200`. Valor `:255-257`. O botão de marcar (`:262-274`) e `TransactionRowMenu` (`:275`) ficam sem `opacity-50`. `counts = countsInTotals(t)` (`:162`), e linha que conta recebe `""` | ✅ PASS (inspeção) |

#### Regressão dos ACs antigos tocados

| AC antigo | Situação | Evidência |
| --------- | -------- | --------- |
| P1 Marcar AC 5 (antigo: "Pago"/"Não pago" no controle) | Substituído pelos novos AC 5/AC 8. `paidLabel` continua testado (`paid.test.ts:116-126`) mas saiu da lista; não é mais usado na UI de linha | `transaction-list.tsx:25` importa `paidActionLabel`, não `paidLabel` |
| P1 Marcar AC 4 (controle só em recorrentes) | Mantido | `transaction-list.tsx:261`: `{t.recurring && onTogglePaid && (` |
| Ordem e totais (PAGO-03 AC 1-2, PAGO-05) | Inalterados no diff (`overview-client.tsx` fora do diff). Os testes de `orderByPaid` e `computeMonthTotals` seguem verdes | `paid.test.ts:55`; `month-totals.test.ts:103,113` (unit 1851/1851) |
| P2 AC 7 (início adiantado apaga os anteriores) | ❌ Regride pelo novo caminho do switch | Gap 1 |
| PAGO-02 AC 7 (editar não muda os estados) | Mantido para edição sem `paid` (`transactions.sealed.int.test.ts:1238`). Com o form atual, toda edição de recorrente envia `paid` igual ao estado inicial. Sem tocar no switch, regrava o mesmo valor: idempotente, salvo no caso do Gap 1 | Inspeção `transaction-form.tsx:262` |

**Status**: ❌ 1 gap (PAGO-12 AC 2 / PAGO-08 AC 7), ⚠️ 4 spec-precision gaps.

Payload/conjunction: as asserções de T22 conferem o conteúdo de `recurring_paid` por série e mês, além do retorno, e na divisão conferem também a contagem de linhas de `transaction` (`:1217`). O esquema confere o valor de `paid`, não só o `success`.

### Lentes L-076..L-078 (candidatas do ciclo anterior)

- **L-076, escritas opostas concorrentes.** Switch salvo e toque na linha concorrentes se serializam pelo `lockSeries` (`transactions.ts:384`) e pelo `setPaid`, que usa o mesmo lock. Não há teste de escritas opostas, e a ressalva do ciclo 1 continua. Há um caso novo: o form sempre envia `paid` (`transaction-form.tsx:262`), mesmo sem o usuário tocar no switch. Uma edição salva, portanto, sobrescreve uma marcação feita em outro aparelho entre abrir e salvar o form ("última vence", coerente com a spec, mas invisível ao usuário). Risco R3.
- **L-077, migração com comparação antes e depois.** Não se aplica: o ciclo não tem migração.
- **L-078, regras do servidor vs parser do arquivo.** O servidor não valida que o mês de `paidMonths` tem ocorrência (`validation/import-sealed.ts:82-85` confere só a série). Um estado órfão do Gap 1, então, é exportado e reimportado sem erro, e o órfão se propaga pelo backup.

### Gate Check

Node 20 (`~/.nvm/versions/node/v20.20.2`). Integração só no banco privado `orcamento_pago_test` (container `orcamento-pg`, porta 5433). Nenhum e2e rodado (AD-005).

- `npm run typecheck`: exit 0
- `npm run lint`: 97 problemas (1 erro, 96 avisos), igual à baseline. O único erro é prévio (`src/app/layout.tsx:70`, `@next/next/no-sync-scripts`). `npx eslint` nos 9 `.ts/.tsx` do diff: exit 0
- `npm run build`: exit 0
- `npm run test:unit`: **1851 passed / 0 failed**, 108 arquivos (+6 desde o ciclo 1: 3 em `paid.test.ts` e 3 no novo `transaction-sealed.test.ts`)
- `npm run test:int`: **906 passed / 0 failed**, exit 0, 151 s (+6 desde o ciclo 1, em `transactions.sealed.int.test.ts:1181-1263`)
- Flaky: nenhum nesta rodada. Skipped: nenhum. Nenhum teste removido nem enfraquecido

### Discrimination Sensor

Rodei o sensor num `git worktree` descartável no scratchpad (node_modules por symlink), com o banco próprio `orcamento_pago_verifier_test`, criado e apagado ao final. A árvore real começou com `git status --porcelain` vazio e continuou vazia depois de `git worktree remove --force` + `git worktree prune`. Base sem mutação: `transactions.sealed.int.test.ts` 73/73.

| # | File:line | Descrição | Testes | Killed? |
| - | --------- | --------- | ------ | ------- |
| M15 | `src/lib/domain/paid.ts:31` | `paidActionLabel` invertido (`paid === true` → `!== true`) | paid.test | ✅ Killed (3) |
| M16 | `src/lib/db/repos/transactions.ts:368` | `paid:false` apaga todos os meses da série (sem filtro de mês) | sealed.int | ✅ Killed (1: `:1228`) |
| M17 | `src/lib/db/repos/transactions.ts:359` | `writePaidAfterEdit` ignora `paid:false` | sealed.int | ✅ Killed (1: `:1228`) |
| M18 | `src/lib/db/repos/transactions.ts:361` | Remover o guarda `recurringDay === null` (fallback para o id da linha) | sealed.int | ⚪ Survived, **equivalente**: `planEdit` põe `seriesId: null` em toda edição não recorrente (`domain/recurrence.ts:160`), então `!edited.seriesId` já cobre |
| M18b | `src/lib/db/repos/transactions.ts:361` | Gravar mesmo quando a edição vira "Não recorrente" (`seriesId ?? truncate.id ?? updateInPlace.id`) | sealed.int | ✅ Killed (1: `:1250`) |
| M19 | `src/lib/db/repos/transactions.ts:362` | Usar o id do segmento editado no lugar do `seriesId` (`plan.updateInPlace?.id ?? seriesId`) | sealed.int | ❌ **Survived**. Os testes só editam no lugar o primeiro segmento, cujo id é o `seriesId`. Uma sonda (edição no lugar de um segundo segmento com `paid:true`) passa no código real e mata o mutante |
| M20 | `src/lib/validation/transaction-sealed.ts:71` | Esquema aceita `paid` string | transaction-sealed.test | ✅ Killed (1) |
| M21 | `src/lib/db/repos/transactions.ts:397-398` | `writePaidAfterEdit` antes de `prunePaidAfterEdit` | sealed.int | ❌ **Survived**. Nenhum teste combina `paid` com poda. Com a ordem trocada, a sonda do Gap 1 **passa**: a ordem atual é que produz o órfão |
| M22 | `src/lib/db/repos/transactions.ts:398` | Chamada de `writePaidAfterEdit` removida | sealed.int | ✅ Killed (3) |

**Sensor depth**: expandido (integridade de dados, ≥5 mutações)
**Result**: 6/9 mortas (M15, M16, M17, M18b, M20, M22), 1 equivalente (M18), 2 sobreviventes reais (M19, M21) - FAIL ❌

Sonda (só no worktree; arquivo descartado). Série "até" de 2026-01 a 2026-12 com janeiro pago. `updateFromSealed(userId, id, "2026-01", { ...tx, recurrenceStartMonth: "2026-03", paid: true })` → linha movida para `2026-03-10`, mas `recurring_paid` = `['2026-01']` (esperado `[]`). Esse é o payload que o form manda: o switch abre ligado porque janeiro estava pago.

### Spec-precision gaps

1. **Switch depois de um toque na linha antes do refresh.** A spec não diz o que o switch mostra se o usuário marca na linha e abre o form antes da revalidação, nem o que acontece se esse toque falhar com o form aberto. O código mostra o valor otimista: `editing` é um snapshot de `t` tirado de `effective`. Se o toque falhar depois de aberto, o snapshot fica velho e "Salvar" reenvia o valor otimista (R2).
2. **Switch com o início adiantado no primeiro mês.** A spec não define se o estado vai para o mês antigo (que deixa de existir), para o novo mês inicial ou para nenhum. O código grava no mês antigo e deixa um órfão (Gap 1).
3. **"Check preenchido".** O botão pago usa `CheckIcon` com `strokeWidth={3}` (`transaction-list.tsx:271`), um traço mais grosso, não um ícone sólido. A spec não diz o que é "preenchido".
4. **`aria-pressed` removido por design** (T24: "o rótulo muda"). A spec não fala de acessibilidade. Um leitor de tela lê "Marcar como pago" e depois "Pago", mas o botão "Pago" não anuncia que o toque desmarca. Isso não está nos ACs e fica como observação de UAT.

### Riscos residuais

- **R1 (= Gap 1).** Estado órfão no início adiantado. Se o usuário depois recua o início de volta (permitido, `transactions.sealed.int.test.ts` "keeps every paid month when the start moves back"), janeiro reaparece **pago** sem que ninguém o tenha marcado. O órfão também segue no export e no import (L-078).
- **R2.** Snapshot de `editing` (`transaction-list.tsx:196,286`): o switch não acompanha um rollback do toque otimista que aconteça com o diálogo aberto.
- **R3.** O form envia `paid` em toda edição de recorrente, mesmo sem mudança (`transaction-form.tsx:262`). Uma marcação feita em outro aparelho entre abrir e salvar é sobrescrita. Uma alternativa é mandar `paid` só quando difere do valor inicial.
- O design não pedia o rótulo do switch via `paidLabel` (T23 cita "Reuses `paidLabel`"); o form usa um ternário próprio (`transaction-form.tsx:475`). Os textos batem com a spec. Cosmetic.

### Fix Plans

#### Fix 1 (Major): estado órfão ao adiantar o início com o switch ligado

- **Root cause**: `updateFromSealed` chama `prunePaidAfterEdit` antes de `writePaidAfterEdit` (`transactions.ts:397-398`). A poda apaga os meses anteriores ao novo início e a escrita reinsere o mês editado, que já não tem ocorrência.
- **Fix task**: não gravar o estado quando o mês editado deixa de ter ocorrência. A forma mínima é trocar a ordem (gravar e depois podar; M21 mostra que isso resolve). A alternativa é pular quando `monthKey(edited.date) > month` no primeiro mês. Se o usuário quiser que o estado acompanhe o novo início, registrar isso na spec antes (spec-precision 2).
- **Verify**: teste de integração em `transactions.sealed.int.test.ts` (bloco PAGO-12): série "até" com o primeiro mês pago, edição desse mês adiantando o início com `paid: true` → `paidMonthsOf).toEqual([...sem o mês antigo])` e `orphans()).toBe(0)`.
- **Priority**: Major (PAGO-08 AC 7 / PAGO-12 AC 2)

#### Fix 2 (Minor): teste de edição no lugar de segmento posterior com `paid`

- **Root cause**: M19 sobrevive. Falta cenário em que o segmento editado no lugar não é o primeiro da série (id ≠ `seriesId`).
- **Fix task**: dividir a série em 2026-12 e editar o segundo segmento em 2026-12 com `paid: true` → `paidMonthsOf(tx.id)).toEqual(["2026-12"])`.
- **Priority**: Minor (o código está correto, segundo a sonda)

### Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`writePaidAfterEdit` com 13 linhas; `paidActionLabel` com 3) |
| Surgical changes | ✅ (9 arquivos de código, todos nomeados nas tasks) |
| No scope creep | ✅ |
| Matches patterns | ✅ (esquema e escrita seguem `setPaid` e `prunePaidAfterEdit`) |
| Spec-anchored outcome check | ❌ (Gap 1) |
| Per-layer Coverage Expectation | ⚠️ domínio 1:1 (`paid.test.ts:163-177`); repo sem o cenário combinado com poda (M21) nem o de segmento posterior (M19); UI por inspeção (AD-005) |
| Every test maps to a requirement | ✅ (títulos citam PAGO-11/PAGO-12) |
| Documented guidelines | `AGENTS.md` (AD-005) ✅ |

### Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAGO-03 | Verified (ciclo 1) | ✅ Verified (AC 3 alterado, por inspeção) |
| PAGO-08 | Verified (ciclo 1) | ❌ Needs Fix (AC 7 regride pelo switch, Gap 1) |
| PAGO-11 | Implemented | ✅ Verified (unit + inspeção) |
| PAGO-12 | Implemented | ❌ Needs Fix (AC 2, Gap 1; M19/M21) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 10/11 critérios novos ou alterados com evidência que bate com a spec (PAGO-11 AC 5/8, PAGO-12 AC 1-6, PAGO-03 AC 3); 1 gap (PAGO-12 AC 2, com regressão de PAGO-08 AC 7); 4 spec-precision gaps
**Sensor**: 9 mutações, 6 mortas, 1 equivalente, 2 sobreviventes (M19, M21)
**Gate**: typecheck ok; lint sem piora; build ok; unit 1851 passed; integration 906 passed

**What works**: rótulos de ação, botão com check, opacidade só no conteúdo, switch condicionado e enviado só com a recorrência ligada, gravação atômica em edição simples e na divisão, "Não recorrente" ignora `paid`, rejeição sem escrita.

**Next steps**: Fix 1 (ordem escrita→poda, com teste) e Fix 2 (teste de segmento posterior); depois, nova verificação. UAT manual do botão e do switch (AD-005).
