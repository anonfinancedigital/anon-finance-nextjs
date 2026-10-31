# PWA Splash e Bloqueio por Biometria Design

**Spec**: `.specs/features/pwa-splash-biometria/spec.md`
**Status**: Done

---

## Constraints from STATE.md

| AD | Efeito neste design |
| -- | ------------------- |
| AD-001 | Nenhuma escrita nova: sem Server Action, rota ou tabela. Tudo é cliente. |
| AD-005 | Sem e2e. Lógica em módulos puros com dependências injetadas (unit); UI por inspeção. |
| AD-011 | O bloqueio não toca a DEK nem o cofre; "Usar a senha" reaproveita o `UnlockScreen`. Nada decifrado é montado atrás da tela de bloqueio. |
| AD-013 | O registro do bloqueio e o resultado do WebAuthn não saem do navegador: sem rede, sem Sentry. |
| AD-016 | Não se aplica (nenhum envio a terceiro). |
| **AD-017 (nova)** | Bloqueio por biometria é trava de tela local (WebAuthn de plataforma, sem servidor, sem PRF). Registrada em `STATE.md`. |

Lição L-002 aplicada: os textos de mensagem estão literais na spec e são constantes exportadas (`LOCK_TEXT`) testadas por igualdade.

---

## Approaches (alternativas ao lugar do bloqueio)

| Opção | Descrição | Veredito |
| ----- | --------- | -------- |
| **A. `BiometricGate` separado, dentro do `VaultProvider`** | Componente novo que envolve `children` e `GlobalNewTransaction` no layout `(app)`; o `VaultProvider` só troca o esqueleto pela splash | **Recomendada.** Não mexe na máquina de estados do cofre; o gate só atua com a DEK já aberta |
| B. Estado `"biometric-locked"` dentro do `VaultProvider` | Mais um status no tipo `VaultState` | Mistura duas responsabilidades (cofre e trava) no arquivo mais sensível |
| C. Gate no layout servidor | Servidor decide | Impossível: o registro vive no aparelho |

Escolhida **A**. (O usuário já definiu a força do bloqueio e a splash; a escolha acima é só de encaixe no código.)

---

## Architecture Overview

```mermaid
graph TD
    L[(app)/layout.tsx] --> VP[VaultProvider]
    VP -->|loading| SP[Splash no app]
    VP -->|ready| BG[BiometricGate]
    BG -->|desbloqueado| CH[children + GlobalNewTransaction]
    BG -->|bloqueado| LS[LockScreen]
    LS -->|get ok| BG
    LS -->|Usar a senha| UL[UnlockScreen existente]
    UL -->|onUnlocked| BG
    LS -->|Sair| SO[SignOutButton existente]
    BG --> POL[lock-policy: shouldRelock / freshLogin]
    BG --> ST[lock-store: registro no aparelho]
    LS --> WA[webauthn: verifyBiometric]
    CARD[BiometricCard em /conta] --> WA2[webauthn: enrollBiometric]
    CARD --> ST
    CARD --> SUP[support: biometricSupport]
    LOGIN[login-form, google-button] -->|markFreshLogin| POL
    SIGNOUT[sign-out-button, delete-account-dialog] -->|clear| ST
    META[layout.tsx metadata] --> SPL[splash-list + public/splash/*.png]
    MAN[manifest.ts] --> NAME[APP_NAME = Anon Finance]
```

Regra de decisão do gate (`BiometricGate`):

1. Primeira montagem na carga do documento: bloqueado se há registro do usuário (`lockStore.read`) **e** não há `freshLogin` válido. A decisão é calculada uma vez por carga (variável de módulo), porque `consumeFreshLogin` apaga a marca e o React Strict Mode monta duas vezes.
2. `visibilitychange` para `hidden`: guarda `hiddenAt = Date.now()`. Para `visible`: se há registro e `shouldRelock(hiddenAt, Date.now())`, bloqueia. O registro é lido a cada evento, então ativar ou desativar em `/conta` vale sem estado compartilhado.
3. `LockScreen` ao montar chama `verifyBiometric` uma vez (guarda por `useRef`); falha mostra a mensagem e os três botões; "Tentar de novo" chama de novo.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `UnlockScreen` | `src/components/unlock-screen.tsx` | "Usar a senha": renderizado dentro do `LockScreen`; `onUnlocked` libera o gate |
| `SignOutButton` | `src/components/sign-out-button.tsx` | "Sair" na tela de bloqueio; passa a chamar `lockStore.clear()` ao lado de `deviceKey.clear()` |
| `DeleteAccountDialog` | `src/components/delete-account-dialog.tsx:55` | Já chama `deviceKey.clear()`; chama também `lockStore.clear()` |
| `ContentCard`, `Button`, `Logo` | `src/components/` | Estrutura visual do card e da tela de bloqueio |
| `InstallCard` | `src/components/install-card.tsx` | Padrão do card cliente em `/conta` com `useSyncExternalStore` para dados do navegador |
| `generate-pwa-icons.ts` | `scripts/` | Molde do script de splash (sharp, `public/favicon.svg`, `#0D111A`) |
| `pwaMetadata` | `src/lib/pwa/metadata.ts` | Recebe `appleWebApp.title` e `startupImage` |
| `icons.test.ts` | `src/lib/pwa/icons.test.ts` | Molde da leitura do IHDR dos PNGs |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| `src/proxy.ts` | Sem mudança: `/splash/*.png` já sai do matcher (extensão `.png`) |
| CSP (`security-headers.ts`) | Sem mudança: `img-src 'self'`; a splash do app é SVG inline |
| Service worker | Sem mudança: `/splash/*.png` não está na lista de cache estático; iOS carrega a imagem de abertura antes do SW |
| Banco / Server Actions | Nenhum |

