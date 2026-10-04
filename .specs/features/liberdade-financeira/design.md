# Liberdade Financeira Design

**Spec**: `.specs/features/liberdade-financeira/spec.md`
**Status**: Draft

---

## Architecture Overview

Segue AD-001 (Server Component lê, Server Action escreve), AD-003 (centavos inteiros, pontos-base, `date` sem fuso) e AD-005 (sem e2e novo). Nenhuma decisão ativa é substituída e nenhuma AD nova é necessária.

Três camadas, como nas features anteriores:

1. **Domínio puro** (`src/lib/domain/freedom.ts`): alvo, idade, prazo em meses, aporte e progresso. Recebe `now` por parâmetro, sem ler relógio.
2. **Persistência e escrita**: tabela `financial_goal` (uma linha por usuário), `goalsRepo` e a action `saveGoal`.
3. **UI**: página `/liberdade` (Server Component) com `GoalForm` (Client) e `GoalSummary` (apresentacional), mais o link na navegação.

O resumo é calculado na leitura, a cada render, a partir da linha salva e de `new Date()`. Nada derivado é gravado, então o prazo diminui sozinho com o tempo (Edge Case de aniversário).

```mermaid
graph TD
    NAV[layout.tsx: link Liberdade] --> P[app/(app)/liberdade/page.tsx - Server]
    P -->|userId| R[goalsRepo.get]
    R --> DB[(financial_goal)]
    P -->|goal, now| D[domain/freedom.ts: summarize]
    P --> GS[GoalSummary]
    P -->|goal salvo ou null| GF[GoalForm - Client]
    GF -->|saveGoal| A[actions/goals.ts]
    A --> V[validation/goal.ts: goalSchema]
    A --> R2[goalsRepo.upsert]
    A -->|revalidatePath /liberdade| P
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `ActionResult`, `invalidInput`, `SAVE_FAILED` | `src/lib/action-result.ts` | Retorno e erros por campo da action |
| `requireSessionForAction`, `requireSessionForPage` | `src/lib/auth-guard.ts` | Sessão na action e na página (LIB-11) |
| `parseBRL`, `formatBRL` | `src/lib/domain/money.ts` | Entrada e exibição de dinheiro. `parseBRL` rejeita zero; ganha o parâmetro opcional `{ allowZero }` para o valor guardado |
| `formatShare` | `src/lib/domain/percent.ts:30` | Percentual com uma casa decimal ("10,0%") |
| `currentMonth`, `YearMonth`, `isValidCalendarDate` | `src/lib/domain/month.ts` | Mês de hoje e validação da data de nascimento |
| `Progress` | `src/components/ui/progress.tsx` | Barra; recebe `className="h-3"` e valor já limitado a 100 |
| `Button`, `Input`, `Label` | `src/components/ui` | Campos do formulário |
| Padrão action + repo + Zod | `src/actions/categories.ts`, `src/lib/db/repos/categories.ts`, `src/lib/validation/category.ts` | Mesma estrutura (`safeParse` → `invalidInput`, `try/catch` → `SAVE_FAILED`) |
| Padrão de formulário com `useTransition` e `fieldErrors` | `src/components/category-editor.tsx`, `src/components/transaction-form.tsx` | Estado, erro por campo e `role="alert"` |
| Padrão de página | `src/app/(app)/categorias/page.tsx` | Título, `metadata`, `requireSessionForPage` |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Navegação | `src/app/(app)/layout.tsx`: terceiro `Button asChild` com `<Link href="/liberdade">Liberdade</Link>` |
| Banco | Nova tabela `financial_goal` com FK para `user` (`onDelete: cascade`); migração gerada por `npm run db:generate` |
| Resumo (`/`) | Sem integração (valor guardado é manual, fora de escopo) |

---

## Components

### freedom (domínio)

- **Purpose**: Cálculos puros do objetivo.
- **Location**: `src/lib/domain/freedom.ts`
- **Interfaces**:
  - `ANNUAL_RATE_BP = 800`
  - `targetCents(monthlyIncomeCents: number): number` - `monthlyIncomeCents × 12 × 10000 ÷ ANNUAL_RATE_BP`. Com 8% vira `× 150`, sempre inteiro; sem arredondamento.
  - `ageOn(birthDate: string, today: YearMonthDay): number` - idade em anos completos; aniversário de 29/02 em ano não bissexto cai em 28/02.
  - `monthsUntilRetirement(birthDate: string, retirementAge: number, now: YearMonth): number` - `max(0, (anoNasc + idadeApos − ano) × 12 + (mêsNasc − mês))`.
  - `requiredMonthlyCents(input: { targetCents; savedCents; months }): number` - 0 se `saved × (1+i)^n ≥ alvo`; senão `ceil(PMT)` com `i = 1,08^(1/12) − 1`; não definido para `months = 0` (o chamador usa `summarize`).
  - `progressBp(savedCents, targetCents): number` - `round(saved × 10000 ÷ target)`, sem teto (a UI limita a barra).
  - `summarize(goal, now: Date): GoalSummary` - `{ targetCents, savedCents, remainingCents, progressBp, months, monthlyCents: number | null }`; `monthlyCents = null` quando `months = 0` e `saved < alvo` ("Prazo encerrado"); 0 quando `months = 0` e `saved ≥ alvo`.
- **Dependencies**: `month.ts` (tipos). Sem I/O.
- **Reuses**: convenção de `now` injetado de `currentMonth(now)`.

### goalSchema (validação)

- **Purpose**: Validar e converter o formulário (strings) em valores de domínio.
- **Location**: `src/lib/validation/goal.ts`
- **Interfaces**: `goalSchema` com saída `{ monthlyIncomeCents, savedCents, birthDate, retirementAge }`. Recebe `now` indiretamente: a regra "idade de aposentadoria > idade atual" e "idade atual ≤ 120" precisam da data de hoje, então a action chama `goalSchema(now)` (função que devolve o schema) em vez de um schema estático.
- **Limites**: renda `R$ 0,01 … R$ 1.000.000,00` (checagem de máximo no schema, além do teto de `parseBRL`); guardado `R$ 0,00 … R$ 999.999.999,99`; aposentadoria inteiro `1…120`.
- **Reuses**: `parseBRL`, `isValidCalendarDate`, `ageOn`, padrão `transform` + `ctx.addIssue` de `validation/category.ts`.

### goalsRepo

- **Purpose**: Ler e gravar o objetivo do usuário.
- **Location**: `src/lib/db/repos/goals.ts`
- **Interfaces**:
  - `get(userId): Promise<Goal | null>`
  - `upsert(userId, goal): Promise<void>` - `insert … onConflictDoUpdate` na chave `user_id`; atualiza `updatedAt`.
- **Dependencies**: `db`, tabela `financialGoal`. Toda consulta filtra por `userId` (LIB-11).

### saveGoal (action)

- **Purpose**: Validar e salvar o objetivo.
- **Location**: `src/actions/goals.ts`
- **Interfaces**: `saveGoal(input): Promise<ActionResult>` - sessão → `goalSchema(new Date()).safeParse` → `goalsRepo.upsert` → `revalidatePath("/liberdade")`; erro de banco vira `SAVE_FAILED` e não altera a linha (o upsert é um único comando).
- **Reuses**: estrutura de `src/actions/categories.ts`.

### GoalForm

- **Purpose**: Formulário com os quatro campos, erro por campo e botão Salvar.
- **Location**: `src/components/goal-form.tsx` (Client)
- **Interfaces**: `GoalForm({ initial })` - `initial` são strings já formatadas (`formatBRL` sem símbolo, `YYYY-MM-DD`, idade) ou vazio. Campos: renda mensal desejada, valor já guardado, data de nascimento (`<input type="date">`), idade de aposentadoria.
- **Reuses**: padrão de `transaction-form.tsx`.

### GoalSummary

- **Purpose**: Mostrar valor guardado, alvo, valor que falta, barra com percentual, aporte mensal e prazo restante.
- **Location**: `src/components/goal-summary.tsx`
- **Interfaces**: `GoalSummary({ summary })`. Barra: `value = min(100, progressBp / 100)`, texto `formatShare(progressBp)`. Aporte: `formatBRL(monthlyCents)` ou "Prazo encerrado" quando `null`. Prazo: `Y anos e M meses`.
- **Reuses**: `Progress`, `formatBRL`, `formatShare`.

### Página /liberdade

- **Location**: `src/app/(app)/liberdade/page.tsx`
- **Comportamento**: lê o objetivo; sem objetivo, só o formulário vazio (LIB-02 AC 3); com objetivo, `GoalSummary` e o formulário preenchido.

---

## Data Models

```typescript
// src/lib/db/schema.ts
export const financialGoal = pgTable(
  "financial_goal",
  {
    userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
    monthlyIncomeCents: bigint("monthly_income_cents", { mode: "number" }).notNull(),
    savedCents: bigint("saved_cents", { mode: "number" }).notNull(),
    birthDate: date("birth_date", { mode: "string" }).notNull(),
    retirementAge: smallint("retirement_age").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    check("financial_goal_income_range", sql`${t.monthlyIncomeCents} BETWEEN 1 AND 100000000`),
    check("financial_goal_saved_range", sql`${t.savedCents} BETWEEN 0 AND 99999999999`),
    check("financial_goal_retirement_age_range", sql`${t.retirementAge} BETWEEN 1 AND 120`),
  ],
);
```

`user_id` como chave primária garante um objetivo por usuário no banco (LIB-02 AC 4). A regra "idade de aposentadoria > idade atual" depende da data de hoje e fica só na validação, não em `CHECK`.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Campo inválido | `goalSchema` → `invalidInput`; `fieldErrors` por campo | Mensagem sob o campo; objetivo salvo intacto |
| Sem sessão | `requireSessionForAction` devolve `UNAUTHORIZED`; página redireciona | Sem leitura nem gravação |
| Falha do banco | `try/catch` → `SAVE_FAILED`; upsert é atômico | Alerta no formulário; objetivo anterior mantido |
| `months = 0` e guardado < alvo | `monthlyCents = null` | "Prazo encerrado" e valor que falta |
| Alvo ou aporte fora da faixa de `number` seguro | Impossível pelos limites: alvo ≤ 1,5 × 10¹⁰ centavos; `saved × (1+i)^n` ≤ ~10¹⁵ < 2⁵³ | Sem perda de precisão |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Migração `0004_recurrence.sql` e `schema.ts` com alterações não commitadas de outra feature | `drizzle/meta/_journal.json`, `src/lib/db/schema.ts` | `db:generate` da nova tabela pode embutir o diff da recorrência numa migração só | Gerar a migração desta feature depois de a 0004 estar commitada; a task de schema conferir que o SQL gerado contém só `financial_goal` |
| `parseBRL` rejeita zero e limita a R$ 999.999.999,99 | `src/lib/domain/money.ts:19,27` | Valor guardado R$ 0,00 seria recusado | Opção `{ allowZero }` testada; os limites da spec foram alinhados ao teto existente |
| Aritmética em ponto flutuante para o aporte | `freedom.ts` (novo) | `ceil` pode subir 1 centavo por erro de 1e-9 | `Math.ceil(x − 1e-6)`; testes com valor conhecido (R$ 2.636,21) e com guardado ≥ alvo |
| Data de nascimento e "hoje" dependem do fuso do servidor | `page.tsx` (novo) | Virada de mês errada perto da meia-noite | Usar `new Date()` no servidor via `currentMonth`, como o Resumo; granularidade mensal limita o impacto |
| Sem e2e para a aba (AD-005) | - | Fluxo de UI sem cobertura automática | Unit no domínio e na validação, integration na action e no repo; verificação manual de UI no fim |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Onde guardar o resumo | Calculado na leitura, nada derivado no banco | O prazo muda com o tempo; evita dado velho |
| Chave da tabela | `user_id` como PK | Um objetivo por usuário garantido pelo banco |
| Aritmética | `number` (double), não `bigint` | Valores cabem em 2⁵³ e `(1+i)^n` é irracional; o `ceil` final volta a inteiro |
| Schema de validação como função de `now` | `goalSchema(now)` | Regra de idade depende da data de hoje; testável sem relógio |
| Taxa efetiva mensal | `1,08^(1/12) − 1` | Confirmado na spec: 8% a.a. de fato |
