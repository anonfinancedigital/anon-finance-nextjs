# Liberdade: Layout Enxuto Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/liberdade-layout/design.md`
**Status**: Draft

**Estratégia de ordem:** cada tarefa deixa `typecheck`, `lint`, `build` e os testes verdes. Alguns commits intermediários mostram a tela por um momento com duplicidade ou sem a gaveta (T4 deixa os checkpoints duas vezes até a T5; T6 deixa o formulário aberto na página até a T7; T7 deixa o cabeçalho duas vezes até a T8). É o preço de manter cada commit compilando e de tocar um arquivo por tarefa.

**Vocabulário:** os rótulos vêm da `identidade-vertice` (já em produção): "Ápice", "Meta Patrimonial", "Aporte Estratégico Mensal", "Distância do Alvo", "Tempo até o Ápice", "Trajetória dos Juros Compostos", "Calibrar Parâmetros". Nenhuma tarefa renomeia nada fora dos textos novos da spec.

**Concorrência:** outra sessão trabalha neste repositório. Cada commit inclui só os arquivos da tarefa. Para a integração, usar um banco privado `*_test` via `DATABASE_URL` (memória do projeto `test-db-isolation`) e Node 20 no `PATH`.

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (consultar `node_modules/next/dist/docs/`), `vitest.config.ts` (projetos `unit` e `integration`), AD-005 (e2e suspenso), AD-008 (sem teste de componente). Nenhuma tarefa toca domínio, validação, repositório ou action; os testes existentes seguem como rede de regressão. Mesmo padrão de `.specs/features/liberdade-experiencia/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio (`src/lib/domain/*`) | unit | Inalterado por esta feature; regressão pelos testes existentes | `src/lib/domain/*.test.ts` | `npm run test:unit` |
| Repositório e Server Actions | integration | Inalterados; regressão pelos testes existentes | `src/**/*.int.test.ts` | `npm run test:int` |
| UI / páginas (`src/app/*`, `src/components/*`) | none | - (e2e suspenso, AD-005; sem teste de componente no projeto; verificação manual na T8) | - | build gate only |

## Gate Check Commands

> Do `package.json`. Integração exige `npm run db:up` e banco privado (ver Concorrência).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com testes unitários | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI (todas desta feature) | `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int` |

---

## Execution Plan

As fases rodam em ordem; dentro de cada fase, as tarefas também.

### Phase 1: Peças isoladas

Gaveta, checkpoints compactos e gráfico, cada um sem depender dos outros.

```
T1 → T2 → T3
```

### Phase 2: Hero e resumo

Hero em duas colunas com a barra no rodapé, e o resumo sem a seção de progresso solta. A seta vinda da fase 1 marca uma dependência já concluída.

```
T3 → T4 → T5
```

### Phase 3: Gaveta de edição

Formulário sem colapso, estado da gaveta e página enxuta. A seta vinda da fase 2 marca uma dependência já concluída.

```
T5 → T6 → T7 → T8
```

---

## Task Breakdown

### T1: Componente Sheet

**What**: Criar `Sheet` não modal à direita sobre o Dialog do Radix, sem overlay.
**Where**: `src/components/ui/sheet.tsx`
**Depends on**: None
**Reuses**: `src/components/ui/dialog.tsx` (padrão dos wrappers e do botão de fechar); animações `slide-in-from-right` e `slide-out-to-right` do `tw-animate-css`
**Requirement**: LAY-07, LAY-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Exporta `Sheet`, `SheetTrigger`, `SheetClose`, `SheetTitle`, `SheetDescription` e `SheetContent`
- [x] `SheetContent` não renderiza overlay, fica `fixed inset-y-0 right-0 z-50`, ocupa `w-full` e `lg:w-96`, rola por dentro (`overflow-y-auto`) e traz o botão X com `sr-only` "Fechar"
- [x] Animação de entrada e saída pela direita (`data-open:slide-in-from-right`, `data-closed:slide-out-to-right`)
- [x] Sem erros de tipo ou lint
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): add non-modal side sheet`

---

### T2: Checkpoints compactos

**What**: `GoalCheckpoints` perde a linha "Progresso 7,2%" e a linha "25% do alvo", e a lista usa `grid-cols-2 @xl:grid-cols-4`.
**Where**: `src/components/goal-checkpoints.tsx` (modify)
**Depends on**: T1
**Reuses**: `Progress`, `formatCompactBRL`, estado em texto atual
**Requirement**: LAY-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhum percentual de progresso em texto visível no componente (o `aria-label` da barra mantém "Progresso do objetivo: {percentual}")
- [x] Cada checkpoint em duas linhas: ícone com valor compacto, e o estado em texto ("Atingido", "Previsão: aos N anos" ou "Sem previsão")
- [x] Barra `--income` com brilho e marcas nas posições 25, 50, 75 e 100% inalteradas
- [x] Grade `grid-cols-2 @xl:grid-cols-4`
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `refactor(ui): compact the goal checkpoints list`

---

### T3: Gráfico com selo e tooltip

**What**: `GoalChart` move a frase de rendimentos para um selo no cabeçalho, remove o parágrafo do rodapé e os `ReferenceDot`, e ganha ponto ativo e linha-guia sólida no tooltip.
**Where**: `src/components/goal-chart.tsx` (modify)
**Depends on**: T2
**Reuses**: tooltip, legenda, tabela `sr-only` e `aria-label` atuais; Recharts `activeDot` e `Tooltip cursor`
**Requirement**: LAY-11, LAY-12

**Tools**:

- MCP: NONE
- Skill: `dataviz` (cabeçalho com selo e legenda)

**Done when**:

- [x] Cabeçalho: título "Trajetória dos Juros Compostos" à esquerda; à direita o selo "Rendimentos: {X}% do patrimônio aos {N} anos" (pill `bg-income/15 text-income`) e a legenda
- [x] Sem o parágrafo do rodapé (frase e "marcas nos 25%, 50% e 75% do alvo") e sem `ReferenceDot`; o cálculo `marks` sai junto
- [x] Cada `Area` com `activeDot` (raio 4, contorno `var(--card)`); `Tooltip cursor` com linha sólida fina
- [x] O tooltip segue mostrando "Aos N anos", total investido, rendimentos e total do ponto anual mais próximo
- [x] `aria-label` da figura e tabela `sr-only` mantidos, com a mesma frase do selo
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): move the interest share to a chart badge and drop fixed marks`

---

### T4: Hero em duas colunas

**What**: Reescrever `GoalHero` em duas colunas por container query (`@xl`, 576 px), com destino à esquerda, plano de ação à direita sem card interno, e a barra de checkpoints no rodapé.
**Where**: `src/components/goal-hero.tsx` (modify)
**Depends on**: T3
**Reuses**: `glow`, `formatTerm`, `formatShare`, `formatBRL`; `GoalCheckpoints` (T2)
**Requirement**: LAY-01, LAY-02, LAY-03, LAY-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A raiz é `@container overflow-hidden rounded-2xl border border-border bg-card shadow-lg` com o `glow`; o grid vira duas colunas em `@xl` e empilha abaixo
- [x] Destino: "Meta Patrimonial", alvo em `font-display text-3xl @xl:text-2xl @3xl:text-3xl`, selo "Gera {renda}/mês perpétuos a {taxa}% a.a." e linha "{guardado} acumulados ({formatShare} do alvo)" (renda R$ 20.000,00, 8%, guardado R$ 565.000,00, alvo R$ 3.000.000,00 → "Gera R$ 20.000,00/mês perpétuos a 8% a.a." e "R$ 565.000,00 acumulados (18,8% do alvo)")
- [x] Plano de ação: metade direita com `bg-primary/10`, sem borda e sem raio próprios; "Aporte Estratégico Mensal"; "R$ 6.794,95 / mês" em `font-display text-4xl @xl:text-3xl @3xl:text-4xl` (o texto de maior peso); "Tempo até o Ápice: 11 anos e 11 meses"; "Distância do Alvo: R$ 2.435.000,00"
- [x] Aporte nulo mostra "Prazo encerrado" no lugar de "R$ … / mês"; prazo 0 mostra "Tempo até o Ápice: 0 meses"; guardado ≥ alvo mostra "Distância do Alvo: R$ 0,00" e a linha de contexto com o percentual real (ex.: "120,0% do alvo")
- [x] Rodapé: `border-t border-border` com `GoalCheckpoints`; nenhum "Progresso" nem percentual solto no restante do Hero
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): lay out the goal hero in two columns with the checkpoints footer`

---

### T5: Resumo sem seção de progresso

**What**: `GoalSummary` deixa de renderizar `GoalCheckpoints` à parte; fica `GoalHero` (já com a barra) e `GoalChart`.
**Where**: `src/components/goal-summary.tsx` (modify)
**Depends on**: T4
**Reuses**: `GoalHero` (T4), `GoalChart` (T3)
**Requirement**: LAY-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GoalSummary({ summary })` mantém a assinatura e renderiza só `GoalHero` e `GoalChart`
- [x] Nenhuma seção de progresso entre o gráfico e o resto da página; os checkpoints aparecem uma vez, dentro do Hero
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [x] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `refactor(ui): drop the standalone progress section from the goal summary`

---

### T6: Formulário sem colapso

**What**: `GoalForm` perde o estado `editing` e o botão "Calibrar Parâmetros", ganha `onSaved` e `onCancel`, vira coluna única com rodapé de botões fixo e mostra o Cancelar sempre.
**Where**: `src/components/goal-form.tsx` (modify)
**Depends on**: T5
**Reuses**: estado, `useTransition`, `fieldErrors`, `Slider`, `RateToggle`, `onDraftChange` atuais
**Requirement**: LAY-08, LAY-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Props `{ initial, onDraftChange, onSaved, onCancel, nowIso }`; sem `editing` e sem o botão que colapsava
- [ ] Salvar com sucesso chama `onSaved()` e `router.refresh()`; com erro mantém o formulário com as mensagens por campo e o alerta
- [ ] Cancelar chama `onCancel()` (visível também sem objetivo salvo); `onDraftChange` segue sendo chamado a cada alteração
- [ ] Campos em coluna única (`grid-cols-1`); botões Salvar e Cancelar num rodapé `sticky bottom-0`
- [ ] A estrutura e os rótulos dos campos, o slider e a taxa ficam como estão
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `refactor(ui): make the goal form a plain form driven by its host`

---

### T7: Gaveta e estado vazio

**What**: `GoalExperience` passa a renderizar o cabeçalho com "Calibrar Parâmetros" como gatilho, o estado vazio com "Definir objetivo", a gaveta não modal com a faixa de resumo e o formulário, e a reserva de espaço `lg:pr-96`.
**Where**: `src/components/goal-experience.tsx` (modify)
**Depends on**: T6
**Reuses**: `Sheet` (T1), `GoalForm` (T6), `GoalSummary` (T5), `PageHeader`, `summarize`, `goalSchema`, `formatBRL`
**Requirement**: LAY-06, LAY-07, LAY-08, LAY-09, LAY-10, LAY-13

**Tools**:

- MCP: NONE
- Skill: NONE (ler `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` antes de mexer no Client Component)

**Done when**:

- [ ] Estado `open`; o wrapper da página é `space-y-6 transition-[padding] duration-200` e ganha `lg:pr-96` enquanto `open`
- [ ] `PageHeader` (eyebrow "Independência financeira", título "Ápice") com o botão "Calibrar Parâmetros" (`SheetTrigger asChild`) só quando há objetivo salvo
- [ ] Sem objetivo e sem prévia: cartão de estado vazio com o parágrafo de introdução e "Definir objetivo" (`SheetTrigger asChild`); sem botão no cabeçalho
- [ ] `Sheet modal={false}` com `SheetContent` e `onInteractOutside` impedindo o fechamento por clique fora; `SheetTitle` "Calibrar Parâmetros"; `SheetDescription` com o parágrafo de introdução atual, sem mudar o texto
- [ ] Faixa no topo da gaveta com "Meta Patrimonial" e "Aporte Estratégico Mensal" da prévia ("R$ … / mês", "Prazo encerrado" se `monthlyCents` nulo, "—" sem prévia)
- [ ] X, Esc e Cancelar fecham e restauram o resumo salvo (ou voltam ao estado vazio sem objetivo); Salvar com sucesso fecha sem restaurar, mantendo o resultado da prévia
- [ ] Rascunho válido recalcula Hero e gráfico ao lado da gaveta; rascunho inválido mantém o último resultado válido
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): edit the goal in a non-modal side sheet`

---

### T8: Página enxuta e verificação manual

**What**: `page.tsx` devolve só `GoalExperience`; o cabeçalho e o parágrafo, que agora vivem no componente, saem da página.
**Where**: `src/app/(app)/liberdade/page.tsx` (modify)
**Depends on**: T7
**Reuses**: `GoalExperience` (T7), `isoToBR`, `moneyText`, `goalsRepo.get`, `requireSessionForPage`
**Requirement**: LAY-06

**Tools**:

- MCP: NONE
- Skill: `run` (abrir o app e conferir a tela em 1280 px e 390 px, nos temas claro e escuro)

**Done when**:

- [ ] A página mantém `metadata` ("Ápice"), a leitura do objetivo e a montagem de `initial`, e renderiza só `<GoalExperience saved initial nowIso />`
- [ ] Cabeçalho e parágrafo aparecem uma vez (vindos do `GoalExperience`)
- [ ] Verificação manual, com objetivo salvo (renda R$ 20.000,00, guardado R$ 565.000,00, nascimento 18/09/1993, aposentadoria aos 45): tela padrão sem campos de formulário; Hero em duas colunas com os textos da spec; o texto "18,8%" aparece uma vez; o Hero com a barra mede no máximo 340 px de altura com a largura a partir de 576 px
- [ ] Verificação manual da gaveta em 1280 px: abre sem tela escura, o Hero e o gráfico continuam inteiros visíveis ao lado, arrastar o slider muda o aporte do Hero e o da faixa da gaveta; clique fora não fecha; Esc restaura; Salvar fecha e mantém o resultado
- [ ] Verificação manual em 390 px: colunas empilhadas, gaveta em tela cheia com a faixa de resumo visível
- [ ] Verificação manual sem objetivo: cartão de estado vazio com "Definir objetivo"; sem botão no cabeçalho
- [ ] Tooltip do gráfico por hover mostra o ponto anual com linha-guia e ponto ativo; sem marcas fixas sobre a curva
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit && npm run test:int`
- [ ] Test count: nenhum teste novo (UI = none); contagem anterior mantida

**Tests**: none
**Gate**: build

**Commit**: `refactor(ui): leave the freedom page to the goal experience`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
Phase 3:  T6 ------→ T7 ------→ T8
```

Execução estritamente sequencial; cada tarefa termina em um commit atômico com o gate verde. São 8 tarefas, cabem num único lote: execução inline, sem sub-agentes.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 componente novo | ✅ Granular |
| T2, T3 | 1 componente cada, mudança de apresentação | ✅ Granular |
| T4 | 1 componente reescrito (colunas, textos, rodapé) | ⚠️ Coeso: três mudanças no mesmo JSX que não se separam sem deixar o Hero quebrado |
| T5 | 1 composição | ✅ Granular |
| T6 | 1 formulário | ✅ Granular |
| T7 | 1 componente (estado, cabeçalho, gaveta, estado vazio) | ⚠️ Coeso: tudo depende do mesmo `open`; separar deixaria a gaveta sem gatilho |
| T8 | 1 página | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1-T8 | UI / páginas (`src/components/*`, `src/app/*`) | none | none | ✅ OK |

Nenhuma tarefa cria ou altera domínio, validação, repositório ou action; por isso nenhuma exige teste novo, e o gate de build roda a suíte inteira como regressão.

---

## Requirement Coverage

| Requirement | Tasks |
| ----------- | ----- |
| LAY-01 | T4 |
| LAY-02 | T4 |
| LAY-03 | T4 |
| LAY-04 | T4, T5 |
| LAY-05 | T2 |
| LAY-06 | T7, T8 |
| LAY-07 | T1, T7 |
| LAY-08 | T6, T7 |
| LAY-09 | T6, T7 |
| LAY-10 | T1, T7 |
| LAY-11 | T3 |
| LAY-12 | T3 |
| LAY-13 | T7 |

**Coverage:** 13 total, 13 mapped to tasks, 0 unmapped
