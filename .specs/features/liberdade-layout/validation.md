# Liberdade: Layout Enxuto Validation

**Date**: 2026-10-05
**Spec**: `.specs/features/liberdade-layout/spec.md`
**Diff range**: `119da05..2e1f645`, só os 8 commits de tarefa: d915497 (T1), 7a19c1f (T2), 9e36bfe (T3), f386b32 (T4), 8bc1a59 (T5), c5ecdd4 (T6), 2c3afc8 (T7), 2e1f645 (T8). Os demais commits do intervalo (categorias, transações, dropdown, `content-card`) são de outra sessão e ficaram fora.
**Verifier**: passada de olhos frescos feita **pelo mesmo agente que implementou** (modo fallback do skill: o harness só cria sub-agentes a pedido do usuário). **Author ≠ verifier não foi atendido.**

## Validation: Liberdade Layout - PASS

**Result**: PASS (a feature é só de UI; a matriz de testes e a AD-005 determinam `none` para essa camada, então a evidência dos ACs é o código-fonte com `file:line` e uma verificação no navegador; 5 lacunas de borda registradas abaixo)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Sheet | ✅ Done | d915497 |
| T2 Checkpoints compactos | ✅ Done | 7a19c1f |
| T3 Gráfico com selo e tooltip | ✅ Done | 9e36bfe |
| T4 Hero em duas colunas | ✅ Done | f386b32 |
| T5 Resumo sem seção de progresso | ✅ Done | 8bc1a59 |
| T6 Formulário sem colapso | ✅ Done | c5ecdd4 |
| T7 Gaveta e estado vazio | ✅ Done | 2c3afc8 |
| T8 Página enxuta e verificação manual | ✅ Done | 2e1f645 |

---

## Spec-Anchored Acceptance Criteria

Não há teste automatizado nesta feature (camada UI = `none`). Cada AC aponta o código que o implementa e o que foi **medido ou observado no navegador** (Chromium, Playwright descartável, banco privado, `next start`). Valores medidos entre aspas.

