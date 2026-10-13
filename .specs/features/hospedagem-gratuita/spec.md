# Hospedagem gratuita Specification

## Problem Statement

O plano `docs/hospedagem-gratuita.md` coloca o app no ar a custo zero (Vercel Hobby, Neon Free, Brevo, GitHub Actions) para ~1000 usuários ativos por dia. Quatro lacunas do repositório impedem esse deploy: o pool do `pg` não tem limite (cada instância serverless abriria 10 conexões), não existe endpoint de health check para o monitor de uptime, `BETTER_AUTH_URL` errada quebra em silêncio o link de recuperação de senha, e não há backup do banco fora do Neon (cujo histórico gratuito é curto).

## Goals

- [ ] Na Vercel, cada instância do app abre no máximo 3 conexões ao banco.
- [ ] `GET /api/health` responde 200 sem sessão e sem consultar o banco.
- [ ] Em produção, nenhum e-mail de recuperação de senha sai com link que não seja `https://`.
- [ ] Um dump diário criptografado do banco fica guardado fora do Neon por 30 dias.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Criar contas, MFA, Neon, Vercel, Brevo, UptimeRobot, Sentry | Runbook manual no doc, não é código |
| Cloudflare R2 como destino do backup | Escolha do usuário: artifact do GitHub Actions (seção 7.4 do doc) |
| Workflow de migration automático | Escolha do usuário: `npm run db:migrate` manual contra a conexão direct |
| Teste de restauração (seção 7.5) | Procedimento manual; o doc registra a data |
| Domínio próprio, Cloudflare DNS/WAF, SPF/DKIM/DMARC | Custa dinheiro; fica para depois |
| Health check que consulta o banco | O doc pede 200 sem consultar o banco, para não acordar o Neon |
| Termos de uso e avaliação de LGPD | Texto e decisão jurídica, não código |
| Teste e2e | Suspenso (AD-005) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Entregas de código | Pool, health check, `BETTER_AUTH_URL`, workflow de backup | Escolha do usuário | y |
| Destino do backup | Artifact do GitHub Actions | Escolha do usuário | y |
| Migration | Manual, sem workflow | Escolha do usuário | y |
| Como detectar a Vercel | `process.env.VERCEL` definido e não vazio | Variável que a Vercel injeta; é o critério já usado no doc | n |
| Teto de conexões | 3 na Vercel, 10 fora; `idleTimeoutMillis` 10000 em ambos | Valores do doc (5.1); o pooler do Neon absorve o fan-in | y |
| Health check e o proxy | `/api/health` entra em `PUBLIC_PATHS` de `route-decision.ts`; o proxy continua rodando nele (recebe CSP e `Cache-Control` normais de rota pública) | Hoje o proxy redireciona anônimos de qualquer rota fora da lista para `/login` | n |
| Corpo da resposta do health | `{"status":"ok"}` com `Content-Type: application/json` | Valor mínimo para o monitor; não expõe versão nem ambiente | n |
| Método do health | Só `GET`; outros métodos recebem 405 do Next | Padrão de route handler | n |
| BETTER_AUTH_URL inválida em produção | A ação de pedir recuperação ainda devolve `{ ok: true }`, não envia o e-mail e registra o erro via `logActionError` | Manter a resposta uniforme (sem revelar se o e-mail existe) e tornar a falha visível no Sentry | n |
| Definição de URL válida | `new URL(valor)` não lança e `protocol` é `https:`; só exigida quando `NODE_ENV` é `production` | Dev e testes usam `http://localhost` | n |
| Versão do cliente `pg_dump` | Instalar `postgresql-client-18` do repositório oficial PGDG; a versão fica em uma variável no topo do workflow | O projeto Neon do usuário roda Postgres 18 (confirmado pelo usuário); o doc exige cliente igual ou maior que o servidor | y |
| Retenção do artifact | 30 dias (`retention-days: 30`) | Piso do intervalo 30 a 90 do doc; limita o uso da cota de 500 MB de armazenamento | n |
| Falha do backup | O job falha (exit ≠ 0) e o GitHub avisa por e-mail o autor do workflow | Notificação nativa do Actions, como pede a seção 10 do doc | y |
| Verificação | Pool e validação da URL em funções puras com teste unitário; health e workflow por teste que lê o arquivo; sem e2e | AD-005 e regra do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Pool de conexões adequado ao serverless ⭐ MVP

