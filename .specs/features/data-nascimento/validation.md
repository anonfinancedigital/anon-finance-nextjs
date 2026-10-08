# Validation: data-nascimento - PASS

**Date**: 2026-10-08
**Spec**: `.specs/features/data-nascimento/spec.md`
**Diff range**: `cfcbd6c^..2379c28` (18 commits, T1 a T18)
**Verifier**: sub-agente independente (autor != verificador)
**Verdict**: PASS (com 4 lacunas não bloqueantes, listadas em "Lacunas e riscos")

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T18 | Done | 18 commits atômicos de `cfcbd6c` a `2379c28`; árvore limpa de código pendente |

---

## Spec-Anchored Acceptance Criteria

Mensagens exatas conferidas contra a spec (as quatro de validação, a de NASC-14, a de NASC-18, a de `saveGoal` sem data, `UNAUTHORIZED`).

| AC | Resultado esperado (spec) | `file:line` + assertiva | Result |
| -- | ------------------------- | ----------------------- | ------ |
| NASC-01 (UI) campo "Data de nascimento", máscara `DD/MM/AAAA`, entre E-mail e Senha | label, máscara, ordem | inspeção: `src/app/cadastro/signup-form.tsx:47` (E-mail) < `:59` (`Label` "Data de nascimento") < `:74` (Senha); `:64` `placeholder="DD/MM/AAAA"`; `:68` `maskDateInput(...)` | PASS (código) |
| NASC-02 cadastro válido grava `pending` com `birth_date` AAAA-MM-DD na transação | `birthDate: "1993-09-18"` | `src/actions/auth.int.test.ts:258` `toMatchObject({... status: "pending", birthDate: "1993-09-18"})`; `src/lib/db/repos/users.int.test.ts:45-52` `birthDate` `"1993-09-18"` / `null`; `src/lib/validation/signup.test.ts:73-75` `.birthDate` `toBe("1993-09-18")`; transação: `src/lib/db/repos/users.ts` (`createPending` no mesmo `tx.insert`) | PASS |
| NASC-03 vazio: "Informe a data de nascimento" no campo, sem usuário | mensagem exata + `fieldErrors.birthDate` + 0 usuários | `src/actions/auth.int.test.ts:264-279` (`"empty"`) `toEqual({ok:false, error:message, fieldErrors:{birthDate:message}})` e `usersWith(...)` `toEqual([])`; `:281-291` sem o campo; `src/lib/validation/signup.test.ts:77-86`; `src/lib/validation/birth-date.test.ts:17-20` | PASS |
| NASC-04 inexistente / formato ISO: "Data de nascimento inválida" | mensagem exata | `src/actions/auth.int.test.ts:266-267` (`31/02/1993`, `1993-09-18`); `src/lib/validation/birth-date.test.ts:22-25` (`31/02/1990`, `1990-01-01`) `toBe("Data de nascimento inválida")` | PASS |
| NASC-05 futura: "A data de nascimento não pode ser futura" | mensagem exata | `src/actions/auth.int.test.ts:268` (`dayFromNow(2).br`); `src/lib/validation/birth-date.test.ts:27-29` (`16/06/2026` com hoje 15/06) | PASS |
| NASC-06 idade > 120: "A idade atual deve ser de no máximo 120 anos" | mensagem exata | `src/actions/auth.int.test.ts:269` (`01/01/1800`); `src/lib/validation/birth-date.test.ts:31-33` (`14/06/1905`) | PASS |
| NASC-07 data = hoje (America/Sao_Paulo) aceita | aceita e grava | `src/actions/auth.int.test.ts:293-299` `birthDate` `toBe(iso)` com `dayFromNow(0)`; `src/lib/validation/birth-date.test.ts:35-40` inclui 01:00 UTC de 16/06 ainda 15/06 em SP (`toBeNull()`) e 16/06 futura | PASS |
| NASC-08 (UI) `approved` sem data: toda página de `(app)` exceto `/data-nascimento` redireciona para `/data-nascimento` | redirect sem laço | inspeção: `src/app/(app)/layout.tsx:99` `if ((await usersRepo.getBirthDate(userId)) === null) redirect("/data-nascimento")`; `/data-nascimento` está em `src/app/data-nascimento/page.tsx` (fora do grupo `(app)`, sem layout que redirecione: sem laço); `src/app/(app)/liberdade/page.tsx:23` segunda barreira; `proxy.ts` matcher (só exclui login/cadastro/esqueci-senha/redefinir-senha/api/auth/assets) mantém `/data-nascimento` atrás do cookie. Sem teste automatizado (ver mutante M7) | PASS (código), lacuna de teste |
| NASC-09 sem data envia válida: grava e redireciona para `/` | `redirect("/")` e `1993-09-18` | `src/actions/profile.int.test.ts:75-81` `rejects.toThrow("NEXT_REDIRECT /")`, `redirect` `toHaveBeenCalledWith("/")`, `getBirthDate` `toBe("1993-09-18")` | PASS |
| NASC-10 inválida: mesma mensagem no campo, usuário inalterado | mensagens NASC-03..06, `fieldErrors.birthDate`, data anterior mantida | `src/actions/profile.int.test.ts:100-114` `toEqual(rejected(message))` (5 casos) + `getBirthDate` `toBe("1993-09-18")`, sem redirect/revalidate; `:116-119` primeira data inválida segue `null` | PASS |
| NASC-11 migração copia `financial_goal.birth_date` para `user.birth_date`, `NULL` nos demais | u1=1993-09-18, u2=NULL | sem teste automatizado; `drizzle/0013_user_birth_date.sql:1-2` (`ADD COLUMN` + `UPDATE ... FROM financial_goal g WHERE g.user_id = "user".id`), `drizzle/0014_goal_birth_date_removed.sql:1` (`DROP COLUMN`); evidência T3 (apêndice) e reexecução do verificador 0000..0014 em banco descartável (apêndice B) | PASS (evidência manual), lacuna de teste |
| NASC-12 (UI) formulário sem campo de data; texto com a data + link "Alterar data de nascimento" para `/data-nascimento` (gaveta e estado vazio) | sem `Input` de nascimento; texto + link | inspeção: `src/components/goal-fields.tsx:112-122` (`<span>{values.birthDate}</span>`, `<Link href="/data-nascimento">Alterar data de nascimento</Link>`, nenhum `Input` de nascimento; import `maskDateInput` removido); `GoalFields` usado por `goal-form.tsx:56` (gaveta) e `goal-empty-state.tsx:114` (estado vazio); data semeada em `src/components/use-goal-draft.ts:30`; `src/lib/validation/goal-draft.test.ts:78-81` `dirty` `toBe(false)` ao mudar só a data | PASS (código) |
| NASC-13 salvar valida contra a data do usuário e não grava `birth_date` em `financial_goal` | data do servidor vence; sem coluna na linha | `src/actions/goals.int.test.ts:94-101` datas forjadas (`31/02/1990`, `1990-06-15`, `15/06/2020`, `""`) `toEqual({ok:true})` e `goalsRepo.get` `toEqual(SAVED)`; `:104-110` `row` `not.toHaveProperty("birthDate")`; `src/lib/db/repos/goals.int.test.ts:224` "does not write the birth date" `Object.keys(...)` `not.toContain("birthDate")` | PASS |
| NASC-14 independência <= idade atual: "A idade da independência deve ser maior que a idade atual (N)" | mensagem com N = idade | `src/actions/goals.int.test.ts:125-137` (`delta` 0 e -1) `fieldErrors: { retirementAge: \`A idade da independência deve ser maior que a idade atual (${age})\` }`; `:139-142` idade+1 aceita; `src/lib/validation/goal.test.ts:229,232` | PASS |
| NASC-15 `summarize`/`monthsUntilRetirement`/`ageOn` com os mesmos resultados | `freedom.ts` inalterado | `git diff cfcbd6c^..2379c28 --stat` não lista `src/lib/domain/freedom.ts` nem `freedom.test.ts`; `src/lib/domain/freedom.test.ts` e `goal-draft.test.ts` seguem verdes (909 unit); `src/lib/db/repos/goals.int.test.ts` `get` devolve `Goal` idêntico com `birthDate` do usuário | PASS |
| NASC-16 (UI) `/data-nascimento` pré-preenchido `DD/MM/AAAA` | `isoToBR(data)` | inspeção: `src/app/data-nascimento/page.tsx:66,81` `<BirthDateForm initial={... isoToBR(birthDate)} />`, `birth-date-form.tsx:15` `useState(initial)`; `date-br` tem teste próprio de `isoToBR` | PASS (código) |
| NASC-17 data válida diferente: atualiza e exibe "Data de nascimento atualizada" | `{ ok: true }` + nova data | `src/actions/profile.int.test.ts:83-91` `save("20/01/1990")` `toEqual({ ok: true })`, `getBirthDate` `toBe("1990-01-20")`, `redirect` `not.toHaveBeenCalled()`; texto: `src/app/data-nascimento/birth-date-form.tsx:10,43-45` (inspeção, sem teste do texto) | PASS (texto só por código) |
| NASC-18 nova data torna idade >= independência: recusa com N e mantém a anterior | "A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (50)" | `src/actions/profile.int.test.ts:122-123` constante CONFLICT; `:130-134` `18/09/1960` `toEqual(rejected(CONFLICT))` + data `1993-09-18`; `:136-141` idade == 50 (limite inclusivo); `:143-146` `18/09/1990` aceita | PASS |