| Criterion | Spec-defined outcome | `file:line` + implementação | Observado | Result |
| --------- | -------------------- | --------------------------- | --------- | ------ |
| LAY-01 AC1: duas colunas a partir de 576 px do Hero | destino à esquerda, plano à direita | `src/components/goal-hero.tsx:37` - `grid @xl:grid-cols-[1.1fr_1fr]`; `:35` `@container` | Hero de 966 px: "Meta Patrimonial" em x=287 e "Aporte Estratégico Mensal" em x=792, mesma linha (y=121) | ✅ |
| LAY-01 AC1 com a gaveta | duas colunas com o Hero estreito | `goal-hero.tsx:37` | Gaveta aberta em 1280 px: Hero de 582 px, ainda em duas colunas (screenshot) | ✅ |
| LAY-01 AC2: empilhar abaixo de 576 px | destino primeiro | `goal-hero.tsx:37` (sem `@xl` vira uma coluna) | 390 px: "Aporte Estratégico Mensal" abaixo de "Meta Patrimonial" | ✅ |
| LAY-01 AC7: sem card interno | metade direita do Hero, fundo roxo, sem borda nem raio | `goal-hero.tsx:51` - `bg-primary/10 p-5` (sem `border` nem `rounded`); `:35` `overflow-hidden` recorta os cantos | Screenshot: um único cartão com metade roxa | ✅ |
| LAY-02 AC3: textos do destino | "Meta Patrimonial", selo, linha de contexto | `goal-hero.tsx:39,44,47` | "Gera R$ 20.000,00/mês perpétuos a 8% a.a." e "R$ 565.000,00 acumulados (18,8% do alvo)" visíveis | ✅ |
| LAY-02 AC4: plano de ação | "R$ 6.794,95 / mês", prazo, distância | `goal-hero.tsx:52,65,69` | "R$ 6.794,95 / mês", "Tempo até o Ápice: 11 anos e 11 meses", "Distância do Alvo: R$ 2.435.000,00" | ✅ |
| LAY-02 AC8: aporte de maior peso | maior texto do Hero | `goal-hero.tsx:53` - `text-4xl @xl:text-3xl @3xl:text-4xl`, contra o alvo `text-3xl @xl:text-2xl @3xl:text-3xl` (`:40`) | Screenshot | ✅ |
| LAY-03 AC5: prazo encerrado | "Prazo encerrado" no lugar do aporte | `goal-hero.tsx:55` | Não exercitado no navegador | ⚠️ lacuna 1 |
| LAY-03 AC6: guardado ≥ alvo | "Distância do Alvo: R$ 0,00" e percentual real | `goal-hero.tsx:47,69` (`remainingCents` e `formatShare` sem teto, já testados em `freedom.test.ts`) | Não exercitado no navegador | ⚠️ lacuna 1 |
| LAY-04 AC1/5: barra no rodapé do Hero, sem seção própria | rodapé com linha fina | `goal-hero.tsx:76-77`; `src/components/goal-summary.tsx` renderiza só `GoalHero` e `GoalChart` | Texto "Progresso" ausente (`toHaveCount(0)`); barra e checkpoints dentro da `section` do Hero | ✅ |
| LAY-04 AC6: barra `--income` com brilho | verde, limitada a 100% | `goal-checkpoints.tsx` (`bg-income`, brilho decorativo, `Math.min(100, …)`) | Screenshot | ✅ |
| LAY-05 AC2: percentual uma vez | 1 ocorrência de "18,8%" | `goal-hero.tsx:47` (única); `goal-checkpoints.tsx` sem texto de percentual | `getByText("18,8%")` → 1 | ✅ |
| LAY-05 AC3: nome acessível da barra | "Progresso do objetivo: 18,8%" | `goal-checkpoints.tsx:31` - `aria-label={`Progresso do objetivo: ${share}`}` | Não lido por tecnologia assistiva | ⚠️ lacuna 3 |
| LAY-05 AC4: checkpoints em texto | valor compacto e estado | `goal-checkpoints.tsx:8-10,43` | "R$ 750 mil / Previsão: aos 34 anos" etc.; 4 colunas no desktop, 2 no celular | ✅ |
| LAY-06 AC1: botão e nenhum campo | "Calibrar Parâmetros" no topo direito | `goal-experience.tsx:72-78` | Botão visível; `getByLabel("Renda mensal desejada (R$)")` → 0 com a gaveta fechada | ✅ |
| LAY-06 AC10: estado vazio | cartão com "Definir objetivo", sem botão no cabeçalho | `goal-experience.tsx:83-90` | "Definir objetivo" visível; "Calibrar Parâmetros" → 0 | ✅ |
| LAY-07 AC2: abrir a gaveta | formulário preenchido, descrição, Salvar e Cancelar | `goal-experience.tsx:93-106` | Gaveta com os valores salvos, introdução, Salvar e Cancelar (screenshot) | ✅ |
| LAY-07 AC3: sem overlay | página navegável | `src/components/ui/sheet.tsx:23-39` (sem overlay); `goal-experience.tsx:69` `modal={false}` | `[data-slot="dialog-overlay"]` → 0 | ✅ |
| LAY-07 AC4: reservar 384 px | sem cobrir o Hero | `goal-experience.tsx:70` - `open && "lg:pr-96"`; `sheet.tsx:39` `lg:w-96` | Gaveta em x=896, largura 384; Hero termina em 848 | ✅ |
| LAY-07 AC5: largura total no celular | gaveta cobre a tela | `sheet.tsx:39` - `w-full` | 390 px: gaveta de 390 px | ✅ |
| LAY-08 AC6: Cancelar, X e Esc descartam | resumo salvo restaurado | `goal-experience.tsx:58-61,103` | Esc: o aporte do Hero voltou ao valor salvo; sem objetivo, voltou ao estado vazio; Cancelar fechou a gaveta. **X não foi clicado** | ⚠️ lacuna 2 |
| LAY-08 AC7: clique fora não fecha | gaveta aberta | `goal-experience.tsx:93` - `onInteractOutside` com `preventDefault` | Clique no título do gráfico: gaveta aberta | ✅ |
| LAY-08 AC8: salvar fecha e mantém o resultado | gaveta fechada, Hero com o resultado | `goal-experience.tsx:102`; `goal-form.tsx:80` | Criar objetivo: gaveta fechou, Hero e botão "Calibrar Parâmetros" apareceram | ✅ |
| LAY-09 AC9: erro mantém aberta | mensagem e gaveta aberta | `goal-form.tsx:88` e o alerta existente | Data `31/02/1993`: "Data de nascimento inválida" e gaveta aberta; Cancelar fechou | ✅ |
| LAY-09 AC11: prévia ao vivo | Hero recalcula ao lado | `goal-experience.tsx:63-66` | 5× seta direita no slider: de R$ 6.794,95 para R$ 2.218,56 / mês, no Hero e na faixa | ✅ |
| LAY-10 AC12: foco | foco volta ao botão | `sheet.tsx` (Radix `Trigger`) | Após Esc, `toBeFocused()` no botão "Calibrar Parâmetros" | ✅ |
| LAY-10 AC13: nome da gaveta | "Calibrar Parâmetros" | `goal-experience.tsx:95` - `SheetTitle` | `getByRole("dialog", { name: "Calibrar Parâmetros" })` encontrado | ✅ |
| LAY-11 AC1: selo no cabeçalho | "Rendimentos: 49% do patrimônio aos 45 anos" | `src/components/goal-chart.tsx:73,84` | Selo ao lado da legenda (screenshot) | ✅ |
| LAY-11 AC2/3: sem frase de rodapé nem marcas | nada sobre a curva | `goal-chart.tsx` sem `ReferenceDot` (busca vazia) e sem o `<p>` | `getByTestId("goal-chart").getByText("25%")` → 0 | ✅ |
| LAY-11 AC5: acessibilidade | `aria-label` com o selo e tabela `sr-only` | `goal-chart.tsx:78,147` | Não lido por tecnologia assistiva | ⚠️ lacuna 3 |
| LAY-12 AC4: tooltip | linha-guia, ponto ativo, "Aos N anos" | `goal-chart.tsx:118,128,140` | Sonda em 9 posições do mouse: cursor, ponto e tooltip no mesmo ponto anual ("Aos 33 anos" a 2%, "Aos 45 anos" a 98%) | ✅ |
| LAY-13 AC1: faixa da gaveta | "Meta Patrimonial" e "Aporte Estratégico Mensal" da prévia | `goal-experience.tsx:18-37,98` | "R$ 3.000.000,00" e "R$ 6.794,95 / mês" no topo da gaveta; mudou com o slider | ✅ |
| LAY-13 AC2/3: "—" e "Prazo encerrado" | sem prévia / prazo nulo | `goal-experience.tsx:19-23` | Não exercitado | ⚠️ lacuna 1 |

