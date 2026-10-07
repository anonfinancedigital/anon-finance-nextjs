# Esqueci Minha Senha Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/esqueci-senha/spec.md`
**Diff range**: `07a309d..ad62b68` (execução inicial em `07a309d..66f202d`; iteração 1 do fix em `66f202d..ad62b68`; `e1d1344` pertence a outra feature e foi ignorado; `939d530` é doc de outra feature)
**Verifier**: independent sub-agent (author ≠ verifier)

## Validation: esqueci-senha - PASS ✅

**Veredito vigente (re-verificação, iteração 1 de 3, 2026-10-07)**: aprovado. O único gap da execução inicial (P1b AC 8, link para `/esqueci-senha` no envio) foi fechado pelo commit `ad62b68` (T18). 27/27 critérios (23 ACs + 4 edge cases) com evidência; gates verdes; nenhum gap novo.

### Re-verificação - iteração 1 (T18, commit `ad62b68`)

**Diff do fix** (`git diff --stat 66f202d..ad62b68`): só `src/app/redefinir-senha/reset-form.tsx` (+9) e `.specs/features/esqueci-senha/tasks.md` (T18). `git diff --stat 66f202d..HEAD -- src/actions src/lib` vazio: repo, ações, e-mail, mailer, validação e guard estão idênticos aos da execução inicial, então os 28 mutantes mortos daquela execução continuam válidos. Nada fora da feature mudou.

**AC 8 (P1b), evidência nova (code-read, no automated test, AD-005)**:

| Caminho que mostra `INVALID_LINK_MESSAGE` | Origem da mensagem | Link "Pedir outro link" → `/esqueci-senha` |
| --- | --- | --- |
| Abrir a página com token ausente/desconhecido/expirado/usado/substituído/conta não aprovada | `src/app/redefinir-senha/page.tsx:20` (`isValid` false) → `:34-36` | `src/app/redefinir-senha/page.tsx:38-40` ✅ |
| Envio com token que deixou de valer (expirou, usado em outra aba, substituído, perdeu a corrida, conta deixou de ser `approved`) | `src/actions/password-reset.ts:67` → `{ ok: false, error: INVALID_LINK_MESSAGE }` (sem `fieldErrors`) → `src/app/redefinir-senha/reset-form.tsx:20-21` `generalError = state.error` | `src/app/redefinir-senha/reset-form.tsx:62-67` - `generalError === INVALID_LINK_MESSAGE && <Link href="/esqueci-senha">Pedir outro link</Link>` ✅ |
| Envio com campo `token` vazio | `src/lib/validation/password-reset.ts:26` (`min(1, INVALID_LINK_MESSAGE)`) → `invalidInput` (`src/lib/action-result.ts:20`) põe `fieldErrors.token` → `reset-form.tsx:21` `generalError = fieldErrors.token` | `reset-form.tsx:62-67` ✅ |

Não aparece para os outros erros: senha curta/longa → só `fieldErrors.password` (`reset-form.tsx:37`), `fieldErrors.token` indefinido → `generalError` indefinido; confirmação diferente → `fieldErrors.confirmPassword` (`:19,51-55`) ou checagem local `mismatch` (`:18`), `generalError` indefinido; falha de banco → `SAVE_FAILED` (`src/actions/password-reset.ts:65`), diferente de `INVALID_LINK_MESSAGE`, sem link (correto: o link continua válido). Texto, `href` e classes iguais aos da página (`page.tsx:39`), import da constante única (`reset-form.tsx:9`), sem string duplicada.

**Gates (árvore real, Node 20.20.2, banco `orcamento_senha_test`)**: typecheck exit 0; lint exit 0; unit 722/722 (24 arquivos); integração 500/500 (18 arquivos); 0 skipped. Contagens iguais às da execução inicial (o fix não adicionou nem removeu testes).

