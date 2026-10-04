# Liberdade Financeira Validation

**Date**: 2026-10-04
**Spec**: `.specs/features/liberdade-financeira/spec.md`
**Diff range**: `3782d40^..39bcefd` (+ correção de testes `aafc341`, re-verificação 1 de 3), somente os 11 commits da feature: 3782d40 (T1), 80cb13d (T2), 4b311a7 (T3), 25b1741 (T4), 3f2ffda (T5), ebe3b1b (T6), 3130943 (T7), 7c42ca5 (T8), 10a5f24 (T9), 8ba60f3 (T10), 39bcefd (T11). Os demais commits do intervalo (3f51c8e, caeb183, 60e542f, 31e69da, c65d2d7) são de outras features e foram ignorados. Os arquivos da feature não mudaram entre 39bcefd e o HEAD atual (`git diff 39bcefd HEAD` vazio para eles).
**Verifier**: independent sub-agent (author ≠ verifier)

## Validation: Liberdade Financeira - PASS

**Result**: PASS (iteração 2: os mutantes reais V9 e V10 foram mortos pelos testes de `aafc341`; restam só equivalentes ou cosméticos aceitos e 2 lacunas de precisão da spec registradas)

Histórico: iteração 1 foi FAIL por V9 ("60.5"/"1e2") e V10 (fuso São Paulo) sobreviventes; corrigidos em `aafc341`.

Verificação de UI (T8-T11) é por **leitura de código** (matriz: `none`, e2e suspenso por AD-005). O que é **testado** está marcado como tal. Fluxo manual de UI não foi reexecutado pelo Verifier.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 parseBRL allowZero | ✅ Done | 3782d40 |
| T2 alvo, idade, prazo, progresso | ✅ Done | 80cb13d |
| T3 aporte e resumo | ✅ Done | 4b311a7 |
| T4 goalSchema | ✅ Done | 25b1741 |
| T5 tabela e migração | ✅ Done | 3f2ffda; `drizzle/0005_demonic_vermin.sql:1-13` contém só `CREATE TABLE financial_goal` e a FK |
| T6 repositório | ✅ Done | ebe3b1b |
| T7 saveGoal | ✅ Done | 3130943 |
| T8-T11 UI | ✅ Done | 7c42ca5, 10a5f24, 8ba60f3, 39bcefd |

Todos os checkboxes de `tasks.md` estão marcados.

---

## Spec-Anchored Acceptance Criteria

Legenda: `FT` = `src/lib/domain/freedom.test.ts`; `GT` = `src/lib/validation/goal.test.ts`; `RT` = `src/lib/db/repos/goals.int.test.ts`; `AT` = `src/actions/goals.int.test.ts`; `MT` = `src/lib/domain/money.test.ts`; `GS` = `src/components/goal-summary.tsx`; `GF` = `src/components/goal-form.tsx`; `PG` = `src/app/(app)/liberdade/page.tsx`.

### P1: Cadastrar o objetivo e ver o resumo

