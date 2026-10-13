# Validation Report: cadastro-aberto

**Date**: 2026-10-13
**Spec**: `.specs/features/cadastro-aberto/spec.md`
**Diff range**: `32ca02b..HEAD` (785f69c..64b08c2, 15 commits da feature; a102311 `feat(login): add the Google logo` fora de escopo)
**Verifier**: sub-agente independente (autor != verificador)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T15 (3 fases) | Done | 15 commits atômicos, todos Conventional Commits (`check_commit.py`: 15/15 OK) |

---

## Spec-Anchored Acceptance Criteria

Testes: `AUTH`=`src/actions/auth.int.test.ts`, `SEAL`=`src/lib/db/repos/users.sealed.int.test.ts`, `ADM`=`src/actions/admin-users.int.test.ts`, `GINT`=`src/lib/auth-google.int.test.ts`, `GACT`=`src/actions/auth-google.int.test.ts`.

### OPEN-01

| AC | Resultado esperado pela spec | `file:line` + asserção | Resultado |
| -- | ---------------------------- | ---------------------- | --------- |
| 1 | usuário `approved`, sem sessão, mensagem "Cadastro concluído. Você já pode entrar" + link "Ir para o login" -> /login | Dados: `AUTH:246-258` `toMatchObject({..., status: "approved"})`; `AUTH:270-278` `sessionsOf(...)` `toBe(0)` + `redirect not called`. UI (inspeção, AD-005): `src/app/cadastro/signup-form.tsx:16` `SENT_MESSAGE = "Cadastro concluído. Você já pode entrar"`; `:82-87` `<Link href="/login">Ir para o login</Link>` | PASS (UI por inspeção) |
| 2 | login com e-mail/senha cria sessão e redireciona a `/` | `AUTH:261-267` `rejects.toThrow("NEXT_REDIRECT /")` + `sessionsOf(userId)` `toBe(1)` | PASS |
| 3 | validações, mensagens e duplicado de SIGNUP-01 mantidos | `AUTH:281-298` (duplicado por status, mensagem "Este e-mail já está cadastrado"), `:300-311`, `:313-348` (validações), `:356` (id repetido). Testes preexistentes, mantidos | PASS |
| 4 | nenhum texto de aprovação em /cadastro e /login | Inspeção: `grep -rniE "aprova"` em `src` (sem testes) só acha `auth.ts:26` (comentário), `NOT_APPROVED` (admin), `user-status.ts:38` (mensagem de `rejected`, fora do escopo da spec), `user-admin-list.tsx:30` (rótulo admin). `signup-form.tsx` e `src/app/login/*` sem ocorrência; `LOGIN_BLOCK_MESSAGE.pending` novo (`user-status.ts:37`) | PASS (inspeção) |

### OPEN-02