**Sensor da iteração 1**: worktree temporária (`git worktree add --detach <scratchpad>/wt2 HEAD`, `node_modules` por symlink), mutante M30 em `src/app/redefinir-senha/reset-form.tsx:62`: `generalError === INVALID_LINK_MESSAGE` → `generalError !== INVALID_LINK_MESSAGE` (link some no erro de link e aparece em todo o resto). typecheck exit 0, lint exit 0, unit 722/722 passaram: **mutante sobreviveu**, como esperado para UI sem teste automatizado (AD-005, e2e suspenso; nenhum teste importa `reset-form.tsx`, os testes de integração não renderizam componentes, por isso não foram rodados no scratch). A discriminação deste critério vem só da leitura do código acima, não de teste. Não é tratado como gap novo: é a mesma condição já aceita para todos os critérios de UI da feature (P1a AC 1, P1b AC 1, P2 AC 1-2). Worktree removida, `git worktree prune`, `git status --porcelain` da árvore real igual ao baseline (`diff` vazio).

---

### Histórico - execução inicial (2026-10-07, diff `07a309d..66f202d`)

**Veredito da execução inicial**: reprovado (1 gap). Mantido abaixo como registro; as linhas marcadas "iteração 1" foram atualizadas.

Um único gap, de UI e de severidade Minor: no envio do formulário com token que deixou de valer, a tela mostra "Link inválido ou expirado" **sem** o link para `/esqueci-senha` exigido pelo P1b AC 8. Todo o resto passa: 26 de 27 critérios (23 ACs + 4 edge cases) com evidência no valor definido pela spec, 28/28 mutantes mortos, gates verdes.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T17 | ✅ Done | Todos marcados ✅ em tasks.md, com commit correspondente em `07a309d..HEAD` |
| T3 | ✅ Done | `// SPEC_DEVIATION` em `src/lib/domain/password-reset-email.ts:9`: `ttlMinutes` opcional, só para o teste provar que o texto segue a constante. Inócuo; a produção usa o padrão 30 |

---

## Spec-Anchored Acceptance Criteria

Legenda: "code-read (no automated test, AD-005)" = critério só de UI, verificado lendo o componente (e2e suspenso por AD-005).

