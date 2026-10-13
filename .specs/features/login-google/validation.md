# Login com Google Validation

**Date**: 2026-10-13
**Spec**: `.specs/features/login-google/spec.md` (AC "Criar o cofre" 5 e último edge case ajustados em `71d48b6`)
**Diff range**: `0b2425c..HEAD` (22 commits, `3265bb9` T1 .. `2364e05` T21)
**Verifier**: independent sub-agent (author ≠ verifier), iteração 3 de 3

## Validation: login-google - PASS ✅

Os 20 ACs e os 6 edge cases têm evidência. O gate passa. O sensor matou as 5 mutações, entre elas M10 e M11, que sobreviveram na iteração 2.

---

## Iteração 2 → 3

| Gap (iter. 2) | Resolução | Evidência | Status |
| ------------- | --------- | --------- | ------ |
| 1. Destinos OAuth da action não exercitados (M10, M11 sobreviviam) | T21 (`2364e05`), mudou só `src/actions/auth-google.int.test.ts` e `tasks.md` (`git diff 65dc037..HEAD -- src/lib src/app src/actions/auth-google.ts` = 0 linhas) | `src/actions/auth-google.int.test.ts:125` `expect(target.pathname).toBe("/login")`, `:126` `searchParams.get("error") toBeTruthy()`, `:127` `$count(session) toBe(0)`; `:135` `expect(target.pathname).toBe("/")`, `:136` `error toBeNull()`, `:137` `$count(session) toBe(1)`. M10 morre em `:125` ("expected '/' to be '/login'"); M11 morre em `:135` ("expected '/login' to be '/'") | ✅ |

**O spy não mascara a action.** `src/actions/auth-google.int.test.ts:104` guarda a referência original de `auth.api.signInSocial`. `:106-112` instala um `mockImplementationOnce` que chama essa original com `{ ...input, returnHeaders: true }`, ou seja, o `input` que a action montou (`src/actions/auth-google.ts:22-25`: `body: { provider: "google", callbackURL: "/", errorCallbackURL: "/login" }`) segue sem alteração. O spy só acrescenta `returnHeaders` para capturar os `Set-Cookie` (`:110`) e devolve o mesmo `response`. O teste não declara `callbackURL` nem `errorCallbackURL` em lugar nenhum. O fluxo começa por `signInGoogleAction()` (`:114` → `redirectUrl` `:46`). O `state` sai do redirect real da action, e o callback real roda por `auth.handler` (`:116-118`). Os destinos vêm do estado que o Better Auth persistiu a partir do corpo da action (`node_modules/better-auth/dist/api/routes/callback.mjs:77-79`: `parseState` → `errorURL`). O sensor confirma isso: as duas mutações no arquivo de produção derrubam o teste.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T17 | ✅ Done | commits `3265bb9`..`dc365f4` |
| T18-T20 | ✅ Done | commits `23edbc9`, `7b14d7c`, `65dc037` |
| T21 | ✅ Done | `tasks.md:720-723` todos `[x]`; commit `2364e05` |

---

## Spec-Anchored Acceptance Criteria

**Regra de composição dos destinos (vale para os ACs marcados "dest.")**: todos os caminhos de erro do callback redirecionam para o `errorURL` lido do estado (`callback.mjs:77-79`). (a) A action persiste `errorCallbackURL: "/login"` e `callbackURL: "/"`, e o callback os usa: `src/actions/auth-google.int.test.ts:125,135` (M10 e M11 mortos). (b) Cada caminho específico (não verificado, pendente, bloqueado, falha na troca) cai no `errorURL` com `error`: `src/lib/auth-google.int.test.ts` (M4-M7 mortos na iteração 2). Juntas, (a) e (b) fecham a conjunção que estava ⚠️ na iteração 2.

