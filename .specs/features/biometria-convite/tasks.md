# Convite para o Bloqueio por Biometria Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/biometria-convite/spec.md`
**Design**: inline (feature pequena, sem decisão arquitetural nova): módulos puros em `src/lib/biometric/`, um componente cliente `BiometricInvite` renderizado dentro do `BiometricGate`, reaproveitando `biometricSupport`, `lockStore`, `enrollBiometric` e `LOCK_TEXT` de `pwa-splash-biometria` (AD-017 segue valendo; nenhuma AD nova).
**Status**: Draft

Antes de rodar qualquer comando npm: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`. Sem banco: só unit. Sem e2e (AD-005). Lint: o `npm run lint` integral falha por um erro anterior (`src/app/layout.tsx:70`, `no-sync-scripts`, commit d29a27d, bloco impeccable-live); não editar esse arquivo, e usar `npx eslint <arquivos da task>` no gate Build.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (e2e suspenso, AD-005), `.specs/STATE.md` (AD-005, AD-017), `vitest.config.ts`, `package.json` scripts, `.specs/features/pwa-splash-biometria/tasks.md` (matriz de referência).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio / função pura (`src/lib/biometric/**`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado; strings literais da spec (L-002) | `src/lib/biometric/*.test.ts` | `npm run test:unit` |
| Componente de UI e páginas (`src/components/**`, `src/app/**`) | none | Suspenso (AD-005); lógica extraída para módulos puros testados; evidência por inspeção `file:line` | - | gate de build |
| Docs | none | - (gate de build apenas) | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run test:unit` |
| Full | (não usado: sem integração) | `npm run test:unit && npm run test:int` |
| Build | UI, wiring e fim de fase | `npm run typecheck && npx eslint <arquivos da task> && npm run test:unit` (substitui `npm run lint` integral: erro pré-existente em `src/app/layout.tsx:70`) |

---

## Execution Plan

### Phase 1: Lógica do convite (módulos puros)

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Interface e fiação

```
T6 → T7 → T8 → T9 → T10
```

---

## Task Breakdown

### T1: Textos do convite

**What**: Adicionar a `LOCK_TEXT` o título, o texto e o botão do convite.
**Where**: `src/lib/biometric/text.ts`
**Depends on**: None
**Reuses**: `LOCK_TEXT` e `text.test.ts`
**Requirement**: INVITE-01, INVITE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `LOCK_TEXT.inviteTitle` = "Proteger com biometria?"; `inviteText` = "Peça a biometria do aparelho ao abrir o app. Você pode mudar isso depois em Privacidade e conta."; `dismiss` = "Agora não"
- [x] `text.test.ts` confere os três por igualdade (L-002); os botões "Ativar" e a mensagem de falha reaproveitam `enable` e `enrollFailed`
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): add the biometric invite texts`

---

### T2: Registro da recusa do convite

**What**: Criar `createInviteStore(storage)` com `isDismissed(userId)`, `dismiss(userId)` e `clear()`.
**Where**: `src/lib/biometric/invite-store.ts`
**Depends on**: T1
**Reuses**: `createLockStore` em `src/lib/biometric/lock-store.ts` e `SimpleStorage` de `lock-policy.ts`
**Requirement**: INVITE-04, INVITE-10, INVITE-11, INVITE-12, INVITE-14, INVITE-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `dismiss` grava `{ userId }` em `anon-biometric-invite-dismissed` e devolve `true`; devolve `false` quando `setItem` lança (INVITE-11)
- [x] `isDismissed`: `true` para o mesmo usuário (INVITE-04); `false` para outro usuário (INVITE-12); `true` (sem convite) quando a leitura lança ou o JSON é inválido (INVITE-10)
- [x] `clear` remove o registro (INVITE-14); o registro contém só `userId` (INVITE-15)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): remember a dismissed biometric invite`

---

### T3: Instância do navegador da recusa

**What**: Exportar `inviteStore` ligado a `localStorage` em `lock-store.client.ts`, sem tocar o storage no import.
**Where**: `src/lib/biometric/lock-store.client.ts`
**Depends on**: T2
**Reuses**: `lockStore` no mesmo arquivo; `lock-store.client.test.ts`
**Requirement**: INVITE-04, INVITE-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `inviteStore` usa `localStorage` de forma preguiçosa; o teste de import em Node continua provando que nenhum storage é acessado no import
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): bind the invite store to the browser`

---

### T4: Política de exibição do convite

**What**: Criar `shouldShowInvite({ supported, hasLock, dismissed, pathname })`.
**Where**: `src/lib/biometric/invite-policy.ts`
**Depends on**: T3
**Reuses**: Módulos puros de `src/lib/biometric/`
**Requirement**: INVITE-01, INVITE-02, INVITE-03, INVITE-04, INVITE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `true` só com suporte, sem registro de bloqueio, sem recusa e `pathname` diferente de `/conta`
- [x] `false` em cada um dos quatro casos isolados (suporte falso, bloqueio existente, recusa existente, `/conta`); `/conta/` e subcaminho de `/conta` também não mostram
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): decide when to show the biometric invite`

---

### T5: Ativação compartilhada

**What**: Criar `activateBiometric({ credentials, userId, hostname, randomBytes, store })` que enrola e salva o registro, devolvendo `boolean`.
**Where**: `src/lib/biometric/activate.ts`
**Depends on**: T4
**Reuses**: `enrollBiometric` em `webauthn.ts`; `createLockStore`
**Requirement**: INVITE-07, INVITE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sucesso: chama `enrollBiometric` com as opções de LOCK-03 e salva `{ userId, credentialId }`, devolve `true` (INVITE-07)
- [x] Falha do enrol, cancelamento e `save` devolvendo `false` devolvem `false` sem deixar registro (INVITE-08)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): share the biometric activation`

---

### T6: Card usa a ativação compartilhada

**What**: Trocar a chamada direta no `BiometricCard` por `activateBiometric` e gravar a recusa ao desativar.
**Where**: `src/components/biometric-card.tsx`
**Depends on**: None (a fase anterior termina antes)
**Reuses**: `src/components/biometric-card.tsx`
**Requirement**: INVITE-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `enable` usa `activateBiometric`; o comportamento visível do card não muda (inspeção `file:line`)
- [x] `disable` chama `lockStore.clear()` e `inviteStore.dismiss(userId)` (inspeção `file:line`)
- [x] Gate check passes: `npm run typecheck && npx eslint <arquivos da task> && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `refactor(lock): activate through the shared helper and remember the opt-out`

---

**Evidence**:
- enable usa activateBiometric: src/components/biometric-card.tsx:40-46; sucesso põe status "on" e falha setFailed, como antes (:47-48)
- disable: lockStore.clear() em biometric-card.tsx:53 e inviteStore.dismiss(userId) em :55

### T7: Componente do convite

**What**: Criar `BiometricInvite`: lê suporte, bloqueio e recusa num efeito, aplica `shouldShowInvite` com `usePathname`, mostra título, texto, "Ativar" e "Agora não".
**Where**: `src/components/biometric-invite.tsx`
**Depends on**: T6
**Reuses**: `src/components/biometric-card.tsx`; `usePathname` de `next/navigation`; `Button`
**Requirement**: INVITE-01, INVITE-06, INVITE-07, INVITE-08, INVITE-09, INVITE-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Inspeção: nenhum acesso a `navigator.credentials` antes do toque em "Ativar" (INVITE-06); nada é lido durante o render do servidor
- [x] Inspeção: "Ativar" usa `activateBiometric`, sucesso remove o convite, falha mostra `LOCK_TEXT.enrollFailed` e mantém o convite sem gravar recusa (INVITE-07, INVITE-08)
- [x] Inspeção: "Agora não" chama `inviteStore.dismiss` e remove o convite mesmo quando a escrita falha (INVITE-09, INVITE-11); textos de `LOCK_TEXT`
- [x] Gate check passes: `npm run typecheck && npx eslint <arquivos da task> && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): add the biometric invite banner`

---

**Evidence**:
- INVITE-06/SSR: leituras de suporte, bloqueio e recusa só no efeito (biometric-invite.tsx:26-41); navigator.credentials só em enable (:49), disparado pelo botão Ativar
- Ativar usa activateBiometric (:48); sucesso setVisible(false) (:55); falha setFailed(true) e mantém o convite sem gravar recusa (:56); mensagem LOCK_TEXT.enrollFailed (:92)
- Agora não: inviteStore.dismiss(userId) (:62) e setClosed(true) (:63), que esconde mesmo se a escrita falhar; textos só de LOCK_TEXT (:74,76,79,87)

### T8: Convite no layout do app

**What**: Renderizar `BiometricInvite` dentro do `BiometricGate`, acima de `children`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T7
**Reuses**: `src/app/(app)/layout.tsx:44`
**Requirement**: INVITE-01, INVITE-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `BiometricInvite` recebe `userId` e fica dentro do gate, então não aparece com a tela de bloqueio (inspeção `file:line`)
- [ ] Gate check passes: `npm run typecheck && npx eslint <arquivos da task> && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): show the biometric invite in the app layout`

---

### T9: Limpar a recusa ao excluir a conta

**What**: Chamar `inviteStore.clear()` junto de `lockStore.clear()` em `DeleteAccountDialog`.
**Where**: `src/components/delete-account-dialog.tsx`
**Depends on**: T8
**Reuses**: `src/components/delete-account-dialog.tsx:56`
**Requirement**: INVITE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A exclusão bem-sucedida limpa a recusa; sair da conta não a limpa (inspeção `file:line` em `sign-out-button.tsx` mostrando que não há chamada)
- [ ] Gate check passes: `npm run typecheck && npx eslint <arquivos da task> && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): clear the invite dismissal on account deletion`

---

### T10: Checklist do convite no runbook

**What**: Acrescentar ao checklist de aparelho real da seção 8.2 os itens dos Success Criteria do convite.
**Where**: `docs/hospedagem-gratuita.md`
**Depends on**: T9
**Reuses**: Seção 8.2 de `docs/hospedagem-gratuita.md`
**Requirement**: INVITE-01, INVITE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Quatro itens novos no checklist manual (convite aparece, "Ativar" abre o prompt, "Agora não" persiste, aparelho sem biometria nunca mostra)
- [ ] Gate check passes: `npm run typecheck && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `docs(lock): add the invite to the real-device checklist`

