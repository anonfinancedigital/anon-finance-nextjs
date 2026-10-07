# senha-visivel-confirmacao - Relatório de validação

## Validation: senha-visivel-confirmacao - PASS ✅

**Data**: 2026-10-07 (re-verificação, iteração 1 de 3; a verificação inicial deu FAIL com 4 mutantes sobreviventes)
**Spec**: `.specs/features/senha-visivel-confirmacao/spec.md`
**Intervalo de diff**: `2848a52..e1d1344`, restrito aos arquivos da feature. Código em `e6958c7`, `8405777` e `78ddaa5`; fix de testes em `e1d1344` (só `e2e/login.spec.ts` e `e2e/signup.spec.ts`). Os commits `0599e21..217d855` no meio do intervalo são da feature `esqueci-senha`, de outra sessão, e não tocam nenhum arquivo desta feature (`git diff 78ddaa5 e1d1344` nos arquivos de código da feature é vazio).
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura no tree real; mutações só em `git worktree` temporário em `e1d1344`.

**Resumo do veredito**: os 17 critérios (16 ACs, com o AC 3 dividido em rótulo e ícone) e os 2 edge cases batem com o resultado exato do spec. O gate passa (722 unit e 479 integração no commit `e1d1344`, 0 falhas), e os 7 e2e da feature passam. O sensor mata 10 de 10 mutantes, incluindo os 4 que sobreviveram na rodada anterior (M4, M8, M9, M10).

### Re-verificação dos gaps da rodada anterior

| Gap | Correção (`e1d1344`) | Evidência `file:line` + asserção | Situação |
| --- | -------------------- | -------------------------------- | -------- |
| 1. AC 5: `type="button"` sem teste que discrimine (M4) | O teste do login preenche credenciais válidas antes de clicar no olho e afirma o `type` do botão | `e2e/login.spec.ts:24-25` - preenche `ADMIN.email`/`ADMIN.password`; `:27` - `expect(show).toHaveAttribute("type", "button")`; `:33` - `expect(page).toHaveURL("/login")` | ✅ Fechado. M4 morre em `:27`; numa sonda sem a linha 27, M4 morre em `:33` (URL recebida `/`), então o caminho comportamental também discrimina |
| 2. AC 3: ícone sem asserção (M9) | Asserção do ícone em cada estado | `e2e/login.spec.ts:28` - `expect(show.locator("svg.lucide-eye")).toBeVisible()`; `:36` - `expect(hide.locator("svg.lucide-eye-off")).toBeVisible()` | ✅ Fechado. M9 morre |
| 3. AC 6: `autoComplete` do login sem asserção (M8) | Asserção do atributo | `e2e/login.spec.ts:21` - `expect(password).toHaveAttribute("autocomplete", "current-password")` | ✅ Fechado. M8 morre |
| 4. AC 1 da confirmação: `autoComplete`, `required` e ordem sem asserção (M10) | Teste novo de atributos e ordem | `e2e/signup.spec.ts:16-17` - `passwordFields.nth(0)` com `name="password"` e `nth(1)` com `name="confirmPassword"`; `:21` - `toHaveAttribute("autocomplete", "new-password")`; `:22` - `toHaveJSProperty("required", true)` | ✅ Fechado. M10 morre |

---

## Conclusão das tarefas

| Task | Status | Observações |
| ---- | ------ | ----------- |
| (sem tasks.md) | n/a | O spec registra "Tasks é pulado: Medium". Os 3 commits de código cobrem schema/action, componente/login e cadastro |
| Fix 1-3 da iteração 0 | ✅ Concluída | `e1d1344` |

---

## Spec-Anchored Acceptance Criteria

