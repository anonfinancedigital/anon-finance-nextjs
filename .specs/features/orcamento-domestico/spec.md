# Orçamento Doméstico Specification

## Problem Statement

Hoje não há um jeito simples de planejar quanto gastar por categoria a cada mês e comparar com o que de fato foi gasto. O sistema permite definir categorias com meta percentual sobre a receita, registrar ganhos e gastos e ver o resumo de gastos por categoria contra a meta. Stack: Next.js (React), deploy na Vercel, Postgres, um único usuário com login.

## Goals

- [ ] Definir categorias com meta percentual somando exatamente 100%.
- [ ] Registrar, editar e excluir ganhos e gastos (gasto com data e categoria) em menos de 30 segundos por transação.
- [ ] Ver, para qualquer mês, o gasto por categoria versus a meta (R$ e %), com alerta visual de estouro e gráfico.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Multiusuário / orçamento compartilhado | Decidido: um único usuário |
| Contas bancárias, cartões, importação de extrato (OFX/CSV) | Fora do MVP; registro é manual |
| Transações recorrentes / parceladas | Fora do MVP |
| Subcategorias e tags | Fora do MVP |
| Múltiplas moedas | Apenas BRL |
| Rollover de saldo entre meses | Cada mês é independente |
| Metas por mês diferentes (histórico de percentuais) | Percentuais são únicos e valem para todos os meses |
| Exportação de dados | Fora do MVP |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Persistência e acesso | Postgres na Vercel; um usuário com login por e-mail e senha | Dados acessíveis de qualquer dispositivo | y |
| Base do percentual | Meta da categoria = percentual × soma dos ganhos do mês selecionado | Receita real do mês | y |
| Soma dos percentuais | Deve ser exatamente 100%; salvar é bloqueado caso contrário | Evita orçamento incoerente | y |
| Exemplo do pedido soma 105% (30+30+10+10+20+5) | Exemplo é ilustrativo; o sistema exige 100% e o usuário ajusta os valores | O exemplo viola a regra de 100% | n |
| Categorias iniciais | Sistema não cria categorias padrão; o usuário cria as suas | Pedido diz "posso definir as categorias" | n |
| Precisão do percentual | Até 2 casas decimais, entre 0,01 e 100 | Evita valores inválidos e arredondamento ambíguo | n |
| Valores monetários | BRL, armazenados em centavos (inteiro), valor > 0, máximo R$ 999.999.999,99 | Evita erro de ponto flutuante | n |
| Ganho tem categoria? | Não; ganho tem data, valor e descrição | Percentuais incidem sobre ganhos; categoria só vale para gastos | n |
| Gasto tem descrição? | Sim, opcional, até 120 caracteres | Facilita identificar o lançamento | n |
| Mês de referência | Mês do calendário da data da transação, fuso America/Sao_Paulo | Usuário no Brasil | n |
| Exclusão de categoria com gastos | Bloqueada enquanto houver gastos nela | Evita gastos órfãos e resumo incorreto | n |
| Receita do mês = 0 | Metas em R$ exibidas como R$ 0,00; gastos nesse mês contam como estouro | Comportamento definido para divisão sem base | n |
| Estouro | Categoria estoura quando gasto > meta em R$ do mês | Alerta visual pedido | n |
| Gráfico | Barras: gasto vs meta por categoria; e pizza da distribuição dos gastos | Cobre comparação e distribuição | n |
| Sessão | Sessão expira em 30 dias de inatividade | Conveniência em uso pessoal | n |
| Criação da conta | Conta única criada por seed/variáveis de ambiente; sem tela de cadastro público | Um usuário, evita registro aberto | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Categorias com meta percentual ⭐ MVP

**User Story**: As a usuário, I want definir categorias e o percentual da receita que desejo gastar em cada uma so that eu tenha um orçamento planejado.

**Why P1**: Base de todo o sistema; sem categorias não há registro de gasto nem resumo.

**Acceptance Criteria**:

1. WHEN o usuário salva uma categoria com nome e percentual válidos THEN the system SHALL persistir a categoria e exibi-la na lista.
2. WHEN o usuário salva o conjunto de categorias com soma dos percentuais igual a 100% THEN the system SHALL aceitar a configuração.
3. IF a soma dos percentuais for diferente de 100% THEN the system SHALL bloquear o salvamento e exibir a mensagem "A soma dos percentuais deve ser 100% (atual: X%)".
4. IF o percentual for menor que 0,01, maior que 100 ou tiver mais de 2 casas decimais THEN the system SHALL rejeitar o valor com mensagem de validação.
5. IF o nome da categoria estiver vazio, tiver mais de 40 caracteres ou duplicar outro nome (sem diferenciar maiúsculas) THEN the system SHALL rejeitar o valor com mensagem de validação.
6. IF o usuário tentar excluir uma categoria que possui gastos THEN the system SHALL bloquear a exclusão e informar a quantidade de gastos vinculados.
7. WHEN o usuário exclui uma categoria sem gastos THEN the system SHALL removê-la e exigir que a soma volte a 100% antes de salvar o conjunto.