---

## Components

### `APP_NAME` — nome do app instalado
- **Purpose**: Constante do rótulo do ícone, separada de `BRAND_NAME`.
- **Location**: `src/lib/brand.ts` (`export const APP_NAME = "Anon Finance"`)
- **Used by**: `manifest.ts` (`name`, `short_name`), `pwa/metadata.ts` (`appleWebApp.title`)
- **Tests**: `manifest.test.ts` (atualizar "ANON" para "Anon Finance"), `metadata.test.ts`; um teste garante `BRAND_NAME === "ANON"`.

### Lista e imagens de splash do iOS
- **Purpose**: Uma entrada por iPhone retrato; PNG gerado por script.
- **Location**: `src/lib/pwa/splash-list.ts`, `scripts/generate-pwa-splash.ts` (`npm run pwa:splash`), `public/splash/<W>x<H>.png`
- **Interfaces**:
  - `SPLASH_DEVICES: { width: number; height: number; ratio: number }[]` (CSS px e razão)
  - `splashMedia(d): string` → `(device-width: Wpx) and (device-height: Hpx) and (-webkit-device-pixel-ratio: R) and (orientation: portrait)`
  - `splashFile(d): string` → `/splash/${W*R}x${H*R}.png`
  - `startupImages(): { url: string; media: string }[]` → usado por `pwaMetadata.appleWebApp.startupImage`
- **Lista (CSS px @razão)**: 440×956@3, 402×874@3, 430×932@3, 393×852@3, 428×926@3, 390×844@3, 375×812@3, 414×896@3, 414×896@2, 375×667@2, 414×736@3.
- **Script**: `sharp` renderiza `public/favicon.svg` (a mesma arte dos ícones, igual à splash nativa do Android) a 30% da largura sobre `create` de `#0D111A`, no centro.
- **Tests**: media única; arquivo existe; IHDR = `W*R`×`H*R`; pixel dos quatro cantos = `#0D111A`; há ao menos um pixel diferente do fundo no quadrado central (lê o PNG decodificado com `sharp` no teste).

### `lock-text` — textos
- **Location**: `src/lib/biometric/text.ts` (`LOCK_TEXT`: títulos, botões, mensagens literais da spec)
- **Tests**: igualdade com as strings da spec.

### `lock-policy`
- **Purpose**: Decisões puras de tempo e do login recém-feito.
- **Location**: `src/lib/biometric/lock-policy.ts`
- **Interfaces**:
  - `RELOCK_AFTER_MS = 60_000`
  - `shouldRelock(hiddenAt: number | null, now: number): boolean` → `hiddenAt !== null && now - hiddenAt > 60_000`
  - `markFreshLogin(storage: SimpleStorage, now: number): void` (grava o instante)
  - `consumeFreshLogin(storage: SimpleStorage, now: number): boolean` → lê, apaga e devolve `true` se a marca existe e tem no máximo 5 min (`FRESH_LOGIN_WINDOW_MS = 300_000`)
- **Storage**: `sessionStorage` (por aba, some ao fechar). O Google sai da aba e volta, então a janela de 5 min cobre o desvio.
- **Tests**: limites 59 999 / 60 000 / 60 001 ms; `hiddenAt` nulo; marca ausente, dentro e fora da janela; consumo apaga.

### `lock-store`
- **Purpose**: Registro `{ userId, credentialId }` no aparelho.
- **Location**: `src/lib/biometric/lock-store.ts`
- **Interfaces**:
  - `createLockStore(storage: SimpleStorage): { read(userId): string | null; save(userId, credentialId): boolean; clear(): void }`
  - `read` devolve o `credentialId` do usuário; registro de outro usuário é apagado e devolve `null`; JSON inválido devolve `null`.
  - `save` devolve `false` quando o `setItem` lança (armazenamento recusa) e não deixa registro.
  - `lockStore = createLockStore(localStorage)` em `lock-store.client.ts` (instância do navegador; chave `anon-biometric-lock`). `localStorage` é síncrono: o gate decide sem esperar, evitando mostrar dados antes de bloquear.
