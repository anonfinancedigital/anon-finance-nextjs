# Hospedagem gratuita Validation

**Date**: 2026-10-13
**Spec**: `.specs/features/hospedagem-gratuita/spec.md`
**Diff range**: `7fedc78..559f2bd` (commits 1faac80..94ab249, T1-T8, mais o fix 559f2bd)
**Iteration**: re-verify 1 de 3 (fix de M16 e M25)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS (21/21 ACs com evidência `file:line`; 25/25 mutações distintas mortas ao fim da rodada 2; os 8 int que falham na árvore real vêm de edições não commitadas de outra sessão, alheias à feature)

**Result**: PASS

> Rodada 1 (`7fedc78..94ab249`) deu FAIL por M16 e M25. O fix `559f2bd` adicionou `src/lib/db/client.test.ts` e a proibição de `set +e/+o`. Na rodada 2 os dois mutantes morrem.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `src/lib/db/pool-options.ts` + teste |
| T2 | ✅ Done | `src/lib/db/client.ts:9` usa `poolOptions(process.env)`; wiring coberto por `src/lib/db/client.test.ts` (fix 559f2bd) |
| T3 | ✅ Done | `src/lib/route-decision.ts:10` |
| T4 | ✅ Done | `src/app/api/health/route.ts:3-5` |
| T5 | ✅ Done | `src/lib/base-url.ts` |
| T6 | ✅ Done | `src/actions/password-reset.ts:42-50` |
| T7 | ✅ Done | `.github/workflows/backup.yml` |
| T8 | ✅ Done | `docs/hospedagem-gratuita.md` |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| HOSTING-01 | `max` 3 com `VERCEL` não vazio | `src/lib/db/pool-options.test.ts:6` - `expect(poolOptions({ VERCEL: "1" }).max).toBe(3)`; wiring `src/lib/db/client.test.ts:18-22` - `expect(poolCtor).toHaveBeenCalledWith({ connectionString, max: 3, idleTimeoutMillis: 10_000 })` | ✅ PASS |
| HOSTING-02 | `max` 10 sem `VERCEL` ou vazio | `src/lib/db/pool-options.test.ts:10` - `expect(poolOptions({}).max).toBe(10)`; `:14` - `expect(poolOptions({ VERCEL: "" }).max).toBe(10)`; wiring `src/lib/db/client.test.ts:29` - `toHaveBeenCalledWith(expect.objectContaining({ max: 10 }))` com `VERCEL=""` | ✅ PASS |
| HOSTING-03 | `idleTimeoutMillis` 10000 nos dois ambientes | `src/lib/db/pool-options.test.ts:18-19` - `.idleTimeoutMillis).toBe(10000)` (com e sem VERCEL); wiring `src/lib/db/client.test.ts:18-22` | ✅ PASS |
| HOSTING-04 | `connectionString` de `DATABASE_URL` | `src/lib/db/pool-options.test.ts:23` - `.connectionString).toBe("postgres://u:p@h:1/d")`; wiring `src/lib/db/client.test.ts:18-19` | ✅ PASS |
| HOSTING-05 | 200, corpo `{"status":"ok"}`, JSON | `src/app/api/health/route.test.ts:13` - `expect(response.status).toBe(200)`; `:14` - `toContain("application/json")`; `:15` - `toEqual({ status: "ok" })` | ✅ PASS |
| HOSTING-06 | anônimo não é redirecionado a `/login` | `src/lib/route-decision.test.ts:84` - `expect(decideRoute("/api/health", false)).toEqual({ action: "next", noStore: false })`; `src/proxy.ts:13` só redireciona em `action === "redirect"` | ✅ PASS |
| HOSTING-07 | não abre conexão ao banco | `src/app/api/health/route.test.ts:4` - `vi.mock("@/lib/db/client", () => { throw ... })` antes de `import("./route")`; `src/app/api/health/route.ts` não tem import | ✅ PASS (guarda cobre o módulo `db/client`, não um `import "pg"` direto) |
| HOSTING-08 | `Cache-Control: no-store` | `src/app/api/health/route.test.ts:20` - `expect(response.headers.get("Cache-Control")).toBe("no-store")`; proxy não sobrescreve (rota pública, `noStore: false`, `src/proxy.ts:30`) | ✅ PASS |
| HOSTING-09 | demais rotas fora de `PUBLIC_PATHS` → `/login` | `src/lib/route-decision.test.ts:89` - `/api/healthz` e `/api/health-x` → `toEqual({ action: "redirect", to: "/login", noStore: true })`; `:94` - `/transacoes` idem | ✅ PASS |
| HOSTING-10 | produção + URL ausente/vazia/inválida/não-https → sem e-mail | `src/lib/base-url.test.ts:10,14,18,22,26` - `toBeNull()` para http, `""`, `undefined`, `"app"`, `ftp:`; `src/actions/password-reset.int.test.ts:203` - `expect(sendMail).not.toHaveBeenCalled()` (http e vazio) | ✅ PASS |
| HOSTING-11 | `logActionError` com nome `requestPasswordResetAction: baseUrl` | `src/actions/password-reset.int.test.ts:204` - `toHaveBeenCalledTimes(1)`; `:205-207` - `mock.calls[0][0]).toBe("requestPasswordResetAction: baseUrl")` | ✅ PASS |
| HOSTING-12 | ainda devolve `{ ok: true }` | `src/actions/password-reset.int.test.ts:202` - `expect(result).toEqual({ ok: true })` | ✅ PASS |
| HOSTING-13 | produção + https → e-mail com link nessa URL | `src/lib/base-url.test.ts:6` - `toBe("https://app.vercel.app")`; `src/actions/password-reset.int.test.ts:218` - `sendMail` 1 vez; `:219-221` - `text).toContain("https://app.vercel.app/redefinir-senha?token=")` | ✅ PASS |
| HOSTING-14 | fora de produção aceita `http:` e envia | `src/lib/base-url.test.ts:36-37` - `toBe("http://localhost:3000")` (development, test); `src/actions/password-reset.int.test.ts:231-233` - `sendMail` 1 vez, link `http://localhost:3100/redefinir-senha?token=` | ✅ PASS |
| HOSTING-15 | cron `0 5 * * *` + `workflow_dispatch` | `src/lib/backup-workflow.test.ts:10` - `toMatch(/^on:\n {2}schedule:\n {4}- cron: "0 5 \* \* \*"/m)`; `:11` - `toMatch(/^ {2}workflow_dispatch:/m)` | ✅ PASS |
| HOSTING-16 | `pg_dump --format=custom --no-owner` de `NEON_DIRECT_URL`, `age` com `BACKUP_AGE_PUBLIC_KEY`, em fluxo | `src/lib/backup-workflow.test.ts:15-17` - linha exata do pipe; `:18-19` - env dos dois secrets; `:66-67` - pipe direto para `> "$f"`, sem `-f/--file`; impl. `.github/workflows/backup.yml:38` | ✅ PASS |
| HOSTING-17 | artifact `orcamento-<UTC yyyymmddThhmmssZ>.dump.age`, `retention-days: 30` | `src/lib/backup-workflow.test.ts:23` - `f="orcamento-$(date -u +%Y%m%dT%H%M%SZ).dump.age"`; `:25-26` - name/path do output; `:27` - `toContain("retention-days: 30")` | ✅ PASS |
| HOSTING-18 | falha de `pg_dump`, `age` ou upload derruba o job | `src/lib/backup-workflow.test.ts:32` - 2 linhas `set -euo pipefail`; `:33` - `if-no-files-found: error`; `:34-35` - sem `continue-on-error` / `\|\| true`; `:36` - `expect(workflow).not.toMatch(/set\s+\+[eo]/)` | ✅ PASS (M25 morto na rodada 2) |
| HOSTING-19 | arquivo cifrado vazio → falha antes do upload | `src/lib/backup-workflow.test.ts:41-43` - `if [ ! -s "$f" ]` entre `pg_dump` e upload, com `exit 1` | ✅ PASS (ver nota de precisão abaixo) |
| HOSTING-20 | cliente `pg_dump` ≥ servidor (18), uma variável no topo | `src/lib/backup-workflow.test.ts:47` - `toMatch(/^env:\n {2}PG_VERSION: 18$/m)`; `:48` - antes de `jobs:`; `:49-50` - pacote usa `${PG_VERSION}`, nenhum número fixo | ✅ PASS |
| HOSTING-21 | sem connection string, dump em claro ou chave privada no log/artifact | `src/lib/backup-workflow.test.ts:58` - nenhum `echo/cat/printf` com secret; `:60` - sem `${{ secrets.` fora de `env:`; `:62` - sem `set -x`; `:66-69` - um único `pg_dump`, direto no `age`, nenhum `.dump` em claro; a chave privada não aparece no workflow | ✅ PASS |