| AC | Resultado esperado | `file:line` + asserção | Resultado |
| -- | ------------------ | ---------------------- | --------- |
| 1 | 6ª tentativa: "Muitos cadastros a partir deste endereço. Tente novamente em {n} minutos"; singular com n=1; n = teto de minutos até a mais antiga das 5 sair; sem criar usuário | `AUTH:378-388` `toEqual({ok:false,error:LIMIT_MESSAGE("60 minutos")})` + `usersWith("u6@x.com")` `toEqual([])`; `AUTH:390-400` `"31 minutos"` (arredonda p/ cima 30min30s); `AUTH:402-413` `"1 minuto"` (59min30s) e 6ª passa em 60 min; unit `signup-limit.test.ts:23-33` (10, e teto 1), `:35` (mais antiga das 5 mais recentes), `:40-48` (fronteira 1 ms / exato) | PASS |
| 2 | <5 em 60 min cria e registra HMAC-SHA-256(IP, chave `BETTER_AUTH_SECRET`) com instante | `SEAL:88-94` `rows[0].ipHash toBe("abc123")` + instante `< 10_000 ms`; `AUTH:435-441` hash `^[0-9a-f]{64}$`; `client-ip.test.ts:35-60` (estável, chaveado, difere por IP/segredo). Construção HMAC não verificada por vetor conhecido | PASS com GAP Minor (G1, mutante M12 sobrevive) |
| 3 | validação reprovada/e-mail duplicado não registra nem conta | `AUTH:423-433` `db.$count(signupAttempt)` `toBe(0)` e 4 criados + duplicado + 5º passa + 6º recusado; `SEAL:102-109` duplicado `$count(signupAttempt)` `toBe(0)`; `SEAL:111-127` por status | PASS |
| 4 | ao registrar, apaga registros >60 min | `SEAL:150-160` `hashes toEqual(["new","recent"])` (61/120 min apagados, 59 mantido); `:162-166` sem ipHash não apaga | PASS |
| 5 | sem IP, cria sem limite | `AUTH:443-447` 7 cadastros `{ok:true}` e `$count(signupAttempt)` `toBe(0)`; `client-ip.test.ts:24-30` null | PASS |
| 6 | só o hash, nunca o IP | `AUTH:435-441` `not.toContain("203.0.113.7")`; `client-ip.test.ts:52-56`. Inspeção: `client-ip.ts`, `signup-attempts.ts`, `auth.ts` sem log/persistência do IP; `logActionError` registra só ação e `code` | PASS |
| 7 | falha de banco ao conferir/registrar: não cria usuário, "Não foi possível salvar. Tente novamente" | `AUTH:448-455` (leitura do limite, `toEqual({ok:false,error:"Não foi possível salvar. Tente novamente"})`, usuário inexistente); `AUTH:456-469` (tabela renomeada, falha ao registrar, `usersWith` `[]` e `vaults()` `[]`); `SEAL:140-147` atomicidade (`counts()` zerados) | PASS |

### OPEN-03

| AC | Resultado esperado | `file:line` + asserção | Resultado |
| -- | ------------------ | ---------------------- | --------- |
| 1 | approved: Revogar+Excluir; revoked: Reativar+Excluir; pending/rejected: só Excluir | `user-status.test.ts:31-39` `availableActions(status) toEqual(actions)` (4 linhas). UI (inspeção): `user-admin-list.tsx:35-45` `ACTION_LABEL`/`RUN` só reactivate/revoke/delete; botões derivam de `availableActions` | PASS (UI por inspeção) |
| 2 | reativar `revoked` -> `approved`, grava `decided_at`, entra com e-mail/senha | `ADM:65-76` `status toBe("approved")`, `decidedAt not.toEqual(DECIDED_AT)`, `signInCookie` resolve | PASS |
| 3 | reativar `approved`: mantém status e `decided_at`, sem erro | `ADM:78-84` `toEqual({ok:true})`, `toMatchObject({status:"approved",decidedAt:DECIDED_AT})` | PASS |
| 4 | reativar `pending`/`rejected`: mantém e "Este usuário não está revogado" | `ADM:86-96` `toEqual({ok:false,error:"Este usuário não está revogado"})`, status e `decidedAt` intactos | PASS |
| 5 | sem aprovar `pending` nem rejeitar, nem tela nem Action | Inspeção: `grep approveUser\|rejectUser\|createPendingSealed` em `src` = 0 ocorrências; `admin-users.ts` exporta só `reactivateUser`/`revokeUser`/`deleteUser`; `UserAction = "reactivate" \| "revoke"` (`user-status.ts:5`); `user-status.test.ts:12-28` | PASS |
| 6 | revogar e excluir inalterados | `ADM:151-195` revoke (sessões, dados, admin `ADMIN_TARGET`, `Este usuário não está aprovado`), `:197-265` delete (4 status, admin, falha de banco), `:286-315` | PASS |

### OPEN-04

