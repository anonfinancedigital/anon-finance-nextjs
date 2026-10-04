# Orçamento Doméstico Design

**Spec**: `.specs/features/orcamento-domestico/spec.md`
**Status**: Approved

---

## Architecture Overview

Monolito Next.js 16 (App Router) na Vercel. Server Components leem dados direto do banco; Server Actions fazem todas as escritas. Não há API REST própria: as únicas rotas HTTP são as do Better Auth (`/api/auth/*`). A regra de negócio (dinheiro, percentuais, resumo, mês) fica em funções puras em `src/lib/domain`, sem dependência de framework, e é a camada mais testada. A persistência usa Drizzle ORM sobre Postgres (Neon via Vercel Marketplace) com o driver `node-postgres`, igual em produção, dev e testes.

```mermaid
graph TD
    B[Browser] -->|GET /?mes=AAAA-MM| P[proxy.ts<br/>checagem otimista do cookie]
    P --> RSC[Server Components<br/>app/(app)/*]
    B -->|form submit| SA[Server Actions<br/>src/actions/*]
    B -->|login/logout| AA[Better Auth<br/>/api/auth/*]
    RSC --> G[requireSession]
    SA --> G
    G --> AA
    SA --> V[Zod schemas<br/>src/lib/validation]
    SA --> D[Domínio puro<br/>src/lib/domain]
    RSC --> D
    SA --> R[Repositórios<br/>src/lib/db/repos]
    RSC --> R
    R --> DB[(Postgres / Neon)]
    AA --> DB
    SA -->|revalidatePath| RSC
    RSC --> CH[Gráficos Recharts<br/>Client Components]
```

**Fluxo de escrita (ex.: criar gasto):** form → Server Action → `requireSession()` → Zod → repositório (INSERT … ON CONFLICT (id) DO NOTHING) → `revalidatePath('/')` → o RSC re-renderiza o resumo sem recarregar a página (SUM-03).

