# Sigilo dos Dados: validação (iteração 2)

## Validation: sigilo-dados (iteração 2) - PASS ✅

**Data**: 2026-10-09
**Spec**: `.specs/features/sigilo-dados/spec.md`
**Intervalo de commits**: `5f6e3f5..HEAD` (HEAD = `ba57336`; código das correções em `f165294`; correções revisadas em `30ed719..HEAD`)
**Verifier**: subagente independente (autor ≠ verificador), cobertura reconstruída da spec e do diff, evidência-ou-zero. Iteração 2 de no máximo 3.

**Veredito em uma frase**: as 7 lacunas da iteração 1 estão resolvidas com evidência própria. O gate passa limpo, com duas rodadas de integração verdes. Os 7 mutantes de alto risco reinjetados morrem na suíte do projeto. O único que sobrevive é o de UI (`disabled` sem `hydrated`), coberto por inspeção conforme a AD-005. As pendências restantes são Minor ou Cosmetic e não bloqueiam.

---

## Resumo

| Item | Situação |
| ---- | -------- |
| Requisitos com evidência que bate com a spec | **40/40** ✅ (SIGILO-28 com um desvio aceito: o 307 do proxy sai sem CSP, ver Desvios) |
| Edge cases | 6/6 ✅ |
| Lacunas G1..G7 | 7/7 resolvidas |
| Gate | typecheck ✅, lint ✅, unit **1121/1121** ✅, build ✅, integration **645/645** ✅ nas duas rodadas |
| Sensor | 8 mutações. 7 mortas pela suíte do projeto. 1 de UI sem teste no projeto (AD-005), morta só pelo teste SSR temporário do Verifier |
| `validate_state.py sigilo-dados` | exit 0 |

---

## Situação das lacunas da iteração 1

