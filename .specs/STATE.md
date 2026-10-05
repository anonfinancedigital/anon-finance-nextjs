# STATE

## Decisions

### AD-001
- **Decision**: O app é um monolito Next.js App Router: Server Components leem do banco e Server Actions fazem todas as escritas; não há API REST própria.
- **Reason**: Menos camadas para um app de um usuário; tipagem ponta a ponta; revalidação nativa após mutações.
- **Trade-off**: Sem API reutilizável por outros clientes (ex.: app mobile); expor uma API depois exige criar Route Handlers.
- **Scope**: Todo o projeto (UI, escrita, leitura)
- **Date**: 2026-10-04
- **Status**: active

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
- **Decision**: Testes e2e (Playwright, `npm run e2e`) estão suspensos como requisito: tasks de UI não exigem teste e2e novo e o gate build não roda `npm run e2e`. Unit e integration continuam obrigatórios.
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
- **Status**: active

## Handoff