### P1: Pedir o link pelo login

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| 1 | Login mostra link "Esqueci minha senha" para `/esqueci-senha` | texto exato, href `/esqueci-senha` | `src/app/login/login-form.tsx:33-34` - `<Link href="/esqueci-senha">Esqueci minha senha</Link>` - code-read (no automated test, AD-005) | ✅ PASS |
| 2 | E-mail de conta `approved` → um e-mail, assunto "Redefinir sua senha", link `/redefinir-senha` com token de uso único | 1 envio; assunto exato; link `BETTER_AUTH_URL/redefinir-senha?token=` | `src/actions/password-reset.int.test.ts:86` - `expect(sendMail).toHaveBeenCalledTimes(1)`; `:89` - `expect(mail.subject).toBe("Redefinir sua senha")`; `:90` - `expect(mail.text).toContain(\`${BASE_URL}/redefinir-senha?token=\`)`; `:91` - `expect(await passwordResetsRepo.isValid(tokenOfMail())).toBe(true)`; uso único: `src/lib/db/repos/password-resets.int.test.ts:212` - `expect(await passwordResetsRepo.consume(token, ...)).toBe("invalid")`; `src/lib/domain/password-reset-email.test.ts:10,15` | ✅ PASS |
| 3 | Compara o e-mail após trim + minúsculas | `"  ANA@X.com "` acha `ana@x.com` | `src/lib/validation/password-reset.test.ts:33` - `toEqual({ email: "ana@x.com" })`; `src/actions/password-reset.int.test.ts:83,88` - `request("  ANA@X.com ")` → `expect(mail.to).toBe(EMAIL)`; `src/lib/db/repos/password-resets.int.test.ts:60-62` | ✅ PASS |
| 4 | Sem conta ou `pending`/`rejected`/`revoked` → nenhum e-mail | 0 envios, 0 tokens | `src/actions/password-reset.int.test.ts:98` e `:108` - `expect(sendMail).not.toHaveBeenCalled()`; `:99,:109` - `expect(await db.$count(verification)).toBe(0)`; `src/lib/db/repos/password-resets.int.test.ts:69,76` - `toBeNull()` | ✅ PASS |
| 5 | Qualquer e-mail bem formado → mensagem uniforme exata | "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes", igual em todos os casos | Resposta idêntica: `src/actions/password-reset.int.test.ts:85,97,107,129,139` - `toEqual({ ok: true })` (aprovado, inexistente, cada status, falha SMTP, falha de banco); texto: `src/lib/validation/password-reset.test.ts:24-26` - `expect(REQUEST_SENT_MESSAGE).toBe("Se este e-mail ...em instantes")`; renderização: `src/app/esqueci-senha/request-form.tsx:13-16` (`state?.ok` → `{REQUEST_SENT_MESSAGE}` em `role="status"`) - code-read (no automated test, AD-005). Tempo uniforme: envio em `after()` (`src/actions/password-reset.ts:35`), uso em Server Functions confirmado em `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md:8` | ✅ PASS |
| 6 | E-mail vazio ou inválido → "Informe um e-mail válido", nada enviado | mensagem exata; 0 envios | `src/actions/password-reset.int.test.ts:118` - `toEqual({ ok: false, error: "Informe um e-mail válido", fieldErrors: { email: "Informe um e-mail válido" } })` para `""` e `"ana-sem-arroba"`; `:119` - `expect(sendMail).not.toHaveBeenCalled()`; `src/lib/validation/password-reset.test.ts:36-42` | ✅ PASS |
| 7 | Falha de envio → erro no log do servidor + mesma mensagem do AC 5 | `console.error` com o erro; `{ ok: true }` | `src/actions/password-reset.int.test.ts:129` - `toEqual({ ok: true })`; `:131` - `expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure)` | ✅ PASS |
| 8 | Novo pedido invalida todos os links anteriores | link antigo inválido, novo válido | `src/actions/password-reset.int.test.ts:151-152` - `isValid(tokenOfMail(0))).toBe(false)` / `isValid(tokenOfMail(1))).toBe(true)`; `src/lib/db/repos/password-resets.int.test.ts:89-92` (outro usuário preservado: `:91`) | ✅ PASS |
| 9 | Link expira 30 min após o pedido | `expiresAt = pedido + 30 min`; válido em 30min-1ms, inválido em 30min | `src/lib/db/repos/password-resets.int.test.ts:52` - `expiresAt: new Date(now.getTime() + 30 * MINUTE)`; `:145-148` - `true` em `30*MINUTE-1`, `false` em +1ms; `:236` consume `"invalid"` em 30 min; `src/actions/password-reset.int.test.ts:263` | ✅ PASS |
| 10 | Corpo diz que o link vale 30 minutos | "30 minutos" no texto | `src/lib/domain/password-reset-email.test.ts:25-26` - `expect(RESET_TOKEN_TTL_MINUTES).toBe(30)`; `toContain("30 minutos")` | ✅ PASS |

