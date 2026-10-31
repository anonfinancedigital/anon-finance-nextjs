# PWA e Push Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/pwa/spec.md`
**Design**: `.specs/features/pwa/design.md`
**Status**: Draft

Antes de escrever manifest, proxy ou route handler, ler o guia correspondente em `node_modules/next/dist/docs/` (regra do AGENTS.md). Antes de rodar qualquer comando npm: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`; testes de integração com `DATABASE_URL` de um banco privado `*_test` (sessões paralelas colidem em `orcamento_test`).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (e2e suspenso, AD-005; unit/integration obrigatórios), `.specs/STATE.md` (AD-005), `vitest.config.ts` (projetos `unit` e `integration`), `package.json` scripts.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / função pura (`src/lib/**`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case listado | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Arquivo estático do PWA (`public/sw.js`, `public/offline.html`, ícones, manifest) | unit | Um teste por AC; `sw.js` carregado em `vm` com `self` simulado | `src/lib/pwa/*.test.ts`, `src/app/manifest.test.ts` | `npm run test:unit` |
| Route handler (`src/app/api/**`) | unit | Status, corpo e cabeçalho; ramos 503/401/200 | `src/app/api/**/route.test.ts` | `npm run test:unit` |
| Repositório (`src/lib/db/repos/**`) e schema | integration | Caminhos de consulta principais, limites, concorrência onde a spec exige, cascata | `src/lib/db/**/*.int.test.ts` | `npm run test:int` |
| Server Action (`src/actions/**`) | integration | Caminho feliz + cada ramo de falha da spec, contra banco de teste | `src/actions/**/*.int.test.ts` | `npm run test:int` |
| Workflow, `.env.example`, `STATE.md` | unit | Um teste por AC estrutural, lendo o arquivo | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Componente de UI e páginas | none | Suspenso (AD-005); lógica de estado extraída para função pura testada; evidência por inspeção `file:line` | - | gate de build |
| Wiring / docs | none | - (gate de build apenas) | - | gate de build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run test:unit` |
| Full | Tasks com teste de integração | `npm run test:unit && npm run test:int` |
| Build | Fim de fase, wiring e docs | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |

---

## Execution Plan

Phases são sequenciais; dentro de cada uma, as tasks rodam em ordem.

### Phase 1: PWA estático (assets, manifest, service worker, rotas públicas)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: PWA no cliente (registro e instalação)

```
T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 3: Fundação do push (dependência, funções puras, schema)

```
T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 4: Inscrição (repo, ações, service worker e UI)

```
T21 → T22 → T23 → T24 → T25 → T26
```

### Phase 5: Envio agendado (dispatch)

```
T27 → T28 → T29 → T30 → T31
```

### Phase 6: Avisos de segurança e mensagem do administrador

```
T32 → T33 → T34 → T35 → T36 → T37
```

### Phase 7: Operação e documentação

```
T38 → T39 → T40 → T41 → T42 → T43
```

---

## Task Breakdown

### T1: Script que gera os ícones PNG

**What**: Criar `scripts/generate-pwa-icons.ts` (sharp) que lê `public/favicon.svg` e grava `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (arte com margem de 20%) e `apple-touch-icon.png` (180×180) em `public/`; rodar o script e versionar os PNGs.
**Where**: `scripts/generate-pwa-icons.ts`
**Depends on**: None
**Reuses**: `public/favicon.svg`; padrão de `scripts/seed-user.ts` (tsx)
**Requirement**: PWA-02, PWA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os quatro PNGs existem em `public/` com as dimensões 192, 512, 512 e 180
- [x] `src/lib/pwa/icons.test.ts` lê o cabeçalho IHDR de cada PNG e confere largura e altura
- [x] `sharp` listado em `devDependencies`
- [x] Novo script `npm run pwa:icons` em `package.json`
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): generate PWA icons from the favicon`

---

### T2: Manifest do app

