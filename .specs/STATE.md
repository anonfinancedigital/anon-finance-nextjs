# STATE

## Decisions

### AD-001
- **Decision**: O app é um monolito Next.js App Router: Server Components leem do banco e Server Actions fazem todas as escritas; não há API REST própria.
- **Reason**: Menos camadas para um app de um usuário; tipagem ponta a ponta; revalidação nativa após mutações.
- **Trade-off**: Sem API reutilizável por outros clientes (ex.: app mobile); expor uma API depois exige criar Route Handlers.
- **Scope**: Todo o projeto (UI, escrita, leitura)
- **Date**: 2026-10-04
- **Status**: superseded by AD-011 (só quanto à leitura de dados financeiros; Server Actions de escrita e a ausência de API REST continuam valendo)

### AD-002
- **Decision**: Stack de dados e auth: Postgres (Neon via Vercel) + Drizzle ORM com driver `node-postgres` em todos os ambientes + Better Auth (e-mail/senha, sessão em banco).
- **Reason**: Auth.js está em modo manutenção; Better Auth integra com Drizzle. Um driver único elimina divergência entre testes e produção.
- **Trade-off**: Acoplamento ao Better Auth e ao schema de tabelas dele; testes de integração exigem Postgres em Docker.
- **Scope**: Persistência e autenticação de todas as features
- **Date**: 2026-10-04
- **Status**: active

### AD-003
- **Decision**: Dinheiro em centavos inteiros (`bigint`), percentuais em pontos-base inteiros (1% = 100) e datas de transação como `date` do calendário (sem fuso).
- **Reason**: Elimina erro de ponto flutuante e ambiguidade de fuso no mês de referência.
- **Trade-off**: Toda entrada e saída passa por parsers e formatadores do domínio.
- **Scope**: Domínio, banco e UI de todas as features financeiras
- **Date**: 2026-10-04
- **Status**: active

### AD-004
- **Decision**: Transações recorrentes são segmentos de série na tabela `transaction` (`recurring`, `recurrence_day`, `recurrence_end`, `series_id`); as ocorrências são projetadas na leitura. Toda consulta de transações por mês (lista e totais) usa `applicableInMonth`, nunca só `date` no intervalo do mês.
- **Reason**: Uma linha por série evita cópias por mês e mantém lista e resumo coerentes; filtrar só por `date` subcontaria as recorrentes.
- **Trade-off**: Leituras por mês dependem do filtro central e a lista ordena em TypeScript após projetar a data.
- **Scope**: `transactionsRepo` e qualquer feature que leia transações por mês (resumo, filtros, subcategorias)
- **Date**: 2026-10-04
- **Status**: active

### AD-005
- **Decision**: Testes e2e (Playwright, `npm run e2e`) estão suspensos como requisito. Regras: (1) não escrever e2e novo; (2) não rodar `npm run e2e`/`playwright test`, nem no gate nem no Verifier; (3) o Verifier não pode exigir e2e nem criar fix tasks de e2e, e a evidência de UI vem de inspeção de código (`file:line`); (4) specs existentes em `e2e/` só são editados se o typecheck quebrar, com ajuste mínimo e sem rodar; (5) lições que sugiram e2e não se aplicam enquanto esta decisão estiver ativa. Unit e integration continuam obrigatórios.
- **Reason**: Pedido do usuário, por enquanto, para acelerar a execução das tasks.
- **Trade-off**: Fluxos de UI ficam sem cobertura automatizada; regressões visuais ou de navegação só aparecem em verificação manual.
- **Scope**: Test Coverage Matrix e gates de todas as features novas (tasks.md); specs e2e existentes em `e2e/` permanecem no repositório
- **Date**: 2026-10-04
- **Status**: active

### AD-006
- **Decision**: O percentual das categorias é guardado em micro-percentual inteiro (1% = 1.000.000; 100% = 100.000.000) na coluna `percent_micro`, com até 6 casas decimais. Substitui, só para o percentual de categoria, a parte "pontos-base" da AD-003; participações de gasto (`shareBp`, `progressBp`) continuam em pontos-base.
- **Reason**: Pedido do usuário: o valor em R$ editado deve voltar quase exato em centavos; 2 casas arredondavam R$ 333,33 para R$ 333,50.
- **Trade-off**: Cálculos de meta usam BigInt (`mulDivRound`) porque centavos × 100.000.000 passa de 2^53; migração 0006 multiplica os percentuais existentes por 10.000.
- **Scope**: Schema `category`, `parsePercent`/`formatPercent`, `allocateCents`, validação e editor de categorias
- **Date**: 2026-10-04
- **Status**: superseded by AD-007 (só quanto ao local de armazenamento; a unidade micro-percentual continua)

### AD-007
- **Decision**: O percentual de categoria vive na tabela de vigência `category_percent` (categoria, mês inicial `date` dia 1, `percent_micro`); o vigente em um mês é a linha de maior mês inicial ≤ o mês. Só mudança real de percentual grava vigência, no mês corrente (America/Sao_Paulo), com upsert. Excluir categoria é lógico (`category.deleted_from`), preservando as metas dos meses passados.
- **Reason**: Pedido do usuário: meses passados não podem mudar quando os percentuais são editados nem quando categorias são criadas ou excluídas.
- **Trade-off**: Toda leitura de meta depende de resolver a vigência por mês; nome único vale só entre categorias ativas; categoria excluída continua no banco.
- **Scope**: Schema `category`/`category_percent`, `categoriesRepo`, `buildMonthlySummary`, resumo mensal e testes de integração
- **Date**: 2026-10-05
- **Status**: active

