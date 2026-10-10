# Monitoramento de erros com Sentry - Validação

**Verdict**: PASS

**Date**: 2026-10-10
**Spec**: `.specs/features/sentry-monitoramento/spec.md`
**Diff range**: `421fe6c..HEAD` (HEAD = ba46fc0)
**Verifier**: sub-agente independente (autor != verificador)

---

## Task Completion

T1 a T14 marcadas `[x]` em tasks.md. Nenhuma parcial ou bloqueada. Sem teste de integração nesta feature (gate = unit).

## Spec-Anchored Acceptance Criteria

Desvios conhecidos aceitos: SENTRY-04 usa `dataCollection` (o SDK 11.6.0 não tem `sendDefaultPii`; spec já foi atualizada, spec.md AC4 P1) e T6 usa `retry` no lugar de `reset` (documentado no Next 16.3).

| Req | Critério | Resultado esperado (spec) | Evidência `file:line` + asserção | Resultado |
| --- | --- | --- | --- | --- |
| SENTRY-01 | Erro não tratado do servidor vira evento com tipo e stack | `Sentry.init` no servidor com opções válidas; exceção mantém `type` e `stacktrace` | `src/sentry.server.config.ts:3` (init), `src/instrumentation.ts:3-5` (register nodejs); `options.test.ts:123-129` `expect(value?.type).toBe("TypeError")` + frame `toMatchObject({filename,function,lineno})`. Envio real depende do SDK (inspeção) | PASS |
| SENTRY-02 | `onRequestError` encaminha o erro | exporta `onRequestError` = `captureRequestError` | `src/instrumentation.ts:8` (`export const onRequestError = Sentry.captureRequestError`); sem teste (config, tasks.md: none) | PASS (inspeção) |
| SENTRY-03 | Sem DSN, nenhum cliente nem rede | `enabled: false` | `options.ts:90`; `options.test.ts:67-68` `expect(...enabled).toBe(false)` (dsn ausente e "") | PASS |
| SENTRY-04 | Coleta automática de dados do usuário desligada (via `dataCollection`) | todas as categorias off, sem Edge | `options.ts:92-103`; `options.test.ts:79-90` `toMatchObject({userInfo:false,cookies:false,httpHeaders:false,...,httpBodies:[]})`. Sem `runtime = "edge"` e sem config Edge no diff | PASS (desvio aceito) |
| SENTRY-05 | `beforeSend` remove message, `exception.values[].value`, breadcrumbs, request, user, extra; mantém tipo, stack, rota sem query, release, env, tags | whitelist | `options.ts:45-66`; `options.test.ts:117-129` (transaction `/dashboard`, release, env, tags, `value` undefined), `:134-139` (`not.toHaveProperty` message/breadcrumbs/request/user/extra/vars), `:143-148` (serializado sem e-mail/cookie/IP/server_name), `:153` contextos só browser/os/runtime | PASS |
| SENTRY-06 | `logActionError` reporta só ação e `code` como tags | `captureException(Error sintético, {tags:{action,code}})` | `log.ts:16`; `log.test.ts:57-59` `expect(sent).not.toBe(error)`, `message === "server_action_failed"`, `hint toEqual {tags:{action:"createCategory",code:"23505"}}`; `:66-67` sem `secret/detail/texto`, `code:"unknown"` p/ não-Error | PASS |
| SENTRY-07 | Navegador envia 1 evento scrubbed via `/monitoring` | init do browser com DSN público + túnel | `src/instrumentation-client.ts:5-10`; `options.ts:117` + `options.test.ts:222` `expect(opts.tunnelRoute).toBe("/monitoring")`; `src/app/global-error.tsx:21` `captureException(error)` | PASS (inspeção para envio real) |
| SENTRY-08 | `connect-src` continua `'self'` | `connect-src 'self'` e sem domínio sentry | `security-headers.test.ts:66-70` `expect(connect).toBe("connect-src 'self'")` e `not.toMatch(/sentry/i)` | PASS |
| SENTRY-09 | `/monitoring` sem redirect ao login (fora do matcher) | matcher exclui `monitoring` | `src/proxy.ts:37`; `security-headers.test.ts:109` (`proxyCovers`) e casos `/monitoring`, `/monitoring/envelope` (`:128-129`) | PASS. Nota: a "Independent Test" da spec cita `decideRoute("/monitoring", false)` devolvendo `next`; a implementação exclui via matcher e `decideRoute` não é chamado, então o texto da spec está impreciso (spec-precision gap, baixo) |
| SENTRY-10 | `global-error` pt-BR, botão "Tentar novamente", sem mensagem | tela sem `error.message` | `global-error.tsx:25,32,34-37` (`lang="pt-BR"`, "Algo deu errado", `Button` "Tentar novamente", `error.message` nunca renderizado); desvio `retry` (linha 17-19) | PASS (inspeção; desvio aceito) |
| SENTRY-11 | Sem Replay, console, DOM, rede | sem integrações Replay/Feedback; breadcrumbs nulos | `instrumentation-client.ts:5-10` (sem integrations); `options.ts:104-105`; `options.test.ts:95-96` `maxBreadcrumbs 0`, `beforeBreadcrumb()` retorna `null` | PASS (ver nota de integrações padrão na revisão de privacidade) |
| SENTRY-12 | Upload de source maps com org/projeto/token | org `anon-finance`, projeto `anon-finance-nextjs`, token | `options.ts:115-116,120`; `options.test.ts:220-221,227` `expect(opts.authToken).toBe("t")`, `disable` undefined; `next.config.ts:17-20` | PASS (upload real não exercitado: sem token) |
| SENTRY-13 | Sem token, build termina sem falhar | `disable: "disable-upload"` | `options.test.ts:235`; **`npm run build` em worktree isolado sem token terminou com sucesso** (rotas listadas, incl. `/sentry-example-page`) | PASS |
| SENTRY-14 | `.map` não servidos | `deleteSourcemapsAfterUpload: true`; sem maps em `.next/static` | `options.test.ts:229`; build sem token: 0 arquivos `.map` em `.next/static` (os `.map` estão só em `.next/server` e `.next/build`, não servidos) | PASS |
| SENTRY-15 | Credenciais só em env | token só via argumento | `options.test.ts:238-243` (`stubEnv` ignorado); `next.config.ts:19`; `.env.example` só placeholders vazios | PASS |
| SENTRY-16 | `tracesSampleRate` 0.1 em produção | 0.1 | `options.ts:106`; `options.test.ts:100` `toBe(0.1)` | PASS |
| SENTRY-17 | 0 fora de produção | 0 | `options.test.ts:101-103` `toBe(0)` (development, test, indefinido) | PASS |
| SENTRY-18 | Transação sem query/fragmento em URL e nome | nome sem `?mes=...#x` | `options.ts:75-79`; `options.test.ts:192` `toBe("/dashboard")`, `:200` e `:211` sem `mes=2026-10` (nome, request.url, descrição de span) | PASS no que a spec diz; ver Gap 1 (`span.data`/`contexts.trace.data` não limpos) |
| SENTRY-19 | Transação sem corpo, cookies, headers | `request` removido | `options.ts:71-74`; `options.test.ts:197-198,201-202` | PASS |
| SENTRY-20 | Página de exemplo fora de produção | 2 botões (cliente, servidor) | `sentry-example-page/page.tsx:12-24`, `example-buttons.tsx:8-26`; `route.test.ts:15` `rejects.toThrow("Erro de servidor de exemplo do Sentry")` | PASS (UI por inspeção) |
| SENTRY-21 | 404 em produção | status 404 | `page.tsx:10` `notFound()`; `route.ts:3-4`; `route.test.ts:10` `expect(response.status).toBe(404)` | PASS |
| SENTRY-22 | Pública fora de produção | `decideRoute` -> `next` | `route-decision.ts` (`PUBLIC_PATHS`); `route-decision.test.ts:77-79` `toEqual({action:"next",noStore:false})` para as duas rotas | PASS. Nota: elas são públicas também em produção (onde o handler/página dão 404); aceitável |