**Status**: ✅ Todos os ACs cobertos (os gaps da rodada 1 foram fechados em 559f2bd). Nenhum AC sem evidência `file:line`.

**Regra payload/conjunção**: HOSTING-10 lista 4 condições (ausente, vazia, não parseável, protocolo ≠ https). As 4 + `ftp:` estão em unit (`base-url.test.ts:10-26`); no nível da ação só http e vazio (`int.test.ts:190-193`). Como a ação delega a `resolveBaseUrl` sem ramo próprio, aceito. HOSTING-10/11/12 são verificados juntos no mesmo `it.each`, e cada payload checa as 3 saídas (sem e-mail, log com nome exato, `{ ok: true }`).

**Notas de precisão do spec**:
- HOSTING-19: `age` sempre escreve cabeçalho, então com `set -euo pipefail` o arquivo cifrado nunca fica vazio na prática; a checagem `-s` é uma guarda redundante. O AC é atendido ao pé da letra, mas não protege contra um dump truncado. Só registro, não é gap.
- HOSTING-11: o spec não define o segundo argumento de `logActionError`; a implementação passa `null` (`password-reset.ts:48`). Aceitável.

---

## Edge Cases

- [x] `VERCEL` vazio → `max` 10: `src/lib/db/pool-options.test.ts:14`
- [x] `GET /api/health?probe=1` responde igual: `src/app/api/health/route.test.ts:25-28` (status 200 + `{ status: "ok" }`); o handler não lê a requisição (`route.ts:3`)
- [x] `/api/healthz` e `/api/health-x` anônimos → `/login`: `src/lib/route-decision.test.ts:88-89`
- [x] Barra final em `BETTER_AUTH_URL` sem barra dupla: `src/lib/base-url.test.ts:30` e no e-mail real `src/actions/password-reset.int.test.ts:219-221` (`https://app.vercel.app/` → `https://app.vercel.app/redefinir-senha?token=`)

