# Data de Nascimento no Cadastro Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/data-nascimento/design.md`
**Spec**: `.specs/features/data-nascimento/spec.md`
**Status**: Draft

**Ordem:** parser e coluna primeiro (fase 1), cadastro (fase 2), página e guard de data (fase 3) e, por último, o objetivo (fase 4). A coluna antiga `financial_goal.birth_date` só sai em T12, depois de a página de data e o guard existirem, para nenhuma conta ficar sem como informar a data e cada commit compilar e passar o gate.

**Desvio do design:** a migração é dividida em duas para manter commits atômicos: `0013` (adiciona `user.birth_date` e copia o dado, T3) e `0014` (remove `financial_goal.birth_date`, T12). O resultado final é o mesmo do design.

**Next.js:** `AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de código de framework; T8, T10 e T11 usam `redirect`, `revalidatePath` e Server Actions já usados no projeto, sem API nova.

**Ambiente:** Node 20 no `PATH` (`export PATH=$HOME/.nvm/versions/node/v20.20.2/bin:$PATH`). Testes de integração rodam em banco privado terminado em `_test` via `DATABASE_URL` (outra sessão pode usar `orcamento_test`). Há alterações não relacionadas na árvore (`.specs/LESSONS.md`, `.specs/lessons.json`, `e2e/transaction-form.spec.ts`, `summary-table.tsx`, `transaction-form.tsx`); cada commit inclui só os arquivos da task.

**Verificação manual (AD-005, sem teste de componente):** o Verifier fecha a feature com uma conferência no app (skill `run`): cadastro com data, conta sem data caindo em `/data-nascimento`, edição da data com e sem objetivo, formulário do objetivo sem o campo, e a cópia da migração `0013` em banco com dados.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts` (projetos `unit` em `src/**/*.test.ts` e `integration` em `*.int.test.ts`), AD-005 (e2e suspenso), AD-008 (domínio e validação isomórficos). Lição L-002: os textos dos AC já estão literais na spec e entram literais nos testes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio e validação (`src/lib/domain/*`, `src/lib/validation/*`) | unit | Todos os ramos; 1:1 com os AC; cada caso de borda listado tem teste | `src/lib/**/*.test.ts` | `npm run test:unit` |
| Repositórios (`src/lib/db/repos/*`) | integration | Caminhos principais das consultas + erros; contagem anterior preservada | `src/lib/db/repos/*.int.test.ts` | `npm run test:int` |
| Server Actions (`src/actions/*`) | integration | Feliz + cada caso de borda e erro listado; guard sem sessão | `src/actions/*.int.test.ts` | `npm run test:int` |
| UI / páginas / componentes (`src/components/*`, `src/app/**`) | none | - (e2e suspenso, AD-005; sem teste de componente; build gate only) | - | build gate only |
| Schema e migração (`src/lib/db/*schema.ts`, `drizzle/*`) | none | - (build gate only; cópia da 0013 conferida pelo Verifier) | - | build gate only |

## Gate Check Commands

> Generated from `package.json` - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de validação e domínio (unit) | `npm run typecheck && npm run lint && npm run test:unit` |
| Full | Tasks com testes de integração | `npm run typecheck && npm run lint && npm run test:unit && npm run test:int` |
| Build | Tasks de UI, schema e migração | `npm run typecheck && npm run lint && npm run build && npm run test:unit` |

---

## Execution Plan

### Phase 1: Validação e dados

Base compartilhada: parser, coluna, migração e repositório.

```
T1 → T2 → T3 → T4
```

### Phase 2: Cadastro

Campo no cadastro de ponta a ponta.

```
T5 → T6 → T7
```

### Phase 3: Página de data e guard

Contas sem data informam no próximo acesso; edição da data.

```
T8 → T9 → T10 → T11
```

### Phase 4: Objetivo de Liberdade

Fonte única: o objetivo lê a data do usuário e a coluna antiga sai.

