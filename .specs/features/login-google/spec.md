# Login com Google Specification

## Problem Statement

Hoje só se entra com e-mail e senha. A senha também deriva a chave que abre o cofre cifrado no navegador (AD-011), e o Google não fornece senha. O login com Google precisa autenticar pelo Google sem quebrar duas regras do projeto: nenhum dado legível fora do navegador do dono (AD-011) e nenhum acesso sem aprovação do administrador (AD-009).

## Goals

- [ ] Quem tem conta aprovada entra com Google em até 2 cliques a partir de `/login`, sem digitar a senha de login.
- [ ] Um primeiro login com Google cria usuário `pending` sem sessão, e o administrador o aprova pelo mesmo painel do cadastro.
- [ ] Toda conta criada via Google tem cofre cifrado com senha de cofre própria; o servidor nunca recebe essa senha nem o texto puro.
- [ ] Contas de e-mail e senha continuam funcionando sem mudança de comportamento.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Outros provedores (GitHub, Apple) | Pedido cobre só o Google |
| Desvincular o Google de uma conta | Sem fluxo de gestão de provedores nesta entrega |
| Login com Google via One Tap / popup | Só o redirecionamento OAuth padrão |
| Trocar a senha de cofre dentro de `/conta` | Já existe troca de senha para contas com senha; ajuste de Google fica para depois |
| Migrar contas legadas (texto puro) via Google | `/proteger-dados` segue exigindo a senha da conta |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Como o cofre abre no login com Google | Senha de cofre própria, criada no primeiro acesso aprovado e digitada a cada novo login | Escolha do usuário; mantém AD-011 | y |
| Aprovação | Primeiro login com Google cria `pending` sem sessão; e-mail já existente é vinculado mantendo o status | Escolha do usuário; mantém AD-009 | y |
| Vínculo por e-mail | Só vincula se o Google informar `email_verified = true`; senão recusa | Evita tomada de conta por e-mail não verificado | n |
| Link com e-mail local não verificado | `requireLocalEmailVerified: false`; a aprovação do administrador é o controle | Contas de e-mail/senha nunca têm `email_verified = true`; sem isso o vínculo (P2) nunca ocorre. Risco de pré-sequestro residual: ver design | n |
| Tela de "pendente" | Mensagem em `/login`; o cadastro por senha também não tem tela própria, só a mensagem no formulário | O código atual não tem tela de pendente | n |
| Quando se cria o cofre de quem entra com Google | Quando o usuário está `approved` e ainda sem `user_vault`, a próxima entrada leva a `/criar-cofre`; a sessão só existe após a aprovação | Cofre exige sessão para gravar; `pending` não tem sessão (AD-009) | n |
| Conta Google sem cofre vs. conta legada | `/criar-cofre` é distinto de `/proteger-dados`: conta sem `user_vault` e sem dados em texto puro é Google nova, não legada | AD-012 trata "sem `user_vault`" como legada; é preciso distinguir | n |
| Data de nascimento | Pedida em `/criar-cofre` (campo cifrado, como no cadastro) | O cadastro coleta e cifra a data; contas Google ficam com o mesmo conjunto de dados | n |
| Conta existente com senha vinculada ao Google | Continua pedindo a senha existente para abrir o cofre; o Google não cria nova senha de cofre | A DEK já está embrulhada pela senha; não há como trocá-la sem a senha | n |
| Credenciais e configuração | `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` por variável de ambiente; sem elas o botão não aparece | Padrão do projeto (`ADMIN_EMAIL`, `BETTER_AUTH_API_KEY`) | n |
| Verificação | Lógica pura e repos com unit/integration; UI por inspeção de código (AD-005) | Regra do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Entrar com Google numa conta aprovada ⭐ MVP

**User Story**: Como usuário aprovado, quero entrar com minha conta Google para não digitar a senha de login.

**Why P1**: É o pedido central.

**Acceptance Criteria**:

1. WHERE `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set, the login page SHALL show a "Continuar com Google" button.  <!-- optional-feature -->
2. WHEN a user with `status = approved` completes Google sign-in with a verified e-mail matching their account THEN the system SHALL create a session and redirect to `/`.  <!-- event-driven -->
3. WHEN an approved user with an existing vault enters through Google THEN the system SHALL show the vault-unlock prompt and SHALL NOT show any financial data before the vault password opens the DEK.  <!-- event-driven -->
4. IF Google reports `email_verified = false` THEN the system SHALL refuse the sign-in, create no user and no session, and redirect to `/login` showing "Não foi possível entrar com o Google".  <!-- unwanted-behavior -->
5. IF the user cancels at Google or the OAuth exchange fails THEN the system SHALL return to `/login` with "Não foi possível entrar com o Google" and no session.  <!-- unwanted-behavior -->

**Independent Test**: Com um usuário aprovado e o provedor Google simulado, o callback cria sessão e redireciona; com `email_verified = false`, não cria nada.

---

### P1: Primeiro login com Google respeita a aprovação ⭐ MVP

**User Story**: Como administrador, quero que contas novas via Google passem pela minha aprovação.

**Why P1**: Sem isso o Google abriria a aplicação para qualquer pessoa, contra AD-009.

**Acceptance Criteria**:

1. WHEN a Google sign-in has a verified e-mail with no existing user THEN the system SHALL create a user with `status = pending`, link the Google account, and create no session.  <!-- event-driven -->
2. WHEN a pending user is created via Google THEN the system SHALL redirect to `/login` showing "Sua conta está aguardando aprovação do administrador".  <!-- event-driven -->
3. WHEN a Google sign-in matches an existing user by e-mail THEN the system SHALL link the Google account and keep the user's current `status`.  <!-- event-driven -->
4. IF the matched user has `status` `pending`, `rejected` or `revoked` THEN the system SHALL create no session and redirect to `/login` showing, respectively, "Sua conta está aguardando aprovação do administrador", "Seu cadastro não foi aprovado" or "Seu acesso foi revogado".  <!-- unwanted-behavior -->
5. The system SHALL NOT allow a Google sign-in to set `status` to any value other than `pending` on user creation.  <!-- ubiquitous -->
6. WHEN the Google e-mail equals `ADMIN_EMAIL` and no user exists THEN the system SHALL still create the user as `pending`.  <!-- event-driven -->

**Independent Test**: Callback com e-mail novo cria `pending` sem linha em `session`; e-mail `revoked` não gera sessão.

---

### P1: Criar o cofre de uma conta Google ⭐ MVP

**User Story**: Como usuário aprovado que entrou só com Google, quero criar uma senha de cofre para que meus dados sejam cifrados só no meu navegador.

**Why P1**: Sem cofre a conta não guarda dados financeiros (AD-011).

**Acceptance Criteria**:

1. WHEN an approved user without `user_vault` and without legacy plaintext data enters through Google THEN the system SHALL redirect to `/criar-cofre`.  <!-- event-driven -->
2. WHEN the user submits a vault password of 8 to 128 characters, confirmed identically, THEN the browser SHALL generate the DEK and recovery key, wrap the DEK with both, seal the birth date, and send only wrapped and sealed values to the server.  <!-- event-driven -->
3. WHEN the vault is created THEN the system SHALL show the recovery key once, require confirmation of its storage, and then redirect to `/`.  <!-- event-driven -->
4. IF the vault password has fewer than 8 characters THEN the system SHALL show "A senha deve ter pelo menos 8 caracteres" and send nothing to the server.  <!-- unwanted-behavior -->
5. IF the user already has a `user_vault` THEN the action SHALL reject creating another with "Esta conta já tem um cofre" and leave the stored vault unchanged, and the `/criar-cofre` page SHALL redirect that user to `/`.  <!-- unwanted-behavior -->
6. The server SHALL NOT receive or store the vault password, the KEK, the DEK or the recovery key in plaintext.  <!-- ubiquitous -->
7. IF the request to create the vault fails THEN the system SHALL keep the user on `/criar-cofre`, show "Não foi possível salvar. Tente novamente", and persist no partial vault.  <!-- unwanted-behavior -->

**Independent Test**: Ação de criar cofre grava `user_vault` completo ou nada; payload com texto puro é rejeitado pela validação.

---

### P2: Vincular o Google a uma conta com senha

**User Story**: Como usuário aprovado com senha, quero entrar também com Google usando o mesmo e-mail.

**Why P2**: Mantém uma conta por e-mail; funciona só com o vínculo da P1.

**Acceptance Criteria**:

1. WHEN an approved user with a password-wrapped vault enters through Google THEN the system SHALL ask for the account password to open the vault, and SHALL NOT offer to create a second vault.  <!-- event-driven -->
2. IF the password does not open the DEK THEN the system SHALL show "Senha incorreta" and keep the vault locked.  <!-- unwanted-behavior -->

**Independent Test**: Usuário com `user_vault` e conta de credencial entra por Google e cai no desbloqueio, não em `/criar-cofre`.

---

## Edge Cases

- IF a user has Google linked but no credential account and forgets the vault password THEN the system SHALL offer recovery by recovery key, as the password flow does.
- IF two Google callbacks for the same new e-mail arrive concurrently THEN the system SHALL create exactly one user.
- IF the Google account's e-mail changes after linking THEN the system SHALL keep resolving by the linked Google account id, not by the new e-mail.
- IF a non-approved account signs in with Google repeatedly THEN the system SHALL NOT count it as password failures in `login-lock`.
- WHEN a Google user is deleted by the administrator THEN the system SHALL delete the linked Google account row with the user.
- The system SHALL log Google sign-in failures without e-mail, token or profile contents (AD-013): actions through `logActionError`, the OAuth callback through the Better Auth `logger`, configured to keep only level and message.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| GOOGLE-01 | P1: Entrar com Google (botão condicionado à configuração) | Execute | In Progress |
| GOOGLE-02 | P1: Entrar com Google (sessão em conta aprovada) | Execute | In Progress |
| GOOGLE-03 | P1: Entrar com Google (cofre bloqueado até a senha) | Design | Pending |
| GOOGLE-04 | P1: Entrar com Google (e-mail não verificado e falha OAuth) | Execute | In Progress |
| GOOGLE-05 | P1: Aprovação (criação `pending`, vínculo, bloqueio por status, invariantes) | Execute | In Progress |
| GOOGLE-06 | P1: Criar o cofre (redirecionamento, criação no navegador, recusas) | Execute | In Progress |
| GOOGLE-07 | P1: Criar o cofre (nada em claro no servidor, tudo ou nada) | Execute | In Progress |
| GOOGLE-08 | P2: Vincular a conta com senha | Design | Pending |
| GOOGLE-09 | Edge cases (concorrência, e-mail alterado, exclusão, logs, lock) | Execute | In Progress |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️

---

## Success Criteria

- [ ] Um usuário novo percorre Google → pendente → aprovação → `/criar-cofre` → `/` sem que o servidor guarde texto puro.
- [ ] Nenhuma sessão existe para usuário não `approved` após qualquer callback do Google.
- [ ] `npm run typecheck`, `test:unit` e `test:int` passam.
