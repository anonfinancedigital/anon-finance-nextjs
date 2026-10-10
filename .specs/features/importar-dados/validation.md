# Importar dados Validation

**Date**: 2026-10-10
**Iteração**: 2 (re-verificação após as fix tasks F1/F2)
**Spec**: `.specs/features/importar-dados/spec.md`
**Diff range**: `28b6570^..39eac64` filtrado aos arquivos da feature (commits `28b6570` T1, `efefd67` T2, `a586365` T3, `b46255c` T4, `f86cac9` T5, `37fd6a8` T6, `8c2084d` T7, `b71f0fe` T8, `39eac64` F1+F2). Fora do escopo: `24b4a2e`, `5f3b7fa`, `26f25fe` (categorias) e `78da939` (marca ANON, commitado por outra sessão durante esta verificação; não toca arquivos da feature).
**Arquivos**: `src/lib/vault/{types,import-file,import-payload}.ts` (+ testes), `src/lib/validation/{import-sealed,goal}.ts` (+ teste), `src/lib/db/repos/import.ts` (+ `.int.test.ts`), `src/actions/import-data.ts` (+ `.int.test.ts`), `src/components/import-card.tsx`, `src/app/(app)/conta/page.tsx`
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS

Os dois gaps da iteração 1 estão fechados: o mutante sem `FOR UPDATE` agora é morto de forma estável (3/3) pelo novo teste do repositório, e IMPORT-07 tem teste direto que compara o resumo mensal da origem com o da conta importada e que mata mutantes de remapeamento de categoria, subcategoria e vigência.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `ImportPayload` em `src/lib/vault/types.ts`, sem import de servidor |
| T2 | ✅ Done | `parseImportFile`, `checkImportFileSize` |
| T3 | ✅ Done | `buildImportPayload` |
| T4 | ✅ Done | `sealedImportSchema` |
| T5 | ✅ Done | `importRepo` |
| T6 | ✅ Done | `importDataAction` |
| T7 | ✅ Done | `ImportCard` (sem teste automatizado, AD-005; evidência por inspeção) |
| T8 | ✅ Done | Cartão ligado em `/conta` |
| F1 | ✅ Done | Teste que segura a linha de `user` com `FOR UPDATE` (`IR:200-217`) |
| F2 | ✅ Done | Resumo mensal origem × importado (`IP:260-318`) |

---

## Spec-Anchored Acceptance Criteria