**What**: Criar `src/app/manifest.ts` com os valores do PWA-01 e a lista de ícones do PWA-02.
**Where**: `src/app/manifest.ts`
**Depends on**: T1
**Reuses**: Guia `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`; `BRAND_NAME`, `BRAND_DESCRIPTION` de `src/lib/brand.ts`
**Requirement**: PWA-01, PWA-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `manifest()` devolve `name` e `short_name` "ANON", `start_url` "/", `scope` "/", `display` "standalone", `lang` "pt-BR", `background_color` e `theme_color` "#0D111A"
- [x] Lista exatamente `/icon-192.png`, `/icon-512.png` e `/icon-maskable-512.png` (purpose `maskable`), todos `image/png` com os tamanhos corretos
- [x] `src/app/manifest.test.ts` cobre cada valor
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add the web app manifest`

---

### T3: Constantes de metadata e viewport do PWA

**What**: Criar `src/lib/pwa/metadata.ts` exportando `pwaMetadata` (`appleWebApp` capable com título "ANON", `icons.apple` `/apple-touch-icon.png` 180×180) e `pwaViewport` (`themeColor` "#0D111A"), separado do layout para ser testável.
**Where**: `src/lib/pwa/metadata.ts`
**Depends on**: T2
**Reuses**: `BRAND_NAME`
**Requirement**: PWA-03, PWA-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Testes conferem `appleWebApp.capable` true, título "ANON", o ícone Apple e `themeColor` "#0D111A"
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add PWA metadata constants`

---

### T4: Tela offline estática

**What**: Criar `public/offline.html` com os textos, o link "Tentar novamente" e estilos inline, sem `<script>` nem recurso externo.
**Where**: `public/offline.html`
**Depends on**: T3
**Reuses**: Cores e tipografia de `src/app/globals.css`
**Requirement**: PWA-15, PWA-16, PWA-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/lib/pwa/offline-page.test.ts` confere `lang="pt-BR"`, título "ANON • Sem conexão", "Você está sem conexão", "Seus dados continuam protegidos. Reconecte-se para continuar." e `<a href="/">Tentar novamente</a>`
- [x] O teste confere ausência de `<script` e de `http://` ou `https://`
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add the static offline page`

---

### T5: Service worker com cache de assets e fallback offline

**What**: Criar `public/sw.js` com `install` (precache de `/offline.html`, `/icon-192.png`, `/icon-512.png` em `anon-static-v1` + `skipWaiting`), `activate` (apaga outros caches + `clients.claim`) e `fetch` (cache-first de `/_next/static/`, fallback offline de navegação, navegação com resposta HTTP não guardada, resto não interceptado).
**Where**: `public/sw.js`
**Depends on**: T4
**Reuses**: Guia `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`
**Requirement**: PWA-07, PWA-08, PWA-09, PWA-10, PWA-11, PWA-12, PWA-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/lib/pwa/sw.test.ts` carrega `public/sw.js` em `vm` com `self`, `caches`, `fetch` e `clients` simulados
- [x] Um teste por AC: precache exato, limpeza de caches, cache-first e 200-only de `_next/static`, fallback offline, navegação 404/500 devolvida sem `put`, não intercepta POST, cross-origin, `/api/*`, `/monitoring` e outros GET fora da regra
- [x] Edge: `/offline.html` ausente no cache devolve `Response.error()`
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add the service worker with a static-only cache`

---

### T6: Rota pública do dispatch no roteamento

**What**: Adicionar `/api/push/dispatch` a `PUBLIC_PATHS` em `route-decision.ts`.
**Where**: `src/lib/route-decision.ts`
**Depends on**: T5
**Reuses**: Testes existentes de `src/lib/route-decision.test.ts`
**Requirement**: PUSH-22, PUSH-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `decideRoute("/api/push/dispatch", false)` devolve `next`
- [x] `/api/push/dispatch-x`, `/api/push` e `/api/healthz` continuam redirecionando anônimo para `/login`
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): make the dispatch route public in the router`

---

### T7: Cabeçalhos do manifest, do service worker e da tela offline

**What**: Em `security-headers.ts`, incluir `/manifest.webmanifest` em `PATHS_OUTSIDE_PROXY` e criar regras próprias para `/sw.js` e `/offline.html` (valores do design).
**Where**: `src/lib/security-headers.ts`
**Depends on**: T6
**Reuses**: `securityHeaderRules`, testes de `src/lib/security-headers.test.ts`
**Requirement**: PWA-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `/sw.js` recebe `Content-Security-Policy: default-src 'self'; script-src 'self'`, `Cache-Control: no-cache, no-store, must-revalidate` e `Content-Type: application/javascript; charset=utf-8`
- [x] `/offline.html` recebe CSP com `style-src 'unsafe-inline'` e sem `STATIC_CSP`
- [x] `/manifest.webmanifest` recebe `STATIC_CSP`; os cabeçalhos estáticos gerais continuam
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add headers for the service worker and offline page`

---

### T8: Matcher do proxy sem as rotas do PWA

**What**: Em `src/proxy.ts`, excluir `manifest\.webmanifest`, `sw\.js` e `offline\.html` do matcher.
**Where**: `src/proxy.ts`
**Depends on**: T7
**Reuses**: Guia de `proxy` em `node_modules/next/dist/docs/`; matcher atual
**Requirement**: PWA-05, PWA-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/proxy.test.ts` aplica o matcher às rotas: as três do PWA não casam; `/`, `/conta`, `/api/push/dispatch` e `/sw.json` casam
- [x] Os caminhos de `PATHS_OUTSIDE_PROXY` e o matcher concordam (teste de consistência)
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): keep PWA files out of the auth proxy`

---

### T9: Registro do service worker (função pura)

**What**: Criar `registerServiceWorker({ nodeEnv, nav })` que registra `/sw.js` com `scope` "/" e `updateViaCache` "none" só em produção e com suporte, engolindo rejeição.
**Where**: `src/lib/pwa/register.ts`
**Depends on**: None
**Reuses**: Padrão de função pura com ambiente por argumento (`src/lib/base-url.ts`)
**Requirement**: PWA-18, PWA-19, PWA-20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Produção + suporte chama `register` com as opções exatas
- [x] Fora de produção ou sem `serviceWorker` não chama
- [x] Rejeição do `register` não propaga
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add service worker registration helper`

