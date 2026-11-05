# Recorrentes: pago e não pago Validation

**Date**: 2026-11-05
**Spec**: `.specs/features/recorrentes-pago/spec.md` (versão de `7fd73de`, sem mudança neste ciclo)
**Diff range**: `3366c3f..HEAD` (`ecc412a`), commits `0600565` (T25) e `ecc412a` (T26)
**Verifier**: sub-agente independente (author ≠ verifier), ciclo 3, re-derivado da spec

**Verdict**: PASS
**Result**: PASS

O gap Major do ciclo 2 está fechado. `updateFromSealed` agora grava o estado do switch e só depois poda (`src/lib/db/repos/transactions.ts:397-399`). Um teste novo prova que adiantar o início com `paid: true` não traz de volta o mês antigo, e o mutante que reverte a ordem morre. O gap Minor também está fechado: o teste de edição no lugar de um segmento posterior mata M19. T26 só troca classes de cor e confere por inspeção. O gate passou: typecheck, lint sem piora, build, unit 1851/1851 e integration 908/908. O sensor matou 5 de 5 mutações. Ficam riscos residuais e spec-precision gaps não bloqueantes (ver abaixo).

---

## Histórico

### Ciclo 1 (T1-T19): PASS

- Diff `c605e5a..1fcdb58`, em 2026-11-04. 34/34 critérios com evidência; 14/14 mutações mortas (M1-M14); unit 1845; integration 900.
- Ressalvas que continuam valendo: concorrência "última vence" testada só com escritas iguais (`src/lib/db/repos/transactions.sealed.int.test.ts:923`); PAGO-07 AC 3 provado por composição; SPEC_DEVIATION do `seriesId` livre no arquivo (`src/lib/import-file.ts:83-86`); par `(seriesId, month)` repetido só rejeitado no servidor; receita de referência herda PAGO-05; mensagem única `PAID_FAILED`.

### Ciclo 2 (T20-T24): reprovado

- Diff `1fcdb58..a24ca2c`. Unit 1851; integration 906; 10 de 11 critérios novos ou alterados com evidência; sensor com 6 de 9 mutações mortas (M18 equivalente; M19 e M21 sobreviventes).
- Gap Major: `writePaidAfterEdit` rodava depois de `prunePaidAfterEdit`. Editar o primeiro mês de uma série "até", adiantar o início e salvar com o switch ligado deixava o mês antigo pago, sem ocorrência (PAGO-12 AC 2, PAGO-08 AC 7).
- Gap Minor: faltava teste de edição no lugar de um segmento posterior (id ≠ `seriesId`), por isso M19 sobreviveu.
- Os ACs do ciclo 2 que T25/T26 não tocaram (PAGO-11 AC 5/8, PAGO-12 AC 1, 3-6, PAGO-03 AC 3) mantêm a evidência daquele relatório. As linhas citadas abaixo foram reconferidas em `HEAD`.

---

## Ciclo 3 (T25-T26)

### Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T25 | ✅ Done | Ordem gravar→podar em `src/lib/db/repos/transactions.ts:398-399`; testes em `src/lib/db/repos/transactions.sealed.int.test.ts:1134` e `:1267` |
| T26 | ✅ Done | Classes do botão em `src/components/transaction-list.tsx:266-268` |

### Gap Major fechado: PAGO-12 AC 2 e PAGO-08 AC 7

Resultado exigido pela spec:

- PAGO-12 AC 2 (`spec.md:86`): gravar o estado "só do mês exibido, na mesma operação".
- PAGO-08 AC 7 (`spec.md:164`): ao mover o início para frente, apagar os estados dos meses anteriores ao novo início e manter os demais.
- Premissa "Início da série movido para frente" (`spec.md:44`): "evita estado órfão".

Código: `src/lib/db/repos/transactions.ts:398` chama `writePaidAfterEdit` e `:399` chama `prunePaidAfterEdit`, os dois dentro do mesmo `db.transaction` (`:383`). A poda do início adiantado (`:343-344`) roda depois da escrita e apaga o mês antigo que a escrita acabou de reinserir.

