# Login com Google Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/login-google/spec.md`
**Design**: `.specs/features/login-google/design.md`
**Status**: In Progress

Antes de escrever código de rota, Server Action ou página, ler o guia relevante em `node_modules/next/dist/docs/` (regra do AGENTS.md). Para o Better Auth, ler o código em `node_modules/better-auth/dist/` citado no design.

**Árvore suja do usuário:** `src/actions/auth.ts`, `src/lib/admin.ts` e `src/lib/login-lock.ts` têm alterações locais não commitadas que não são deste feature (inclui `console.log` com hash de senha). Nenhuma task toca esses arquivos; todo commit usa `git add` por caminho, nunca `git add -A`.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (e2e suspenso, AD-005; unit/integration obrigatórios), `vitest.config.ts` (projetos `unit` e `integration`), `package.json` scripts, `.specs/STATE.md` (AD-005, AD-013), lição L-002 (texto exato de mensagens).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / função pura (`src/lib/**`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado; mensagens com texto exato | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/**`) | unit | Entrada válida, cada recusa com a mensagem exata | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repo (`src/lib/db/repos/**`) | integration | Caminhos principais + erro + concorrência, contra banco de teste | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Config de auth (`src/lib/auth.ts`) | integration | Hooks e vínculo exercitados via `auth.$context.internalAdapter` contra banco de teste | `src/lib/*.int.test.ts` | `npm run test:int` |
| Server Action (`src/actions/**`) | integration | Caminho feliz + cada ramo de falha da spec | `src/actions/**/*.int.test.ts` | `npm run test:int` |
| UI / página / componente | none | Suspenso (AD-005); evidência por inspeção de código (`file:line`) | - | gate de build |
| Config / env / docs | none | - | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Integration tests usam um banco `*_test` privado via `DATABASE_URL` e Node 20 no PATH (memórias do projeto): `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run test:unit` |
| Full | Tasks com teste de integração | `npm run test:unit && npm run test:int` |
| Build | Fim de fase, UI e config | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Provider e hooks

```
T1 → T2 → T3
```

### Phase 2: Estado "precisa de cofre"

```
T3 → T4 → T5 → T6 → T7
```

### Phase 3: Criar cofre

```
T7 → T8 → T9 → T10 → T11
```

### Phase 4: Login na interface

```
T11 → T12 → T13 → T14 → T15
```

### Phase 5: Config e privacidade

```
T15 → T16 → T17
```

---

## Task Breakdown

### T1: Helper `isGoogleEnabled`

**What**: Função que diz se o Google está configurado (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` não vazios).
**Where**: `src/lib/google.ts`
**Depends on**: None
**Reuses**: Padrão de leitura de env de `src/lib/admin.ts`
**Requirement**: GOOGLE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Devolve `false` com qualquer das duas variáveis ausente, vazia ou só espaços; `true` com ambas preenchidas
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 4 tests pass (ambas, só id, só segredo, vazias)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add isGoogleEnabled helper`

---

### T2: Regras puras dos hooks do Google

**What**: Funções puras: `googleUserCreateDecision(user)` (recusa `emailVerified` falso; senão força `status: "pending"`) e `blockCookieStatus(status)` (status a gravar no cookie quando a sessão é recusada, `null` para `approved`).
**Where**: `src/lib/google-hooks.ts`
**Depends on**: T1
**Reuses**: `UserStatus` de `src/lib/domain/user-status.ts`
**Requirement**: GOOGLE-04, GOOGLE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `emailVerified: false` -> recusa; `true` -> `{ data: { status: "pending" } }`, mesmo se o objeto trouxer outro `status`
- [x] `blockCookieStatus` devolve `pending`, `rejected`, `revoked` e `null` para `approved`
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: 6 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add pure rules for Google user and session hooks`

---

### T3: Ligar Google, vínculo e hooks no Better Auth