---

### T10: Componente que registra o service worker

**What**: Criar `PwaRegister` (cliente) que chama `registerServiceWorker` em `useEffect`.
**Where**: `src/components/pwa-register.tsx`
**Depends on**: T9
**Reuses**: `src/components/use-hydrated.ts` (padrão de efeito)
**Requirement**: PWA-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Typecheck e lint passam
- [x] Inspeção: o efeito roda uma vez e não renderiza nada
- [x] Gate check passes: `npm run test:unit`

**Tests**: none (UI sem teste (AD-005))
**Gate**: quick
**Commit**: `feat(pwa): add the service worker register component`

---

### T11: Ligar metadata e registro ao layout raiz

**What**: Em `src/app/layout.tsx`, espalhar `pwaMetadata` em `metadata`, exportar `viewport = pwaViewport` e montar `<PwaRegister />`.
**Where**: `src/app/layout.tsx`
**Depends on**: T10
**Reuses**: `src/lib/pwa/metadata.ts`
**Requirement**: PWA-03, PWA-04, PWA-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run build` conclui e o HTML de `/bem-vindo` contém `apple-touch-icon` e `theme-color`
- [x] Gate de build passa
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none (Wiring)
**Gate**: build
**Commit**: `feat(pwa): wire PWA metadata and registration into the layout`

---

### T12: Regra de exibição da instalação (função pura)

**What**: Criar `installHint({ userAgent, standalone, hasPrompt })` devolvendo `"button" | "ios" | "none"`.
**Where**: `src/lib/pwa/install-hint.ts`
**Depends on**: T11
**Reuses**: Enunciado do design
**Requirement**: PWA-23, PWA-24, PWA-25

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] iOS fora de standalone → `ios`; com prompt guardado → `button`; standalone → `none` mesmo em iOS ou com prompt; Android/desktop sem prompt → `none`
- [x] Cobre iPhone, iPad e iPod
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(pwa): add the install hint rule`

---

### T13: Cartão de instalação

**What**: Criar `InstallCard` (cliente): guarda `beforeinstallprompt` (com `preventDefault`), mostra "Instalar app" que chama `prompt()` e esconde o botão, ou a instrução iOS do PWA-23.
**Where**: `src/components/install-card.tsx`
**Depends on**: T12
**Reuses**: `ContentCard`, `Button`
**Requirement**: PWA-21, PWA-22, PWA-23, PWA-24, PWA-25

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Typecheck e lint passam
- [x] Inspeção `file:line`: texto iOS exato, `prompt()` chamado no clique, seção nula em `none`
- [x] Gate check passes: `npm run test:unit`

**Tests**: none (UI sem teste (AD-005))
**Gate**: quick
**Commit**: `feat(pwa): add the install card`

---

### T14: Cartão de instalação em /conta

**What**: Renderizar `InstallCard` em `src/app/(app)/conta/page.tsx`.
**Where**: `src/app/(app)/conta/page.tsx`
**Depends on**: T13
**Reuses**: Cartões existentes da página
**Requirement**: PWA-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate de build passa
- [x] Inspeção: o cartão aparece entre "Seus dados" e "Exportar"
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none (Wiring)
**Gate**: build
**Commit**: `feat(pwa): show the install card on the account page`

---

### T15: Dependência web-push com teste de contrato