| Lacuna | Commit | Situação | Evidência própria |
| ------ | ------ | -------- | ----------------- |
| G1 (Major): senha real na URL antes da hidratação | `2da2bda` | ✅ Resolvida | `src/components/use-hydrated.ts:9-15`: `useSyncExternalStore` com snapshot de servidor `false` e de cliente `true`. Login: `src/app/login/login-form.tsx:39` `preventDefault()` na primeira linha, sem condição; `:70` `<form method="post">`; `:97` `disabled={!hydrated \|\| pending \|\| deriving}`. Cadastro: `src/app/cadastro/signup-form.tsx:33`, `:94`, `:174`. Proteger dados: `src/app/proteger-dados/protect-form.tsx:35`, `:84`, `:110`. **SSR conferido** com `renderToString` num teste vitest temporário no worktree descartável: os três formulários saem `<form class="space-y-4" method="post">` e o único `type="submit"` sai `disabled=""`. O outro botão é o olho do `PasswordInput`, `type="button"` (`src/components/password-input.tsx:18`), então não vira botão padrão. Com o botão padrão desabilitado, o Enter não faz envio implícito. Mesmo num envio nativo hipotético, `method="post"` põe a senha no corpo, nunca na query string. Outros formulários com senha: `unlock-screen.tsx` só aparece depois do efeito (`vault-provider.tsx:75` começa em `loading`, `:92` mostra o esqueleto); `delete-account-dialog.tsx:31` começa fechado, então o `<form>` não existe no SSR; `reset-form.tsx:32` começa em `loading` e `:247` desabilita o botão nesse estado |
| G2 (Major): mutante M04 sobrevivia | `45e67d8` | ✅ Resolvida | M04 reinjetado (`src/lib/crypto/kdf.ts:30`, `info` `orcamento/kek/v1` → `orcamento/auth/v1`): **morto**. Falham os 3 testes de `src/lib/crypto/kdf.test.ts:74`, `:81`, `:88` (`decryptField(kek, ...)` `toBe("segredo")` com a referência HKDF `orcamento/kek/v1`; `rejects.toBeInstanceOf(DecryptError)` com os bytes do `authSecret` e com o `info` de login) |
| G3 (Minor): menu "Privacidade" apontava para `/conta` | `dffeffb` | ✅ Resolvida | `src/components/app-nav.tsx:13` `{ href: "/privacidade", label: "Privacidade" }`; `:12` item novo `{ href: "/conta", label: "Conta" }` |
| G4 (Minor): `consume` aceitava conta com cofre | `2edf4af` | ✅ Resolvida | `src/lib/db/repos/password-resets.ts:101-106`: `leftJoin(userVault)` e `if (owner.hasVault) throw new Rollback()`, convertido em `"invalid"` em `:122`. O token fica válido. Repositório: `src/lib/db/repos/password-resets.sealed.int.test.ts:339` (hash, sessões, cofre, dados e token iguais; `verifyPassword` da senha real `false`). Ação: `src/actions/password-reset.int.test.ts:717` `toEqual(INVALID_LINK)`. Reset legado intacto: `password-resets.sealed.int.test.ts:362` e `password-reset.int.test.ts:497` passam |
| G5 (Minor): CSP fora de `api/auth`, estáticos e imagens | `7ebf989` | ✅ Resolvida (com desvio aceito, ver abaixo) | `src/lib/security-headers.ts:88` `STATIC_CSP`; `:94-100` `PATHS_OUTSIDE_PROXY`; `:105-113` `securityHeaderRules`; `next.config.ts:9`. Testes: `src/lib/security-headers.test.ts:73` (regras exatas), `:94` (sem CSP na regra `/:path*`), `:113-131` (páginas só no proxy, caminhos de fora só na estática, com o mesmo `getPathMatch` do Next). **Servidor real** (`next build` + `next start -p 3125`, `DATABASE_URL` no banco privado, encerrado depois): `GET /login` e `GET /privacidade` têm **uma** CSP, com nonce. `GET /api/auth/get-session` (200), `POST /api/auth/sign-in/email` (400), `/_next/static/chunks/3mc6dra1m0098.js` e `/icon.svg` têm `default-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`. O 307 de `/conta` com cookie inválido tem CSP e `cache-control: no-store`. O 307 de `/` sem cookie sai sem CSP (resposta do próprio proxy, `src/proxy.ts:19`) |
| G6 (Minor): migração de conta sem dados sem teste | `d146a41` | ✅ Resolvida | `src/lib/db/repos/legacy.commit.int.test.ts:219-244`: pacote vazio `toEqual` listas vazias; `commitMigration` `toBe("ok")`; cofre `toMatchObject({...VAULT, birthDateCt: null})`; hash verifica o `authSecret` e não a senha antiga; `isLegacy` `false` |
| G7 (Minor): `rawRows` sem `ORDER BY` | `20beecb` | ✅ Resolvida | `legacy.commit.int.test.ts:62-80` e `src/actions/legacy.int.test.ts:83-99` com `orderBy(asc(...id))` em toda lista com mais de uma linha. Passou nas duas rodadas da suíte |

---

## Gate Check