| Critério | Resultado definido pela spec | `file:line` + asserção | Result |
| -------- | ---------------------------- | ---------------------- | ------ |
| PAGO-12 AC 2 + PAGO-08 AC 7: início adiantado de 01 para 03 com `paid: true`, com 01 e 04 pagos antes | 01 sem estado (não tem mais ocorrência), 04 mantido, nenhum órfão | `transactions.sealed.int.test.ts:1139`: `updateFromSealed(... "2026-01", { ...moveStart(tx, "2026-01", "2026-03"), paid: true })).toBe(true)`. `:1143`: `stored(tx.id)).toMatchObject({ date: "2026-03-10" })`. `:1144`: `paidMonthsOf(tx.id)).toEqual(["2026-04"])`. `:1145`: `orphans()).toBe(0)` | ✅ PASS. O payload é o mesmo que o form manda: a data fica no mês da ocorrência (o servidor exige isso, `src/actions/transactions-sealed.ts:102-103`) e `planEdit` move a data para o novo início (`src/lib/domain/recurrence.ts:150-156`) |
| PAGO-12 AC 2: edição no lugar de um segmento posterior (id ≠ `seriesId`) com `paid: true` | O mês exibido fica pago na série, não no id do segmento | `transactions.sealed.int.test.ts:1271-1272`: a série é dividida em 2026-12 e o segundo segmento é lido. `:1274`: `updateFromSealed(userId, later.id, "2026-12", editIn(tx, "2026-12", { id: later.id, paid: true }))).toBe(true)`. `:1276`: `paidMonthsOf(tx.id)).toEqual(["2026-12"])` | ✅ PASS |

### Regressão da troca de ordem, caso a caso

Gravar e depois podar só muda o resultado quando a poda apaga a linha que a escrita gravou. A poda só apaga três faixas: `>= month` quando a edição vira avulsa (`transactions.ts:338`), `> endMonth` (`:340`) e `< novo início` (`:344`). Nas três, o mês editado deixa de ter ocorrência. Com a ordem nova, portanto, a escrita nunca sobrevive num mês sem ocorrência e nunca é apagada num mês que ainda tem ocorrência.

| Caso | Comportamento com a ordem nova | Evidência |
| ---- | ------------------------------ | --------- |
| Vira "Não recorrente" com `paid: true` | A escrita retorna cedo (`transactions.ts:361`, `recurringDay === null`) e a poda apaga de M em diante | `transactions.sealed.int.test.ts:1264`: `toEqual(["2026-10"])` |
| Vira "Não recorrente" sem `paid` | Só a poda | `:1049`: `toEqual(["2026-10", "2026-11"])`; `:1060`: `toEqual([])` |
| Fim encurtado sem `paid` | Só a poda `> endMonth` | `:1072`, `:1084` |
| Fim encurtado com `paid: true` no mês editado (divisão) | Grava M, poda depois do novo fim, M fica | Sonda P2 (só no worktree): `toEqual(["2026-10", "2026-12"])` e `orphans() = 0`, passou. Sem teste na árvore real: risco R5 |
| Início recuado e fim antes do mês editado, com `paid: true` | Grava M, a poda `> endMonth` apaga M (sem ocorrência); a ordem antiga deixaria órfão | Sonda P1: `orphans() = 0`, passou. Ela também morre com M21 |
| `paid: false` | Dois `DELETE`, que comutam | `:1242`: `toEqual(["2026-10", "2026-12"])`; sonda P3 (início adiantado com `paid: false`): `toEqual(["2026-03"])` |
| Sem `paid` | `writePaidAfterEdit` retorna na primeira linha (`transactions.ts:359`) | `:1252`: `toEqual(["2026-11"])`; os testes de poda do ciclo 1 (`:1026-1189`) seguem verdes |
| Divisão com `paid: true` | Grava M; sem poda | `:1232`: `toEqual(["2026-10", "2026-12", "2027-01"])` |

Procurei um cenário em que a ordem nova erre e não achei nenhum. Achei um caso que a ordem não afeta. Um lançamento avulso convertido em série "até" com início adiantado e `paid: true` deixa órfão o mês original (sonda P4: `recurring_paid = ['2026-01']`, linha em `2026-03-10`, `orphans = 1`). A poda retorna cedo porque o segmento antigo não tem `seriesId` (`transactions.ts:333-334`), e a escrita usa `seg.id`. A UI nunca manda `paid` nesse caminho (`src/components/transaction-form.tsx:262`, guarda `wasRecurring`), e o servidor não recusa. É pré-existente: a ordem antiga dava o mesmo resultado. Fica como risco R4, não como gap, porque nenhum AC exige a recusa no servidor (spec-precision 5).

### T26 por inspeção (AD-005, sem teste de UI)

