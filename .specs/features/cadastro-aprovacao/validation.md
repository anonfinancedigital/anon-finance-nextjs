# cadastro-aprovacao - Relatório de validação

## Validation: cadastro-aprovacao - PASS ✅

**Data**: 2026-10-06 (re-verificação, iteração 1 de 3)
**Spec**: `.specs/features/cadastro-aprovacao/spec.md` (AC 11 da decisão atualizado em 7848d39)
**Intervalo de diff**: `d50e3c4~1..6b0520b`. Código da feature em `91dfd8c..b118adc`, relatório anterior em `991d591`, fixes em `119767e` (T22), `7848d39` (T23) e `6b0520b` (T24).
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura no tree real; mutações e sondas só em `git worktree` temporário.

**Resumo do veredito**: todos os 40 ACs (38 de P1 e 2 de P2) e os 3 edge cases batem com o resultado exato do spec. O gate Build passa com 1116 testes e 0 falhas. O sensor matou 24 de 24 mutantes aplicáveis, incluindo o M19 (que tinha sobrevivido na rodada anterior) e as mutações novas M22 a M26 sobre a decisão atômica. Os dois gaps da rodada anterior estão fechados com evidência.

### Re-verificação dos gaps da rodada anterior

| Gap | Correção | Evidência `file:line` + asserção | Situação |
| --- | -------- | -------------------------------- | -------- |
| 1. AC 11 da decisão: rejeitar/revogar não eram atômicos | `src/lib/db/repos/users.ts:93-101`: `UPDATE` do status e `DELETE` das sessões dentro de uma única `db.transaction`, e as sessões só são apagadas quando a transição acontece (`rows.length > 0 && options.revokeSessions`). `src/actions/admin-users.ts:28` passa `{ revokeSessions: action !== "approve" }`, e não existe mais chamada separada a `revokeSessions` | `src/actions/admin-users.int.test.ts:313`: `withFailingSessionDelete(() => decide(userId))).toEqual(SAVE_FAILED)`; `:315`: `toMatchObject({ status, decidedAt: DECIDED_AT })`; `:316`: `sessionsOf(userId)).toBe(1)` (testado para `rejectUser` e `revokeUser`; a falha é injetada por trigger no banco, sem mock). No repositório: `src/lib/db/repos/users.int.test.ts:256`: `userRow(target.userId)).toEqual(before)` | ✅ Fechado. A sonda do verificador que antes falhava agora corresponde a um teste do projeto; os mutantes M22 e M25 morrem |
| 2. AC 17 da decisão: atomicidade da exclusão não testada (M19 sobrevivia) | `6b0520b` adiciona um teste com falha injetada por trigger `BEFORE DELETE ON login_attempt` | `src/lib/db/repos/users.int.test.ts:352-369`: `remove(userId)).rejects.toThrow()` e depois a contagem de usuário, sessão, conta, categoria, `category_percent`, subcategoria, transação, objetivo e `login_attempt` `toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])` | ✅ Fechado. M19 agora morre, e só esse teste falha |
| Gap de precisão do AC 11 | O spec agora diz "incluindo a exclusão das sessões em rejeitar e revogar" (`spec.md:106`) | n/a | ✅ Resolvido |

---

## Conclusão das tarefas

| Task | Status | Observações |
| ---- | ------ | ----------- |
| T1-T21 | ✅ Concluída (todas `✅ Complete` em tasks.md, todos os "Done when" marcados) | Commits 1:1 com as tasks em `91dfd8c..b118adc` |
| T22-T24 | ✅ Concluída (fix tasks da iteração 1) | `119767e`, `7848d39`, `6b0520b` |

---

## Critérios de aceite ancorados no spec

### P1: Cadastro e bloqueio até aprovação

