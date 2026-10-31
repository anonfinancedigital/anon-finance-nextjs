# PWA e Push Validation

## Validation: PWA e Push - PASS ✅

**Date**: 2026-10-31
**Spec**: `.specs/features/pwa/spec.md`
**Diff range**: `main..feat/pwa-push` (44 commits, de `69868a6 docs(pwa): add spec, design and tasks` a `04ab557 docs(push): add the push and PWA runbook`; 82 arquivos, +8115/-13)
**Verifier**: sub-agente independente (autor ≠ verificador)

Veredito: as 77 exigências (PWA-01..25, PUSH-01..52) e os 8 edge cases têm evidência `file:line` cujo valor asserido bate com o resultado da spec (UI sem teste por AD-005, com evidência de implementação). Gates verdes (o único erro de lint é pré-existente, vem da `main` e é alheio à feature). O sensor matou 48 de 48 mutantes. Ficam 3 lacunas de precisão da spec, menores e sem efeito no comportamento exigido, e 5 observações (nenhuma bloqueante).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T43 | ✅ Done | Todas com os checkboxes "Done when" marcados em `tasks.md`; nenhuma bloqueada ou parcial |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ PASS (valor asserido = valor da spec); 🔎 UI por inspeção (AD-005: sem e2e; evidência de implementação); ⚠️ lacuna de precisão da spec.

### P1: App instalável

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PWA-01 | `name`/`short_name` "ANON", `start_url` "/", `scope` "/", `display` "standalone", `lang` "pt-BR", cores "#0D111A" | `src/app/manifest.test.ts:8-21` - `expect(m.name).toBe("ANON")`, `expect(m.display).toBe("standalone")`, `expect(m.theme_color).toBe("#0D111A")` etc. | ✅ |
| PWA-02 | 3 ícones PNG com tamanhos e `purpose: "maskable"`; arquivos existem com as dimensões | `src/app/manifest.test.ts:24-29` - `expect(m.icons).toEqual([...192x192..., ...512x512..., {..., purpose: "maskable"}])`; `src/lib/pwa/icons.test.ts:16-22` - `expect(pngSize(file)).toEqual({ width: size, height: size })` (lê o IHDR real) | ✅ |
| PWA-03 | Apple touch icon 180x180; `appleWebApp` capable com título "ANON" | `src/lib/pwa/metadata.test.ts:5-14` - `toMatchObject({ capable: true, title: "ANON" })`, `icons` `{ apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" ...}] }`; ligado em `src/app/layout.tsx:41,50` | ✅ |
| PWA-04 | viewport `themeColor` "#0D111A" | `src/lib/pwa/metadata.test.ts:17-19` - `expect(pwaViewport.themeColor).toBe("#0D111A")`; `src/app/layout.tsx:37` | ✅ (ver Observação O1) |
| PWA-05 | as 3 rotas sem redirecionar a `/login` | `src/proxy.test.ts:11-13` - `expect(proxyRuns(path)).toBe(false)` para `/manifest.webmanifest`, `/sw.js`, `/offline.html` | ✅ |
| PWA-06 | demais caminhos seguem redirecionando | `src/proxy.test.ts:15-17` - `proxyRuns` `true` em `/`, `/conta`, `/sw.json`; `src/lib/route-decision.test.ts:101-105` - `toEqual({ action: "redirect", to: "/login", noStore: true })` | ✅ |

### P1: Service worker que não guarda dados

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PWA-07 | precache exato de `/offline.html`, `/icon-192.png`, `/icon-512.png` em `anon-static-v1` | `src/lib/pwa/sw.test.ts:125-130` - `expect(sw.addAllCalls).toEqual([{ cache: "anon-static-v1", urls: ["/offline.html", "/icon-192.png", "/icon-512.png"] }])` | ✅ |
| PWA-08 | apagar todo cache != `anon-static-v1` | `src/lib/pwa/sw.test.ts:141-149` - `expect([...sw.stores.keys()]).toEqual(["anon-static-v1"])` | ✅ |
| PWA-09 | cache-first em `/_next/static/`, guarda só status 200 | `src/lib/pwa/sw.test.ts:162-177` - `expect(result).toBe(cached)`, `expect(sw.network).not.toHaveBeenCalled()`, `...get(url)?.tag).toBe("fresh")` | ✅ |
| PWA-10 | falha de rede em navegação → `/offline.html` do cache | `src/lib/pwa/sw.test.ts:190-196` - `expect((result as FakeResponse).tag).toBe("/offline.html")` | ✅ |
| PWA-11 | resposta HTTP de navegação (qualquer status) devolvida e não guardada | `src/lib/pwa/sw.test.ts:204-212` - `it.each([200, 404, 500])` `expect(result).toBe(page)`; `expect(handle.put).not.toHaveBeenCalled()` | ✅ |
| PWA-12 | não intercepta não-GET, cross-origin, nem caminho fora de `/_next/static/` que não seja navegação | `src/lib/pwa/sw.test.ts:215-231` - 9 casos (POST, Server Action, cross-origin, `/api/*`, `/api/auth`, `/monitoring`, RSC `?_rsc=`, ícone) `expect(intercepted).toBe(false)` | ✅ |
| PWA-13 | `/sw.js` com `Cache-Control: no-cache, no-store, must-revalidate` e CSP `default-src 'self'; script-src 'self'` | `src/lib/security-headers.test.ts:180-183` - `expect(valuesOf("/sw.js", "Content-Security-Policy")).toEqual(["default-src 'self'; script-src 'self'"])`, idem `Cache-Control` e `Content-Type` (uma única CSP efetiva) | ✅ |
| PWA-14 | `skipWaiting` no install, `clients.claim` no activate | `src/lib/pwa/sw.test.ts:133-136` - `expect(sw.skipWaiting).toHaveBeenCalledTimes(1)`; `:152-155` - `expect(sw.claim).toHaveBeenCalledTimes(1)` | ✅ |