**Independent Test**: Criar as categorias 30/30/10/10/20 e ver o salvamento aceito; alterar uma para 25 e ver o bloqueio com a mensagem de soma.

---

### P1: Registrar ganhos e gastos ⭐ MVP

**User Story**: As a usuário, I want registrar ganhos e gastos com data (e categoria nos gastos) so that eu saiba para onde o dinheiro vai.

**Why P1**: É a entrada de dados do sistema.

**Acceptance Criteria**:

1. WHEN o usuário registra um gasto com data, valor, categoria e descrição opcional THEN the system SHALL persistir a transação e exibi-la na lista do mês da data.
2. WHEN o usuário registra um ganho com data, valor e descrição opcional THEN the system SHALL persistir a transação e incluí-la na receita do mês da data.
3. IF o valor for menor ou igual a zero ou maior que R$ 999.999.999,99 THEN the system SHALL rejeitar a transação com mensagem de validação.
4. IF a data estiver vazia ou inválida THEN the system SHALL rejeitar a transação com mensagem de validação.
5. IF um gasto for enviado sem categoria ou com categoria inexistente THEN the system SHALL rejeitar a transação com mensagem de validação.
6. WHEN o usuário edita uma transação e salva THEN the system SHALL atualizar data, valor, categoria e descrição e refletir a mudança no resumo.
7. WHEN o usuário confirma a exclusão de uma transação THEN the system SHALL removê-la e refletir a mudança no resumo.
8. WHEN o usuário envia o mesmo formulário de criação mais de uma vez em menos de 2 segundos THEN the system SHALL criar apenas uma transação.
9. WHEN o usuário abre a lista de transações THEN the system SHALL listá-las do mês selecionado em ordem decrescente de data.

**Independent Test**: Registrar um ganho de R$ 5.000 e um gasto de R$ 200 em "Conforto" e ver ambos na lista do mês; editar o valor do gasto e excluir o ganho.

---

### P1: Resumo de gastos por categoria ⭐ MVP

**User Story**: As a usuário, I want ver o gasto por categoria contra a meta so that eu saiba se estou dentro do planejado.

**Why P1**: É o objetivo central do sistema.

**Acceptance Criteria**:

1. WHEN o usuário abre o resumo de um mês THEN the system SHALL exibir, por categoria, o percentual, a meta em R$ (percentual × receita do mês), o gasto em R$ e o restante (meta − gasto).
2. WHEN o resumo é exibido THEN the system SHALL exibir a receita total, o gasto total e o saldo (receita − gasto) do mês.
3. WHILE o gasto de uma categoria for maior que a meta do mês the system SHALL destacar a categoria como estourada e exibir o excedente em R$.
4. WHILE o gasto de uma categoria for menor ou igual à meta the system SHALL exibir a barra de progresso com a porcentagem consumida da meta.
5. IF a receita do mês for R$ 0,00 THEN the system SHALL exibir metas de R$ 0,00 e destacar como estouradas as categorias com gasto maior que zero.
6. WHEN uma transação é criada, editada ou excluída THEN the system SHALL refletir o novo valor no resumo sem exigir recarregamento manual da página.
7. The system SHALL calcular todos os valores em centavos inteiros e exibi-los em formato BRL (ex.: R$ 1.234,56).

**Independent Test**: Com ganho de R$ 5.000 e categoria "Conforto" a 30%, lançar gastos de R$ 1.600 e ver a meta de R$ 1.500,00, estouro de R$ 100,00 e destaque.

---

### P2: Navegar entre meses

**User Story**: As a usuário, I want escolher o mês exibido so that eu consulte o histórico e planeje o próximo.

**Why P2**: Resumo mensal só tem valor com histórico, mas o mês corrente já entrega o MVP.

**Acceptance Criteria**:

1. WHEN o usuário abre o sistema THEN the system SHALL exibir o mês corrente (fuso America/Sao_Paulo).
2. WHEN o usuário seleciona outro mês THEN the system SHALL exibir resumo e lista de transações apenas desse mês.
3. WHEN o usuário registra uma transação com data em outro mês THEN the system SHALL incluí-la no resumo do mês da data, não do mês exibido.
4. WHERE o mês selecionado não tem transações the system SHALL exibir resumo zerado e a mensagem "Nenhuma transação neste mês".
5. WHEN o usuário recarrega a página THEN the system SHALL manter o mês selecionado na URL.