| # | Critério | Resultado definido no spec | `file:line` + asserção | Situação |
| - | -------- | -------------------------- | ---------------------- | -------- |
| 1 | Cadastro válido | usuário `pending`, sem sessão, mensagem "Cadastro enviado. Você poderá entrar quando o administrador aprová-lo" | `src/actions/auth.int.test.ts:224` - `expect(await signUp()).toEqual({ ok: true })`; `:227` - `toMatchObject({ name: "Ana", email: "ana@x.com", status: "pending" })`; `:228` - `expect(await sessionsOf(created.id)).toBe(0)`. Mensagem: UI sem teste automático, verificada por leitura de código em `src/app/cadastro/signup-form.tsx:9,14-19` (texto exato) | ✅ PASS |
| 2 | Nome vazio após trim | "Informe seu nome" no campo nome; nenhum usuário | `src/lib/validation/signup.test.ts:25` - `toEqual([{ path: "name", message: "Informe seu nome" }])` (`""` e `"   "`); `src/actions/auth.int.test.ts:239` - `toEqual({ ok: false, error: message, fieldErrors: { [field]: message } })` + `:241` - `expect(await db.$count(user)).toBe(1)` | ✅ PASS |
| 3 | Nome > 80 | "O nome deve ter no máximo 80 caracteres"; nenhum usuário | `src/lib/validation/signup.test.ts:34-36` (81 rejeita; 80 aceita em `:28-31`); `src/actions/auth.int.test.ts:234,239,241` | ✅ PASS |
| 4 | E-mail inválido | "Informe um e-mail válido"; nenhum usuário | `src/lib/validation/signup.test.ts:45-48`; `src/actions/auth.int.test.ts:235,239,241` | ✅ PASS |
| 5 | Senha < 8 | "A senha deve ter pelo menos 8 caracteres"; nenhum usuário | `src/lib/validation/signup.test.ts:54-56` (7 rejeita; 8 aceita em `:59-62`); `src/actions/auth.int.test.ts:236,239,241` | ✅ PASS |
| 6 | Senha > 128 | "A senha deve ter no máximo 128 caracteres"; nenhum usuário | `src/lib/validation/signup.test.ts:65-67` (128 aceita em `:59`); `src/actions/auth.int.test.ts:237,239,241` | ✅ PASS |
| 7 | E-mail existente em qualquer status | "Este e-mail já está cadastrado"; usuário existente inalterado | `src/actions/auth.int.test.ts:250-258` - `toEqual({ ok: false, error: DUPLICATE, fieldErrors: { email: DUPLICATE } })` + `expect(after).toEqual([before])` nos 4 status; `src/lib/db/repos/users.int.test.ts:57-64` (linha e conta inalteradas) | ✅ PASS |
| 8 | Cadastros simultâneos | exatamente 1 usuário; o outro recebe "Este e-mail já está cadastrado" | `src/lib/db/repos/users.int.test.ts:74-78` - `arrayContaining([{ ok: true }, { ok: false, reason: "duplicate" }])` + `$count(user)).toBe(1)` + `$count(account)).toBe(1)`; mapeamento `duplicate` → mensagem em `src/actions/auth.ts:93`, coberto por `src/actions/auth.int.test.ts:250` | ✅ PASS (corrida testada no repositório, não na ação) |
| 9 | Login `pending` com senha correta | sem sessão, sem falha registrada, "Sua conta está aguardando aprovação do administrador" | `src/actions/auth.int.test.ts:169` - `toEqual({ ok: false, error: message })`; `:172` sessões 0; `:173` - `countRecentFailures(...)).toBe(0)`; endpoint direto: `src/lib/auth.int.test.ts:24-25` - `rejects.toBeInstanceOf(APIError)` + sessões 0 | ✅ PASS |
| 10 | Login `rejected` com senha correta | idem, "Seu cadastro não foi aprovado" | `src/actions/auth.int.test.ts:162,169,172,173`; `src/lib/auth.int.test.ts:24-25` | ✅ PASS |
| 11 | Senha errada (pending/rejected/revoked) | falha registrada, "E-mail ou senha inválidos" | `src/actions/auth.int.test.ts:182` - `toEqual(INVALID)`; `:185` - `countRecentFailures(...)).toBe(1)`; lockout de pendente em `:193-198` | ✅ PASS |
| 12 | Login `revoked` com senha correta | idem, "Seu acesso foi revogado" | `src/actions/auth.int.test.ts:163,169,172,173`; `src/lib/auth.int.test.ts:24-25` | ✅ PASS |
| 13 | Sessão de não aprovado | página → `/login`, ação → `UNAUTHORIZED`, sem ler/gravar | `src/lib/auth-guard.int.test.ts:83-85` - `toEqual({ ok: false, error: "UNAUTHORIZED" })` + `rejects.toThrow("NEXT_REDIRECT /login")` nos 3 status; `src/actions/admin-users.int.test.ts:226-227` - `saveGoal` devolve `UNAUTHORIZED` e nenhum objetivo é gravado | ✅ PASS |
| 14 | Rejeitar/revogar apagam sessões | todas as sessões do usuário apagadas | `src/actions/admin-users.int.test.ts:118` e `:196`: `expect(await sessionsOf(userId)).toBe(0)` (as do admin preservadas em `:119` e `:197`); no repositório, `src/lib/db/repos/users.int.test.ts:227-241`, na mesma transação da mudança de status | ✅ PASS |
| 15 | `/cadastro` público + links | `/cadastro` sem sessão, "Já tenho conta" → `/login`, "Criar conta" → `/cadastro` | UI sem teste automático (AD-005), verificado por leitura de código: `src/proxy.ts:18` (`cadastro` fora do matcher), `src/app/cadastro/page.tsx:20-22`, `src/app/login/login-form.tsx:37-41` (`href="/cadastro"`, "Criar conta"); a rota aparece como `○ /cadastro` no build | ✅ PASS (leitura) |
| 16 | Senha só como hash do Better Auth | hash salgado, mesmo formato | `src/lib/db/repos/users.int.test.ts:41` - `not.toContain(PASSWORD)`; `:42` - `verifyPassword(...)).toBe(true)`; mesmo `hashPassword` de `better-auth/crypto` em `src/lib/db/repos/users.ts:29` e `src/lib/db/seed-user.ts:14` | ✅ PASS |
| 17 | Migração | existentes → `approved` | `src/lib/db/schema.int.test.ts:526-529` - `existing.rows).toEqual([{ status: "approved", decided_at: null }, ...])`; novos ficam `pending` em `:536` | ✅ PASS |
| 18 | Seed do administrador | `approved` mesmo existindo em outro status | `src/lib/db/seed-user.int.test.ts:65` (novo) e `:78` - `expect(row.status).toBe("approved")` para pending/rejected/revoked + `:80` `decidedAt` recente | ✅ PASS |