**What**: Adicionar `web-push` e `@types/web-push` e fixar por teste a forma da API em que o design se apoia.
**Where**: `package.json`
**Depends on**: None
**Reuses**: Design: `sendPush`
**Requirement**: PUSH-29

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/lib/push/web-push-contract.test.ts`: `generateRequestDetails` com um par de chaves gerado em teste devolve cabeçalho `TTL` "86400", `Authorization` começando por `vapid` e `Content-Encoding` `aes128gcm`
- [x] `WebPushError` expõe `statusCode` (404/410) como o design assume
- [x] Se algo divergir, registrar em `design.md` e ajustar antes de seguir
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `chore(push): add web-push with a contract test`

---

### T16: Configuração VAPID e segredo do cron (função pura)

**What**: Criar `resolvePushConfig(env)` e `resolveCronSecret(env)`.
**Where**: `src/lib/push/config.ts`
**Depends on**: T15
**Reuses**: `src/lib/base-url.ts`
**Requirement**: PUSH-01, PUSH-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Retorna `null` se faltar qualquer variável VAPID ou se `VAPID_SUBJECT` não começar por `mailto:` ou `https:`
- [x] Vazio conta como ausente
- [x] `resolveCronSecret` devolve `null` para vazio
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add push configuration resolver`

---

### T17: Textos e payload fixos

**What**: Criar `push-messages.ts` com `PUSH_TITLE`, `PUSH_TEXT`, `PUSH_TTL` e `pushPayload(body)`.
**Where**: `src/lib/domain/push-messages.ts`
**Depends on**: T16
**Reuses**: `src/lib/brand.ts`
**Requirement**: PUSH-24, PUSH-25, PUSH-29, PUSH-33, PUSH-34, PUSH-43

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os cinco textos fixos e o genérico batem caractere a caractere com a spec
- [x] `pushPayload("x")` é `{"title":"ANON","body":"x","url":"/"}`
- [x] `PUSH_TTL` é 86400
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add fixed notification texts and payload`

---

### T18: Validação de inscrição, preferências e mensagem

**What**: Criar `isAllowedPushEndpoint`, `subscriptionSchema`, `preferencesSchema` e `broadcastSchema` com as mensagens exatas da spec.
**Where**: `src/lib/validation/push.ts`
**Depends on**: T17
**Reuses**: `src/lib/validation/category.ts` (padrão zod)
**Requirement**: PUSH-05, PUSH-06, PUSH-16, PUSH-17, PUSH-38

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Endpoints: aceita FCM, Mozilla, `web.push.apple.com`, `wns2.notify.windows.com`; recusa `http:`, `localhost`, IP, porta, usuário/senha e `x.push.apple.com.evil.net`
- [x] Chaves: `p256dh` com 65 bytes e prefixo 0x04, `auth` com 16 bytes; recusas com "Inscrição inválida"
- [x] Hora −1, 0, 23, 24, 9.5 e switches não booleanos; texto 0, 1, 140, 141 caracteres e só espaços com "A mensagem deve ter de 1 a 140 caracteres"
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add push input validation`

---

### T19: Relógio local e vencimento (funções puras)

**What**: Criar `localClock`, `hasOccurrenceOn` e `isDueHour`.
**Where**: `src/lib/domain/push-schedule.ts`
**Depends on**: T18
**Reuses**: `appliesInMonth`, `occurrenceDate` de `src/lib/domain/recurrence.ts`
**Requirement**: PUSH-24, PUSH-25

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `localClock` converte 02:30 UTC de 2026-11-01 para 2026-10-31 23:30 em São Paulo e 12:00 UTC para 09:00 do mesmo dia
- [x] `hasOccurrenceOn`: série encerrada, dia 31 em fevereiro e abril, série futura, duas séries no mesmo dia
- [x] `isDueHour` com igual, maior e menor
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add local clock and due-day rules`

---

### T20: Tabelas e migração do push

**What**: Adicionar `push_subscription`, `push_preference`, `push_dispatch` e `push_broadcast` ao `schema.ts` e gerar a migração 0017.
**Where**: `src/lib/db/schema.ts`
**Depends on**: T19
**Reuses**: `signupAttempt` e `transaction` em `schema.ts`; `npm run db:generate`
**Requirement**: PUSH-03, PUSH-11, PUSH-15, PUSH-26

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `drizzle/0017_*.sql` gerado e coerente com o schema, sem tocar em `auth-schema.ts`
- [x] `src/lib/db/push-schema.int.test.ts`: `hour` fora de 0..23 e texto de broadcast fora de 1..140 violam `check`; `endpoint` duplicado viola unique; PK (user, kind, ref) impede a segunda linha; apagar o usuário apaga inscrições, preferências e registros de envio
- [x] Migração aplica em banco privado vazio
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): add push tables and migration`

---

### T21: Repositório de inscrições e preferências