- **Comandos**: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `npm run test:int` duas vezes (Node 20.20.2).
- **Banco**: privado `orcamento_sigilo_verifier_test`, via `DATABASE_URL` no shell. Conferido pelo nome impresso.
- **Saídas**: typecheck exit 0. Lint exit 0. Unit: 49 arquivos, **1121 passed**. Build exit 0 (`/privacidade` dinâmica, Proxy ativo). Integration rodada 1: 31 arquivos, **645 passed** (116,07 s). Rodada 2: 31 arquivos, **645 passed** (116,12 s).
- **Skipped**: nenhum.
- **Contagem**: 1097 → 1121 unit (+24: 3 em `kdf.test.ts` e 21 em `security-headers.test.ts`). 641 → 645 integration (+4: G4 repositório ×2, G4 ação, G6). Nenhum teste removido e nenhuma asserção enfraquecida no diff `30ed719..HEAD`.
- **`finalize-vault.int.test.ts` (timeout relatado numa rodada anterior)**: não falhou aqui. Passou nas duas rodadas e em mais 2 rodadas isoladas, com 224 ms, 50 ms, 34 ms e 14 ms por teste. Diagnóstico: um teste que leva cerca de 0,2 s só chega a 8 s se esperar um bloqueio. `finalizeVault` faz `LOCK TABLE "user", user_vault IN SHARE MODE` (`scripts/finalize-vault.ts:75`) e depois `ALTER TABLE` (ACCESS EXCLUSIVE). Dentro da suíte, isso não disputa bloqueio com o pool de outros arquivos. A integração roda com `fileParallelism: false` e `maxWorkers: 1` (`vitest.config.ts`). Cada arquivo encerra o pool em `afterAll` (`src/test/db.ts:12`). Dentro do arquivo, o corpo de `inRolledBackTx` só usa `tx`, e as conexões ociosas do pool não têm bloqueio. A explicação compatível é uma **sessão externa no mesmo banco**: outra sessão de teste ou um `next dev` apontado para ele, com transação aberta ou leitura longa. Isso bastaria para o `ALTER TABLE` esperar. **Classificação: instabilidade de infraestrutura, não defeito do produto.** O script do operador roda sozinho e esperar o bloqueio é o comportamento correto. Sugestão opcional: `SET LOCAL lock_timeout` no script, para falhar rápido em vez de ficar parado.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ bate com a spec; ⚠️ parcial; ❌ lacuna. "Insp." = inspeção de código (UI e config, AD-005). Linhas reconferidas após as correções. A linha de `log.test.ts` foi corrigida: o relatório anterior citava `:69-96`, que não existe.

### P1: Dados cifrados no navegador

| Req | Resultado definido pela spec | Evidência (`file:line` + asserção) | Situação |
| --- | ---------------------------- | ---------------------------------- | -------- |
| SIGILO-01 | Só `v1:<base64url>` AES-256-GCM; nenhuma coluna com o valor original | `src/lib/crypto/aead.test.ts:24` `toMatch(/^v1:[A-Za-z0-9_-]+$/)`; `transactions.sealed.int.test.ts:48-53`; `categories.sealed.int.test.ts:242-250`; `goals.sealed.int.test.ts:69-72`; `vault.int.test.ts:309-313`; conta migrada: `legacy.commit.int.test.ts:93-124` (`amountCents`, `description`, `name`, `percentMicro`, `owner.birthDate` `toBeNull()`) | ✅ |
| SIGILO-02 | Servidor nunca recebe senha, KEK, DEK, chave de recuperação nem texto puro | `src/lib/vault/create-vault.test.ts:34-56` `not.toContain` para senha, DEK, chave e data; `kdf.test.ts:74,81,88` (separação KEK × `authSecret`, M04 morto); `legacy-package.test.ts:152-175`; `seal.test.ts:50-57`. Insp. G1: `login-form.tsx:39,70,97`, `signup-form.tsx:33,94,174`, `protect-form.tsx:35,84,110`, SSR conferido. Reforço G4: `password-resets.sealed.int.test.ts:339` | ✅ (era ❌) |
| SIGILO-03 | Decifra devolve exatamente o valor | `aead.test.ts:21-26` `toBe(plaintext)`; `open.test.ts:109-113`, `:185-193` | ✅ |
| SIGILO-04 | Dois textos cifrados diferentes | `aead.test.ts:28-33` `not.toBe(b)` | ✅ |
| SIGILO-05 | Cópia para outra linha, coluna ou usuário falha | `aead.test.ts:35-43` `rejects.toBeInstanceOf(DecryptError)`; `wrap.test.ts:29-33`; `legacy-package.test.ts:143-149`; AAD em `src/lib/vault/seal.ts:7-18` (mutante AAD vazio morto, 17 falhas) | ✅ |
| SIGILO-06 | Tag GCM falha: nada parcial e "Não foi possível carregar seus dados. Tente novamente" | `open.test.ts:150-161` `rejects.toBeInstanceOf(DecryptError)`. Insp.: `src/components/load-error.ts:2`; `use-opened.ts:29-30` | ✅ |
| SIGILO-07 | Totais iguais ao cálculo anterior, em centavos | `month-totals.test.ts:27-32` `toBe(620000)`; `:63-94` `toBe(50049)`, `toBe(569951)` | ✅ |
| SIGILO-08 | Busca e filtros devolvem as mesmas transações | `open.test.ts:164-172` `toEqual(["t4"])` | ✅ |
| SIGILO-09 | Fora de faixa: recusa antes de cifrar, mesma mensagem | Insp.: `transaction-form.tsx:163-178`, `category-editor.tsx:266-291`, `goal-form.tsx:49-57`, `birth-date-form.tsx:64-78` (schemas de domínio antes de `seal*`) | ✅ |
| SIGILO-10 | Formato inválido ou > 2048: `SAVE_FAILED`, nada gravado | `ciphertext.test.ts:12-18`; `transactions-sealed.int.test.ts:176-197` | ✅ |