### P1: Administrador decide os cadastros

| # | Critério | Resultado definido no spec | `file:line` + asserção | Situação |
| - | -------- | -------------------------- | ---------------------- | -------- |
| 1 | Lista | todos menos o admin; nome, e-mail, status, data; `pending` primeiro, cada grupo do mais antigo ao mais novo | `src/lib/db/repos/users.int.test.ts:121` - `toEqual([pendingOld, pendingNew, approvedOld, rejected, revoked])`; `:123-129` campos exatos; a página usa o repo em `src/app/(app)/admin/cadastros/page.tsx:12`; colunas em `src/components/user-admin-list.tsx:92-97` (leitura) | ✅ PASS |
| 2 | Sem usuários | "Nenhum cadastro" | `src/lib/db/repos/users.int.test.ts:134` - `toEqual([])`; texto: UI sem teste automático, `src/components/user-admin-list.tsx:57-59` (leitura) | ✅ PASS |
| 3 | Aprovar pending/rejected/revoked | `approved`, `decided_at` gravado, consegue entrar | `src/actions/admin-users.int.test.ts:69-76` - `toEqual({ ok: true })`, `status).toBe("approved")`, `decidedAt).not.toEqual(DECIDED_AT)`, `signInCookie(email)).resolves.toMatch(/=/)`; `src/lib/db/repos/users.int.test.ts:154-155` (`decidedAt >= before`) | ✅ PASS |
| 4 | Rejeitar pending | `rejected` + `decided_at` | `src/actions/admin-users.int.test.ts:112-117` | ✅ PASS |
| 5 | Rejeitar não pending | status mantido, "Este cadastro não está pendente" | `src/actions/admin-users.int.test.ts:128-130` - `toEqual({ ok: false, error: "Este cadastro não está pendente" })` + `toMatchObject({ status, decidedAt: DECIDED_AT })` | ✅ PASS |
| 6 | Aprovar approved | mantém status e `decided_at`, sem erro | `src/actions/admin-users.int.test.ts:83-85` - `toEqual({ ok: true })` + `toMatchObject({ status: "approved", decidedAt: DECIDED_AT })`; `src/lib/db/repos/users.int.test.ts:180-184` | ✅ PASS |
| 7 | Usuário inexistente | "Cadastro não encontrado", sem alterar | `src/actions/admin-users.int.test.ts:89`, `:137`, `:260` - `toEqual(NOT_FOUND)`; `src/lib/db/repos/users.int.test.ts:191`, `:374` | ✅ PASS |
| 8 | Não admin abre a página | redireciona para `/` | `src/lib/auth-guard.int.test.ts:132-133` - `rejects.toThrow("NEXT_REDIRECT /")` + `toHaveBeenCalledWith("/")`; guard chamado em `src/app/(app)/admin/cadastros/page.tsx:10` | ✅ PASS |
| 9 | Não admin / sem sessão chama a ação | `UNAUTHORIZED`, sem alterar | `src/actions/admin-users.int.test.ts:294-299` (revogar/excluir, não admin), `:309-313` (aprovar/rejeitar, não admin), `:320-323` (aprovar/rejeitar, sem sessão) | ✅ PASS (revogar/excluir sem sessão não têm teste próprio; mesmo guard `requireAdminForAction`, coberto em `src/lib/auth-guard.int.test.ts:114-116`) |
| 10 | Item "Cadastros" no menu só para o admin | visível só para o admin | UI sem teste automático, leitura de código: `src/components/app-nav.tsx:14,19`; `src/app/(app)/layout.tsx:11,17`; `isAdmin` do guard testado em `src/lib/auth-guard.int.test.ts:69` (false) e `:95` (true) | ✅ PASS (leitura) |
| 11 | Falha de banco ao gravar a decisão, incluindo a exclusão das sessões | status anterior mantido, "Não foi possível salvar. Tente novamente" | `src/actions/admin-users.int.test.ts:100-102` e `:149-151` (falha de `transition`); `src/actions/admin-users.int.test.ts:313-317` (falha real na exclusão das sessões, para rejeitar e revogar): `toEqual(SAVE_FAILED)`, `toMatchObject({ status, decidedAt: DECIDED_AT })`, `sessionsOf(userId)).toBe(1)`, `revalidatePath).not.toHaveBeenCalled()`; repositório em `src/lib/db/repos/users.int.test.ts:256-257` | ✅ PASS |
| 12 | Lista atualiza sem recarregar | novo status ou linha removida | `revalidatePath("/admin/cadastros")` verificado em `src/actions/admin-users.int.test.ts:76,120,199,249`; UI: `src/components/user-admin-list.tsx:55,61-68` (`useTransition`) (leitura) | ✅ PASS |
| 13 | Revogar approved | `revoked`, `decided_at`, sessões apagadas, dados intactos | `src/actions/admin-users.int.test.ts:190-198` - `status).toBe("revoked")`, `sessionsOf(userId)).toBe(0)`, `dataCounts(userId)).toEqual([1, 1, 1])` | ✅ PASS |
| 14 | Revogar não approved | mantém, "Este usuário não está aprovado" | `src/actions/admin-users.int.test.ts:207-209` | ✅ PASS |
| 15 | Diálogo de exclusão | texto exato, Cancelar/Excluir, nada muda antes de confirmar | UI sem teste automático, leitura de código: o botão só abre o diálogo em `src/components/user-admin-list.tsx:107` (`setDeleting(u)`); texto exato em `:136`; Cancelar em `:141`; Excluir chama `deleteUser` só em `:147` | ✅ PASS (leitura) |
| 16 | Confirmar exclusão | apaga usuário, sessões, contas, categorias, transações, objetivo; libera o e-mail | `src/actions/admin-users.int.test.ts:242-255` (4 status; outro usuário preservado; `signUpAction` com o mesmo e-mail → `{ ok: true }`); `src/lib/db/repos/users.int.test.ts:338-343` (inclui subcategoria, `category_percent` e `login_attempt`) | ✅ PASS |
| 17 | Exclusão falha | nada apagado (operação única), "Não foi possível salvar. Tente novamente" | Atomicidade: `src/lib/db/repos/users.int.test.ts:352-369` (falha injetada por trigger dentro da transação, `toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])`). Mensagem: `src/actions/admin-users.int.test.ts:279-283`: `toEqual(SAVE_FAILED)` | ✅ PASS |
| 18 | Revogar/excluir o admin | conta mantida, "Não é possível revogar ou excluir o administrador" | `src/actions/admin-users.int.test.ts:215-218` e `:267-271` | ✅ PASS |
| 19 | Sessão aberta de revogado/excluído | sem sessão (`/login` ou `UNAUTHORIZED`) | revogado: `src/actions/admin-users.int.test.ts:226-227`; excluído: sessões em cascade, `:243` - `sessionsOf(userId)).toBe(0)` | ✅ PASS |
| 20 | Ações por status | approved: Revogar+Excluir; pending: Aprovar+Rejeitar+Excluir; rejected/revoked: Aprovar+Excluir | `src/lib/domain/user-status.test.ts:37-43` - `availableActions(status)).toEqual(actions)`; a UI renderiza só `availableActions(u.status)` em `src/components/user-admin-list.tsx:100` (leitura) | ✅ PASS |