| AC | Spec-defined outcome | `file:line` + assertion | Método | Result |
| -- | -------------------- | ----------------------- | ------ | ------ |
| 1 link "Liberdade" na navegação | link para `/liberdade` | `src/app/(app)/layout.tsx:22-24` - `<Button ... asChild><Link href="/liberdade">Liberdade</Link>` depois de Categorias | leitura | ✅ PASS |
| 2 enviar válido salva e exibe resumo | salva o objetivo, exibe o resumo | `AT:44-49` - `expect(await saveGoal(INPUT)).toEqual({ ok: true })` e `expect(await goalsRepo.get(userId)).toEqual(SAVED)`; resumo: `PG:25` `{goal && <GoalSummary summary={summarize(goal, new Date())} />}` + `GF:38-46` `router.refresh()` | teste + leitura | ✅ PASS |
| 3 sem objetivo: formulário vazio, sem resumo | só formulário vazio | `RT:20-23` `expect(await goalsRepo.get(userId)).toBeNull()`; `PG:25` resumo condicionado a `goal`; `GF:21` `blank` com quatro `""` e `GF:27` `useState(initial ?? blank)`; `PG:26-37` `initial` é `undefined` sem objetivo | teste + leitura | ✅ PASS |
| 4 reenviar substitui, sem segundo | uma linha, valores novos | `RT:51-52` `expect(await goalsRepo.get(userId)).toEqual(replacement)` e `expect(await rowsOf(userId)).toHaveLength(1)`; `AT:55` `toEqual({ ...SAVED, savedCents: 0, retirementAge: 95 })`; `drizzle/0005_demonic_vermin.sql:2` `PRIMARY KEY` em `user_id` | teste | ✅ PASS |
| 5 com objetivo: formulário preenchido | valores salvos nos campos | `PG:26-37` mapeia `goal` para `initial` (`moneyText`, `birthDate`, `String(retirementAge)`); `GF:27` `useState(initial ?? blank)` | leitura | ✅ PASS (leitura) |
| 6 alvo = renda × 12 ÷ 8% | R$ 10.000,00 → R$ 1.500.000,00 | `FT:14` `expect(targetCents(1_000_000)).toBe(150_000_000)`; `FT:18` `targetCents(1)` = 150; `FT:22` `ANNUAL_RATE_BP` = 800 | teste | ✅ PASS |
| 7 exibe guardado, alvo, falta = max(0, alvo − guardado) | falta 135.000.000 (10%); 0 acima do alvo | `FT:135` `remainingCents: 135_000_000`; `FT:158` `expect(summary.remainingCents).toBe(0)`; exibição `GS:28,32,36` | teste + leitura | ✅ PASS |
| 8 barra e percentual guardado ÷ alvo, 1 casa | 150.000,00/1.500.000,00 → 10,0% | `FT:30` `progressBp(15_000_000, target)` = 1000; `FT:34` = 0; `FT:42-43` `progressBp(1,3)` = 3333 e `progressBp(2,3)` = 6667; texto `GS:19,43` `formatShare(progressBp)`, barra `GS:45` | teste + leitura | ✅ PASS |
| 9 ≥ alvo: barra 100%, texto real | 120,0% (12000 pb) | `FT:38` `progressBp(180_000_000, target)` = 12_000 (sem teto); `FT:159` `progressBp` = 12_000; teto `GS:21` `Math.min(100, summary.progressBp / 100)` e texto `GS:43` | teste + leitura | ✅ PASS |

### P1: Ver o aporte mensal necessário

| AC | Spec-defined outcome | `file:line` + assertion | Método | Result |
| -- | -------------------- | ----------------------- | ------ | ------ |
| 1 prazo n em meses de calendário | n entre o mês de hoje e o mês do aniversário de aposentadoria | `FT:72-76` 240, 245, 237; `FT:80-81` aniversário no mês corrente = 0; `FT:85-86` já passado = 0; `FT:90` mês seguinte = 1 | teste | ✅ PASS |
| 2 PMT com i = 1,08^(1/12) − 1, ceil | alvo 1.500.000,00, guardado 0, n=240 → 263.621 centavos | `FT:96` `toBe(263_621)`; `FT:149` `expect(summary.monthlyCents).toBe(263_621)`; propriedade `FT:112-119` `toBeGreaterThanOrEqual(targetCents - 1e-3)` | teste | ✅ PASS (ver sobrevivente U13 na tolerância) |
| 3 exibe aporte e prazo em anos e meses | aporte BRL e "X anos e Y meses" | `GS:52` `formatBRL(summary.monthlyCents)`, `GS:57` `formatTerm(summary.months)`, `GS:9-15` singular/zero | leitura | ✅ PASS (leitura) |
| 4 guardado capitalizado ≥ alvo: R$ 0,00 | `0` | `FT:101` `toBe(0)` (capitalizado > alvo); `FT:105` guardado = alvo, `toBe(0)`; `FT:160` `summary.monthlyCents` = 0; `FT:179` n=0 e guardado ≥ alvo → 0 | teste | ✅ PASS (ver sobrevivente U3) |
| 5 n=0 e guardado < alvo: "Prazo encerrado" e mantém falta | `monthlyCents` `null`, falta mantida | `FT:168-170` `months` 0, `monthlyCents` `toBeNull()`, `remainingCents` 135_000_000; texto `GS:52` `"Prazo encerrado"` quando `null` | teste + leitura | ✅ PASS |

