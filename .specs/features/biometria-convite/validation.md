# Convite para o Bloqueio por Biometria Validation

**Date**: 2026-11-01
**Spec**: `.specs/features/biometria-convite/spec.md`
**Diff range**: `5e68b7d..HEAD` (679d9cf), 10 commits T1-T10
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: PASS

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 textos | Done | eb532e6 |
| T2 invite-store | Done | fe6cd55 |
| T3 inviteStore no navegador | Done | 8fad66a |
| T4 invite-policy | Done | ea29c77 |
| T5 activateBiometric | Done | a246ae3 |
| T6 card usa helper + recusa ao desativar | Done | 03b558c |
| T7 BiometricInvite | Done | ec30c7a |
| T8 layout | Done | 3cdcf57 |
| T9 limpar ao excluir conta | Done | c128a4f |
| T10 checklist no runbook | Done | 679d9cf (`docs/hospedagem-gratuita.md:247-250`) |

Obs.: o cabecalho de `tasks.md` ainda diz `Status: Draft` (cosmetico, nao afeta o verdito).

---

## Spec-Anchored Acceptance Criteria

Camadas: dominio `src/lib/biometric/**` = unit (assertion citada); componentes/paginas = none (AD-005), evidencia por `file:line` do codigo.

| AC | Spec-defined outcome | `file:line` + assertion / codigo | Result |
| -- | -------------------- | -------------------------------- | ------ |
| INVITE-01 politica | `true` com suporte, sem lock, sem recusa, fora de `/conta` | `src/lib/biometric/invite-policy.test.ts:8-9` - `expect(shouldShowInvite(eligible)).toBe(true)` e `{...eligible, pathname:"/transacoes"}` `.toBe(true)` | PASS |
| INVITE-01 textos | "Proteger com biometria?", "Peça a biometria do aparelho ao abrir o app. Você pode mudar isso depois em Privacidade e conta.", "Agora não", "Ativar" | `src/lib/biometric/text.test.ts:22-27` - `expect(LOCK_TEXT.inviteTitle).toBe("Proteger com biometria?")`, `inviteText` `.toBe("Peça a biometria ... Privacidade e conta.")`, `dismiss` `.toBe("Agora não")`; "Ativar" = `LOCK_TEXT.enable`, `text.ts:11`, assertado no teste preexistente de LOCK-xx (`text.test.ts`, `enable`); renderizados em `src/components/biometric-invite.tsx:74,76,79,87`; banner acima do conteudo: `src/app/(app)/layout.tsx:46` antes de `{children}` (:47) | PASS |
| INVITE-02 | sem suporte, sem convite | `invite-policy.test.ts:14` - `expect(shouldShowInvite({...eligible, supported:false})).toBe(false)`; `biometric-invite.tsx:28-33` usa `biometricSupport` | PASS |
| INVITE-03 | com lock, sem convite | `invite-policy.test.ts:17` - `expect(shouldShowInvite({...eligible, hasLock:true})).toBe(false)`; `biometric-invite.tsx:33` `lockStore.read(userId) !== null` | PASS |
| INVITE-04 | com recusa do usuario, sem convite | `invite-store.test.ts:46` - `expect(store.isDismissed("user-1")).toBe(true)`; `invite-policy.test.ts:21` - `dismissed:true` `.toBe(false)`; `lock-store.client.test.ts:53` - `expect(inviteStore.isDismissed("user-1")).toBe(true)` | PASS |
| INVITE-05 | `/conta` e subcaminhos sem convite | `invite-policy.test.ts:25-27` - `/conta`, `/conta/`, `/conta/privacidade` todos `.toBe(false)`; `invite-policy.ts:14` | PASS |
| INVITE-06 | `navigator.credentials` so no toque em "Ativar" | UI none: `biometric-invite.tsx:26-42` (efeito: so `biometricSupport(window)`, `lockStore.read`, `inviteStore.isDismissed`); `navigator.credentials` unico uso em `:49`, dentro de `enable()` (:45) ligada a `onClick` de "Ativar" (:78) | PASS |
| INVITE-07 | enrola com opcoes LOCK-03, salva `{userId, credentialId}`, remove o convite | `activate.test.ts:34-45` - `expect(result).toBe(true)`, `store.save.mock.calls[0]).toEqual(["user-1", toBase64Url(RAW_ID)])`, `authenticatorSelection` `.toEqual({platform, required, discouraged})`, `rp` `.toEqual({name:"ANON", id:"anon.example.com"})`, `user.id`, `challenge`, `timeout` `.toBe(60000)`; remove o convite: `biometric-invite.tsx:55` `setVisible(false)` | PASS |
| INVITE-08 | falha/cancelamento/timeout/save falso: mantem o convite, "Não foi possível ativar a biometria. Tente novamente.", sem recusa | `activate.test.ts:54-55` (it.each rejection/cancellation/null) - `expect(await activateBiometric(...)).toBe(false)` + `expect(store.save).not.toHaveBeenCalled()`; `:59-63` save `false` -> `.toBe(false)`; texto `text.ts:5` e `text.test.ts` (`enrollFailed`, preexistente, literal conferido); UI: `biometric-invite.tsx:56` `setFailed(true)` sem `inviteStore.dismiss`, convite mantido (`visible` nao muda), mensagem `:92` | PASS |
| INVITE-09 | "Agora não" grava `{userId}` e remove o convite | `invite-store.test.ts:23-24` - `expect(dismiss("user-1")).toBe(true)`, `JSON.parse(...)).toEqual({userId:"user-1"})`; UI `biometric-invite.tsx:62-63` `inviteStore.dismiss(userId)` + `setClosed(true)` | PASS |
| INVITE-10 | leitura falha: sem convite | `invite-store.test.ts:65` - `getItem` lanca -> `expect(isDismissed("user-1")).toBe(true)`; `:77-81` JSON invalido -> `.toBe(true)`; `invite-store.ts:20-22` | PASS |
| INVITE-11 | escrita falha: convite some nesta carga | `invite-store.test.ts:39` - `setItem` lanca -> `expect(dismiss("user-1")).toBe(false)`; UI `biometric-invite.tsx:62-63` ignora o retorno e `setClosed(true)` incondicional; `:66` `if (!visible \|\| closed) return null` | PASS |
| INVITE-12 | recusa de outro userId = nao recusou | `invite-store.test.ts:56` - `dismiss("user-1")`; `expect(store.isDismissed("user-2")).toBe(false)`; `lock-store.client.test.ts:53` - `isDismissed("user-2")).toBe(false)` | PASS |
| INVITE-13 | "Desativar" grava a recusa | UI none: `src/components/biometric-card.tsx:53` `lockStore.clear()`, `:55` `inviteStore.dismiss(userId)`; funcao coberta por INVITE-09 | PASS |
| INVITE-14 | excluir conta remove a recusa | `invite-store.test.ts:79-80` - `store.clear(); expect(storage.data.has(INVITE_KEY)).toBe(false)` e `isDismissed("user-1")).toBe(false)`; UI `src/components/delete-account-dialog.tsx:58` `inviteStore.clear()` apos `lockStore.clear()` (:57) so no caminho de sucesso; sair da conta nao limpa: `src/components/sign-out-button.tsx:12-13` so `deviceKey.clear()` e `lockStore.clear()` | PASS |
| INVITE-15 | recusa so no aparelho; registro so `userId` | `invite-store.test.ts:30` - `expect(Object.keys(JSON.parse(...))).toEqual(["userId"])`; chave `invite-store.test.ts:18` - `expect(INVITE_KEY).toBe("anon-biometric-invite-dismissed")`; `lock-store.client.test.ts:53` - JSON no `localStorage` `.toEqual({userId:"user-1"})`; grep em `biometric-invite.tsx`, `invite-*.ts`, `activate.ts` por sentry/fetch/cookie/action: nenhuma ocorrencia | PASS |

