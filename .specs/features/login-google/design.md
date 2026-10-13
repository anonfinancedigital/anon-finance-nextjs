# Login com Google Design

**Spec**: `.specs/features/login-google/spec.md`
**Status**: Approved

---

## Architecture Overview

Abordagem escolhida: **plugin social nativo do Better Auth** (`socialProviders.google`) com hooks de banco que impõem as regras do projeto. Alternativas descartadas: fluxo OAuth escrito à mão (reimplementa PKCE, state e validação do id_token sem ganho) e cofre aberto por chave no servidor (quebra AD-011).

O Google só autentica. Nenhum KEK é derivado no login, então o `VaultProvider` não encontra DEK nem KEK pendente e mostra o `UnlockScreen` já existente (GOOGLE-03, GOOGLE-08 saem de graça). A conta Google nova não tem `user_vault` nem conta `credential`: um novo estado "precisa de cofre", distinto de "legada", leva a `/criar-cofre`.

```mermaid
graph TD
    L[/login: botão Google/] --> A[signInGoogleAction]
    A -->|auth.api.signInSocial| G[Google]
    G --> C[/api/auth/callback/google/]
    C --> UH{hook user.create.before}
    UH -->|email_verified=false| E[/login?error=.../]
    UH -->|ok: status=pending| SH
    C --> SH{hook session.create.before}
    SH -->|status != approved| B[cookie anon_login_block + /login]
    SH -->|approved| S[sessão -> /]
    S --> LY[(app)/layout]
    LY -->|legada: sem vault + com credential| P[/proteger-dados/]
    LY -->|sem vault + sem credential| V[/criar-cofre/]
    LY -->|com vault| U[VaultProvider -> UnlockScreen]
    V --> CV[createVaultAction] --> R[RecoveryKeyDialog] --> H[/]
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `betterAuth` config + `databaseHooks` | `src/lib/auth.ts` | Estender: `socialProviders`, `account.accountLinking`, hook `user.create.before`, cookie no `session.create.before` existente |
| `UnlockScreen`, `VaultProvider` | `src/components/` | Sem mudança: abrem o cofre de quem não tem KEK pendente |
| `createVaultMaterial` | `src/lib/vault/create-vault.ts` | Gera DEK, chave de recuperação, embrulhos e data cifrada; devolve `dek` não extraível para `deviceKey.save` |
| `RecoveryKeyDialog` | `src/components/recovery-key-dialog.tsx` | Mostra a chave de recuperação uma vez |
| `vaultMaterialSchema`, `ciphertextSchema` | `src/lib/validation/` | Validar o payload de `createVaultAction` |
| `signupSchema` partes de senha e data | `src/lib/validation/signup.ts` | Mensagens exatas de senha e data de nascimento |
| `vaultRepo.create`, `usersRepo.remove` | `src/lib/db/repos/` | Gravar o cofre; exclusão já cascateia `account` |
| `LOGIN_BLOCK_MESSAGE` | `src/lib/domain/user-status.ts` | Mensagens por status |
| `legacyRepo.isLegacy` | `src/lib/db/repos/legacy.ts` | Refinar: legada = sem vault **e com** conta `credential` |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Better Auth route handler | `src/app/api/auth/[...all]` já expõe `/api/auth/callback/google`; redirect URI no console do Google: `${BETTER_AUTH_URL}/api/auth/callback/google` |
| Proxy / `decideRoute` | Adicionar `/criar-cofre`? **Não**: é protegida (exige cookie de sessão), igual a `/proteger-dados` |
| Banco | Sem migração: `account` (providerId `google`) e `user` já existem; `user_vault` é reusada |

---

## Components

### Configuração do Google em `auth.ts`

- **Purpose**: Habilitar o provedor só quando as credenciais existem e impor as regras de status e e-mail.
- **Location**: `src/lib/auth.ts`, helper `src/lib/google.ts`
- **Interfaces**:
  - `isGoogleEnabled(): boolean` - `GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET` (GOOGLE-01)
  - `socialProviders: isGoogleEnabled() ? { google: { clientId, clientSecret } } : {}`
  - `account.accountLinking: { enabled: true, requireLocalEmailVerified: false }`, **sem** `trustedProviders`: assim o vínculo exige `email_verified = true` vindo do Google (`link-account.mjs:139`).
  - `databaseHooks.user.create.before(user)`: `user.emailVerified ? { data: { status: "pending" } } : false` (GOOGLE-04, GOOGLE-05.5). Contas por senha usam `createPendingSealed` (Drizzle direto) e não passam pelo hook.
  - `databaseHooks.session.create.before(session, ctx)`: mantém a recusa por status e, ao recusar, grava o cookie `anon_login_block=<status>` (httpOnly, sameSite lax, path `/login`, `maxAge` 60 s) via `ctx.setCookie`.
- **Dependencies**: Better Auth 1.7.7.
- **Reuses**: o hook de sessão existente.

### `signInGoogleAction`

- **Purpose**: Iniciar o OAuth sem cliente do Better Auth no bundle.
- **Location**: `src/actions/auth.ts`
- **Interfaces**: `signInGoogleAction(): Promise<ActionResult>` - chama `auth.api.signInSocial({ body: { provider: "google", callbackURL: "/", errorCallbackURL: "/login" }, headers })` e faz `redirect(url)`. Sem Google configurado devolve erro.
- **Dependencies**: plugin `nextCookies` (já ativo) grava o cookie de state.

### `GoogleButton` e aviso em `/login`

- **Purpose**: Botão "Continuar com Google" e mensagem de retorno.
- **Location**: `src/app/login/google-button.tsx`, `src/app/login/page.tsx`
- **Interfaces**: a página (servidor) lê `isGoogleEnabled()`, o cookie `anon_login_block` e `?error=`; passa `notice` ao formulário. Mensagem: status do cookie -> `LOGIN_BLOCK_MESSAGE[status]`; qualquer `?error=` sem cookie -> "Não foi possível entrar com o Google" (GOOGLE-04, GOOGLE-05).
- **Reuses**: `Button`, estilo de `LoginForm`.

### Estado "precisa de cofre"

- **Purpose**: Separar conta Google nova de conta legada (AD-012 trata "sem `user_vault`" como legada).
- **Location**: `src/lib/db/repos/vault.ts`, `src/lib/db/repos/legacy.ts`, `src/app/(app)/layout.tsx`, `src/app/data-nascimento/page.tsx`
- **Interfaces**:
  - `vaultRepo.needsVault(userId): Promise<boolean>` - sem `user_vault` e sem `account` `credential`.
  - `legacyRepo.isLegacy` passa a exigir conta `credential` (legada sempre tem senha).
  - Layout: `isLegacy -> /proteger-dados`; `needsVault -> /criar-cofre`; depois a checagem de data de nascimento existente.

### `/criar-cofre`

- **Purpose**: Criar senha de cofre, chave de recuperação e data cifrada de quem entrou só com Google.
- **Location**: `src/app/criar-cofre/page.tsx`, `create-vault-form.tsx`, `src/actions/vault.ts` (`createVaultAction`), `vaultRepo.createForSession`
- **Interfaces**:
  - Página (fora do grupo `(app)`): `requireSessionForPage`; se `!needsVault` redireciona para `/`.
  - Formulário: senha + confirmação + data de nascimento; valida com os esquemas do `signup`; `createVaultMaterial({ password, userId, birthDateIso, params })`; **descarta** `authSecret`; envia `{ vault, birthDateCt }`; no sucesso mostra `RecoveryKeyDialog`; na confirmação, `deviceKey.save(userId, created.dek)` e `router.replace("/")` (cofre já aberto, sem segundo desbloqueio).
  - `createVaultAction(payload)`: `requireSessionForAction`, zod (`vaultMaterialSchema`, `ciphertextSchema`), `vaultRepo.createForSession(userId, vault, birthDateCt)`; erro -> `SAVE_FAILED`.
  - `createForSession`: transação; relê `needsVault` dentro dela; `vaultRepo.create` + `birthDateCt`; a PK de `user_vault` impede duplicidade concorrente (GOOGLE-06.5).
- **Reuses**: `createVaultMaterial`, `RecoveryKeyDialog`, `deviceKey`, `SAVE_FAILED`.

---

## Data Models

Sem mudança de schema. Uma conta Google é uma linha de `account` com `providerId = "google"`, `accountId` = `sub` do Google, e `password` nulo. Conta Google nova: `user` (`status = pending`, `emailVerified = true`) + `account` google; o `user_vault` aparece só em `/criar-cofre`.

**Relationships**: `account.userId -> user.id (cascade)`, então `usersRepo.remove` apaga o vínculo (GOOGLE-09).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| `email_verified = false` | Hook de criação devolve `false`; vínculo recusado pelo Better Auth | `/login`: "Não foi possível entrar com o Google" |
| Usuário cancela / OAuth falha | Better Auth redireciona a `errorCallbackURL` com `?error=` | Mesma mensagem |
| Conta `pending`/`rejected`/`revoked` | Hook de sessão recusa e grava `anon_login_block` | Mensagem do status em `/login` |
| Google sem credenciais configuradas | Botão não renderiza; action devolve erro | Só e-mail e senha |
| Falha ao gravar o cofre | Transação inteira desfeita | "Não foi possível salvar. Tente novamente" (`SAVE_FAILED`, a confirmar o texto na task) |
| Senha de cofre errada | `UnlockScreen` existente | "Senha incorreta" |
| Esqueceu a senha de cofre | `/esqueci-senha` -> recuperação re-embrulha o cofre; a troca da linha `credential` é um UPDATE sem linhas | Recupera com a chave; verificar em teste |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Vínculo sem e-mail local verificado (`requireLocalEmailVerified: false`) permite pré-sequestro: alguém cadastra o e-mail da vítima, o admin aprova, a vítima entra com Google e cai na conta do atacante (cofre dele) | `node_modules/better-auth/dist/oauth2/link-account.mjs:139` | A vítima gravaria dados em cofre controlado por outra pessoa | Exigir `email_verified` do Google; o administrador só aprova pessoas que conhece; registrar como risco aceito e como assumption na spec |
| `isLegacy` hoje significa só "sem vault"; uma conta Google aprovada seria mandada a `/proteger-dados` | `src/lib/db/repos/legacy.ts:20` | Loop/erro de redirecionamento | Exigir conta `credential`; teste de integração dos dois estados |
| Cookie definido dentro de um hook pode não chegar à resposta de redirecionamento do callback | `link-account.mjs:324`, `callback.mjs:~190` | Mensagem por status não aparece | Task inicial é um spike com teste de integração; fallback: mensagem genérica "Sua conta ainda não pode entrar. Fale com o administrador" (ajusta a spec) |
| Logs do Better Auth (`logger.error`) podem imprimir e-mail ou perfil | `link-account.mjs:42,258` | Fere AD-013 | Configurar `logger` do Better Auth para descartar argumentos extras e só registrar nível e mensagem; verificar a opção no spike |
| `src/actions/auth.ts` tem `console.log` de depuração com o hash da senha (alteração local ainda não commitada) | `src/actions/auth.ts:44-50` | Hash de senha em log | Remover antes de editar este arquivo; não entra no commit do Google |
| `form-action 'self'` no CSP | `src/lib/security-headers.ts:~30` | Redirecionamento a `accounts.google.com` poderia ser bloqueado se virasse submit de formulário | A navegação parte de Server Action (fetch + `redirect`), não de `<form action>` externo; conferir manualmente |
| Sem teste de UI (AD-005) para botão, `/criar-cofre` e aviso | - | Regressão visual | Lógica em funções puras/repos com teste; UI por inspeção de código |
| Conta só-Google que erra o login por senha | `src/lib/db/repos/vault.ts:102` | `getKdfParamsAction` devolve `legacy` ou parâmetros reais e o `signInEmail` falha sem conta `credential` | Resposta é o "E-mail ou senha inválidos" genérico; sem vazamento novo |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| `trustedProviders` | Não usar | Com ele, o Better Auth vincula mesmo com `email_verified = false`; sem ele o vínculo exige verificação |
| Status do novo usuário | Hook `user.create.before` força `pending` | O campo `status` tem `input: false` e o default da coluna é `pending`; o hook torna o invariante explícito e recusa e-mail não verificado |
| Início do OAuth | Server Action + `signInSocial` | O projeto não usa `authClient`; mantém o padrão de Server Actions (AD-001) |
| Cofre aberto após criar | `deviceKey.save(userId, dek)` direto | Evita pedir a senha de novo logo após criá-la |
| Pendente sem tela própria | Mensagem em `/login` | O cadastro por senha também só mostra mensagem |

> **Project-level decision:** AD-014 registrado em `.specs/STATE.md`.
