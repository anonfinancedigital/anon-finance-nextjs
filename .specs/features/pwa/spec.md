# PWA Specification

## Problem Statement

O ANON roda só no navegador: sem ícone na tela inicial, sem janela própria, sem aviso quando a rede cai e sem como lembrar o usuário de lançar gastos. O objetivo é torná-lo instalável (Android, iOS, desktop) e capaz de enviar notificações push, sem enfraquecer o sigilo: o app cifra tudo no cliente (AD-011), então nenhum dado financeiro, página autenticada ou resposta de Server Action pode ficar em cache do service worker, e nenhuma notificação pode carregar valor, nome, categoria ou descrição. O push passa pelo serviço do fabricante do navegador (terceiro), exceção à AD-013 registrada como AD-016.

## Goals

- [ ] O Chrome reconhece o app como instalável: manifest válido, ícones 192/512 (um maskable) e service worker registrado.
- [ ] Sem rede, a navegação mostra uma tela offline estática com a marca, em vez da página de erro do navegador.
- [ ] O service worker guarda em cache apenas assets estáticos (`/_next/static/*`, ícones, `/offline.html`); zero respostas de página, de Server Action ou de API.
- [ ] O usuário vê como instalar o app em `/conta`, no Chrome/Android (botão) e no iOS (instrução).
- [ ] O usuário ativa o push em `/conta`, escolhe quais avisos quer e a hora, e recebe: lembrete de lançar gastos, vencimento de recorrentes, avisos de segurança da conta e mensagens do administrador.
- [ ] Todo texto de notificação vem de constantes do código (exceto a mensagem do administrador); nenhum dado financeiro entra no payload.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Uso offline de dados financeiros | Cache de dados, mesmo cifrados, amplia a superfície de AD-011 e expõe linhas de outro usuário após troca de conta |
| Background sync, push periódico em segundo plano | Fora do pedido |
| Aviso de "novo login" | Exige rastrear dispositivos conhecidos; só "senha redefinida" e "acesso revogado" |
| Frequência semanal ou horários múltiplos | Um lembrete diário, uma hora por usuário |
| Notificação com valor, nome, categoria ou saldo | O servidor só vê texto cifrado (AD-011) e o payload vai a um terceiro |
| Mensagem do administrador a um usuário específico | Só difusão a todos os inscritos |
| Histórico de notificações na UI | Não pedido |
| Fila de escritas offline | Server Actions precisam do servidor; sem rede a ação falha como hoje |
| Biblioteca de PWA (Serwist, next-pwa) | Dependência a mais para um SW de ~40 linhas; escopo mínimo |
| Teste e2e e Lighthouse automatizado | Suspenso (AD-005) |
| Loja (Play Store/TWA) | Não pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Escopo offline | Só o shell: assets estáticos e `/offline.html` | AD-011 e AD-013: nada financeiro em cache | n |
| Navegações | Network-only; falha de rede responde `/offline.html`; resposta HTTP de erro (4xx/5xx) passa direto | Páginas têm nonce por requisição e `no-store`; cachear HTML quebraria o CSP | n |
| Tela offline | `public/offline.html` estático, sem JavaScript, estilos inline | O nonce do CSP não existe numa página pré-cacheada; sem script não há bloqueio | n |
| Onde fica o aviso de instalar | Seção em `/conta` | Menor risco que tocar o layout global; "discreto" | n |
| Manifest | `src/app/manifest.ts`; `name` "ANON", `short_name` "ANON", `description` = `BRAND_DESCRIPTION`, `start_url` "/", `scope` "/", `display` "standalone", `lang` "pt-BR", `background_color` e `theme_color` "#0D111A" | Cor do ícone atual (`favicon.svg`); `start_url` "/" cai em `/bem-vindo` ou no app conforme a sessão (proxy) | n |
| Ícones | PNG gerados de `public/favicon.svg` por script versionado: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (arte com margem de 20%), `apple-touch-icon.png` 180×180, todos em `public/` | Arquivos `.png` já saem do matcher do proxy; reprodutível | n |
| Rotas do PWA no proxy | `/manifest.webmanifest`, `/sw.js` e `/offline.html` ficam fora do matcher do proxy e recebem cabeçalhos próprios | O proxy redireciona anônimo para `/login`; o navegador busca manifest e SW sem sessão | n |
| CSP do SW | `/sw.js` responde `default-src 'self'; script-src 'self'` (docs do Next), `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Type: application/javascript; charset=utf-8` | `STATIC_CSP` (`default-src 'none'`) bloquearia o `fetch` do próprio SW | n |
| Versão do cache | Nome `anon-static-v1`; ao ativar, apaga caches de outro nome | Atualização do SW limpa o que sobrou | n |
| Registro | Componente cliente no layout raiz registra `/sw.js` com `scope: "/"` e `updateViaCache: "none"`, só em `NODE_ENV=production` | `next dev` não deve ter SW interferindo | n |
| Instalação iOS | Detecção por user agent `iPhone|iPad|iPod` + `display-mode` não standalone | Safari não dispara `beforeinstallprompt` | n |
| Biblioteca de envio | `web-push` (npm) no servidor; a chave pública vai à UI por prop de Server Component, não por `NEXT_PUBLIC_*` | Cifra RFC 8291 e VAPID não valem reimplementar; sem `NEXT_PUBLIC_` a chave não fica presa ao build | n |
| Variáveis de ambiente | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` ou `https:`), `CRON_SECRET`; faltando qualquer VAPID, a seção de notificações some de `/conta` e o envio é no-op | Mesmo padrão do botão do Google | n |
| Quem dispara os envios | Workflow `.github/workflows/push-dispatch.yml` a cada hora (`7 * * * *`) faz `POST {APP_URL}/api/push/dispatch` com `Authorization: Bearer CRON_SECRET` | Vercel Hobby só permite cron diário; a hora escolhida pelo usuário exige execução horária; o repo já usa Actions (backup) | n |
| Fuso dos lembretes | `America/Sao_Paulo` para "hoje" e para a hora escolhida | AD-007 já usa esse fuso | n |
| Quando um aviso diário sai | Na primeira execução do dia em que a hora local já é ≥ à hora escolhida e o par (usuário, tipo, dia) ainda não foi registrado | Tolera atraso ou pulo do cron do GitHub sem repetir | n |
| Idempotência | Tabela `push_dispatch` com chave primária (`user_id`, `kind`, `ref`); o envio só ocorre se o `INSERT ... ON CONFLICT DO NOTHING` inseriu a linha (no máximo uma vez) | Retentativa ou execuções concorrentes não duplicam; falha total de entrega num dia não repete | n |
| Definição de "vence hoje" | Há ao menos uma série recorrente do usuário cuja ocorrência do mês de hoje (`appliesInMonth` + `occurrenceDate` de `recurrence.ts`, AD-004) cai na data local de hoje; um aviso por usuário, não por transação | Reaproveita a projeção central; dia 31 em mês curto já é tratado lá | n |
| Padrões ao ativar | `reminder` desligado, `due` desligado, `security` ligado, `admin` ligado, hora 9 | Opt-in para o que é periódico; segurança e admin são raros | n |
| Limites | No máximo 5 inscrições por usuário; no máximo 1000 envios por execução do dispatch (o resto sai na próxima, pois a chave de idempotência só é gravada ao enviar); concorrência de 20 | Evita abuso e estouro de tempo da função | n |
| Destino confiável | O servidor só envia a endpoints `https:` cujo host é `fcm.googleapis.com`, `updates.push.services.mozilla.com`, termina em `.push.apple.com` ou em `.notify.windows.com` | Impede SSRF: o endpoint vem do cliente | n |
| Retenção de `push_dispatch` | Cada execução apaga linhas com mais de 7 dias | Tabela não cresce sem limite | n |
| Mensagem do administrador | Texto de 1 a 140 caracteres após `trim`, enfileirada em `push_broadcast`; o dispatch a entrega na próxima execução, uma vez por usuário (`kind` "broadcast", `ref` = id) | Evita enviar 1000 pushes dentro de uma Server Action | n |
| Textos fixos | lembrete "Que tal registrar seus gastos de hoje?"; vencimento "Você tem lançamentos recorrentes para hoje."; senha "Sua senha foi redefinida."; revogação "Seu acesso ao ANON foi revogado."; título sempre "ANON" | Sem dado do usuário | n |
| TTL do push | 86400 s para todos | Aviso velho de um dia não vale entregar | n |
| Verificação | Funções puras, repos com teste de integração em banco privado, e o `sw.js` (carregado em `vm` com `self` simulado) em unit; UI por inspeção de código | AD-005 | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: App instalável ⭐ MVP

**User Story**: As a usuário, I want to install ANON on my device so that it opens in its own window with its icon.

**Why P1**: É o núcleo de um PWA.

**Acceptance Criteria**:

1. The system SHALL serve `/manifest.webmanifest` with `name` "ANON", `short_name` "ANON", `start_url` "/", `scope` "/", `display` "standalone", `lang` "pt-BR", `background_color` "#0D111A" and `theme_color` "#0D111A".  <!-- ubiquitous -->
2. The system SHALL list in the manifest icons `/icon-192.png` (192x192), `/icon-512.png` (512x512) and `/icon-maskable-512.png` (512x512, purpose `maskable`), all `image/png`, and each file SHALL exist in `public/` with those dimensions.  <!-- ubiquitous -->
3. The system SHALL declare `/apple-touch-icon.png` (180x180) as the Apple touch icon and set `appleWebApp` to capable with title "ANON" in the root metadata.  <!-- ubiquitous -->
4. The system SHALL set the viewport `themeColor` to "#0D111A".  <!-- ubiquitous -->
5. WHEN an anonymous client requests `/manifest.webmanifest`, `/sw.js` or `/offline.html` THEN the system SHALL respond without redirecting to `/login`.  <!-- event-driven -->
6. The system SHALL keep every path outside the public list and these three redirecting anonymous requests to `/login`.  <!-- ubiquitous -->

**Independent Test**: Chamar `manifest()` e comparar com os valores; ler as dimensões dos PNGs; `decideRoute` e o matcher do proxy para as três rotas.

---

### P1: Service worker que não guarda dados ⭐ MVP

**User Story**: As a usuário, I want the offline support to never keep my financial data on the device cache.

**Why P1**: Sem esta garantia o PWA contradiz AD-011.

**Acceptance Criteria**:

1. WHEN the service worker installs THEN the system SHALL precache exactly `/offline.html`, `/icon-192.png` and `/icon-512.png` in the cache `anon-static-v1`.  <!-- event-driven -->
2. WHEN the service worker activates THEN the system SHALL delete every cache whose name is not `anon-static-v1`.  <!-- event-driven -->
3. WHEN a `GET` request for a same-origin path starting with `/_next/static/` is fetched THEN the system SHALL answer from the cache when present and otherwise fetch from the network and store the response when its status is 200.  <!-- event-driven -->
4. WHEN a navigation request fails with a network error THEN the system SHALL respond with the cached `/offline.html`.  <!-- event-driven -->
5. WHEN a navigation request receives an HTTP response (any status) THEN the system SHALL return that response and SHALL NOT store it.  <!-- event-driven -->
6. IF a request is not `GET`, is cross-origin, or is a same-origin path outside `/_next/static/` that is not a navigation THEN the system SHALL NOT intercept it, leaving it to the browser (this covers Server Actions, `/api/*`, `/monitoring` and RSC fetches).  <!-- unwanted-behavior -->
7. The system SHALL serve `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate` and `Content-Security-Policy: default-src 'self'; script-src 'self'`.  <!-- ubiquitous -->
8. WHEN the service worker finishes installing THEN the system SHALL call `skipWaiting` and, on activate, `clients.claim`.  <!-- event-driven -->

**Independent Test**: Carregar `public/sw.js` em `vm` com `self`, `caches` e `fetch` simulados, disparar `install`, `activate` e `fetch` e conferir o que entra no cache; ler `securityHeaderRules`.

---

### P1: Tela offline ⭐ MVP

**User Story**: As a usuário, I want a clear screen when I have no connection.

**Why P1**: É o que o usuário vê quando a rede cai.

**Acceptance Criteria**:

1. The system SHALL provide `public/offline.html` with `lang="pt-BR"`, the title "ANON • Sem conexão", the text "Você está sem conexão" and the text "Seus dados continuam protegidos. Reconecte-se para continuar.".  <!-- ubiquitous -->
2. The system SHALL NOT include any `<script>` element or external resource in `public/offline.html`.  <!-- ubiquitous -->
3. The system SHALL include in `public/offline.html` a link `href="/"` with the text "Tentar novamente".  <!-- ubiquitous -->

**Independent Test**: Ler o arquivo e conferir os textos, a ausência de `<script>` e de `http(s)://`.

---

### P2: Registro do service worker

**User Story**: As a mantenedor, I want the worker registered safely.

**Why P2**: Sem ele nada do P1 funciona, mas é fiação pequena.

**Acceptance Criteria**:

1. WHILE `NODE_ENV` is `production` and the browser supports service workers, WHEN the root layout mounts on the client THEN the system SHALL register `/sw.js` with `scope` "/" and `updateViaCache` "none".  <!-- complex -->
2. WHILE `NODE_ENV` is not `production` the system SHALL NOT register the service worker.  <!-- state-driven -->
3. IF the registration rejects THEN the system SHALL swallow the error without throwing or logging user data.  <!-- unwanted-behavior -->

**Independent Test**: Função pura `registerServiceWorker(env, nav)` com `navigator` simulado.

---

### P2: Aviso de instalação em `/conta`

**User Story**: As a usuário, I want to see how to install the app.

**Why P2**: O navegador já oferece instalar; o aviso só facilita.

**Acceptance Criteria**:

1. WHEN the browser fires `beforeinstallprompt` THEN the system SHALL keep the event, prevent its default and show a button "Instalar app" in `/conta`.  <!-- event-driven -->
2. WHEN the user clicks "Instalar app" THEN the system SHALL call `prompt()` on the kept event and hide the button afterwards.  <!-- event-driven -->
3. WHILE the user agent matches `iPhone|iPad|iPod` and `display-mode: standalone` is false, the system SHALL show the text "No iPhone ou iPad, toque em Compartilhar e depois em Adicionar à Tela de Início." in `/conta`.  <!-- state-driven -->
4. WHILE `display-mode: standalone` is true the system SHALL NOT show the install section.  <!-- state-driven -->
5. WHILE no install event was received and the device is not iOS, the system SHALL NOT show the install section.  <!-- state-driven -->

**Independent Test**: Função pura `installHint({ userAgent, standalone, hasPrompt })` devolve `"button" | "ios" | "none"`.

---

### P1: Ativar e desativar notificações ⭐ MVP

**User Story**: As a usuário, I want to turn push notifications on for this device and off again.

**Why P1**: Sem inscrição não há push.

**Acceptance Criteria**:

1. WHERE `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are all set the system SHALL show the "Notificações" section in `/conta`; otherwise the system SHALL NOT show it.  <!-- optional-feature -->
2. WHEN a signed-in user clicks "Ativar notificações" and the browser grants permission THEN the system SHALL subscribe with `userVisibleOnly: true` and the VAPID public key, and call `subscribePushAction` with the endpoint, `p256dh` and `auth`.  <!-- event-driven -->
3. WHEN `subscribePushAction` receives a valid subscription from a signed-in approved user THEN the system SHALL store it for that user and create the user's preferences row with `reminder` false, `due` false, `security` true, `admin` true and `hour` 9 when none exists.  <!-- event-driven -->
4. IF the browser permission is "denied" THEN the system SHALL show "Notificações bloqueadas no navegador. Libere nas configurações do site." and store nothing.  <!-- unwanted-behavior -->
5. IF the endpoint is not `https:` or its host is not `fcm.googleapis.com`, `updates.push.services.mozilla.com`, or a name ending in `.push.apple.com` or `.notify.windows.com` THEN `subscribePushAction` SHALL return the error "Este navegador não é compatível com notificações" and store nothing.  <!-- unwanted-behavior -->
6. IF `p256dh` does not decode from base64url to 65 bytes starting with 0x04, or `auth` does not decode to 16 bytes THEN `subscribePushAction` SHALL return the error "Inscrição inválida" and store nothing.  <!-- unwanted-behavior -->
7. IF the user already has 5 subscriptions and the endpoint is new THEN `subscribePushAction` SHALL return the error "Limite de 5 dispositivos atingido" and store nothing.  <!-- unwanted-behavior -->
8. WHEN `subscribePushAction` receives an endpoint that is already stored THEN the system SHALL update its keys and owner to the caller without creating a second row.  <!-- event-driven -->
9. WHEN the user clicks "Desativar notificações" THEN the system SHALL call `unsubscribe()` on the browser subscription and call `unsubscribePushAction`, which deletes the row with that endpoint owned by the caller.  <!-- event-driven -->
10. IF `subscribePushAction` or `unsubscribePushAction` is called without a valid approved session THEN the system SHALL refuse it with the same result the other actions give (`requireSessionForAction`).  <!-- unwanted-behavior -->
11. WHEN a user account is deleted THEN the system SHALL delete its subscriptions, preferences and dispatch records.  <!-- event-driven -->
12. WHILE the user agent matches `iPhone|iPad|iPod` and `display-mode: standalone` is false, the system SHALL show "No iPhone, instale o app na Tela de Início para receber notificações." and SHALL NOT show the "Ativar notificações" button.  <!-- state-driven -->
13. WHERE the browser lacks `serviceWorker` or `PushManager` the system SHALL show "Este navegador não oferece notificações." and no button.  <!-- optional-feature -->
14. The system SHALL show next to the toggle: "As notificações passam pelo serviço de push do seu navegador (Google, Apple ou Mozilla). Elas só levam textos genéricos, nunca valores ou nomes.".  <!-- ubiquitous -->

**Independent Test**: Repo `pushRepo` com banco privado (upsert, limite, cascade); validação pura `parseSubscription` com endpoints e chaves válidos e inválidos; ação com sessão simulada.

---

### P1: Preferências de notificação ⭐ MVP

**User Story**: As a usuário, I want to choose which notifications I get and at what hour.

**Why P1**: Push sem controle vira ruído.

**Acceptance Criteria**:

1. WHILE the user has at least one subscription the system SHALL show in `/conta` four switches (lembrete de lançar gastos, vencimento de recorrentes, avisos de segurança da conta, mensagens do administrador) and an hour selector from 0 to 23.  <!-- state-driven -->
2. WHEN the user changes a switch or the hour THEN `updatePushPreferencesAction` SHALL save `reminder`, `due`, `security`, `admin` and `hour` for the caller.  <!-- event-driven -->
3. IF `hour` is not an integer from 0 to 23, or a switch is not a boolean THEN `updatePushPreferencesAction` SHALL return the error "Preferências inválidas" and save nothing.  <!-- unwanted-behavior -->
4. IF the caller has no preferences row THEN `updatePushPreferencesAction` SHALL return the error "Ative as notificações primeiro" and save nothing.  <!-- unwanted-behavior -->
5. The system SHALL apply preferences only to the caller's own row, never to an id sent by the client.  <!-- ubiquitous -->

**Independent Test**: Schema de validação puro com horas -1, 0, 23, 24, 9.5 e não booleanos; repo grava e lê.

---

### P1: Envio agendado: lembrete e vencimento ⭐ MVP

**User Story**: As a usuário, I want a reminder to log my spending and a heads-up on days with recurring entries.

**Why P1**: É o motivo do push.

**Acceptance Criteria**:

1. WHEN `POST /api/push/dispatch` is called without `Authorization: Bearer <CRON_SECRET>` (compared in constant time) THEN the system SHALL respond 401 with no body detail and send nothing.  <!-- event-driven -->
2. IF `CRON_SECRET` or any VAPID variable is unset THEN `POST /api/push/dispatch` SHALL respond 503 and send nothing.  <!-- unwanted-behavior -->
3. WHEN an anonymous client calls `POST /api/push/dispatch` THEN the system SHALL NOT redirect to `/login`.  <!-- event-driven -->
4. WHEN dispatch runs THEN the system SHALL consider only users with status `approved` and at least one subscription.  <!-- event-driven -->
5. WHEN dispatch runs and a user has `reminder` true, the local hour (America/Sao_Paulo) is ≥ the user's `hour`, and no `push_dispatch` row exists for (user, "reminder", local date) THEN the system SHALL insert that row and send "Que tal registrar seus gastos de hoje?" to every subscription of the user.  <!-- event-driven -->
6. WHEN dispatch runs and a user has `due` true, the local hour is ≥ the user's `hour`, a recurring series of the user has an occurrence on the local date, and no `push_dispatch` row exists for (user, "due", local date) THEN the system SHALL insert that row and send "Você tem lançamentos recorrentes para hoje." to every subscription of the user.  <!-- event-driven -->
7. IF the `push_dispatch` insert for a (user, kind, ref) conflicts THEN the system SHALL NOT send that notification.  <!-- unwanted-behavior -->
8. IF the push service answers 404 or 410 for a subscription THEN the system SHALL delete that subscription.  <!-- unwanted-behavior -->
9. IF a send fails with any other error THEN the system SHALL keep the subscription, log the failure through `logActionError` without the endpoint or keys, and continue with the next send.  <!-- unwanted-behavior -->
10. The system SHALL send each push with TTL 86400 and a JSON payload `{"title":"ANON","body":<fixed text>,"url":"/"}` built only from the constants in `push-messages.ts`.  <!-- ubiquitous -->
11. The system SHALL perform at most 1000 sends per dispatch run, with at most 20 in flight, and process the remaining ones in the next run.  <!-- ubiquitous -->
12. WHEN dispatch finishes THEN the system SHALL delete `push_dispatch` rows older than 7 days and respond 200 with `{"sent":n,"removed":n,"failed":n}` only.  <!-- event-driven -->
13. The system SHALL keep every other path outside the public list and the PWA routes redirecting anonymous requests to `/login`.  <!-- ubiquitous -->

**Independent Test**: Função pura `planDispatch({ now, users, claimed })` devolve o que enviar; `dispatch` com `web-push` simulado e banco privado confere 401/503, dedup em duas chamadas seguidas, remoção em 410 e que o corpo enviado é exatamente o JSON fixo.

---

### P2: Avisos de segurança da conta

**User Story**: As a usuário, I want to be told when my password is reset or my access revoked.

**Why P2**: Útil, mas o app funciona sem.

**Acceptance Criteria**:

1. WHEN a password reset is completed for a user with `security` true THEN the system SHALL send "Sua senha foi redefinida." to every subscription of that user.  <!-- event-driven -->
2. WHEN the administrator revokes a user with `security` true THEN the system SHALL send "Seu acesso ao ANON foi revogado." to every subscription of that user.  <!-- event-driven -->
3. IF sending the security notification fails THEN the system SHALL still complete the reset or revocation and log the failure.  <!-- unwanted-behavior -->
4. WHEN the user has `security` false THEN the system SHALL NOT send these notifications.  <!-- event-driven -->

**Independent Test**: Função `notifySecurity(userId, kind)` com `web-push` simulado; ação de revogar com envio que lança, conferindo o `ok: true`.

---

### P2: Mensagem do administrador

**User Story**: As a administrador, I want to send a short notice to every subscribed user.

**Why P2**: Canal de aviso operacional (ex.: manutenção).

**Acceptance Criteria**:

1. WHEN the administrator submits a message in `/admin/cadastros` THEN `broadcastPushAction` SHALL store it in `push_broadcast` and respond `ok`.  <!-- event-driven -->
2. IF the message is empty after `trim` or longer than 140 characters THEN `broadcastPushAction` SHALL return the error "A mensagem deve ter de 1 a 140 caracteres" and store nothing.  <!-- unwanted-behavior -->
3. IF the caller is not the administrator THEN `broadcastPushAction` SHALL refuse it (`requireAdminForAction`).  <!-- unwanted-behavior -->
4. WHEN dispatch runs and a stored broadcast exists THEN the system SHALL send its text, with title "ANON", once to every subscription of each approved user with `admin` true, using `push_dispatch` (kind "broadcast", ref = broadcast id) to avoid repeats.  <!-- event-driven -->
5. WHEN every eligible user has a `push_dispatch` row for a broadcast THEN the system SHALL mark it `sent_at`.  <!-- event-driven -->

**Independent Test**: Schema puro do texto (0, 1, 140, 141 caracteres, só espaços); dispatch com dois usuários, um com `admin` false.

---

### P2: Service worker recebe push

**User Story**: As a usuário, I want the notification shown and a tap to open the app.

**Why P2**: Completa o P1 no lado do navegador.

**Acceptance Criteria**:

1. WHEN the service worker receives a `push` event with a JSON payload THEN the system SHALL call `showNotification` with the payload `title` and `body` as strings, `icon` "/icon-192.png" and `badge` "/icon-192.png".  <!-- event-driven -->
2. IF the push has no data, invalid JSON, or non-string `title` or `body` THEN the system SHALL show title "ANON" and body "Você tem uma nova notificação.".  <!-- unwanted-behavior -->
3. WHEN the user taps a notification THEN the system SHALL close it and focus an open same-origin window navigated to the target, or open the target in a new window when none is open.  <!-- event-driven -->
4. The system SHALL use the payload `url` as the target only when it is a string starting with "/" and not "//"; otherwise the target SHALL be "/".  <!-- ubiquitous -->
5. The system SHALL keep the cache rules of the P1 service worker story unchanged, without storing any push payload.  <!-- ubiquitous -->

**Independent Test**: `sw.js` em `vm` com `self` simulado dispara `push` e `notificationclick`.

---

### P2: Disparo horário e documentação

**User Story**: As a mantenedor, I want the dispatch scheduled and the privacy exception recorded.

**Why P2**: Sem agendador nada sai; sem registro a AD-013 fica contraditória.

**Acceptance Criteria**:

1. The system SHALL provide `.github/workflows/push-dispatch.yml` triggered by `schedule` with cron `7 * * * *` and by `workflow_dispatch`.  <!-- ubiquitous -->
2. WHEN the workflow runs THEN the system SHALL call `POST` on `${APP_URL}/api/push/dispatch` with `Authorization: Bearer ${CRON_SECRET}` using `curl --fail --silent --show-error` and fail the job on a non-2xx answer.  <!-- event-driven -->
3. The system SHALL NOT print `APP_URL`'s query, `CRON_SECRET` or the response body to the job log.  <!-- ubiquitous -->
4. The system SHALL list `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `CRON_SECRET` in `.env.example`.  <!-- ubiquitous -->
5. The system SHALL record the AD-013 exception as AD-016 in `.specs/STATE.md`.  <!-- ubiquitous -->
6. The system SHALL state in the privacy policy page and in the `/conta` "Seus dados" card that notification preferences and push endpoints are stored unencrypted and that push passes through the browser vendor's service.  <!-- ubiquitous -->

**Independent Test**: Teste que lê o YAML, `.env.example` e `STATE.md` (como `backup-workflow.test.ts`).

---

## Edge Cases

- IF the user logs out or switches account THEN the system SHALL have nothing to clear, because no authenticated response is ever stored.
- IF `/_next/static/` returns a non-200 status THEN the system SHALL return it without storing.
- WHEN a new deploy changes the hashed assets THEN the system SHALL fetch the new ones from the network, because their URLs differ from the cached ones.
- IF a user has two recurring series on the same day THEN the system SHALL send one "due" notification for that day.
- IF the user changes `hour` to an earlier hour after the day's reminder was sent THEN the system SHALL NOT send a second reminder that day.
- IF a user is revoked THEN the system SHALL NOT send reminders or due notices to that user (status not `approved`).
- IF the user logs out THEN the system SHALL keep the subscription of the device (it belongs to the device and user, not the session).
- IF the cache `anon-static-v1` lacks `/offline.html` when a navigation fails THEN the system SHALL return `Response.error()`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PWA-01 | P1: instalável — manifest | - | Implementing |
| PWA-02 | P1: instalável — ícones | - | Implementing |
| PWA-03 | P1: instalável — Apple touch icon | - | Implementing |
| PWA-04 | P1: instalável — theme color | - | Implementing |
| PWA-05 | P1: instalável — rotas públicas | - | Implementing |
| PWA-06 | P1: instalável — demais rotas protegidas | - | Implementing |
| PWA-07 | P1: SW — precache | - | Implementing |
| PWA-08 | P1: SW — limpeza na ativação | - | Implementing |
| PWA-09 | P1: SW — `_next/static` cache-first | - | Implementing |
| PWA-10 | P1: SW — fallback offline | - | Implementing |
| PWA-11 | P1: SW — navegação não é guardada | - | Implementing |
| PWA-12 | P1: SW — não intercepta o resto | - | Implementing |
| PWA-13 | P1: SW — cabeçalhos de `/sw.js` | - | Implementing |
| PWA-14 | P1: SW — skipWaiting e claim | - | Implementing |
| PWA-15 | P1: offline — textos | - | Implementing |
| PWA-16 | P1: offline — sem script nem recurso externo | - | Implementing |
| PWA-17 | P1: offline — link de nova tentativa | - | Implementing |
| PWA-18 | P2: registro — em produção | - | Implementing |
| PWA-19 | P2: registro — fora de produção | - | Implementing |
| PWA-20 | P2: registro — falha engolida | - | Implementing |
| PWA-21 | P2: instalar — botão | - | Implementing |
| PWA-22 | P2: instalar — `prompt()` | - | Implementing |
| PWA-23 | P2: instalar — instrução iOS | - | Implementing |
| PWA-24 | P2: instalar — já instalado | - | Implementing |
| PWA-25 | P2: instalar — sem suporte | - | Implementing |
| PUSH-01 | P1: ativar — seção visível com VAPID | - | Implementing |
| PUSH-02 | P1: ativar — inscrever | - | Implementing |
| PUSH-03 | P1: ativar — armazenar e criar preferências | - | Implementing |
| PUSH-04 | P1: ativar — permissão negada | - | Implementing |
| PUSH-05 | P1: ativar — endpoint fora da lista | - | Implementing |
| PUSH-06 | P1: ativar — chaves inválidas | - | Implementing |
| PUSH-07 | P1: ativar — limite de 5 | - | Implementing |
| PUSH-08 | P1: ativar — endpoint repetido | - | Implementing |
| PUSH-09 | P1: ativar — desativar | - | Implementing |
| PUSH-10 | P1: ativar — ação exige sessão | - | Implementing |
| PUSH-11 | P1: ativar — exclusão da conta | - | Implementing |
| PUSH-12 | P1: ativar — iOS sem instalar | - | Implementing |
| PUSH-13 | P1: ativar — navegador sem suporte | - | Implementing |
| PUSH-14 | P1: ativar — aviso de terceiro | - | Implementing |
| PUSH-15 | P1: preferências — controles | - | Implementing |
| PUSH-16 | P1: preferências — salvar | - | Implementing |
| PUSH-17 | P1: preferências — validação | - | Implementing |
| PUSH-18 | P1: preferências — sem preferências | - | Implementing |
| PUSH-19 | P1: preferências — só o próprio usuário | - | Implementing |
| PUSH-20 | P1: envio — 401 sem segredo | - | Implementing |
| PUSH-21 | P1: envio — 503 sem configuração | - | Implementing |
| PUSH-22 | P1: envio — rota pública | - | Implementing |
| PUSH-23 | P1: envio — só aprovados com inscrição | - | Implementing |
| PUSH-24 | P1: envio — lembrete | - | Implementing |
| PUSH-25 | P1: envio — vencimento | - | Implementing |
| PUSH-26 | P1: envio — idempotência | - | Implementing |
| PUSH-27 | P1: envio — 410/404 remove | - | Implementing |
| PUSH-28 | P1: envio — outra falha mantém | - | Implementing |
| PUSH-29 | P1: envio — payload fixo e TTL | - | Implementing |
| PUSH-30 | P1: envio — limite de envios | - | Implementing |
| PUSH-31 | P1: envio — limpeza e resposta | - | Implementing |
| PUSH-32 | P1: envio — demais rotas protegidas | - | Implementing |
| PUSH-33 | P2: segurança — senha redefinida | - | Implementing |
| PUSH-34 | P2: segurança — acesso revogado | - | Implementing |
| PUSH-35 | P2: segurança — falha não bloqueia | - | Implementing |
| PUSH-36 | P2: segurança — preferência desligada | - | Implementing |
| PUSH-37 | P2: admin — enfileirar | - | Implementing |
| PUSH-38 | P2: admin — validar texto | - | Implementing |
| PUSH-39 | P2: admin — somente admin | - | Implementing |
| PUSH-40 | P2: admin — entrega única | - | Implementing |
| PUSH-41 | P2: admin — marcar enviada | - | Implementing |
| PUSH-42 | P2: SW push — mostrar | - | Implementing |
| PUSH-43 | P2: SW push — payload inválido | - | Implementing |
| PUSH-44 | P2: SW push — clique | - | Implementing |
| PUSH-45 | P2: SW push — URL segura | - | Implementing |
| PUSH-46 | P2: SW push — cache intacto | - | Implementing |
| PUSH-47 | P2: disparo e docs — workflow | - | Implementing |
| PUSH-48 | P2: disparo e docs — chamada do dispatch | - | Implementing |
| PUSH-49 | P2: disparo e docs — sem vazamento no log | - | Implementing |
| PUSH-50 | P2: disparo e docs — .env.example | - | Implementing |
| PUSH-51 | P2: disparo e docs — AD-016 | - | Implementing |
| PUSH-52 | P2: disparo e docs — texto de privacidade | - | Pending |

**Coverage:** 77 total, 0 mapped to tasks, 77 unmapped ⚠️

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run test:int` passam.
- [ ] Com chaves VAPID válidas, ativar o push no Chrome e chamar o dispatch com o segredo entrega a notificação de lembrete; uma segunda chamada no mesmo dia não entrega outra.
- [ ] Nenhum payload enviado contém valor, nome, categoria ou descrição (conferido nos testes de `push-messages.ts` e do dispatch).
- [ ] `npm run build && npm start` serve `/manifest.webmanifest`, `/sw.js` e `/offline.html` a um cliente sem sessão (`curl`, status 200).
- [ ] No DevTools > Application, o Chrome lista o manifest sem erros e o cache `anon-static-v1` contém apenas os itens da AC PWA-07 e `/_next/static/*`.