- Não pago: `src/components/transaction-list.tsx:268`: `"border-border text-foreground hover:bg-hover"`. Nada de `primary` no botão (o diff tira `border-primary/60 text-primary hover:bg-primary/10`).
- Pago: `transaction-list.tsx:267`: `"border-transparent bg-success/15 text-success hover:bg-success/25"`. O check tem traço forte, `strokeWidth={counts ? 3 : 2}` (`:271`). Os tokens existem: `--color-success` em `src/app/globals.css:36`, `--color-border` em `:29` e `--color-hover` em `:52`.
- A opacidade continua só no conteúdo: ícone em `transaction-list.tsx:190`, bloco de texto em `:199` e valor em `:256`, todos com `counts ? "" : "opacity-50"`. O `<li>` (`:184`), o botão de marcar (`:262-273`) e o `TransactionRowMenu` (`:275`) não têm `opacity-50`. Dentro do botão, só o ícone tem `opacity-60` quando não pago (`:271`), igual ao ciclo 2: o botão em si fica com opacidade 1 (PAGO-03 AC 3).
- A spec não fala de cor (é pedido de design da T26). PAGO-11 AC 5/8 (rótulos e check) não mudam.

### Gate Check

Node 20 (`~/.nvm/versions/node/v20.20.2`). Integração só no banco privado `orcamento_pago_test` (container `orcamento-pg`, porta 5433), sem `db:migrate` manual. Nenhum e2e rodado (AD-005).

- `npm run typecheck`: exit 0
- `npm run lint`: 97 problemas (1 erro, 96 avisos), igual à baseline. O erro é prévio (`src/app/layout.tsx:70`). `npx eslint` nos 3 arquivos de código do diff: exit 0, sem achados
- `npm run build`: exit 0
- `npm run test:unit`: **1851 passed / 0 failed**, 108 arquivos (igual ao ciclo 2; T25/T26 não têm unit)
- `npm run test:int`: **908 passed / 0 failed**, 43 arquivos, `GATE_EXIT=0`, 265 s (+2 em relação ao ciclo 2: `:1134` e `:1267`)
- Flaky: nenhum nesta rodada. Skipped: nenhum. Nenhum teste removido nem enfraquecido (o diff de testes só acrescenta)

### Discrimination Sensor

Rodei o sensor num `git worktree --detach` no scratchpad, com node_modules por symlink e o banco próprio `orcamento_pago_verifier_test`, criado vazio, migrado pelo `setupTestDb` e apagado ao final. `git status --porcelain` da árvore real ficou vazio antes e depois de `git worktree remove --force` + `git worktree prune`. A base sem mutação passou 79/79 em `transactions.sealed.int.test.ts` (75 testes reais e 4 sondas P1-P4 só do worktree). As mortes abaixo contam só testes da árvore real.

| # | File:line | Descrição | Testes reais que falharam | Killed? |
| - | --------- | --------- | ------------------------- | ------- |
| M21 | `src/lib/db/repos/transactions.ts:398-399` | Ordem revertida (poda e depois escrita) | `:1134` (início adiantado com `paid: true`) | ✅ Killed |
| M19 | `src/lib/db/repos/transactions.ts:362` | `seriesId: plan.updateInPlace?.id ?? edited.seriesId` (id do segmento no lugar da série) | `:1267` (segmento posterior) | ✅ Killed |
| M23 | `src/lib/db/repos/transactions.ts:359` | `writePaidAfterEdit` ignora `paid: false` | `:1235` | ✅ Killed |
| M24 | `src/lib/db/repos/transactions.ts:363-368` | Grava em todos os meses da série (`paid: true` insere de M-12 a M+12; `paid: false` apaga a série inteira) | `:1134`, `:1215`, `:1224`, `:1235`, `:1267` | ✅ Killed |
| M25 | `src/lib/db/repos/transactions.ts:362` | Grava no mês da data editada (`monthKey(edited.date)`) no lugar do mês exibido | `:1134` | ✅ Killed |

**Sensor depth**: expandido (integridade de dados, 5 mutações nas linhas do diff e em `writePaidAfterEdit`)
**Sensor**: 5/5 mortas, 0 sobreviventes

### Spec-precision gaps (abertos, não bloqueantes)