| AC | Resultado esperado | `file:line` + asserção | Resultado |
| -- | ------------------ | ---------------------- | --------- |
| 1 | `pending` com senha certa: sem sessão, sem registrar falha, "Sua conta não está liberada. Fale com o administrador" | `AUTH:163-178` (it.each, mensagem exata, `pending`); `AUTH:180-190`; `user-status.test.ts:42-48 toEqual({...})`; `login-notice.test.ts:6-10` | PASS |
| 2 | `rejected`/`revoked` mantêm "Seu cadastro não foi aprovado" / "Seu acesso foi revogado" | `AUTH:163-178`; `user-status.test.ts:42-48` | PASS |

### OPEN-05

| AC | Resultado esperado | `file:line` + asserção | Resultado |
| -- | ------------------ | ---------------------- | --------- |
| 1 | e-mail verificado novo: cria `approved`, vincula Google, cria sessão, leva a /criar-cofre | `GINT:156-166` `status toBe("approved")`, `googleAccountsOf` `toBe(1)`, `sessionsOf` `toBe(1)`, `needsVault` `toBe(true)`, callback pathname `"/"`; `GINT:169-175`. O destino `/criar-cofre` vem do guard `src/app/(app)/layout.tsx:21` (`needsVault` -> `redirect("/criar-cofre")`), não do callback | PASS (destino por composição callback `/` + guard; ver S1) |
| 2 | e-mail com conta com senha: não vincula, sem sessão, /login com "Este e-mail já tem cadastro com senha. Entre com e-mail e senha" | `GINT:189-203` `googleAccountsOf` `toBe(0)`, `sessionsOf` `toBe(0)`, `db.$count(user)` `toBe(1)`, pathname `/login`, `error` `toBe("account_not_linked")`; texto: `login-notice.test.ts:23-27` `toBe("Este e-mail já tem cadastro com senha. Entre com e-mail e senha")`; `auth.ts:28` `accountLinking: { enabled: false }` | PASS |
| 3 | Google vinculado sem senha, `approved`: cria sessão | `GACT:137-145` pathname `"/"`, `error` null, `$count(session)` `toBe(1)`; `GINT:237-252` | PASS |
| 4 | Google vinculado `pending`/`rejected`/`revoked`: sem sessão e mensagem do status | `GINT:215-233` `sessionsOf` `toBe(before)`, `/login`, cookie `anon_login_block=${status}`; mensagens `login-notice.test.ts:5-10` | PASS |
| 5 | Google nunca cria status != `approved` | `google-hooks.test.ts:15-21` it.each pending/rejected/revoked -> `{data:{status:"approved"}}`; `GINT:47-57` `row.status toBe("approved")` | PASS |
| 6 | `approved` sem `user_vault` e sem senha: bloqueia páginas e vai a /criar-cofre | Já implementado (`login-google`); `GINT:164` `needsVault` `toBe(true)`; inspeção `layout.tsx:21`, `data-nascimento/page.tsx:19` | PASS (inspeção) |

**Status**: todos os 25 ACs têm evidência. 1 gap Minor (G1, HMAC sem vetor conhecido) e 1 spec-precision gap (S1).

### Spec-precision gaps

- S1 (OPEN-05 AC1): a spec diz "levar a `/criar-cofre`", mas o callback redireciona a `/` e o guard do layout faz o redirect. Os testes (`GINT:165`) afirmam `/`; a spec não distingue destino direto de via guard. Sugestão: reformular o AC como "chegar a /criar-cofre pelo guard".
- S2 (OPEN-02 AC1): a spec não define a pontuação final da mensagem; implementação e teste usam sem ponto final, consistente com as demais mensagens.
- S3 (OPEN-04 AC1): "não registrar falha de login" verificada em `AUTH:180-190` e `AUTH:192-203` (comportamento herdado); a spec não define o valor numérico.

---

## Discrimination Sensor