**What**: Em `auth.ts`: `socialProviders.google` condicionado a `isGoogleEnabled`, `account.accountLinking { enabled: true, requireLocalEmailVerified: false }` sem `trustedProviders`, hook `user.create.before` com T2, cookie `anon_login_block` (httpOnly, lax, path `/login`, 60 s) no `session.create.before` existente, e `logger` que descarta argumentos extras (AD-013). Inclui o spike do cookie e do logger do design.
**Where**: `src/lib/auth.ts`
**Depends on**: T2
**Reuses**: `databaseHooks.session.create.before` existente; `src/test/auth.ts`, `src/test/db.ts`
**Requirement**: GOOGLE-02, GOOGLE-04, GOOGLE-05, GOOGLE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste de integração (`src/lib/auth-google.int.test.ts`) via `auth.$context.internalAdapter`: `createUser` com `emailVerified: false` devolve nulo e nada é gravado; com `true` grava `status = pending`, mesmo se o dado pedir `approved`
- [x] `createSession` de usuário `pending`, `rejected` ou `revoked` devolve nulo; de `approved` cria a sessão
- [x] Vínculo: usuário existente `approved` (e-mail local não verificado) + conta Google com `email_verified = true` vincula e mantém o `status`; com `email_verified = false` não vincula (GOOGLE-05.3)
- [x] Duas criações concorrentes do mesmo e-mail resultam em um só usuário
- [x] Spike resolvido e anotado no commit: o cookie `anon_login_block` chega à resposta do callback (testado com `auth.handler` e provedor simulado) **ou** o fallback do design é adotado e a spec é ajustada
- [x] Spike resolvido: a opção `logger` existe na 1.7.7 e não imprime e-mail nem perfil; se não existir, registrar em Risks
- [x] Sem `GOOGLE_*` no ambiente, `auth.options.socialProviders` não tem `google`
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Test count: 7+ tests pass, nenhum teste existente removido

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): enable Google sign-in with pending users and account linking`

---

### T4: `isLegacy` exige conta de senha

**What**: Refinar `legacyRepo.isLegacy`: legada = sem `user_vault` **e** com conta `credential`.
**Where**: `src/lib/db/repos/legacy.ts`
**Depends on**: T3
**Reuses**: `src/test/legacy.ts` (fixtures de conta legada)
**Requirement**: GOOGLE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem vault + com `credential` -> `true`; com vault -> `false`; sem vault + só conta `google` -> `false`; usuário inexistente -> `false`
- [x] Testes existentes de `legacy.int.test.ts` e `legacy.commit.int.test.ts` continuam passando
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Test count: 3 novos testes pass, nenhum removido

**Tests**: integration
**Gate**: full

**Commit**: `fix(vault): treat only accounts with a password credential as legacy`

---

### T5: `needsVault` e `createForSession` no repo do cofre

**What**: `vaultRepo.needsVault(userId)` (sem vault e sem `credential`) e `vaultRepo.createForSession(userId, vault, birthDateCt)`: transação que relê `needsVault`, grava `user_vault` com a data cifrada e devolve `"ok" | "exists"`.
**Where**: `src/lib/db/repos/vault.ts`
**Depends on**: T4
**Reuses**: `vaultRepo.create`, `Tx`
**Requirement**: GOOGLE-06, GOOGLE-07, GOOGLE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `needsVault`: `true` só para usuário sem vault e sem `credential`; `false` para legada, para quem tem vault e para inexistente
- [x] `createForSession` grava vault e `birth_date_ct` juntos e devolve `ok`; segunda chamada devolve `exists` e não altera a linha
- [x] Duas chamadas concorrentes gravam uma só linha
- [x] Se a gravação falha no meio, nenhuma linha de `user_vault` permanece
- [x] Conta legada nunca recebe cofre por aqui (`exists`)
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Test count: 6 novos testes pass, nenhum removido

**Tests**: integration
**Gate**: full

**Commit**: `feat(vault): add needsVault and createForSession`

---

### T6: Layout leva conta sem cofre a `/criar-cofre`

**What**: No layout `(app)`, depois do teste de conta legada e antes do de data de nascimento, `needsVault -> redirect("/criar-cofre")`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T5
**Reuses**: `vaultRepo`
**Requirement**: GOOGLE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ordem: legada -> `/proteger-dados`; precisa de cofre -> `/criar-cofre`; sem data -> `/data-nascimento` (evidência `file:line`)
- [x] Gate check passes: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(vault): send accounts without a vault to /criar-cofre`