### P1: Mostrar e ocultar senha (PWD-01)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC 1: todo campo de senha do login e do cadastro inicia com `type="password"` | `type="password"` nos 3 campos | `e2e/login.spec.ts:20` - `expect(password).toHaveAttribute("type", "password")`; `e2e/signup.spec.ts:28` - `expect(password).toHaveAttribute("type", "password")`; `e2e/signup.spec.ts:29` - `expect(confirm).toHaveAttribute("type", "password")` | ✅ PASS |
| AC 2: clicar no olho alterna só esse campo entre `password` e `text` | campo clicado vira `text`, o outro segue `password` | `e2e/login.spec.ts:30` - `toHaveAttribute("type", "text")`, `:38` - `toHaveAttribute("type", "password")`; `e2e/signup.spec.ts:33` - `expect(password).toHaveAttribute("type", "text")` e `:34` - `expect(confirm).toHaveAttribute("type", "password")` (M5 morto) | ✅ PASS |
| AC 3 (aria-label): `"Ocultar senha"` quando visível, `"Mostrar senha"` quando oculto | rótulos exatos | `e2e/login.spec.ts:26` - `getByRole("button", { name: "Mostrar senha" })` com o campo oculto; `:35` - `getByRole("button", { name: "Ocultar senha" })` com o campo visível; `e2e/signup.spec.ts:31` (M7 morto) | ✅ PASS |
| AC 3 (ícone): `EyeOff` quando visível, `Eye` quando oculto | ícone específico por estado | `e2e/login.spec.ts:28` - `show.locator("svg.lucide-eye")).toBeVisible()`; `:36` - `hide.locator("svg.lucide-eye-off")).toBeVisible()` (M9 morto) | ✅ PASS |
| AC 4: alternar mantém o valor digitado | valor preservado | `e2e/login.spec.ts:31` - `toHaveValue(ADMIN.password)` após mostrar; `:39` - `toHaveValue(ADMIN.password)` após ocultar | ✅ PASS |
| AC 5: botão com `type="button"`, clicar não envia o formulário | nenhum envio ao clicar no olho | `e2e/login.spec.ts:27` - `expect(show).toHaveAttribute("type", "button")`; `:33` - `toHaveURL("/login")` com credenciais válidas preenchidas (um envio iria para `/`) (M4 morto) | ✅ PASS |
| AC 6: login mantém `name="password"`, `id="password"`, `autoComplete="current-password"` | os 3 atributos | `autoComplete`: `e2e/login.spec.ts:21` - `toHaveAttribute("autocomplete", "current-password")` (M8 morto); `name`: `e2e/login.spec.ts:7-8` - login válido via `fillLogin` leva a `toHaveURL("/")`, o que exige `name="password"`; `id`: `e2e/login.spec.ts:19` - `getByLabel("Senha", { exact: true })` resolve pelo `htmlFor="password"` | ✅ PASS |