---

## Discrimination Sensor

Executado em worktree temporária de `94ab249` em `<scratchpad>/wt-head`, com `node_modules` linkado e banco privado `orcamento_hosting_test`. Cada mutação foi revertida com `git checkout` na worktree, que depois foi removida. Sanidade: sem mutação, a worktree passa unit (1300/1300) e `password-reset.int.test.ts` (52/52).

| # | File:line | Mutação | Testes | Killed? |
| - | --------- | ------- | ------ | ------- |
| M1 | `src/lib/db/pool-options.ts:5` | `MAX_ON_VERCEL` 3 → 10 | unit | ✅ Killed |
| M2 | `src/lib/db/pool-options.ts:7` | idle 10000 → 1000 | unit | ✅ Killed |
| M3 | `src/lib/db/pool-options.ts:12` | `env.VERCEL !== undefined` (vazio vira Vercel) | unit | ✅ Killed |
| M4 | `src/lib/db/pool-options.ts:11` | `connectionString` de `DIRECT_URL` | unit | ✅ Killed |
| M5 | `src/lib/route-decision.ts:10` | remove `/api/health` de `PUBLIC_PATHS` | unit | ✅ Killed |
| M6 | `src/lib/route-decision.ts:17` | prefixo sem `/` (`/api/healthz` vira público) | unit | ✅ Killed |
| M7 | `src/app/api/health/route.ts:4` | remove `Cache-Control: no-store` | unit | ✅ Killed |
| M8 | `src/app/api/health/route.ts:3` | health importa `@/lib/db/client` | unit | ✅ Killed |
| M9 | `src/app/api/health/route.ts:4` | corpo `{status:"up"}` | unit | ✅ Killed |
| M10 | `src/lib/base-url.ts:15` | aceita `http:` em produção | unit + int | ✅ Killed |
| M11 | `src/lib/base-url.ts:17` | não remove a barra final | unit + int | ✅ Killed |
| M12 | `src/actions/password-reset.ts:46` | `if (false)`: envia e-mail com URL inválida | int | ✅ Killed |
| M13 | `src/actions/password-reset.ts:49` | URL inválida devolve `{ ok: false, error }` | int | ✅ Killed |
| M14 | `src/actions/password-reset.ts:48` | nome da ação no log sem `: baseUrl` | int | ✅ Killed |
| M15 | `src/actions/password-reset.ts:48` | remove o `logActionError` | int | ✅ Killed |
| M16 | `src/lib/db/client.ts:9` | volta a `new Pool({ connectionString })` (ignora `poolOptions`) | unit + int | ❌ Survived |
| M17 | `.github/workflows/backup.yml:50` | `retention-days` 30 → 90 | unit | ✅ Killed |
| M18 | `.github/workflows/backup.yml:39-42` | remove a checagem de arquivo vazio | unit | ✅ Killed |
| M19 | `.github/workflows/backup.yml:9` | cron `0 5` → `0 6` | unit | ✅ Killed |
| M20 | `.github/workflows/backup.yml:38` | dump em claro em disco, depois `age` | unit | ✅ Killed |
| M21 | `.github/workflows/backup.yml:43` | `echo "url=$NEON_DIRECT_URL"` | unit | ✅ Killed |
| M22 | `.github/workflows/backup.yml:5` | `PG_VERSION` 18 → 17 | unit | ✅ Killed |
| M23 | `.github/workflows/backup.yml:10` | remove `workflow_dispatch` | unit | ✅ Killed |
| M24 | `.github/workflows/backup.yml:51` | remove `if-no-files-found: error` | unit | ✅ Killed |
| M25 | `.github/workflows/backup.yml:38` | `set +e` antes do `pg_dump` (falha não derruba o job) | unit | ❌ Survived |

