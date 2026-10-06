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

**What**: `insertCredentialUser` e `createSignedInUser` aceitam `status`, com padrão `approved`.
**Where**: `src/test/auth.ts`
**Depends on**: T4
**Reuses**: Helpers atuais
**Requirement**: SIGNUP-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem o argumento, o usuário criado é `approved`
- [ ] Com `status`, grava o status pedido
- [ ] Todos os testes de integração existentes continuam passando sem alteração
- [ ] Gate check passes: full
- [ ] Test count: igual ao do T4

**Tests**: none (helper; coberto pelo gate Full inteiro)
**Gate**: full

**Commit**: `test(cadastro): let test helpers set the user status`

---

### T6: Seed do administrador grava `approved`

**What**: `seedUser` grava `status: approved` ao criar e ao redefinir senha de conta existente em qualquer status.
**Where**: `src/lib/db/seed-user.ts`
**Depends on**: T5
**Reuses**: Teste `seed-user.int.test.ts`
**Requirement**: SIGNUP-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seed novo cria usuário `approved`
- [ ] Seed sobre usuário `pending`, `rejected` ou `revoked` com o mesmo e-mail o deixa `approved` e grava `decided_at`
- [ ] Testes de integração em `seed-user.int.test.ts` cobrem os dois casos (AC 18 do cadastro)
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): seed the admin as approved`

---

### T7: Repositório de usuários

**What**: `usersRepo` com `createPending`, `findByEmail`, `findById`, `listForAdmin`, `transition`, `revokeSessions` e `remove`.
**Where**: `src/lib/db/repos/users.ts`
**Depends on**: T3, T5
**Reuses**: `seed-user.ts` (par `user` + `account` e `hashPassword`), `login-attempts.ts`
**Requirement**: SIGNUP-01, SIGNUP-05, SIGNUP-07, SIGNUP-08, SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `createPending` grava `user` `pending` e `account` com hash salgado (não a senha) na mesma transação; e-mail normalizado
- [ ] Dois `createPending` simultâneos com o mesmo e-mail (com caixa diferente) resultam em exatamente um usuário e um `duplicate` (AC 8)
- [ ] `createPending` com e-mail de usuário em qualquer status devolve `duplicate` sem alterar o existente (AC 7)
- [ ] `listForAdmin` exclui o administrador, ordena `pending` primeiro e depois por `created_at` crescente
- [ ] `transition` respeita `fromStatuses`, grava `decided_at`, devolve `wrong_state` e `not_found`; aprovar um `approved` devolve `ok` sem mudar `decided_at`
- [ ] `revokeSessions` apaga só as sessões do usuário
- [ ] `remove` apaga usuário, sessões, contas, categorias, `category_percent`, subcategorias, transações e objetivo dele, preserva os de outro usuário, e apaga `login_attempt` do e-mail; devolve `not_found` para id inexistente
- [ ] Novo usuário aprovado vê vazios `categoriesRepo.list`, `transactionsRepo` e `goalsRepo` enquanto outro usuário tem dados (SIGNUP-07)
- [ ] Teste de integração `users.int.test.ts` passa
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the users repository`

---

### T8: Configuração do Better Auth com status e hook de sessão

**What**: `additionalFields.status` no usuário e hook `session.create.before` que recusa sessão de quem não está `approved`.
**Where**: `src/lib/auth.ts`
**Depends on**: T4, T7
**Reuses**: Configuração atual do `betterAuth`
**Requirement**: SIGNUP-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `auth.api.signInEmail` direto (sem a nossa ação) com senha correta falha para `pending`, `rejected` e `revoked` e não cria linha em `session`
- [ ] O mesmo para `approved` cria a sessão
- [ ] `getSession` devolve o `status` do usuário
- [ ] `disableSignUp` continua `true` (teste: `auth.api.signUpEmail` falha)
- [ ] Testes de integração em `src/lib/auth.int.test.ts` passam
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): block session creation for unapproved users`

---

### T9: Guards com status e variantes de administrador

**What**: `requireSessionForPage/Action` tratam status != `approved` como sem sessão e devolvem `isAdmin`; novos `requireAdminForPage` e `requireAdminForAction`.
**Where**: `src/lib/auth-guard.ts`
**Depends on**: T3, T8
**Reuses**: `currentUserId` vira `currentUser`
**Requirement**: SIGNUP-03, SIGNUP-06, SIGNUP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sessão válida de usuário que passa a `revoked`, `rejected` ou `pending` depois do login: guard de página redireciona a `/login`; guard de ação devolve `UNAUTHORIZED` (AC 13 e AC 19)
- [ ] Usuário `approved` comum: `requireSessionForPage` devolve `isAdmin: false`; administrador devolve `true`
- [ ] `requireAdminForAction` devolve `UNAUTHORIZED` para não administrador e sem sessão
- [ ] `requireAdminForPage` redireciona a `/` para aprovado não administrador e a `/login` sem sessão
- [ ] Sem `ADMIN_EMAIL`, ninguém passa nos guards de administrador
- [ ] Testes novos em `auth-guard.int.test.ts` passam; os existentes seguem iguais
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): enforce approved status and admin in the guards`