**Status**: 22/22 requisitos com evidência. 1 spec-precision gap (SENTRY-09, texto do Independent Test).

### Casos de borda

- [x] Sentry inacessível: não bloqueia a resposta (comportamento do SDK, inspeção; nenhum `await` em `logActionError`, `log.ts:16`).
- [x] Só um DSN definido: cada runtime lê seu próprio DSN (`sentry.server.config.ts:3`, `instrumentation-client.ts:7`), `enabled` por DSN (`options.test.ts:67-71`).
- [x] Evento sem `exception`: `options.test.ts:157-163` (`not.toBeNull`, sem message/user, tags mantidas).
- [x] Erro de validação (`ActionResult`) não gera evento: só `logActionError` reporta; inspeção de `src/actions/*` não pedida no diff.
- [x] Sem init no Vitest: `log.test.ts` mocka `@sentry/nextjs`; `options.ts` importa só tipos; init só em `instrumentation*.ts`/`sentry.server.config.ts`, não importados por testes.

---

## Discrimination Sensor

Escopo: scratch via `git worktree` fora do repo (`node_modules` por hardlink: symlink falha no Turbopack), comando `vitest run --project unit src/lib src/app/api/sentry-example-api`. Profundidade: expandida (>=5 mutações, caminho de privacidade/crítico).