---

### T7: `/data-nascimento` não aceita conta sem cofre

**What**: A página redireciona `needsVault` para `/criar-cofre`, evitando que a conta Google caia na tela de data sem cofre.
**Where**: `src/app/data-nascimento/page.tsx`
**Depends on**: T6
**Reuses**: Padrão de redirecionamento da própria página
**Requirement**: GOOGLE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `needsVault` redireciona antes de qualquer leitura de data (evidência `file:line`)
- [x] Gate check passes: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `fix(vault): redirect accounts without a vault from /data-nascimento`

---

### T8: Esquema de validação do payload do cofre

**What**: `createVaultPayloadSchema` (`vault` via `vaultMaterialSchema`, `birthDateCt` via `ciphertextSchema`) e o esquema do formulário `createVaultFormSchema` (senha 8-128, confirmação idêntica, data de nascimento) reaproveitando mensagens do `signup`.
**Where**: `src/lib/validation/create-vault.ts`
**Depends on**: T7
**Reuses**: `src/lib/validation/signup.ts`, `vault.ts`, `ciphertext.ts`
**Requirement**: GOOGLE-06, GOOGLE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Senha de 7 caracteres -> "A senha deve ter pelo menos 8 caracteres"; confirmação diferente -> "As senhas não coincidem"; senha de 129 caracteres -> "A senha deve ter no máximo 128 caracteres"; data inválida -> "Informe a data de nascimento" (ou a mensagem de `parseBirthDate`)
- [ ] O payload recusa campos extras de texto puro (`password`, `kek`, `dek`) e `vault` malformado
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: 7 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(vault): add validation schemas for creating a vault`

---

### T9: `createVaultAction`

**What**: Server Action que valida o payload, exige sessão aprovada e grava com `vaultRepo.createForSession`.
**Where**: `src/actions/vault.ts`
**Depends on**: T8
**Reuses**: `requireSessionForAction`, `SAVE_FAILED`, `logActionError`
**Requirement**: GOOGLE-06, GOOGLE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem sessão -> `UNAUTHORIZED` e nada gravado; payload inválido -> `invalidInput` e nada gravado
- [ ] Usuário `needsVault` com payload válido -> `{ ok: true }` e `user_vault` com `birth_date_ct`
- [ ] Usuário que já tem vault -> `{ ok: false }` sem alterar a linha (GOOGLE-06.5)
- [ ] Falha do repo -> `SAVE_FAILED` ("Não foi possível salvar. Tente novamente", texto conferido em `action-result.ts`) e nenhuma linha parcial
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: 5 novos testes em `src/actions/vault.int.test.ts` pass, nenhum removido

**Tests**: integration
**Gate**: full

**Commit**: `feat(vault): add createVaultAction for Google accounts`

---

### T10: Formulário de criação do cofre

**What**: Componente cliente: senha, confirmação e data de nascimento; cria o cofre no navegador, envia só `vault` e `birthDateCt`, mostra o `RecoveryKeyDialog`, e ao confirmar salva a DEK no dispositivo e vai para `/`.
**Where**: `src/app/criar-cofre/create-vault-form.tsx`
**Depends on**: T9
**Reuses**: `createVaultMaterial`, `RecoveryKeyDialog`, `PasswordInput`, `deviceKey`, `maskDateInput`, estrutura de `signup-form.tsx`
**Requirement**: GOOGLE-06, GOOGLE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Valida com `createVaultFormSchema` antes de derivar chaves; erro bloqueia o envio (evidência `file:line`)
- [ ] O `authSecret` devolvido por `createVaultMaterial` não é enviado (evidência `file:line`)
- [ ] Falha da action mantém o usuário no formulário com o erro; a chave de recuperação só aparece após `ok`
- [ ] Gate check passes: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(vault): add the create-vault form`

---

### T11: Página `/criar-cofre`