---

### T10: Login com mensagens por status

**What**: `signInAction` revela o status só com a senha correta e não registra falha nesse caso.
**Where**: `src/actions/auth.ts`
**Depends on**: T7, T8
**Reuses**: `signInAction`, `loginAttemptsRepo`, `verifyPassword` de `better-auth/crypto`
**Requirement**: SIGNUP-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `pending`, `rejected` e `revoked` com senha correta: retorna a mensagem de `LOGIN_BLOCK_MESSAGE`, não cria sessão e não grava em `login_attempt`
- [ ] Os três com senha incorreta: grava falha e retorna "E-mail ou senha inválidos"
- [ ] Cinco senhas erradas em conta `pending` ainda bloqueiam o e-mail por 15 minutos como hoje
- [ ] `approved` e e-mail inexistente mantêm o comportamento atual
- [ ] Testes novos em `auth.int.test.ts` passam; os existentes seguem iguais
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): show approval status on login`

---

### T11: Ação de cadastro

**What**: `signUpAction` valida, cria o usuário `pending` e devolve sucesso ou erros por campo.
**Where**: `src/actions/auth.ts`
**Depends on**: T2, T7, T10
**Reuses**: `signupSchema`, `invalidInput`, `usersRepo.createPending`, `SAVE_FAILED`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Entrada válida cria usuário `pending`, não cria sessão e devolve `{ ok: true }`
- [ ] Cada erro de validação devolve a mensagem exata do spec em `fieldErrors` do campo certo e não cria usuário
- [ ] E-mail já existente (qualquer status, outra caixa) devolve "Este e-mail já está cadastrado" em `fieldErrors.email`, sem alterar o usuário
- [ ] Falha de banco devolve "Não foi possível salvar. Tente novamente"
- [ ] Testes novos em `auth.int.test.ts` passam
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the signup action`

---

### T12: Ações de aprovar e rejeitar

**What**: `approveUser` e `rejectUser` com guard de administrador, transição, remoção de sessões na rejeição e `revalidatePath`.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T7, T9
**Reuses**: Molde de `src/actions/goals.ts`; `usersRepo.transition`, `revokeSessions`
**Requirement**: SIGNUP-05, SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Aprovar `pending`, `rejected` e `revoked` resulta em `approved` com `decided_at`
- [ ] Rejeitar `pending` resulta em `rejected` e apaga as sessões do usuário (AC 13 do cadastro)
- [ ] Rejeitar usuário não `pending` devolve "Este cadastro não está pendente" sem alterar
- [ ] Aprovar `approved` devolve ok sem alterar `decided_at`
- [ ] Id inexistente e id do administrador devolvem "Cadastro não encontrado"
- [ ] Não administrador ou sem sessão recebem `UNAUTHORIZED` sem alterar dados
- [ ] Falha de banco devolve "Não foi possível salvar. Tente novamente" e mantém o status
- [ ] `revalidatePath("/admin/cadastros")` chamado nos sucessos
- [ ] Testes em `admin-users.int.test.ts` passam
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the approve and reject actions`

---

### T13: Ações de revogar e excluir

**What**: `revokeUser` e `deleteUser` com proteção do administrador, apagando sessões ou todos os dados.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T12
**Reuses**: `usersRepo.transition`, `revokeSessions`, `remove`; `isAdminEmail`
**Requirement**: SIGNUP-08, SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Revogar `approved` resulta em `revoked`, grava `decided_at`, apaga as sessões e mantém categorias e transações
- [ ] Revogar não `approved` devolve "Este usuário não está aprovado"
- [ ] Excluir em qualquer status apaga o usuário e todos os dados dele, libera o e-mail para novo `signUpAction` e preserva outro usuário
- [ ] Excluir id inexistente devolve "Cadastro não encontrado"
- [ ] Revogar ou excluir a conta do administrador (chamada direta) devolve "Não é possível revogar ou excluir o administrador" e nada muda
- [ ] Não administrador recebe `UNAUTHORIZED` sem alterar dados
- [ ] Falha de banco na exclusão não apaga nada e devolve "Não foi possível salvar. Tente novamente"
- [ ] Usuário revogado com sessão aberta recebe `UNAUTHORIZED` na próxima ação protegida (AC 19)
- [ ] Testes em `admin-users.int.test.ts` passam
- [ ] Gate check passes: full
- [ ] Test count: anterior + os novos

**Tests**: integration
**Gate**: full

**Commit**: `feat(cadastro): add the revoke and delete actions`

---

### T14: Proxy libera `/cadastro`

**What**: Incluir `cadastro` na exclusão do matcher do proxy.
**Where**: `src/proxy.ts`
**Depends on**: None
**Reuses**: Matcher atual
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Visitante sem cookie abre `/cadastro` sem redirecionamento; demais rotas continuam redirecionando para `/login`
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T13

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): let visitors reach the signup route`

