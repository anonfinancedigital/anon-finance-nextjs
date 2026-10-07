# Ápice: Clareza do Objetivo Validation

**Date**: 2026-10-07
**Spec**: `.specs/features/apice-clareza/spec.md` (versão de `cde552d`, com 08.1, 08.2 e 08.4 reescritas)
**Diff range**: `80a70ae~1..885f684`, só commits `(apice)`. T1 `80a70ae` … T37 `866ba51`. Nesta rodada entraram T38 `cde552d` e T39 `885f684`.

Commits de outras features no intervalo, todos ignorados: `28733d1`, `674f121`, `e478471`, `dcef38d`, `7fd338d`, `9cbc94d`, `cbdfa7f`, `aeef6db`, `7befa7d`, `2634d06`, `ab109de`, `2b4e122`, `aba33ab`, `2a4ce9f` e `ff1ba5f`. Durante a verificação, outra sessão commitou `2731c48` (`onboarding.test.ts` e `visao-geral-primeiros-passos/`). Ele não toca nenhum arquivo da apice.
**Verifier**: sub-agente independente (author ≠ verifier), iteração 6 (rodada final autorizada pelo usuário), re-derivado do zero

**Verdict**: PASS
**Result**: PASS

Os dois gaps da iteração 5 foram fechados:

1. **Spec 08.1 (Gap 1).** `spec.md:208` descreve agora as duas regras: com aporte > 0 o máximo segue a meta; com aporte 0 o máximo é `max(meta, final)`. A tolerância de 0,1% saiu do texto. Isso bate com `src/lib/domain/freedom.ts:183`. 08.2 (`spec.md:209`) e 08.4 (`:211`) ganharam a ressalva "monthly deposit above R$ 0". Em `freedom.test.ts`, T38 mudou só o título de `:266` e o comentário de `:552`, nenhuma assertão (conferido no diff de `cde552d`).
2. **APICE-09.5 (Gap 2).** `targetLabelPlacement` (`src/lib/domain/chart-label.ts:6-8`) põe a placa abaixo da linha quando a curva começa na meta ou acima dela. No app, com a meta já alcançada (renda 2.500, Agressivo, guardado R$ 650 mil, 33→48 anos), a placa fica abaixo da linha. Nenhum ponto dos dois traços cai dentro dela (0/401 e 0/401), em tema escuro, tema claro e a 320 px. No caso "above" (aceite, 500 mil e 20 mi) a placa continua acima da linha, sem regressão.

O sensor matou 12/12 mutações de domínio, e o gate passou com 822 testes.

Ficaram só observações Cosmetic, nenhuma bloqueante (seção "Observações").

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T37 | ✅ Done | Ver iterações anteriores. Código fora de `goal-chart.tsx` sem mudança desde `866ba51` (`git diff 866ba51 885f684 --stat`). Regressões reconferidas no app, abaixo |
| T38 (spec 08.1 com a regra do aporte) | ✅ Done | `cde552d`: `spec.md:208-211` e `freedom.test.ts:266` (título) e `:552` (comentário). Nenhuma assertão mudou. Done-when conferido |
| T39 (placa da meta fora das curvas) | ✅ Done | `885f684`: `src/lib/domain/chart-label.ts:6-8`, `src/lib/domain/chart-label.test.ts:14-28` (3 testes novos), `src/components/goal-chart.tsx:25-46` (`TargetLabel` com `placement`, `top = y + 4` em "below") e `:151-156` (ligação com `first.totalCents`). 🖥 provado no app |

**Integridade de testes**: 819 → 822 (+3, todos em `chart-label.test.ts`). Nenhum teste removido nem enfraquecido.

---

## Spec-Anchored Acceptance Criteria

### Legenda

- ✅: assertão exata em teste.
- 🖥: conferido no app nesta iteração. Playwright Chromium, `next start` do build de `885f684` num worktree limpo, banco privado `apice_v6_verif_test`, data real 07/10/2026.
- 🖥ⁿ: conferido no app na iteração n, com o código sem mudança desde então.
- 🔎: só inspeção.
- ⚠️: spec-precision.

**Cenário de aceite no app**: renda 20.000, guardado 565.000, nascimento 15/09/1993, ápice aos 48, Moderado.