### AD-008
- **Decision**: A prévia do simulador de Liberdade roda no cliente: `goalSchema(now).safeParse` e `summarize` (módulos puros, sem import de servidor) rodam a cada alteração do formulário, com `now` vindo do servidor como string ISO. O domínio de `freedom.ts` e a validação do objetivo devem permanecer isomórficos.
- **Reason**: Pedido do usuário de ver o resultado ao arrastar sliders, sem ida ao servidor, com a mesma validação do salvar.
- **Trade-off**: Qualquer import de servidor em `freedom.ts` ou `validation/goal.ts` quebra o bundle do cliente; a UI da prévia não tem teste automático (AD-005, sem teste de componente).
- **Scope**: `src/lib/domain/freedom.ts`, `src/lib/validation/goal.ts`, `GoalExperience` e `GoalForm`
- **Date**: 2026-10-05
- **Status**: active

### AD-009
- **Decision**: O acesso ao app depende de `user.status = approved` (`pending`, `approved`, `rejected`, `revoked`), conferido na criação da sessão (hook `databaseHooks.session.create.before` do Better Auth) e em todo guard de página e ação. O administrador é a conta cujo e-mail é `ADMIN_EMAIL`, decidido em tempo de execução, sem papel no banco.
- **Reason**: Pedido do usuário: ninguém usa a aplicação sem autorização do administrador, que também pode revogar e excluir usuários.
- **Trade-off**: Quem cria usuário ou sessão fora do fluxo padrão precisa informar o status; `auth-schema.ts` (gerado pelo Better Auth) ganha coluna manual que uma regeneração apagaria.
- **Scope**: `user` (schema), `auth.ts`, `auth-guard.ts`, `seed-user.ts`, helpers de teste e telas de cadastro e administração
- **Date**: 2026-10-06
- **Status**: active

### AD-010
- **Decision**: A redefinição de senha não usa o fluxo nativo do Better Auth (`sendResetPassword`, `/reset-password`); fica em `password-resets` (repo) com token aleatório guardado só como hash SHA-256 na tabela `verification` (identificador `password-reset:<hash>`), e a troca de senha, o consumo do token e o fim das sessões acontecem em uma transação. Sem `sendResetPassword` configurado, o endpoint nativo de pedido fica desligado.
- **Reason**: O fluxo nativo não confere `status`, não invalida links anteriores e consome o token, troca a senha e apaga sessões em passos separados; a regra do AD-009 e o "tudo ou nada" do projeto exigem controle desses passos.
- **Trade-off**: Reimplementa um fluxo que a biblioteca já oferece; futuras mudanças do Better Auth nesse fluxo não chegam sozinhas.
- **Scope**: `password-resets` (repo), ações de redefinição, `auth.ts` (não configurar `sendResetPassword`)
- **Date**: 2026-10-07
- **Status**: active

### AD-011
- **Decision**: Os campos financeiros e a data de nascimento são cifrados no navegador (AES-256-GCM) com uma DEK aleatória por usuário, embrulhada pela KEK derivada da senha (Argon2id + HKDF) e pela chave de recuperação; o servidor guarda só `v1:<base64url>` e a estrutura em claro (datas, tipo, ids, recorrência). Totais, resumo, filtros e prévia da meta rodam no cliente sobre dados decifrados; Server Components entregam linhas cifradas por mês. Substitui AD-001 na leitura financeira.
- **Reason**: Pedido do usuário: nem o administrador, nem o banco, nem backups podem ler os dados.
- **Trade-off**: Esquecer senha e chave de recuperação perde os dados; sem `SUM`/busca em SQL; páginas viram esqueleto até decifrar; o operador que publica código malicioso ainda pode capturar a senha.
- **Scope**: Schema financeiro, repos, Server Actions de dados, páginas `(app)`, cadastro, login, redefinição de senha, `src/lib/crypto`, `src/lib/vault`
- **Date**: 2026-10-09
- **Status**: active

### AD-012
- **Decision**: Contas existentes migram por usuário: colunas `*_ct` ao lado das em claro, `user_vault` ausente = conta legada, que é redirecionada a `/proteger-dados`; repos normais nunca leem texto puro. O legado sai por `scripts/finalize-vault.ts`, que recusa se resta conta legada, e por um follow-up que remove as colunas do `schema.ts`.
- **Reason**: Migrar sem a senha derivada só é possível no navegador do dono da conta, no próximo login.
- **Trade-off**: Código legado transitório (`legacyRepo`, `/proteger-dados`) até todas as contas migrarem; na migração o servidor vê senha e dados em claro uma vez.
- **Scope**: Migração `0010`, `legacyRepo`, `/proteger-dados`, `scripts/finalize-vault.ts`
- **Date**: 2026-10-09
- **Status**: active

### AD-013
- **Decision**: Nenhum dado do usuário sai para serviços de terceiros. O monitoramento (Sentry) envia só tipo de exceção, stack trace, rota sem query string e tags, filtrado por `scrubEvent`; o navegador só fala com a própria origem (túnel `/monitoring`) e o CSP mantém `connect-src 'self'`. Sem Session Replay, sem breadcrumbs, sem `setUser`.
- **Reason**: AD-011 promete que dados decifrados nunca saem do navegador; mensagens de erro podem conter esses valores.
- **Trade-off**: Eventos têm menos contexto para depuração; o scrubber descarta o evento se falhar.
- **Scope**: `src/lib/sentry`, instrumentação, `logActionError`, CSP e proxy
- **Date**: 2026-10-10
- **Status**: active

## Handoff