Scratch: git worktree temporário (`--detach HEAD`) com symlink de `node_modules` e banco privado `orcamento_aberto_test`; testes por arquivo. Tier expandido (caminhos de segurança): 16 mutações.

| # | File | Mutação | Resultado |
| - | ---- | ------- | --------- |
| M1 | `signup-limit.ts` | `releaseAt <= now` -> `<` | SURVIVED, mutante equivalente (em `releaseAt == now`, `Math.ceil(0)` = 0 igual a retornar 0) |
| M1b | `signup-limit.ts` | `times.length < SIGNUP_MAX` -> `<=` | KILLED (3 testes) |
| M2 | `signup-limit.ts` | `times[length - 5]` -> `times[0]` | KILLED |
| M3 | `users.ts` | `createSealed` grava `pending` | KILLED (5) |
| M4 | `users.ts` | retenção não apaga (`lt ... new Date(0)`) | KILLED |
| M5 | `google-hooks.ts` | decisão do Google volta a `pending` | KILLED (7) |
| M6 | `auth.ts` | `accountLinking.enabled` true | KILLED |
| M7 | `user-status.ts` | `reactivate.from` inclui `pending` | KILLED (2) |
| M8 | `client-ip.ts` | ignora `x-real-ip` | KILLED (2) |
| M9 | `user-status.ts` | `LOGIN_BLOCK_MESSAGE.pending` com texto antigo | KILLED (3) |
| M10 | `client-ip.ts` | SHA-256 puro sem chave | KILLED |
| M11 | `users.ts` | IP gravado antes do check de duplicado | KILLED (11) |
| M12 | `client-ip.ts` | HMAC com chave/dados trocados (`createHmac("sha256", ip).update(secret)`) | SURVIVED, gap real G1 |
| M13 | `auth.ts` | mensagem sempre plural | KILLED |
| M14 | `auth.ts` | janela de leitura 61 min | SURVIVED, equivalente (`signupLockMinutes` usa `releaseAt` com a janela de 60 min; a leitura mais larga não altera o resultado) |
| M15 | `admin-users.ts` | `revokeSessions: true` também em reactivate | SURVIVED, sem AC na spec (usuário `revoked` já não tem sessões; só tasks T2 pede "reativar não apaga"); observação, não gap de AC |
| M16 | `login-notice.ts` | ignora `account_not_linked` | KILLED |

**Sensor depth**: expandido (16 mutações; 13 mortas, 4 sobreviventes: M1 e M14 equivalentes, M15 sem AC, M12 gap real)
**Result**: iteração 1: 13/14 mortos (M12 sobreviveu); iteração 2: 14/14 mortos após be75487 - PASS

**Isolamento**: worktree removido (`git worktree remove --force` + `prune`); `git status --porcelain` da árvore real idêntico à linha de base (só os 7 `??` de `docs/` do usuário); `git stash list` vazio.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | OK |
| Surgical changes | OK (só arquivos da feature; `docs/` e `e2e/` intocados) |
| No scope creep | OK |
| Matches patterns | OK (repo/action/domain como `login-attempts`) |
| Spec-anchored outcome check | OK, exceto HMAC (G1) |
| Per-layer Coverage Expectation (domain 1:1; repo/action happy+edge+error) | OK |
| Todo teste mapeia a AC/edge case | OK |
| Guidelines: AGENTS.md (AD-005 e2e suspenso) | OK; `e2e/signup.spec.ts:65` com texto antigo conhecido e fora de escopo |

---

## Edge Cases