### P1: Validar o formulário

| AC | Spec-defined outcome | `file:line` + assertion | Método | Result |
| -- | -------------------- | ----------------------- | ------ | ------ |
| 1 renda inválida | rejeita vazio, não numérico, < 0,01 e > 1.000.000,00, mensagem no campo | `GT:37-39` `.monthlyIncome?.length > 0` para "", "0", "0,00", "1.000.000,01", "abc"; `GT:41-43` `toBe("A renda máxima é R$ 1.000.000,00")`; aceita limites `GT:45-50` (1 e 100_000_000) | teste | ✅ PASS (texto não definido pela spec: ⚠️ ver lacuna 3) |
| 2 guardado inválido | rejeita vazio, negativo, > 999.999.999,99; aceita 0 | `GT:54-56` `.saved?.length > 0` para "", "-1", "1.000.000.000,00", "abc"; `GT:58-63` 0 e 99_999_999_999; `MT:7-9` `toEqual({ ok: true, value: 0 })`; `MT:15-19`; `MT:21-24` | teste | ✅ PASS |
| 3 nascimento inválido | rejeita vazio, inválido, futuro, idade > 120 | `GT:67-69` "", "1990-02-31", "15/06/1990"; `GT:71-73` `toBe("A data de nascimento não pode ser futura")`; `GT:75-77` `toBe("A idade atual deve ser de no máximo 120 anos")`; limites `GT:79-81` (120 aceita), `GT:83-87` (fuso SP) e `GT:89-92` (hoje aceito) | teste | ✅ PASS |
| 4 idade de aposentadoria | rejeita não inteiro, fora de 1..120 e ≤ atual | `GT:96-98` "", "60,5", "60.5", "1e2", "abc", "-3", "0", "121"; `GT:100-107` `toBe("A idade de aposentadoria deve ser maior que a idade atual (36)")` para 36 e 30; `GT:109-114` 37 e 120 aceitas; `GT:116-120` antes do aniversário | teste | ✅ PASS (re-verificação): `GT:96` `it.each` inclui "60,5", "60.5" e "1e2" no campo `retirementAge`; V9 morto |
| 5 falha de salvamento | mensagem de erro, objetivo anterior intacto | `AT:95-107` `toEqual({ ok: false, error: "Não foi possível salvar. Tente novamente" })` e `expect(await goalsRepo.get(userId)).toEqual(SAVED)`; UI `GF:106-110` `role="alert"` com `result.error` | teste + leitura | ✅ PASS |
| 6 sem sessão recusa leitura e gravação | gravação: `UNAUTHORIZED`, nada gravado | `AT:85-93` `toEqual({ ok: false, error: "UNAUTHORIZED" })`, `upsert` não chamado, `goalsRepo.get` `toBeNull()`; leitura: `PG:15` `requireSessionForPage()` antes de `goalsRepo.get` (`PG:16`) | teste (gravação) + leitura (leitura/página) | ✅ PASS |
| 7 lê e grava só o do usuário da sessão | isolamento | `RT:31-41` `expect(await goalsRepo.get(otherId)).toBeNull()` e `toEqual(GOAL)`; `RT:55-63`; `AT:109-115` `expect(await goalsRepo.get(other.userId)).toBeNull()`; código `src/actions/goals.ts:19` usa `session.userId`, `src/lib/db/repos/goals.ts:17` filtra por `userId` | teste | ✅ PASS |

**Banco (CHECKs, LIB-02/LIB-11)**: `RT:65-78` recusa 0, 100_000_001, -1, 100_000_000_000, idade 0 e 121 mantendo o objetivo anterior; `RT:80-92` aceita os limites; `drizzle/0005_demonic_vermin.sql:7-9` define os três CHECKs.

### Edge Cases