### P1: Renda desejada como protagonista (APICE-01, 02, 03)

| AC | Spec-defined outcome | Evidência `file:line` + assertão | Result |
| -- | -------------------- | -------------------------------- | ------ |
| 01.1 Subtítulo | literal | `src/lib/domain/freedom-copy.test.ts:102` `expect(SUBTITLE).toBe(…)` | ✅ 🖥³ |
| 01.2 Uma linha a 1280 px | secundário, 1 linha | `src/components/page-header.tsx:16` | ✅ 🖥³ |
| 02.3 Card principal | "R$ 20 mil/mês aos 48 anos", maior número | `freedom-copy.test.ts:112` `toBe("R$ 20 mil/mês aos 48 anos")`; `src/components/goal-hero.tsx:56` (`text-4xl`) | ✅ 🖥 (literal na página) |
| 02.4 Dois indicadores | "R$ 4,8 mi" e "R$ 9.027/mês" | `freedom-copy.test.ts:168` `toBe("R$ 9.027/mês")`; `src/lib/domain/money.test.ts:126` | ✅ 🖥 |
| 02.5 Prazo | "em 14 anos e 11 meses" | `goal-hero.tsx:76` | ✅ 🖥 |
| 02.6 Frase-resumo | frase literal | `freedom-copy.test.ts:127` `toBe(…)` | ✅ 🖥 (frase idêntica) |
| 02.7 Frase muda com o rascunho | recalculada | `src/lib/validation/goal-draft.test.ts:35` | ✅ 🖥 ("R$ 25 mil/mês aos 48 anos" na página durante a prévia) |
| 02.8 Prazo encerrado | "Prazo encerrado", sem cláusula | `freedom-copy.test.ts:176`, `:150` | ✅ |
| 02.9 Meta alcançada | "Meta alcançada" + "Você já tem o necessário." | `freedom-copy.test.ts:184`, `:161` | ✅ 🖥 (página: "Meta alcançada" e "…R$ 500 mil. Você já tem o necessário.") |
| 02.10 Sem a pílula | ausente | página sem "retirada inicial de" | ✅ 🖥 |
| 03.11 Termos antigos | nenhum | `freedom-copy.test.ts:95` `not.toContain(term)` | ✅ 🖥 (0 de "Aporte Estratégico Mensal", "Meta Patrimonial", "Calibrar Parâmetros" e "acumulados") |
| 03.12 Descrição da gaveta | literal | `freedom-copy.test.ts:103` | ✅ 🖥³ |

### P1: Premissas em chips (APICE-04, 05)

| AC | Outcome | Evidência | Result |
| -- | ------- | --------- | ------ |
| 04.1 Quatro chips + "Ajustar" | literais | `freedom-copy.test.ts:197` `toEqual({ scenario: "Cenário moderado", … })` | ✅ 🖥 (os 4 textos) |
| 04.2 Par fora dos presets | "Cenário personalizado" | `freedom-copy.test.ts:225` | ✅ 🖥³ |
| 04.3 "Ajustar" abre a gaveta | gaveta | `src/components/assumption-chips.tsx:71-77` | ✅ 🖥 |
| 04.4 Tooltip "R$ de hoje" | "Todos os valores já descontam a inflação." | `freedom-copy.test.ts:242`; `assumption-chips.tsx:61-67` | ✅ 🖥 por Tab: texto exato; Escape fecha (0 tooltips) |
| 05.5 Tooltip ⓘ da retirada | literal com valores | `freedom-copy.test.ts:270` | ✅ 🖥 por Tab, Shift+Tab/Tab e hover: "…Com 5%, R$ 4,8 mi geram R$ 240 mil/ano (R$ 20 mil/mês)."; Escape fecha |
| 05.6 Mesmo texto nos cartões | taxa do cenário, renda atual | `src/components/rate-toggle.tsx:73-80` | ✅ 🖥 1º cartão na gaveta, por Tab, com renda 25 mil na prévia: "…Com 5%, R$ 6 mi geram R$ 300 mil/ano (R$ 25 mil/mês)."; Escape fecha o tooltip sem fechar a gaveta nem abrir o diálogo |
| 05.7 Foco e Escape | abre/fecha | 🖥 acima (chip ⓘ, chip "R$ de hoje" e cartão da gaveta) | ✅ 🖥 |

