# PWA Splash e Bloqueio por Biometria Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/pwa-splash-biometria/spec.md`
**Design**: `.specs/features/pwa-splash-biometria/design.md`
**Status**: Draft

Antes de escrever manifest ou metadata, ler o guia correspondente em `node_modules/next/dist/docs/` (regra do AGENTS.md). Antes de rodar qualquer comando npm: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`. Esta feature não toca o banco: não há teste de integração. Sem e2e (AD-005). Cada task termina com um commit Conventional Commits, com `tasks.md` marcado antes do commit.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (e2e suspenso, AD-005; unit/integration obrigatórios), `.specs/STATE.md` (AD-005, AD-017), `vitest.config.ts` (projetos `unit` e `integration`), `package.json` scripts, `.specs/features/pwa/tasks.md` (matriz de referência).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio / função pura (`src/lib/biometric/**`, `src/lib/pwa/**`, `src/lib/brand.ts`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado; limites 59 999 / 60 000 / 60 001 ms | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Arquivo estático do PWA (manifest, metadata, PNGs de splash) | unit | Um teste por AC; PNG lido pelo cabeçalho IHDR e por pixels (`sharp`) | `src/app/manifest.test.ts`, `src/lib/pwa/*.test.ts` | `npm run test:unit` |
| Script de geração (`scripts/**`) | none | Coberto pelos testes dos PNGs que ele produz | - | gate de build |
| Componente de UI e páginas (`src/components/**`, `src/app/**`) | none | Suspenso (AD-005); lógica extraída para módulos puros testados; evidência por inspeção `file:line` | - | gate de build |
| Wiring / docs / `STATE.md` | none | - (gate de build apenas) | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run test:unit` |
| Full | (não usado: sem integração nesta feature) | `npm run test:unit && npm run test:int` |
| Build | Fim de fase, UI e wiring | `npm run typecheck && npm run lint && npm run test:unit` |

---

## Execution Plan

Phases são sequenciais; dentro de cada uma, as tasks rodam em ordem.

### Phase 1: Nome do app e splash nativa

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Lógica do bloqueio (módulos puros)

```
T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Splash no app e porta do bloqueio

```
T13 → T14 → T15 → T16 → T17
```

### Phase 4: Ativação, limpeza e login

```
T18 → T19 → T20 → T21 → T22 → T23
```

### Phase 5: Transparência e fechamento

```
T24 → T25
```

---

## Task Breakdown

### T1: Constante APP_NAME

**What**: Adicionar `APP_NAME = "Anon Finance"` ao módulo de marca, sem alterar `BRAND_NAME`.
**Where**: `src/lib/brand.ts`
**Depends on**: None
**Reuses**: `BRAND_NAME` e demais constantes de `src/lib/brand.ts`
**Requirement**: APPNAME-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `APP_NAME` exportado com o valor "Anon Finance"
- [x] `src/lib/brand.test.ts` confere `APP_NAME === "Anon Finance"` e `BRAND_NAME === "ANON"` (APPNAME-03)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add the installed app name constant`

---

### T2: Manifest com o novo nome

**What**: Trocar `name` e `short_name` do manifest para `APP_NAME` e atualizar o teste, que hoje espera "ANON".
**Where**: `src/app/manifest.ts`
**Depends on**: T1
**Reuses**: Guia `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`; `src/app/manifest.test.ts`
**Requirement**: APPNAME-01, SPLASH-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Manifest serve `name` e `short_name` "Anon Finance"
- [x] `manifest.test.ts` confere também `background_color` "#0D111A" e o ícone `/icon-512.png` 512x512 `image/png` com `purpose` `any` ou ausente (SPLASH-01); se o manifest não declarar esse ícone com `purpose` `any`, ajustar o manifest
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): name the installed app Anon Finance`

---

### T3: Título do app no iOS

**What**: Usar `APP_NAME` em `appleWebApp.title` de `pwaMetadata`.
**Where**: `src/lib/pwa/metadata.ts`
**Depends on**: T2
**Reuses**: `src/lib/pwa/metadata.test.ts`
**Requirement**: APPNAME-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pwaMetadata.appleWebApp.title` é "Anon Finance" e `capable` segue `true`
- [x] `metadata.test.ts` atualizado (hoje espera "ANON")
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): title the iOS home-screen app Anon Finance`

---

### T4: Lista de tamanhos da splash do iOS

**What**: Criar `SPLASH_DEVICES` (11 iPhones retrato do design) e as funções `splashMedia`, `splashFile` e `startupImages`.
**Where**: `src/lib/pwa/splash-list.ts`
**Depends on**: T3
**Reuses**: Padrão de `src/lib/pwa/install-hint.ts`
**Requirement**: SPLASH-02, SPLASH-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `splashMedia` devolve exatamente `(device-width: Wpx) and (device-height: Hpx) and (-webkit-device-pixel-ratio: R) and (orientation: portrait)`
- [x] `splashFile` devolve `/splash/${W*R}x${H*R}.png`
- [x] Teste: nenhuma `media` repetida (SPLASH-05) e `startupImages()` tem uma entrada por dispositivo com `url` sob `/splash/` (SPLASH-02)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): list the iOS splash sizes`

---

### T5: Script e PNGs da splash

**What**: Criar `scripts/generate-pwa-splash.ts` (sharp) que desenha `public/favicon.svg` a 30% da largura, centralizado sobre `#0D111A`, e grava um PNG por entrada de `SPLASH_DEVICES` em `public/splash/`; adicionar `npm run pwa:splash`, rodar e versionar os PNGs.
**Where**: `scripts/generate-pwa-splash.ts`
**Depends on**: T4
**Reuses**: `scripts/generate-pwa-icons.ts`; `src/lib/pwa/icons.test.ts` (leitura do IHDR)
**Requirement**: SPLASH-03, SPLASH-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Um PNG por dispositivo existe em `public/splash/` com o nome de `splashFile`
- [x] `src/lib/pwa/splash-images.test.ts`: IHDR = `W*R` x `H*R` (SPLASH-03); os quatro cantos valem `#0D111A`; há pixel diferente do fundo no quadrado central (SPLASH-04)
- [x] Script `pwa:splash` em `package.json`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: build
**Commit**: `feat(pwa): generate the iOS splash images`

---

### T6: Splash do iOS no metadata

**What**: Declarar `appleWebApp.startupImage` com `startupImages()` em `pwaMetadata`.
**Where**: `src/lib/pwa/metadata.ts`
**Depends on**: T5
**Reuses**: Doc `generate-metadata.md` (`appleWebApp.startupImage`)
**Requirement**: SPLASH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pwaMetadata.appleWebApp.startupImage` é igual a `startupImages()`
- [x] `metadata.test.ts`: cada `url` aponta para um arquivo existente em `public/` (SPLASH-02)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): declare the iOS startup images`

---

### T7: Textos do bloqueio

**What**: Criar `LOCK_TEXT` com as strings literais da spec (card, tela de bloqueio, mensagens e privacidade).
**Where**: `src/lib/biometric/text.ts`
**Depends on**: None (a fase anterior termina antes)
**Reuses**: `src/lib/brand.ts` (constantes de texto)
**Requirement**: LOCK-01, LOCK-02, LOCK-05, LOCK-13, LOCK-21, LOCK-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `text.test.ts` confere por igualdade cada texto exato da spec (L-002): título "Bloqueio por biometria", descrição do card, "Este aparelho ou navegador não oferece biometria para o app.", "Não foi possível ativar a biometria. Tente novamente.", "ANON bloqueado", "Não foi possível confirmar sua identidade.", "Tentar de novo", "Usar a senha", "Sair", "Bloqueio ativado", "Ativar", "Desativar", a dica "Digital, rosto ou o PIN do aparelho, conforme o que o seu aparelho oferecer." e a frase da política de privacidade
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): add the biometric lock texts`

---

### T8: Política de tempo e login recém-feito

**What**: Criar `RELOCK_AFTER_MS`, `shouldRelock`, `markFreshLogin` e `consumeFreshLogin` (`SimpleStorage` injetado).
**Where**: `src/lib/biometric/lock-policy.ts`
**Depends on**: T7
**Reuses**: Padrão de módulos puros de `src/lib/pwa/`
**Requirement**: LOCK-17, LOCK-18, LOCK-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `shouldRelock`: `false` em 59 999 e 60 000 ms, `true` em 60 001 ms, `false` com `hiddenAt` nulo
- [x] `consumeFreshLogin`: `false` sem marca; `true` dentro de 300 000 ms; `false` acima; sempre apaga a marca
- [x] `markFreshLogin` grava o instante e não lança se o storage lançar
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): add the relock timing policy`

---

### T9: Registro do bloqueio no aparelho

**What**: Criar `createLockStore(storage)` com `read(userId)`, `save(userId, credentialId)` e `clear()`.
**Where**: `src/lib/biometric/lock-store.ts`
**Depends on**: T8
**Reuses**: `SimpleStorage` de `lock-policy.ts`
**Requirement**: LOCK-04, LOCK-05, LOCK-06, LOCK-08, LOCK-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `save` grava `{ userId, credentialId }` e devolve `true`; devolve `false` e não deixa registro quando `setItem` lança (LOCK-05)
- [x] `read` devolve o `credentialId` do usuário; registro de outro usuário é apagado e devolve `null` (LOCK-08); JSON inválido e leitura que lança devolvem `null`
- [x] `clear` remove o registro (LOCK-06, LOCK-07)
- [x] O registro contém apenas `userId` e `credentialId` (LOCK-09)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): store the lock record on the device`

---

### T10: Instância do navegador do registro

**What**: Exportar `lockStore` e `freshLoginStorage` ligados a `localStorage` e `sessionStorage`, sem tocá-los no import.
**Where**: `src/lib/biometric/lock-store.client.ts`
**Depends on**: T9
**Reuses**: `src/lib/vault/device-store.ts` (instância única do navegador)
**Requirement**: LOCK-04, LOCK-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `lockStore` usa a chave `anon-biometric-lock` em `localStorage`; o módulo importa em Node sem erro
- [x] Teste unit importa o módulo em Node e confere que nenhum storage é acessado no import
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: build
**Commit**: `feat(lock): bind the lock store to the browser`

---

### T11: Chamadas WebAuthn

**What**: Criar `enrollBiometric` e `verifyBiometric` com `credentials` e `randomBytes` injetados.
**Where**: `src/lib/biometric/webauthn.ts`
**Depends on**: T10
**Reuses**: `src/lib/crypto/base64url.ts` (`toBase64Url`, `fromBase64Url`)
**Requirement**: LOCK-03, LOCK-05, LOCK-11, LOCK-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `create` recebe exatamente: `authenticatorAttachment` "platform", `userVerification` "required", `residentKey` "discouraged", challenge de 32 bytes, `rp.id` = hostname, `user.name` e `user.displayName` "ANON", `timeout` 60000 (LOCK-03)
- [x] `get` recebe `allowCredentials` com o id salvo, `userVerification` "required", challenge de 32 bytes, `timeout` 60000 (LOCK-11)
- [x] Credencial nula, rejeição e `NotAllowedError` devolvem `{ ok: false }` / `false` sem lançar (LOCK-05, LOCK-13)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): add the WebAuthn enroll and verify calls`

---

### T12: Detecção de suporte à biometria

**What**: Criar `biometricSupport(env)`.
**Where**: `src/lib/biometric/support.ts`
**Depends on**: T11
**Reuses**: -
**Requirement**: LOCK-01, LOCK-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `true` só com contexto seguro, `PublicKeyCredential` presente e a verificação de plataforma resolvendo `true`
- [x] `false` para contexto inseguro, API ausente, resolução `false` e rejeição
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lock): detect platform biometric support`

---

### T13: Componente da splash do app

**What**: Criar `BrandSplash`: tela cheia `#0D111A`, SVG inline do favicon, `role="status"`, `aria-label="Carregando"`, pulso só com `motion-safe`.
**Where**: `src/components/brand-splash.tsx`
**Depends on**: None (a fase anterior termina antes)
**Reuses**: `public/favicon.svg` (arte); padrão de `VaultSkeleton`
**Requirement**: SPLASH-06, SPLASH-08, SPLASH-09, SPLASH-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Inspeção: `fixed inset-0`, fundo `#0D111A`, marca centralizada (`file:line` no relatório) — `src/components/brand-splash.tsx:11` (fixed inset-0, bg-[#0D111A], flex centralizado), SVG inline :14-:50
- [x] Inspeção: animação sob `motion-safe:` (sem movimento com `prefers-reduced-motion: reduce`) e nenhum dado de usuário no componente — `src/components/brand-splash.tsx:17` (motion-safe:animate-pulse); sem props/dados de usuário (`brand-splash.tsx:6`, sem props)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(pwa): add the in-app brand splash`

---

### T14: Splash no lugar do esqueleto

**What**: Trocar `VaultSkeleton` por `BrandSplash` no estado `loading` do `VaultProvider` e remover o esqueleto sem uso.
**Where**: `src/components/vault-provider.tsx`
**Depends on**: T13
**Reuses**: `src/components/vault-provider.tsx:93`
**Requirement**: SPLASH-06, SPLASH-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Estado `loading` renderiza `BrandSplash`; qualquer outro estado a remove no mesmo render, sem tempo mínimo (inspeção `file:line`) — `src/components/vault-provider.tsx:93` (loading -> BrandSplash; locked :95-97, error :98 e ready :115 retornam sem BrandSplash, no mesmo render, sem timer)
- [x] `VaultSkeleton` removido se não houver outro uso — removido (grep sem usos em src)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(pwa): show the brand splash while the vault opens`

---

### T15: Tela de bloqueio

**What**: Criar `LockScreen` ('ANON bloqueado'): `verifyBiometric` automático uma vez (guarda por `useRef`), falha com "Tentar de novo", "Usar a senha" (renderiza `UnlockScreen`) e "Sair".
**Where**: `src/components/lock-screen.tsx`
**Depends on**: T14
**Reuses**: `src/components/unlock-screen.tsx`; `src/components/sign-out-button.tsx`; `Logo`, `Button`
**Requirement**: LOCK-10, LOCK-11, LOCK-12, LOCK-13, LOCK-14, LOCK-15, LOCK-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Inspeção: uma única chamada automática ao montar (Strict Mode) e nenhuma nova até "Tentar de novo" (LOCK-13) — `src/components/lock-screen.tsx:43-45` (guarda `autoStarted` useRef; `verify()` só roda de novo em :65 pelo botão "Tentar de novo")
- [x] Inspeção: sucesso chama `onUnlocked`; "Usar a senha" liberta via `UnlockScreen.onUnlocked`; "Sair" usa `SignOutButton`; textos vêm de `LOCK_TEXT` — sucesso chama `onUnlocked` em :36; "Usar a senha" -> `UnlockScreen onUnlocked` em :49 (botão :69); "Sair" = `SignOutButton` :72; textos de `LOCK_TEXT` (:56, :59, :66, :70)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): add the biometric lock screen`

---

### T16: Porta do bloqueio

**What**: Criar `BiometricGate`: decide uma vez por carga (variável de módulo, `consumeFreshLogin`), re-bloqueia em `visibilitychange` com `shouldRelock`, renderiza `LockScreen` ou `children`.
**Where**: `src/components/biometric-gate.tsx`
**Depends on**: T15
**Reuses**: `inFlight` em `src/components/vault-provider.tsx:54` (decisão única por carga)
**Requirement**: LOCK-10, LOCK-17, LOCK-18, LOCK-19, LOCK-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Inspeção: sem registro do usuário, renderiza `children` direto e não chama `navigator.credentials` (LOCK-20) — `src/components/biometric-gate.tsx:23,26` (registro nulo -> decisão `null`), `:65` renderiza `children`; o gate não referencia `navigator.credentials` (só o `LockScreen`, :55-63)
- [x] Inspeção: com registro e sem marca de login, abre bloqueado e não monta `children` (LOCK-10); com marca válida, abre desbloqueado (LOCK-19) — `biometric-gate.tsx:35` (inicializador lazy uma vez, cache em variável de módulo :13/:22), `:23-26` (registro sem marca válida -> bloqueado; marca válida -> `null`), `:55-64` com bloqueio nenhum `children` monta
- [x] Inspeção: `hidden` guarda `Date.now()`; `visible` re-bloqueia só se `shouldRelock` e há registro (LOCK-17, LOCK-18) — `biometric-gate.tsx:40-41` (`hidden` guarda `Date.now()`), `:46` (`shouldRelock`), `:48-49` (relê o registro a cada evento e só então bloqueia), listener :51
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): gate the app behind the biometric lock`

---

### T17: Porta no layout do app

**What**: Envolver `children` e `GlobalNewTransaction` com `BiometricGate` dentro do `VaultProvider`.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T16
**Reuses**: `src/app/(app)/layout.tsx:44`
**Requirement**: LOCK-10, LOCK-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `BiometricGate` recebe `userId` e envolve o conteúdo e `GlobalNewTransaction`; a barra lateral fica fora (inspeção `file:line`) — `src/app/(app)/layout.tsx:44-47` (`BiometricGate userId` dentro do `VaultProvider` :43, envolve `children` e `GlobalNewTransaction`); `<aside>` :33-40 fica fora
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): wire the gate into the app layout`

---

### T18: Card de biometria

**What**: Criar `BiometricCard` (estados `checking`, `unsupported`, `off`, `on`) com ativar via `enrollBiometric` + `lockStore.save` e desativar.
**Where**: `src/components/biometric-card.tsx`
**Depends on**: None (a fase anterior termina antes)
**Reuses**: `src/components/install-card.tsx`; `ContentCard`; `Button`
**Requirement**: LOCK-01, LOCK-02, LOCK-03, LOCK-04, LOCK-05, LOCK-06, LOCK-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Inspeção: suporte detectado por `biometricSupport` num efeito; indisponível mostra o texto de LOCK-02 sem botão
- [x] Inspeção: ativar chama `enrollBiometric` e `save`; `false` de qualquer um mostra a mensagem de LOCK-05; sucesso mostra "Bloqueio ativado" e "Desativar"
- [x] Inspeção: com o bloqueio desligado mostra a dica de LOCK-22; textos de `LOCK_TEXT`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): add the biometric card`

**Evidência**: src/components/biometric-card.tsx:26 (biometricSupport(window) em efeito), :65 (texto LOCK-02 sem botão), :40,:46 (enrollBiometric + lockStore.save; falha de qualquer um -> setFailed, mensagem :84), :76-:78 (Bloqueio ativado / Desativar), :68 (dica LOCK-22), :29 (estado inicial via lockStore.read no efeito, sem storage no SSR).

---

### T19: Card na página da conta

**What**: Renderizar `BiometricCard` em `/conta` depois de `InstallCard`.
**Where**: `src/app/(app)/conta/page.tsx`
**Depends on**: T18
**Reuses**: `src/app/(app)/conta/page.tsx:41`
**Requirement**: LOCK-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Card renderizado com `userId` da sessão (inspeção `file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): show the biometric card on the account page`

---

### T20: Limpar o registro ao sair

**What**: Chamar `lockStore.clear()` junto de `deviceKey.clear()` em `SignOutButton`.
**Where**: `src/components/sign-out-button.tsx`
**Depends on**: T19
**Reuses**: `src/components/sign-out-button.tsx:12`
**Requirement**: LOCK-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `signOut` limpa o registro antes de `signOutAction` (inspeção `file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): clear the lock record on sign-out`

---

### T21: Limpar o registro ao excluir a conta

**What**: Chamar `lockStore.clear()` junto de `deviceKey.clear()` em `DeleteAccountDialog`.
**Where**: `src/components/delete-account-dialog.tsx`
**Depends on**: T20
**Reuses**: `src/components/delete-account-dialog.tsx:55`
**Requirement**: LOCK-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A exclusão bem-sucedida limpa o registro (inspeção `file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): clear the lock record on account deletion`

---

### T22: Marca de login no formulário

**What**: Chamar `markFreshLogin` em `handleSubmit` do login por senha, antes de enviar.
**Where**: `src/app/login/login-form.tsx`
**Depends on**: T21
**Reuses**: `src/app/login/login-form.tsx` (`handleSubmit`)
**Requirement**: LOCK-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `markFreshLogin(freshLoginStorage, Date.now())` chamado antes de `formAction` (inspeção `file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): mark a fresh password sign-in`

---

### T23: Marca de login com Google

**What**: Chamar `markFreshLogin` ao enviar o formulário do Google, antes de `signInGoogleAction`.
**Where**: `src/app/login/google-button.tsx`
**Depends on**: T22
**Reuses**: `src/app/login/google-button.tsx`
**Requirement**: LOCK-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `markFreshLogin` chamado antes da ação (inspeção `file:line`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `feat(lock): mark a fresh Google sign-in`

---

### T24: Frase na política de privacidade

**What**: Adicionar `LOCK_TEXT.privacy` ao conteúdo da política de privacidade.
**Where**: `src/components/privacy/privacy-content.tsx`
**Depends on**: None (a fase anterior termina antes)
**Reuses**: `src/components/privacy/privacy-content.tsx:59`
**Requirement**: LOCK-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A política mostra "A biometria é conferida pelo sistema do seu aparelho. O ANON só recebe a confirmação e guarda no aparelho o identificador da credencial; nada disso vai para o servidor." (inspeção `file:line`, texto vindo de `LOCK_TEXT`)
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `docs(lock): disclose the biometric lock in the privacy policy`

---

### T25: Runbook da splash

**What**: Documentar `npm run pwa:splash`, como incluir um iPhone novo na lista e a verificação manual em aparelho real.
**Where**: `docs/hospedagem-gratuita.md`
**Depends on**: T24
**Reuses**: Seção do runbook de push e PWA em `docs/hospedagem-gratuita.md`
**Requirement**: SPLASH-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Seção descreve gerar a splash, adicionar uma linha em `splash-list.ts` e o checklist manual dos Success Criteria
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: none
**Gate**: build
**Commit**: `docs(pwa): add the splash and biometric lock runbook`

