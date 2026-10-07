# Esqueci Minha Senha Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/esqueci-senha/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (exige consultar `node_modules/next/dist/docs/` antes de código Next), `vitest.config.ts` (projetos `unit` e `integration`, sem limite de cobertura), AD-005 (e2e suspenso), L-002 (mensagem de validação exata na spec e no teste). Sem guideline de cobertura: strong defaults aplicados, no nível de `.specs/features/cadastro-aprovacao/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Todos os ramos; 1:1 com os ACs da spec (link, assunto, validade de 30 min) | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Validação (`src/lib/validation/*`) | unit | Cada campo: válido, cada regra de rejeição e a mensagem exata da spec | `src/lib/validation/*.test.ts` | `npm run test:unit` |
| Mailer (`src/lib/mailer.ts`) | unit | Transporte criado com as variáveis, campos repassados, cada variável ausente nomeada no erro; `nodemailer` mockado | `src/lib/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) | integration | Caminhos principais, constraints, atomicidade, concorrência, rollback e todos os estados de conta | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Auth config e guards (`src/lib/auth.ts`, `src/lib/auth-guard.ts`) | integration | Cada status contra o guard; chamada direta do endpoint nativo | `src/lib/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Sucesso + cada erro de validação e de estado; e-mail enviado ou não (mailer mockado, `after` mockado) | `src/actions/*.int.test.ts` | `npm run test:int` |
| Config e dependências (`package.json`, `.env.example`) | none | - (build gate only) | - | build gate only |
| UI, páginas, proxy (`src/app/*`, `src/proxy.ts`) | none | - (e2e suspenso, AD-005; regras testadas nas camadas abaixo) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up` e um banco `*_test` privado via `DATABASE_URL` (ver memória test-db-isolation). Usar Node 20 (PATH com o Node 20 do nvm).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI, config e fim de fase | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também. Cada seta é uma linha `Depends on`, inclusive as que vêm de fases anteriores.

### Phase 1: Base de envio e regras puras

Dependência, variáveis de ambiente, e-mail, validação e mailer. T2, T3 e T4 não dependem de nada.

```
T1 → T5
```

### Phase 2: Repositório de tokens

Emissão, validação e consumo atômico.

```
T3 → T6
T6 → T7
```

### Phase 3: Ações e guards

Ações de pedido e troca, guard de visitante e prova de que o endpoint nativo é inerte. T10 não depende de nada.

```
T3 → T8
T4 → T8
T5 → T8
T6 → T8
T4 → T9
T7 → T9
T7 → T11
```

### Phase 4: Telas

Proxy, link no login e as duas páginas. T12 e T13 não dependem de nada.

```
T8 → T14
T14 → T15
T10 → T15
T9 → T16
T16 → T17
T10 → T17
T6 → T17
```

---

## Task Breakdown

### T1: Adicionar nodemailer

**Status**: ✅ Complete

**What**: Instalar `nodemailer` e `@types/nodemailer` como dependências do projeto.
**Where**: `package.json`
**Depends on**: None
**Reuses**: Versão atual do npm conferida no design (10.x)
**Requirement**: SENHA-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `nodemailer` em `dependencies` e `@types/nodemailer` em `devDependencies`; `package-lock.json` atualizado no mesmo commit
- [x] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `chore(senha): add nodemailer`

---

### T2: Documentar variáveis SMTP

**Status**: ✅ Complete

**What**: Acrescentar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` ao exemplo de ambiente, com um comentário por grupo.
**Where**: `.env.example`
**Depends on**: None
**Reuses**: Estilo de comentário das variáveis existentes
**Requirement**: SENHA-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] As cinco variáveis aparecem vazias, com comentário
- [x] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `docs(senha): document the SMTP variables`

---

### T3: Criar o montador do e-mail de redefinição

**Status**: ✅ Complete