### P2: Isolamento do novo usuário

| # | Critério | Resultado definido no spec | `file:line` + asserção | Situação |
| - | -------- | -------------------------- | ---------------------- | -------- |
| 1 | Só dados com o `user_id` dele | escopo por usuário | Escopo pré-existente: `src/lib/db/repos/transactions.int.test.ts:140`, `src/lib/db/repos/categories.int.test.ts:226`, `src/lib/db/repos/goals.int.test.ts:188`; para o novo usuário: `src/lib/db/repos/users.int.test.ts:386-390` | ✅ PASS |
| 2 | Novo aprovado vê vazio | sem dados do admin | `src/lib/db/repos/users.int.test.ts:386`: `toEqual([])`, `:387-389`: `toEqual([])`, `:390`: `toBeNull()` | ✅ PASS |

**Situação**: ✅ Todos os ACs cobertos, com o resultado exato do spec.

### Gaps de precisão do spec

- Nenhum pendente. O gap do AC 11 da decisão foi resolvido em `7848d39` (`spec.md:106`).

---

## Casos de borda

- [x] E-mail que difere só por caixa ou espaços é o mesmo e-mail: `src/actions/auth.int.test.ts:250` (`"ANA@x.COM"`), `src/lib/db/repos/users.int.test.ts:57,70-71`, `src/lib/db/repos/users.int.test.ts:87`
- [x] Sem `ADMIN_EMAIL`, ninguém é admin e `/admin/cadastros` é negado: `src/lib/admin.test.ts:27-32`; `src/lib/auth-guard.int.test.ts:152-155`
- [x] O admin com sessão válida mantém o acesso a `/admin/cadastros`: `src/lib/auth-guard.int.test.ts:124-125` - `toEqual({ userId })` + `redirect).not.toHaveBeenCalled()`