**What**: Criar `pushRepo` (`subscribe`, `unsubscribe`, `removeByEndpoint`, `settingsFor`, `updatePrefs`, `subscriptionsOf`, `securityTargets`).
**Where**: `src/lib/db/repos/push.ts`
**Depends on**: None
**Reuses**: Padrão de `src/lib/db/repos/users.ts`; `src/test/db.ts`
**Requirement**: PUSH-03, PUSH-07, PUSH-08, PUSH-09, PUSH-15, PUSH-17, PUSH-18, PUSH-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/lib/db/repos/push.int.test.ts`: primeira inscrição cria preferências com os padrões da spec
- [x] Sexta inscrição devolve `limit`; mesma `endpoint` atualiza chaves e dono sem criar linha; duas inscrições concorrentes não passam de 5
- [x] `unsubscribe` só apaga a linha do dono; `removeByEndpoint` apaga qualquer dono
- [x] `updatePrefs` sem linha devolve `no_prefs`; `securityTargets` vazio com `security` falso ou sem preferências
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): add the push subscription repository`

---

### T22: Server Actions de inscrição e preferências

**What**: Criar `subscribePushAction`, `unsubscribePushAction` e `updatePushPreferencesAction`.
**Where**: `src/actions/push.ts`
**Depends on**: T21
**Reuses**: `src/actions/account.ts` e `categories-sealed.ts` (guard + safeParse + logActionError); `invalidInput`
**Requirement**: PUSH-02, PUSH-03, PUSH-05, PUSH-06, PUSH-07, PUSH-08, PUSH-09, PUSH-10, PUSH-16, PUSH-17, PUSH-18, PUSH-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/actions/push.int.test.ts`: sem sessão devolve `UNAUTHORIZED` sem tocar o banco; usuário `revoked` também
- [x] Mensagens exatas: "Este navegador não é compatível com notificações", "Inscrição inválida", "Limite de 5 dispositivos atingido", "Preferências inválidas", "Ative as notificações primeiro"
- [x] Nenhuma ação aceita `userId` do cliente; falha do banco devolve `SAVE_FAILED`
- [x] Sem variáveis VAPID, `subscribePushAction` recusa
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): add subscription and preference actions`

---

### T23: Service worker recebe push e clique

**What**: Acrescentar a `public/sw.js` os eventos `push` e `notificationclick`.
**Where**: `public/sw.js`
**Depends on**: T22
**Reuses**: Estrutura de `sw.js` da T5
**Requirement**: PUSH-42, PUSH-43, PUSH-44, PUSH-45, PUSH-46

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `src/lib/pwa/sw.test.ts` estendido: `push` com JSON válido chama `showNotification` com título, corpo, `icon` e `badge` `/icon-192.png`
- [x] Sem dados, JSON inválido, `title` ou `body` não texto → "ANON" / "Você tem uma nova notificação."
- [x] Clique fecha a notificação e foca janela aberta ou abre o destino; `url` só vale se começar com "/" e não com "//"
- [x] Os testes de cache da T5 continuam passando
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): handle push and click in the service worker`

---

### T24: Estado da seção de notificações (função pura)

**What**: Criar `pushUiState({ supported, standaloneIos, permission, subscribedHere })`.
**Where**: `src/lib/pwa/push-ui-state.ts`
**Depends on**: T23
**Reuses**: `install-hint.ts`
**Requirement**: PUSH-04, PUSH-12, PUSH-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Devolve `unsupported`, `ios-install`, `blocked`, `off` ou `on` com precedência definida e testada para cada combinação
- [x] Gate check passes: `npm run test:unit`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add the notification section state rule`

---

### T25: Cartão de notificações

**What**: Criar `PushSettingsCard` (cliente): ativar, desativar, switches, hora e textos da spec.
**Where**: `src/components/push-settings-card.tsx`
**Depends on**: T24
**Reuses**: `Switch`, `SelectField`, `ContentCard`, `InstallCard`
**Requirement**: PUSH-02, PUSH-04, PUSH-09, PUSH-12, PUSH-13, PUSH-14, PUSH-15, PUSH-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Typecheck e lint passam
- [x] Inspeção `file:line`: `subscribe` com `userVisibleOnly: true`; falha da ação chama `sub.unsubscribe()`; desativar chama o navegador e depois `unsubscribePushAction`; textos exatos das ACs 4, 12, 13, 14
- [x] Gate check passes: `npm run test:unit`

**Tests**: none (UI sem teste (AD-005))
**Gate**: quick
**Commit**: `feat(push): add the notification settings card`

---

### T26: Cartão de notificações em /conta