**What**: Página protegida, fora do grupo `(app)`, que renderiza o formulário só quando `needsVault`; senão redireciona para `/`.
**Where**: `src/app/criar-cofre/page.tsx`
**Depends on**: T10
**Reuses**: `src/app/proteger-dados/page.tsx` (estrutura e cartão)
**Requirement**: GOOGLE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `requireSessionForPage` primeiro; `!needsVault` -> `redirect("/")` (evidência `file:line`)
- [ ] A rota é protegida pelo proxy sem entrar em `PUBLIC_PATHS` (evidência `file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(vault): add the /criar-cofre page`

---

### T12: Mensagem de retorno do login

**What**: `loginNotice({ blockStatus, error })` pura: status do cookie -> `LOGIN_BLOCK_MESSAGE`; `error` presente sem status -> "Não foi possível entrar com o Google"; nenhum -> `null`.
**Where**: `src/lib/login-notice.ts`
**Depends on**: T11
**Reuses**: `LOGIN_BLOCK_MESSAGE`
**Requirement**: GOOGLE-04, GOOGLE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `pending` -> "Sua conta está aguardando aprovação do administrador"; `rejected` -> "Seu cadastro não foi aprovado"; `revoked` -> "Seu acesso foi revogado"
- [ ] `error` sem status -> "Não foi possível entrar com o Google"; sem ambos -> `null`
- [ ] Valor de cookie desconhecido (ex.: `approved`, texto livre) é ignorado e cai no ramo de `error`
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: 6 tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): add login notice for Google sign-in outcomes`

---

### T13: `signInGoogleAction`

**What**: Server Action que inicia o OAuth com `auth.api.signInSocial` (`callbackURL: "/"`, `errorCallbackURL: "/login"`) e faz `redirect(url)`; sem Google configurado devolve erro.
**Where**: `src/actions/auth-google.ts`
**Depends on**: T12
**Reuses**: `auth`, `isGoogleEnabled`, `headers()`
**Requirement**: GOOGLE-01, GOOGLE-02, GOOGLE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `GOOGLE_*` definidos, a action lança o redirect para `https://accounts.google.com/...` com `client_id`, `state` e `redirect_uri` terminando em `/api/auth/callback/google`
- [ ] Sem `GOOGLE_*`, devolve `{ ok: false }` e não redireciona
- [ ] A action não toca `login_attempt` (GOOGLE-09: sem lock por Google)
- [ ] Este arquivo é novo: `src/actions/auth.ts` não é modificado
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: 3 tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(auth): add signInGoogleAction`

---

### T14: Botão "Continuar com Google"

**What**: Componente cliente que chama `signInGoogleAction` num `<form action>` com estado pendente.
**Where**: `src/app/login/google-button.tsx`
**Depends on**: T13
**Reuses**: `Button`, `useHydrated`, estilo do `login-form.tsx`
**Requirement**: GOOGLE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Texto exato "Continuar com Google"; desabilitado enquanto pendente; erro da action visível (evidência `file:line`)
- [ ] A navegação sai por Server Action, não por `<form action>` externo (CSP `form-action 'self'`)
- [ ] Gate check passes: `npm run typecheck && npm run lint`

**Tests**: none
**Gate**: build

**Commit**: `feat(auth): add the Google sign-in button`

---

### T15: `/login` mostra o botão e o aviso

**What**: A página lê `isGoogleEnabled()`, o cookie `anon_login_block` e `?error=`, usa `loginNotice` e renderiza botão e aviso sem alterar o formulário de senha.
**Where**: `src/app/login/page.tsx`
**Depends on**: T14
**Reuses**: `loginNotice`, `GoogleButton`, `cookies()`/`searchParams` do Next 16 (ler `node_modules/next/dist/docs/`)
**Requirement**: GOOGLE-01, GOOGLE-04, GOOGLE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão só renderiza com Google configurado (evidência `file:line`)
- [ ] O aviso aparece com `role="alert"` quando `loginNotice` não é nulo
- [ ] A página continua pública (`/login` em `PUBLIC_PATHS`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(auth): show the Google button and sign-in notice on /login`

---

### T16: Variáveis de ambiente no exemplo

**What**: Documentar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e o redirect URI em `.env.example`.
**Where**: `.env.example`
**Depends on**: T15
**Reuses**: Formato dos comentários existentes
**Requirement**: GOOGLE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] As duas variáveis aparecem vazias, com comentário citando `${BETTER_AUTH_URL}/api/auth/callback/google` e que vazias desligam o botão
- [ ] Gate check passes: `npm run typecheck`

