# Validation: Rebrand ANON - PASS

**Date**: 2026-10-10
**Spec**: `.specs/features/rebrand-anon/spec.md`
**Diff range**: `78da939^..03a79a4` (12 commits de scope `brand`: 78da939, 13e7ff9, fcfc7ca, aa12c19, 1cecf8f, c83476c, e76386d, ffd94db, 976cbe4, aef7bc6, 8131756, 03a79a4; commits de outras sessões intercalados ignorados)
**Verifier**: independent sub-agent (author ≠ verifier)
**Veredito**: PASS - 14/14 requisitos com evidência, gate verde, sensor 7/7 killed. Apenas observações não bloqueantes.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T12 | ✅ Done | 12 commits `feat(brand)`/`test(brand)`, um por task, no range acima |

---

## Spec-Anchored Acceptance Criteria

Teste (unit) onde a spec é de texto/constante; UI por inspeção de código (AD-005, e2e suspenso).

| Requisito / AC | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| ANON-01 (P1/AC1) Logo com monograma, "ANON", descritor | monograma A + "ANON" + "Finanças Privadas" | `src/components/brand/Logo.tsx:5` `MARK_PATH`; `:76-77` `{BRAND_NAME}` e `{BRAND_DESCRIPTOR}`; `src/lib/brand.test.ts:13` `expect(BRAND_NAME).toBe("ANON")`, `:18` `expect(BRAND_DESCRIPTOR).toBe("Finanças Privadas")` | ✅ PASS |
| ANON-01 (AC7) aria-label do Logo "ANON" | "ANON" | `Logo.tsx:26` `aria-label={BRAND_NAME}` (BRAND_NAME = "ANON", `brand.ts:2`) | ✅ PASS |
| ANON-01 (AC7) aria-label do link da landing | "ANON, página inicial" | `src/components/landing/navbar.tsx:27` ``aria-label={`${BRAND_NAME}, página inicial`}`` | ✅ PASS |
| ANON-02 variante dark | gradiente e superfícies de `anon_logo_dark.svg` | `Logo.tsx:57-70` vs `docs/marca/anon_logo_dark.svg`: gradiente #8B5CF6/#6366F1/#10B981 (0/45/100%), linha #6366F1→#34D399, glow #10B981 0.18→0, fundo #0D111A, stroke rgba(255,255,255,0.12), rect 80x80 rx20, glow rect -8/96/rx28, path "M40 18 L19 62 H32 L40 45 L48 62 H61 Z", tranca (cx40 cy36 r1.8; "M39.1 37.2 L38.4 42 H41.6 L40.9 37.2 Z"), linha "M40 18 L61 62" 2.5 round - idênticos; exibida só em dark (`hidden ... dark:block`, `Logo.tsx:56`) | ✅ PASS (inspeção) |
| ANON-02 variante light | gradiente e superfícies de `anon_logo_light.svg` | `Logo.tsx:35-52` vs `docs/marca/anon_logo_light.svg`: gradiente #6D28D9/#4338CA/#047857, linha #4338CA→#059669, filtro feDropShadow dy2 std4 #0F172A 0.06, fundo #F8FAFC stroke #E2E8F0 1.5, mesma geometria; `dark:hidden` (`Logo.tsx:34`) | ✅ PASS (inspeção) |
| ANON-03 título | template "ANON • %s", default "ANON" | `src/app/layout.tsx:32` `title: { default: BRAND_NAME, template: BRAND_TITLE_TEMPLATE }`; `brand.test.ts:25` `expect(BRAND_TITLE_TEMPLATE).toBe("ANON • %s")` | ✅ PASS |
| ANON-03 descrição | "ANON – Finanças Privadas" | `layout.tsx:33` `description: BRAND_DESCRIPTION`; `brand.test.ts:29` `expect(BRAND_DESCRIPTION).toBe("ANON – Finanças Privadas")` | ✅ PASS |
| ANON-04 favicon | escuro padrão, claro com `prefers-color-scheme: light` | `layout.tsx:36-39` `{ url: "/favicon.svg" }` (sem media) e `{ url: "/favicon-light.svg", media: "(prefers-color-scheme: light)" }`; `cmp docs/marca/anon_favicon_dark.svg public/favicon.svg` e `..._light.svg public/favicon-light.svg` sem diferença | ✅ PASS |
| ANON-05 telas de acesso | "Finanças Privadas" no lugar de "Gestão Patrimonial Familiar" | `src/app/login/page.tsx:16`, `cadastro/page.tsx:17`, `esqueci-senha/page.tsx:28`, `redefinir-senha/page.tsx:30`: `{BRAND_DESCRIPTOR}`; grep "Gestão Patrimonial" = 0 | ✅ PASS |
| ANON-06 menu | "Liberdade" | `src/components/app-nav.tsx:11` `label: "Liberdade"` | ✅ PASS |
| ANON-06 título página/aba | "Liberdade" | `src/app/(app)/liberdade/page.tsx:7` `title: "Liberdade"`; `src/components/goal-experience.tsx:88` `<PageHeader title="Liberdade"` | ✅ PASS |
| ANON-07 ação do card / checklist | "Definir meta" / "Definir sua meta" | `src/components/getting-started-card.tsx:15` `label: "Definir meta"`; `src/lib/domain/onboarding.test.ts:47` `["goal", "Definir sua meta"]`; `onboarding.ts:23` | ✅ PASS |
| ANON-07 frase meta atingida | termina em "Você já atingiu sua meta." | `src/lib/domain/freedom-copy.test.ts:188` `expect(sentence).toBe("Para ter R$ 20 mil/mês aos 48 anos, você precisa de R$ 4,8 mi. Você já atingiu sua meta.")`; `:213` caso exato igual ao alvo; `freedom-copy.ts:53` | ✅ PASS |
| ANON-07 AC6 sem "Ápice/ápice" em rótulo/subtítulo/card | zero ocorrência visível | `freedom-copy.ts:143` "patrimônio-alvo"; varredura (seção abaixo) sem texto visível; `freedom-copy.test.ts:105` `OLD_TERMS` + guarda `brand-guard.test.ts:75-77` | ✅ PASS |
| ANON-08 privacidade | "Meta de liberdade e percentuais das categorias" | `src/components/privacy/privacy-content.tsx:49` literal exato | ✅ PASS |
| ANON-09 slogan landing | slogan opção 3 como tagline | `src/app/bem-vindo/page.tsx:181-184` h1 "O planejamento do seu patrimônio com privacidade absoluta." (texto literal em JSX, ver observação O1) | ✅ PASS |
| ANON-09 slogan rodapé | idem | `site-footer.tsx:30` `{BRAND_TAGLINE}`; `brand.test.ts:21` `expect(BRAND_TAGLINE).toBe("O planejamento do seu patrimônio com privacidade absoluta.")` | ✅ PASS |
| ANON-09 copyright | "© 2026 ANON. Desenvolvido para quem leva patrimônio a sério." | `site-footer.tsx:48` `© 2026 {BRAND_NAME}. Desenvolvido para quem leva patrimônio a sério.` | ✅ PASS |
| ANON-10 "Vértice/VÉRTICE" -> "ANON" | sem ocorrência; "a equipe da ANON" | `bem-vindo/page.tsx:60,92,249,274`; `privacy-content.tsx:71,140`; guarda `brand-guard.test.ts:75-77` `expect(findOffenders()).toEqual([])` | ✅ PASS |
| ANON-10 metadado landing / "ápice patrimonial" | "ANON – Finanças Privadas"; "patrimônio-alvo" | `bem-vindo/page.tsx:25` `title: { absolute: BRAND_DESCRIPTION }`; `:64` "patrimônio-alvo" | ✅ PASS |
| ANON-11 âncora | `#liberdade` na navbar, rodapé e `id`; título "A Liberdade: engenharia de juros compostos" | `navbar.tsx:12` `href: "/#liberdade"`; `site-footer.tsx:11`; `bem-vindo/page.tsx:213` `id="liberdade"`, `:217` título exato | ✅ PASS |
| ANON-12 arquivo da chave | "chave-de-recuperacao-anon.txt" | `src/components/recovery-key-dialog.tsx:41` `link.download = RECOVERY_KEY_FILE_NAME`; `brand.test.ts:33` `expect(RECOVERY_KEY_FILE_NAME).toBe("chave-de-recuperacao-anon.txt")` | ✅ PASS |
| ANON-13 ativos | 8 SVGs + PNG em `docs/marca/`; sem `docs/vertice_*` | `ls docs/marca` = 8 SVG + `anon_asset_preview.png`; `ls docs` sem `vertice*`; `src/app/icon.svg` ausente | ✅ PASS |
| ANON-13 roadmap | "ANON" e `docs/marca/anon_favicon_dark.svg` | `docs/mobile-roadmap.md:3,50,51` | ✅ PASS |
| ANON-14 design-system | "Tokens e componentes base do ANON." | `src/app/design-system/page.tsx:38` literal exato | ✅ PASS |