### P1: Gaveta (APICE-14, 18)

| AC | Outcome | Evidência | Result |
| -- | ------- | --------- | ------ |
| 14.1 Resumo fixo | sticky | `src/components/drawer-summary.tsx:36` | ✅ 🖥³ |
| 14.2 < 100 ms sem blur | < 100 ms | `src/components/use-goal-draft.ts:33` | ✅ 🖥³ (17,6 ms) |
| 14.3 Destaque 300 ms / reduced motion | `flash 0.3s` / `none` | `src/app/globals.css:218-223` | ✅ 🖥³ |
| 14.4 Variação "vs. atual" | `{ direction, text }` | `freedom-copy.test.ts:298`, `:303-305` | ✅ 🖥 ("R$ 9.027 vs. atual" com seta, prévia de meta alcançada) |
| 14.5 Sem variação com aportes iguais | `null` | `freedom-copy.test.ts:309-310` | ✅ |
| 14.6 "Prévia" enquanto difere | `dirty === true` | `goal-draft.test.ts:65,72,77,136` | ✅ 🖥 (2 "Prévia", gaveta e página, com renda alterada) |
| 14.7 Sem "Prévia" com valores iguais | `dirty === false` | `goal-draft.test.ts:60,129`; `src/lib/validation/goal-draft.ts:55-58` | ✅ 🖥 0 "Prévia" nestes casos: após salvar com guardado vazio, gaveta aberta, recarga, descarte, cada "Aplicar" e 320 px |
| 18.8 Rodapé fixo | visível | `src/components/goal-form.tsx:64` | ✅ 🖥 ("Aplicar" visível a 320 x 700) |
| 18.9 "Aplicar" salva e fecha | fecha, persiste | — | ✅ 🖥 (5 "Aplicar" seguidos de recarga) |
| 18.10 Cancelar/X com alterações → diálogo | "Descartar alterações?" + "Descartar" / "Continuar editando" | `src/components/discard-dialog.tsx:30,37,40` | ✅ 🖥 (Cancelar → 1 diálogo com os 2 botões; X "Fechar" → 1 diálogo; captura `v6-dialog.png`) |
| 18.11 "Descartar" restaura | estado salvo | `src/components/goal-experience.tsx:55-59` | ✅ 🖥 (gaveta fechada, 0 "Prévia"; a página volta a "R$ 20 mil/mês aos 48 anos" e "R$ 9.027/mês", sem "R$ 25 mil") |
| 18.12 "Continuar editando" | gaveta aberta com valores editados | `goal-experience.tsx:121` | ✅ 🖥 (diálogo fechado, gaveta aberta, campo "25.000,00") |
| 18.13 Sem alterações fecha direto | sem diálogo | `goal-experience.tsx:51-52` | ✅ 🖥 (0 diálogos: após salvar com guardado vazio e a 320 px) |
| 14.14 Inválido mantém resumo e "Prévia" | resumo anterior | `goal-draft.test.ts:46,77` | ✅ |

### P1: Estado vazio (APICE-19)

| AC | Outcome | Evidência | Result |
| -- | ------- | --------- | ------ |
| 19.1 Headline e apoio | literais | `src/components/goal-empty-state.tsx:27-29` | ✅ 🖥³ |
| 19.2 Quatro campos e máscaras | rótulos | `src/components/goal-fields.tsx:87-128` | ✅ 🖥 (preenchidos pelos rótulos) |
| 19.3 Moderado por padrão | "8"/"5" | `goal-draft.test.ts:95-96` | ✅ 🖥³ |
| 19.4 Resumo com renda e idade válidas | resumo | `goal-draft.test.ts:115-123` | ✅ 🖥³ |
| 19.5 Placeholder; guardado vazio = R$ 0 | `summary` nulo; "0,00" ao salvar | `goal-draft.test.ts:84,90,107,129` | ✅ 🖥 (salvar com guardado vazio funcionou) |
| 19.6 / 19.7 Erros só após interação | mensagem do schema | `src/components/use-goal-draft.ts:52-55`; `goal-draft.test.ts:52` | ✅ 🖥 (0 "Prévia" ao abrir; o 1 elemento `.text-destructive` contado é de estilo, sem texto de erro, igual à iteração 5) |
| 19.8 Gráfico de exemplo esmaecido | `opacity-40` | `goal-empty-state.tsx` | ✅ 🖥³ |
| 19.9 Salvar → preenchido sem gaveta | estado preenchido | — | ✅ 🖥 (gaveta: contagem 0) |
| 19.10 Falha mostra erro | `result.error` | `goal-empty-state.tsx:147-151` | 🔎 (não provocado) |
| 19.11 Mesmo módulo de cálculo | `evaluateDraft` | `goal-experience.tsx:46`; `goal-draft.ts:49-69` | ✅ |