Legenda: `IF` = `src/lib/vault/import-file.test.ts`, `IP` = `src/lib/vault/import-payload.test.ts`, `IS` = `src/lib/validation/import-sealed.test.ts`, `IR` = `src/lib/db/repos/import.int.test.ts`, `IA` = `src/actions/import-data.int.test.ts`, `CARD` = `src/components/import-card.tsx`, `PAGE` = `src/app/(app)/conta/page.tsx`. Âncoras de `IP` e `IR` reconferidas no HEAD `39eac64` (deslocaram com o commit de fix); `IF`, `IS`, `IA`, `CARD`, `PAGE` não mudaram desde `b71f0fe` (`git diff --stat`). Evidência de UI por inspeção de código (AD-005).

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| IMPORT-01 cartão "Importar dados" com seletor `.json` ao lado de "Exportar meus dados" | Cartão presente, seletor `.json` | `PAGE:42-54` - `ContentCard title="Importar dados"` após "Exportar meus dados"; `CARD:92` - `<Input type="file" accept=".json,application/json">` | ✅ PASS (UI) |
| IMPORT-02 resumo "N transações, N categorias, N subcategorias" + "Importar", sem servidor | Texto exato; nenhuma chamada | `IF:116-123` - `toEqual({ ok: true, data, summary: { transactions: 3, categories: 2, subcategories: 2 } })`; `CARD:44-45` (só `parseImportFile`), `CARD:101` texto do resumo, `CARD:105` "Importar"; action só em `CARD:62` | ✅ PASS (UI + unit) |
| IMPORT-03 cifrar cada campo com DEK + `userId`; só cifra + estrutura em claro | Cifra ligada à DEK e ao usuário de destino | `IP:136` - `expect(withoutIds(opened)).toEqual(withoutIds(data))`; `IP:154` - `rejects.toBeInstanceOf(DecryptError)` sob outro usuário; `IP:142-149` (estrutura em claro); `IS:50-53` - `sealedImportSchema.parse(p)).toEqual(p)` | ✅ PASS |
| IMPORT-04 gravar tudo em uma transação; "Importação concluída: N transações, N categorias" | `{ ok, transactions, categories }`; todas as linhas | `IR:94-95` - `toEqual({ ok: true, transactions: 4, categories: 2 })`, `counts` `{4,2,2}`; `IA:118-127` - `toEqual({ ok: true, transactions: 2, categories: 1 })`; `IR:241-252` (atomicidade); `CARD:74` texto | ✅ PASS |
| IMPORT-05 preservar kind, date, valor, descrição, recorrência, cor, flag, deletedFrom, vigências, nomes | Valores idênticos ao arquivo | `IP:136` - `withoutIds(opened)).toEqual(withoutIds(data))` (inclui `percentVersions` e nomes); `IR:123-124` - `byId(out.transactions)).toEqual(byId(payload.transactions))` | ✅ PASS |
| IMPORT-06 ids novos; `categoryId`/`subcategoryId`/`seriesId` remapeados; série com um `seriesId` | UUIDs novos e únicos; referências equivalentes | `IP:86-91` - `toMatch(UUID)`, `oldIds.has(id)).toBe(false)`, `new Set(newIds).size).toBe(8)`; `IP:98-102` - `t1.categoryId).toBe(catA.id)`, `t4.categoryId).toBe(catB.id)`; `IP:108-111` - `t3.seriesId).toBe(t2.id)`; `IP:119-121` | ✅ PASS |
| IMPORT-07 mesmo total de ganhos, gastos e metas por categoria na visão do mês | Resumo mensal igual ao da origem | `IP:298-305` - para `2026-08`, `2026-09`, `2026-10`, `2027-01`: `expect(summaryByName(imported, key)).toEqual(summaryByName(data, key))` (ganhos, gastos, saldo, meta, gasto, restante, estouro e detalhamento por subcategoria de cada categoria); `IP:307-317` fixa que os meses diferem (vigência 30%→35%, categoria excluída some em 2026-10, renda 500000→600000 na série) | ✅ PASS (antes ⚠️; fechado por F2) |
| IMPORT-08 arquivo > 20 MB recusado no navegador com mensagem exata | Mensagem exata; nada enviado | `IF:105-112` - `checkImportFileSize(MAX+1)).toBe("Arquivo muito grande (máximo 20 MB)")`, 20 MB `toBeNull()`; `CARD:41-42` | ✅ PASS |
| IMPORT-09 JSON inválido / chave ausente / tipo errado | `IMPORT_INVALID`; botão não habilita | `IF:165-189` - `toEqual({ ok: false, error: IMPORT_INVALID })`; `IF:98-99` texto; `CARD:88,98` | ✅ PASS |
| IMPORT-10 regras de conteúdo | `IMPORT_INVALID`; fronteiras aceitas | `IF:193-311` - fronteiras aceitas/rejeitadas para valor, descrição, nome, cor, percentual, datas, meta | ✅ PASS |
| IMPORT-11 referências quebradas, subcategoria de outra categoria, ganho com categoria | `IMPORT_INVALID` | `IF:315-335` - `toEqual(INVALID)`; servidor `IS:95-112` | ✅ PASS |
| IMPORT-12 nomes ativos duplicados (case-insensitive), subcategorias duplicadas | `IMPORT_INVALID` | `IF:339-352` - `toEqual(INVALID)` | ✅ PASS |
| IMPORT-13 limites 15.000 / 1.000 / 100 / 30 / 7.000.000 | Limite aceito, limite+1 recusado | `IF:382-415`, `IS:158-180`; `IP:247-250` - `resolves.toBeDefined()` no teto, `rejected.message).toBe(IMPORT_INVALID)`; `IP:255` - `MAX_IMPORT_BODY_CHARS).toBe(7_000_000)` | ✅ PASS |
| IMPORT-14 falha no servidor desfaz tudo; "Não foi possível salvar. Tente novamente" | Zero linhas; `SAVE_FAILED` | `IR:247-251` - `rejects.toThrow()`, `counts` `{0,0,0}`, vigências/meta/nascimento vazios; `IA:174-191` - `toEqual({ ok: false, error: SAVE_FAILED })`; `CARD:63,109-113` | ✅ PASS |
| IMPORT-15 conta com transação ou categoria (ativa ou excluída) → mensagem exata | `not_empty` / NOT_EMPTY; nada gravado | `IR:168-169`, `IR:176-177` - `toEqual({ ok: false, reason: "not_empty" })` + contagens inalteradas (categoria excluída); `IA:154-161` - `toEqual({ ok: false, error: NOT_EMPTY })` | ✅ PASS |
| IMPORT-16 checar vazio na mesma transação que grava | Checagem sob a trava, na transação | `src/lib/db/repos/import.ts:31-34` (inspeção); `IR:214-216` - com outra transação segurando a linha de `user` e gravando uma transação, `settledEarly).toBe(false)`, `await importing).toEqual({ ok: false, reason: "not_empty" })`, `counts` `{1,0,0}` | ✅ PASS |
| IMPORT-17 duas importações simultâneas: no máximo uma grava, a outra recebe IMPORT-15 | Uma `ok`, outra `not_empty`; uma cópia | `IR:200-217` (trava determinística, mata M3 3/3); `IR:195-197` - `filter(r => r.ok)).toHaveLength(1)`, `toEqual([{ ok: false, reason: "not_empty" }])`; `IA:169-171` - `toEqual([{ ok: false, error: NOT_EMPTY }])` | ✅ PASS (antes ❌; fechado por F1) |
| IMPORT-18 conta com dados: "Disponível apenas em conta sem transações nem categorias", sem seletor | Texto exato; sem input | `PAGE:17-19`; `CARD:85` antes do `<Input type="file">` (`CARD:92`); `CARD:18` texto; `IR:221-229` - `isEmpty` `true`/`false`/`false` | ✅ PASS (UI + int) |
| IMPORT-19 só sessão aprovada; só linhas do `userId` da sessão | UNAUTHORIZED; outro usuário intacto | `IA:101-116` - `toEqual({ ok: false, error: "UNAUTHORIZED" })`, `spy).not.toHaveBeenCalled()`; `IA:118-127`; `IR:264-267` - `exportRowsSealed(b)).toEqual(before)` | ✅ PASS |
| IMPORT-20 meta importada se a conta não tem e não conflita | Meta cifrada gravada | `IR:275` - `goalsRepo.getSealed(userId)).toEqual(goalDto("a"))`; `IP:182-183` | ✅ PASS |
| IMPORT-21 meta existente mantida | Meta da conta intacta | `IR:282-283` - `toEqual(goalDto("mine"))` | ✅ PASS |
| IMPORT-22 conflito meta × nascimento: importa o resto, aviso exato | `goal = null`, `goalSkipped = true`, texto exato | `IP:189-190` - `goalSkipped).toBe(true)`, `payload.goal).toBeNull()`; `IP:196-197`, `IP:203` (fronteira); `IP:209-210`; `CARD:16-17,76-79` texto | ✅ PASS |
| IMPORT-23 nascimento importado se a conta não tem | `birth_date_ct` gravado | `IR:298` - `getBirthDateSealed(userId)).toBe("v1:a-birth")`; `IP:231` - `openBirthDate(...)).toBe("1990-03-15")` | ✅ PASS |
| IMPORT-24 nascimento existente mantido | Valor anterior intacto | `IR:301-306` - `toBe("v1:mine-birth")` | ✅ PASS |
| IMPORT-25 requisição sem segredo em claro | Nenhum segredo no corpo | `IP:161-164` - `json).not.toContain(secret)`, `'"amountCents"'`, `'"name"'`; `CARD:62` | ✅ PASS |
| IMPORT-26 falha de cifra aborta antes da requisição | Rejeita; sem chamada | `IP:169` - `rejects.toThrow()`; `CARD:55-60` antes de `CARD:62` | ✅ PASS (unit + UI) |
| IMPORT-27 export → import → export mesmas listas e valores exceto ids | Conteúdo idêntico sem ids | `IP:136` (cifra) + `IR:123-126` - `exportRowsSealed` devolve o payload (`toEqual`) | ✅ PASS (prova composta) |
| IMPORT-28 botão desabilitado com "Importando..." | `disabled` + texto | `CARD:52`; `CARD:87,103,105` - `disabled={pending}`, `{pending ? "Importando..." : "Importar"}` | ✅ PASS (UI) |
| IMPORT-29 arquivo sem dados: 0 transações, 0 categorias | `{ ok, 0, 0 }` | `IF:126-133`; `IP:174-175`; `IR:158-159` - `toEqual({ ok: true, transactions: 0, categories: 0 })`; `CARD:74` | ✅ PASS |
| IMPORT-30 categoria excluída importada excluída | `deletedFrom` preservado | `IF:156-161`; `IP:148` - `[7, true, "2026-10-01"]`; `IR:123-124`; `IP:312` (some do resumo do mês seguinte) | ✅ PASS |
| IMPORT-31 mesmo nome, uma excluída e uma ativa | `ok` | `IF:142-147` - `result.ok).toBe(true)`; `IF:358-364` | ✅ PASS |
| IMPORT-32 série com vários segmentos | `seriesId` compartilhado; campos preservados | `IP:108-109`; `IP:143`; `IR:127-128` - `seg1.seriesId).toBe(seg2.seriesId)`; `IP:309,314` (renda da série nos dois segmentos) | ✅ PASS |
| IMPORT-33 segundo arquivo descarta o primeiro | Estado anterior descartado | `CARD:39` - `setState({ step: "idle" })` e novo parse (`CARD:41-45`) | ✅ PASS (UI) |