- **Tests**: salvar/ler/limpar; usuário diferente apaga; JSON inválido; escrita que lança; leitura que lança (`null`).

### `webauthn`
- **Purpose**: Chamadas WebAuthn com `credentials` injetado.
- **Location**: `src/lib/biometric/webauthn.ts`
- **Interfaces**:
  - `enrollBiometric({ credentials, userId, hostname, randomBytes }): Promise<{ ok: true; credentialId: string } | { ok: false }>` — `publicKey`: `rp { name: "ANON", id: hostname }`, `user { id: UTF-8(userId), name: "ANON", displayName: "ANON" }`, `challenge: randomBytes(32)`, `pubKeyCredParams [{ES256 -7},{RS256 -257}]`, `authenticatorSelection { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }`, `timeout: 60000`. `credentialId` em base64url do `rawId` (`toBase64url` de `src/lib/crypto/base64url.ts`).
  - `verifyBiometric({ credentials, credentialId, randomBytes }): Promise<boolean>` — `allowCredentials [{ type: "public-key", id: fromBase64Url(credentialId) }]`, `userVerification: "required"`, `challenge: randomBytes(32)`, `timeout: 60000`. Rejeição, `null` ou exceção devolvem `false`; nunca lança.
- **Tests**: opções exatas passadas a `create` e `get`; sucesso devolve o id; `null`, rejeição, timeout e `NotAllowedError` devolvem falha.

### `support`
- **Location**: `src/lib/biometric/support.ts`
- **Interface**: `biometricSupport(env: { isSecureContext: boolean; PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }): Promise<boolean>` — `true` só se contexto seguro, API presente e a promessa resolve `true`; erro vira `false`.
- **Tests**: as quatro combinações.

### `BiometricGate`
- **Purpose**: Mostra `children` ou `LockScreen` conforme a decisão acima.
- **Location**: `src/components/biometric-gate.tsx` ("use client")
- **Interfaces**: `BiometricGate({ userId, children })`; contexto interno `lock()`/`unlock()` não exportado.
- **Dependencies**: `lock-store`, `lock-policy`, `LockScreen`.
- **Detalhe**: o estado inicial é `"unlocked"` no render do servidor e a decisão roda no efeito de montagem. Como o gate só renderiza depois do `VaultProvider` sair de `loading` (que roda no cliente), não há HTML de servidor com dados. O gate usa `useState(() => decideInitial())` com a variável de módulo, sem ler `localStorage` no SSR (o `VaultProvider` não renderiza `children` no servidor).
- **Tests**: a lógica está em `lock-policy` e `lock-store`; o componente vai por inspeção (AD-005).

### `LockScreen`
- **Purpose**: Tela "ANON bloqueado".
- **Location**: `src/components/lock-screen.tsx`
- **Interfaces**: `LockScreen({ userId, credentialId, onUnlocked })`; estados `verifying | failed | password`.
- **Reuses**: `UnlockScreen` (modo `password`), `SignOutButton` ("Sair"), `Logo`, `Button`.

### `BiometricCard`
- **Purpose**: Ativar e desativar em `/conta`.
- **Location**: `src/components/biometric-card.tsx`, usado em `src/app/(app)/conta/page.tsx` após `InstallCard`
- **Interfaces**: `BiometricCard({ userId })`; estados `checking | unsupported | off | on`; suporte via `biometricSupport(window)` em efeito.
- **Dependencies**: `enrollBiometric`, `lockStore`, `biometricSupport`.

### Splash no app
- **Purpose**: Tela cheia com a marca enquanto o cofre abre.
- **Location**: `src/components/brand-splash.tsx`; `VaultProvider` troca `<VaultSkeleton />` por `<BrandSplash />` no estado `loading` (remove `VaultSkeleton` se ficar sem uso).
- **Detalhe**: `fixed inset-0 z-50 grid place-items-center bg-[#0D111A]`, `role="status"`, `aria-label="Carregando"`, SVG inline do favicon a `size-28` (a mesma arte do ícone nativo, sem piscar de imagem). Animação de pulso curta em `motion-safe:` (Tailwind), sem animação em `prefers-reduced-motion: reduce`. Sem texto de usuário.

