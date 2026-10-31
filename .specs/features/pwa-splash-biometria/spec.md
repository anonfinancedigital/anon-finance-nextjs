# PWA Splash e Bloqueio por Biometria Specification

## Problem Statement

Ao abrir o ANON instalado, o usuário vê uma tela em branco ou um esqueleto cinza até o cofre ser decifrado, sem identidade visual (no iOS não há splash nenhum, pois o Safari exige imagens de abertura declaradas). Além disso, a chave de dados fica guardada no aparelho (AD-011) e qualquer pessoa com o celular desbloqueado e o app aberto vê os dados financeiros. O objetivo é (1) uma tela de splash da marca na abertura, nativa no Android e no iOS e dentro do app enquanto o cofre abre, e (2) um bloqueio opcional do app por biometria do aparelho (digital ou rosto, conforme o aparelho), pedido ao abrir e ao voltar do segundo plano.

O bloqueio é uma trava de tela local (WebAuthn com verificação do usuário, sem servidor). Ele não protege a chave de dados criptograficamente: quem controla o aparelho desbloqueado e as ferramentas do navegador o contorna. Decisão do usuário nesta spec; será registrada como AD-017 no Design.

## Goals

- [ ] Android e iOS mostram uma splash com a marca ao abrir o app instalado, em fundo `#0D111A`, antes de qualquer JavaScript.
- [ ] Na abertura a frio, uma splash da marca substitui o esqueleto cinza enquanto o cofre é decifrado, sem atraso artificial.
- [ ] O usuário ativa e desativa em `/conta` o bloqueio por biometria do aparelho, em navegadores que oferecem biometria de plataforma.
- [ ] Com o bloqueio ativo, nenhum conteúdo de `(app)` aparece na abertura nem após mais de 60 s em segundo plano até a biometria ser confirmada, ou a senha digitada.
- [ ] Nenhum dado de biometria, nem o identificador da credencial, chega ao servidor.

## Out of Scope

Explicitamente excluído. Documentado para evitar crescimento de escopo.