### P1: Entrar com Google numa conta aprovada

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| 1. botão só com `GOOGLE_*` | botão condicionado | `src/lib/google.test.ts:9-31` `expect(isGoogleEnabled()).toBe(true/false)`; `src/lib/auth-google.int.test.ts:289` provider ausente; `src/actions/auth-google.int.test.ts:68-69` `toMatchObject({ ok: false })`, `redirect not.toHaveBeenCalled()`; UI `src/app/login/page.tsx:41` | ✅ |
| 2. approved + verificado -> sessão, `/` | sessão, Location `/` | `src/actions/auth-google.int.test.ts:135` `pathname toBe("/")`, `:136` sem `error`, `:137` `$count(session) toBe(1)` (pela action); `src/lib/auth-google.int.test.ts:179-189` | ✅ |
| 3. vault existente -> desbloqueio | `UnlockScreen` | Inspeção: `src/components/vault-provider.tsx:37-41,94-96,114`; `src/app/(app)/layout.tsx:36` | ✅ (inspeção, AD-005) |
| 4. `email_verified=false` -> sem user/sessão, `/login` + mensagem | `/login?error`, 0 user, 0 sessão | `src/lib/auth-google.int.test.ts:168-177` pathname `/login`, `error` truthy (`:173`), `$count(user) toBe(0)`, `$count(session) toBe(0)`; mensagem `src/lib/login-notice.test.ts:17-21`; dest. `src/actions/auth-google.int.test.ts:125`; M12 morto | ✅ |
| 5. cancelamento / falha OAuth -> `/login` + mensagem, sem sessão | `/login?error`, 0 sessão | `src/actions/auth-google.int.test.ts:123-127` (`error=access_denied` com o `state` da action): `/login`, `error` truthy, 0 sessão; `src/lib/auth-google.int.test.ts:235-259` (cancelamento e troca rejeitada) | ✅ |

### P1: Primeiro login com Google respeita a aprovação

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| 1. e-mail novo -> `pending`, vínculo, sem sessão | `pending`, 1 google, 0 sessão | `src/lib/auth-google.int.test.ts:144-157` | ✅ |
| 2. pendente criado -> `/login` com aviso de aprovação | `/login?error` + cookie | `src/lib/auth-google.int.test.ts:151-156` pathname `/login`, `error` truthy (`:153`), cookie `anon_login_block=pending; Max-Age=60; Path=/login; HttpOnly; SameSite=Lax`; `src/lib/login-notice.test.ts:6`; dest. `src/actions/auth-google.int.test.ts:125` | ✅ |
| 3. e-mail existente -> vincula, mantém status | status inalterado, 1 google | `src/lib/auth-google.int.test.ts:179-189`, `:201-217` `row.status toBe(status)`, `googleAccountsOf toBe(1)` | ✅ |
| 4. pending/rejected/revoked -> sem sessão, `/login` + mensagem | 0 sessão, `/login?error`, cookie do status | `src/lib/auth-google.int.test.ts:201-217` `sessionsOf toBe(0)`, `/login`, `error` truthy (`:214`), cookie `^anon_login_block=${status};`; `src/lib/login-notice.test.ts:5-11`; dest. `src/actions/auth-google.int.test.ts:125` | ✅ |
| 5. criação Google nunca != `pending` | `pending` | `src/lib/auth-google.int.test.ts:45-55`; `src/lib/google-hooks.test.ts:15-22` | ✅ |
| 6. `ADMIN_EMAIL` -> `pending` | `pending` | `src/lib/auth-google.int.test.ts:159-166` | ✅ |

