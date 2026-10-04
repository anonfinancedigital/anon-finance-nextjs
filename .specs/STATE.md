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

## Handoff