| Feature | Reason |
| ------- | ------ |
| Cadeado criptográfico (WebAuthn PRF protegendo a DEK) | Decisão do usuário: bloqueio de tela (UI); PRF fica para uma spec futura |
| Verificação de assertion no servidor | O bloqueio é local; não há login por passkey nem coluna nova |
| Login com biometria/passkey no lugar da senha | Não pedido; o login continua por senha ou Google (AD-014, AD-015) |
| Escolher entre digital e rosto | O sistema operacional escolhe o método; o navegador não expõe essa escolha |
| Prazo configurável do bloqueio | Fixo em 60 s; configuração fica para depois |
| Capa de privacidade no seletor de apps (app switcher) | Não pedido |
| Contagem de tentativas ou bloqueio por falhas | O sistema operacional já limita as tentativas biométricas |
| Splash para iPad, paisagem ou variante de tema claro | Escopo mínimo: iPhones em retrato, fundo escuro único |
| Splash para TWA/Play Store | Loja fora do escopo (docs/mobile-roadmap.md, fase 5) |
| Teste e2e | Suspenso (AD-005) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Força do bloqueio | Trava de tela por WebAuthn local; a chave de dados segue como hoje | Escolha do usuário | y |
| Quando pede | Em toda carga de documento (abertura a frio ou recarga) e ao voltar do segundo plano após **mais de** 60 000 ms | Escolha do usuário ("ao abrir e ao voltar após 1 min") | y |
| Splash | Nativa (manifest no Android, `apple-touch-startup-image` no iOS) mais splash no app | Escolha do usuário | y |
| Método biométrico | `authenticatorAttachment: "platform"` e `userVerification: "required"`; o sistema decide digital, rosto ou PIN do aparelho | WebAuthn não expõe qual sensor; PIN do aparelho é o fallback do próprio sistema | n |
| Credencial | `rp.id` = `location.hostname`; `user.name` e `displayName` fixos "ANON" (nunca e-mail ou nome); `user.id` = bytes do id do usuário; `residentKey: "discouraged"`; `timeout` 60 000 ms; challenge de 32 bytes aleatórios (`crypto.getRandomValues`) | Evita pôr e-mail em chaveiro sincronizado (iCloud, Google); o challenge não é verificado, pois não há servidor | n |
| Onde fica a configuração | No aparelho (armazenamento do navegador), registro `{ userId, credentialId }`; fica fora do servidor e fora de qualquer evento do Sentry | AD-011 e AD-013; o id da credencial não é segredo | n |
| Logo após o login | Ao concluir o login nesta aba, a primeira carga do app não pede biometria | O usuário acabou de provar quem é com a senha; pedir de novo seria atrito | n |
| Falha ou cancelamento da biometria | Permanece na tela de bloqueio, com "Tentar de novo", "Usar a senha" e "Sair"; sem novo pedido automático | Evita laço de prompts; a senha é a rota de recuperação (aparelho trocado, biometria removida) | n |
| "Usar a senha" | Reaproveita o fluxo de `UnlockScreen` (deriva a KEK no navegador); sucesso libera o app | Mantém AD-011; nenhum caminho novo ao cofre | n |
| Troca de usuário no mesmo aparelho | Registro de outro `userId` é ignorado e removido; sair e excluir conta removem o registro | Mesmo ciclo de vida da DEK no aparelho (`deviceKey.clear`) | n |
| Abas simultâneas | Cada aba controla seu próprio estado de desbloqueio | Não há canal entre abas; escopo mínimo | n |
| Splash do iOS | PNGs retrato para os iPhones da lista do script (mesmo conjunto de `device-width`, `device-height`, `-webkit-device-pixel-ratio`), gerados de `docs/marca` por `scripts/`, versionados em `public/splash/`; aparelho fora da lista recebe o comportamento padrão do iOS | O Safari só usa a imagem cuja `media` casa exatamente com o aparelho | n |
| Splash no app | Fundo `#0D111A` fixo (igual à nativa, mesmo no tema claro), logo da marca centralizado, sem tempo mínimo de exibição | Continuidade visual com a splash nativa; não atrasar a abertura | n |
| Uso em app instalado no iOS | WebAuthn de plataforma funciona no PWA instalado do iOS e do Android; **não verificado nesta máquina** | Só dá para confirmar em aparelho real; entra como verificação manual dos Success Criteria | n |
| Nome do app instalado | "Anon Finance" em `name` e `short_name` do manifest e em `appleWebApp.title`; `BRAND_NAME` ("ANON") segue em títulos de página, logo e textos | Pedido do usuário; é o rótulo sob o ícone e o nome na splash do Android. 12 caracteres cabem no rótulo do Android (~12) e do iOS; o corte do rótulo só se vê em aparelho real | y |
| Verificação | Funções puras (decisão de bloquear, lista e dimensões da splash, registro no aparelho com adaptador injetado, chamada WebAuthn com `credentials` injetado) em unit; UI por inspeção de código (`file:line`) | AD-005 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Splash nativa na abertura ⭐ MVP

**User Story**: As a usuário, I want to see the ANON brand while the installed app opens so that the app feels like a native app and not a blank page.

**Why P1**: É o primeiro pedido do usuário; no iOS hoje não existe splash.

**Acceptance Criteria**:

1. The system SHALL declare in the manifest `background_color` "#0D111A", `name` "Anon Finance" and the icon `/icon-512.png` (512x512, `image/png`, purpose `any`), which Android uses to compose its splash.  <!-- ubiquitous -->
2. The system SHALL declare in the root metadata (`appleWebApp.startupImage`) one entry per iPhone size of the splash list, each with a `url` under `/splash/` and a `media` of the form `(device-width: Wpx) and (device-height: Hpx) and (-webkit-device-pixel-ratio: R) and (orientation: portrait)`.  <!-- ubiquitous -->
3. The system SHALL provide for every declared entry a PNG in `public/splash/` whose pixel size is `W*R` by `H*R` of its `media`.  <!-- ubiquitous -->
4. The system SHALL draw every splash PNG with background "#0D111A" at its four corners and the brand mark centered on the image, generated by a versioned script (`npm run pwa:splash`) from `docs/marca`.  <!-- ubiquitous -->
5. The system SHALL NOT list two entries with the same `media`.  <!-- ubiquitous -->