### P1: Tela offline

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PWA-15 | `lang="pt-BR"`, título "ANON • Sem conexão", os dois textos exatos | `src/lib/pwa/offline-page.test.ts:8-16` - `toContain('<html lang="pt-BR">')`, `toContain("<title>ANON • Sem conexão</title>")`, `toContain("Você está sem conexão")`, `toContain("Seus dados continuam protegidos. Reconecte-se para continuar.")` | ✅ |
| PWA-16 | sem `<script>` nem recurso externo | `src/lib/pwa/offline-page.test.ts:22-28` - `not.toContain("<script")`, `not.toMatch(/https?:\/\//)` | ✅ |
| PWA-17 | link `href="/"` "Tentar novamente" | `src/lib/pwa/offline-page.test.ts:18-20` - `toContain('<a href="/">Tentar novamente</a>')` | ✅ |

### P2: Registro do service worker

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PWA-18 | registra `/sw.js` com `scope "/"` e `updateViaCache "none"` em produção | `src/lib/pwa/register.test.ts:9-13` - `toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" })`; montagem em `src/app/layout.tsx:68`, `src/components/pwa-register.tsx:9` | ✅ |
| PWA-19 | fora de produção não registra | `src/lib/pwa/register.test.ts:16-19` - `development`/`test`/`undefined` → `not.toHaveBeenCalled()` | ✅ |
| PWA-20 | erro engolido sem lançar nem logar | `src/lib/pwa/register.test.ts:26-34` - `resolves.toBeUndefined()` (rejeição e throw síncrono); `src/lib/pwa/register.ts:18-20` catch vazio, sem log | ✅ |

### P2: Aviso de instalação em `/conta`

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PWA-21 | guarda o evento, `preventDefault`, mostra "Instalar app" | `src/lib/pwa/install-hint.test.ts:19-22` - `toBe("button")`; 🔎 `src/components/install-card.tsx:36-39` (`preventDefault`, `setPrompt`), `:56` texto "Instalar app" | ✅ 🔎 |
| PWA-22 | clique chama `prompt()` e esconde o botão | 🔎 `src/components/install-card.tsx:52-53` - `void prompt?.prompt(); setPrompt(null);` (com `hasPrompt` falso, `installHint` devolve "none" fora do iOS: `install-hint.test.ts:29-32`) | ✅ 🔎 |
| PWA-23 | iOS fora de standalone mostra o texto exato | `src/lib/pwa/install-hint.test.ts:11-17` - iPhone/iPad/iPod `toBe("ios")`; 🔎 `src/components/install-card.tsx:59` texto idêntico ao da spec | ✅ 🔎 |
| PWA-24 | standalone → sem seção | `src/lib/pwa/install-hint.test.ts:24-27` - `toBe("none")`; 🔎 `install-card.tsx:44` `return null` | ✅ |
| PWA-25 | sem evento e não iOS → sem seção | `src/lib/pwa/install-hint.test.ts:29-32` - `toBe("none")` | ✅ |

### P1: Ativar e desativar notificações

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-01 | seção "Notificações" só com as 3 VAPID | `src/lib/push/config.test.ts:17-25` - `toBeNull()` sem/vazia qualquer uma; 🔎 `src/app/(app)/conta/page.tsx:22,55-57` só renderiza com `pushPublicKey`; título em `src/components/push-settings-card.tsx:158` | ✅ 🔎 |
| PUSH-02 | `userVisibleOnly: true`, chave VAPID, `subscribePushAction` com endpoint/`p256dh`/`auth` | 🔎 `src/components/push-settings-card.tsx:105-109`; `src/lib/pwa/push-ui-state.test.ts:49-54` (estado "off" mostra o botão) | ✅ 🔎 |
| PUSH-03 | grava para o usuário e cria preferências `false,false,true,true,9` | `src/actions/push.int.test.ts:68-77` - `objectContaining({ userId, endpoint, p256dh, auth })`, `preferences()` `objectContaining({ userId, ...DEFAULTS })`; `src/lib/db/repos/push.int.test.ts:20-31` | ✅ |
| PUSH-04 | "denied" mostra o texto exato e não grava | `src/lib/pwa/push-ui-state.test.ts:35-40` - `toBe("blocked")`; 🔎 `push-settings-card.tsx:98-99` (retorna antes de qualquer chamada ao servidor), `:161` texto idêntico | ✅ 🔎 |
| PUSH-05 | endpoint fora da allowlist → "Este navegador não é compatível com notificações", nada gravado | `src/actions/push.int.test.ts:88-99` - `toMatchObject({ ok: false, error: "Este navegador não é compatível com notificações" })`, `subscriptions()` `[]`; `src/lib/validation/push.test.ts:24-41` (http, localhost, IPv4/IPv6, porta, credenciais, sósias) | ✅ |
| PUSH-06 | chaves inválidas → "Inscrição inválida", nada gravado | `src/actions/push.int.test.ts:101-111` - `toMatchObject({ ok: false, error: "Inscrição inválida" })`; `src/lib/validation/push.test.ts:62-81` (64/66 bytes, sem 0x04, 15/17 bytes) | ✅ |
| PUSH-07 | 6º endpoint → "Limite de 5 dispositivos atingido", nada gravado | `src/actions/push.int.test.ts:120-129` - `toEqual({ ok: false, error: "Limite de 5 dispositivos atingido" })`, `toHaveLength(5)`; concorrência `src/lib/db/repos/push.int.test.ts:100-109` | ✅ |
| PUSH-08 | endpoint repetido atualiza chaves e dono sem 2ª linha | `src/actions/push.int.test.ts:131-141` - `toEqual([objectContaining({ userId, endpoint, p256dh: P256DH, auth: AUTH })])`; `src/lib/db/repos/push.int.test.ts:61-85` | ✅ |
| PUSH-09 | `unsubscribe()` no navegador + ação apaga só a linha do dono | `src/actions/push.int.test.ts:187-206` - endpoints restantes `toEqual([kept.endpoint])`; outro dono intacto; 🔎 `push-settings-card.tsx:134-135` | ✅ 🔎 |
| PUSH-10 | sem sessão aprovada → resultado de `requireSessionForAction` | `src/actions/push.int.test.ts:158-176,208-227,282-298` - `toEqual({ ok: false, error: "UNAUTHORIZED" })` (anônimo e revogado) e repo não chamado | ✅ |
| PUSH-11 | excluir conta apaga inscrições, preferências e registros de envio | `src/lib/db/push-schema.int.test.ts:105-120` - `toHaveLength(0)` nas 3 tabelas e a linha do outro usuário mantida | ✅ |
| PUSH-12 | iOS fora de standalone: texto exato e sem botão | `src/lib/pwa/push-ui-state.test.ts:21-26` - `toBe("ios-install")`; 🔎 `push-settings-card.tsx:160` texto, botão só em `off`/`on` (`:162-172`) | ✅ 🔎 |
| PUSH-13 | sem `serviceWorker`/`PushManager`: texto exato e sem botão | `src/lib/pwa/push-ui-state.test.ts:28-33` - `toBe("unsupported")`; 🔎 `push-settings-card.tsx:29,159` | ✅ 🔎 |
| PUSH-14 | aviso do terceiro ao lado do controle | 🔎 `src/components/push-settings-card.tsx:173-176` texto idêntico ao da spec | ✅ 🔎 |