### P1: Confirmar senha no cadastro (PWD-02 a PWD-05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC 1: campo "Confirmar senha" com `name="confirmPassword"`, `autoComplete="new-password"`, `required`, depois de "Senha" | 4 propriedades | `e2e/signup.spec.ts:16-17` - `passwordFields.nth(0)).toHaveAttribute("name", "password")` e `nth(1)).toHaveAttribute("name", "confirmPassword")`; `:21` - `toHaveAttribute("autocomplete", "new-password")`; `:22` - `toHaveJSProperty("required", true)` (M10 morto) | ✅ PASS |
| AC 2: confirmação diferente rejeita com "As senhas não coincidem" em `confirmPassword` e não cria usuário | `{ ok: false, error: MISMATCH, fieldErrors: { confirmPassword: MISMATCH } }`, contagem inalterada | `src/actions/auth.int.test.ts:251` - `expect(await signUp({ confirmPassword: "12345679" })).toEqual({ ok: false, error: MISMATCH, fieldErrors: { confirmPassword: MISMATCH } })`; `:257` - `expect(await db.$count(user)).toBe(1)`; `src/lib/validation/signup.test.ts:74` - `toEqual([{ path: "confirmPassword", message: MISMATCH }])` (M1 morto) | ✅ PASS |
| AC 3: confirmação vazia rejeita com a mesma mensagem e não cria usuário | igual ao AC 2 | `src/actions/auth.int.test.ts:250-257` (caso `""` do `it.each`); `src/lib/validation/signup.test.ts:73-74` (caso `""`) (M1 morto) | ✅ PASS |
| AC 4: senhas idênticas e campos válidos criam o cadastro pendente | `{ ok: true }`, usuário `pending` | `src/actions/auth.int.test.ts:230` - `expect(await signUp()).toEqual({ ok: true })`; `:233` - `toMatchObject({ name: "Ana", email: "ana@x.com", status: "pending" })`; `e2e/signup.spec.ts:65` - `getByRole("status")).toContainText("Cadastro enviado")` | ✅ PASS |
| AC 5: senha < 8 mantém o erro de tamanho em `password`, sem "As senhas não coincidem" com campos idênticos | só o erro de tamanho | `src/lib/validation/signup.test.ts:88` - `toEqual([{ path: "password", message: "A senha deve ter pelo menos 8 caracteres" }])`; `src/actions/auth.int.test.ts:242,245` - `toEqual({ ok: false, error: message, fieldErrors: { password: message } })` | ✅ PASS |
| AC 6: `confirmPassword` ausente rejeita com "As senhas não coincidem" e não cria usuário | igual ao AC 2 | `src/actions/auth.int.test.ts:263` - `toEqual({ ok: false, error: MISMATCH, fieldErrors: { confirmPassword: MISMATCH } })`; `:269` - `db.$count(user)).toBe(1)`; `src/lib/validation/signup.test.ts:79` | ✅ PASS |
| AC 7: ao alterar "Senha" ou "Confirmar senha", com confirmação não vazia e diferente, mostra o aviso sem enviar | aviso visível | `e2e/signup.spec.ts:45-46` - após `confirm.fill("1234567")`, `getByText(MISMATCH)).toBeVisible()`; `:53-54` - após `password.fill("12345679")`, `toBeVisible()`; botão desabilitado em `:47` (sem envio) | ✅ PASS |
| AC 8: senhas passam a coincidir, o aviso some | aviso ausente | `e2e/signup.spec.ts:49-50` - `getByText(MISMATCH)).toHaveCount(0)` | ✅ PASS |
| AC 9: com "Confirmar senha" vazia, sem aviso | aviso ausente | `e2e/signup.spec.ts:43` - `getByText(MISMATCH)).toHaveCount(0)` (M3 morto) | ✅ PASS |
| AC 10: com o aviso visível, "Cadastrar" desabilitado | botão desabilitado | `e2e/signup.spec.ts:47` e `:55` - `expect(submit).toBeDisabled()`; `:51` - `toBeEnabled()` (M6 morto) | ✅ PASS |

**Status**: ✅ Todos os critérios cobertos; 0 gaps de precisão do spec.

---

## Edge Cases

- [x] Senhas diferentes só por um espaço no fim são rejeitadas com "As senhas não coincidem": `src/lib/validation/signup.test.ts:73-74` - caso `"12345678 "` `toEqual([{ path: "confirmPassword", message: MISMATCH }])` (M2 morto). A action usa o mesmo schema (`src/actions/auth.ts:84`).
- [x] Senha de 128 caracteres com confirmação idêntica é aceita: `src/lib/validation/signup.test.ts:84` - `signupSchema.parse({ ...valid, password, confirmPassword: password }).password).toBe(password)`.

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt e1d1344`, `.env*` copiados, `node_modules` como cópia com hardlinks (o Turbopack recusa `node_modules` simbólico). Execução de controle sem mutação: 7/7 e2e passam. Worktree removido no fim.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/validation/signup.ts:27` | `.refine` sempre verdadeiro | ✅ Killed (3 unit + 2 integração) |
| M2 | `src/lib/validation/signup.ts:27` | comparação com `trim()` dos dois lados | ✅ Killed (`signup.test.ts:73`, caso `"12345678 "`) |
| M3 | `src/app/cadastro/signup-form.tsx:27` | `mismatch` também verdadeiro com confirmação vazia | ✅ Killed (`signup.spec.ts:43`) |
| M4 | `src/components/password-input.tsx:18` | remove `type="button"` | ✅ Killed (`login.spec.ts:27`; sem essa linha, `:33` recebe `/`) |
| M5 | `src/components/password-input.tsx:11` | estado de visibilidade compartilhado entre campos | ✅ Killed (`signup.spec.ts:34`) |
| M6 | `src/app/cadastro/signup-form.tsx:92` | `disabled={pending \|\| mismatch}` → `disabled={pending}` | ✅ Killed (`signup.spec.ts:47`) |
| M7 | `src/components/password-input.tsx:12` | troca os textos de `aria-label` | ✅ Killed (`login.spec.ts`, `signup.spec.ts:31`) |
| M8 | `src/app/login/login-form.tsx:22` | `autoComplete="current-password"` → `"off"` | ✅ Killed (`login.spec.ts:21`) |
| M9 | `src/components/password-input.tsx:26` | troca `EyeOffIcon`/`EyeIcon` | ✅ Killed (`login.spec.ts:28`) |
| M10 | `src/app/cadastro/signup-form.tsx:74-75` | remove `autoComplete` e `required` de "Confirmar senha" | ✅ Killed (`signup.spec.ts:21`) |