**Status**: ✅ All ACs covered (33/33, nenhum spec-precision gap aberto)

### Análise de F2 (IMPORT-07)

- O helper `summaryByName` (`IP:260-295`) usa as funções de domínio da visão do mês (`buildMonthlySummary`, `computeMonthTotals`, `appliesInMonth`, as mesmas de `src/components/overview-client.tsx:111-112`) e reproduz a seleção do repositório de categorias (ativa se `deletedFrom` nulo ou `> início do mês`, igual a `src/lib/db/repos/categories.ts:42`; última vigência com `fromMonth <=` início do mês). Ids viram nomes na saída.
- Não é vácuo: o mesmo helper é aplicado à origem e ao reaberto; um id remapeado errado muda `spentByCategory`/`spentBySubcategory` e portanto a saída por nome. `IP:307-317` fixa valores concretos e prova que os quatro meses exercitam vigências, exclusão e série. Mutantes S2-S4 abaixo foram mortos pelo teste de IMPORT-07 (não só pelos de IMPORT-05/06).
- Limite: é equivalência em nível de unidade (não passa pelo banco nem pelo `openMonth`); o trecho banco ↔ payload é coberto por `IR:123-124`. Aceitável para a AC.

### Análise de F1 (IMPORT-16/17)

- Direção verde (trava presente) é determinística: o teste só dispara a importação depois de adquirir o `FOR UPDATE` (`IR:206-207`); a importação fica bloqueada no seu `FOR UPDATE` até o `COMMIT` do detentor e então conta 1 transação. O `setTimeout(300)` não pode fazer o teste falhar numa máquina lenta; só alonga o teste. `settledEarly` também não pode virar `true` antes do `COMMIT`.
- Direção do mutante: sem `FOR UPDATE`, a importação conta zero (leitura não bloqueia) e depois bloqueia no primeiro `INSERT` de `category` (a FK pega `FOR KEY SHARE` na linha de `user`, que conflita com o `FOR UPDATE` do detentor); após o `COMMIT` ela grava tudo e devolve `ok: true`. Por isso o mutante morre em `IR:215` (`expected { ok: true, ... } to deeply equal { ok: false, reason: 'not_empty' }`), não em `IR:214`. A morte depende de a contagem da importação acontecer antes de 300 ms (obter conexão do pool + 2 consultas). Numa máquina muito lenta o mutante poderia sobreviver uma vez (falso negativo), mas a suíte verde nunca fica instável. Aceitável.
- O comentário em `IR:210` ("a lock-free import would have ... finished by now") não descreve o mecanismo real (ela bloqueia na FK, não termina); não afeta a asserção. Observação não bloqueante.
- O teste de concorrência da action (`IA:163-172`) continua dependente de timing (não discrimina a trava sozinho), mas a trava agora está fixada no nível do repositório e a action só mapeia `not_empty` → NOT_EMPTY (morto por M14). Não é gap.