**Status**: ✅ 27 de 33 verificados; ⚠️ 6 com lacuna, listadas abaixo.

### Lacunas registradas (não bloqueiam)

1. **Casos de borda de dados não exercitados no navegador**: prazo encerrado, guardado ≥ alvo (120,0%) e gaveta sem prévia ("—"). Os valores vêm de `summarize`, coberto por `src/lib/domain/freedom.test.ts`; só a renderização dos textos nesses casos não foi vista.
2. **X da gaveta não clicado**: Esc e Cancelar chamam o mesmo `handleOpenChange(false)` (`goal-experience.tsx:58`); o X usa o `DialogPrimitive.Close` e chega ao mesmo `onOpenChange`.
3. **Nomes acessíveis (barra, figura, gaveta)** conferidos só no código e pelo seletor `getByRole`; nenhum leitor de tela foi usado.
4. **Foco quando o usuário interage com a página antes de fechar**: no modo não modal do Radix o foco só volta ao botão se não houve clique fora. Risco aceito no design.
5. **Faixa de 1024 px a cerca de 1150 px com a gaveta aberta**: o Hero fica abaixo de 576 px e empilha (a meta de 340 px não vale ali, como previsto no design). Não medido.

---

## Discrimination Sensor

A feature não tem testes automáticos; por isso o detector das mutações é o **mesmo spec de navegador** da verificação manual (40 asserções sobre posição, texto, gaveta, foco e tooltip). Worktree descartável do `HEAD`, com `next build --webpack` (o Turbopack recusa o `node_modules` por symlink fora da raiz), banco privado, removida ao final. O baseline (sem mutação) passou na worktree. `git status --porcelain` real antes e depois: só mudaram arquivos da outra sessão.

| Mutation | File | Description | Killed? |
| -------- | ---- | ----------- | ------- |
| M1 | `src/components/goal-hero.tsx` | removido `@xl:grid-cols-[1.1fr_1fr]` (Hero numa coluna) | ✅ Killed (altura 435 px > 340) |
| M2 | `src/components/goal-experience.tsx` | removido `onInteractOutside` (clique fora fecha) | ✅ Killed (a gaveta fechou e o foco não voltou ao botão; falhou em `toBeFocused`) |
| M3 | `src/components/goal-experience.tsx` | removido `lg:pr-96` | ✅ Killed (Hero terminava em 1232 px, sob a gaveta em 896) |
| M4 | `src/components/goal-experience.tsx` | fechar não restaura o resumo salvo | ✅ Killed (após Esc o estado vazio não voltou) |
| M5 | `src/components/goal-hero.tsx` | "Distância do Alvo:" trocado por "Falta:" | ✅ Killed |
| M6 | `src/components/goal-form.tsx` | Cancelar sem `onClick` | ✅ Killed (a gaveta continuou aberta) |