1. **Switch quando o toque da linha falha com o diálogo aberto.** `editing` é um snapshot de `t` (`src/components/transaction-list.tsx:197,276`; valor inicial em `:314`). Se o toque otimista falhar e voltar atrás depois de o diálogo abrir, o switch mantém o valor otimista, e "Salvar" o reenvia. A spec não define o comportamento (R2).
2. **`paid` enviado em toda edição recorrente.** O form manda `paid` mesmo quando o switch não foi tocado (`src/components/transaction-form.tsx:262`). Uma marcação feita em outro aparelho entre abrir e salvar é sobrescrita. Isso é coerente com "última vence", mas o usuário não vê (R3). A spec não diz se o estado só vai quando muda.
3. **"Check preenchido".** É um traço mais grosso (`strokeWidth 3`, `transaction-list.tsx:271`), não um ícone sólido. A spec não define o termo.
4. **Acessibilidade do botão.** Sem `aria-pressed`, decisão do design da T24. O botão "Pago" não anuncia que o toque desmarca. Fica para UAT.
5. **Servidor e `paid` fora de uma série.** PAGO-12 AC 5 fala só em "exibir". A spec não diz se o servidor deve recusar ou ignorar `paid` quando a linha guardada não é recorrente. Hoje ele aceita e pode gravar um órfão (R4).
6. (Fechado) O switch com o início adiantado no primeiro mês: com a ordem nova, o estado não vai para nenhum mês que deixou de existir, coerente com a premissa de `spec.md:44`.

### Riscos residuais

- **R2.** Snapshot de `editing` (spec-precision 1).
- **R3.** `paid` em toda edição (spec-precision 2). Mandar `paid` só quando difere do valor inicial resolveria.
- **R4.** Um avulso convertido em série "até" com início adiantado e `paid: true`, chamado direto na action, deixa órfão (sonda P4). A UI não alcança esse caminho, e o defeito é pré-existente. O servidor também não valida o mês de `paidMonths` no import (L-078 do ciclo 2), então esse órfão sairia num backup.
- **R5.** A combinação "fim encurtado com `paid: true` no mês editado" só tem prova por raciocínio e pela sonda P2. A árvore real não tem esse teste.
- Ressalvas do ciclo 1 seguem valendo (ver Histórico).

### Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (T25 troca duas linhas e acrescenta um comentário; T26 troca duas strings de classes) |
| Surgical changes | ✅ (3 arquivos de código, todos nomeados nas tasks; `tasks.md` atualizado) |
| No scope creep | ✅ |
| Matches patterns | ✅ (tokens `success`/`border`/`hover` já existentes) |
| Spec-anchored outcome check | ✅ (asserções no conteúdo de `recurring_paid` por série e mês, mais `orphans()`) |
| Per-layer Coverage Expectation | ✅ repo cobre a escrita combinada com a poda do início e o segmento posterior; UI por inspeção (AD-005). R5 é ressalva |
| Every test maps to a requirement | ✅ (`:1134` cita PAGO-12 AC 2; `:1267` está no bloco PAGO-12) |
| Documented guidelines | `AGENTS.md` (AD-005) ✅ |

### Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PAGO-03 | Verified (ciclo 2) | ✅ Verified (AC 3 reconferido, `transaction-list.tsx:190,199,256`) |
| PAGO-08 | Needs Fix (ciclo 2) | ✅ Verified (AC 7, `transactions.sealed.int.test.ts:1144-1145`) |
| PAGO-11 | Verified (ciclo 2) | ✅ Verified (T26 só muda cor) |
| PAGO-12 | Needs Fix (ciclo 2) | ✅ Verified (AC 2, `:1144` e `:1276`) |

---

## Summary

**Overall**: ✅ Ready (com UAT manual do botão e do switch pendente, AD-005)

**Spec-anchored check**: 11/11 critérios novos ou alterados com evidência que bate com a spec (o gap PAGO-12 AC 2 / PAGO-08 AC 7 está fechado); 5 spec-precision gaps abertos, não bloqueantes
**Sensor**: 5 mutações, 5 mortas, 0 sobreviventes (M19 e M21, que sobreviviam no ciclo 2, agora morrem)
**Gate**: typecheck ok; lint sem piora; build ok; unit 1851 passed; integration 908 passed; sem flaky

**What works**: a escrita do switch não deixa órfão quando o início é adiantado; o switch num segmento posterior grava na série; as podas de "Não recorrente", fim e início continuam iguais; o botão fica neutro quando não pago e verde quando pago, e a opacidade fica só no conteúdo.

**Next steps**: UAT manual. Opcional, fora deste ciclo: decidir na spec os pontos de spec-precision 1, 2 e 5 (R2, R3, R4) e acrescentar um teste de fim encurtado com `paid: true` (R5).