### P1: Preferências de notificação

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-15 | com ≥1 inscrição: 4 switches e hora 0..23 | 🔎 `src/components/push-settings-card.tsx:42-49` (4 rótulos, `HOURS` de 24), `:179-201` (só com `devices > 0`); `devices` vem de `src/lib/db/repos/push.int.test.ts:149-157` - `toEqual({ devices: 2, prefs: DEFAULTS })` | ✅ 🔎 |
| PUSH-16 | salvar os 5 campos para o chamador | `src/actions/push.int.test.ts:240-246` - `objectContaining({ userId, ...prefs })`; 🔎 `push-settings-card.tsx:150` | ✅ |
| PUSH-17 | hora não inteira 0..23 ou switch não booleano → "Preferências inválidas", nada salvo | `src/actions/push.int.test.ts:259-274` - `toMatchObject({ ok: false, error: "Preferências inválidas" })` e prefs = DEFAULTS; `src/lib/validation/push.test.ts:84-101` (-1, 0, 23, 24, 9.5, "9", null; "true", 1, null) | ✅ |
| PUSH-18 | sem linha de preferências → "Ative as notificações primeiro" | `src/actions/push.int.test.ts:276-280` - `toEqual({ ok: false, error: "Ative as notificações primeiro" })`, `preferences()` `[]` | ✅ |
| PUSH-19 | só a própria linha, nunca id do cliente | `src/actions/push.int.test.ts:248-257` - prefs do outro seguem `DEFAULTS`; `:79-86` (inscrição); `src/lib/validation/push.test.ts:103-105` | ✅ |

