# Cadastro com Aprovação do Administrador Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/cadastro-aprovacao/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (sem regra de testes; exige consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso). Sem guideline de cobertura: strong defaults aplicados, no nível de `.specs/features/subcategorias/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`, `src/lib/admin.ts`) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Cada campo: válido, cada regra de rejeição e a mensagem exata do spec | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`), schema e seed | integration | Caminhos principais, escopo por `userId`, constraints, cascade e caminhos de erro | `src/lib/db/**/*.int.test.ts` | `npm run test:int` |
| Auth config e guards (`src/lib/auth.ts`, `src/lib/auth-guard.ts`) | integration | Cada status contra sessão e guard; chamada direta do endpoint do Better Auth | `src/lib/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso + cada erro de validação, de autorização e de estado + `revalidatePath` | `src/actions/*.int.test.ts` | `npm run test:int` |
| Helpers de teste (`src/test/*`) | none | - (exercitados por todos os testes existentes no gate Full) | - | gate Full |
| UI, páginas, proxy (`src/app/*`, `src/components/*`, `src/proxy.ts`) | none | - (e2e suspenso, AD-005; visibilidade das ações testada em `user-status.test.ts`) | - | build gate only |
| Migração SQL gerada | none | - (coberta pelos testes de constraint do schema) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up` e um banco `*_test` privado via `DATABASE_URL` (ver memória test-db-isolation). Usar Node 20 (PATH com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também. Mudanças de tipo e contrato são aditivas para o `typecheck` passar ao fim de cada tarefa. Dependências que vêm de fases anteriores não aparecem como seta.

### Phase 1: Dados e regras

Regras puras, coluna `status`, helpers de teste, seed e repositório de usuários.

```
T1 → T4 → T5 → T6
T5 → T7
T3 → T7
```

T2 e T3 não dependem de nada.

### Phase 2: Enforcement e ações

Sessão, guards, login, cadastro e ações de administração, ainda sem UI.

```
T4 → T8
T7 → T8
T3 → T9
T8 → T9
T7 → T10
T8 → T10
T2 → T11
T7 → T11
T10 → T11
T7 → T12
T9 → T12
T12 → T13
```

### Phase 3: UI

Cadastro, login, administração e navegação.

```
T11 → T15 → T16 → T17
T1 → T18
T13 → T18
T7 → T19
T9 → T19
T18 → T19
T9 → T21
T20 → T21
```

T14 e T20 não dependem de nada.

### Phase 4: Correções do Verifier (iteração 1)

Gaps do `validation.md`: decisão sem atomicidade com a exclusão das sessões (AC 11 da decisão) e teste de exclusão que não discrimina (AC 17 da decisão, mutante M19).

```
T22 → T23
T22 → T24
```

---

## Task Breakdown

### T1: Domínio de status do usuário

**Status**: ✅ Complete

**What**: Tipos `UserStatus` e `UserAction`, transições válidas, `availableActions` e mensagens de bloqueio do login.
**Where**: `src/lib/domain/user-status.ts`
**Depends on**: None
**Reuses**: Módulos puros de `src/lib/domain/`; isomórfico (AD-008)
**Requirement**: SIGNUP-09, SIGNUP-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `fromStatuses`/`targetStatus` seguem as transições do spec (approve: pending, rejected, revoked → approved; reject: pending → rejected; revoke: approved → revoked)
- [x] `availableActions` devolve: approved → revoke, delete; pending → approve, reject, delete; rejected e revoked → approve, delete
- [x] `LOGIN_BLOCK_MESSAGE` tem os textos exatos: "Sua conta está aguardando aprovação do administrador", "Seu cadastro não foi aprovado", "Seu acesso foi revogado"
- [x] Teste unitário `user-status.test.ts` cobre cada status e cada ação, incluindo origem inválida
- [x] Gate check passes: quick
- [x] Test count: testes do arquivo novo passam (nenhum teste existente removido)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cadastro): add the user status domain rules`

---

### T2: Validação do cadastro

**Status**: ✅ Complete

**What**: `signupSchema` com nome 1-80 (trim), e-mail válido normalizado e senha 8-128, com as mensagens exatas.
**Where**: `src/lib/validation/signup.ts`
**Depends on**: None
**Reuses**: `src/lib/validation/goal.ts` e `invalidInput`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mensagens: "Informe seu nome", "O nome deve ter no máximo 80 caracteres", "Informe um e-mail válido", "A senha deve ter pelo menos 8 caracteres", "A senha deve ter no máximo 128 caracteres"
- [x] Limites testados nas bordas: nome de 80 e 81 caracteres, só espaços; senha de 7, 8, 128 e 129
- [x] E-mail com maiúsculas e espaços nas pontas sai normalizado
- [x] Teste unitário `signup.test.ts` passa
- [x] Gate check passes: quick
- [x] Test count: testes do arquivo novo passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cadastro): add signup validation`

---

### T3: Identidade do administrador

**Status**: ✅ Complete

**What**: `isAdminEmail(email)` comparando com `ADMIN_EMAIL` normalizado.
**Where**: `src/lib/admin.ts`
**Depends on**: None
**Reuses**: Normalização `trim().toLowerCase()` de `seed-user.ts`
**Requirement**: SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Igual ao `ADMIN_EMAIL` ignorando caixa e espaços → true
- [x] E-mail diferente → false
- [x] `ADMIN_EMAIL` ausente ou vazio → false para qualquer e-mail (edge case do spec)
- [x] Teste unitário `admin.test.ts` passa
- [x] Gate check passes: quick
- [x] Test count: testes do arquivo novo passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cadastro): add admin identity check`

---

### T4: Coluna `status` em `user` com migração

**Status**: ✅ Complete

**What**: Colunas `status` (padrão `pending`, CHECK nos 4 valores) e `decided_at` em `user`, e migração que marca os usuários existentes como `approved`.
**Where**: `src/lib/db/auth-schema.ts` (a migração em `drizzle/` é gerada por `npm run db:generate` e editada para incluir o `UPDATE`)
**Depends on**: T1
**Reuses**: Constraints de `src/lib/db/schema.int.test.ts`; tipo `UserStatus` do T1
**Requirement**: SIGNUP-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Comentário no arquivo avisa que a coluna é manual e que regenerar o schema do Better Auth a apagaria
- [x] Migração contém `ALTER TABLE ... ADD status`, `ADD decided_at` e `UPDATE "user" SET status = 'approved'` antes de qualquer inserção nova
- [x] Teste de integração em `schema.int.test.ts`: usuário inserido sem status fica `pending`; status fora dos 4 valores é rejeitado pelo banco
- [x] Gate check passes: full
- [x] Test count: contagem anterior + os novos, nenhum removido

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the status column to user`

---

### T5: Helpers de teste criam usuário com status

**Status**: ✅ Complete

**What**: `insertCredentialUser` e `createSignedInUser` aceitam `status`, com padrão `approved`.
**Where**: `src/test/auth.ts`
**Depends on**: T4
**Reuses**: Helpers atuais
**Requirement**: SIGNUP-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem o argumento, o usuário criado é `approved`
- [x] Com `status`, grava o status pedido
- [x] Todos os testes de integração existentes continuam passando sem alteração
- [x] Gate check passes: full
- [x] Test count: igual ao do T4

**Tests**: none (helper; coberto pelo gate Full inteiro)
**Gate**: full

**Commit**: `test(cadastro): let test helpers set the user status`

---

### T6: Seed do administrador grava `approved`

**Status**: ✅ Complete

**What**: `seedUser` grava `status: approved` ao criar e ao redefinir senha de conta existente em qualquer status.
**Where**: `src/lib/db/seed-user.ts`
**Depends on**: T5
**Reuses**: Teste `seed-user.int.test.ts`
**Requirement**: SIGNUP-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Seed novo cria usuário `approved`
- [x] Seed sobre usuário `pending`, `rejected` ou `revoked` com o mesmo e-mail o deixa `approved` e grava `decided_at`
- [x] Testes de integração em `seed-user.int.test.ts` cobrem os dois casos (AC 18 do cadastro)
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): seed the admin as approved`

---

### T7: Repositório de usuários

**Status**: ✅ Complete

**What**: `usersRepo` com `createPending`, `findByEmail`, `findById`, `listForAdmin`, `transition`, `revokeSessions` e `remove`.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T3, T5
**Reuses**: `seed-user.ts` (par `user` + `account` e `hashPassword`), `login-attempts.ts`
**Requirement**: SIGNUP-01, SIGNUP-05, SIGNUP-07, SIGNUP-08, SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `createPending` grava `user` `pending` e `account` com hash salgado (não a senha) na mesma transação; e-mail normalizado
- [x] Dois `createPending` simultâneos com o mesmo e-mail (com caixa diferente) resultam em exatamente um usuário e um `duplicate` (AC 8)
- [x] `createPending` com e-mail de usuário em qualquer status devolve `duplicate` sem alterar o existente (AC 7)
- [x] `listForAdmin` exclui o administrador, ordena `pending` primeiro e depois por `created_at` crescente
- [x] `transition` respeita `fromStatuses`, grava `decided_at`, devolve `wrong_state` e `not_found`; aprovar um `approved` devolve `ok` sem mudar `decided_at`
- [x] `revokeSessions` apaga só as sessões do usuário
- [x] `remove` apaga usuário, sessões, contas, categorias, `category_percent`, subcategorias, transações e objetivo dele, preserva os de outro usuário, e apaga `login_attempt` do e-mail; devolve `not_found` para id inexistente
- [x] Novo usuário aprovado vê vazios `categoriesRepo.list`, `transactionsRepo` e `goalsRepo` enquanto outro usuário tem dados (SIGNUP-07)
- [x] Teste de integração `users.int.test.ts` passa
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the users repository`

---

### T8: Configuração do Better Auth com status e hook de sessão

**Status**: ✅ Complete

**What**: `additionalFields.status` no usuário e hook `session.create.before` que recusa sessão de quem não está `approved`.
**Where**: `src/lib/auth.ts`
**Depends on**: T4, T7
**Reuses**: Configuração atual do `betterAuth`
**Requirement**: SIGNUP-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `auth.api.signInEmail` direto (sem a nossa ação) com senha correta falha para `pending`, `rejected` e `revoked` e não cria linha em `session`
- [x] O mesmo para `approved` cria a sessão
- [x] `getSession` devolve o `status` do usuário
- [x] `disableSignUp` continua `true` (teste: `auth.api.signUpEmail` falha)
- [x] Testes de integração em `src/lib/auth.int.test.ts` passam
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): block session creation for unapproved users`

---

### T9: Guards com status e variantes de administrador

**Status**: ✅ Complete

**What**: `requireSessionForPage/Action` tratam status != `approved` como sem sessão e devolvem `isAdmin`; novos `requireAdminForPage` e `requireAdminForAction`.
**Where**: `src/lib/auth-guard.ts`
**Depends on**: T3, T8
**Reuses**: `currentUserId` vira `currentUser`
**Requirement**: SIGNUP-03, SIGNUP-06, SIGNUP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sessão válida de usuário que passa a `revoked`, `rejected` ou `pending` depois do login: guard de página redireciona a `/login`; guard de ação devolve `UNAUTHORIZED` (AC 13 e AC 19)
- [x] Usuário `approved` comum: `requireSessionForPage` devolve `isAdmin: false`; administrador devolve `true`
- [x] `requireAdminForAction` devolve `UNAUTHORIZED` para não administrador e sem sessão
- [x] `requireAdminForPage` redireciona a `/` para aprovado não administrador e a `/login` sem sessão
- [x] Sem `ADMIN_EMAIL`, ninguém passa nos guards de administrador
- [x] Testes novos em `auth-guard.int.test.ts` passam; os existentes seguem iguais
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): enforce approved status and admin in the guards`

---

### T10: Login com mensagens por status

**Status**: ✅ Complete

**What**: `signInAction` revela o status só com a senha correta e não registra falha nesse caso.
**Where**: `src/actions/auth.ts`
**Depends on**: T7, T8
**Reuses**: `signInAction`, `loginAttemptsRepo`, `verifyPassword` de `better-auth/crypto`
**Requirement**: SIGNUP-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pending`, `rejected` e `revoked` com senha correta: retorna a mensagem de `LOGIN_BLOCK_MESSAGE`, não cria sessão e não grava em `login_attempt`
- [x] Os três com senha incorreta: grava falha e retorna "E-mail ou senha inválidos"
- [x] Cinco senhas erradas em conta `pending` ainda bloqueiam o e-mail por 15 minutos como hoje
- [x] `approved` e e-mail inexistente mantêm o comportamento atual
- [x] Testes novos em `auth.int.test.ts` passam; os existentes seguem iguais
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): show approval status on login`

---

### T11: Ação de cadastro

**Status**: ✅ Complete

**What**: `signUpAction` valida, cria o usuário `pending` e devolve sucesso ou erros por campo.
**Where**: `src/actions/auth.ts`
**Depends on**: T2, T7, T10
**Reuses**: `signupSchema`, `invalidInput`, `usersRepo.createPending`, `SAVE_FAILED`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Entrada válida cria usuário `pending`, não cria sessão e devolve `{ ok: true }`
- [x] Cada erro de validação devolve a mensagem exata do spec em `fieldErrors` do campo certo e não cria usuário
- [x] E-mail já existente (qualquer status, outra caixa) devolve "Este e-mail já está cadastrado" em `fieldErrors.email`, sem alterar o usuário
- [x] Falha de banco devolve "Não foi possível salvar. Tente novamente"
- [x] Testes novos em `auth.int.test.ts` passam
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the signup action`

---

### T12: Ações de aprovar e rejeitar

**Status**: ✅ Complete

**What**: `approveUser` e `rejectUser` com guard de administrador, transição, remoção de sessões na rejeição e `revalidatePath`.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T7, T9
**Reuses**: Molde de `src/actions/goals.ts`; `usersRepo.transition`, `revokeSessions`
**Requirement**: SIGNUP-05, SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Aprovar `pending`, `rejected` e `revoked` resulta em `approved` com `decided_at`
- [x] Rejeitar `pending` resulta em `rejected` e apaga as sessões do usuário (AC 13 do cadastro)
- [x] Rejeitar usuário não `pending` devolve "Este cadastro não está pendente" sem alterar
- [x] Aprovar `approved` devolve ok sem alterar `decided_at`
- [x] Id inexistente e id do administrador devolvem "Cadastro não encontrado"
- [x] Não administrador ou sem sessão recebem `UNAUTHORIZED` sem alterar dados
- [x] Falha de banco devolve "Não foi possível salvar. Tente novamente" e mantém o status
- [x] `revalidatePath("/admin/cadastros")` chamado nos sucessos
- [x] Testes em `admin-users.int.test.ts` passam
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the approve and reject actions`

---

### T13: Ações de revogar e excluir

**Status**: ✅ Complete

**What**: `revokeUser` e `deleteUser` com proteção do administrador, apagando sessões ou todos os dados.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T12
**Reuses**: `usersRepo.transition`, `revokeSessions`, `remove`; `isAdminEmail`
**Requirement**: SIGNUP-08, SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Revogar `approved` resulta em `revoked`, grava `decided_at`, apaga as sessões e mantém categorias e transações
- [x] Revogar não `approved` devolve "Este usuário não está aprovado"
- [x] Excluir em qualquer status apaga o usuário e todos os dados dele, libera o e-mail para novo `signUpAction` e preserva outro usuário
- [x] Excluir id inexistente devolve "Cadastro não encontrado"
- [x] Revogar ou excluir a conta do administrador (chamada direta) devolve "Não é possível revogar ou excluir o administrador" e nada muda
- [x] Não administrador recebe `UNAUTHORIZED` sem alterar dados
- [x] Falha de banco na exclusão não apaga nada e devolve "Não foi possível salvar. Tente novamente"
- [x] Usuário revogado com sessão aberta recebe `UNAUTHORIZED` na próxima ação protegida (AC 19)
- [x] Testes em `admin-users.int.test.ts` passam
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the revoke and delete actions`

---

### T14: Proxy libera `/cadastro`

**Status**: ✅ Complete

**What**: Incluir `cadastro` na exclusão do matcher do proxy.
**Where**: `src/proxy.ts`
**Depends on**: None
**Reuses**: Matcher atual
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Visitante sem cookie abre `/cadastro` sem redirecionamento; demais rotas continuam redirecionando para `/login`
- [x] Gate check passes: build
- [x] Test count: igual ao do T13

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): let visitors reach the signup route`

---

### T15: Formulário de cadastro

**Status**: ✅ Complete

**What**: `SignupForm` (nome, e-mail, senha) com erros por campo e mensagem de envio após sucesso.
**Where**: `src/app/cadastro/signup-form.tsx`
**Depends on**: T11
**Reuses**: `src/app/login/login-form.tsx`, `Input`, `Label`, `Button`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Três campos com `autoComplete` adequado (`name`, `username`, `new-password`) e `fieldErrors` sob cada campo
- [x] Em sucesso troca o formulário por "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo"
- [x] Botão desabilitado enquanto envia
- [x] Gate check passes: build
- [x] Test count: igual ao do T14

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the signup form`

---

### T16: Página `/cadastro`

**Status**: ✅ Complete

**What**: Página pública com logo, `SignupForm` e link "Já tenho conta" para `/login`.
**Where**: `src/app/cadastro/page.tsx`
**Depends on**: T15
**Reuses**: `src/app/login/page.tsx`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Título da aba "Cadastrar"; mesmo cartão e logo do login
- [x] Link "Já tenho conta" leva a `/login`
- [x] Gate check passes: build
- [x] Test count: igual ao do T15

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the signup page`

---

### T17: Link "Criar conta" no login

**Status**: ✅ Complete

**What**: Adicionar o link "Criar conta" para `/cadastro` abaixo do botão Entrar.
**Where**: `src/app/login/login-form.tsx`
**Depends on**: T16
**Reuses**: Componente atual
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Link "Criar conta" visível no login e aponta para `/cadastro`
- [x] Gate check passes: build
- [x] Test count: igual ao do T16

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): link the signup page from the login`

---

### T18: Lista de usuários do administrador

**Status**: ✅ Complete

**What**: `UserAdminList` com status em `Badge`, ações por `availableActions` e diálogo de confirmação da exclusão.
**Where**: `src/components/user-admin-list.tsx`
**Depends on**: T1, T13
**Reuses**: `Table`, `Badge`, `Dialog`, `Button`; padrão de `transaction-row-menu.tsx`
**Requirement**: SIGNUP-05, SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Linha mostra nome, e-mail, status em português, data do cadastro e só as ações de `availableActions(status)`
- [x] Excluir abre o diálogo "Excluir {nome}? Isso apaga todas as categorias, transações e o objetivo dessa pessoa. Não dá para desfazer" com Cancelar e Excluir; nada é chamado antes de confirmar
- [x] Erro devolvido pela ação aparece em `role="alert"` na lista
- [x] Lista vazia mostra "Nenhum cadastro"
- [x] Botões desabilitados durante a transição (`useTransition`)
- [x] Gate check passes: build
- [x] Test count: igual ao do T17

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the admin user list`

---

### T19: Página `/admin/cadastros`

**Status**: ✅ Complete

**What**: Página protegida por `requireAdminForPage` que lista os usuários com `UserAdminList`.
**Where**: `src/app/(app)/admin/cadastros/page.tsx`
**Depends on**: T7, T9, T18
**Reuses**: `PageHeader`; padrão de `categorias/page.tsx`
**Requirement**: SIGNUP-05, SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Título "Cadastros"; dados vêm de `usersRepo.listForAdmin`
- [x] Não administrador é redirecionado a `/`
- [x] Gate check passes: build
- [x] Test count: igual ao do T18

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the admin registrations page`

---

### T20: Item "Cadastros" na navegação

**Status**: ✅ Complete

**What**: `AppNav` recebe `isAdmin` e soma o item "Cadastros" (ícone `UsersIcon`) só para o administrador.
**Where**: `src/components/app-nav.tsx`
**Depends on**: None
**Reuses**: Lista `items` atual
**Requirement**: SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com `isAdmin` verdadeiro o item aponta para `/admin/cadastros` e marca ativo em qualquer subcaminho
- [x] Com `isAdmin` falso o item não é renderizado
- [x] Gate check passes: build
- [x] Test count: igual ao do T19

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): show the registrations link to the admin`

---

### T21: Layout passa `isAdmin` à navegação

**Status**: ✅ Complete

**What**: Ler `isAdmin` de `requireSessionForPage` e repassar a `AppNav`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T9, T20
**Reuses**: Layout atual
**Requirement**: SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Administrador vê "Cadastros" no menu; usuário comum não vê
- [x] Gate check passes: build
- [x] Test count: igual ao do T20

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): pass the admin flag to the navigation`

---

### T22: Decisão atômica com exclusão das sessões

**Status**: ✅ Complete

**What**: `transition` aceita revogar as sessões na mesma transação da mudança de status, para rejeitar e revogar serem tudo ou nada.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: None
**Reuses**: `db.transaction` de `remove` no mesmo arquivo; `transition` e `revokeSessions` atuais
**Requirement**: SIGNUP-05, SIGNUP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `transition(id, action, { revokeSessions: true })` grava o status, `decided_at` e apaga as sessões do usuário na mesma transação
- [x] Se a exclusão das sessões falhar, o status e `decided_at` ficam como antes (teste com falha injetada na segunda escrita, afirmando o status no banco)
- [x] Sem a opção, o comportamento atual não muda; `revokeSessions` isolado continua exportado
- [x] Testes novos em `users.int.test.ts` passam
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `fix(cadastro): make reject and revoke atomic with ending the sessions`

---

### T23: Ações de rejeitar e revogar usam a decisão atômica

**Status**: ✅ Complete

**What**: `decide` passa `revokeSessions: true` a `transition` em rejeitar e revogar e deixa de chamar `revokeSessions` à parte; o spec explicita que a exclusão das sessões faz parte da decisão.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T22
**Reuses**: `decide` atual
**Requirement**: SIGNUP-05, SIGNUP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `rejectUser` e `revokeUser` com falha na exclusão das sessões devolvem "Não foi possível salvar. Tente novamente" e o status no banco continua `pending` e `approved`, respectivamente
- [x] Testes de falha de banco existentes de aprovar e rejeitar seguem passando sem alteração
- [x] Os testes atuais de rejeitar e revogar (sessões apagadas, `decided_at`) seguem passando sem alteração
- [x] `spec.md` AC 11 da decisão já cita a exclusão das sessões (editado pelo orquestrador)
- [x] Testes novos em `admin-users.int.test.ts` passam
- [x] Gate check passes: full
- [x] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `fix(cadastro): decide reject and revoke in one write`

---

### T24: Teste da exclusão atômica

**Status**: ✅ Complete

**What**: Teste de repositório que falha uma escrita dentro da transação de `remove` e prova que usuário e dados continuam (mata o mutante M19).
**Where**: `src/lib/db/repos/users.int.test.ts`
**Depends on**: T22
**Reuses**: `remove` atual; helpers de `src/test/db.ts`
**Requirement**: SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com uma falha injetada na limpeza de `login_attempt` (ex.: trigger temporário no banco de teste, removido no `afterEach` ou no próprio teste), `remove` rejeita e o usuário, a conta e as categorias e transações dele continuam no banco
- [x] O teste falha se a transação de `remove` for removida (verificado manualmente tirando `db.transaction` e confirmando a falha, depois restaurando)
- [x] O teste não deixa trigger nem estado para os outros testes
- [x] Gate check passes: full
- [x] Test count: anterior + 1

**Tests**: integration
**Gate**: full

**Commit**: `test(cadastro): prove user deletion is all or nothing`

---

## Phase Execution Map

Fase 1 (T1 a T7), depois Fase 2 (T8 a T13), depois Fase 3 (T14 a T21), depois Fase 4 de correções (T22 a T24). Execução estritamente sequencial, uma tarefa por vez, na ordem numérica; as setas de cada fase estão no Execution Plan.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | None | - | ✅ Match |
| T3 | None | - | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T3, T5 | T3 → T7, T5 → T7 | ✅ Match |
| T8 | T4, T7 (fase 1) | - | ✅ Match |
| T9 | T3 (fase 1), T8 | T8 → T9 | ✅ Match |
| T10 | T7 (fase 1), T8 | T8 → T10 | ✅ Match |
| T11 | T2, T7 (fase 1), T10 | T10 → T11 | ✅ Match |
| T12 | T7 (fase 1), T9 | T9 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | None | - | ✅ Match |
| T15 | T11 (fase 2) | - | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T1 (fase 1), T13 (fase 2) | - | ✅ Match |
| T19 | T7, T9 (fases anteriores), T18 | T18 → T19 | ✅ Match |
| T20 | None | - | ✅ Match |
| T21 | T9 (fase 2), T20 | T20 → T21 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Domínio | unit | unit | ✅ OK |
| T2 | Validação | unit | unit | ✅ OK |
| T3 | Domínio | unit | unit | ✅ OK |
| T4 | Schema | integration | integration | ✅ OK |
| T5 | Helpers de teste | none | none | ✅ OK |
| T6 | Seed | integration | integration | ✅ OK |
| T7 | Repositório | integration | integration | ✅ OK |
| T8 | Auth config | integration | integration | ✅ OK |
| T9 | Guards | integration | integration | ✅ OK |
| T10 | Server Action | integration | integration | ✅ OK |
| T11 | Server Action | integration | integration | ✅ OK |
| T12 | Server Action | integration | integration | ✅ OK |
| T13 | Server Action | integration | integration | ✅ OK |
| T14 | Proxy | none | none | ✅ OK |
| T15 | UI | none | none | ✅ OK |
| T16 | UI | none | none | ✅ OK |
| T17 | UI | none | none | ✅ OK |
| T18 | UI | none | none | ✅ OK |
| T19 | UI | none | none | ✅ OK |
| T20 | UI | none | none | ✅ OK |
| T21 | UI | none | none | ✅ OK |