**Sensor depth**: lightweight, 6 mutações de comportamento nos pontos de maior risco.
**Result**: 6/6 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ O `Sheet` tem só o que a feature usa (direita, sem overlay) |
| Surgical changes | ✅ Um arquivo por tarefa; exceção prevista no `tasks.md`: nenhuma |
| No scope creep | ✅ Sem mudança de domínio, validação, banco ou `saveGoal`; arquivos da outra sessão fora dos commits |
| Matches patterns | ✅ `Sheet` segue `dialog.tsx`; Hero e gráfico seguem os tokens existentes |
| Spec-anchored outcome check | ✅ Medidas contra a spec: 277 px (≤ 340), 582 px com a gaveta (previsto 582), "R$ 6.794,95 / mês" (exemplo da spec) |
| Per-layer Coverage Expectation | ✅ UI = `none` na matriz; regressão pelos 458 testes unitários e 285 de integração |
| Every test maps to a requirement | ✅ Nenhum teste criado ou removido nesta feature |
| Guidelines | `AGENTS.md` (doc do Next lida na feature anterior, mesmo padrão de Client Component), AD-005, AD-008 |

---

## Edge Cases

- [x] Guardado R$ 0,00: linha de contexto usa `formatShare` (testada no domínio); renderização não vista
- [x] Descartar o rascunho de um primeiro objetivo volta ao estado vazio (visto)
- [x] Gaveta fecha e devolve a largura à área de conteúdo (Hero voltou a 966 px após Esc, visto)
- [ ] Prazo 0 omite o gráfico e mantém o Hero com a barra: **não exercitado** (lacuna 1)

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- **Result**: unit 458 passed, 0 failed; integration 285 passed, 0 failed; typecheck, lint e build sem erro (rodada final, T8)
- **Test count before feature**: unit 440, integration 279 (gate da T1)
- **Test count after feature**: unit 458, integration 285
- **Delta**: +18 unitários e +6 de integração, **todos da outra sessão** (testes de `percent`, categorias e transações adicionados em paralelo); esta feature não criou nem removeu testes
- **Skipped tests**: nenhum
- **Failures**: nenhuma na rodada final. Durante a T7 houve duas falhas transitórias por concorrência: um teste de integração caiu enquanto a outra sessão adicionava a migração 0010, e o `next build` recusou rodar com outro build em andamento; ambos passaram ao repetir. O helper de gate mascarava o código de saída do build; foi corrigido e a T7 foi revalidada com o build de fato executado

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LAY-01 a LAY-13 | In Tasks | ✅ Verified (lacunas 1 a 5 acima) |

---

## Limites desta verificação

- Mesmo agente implementou e verificou. Para uma verificação independente, rode o skill com um sub-agente Verifier.
- O sensor injetou 6 mutações, detectadas por um spec de navegador que não está versionado (AD-005): ele serviu à verificação e foi removido do repositório.
- A UI continua sem teste automatizado: uma regressão visual só aparece em verificação manual.

---

## Summary

**Overall**: ✅ Ready (com as lacunas registradas)

**Spec-anchored check**: 27/33 linhas verificadas contra a spec; 6 com lacuna de borda ou de leitor de tela
**Sensor**: 6/6 mutações mortas
**Gate**: 458 unitários e 285 de integração passam

**What works**: Hero de 277 px em duas colunas sem card interno; barra e checkpoints no rodapé do Hero com o percentual uma única vez; gaveta lateral sem overlay que reserva 384 px e deixa o Hero e o gráfico visíveis; prévia ao vivo no Hero e na faixa da gaveta; estado vazio; selo de rendimentos no cabeçalho do gráfico; tooltip anual com linha-guia e ponto ativo; colunas empilhadas e gaveta em tela cheia no celular.

**Issues found**: nenhum bloqueante.

**Next steps**: ver no navegador os casos de prazo encerrado e de guardado acima do alvo, e testar com leitor de tela.