**Status**: ✅ 14/14 requisitos cobertos; ⚠️ nenhuma lacuna de precisão da spec que exija correção (ver observações O2-O3).

### Edge cases

- [x] Fallback sem suporte a `media`: o primeiro `icon` (`/favicon.svg`, escuro) não tem `media`, vale como padrão (`layout.tsx:37`).
- [x] Ids de gradiente únicos por instância: `Logo.tsx:19` `useId()` + sufixo `-dark-`/`-light-` por variante e por tipo (`:21-22`); duas instâncias (sidebar e barra) não colidem.
- [x] Testes antigos atualizados, não removidos: `onboarding.test.ts:47` e `freedom-copy.test.ts:188,213` com os textos da spec; 1242 testes passam.
- [x] Troca de tema sem layout shift: as duas variantes SVG têm o mesmo `size-10`/viewBox, alternadas só por `dark:hidden` / `hidden dark:block` (`Logo.tsx:34,56`), sem reload nem JS.

---

## Varredura final (`grep -rniE "vértice|vertice|ápice|apice" src public docs`, exceto `docs/marca`)

Nenhuma ocorrência em `public/` nem em `docs/`. Em `src/` restam 33 linhas, todas classificadas:

| Classe | Onde | Visível ao usuário? |
| ------ | ---- | ------------------- |
| Comentário (inclui comentários de teste e docstring) | `freedom-copy.ts:6`, `chart-label.ts:4`, `freedom.ts:321`, `freedom.test.ts:341,469,668,881,916`, `slack.test.ts:6`, `freedom-copy.test.ts:43,47,55`, `goal-draft.test.ts:5`, `brand-guard.test.ts:5,16,46` | não |
| Nome de teste / describe com ID `APICE-xx` ou nome de spec | `age-ticks.test.ts:62,78`, `chart-label.test.ts:13`, `freedom.test.ts:227,444,708,913`, `freedom-copy.test.ts:394,403`, `goal-draft.test.ts:125,139,147`, `brand-guard.test.ts:36,75` | não |
| Dado de teste negativo | `freedom-copy.test.ts:105` (`OLD_TERMS` inclui "Simule o ápice", afirmado como ausente) | não |
| Regex do próprio guarda | `brand-guard.test.ts:14,47` | não |