### P1: Definir a nova senha

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| 1 | Token válido → campos "Nova senha" e "Confirmar senha" | dois campos com esses rótulos | `src/app/redefinir-senha/page.tsx:20,31-32` (`isValid` → `<ResetForm token>`); `src/app/redefinir-senha/reset-form.tsx:25,38` (`<Label>Nova senha</Label>`, `<Label>Confirmar senha</Label>`) - code-read (no automated test, AD-005); validade: `src/lib/db/repos/password-resets.int.test.ts:114` - `isValid(...)).toBe(true)` | ✅ PASS |
| 2 | Senha 8-128 igual à confirmação + token válido → nova entra, antiga não | login nova OK, antiga falha | `src/actions/password-reset.int.test.ts:205` - `await expect(signIn(TEST_PASSWORD)).rejects.toBeInstanceOf(APIError)`; `:206` - `expect((await signIn(NEW_PASSWORD)).user.id).toBe(userId)`; limites 8/128 aceitos: `src/lib/validation/password-reset.test.ts:52-55`; `src/lib/db/repos/password-resets.int.test.ts:190-191` | ✅ PASS |
| 3 | Troca apaga todas as sessões do usuário | 0 sessões do usuário; outras intactas | `src/lib/db/repos/password-resets.int.test.ts:198,203-204` - de 2 para `toBe(0)`, outro usuário `toBe(1)`; `src/actions/password-reset.int.test.ts:204` - `expect(await sessionsOf(userId)).toBe(0)` | ✅ PASS |
| 4 | Troca consome o token | segundo uso inválido | `src/lib/db/repos/password-resets.int.test.ts:212,214` - `toBe("invalid")`, `$count(verification)).toBe(0)`; `src/actions/password-reset.int.test.ts:272-274` - `toEqual(INVALID_LINK)` e senha da 1ª troca mantida | ✅ PASS |
| 5 | Redireciona a `/login` e NÃO abre sessão | `redirect("/login")`; nenhuma sessão | `src/actions/password-reset.int.test.ts:200` - `rejects.toThrow("NEXT_REDIRECT /login")`; `:202` - `expect(redirect).toHaveBeenCalledWith("/login")`; `:204` - `expect(await sessionsOf(userId)).toBe(0)`. **Julgamento sobre o cookie removido**: adequado. As sessões do Better Auth aqui são só de banco (sem `cookieCache` em `src/lib/auth.ts:13`), então cookie sem linha em `session` não autentica; a ação não chama `auth.api` (`src/actions/password-reset.ts:49-69`), logo o plugin `nextCookies` não emite `Set-Cookie`. Prova empírica: mutante M29 (insere uma sessão antes do redirect) morre exatamente em `:204` (`expected 1 to be +0`) | ✅ PASS |
| 6 | Senha <8 ou >128 → mensagem exata, token segue válido | "A senha deve ter entre 8 e 128 caracteres"; token reutilizável | `src/actions/password-reset.int.test.ts:215-219` - `toEqual({ ok: false, error: LENGTH, fieldErrors: { password: LENGTH } })` para 7 e 129; `:222-223` - mesmo token depois troca e loga; `src/lib/validation/password-reset.test.ts:57-62` | ✅ PASS |
| 7 | Confirmação diferente → "As senhas não coincidem", token válido | mensagem exata; token válido | `src/actions/password-reset.int.test.ts:231-235` - `toEqual({ ok: false, error: MISMATCH, fieldErrors: { confirmPassword: MISMATCH } })`; `:237` - `isValid(token)).toBe(true)`; `src/lib/validation/password-reset.test.ts:64-68` | ✅ PASS |
| 8 | Token ausente/desconhecido/expirado/usado/substituído → "Link inválido ou expirado" **com link para `/esqueci-senha`**, nenhuma senha muda | mensagem exata + link `/esqueci-senha`; senha intacta | Mensagem e senha intacta no envio: `src/actions/password-reset.int.test.ts:243-244` (desconhecido), `:251-252` (vazio), `:263-264` (expirado), `:272-273` (usado), `:282-283` (substituído) - `toEqual(INVALID_LINK)` + `passwordHashOf(...)).toBe(before)`; `src/lib/db/repos/password-resets.int.test.ts:224-262` - `accounts()).toEqual(before)`. Link ao **abrir**: `src/app/redefinir-senha/page.tsx:34-41` - code-read. **Iteração 1**: link ao **enviar** (erro da ação e `fieldErrors.token` de token vazio): `src/app/redefinir-senha/reset-form.tsx:62-67` - `generalError === INVALID_LINK_MESSAGE && <Link href="/esqueci-senha">Pedir outro link</Link>` - code-read (no automated test, AD-005); ausente para erros de tamanho, confirmação e `SAVE_FAILED` | ✅ PASS (iteração 1; antes: gap parcial de UI) |
| 9 | Conta deixou de ser `approved` → "Link inválido ou expirado", senha intacta | mensagem exata; senha intacta | `src/actions/password-reset.int.test.ts:293-294` - `toEqual(INVALID_LINK)` e `passwordHashOf(userId)).toBe(before)` para `pending`, `rejected`, `revoked`; `src/lib/db/repos/password-resets.int.test.ts:273-276`; ao abrir: `:151-157` (`isValid` false) | ✅ PASS |
| 10 | Dois envios simultâneos com o token → no máximo um aceito | exatamente um `ok` | `src/lib/db/repos/password-resets.int.test.ts:284-293` - `Promise.all([consume, consume])`; `expect([...results].sort()).toEqual(["invalid", "ok"])`; só a senha vencedora entra. Mutante M11 (select-then-delete) morto | ✅ PASS |

### P2: Entrada de e-mail simples e retorno ao login

| # | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| - | --------- | -------------------- | ----------------------- | ------ |
| 1 | As duas páginas mostram "Voltar ao login" para `/login` | texto exato, href `/login` | `src/app/esqueci-senha/page.tsx:23-24`; `src/app/redefinir-senha/page.tsx:46-47` (fora do ternário, presente nas duas variações) - code-read (no automated test, AD-005) | ✅ PASS |
| 2 | Botão de envio desabilitado até a resposta | `disabled` enquanto pendente | `src/app/esqueci-senha/request-form.tsx:32` - `disabled={pending}` (de `useActionState`, `:11`) - code-read (no automated test, AD-005) | ✅ PASS |
| 3 | Logado → `/esqueci-senha` e `/redefinir-senha` redirecionam a `/` | `redirect("/")` | Guard: `src/lib/auth-guard.int.test.ts:165-166` - `rejects.toThrow("NEXT_REDIRECT /")`, `toHaveBeenCalledWith("/")`; não redireciona sem sessão ou com status não aprovado: `:170,:180`. Uso nas páginas: `src/app/esqueci-senha/page.tsx:10`, `src/app/redefinir-senha/page.tsx:16` - code-read (no automated test, AD-005). Rotas liberadas no proxy: `src/proxy.ts:18` | ✅ PASS |

### Edge Cases

| Edge case | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Variáveis SMTP ausentes no envio | erro no log + mensagem do AC 5 | Coberto por composição: `src/lib/mailer.test.ts:67-79` - para cada uma das 5 variáveis ausente/vazia, `rejects.toThrow(new Error(\`${name} não configurado\`))`; e `src/actions/password-reset.int.test.ts:129-131` - qualquer rejeição de `sendMail` → `{ ok: true }` + `console.error(..., failure)`. Não há teste único ponta a ponta (mailer real + ação), aceitável porque a ação trata toda rejeição igual. Observação: o transporte fica em cache (`src/lib/mailer.ts:17`); depois do 1º envio só `SMTP_FROM` é relido, o que não tem efeito prático (env não muda em runtime) | ✅ PASS |
| E-mail em maiúsculas/espaços acha a conta | conta encontrada | `src/actions/password-reset.int.test.ts:83-91`; `src/lib/db/repos/password-resets.int.test.ts:60-63` | ✅ PASS |
| Link aberto depois de a conta ser excluída | "Link inválido ou expirado" | `src/lib/db/repos/password-resets.int.test.ts:164` - `isValid(...)).toBe(false)`; `:260-262` - consume `"invalid"`, senhas intactas; página: `src/app/redefinir-senha/page.tsx:20,34-36` mostra `INVALID_LINK_MESSAGE` - code-read | ✅ PASS |
| Duas abas, link mais antigo usado | "Link inválido ou expirado" | `src/actions/password-reset.int.test.ts:282` - `toEqual(INVALID_LINK)`; `src/lib/db/repos/password-resets.int.test.ts:247-250` | ✅ PASS |

**Status**: ✅ All ACs covered (iteração 1; na execução inicial havia 1 gap parcial de UI em P1b AC 8, caminho de envio, fechado por `ad62b68`). Nenhum spec-precision gap: todas as mensagens, o assunto, a forma do link e os 30 minutos estão definidos na spec e são asseridos pelo valor exato.