**What**: Função pura que monta destinatário, assunto "Redefinir sua senha" e texto com o link e a validade de 30 minutos; exporta `RESET_TOKEN_TTL_MINUTES = 30`.
**Where**: `src/lib/domain/password-reset-email.ts`
**Depends on**: None
**Reuses**: Convenção de `src/lib/domain/*`
**Requirement**: SENHA-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `buildPasswordResetEmail({ to, token, baseUrl })` devolve `subject` exato "Redefinir sua senha" e `to` igual ao informado
- [x] O texto contém `${baseUrl}/redefinir-senha?token=<token>` com o token em `encodeURIComponent` e a frase "30 minutos"
- [x] Baseado em `RESET_TOKEN_TTL_MINUTES`: alterar a constante muda o texto (teste prova)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Test count: ≥4 tests pass (no silent deletions)

> SPEC_DEVIATION: `buildPasswordResetEmail` aceita `ttlMinutes` opcional (padrão `RESET_TOKEN_TTL_MINUTES`) para o teste provar que o texto segue o valor da validade.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(senha): build the password reset e-mail`

---

### T4: Criar os esquemas de validação

**What**: `requestResetSchema` e `resetPasswordSchema` com as mensagens exatas da spec, mais `REQUEST_SENT_MESSAGE` e `INVALID_LINK_MESSAGE`.
**Where**: `src/lib/validation/password-reset.ts`
**Depends on**: None
**Reuses**: `PASSWORD_MISMATCH_MESSAGE` de `src/lib/validation/signup.ts`
**Requirement**: SENHA-04, SENHA-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] E-mail com espaços e maiúsculas é normalizado (trim + minúsculas); vazio ou sem formato válido falha com "Informe um e-mail válido"
- [ ] Senha de 7 e de 129 caracteres falha com "A senha deve ter entre 8 e 128 caracteres"; de 8 e de 128 passa
- [ ] Confirmação diferente falha em `confirmPassword` com "As senhas não coincidem"
- [ ] Token vazio falha
- [ ] `REQUEST_SENT_MESSAGE` é "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes" e `INVALID_LINK_MESSAGE` é "Link inválido ou expirado"
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: ≥8 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(senha): validate the reset request and the new password`

---

### T5: Criar o mailer SMTP

**What**: `sendMail` que cria o transporte do `nodemailer` na primeira chamada a partir de `SMTP_*` e envia texto simples.
**Where**: `src/lib/mailer.ts`
**Depends on**: T1
**Reuses**: Nada; é o primeiro envio do projeto
**Requirement**: SENHA-02, SENHA-03

**Tools**:

- MCP: `context7` (API atual do nodemailer)
- Skill: NONE

**Done when**:

- [ ] `sendMail({ to, subject, text })` chama `sendMail` do transporte com `from = SMTP_FROM`, `to`, `subject` e `text`
- [ ] O transporte é criado com host, porta numérica e credenciais de `SMTP_*`
- [ ] Cada variável ausente (cinco casos) rejeita com `Error("<NOME> não configurado")`
- [ ] Erro do transporte propaga a quem chamou
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Test count: ≥8 tests pass (no silent deletions)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(senha): send mail through SMTP`

---

### T6: Emitir e validar tokens no repositório

**What**: `passwordResetsRepo.issue` (só conta aprovada; apaga anteriores do usuário e expirados; grava hash) e `isValid`.
**Where**: `src/lib/db/repos/password-resets.ts`
**Depends on**: T3
**Reuses**: Padrão transacional de `src/lib/db/repos/users.ts`; `RESET_TOKEN_TTL_MINUTES`
**Requirement**: SENHA-02, SENHA-03, SENHA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `issue` de conta `approved` devolve `{ token, email }` e grava uma linha `password-reset:<sha256>` com `value = userId` e `expiresAt` 30 minutos à frente; o token puro não está no banco
- [ ] `issue` com e-mail em maiúsculas e com espaços acha a conta
- [ ] `issue` devolve `null` e não grava para e-mail inexistente e para cada status `pending`, `rejected`, `revoked`
- [ ] Segundo `issue` do mesmo usuário apaga o token anterior (`isValid` do antigo vira `false`); o de outro usuário permanece
- [ ] `issue` apaga tokens expirados de qualquer usuário
- [ ] `isValid` é `true` para token vigente de conta aprovada; `false` para desconhecido, expirado (relógio avançado), dono não aprovado, dono excluído e string vazia
- [ ] `isValid` não consome: chamar duas vezes dá `true` nas duas
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥12 tests pass (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(senha): issue and check reset tokens`

