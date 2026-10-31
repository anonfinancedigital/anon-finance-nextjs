# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Adultos no Brasil que controlam o orçamento doméstico mês a mês e querem saber quando poderão viver de renda. Usam no celular e no desktop; o idioma é pt-BR. Interface usada sozinho, em sessões curtas: lançar um gasto, conferir o mês, ajustar metas, simular a liberdade financeira.

## Product Purpose

ANON ("Finanças Privadas") une o controle do orçamento mensal por categorias percentuais ao planejamento do patrimônio: o usuário lança gastos e ganhos, acompanha o consumo de cada meta e simula quanto precisa investir por mês para atingir a independência financeira. Sucesso é o usuário confiar os números reais ao app e voltar a ele para decidir, sem abrir mão da privacidade.

## Positioning

Dois pontos juntos, que um concorrente não copia com verdade: (1) privacidade absoluta, com os campos financeiros e a data de nascimento cifrados no navegador (AES-256-GCM, chave derivada da senha, chave de recuperação), de modo que o servidor guarda só texto ilegível, e nenhum dado vai a terceiros; (2) orçamento por percentual com vigência histórica (meses passados não mudam) ligado à projeção de Liberdade Financeira. Tagline: "O planejamento do seu patrimônio com privacidade absoluta."

## Operating Context

- Categorias e subcategorias com metas em percentual (até 6 casas decimais) da receita; cada mês preserva os percentuais vigentes à época.
- Lançamentos de gasto e ganho (com recorrência e parcelas), busca e filtros por categoria, importação de dados.
- Aba Liberdade: renda mensal desejada, valor guardado, data de nascimento, idade de aposentadoria; juros reais de 8% a.a., patrimônio-alvo por perpetuidade e aporte mensal necessário, com prévia ao vivo.
- Acesso por e-mail/senha ou Google; Google só autentica e nunca abre o cofre. Cadastro aberto, limitado por IP; o administrador revoga, reativa e exclui.
- Monitoramento (Sentry) sem dados do usuário.

## Capabilities and Constraints

- Monolito Next.js App Router, Server Actions para escrita, Postgres + Drizzle, Better Auth. Dinheiro em centavos inteiros.
- Totais, resumo, filtros e prévia da meta rodam no cliente sobre dados decifrados; o domínio de `freedom.ts` e a validação do objetivo devem permanecer isomórficos.
- CSP restrito (`connect-src 'self'`); sem replay, sem terceiros recebendo dados do usuário.
- O app exige internet; offline não é objetivo.
- Plataforma futura em aberto: Capacitor/lojas depois do web (ver `docs/mobile-roadmap.md`). Hoje o mobile é web com comportamento nativo-like.
- E2E suspenso (AD-005); evidência de UI vem de inspeção de código, lógica vai para unit/integration.

## Brand Commitments

Nome ANON, descritor "Finanças Privadas", texto de marca em `src/lib/brand.ts`, ativos em `docs/marca/` (logos, avatar, favicon, claro e escuro). Tema escuro é o padrão, com tema claro disponível. Voz em português do Brasil.

## Evidence on Hand

Especificações e decisões em `.specs/` (STATE.md, AD-001 a AD-015), ativos de marca em `docs/marca/`, roadmap em `docs/mobile-roadmap.md`. Não há depoimentos, clientes, números de uso nem benchmarks reais; não fabricar.

## Product Principles

1. Privacidade é fato verificável, não slogan: nenhuma funcionalidade pode exigir que o servidor leia dados financeiros.
2. Os números do mês precisam ser lidos de relance e confiáveis; meses passados nunca mudam retroativamente.
3. Investir acima da meta é vitória, não erro; só despesa real que estoura o teto é alerta.
4. O orçamento de hoje serve ao patrimônio de amanhã: gasto e Liberdade são um só raciocínio.
5. Funciona tão bem no celular quanto no desktop.

## Accessibility & Inclusion

Nenhum padrão formal exigido; seguir boas práticas (contraste, foco visível, alvos de toque, zoom habilitado). Idioma pt-BR.