**Fluxo de leitura (resumo):** `page.tsx` lê `?mes=` → `parseMonth` (domínio) → repositório agrega receita e gasto por categoria no intervalo do mês → `buildMonthlySummary` (domínio) → tabela + gráficos.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| Nenhum código existente | - | Projeto novo; o repositório só contém tooling de agentes (`.claude`, `.cursor`, `.windsurf`, `.agents`) |
| Better Auth | lib `better-auth` | Sessão, hashing (scrypt), rotas `/api/auth/*`, adapter Drizzle, plugin `nextCookies` |
| Drizzle ORM + drizzle-kit | lib `drizzle-orm` | Schema tipado, migrações SQL versionadas |
| Zod | lib `zod` | Validação das entradas das Server Actions |
| Recharts | lib `recharts` | Gráficos de barras e pizza (CHT-01) |
| shadcn/ui + Tailwind CSS v4 | gerados em `src/components/ui` | Form, Dialog, Progress, Table, Select |
| `Intl.NumberFormat` / `Intl.DateTimeFormat` | nativo | Formato BRL e mês corrente em America/Sao_Paulo |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Postgres (Neon) | `DATABASE_URL` (string pooled do Neon); Drizzle + `pg.Pool` |
| Better Auth | Tabelas `user`, `session`, `account`, `verification` geradas pelo CLI do Better Auth no mesmo schema Drizzle |
| Vercel | Deploy do app; variáveis `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |

---

## Components

### Domínio: dinheiro e percentual

- **Purpose**: Converter e formatar valores monetários e percentuais sem ponto flutuante.
- **Location**: `src/lib/domain/money.ts`, `src/lib/domain/percent.ts`
- **Interfaces**:
  - `parseBRL(input: string): Result<number /*centavos*/>` - aceita "1.234,56", "1234,5", "1234"; rejeita ≤ 0, > 99_999_999_999 e mais de 2 casas (TRX-02)
  - `formatBRL(cents: number): string` - "R$ 1.234,56" (SUM-01 / AC 7)
  - `parsePercent(input: string): Result<number /*pontos-base*/>` - "12,5" → 1250; rejeita < 1 bp, > 10000 bp ou mais de 2 casas (CAT-01)
  - `formatPercent(bp: number): string` - 1250 → "12,5%"
- **Dependencies**: nenhuma
- **Reuses**: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

### Domínio: mês de referência

- **Purpose**: Resolver o mês exibido e o intervalo de datas do mês.
- **Location**: `src/lib/domain/month.ts`
- **Interfaces**:
  - `currentMonth(now: Date): YearMonth` - mês corrente em America/Sao_Paulo (MON-01 / AC 1)
  - `parseMonth(param: string | undefined, now: Date): YearMonth` - "2026-10" → `{year:2026, month:10}`; inválido ou ausente → mês corrente
  - `monthRange(m: YearMonth): { start: string; endExclusive: string }` - datas ISO `AAAA-MM-DD` para filtro SQL
  - `isValidCalendarDate(iso: string): boolean` - rejeita 29/02 em ano não bissexto (edge case)
- **Dependencies**: nenhuma

### Domínio: categorias e resumo

- **Purpose**: Regras do orçamento: soma de 100% e cálculo do resumo mensal.
- **Location**: `src/lib/domain/budget.ts`
- **Interfaces**:
  - `validateCategorySet(cats: {name: string; bp: number}[]): Result<void>` - soma = 10000 bp; nomes únicos sem diferenciar maiúsculas; nome com 1 a 40 caracteres (CAT-01, CAT-02). Mensagem: "A soma dos percentuais deve ser 100% (atual: X%)"
  - `buildMonthlySummary(input: { categories: Category[]; incomeCents: number; spentByCategory: Map<string, number> }): MonthlySummary` - para cada categoria: `targetCents = Math.round(incomeCents * bp / 10000)`, `spentCents`, `remainingCents = target - spent`, `overspent = spent > target`, `overspentCents = max(0, spent - target)`, `consumedPct`; totais: receita, gasto, saldo (SUM-01, SUM-02)
- **Dependencies**: `money.ts`, `percent.ts`

### Validação de entrada

- **Purpose**: Schemas Zod das Server Actions, que reutilizam os parsers do domínio.
- **Location**: `src/lib/validation/*.ts`
- **Interfaces**:
  - `categorySetSchema`, `transactionSchema` (discriminado por `kind: 'income' | 'expense'`; `categoryId` obrigatório só em `expense`; `description` até 120 caracteres; `id` UUID gerado no cliente)
- **Dependencies**: `zod`, domínio

### Persistência

- **Purpose**: Schema Drizzle, conexão e repositórios com escopo por `userId`.
- **Location**: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/repos/{categories,transactions,login-attempts}.ts`
- **Interfaces**:
  - `categoriesRepo.list(userId): Promise<Category[]>`
  - `categoriesRepo.replaceSet(userId, cats): Promise<Result<void>>` - transação: valida, faz upsert dos itens e apaga os removidos; falha se algum removido tem gastos (CAT-03)
  - `categoriesRepo.countExpenses(categoryId): Promise<number>`
  - `transactionsRepo.create(userId, tx): Promise<void>` - `ON CONFLICT (id) DO NOTHING` (TRX-04)
  - `transactionsRepo.update(userId, id, tx)` / `delete(userId, id)` - last-write-wins (TRX-03)
  - `transactionsRepo.listByMonth(userId, range): Promise<Transaction[]>` - `ORDER BY date DESC, created_at DESC` (TRX-01 / AC 9)
  - `transactionsRepo.monthTotals(userId, range): Promise<{ incomeCents: number; spentByCategory: Map<string, number> }>` - um único `SUM … GROUP BY`
  - `loginAttemptsRepo.countRecentFailures(email, since)` / `recordFailure(email)` / `clear(email)` (AUTH-03)
- **Dependencies**: `drizzle-orm`, `pg`

### Autenticação

- **Purpose**: Sessão, login, logout e guarda de acesso.
- **Location**: `src/lib/auth.ts`, `src/lib/auth-guard.ts`, `src/app/api/auth/[...all]/route.ts`, `src/proxy.ts`, `src/actions/auth.ts`, `scripts/seed-user.ts`
- **Interfaces**:
  - `auth = betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), emailAndPassword: { enabled: true, disableSignUp: true }, session: { expiresIn: 30 dias, updateAge: 1 dia }, plugins: [nextCookies()] })` (AUTH-01)
  - `requireSession(): Promise<{ userId: string }>` - em páginas, redireciona para `/login`; em actions, devolve `{ ok: false, error: 'UNAUTHORIZED' }` sem tocar em dados (AUTH-02)
  - `signInAction(form)` - checa bloqueio (≥ 5 falhas do e-mail em 15 min → "Muitas tentativas. Tente novamente em N minutos"), chama `auth.api.signInEmail`; em falha registra a tentativa e devolve "E-mail ou senha inválidos"; em sucesso limpa as falhas e redireciona para `/` (AUTH-01, AUTH-03)
  - `signOutAction()` (AUTH-01 / AC 5)
  - `proxy.ts`: se não houver cookie de sessão (`getSessionCookie`), redireciona para `/login`. É só UX; a segurança real é o `requireSession` em cada página e action
  - `seed-user.ts`: cria a conta única a partir de `ADMIN_EMAIL` e `ADMIN_PASSWORD`
- **Dependencies**: `better-auth`, repos

### Server Actions de dados

- **Purpose**: Mutações de categorias e transações.
- **Location**: `src/actions/categories.ts`, `src/actions/transactions.ts`
- **Interfaces** (todas retornam `ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }`):
  - `saveCategories(input)`
  - `createTransaction(input)`, `updateTransaction(input)`, `deleteTransaction(id)`
  - Toda action: `requireSession` → Zod → repo → `revalidatePath('/')`. Erro de banco vira "Não foi possível salvar. Tente novamente"
- **Dependencies**: auth-guard, validation, repos

### UI

- **Purpose**: Telas de login, resumo/transações e configuração de categorias.
- **Location**: `src/app/login/page.tsx`, `src/app/(app)/page.tsx` (resumo + lista do mês), `src/app/(app)/categorias/page.tsx`, `src/components/*`
- **Interfaces**:
  - `MonthPicker` - altera `?mes=AAAA-MM` (MON-01)
  - `SummaryTable` - linhas por categoria, `Progress`, destaque e rótulo "Estourou R$ X" (SUM-02)
  - `TransactionForm` (Client) - gera `id = crypto.randomUUID()` ao montar e desabilita o botão durante o envio; mantém os valores digitados em caso de erro (TRX-04, edge case de banco)
  - `TransactionList` - editar via Dialog; excluir com confirmação
  - `CategoryEditor` (Client) - lista editável com a soma ao vivo e o botão salvar bloqueado se ≠ 100%
  - `BudgetCharts` (Client, Recharts) - barras gasto × meta, com a barra estourada em cor distinta e rótulo; pizza omitida quando o gasto é 0 (CHT-01)
  - Estados vazios: "Nenhuma transação neste mês"; sem categorias → link "Crie suas categorias primeiro"
- **Dependencies**: shadcn/ui, Recharts, actions

---

## Data Models

Tabelas do Better Auth (`user`, `session`, `account`, `verification`) são geradas pelo CLI e não são redesenhadas aqui. Tabelas do domínio:

```typescript
// category
interface Category {
  id: string            // uuid, PK
  userId: string        // FK user.id, ON DELETE CASCADE
  name: string          // 1..40 caracteres; UNIQUE (userId, lower(name))
  percentBp: number     // integer, CHECK 1..10000 (pontos-base: 30% = 3000)
  createdAt: Date
}

// transaction
interface Transaction {
  id: string            // uuid gerado no cliente, PK (chave de idempotência)
  userId: string        // FK user.id, ON DELETE CASCADE
  kind: 'income' | 'expense'          // pg enum
  amountCents: number   // bigint, CHECK 1..99_999_999_999
  date: string          // tipo SQL `date` (dia do calendário, sem fuso)
  categoryId: string | null           // FK category.id ON DELETE RESTRICT
  description: string | null          // até 120 caracteres
  createdAt: Date
  updatedAt: Date
}
// CHECK ((kind = 'expense') = (category_id IS NOT NULL))
// INDEX (user_id, date)

// login_attempt
interface LoginAttempt {
  id: number            // serial
  email: string         // em minúsculas
  attemptedAt: Date     // timestamptz
}
// INDEX (email, attempted_at)
```

**Relationships**: `user 1─N category`, `user 1─N transaction`, `category 1─N transaction` (apenas gastos; `RESTRICT` impede apagar categoria com gastos, garantia final de CAT-03). Receita do mês = `SUM(amount_cents) WHERE kind='income' AND date ∈ mês`.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Entrada inválida (valor, data, percentual, nome) | Zod + parsers do domínio → `fieldErrors` | Mensagem no campo; o formulário mantém o que foi digitado |
| Soma ≠ 100% | `validateCategorySet` antes do banco | "A soma dos percentuais deve ser 100% (atual: X%)"; botão salvar desabilitado |
| Excluir categoria com gastos | Pré-checagem `countExpenses` + FK `RESTRICT` como rede | "Esta categoria tem N gastos e não pode ser excluída" |
| Envio duplicado | `ON CONFLICT (id) DO NOTHING` + botão desabilitado | Uma única transação criada |
| Banco indisponível / erro inesperado | try/catch na action, `console.error` com o nome da action | "Não foi possível salvar. Tente novamente"; dados preservados no form |
| Sessão ausente ou expirada | `requireSession` | Página → redireciona para `/login`; action → `UNAUTHORIZED`, sem acesso a dados |
| Login inválido | `signInAction` registra a falha | "E-mail ou senha inválidos" |
| 5 falhas em 15 min | `countRecentFailures` | "Muitas tentativas. Tente novamente em N minutos" |
| `?mes=` inválido | `parseMonth` cai no mês corrente | Mostra o mês corrente |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Server Actions são endpoints POST públicos; `proxy.ts` não é fronteira de segurança | `src/actions/*` (novo) | Escrita sem sessão | `requireSession()` na primeira linha de toda action e página; teste de integração para cada action sem sessão |
| Bloqueio de login com rate-limit em memória não funciona em serverless (várias instâncias) | `src/actions/auth.ts` (novo) | Força bruta contorna o limite | Contagem por e-mail persistida em `login_attempt` no Postgres |
| Spec AUTH-02 fala em "responder 401" para API de dados; o app não tem API REST, só Server Actions | spec AUTH-02 / AC 3 | Teste literal de 401 não se aplica | Desvio aceito: action sem sessão devolve `{ ok:false, error:'UNAUTHORIZED' }`. As rotas `/api/auth/*` do Better Auth mantêm seu próprio 401 |
| Criar a conta com `disableSignUp: true` pode bloquear também `auth.api.signUpEmail` no seed | `scripts/seed-user.ts` (novo) | Seed falha | Não verificado na doc: o seed vai usar o hash do Better Auth (`better-auth/crypto`) e inserir `user` + `account` direto. Validar a API exata na implementação |
| Arredondamento: a soma das metas em centavos pode diferir da receita em ±1 centavo por categoria | `src/lib/domain/budget.ts` (novo) | Total de metas ≠ receita por centavos | Aceito e documentado; os testes fixam `Math.round` por categoria |
| Docker local sem o plugin `compose` (Docker 20.10) | ambiente dev | `docker compose up` falha | Script `npm run db:up` com `docker run postgres:17` |
| Node local v20.20 | ambiente dev | Next 16 exige Node ≥ 20.9 | Compatível; fixar `engines.node >=20.9` |

---

## Testing Strategy

| Layer | Tool | Covers |
| ----- | ---- | ------ |
| Domínio (puro) | Vitest | money, percent, month, budget: todos os limites da spec |
| Integração (actions + repos + Postgres real) | Vitest + Postgres em Docker (banco `orcamento_test`, migrações aplicadas e truncate entre testes) | CAT-01..03, TRX-01..04, SUM-03 (`revalidatePath` mockado), AUTH-02, AUTH-03 |
| E2E | Playwright no `next build && next start` | Login, criar categorias, lançar gasto, ver resumo/estouro, trocar mês, gráficos visíveis |

Gate por task: `npm run typecheck && npm run lint && npm test` (mais `npm run e2e` nas tasks de UI).

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Biblioteca de auth | Better Auth (e não Auth.js) | Auth.js está em modo manutenção desde set/2025 e o v5 nunca saiu do beta; Better Auth tem adapter Drizzle e scrypt nativos |
| Driver de banco | `drizzle-orm/node-postgres` + `pg.Pool` em todos os ambientes | Mesmo driver em testes e produção; suporta transações interativas (`replaceSet`) |
| Idempotência | UUID gerado no cliente como PK | Resolve o duplo envio (TRX-04) sem tabela extra nem janela de tempo |
| Coluna `date` em vez de `timestamptz` | Dia do calendário | O mês da transação é o dia escolhido pelo usuário; elimina o edge case de 23:30 em America/Sao_Paulo |
| Percentual em pontos-base inteiros | 30% = 3000 | Soma exata = 10000 sem erro de float; suporta 2 casas decimais |
| Categorias salvas em conjunto | `saveCategories` substitui o conjunto inteiro em uma transação | A regra de 100% vale para o conjunto, não para a categoria isolada |
| Mês na URL | `?mes=AAAA-MM` | Persiste no reload (MON-01 / AC 5) e funciona com RSC sem estado no cliente |