### P1: Envio agendado

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-20 | sem Bearer correto → 401 sem corpo, nada enviado, comparação em tempo constante | `src/app/api/push/dispatch/route.test.ts:59-71` - `toBe(401)`, `text()` `""`, `runDispatch` não chamado (5 variantes); `:73-80` - `timingSafeEqual` chamado com digests de 32 bytes | ✅ |
| PUSH-21 | `CRON_SECRET` ou VAPID ausente → 503, nada enviado | `src/app/api/push/dispatch/route.test.ts:43-57` - `toBe(503)`, corpo `""`, inclusive sem `Authorization` | ✅ |
| PUSH-22 | anônimo não é redirecionado | `src/lib/route-decision.test.ts:97-99` - `toEqual({ action: "next", noStore: false })` | ✅ |
| PUSH-23 | só `approved` com ≥1 inscrição | `src/lib/db/repos/push-dispatch.int.test.ts:56-70` - `ids(candidates)` `toEqual([approved.userId])` (revogado, pendente e sem inscrição fora); `:151-160`; `:193-209` | ✅ |
| PUSH-24 | `reminder`, hora local ≥ preferida, sem claim → claim + texto exato a toda inscrição | `src/lib/push/dispatch.test.ts:61-75` - `reminderCandidates` `("2026-10-15", 12)`, `claim("u1","reminder","2026-10-15")`, `send.mock.calls` com "Que tal registrar seus gastos de hoje?" nas 2 inscrições; `src/lib/db/repos/push-dispatch.int.test.ts:79-85` (8 fora, 9 e 23 dentro); `src/lib/domain/push-schedule.test.ts:14-26` (fuso) | ✅ |
| PUSH-25 | `due` + ocorrência hoje → texto exato | `src/lib/push/dispatch.test.ts:77-86` - `[[config, sub, "Você tem lançamentos recorrentes para hoje."]]`; `src/lib/db/repos/push-dispatch.int.test.ts:97-149` (série ativa, encerrada, futura, outro dia, avulsa, dia 31) | ✅ |
| PUSH-26 | conflito no claim → não envia | `src/lib/push/dispatch.test.ts:115-122` - `send` `not.toHaveBeenCalled()`; `:88-104` ordem `["claim","send"]`; `:106-113` 2ª execução `sent: 0`; `src/lib/db/repos/push-dispatch.int.test.ts:164-181` (true uma vez, inclusive concorrente) | ✅ |
| PUSH-27 | 404/410 → apagar a inscrição | `src/lib/push/send.test.ts:64-67` - `toBe("gone")`; `src/lib/push/dispatch.test.ts:124-132` - `removeByEndpoint.mock.calls` `toEqual([[sub("u1-0").endpoint]])` | ✅ |
| PUSH-28 | outro erro: mantém, loga sem endpoint/chaves, continua | `src/lib/push/send.test.ts:69-78` - `consoleError` `("sendPush", "push_500")`; `:101-114` - logs não contêm endpoint, `p256dh`, `auth` nem chave privada; `src/lib/push/dispatch.test.ts:124-132` continua (`sent: 2, failed: 1`) | ✅ (código de log ⚠️ G2) |
| PUSH-29 | TTL 86400 e payload `{"title":"ANON","body":<texto>,"url":"/"}` só de constantes | `src/lib/push/send.test.ts:49-62` - `payload` `toBe('{"title":"ANON","body":"Que tal registrar seus gastos de hoje?","url":"/"}')`, `TTL: 86400`; `src/lib/domain/push-messages.test.ts:5-26` | ✅ |
| PUSH-30 | ≤1000 envios por execução, ≤20 em voo, resto na próxima | `src/lib/push/dispatch.test.ts:134-156` - `sent: 1000`, `maxInFlight` ≤ 20, `claims.size` 1000, 2ª execução `sent: 5`; prazo `:158-188` | ✅ |
| PUSH-31 | apagar `push_dispatch` > 7 dias e 200 com só `{sent,removed,failed}` | `src/app/api/push/dispatch/route.test.ts:82-94` - `text()` `toBe('{"sent":3,"removed":1,"failed":2}')` (campo extra descartado); `src/lib/push/dispatch.test.ts:226-232` - `prune` `(2026-10-08T15:00Z)`; `src/lib/db/repos/push-dispatch.int.test.ts:226-238` | ✅ |
| PUSH-32 | demais caminhos seguem protegidos | `src/lib/route-decision.test.ts:101-105` - `/api/push/dispatch-x`, `/api/push` → redirect `/login` | ✅ |

### P2: Avisos de segurança

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-33 | reset concluído com `security` true → "Sua senha foi redefinida." a toda inscrição | `src/lib/push/security.int.test.ts:37-48` - textos `toEqual(["Sua senha foi redefinida.", ...])`, endpoints = todos do dono, outro usuário fora; `src/actions/password-reset.int.test.ts:949-969` - `notifySecurity.mock.calls` `toEqual([[userId, "password_reset"]])` (clássico e selado) | ✅ |
| PUSH-34 | revogação → "Seu acesso ao ANON foi revogado." | `src/lib/push/security.int.test.ts:50-57` - `toEqual(["Seu acesso ao ANON foi revogado."])`; `src/actions/admin-users.int.test.ts:345-351` - `toEqual([[userId, "revoked"]])` | ✅ |
| PUSH-35 | falha no aviso não impede reset/revogação e é logada | `src/lib/push/security.int.test.ts:86-94` - `resolves.toBeUndefined()`, `consoleError` `("notifySecurity", "unknown")`; `src/actions/admin-users.int.test.ts:365-375` - `{ ok: true }` e status `revoked`; `src/actions/password-reset.int.test.ts:993-1015` | ✅ |
| PUSH-36 | `security` false → nada | `src/lib/push/security.int.test.ts:59-66` - `send` `not.toHaveBeenCalled()`; `src/lib/db/repos/push.int.test.ts:209-215` | ✅ |

### P2: Mensagem do administrador

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-37 | grava em `push_broadcast` e responde `ok` | `src/actions/push-admin.int.test.ts:31-37` - `toEqual({ ok: true })`, `objectContaining({ text: "Manutenção hoje às 22h", sentAt: null })`; 🔎 form em `src/app/(app)/admin/cadastros/page.tsx:19` | ✅ (texto de sucesso da UI ⚠️ G3) |
| PUSH-38 | vazio após trim ou >140 → "A mensagem deve ter de 1 a 140 caracteres" | `src/actions/push-admin.int.test.ts:39-53` - 140 aceito; "", "   ", 141 `toMatchObject({ ok: false, error: LENGTH_ERROR })` e nada gravado | ✅ |
| PUSH-39 | não admin → `requireAdminForAction` | `src/actions/push-admin.int.test.ts:55-70` - `toEqual({ ok: false, error: "UNAUTHORIZED" })` (comum e anônimo) | ✅ |
| PUSH-40 | uma vez por inscrição de cada aprovado com `admin` true, claim `("broadcast", id)` | `src/lib/push/dispatch.test.ts:190-202` - claims `[["u1","broadcast","b-1"],["u2","broadcast","b-1"]]`, corpo = texto do admin; `src/lib/db/repos/push-dispatch.int.test.ts:193-209` (admin false, revogado, sem inscrição e já reivindicado fora) | ✅ |
| PUSH-41 | todos elegíveis com claim → `sent_at` | `src/lib/push/dispatch.test.ts:204-224` - marca `b-1`/`b-2`; não marca com alvo restante; `src/lib/db/repos/push-dispatch.int.test.ts:211-222` - `sentAt` `toBeInstanceOf(Date)` | ✅ |

