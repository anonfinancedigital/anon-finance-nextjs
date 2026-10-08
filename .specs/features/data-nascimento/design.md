# Data de Nascimento no Cadastro Design

**Spec**: `.specs/features/data-nascimento/spec.md`
**Status**: Draft

---

## Architecture Overview

`user.birth_date` (nullable `date`) vira a fonte única. O objetivo de Liberdade mantém o tipo de domínio `Goal.birthDate` e o formulário mantém `GoalFormValues.birthDate` (texto `DD/MM/AAAA`), mas o valor passa a vir do usuário e deixa de ser editável no formulário. Assim `freedom.ts`, `summarize`, `goalSchema` e a prévia do simulador não mudam (NASC-15, AD-008 preservada: nenhum import de servidor em `freedom.ts` ou `validation/goal.ts`).

Três mudanças estruturais:

1. **Validação da data extraída** para `src/lib/validation/birth-date.ts` (`parseBirthDate(text, now)`), usada por `goalSchema`, pelo cadastro e pela action de `/data-nascimento`; as quatro mensagens vivem num só lugar.
2. **Guard de data no layout `(app)`**: `/data-nascimento` fica **fora** do grupo `(app)` (sem o shell), então o layout redireciona sem precisar de pathname e sem laço.
3. **Servidor é a verdade da data no objetivo**: `saveGoal` ignora o `birthDate` enviado pelo cliente e usa o do banco.

```mermaid
graph TD
    SU[/cadastro SignupForm/] --> SA[signUpAction] --> PB[parseBirthDate] 
    SA --> CP[usersRepo.createPending + birthDate]
    L[(app)/layout] --> GB[usersRepo.getBirthDate] -->|NULL| DN[/data-nascimento/]
    DN --> UA[saveBirthDateAction] --> PB
    UA --> GR[goalsRepo.get: retirementAge] 
    UA --> SB[usersRepo.setBirthDate]
    LP[/liberdade page/] --> GB
    LP --> GE[GoalExperience birthDate] --> GF[GoalFields: texto + link]
    SG[saveGoal] --> GB
    SG --> GS[goalSchema + birthDate do usuário] --> UP[goalsRepo.upsert sem birth_date]
```

Decisões ativas respeitadas: AD-001 (Server Components leem), AD-005 (sem e2e novo), AD-008 (domínio isomórfico), AD-009 (acesso = `status approved`; o guard de data é só redirecionamento de páginas, não substitui o status).

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `brToIso`, `isoToBR`, `maskDateInput` | `src/lib/domain/date-br.ts` | Conversão e máscara da data |
| `ageOn`, `YearMonthDay` | `src/lib/domain/freedom.ts` | Idade atual (aniversário de 29/02 já tratado) |
| `today(now)` | `src/lib/validation/goal.ts` | Dia de hoje em America/Sao_Paulo |
| Regras de nascimento (vazio, inválida, futura, > 120) | `goalSchema` em `src/lib/validation/goal.ts:66-85` | Movidas para `parseBirthDate`; `goalSchema` passa a chamá-la |
| `signupSchema` / `signUpAction` / `SignupForm` | `src/lib/validation/signup.ts`, `src/actions/auth.ts`, `src/app/cadastro/signup-form.tsx` | Ganham o campo |
| `usersRepo` | `src/lib/db/repos/users.ts` | `createPending` recebe `birthDate`; novos `getBirthDate` e `setBirthDate` |
| `requireSessionForPage/Action` | `src/lib/auth-guard.ts` | Guards das novas página e action |
| `ActionResult`, `invalidInput`, `SAVE_FAILED` | `src/lib/action-result.ts` | Respostas da action |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Postgres | Migração `0013`: `ALTER TABLE "user" ADD "birth_date" date`; `UPDATE "user" u SET birth_date = g.birth_date FROM financial_goal g WHERE g.user_id = u.id`; `ALTER TABLE financial_goal DROP COLUMN birth_date` |
| Better Auth | Nenhuma. A data **não** vira `additionalField`: é lida por `usersRepo.getBirthDate`, e o cliente nunca consegue defini-la por endpoint público (cobre o edge case de `input: false`) |
| `proxy.ts` | `/data-nascimento` já exige cookie de sessão pelo matcher; sem mudança |

---

## Components

### `parseBirthDate` (validação)

