# Privacidade integrada à aplicação Validation

**Date**: 2026-10-10
**Spec**: `.specs/features/privacidade-integracao/spec.md`
**Diff range**: `cca4bd4^..bbb3b23` (cca4bd4 style(landing), 532c549 refactor(proxy), bbb3b23 feat(privacidade))
**Verifier**: independent sub-agent (author ≠ verifier)
**Verdict**: PASS ✅

---

## Task Completion

Não há `tasks.md` (feature pequena, 2 tasks citadas na rastreabilidade do spec).

| Task | Status | Notes |
| ---- | ------ | ----- |
| Task 1 (função pura de roteamento + testes) | ✅ Done | `src/lib/route-decision.ts`, `src/lib/route-decision.test.ts`, `src/proxy.ts:12` |
| Task 2 (molduras pública/logada, ALIASES) | ✅ Done | `src/app/privacidade/page.tsx`, `src/app/(app)/seguranca/page.tsx`, `src/components/app-nav.tsx` |

---

## Spec-Anchored Acceptance Criteria

ACs de UI: evidência por inspeção de código (AD-005, sem e2e). ACs de roteamento: teste unitário.

| Req | Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --------- | -------------------- | ----------------------- | ------ |
| PRIV-01 | /privacidade sem cookie renderiza conteúdo sob Navbar e rodapé da landing | Navbar + SiteFooter + PrivacyContent; sem rewrite | `src/app/privacidade/page.tsx:29` `<Navbar />`, `:31` `<PrivacyContent />`, `:42` `<SiteFooter />`; `src/lib/route-decision.test.ts:18` `expect(decideRoute("/privacidade", false)).toEqual({action:"next",noStore:false})` | ✅ PASS |
| PRIV-02 | Links Cockpit/Ápice/Manifesto levam a `/#cockpit`, `/#apice`, `/#manifesto` | hrefs absolutos com âncora | `src/components/landing/navbar.tsx:55,56,58` (LINKS); ids existem na landing `src/app/bem-vindo/page.tsx:84,212,272`; HTML servido contém `href="/#apice"` etc. (curl) | ✅ PASS |
| PRIV-03 | "Segurança" mantém em /privacidade | href `/privacidade` | `src/components/landing/navbar.tsx:57` | ✅ PASS |
| PRIV-04 | Entrar / Começar agora | `/login`, `/cadastro` | `navbar.tsx:84,87` (desktop), `:116,119` (mobile) | ✅ PASS |
| PRIV-05 | "Voltar ao início" leva a `/` | `<Link href="/">` | `src/app/privacidade/page.tsx:34-38` | ✅ PASS |
| PRIV-06 | Abaixo de md, hambúrguer com os mesmos links | mesmo array LINKS no painel mobile | `navbar.tsx:92-101` (botão `md:hidden`), `:110-114` (mesmo `LINKS`) | ✅ PASS |
| PRIV-07 | Com cookie, conteúdo dentro do shell do app | rewrite para rota do grupo `(app)` | `src/lib/route-decision.test.ts:25` `toEqual({action:"rewrite",to:"/seguranca",noStore:true})`; `src/app/(app)/seguranca/page.tsx:11` `<PrivacyContent />`; shell em `src/app/(app)/layout.tsx` (aside/AppNav) | ✅ PASS |
| PRIV-08 | URL permanece /privacidade | rewrite (não redirect) | `route-decision.test.ts:26` `action:"rewrite"`; `src/proxy.ts:24-27` `NextResponse.rewrite` | ✅ PASS |
| PRIV-09 | "Privacidade" marcado como página atual | `aria-current="page"` com pathname `/privacidade` ou `/seguranca` | `src/components/app-nav.tsx:17` `ALIASES = {"/privacidade":"/seguranca"}`, `:32-33` `active = ... startsWith(href) \|\| startsWith(ALIASES[href] ?? href)`, `:38` `aria-current` | ✅ PASS (sem teste unitário; inspeção) |
| PRIV-10 | Versão logada sem Navbar, rodapé e "Voltar" | ausência | `src/app/(app)/seguranca/page.tsx:11` renderiza só `PrivacyContent`; `privacy-content.tsx` não contém Navbar/SiteFooter/Voltar (grep) | ✅ PASS |
| PRIV-11 | Conta legacy / sem data de nascimento redireciona | `/proteger-dados` / `/data-nascimento` | `src/app/(app)/layout.tsx:19-20` (seguranca está no grupo `(app)`) | ✅ PASS |
| PRIV-12 | Cookie rejeitado pelo servidor -> /login | redirect /login | `src/app/(app)/layout.tsx:17` `requireSessionForPage`, `src/lib/auth-guard.ts:17` `redirect("/login")`; curl: `/privacidade` com cookie falso -> 307 `/login` | ✅ PASS |
| PRIV-13 | Um só componente de conteúdo | ambas as páginas importam `PrivacyContent` | `src/app/privacidade/page.tsx:18,31`; `src/app/(app)/seguranca/page.tsx:2,11` | ✅ PASS |
| PRIV-14 | /seguranca sem cookie -> /login | `{redirect,"/login"}` | `route-decision.test.ts:40` `toEqual({action:"redirect",to:"/login",noStore:true})`; curl `/seguranca` -> 307 `/login` | ✅ PASS |
| PRIV-15 | Decisão do proxy em função pura testada | `decideRoute` + testes | `src/lib/route-decision.ts:15`; `src/proxy.ts:12`; testes `route-decision.test.ts:5-74` | ✅ PASS |