### P2: Barra de marcos (APICE-06, 07)

| AC | Outcome | Evidência | Result |
| -- | ------- | --------- | ------ |
| 06.1 Rótulo "Hoje" | "Hoje · R$ 565 mil (11,8%) · 33 anos" | `freedom-copy.test.ts:284` `toBe(…)` | ✅ 🖥 (literal) |
| 06.2 / 06.3 Marcos e cursor | visual | `src/components/goal-checkpoints.tsx:43` | ✅ 🖥³ |
| 07.4-07.6 Ausências | ausentes | página sem "acumulados" | ✅ 🖥 |
| 07.7 > 100% | percentual real | `freedom-copy.test.ts:292` `toBe("Hoje · R$ 6 mi (125,0%) · 33 anos")` | ✅ 🖥 ("Hoje · R$ 650 mil (130,0%) · 33 anos") |

### P2: Campos da gaveta (APICE-15, 16, 17)

| AC | Outcome | Evidência | Result |
| -- | ------- | --------- | ------ |
| 15.1-15.3 | "33 anos"; mensagens exatas | `goal-draft.test.ts:45,52` | ✅ 🖥³ |
| 16.4-16.8 Slider | mín. 34 etc. | — | ✅ 🖥³ |
| 17.9-17.11 Cartões | hierarquia, seleção, "Personalizado" | `rate-toggle.tsx:25,52,64-82` | ✅ 🖥 (Agressivo/Moderado por rótulo) |
| 17.12 320 px | sem rolagem | — | ✅ 🖥 (gaveta `scrollWidth` 319 = `clientWidth` 319) |

### P2: Gráfico (APICE-08 a 13)

| AC | Outcome | Evidência | Result |
| -- | ------- | --------- | ------ |
| 08.1 Eixo Y | passo 1·2·5×10ⁿ, 4-6 ticks a partir de 0; aporte > 0 → máx. = múltiplo ≥ meta; aporte 0 → múltiplo ≥ `max(meta, final)` | Código: `freedom.ts:183`. Testes: `freedom.test.ts:293-300` (property de 4-6 ticks a partir de 0); `:257-259` (aporte 1 centavo, final + R$ 1.000 → `toBe(500 mil)`); `:261-264` (aporte 0, final + 1 centavo → `toBe(600 mil)`; 650 mil → `toBe(800 mil)`); `:218` (fronteira do passo) | ✅ texto e código alinhados |
| 08.2 Aporte > 0, meta 500 mil | 0…500 mil | `freedom.test.ts:189`, `:235`, `:266-279` (`toEqual({ max: 500 mil, ticks: [0…500 mil] })`) | ✅ 🖥 ("R$ 0 … R$ 500 mil") |
| 08.3 Meta 4,8 mi | 0-5 mi | `freedom.test.ts:196-201` | ✅ 🖥 ("R$ 0, R$ 1 mi … R$ 5 mi") |
| 08.4 Aporte > 0, meta 20 mi | 0, 5, 10, 15, 20 mi | `freedom.test.ts:204`, `:246-255` | ✅ 🖥 (ticks literais) |
| 09.5 Rótulo "Meta: {meta}" sem sobrepor a curva, fundo do card | sem sobreposição; placa da cor do card | `src/lib/domain/chart-label.test.ts:14-19` (pipeline real, guardado 650 mil, `toBe("below")`); `:21-23` (guardado 0, `toBe("above")`); `:25-28` (fronteira `50_000_000/50_000_000` → `"below"`, `49_999_999` → `"above"`); `goal-chart.tsx:37` (`top = y + 4` em "below"), `:40` (`fill="var(--card)"`), `:154` (ligação) | ✅ 🖥, detalhe abaixo |
| 10.6 "Idade" e idade atual no 1º tick | 1º tick = `currentAge` | `src/lib/domain/age-ticks.test.ts:81-92` (`expect(ticks[0]).toBe(age)`); `goal-chart.tsx:127-128` | ✅ 🖥 (X "33 … 48" e "Hoje … 33 anos"; nos 6 nascimentos 🖥⁵) |
| 11.7 Tooltip por idade + guia | idade, total, investido, rendimentos; guia segue o cursor | `goal-chart.tsx:54-72`, `:158` | ✅ 🖥, detalhe abaixo |
| 12.8 Insight sem pílula | `<p>` + ícone | `goal-chart.tsx:103-108`; `freedom-copy.test.ts:403` | ✅ 🖥 (capturas) |
| 13.9 Tokens | três tokens distintos | `src/app/globals.css:33-35,187-189` | ✅ 🖥⁵ |
| 13.10 `returns` fora do aporte e da barra | não verde | — | ✅ 🖥³ |