- **Purpose**: Texto `DD/MM/AAAA` → `{ iso, age }` ou erro com a mensagem exata da spec.
- **Location**: `src/lib/validation/birth-date.ts`
- **Interfaces**:
  - `parseBirthDate(text: string, now: Date): Result<{ iso: string; age: number }>` - ordem: vazio → "Informe a data de nascimento"; formato/calendário → "Data de nascimento inválida"; futura → "A data de nascimento não pode ser futura"; idade > 120 → "A idade atual deve ser de no máximo 120 anos"
  - `MAX_AGE = 120` exportada para `goal.ts`
- **Dependencies**: `brToIso`, `ageOn`, `today`
- **Reuses**: o trecho hoje inline em `goalSchema`. `today` mora em `goal.ts` e importaria `birth-date.ts` de volta: mover `today`/`isoOf` para `birth-date.ts` e reexportar `today` em `goal.ts` (imports existentes continuam válidos).

### Cadastro

- **Purpose**: pedir e validar a data (NASC-01 a NASC-07).
- **Location**: `signup.ts`, `signup-form.tsx`, `actions/auth.ts`, `users.ts`
- **Interfaces**:
  - `signupSchema` ganha `birthDate: z.string(...)` com `superRefine` que chama `parseBirthDate(value, new Date())` e emite a mensagem no path `birthDate`; o `transform` final devolve `birthDate` em ISO. `signupSchema` continua constante (testes atuais não quebram); o `new Date()` fica dentro da refinement.
  - `usersRepo.createPending({ name, email, password, birthDate })` grava `birth_date` no mesmo `insert` da transação.
  - `SignupForm`: campo "Data de nascimento" entre E-mail e Senha, `inputMode="numeric"`, `placeholder="DD/MM/AAAA"`, `maskDateInput`, erro em `fieldErrors.birthDate`, `autoComplete="bday"`.
- **Reuses**: padrão de campos do `SignupForm`; `maskDateInput`.

### Guard e página de data

- **Purpose**: NASC-08 a NASC-10, NASC-16 a NASC-18.
- **Location**: `src/app/(app)/layout.tsx`, `src/app/data-nascimento/{page,birth-date-form}.tsx`, `src/actions/profile.ts`
- **Interfaces**:
  - Layout: após `requireSessionForPage()`, `if ((await usersRepo.getBirthDate(userId)) === null) redirect("/data-nascimento")`.
  - Página: `requireSessionForPage()`; pré-preenche com `isoToBR(data)` quando existe; usa o `Logo` e um cartão simples, sem o shell; link "Voltar" para `/liberdade` quando a pessoa já tinha data.
  - `saveBirthDateAction(prev, formData): Promise<ActionResult>` (useActionState): `requireSessionForAction` → `parseBirthDate` → se há objetivo (`goalsRepo.get`) e `age >= goal.retirementAge` recusa com a mensagem de NASC-18 (N = `retirementAge`) → `usersRepo.setBirthDate(userId, iso)`. Sucesso sem data anterior: `redirect("/")` (NASC-09); com data anterior: `{ ok: true }` e o formulário mostra "Data de nascimento atualizada" (NASC-17). `revalidatePath("/liberdade")`.
  - `usersRepo.getBirthDate(id): Promise<string | null>`; `usersRepo.setBirthDate(id, iso): Promise<void>`.
- **Reuses**: `useActionState` do `SignupForm`, `PageHeader`/cartão existentes.

### Objetivo de Liberdade

- **Purpose**: NASC-12 a NASC-15.
- **Location**: `goals.ts` (repo e action), `liberdade/page.tsx`, `goal-experience.tsx`, `goal-fields.tsx`, `goal-draft.ts`
- **Interfaces**:
  - `goalsRepo.get(userId)` junta `user` e devolve `Goal` com `birthDate` do usuário; `null` se não há objetivo **ou** o usuário não tem data (estado inalcançável após o guard, mas evita um `Goal` inválido). `goalsRepo.upsert` deixa de gravar `birthDate`: `upsert(userId, goal: Omit<Goal, "birthDate">)`.
  - `saveGoal`: `birthDate = await usersRepo.getBirthDate(userId)`; `null` → `{ ok: false, error: "Informe sua data de nascimento antes de salvar o objetivo" }`; senão faz `goalSchema(now).safeParse({ ...input, birthDate: isoToBR(birthDate) })` (o `birthDate` do cliente é descartado).
  - `FreedomPage`: lê `getBirthDate`, passa `birthDate` (BR) a `GoalExperience`; `initial` e o estado em branco usam esse valor.
  - `GoalFields`: troca o `Input` de nascimento por texto com a data e o link "Alterar data de nascimento" (`/data-nascimento`); mantém o cálculo de `currentAge` e do slider a partir de `values.birthDate`.
  - `evaluateDraft`: `birthDate` sai de `FIELDS` (não é editável), para não marcar `dirty` quando o valor em branco difere do inicial.