---

## Regra de payload/conjunção e teste de asserção rasa

- Os resultados das ações são verificados com `toEqual` sobre o objeto inteiro (`{ ok, error, fieldErrors }`), não com "foi chamado". Os efeitos são verificados no estado do banco: status, `decidedAt`, contagem de sessões, contas, dados e `login_attempt`.
- `revalidatePath` é verificado com o argumento exato (`"/admin/cadastros"`) e com `not.toHaveBeenCalled` nos caminhos de erro.
- A asserção rasa da rodada anterior (`src/actions/admin-users.int.test.ts:276-283`, mock do método inteiro) continua lá, mas agora só cobre a mensagem. A atomicidade é provada por falha real no banco em `src/lib/db/repos/users.int.test.ts:352-369` (M19 morto). As falhas parciais da decisão usam trigger, não mock (`src/actions/admin-users.int.test.ts:287-301`).
- Asserção fraca, mas compensada: `src/actions/admin-users.int.test.ts:73-74` (`decidedAt` diferente de um valor fixo e do tipo `Date`). Fica compensada por `src/lib/db/repos/users.int.test.ts:155` (`>= before`).

---

## Sensor de discriminação

Scratch: `git worktree` temporário em `$SCRATCH/verify-wt2` (HEAD `6b0520b`), `node_modules` por symlink, banco privado `orcamento_cadastro_test`, um mutante por vez, com o arquivo restaurado (`git checkout`) depois de cada um. O worktree foi removido com `git worktree remove --force` e `git worktree prune`. O `git status --porcelain` do tree real ficou idêntico ao do início (vazio).