### P2: Service worker recebe push

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-42 | `showNotification(title, { body, icon "/icon-192.png", badge "/icon-192.png" })` | `src/lib/pwa/sw.test.ts:253-264` - `title` `toBe("ANON")`, `toMatchObject({ body, icon: "/icon-192.png", badge: "/icon-192.png" })` | ✅ |
| PUSH-43 | sem dado/JSON inválido/não string → "ANON" e "Você tem uma nova notificação." | `src/lib/pwa/sw.test.ts:268-282` - 6 casos `title` `toBe("ANON")`, `body: "Você tem uma nova notificação."` | ✅ |
| PUSH-44 | fecha, foca janela da mesma origem navegando ao alvo, ou abre nova | `src/lib/pwa/sw.test.ts:294-320` - `close` 1x, `win.focus` 1x, `win.navigate` `("/conta")`, `openWindow` não chamado; outra origem ignorada | ✅ (ver O2) |
| PUSH-45 | `url` só se string com "/" e não "//"; senão "/" | `src/lib/pwa/sw.test.ts:323-349` - `//evil`, absoluta, relativa, `/\evil`, número, ausente → `openWindow("/")` | ✅ |
| PUSH-46 | regras de cache intactas; payload não guardado | `src/lib/pwa/sw.test.ts:354-360` - `sw.stores.size` `toBe(0)`, rede não chamada | ✅ |

### P2: Disparo horário e documentação

| Req | Resultado definido pela spec | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| PUSH-47 | `schedule` cron `7 * * * *` + `workflow_dispatch` | `src/lib/push-dispatch-workflow.test.ts:9-13` - `toMatch(/- cron: "7 \* \* \* \*"/)`, `toMatch(/workflow_dispatch:/)` | ✅ |
| PUSH-48 | `POST ${APP_URL}/api/push/dispatch`, Bearer, `curl --fail --silent --show-error` | `src/lib/push-dispatch-workflow.test.ts:15-25`; `.github/workflows/push-dispatch.yml:22` | ✅ |
| PUSH-49 | não imprimir query do `APP_URL`, segredo nem corpo | `src/lib/push-dispatch-workflow.test.ts:27-42` - `--output /dev/null`, sem `-v`/`echo`/`set -x`, segredos só via `env:` | ✅ |
| PUSH-50 | 4 variáveis no `.env.example` | `src/lib/env-example.test.ts:8-16` - `toBe(\`${key}=\`)` com comentário acima; `.env.example:29-35` | ✅ |
| PUSH-51 | AD-016 em `STATE.md` | `src/lib/push-decision.test.ts:14-33` - `Status: active`, cita AD-013, campos preenchidos; `.specs/STATE.md:125-131` | ✅ |
| PUSH-52 | política e card "Seus dados" dizem que preferências e endpoints ficam sem cifra e que o push passa pelo fabricante | 🔎 `src/app/(app)/conta/page.tsx:42-44`; `src/components/privacy/privacy-content.tsx:58-59` | ✅ 🔎 |

**Status**: ✅ 77/77 exigências cobertas com valor da spec | ⚠️ 3 lacunas de precisão da spec (abaixo)

### Regra payload/conjunção

Conferida nos pontos de payload: `send.test.ts:55-61` checa os três argumentos do `sendNotification` por valor (alvo, JSON exato, TTL + VAPID); `dispatch.test.ts:71-74,85,197-201` checa `send.mock.calls` completos (config, inscrição, texto); `security.int.test.ts:44-47` checa endpoint, texto e config; `admin-users.int.test.ts:350` e `password-reset.int.test.ts:953,959,968` checam `(userId, kind)`; `route.test.ts:90-93` checa a `config` passada ao runner. Nenhum teste só verifica "foi chamado" onde a spec define valor.

---

## Edge Cases

- [x] Logout/troca de conta sem nada a limpar: nenhuma resposta autenticada é guardada - `src/lib/pwa/sw.test.ts:204-212` (navegação nunca vai ao cache) e `:215-231` (API, RSC, auth não interceptados).
- [x] `/_next/static/` não-200 devolvido sem guardar - `src/lib/pwa/sw.test.ts:179-184`.
- [x] Novo deploy: assets com hash novo vêm da rede - `src/lib/pwa/sw.test.ts:172-177` (miss → rede → cache).
- [x] Duas séries no mesmo dia → um "due" - `src/lib/db/repos/push-dispatch.int.test.ts:143-149` (`ids` = `[userId]`); `src/lib/domain/push-schedule.test.ts:58-62`.
- [x] Hora alterada para mais cedo após o lembrete → sem 2º lembrete: o claim é por (usuário, "reminder", data), independente da hora - `src/lib/db/repos/push-dispatch.int.test.ts:87-93`; `src/lib/push/dispatch.test.ts:106-113`.
- [x] Revogado não recebe lembrete nem vencimento - `src/lib/db/repos/push-dispatch.int.test.ts:56-70,151-160`.
- [x] Logout mantém a inscrição: nenhum caminho de logout toca `push_subscription` (só `ON DELETE cascade` do usuário, `drizzle/0017_groovy_diamondback.sql:41`); por inspeção, sem teste dedicado.
- [x] Cache sem `/offline.html` → `Response.error()` - `src/lib/pwa/sw.test.ts:198-201`.

---

## Discrimination Sensor