### P1: Senha única, chave de recuperação e desbloqueio

| Req | Resultado definido pela spec | Evidência | Situação |
| --- | ---------------------------- | ---------- | -------- |
| SIGILO-11 | Cadastro envia só `authSecret`, salt, parâmetros, DEK embrulhada 2x e nascimento cifrado | `create-vault.test.ts:34-56` (chaves exatas), `:78-88`; `auth.int.test.ts:246-259` `toMatchObject`; `kdf.test.ts:74` (a KEK usada no embrulho é a de `orcamento/kek/v1`). Insp.: `signup-form.tsx:49-70`, envio só após `preventDefault` (`:33`) | ✅ |
| SIGILO-12 | Só o hash do Better Auth | `users.sealed.int.test.ts:63-72` `not.toContain(authSecret)`; `auth.int.test.ts:258` | ✅ |
| SIGILO-13 | Senha correta: deriva, abre sessão, desembrulha, abre o app | `unlock-vault.test.ts:18-23`, `:54-58`; `auth.int.test.ts:261-270`. Insp.: `login-form.tsx:49-59`, `vault-provider.tsx:36-58` | ✅ |
| SIGILO-14 | "E-mail ou senha inválidos" sem indicar qual | `auth.int.test.ts:64-72` `toEqual(INVALID)` | ✅ |
| SIGILO-15 | Chamariz determinístico no mesmo formato | `vault.int.test.ts:230-256`; `src/actions/vault.int.test.ts:39-49` | ✅ |
| SIGILO-16 | DEK não extraível no IndexedDB; "Sair" remove | `device-key.test.ts:50-58`, `:104-117` `extractable` `false`. Insp.: `sign-out-button.tsx:11`, `login-form.tsx:25-27` | ✅ |
| SIGILO-17 | Sem DEK: "Desbloquear", nenhuma tela com dados | `unlock-vault.test.ts:26-32`. Insp.: `vault-provider.tsx:92-96` | ✅ |
| SIGILO-18 | Chave exibida uma vez; "Continuar" só após marcar | `create-vault.test.ts:69-75`. Insp.: `recovery-key-dialog.tsx:79` rótulo exato, `:81` `disabled={!saved}` | ✅ |

### P1: Redefinir a senha sem perder dados