| Mutação | File:line | Descrição | Morto? |
| ------- | --------- | --------- | ------ |
| M1 | `src/lib/auth.ts:26` | O hook de sessão aceita qualquer status | ✅ Morto (3) |
| M2 | `src/lib/auth-guard.ts:10` | O guard ignora o status | ✅ Morto (3) |
| M3 | `src/actions/auth.ts:64` | Registra falha no login de não aprovado com a senha correta | ✅ Morto (3) |
| M4 | `src/actions/auth.ts:60` | Revela o status com a senha errada | ✅ Morto (4) |
| M5/M6 | (obsoletos) | O alvo `if (action !== "approve") await usersRepo.revokeSessions(id)` deixou de existir no T23; substituídos por M22-M24 | n/a |
| M7 | `src/lib/db/repos/users.ts:121` | `remove` não limpa `login_attempt` | ✅ Morto (2) |
| M8 | `src/actions/admin-users.ts:64` | `deleteUser` sem proteção do admin | ✅ Morto (1) |
| M9 | `src/actions/admin-users.ts:27` | `revokeUser` sem proteção do admin | ✅ Morto (1) |
| M10 | `src/lib/domain/user-status.ts:9` | `reject` aceita a origem `approved` | ✅ Morto (4) |
| M11 | `src/lib/db/repos/users.ts:34` | `createPending` não normaliza o e-mail | ✅ Morto (6) |
| M12 | `src/lib/db/repos/users.ts:91` | `transition` aceita o admin como alvo | ✅ Morto (3) |
| M13 | `src/lib/domain/user-status.ts:8` | Aprovar um `approved` regrava `decided_at` | ✅ Morto (2) |
| M14 | `src/lib/auth-guard.ts:34` | `requireAdminForPage` deixa um não admin passar | ✅ Morto (2) |
| M15 | `src/lib/admin.ts:6` | Sem `ADMIN_EMAIL`, o e-mail vazio vira admin | ✅ Morto (3) |
| M16 | `src/lib/db/repos/users.ts:77` | `listForAdmin` sem `pending` primeiro | ✅ Morto (1) |
| M17 | `src/lib/db/seed-user.ts:23` | O seed não aprova o usuário existente | ✅ Morto (3) |
| M18 | `drizzle/0012_user_status.sql:3` | Migração sem o `UPDATE` para `approved` | ✅ Morto (1) |
| M19 | `src/lib/db/repos/users.ts:117` | `remove` sem transação (AC 17) | ✅ Morto (1: "deletes nothing when a write inside the deletion fails"); sobrevivia antes |
| M20 | `src/actions/admin-users.ts:39` | `decide` sem `revalidatePath` | ✅ Morto (5) |
| M21 | `src/lib/validation/signup.ts:13` | O nome aceita 81 caracteres | ✅ Morto (2) |
| M22 | `src/actions/admin-users.ts:28` | `decide` chama `transition` sem a opção e depois `revokeSessions` fora da transação | ✅ Morto (2: falha parcial de rejeitar e revogar) |
| M23 | `src/actions/admin-users.ts:28` | `decide` omite a opção (`{}`) | ✅ Morto (4) |
| M24 | `src/actions/admin-users.ts:28` | A opção só vale para `revoke` (rejeitar não apaga as sessões) | ✅ Morto (2) |
| M25 | `src/lib/db/repos/users.ts:93` | `transition` sem `db.transaction` (sessões apagadas fora da transação) | ✅ Morto (4) |
| M26 | `src/lib/db/repos/users.ts:99` | Apaga as sessões mesmo sem transição válida (`wrong_state`) | ✅ Morto (3) |