**09.5 no app.** Medição no DOM: 401 pontos amostrados por traço com `getPointAtLength`, contra o retângulo da placa.

| Estado | Posição | Pontos dos traços dentro da placa | Geometria |
| ------ | ------- | --------------------------------- | --------- |
| Meta alcançada, escuro, 1280 | below | 0 / 0 | linha y=916; curvas começam em y=903; placa 920-940; base 957 |
| Meta alcançada, claro, 1280 | below | 0 / 0 | placa `lab(100 0 0)`, igual ao fundo do card |
| Meta alcançada, 320 px | below | 0 / 0 | página 320 = 320 |
| Aceite, 4,8 mi, escuro e claro | above | 0 / 0 | sem regressão |
| 500 mil, aporte > 0 | above | 0 / 0 | sem regressão |
| 20 mi | above | 0 / 0 | sem regressão |

Capturas: `v6-meta-alcancada-tema1.png`, `-tema2.png`, `-320.png`, `v6-chart-aceite.png`, `v6-chart-500k.png`, `v6-chart-20mi.png`.

**11.7 no app.**

- **Mouse**: a 55% do gráfico, "Aos 41 anos | Patrimônio total: R$ 2.239.663,16 | Total investido: R$ 1.431.610,24 (64%) | Rendimentos: R$ 808.052,92 (36%)". A 85%, "Aos 46 anos …": o tooltip segue o cursor. Há 1 `.recharts-tooltip-cursor` (linha-guia), e o tooltip some ao sair.
- **Teclado**: superfície com `tabindex=0`, 12 Tabs até ela, depois setas → "Aos 35 anos | …".
- **Toque**: contexto `hasTouch`/`isMobile` 390 px, `tap` → "Aos 41 anos | …".

**Status**: ✅ todos os ACs cobertos. Só 19.10 está apenas por inspeção, como nas iterações anteriores. Spec-precision Cosmetic em 09.5: ver "Observações".

---

## Discrimination Sensor

Como rodou:

- **Scratch**: `git worktree add --detach <scratchpad>/v6/wt HEAD` (`885f684`), com `node_modules` por hardlink.
- **Mutações**: aplicadas por script com `assert count == 1` e revertidas com `git checkout --` uma a uma. Testes: `vitest run --project unit src/lib` (822).
- **Limpeza**: porcelain do worktree no fim: vazio. Removido com `git worktree remove --force` e `git worktree prune`. Nunca usei `git stash`.