```
T12 → T13 → T14 → T15 → T16 → T17 → T18
```

---

## Task Breakdown

### T1: Criar `parseBirthDate` e `today`

**What**: Função pura `parseBirthDate(text, now)` → `{ iso, age }` ou erro com a mensagem exata da spec, mais `today(now)`/`isoOf` e `MAX_AGE`.
**Where**: `src/lib/validation/birth-date.ts`
**Depends on**: None
**Reuses**: regras hoje inline em `src/lib/validation/goal.ts`, `ageOn`, `brToIso`
**Requirement**: NASC-03, NASC-04, NASC-05, NASC-06, NASC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Vazio → "Informe a data de nascimento"; `31/02/1990` e `1990-01-01` → "Data de nascimento inválida"; amanhã → "A data de nascimento não pode ser futura"; idade 121 → "A idade atual deve ser de no máximo 120 anos"
- [x] Hoje (America/Sao_Paulo) é aceito; idade exatamente 120 é aceita; `29/02` de ano bissexto é aceito e a idade segue `ageOn`
- [x] Sem import de servidor (AD-008)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(birth-date): add the birth date parser shared by signup and goal`

---

### T2: `goalSchema` passa a usar `parseBirthDate`

**What**: Substituir o trecho inline de nascimento em `goalSchema` por `parseBirthDate` e reexportar `today` de `birth-date.ts`; comportamento idêntico.
**Where**: `src/lib/validation/goal.ts` (modify)
**Depends on**: T1
**Reuses**: `src/lib/validation/birth-date.ts`
**Requirement**: NASC-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `goal.test.ts` existente passa sem alteração de asserts
- [x] `import { today } from "@/lib/validation/goal"` continua válido (`goal-fields.tsx`)
- [x] Contagem de testes igual à anterior (sem exclusões)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(goal): validate the birth date with the shared parser`

---

### T3: Coluna `user.birth_date` e migração 0013

**What**: Adicionar `birthDate` (`date`, nullable) em `user`, citar a coluna no comentário do cabeçalho e gerar a migração `0013` (add + cópia de `financial_goal.birth_date` por `user_id`); arquivos `drizzle/*` gerados entram no commit.
**Where**: `src/lib/db/auth-schema.ts` (modify)
**Depends on**: T2
**Reuses**: padrão das colunas manuais `status`/`decided_at`; `drizzle/0012_user_status.sql`
**Requirement**: NASC-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run db:generate` produz a `0013` e o SQL tem `ADD COLUMN "birth_date" date` seguido de `UPDATE "user" ... FROM "financial_goal"` (editado à mão se o gerador omitir o UPDATE)
- [x] Aplicada em banco privado `*_test` com um usuário com objetivo e outro sem: o primeiro recebe a data do objetivo, o segundo fica `NULL` (conferido por consulta, anotado em `validation.md`)
- [x] `financial_goal.birth_date` ainda existe (sai em T12)
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(db): add the nullable birth date to the user and copy it from goals`

---

### T4: `usersRepo`: ler, gravar e criar com a data

**What**: Adicionar `getBirthDate(id)`, `setBirthDate(id, iso)` e `birthDate?: string` em `createPending` (grava na mesma transação do insert do usuário).
**Where**: `src/lib/db/repos/users.ts` (modify)
**Depends on**: T3
**Reuses**: `findById`, `createPending` atuais
**Requirement**: NASC-02, NASC-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `getBirthDate` devolve `null` sem data e `"AAAA-MM-DD"` com data; usuário inexistente devolve `null`
- [x] `setBirthDate` altera só o usuário indicado
- [x] `createPending` com `birthDate` grava a data; sem ela grava `NULL`; e-mail duplicado continua devolvendo `duplicate` sem alterar o existente
- [x] Testes em `users.int.test.ts`; contagem anterior preservada
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(users): read, write and create users with a birth date`

---

### T5: `signupSchema` com `birthDate`

**What**: Campo `birthDate` (texto) validado por `parseBirthDate(value, new Date())` dentro de `superRefine`, mensagem no path `birthDate`; saída traz `birthDate` em ISO.
**Where**: `src/lib/validation/signup.ts` (modify)
**Depends on**: None
**Reuses**: `parseBirthDate`, padrão de `signupSchema`
**Requirement**: NASC-02, NASC-03, NASC-04, NASC-05, NASC-06, NASC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cada mensagem da spec aparece em `birthDate` para vazio, inexistente, futura e idade > 120
- [x] Data válida sai em ISO (`18/09/1993` → `1993-09-18`); hoje é aceito
- [x] Testes antigos de `signup.test.ts` seguem passando com `birthDate` válido adicionado às entradas
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(signup): validate the birth date in the signup schema`