| Req | Resultado definido pela spec | Evidência | Situação |
| --- | ---------------------------- | ---------- | -------- |
| SIGILO-19 | Com a chave: reembrulha; troca segredo, DEK e token numa transação; encerra sessões | `recover-vault.test.ts:18-36`; `password-resets.sealed.int.test.ts:160-191` (hash novo, `dekWrappedPw` novo, `verification` `toHaveLength(0)`, sessões `0`); `password-reset.int.test.ts:536-603`. G4: a rota de senha real fica fechada para conta com cofre (`password-resets.ts:106`, teste `password-resets.sealed.int.test.ts:339`) | ✅ |
| SIGILO-20 | "Chave de recuperação inválida", nada alterado | `recover-vault.test.ts:53-80`. Insp.: `reset-form.tsx:17`, `:109-122` | ✅ |
| SIGILO-21 | `APAGAR MEUS DADOS`: apaga, gera chaves novas, nova senha numa transação | `password-resets.sealed.int.test.ts:210-240`; `vault.int.test.ts:176-212`. Insp.: `reset-form.tsx:19`, `:146` | ✅ |

### P1: Migração das contas existentes

| Req | Resultado definido pela spec | Evidência | Situação |
| --- | ---------------------------- | ---------- | -------- |
| SIGILO-22 | Conta legada entra pelo fluxo atual; app redireciona a `/proteger-dados` | `vault.int.test.ts:258-262`; `src/actions/vault.int.test.ts:51-56` `{ mode: "legacy" }`. Insp.: `login-form.tsx:60-62`; `src/app/(app)/layout.tsx:19` | ✅ |
| SIGILO-23 | Pacote numa transação: troca o hash, grava cifrado, remove o texto puro | `legacy.commit.int.test.ts:84-131` (`isLegacy` `false` em `:130`); `src/actions/legacy.int.test.ts:180-203` (`toBeNull()` em `:188-196`) | ✅ |
| SIGILO-24 | Falha: rollback, conta legada intacta | `legacy.commit.int.test.ts:176-186` (`isLegacy` `true` em `:185`); `:142-174`; `legacy.int.test.ts:325-337` | ✅ |
| SIGILO-25 | `finalizar-cifra` remove sem legada; recusa com legada | `finalize-vault.int.test.ts:113-130` `rejects.toThrow(/2 conta\(s\) sem cofre/)` e esquema igual; `:132-201`; `:203-215` | ✅ |

### P1: Sem vazamento operacional