---

## Discrimination Sensor

Executado em worktree temporário (`git worktree add --detach <scratchpad>/wt 39eac64`, `node_modules` por symlink, banco privado `orcamento_import_test`, uma mutação por vez com `git checkout` do arquivo entre elas). Worktree removido com `git worktree remove --force` + `prune`.

### Iteração 2 (executadas agora no HEAD `39eac64`)

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| C0 (controle) | - | Repo intacto, `import.int.test.ts` 3× seguidas | Passa 3/3 (20/20) |
| M3 | `src/lib/db/repos/import.ts:31` | `.for("update")` removido, 3× seguidas | ✅ Killed 3/3 (`IR:200` "waits for a transaction that holds the user row...", falha em `IR:215`) |
| S2 | `src/lib/vault/import-payload.ts:69` | Toda despesa vai para a categoria nova da 1ª categoria | ✅ Killed (IMPORT-07 `2026-09`; IMPORT-06 `IP:94`) - suíte unit inteira, 2 falhas |
| S3 | `src/lib/vault/import-payload.ts:85` | Descarta a última vigência de categorias com mais de uma | ✅ Killed (IMPORT-07 `2026-09`, `2026-10`, `2027-01`; `IP:132`, `IP:139`) - 5 falhas |
| S4 | `src/lib/vault/import-payload.ts:70` | Toda subcategoria vira a última subcategoria nova | ✅ Killed (IMPORT-07 `2026-10` via detalhamento; IMPORT-06 `IP:94`) |
| M1 (re-run) | `src/lib/db/repos/import.ts:19` | Vazio conta só transações | ✅ Killed (`IR:172`, `IR:219`) |
| M11 (re-run) | `src/lib/db/repos/import.ts:64` | `onConflictDoUpdate` (sobrescreve meta) | ✅ Killed (`IR:278`) |
| M8 (re-run) | `src/lib/validation/import-sealed.ts:60` | `max(MAX_IMPORT_TRANSACTIONS + 1)` | ✅ Killed (`IS` "accepts 15.000 transactions and rejects 15.001") |