---

### T6: `signUpAction` grava a data

**What**: Ler `birthDate` do `FormData`, validar com `signupSchema` e passar a data ISO a `usersRepo.createPending`.
**Where**: `src/actions/auth.ts` (modify)
**Depends on**: T5
**Reuses**: `signUpAction` atual, `invalidInput`
**Requirement**: NASC-02, NASC-03, NASC-04, NASC-05, NASC-06, NASC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cadastro válido cria usuário `pending` com `birth_date` = data informada e sem sessão
- [x] Data vazia, inválida, futura e > 120 anos: `fieldErrors.birthDate` com a mensagem exata e nenhum usuário criado
- [x] Hoje aceito; e-mail duplicado continua com "Este e-mail já está cadastrado"
- [x] Testes em `auth.int.test.ts`; contagem anterior preservada
- [x] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(signup): store the birth date when creating a pending user`

---

### T7: Campo de data em `SignupForm`

**What**: Campo "Data de nascimento" entre E-mail e Senha, com `maskDateInput`, `inputMode="numeric"`, `placeholder="DD/MM/AAAA"`, `autoComplete="bday"` e erro de `fieldErrors.birthDate`.
**Where**: `src/app/cadastro/signup-form.tsx` (modify)
**Depends on**: T6
**Reuses**: campos de e-mail e nome do mesmo form; `maskDateInput`
**Requirement**: NASC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Campo na posição e com os atributos da spec, `name="birthDate"`
- [ ] Erro do servidor aparece sob o campo
- [ ] Evidência por inspeção de código (`file:line`, AD-005)
- [ ] Build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(signup): ask for the birth date in the signup form`

---

### T8: `saveBirthDateAction`

**What**: Action (useActionState) que valida com `parseBirthDate`, recusa data incompatível com o objetivo salvo, grava com `setBirthDate`, faz `revalidatePath("/liberdade")` e redireciona para `/` quando a pessoa ainda não tinha data.
**Where**: `src/actions/profile.ts`
**Depends on**: None
**Reuses**: `saveGoal` (guard e `revalidatePath`), `goalsRepo.get`
**Requirement**: NASC-09, NASC-10, NASC-17, NASC-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem sessão aprovada → `UNAUTHORIZED` e nada gravado
- [ ] Sem data anterior: grava e redireciona para `/`; com data anterior: grava e devolve `{ ok: true }`
- [ ] Datas inválidas devolvem as mensagens exatas em `fieldErrors.birthDate` sem alterar o usuário
- [ ] Com objetivo de independência aos 50, `18/09/1960` (idade 66) → "A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (50)" e data anterior mantida; `18/09/1990` é aceita
- [ ] Testes em `profile.int.test.ts`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(profile): add the action that saves the birth date`

---

### T9: `BirthDateForm`

**What**: Formulário cliente da data com máscara, pré-preenchimento em `DD/MM/AAAA`, erro no campo e a mensagem "Data de nascimento atualizada" no sucesso sem redirecionamento.
**Where**: `src/app/data-nascimento/birth-date-form.tsx`
**Depends on**: T8
**Reuses**: `SignupForm` (useActionState), `maskDateInput`
**Requirement**: NASC-16, NASC-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Usa `saveBirthDateAction`; valor inicial vem por prop
- [ ] Sucesso exibe "Data de nascimento atualizada" com `role="status"`
- [ ] Evidência por inspeção de código; build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(profile): add the birth date form`