**Edge cases**

- [x] Convite + relock (>60 s): `src/components/biometric-gate.tsx:55-65` devolve `LockScreen` no lugar de `children`; `BiometricInvite` e filho de `BiometricGate` (`layout.tsx:45-47`), logo desmonta enquanto bloqueado.
- [x] Ativar em `/conta` e navegar: o efeito de `biometric-invite.tsx:26-42` relê a cada `pathname`; `lockStore.read` volta nao-nulo -> `shouldShowInvite` `false` (`invite-policy.test.ts:17`).

**Revisao adversarial da UI**

- SSR: `useState(false)` (`biometric-invite.tsx:19`); storage e `biometricSupport` so em `useEffect` (:26-42); `lockStore`/`inviteStore` usam `lazyStorage` (`lock-store.client.ts:14-18`, teste de import `lock-store.client.test.ts:28-33`). OK.
- Corrida: `cancelled` no cleanup do efeito (:27,40). OK.
- `BiometricCard`: mudanca de comportamento visivel nula; `enable` equivale ao anterior (`enrollBiometric` + `lockStore.save` -> `activateBiometric`, `biometric-card.tsx:40-48`); unica adicao e `inviteStore.dismiss` em `disable` (:55).
- Dentro do `BiometricGate`: `layout.tsx:45-47`.
- Nada ao servidor: componente sem Server Action/fetch/Sentry.

**Spec-precision gaps**: nenhum. Textos, chave, forma do registro e caminhos estao exatos na spec e assertados por valor. Observacao nao bloqueante: INVITE-06, 13, 14 (UI) e a parte de UI de 08/11 nao tem teste automatico (AD-005), cobertos por inspecao.