### Iteração 1 (carregadas; mortas em `b71f0fe`, sem mudança de código de produção desde então)

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M2 | `src/lib/db/repos/import.ts:34` | Checagem de conta vazia removida | ✅ Killed (7 testes) |
| M4 | `src/lib/vault/import-payload.ts:59` | Idade − 1 no conflito | ✅ Killed |
| M5 | `src/lib/vault/import-payload.ts:55` | Nascimento do arquivo prevalece sobre o da conta | ✅ Killed |
| M6 | `src/lib/vault/import-payload.ts:75` | `seriesId` novo por transação | ✅ Killed |
| M7 | `src/lib/vault/import-file.ts:62` | `max(MAX_SUBCATEGORIES + 1)` | ✅ Killed |
| M9 | `src/lib/vault/import-file.ts:27` | `bytes >= 20 MB` | ✅ Killed |
| M10 | `src/lib/db/repos/import.ts:70` | Sem `birth_date_ct IS NULL` | ✅ Killed |
| M12 | `src/lib/vault/import-file.ts:92` | Unicidade de nome sensível a maiúsculas | ✅ Killed |
| M13 | `src/lib/validation/import-sealed.ts:80` | Subcategoria de qualquer categoria | ✅ Killed |
| M14 | `src/actions/import-data.ts:31` | `not_empty` → `SAVE_FAILED` | ✅ Killed |
| M15 | `src/lib/vault/import-payload.ts:105` | Teto do corpo `>=` | ✅ Killed |