**Texto visível ao usuário: 0 ocorrências.** Nenhum gap.

---

## Discrimination Sensor

Scratch: `git worktree add --detach` em diretório de scratchpad, `node_modules` por symlink, `git checkout -- .` entre mutações, worktree removido ao fim. Comando: `vitest run --project unit` em brand, brand-guard, freedom-copy, onboarding (101 testes, base verde).

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| 1 | `src/lib/brand.ts:4` | slogan "privacidade absoluta." -> "privacidade total." | ✅ Killed (1 falha, `brand.test.ts:21`) |
| 2 | `src/lib/domain/freedom-copy.ts:53` | "Você já atingiu sua meta." -> "Você já atingiu seu Ápice." | ✅ Killed (3 falhas) |
| 3 | `src/components/getting-started-card.tsx:15` | "Definir meta" -> "Definir Ápice" | ✅ Killed (guarda) |
| 4 | `src/components/privacy/privacy-content.tsx:49` | "Meta de liberdade..." -> "Meta do Vértice..." | ✅ Killed (guarda) |
| 5 | `src/lib/brand.ts:6` | `RECOVERY_KEY_FILE_NAME` alterado | ✅ Killed (2 falhas) |
| 6 | `src/components/app-nav.tsx:11` | rótulo "Liberdade" -> "Ápice" | ✅ Killed (guarda) |
| 7 | `src/lib/brand.ts:5` | template "ANON • %s" -> "ANON \| %s" | ✅ Killed (`brand.test.ts:25`) |