**Edge cases**

| Edge case | `file:line` + assertiva | Result |
| --------- | ----------------------- | ------ |
| Não `approved` em `/data-nascimento` -> `/login` | `src/app/data-nascimento/page.tsx:65` `requireSessionForPage()`; `src/lib/auth-guard.ts:7-17` (`status !== "approved"` -> `redirect("/login")`); inspeção | PASS (código) |
| Action sem sessão aprovada -> `UNAUTHORIZED` sem gravar | `src/actions/profile.int.test.ts:64-73` `toEqual({ ok: false, error: "UNAUTHORIZED" })` (sem cookie e `pending`) + `getBirthDate` `toBeNull()` | PASS |
| Cliente envia `birthDate` por endpoint público do Better Auth -> ignorado | `src/lib/auth.ts` não declara `birth_date` em `additionalFields` (só `status`, `input: false`) e `emailAndPassword.disableSignUp: true`; probe do verificador (apêndice C) com `auth.api.updateUser({ birthDate / birth_date })` deixou `birth_date` `NULL`. Sem teste commitado | PASS (probe), lacuna de teste |
| `saveGoal` sem `birth_date` -> "Informe sua data de nascimento antes de salvar o objetivo", sem gravar | `src/actions/goals.int.test.ts:112-123` `toEqual({ ok: false, error: "Informe sua data de nascimento antes de salvar o objetivo" })`, `upsert` `not.toHaveBeenCalled()`, `$count(financialGoal)` `toBe(0)` | PASS |
| 29/02 de ano bissexto aceito, idade como `ageOn` | `src/lib/validation/birth-date.test.ts:46-51` idade 26 em 27/02/2027 e 27 em 28/02/2027 | PASS |
| Idade exatamente 120 aceita (limite inclusivo) | `src/lib/validation/birth-date.test.ts:42-44` `toEqual({ok:true, value:{iso:"1906-06-15", age:120}})`; `src/lib/validation/goal.test.ts:100` | PASS |