---

### T15: Formulário de cadastro

**What**: `SignupForm` (nome, e-mail, senha) com erros por campo e mensagem de envio após sucesso.
**Where**: `src/app/cadastro/signup-form.tsx`
**Depends on**: T11
**Reuses**: `src/app/login/login-form.tsx`, `Input`, `Label`, `Button`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Três campos com `autoComplete` adequado (`name`, `username`, `new-password`) e `fieldErrors` sob cada campo
- [ ] Em sucesso troca o formulário por "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo"
- [ ] Botão desabilitado enquanto envia
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T14

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the signup form`

---

### T16: Página `/cadastro`

**What**: Página pública com logo, `SignupForm` e link "Já tenho conta" para `/login`.
**Where**: `src/app/cadastro/page.tsx`
**Depends on**: T15
**Reuses**: `src/app/login/page.tsx`
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Título da aba "Cadastrar"; mesmo cartão e logo do login
- [ ] Link "Já tenho conta" leva a `/login`
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T15

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the signup page`

---

### T17: Link "Criar conta" no login

**What**: Adicionar o link "Criar conta" para `/cadastro` abaixo do botão Entrar.
**Where**: `src/app/login/login-form.tsx`
**Depends on**: T16
**Reuses**: Componente atual
**Requirement**: SIGNUP-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Link "Criar conta" visível no login e aponta para `/cadastro`
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T16

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): link the signup page from the login`

---

### T18: Lista de usuários do administrador

**What**: `UserAdminList` com status em `Badge`, ações por `availableActions` e diálogo de confirmação da exclusão.
**Where**: `src/components/user-admin-list.tsx`
**Depends on**: T1, T13
**Reuses**: `Table`, `Badge`, `Dialog`, `Button`; padrão de `transaction-row-menu.tsx`
**Requirement**: SIGNUP-05, SIGNUP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Linha mostra nome, e-mail, status em português, data do cadastro e só as ações de `availableActions(status)`
- [ ] Excluir abre o diálogo "Excluir {nome}? Isso apaga todas as categorias, transações e o objetivo dessa pessoa. Não dá para desfazer" com Cancelar e Excluir; nada é chamado antes de confirmar
- [ ] Erro devolvido pela ação aparece em `role="alert"` na lista
- [ ] Lista vazia mostra "Nenhum cadastro"
- [ ] Botões desabilitados durante a transição (`useTransition`)
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T17

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the admin user list`

---

### T19: Página `/admin/cadastros`

**What**: Página protegida por `requireAdminForPage` que lista os usuários com `UserAdminList`.
**Where**: `src/app/(app)/admin/cadastros/page.tsx`
**Depends on**: T7, T9, T18
**Reuses**: `PageHeader`; padrão de `categorias/page.tsx`
**Requirement**: SIGNUP-05, SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Título "Cadastros"; dados vêm de `usersRepo.listForAdmin`
- [ ] Não administrador é redirecionado a `/`
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T18

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): add the admin registrations page`

---

### T20: Item "Cadastros" na navegação

**What**: `AppNav` recebe `isAdmin` e soma o item "Cadastros" (ícone `UsersIcon`) só para o administrador.
**Where**: `src/components/app-nav.tsx`
**Depends on**: None
**Reuses**: Lista `items` atual
**Requirement**: SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `isAdmin` verdadeiro o item aponta para `/admin/cadastros` e marca ativo em qualquer subcaminho
- [ ] Com `isAdmin` falso o item não é renderizado
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T19

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): show the registrations link to the admin`

---

### T21: Layout passa `isAdmin` à navegação

**What**: Ler `isAdmin` de `requireSessionForPage` e repassar a `AppNav`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T9, T20
**Reuses**: Layout atual
**Requirement**: SIGNUP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Administrador vê "Cadastros" no menu; usuário comum não vê
- [ ] Gate check passes: build
- [ ] Test count: igual ao do T20

**Tests**: none
**Gate**: build

**Commit**: `feat(cadastro): pass the admin flag to the navigation`

---

## Phase Execution Map

Fase 1 (T1 a T7), depois Fase 2 (T8 a T13), depois Fase 3 (T14 a T21). Execução estritamente sequencial, uma tarefa por vez, na ordem numérica; as setas de cada fase estão no Execution Plan.

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