**Tests**: none
**Gate**: build

**Commit**: `docs(auth): document the Google OAuth environment variables`

---

### T17: Texto de privacidade menciona o Google

**What**: Na página de privacidade, acrescentar que o login com Google compartilha apenas a autenticação (o Google sabe que o e-mail usa o app) e que nenhum dado financeiro vai ao Google, e que a conta Google exige senha de cofre própria.
**Where**: `src/components/privacy/privacy-content.tsx`
**Depends on**: T16
**Reuses**: Listas `PROCESSED` e cartões existentes
**Requirement**: GOOGLE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O texto não contradiz AD-011 nem AD-013 e não promete o que o Google não faz (evidência `file:line`)
- [ ] `brand-guard.test.ts` e demais testes unitários continuam passando
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `docs(privacy): explain what Google sign-in shares`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10 -----→ T11
Phase 4:  T12 -----→ T13 -----→ T14 -----→ T15
Phase 5:  T16 -----→ T17
```

Batches (≈7 tasks, fases inteiras): **B1** = Fases 1+2 (7 tasks), **B2** = Fases 3+4 (8 tasks, T8 a T15), **B3** = Fase 5 (2 tasks; absorvida por B2 ou executada inline). Fase 1 tem o spike do Better Auth: roda em modelo de maior raciocínio.

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| GOOGLE-01 | T1, T13, T14, T15, T16 |
| GOOGLE-02 | T3, T13 |
| GOOGLE-03 | coberto pelo `UnlockScreen` existente; sem task nova (verificado no Verifier por `file:line`) |
| GOOGLE-04 | T2, T3, T12, T15 |
| GOOGLE-05 | T2, T3, T12, T15 |
| GOOGLE-06 | T4, T5, T6, T7, T8, T9, T10, T11 |
| GOOGLE-07 | T5, T8, T9, T10, T17 |
| GOOGLE-08 | `UnlockScreen` existente + T3 (vínculo); sem task nova |
| GOOGLE-09 | T3, T5, T13 |

**Coverage:** 9 total, 9 mapped to tasks.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1-T2 | 1 função cada | ✅ Granular |
| T3 | 1 arquivo de config (hooks + provider + vínculo + logger) | ⚠️ Coeso, um só ponto de configuração |
| T4-T5 | 1 função / 2 funções do mesmo repo | ✅ Granular |
| T6-T7 | 1 redirecionamento por arquivo | ✅ Granular |
| T8 | 2 esquemas do mesmo arquivo | ✅ Granular |
| T9 | 1 action | ✅ Granular |
| T10-T11 | 1 componente / 1 página | ✅ Granular |
| T12-T15 | 1 função / 1 action / 1 componente / 1 página | ✅ Granular |
| T16-T17 | 1 arquivo cada | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | cadeia entre fases | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | cadeia entre fases | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T11 | cadeia entre fases | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T15 | cadeia entre fases | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: isGoogleEnabled | Domain / função pura | unit | unit | ✅ OK |
| T2: regras dos hooks | Domain / função pura | unit | unit | ✅ OK |
| T3: auth.ts | Config de auth | integration | integration | ✅ OK |
| T4: isLegacy | Repo | integration | integration | ✅ OK |
| T5: vaultRepo | Repo | integration | integration | ✅ OK |
| T6: layout | UI / página | none | none | ✅ OK |
| T7: data-nascimento | UI / página | none | none | ✅ OK |
| T8: esquemas | Validação | unit | unit | ✅ OK |
| T9: createVaultAction | Server Action | integration | integration | ✅ OK |
| T10: formulário | UI / componente | none | none | ✅ OK |
| T11: página | UI / página | none | none | ✅ OK |
| T12: loginNotice | Domain / função pura | unit | unit | ✅ OK |
| T13: signInGoogleAction | Server Action | integration | integration | ✅ OK |
| T14: botão | UI / componente | none | none | ✅ OK |
| T15: login page | UI / página | none | none | ✅ OK |
| T16: .env.example | Config / env | none | none | ✅ OK |
| T17: privacidade | UI / texto | none | none | ✅ OK |