**Profundidade do sensor**: P0-full (auth crítico; 24 mutações manuais cobrindo os ramos, sem ferramenta de mutação no projeto)
**Mortos**: 24/24 - sensor PASS ✅

---

## Qualidade do código

| Princípio | Situação |
| --------- | -------- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas (só os arquivos das tasks) | ✅ |
| Sem scope creep | ✅ |
| Segue os padrões (molde de `goals.ts`, repos, `useActionState`) | ✅ |
| Valores verificados batem com o spec | ✅ |
| Cobertura por camada (domínio 1:1; ações com sucesso, erro e autorização) | ✅ (revogar com falha parcial coberto em `src/actions/admin-users.int.test.ts:313`) |
| Todo teste mapeia para um AC, edge case ou Done-when | ✅ |
| Diretrizes documentadas: `AGENTS.md`, `vitest.config.ts`, AD-005, AD-009 | ✅ |

Observação fora do escopo (pré-existente, AUTH-03): `signInAction` registra falhas com o e-mail só com `trim` (`src/actions/auth.ts:45`), sem passar para minúsculas. `findByEmail` normaliza, mas `login_attempt` pode contar `Ana@x.com` e `ana@x.com` separadamente. Isso não é regressão desta feature.

---

## Gate

- **Comando do gate**: `DATABASE_URL=postgres://postgres:postgres@localhost:5433/orcamento_cadastro_test sh -c 'npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int'` (Node 20.20.2)
- **Saída**: exit 0. typecheck ok, lint ok, build ok (rotas `ƒ /admin/cadastros` e `○ /cadastro`), unit 679 passed (21 arquivos), integration 437 passed (16 arquivos). 0 falhas, 0 skipped.
- **Testes antes da feature** (`d50e3c4~1`, via `vitest list`): 647 unit + 323 int = 970
- **Testes depois da feature**: 679 unit + 437 int = 1116 (a rodada anterior tinha 1108; os fixes somaram +8)
- **Diferença**: +146, nenhum teste removido
- **Testes pulados**: nenhum
- **Falhas**: nenhuma

---

## Planos de correção

Nenhum pendente. Os Fix 1 e Fix 2 da iteração anterior foram implementados como T22-T24 e confirmados acima.

---

## Atualização da rastreabilidade de requisitos

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| SIGNUP-01 | Implemented | ✅ Verified |
| SIGNUP-02 | Implemented | ✅ Verified |
| SIGNUP-03 | Implemented | ✅ Verified |
| SIGNUP-04 | Implemented | ✅ Verified |
| SIGNUP-05 | Implemented | ✅ Verified |
| SIGNUP-06 | Implemented | ✅ Verified |
| SIGNUP-07 | Implemented | ✅ Verified |
| SIGNUP-08 | Implemented | ✅ Verified |
| SIGNUP-09 | Implemented | ✅ Verified |

---

## Resumo

**Geral**: ✅ Ready

**Verificação ancorada no spec**: 40/40 ACs e 3/3 edge cases batem com o resultado do spec; nenhum gap de precisão pendente
**Sensor**: 24/24 mutações mortas
**Gate**: 1116 passed, 0 failed

**O que funciona**: o bloqueio de sessão na origem (hook) e nos guards; as mensagens de login por status sem vazar o status com a senha errada; o cadastro com validação exata e corrida resolvida por `ON CONFLICT`; as transições com `decided_at` e a exclusão das sessões na mesma transação; a proteção do admin; a exclusão em cascata atômica com limpeza de `login_attempt`; a migração e o seed; a UI conforme o spec na leitura de código (AD-005).

**Observação fora do escopo, pré-existente**: `signInAction` grava as falhas com o e-mail só com `trim` (`src/actions/auth.ts:45`), sem passar para minúsculas.

**Próximos passos**: nenhum gap. Feature pronta para UAT manual da UI (AD-005).