| # | Arquivo | Mutação | Resultado |
| - | ------- | ------- | --------- |
| 1 | `options.ts` | `scrubEvent` mantém `message` | Killed |
| 2 | `options.ts` | mantém `breadcrumbs` | Killed |
| 3 | `options.ts` | mantém `request` | Killed |
| 4 | `options.ts` | mantém `user` | Killed |
| 5 | `options.ts` | mantém `extra` | Killed |
| 6 | `options.ts` | mantém `exception.values[].value` | Killed |
| 7 | `options.ts` | mantém `vars` dos frames | Killed |
| 8 | `options.ts` | mantém todos os `contexts` | Killed |
| 9 | `options.ts` | rota do evento mantém query | Killed |
| 10 | `options.ts` | `scrubEvent` fail-open (catch devolve evento) | Killed |
| 11 | `options.ts` | campo extra `server_name` na whitelist | Killed |
| 12 | `options.ts` | tracing produção 0.1 -> 1 | Killed |
| 13 | `options.ts` | tracing fora de produção 0 -> 0.5 | Killed |
| 14 | `options.ts` | `enabled: true` sem DSN | Killed |
| 15 | `options.ts` | `beforeBreadcrumb` mantém breadcrumb | Killed |
| 16 | `options.ts` | `userInfo: true` | Killed |
| 17 | `options.ts` | `scrubTransaction` mantém query no nome | Killed |
| 18 | `options.ts` | `scrubTransaction` mantém `request` | Killed |
| 19 | `options.ts` | descrição de span sem strip | Killed |
| 20 | `options.ts` | `scrubTransaction` fail-open | **Survived** (ver Gap 2) |
| 21 | `options.ts` | build sem token ainda faz upload | Killed |
| 22 | `options.ts` | `deleteSourcemapsAfterUpload: false` | Killed |
| 23 | `options.ts` | `tunnelRoute` removido | Killed |
| 24 | `log.ts` | passa o erro original ao Sentry | Killed |
| 25 | `log.ts` | mensagem sintética inclui o code | Killed |
| 26 | `log.ts` | sem tag `code` | Killed |
| 27 | `security-headers.ts` | `PATHS_OUTSIDE_PROXY` sem `/monitoring` | Killed |
| 28 | `proxy.ts` | matcher sem `monitoring` | Killed |
| 29 | `route-decision.ts` | remove `/sentry-example-page` | Killed |
| 30 | `route-decision.ts` | remove `/api/sentry-example-api` | Killed |
| 31 | `sentry-example-api/route.ts` | responde 200 em produção | Killed |
| 32 | `sentry-example-api/route.ts` | lança em produção | Killed |
| 33 | `security-headers.ts` | CSP `connect-src` + `*.sentry.io` | Killed |

**Resultado**: 33 injetadas, 32 killed, 1 survived (baixa gravidade). Isolamento: `git status --porcelain` do repo real idêntico ao baseline antes e depois (só `docs/marca/*` untracked); worktree removido.