Scratch: `git worktree add --detach /tmp/pwa-sensor HEAD` com `node_modules` por symlink; cada mutação aplicada só na scratch, testes relevantes rodados lá (`vitest --project unit` ou `--project integration` com `DATABASE_URL=.../orcamento_pwa_test`), arquivo restaurado com `git checkout` na scratch; ao fim `git worktree remove --force` + `git worktree prune`. `git status --porcelain` da árvore real: baseline vazio (0 bytes) e idêntico depois (`diff` sem saída). Nenhum `git stash`.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| M01 | `src/lib/validation/push.ts:23` | allowlist aceita qualquer host (SSRF) | ✅ Killed (12 testes) |
| M01b | `src/lib/validation/push.ts:9` | sufixos sem o ponto (`push.apple.com`) | ✅ Killed |
| M02 | `src/lib/push/send.ts:17` | `sendPush` sem revalidar o endpoint | ✅ Killed (4) |
| M03 | `src/lib/push/dispatch.ts:67` | `if (!claimed)` → `if (false)` (envia sem claim) | ✅ Killed |
| M03b | `src/lib/push/dispatch.ts:65` | claim removido (`claimed = true`) | ✅ Killed (8) |
| M04 | `src/app/api/push/dispatch/route.ts:18` | segredo comparado consigo mesmo (sempre autoriza) | ✅ Killed (5) |
| M04b | `src/app/api/push/dispatch/route.ts:25` | 503 trocado por 401 | ✅ Killed (5) |
| M04c | `src/app/api/push/dispatch/route.ts:18` | `===` em vez de `timingSafeEqual` | ✅ Killed |
| M04d | `src/app/api/push/dispatch/route.ts:25-26` | 401 checado antes do 503 | ✅ Killed (2) |
| M05 | `src/lib/db/repos/push.ts:6` | limite 5 → 6 | ✅ Killed (4) |
| M05b | `src/lib/db/repos/push.ts:26` | sem `pg_advisory_xact_lock` (corrida no limite) | ✅ Killed |
| M06 | `public/sw.js:55` | navegação passa a ser cache-first (guarda HTML) | ✅ Killed |
| M06b | `public/sw.js:53` | intercepta todo GET da mesma origem | ✅ Killed (5) |
| M06c | `public/sw.js:31` | guarda resposta não-200 | ✅ Killed |
| M06d | `public/sw.js:20` | activate apaga também `anon-static-v1` | ✅ Killed |
| M06e | `public/sw.js:12` | sem `skipWaiting` | ✅ Killed |
| M07 | `public/sw.js:66` | `safeTarget` aceita `//evil` | ✅ Killed |
| M07b | `public/sw.js:86` | `badge` errado | ✅ Killed (7) |
| M08 | `src/lib/domain/push-schedule.ts:24` | `hasOccurrenceOn` ignora início/fim da série | ✅ Killed (2) |
| M09 | `src/lib/db/repos/push.ts:94` | `securityTargets` ignora `security=false` | ✅ Killed (2) |
| M09b | `src/lib/push/security.ts:33` | aviso de segurança não remove inscrição `gone` | ✅ Killed |
| M10 | `src/lib/domain/push-schedule.ts:4` | `localClock` em UTC | ✅ Killed (5) |
| M11 | `src/lib/push/send.ts:30` | 410 deixa de ser `gone` | ✅ Killed |
| M11b | `src/lib/domain/push-messages.ts:16` | TTL 86401 | ✅ Killed (2) |
| M12 | `src/lib/push/dispatch.ts:10` | máximo 1001 envios | ✅ Killed (2) |
| M13 | `src/lib/push/dispatch.ts:12` | concorrência 21 | ✅ Killed |
| M14 | `src/lib/push/dispatch.ts:87` | broadcast marcado com alvo restante | ✅ Killed |
| M15 | `src/lib/push/dispatch.ts:15` | retenção 8 dias | ✅ Killed |
| M16 | `src/lib/push/dispatch.ts:76` | `gone` não remove a inscrição | ✅ Killed |
| M17 | `src/lib/pwa/register.ts:15` | registra fora de produção | ✅ Killed (3) |
| M18 | `src/lib/pwa/install-hint.ts:13` | ignora standalone | ✅ Killed |
| M19 | `src/lib/validation/push.ts:58` | mensagem até 141 | ✅ Killed |
| M20 | `src/lib/validation/push.ts:33` | `p256dh` sem exigir 0x04 | ✅ Killed |
| M21 | `src/lib/domain/push-messages.ts:20` | `url` do payload "/conta" | ✅ Killed (3) |
| M22 | `src/proxy.ts:37` | matcher volta a cobrir `/sw.js` | ✅ Killed (2) |
| M23 | `public/sw.js:3` | nome do cache `anon-static-v2` | ✅ Killed (4) |
| M25 | `src/lib/db/repos/push-dispatch.ts:35` | candidatos sem filtro `approved` | ✅ Killed (3) |
| M26 | `src/lib/db/repos/push-dispatch.ts:60` | hora `lte` → `lt` | ✅ Killed |
| M26b | `src/lib/db/repos/push-dispatch.ts:45` | `notExists` não filtra o claim | ✅ Killed (3) |
| M27 | `src/lib/db/repos/push.ts:49` | `unsubscribe` apaga de qualquer dono | ✅ Killed (2) |
| M28 | `src/actions/admin-users.ts:43` | revogação sem aviso | ✅ Killed |
| M29 | `src/actions/password-reset.ts:164` | reset selado sem aviso | ✅ Killed |
| M30 | `src/lib/db/repos/push-dispatch.ts:122` | claim sem `ON CONFLICT DO NOTHING` | ✅ Killed (2) |
| M31 | `src/lib/db/repos/push-dispatch.ts:98` | `due` sem `hasOccurrenceOn` | ✅ Killed (2) |
| M32 | `src/actions/push.ts:30` | inscrição aceita sem VAPID | ✅ Killed |
| M33 | `src/lib/db/repos/push.ts:80` | `updatePrefs` sempre `ok` | ✅ Killed (2) |
| M35 | `src/lib/db/repos/push-dispatch.ts:112` | broadcast ignora `admin=false` | ✅ Killed |
| M36 | `src/lib/validation/push.ts:56` | mensagem sem `trim` | ✅ Killed (2) |