**Status**: todos os 15 ACs e 2 edge cases cobertos.

---

## Discrimination Sensor

Scratch: `git worktree add --detach` em diretorio temporario do scratchpad com `node_modules` por symlink; testes: invite-store, invite-policy, activate, text, lock-store.client. Arvore real intocada.

| # | File | Mutacao | Killed? |
| - | ---- | ------- | ------- |
| 1 | `invite-policy.ts:16` | ignora `dismissed` | Killed (`invite-policy.test.ts` INVITE-04) |
| 2 | `invite-policy.ts:16` | ignora `hasLock` | Killed (INVITE-03) |
| 3 | `invite-policy.ts:15` | `/conta` sem subcaminho | Killed (INVITE-05) |
| 4 | `invite-policy.ts:15` | sem `pathname === "/conta"` (so prefixo `/conta/`) | Killed (INVITE-05) |
| 5 | `invite-store.ts:15` | `isDismissed` true para outro usuario | Killed (INVITE-12 + client test) |
| 6 | `invite-store.ts:21` | `isDismissed` false quando a leitura lanca | Killed (INVITE-10, 2 testes) |
| 7 | `invite-store.ts:28` | `dismiss` true quando `setItem` lanca | Killed (INVITE-11) |
| 8 | `invite-store.ts:25` | `dismiss` grava campo extra | Killed (3 testes, INVITE-15) |
| 9 | `invite-store.ts:33` | `clear` nao remove | Killed (INVITE-14) |
| 10 | `invite-store.ts:3` | chave diferente | Killed (2 testes) |
| 11 | `activate.ts:19` | devolve true com `save` false | Killed (INVITE-08) |
| 12 | `activate.ts:19` | `save` sem o `userId` | Killed (INVITE-07) |
| 13 | `text.ts` | "Agora não" -> "Agora nao" | Killed |
| 14 | `text.ts` | titulo sem "?" | Killed |
| 15 | `text.ts` | `inviteText` com "Voce" | Killed |
| 16 | `lock-store.client.ts:18` | `inviteStore` toca `localStorage` no import | Killed (teste de import em Node) |

**Sensor depth**: 16 mutacoes manuais (dados persistidos/seguranca). **Result**: 16/16 killed - PASS.
Isolamento: worktree removido (`git worktree remove --force` + `prune`), `git status --porcelain` da arvore real identico ao baseline (vazio).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | OK |
| Surgical changes | OK (so os arquivos das tasks + spec/tasks/docs) |
| No scope creep | OK |
| Matches patterns | OK (`createLockStore` / `lockStore` espelhados) |
| Spec-anchored outcome check | OK (valores exatos) |
| Per-layer Coverage Expectation (dominio 1:1 ACs; UI none por AD-005) | OK |
| Every test maps to a spec requirement | OK (22 testes novos, todos com ID INVITE-xx ou texto/chave da spec) |
| Documented guidelines followed | `AGENTS.md` (AD-005), `.specs/STATE.md` AD-017, L-002 |

---

## Gate Check

- **Gate command**: `npm run typecheck && npx eslint <arquivos da faixa> && npm run test:unit`
- **typecheck**: exit 0
- **test:unit**: 106 arquivos, 1797 passed, 0 failed, 0 skipped
- **Test count before feature (5e68b7d)**: 1775; **after**: 1797; **Delta**: +22 (invite-store 10, invite-policy 5, activate 5, text 1, lock-store.client 1). Nenhuma linha de teste removida na faixa (`git diff` de `*.test.ts` sem linhas `-`).
- **eslint** nos .ts/.tsx alterados: 0 erros, 2 warnings (`activate.test.ts:16`, `_userId`/`_credentialId` nao usados; nao bloqueante).
- Obs.: `npm run lint` integral falha por erro preexistente em `src/app/layout.tsx:70` (d29a27d), fora da faixa.
- E2E nao rodado nem exigido (AD-005).

---

## Requirement Traceability Update

INVITE-01..INVITE-15: Done -> Verified.

---

## Summary

**Overall**: Ready

**Spec-anchored check**: 15/15 ACs e 2/2 edge cases com valor assertado igual ao da spec; 0 spec-precision gaps
**Sensor**: 16/16 mutations killed
**Gate**: 1797 passed, typecheck e eslint sem erros

**What works**: politica, registro da recusa, ativacao compartilhada, textos e fiacao no layout dentro do gate.

**Issues found**: nenhum bloqueante. Cosmeticos: `tasks.md` com `Status: Draft`; warning de variavel nao usada em `activate.test.ts:16`.

**Next steps**: checklist manual em aparelho real (`docs/hospedagem-gratuita.md:247-250`).