**Status**: 18/18 ACs e 6/6 edge cases com evidência; 0 AC sem cobertura; spec-precision gaps: ver abaixo.

### Pontos de revisão pedidos

- **(a) Testes substituídos em `goals.int.test.ts`** ("rejects a birth date in AAAA-MM-DD" e o caso `["birthDate","31/02/1990"]`): legítimo. Pelo NASC-13 e pelo design (`saveGoal` descarta o `birthDate` do cliente), um `birthDate` inválido enviado pelo cliente deixou de ser rejeitado por design; manter o teste antigo contradiria a spec. As regras de formato/validade seguem cobertas onde a data realmente entra (`birth-date.test.ts`, `signup.test.ts`, `auth.int.test.ts`, `profile.int.test.ts`). Os substitutos são discriminantes: `goals.int.test.ts:94-101` (data forjada ignorada, incluindo `""` e data que tornaria idade 90 impossível) e `:112-124` (mensagem exata sem data). O mutante M4 (usar `input.birthDate`) foi morto por `:94`, e M10 (remover a checagem de data ausente) por `:112`.
- **(b) `goal-draft.test.ts`** `birthDate: "10/05/2030"` -> `retirementAge: "10"`: adequado. O teste existe para provar que uma alteração inválida ainda conta como `dirty`; como `birthDate` saiu de `FIELDS` (NASC-12), a data deixou de ser um campo de alteração e `retirementAge: "10"` (idade atual 33, logo inválida) preserva a intenção. A asserção do teste continua só `dirty === true` (como no original). Os testes novos `:78-81` e `:83-86` cobrem a exclusão da data; o mutante M13 foi morto.
- **(c) Flakiness**: suíte de integração rodada 3 vezes pelo verificador contra `orcamento_nasc_test` (porta 5433): 536/536 verdes nas 3 execuções. Nenhum teste flaky observado. Risco teórico: `auth.int.test.ts` e `signup.test.ts` calculam "hoje/amanhã" com o relógio real (`dayFromNow`, `todayBR`), então rodar exatamente na virada do dia em America/Sao_Paulo poderia falhar; o erro único relatado antes não foi reproduzido.
- **(d) Guard do layout / `proxy.ts`**: ver NASC-08. `/data-nascimento` fora do grupo `(app)` (sem laço); o `proxy.ts` mantém a rota atrás do cookie; `requireSessionForPage` também cobre não aprovados.
- **(e) Migração**: ver NASC-11 e apêndices A e B (0013 copia, 0014 remove a coluna; verificado em banco descartável).
- **(f) Segurança**: `birth_date` fora de `additionalFields` (`src/lib/auth.ts`), probe confirma que `updateUser` o ignora; `saveGoal` descarta o `birthDate` do cliente (`src/actions/goals.ts`, teste `goals.int.test.ts:94`); `saveBirthDateAction` usa só `session.userId` (`src/actions/profile.ts:60-75`) e `setBirthDate` filtra por `id` (mutante M11 morto por `users.int.test.ts` "changes only the given user").