---

### T10: Página `/data-nascimento`

**What**: Página fora do grupo `(app)`: `requireSessionForPage`, `getBirthDate`, `Logo`, cartão simples com `BirthDateForm` e link "Voltar" para `/liberdade` só quando a pessoa já tinha data.
**Where**: `src/app/data-nascimento/page.tsx`
**Depends on**: T9
**Reuses**: `src/app/cadastro/page.tsx`, `Logo`
**Requirement**: NASC-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem sessão aprovada redireciona para `/login` (guard existente)
- [ ] Pré-preenche com `isoToBR` quando há data
- [ ] Evidência por inspeção de código; build gate passa; rota coberta pelo matcher do `proxy.ts`
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(profile): add the birth date page`

---

### T11: Redirecionar contas sem data no layout `(app)`

**What**: Depois de `requireSessionForPage()`, redirecionar para `/data-nascimento` quando `usersRepo.getBirthDate(userId)` for `null`.
**Where**: `src/app/(app)/layout.tsx` (modify)
**Depends on**: T10
**Reuses**: `requireSessionForPage`, `redirect`
**Requirement**: NASC-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Qualquer página do grupo `(app)`, inclusive `/admin/cadastros`, redireciona sem data; `/data-nascimento` (fora do grupo) não entra em laço
- [ ] Evidência por inspeção de código; build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(profile): send accounts without a birth date to the birth date page`

---

### T12: Data do objetivo passa a vir do usuário no repositório

**What**: `goalsRepo.get` junta `user` e devolve `Goal` com a data do usuário (`null` sem objetivo ou sem data); `upsert` deixa de gravar `birthDate`; remover `financial_goal.birthDate` do schema, gerar a migração `0014` (DROP COLUMN) e ajustar os helpers de teste que gravavam a data no objetivo.
**Where**: `src/lib/db/repos/goals.ts` (modify)
**Depends on**: None
**Reuses**: `goalsRepo` atual; helpers em `users.int.test.ts` e `admin-users.int.test.ts`
**Requirement**: NASC-13, NASC-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `get` devolve `birthDate` de `user.birth_date`; `null` sem objetivo e `null` com objetivo mas sem data
- [ ] `upsert` não grava data e preserva a data do usuário; substituição do objetivo continua por `user_id`
- [ ] Schema sem `financial_goal.birth_date` e `0014` gerada; helpers de teste gravam a data em `user`
- [ ] Testes de `goals.int.test.ts`, `users.int.test.ts` e `admin-users.int.test.ts` passam, contagem preservada
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(goals): read the goal birth date from the user`

---

### T13: `saveGoal` usa a data do banco

**What**: Ler `usersRepo.getBirthDate`, descartar o `birthDate` do cliente, validar com `goalSchema` usando a data do usuário em `DD/MM/AAAA`, e recusar sem data.
**Where**: `src/actions/goals.ts` (modify)
**Depends on**: T12
**Reuses**: `saveGoal` atual, `isoToBR`
**Requirement**: NASC-13, NASC-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem data no usuário → "Informe sua data de nascimento antes de salvar o objetivo" e nada gravado
- [ ] `birthDate` forjado no input é ignorado: o objetivo é validado e salvo com a data do usuário
- [ ] Idade da independência ≤ idade atual → "A idade da independência deve ser maior que a idade atual (N)"
- [ ] Testes em `goals.int.test.ts`; contagem preservada
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit && npm run test:int`

**Tests**: integration
**Gate**: full

**Commit**: `feat(goals): validate the goal against the user's stored birth date`