**Independent Test**: Rodar os testes de `splash` (lista, dimensões, cantos e centro dos PNGs) e abrir `/` no Safari do iPhone instalado vendo a splash da marca.

---

### P1: Nome do app instalado ⭐ MVP

**User Story**: As a usuário, I want the icon on my device to read "Anon Finance" so that I recognize it as a finance app.

**Why P1**: Pedido do usuário; é o que aparece sob o ícone e na splash do Android.

**Acceptance Criteria**:

1. The system SHALL serve the manifest with `name` "Anon Finance" and `short_name` "Anon Finance".  <!-- ubiquitous -->
2. The system SHALL set `appleWebApp.title` to "Anon Finance" in the root metadata.  <!-- ubiquitous -->
3. The system SHALL keep `BRAND_NAME` "ANON" in page titles, the logo and in-app texts.  <!-- ubiquitous -->

**Independent Test**: Teste unit do manifest e de `pwaMetadata`; instalar o app e ler o rótulo sob o ícone.

---

### P1: Ativar e desativar o bloqueio por biometria ⭐ MVP

**User Story**: As a usuário, I want to turn on a biometric lock for the app so that nobody opens my financial data just by picking up my unlocked phone.

**Why P1**: É o segundo pedido do usuário: dados financeiros.

**Acceptance Criteria**:

1. WHERE the browser exposes WebAuthn in a secure context and `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` resolves `true`, `/conta` SHALL show a card "Bloqueio por biometria" with the text "Peça a biometria do aparelho ao abrir o app e ao voltar depois de 1 minuto. Não substitui a senha da conta." and a button "Ativar".  <!-- optional-feature -->
2. IF WebAuthn is missing, the context is not secure, or the platform check resolves `false`, THEN the card SHALL show "Este aparelho ou navegador não oferece biometria para o app." and no "Ativar" button.  <!-- unwanted-behavior -->
3. WHEN the user taps "Ativar" THEN the system SHALL call `navigator.credentials.create` with `authenticatorAttachment` "platform", `userVerification` "required", `residentKey` "discouraged", a 32-byte random challenge, `rp.id` equal to `location.hostname`, `user.name` and `user.displayName` "ANON" and `timeout` 60000.  <!-- event-driven -->
4. WHEN `credentials.create` resolves with a credential THEN the system SHALL save `{ userId, credentialId }` on the device only, and the card SHALL show "Bloqueio ativado" and a button "Desativar".  <!-- event-driven -->
5. IF `credentials.create` is cancelled, times out or rejects THEN the system SHALL keep the lock off, save nothing, and show "Não foi possível ativar a biometria. Tente novamente.".  <!-- unwanted-behavior -->
6. WHEN the user taps "Desativar" THEN the system SHALL remove the saved `{ userId, credentialId }` from the device and the card SHALL show the "Ativar" button.  <!-- event-driven -->
7. WHEN the user signs out or deletes the account THEN the system SHALL remove the saved lock record from the device.  <!-- event-driven -->
8. IF the saved record belongs to a `userId` other than the session user's THEN the system SHALL ignore it, apply no lock and remove it.  <!-- unwanted-behavior -->
9. The system SHALL keep the credential id and every biometric result on the device: no Server Action, API route, database column, cookie or Sentry event carries them.  <!-- ubiquitous -->

**Independent Test**: Testes unit do módulo de bloqueio (ativar com `credentials` simulado, falha, desativar, usuário diferente) e inspeção do card em `/conta`.

---

### P1: Bloquear e desbloquear o app ⭐ MVP

**User Story**: As a usuário, I want the app to ask for my biometrics when I open it or come back to it so that my data stays hidden from anyone else.

**Why P1**: Sem isso, ativar o bloqueio não protege nada.

**Acceptance Criteria**:

1. WHILE the lock is active for the session user, WHEN a document load of `(app)` happens THEN the system SHALL render no page content of `(app)` and SHALL show the lock screen with the title "ANON bloqueado".  <!-- complex -->
2. WHEN the lock screen appears THEN the system SHALL call `navigator.credentials.get` once, with `allowCredentials` containing the saved `credentialId`, `userVerification` "required", a 32-byte random challenge and `timeout` 60000.  <!-- event-driven -->
3. WHEN `credentials.get` resolves THEN the system SHALL remove the lock screen and render the page content.  <!-- event-driven -->
4. IF `credentials.get` is cancelled, times out or rejects THEN the system SHALL stay on the lock screen, show "Não foi possível confirmar sua identidade.", show "Tentar de novo", "Usar a senha" and "Sair", and SHALL NOT call `credentials.get` again until "Tentar de novo" is tapped.  <!-- unwanted-behavior -->
5. WHEN the user taps "Tentar de novo" THEN the system SHALL call `navigator.credentials.get` again with the same options.  <!-- event-driven -->
6. WHEN the user taps "Usar a senha" and the password unlock succeeds THEN the system SHALL remove the lock screen and render the page content.  <!-- event-driven -->
7. WHEN the user taps "Sair" THEN the system SHALL sign the user out as the existing sign-out does.  <!-- event-driven -->
8. WHILE the lock is active and the content is unlocked, WHEN the page becomes visible after having been hidden for more than 60 000 ms THEN the system SHALL show the lock screen.  <!-- complex -->
9. WHILE the lock is active and the content is unlocked, WHEN the page becomes visible after having been hidden for 60 000 ms or less THEN the system SHALL keep the content unlocked.  <!-- complex -->
10. WHEN a sign-in completes in this tab THEN the system SHALL NOT show the lock screen on the first load of `(app)` that follows.  <!-- event-driven -->
11. WHILE the lock is not active for the session user, the system SHALL render `(app)` exactly as before this feature, with no lock screen and no call to `navigator.credentials`.  <!-- state-driven -->

**Independent Test**: Testes unit da decisão de bloquear (`hiddenAt`, `now`, 60 000 ms, limites 59 999/60 000/60 001) e do controlador com `credentials` simulado; inspeção da tela de bloqueio e do `VaultProvider`.

---

### P2: Splash da marca dentro do app

**User Story**: As a usuário, I want to see the brand screen, not a gray skeleton, while my data is being decrypted so that opening the app feels continuous with the native splash.

**Why P2**: Acabamento; o app funciona sem isso.

**Acceptance Criteria**:

1. WHILE the vault state is `loading` after a document load of `(app)`, the system SHALL render a full-viewport splash with background "#0D111A" and the ANON mark centered, in place of the gray skeleton.  <!-- state-driven -->
2. WHEN the vault state leaves `loading` THEN the system SHALL remove the splash in the same render, with no minimum display time.  <!-- event-driven -->
3. WHERE the user prefers reduced motion (`prefers-reduced-motion: reduce`), the splash SHALL show the mark without animation.  <!-- optional-feature -->
4. The system SHALL expose the splash with `role="status"` and the accessible name "Carregando".  <!-- ubiquitous -->
5. The splash SHALL NOT show any user data (name, e-mail, amounts).  <!-- ubiquitous -->

**Independent Test**: Inspeção do `VaultProvider` e do componente de splash; o gate cobre só o que for função pura.

---

### P2: Transparência sobre a biometria

**User Story**: As a usuário, I want to know what happens with my biometrics so that I trust turning the lock on.

**Why P2**: Mantém a promessa de sigilo (AD-011, AD-013); a política de privacidade já descreve cada dado.

**Acceptance Criteria**:

1. The privacy page SHALL state: "A biometria é conferida pelo sistema do seu aparelho. O ANON só recebe a confirmação e guarda no aparelho o identificador da credencial; nada disso vai para o servidor.".  <!-- ubiquitous -->
2. The `/conta` card SHALL show, below the description, the text "Digital, rosto ou o PIN do aparelho, conforme o que o seu aparelho oferecer." while the lock is off.  <!-- state-driven -->

**Independent Test**: Inspeção de `/privacidade` e do card.

---

## Edge Cases