**What**: Em `conta/page.tsx`, ler `pushRepo.settingsFor` e `resolvePushConfig(process.env)` e renderizar `PushSettingsCard` só com configuração completa.
**Where**: `src/app/(app)/conta/page.tsx`
**Depends on**: T25
**Reuses**: Leituras da página atual
**Requirement**: PUSH-01, PUSH-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate de build passa
- [x] Inspeção: sem VAPID a seção não é renderizada; a chave pública vai por prop
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none (Wiring)
**Gate**: build
**Commit**: `feat(push): show notification settings on the account page`

---

### T27: Exportar o filtro de recorrência

**What**: Exportar `applicableInMonth` de `transactions.ts` para o repo de dispatch reutilizar (AD-004).
**Where**: `src/lib/db/repos/transactions.ts`
**Depends on**: None
**Reuses**: Filtro existente
**Requirement**: PUSH-25

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhum comportamento muda: `transactions.int.test.ts` passa inteiro
- [x] Teste novo confirma que o filtro exportado inclui série ativa e exclui encerrada
- [x] Gate check passes: `npm run test:unit && npm run test:int`
- [x] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `refactor(transactions): export the month recurrence filter`

---

### T28: Envio de uma notificação

**What**: Criar `sendPush(config, sub, body)` sobre `web-push`, com `gone`, `failed` e revalidação do endpoint.
**Where**: `src/lib/push/send.ts`
**Depends on**: T27
**Reuses**: `logActionError`; contrato da T15
**Requirement**: PUSH-27, PUSH-28, PUSH-29

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com `web-push` simulado: 404 e 410 → `gone`; 500, 429 e erro de rede → `failed` e log só com `push_<status>`
- [ ] Chama `sendNotification` com `TTL` 86400 e o corpo de `pushPayload`
- [ ] Endpoint fora da lista → `failed` sem chamar `web-push`
- [ ] Nenhum log contém endpoint ou chaves
- [ ] Gate check passes: `npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add the push sender`

---

### T29: Repositório do dispatch

**What**: Criar `pushDispatchRepo` (`reminderCandidates`, `dueCandidates`, `broadcastCandidates`, `claim`, `enqueueBroadcast`, `markBroadcastSent`, `prune`).
**Where**: `src/lib/db/repos/push-dispatch.ts`
**Depends on**: T28
**Reuses**: `applicableInMonth`, `hasOccurrenceOn`, `localClock`
**Requirement**: PUSH-23, PUSH-24, PUSH-25, PUSH-26, PUSH-31, PUSH-37, PUSH-40

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `src/lib/db/repos/push-dispatch.int.test.ts`: só `approved` com inscrição; `revoked` e sem inscrição ficam de fora
- [ ] Lembrete: hora < preferida fora, = e > dentro; já reivindicado fora
- [ ] Vencimento: série ativa hoje dentro; encerrada, futura e outro dia fora; duas séries no mesmo dia viram um candidato
- [ ] `claim` devolve `true` uma vez e `false` depois, mesmo em chamadas concorrentes
- [ ] Broadcast só para `admin = true`; `prune` apaga só linhas com mais de 7 dias
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): add the dispatch repository`

---

### T30: Execução do dispatch

**What**: Criar `runDispatch` com reivindicação antes do envio, limite de 1000 envios, 20 em paralelo, prazo de 40 s, remoção de inscrições `gone`, fim de broadcast e `prune`.
**Where**: `src/lib/push/dispatch.ts`
**Depends on**: T29
**Reuses**: `sendPush`, `pushDispatchRepo`, `pushRepo`
**Requirement**: PUSH-23, PUSH-24, PUSH-25, PUSH-26, PUSH-27, PUSH-28, PUSH-29, PUSH-30, PUSH-31, PUSH-39, PUSH-40, PUSH-41

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com repo e envio simulados: segunda execução no mesmo dia não reenvia; `claim` falso não envia
- [ ] `gone` chama `removeByEndpoint`; `failed` conta e segue
- [ ] 1005 inscrições em fila → no máximo 1000 envios e nunca mais de 20 simultâneos; o resto fica sem `claim`
- [ ] Prazo estourado para de reivindicar
- [ ] Corpo enviado é exatamente o texto fixo de cada tipo; resposta `{sent, removed, failed}`
- [ ] Broadcast marcado `sent_at` só quando não resta alvo sem `claim`
- [ ] Gate check passes: `npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add the dispatch runner`

---

### T31: Rota de dispatch

**What**: Criar `POST /api/push/dispatch` com 503/401/200 e `maxDuration` 60.
**Where**: `src/app/api/push/dispatch/route.ts`
**Depends on**: T30
**Reuses**: `src/app/api/health/route.ts` e seu `route.test.ts`; guia de route handlers em `node_modules/next/dist/docs/`
**Requirement**: PUSH-20, PUSH-21, PUSH-22, PUSH-31

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `route.test.ts`: sem `CRON_SECRET` ou VAPID → 503 sem chamar o runner; sem cabeçalho, com segredo errado e com comprimento diferente → 401 corpo vazio
- [ ] Segredo certo → 200 com `{sent, removed, failed}` e nada mais
- [ ] `GET` não exporta handler
- [ ] A comparação usa `timingSafeEqual`
- [ ] Gate check passes: `npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `feat(push): add the dispatch endpoint`