### P1: Criar o cofre de uma conta Google

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| 1. sem vault e sem credential -> `/criar-cofre` | redirect | `src/lib/db/repos/vault.int.test.ts:340-354` `needsVault` true/false; `src/app/(app)/layout.tsx:21`; M13 morto | ✅ |
| 2. só valores embrulhados/selados | payload estrito | `src/app/criar-cofre/create-vault-form.tsx:59,66-69`; `src/lib/validation/create-vault.test.ts:52-58` | ✅ |
| 3. chave mostrada, confirmação, `/` | dialog -> `/` | Inspeção `src/app/criar-cofre/create-vault-form.tsx:71,80-81,151` | ✅ (inspeção, AD-005) |
| 4. senha < 8 -> mensagem, nada enviado | texto exato | `src/lib/validation/create-vault.test.ts:28-32`; `src/app/criar-cofre/create-vault-form.tsx:42-49` | ✅ |
| 5. vault existente -> "Esta conta já tem um cofre", linha inalterada; página redireciona `/` | texto exato, linha igual | `src/actions/vault.int.test.ts:207` `toEqual({ ok: false, error: "Esta conta já tem um cofre" })`, `:209` `expect(row).toEqual(before)`; `src/lib/db/repos/vault.int.test.ts:383-384`; página `src/app/criar-cofre/page.tsx:17` (inspeção); M14 morto | ✅ |
| 6. nada em claro no servidor | payload estrito | `src/lib/validation/create-vault.test.ts:56-58`; `src/actions/vault.int.test.ts:182` | ✅ |
| 7. falha -> mensagem, nada parcial | texto exato, 0 linhas | `src/actions/vault.int.test.ts:220-226`; `src/lib/db/repos/vault.int.test.ts:407-409` | ✅ |

### P2: Vincular o Google a uma conta com senha

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| 1. vault de senha -> pede a senha, sem segundo cofre | `UnlockScreen`, nunca `/criar-cofre` | `src/lib/db/repos/vault.int.test.ts:347-350,412-417`; `src/lib/auth-google.int.test.ts:179-189`; inspeção `src/components/vault-provider.tsx:94-96` | ✅ |
| 2. senha errada -> "Senha incorreta" | texto exato | inspeção `src/components/unlock-screen.tsx:12,46-48` (pré-existente) | ✅ (inspeção) |

**Status**: ✅ 20/20 ACs (4 por inspeção de UI, AD-005); 0 sem evidência; 0 spec-precision gaps.

---

## Edge Cases

Sem mudança desde a iteração 2. T21 não tocou código de produção, e as evidências seguem nas mesmas linhas.

- [x] **Recuperação, conta só-Google** (rewrap e wipe): `src/lib/db/repos/password-resets.sealed.int.test.ts:397-443`; `src/actions/password-reset.int.test.ts:644-711`.
- [x] **Callbacks concorrentes do mesmo e-mail** -> 1 usuário: `src/lib/auth-google.int.test.ts:261-270`.
- [x] **E-mail do Google muda após o vínculo**: `src/lib/auth-google.int.test.ts:219-233`.
- [x] **Não-approved repetindo Google não conta no `login-lock`**: inspeção (escritores de `login_attempt` só em `src/lib/db/repos/login-attempts.ts:26,30`, fora do caminho do callback); action `src/actions/auth-google.int.test.ts:80` `$count(loginAttempt) toBe(1)`.
- [x] **Exclusão apaga a conta Google**: FK cascade `src/lib/db/auth-schema.ts:41`; `src/lib/db/repos/users.int.test.ts:286-303`.
- [x] **Logs sem e-mail/token/perfil (AD-013)**: `src/lib/auth.ts:62-69`; `src/lib/auth-google.int.test.ts:272`; `src/actions/auth-google.ts:28`.

---

## Discrimination Sensor

**Scratch**: `git worktree add --detach <scratchpad>/wt HEAD`, com `node_modules` em symlink para o repo real e `.env.test` copiado. O runner rodou em bash, com banco privado `orcamento_google_verify_test` criado via `docker exec orcamento-pg` e removido no fim. Cada mutação foi aplicada por substituição exata (contagem 1) e revertida com `git checkout -- .` no worktree. Baseline no scratch: 86/86 em 6 arquivos (`src/actions/auth-google.int.test.ts`, `src/lib/auth-google.int.test.ts`, `src/lib/google-hooks.test.ts`, `src/lib/db/repos/vault.int.test.ts`, `src/actions/vault.int.test.ts`, `src/lib/db/repos/legacy.int.test.ts`).