| Edge Case | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Aniversário diminui n, recalcula na leitura | prazo menor sem novo envio | `FT:184` `summarize(goal, new Date("2026-07-15T15:00:00Z")).months` `toBe(239)`; nada derivado é gravado (`PG:25` calcula a cada render) | ✅ PASS |
| Idade de aposentadoria atingida no mês corrente | n = 0 | `FT:80-81` `monthsUntilRetirement(..., {2026, 6})` `toBe(0)`; `FT:168` `expect(summary.months).toBe(0)` | ✅ PASS |
| Nascimento 29/02: aniversário 28/02 em ano não bissexto | 28/02 | `FT:59-60` `ageOn("2000-02-29", 2025-02-27)` = 24 e `2025-02-28` = 25; bissexto `FT:64-65` | ✅ PASS |
| Guardado R$ 0,00 exibe 0,0% | `progressBp` 0 | `FT:34` `progressBp(0, target)` `toBe(0)`; `FT:150` `expect(summary.progressBp).toBe(0)`; formatação `GS:43` | ✅ PASS |

### Success Criteria

| Critério | Evidência | Result |
| -------- | --------- | ------ |
| Aporte atinge o alvo com diferença < R$ 0,01 por mês de aporte | `FT:117` `toBeGreaterThanOrEqual(targetCents - 1e-3)` e `FT:119` `toBeLessThan((growth - 1) / i)` em 3 combinações | ✅ PASS |
| Salva em menos de 1 minuto sem sair da aba | `GF:38-46`, `PG:25`: um envio, `router.refresh()`, resumo na mesma página (leitura) | ✅ PASS (leitura) |

**Status**: ✅ Todos os ACs e Edge Cases têm evidência `file:line`; ⚠️ 3 lacunas de precisão/cobertura (abaixo).

### Lacunas de precisão da spec (⚠️)

1. LIB-08/LIB-09 (Validar AC 1-4): "exibir mensagem no campo" não define o texto. Vários testes asserem só `length > 0` (`GT:37-39`, `GT:54-56`, `GT:67-69`, `GT:96-98`).
2. LIB-10 (Validar AC 5): "mensagem de erro" sem texto; o teste fixa o texto de `SAVE_FAILED` existente (`AT:95-107`), que a spec não define.
3. Fuso horário: o design adota São Paulo para "hoje" (`src/lib/validation/goal.ts:9-14`), mas a spec não define o dia de referência perto da meia-noite, e não há teste (sobrevivente V10).

---

## Discrimination Sensor