| Req | Resultado definido pela spec | Evidência | Situação |
| --- | ---------------------------- | ---------- | -------- |
| SIGILO-26 | Log só com nome da ação e `code` | `src/lib/log.test.ts:7-15` `toHaveBeenCalledWith("createCategory", "23505")`, `:28`; `account.int.test.ts:163`; `legacy.int.test.ts:336` | ✅ |
| SIGILO-27 | `nosniff`, `DENY`, `strict-origin-when-cross-origin`; HSTS só em produção | `security-headers.test.ts:16-20` valores exatos; `:22-29` HSTS. Insp.: `security-headers.ts:107` regra `/:path*`. Servidor real: os 4 cabeçalhos em `/login`, `/api/auth/get-session`, chunk, `/icon.svg` e no 307 | ✅ |
| SIGILO-28 | CSP em toda resposta com `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `script-src` sem origem externa | `security-headers.test.ts:35-46` (nonce); `:73-92`, `:113-131`, `:134-141` (estática: `default-src 'none'` implica `script-src 'none'`). Servidor real: uma CSP por resposta em páginas, API de auth, chunks e imagens | ✅ (desvio aceito: o 307 gerado em `src/proxy.ts:19` não leva CSP; ver Desvios, Cosmetic) |
| SIGILO-29 | `Cache-Control: no-store` na área logada | Insp.: `src/proxy.ts:17,32`. Servidor real: o 307 de `/conta` com cookie traz `cache-control: no-store` | ✅ |

### P1: Política de privacidade pública

| Req | Resultado definido pela spec | Evidência | Situação |
| --- | ---------------------------- | ---------- | -------- |
| SIGILO-30 | `/privacidade` sem sessão, sem redirecionar | Insp.: `src/proxy.ts:5`. Servidor real: `GET /privacidade` sem cookie dá 200 | ✅ |
| SIGILO-31 | Lista o que é cifrado ou não, exportar e excluir | Insp.: `src/app/privacidade/page.tsx:33-48`, `:56-63` | ✅ |
| SIGILO-32 | Frase exata | `page.tsx:8-9` (`SEALED`) | ✅ |
| SIGILO-33 | Frase exata | `page.tsx:10-11` (`NO_RECOVERY`) | ✅ |
| SIGILO-34 | Frase exata | `page.tsx:12-13` (`LIMIT`) | ✅ |
| SIGILO-35 | Link "Privacidade" em `/login`, `/cadastro` e no menu, para `/privacidade` | Insp.: `login-form.tsx:109`, `signup-form.tsx:178`, `src/components/app-nav.tsx:13` | ✅ (era ❌) |

### P2: Exportar e excluir

| Req | Resultado definido pela spec | Evidência | Situação |
| --- | ---------------------------- | ---------- | -------- |
| SIGILO-36 | `orcamento-dados-AAAA-MM-DD.json` (America/Sao_Paulo), tudo decifrado | `export.test.ts:76-135`; `:155-160` `toBe("orcamento-dados-2026-12-31.json")` | ✅ |
| SIGILO-37 | Sem sessão: nada; com sessão: só as linhas do usuário | `account.int.test.ts:80-87`, `:89-97`, `:99-122`; `export.int.test.ts:76` (M07 morto) | ✅ |
| SIGILO-38 | Apaga tudo, remove a DEK, vai para `/login` | `account.int.test.ts:226-242` `toEqual(ZERO)`. Insp.: `delete-account-dialog.tsx:55-57` | ✅ |
| SIGILO-39 | Senha errada: "Senha incorreta", nada apagado | `account.int.test.ts:244-253` (M08 morto) | ✅ |
| SIGILO-40 | Administrador recusado com a mensagem fixa | `account.int.test.ts:255-266` | ✅ |

**Status**: ✅ 40/40.

---

## Edge Cases

- [x] Descrição `NULL` continua `NULL`: `transactions.sealed.int.test.ts:67-74`, `seal.test.ts:40-47`.
- [x] Data de nascimento `NULL` continua `NULL`: `open.test.ts:195-197`, `users.sealed.int.test.ts:93`.
- [x] Dados do navegador limpos com sessão ativa: SIGILO-17. Insp.: `vault-provider.tsx:37-41`, `:94-96`.
- [x] Senha e chave perdidas: só o reinício de SIGILO-21. `recover-vault.test.ts:53-80`; Insp.: `reset-form.tsx:182-225`.
- [x] Migração de conta legada sem dados: `legacy.commit.int.test.ts:219-244` (era ⚠️, G6).
- [x] Exportação sem dados: `export.test.ts:137-151`, `export.int.test.ts:136`.

---

## Discrimination Sensor

Worktree descartável `../orcamento-verifier-scratch` (HEAD `ba57336`), `node_modules` por link simbólico, `.env`/`.env.test` copiados, banco privado. Uma mutação por vez, com `git checkout` do arquivo depois de cada rodada. A worktree foi removida no fim. O `git status --porcelain` da árvore real ficou idêntico ao baseline; o único arquivo alterado depois disso é este relatório.

| # | Arquivo:linha | Mutação | Desfecho |
| - | ------------- | ------- | -------- |
| M04 | `src/lib/crypto/kdf.ts:30` | KEK com `info` `orcamento/auth/v1` | ✅ Morta: `kdf.test.ts:74,81,88` (3 falhas) |
| M01 | `src/lib/crypto/aead.ts:24,41` | AAD vazio em cifrar e decifrar | ✅ Morta: 17 falhas (`aead.test.ts` linha/coluna/usuário, `wrap.test.ts`, `legacy-package.test.ts`) |
| M07 | `src/lib/db/repos/export.ts:30` | Exportação sem filtro de `userId` | ✅ Morta: `export.int.test.ts:76`, `account.int.test.ts:99` |
| M08 | `src/actions/account.ts:60` | `deleteAccountAction` não confere a senha | ✅ Morta: `account.int.test.ts:244`, `:268` |
| M18 | `scripts/finalize-vault.ts:80` | `finalizeVault` pula a checagem de conta legada | ✅ Morta: `finalize-vault.int.test.ts:113` |
| M31 | `src/lib/db/repos/password-resets.ts:106` | `consume` sem a guarda de cofre (código novo, G4) | ✅ Morta: `password-resets.sealed.int.test.ts:339`, `password-reset.int.test.ts:717` |
| M32 | `src/lib/db/repos/password-resets.ts:103` | `leftJoin` → `innerJoin` (quebra o reset legado) | ✅ Morta: 8 falhas, entre elas `password-reset.int.test.ts:497` (reset legado) e `password-resets.sealed.int.test.ts:362` |
| M33 | `src/app/login/login-form.tsx:97` | `disabled` ignora `hydrated` (código novo, G1) | ⚠️ Sem teste no projeto, coberto só por inspeção (AD-005). Morta pelo teste SSR temporário do Verifier (`renderToString`), apagado com o scratch |

**Profundidade**: P0 (autenticação e integridade de dados). 8 mutações, que se somam às 28 da iteração 1.
**Sensor**: 7/7 mortas entre as cobertas por teste. Uma mutação de UI fica coberta só por inspeção, como prevê a AD-005. Ver lacuna remanescente R1.

---

## Regressões das correções (diff `30ed719..HEAD`)

| Ponto | Conclusão |
| ----- | --------- |
| Botão desabilitado até hidratar | Sem regressão. `useSyncExternalStore` com `getServerSnapshot` `false`: na hidratação, o React usa o snapshot de servidor e logo renderiza de novo com `true`. Na navegação no cliente (link de `/cadastro` para `/login`), não há hidratação e o valor já nasce `true`. Se o JS não carregar, o botão fica desabilitado: falha segura, e o app depende de JS para cifrar de qualquer forma |
| Fluxo ponta a ponta | Login (`login-form.tsx:38-67`): `preventDefault`, parâmetros, derivação, KEK pendente, `authSecret` no lugar da senha, `formAction`. O caminho legado envia a senha (SIGILO-22). Cadastro (`signup-form.tsx:32-78`) e proteger dados (`protect-form.tsx:34-81`) inalterados além de `method`, `hydrated` e `disabled`. Testes de ação e repositório desses fluxos passam |
| CSP duplicada | Não há duplicação. A regra `/:path*` não tem CSP (`security-headers.test.ts:94`). Os conjuntos proxy × estática são disjuntos (`:113-131`). No servidor real, `/login` e `/privacidade` têm exatamente uma CSP |
| Item "Conta" no menu | Funciona: `/conta` continua acessível (`app-nav.tsx:12`). São 5 itens (6 para o admin) na barra inferior do celular, com texto de 10 px. Cosmetic |
| `consume` com `leftJoin` | O reset legado passa (`password-reset.int.test.ts:497`, `password-resets.sealed.int.test.ts:362`). `user_vault` tem chave em `user_id`, então o join devolve no máximo uma linha. O caso de dono não aprovado continua consumindo o token, como antes |

---

## Desvios avaliados

| # | Desvio | Contraria a spec? | Gravidade |
| - | ------ | ----------------- | --------- |
| i | 307 gerado pelo próprio proxy (`src/proxy.ts:19`, visitante sem cookie) sai sem CSP | Literalmente, sim: SIGILO-28 diz "toda resposta". Na prática, não: um redirecionamento sem corpo não cria documento, e o navegador aplica a CSP da página de destino (`/login`, que tem a CSP com nonce). O objetivo do requisito, impedir script injetado que roube a senha, não é afetado | Cosmetic. Aceito; registrar em `STATE.md` se quiserem fechar a letra |
| ii | Caminhos que o lookahead do matcher exclui por prefixo (por exemplo `/api/authx`, `/_next/staticfoo`, `/favicon.icox`) não recebem CSP do proxy nem da regra estática | Só em respostas 404 de rotas inexistentes | Cosmetic |
| iii | `/privacidade` fica fora do grupo `(app)` e não mostra o menu | Não. SIGILO-35 só pede o link | Cosmetic |
| iv | T87 adiada; o reset legado segue em `consume` | Não. G4 fecha a conta com cofre. Resíduo: se uma conta migrar enquanto a tela de reset está aberta no modo legado, o navegador ainda envia a senha real a `resetPasswordAction`. Agora ela é recusada e nada é gravado | Minor (informativo) |
| v | Um `form.submit()` programático, por exemplo de extensão, ignora `onSubmit` e o botão desabilitado | Fora do controle do app. Com `method="post"`, a senha iria no corpo de um POST para a própria origem (`form-action 'self'`), nunca na URL | Informativo |
| vi | Desvios i a ix da iteração 1 que seguem valendo (migração `0015`, `birth_date_ct` em `user_vault`, T47a, NASC-13, `current` do `sealCategorySet`, duplicação de mensagens) | Não | Nenhuma / Cosmetic |

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo, sem abstração de uso único | ✅ (`useHydrated` tem 15 linhas e é usado por 3 formulários) |
| Mudanças cirúrgicas | ✅ (15 arquivos, cada um ligado a uma lacuna) |
| Sem escopo extra | ✅ |
| Segue os padrões (`Rollback` reaproveitado de `consumeSealed`) | ✅ |
| Asserções batem com o resultado da spec | ✅ |
| Cobertura por camada | ✅, exceto o gating de hidratação, que é UI (AD-005) |
| Todo teste novo mapeia para lacuna, AC ou edge case | ✅ |
| Diretrizes: `AGENTS.md` (AD-005), `.specs/STATE.md`, matriz de `tasks.md` | ✅ |

---

## Lacunas remanescentes (ranqueadas, nenhuma bloqueia)

1. **R1 (Minor, teste)**: o gating `hydrated` dos três formulários não tem teste no projeto (M33). Um teste unit `.test.ts` com `renderToString`, mockando as ações e conferindo `method="post"` e `type="submit"` com `disabled=""`, mata o mutante sem jsdom. É o que o Verifier usou de forma temporária. Opcional pela AD-005.
2. **R2 (Minor, infraestrutura)**: risco de timeout em `finalize-vault.int.test.ts` quando outra sessão usa o mesmo banco de teste. Mitigação: banco privado por sessão (já é a prática) e, opcionalmente, `SET LOCAL lock_timeout` em `finalizeVault`.
3. **R3 (Cosmetic)**: 307 do proxy sem CSP (desvio i). Registrar a decisão em `STATE.md` ou anexar `STATIC_CSP` ao `NextResponse.redirect` em `src/proxy.ts:19`.
4. **R4 (Cosmetic)**: barra inferior com 5 ou 6 itens no celular; `/privacidade` sem o menu.

---

## Requirement Traceability Update

| Requisito | Situação |
| --------- | -------- |
| SIGILO-01 a SIGILO-40 | ✅ Verified (SIGILO-28 com o desvio i aceito como Cosmetic) |

---

## Summary

**Overall**: ✅ Pronto. As 7 lacunas foram resolvidas e conferidas com evidência própria: SSR renderizado, servidor de produção consultado com `curl` e mutantes reinjetados.

**Próximo passo**: opcionalmente, R1 como reforço de teste e R3 como registro em `STATE.md`. Nenhuma nova iteração do Verifier é necessária.