Extra (design, não AC): endpoints nativos inertes - `src/lib/auth.int.test.ts:85` - `rejects.toMatchObject({ body: { code: "INVALID_TOKEN" } })`; `:98` - nosso token segue `isValid`; `:106` - `RESET_PASSWORD_DISABLED`.

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt HEAD` com `node_modules` por symlink e banco privado `orcamento_senha_verifier_test` (criado e removido). Baseline da árvore real (`?? docs/mobile-roadmap.md`) idêntico depois da limpeza (`diff` vazio). Sanidade antes das mutações: os 7 arquivos de teste da feature passaram no scratch (120 testes).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/db/repos/password-resets.ts:22` | `issue` sem checar `approved` | ✅ Killed (6 testes) |
| M2 | `src/lib/db/repos/password-resets.ts:32` | `issue` não apaga tokens anteriores do usuário | ✅ Killed (4) |
| M3 | `src/lib/db/repos/password-resets.ts:32` | `issue` não apaga expirados de outros usuários | ✅ Killed (1) |
| M4 | `src/lib/db/repos/password-resets.ts:39` | TTL 31 min em vez de 30 | ✅ Killed (4) |
| M5 | `src/lib/db/repos/password-resets.ts:12` | guarda o token puro em vez do SHA-256 | ✅ Killed (2) |
| M6 | `src/lib/db/repos/password-resets.ts:55` | `isValid` sem condição de expiração | ✅ Killed (1) |
| M7 | `src/lib/db/repos/password-resets.ts:56` | `isValid` sem checar `approved` | ✅ Killed (3) |
| M8 | `src/lib/db/repos/password-resets.ts:73` | `consume` sem condição de expiração | ✅ Killed (2) |
| M9 | `src/lib/db/repos/password-resets.ts:78` | `consume` sem checar `approved` | ✅ Killed (6) |
| M10 | `src/lib/db/repos/password-resets.ts:85` | `consume` não apaga sessões | ✅ Killed (2) |
| M11 | `src/lib/db/repos/password-resets.ts:71-75` | `consume` não atômico (select e depois delete sem checar linhas) | ✅ Killed (teste de concorrência) |
| M12 | `src/lib/db/repos/password-resets.ts:70` | `consume` fora de transação | ✅ Killed (2, rollback) |
| M14 | `src/actions/password-reset.ts:38` | resposta diferente quando não há conta/conta não aprovada | ✅ Killed (4) |
| M15 | `src/actions/password-reset.ts:36` | falha de SMTP engolida sem log | ✅ Killed (1) |
| M16 | `src/actions/password-reset.ts:36` | falha de SMTP propaga (sem `catch`) | ✅ Killed (1) |
| M17 | `src/actions/password-reset.ts:68` | redireciona a `/` em vez de `/login` | ✅ Killed (4) |
| M18 | `src/actions/password-reset.ts:67` | token inválido devolve `SAVE_FAILED` | ✅ Killed (7) |
| M19 | `src/actions/password-reset.ts:31` | e-mail enviado ao endereço digitado, não ao normalizado | ✅ Killed (1) |
| M20 | `src/lib/domain/password-reset-email.ts:28` | remove a frase de validade | ✅ Killed (2) |
| M21 | `src/lib/domain/password-reset-email.ts:31` | assunto "Redefina sua senha" | ✅ Killed (2) |
| M22 | `src/lib/domain/password-reset-email.ts:19` | token sem `encodeURIComponent` | ✅ Killed (1) |
| M23 | `src/lib/validation/password-reset.ts:29` | mínimo 7 | ✅ Killed (2) |
| M24 | `src/lib/validation/password-reset.ts:30` | máximo 129 | ✅ Killed (2) |
| M25 | `src/lib/validation/password-reset.ts:19` | sem `toLowerCase` | ✅ Killed (1) |
| M26 | `src/lib/validation/password-reset.ts:33` | confirmação não comparada | ✅ Killed (4) |
| M27 | `src/lib/auth-guard.ts:23` | `redirectIfSignedIn` não redireciona | ✅ Killed (1) |
| M28 | `src/lib/mailer.ts:18` | `SMTP_HOST` não exigido | ✅ Killed (2) |
| M29 | `src/actions/password-reset.ts:68` | abre (insere) uma sessão antes do redirect | ✅ Killed (`password-reset.int.test.ts:204`, `expected 1 to be +0`) |

(M13 foi descartado antes de rodar: `tx.rollback()` lança e mataria o teste por exceção, não por comportamento.)