**Sensor depth**: lightweight (feature não é P0). **Result**: 7/7 killed - PASS ✅.
**Isolamento**: `git status --porcelain` do repo real idêntico ao baseline (` M .specs/LESSONS.md`, ` M .specs/lessons.json`, `?? .specs/features/apice-folga-meta/validation.md`), verificado com `diff`.

Limite conhecido (AD-005, aceito): mutações em texto de componente que não reintroduzem nome antigo (ex.: "Definir meta" -> "Definir objetivo", cores do Logo) não têm teste; a evidência é inspeção de código. A tabela de cobertura da `tasks.md` declara `none` para componentes.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / sem scope creep | ✅ (fonte única `brand.ts`, sem abstração extra) |
| Surgical changes | ✅ (43 arquivos, todos de marca/copy/ativos/specs da feature) |
| Matches patterns | ✅ (`dark:` para alternar tema, módulos puros em `src/lib`) |
| Spec-anchored (valores asseridos = spec) | ✅ |
| Todo teste mapeia a AC/edge case | ✅ (`brand.test.ts`, `brand-guard.test.ts`, atualizações de copy) |
| Guidelines | AGENTS.md (e2e suspenso respeitado), lição L-002 (texto exato literal) |

---

## Gate Check

- **Gate command**: `PATH=<node20>:$PATH npm run typecheck && npm run lint && npm run test:unit`
- **Result**: typecheck OK; lint 0 erros, 1 warning pré-existente (`src/components/category-editor.tsx:40` `TOTAL_MICRO` não usado, fora do escopo da feature); unit 55 arquivos / 1242 testes passed, 0 failed, 0 skipped.
- **Test count**: 1242 ao final; nenhum teste removido pela feature (T1 +6, T12 +1, T5 só ajusta expectativas).

---

## Observações não bloqueantes

- O1: o h1 da landing (`bem-vindo/page.tsx:181-184`) repete o slogan em JSX (com `<span>` de gradiente) em vez de ler `BRAND_TAGLINE`; o rodapé lê a constante. Risco de divergência futura; a guarda não cobre. Não viola a spec.
- O2: spec-precision: ANON-02/03 dizem "gradient and surface colors" sem enumerar valores; verificado por comparação direta com os SVGs. Cores do texto "ANON"/descritor usam tokens do tema (decisão registrada em Assumptions), não os hex do SVG.
- O3: spec-precision: AC "chart label, subtitle and card copy" (Liberdade AC6) não lista strings; coberto pela varredura e pela guarda, sem asserção literal por string.

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| ANON-01..ANON-14 | Implementing | ✅ Verified |

## Summary

**Overall**: ✅ Ready
**Spec-anchored check**: 14/14 ACs matched; 2 spec-precision notes não bloqueantes
**Sensor**: 7/7 mutations killed
**Gate**: 1242 passed, 0 failed