(Uma mutação planejada no default da coluna `reminder` em `schema.ts` foi descartada antes de rodar: o banco de teste já tem a migração aplicada, então o mutante não alcançaria o comportamento e o resultado não seria válido.)

**Sensor depth**: P0-full manual (SSRF, autenticação do dispatch e idempotência são caminhos críticos): 48 mutações cobrindo todos os ramos de risco.
**Resultado do sensor**: 48/48 mortas, 0 sobreviventes - PASS ✅

---

## Gate Check

Node 20 (`$HOME/.nvm/versions/node/v20.20.2/bin`).

- **Gate command**: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` (+ `npm run build`)
- `npm run typecheck`: ✅ exit 0
- `npm run test:unit`: ✅ 95 arquivos, **1667 passed**, 0 failed, 0 skipped
- `DATABASE_URL=postgres://postgres:postgres@localhost:5433/orcamento_pwa_test npm run test:int`: ✅ 42 arquivos, **840 passed**, 0 failed, 0 skipped
- `npm run build`: ✅ exit 0 ("Compiled successfully"; rotas `ƒ /api/push/dispatch` e `○ /manifest.webmanifest`)
- `npm run lint`: ❌ exit 1 - **1 erro pré-existente e alheio** (`@next/next/no-sync-scripts` em `src/app/layout.tsx:70`, bloco `impeccable-live` do usuário; `git blame` aponta `d29a27d1`, de 2026-10-17, já presente em `main:src/app/layout.tsx:64`) + 94 warnings fora do diff
- `npx eslint` sobre os arquivos do diff (`git diff --name-only main..HEAD -- 'src/**' 'scripts/**'`): o mesmo erro pré-existente (porque `layout.tsx` está no diff), 0 warnings; **sem `layout.tsx`: exit 0, 0 problemas**
- **Test count before feature** (`vitest list` em worktree de `main`): unit 1416, integração 734
- **Test count after feature**: unit 1667, integração 840
- **Delta**: +251 unit, +106 integração
- **Integridade**: nenhum `it`/`describe` removido e nenhum `.skip`/`.only`/`.todo` adicionado no diff de testes; testes existentes alterados só ganharam mocks de `notifySecurity` e casos novos
- **Skipped tests**: nenhum. **Failures**: nenhuma. e2e não rodado (AD-005)

---

## Spec-Precision Gaps

| # | Onde | O que a spec não fixa | O que o código/teste faz | Impacto |
| --- | --- | --- | --- | --- |
| G1 | PUSH-01 / `subscribePushAction` sem VAPID | Texto da recusa quando a ação é chamada sem configuração (a spec só diz que a seção some) | `src/actions/push.ts:14` "Notificações indisponíveis"; teste `src/actions/push.int.test.ts:143-156` só assere `result.ok === false` e nada gravado | Baixo: ramo inalcançável pela UI (a seção não é renderizada) |
| G2 | PUSH-28 | Código de log por classe de falha (a spec exige só `logActionError` sem endpoint/chaves) | `src/lib/push/send.ts:31` loga `push_<status>` ou `push_network` sem status; teste `src/lib/push/send.test.ts:80-89` assere `/^push_/` para erro de rede | Baixo: a exigência de sigilo do log está asserida por valor em `send.test.ts:101-114` |
| G3 | PUSH-37 / `BroadcastForm` | Retorno visível ao admin após enfileirar | `src/components/broadcast-form.tsx:64` "Mensagem na fila." (sem teste, AD-005) | Baixo: só UI; o `ok` da ação está asserido |

Inconsistências de documentação avaliadas (sem efeito no comportamento):
- (d) `tasks.md` T17 e `design.md:95` falam em "cinco textos fixos + o genérico"; a spec (`spec.md:61`) define quatro textos + o título "ANON" + o genérico do SW (PUSH-43). O código tem exatamente os quatro + genérico + título (`src/lib/domain/push-messages.ts:6-13`) e o teste `push-messages.test.ts:5-18` cobre todos. Texto da task impreciso; não é lacuna.
- (e) PUSH-26 "no máximo uma vez": coerente com a spec. A premissa (`spec.md:54`) diz que o envio só ocorre se o `INSERT` inseriu a linha e que uma falha total num dia não repete; o design registra o risco de perder o aviso se a função morrer após o claim (`design.md:244`). Implementação e testes (`dispatch.test.ts:88-104`) seguem isso. Não é lacuna.

---

## Security Review (leitura dirigida)