---

### T32: Aviso de segurança da conta

**What**: Criar `notifySecurity(userId, kind)`, que nunca lança.
**Where**: `src/lib/push/security.ts`
**Depends on**: None
**Reuses**: `sendPush`, `pushRepo.securityTargets`
**Requirement**: PUSH-33, PUSH-34, PUSH-35, PUSH-36

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `src/lib/push/security.int.test.ts` com envio simulado: usuário com `security` ligado recebe o texto certo em todas as inscrições
- [ ] `security` falso, sem preferências ou sem configuração VAPID → nada enviado
- [ ] Envio que lança não propaga; `gone` remove a inscrição
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): add security notifications`

---

### T33: Avisar a revogação

**What**: Em `revokeUser`, chamar `notifySecurity(id, "revoked")` após a transição ok.
**Where**: `src/actions/admin-users.ts`
**Depends on**: T32
**Reuses**: `decide` existente
**Requirement**: PUSH-34, PUSH-35

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `admin-users.int.test.ts` estendido: revogar chama `notifySecurity` uma vez; reativar e excluir não chamam
- [ ] Falha do aviso não muda o `ok: true` nem desfaz a revogação
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): notify the user when access is revoked`

---

### T34: Avisar a senha redefinida

**What**: Em `resetPasswordAction` e `resetPasswordSealedAction`, ler o dono com `recoveryMaterialFor` antes de consumir e chamar `notifySecurity(userId, "password_reset")` após `ok`, antes do `redirect`.
**Where**: `src/actions/password-reset.ts`
**Depends on**: T33
**Reuses**: `passwordResetsRepo.recoveryMaterialFor`
**Requirement**: PUSH-33, PUSH-35

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `password-reset.int.test.ts` estendido: reset bem-sucedido (clássico e selado) chama `notifySecurity` com o dono do token
- [ ] Token inválido não chama; falha do aviso não impede o reset nem o redirect
- [ ] Os testes existentes de reset continuam passando
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): notify the user when the password is reset`

---

### T35: Ação de mensagem do administrador

**What**: Criar `broadcastPushAction` que valida o texto e enfileira em `push_broadcast`.
**Where**: `src/actions/push-admin.ts`
**Depends on**: T34
**Reuses**: `requireAdminForAction`, `broadcastSchema`, `pushDispatchRepo.enqueueBroadcast`
**Requirement**: PUSH-37, PUSH-38, PUSH-39

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `push-admin.int.test.ts`: admin com texto válido grava uma linha; texto vazio e de 141 caracteres devolvem "A mensagem deve ter de 1 a 140 caracteres" sem gravar
- [ ] Usuário comum e anônimo → `UNAUTHORIZED` sem gravar
- [ ] Gate check passes: `npm run test:unit && npm run test:int`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: integration
**Gate**: full
**Commit**: `feat(push): add the admin broadcast action`

---

### T36: Formulário de mensagem

**What**: Criar `BroadcastForm` (cliente) com contador de 140 caracteres e retorno da ação.
**Where**: `src/components/broadcast-form.tsx`
**Depends on**: T35
**Reuses**: `user-admin-list.tsx`, `Textarea`, `Button`
**Requirement**: PUSH-37, PUSH-38

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck e lint passam
- [ ] Inspeção: limite de 140, erro da ação exibido, campo limpo após `ok`
- [ ] Gate check passes: `npm run test:unit`

**Tests**: none (UI sem teste (AD-005))
**Gate**: quick
**Commit**: `feat(push): add the broadcast form`

---

### T37: Formulário no painel do administrador

**What**: Renderizar `BroadcastForm` em `admin/cadastros/page.tsx`.
**Where**: `src/app/(app)/admin/cadastros/page.tsx`
**Depends on**: T36
**Reuses**: Página atual
**Requirement**: PUSH-37

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Gate de build passa
- [ ] Inspeção: a página continua atrás de `requireAdminForPage`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none (Wiring)
**Gate**: build
**Commit**: `feat(push): show the broadcast form to the admin`

---

### T38: Workflow do dispatch horário

**What**: Criar `.github/workflows/push-dispatch.yml`.
**Where**: `.github/workflows/push-dispatch.yml`
**Depends on**: None
**Reuses**: `.github/workflows/backup.yml`; `src/lib/backup-workflow.test.ts`
**Requirement**: PUSH-47, PUSH-48, PUSH-49

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `src/lib/push-dispatch-workflow.test.ts`: cron `7 * * * *` e `workflow_dispatch`
- [ ] `curl --fail --silent --show-error -X POST` em `${{ secrets.APP_URL }}/api/push/dispatch` com `Authorization: Bearer` vindo de `secrets.CRON_SECRET` via `env`
- [ ] Sem `echo` do segredo ou da resposta; sem `continue-on-error` nem `|| true`; `permissions: contents: read`
- [ ] Gate check passes: `npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `ci(push): add the hourly dispatch workflow`