**Independent Test**: Lançar gastos em dois meses diferentes e alternar o seletor vendo totais distintos.

---

### P2: Gráficos no resumo

**User Story**: As a usuário, I want gráficos do resumo so that eu visualize rapidamente a distribuição e os estouros.

**Why P2**: Melhora a leitura, mas a tabela já entrega o MVP.

**Acceptance Criteria**:

1. WHEN o resumo é exibido THEN the system SHALL exibir um gráfico de barras com gasto e meta por categoria.
2. WHEN o resumo é exibido THEN the system SHALL exibir um gráfico de pizza com a participação de cada categoria no gasto total do mês.
3. IF o gasto total do mês for R$ 0,00 THEN the system SHALL omitir o gráfico de pizza e exibir "Sem gastos no mês".
4. WHILE uma categoria estiver estourada the system SHALL destacar sua barra com cor distinta, acompanhada de rótulo textual (não apenas cor).

**Independent Test**: Com gastos em 3 categorias, ver barras e pizza coerentes com os valores da tabela.

---

### P1: Acesso com login

**User Story**: As a usuário, I want entrar com e-mail e senha so that apenas eu acesse meus dados.

**Why P1**: Os dados ficam em servidor público na Vercel.

**Acceptance Criteria**:

1. WHEN o usuário envia e-mail e senha corretos THEN the system SHALL criar a sessão e redirecioná-lo ao resumo do mês corrente.
2. IF as credenciais forem inválidas THEN the system SHALL exibir "E-mail ou senha inválidos" sem indicar qual está errado.
3. IF um visitante sem sessão acessar qualquer página ou API de dados THEN the system SHALL redirecioná-lo ao login ou responder 401, respectivamente.
4. IF houver 5 tentativas de login falhas em 15 minutos para o mesmo e-mail THEN the system SHALL bloquear novas tentativas por 15 minutos.
5. WHEN o usuário clica em sair THEN the system SHALL encerrar a sessão.
6. The system SHALL armazenar a senha somente como hash com sal (nunca em texto puro).

**Independent Test**: Acessar `/` sem login e ser redirecionado; entrar com credenciais corretas e ver o resumo.

---

## Edge Cases

- IF o usuário não tiver categorias ao registrar um gasto THEN the system SHALL orientar a criar categorias primeiro.
- IF a data do gasto for em 29/02 de ano não bissexto THEN the system SHALL rejeitar a data como inválida.
- WHEN uma transação é registrada às 23:30 de 31/01 em America/Sao_Paulo THEN the system SHALL contá-la em janeiro.
- IF o banco de dados estiver indisponível ao salvar THEN the system SHALL exibir "Não foi possível salvar. Tente novamente" e manter os dados digitados no formulário.
- WHEN dois salvamentos de edição da mesma transação chegam em sequência THEN the system SHALL manter o valor do último recebido.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAT-01 | P1: Categorias com meta percentual (AC 1, 4, 5) | Execute | Verified |
| CAT-02 | P1: Categorias com meta percentual (AC 2, 3, 7) | Execute | Verified |
| CAT-03 | P1: Categorias com meta percentual (AC 6) | Execute | Verified |
| TRX-01 | P1: Registrar ganhos e gastos (AC 1, 2, 9) | Execute | Verified |
| TRX-02 | P1: Registrar ganhos e gastos (AC 3, 4, 5) | Execute | Verified |
| TRX-03 | P1: Registrar ganhos e gastos (AC 6, 7) | Execute | Verified |
| TRX-04 | P1: Registrar ganhos e gastos (AC 8) | Execute | Verified |
| SUM-01 | P1: Resumo por categoria (AC 1, 2, 7) | Execute | Verified |
| SUM-02 | P1: Resumo por categoria (AC 3, 4, 5) | Execute | Verified |
| SUM-03 | P1: Resumo por categoria (AC 6) | Execute | Verified |
| MON-01 | P2: Navegar entre meses | Execute | Verified |
| CHT-01 | P2: Gráficos no resumo | Execute | Verified |
| AUTH-01 | P1: Acesso com login (AC 1, 2, 5) | Execute | Verified |
| AUTH-02 | P1: Acesso com login (AC 3) | Execute | Verified |
| AUTH-03 | P1: Acesso com login (AC 4, 6) | Execute | Verified |

**Coverage:** 15 total, 15 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] O usuário configura categorias somando 100% e registra uma transação em menos de 30 segundos.
- [ ] O resumo de qualquer mês mostra metas, gastos e estouros que batem com o cálculo manual em centavos.
- [ ] Nenhum dado é acessível sem sessão válida.