---

## Discrimination Sensor

Profundidade: expandida (caminho de dados/autenticação), 16 mutantes manuais em worktree git descartável (`node_modules` linkado, banco privado `orcamento_nasc_test`). Árvore real intocada.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/validation/birth-date.ts:31` | aceita data futura (`false && iso > hoje`) | Killed (5 testes: NASC-05, NASC-07...) |
| M2 | `src/lib/validation/birth-date.ts:33` | limite 120 vira `age >= MAX_AGE` | Killed (`aceita idade exatamente 120`, goal.test) |
| M3 | `src/lib/validation/birth-date.ts:31` | rejeita o dia de hoje (`>=`) | Killed (3 testes: NASC-07) |
| M4 | `src/actions/goals.ts:28` | `saveGoal` usa o `birthDate` do cliente | Killed (`goals.int.test.ts:94`) |
| M5 | `src/actions/profile.ts:69` | action não recusa idade >= independência | Killed (`profile.int.test.ts:130,136`) |
| M6 | `src/actions/profile.ts:69` | conflito com `>` em vez de `>=` | Killed (`profile.int.test.ts:136`) |
| M7 | `src/app/(app)/layout.tsx:99` | guard de data removido do layout | **Survived** (1445/1445 verdes; sem teste do layout) |
| M8 | `src/lib/db/repos/goals.ts` | `goalsRepo.get` devolve objetivo sem data do usuário | Killed (`goals.int.test.ts` "no birth date") |
| M9 | `src/lib/db/repos/users.ts:34-41` | `createPending` não grava `birth_date` | Killed (3 testes) |
| M10 | `src/actions/goals.ts` | remove "Informe sua data..." de `saveGoal` | Killed (`goals.int.test.ts:112`) |
| M11 | `src/lib/db/repos/users.ts` | `setBirthDate` sem `where` por usuário | Killed (`users.int.test.ts` "changes only the given user") |
| M12 | `src/actions/profile.ts:82` | redirect invertido (`if (hadDate)`) | Killed (4 testes) |
| M13 | `src/lib/validation/goal-draft.ts:43` | `birthDate` volta a contar como alteração | Killed (`goal-draft.test.ts:78`) |
| M14 | `src/lib/db/repos/goals.ts` | join com `user` sem casar o `user_id` | Killed (`goals.int.test.ts` "not of another one") |
| M15 | `src/actions/auth.ts:87` | `signUpAction` ignora o `birthDate` do formulário | Killed (7 testes) |
| M16 | `src/lib/validation/birth-date.ts:26` | remove `trim()` | Killed (NASC-03 com `"   "`) |

**Sensor depth**: expandida (16 mutações)
**Result**: 15/16 mortos, 1 sobrevivente (M7, layout guard). O M7 é a única regra do NASC-08 sem teste automatizado; a spec e o AD-005 definem NASC-08 como evidência por inspeção de código, então não bloqueia o veredito, mas fica registrado como lacuna (ver abaixo).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | OK (`parseBirthDate` extraída e reutilizada por signup, goal e profile) |
| Surgical changes | OK (`freedom.ts` e `summarize` intocados) |
| No scope creep | OK |
| Matches patterns | OK (Server Action + `useActionState`, repos, `requireSession*`) |
| Spec-anchored outcome check | OK (mensagens exatas nas assertivas) |
| Tests map to spec requirements | OK (`NASC-xx` nos nomes; sem testes sem dono) |
| Documented guidelines followed | AGENTS.md (AD-005: nenhum e2e criado/rodado) |

Test integrity: unit 890 -> 909 (+19); integração 536 verdes (contagem anterior não medida); nenhum teste removido sem substituto (os 2 substituídos acima têm equivalentes mais fortes).

---

## Edge Cases

- [x] Todos os 6 edge cases tratados (tabela acima); 2 por código/probe sem teste commitado.

---

## Gate Check

- **Comandos** (Node 20): `npm run typecheck && npm run lint && npm run test:unit && npm run build` e `DATABASE_URL=...orcamento_nasc_test npm run test:int`
- **typecheck**: exit 0 | **lint**: exit 0 (sem erros) | **build**: exit 0 (rota `/data-nascimento` presente)
- **test:unit**: 909 passed, 0 failed, 0 skipped (30 arquivos)
- **test:int**: 536 passed, 0 failed, 0 skipped (19 arquivos), em 3 execuções consecutivas
- **Flaky**: nenhum
- **e2e**: não rodado/escrito (AD-005)

---

## Lacunas e riscos (não bloqueiam o PASS)

1. M7 sobreviveu: o redirect do layout `(app)` (NASC-08) não tem teste automatizado; só inspeção de código.
2. NASC-11: a cópia da migração só tem evidência manual (apêndices); nenhum teste de integração a reproduz (há precedente: `goals.int.test.ts` "migration 0011").
3. Edge do Better Auth (`input: false`): ausência de `additionalFields` não tem teste commitado; só o probe do verificador.
4. NASC-17: o texto "Data de nascimento atualizada" é verificado só por inspeção (`birth-date-form.tsx:10,43-45`).
5. Spec: a tabela de rastreabilidade ainda diz "0 mapped to tasks" (desatualizada, sem impacto no comportamento).

---

## Summary

**Overall**: PASS

**Spec-anchored check**: 18/18 ACs com resultado conferido contra a spec (4 por inspeção de código: NASC-01, 08, 12, 16; NASC-11 por evidência manual); 0 spec-precision gaps; 4 lacunas de teste não bloqueantes
**Sensor**: 15/16 mutações mortas
**Gate**: 909 unit + 536 integração passando, typecheck/lint/build verdes

---

## Appendix A - T3: cópia da migração 0013 (NASC-11)

Banco privado `orcamento_nasc_test`. Aplicadas as migrações até a 0012, inseridos o usuário `u1` (com objetivo, `birth_date = 1993-09-18`) e `u2` (sem objetivo), e então aplicada a 0013.

```
 id | birth_date
----+------------
 u1 | 1993-09-18
 u2 |
```

`financial_goal.birth_date` segue existindo (sai na 0014, T12).

## Appendix B - reexecução do verificador (0000..0014)

Banco descartável (criado e removido no container `orcamento-pg`): migrações 0000-0012, usuários `u1` (com objetivo, `1993-09-18`) e `u2` (sem objetivo), depois 0013 e 0014.

```
 id | birth_date
----+------------
 u1 | 1993-09-18
 u2 |
```

Após a 0014, `\d financial_goal` não lista mais `birth_date` (colunas: user_id, monthly_income_cents, saved_cents, retirement_age, updated_at, annual_rate_bp, withdrawal_rate_bp).

## Appendix C - probe do Better Auth (scratch)

Teste temporário no worktree descartável: `auth.api.updateUser({ body: { name: "Z", birthDate: "1990-01-01" } })` e com `birth_date`; em ambos `usersRepo.getBirthDate` permaneceu `null`. Teste removido junto com o worktree.