**User Story**: As a mantenedor, I want the connection pool capped on Vercel so that many serverless instances don't exhaust the Neon free-plan connections.

**Why P1**: Sem o teto, o primeiro pico de tráfego derruba o banco gratuito.

**Acceptance Criteria**:

1. WHERE `VERCEL` is set to a non-empty value the system SHALL create the pool with `max` equal to 3.  <!-- optional-feature -->
2. WHERE `VERCEL` is unset or empty the system SHALL create the pool with `max` equal to 10.  <!-- optional-feature -->
3. The system SHALL create the pool with `idleTimeoutMillis` equal to 10000.  <!-- ubiquitous -->
4. The system SHALL create the pool with `connectionString` taken from `DATABASE_URL`.  <!-- ubiquitous -->

**Independent Test**: Chamar a função pura de opções com `{ VERCEL: "1" }` e com `{}` e conferir `max` 3 e 10.

---

### P1: Health check para o monitor de uptime ⭐ MVP

**User Story**: As a mantenedor, I want a public health endpoint so that UptimeRobot can alert me when the app is down without waking the database.

**Why P1**: É o único sinal de queda do plano gratuito.

**Acceptance Criteria**:

1. WHEN an anonymous client sends `GET /api/health` THEN the system SHALL respond with status 200 and body `{"status":"ok"}`.  <!-- event-driven -->
2. WHEN an anonymous client sends `GET /api/health` THEN the system SHALL NOT redirect to `/login`.  <!-- event-driven -->
3. WHEN `GET /api/health` is handled THEN the system SHALL NOT open a database connection.  <!-- event-driven -->
4. WHEN `GET /api/health` is handled THEN the system SHALL respond with `Cache-Control: no-store`.  <!-- event-driven -->
5. The system SHALL keep every other path outside `PUBLIC_PATHS` redirecting anonymous requests to `/login`.  <!-- ubiquitous -->

**Independent Test**: `decideRoute("/api/health", false)` devolve `next`; chamar o `GET` do handler e conferir status, corpo e que o módulo `db/client` não é importado.

---

### P1: Link de recuperação de senha só sai com URL pública válida ⭐ MVP

**User Story**: As a administrador, I want a misconfigured `BETTER_AUTH_URL` to be caught so that users never receive a broken reset link.

**Why P1**: O doc (5.3) aponta a URL errada como causa de link quebrado no e-mail.

**Acceptance Criteria**:

1. WHILE `NODE_ENV` is `production`, IF `BETTER_AUTH_URL` is unset, empty, unparseable by `new URL`, or has a protocol other than `https:` THEN the system SHALL NOT send the reset e-mail.  <!-- complex -->
2. WHILE `NODE_ENV` is `production`, IF `BETTER_AUTH_URL` is invalid THEN the system SHALL log the failure through `logActionError` with the action name `requestPasswordResetAction: baseUrl`.  <!-- complex -->
3. WHILE `NODE_ENV` is `production`, IF `BETTER_AUTH_URL` is invalid THEN the system SHALL still return `{ ok: true }` to the caller.  <!-- complex -->
4. WHILE `NODE_ENV` is `production`, WHEN `BETTER_AUTH_URL` is a valid `https:` URL THEN the system SHALL send the reset e-mail with a link built on that URL.  <!-- complex -->
5. WHILE `NODE_ENV` is not `production` the system SHALL accept an `http:` `BETTER_AUTH_URL` and send the reset e-mail.  <!-- state-driven -->

**Independent Test**: Teste unitário da função pura de validação com `https://app.vercel.app` (válida), `http://app.vercel.app`, `""` e `"app"` (inválidas) em produção; `http://localhost:3000` válida fora dela.

---

### P2: Backup diário criptografado do banco

**User Story**: As a mantenedor, I want a daily encrypted `pg_dump` kept outside Neon so that a bad migration or accidental delete doesn't lose everyone's data.

**Why P2**: Protege os dados, mas o app sobe sem ele; o doc o exige antes de abrir ao público.

**Acceptance Criteria**:

1. The system SHALL provide `.github/workflows/backup.yml` triggered by `schedule` with cron `0 5 * * *` and by `workflow_dispatch`.  <!-- ubiquitous -->
2. WHEN the backup workflow runs THEN the system SHALL run `pg_dump --format=custom --no-owner` against the secret `NEON_DIRECT_URL` and encrypt the stream with `age` using the secret `BACKUP_AGE_PUBLIC_KEY` before it touches disk.  <!-- event-driven -->
3. WHEN the dump is encrypted THEN the system SHALL upload it as an artifact named `orcamento-<UTC yyyymmddThhmmssZ>.dump.age` with `retention-days` equal to 30.  <!-- event-driven -->
4. IF `pg_dump`, `age` or the upload fails THEN the system SHALL fail the job with a non-zero exit code.  <!-- unwanted-behavior -->
5. IF the encrypted file is empty THEN the system SHALL fail the job before the upload.  <!-- unwanted-behavior -->
6. The system SHALL install a `pg_dump` client whose major version is at least the Neon server major version, set by one variable at the top of the workflow.  <!-- ubiquitous -->
7. The system SHALL NOT write the connection string, the dump in clear text or the private key to the job log or to an artifact.  <!-- ubiquitous -->

**Independent Test**: Teste que lê o YAML e confere cron, `workflow_dispatch`, `set -euo pipefail`, `retention-days: 30` e a ausência de `echo` de secrets; execução real via `workflow_dispatch` fica no runbook.

---

## Edge Cases

- IF `VERCEL` is the empty string THEN the system SHALL treat it as unset and use `max` 10.
- IF `GET /api/health` receives a query string THEN the system SHALL respond as without it.
- IF `/api/healthz` or `/api/health-x` is requested anonymously THEN the system SHALL redirect to `/login` (o prefixo público casa só `/api/health` e `/api/health/...`).
- WHEN `BETTER_AUTH_URL` ends with a trailing slash THEN the system SHALL build the reset link without a double slash.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| HOSTING-01 | P1: pool — `max` 3 na Vercel | - | Implementing |
| HOSTING-02 | P1: pool — `max` 10 fora da Vercel | - | Implementing |
| HOSTING-03 | P1: pool — `idleTimeoutMillis` 10000 | - | Implementing |
| HOSTING-04 | P1: pool — `connectionString` de `DATABASE_URL` | - | Implementing |
| HOSTING-05 | P1: health — 200 e corpo | - | Implementing |
| HOSTING-06 | P1: health — sem redirect ao login | - | Implementing |
| HOSTING-07 | P1: health — sem conexão ao banco | - | Implementing |
| HOSTING-08 | P1: health — `Cache-Control: no-store` | - | Implementing |
| HOSTING-09 | P1: health — demais rotas continuam protegidas | - | Implementing |
| HOSTING-10 | P1: URL — inválida não envia e-mail | - | Pending |
| HOSTING-11 | P1: URL — inválida registra o erro | - | Pending |
| HOSTING-12 | P1: URL — inválida ainda devolve `ok: true` | - | Pending |
| HOSTING-13 | P1: URL — válida envia o e-mail | - | Pending |
| HOSTING-14 | P1: URL — fora de produção aceita `http:` | - | Pending |
| HOSTING-15 | P2: backup — gatilhos | - | Pending |
| HOSTING-16 | P2: backup — dump criptografado em fluxo | - | Pending |
| HOSTING-17 | P2: backup — artifact com retenção de 30 dias | - | Pending |
| HOSTING-18 | P2: backup — falha derruba o job | - | Pending |
| HOSTING-19 | P2: backup — arquivo vazio derruba o job | - | Pending |
| HOSTING-20 | P2: backup — versão do cliente | - | Pending |
| HOSTING-21 | P2: backup — sem vazamento de segredo | - | Pending |

**Coverage:** 21 total, 0 mapped to tasks, 21 unmapped ⚠️

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run test:unit` e `npm run test:int` passam com as mudanças.
- [ ] Rodar `workflow_dispatch` do backup produz um artifact `.dump.age` que o `age -d` abre com a chave privada.
- [ ] Um pedido de recuperação de senha em produção com `BETTER_AUTH_URL` correta entrega e-mail com link `https://` que abre `/redefinir-senha`.