**Sensor depth**: P0-full (integridade de dados)
**Result**: 18/18 mutações mortas (15 da iteração 1, com M3 agora morto e M1/M8/M11 re-confirmadas, + S2/S3/S4) - PASS ✅

**Isolamento**: `git status --porcelain` do repositório real gravado antes do sensor e idêntico após remover o worktree. Durante o gate (depois do sensor) outra sessão commitou `78da939` e passou a mexer em SVGs de marca (`docs/vertice_*.svg`, `public/favicon*.svg`, `src/app/icon.svg`); essas mudanças não vêm desta verificação (só rodei typecheck/lint/testes, que não escrevem nesses arquivos).

---

## Interactive UAT Results

Não realizado (Verifier não interativo; e2e suspenso por AD-005). Evidência de UI por inspeção de código.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (fix commit só toca testes e `tasks.md`) |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md` (AD-005), `tasks.md` Test Coverage Matrix | ✅ |

Observações não bloqueantes (carregadas da iteração 1, mais uma nova):

- `CARD:59` + `CARD:88`: após `ImportTooLargeError` o estado é `failed` e o botão continua habilitado; reenviar dá o mesmo erro. A spec só exige a mensagem.
- `src/lib/vault/import-payload.ts:55-59`: conta com meta e sem nascimento recebe o nascimento do arquivo sem checar conflito com a meta existente. IMPORT-23 não condiciona.
- `goalSkipped` é calculado mesmo quando a conta já tem meta; o texto continua verdadeiro.
- `IR:210`: comentário descreve o mutante como "terminaria"; na prática ele bloqueia na FK e é morto por `IR:215`.
- Lint: 1 warning em `src/components/category-editor.tsx:40` (`TOTAL_MICRO` não usado), fora da feature.

---

## Edge Cases

- [x] IMPORT-29 arquivo vazio: `IF:126-133`, `IR:156-160`
- [x] IMPORT-30 categoria excluída: `IF:156-161`, `IR:115-129`, `IP:312`
- [x] IMPORT-31 ativa + excluída com mesmo nome: `IF:142-147`
- [x] IMPORT-32 série com vários segmentos: `IP:105-112`, `IR:127-128`
- [x] IMPORT-33 segundo arquivo: `CARD:39` (inspeção)

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` (Node 20.20.2, `DATABASE_URL=postgres://...:5433/orcamento_import_test`), na árvore real
- **Result**: exit 0. Unit 1235 passed (53 files), integration 675 passed (33 files), 0 failed, 0 skipped
- **Test count before feature**: 1140 unit / 647 integration
- **Test count after feature**: 1235 unit / 675 integration (bate com o esperado)
- **Delta**: +95 unit (iteração 1: +90; F2: +5 = 4 meses + 1 de não-vacuidade), +28 integration (iteração 1: +27; F1: +1); nenhum teste removido
- **Skipped tests**: nenhum
- **Failures**: nenhuma; 1 warning de lint fora da feature

---

## Fix Plans

Nenhum. F1 e F2 (iteração 1) concluídos e verificados acima.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| IMPORT-01..06, 08..16, 18..33 | Pending | ✅ Verified |
| IMPORT-07 | ⚠️ Needs Fix (iteração 1) | ✅ Verified |
| IMPORT-17 | ❌ Needs Fix (iteração 1) | ✅ Verified |

(A tabela de rastreabilidade em `spec.md` ainda mostra `Pending`; o Verifier não edita a spec - atualização fica para o orquestrador.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 33/33 ACs com evidência que bate com a spec; 0 spec-precision gaps
**Sensor**: 18/18 mutações mortas (M3 morto 3/3; controle verde 3/3)
**Gate**: 1235 unit + 675 integration passando, 0 falhas

**What works**: tudo o que a iteração 1 listou, mais a trava de concorrência agora fixada por teste determinístico e o resumo mensal da conta importada provado igual ao da origem em quatro meses com vigências, exclusão e série.

**Issues found**: nenhum bloqueante; observações acima.

**Lessons**: nenhuma nova. Os sinais da iteração 1 já estão em L-060 e L-061; a iteração 2 não teve mutante sobrevivente nem gap novo.

**Next steps**: atualizar a rastreabilidade em `spec.md` e fechar a feature.