**Status**: ✅ 15/15 ACs com evidência; nenhum spec-precision gap (todos os resultados do spec são valores exatos).

### Edge cases

- [x] `/seguranca` direto sem sessão -> /login: `route-decision.test.ts:40`
- [x] `/privacidade/qualquer-coisa` logado sem rewrite: `route-decision.test.ts:33` `toEqual({action:"next",noStore:false})` (igualdade estrita `route-decision.ts:17`)
- [x] `/` sem cookie serve landing: `route-decision.test.ts:6`; `/` com cookie segue: `:14`
- [x] Outras públicas inalteradas: `route-decision.test.ts:62-73` (`it.each` x2 sessões)

---

## Discrimination Sensor

Escopo: cópia isolada de `route-decision.ts` + teste em diretório scratch (vitest com config própria); árvore real intocada.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `route-decision.ts:17` | `hasSession` invertido no rewrite de /privacidade | ✅ Killed (2 testes: `:18`, `:25`) |
| 2 | `route-decision.ts:16` | removido o rewrite de `/` | ✅ Killed (`:6`) |
| 3 | `route-decision.ts:18` | `/seguranca` tornado público (next) | ✅ Killed (`:40`) |
| 4 | `route-decision.ts:17` | rewrite também de subcaminhos (`startsWith`) | ✅ Killed (`:33`) |
| 5 | `route-decision.ts:17` | destino do rewrite trocado | ✅ Killed (`:25`) |

**Sensor depth**: lightweight (+2 extras)
**Result**: 5/5 killed - PASS ✅
**Isolamento**: `git status --porcelain` da árvore real idêntico antes e depois.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (obs.: o diff range inclui o commit `style` com reformatação de landing/privacidade, declarado) |
| No scope creep | ✅ |
| Matches patterns (rewrite já usado em `/`) | ✅ |
| Spec-anchored outcome check | ✅ asserts com `toEqual` do objeto completo (action, to, noStore) |
| Coverage Expectation (domínio 1:1) | ✅ |
| Every test maps to a requirement | ✅ |
| Guidelines | AGENTS.md (AD-005: UI por inspeção) |

---

## Gate Check

- **Gate command**: `npm run typecheck`; `npx eslint src`; `npx vitest run --project unit`
- **Result**: typecheck OK (exit 0), eslint sem erros, unit 1134 passed, 0 failed, 0 skipped (50 arquivos)
- **Test count after**: 1134; `route-decision.test.ts` adiciona 13 casos (arquivo novo; baseline anterior não medido)
- **Smoke (dev server)**: `/` 200 sem cookie; `/privacidade` 200 sem cookie (HTML tem Navbar/rodapé, hrefs `/#cockpit`, `/#apice`, `/#manifesto`, `/login`, `/cadastro`, `/`); com cookie falso `/`, `/privacidade`, `/seguranca` -> 307 `/login`.

---

## Riscos observados (não bloqueantes)

1. `ALIASES` em `app-nav.tsx:33` usa `startsWith`, então `/segurancaXYZ` também ativaria o item; irrelevante hoje (nenhuma rota assim).
2. `usePathname` numa reescrita: o código cobre ambos os caminhos (`/privacidade` e `/seguranca`), então o pressuposto aberto do spec está coberto sem verificação manual. Sem teste unitário da lógica de `active` (função inline no componente).
3. `dark` wrapper em `privacidade/page.tsx:28` aplica tokens escuros só à moldura pública; a landing usa `bg-zinc-950` sem `dark`. Conteúdo com tokens (`text-muted-foreground`) fica correto no escuro. Sem conflito.
4. O link "/conta" dentro de `PrivacyContent` (`privacy-content.tsx:167,179`) leva visitante ao login; comportamento pré-existente, conteúdo fora de escopo.
5. `scroll-behavior: smooth` limitado a `[data-landing]` (`globals.css:246`); âncoras funcionam sem ele.

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| PRIV-01 a PRIV-15 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 15/15 ACs, 0 spec-precision gaps
**Sensor**: 5/5 mutations killed
**Gate**: 1134 passed, 0 failed

**Issues found**: nenhum bloqueante. Opcional (Minor): extrair a lógica `active` de `app-nav.tsx:32-33` para função pura testável (PRIV-09 hoje só por inspeção).