| # | File:line | Description | Killed? |
| - | --------- | ----------- | ------- |
| M10 | `src/actions/auth-google.ts:23` | `errorCallbackURL: "/"` | ✅ Killed (`src/actions/auth-google.int.test.ts:125`, cancelamento) |
| M11 | `src/actions/auth-google.ts:23` | `callbackURL: "/login"` | ✅ Killed (`src/actions/auth-google.int.test.ts:135`, sucesso aprovado) |
| M12 | `src/lib/google-hooks.ts:11` | hook de criação aceita `emailVerified: false` (sempre `pending`) | ✅ Killed (3: `src/lib/google-hooks.test.ts`, `src/lib/auth-google.int.test.ts:35` e `:168`) |
| M13 | `src/lib/db/repos/vault.ts:29` | `needsVault` ignora `credential` (join com provider inexistente) | ✅ Killed (2: `src/lib/db/repos/vault.int.test.ts`, legado em `needsVault` e `createForSession`) |
| M14 | `src/lib/db/repos/vault.ts:100` | `createForSession` sem o guard `needsVaultIn` | ✅ Killed (`src/lib/db/repos/vault.int.test.ts` "never gives a vault to a legacy account") |

**Sensor depth**: P0-full (auth/segurança). 5 mutações manuais: as 2 sobreviventes da iteração 2 e 3 das de maior risco já usadas antes.
**Sensor outcome**: 5/5 killed, 0 survived.
**Isolation**: o worktree foi removido (a remoção do symlink veio antes, e o `node_modules` real ficou intacto) e não aparece em `git worktree list`. O banco `orcamento_google_verify_test` foi removido (`DROP DATABASE`). `git status --porcelain` do repo real ficou idêntico ao baseline (comparado com `diff`).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical (T21 só teste + `tasks.md`) | ✅ |
| No scope creep | ✅ |
| Matches patterns (`setupTestDb`, helpers locais, spy restaurado em `afterEach` via `vi.restoreAllMocks`, `src/actions/auth-google.int.test.ts:38`) | ✅ |
| Spec-anchored outcome check | ✅ |
| Payload/conjunction rule (destinos verificados pelo efeito, `location` + sessões, não pela chamada) | ✅ |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines: `AGENTS.md` (AD-005, nenhum e2e) | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` (Node 20.20.2, `DATABASE_URL=.../orcamento_google_test`), no tree real
- **typecheck**: exit 0
- **lint**: exit 0, 1 warning pré-existente (`TOTAL_MICRO`, `src/components/category-editor.tsx:40`)
- **unit**: 1340 passed / 0 failed (66 files)
- **integration**: 728 passed / 0 failed (35 files)
- **Skipped tests**: none
- **Test count**: unit 1340 (igual); integração 726 -> 728 (+2 de T21); nenhum teste removido

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| GOOGLE-01 | ✅ Verified | ✅ Verified |
| GOOGLE-02 | ⚠️ Needs Fix | ✅ Verified |
| GOOGLE-03 | ✅ Verified (inspeção) | ✅ Verified (inspeção) |
| GOOGLE-04 | ⚠️ Needs Fix | ✅ Verified |
| GOOGLE-05 | ⚠️ Needs Fix | ✅ Verified |
| GOOGLE-06 | ✅ Verified | ✅ Verified |
| GOOGLE-07 | ✅ Verified | ✅ Verified |
| GOOGLE-08 | ✅ Verified (inspeção) | ✅ Verified (inspeção) |
| GOOGLE-09 | ✅ Verified | ✅ Verified |

(O Verifier não editou `spec.md`.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/20 ACs ✅ (4 por inspeção de UI, AD-005); edge cases 6/6
**Sensor**: 5 injetadas, 5 killed, 0 survived
**Gate**: 2068 passed (1340 unit + 728 int), 0 failed