Escopo: git worktree temporária em HEAD (`git worktree add --detach`), `node_modules` por symlink, cada mutação aplicada, testes rodados, arquivo restaurado; worktree removida com `git worktree remove --force` + `prune`. Sem `git stash`. Profundidade: **expandida** (P0 de dados e cálculo financeiro; 34 mutações manuais). O banco de testes de integração é compartilhado; mutações de integração rodaram só os arquivos da feature.

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| U1 | `freedom.ts:41` | taxa 1,08 → 1,07 | ✅ Killed (5 falhas) |
| U2 | `freedom.ts:57` | `ceil` → `floor` | ✅ Killed (5) |
| U2b | `freedom.ts:57` | `ceil` → `round` | ✅ Killed (1, propriedade) |
| U3 | `freedom.ts:54` | `gap <= 0` → `gap < 0` | ❌ Survived |
| U4 | `freedom.ts:81` | `>=` → `>` no ramo guardado ≥ alvo | ✅ Killed (1) |
| U5 | `freedom.ts:84` | troca `0`/`null` em n=0 | ✅ Killed (2) |
| U6 | `freedom.ts:10` | alvo ×12 → ×1 | ✅ Killed (6) |
| U7 | `freedom.ts:90` | remove `max(0, ...)` da falta | ✅ Killed (1) |
| U8 | `freedom.ts:37` | adiciona teto 10000 em `progressBp` | ✅ Killed (2) |
| U9 | `freedom.ts:32` | remove o piso 0 de n | ✅ Killed (1) |
| U10 | `freedom.ts:32` | inverte o sinal da diferença de meses | ✅ Killed (4) |
| U11 | `freedom.ts:23` | 29/02 → 28 vira 29 | ✅ Killed (1) |
| U12 | `freedom.ts:25` | `day <` → `day <=` | ✅ Killed (3) |
| U13 | `freedom.ts:57` | remove a tolerância `- 1e-6` | ❌ Survived |
| V1 | `goal.ts:75` | `age <= currentAge` → `age < currentAge` | ✅ Killed (1) |
| V2 | `goal.ts:75` | remove a regra idade > atual | ✅ Killed (1) |
| V3 | `goal.ts:7` | `MAX_AGE` 120 → 121 | ✅ Killed (2) |
| V4 | `goal.ts:61` | idade atual `>` → `>=` 120 | ✅ Killed (1) |
| V5 | `goal.ts:58` | futura `>` → `>=` | ✅ Killed (1) |
| V6 | `goal.ts:6` | teto da renda +1 centavo | ✅ Killed (2) |
| V7 | `goal.ts:51` | remove `allowZero` do guardado | ✅ Killed (1) |
| V8 | `goal.ts:73` | `age < 1` → `age < 0` | ❌ Survived (equivalente de comportamento: 0 ≤ idade atual rejeita do mesmo jeito, muda só a mensagem) |
| V9 | `goal.ts:70` | regex de inteiro `^\d+$` → `Number.isNaN(Number(...))` | ✅ Killed na re-verificação (`rejeita "60.5"`, 2 falhas) |
| V10 | `goal.ts:10` | fuso `America/Sao_Paulo` → `UTC` | ✅ Killed na re-verificação (`usa o dia de São Paulo como hoje`, `GT:83-87`) |
| V11 | `money.ts:26` | teto `MAX_CENTS` +1 | ✅ Killed (3) |
| V12 | `goal.ts:56` | remove o ramo "nascimento vazio" | ❌ Survived (equivalente: vazio cai em `isValidCalendarDate`) |
| M1 | `money.ts:25` | `allowZero` ignorado (zero sempre aceito) | ✅ Killed (3) |
| M2 | `money.ts:26` | zero/negativo aceito com `allowZero` | ✅ Killed (3) |
| R1 | `repos/goals.ts:17` | remove o filtro por `userId` em `get` | ✅ Killed (1) |
| R2 | `repos/goals.ts:26-29` | `onConflictDoUpdate` → `onConflictDoNothing` | ✅ Killed (1) |
| A1 | `actions/goals.ts:16` | entrada inválida devolve `ok: true` | ✅ Killed (5) |
| A2 | `actions/goals.ts:22` | `SAVE_FAILED` engolido | ✅ Killed (1) |
| A3 | `actions/goals.ts:13` | remove a checagem de sessão | ✅ Killed (1) |
| A4 | `actions/goals.ts:25` | remove `revalidatePath("/liberdade")` | ✅ Killed (1) |

**Sensor depth**: P0-full (manual, 34 mutações; re-verificação: 12 re-executadas)
**Result**: 30/34 killed após a re-verificação (V9 e V10 mortos; amostra de 12 mutações das 28 originais, incluindo U1, U2, U4, U6, U12, V1, V4, V5, V7, M1, continuou 100% morta). 4 sobreviventes aceitos: V8 e V12 equivalentes de comportamento, U3 quase equivalente (só difere com gap exatamente 0, inalcançável com n > 0), U13 cosmético (tolerância de ponto flutuante `1e-6` sem caso de PMT exato). **PASS ✅**.