**Sensor depth**: P0-full manual (25 mutações, cobrindo todos os ramos novos)
**Result rodada 1 (94ab249)**: 23/25 killed (M16 e M25 sobreviveram)

### Rodada 2 (re-verify, HEAD `559f2bd`)

Worktree temporária de `559f2bd` em `<scratchpad>/wt-fix`. Sanidade sem mutação: unit 62 arquivos, 1302/1302.

| # | File:line | Mutação | Testes | Killed? |
| - | --------- | ------- | ------ | ------- |
| M16 | `src/lib/db/client.ts:9` | volta a `new Pool({ connectionString })` | unit + int | ✅ Killed (unit, `client.test.ts:18`) |
| M25 | `.github/workflows/backup.yml:38` | `set +e` antes do `pg_dump` | unit | ✅ Killed (`backup-workflow.test.ts:36`) |
| M1 | `src/lib/db/pool-options.ts:5` | `MAX_ON_VERCEL` 3 → 10 | unit | ✅ Killed (re-check) |
| M7 | `src/app/api/health/route.ts:4` | remove `no-store` | unit | ✅ Killed (re-check) |
| M17 | `.github/workflows/backup.yml:50` | `retention-days` 30 → 90 | unit | ✅ Killed (re-check) |

**Result final**: 25/25 mutações distintas mortas (M16 e M25 mortos na rodada 2). ✅ PASS

**Isolamento**: `git status --porcelain` da árvore real antes do trabalho (baseline) = 3 modificados (`src/actions/auth.ts`, `src/lib/admin.ts`, `src/lib/login-lock.ts`, de outra sessão) + 7 não rastreados (`docs/contas.md`, `docs/marca/*.png`). Depois da remoção das worktrees (`git worktree list` sem as de scratch), o porcelain bate exatamente com o baseline (`diff` vazio). Na rodada 2 o baseline incluía também este `validation.md` (não rastreado); depois de remover `wt-fix` e rodar os gates, o porcelain continuou igual ao baseline.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`client.ts` muda 2 linhas; `route-decision.ts` 1) |
| No scope creep | ✅ |
| Matches patterns | ✅ (funções puras com env por argumento, como `sentryBuildOptions`/`securityHeaderRules`) |
| Spec-anchored outcome check | ✅ valores exatos (3/10, 10000, `{status:"ok"}`, `no-store`, nome da ação, cron, 30, 18) |
| Per-layer Coverage Expectation | ✅ o wiring de `client.ts` agora tem teste (`src/lib/db/client.test.ts`), embora a matriz do tasks.md o marcasse como "none" |
| Every test maps to a spec requirement | ✅ todos os testes novos citam um HOSTING-xx ou edge case |
| Documented guidelines followed: `AGENTS.md` (AD-005, sem e2e) | ✅ nenhum e2e criado ou rodado |