---

### T7: Consumir o token e trocar a senha de forma atômica

**What**: `passwordResetsRepo.consume(token, password)` que, em uma transação, consome o token, troca a senha da conta credential e apaga as sessões.
**Where**: `src/lib/db/repos/password-resets.ts` (modify)
**Depends on**: T6
**Reuses**: `hashPassword` de `better-auth/crypto`; `signInCookie` e `insertCredentialUser` de `src/test/auth.ts`
**Requirement**: SENHA-06, SENHA-07, SENHA-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Token vigente devolve `ok`; o login com a nova senha funciona e com a antiga falha (via `signInEmail`)
- [ ] Todas as sessões do usuário somem; as de outro usuário permanecem; nenhuma sessão nova é aberta
- [ ] O token não existe mais: segundo `consume` devolve `invalid` e a senha continua a primeira nova
- [ ] Token desconhecido, expirado, substituído por novo pedido e de usuário excluído devolvem `invalid` sem alterar nenhuma senha
- [ ] Dono `pending`, `rejected` ou `revoked` devolve `invalid`, a senha fica intacta e o token foi apagado
- [ ] Dois `consume` simultâneos do mesmo token: exatamente um `ok` e um `invalid`
- [ ] Falha forçada após o delete do token (hash que lança) faz rollback: senha antiga vale, sessões continuam, token continua válido
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥15 tests pass in total in this file (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(senha): consume the token and change the password atomically`

---

### T8: Criar a ação de pedido de redefinição

**What**: `requestPasswordResetAction` que valida o e-mail, emite o token e agenda o envio em `after()`, sempre com a mesma resposta.
**Where**: `src/actions/password-reset.ts`
**Depends on**: T3, T4, T5, T6
**Reuses**: `signUpAction` (`src/actions/auth.ts`) como molde; `invalidInput`; `process.env.BETTER_AUTH_URL`
**Requirement**: SENHA-02, SENHA-03, SENHA-04, SENHA-05

**Tools**:

- MCP: `context7` (`after` do Next 16)
- Skill: NONE

**Done when**:

- [ ] E-mail de conta aprovada: um `sendMail` com `to` normalizado, assunto "Redefinir sua senha" e link `…/redefinir-senha?token=…` com token que o repo reconhece; retorna `{ ok: true }`
- [ ] E-mail inexistente e de conta `pending`, `rejected`, `revoked`: nenhum `sendMail` e o mesmo retorno `{ ok: true }` do caso aprovado
- [ ] E-mail vazio e mal formado: `{ ok: false }` com "Informe um e-mail válido" e nenhum `sendMail`
- [ ] `sendMail` que rejeita: `console.error` chamado e retorno continua `{ ok: true }`
- [ ] Erro do repo (forçado): `console.error` chamado e retorno `{ ok: true }`
- [ ] Dois pedidos seguidos: o primeiro link deixa de valer (`isValid` falso) e o segundo vale
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥8 tests pass (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(senha): request a password reset link`

---

### T9: Criar a ação de troca de senha

**What**: `resetPasswordAction` que valida token, senha e confirmação, chama `consume` e redireciona ao login.
**Where**: `src/actions/password-reset.ts` (modify)
**Depends on**: T4, T7
**Reuses**: `invalidInput`, `SAVE_FAILED`; mock de `next/navigation` como nos testes de ações existentes
**Requirement**: SENHA-06, SENHA-07, SENHA-08, SENHA-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Dados válidos: redireciona a `/login`, a senha nova entra, as sessões somem e nenhum cookie de sessão é emitido
- [ ] Senha de 7 e de 129 caracteres: `{ ok: false }` com "A senha deve ter entre 8 e 128 caracteres"; o mesmo token ainda troca a senha depois
- [ ] Confirmação diferente: "As senhas não coincidem" em `confirmPassword`; o mesmo token ainda vale
- [ ] Token inexistente, expirado, usado, substituído, vazio: `{ ok: false, error: "Link inválido ou expirado" }` e senha intacta
- [ ] Conta que deixou de ser `approved` depois do pedido: "Link inválido ou expirado" e senha intacta
- [ ] Falha inesperada do repo (forçada): `SAVE_FAILED` e token ainda válido
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥8 tests pass in total in this file (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(senha): reset the password with a token`

---

### T10: Criar o guard de visitante

**What**: `redirectIfSignedIn` em `auth-guard.ts`, que manda quem tem sessão aprovada para `/`.
**Where**: `src/lib/auth-guard.ts`
**Depends on**: None
**Reuses**: `currentUser` do mesmo arquivo; `src/lib/auth-guard.int.test.ts`
**Requirement**: SENHA-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sessão de conta `approved`: redireciona a `/`
- [ ] Sem sessão, e com sessão de conta `pending`, `rejected` ou `revoked`: não redireciona e retorna normalmente
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥4 new tests pass (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `feat(senha): send signed-in users away from the reset pages`

---

### T11: Provar que o endpoint nativo não consome nossos tokens

**What**: Teste de integração que usa o `/reset-password` nativo do Better Auth com um token emitido por `passwordResetsRepo.issue` e mostra que nada muda.
**Where**: `src/lib/auth.int.test.ts` (modify)
**Depends on**: T7
**Reuses**: `auth.api.resetPassword`; `insertCredentialUser`
**Requirement**: SENHA-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `auth.api.resetPassword` com o token puro de `issue` rejeita com erro de token inválido
- [ ] A senha da conta continua a antiga e o token do nosso repo continua `isValid`
- [ ] `auth.api.requestPasswordReset` rejeita com `RESET_PASSWORD_DISABLED` (fluxo nativo desligado)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`
- [ ] Test count: ≥3 new tests pass (no silent deletions)

**Tests**: integration
**Gate**: full
**Commit**: `test(senha): prove the native reset endpoints stay inert`

---

### T12: Liberar as rotas no proxy

**What**: O matcher do `proxy` passa a excluir `esqueci-senha` e `redefinir-senha`.
**Where**: `src/proxy.ts`
**Depends on**: None
**Reuses**: Lista de exclusões existente do matcher
**Requirement**: SENHA-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `/esqueci-senha` e `/redefinir-senha?token=x` abrem sem cookie de sessão (sem redirecionar a `/login`)
- [ ] Demais rotas continuam protegidas
- [ ] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(senha): let visitors open the reset pages`

---

### T13: Adicionar o link no formulário de login

**What**: Link "Esqueci minha senha" para `/esqueci-senha`, junto de "Criar conta".
**Where**: `src/app/login/login-form.tsx`
**Depends on**: None
**Reuses**: Estilo do link "Criar conta" no mesmo arquivo
**Requirement**: SENHA-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O formulário mostra o link com o texto "Esqueci minha senha" apontando para `/esqueci-senha`
- [ ] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(senha): link the login form to the reset request`

---

### T14: Criar o formulário de pedido

**What**: Formulário com o campo e-mail, botão desabilitado durante o envio e a mensagem de sucesso em `role="status"`.
**Where**: `src/app/esqueci-senha/request-form.tsx`
**Depends on**: T8
**Reuses**: `useActionState` como em `login-form.tsx`; `REQUEST_SENT_MESSAGE`
**Requirement**: SENHA-03, SENHA-04, SENHA-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Envio com sucesso troca o formulário por `REQUEST_SENT_MESSAGE`; erro mostra a mensagem em `role="alert"`
- [ ] O botão fica desabilitado enquanto `pending`
- [ ] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(senha): add the reset request form`

---

### T15: Criar a página de pedido

**What**: Página `/esqueci-senha` com cartão e logo, o formulário, o link "Voltar ao login" e o redirecionamento de quem já está logado.
**Where**: `src/app/esqueci-senha/page.tsx`
**Depends on**: T14, T10
**Reuses**: Layout de `src/app/cadastro/page.tsx`; `redirectIfSignedIn`
**Requirement**: SENHA-10

**Tools**:

- MCP: `context7` (page e searchParams do Next 16, via `node_modules/next/dist/docs/`)
- Skill: NONE

**Done when**:

- [ ] A página renderiza o formulário e o link "Voltar ao login" para `/login`, com `metadata.title`
- [ ] Usuário aprovado logado é redirecionado a `/`
- [ ] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(senha): add the reset request page`

---

### T16: Criar o formulário de nova senha

**What**: Formulário com token oculto, "Nova senha" e "Confirmar senha" em `PasswordInput`, com aviso local de diferença e erro do servidor.
**Where**: `src/app/redefinir-senha/reset-form.tsx`
**Depends on**: T9
**Reuses**: `signup-form.tsx` (mismatch local, `PasswordInput`, `fieldErrors`)
**Requirement**: SENHA-06, SENHA-08, SENHA-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mostra os campos "Nova senha" e "Confirmar senha" com `autoComplete="new-password"` e envia o token em campo oculto
- [ ] Confirmação diferente mostra "As senhas não coincidem" e desabilita o envio; erros de campo e `INVALID_LINK_MESSAGE` do servidor aparecem
- [ ] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(senha): add the new password form`

---

### T17: Criar a página de redefinição

**What**: Página `/redefinir-senha` que lê o token de `searchParams`, mostra o formulário se `isValid` ou "Link inválido ou expirado" com link para pedir outro.
**Where**: `src/app/redefinir-senha/page.tsx`
**Depends on**: T16, T10, T6
**Reuses**: Layout de `src/app/cadastro/page.tsx`; `passwordResetsRepo.isValid`; `redirectIfSignedIn`
**Requirement**: SENHA-06, SENHA-09, SENHA-10

**Tools**:

- MCP: `context7` (searchParams como Promise no Next 16)
- Skill: NONE

**Done when**:

- [ ] Token válido mostra o formulário; token ausente, inválido, expirado ou de conta não aprovada mostra "Link inválido ou expirado" com link para `/esqueci-senha`
- [ ] Ambas as variações têm o link "Voltar ao login" para `/login`
- [ ] Usuário aprovado logado é redirecionado a `/`
- [ ] Build gate passa: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`

**Tests**: none
**Gate**: build
**Commit**: `feat(senha): add the password reset page`

---

## Lotes de execução

Execução estritamente sequencial, sem paralelismo dentro da fase. Com 17 tarefas, as fases inteiras se empacotam em três lotes: Fases 1 e 2 (7 tarefas), Fase 3 (4) e Fase 4 (6).

---

## Traceability

| Requirement ID | Tasks |
| -------------- | ----- |
| SENHA-01 | T13 |
| SENHA-02 | T1, T2, T3, T5, T6, T8 |
| SENHA-03 | T5, T6, T8, T14 |
| SENHA-04 | T4, T8, T14 |
| SENHA-05 | T6, T8 |
| SENHA-06 | T7, T9, T16, T17 |
| SENHA-07 | T7 |
| SENHA-08 | T4, T9, T16 |
| SENHA-09 | T7, T9, T11, T17 |
| SENHA-10 | T10, T12, T14, T15, T16, T17 |