Isolamento: `git worktree list` mostra só a árvore real; `git status --porcelain` da árvore real **não** foi alterado pelo sensor (nenhum caminho escrito fora do scratch). Observação: outros agentes alteraram a árvore real durante a execução (arquivos de outras features: migração 0006, categorias, transações); as diferenças entre o baseline e o estado final são desse trabalho concorrente, não do sensor.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes (`parseBRL` ganhou só `{ allowZero }`; `money.ts` +12/-3) | ✅ |
| No scope creep | ✅ |
| Matches patterns (categories repo/action, `ctx.addIssue`, `useTransition`) | ✅ |
| Spec-anchored outcome check (valores asseridos batem com a spec) | ✅ (3 lacunas de precisão/cobertura acima) |
| Per-layer Coverage Expectation (domínio 1:1 com ACs; validação com limites; repo e action com sucesso, inválido, sem sessão, falha) | ✅ "60.5"/"1e2" e o caso do fuso cobertos em `aafc341` |
| Todo teste mapeia a um AC, Edge Case ou Done-when | ✅ |
| Guidelines documentadas | `AGENTS.md`, `vitest.config.ts`; sem guideline de cobertura, defaults fortes aplicados |

---

## Gate Check

- **Gate command**: `PATH=<node 20> npm run typecheck && npm run lint && npm run test:unit && npm run test:int` (sem `next build` na árvore real, por instrução)
- **typecheck**: exit 0; **lint**: exit 0
- **Unit**: 315 passed, 0 failed (12 arquivos; +3 testes de `aafc341`)
- **Integration**: 234 passed, 0 failed (11 arquivos). Re-verificação: limpo na primeira execução. Na verificação inicial foram necessárias 3 execuções: As duas primeiras tiveram falhas de FK em `account`/`session`/`category`/`transaction`, `deadlock detected` e `transaction_kind_category`, todas por outro processo `vitest` concorrente no banco compartilhado `orcamento_test` (processos de outros agentes visíveis em `ps`). Rodada limpa sem falhas confirmada.
- **Test count antes da feature**: não medido isoladamente; os arquivos de teste tocados só receberam inserções (`money.test.ts` +21/-0)
- **Delta**: nenhum teste removido nem enfraquecido
- **Skipped tests**: nenhum
- **Observação**: a árvore real tem alterações não commitadas de outras features; o gate rodou sobre ela (passou).

---

## Fix Plans (resolvidos na iteração 1 de 3)

### Fix 1 (Major, ✅ resolvido em aafc341): teste de "idade não inteira" não cobre ponto decimal (V9)

- **Root cause**: `GT:90-92` só usa "60,5" (que `Number()` já recusa). Uma regressão para `Number(...)` aceitaria "60.5" e "1e2" e passaria nos testes.
- **Fix task**: adicionar a `GT:90` os casos "60.5", "1e2" e " 6 0" (rejeitados no campo `retirementAge`).
- **Priority**: Major

### Fix 2 (Minor, ✅ resolvido em aafc341): fuso horário do "hoje" sem teste (V10)

- **Root cause**: todos os testes de validação usam 12:00 em São Paulo, quando UTC e São Paulo caem no mesmo dia.
- **Fix task**: teste com `now = 2026-06-16T02:00:00Z` (23:00 de 15/06 em SP): nascimento "2026-06-16" é futuro (rejeita) e a idade atual usa 15/06. Opcional: fixar na spec o fuso de "hoje".
- **Priority**: Minor

### Fix 3 (Cosmetic, aceito sem correção): tolerância `1e-6` e `gap == 0` sem teste (U13, U3)

- **Fix task**: caso com PMT exato em inteiro (por exemplo n=12 e valores montados para PMT inteiro) que falharia sem a tolerância; opcional.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

`spec.md` atualizada neste commit: todas as LIB marcadas Verified.

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LIB-01 a LIB-11 | Implemented/Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/20 ACs e Edge Cases com evidência `file:line` batendo com a spec; 2 lacunas de precisão da spec registradas (mensagens sem texto, fuso do "hoje"), sem lacuna de cobertura
**Sensor**: 30/34 mutações mortas; 4 sobreviventes aceitos (V8, V12, U3 equivalentes; U13 cosmético)
**Gate**: typecheck, lint, 315 unit e 234 integration passando

**What works**: cálculo (alvo, prazo, PMT 263.621, ramos de n = 0 e guardado ≥ alvo), validação com limites, repositório com isolamento por usuário, action (sessão, validação, `SAVE_FAILED`, revalidação), UI conforme a spec por leitura.

**Next steps**: nenhum.