- IF the user opens the app on a second device without a saved record THEN the system SHALL render `(app)` without a lock (the lock is per device).
- IF the saved credential no longer exists on the device (passkey removed) THEN `credentials.get` rejects and the user reaches the lock screen failure state, where "Usar a senha" remains available.
- WHEN the lock screen is shown THEN the system SHALL NOT mount any child of `(app)`, so no financial value is decrypted or rendered behind it.
- IF the device storage refuses to write the record THEN the system SHALL treat the lock as off and the card SHALL show "Não foi possível ativar a biometria. Tente novamente.".

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SPLASH-01 | P1: Splash nativa na abertura | - | Done |
| SPLASH-02 | P1: Splash nativa na abertura | - | Done |
| SPLASH-03 | P1: Splash nativa na abertura | - | Done |
| SPLASH-04 | P1: Splash nativa na abertura | - | Done |
| SPLASH-05 | P1: Splash nativa na abertura | - | Done |
| APPNAME-01 | P1: Nome do app instalado | - | Done |
| APPNAME-02 | P1: Nome do app instalado | - | Done |
| APPNAME-03 | P1: Nome do app instalado | - | Done |
| LOCK-01 | P1: Ativar e desativar | - | Done |
| LOCK-02 | P1: Ativar e desativar | - | Done |
| LOCK-03 | P1: Ativar e desativar | - | Done |
| LOCK-04 | P1: Ativar e desativar | - | Done |
| LOCK-05 | P1: Ativar e desativar | - | Done |
| LOCK-06 | P1: Ativar e desativar | - | Done |
| LOCK-07 | P1: Ativar e desativar | - | Pending |
| LOCK-08 | P1: Ativar e desativar | - | Done |
| LOCK-09 | P1: Ativar e desativar | - | Done |
| LOCK-10 | P1: Bloquear e desbloquear | - | Pending |
| LOCK-11 | P1: Bloquear e desbloquear | - | Done |
| LOCK-12 | P1: Bloquear e desbloquear | - | Pending |
| LOCK-13 | P1: Bloquear e desbloquear | - | Done |
| LOCK-14 | P1: Bloquear e desbloquear | - | Pending |
| LOCK-15 | P1: Bloquear e desbloquear | - | Pending |
| LOCK-16 | P1: Bloquear e desbloquear | - | Pending |
| LOCK-17 | P1: Bloquear e desbloquear | - | Done |
| LOCK-18 | P1: Bloquear e desbloquear | - | Done |
| LOCK-19 | P1: Bloquear e desbloquear | - | Done |
| LOCK-20 | P1: Bloquear e desbloquear | - | Pending |
| SPLASH-06 | P2: Splash dentro do app | - | Pending |
| SPLASH-07 | P2: Splash dentro do app | - | Pending |
| SPLASH-08 | P2: Splash dentro do app | - | Pending |
| SPLASH-09 | P2: Splash dentro do app | - | Pending |
| SPLASH-10 | P2: Splash dentro do app | - | Pending |
| LOCK-21 | P2: Transparência | - | Done |
| LOCK-22 | P2: Transparência | - | Done |

**ID format:** `[CATEGORY]-[NUMBER]`. Os números seguem a ordem das AC em cada história: SPLASH-01..05 (splash nativa), APPNAME-01..03 (nome), LOCK-01..09 (ativar e desativar), LOCK-10..20 (bloquear e desbloquear), SPLASH-06..10 (splash no app), LOCK-21..22 (transparência).

**Coverage:** 35 total, 0 mapped to tasks, 35 unmapped ⚠️ (tasks vêm depois do Design)

---

## Success Criteria

- [ ] O ícone instalado no Android e no iOS mostra o rótulo "Anon Finance" sem corte.
- [ ] Em iPhone real com o app instalado, a abertura mostra a splash da marca sobre `#0D111A`, sem tela branca.
- [ ] Em Android real com o app instalado, a abertura mostra o ícone sobre `#0D111A`, seguido da splash do app.
- [ ] Com o bloqueio ativo em aparelho real (iOS e Android), abrir o app pede a biometria; confirmar abre o app; cancelar mostra "Tentar de novo", "Usar a senha" e "Sair".
- [ ] Voltar ao app em até 60 s não pede a biometria; depois de mais de 60 s pede.
- [ ] Nenhuma requisição de rede do bloqueio (aba Network) contém credencial ou resultado biométrico.