- [x] Dois cadastros simultâneos com o mesmo e-mail criam um usuário: `SEAL:130-138` (e 1 registro de IP)
- [x] Admin não revoga/exclui a si mesmo: `ADM:180-184`, `:243-250`
- [x] Seed do admin `approved`: inalterado (SIGNUP-04)
- [x] Nenhum caminho aprova `pending` ou rejeita (grep 0 ocorrências)
- [x] Migração `drizzle/0016_signup_attempt.sql` só cria `signup_attempt` + índice
- [x] IP em claro: não persistido nem logado

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && DATABASE_URL=postgres://postgres:postgres@localhost:5433/orcamento_aberto_test npm run test:int` (Node 20)
- **typecheck**: exit 0. **lint**: exit 0.
- **test:unit**: exit 0; 68 arquivos, 1359 testes passaram, 0 falhas.
- **test:int**: exit 0; 36 arquivos, 734 testes passaram, 0 falhas (banco privado, execução isolada).
- **Contagem estática de `it(`/`it.each(` em `*.test.ts`**: 1539 (32ca02b) -> 1574 (HEAD), +35; nenhum teste de revogar/excluir removido.
- **Skipped**: nenhum.

---

## Fix Plans

### Fix 1 (Minor): HMAC do IP sem vetor conhecido (G1, M12)

- **Root cause**: `client-ip.test.ts:35-60` verifica só estabilidade, 64 hex, diferença por IP e por segredo; HMAC com chave/dados trocados passa. OPEN-02 AC2 exige HMAC-SHA-256 com chave `BETTER_AUTH_SECRET`.
- **Fix task**: em `src/lib/client-ip.test.ts`, afirmar `hashIp(ip)` `toBe(createHmac("sha256", secret).update(ip).digest("hex"))` (ou um vetor fixo).
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| OPEN-01 | Pending | Verified |
| OPEN-02 | Pending | Verified (após be75487) |
| OPEN-03 | Pending | Verified |
| OPEN-04 | Pending | Verified |
| OPEN-05 | Pending | Verified |

---

## Re-verificação (iteração 2 de 3)

**Commit do fix**: be75487 `test(signup): pin the IP hash to a known HMAC-SHA-256 vector` (`check_commit.py`: OK). Só toca `src/lib/client-ip.test.ts` e `tasks.md`.

- **G1 fechado**: `src/lib/client-ip.test.ts` (novo caso "is HMAC-SHA-256 of the IP keyed by BETTER_AUTH_SECRET (known vector)") com `expect(hashIp("203.0.113.7")).toBe("9b10b210...edd307")` com segredo `secret-a`. OPEN-02 AC2 agora tem asserção da construção HMAC.
- **Sensor, reexecução em worktree isolado de HEAD**: M12 (chave e dados trocados) KILLED (1 falha); M10 (SHA-256 puro) KILLED (2 falhas). Worktree removido; `git status --porcelain` igual à linha de base da iteração.
- **Gate**: typecheck exit 0; lint exit 0; test:unit 68 arquivos, 1360 testes passaram (+1); test:int (banco privado, sozinho) 36 arquivos, 734 testes passaram, exit 0.
- **Nota de flakiness**: uma primeira execução de test:int teve 2 timeouts de 5000 ms em `legacy.int.test.ts` e `password-reset.int.test.ts` (arquivos não tocados pela feature, carga da máquina, load average ~3). Reexecutados isolados: 79/79 passaram; nova execução completa: 734/734, exit 0.
- **L-071** (candidate): continua válida, pois descreve um sobrevivente real e já corrigido; sem alteração.

Sobreviventes restantes: M1 e M14 (equivalentes), M15 (sem AC); S1-S3 permanecem como notas, não bloqueiam.

| Requirement | Previous | New |
| ----------- | -------- | --- |
| OPEN-01 a OPEN-05 | Needs Fix (OPEN-02) | Verified |

## Verdict

**Overall**: PASS

**Spec-anchored check**: 25/25 ACs com evidência; 3 spec-precision gaps (S1-S3) como notas
**Sensor**: 16 mutações, 14 mortas (M12 morta na iteração 2), 3 sobreviventes (M1 e M14 equivalentes, M15 sem AC)
**Gate**: typecheck 0, lint 0, unit 1360 passed, int 734 passed