**Sensor depth**: P0-full (auth; fault-injection manual expandida, sem ferramenta de mutação no projeto)
**Result**: 28/28 killed na execução inicial (nenhum mutante sobreviveu); arquivos mutados inalterados desde `66f202d`. Iteração 1: M30 (UI, `reset-form.tsx:62`) sobreviveu por falta de teste de UI (AD-005), registrado acima

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (login-form só ganhou o link; proxy só ganhou duas exclusões; auth-guard +1 função) |
| No scope creep | ✅ |
| Matches patterns | ✅ (transação como `usersRepo.transition`; `invalidInput`/`SAVE_FAILED`; cartão das páginas igual a login/cadastro) |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ (domínio, validação, mailer unit; repo, ações, guard, auth integração; UI build-only por AD-005) |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (testes extras mapeiam a Done-when: endpoints nativos T11, rollback T7/T9, cache do transporte T5) |
| Documented guidelines followed: `AGENTS.md` (docs do Next 16: `after` em Server Functions conferido em `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md:8`), `vitest.config.ts`, AD-005, L-002 | ✅ |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit` + `DATABASE_URL=postgres://postgres:postgres@localhost:5433/orcamento_senha_test npm run test:int` (Node 20.20.2; build não rodado pelo Verifier, já registrado pelos workers nas tasks de UI)
- **Result**: typecheck exit 0; lint exit 0; unit 722 passed / 0 failed (24 arquivos); integração 500 passed / 0 failed (18 arquivos); 0 skipped (execução inicial e iteração 1, mesmos números)
- **Testes da feature**: 97 novos (repo 29, ação 23, validação 18, mailer 14, e-mail 5, guard 5, auth nativo 3)
- **Test count before/after**: não remedido no commit `07a309d`; nenhum teste existente foi removido no diff da feature (`git diff --stat` só adiciona em arquivos de teste; `auth.int.test.ts` e `auth-guard.int.test.ts` só ganharam blocos)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

(Execução inicial. Fix 1 aplicado como T18, commit `ad62b68`, confirmado na iteração 1.)

### Fix 1: link para `/esqueci-senha` quando o envio volta "Link inválido ou expirado"

- **Root cause**: `src/app/redefinir-senha/reset-form.tsx:55-58` renderiza `generalError` sozinho. O link "Pedir outro link" existe apenas no ramo de token inválido **ao abrir** (`src/app/redefinir-senha/page.tsx:34-41`). Quando o token deixa de valer entre abrir e enviar (expirou, usado em outra aba, substituído por novo pedido, perdeu a corrida), o AC 8 pede a mensagem com link para `/esqueci-senha`, e a tela não oferece esse link.
- **Fix task**: em `reset-form.tsx`, quando `generalError === INVALID_LINK_MESSAGE`, renderizar junto `<Link href="/esqueci-senha">Pedir outro link</Link>` (mesmo texto e estilo da página). Verify: code-read + build gate (UI sem teste automatizado, AD-005). Done when: os dois caminhos de "Link inválido ou expirado" (abertura e envio) mostram o link para `/esqueci-senha`.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SENHA-01 | Implemented | ✅ Verified |
| SENHA-02 | Implemented | ✅ Verified |
| SENHA-03 | Implemented | ✅ Verified |
| SENHA-04 | Implemented | ✅ Verified |
| SENHA-05 | Implemented | ✅ Verified |
| SENHA-06 | Implemented | ✅ Verified |
| SENHA-07 | Implemented | ✅ Verified |
| SENHA-08 | Implemented | ✅ Verified |
| SENHA-09 | Implemented | ✅ Verified (iteração 1: AC 8 fechado por T18) |
| SENHA-10 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (iteração 1 de 3)

**Spec-anchored check**: 27/27 critérios (10 + 10 + 3 ACs, 4 edge cases) com o valor da spec; 0 spec-precision gaps
**Sensor**: 28/28 mutations killed (camadas repo/ação/e-mail/mailer/validação/guard, inalteradas desde `66f202d`); M30 de UI sobreviveu, esperado por AD-005 (UI só por code-read)
**Gate**: typecheck/lint ok; 722 unit + 500 integração passed, 0 failed

**What works**: pedido uniforme (mesma resposta, envio em `after()`, falhas de SMTP e de banco só no log), token como hash com validade de 30 min, invalidação por novo pedido, consumo atômico e concorrente seguro, checagem de status no uso, sessões apagadas sem abrir nova, guard de visitante, endpoints nativos inertes, e link "Pedir outro link" em todos os caminhos de "Link inválido ou expirado".

**Issues found**: nenhum aberto. Execução inicial: P1b AC 8 (link ausente no envio), fechado por T18 (`ad62b68`).

**Next steps**: nenhum fix pendente; UAT manual opcional do fluxo de UI (abrir link vencido, enviar com link usado em outra aba).