| Item | Resultado | Evidência |
| --- | --- | --- |
| SSRF na inscrição | ✅ `https:` só, sem credenciais/porta, host exato ou sufixo com ponto; IP, localhost, ponto final e sósias recusados | `src/lib/validation/push.ts:15-24`; testes `validation/push.test.ts:24-41`; mutantes M01/M01b mortos |
| SSRF no envio (defesa em profundidade) | ✅ `sendPush` revalida antes de chamar `web-push` | `src/lib/push/send.ts:17`; `send.test.ts:91-99`; M02 morto |
| `CRON_SECRET` em tempo constante | ✅ `timingSafeEqual` sobre SHA-256 dos dois lados (comprimentos iguais) | `src/app/api/push/dispatch/route.ts:14-19`; `route.test.ts:73-80`; M04/M04c mortos |
| Ordem 503 antes de 401 | ✅ | `route.ts:23-26`; `route.test.ts:53-57`; M04d morto |
| Corpo de erro vazio, resposta só com 3 campos, `no-store` | ✅ | `route.ts:25-34`; `route.test.ts:49,69,88` |
| `userId` do cliente | ✅ nenhuma ação lê id do cliente; todas usam `session.userId`/admin | `src/actions/push.ts:40,56,81`; `src/actions/push-admin.ts:14-22`; testes `push.int.test.ts:79-86,248-257` |
| Payload sem dado financeiro | ✅ textos só de `PUSH_TEXT` (`push-messages.ts`) ou da mensagem do admin, sempre via `pushPayload` | `src/lib/push/dispatch.ts:44-53`; `src/lib/push/security.ts:10-13`; `send.ts:20-22` |
| CSP/cabeçalhos de `/sw.js` e `/offline.html` | ✅ CSP própria e única por arquivo; `/offline.html` com `default-src 'none'; style-src 'unsafe-inline'`; cabeçalhos gerais mantidos | `src/lib/security-headers.ts:71-91,102-103`; `security-headers.test.ts:180-203` |
| `sw.js` sem cache de HTML/RSC/ações/API | ✅ navegação network-only; só `/_next/static/` vai ao cache | `public/sw.js:45-57`; M06/M06b/M06c mortos |
| Logs sem endpoint/chaves | ✅ `logActionError` grava só ação + `code` e manda erro sintético ao Sentry | `src/lib/log.ts:9-17`; `send.test.ts:101-114` |
| Cascata ao excluir usuário | ✅ FKs `ON DELETE cascade` nas 3 tabelas | `drizzle/0017_groovy_diamondback.sql:39-41`; `push-schema.int.test.ts:105-120` |
| Rotas do PWA fora do proxy sem abrir as demais | ✅ lookahead ancorado com `$`; `/sw.json` segue protegido | `src/proxy.ts:37`; `proxy.test.ts:11-17` |

### Observações (não bloqueantes)

- **O1 (baixa, UX)**: `src/app/layout.tsx:37` agora emite `<meta name="theme-color" content="#0D111A">` estático, mas o `themeScript` (`layout.tsx:12`) reescreve esse meta em tempo de execução para `THEME_COLOR` (`#090b12`/`#f9fafe`, `src/lib/theme-color.ts:2`). A AC PWA-04 (metadado) está cumprida; a cor da barra do navegador depois da hidratação segue o tema. O comentário em `layout.tsx:30` ("`theme-color` is set by `themeScript`") ficou parcialmente desatualizado.
- **O2 (baixa, robustez)**: `public/sw.js:93-96` usa `matchAll({ includeUncontrolled: true })` e depois `open.navigate(target)`. `WindowClient.navigate` rejeita para cliente não controlado, e aí não há fallback para `openWindow`: a janela é focada mas não navega. O alvo hoje é sempre "/", então o efeito prático é pequeno.
- **O3 (informativa, segurança)**: PUSH-08 transfere ao chamador um endpoint já gravado para outro usuário. É exigido pela spec; o endpoint é uma URL de capacidade não adivinhável, então o risco é aceito.
- **O4 (informativa, desempenho)**: `dueCandidates` faz uma consulta por candidato (`src/lib/db/repos/push-dispatch.ts:94-99`), aceitável no volume atual.
- **O5 (informativa)**: o erro de lint pré-existente em `src/app/layout.tsx:70` carrega um script de `http://localhost:8400` com token; é ferramenta local do usuário e não faz parte da feature, mas não deveria chegar à produção.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ SW em ~100 linhas sem biblioteca; funções puras pequenas |
| Surgical changes | ✅ mudanças fora dos arquivos novos limitadas a export de `applicableInMonth`, hooks de aviso em `admin-users.ts`/`password-reset.ts`, proxy/headers/rotas |
| No scope creep | ✅ (texto "Mensagem na fila." e recusa sem VAPID são complementos mínimos, ver G1/G3) |
| Matches patterns | ✅ repos + `setupTestDb`, `ActionResult`, guards, `logActionError`, padrão do teste de workflow |
| Spec-anchored outcome check | ✅ (3 lacunas de precisão sinalizadas) |
| Per-layer Coverage Expectation | ✅ domínio 1:1; rota com 503/401/200; repos com limites, concorrência e cascata |
| Every test maps to a spec requirement | ✅ testes nomeados com o ID; os demais cobrem edge case ou Done-when (ex.: `settingsFor` sem inscrição, `SAVE_FAILED`) |
| Documented guidelines followed | ✅ `AGENTS.md` (AD-005: sem e2e), `.specs/STATE.md`, `tasks.md` Test Coverage Matrix |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PWA-01 .. PWA-25 | Implementing | ✅ Verified |
| PUSH-01 .. PUSH-52 | Implementing | ✅ Verified (PUSH-01, PUSH-28, PUSH-37 com lacuna de precisão G1-G3) |

(O Verifier não edita `spec.md`; o orquestrador aplica esta atualização.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 77/77 exigências e 8/8 edge cases com evidência; 3 lacunas de precisão da spec (G1-G3)
**Sensor**: 48/48 mutações mortas
**Gate**: unit 1667 passed, integração 840 passed, typecheck ok, build ok; lint com 1 erro pré-existente alheio (`src/app/layout.tsx:70`), arquivos da feature limpos

**What works**: manifest e ícones, SW que só guarda estáticos, tela offline, registro e instalação, inscrição com allowlist e limite atômico, preferências, dispatch idempotente com 401/503, limites e limpeza, avisos de segurança, broadcast do admin, workflow, docs e AD-016.

**Issues found**: nenhum bloqueante. Melhorias opcionais: fixar na spec os textos de G1/G3 e o código de log de G2; tratar O1 (comentário/estratégia de `theme-color`) e O2 (fallback quando `navigate` rejeita).

**Next steps**: orquestrador atualiza a rastreabilidade em `spec.md`; opcionalmente abrir tarefas para O1/O2.