**Porcelain do tree real.** As diferenças entre antes e depois vêm só de `2731c48`, commitado por outra sessão durante a verificação. Ele tirou da lista `visao-geral-primeiros-passos/design.md`, `validation.md` e `onboarding.test.ts`. `e2e/transaction-form.spec.ts` e `transaction-form.tsx` passaram de staged a unstaged. Nenhum desses arquivos foi tocado por mim, e nenhum é da apice. As demais entradas ficaram idênticas.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| M1 | `src/lib/domain/chart-label.ts:7` | `>=` → `>` (meta exata vira "above") | ✅ Killed (`chart-label.test.ts:25`) |
| M2 | `chart-label.ts:7` | ramos trocados | ✅ Killed (3 testes) |
| M3 | `chart-label.ts:7` | sempre "above" (desfaz T39) | ✅ Killed (`:14`, `:25`) |
| M4 | `chart-label.ts:7` | sempre "below" | ✅ Killed (`:21`, `:25`) |
| M5 | `chart-label.ts:7` | `>= target` → `>= target + 1` (off-by-one) | ✅ Killed (`:25`) |
| M6 | `src/lib/domain/freedom.ts:183` | `monthlyCents > 0` → `>= 0` | ✅ Killed (3: `freedom.test.ts:211`, `:261`, `:281`) |
| M7 | `freedom.ts:183` | ramos trocados em `chartYAxis` | ✅ Killed (7) |
| M8 | `freedom.ts:53-54` (`ageOn`) | `<` → `<=` no dia do aniversário (`currentAge`) | ✅ Killed (8, incluindo `age-ticks.test.ts:81` "aniversário é hoje") |
| M9 | `freedom.ts:53-54` (`ageOn`) | ignora o dia no mês do aniversário | ✅ Killed (10) |
| M10 | `src/lib/validation/goal-draft.ts:39` | `withZeroSaved` não troca vazio por "0,00" | ✅ Killed (4, incluindo `goal-draft.test.ts:129`) |
| M11 | `goal-draft.ts:57` | referência do `dirty` sem `withZeroSaved` | ✅ Killed (2) |
| M12 | `goal-draft.ts:58` | comparação do `dirty` invertida | ✅ Killed (4) |
| M13 | `src/components/goal-chart.tsx:154` | `placement="above"` fixo (desfaz T39 na UI) | ❌ Survived (822/822), por desenho: UI sem teste de componente (AD-005/AD-008). 🖥 placa "below" medida no app |
| M14 | `goal-chart.tsx:37` | `top = y - 24` sempre | ❌ Survived (822/822), por desenho, idem. 🖥 coberto no app |

**Sensor depth**: expandido, 14 mutações:

- `targetLabelPlacement`: `>=`/`>`, ramos trocados, constantes, off-by-one.
- `chartYAxis`.
- `currentAge`/`ageOn`.
- `withZeroSaved`/`dirty`.
- as 2 ligações de UI.

**Result**: 12/12 mutações de domínio mortas. As 2 de UI sobrevivem por desenho e foram cobertas pela conferência no app. ✅ PASS (domínio discriminante).

---

## Interactive UAT / conferência no app

**Ambiente**:

- Worktree limpo de `885f684` no scratchpad, com `next build` (o do gate) e `next start -p 3299`.
- `DATABASE_URL` no banco privado `apice_v6_verif_test`, criado no container `orcamento-pg`. Migrado e semeado com `migrateTestDb` (que recusa nomes sem `_test`), `truncateAll` e `seedAdminFromEnv`.
- No fim, `DROP DATABASE apice_v6_verif_test WITH (FORCE)`. Sobraram só `orcamento` e `orcamento_test`, e nenhum dos dois foi tocado.
- Servidor encerrado; porta 3299 livre.
- Chromium do Playwright a 1280 x 800 e 320 x 700, mais um contexto de toque a 390 x 844.