- **Reuses**: tudo de `freedom.ts`/`summarize` inalterado.

---

## Data Models

```typescript
// src/lib/db/auth-schema.ts, tabela user (coluna manual, como status/decided_at)
birthDate: date("birth_date", { mode: "string" }),   // nullable; 'AAAA-MM-DD'

// src/lib/db/schema.ts, financial_goal: remove birthDate
```

**Relationships**: `financial_goal.user_id → user.id` (já existe). A data sai de `financial_goal` e passa a ser lida do `user` por join.

**Migração `0013_user_birth_date.sql`** (escrita à mão, um arquivo, ordem importa):
1. `ALTER TABLE "user" ADD COLUMN "birth_date" date;`
2. `UPDATE "user" SET "birth_date" = g."birth_date" FROM "financial_goal" g WHERE g."user_id" = "user"."id";`
3. `ALTER TABLE "financial_goal" DROP COLUMN "birth_date";`

Reversão: não há; a coluna dropada só se reconstrói a partir de `user.birth_date`. Fazer backup antes de aplicar em produção (ação do usuário, não automática).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Data inválida/futura/>120/vazia (cadastro, `/data-nascimento`) | `parseBirthDate` devolve a mensagem; `invalidInput` mapeia ao campo `birthDate` | Mensagem sob o campo |
| Nova data viola o objetivo salvo | Recusa antes de gravar, com N = `retirementAge` | Mensagem de NASC-18 sob o campo; data anterior mantida |
| `saveGoal` sem data no usuário | Erro geral sem gravar | "Informe sua data de nascimento antes de salvar o objetivo" |
| Falha de banco | `console.error` + `SAVE_FAILED` | "Não foi possível salvar. Tente novamente" |
| Sem sessão aprovada | `UNAUTHORIZED` / redirect `/login` | Padrão atual |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Migração destrutiva (DROP COLUMN) | `src/lib/db/schema.ts:160` | Perda de dado se o UPDATE falhar antes do DROP | Uma migração com os 3 passos na ordem; Drizzle roda em transação; backup antes de aplicar em produção; teste de integração da cópia |
| `auth-schema.ts` é gerado e já tem colunas manuais | `src/lib/db/auth-schema.ts:7-8` | Regenerar apaga `birth_date` | Comentário do cabeçalho passa a citar `birth_date`; AD-009 já registra o risco |
| Testes que gravam `birthDate` em `financial_goal` | `src/lib/db/repos/users.int.test.ts:305`, `src/actions/admin-users.int.test.ts:171`, `goals.int.test.ts` | Quebram com a coluna removida | Task de migração ajusta os helpers para gravar a data no `user`; sem enfraquecer asserts |
| `today` importado de `goal.ts` em vários lugares | `src/components/goal-fields.tsx:20` | Ciclo de import ao extrair | `today` vai para `birth-date.ts` e é reexportado por `goal.ts` |
| Prévia do simulador no cliente depende da data | `src/lib/validation/goal-draft.ts` | Data ausente deixa a prévia inválida | `FreedomPage` sempre passa a data (guard garante não nula); `birth-date.ts` sem import de servidor |
| `goal-empty-state.tsx` tem exemplo fixo com `birthDate` | `src/components/goal-empty-state.tsx:36` | Nenhum (dado de exemplo, não de usuário) | Manter como está |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Onde guardar o guard de data | Layout `(app)` + página fora do grupo | Evita ler pathname e laço de redirect sem middleware (`proxy.ts` é só otimista) |
| Data fora do Better Auth | Coluna lida por `usersRepo`, sem `additionalFields` | Sem risco de o cliente definir o campo; sem depender do tipo que a lib devolve para `date` |
| Manter `Goal.birthDate` e `GoalFormValues.birthDate` | Valor vem do usuário, não editável no formulário | Zero mudança em `freedom.ts`, `summarize` e na prévia (NASC-15) |
| `signupSchema` continua constante | `new Date()` dentro da refinement | Não quebra `signup.test.ts` nem a assinatura; a data é verificada no servidor de qualquer forma |
| Abordagens consideradas | (A) escolhida: fonte única no `user` com `Goal` inalterado; (B) tirar `birthDate` do domínio e passar idade para `freedom.ts`: mais limpo, mas muda todas as fórmulas e testes sem ganho para a feature | Escopo contido |

> Nenhuma decisão aqui vira `AD` novo: não há convenção nova além da escolha de `birth_date` como fonte única, já registrada na spec.