---

### T14: `evaluateDraft` ignora `birthDate` ao calcular `dirty`

**What**: Remover `birthDate` de `FIELDS` em `goal-draft.ts`, já que o campo deixa de ser editável.
**Where**: `src/lib/validation/goal-draft.ts` (modify)
**Depends on**: T13
**Reuses**: `evaluateDraft` atual
**Requirement**: NASC-12, NASC-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Alterar só `birthDate` não marca `dirty`; alterar outro campo marca
- [ ] Resumo e erros inalterados para as mesmas entradas
- [ ] `goal-draft.test.ts` atualizado; contagem preservada
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run test:unit`

**Tests**: unit
**Gate**: quick

**Commit**: `refactor(goal): leave the birth date out of the draft changes`

---

### T15: `GoalFields` mostra a data e o link

**What**: Trocar o `Input` de nascimento por texto com a data e o link "Alterar data de nascimento" para `/data-nascimento`, mantendo o cálculo de idade e do slider a partir de `values.birthDate`.
**Where**: `src/components/goal-fields.tsx` (modify)
**Depends on**: T14
**Reuses**: bloco atual de nascimento, `Link`
**Requirement**: NASC-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nenhum `Input` de data no formulário (gaveta e estado vazio)
- [ ] Texto "Data de nascimento" com `DD/MM/AAAA` e o link na gaveta e no estado vazio
- [ ] Idade atual e `sliderMin` seguem calculados
- [ ] Evidência por inspeção de código; build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(goal): show the birth date as text with a link to change it`

---

### T16: `useGoalDraft` recebe a data do usuário

**What**: Aceitar `birthDate` (BR) e usá-lo no estado inicial: `initial ?? { ...BLANK_GOAL_VALUES, birthDate }`, inclusive no `reset`.
**Where**: `src/components/use-goal-draft.ts` (modify)
**Depends on**: T15
**Reuses**: `BLANK_GOAL_VALUES`
**Requirement**: NASC-12, NASC-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Sem objetivo salvo, os valores iniciais trazem a data do usuário
- [ ] `reset` volta à data do usuário
- [ ] Evidência por inspeção de código; build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(goal): seed the goal draft with the user's birth date`

---

### T17: `GoalExperience` repassa a data

**What**: Nova prop `birthDate` repassada a `useGoalDraft`.
**Where**: `src/components/goal-experience.tsx` (modify)
**Depends on**: T16
**Reuses**: props atuais
**Requirement**: NASC-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GoalExperience` aceita `birthDate: string` obrigatória e a entrega ao rascunho
- [ ] Evidência por inspeção de código; build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(goal): pass the birth date into the goal experience`

---

### T18: Página `/liberdade` fornece a data

**What**: Ler `usersRepo.getBirthDate`, converter com `isoToBR` e passar a `GoalExperience`; `initial` usa a data do objetivo (que já é a do usuário).
**Where**: `src/app/(app)/liberdade/page.tsx` (modify)
**Depends on**: T17
**Reuses**: `isoToBR`, `goalsRepo.get`
**Requirement**: NASC-12, NASC-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Página compila sem tipo faltando; a data chega ao formulário com e sem objetivo
- [ ] Evidência por inspeção de código; build gate passa
- [ ] Gate check passes: `npm run typecheck && npm run lint && npm run build && npm run test:unit`

**Tests**: none
**Gate**: build

**Commit**: `feat(goal): load the user's birth date in the freedom page`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7
Phase 3:  T8 ------→ T9 ------→ T10 ------→ T11
Phase 4:  T12 ------→ T13 ------→ T14 ------→ T15 ------→ T16 ------→ T17 ------→ T18
```

Execução estritamente sequencial: cada fase só começa quando a anterior termina, então `None` na primeira task de uma fase significa "depende só das fases anteriores" (T5 usa T1 e T4; T8 usa T1 e T4; T12 usa a fase 3).
