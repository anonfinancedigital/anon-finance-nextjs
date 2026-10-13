# Cadastro Aberto sem Aprovação Manual Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/cadastro-aberto/spec.md`
**Design**: `.specs/features/cadastro-aberto/design.md`
**Status**: Draft

Antes de escrever Server Action ou página, ler o guia relevante em `node_modules/next/dist/docs/` (regra do AGENTS.md). Todo commit usa `git add` por caminho, nunca `git add -A` (há arquivos não rastreados do usuário em `docs/`).

**Fase 1 muda um tipo compartilhado (`UserAction`):** entre T1 e T4 o typecheck dos dependentes pode ficar vermelho; o gate de build ao fim da Fase 1 fecha isso. Cada task atualiza os testes que a própria mudança quebra.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (e2e suspenso, AD-005; unit/integration obrigatórios), `vitest.config.ts` (projetos `unit` e `integration`), `package.json` scripts, `.specs/STATE.md` (AD-005, AD-013, AD-015), lição L-002 (texto exato de mensagens).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / função pura (`src/lib/**`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado; mensagens com texto exato | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Repo (`src/lib/db/repos/**`) | integration | Caminhos principais + erro + atomicidade, contra banco de teste | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Config de auth (`src/lib/auth.ts`) | integration | Callback do Google exercitado como em `auth-google.int.test.ts` | `src/lib/*.int.test.ts` | `npm run test:int` |
| Server Action (`src/actions/**`) | integration | Caminho feliz + cada ramo de falha da spec | `src/actions/**/*.int.test.ts` | `npm run test:int` |
| Schema / migração | none | - (gate de build) | - | gate de build |
| UI / página / componente | none | Suspenso (AD-005); evidência por inspeção de código (`file:line`) | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Integration tests usam um banco `*_test` privado via `DATABASE_URL` e Node 20 no PATH (memórias do projeto): `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run test:unit` |
| Full | Tasks com teste de integração | `npm run test:unit && npm run test:int` |
| Build | Fim de fase, UI e config | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |

---

## Execution Plan

### Phase 1: Admin só revoga, reativa e exclui

```
T1 → T2 → T3 → T4
```

### Phase 2: Cadastro aprovado com limite por IP

```
T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Google sem aprovação

```
T12 → T13 → T14 → T15
```

---

## Task Breakdown

### T1: Máquina de estados do admin

**What**: `UserAction` vira `reactivate | revoke`; `reactivate` leva `revoked` a `approved`, `revoke` leva `approved` a `revoked`; `availableActions` e a mensagem do `pending` mudam.
**Where**: `src/lib/domain/user-status.ts`
**Depends on**: None
**Reuses**: Estrutura atual de `TRANSITIONS`
**Requirement**: OPEN-03, OPEN-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `fromStatuses("reactivate")` = `["revoked"]`, alvo `approved`; `revoke` inalterado; `reject` e `approve` deixam de existir
- [x] `availableActions`: `approved` → revoke, delete; `revoked` → reactivate, delete; `pending` e `rejected` → só delete
- [x] `LOGIN_BLOCK_MESSAGE.pending` = "Sua conta não está liberada. Fale com o administrador"; `rejected` e `revoked` iguais aos atuais
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: `user-status.test.ts` reescrito 1:1 com os ACs (nenhum teste apagado sem substituto)

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(admin): reduce user actions to revoke and reactivate`

---

### T2: Reativar no repo de usuários

**What**: `transition` aceita `reactivate` e devolve `ok` sem alterar quando o usuário já está `approved`; `wrong_state` para `pending` e `rejected`.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T1
**Reuses**: `transition` atual (linha de re-leitura)
**Requirement**: OPEN-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Reativar `revoked` → `approved` e grava `decided_at`
- [x] Reativar `approved` → `ok`, status e `decided_at` intactos
- [x] Reativar `pending` ou `rejected` → `wrong_state`; usuário inexistente ou o admin → `not_found`
- [x] Revogar apaga as sessões na mesma transação; reativar não apaga
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Test count: `users.int.test.ts` atualizado (casos de aprovar/rejeitar trocados pelos de reativar)

**Tests**: integration
**Gate**: full

**Commit**: `refactor(admin): reactivate revoked users in the users repo`

---

### T3: Server Actions do admin

**What**: Troca `approveUser`/`rejectUser` por `reactivateUser`; erro de origem inválida "Este usuário não está revogado".
**Where**: `src/actions/admin-users.ts`
**Depends on**: T2
**Reuses**: `decide` e `requireAdminForAction` atuais
**Requirement**: OPEN-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `reactivateUser` por não administrador ou sem sessão → `UNAUTHORIZED` sem alterar dados
- [x] `reactivateUser` em `pending`/`rejected` → "Este usuário não está revogado" sem alterar
- [x] `approveUser` e `rejectUser` não são mais exportados
- [x] `revokeUser` e `deleteUser` mantêm o comportamento (AC 6 do admin), inclusive "Não é possível revogar ou excluir o administrador"
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Test count: `admin-users.int.test.ts` atualizado, sem testes de revogar/excluir removidos

**Tests**: integration
**Gate**: full

**Commit**: `refactor(admin): replace approve and reject actions with reactivate`

---

### T4: Lista do admin

**What**: A lista mostra Revogar/Reativar/Excluir conforme o status; `pending` e `rejected` só mostram Excluir.
**Where**: `src/components/user-admin-list.tsx`
**Depends on**: T3
**Reuses**: `availableActions`, `ACTION_LABEL`, `RUN` atuais
**Requirement**: OPEN-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `ACTION_LABEL.reactivate` = "Reativar"; `RUN` sem `approve`/`reject`, com `reactivate: reactivateUser`
- [x] Evidência por inspeção de código (`file:line`) das ações por status (AC 1 do admin)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` (fecha o tipo compartilhado da Fase 1)

**Tests**: none
**Gate**: build

**Commit**: `refactor(admin): show revoke, reactivate and delete in the user list`

---

### T5: Cálculo do limite de cadastro

**What**: Função pura que diz quantos minutos faltam para um IP poder cadastrar de novo.
**Where**: `src/lib/domain/signup-limit.ts`
**Depends on**: T4
**Reuses**: Padrão de `lockedMinutes` em `src/lib/login-lock.ts`
**Requirement**: OPEN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `SIGNUP_MAX = 5`, `SIGNUP_WINDOW_MS = 3_600_000`
- [x] `signupLockMinutes(times, now)`: com menos de 5 instantes → 0
- [x] Com 5 → `ceil((times[len-5] + janela - now) / 60_000)`; com mais de 5 (corrida) usa o mais antigo dos 5 mais recentes
- [x] Limites exatos: instante saindo da janela no ms exato libera; 1 ms antes ainda bloqueia
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: no mínimo 6 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(signup): add the signup rate limit calculation`

---

### T6: IP do cliente e hash

**What**: Extrai o IP dos cabeçalhos e o transforma em HMAC-SHA-256 em hex.
**Where**: `src/lib/client-ip.ts`
**Depends on**: T5
**Reuses**: `BETTER_AUTH_SECRET` como chave (`.env.test` já define)
**Requirement**: OPEN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `clientIp`: primeiro item de `x-forwarded-for` aparado; sem ele, `x-real-ip`; vazio ou ausente → `null`
- [x] `hashIp`: mesmo IP e segredo → mesmo hash de 64 hex; IPs diferentes → hashes diferentes; o IP em claro não aparece no resultado
- [x] Sem `BETTER_AUTH_SECRET` definido, `hashIp` lança erro (nunca grava hash sem chave)
- [x] Gate check passes: `npm run test:unit`
- [x] Test count: no mínimo 7 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(signup): add client IP extraction and keyed hashing`

---

### T7: Tabela `signup_attempt`

**What**: Tabela de cadastros por IP com índice (hash, instante) e a migração 0016.
**Where**: `src/lib/db/schema.ts`
**Depends on**: T6
**Reuses**: `loginAttempt` e `drizzle-kit generate`
**Requirement**: OPEN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `signup_attempt(id serial PK, ip_hash text not null, attempted_at timestamptz default now)` com índice em (`ip_hash`, `attempted_at`)
- [x] Migração `0016` gerada pelo drizzle-kit, sem alteração em `user.status`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(signup): add the signup_attempt table`

---

### T8: Repo de cadastros por IP

**What**: Lê os cadastros recentes de um IP.
**Where**: `src/lib/db/repos/signup-attempts.ts`
**Depends on**: T7
**Reuses**: `loginAttemptsRepo.countRecentFailures`
**Requirement**: OPEN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `recentSince(ipHash, since)` devolve os instantes `>= since` desse hash, em ordem crescente
- [ ] Linhas de outro hash não entram; linhas anteriores a `since` não entram
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: no mínimo 3 testes de integração

**Tests**: integration
**Gate**: full

**Commit**: `feat(signup): add the signup attempts repo`

---

### T9: Criar usuário aprovado com registro de IP

**What**: `createSealed` cria o usuário `approved` e, com `ipHash`, grava o IP e apaga registros com mais de 60 minutos, tudo na mesma transação.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T8
**Reuses**: Corpo de `createPendingSealed`
**Requirement**: OPEN-01, OPEN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cria `user` com `status = approved`, conta `credential` e cofre; sem sessão
- [ ] Com `ipHash`: uma linha em `signup_attempt`; sem `ipHash` (`null`): nenhuma
- [ ] E-mail duplicado (qualquer caixa) → `duplicate` e nenhuma linha de IP gravada
- [ ] Falha ao gravar o IP desfaz o usuário (tudo ou nada)
- [ ] Registro novo apaga os de mais de 60 minutos e preserva os recentes
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: `users.sealed.int.test.ts` ganha os casos; os de `createPendingSealed` seguem até T11

**Tests**: integration
**Gate**: full

**Commit**: `feat(signup): create approved users and record the IP atomically`

---

### T10: Ação de cadastro com limite

**What**: `signUpSealedAction` aplica o limite por IP antes de criar e usa `createSealed`.
**Where**: `src/actions/auth.ts`
**Depends on**: T9
**Reuses**: `signInAction` (texto singular/plural), `signupSealedSchema`
**Requirement**: OPEN-01, OPEN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 5 cadastros válidos do mesmo IP criam usuário `approved`; o 6º devolve "Muitos cadastros a partir deste endereço. Tente novamente em {n} minutos" ("minuto" quando n = 1) sem criar usuário
- [ ] Validação reprovada e e-mail duplicado não contam no limite (próximo cadastro válido passa)
- [ ] Sem IP nos cabeçalhos: cria sem limite
- [ ] Falha de banco ao conferir ou gravar → "Não foi possível salvar. Tente novamente" e nenhum usuário
- [ ] Usuário recém-criado entra no login com e-mail e senha (sessão e redirecionamento a `/`)
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: testes de ação de cadastro atualizados, nenhum removido sem substituto

**Tests**: integration
**Gate**: full

**Commit**: `feat(signup): create approved accounts with a per-IP limit`

---

### T11: Remover `createPendingSealed`

**What**: Apaga a função antiga e seus testes, já substituídos por `createSealed`.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T10
**Reuses**: -
**Requirement**: OPEN-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhuma referência a `createPendingSealed` em `src/` (`grep` vazio)
- [ ] Os casos dos testes antigos estão cobertos pelos de T9 (cada teste removido tem substituto nomeado no commit)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: build

**Commit**: `refactor(signup): remove createPendingSealed`

---

### T12: Mensagem final do cadastro

**What**: Troca a mensagem de envio por "Cadastro concluído. Você já pode entrar" com link "Ir para o login".
**Where**: `src/app/cadastro/signup-form.tsx`
**Depends on**: T11
**Reuses**: `Link` de `next/link` já importado
**Requirement**: OPEN-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SENT_MESSAGE` = "Cadastro concluído. Você já pode entrar"; link "Ir para o login" para `/login`
- [ ] `rg -i aprova src/app/cadastro src/app/login` sem ocorrências (AC 4); evidência por inspeção de código (`file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build

**Commit**: `feat(signup): tell new users they can sign in right away`

---

### T13: Google cria usuário aprovado

**What**: `googleUserCreateDecision` devolve `approved` para e-mail verificado.
**Where**: `src/lib/google-hooks.ts`
**Depends on**: T12
**Reuses**: Regra atual do hook
**Requirement**: OPEN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `emailVerified: false` → recusa; `true` → `{ data: { status: "approved" } }`, mesmo se o objeto trouxer outro `status`
- [ ] Callback com e-mail novo: usuário `approved`, conta Google vinculada, sessão criada, destino do usuário sem cofre é `/criar-cofre` (via `needsVault`)
- [ ] `ADMIN_EMAIL` pelo Google também nasce `approved`; callbacks simultâneos criam um usuário
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Test count: `google-hooks.test.ts` e `auth-google.int.test.ts` atualizados, nenhum removido sem substituto

**Tests**: unit
**Gate**: full

**Commit**: `feat(auth): create Google users as approved`

---

### T14: Aviso de e-mail com senha em `/login`

**What**: `loginNotice` mostra a mensagem do vínculo recusado para `?error=account_not_linked`.
**Where**: `src/lib/login-notice.ts`
**Depends on**: T13
**Reuses**: `loginNotice` atual
**Requirement**: OPEN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `error: "account_not_linked"` → "Este e-mail já tem cadastro com senha. Entre com e-mail e senha"
- [ ] Qualquer outro `error` → "Não foi possível entrar com o Google"; cookie de bloqueio continua com prioridade (mensagem do status)
- [ ] Gate check passes: `npm run test:unit`
- [ ] Test count: no mínimo 4 testes

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): explain a refused Google link on the login page`

---

### T15: Google nunca vincula conta com senha

**What**: `accountLinking.enabled = false`: o Google recusa o vínculo com usuário que tem login por senha.
**Where**: `src/lib/auth.ts`
**Depends on**: T14
**Reuses**: Testes de callback de `auth-google.int.test.ts`
**Requirement**: OPEN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] E-mail verificado do Google que já tem conta com senha → nenhuma conta Google criada, nenhuma sessão, redirecionamento a `/login?error=account_not_linked`
- [ ] Usuário que já tem o Google vinculado e é `approved` entra de novo e recebe sessão, mesmo com outro e-mail no Google
- [ ] Usuário Google `pending`, `rejected` ou `revoked` → sem sessão e a mensagem do status em `/login`
- [ ] O teste antigo de vínculo automático com e-mail local não verificado é reescrito para o novo comportamento
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: `auth-google.int.test.ts` sem testes removidos sem substituto

**Tests**: integration
**Gate**: build

**Commit**: `feat(auth): refuse linking Google to accounts that have a password`

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1 | None | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |

## Test Co-location Validation

| Task | Camada | Exigido pela matriz | `Tests` da task | Status |
| ---- | ------ | ------------------- | --------------- | ------ |
| T1 | Domain | unit | unit | ✅ |
| T2 | Repo | integration | integration | ✅ |
| T3 | Server Action | integration | integration | ✅ |
| T4 | UI | none | none | ✅ |
| T5 | Domain | unit | unit | ✅ |
| T6 | Domain | unit | unit | ✅ |
| T7 | Schema | none | none | ✅ |
| T8 | Repo | integration | integration | ✅ |
| T9 | Repo | integration | integration | ✅ |
| T10 | Server Action | integration | integration | ✅ |
| T11 | Repo | integration | integration | ✅ |
| T12 | UI | none | none | ✅ |
| T13 | Domain + config de auth | unit + integration | unit (gate full roda os de integração) | ✅ |
| T14 | Domain | unit | unit | ✅ |
| T15 | Config de auth | integration | integration | ✅ |

## Requirement Traceability

| Requirement ID | Tasks |
| -------------- | ----- |
| OPEN-01 | T9, T10, T11, T12 |
| OPEN-02 | T5, T6, T7, T8, T9, T10 |
| OPEN-03 | T1, T2, T3, T4 |
| OPEN-04 | T1 |
| OPEN-05 | T13, T14, T15 |