**Sensor depth**: expandido (auth/cadastro, caminho crítico): 10 mutações manuais, mais 1 sonda (M4 sem a asserção de `type`).
**Result**: 10/10 killed - PASS ✅

**Isolamento**: `git status --porcelain` do tree real foi registrado antes do sensor. Durante a verificação outra sessão commitou o trabalho de `esqueci-senha` (HEAD foi a `8eddc6b`), o que mudou o porcelain com arquivos que este verificador não tocou. Os arquivos da feature no tree real são idênticos a `e1d1344` (`git diff e1d1344` neles é vazio). O tree real não foi alterado por este verificador.

---

## Interactive UAT Results

Não executado: verificação não interativa. Todos os critérios de UI têm evidência automatizada.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`auth.ts` só passa `confirmPassword` e filtra o payload de `createPending`; o fix só mexe em e2e) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`PasswordInput` em `src/components/`, mensagem exportada do schema e reaproveitada no cliente) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (`e2e/helpers.ts` e `admin-users.int.test.ts` só adaptam testes existentes ao novo campo/rótulo) |
| Documented guidelines followed: `.specs/STATE.md` (AD-005: e2e opcional, unit e integração obrigatórios) | ✅ |

Observação menor (não bloqueia): `e2e/login.spec.ts:32` usa `page.waitForTimeout(500)` para dar tempo a um eventual redirecionamento. A asserção de `type` em `:27` já mata M4 de forma determinística, então a espera fixa é só reforço.

---

## Gate Check

- **Gate command** (sem tasks.md; nível Build do padrão do projeto): `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`, com Node 20 e `DATABASE_URL=.../orcamento_pwd_test`, rodado no worktree em `e1d1344`. O tree compartilhado tem trabalho não commitado de outra sessão, por isso não serve para o gate
- **Result**: typecheck OK, lint OK, build OK (o `next build` do webServer do Playwright passou na execução de controle), unit 722 passed (24 arquivos), integração 479 passed (18 arquivos), 0 failed, 0 skipped. Os totais incluem testes de `esqueci-senha` commitados no intervalo
- **E2E da feature** (fora do gate por AD-005): `npx playwright test e2e/login.spec.ts e2e/signup.spec.ts` - 7 passed
- **Test count desta feature**: +6 unit, +3 integração, +5 e2e (1 em login, 4 em cadastro); nenhum teste removido; asserções existentes só ganharam `confirmPassword` idêntico. Na rodada anterior, em `78ddaa5`: unit 685 e integração 440, contra 679 e 437 antes da feature
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

Nenhum. Os 3 fix tasks da iteração 0 estão fechados (ver tabela de re-verificação).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PWD-01 | Implementing | ✅ Verified |
| PWD-02 | Implementing | ✅ Verified |
| PWD-03 | Implementing | ✅ Verified |
| PWD-04 | Implementing | ✅ Verified |
| PWD-05 | Implementing | ✅ Verified |

`spec.md` não foi alterado por este verificador; o orquestrador atualiza os status.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 17/17 critérios + 2/2 edge cases batem com o resultado do spec; 0 gaps de precisão
**Sensor**: 10 mutações, 10 mortas, 0 sobreviventes
**Gate**: 1201 passed (722 unit + 479 integração), 0 failed; e2e da feature 7/7

**What works**: rejeição de confirmação diferente, vazia, ausente e com espaço no fim, sem criar usuário; aceite de senhas idênticas (inclusive 128 caracteres); erro de tamanho isolado; aviso em tempo real que aparece, some, não aparece com confirmação vazia e desabilita "Cadastrar"; olho independente por campo, com `type="button"`, `aria-label`, ícone e valor corretos; atributos `autoComplete`, `required` e ordem dos campos fixados por teste.

**Issues found**: nenhum.

**Next steps**: atualizar PWD-01..05 para Verified no `spec.md` e commitar este relatório.