---

## Revisão de privacidade

- Whitelist de `scrubEvent` (`options.ts:12-23,45-66`): fora dela caem `extra`, `contexts` exceto runtime/os/browser, `modules`, `server_name`, `request` (inclusive o do `onRequestError`), `user`, `breadcrumbs`, `message`, `exception.values[].value`, `vars`, `mechanism.data`. Mantidos: `sdk` e `debug_meta` (identificadores técnicos do SDK/build, sem dado do usuário) e `tags` (só `action`/`code` vindos do app).
- `tags`: o app só define `action` e `code` (`log.ts:16`); o Sentry não adiciona tags de usuário por padrão.
- Navegador: sem integrações de Replay/Feedback no bundle. As integrações padrão do SDK (console, DOM, fetch/xhr, history) continuam registradas, mas `maxBreadcrumbs: 0` + `beforeBreadcrumb: () => null` descartam o que produzem (`options.ts:104-105`). Não é "desabilitar a captura", mas o efeito é o pedido; o scrub final também as remove.
- CSP: `connect-src 'self'` preservado e testado (`security-headers.test.ts:66-70`); `/monitoring` recebe o CSP estático (`security-headers.ts`, `PATHS_OUTSIDE_PROXY`).
- Transações (`scrubTransaction`, `options.ts:68-85`) usam denylist, não whitelist: ver Gap 1.

## Code Quality / escopo

Diff só toca arquivos previstos no design (options, instrumentation, init, global-error, log, rotas/proxy/headers, exemplo, next.config, .env.example, package*). Nada fora do escopo; `docs/marca/` untracked é alheio à feature. Projeto sem guideline de testes além de AGENTS.md (e2e suspenso, respeitado: nenhum e2e novo).

## Gate Check

- `npm run typecheck`: exit 0
- `npm run lint`: 0 erros, 1 aviso preexistente (`category-editor.tsx:40` `TOTAL_MICRO`, fora do diff)
- `npm run test:unit`: 57 arquivos, **1271 passed, 0 failed, 0 skipped**
- Testes removidos: nenhum (diff só adiciona; `log.test.ts` só ganha import/mock). Contagem prévia exata não medida.
- `npm run build` (worktree isolado, sem token): sucesso.

---

## Gaps ranqueados (nenhum bloqueia o PASS)

1. **Médio, privacidade (SENTRY-18/19)**: `scrubTransaction` é denylist. Mantém `contexts.trace.data` e `spans[].data` (o SDK grava `url.full` em spans de fetch/http), que podem carregar query string com dados como `?mes=2026-10`; só `transaction`, `request` e `span.description` são limpos (`options.ts:70-80`). Só afeta 10% das transações em produção, e a spec só exige limpar "URL e nome", mas a intenção (AC3, goal de não enviar dado) pede limpar também `data`. Sem teste. Fix: remover/limpar `data` de spans e de `contexts.trace`, com teste.
2. **Baixo**: `scrubTransaction` fail-open sobrevive à mutação; o design só exige fail-closed para `scrubEvent`, mas o catch de `scrubTransaction` devolve `null` sem teste. Adicionar um teste análogo a `options.test.ts:165`.
3. **Baixo, spec-precision**: o Independent Test de P1 navegador cita `decideRoute("/monitoring", false)` -> `next`; a implementação exclui `/monitoring` pelo matcher. Ajustar o texto da spec.
4. **Info**: `exception.values[].stacktrace.frames` mantém `context_line`/`pre_context` (trecho do código-fonte, sem dado do usuário) e `abs_path` do servidor; aceitável.

## Requirement Traceability Update

SENTRY-01..22: Implementing -> Verified (SENTRY-04 e SENTRY-10 com desvio documentado).

## Summary

**Overall**: Ready
**Spec-anchored check**: 22/22 ACs com evidência; 1 spec-precision gap
**Sensor**: 33 mutações, 32 killed, 1 survived (baixa gravidade)
**Gate**: 1271 passed, 0 failed; typecheck e lint ok; build sem token ok