---

### T39: Variáveis no .env.example

**What**: Listar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `CRON_SECRET` com comentário.
**Where**: `.env.example`
**Depends on**: T38
**Reuses**: Comentários existentes
**Requirement**: PUSH-50

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `src/lib/env-example.test.ts` confere as quatro chaves, vazias
- [ ] Gate check passes: `npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `docs(push): document push environment variables`

---

### T40: Registrar AD-016

**What**: Acrescentar AD-016 em `.specs/STATE.md` (exceção à AD-013 para o push) e marcar a AD-013 com a ressalva.
**Where**: `.specs/STATE.md`
**Depends on**: T39
**Reuses**: Formato das ADs existentes
**Requirement**: PUSH-51

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `src/lib/push-decision.test.ts` lê `STATE.md` e confere `### AD-016`, `Status: active` e a menção à AD-013
- [ ] Decisão, motivo, trade-off, escopo e data preenchidos
- [ ] Gate check passes: `npm run test:unit`
- [ ] Nenhum teste existente removido, pulado ou enfraquecido

**Tests**: unit
**Gate**: quick
**Commit**: `docs(push): record AD-016 for the push privacy exception`

---

### T41: Texto de privacidade no cartão de /conta

**What**: No cartão "Seus dados" de `conta/page.tsx`, acrescentar que inscrições e preferências de notificação ficam sem cifra e que o push passa pelo serviço do fabricante do navegador.
**Where**: `src/app/(app)/conta/page.tsx`
**Depends on**: T40
**Reuses**: Frase "Ficam sem cifra" existente
**Requirement**: PUSH-52

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck e lint passam
- [ ] Inspeção `file:line` do texto
- [ ] Gate check passes: `npm run test:unit`

**Tests**: none (Texto de UI)
**Gate**: quick
**Commit**: `docs(push): disclose push data in the account page`

---

### T42: Texto de privacidade na política

**What**: Em `privacy-content.tsx`, acrescentar a mesma informação à política, incluindo que o texto é genérico e nunca leva valores ou nomes.
**Where**: `src/components/privacy/privacy-content.tsx`
**Depends on**: T41
**Reuses**: Seções existentes da política
**Requirement**: PUSH-52

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Typecheck e lint passam
- [ ] Inspeção `file:line` do texto
- [ ] Gate check passes: `npm run test:unit`

**Tests**: none (Texto de UI)
**Gate**: quick
**Commit**: `docs(push): disclose push in the privacy policy`

---

### T43: Runbook de push e PWA

**What**: Documentar em `docs/hospedagem-gratuita.md`: gerar VAPID (`npx web-push generate-vapid-keys`), criar `CRON_SECRET`, secrets `APP_URL`/`CRON_SECRET` no GitHub, variáveis na Vercel, aviso dos 60 dias do cron e como testar o push (build + start; o SW não registra em `next dev`).
**Where**: `docs/hospedagem-gratuita.md`
**Depends on**: T42
**Reuses**: Seções do runbook atual
**Requirement**: PUSH-47

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Gate de build passa
- [ ] Inspeção: cada variável do `.env.example` aparece no runbook
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: none (Docs)
**Gate**: build
**Commit**: `docs(push): add the push and PWA runbook`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
Phase 2:  T9 → T10 → T11 → T12 → T13 → T14
Phase 3:  T15 → T16 → T17 → T18 → T19 → T20
Phase 4:  T21 → T22 → T23 → T24 → T25 → T26
Phase 5:  T27 → T28 → T29 → T30 → T31
Phase 6:  T32 → T33 → T34 → T35 → T36 → T37
Phase 7:  T38 → T39 → T40 → T41 → T42 → T43
```

Execução estritamente sequencial. Total: 43 tasks em 7 fases.