Observação (não é gap do spec): a ação emite o token (`passwordResetsRepo.issue`, `password-reset.ts:40`) antes de validar a URL. Com URL inválida fica um token órfão até expirar. É inofensivo, e assim a falha só é registrada quando a conta existe.

---

## Gate Check

Árvore real (`559f2bd` + edições não commitadas de outra sessão), Node 20.20.2, rodada 2:

- `npm run typecheck`: exit 0
- `npm run lint`: exit 0 (0 erros, 1 warning pré-existente em `src/components/category-editor.tsx:40`, fora do diff)
- `npm run test:unit`: 62 arquivos, **1302 passed**, 0 failed, 0 skipped
- `npm run test:int` (`DATABASE_URL=.../orcamento_hosting_test`): **674 passed, 8 failed** (682), as mesmas 8 da rodada 1

Os 8 que falham são todos de lock de login: `account.int.test.ts` (2), `auth.int.test.ts` (5) e `legacy.int.test.ts` (1).

**Reprodução isolada (rodada 1, banco privado `orcamento_hosting_test`):**

| Árvore | test:int |
| ------ | -------- |
| worktree limpa de `94ab249` (sem edições não commitadas) | **682/682 passed**, exit 0 |
| worktree limpa de `7fedc78` (antes da feature) | **678/678 passed**, exit 0 |

O fix `559f2bd` só toca arquivos `*.test.ts` do projeto unit (`src/lib/db/client.test.ts`, `src/lib/backup-workflow.test.ts`). Por isso o resultado de int em `559f2bd` limpo é o mesmo de `94ab249` limpo.

**Conclusão**: as 8 falhas **não existem** no commit limpo e **não vêm do diff desta feature**. A causa são as edições não commitadas na árvore real: `src/lib/login-lock.ts` muda `MAX_FAILURES` de 5 para **105** e adiciona um `console.log` com o e-mail. Esses arquivos não foram tocados. Alerta para quem for commitar: essas edições enfraquecem o bloqueio de login e registram e-mail no log.

- **Test count**: int 678 → 682 (+4). Unit: o diff `7fedc78..559f2bd` adiciona 28 testes unitários (pool 5, client 2, route-decision 3, health 3, base-url 8, backup 7) e não remove nenhum; HEAD tem 1302
- **Skipped**: nenhum

---

## Fix Plans

Os dois fixes da rodada 1 foram aplicados em `559f2bd` e verificados:

- **Fix 1 (M16)**: `src/lib/db/client.test.ts` mocka `pg` e verifica `Pool` chamado com `{ connectionString, max: 3, idleTimeoutMillis: 10_000 }` na Vercel (`:18-22`) e com `max: 10` fora dela (`:29`). ✅ M16 morto.
- **Fix 2 (M25)**: `src/lib/backup-workflow.test.ts:36` - `expect(workflow).not.toMatch(/set\s+\+[eo]/)`. ✅ M25 morto.

Nenhum gap aberto.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| HOSTING-01 a HOSTING-21 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 21/21 ACs com evidência `file:line` e valor exato do spec; 0 ACs sem evidência; 2 notas de precisão sem bloqueio (HOSTING-19, HOSTING-11)
**Sensor**: 25/25 mutações mortas (rodada 2 matou M16 e M25; re-check de M1, M7 e M17 também morto)
**Gate**: typecheck/lint verdes; unit 1302/1302; int 682/682 no commit limpo (as 8 falhas da árvore real vêm de edições não commitadas alheias à feature)

**What works**: teto do pool (função e wiring), health público sem banco e sem cache, validação da URL com resposta uniforme e log nomeado, workflow de backup com cron, retenção, versão, fail-fast e ausência de segredos verificadas.

**Issues found**: nenhum aberto. Fora da feature, as edições não commitadas em `src/lib/login-lock.ts` (`MAX_FAILURES = 105` e um `console.log` com o e-mail) não devem ser commitadas.

**Next steps**: atualizar a rastreabilidade do spec.md para Verified (o orquestrador faz isso). Lições não registradas por este Verifier, porque o escopo permite escrever só `validation.md`. Sinal da rodada 1 para o orquestrador registrar: "wiring de config sem teste deixa a função pura testada sem proteção no ponto de uso".