| # | Test | Result | Details |
| - | ---- | ------ | ------- |
| 1 | Salvar pelo estado vazio com guardado vazio | ✅ Pass | 0 "Prévia" após salvar, com a gaveta aberta e após recarregar; gaveta fechada; "Cancelar" sem diálogo |
| 2 | Cenário de aceite via "Aplicar" e recarga | ✅ Pass | Os 10 textos do aceite, incluindo a frase-resumo completa e "Hoje · R$ 565 mil (11,8%) · 33 anos"; Y 0-5 mi; X 33…48 |
| 3 | **Meta alcançada (Gap 2)**: renda 2.500, Agressivo, guardado 650 mil, 33→48 | ✅ Pass | Placa "Meta: R$ 500 mil" abaixo da linha, 0 pontos das curvas dentro dela, nos temas escuro e claro e a 320 px; Y 0-3 mi |
| 4 | Estado normal (placa acima) | ✅ Pass | Aceite (nos dois temas), 500 mil e 20 mi: "above", 0 pontos das curvas dentro da placa |
| 5 | Diálogo "Descartar alterações?" com alteração pendente | ✅ Pass | Cancelar → diálogo; "Continuar editando" → gaveta aberta com "25.000,00"; X → diálogo; "Descartar" → página no salvo, 0 "Prévia" |
| 6 | Tooltip do gráfico (mouse, teclado, toque) | ✅ Pass | Idade, total, investido e rendimentos; guia presente; segue o cursor |
| 7 | Tooltips dos chips e dos cartões por foco, com Escape | ✅ Pass | Textos exatos; Escape fecha. Na 1ª execução, a leitura do ⓘ da página aos 500 ms veio vazia. Na reexecução, ele apareceu aos 200, 800 e 1500 ms, por Tab, por Shift+Tab/Tab e por hover. Atribuo a falha ao tempo do roteiro, e o tooltip "R$ de hoje" funcionou nas duas execuções |
| 8 | 320 px | ✅ Pass | Página 320 = 320 (aceite e meta alcançada); gaveta 319 = 319; "Aplicar" visível; 0 "Prévia" sem alteração; 0 diálogos |
| 9 | Latência < 100 ms e reduced motion | ⏭️ Não reexecutado | Código sem mudança desde a iteração 3 (🖥³: 17,6 ms) |
| 10 | Falha de gravação (19.10) | ⏭️ Não verificado | Provocar a falha exige derrubar o banco ou alterar código; só inspeção (`goal-empty-state.tsx:147-151`) |
| 11 | Leitor de tela da tabela `sr-only` | ⏭️ Não verificado | Sem leitor de tela no ambiente |
| 12 | Slider por setas, nascimento futuro e "Personalizado" (15/16/17.11) | ⏭️ Não reexecutado | Código sem mudança desde a iteração 3 (🖥³) |

---

## Observações (Cosmetic, não bloqueantes)

1. **⚠️ Spec-precision de 09.5: placa "below" sobre o preenchimento.** A spec pede o rótulo "without overlapping the curve". Na posição "below", a placa não toca nenhum traço, mas fica inteira sobre o preenchimento da área "Total investido": 55/55 amostras dentro do preenchimento, desenhada por cima das áreas. Ela abre um retângulo da cor do card no roxo (`v6-meta-alcancada-tema1.png`).
   - A leitura não sofre: o preenchimento é uniforme e o topo da série continua visível.
   - Nenhuma posição junto à linha evita isso, porque a própria linha tracejada cruza o preenchimento em toda a largura.
   - Fica registrado porque a spec não diz se "curva" inclui a área preenchida.
2. **"Meta alcançada" com "em 14 anos e 11 meses" ao lado** (`goal-hero.tsx:76`) quando a meta já foi alcançada e ainda há prazo. Isso segue 02.5 literalmente (`months > 0`); 02.9 só retira o prazo com `months = 0`. É semanticamente estranho, mas está conforme a spec.
3. **Tabela de rastreabilidade desatualizada.** A de `spec.md:236-260` ainda mostra "Design / Pending" e "0 mapped". O Verifier não edita a spec; a atualização está na seção abaixo.
4. **Resíduos herdados**:
   - `freedom.test.ts:555` ainda afirma `last - max <= target * 0.001`, eco da tolerância antiga; é verdade com 240 meses.
   - `age-ticks.test.ts:66-74` ainda chama `ageTicks(first.age, …)`.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ T39: uma função pura de 1 linha e 1 parâmetro novo em `TargetLabel`. T38: só texto |