### Instrumentação do login
- **Location**: `src/app/login/login-form.tsx` (em `handleSubmit`, antes de `formAction`) e `src/app/login/google-button.tsx` (antes de `signInGoogleAction`) chamam `markFreshLogin(sessionStorage, Date.now())`.
- **Efeito**: login falho deixa uma marca de até 5 min; só vale se já houver sessão e registro, e o pior caso é pular uma checagem de biometria — risco aceito (a trava é local, AD-017).

---

## Data Models

Nenhum dado no banco. Registro no aparelho:

```typescript
// localStorage["anon-biometric-lock"]
type LockRecord = { userId: string; credentialId: string }; // credentialId em base64url
// sessionStorage["anon-fresh-login"]
type FreshLogin = string; // Date.now() em ms
```

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| `create` cancelado, expirado ou rejeitado | `enrollBiometric` devolve `{ ok: false }`; nada salvo | "Não foi possível ativar a biometria. Tente novamente." |
| `setItem` lança ao salvar | `lockStore.save` devolve `false`; bloqueio fica desligado | Mesma mensagem de ativar |
| `get` cancelado, expirado, rejeitado ou credencial removida | `verifyBiometric` devolve `false` | "Não foi possível confirmar sua identidade." com os três botões |
| `localStorage` lança na leitura | `read` devolve `null` | Sem bloqueio (falha aberta, coerente com trava local) |
| Browser sem WebAuthn ou sem biometria | `biometricSupport` devolve `false` | Card com o texto de indisponível |
| Registro de outro usuário | `read` apaga e devolve `null` | Sem bloqueio |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| ------- | -------- | ------ | ---------- |
| Trava local contornável (devtools, limpar dados do site) | `lock-store.ts` | Quem controla o navegador desbloqueado remove o registro e entra | Aceito pelo usuário; texto do card diz "Não substitui a senha da conta"; AD-017 registra; PRF fica como spec futura |
| Safari/iOS pode exigir gesto do usuário para `credentials.get`, e a chamada automática falharia | `lock-screen.tsx` | Na abertura, o iOS mostra a falha antes do primeiro toque | Fluxo de falha já tem "Tentar de novo" (gesto); **verificação em aparelho real é obrigatória** (Success Criteria) |
| WebAuthn de plataforma em PWA instalado não verificado | spec, Assumptions | A opção pode não aparecer ou falhar em algum aparelho | O card cai em "não oferece biometria"; teste manual |
| Lista de splash do iOS pode não cobrir iPhones novos (ex.: iPhone Air, 420×912@3, não confirmado) | `splash-list.ts` | Aparelho fora da lista usa o padrão do iOS | Lista é dado em um arquivo; adicionar linha e rodar `npm run pwa:splash`; cobertura declarada como "lista do script" |
| Re-bloqueio desmonta `children` e perde estado de formulário aberto | `biometric-gate.tsx` | Rascunho de lançamento não salvo some após 1 min em segundo plano | Aceito: só ocorre com bloqueio ativo e mais de 60 s fora; o gate não usa `display:none` porque os valores já decifrados ficariam na árvore |
| Strict Mode monta efeitos duas vezes | `biometric-gate.tsx`, `lock-screen.tsx` | `consumeFreshLogin` devolveria `false` na segunda leitura e bloquearia; `get` seria chamado duas vezes em dev | Decisão inicial guardada em variável de módulo por carga; `useRef` no `get` automático (mesmo padrão de `inFlight` em `vault-provider.tsx:54`) |
| `manifest.test.ts` exige "ANON" | `src/app/manifest.test.ts` | Teste quebra com o novo nome | Task de nome atualiza o teste junto com `manifest.ts` |
| Marca de login falho dura 5 min | `lock-policy.ts` | Pula uma checagem de biometria | Aceito, ver acima |
| Teste de componente inexistente (AD-005) | `biometric-gate.tsx`, `lock-screen.tsx`, `biometric-card.tsx` | Fiação sem teste automático | Lógica extraída para módulos puros testados; evidência de UI por `file:line` |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Onde guardar o registro | `localStorage` | Leitura síncrona decide o bloqueio antes de qualquer dado aparecer; o `credentialId` não é segredo |
| Marca do login | `sessionStorage` com janela de 5 min | Sobrevive ao redirecionamento do Google; some ao fechar a aba |
| Splash do app | SVG inline do favicon, fundo `#0D111A` fixo | Sem atraso de imagem; igual ao ícone da splash nativa do Android |
| Splash do iOS | Mesma arte do favicon centralizada a 30% da largura | Reaproveita o script de ícones; sem arte nova |
| Relock por `Date.now()` | Tempo de parede | Cobre aparelho suspenso; relógio alterado só enfraquece a trava local, já aceita |
| Nome do app | `APP_NAME` separado de `BRAND_NAME` | Só o rótulo instalado muda; títulos e logo seguem "ANON" |

> **Project-level decision:** AD-017 registrada em `.specs/STATE.md`.