| Surgical changes | ✅ Só os arquivos de Where (`git show --stat`); nada da outra sessão |
| No scope creep | ✅ `summarize` e as fórmulas intactas |
| Matches patterns | ✅ Regra pura em `src/lib/domain` com teste unit, como `age-ticks.ts` |
| Lint limpo | ✅ `npm run lint` sem saída |
| Spec-anchored outcome check | ✅ 08.1 texto = código = testes; 09.5 com valores exatos (`toBe("below")` / `toBe("above")`) e fronteira |
| Per-layer Coverage Expectation | ✅ Domínio 1:1; UI coberta pelo build gate e pelo app (AD-005) |
| Every test maps to a spec requirement | ✅ `chart-label.test.ts` cita APICE-09.5 |
| Documented guidelines followed | ✅ `AGENTS.md`, AD-005, AD-008, L-002 |
| SPEC_DEVIATION | nenhum |

---

## Edge Cases

- [x] Renda 0/negativa → erro após interação (`src/lib/validation/goal.test.ts:46`)
- [x] Idade não maior que a atual → erro e último resumo (`goal-draft.test.ts:46`)
- [x] Aporte salvo R$ 0 e prévia R$ 0 → sem seta (`freedom-copy.test.ts:310`)
- [x] 320 px sem rolagem horizontal → 🖥 320/320 e 319/319

---

## Gate Check

- **Gate command**: `export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH; npm run typecheck && npm run lint && npm run build && npm run test:unit`. Rodei no worktree limpo de `885f684`, porque o tree real tem mudanças não commitadas de outra sessão.
- **Result**: exit 0. Typecheck ok, lint sem avisos, build ok. 28 arquivos de teste, **822 passed**, 0 failed, 0 skipped.
- **Test count before feature**: 732
- **Test count after feature**: 822 (+90). Delta desta rodada: +3 (`chart-label.test.ts`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

Nenhum fix obrigatório. Opcionais (Cosmetic):

- **09.5**: se o usuário quiser a placa também fora do preenchimento, a opção é desenhá-la acima do topo da curva ou à direita, fora da área. A outra é registrar na spec que "curva" significa os traços.
- **02.5/02.9**: decidir se "em {prazo}" deve sumir quando o aporte é 0 com prazo restante.
- **Limpeza**: atualizar a tabela de rastreabilidade de `spec.md` e os resíduos de teste listados.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| APICE-01 | Verified | ✅ Verified |
| APICE-02 | Verified | ✅ Verified |
| APICE-03 | Verified | ✅ Verified |
| APICE-04 | Verified | ✅ Verified |
| APICE-05 | Verified | ✅ Verified (foco/Escape reconferidos) |
| APICE-06 | Verified | ✅ Verified |
| APICE-07 | Verified | ✅ Verified |
| APICE-08 | Needs Spec Fix | ✅ Verified (spec alinhada em `cde552d`) |
| APICE-09 | Needs Fix | ✅ Verified (T39; Cosmetic do preenchimento registrado) |
| APICE-10 | Verified | ✅ Verified |
| APICE-11 | Verified | ✅ Verified (mouse, teclado e toque reconferidos) |
| APICE-12 | Verified | ✅ Verified |
| APICE-13 | Verified | ✅ Verified |
| APICE-14 | Verified | ✅ Verified |
| APICE-15 | Verified | ✅ Verified |
| APICE-16 | Verified | ✅ Verified |
| APICE-17 | Verified | ✅ Verified |
| APICE-18 | Verified | ✅ Verified (18.10-18.12 reexecutados) |
| APICE-19 | Verified | ✅ Verified (19.10 só por inspeção) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 19/19 requisitos verificados. 1 spec-precision Cosmetic (09.5, preenchimento), não bloqueante.
**Sensor**: 12/12 mutações de domínio mortas; 2 de UI sobrevivem por desenho e foram cobertas no app.
**Gate**: 822 passed, 0 failed; typecheck, lint e build ok.

**What works**:

- Placa da meta fora das curvas nos dois sentidos, nos dois temas e a 320 px.
- Spec do eixo Y alinhada ao código.
- Diálogo de descarte nos três caminhos.
- Tooltips do gráfico e das premissas por mouse, foco e toque, com Escape.
- Nenhuma regressão em "Prévia", "Aplicar", aceite ou 320 px.

**Issues found**: só as observações Cosmetic acima.

**Next steps**: a feature pode ser marcada como concluída. As observações 1 e 2 ficam para decisão do usuário.
