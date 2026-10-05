# Edição Bidirecional de Meta por Categoria Specification

## Problem Statement

Na tela de Categorias o usuário edita o percentual e vê o valor em R$ calculado sobre a receita de referência, mas o valor é só leitura. Quem pensa em reais ("quero R$ 500 para Lazer") precisa descobrir o percentual na calculadora. A feature torna o valor editável: alterar o valor em R$ recalcula o percentual, e alterar o percentual recalcula o valor.

## Goals

- [ ] Editar o valor em R$ de uma categoria atualiza o percentual da mesma linha sem recarregar a página.
- [ ] Editar o percentual continua atualizando o valor em R$ (comportamento atual preservado).
- [ ] O que é salvo continua sendo apenas o percentual (micro-percentual); nenhuma migração.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Salvar o valor em R$ ou a receita de referência | Valor é simulação; o dado do orçamento é o percentual |
| Ajustar automaticamente as outras categorias para fechar 100% | Não pedido; salvar continua exigindo soma 100% |
| Editar valor sem receita de referência | Sem receita não há base de cálculo |
| Alterar a receita de referência recalculando percentuais | Receita muda só os valores; percentuais são a fonte da verdade |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Fonte da verdade | O percentual (micro-percentual). O valor editado é convertido em percentual no ato da digitação | É o único dado persistido | n |
| Precisão do percentual | Até 6 casas decimais, guardado em micro-percentual inteiro (1% = 1.000.000; 100% = 100.000.000); migração multiplica os valores existentes por 10.000 | Decidido pelo usuário: valor digitado volta praticamente exato em centavos | y |
| Conversão valor → percentual | micro = round(centavos × 100.000.000 / receita_centavos), com aritmética BigInt para não perder precisão | Receitas grandes estouram 2^53 em ponto flutuante | n |
| Texto do campo de valor enquanto o usuário digita | Preservado exatamente como digitado; só é reformatado (formatBRL) quando o percentual da linha muda por outra via ou o campo perde o foco | Evita o cursor/texto "pular" durante a digitação | n |
| Valor sem receita de referência | Campo de valor desabilitado, com dica para informar a receita | Sem base não há conversão | n |
| Valor vazio ou inválido (parseBRL falha) | Mostra o erro do parser no campo e mantém o percentual anterior | Não destrói dado por entrada incompleta | n |
| Valor que resulta em percentual fora de 0,000001%–100% (inclui R$ 0 e valor maior que a receita) | Erro "O percentual deve estar entre 0,000001 e 100" no campo de valor; percentual mantido | Mesma regra do parsePercent | n |
| Alterar a receita de referência | Percentuais não mudam; valores são recalculados | Percentual é a fonte da verdade | n |
| Formato do percentual preenchido | formatPercent sem o "%", sem zeros à direita, até 6 casas (ex.: "12,5", "6,6666") | Consistência com o campo existente | n |
| Rodapé "Soma" em R$ | Continua somando os valores calculados a partir dos percentuais das linhas | Comportamento atual | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Editar o valor em R$ e ver o percentual ajustar ⭐ MVP

**User Story**: As o usuário do orçamento, I want digitar o valor em R$ de uma categoria e ver o percentual calculado so that eu defina metas pensando em reais.

**Why P1**: É o pedido inteiro.

**Acceptance Criteria**:

1. WHEN o usuário digita um valor válido no campo R$ de uma categoria e a receita de referência é válida THEN the editor SHALL preencher o percentual da linha com round(centavos × 100.000.000 / receita_centavos) em micro-percentual, formatado com até 6 casas decimais.
2. WHEN o usuário digita um percentual válido THEN the editor SHALL preencher o campo R$ da linha com round(receita_centavos × percentual_micro / 100.000.000), formatado em BRL.
3. WHILE a receita de referência está vazia ou inválida the editor SHALL manter o campo R$ de cada linha desabilitado.
4. IF o valor digitado não é um valor BRL válido THEN the editor SHALL exibir o erro do parseBRL no campo R$ e manter o percentual da linha inalterado.
5. IF o valor digitado resulta em percentual menor que 0,000001% ou maior que 100% THEN the editor SHALL exibir "O percentual deve estar entre 0,000001 e 100" no campo R$ e manter o percentual da linha inalterado.
6. WHEN o usuário altera o valor em R$ THEN the editor SHALL recalcular a soma de percentuais do rodapé e o estado do botão Salvar.
7. WHEN o usuário altera a receita de referência THEN the editor SHALL manter todos os percentuais e recalcular os valores em R$.
8. The editor SHALL enviar ao salvar apenas o percentual de cada categoria, sem valor em R$ nem receita de referência.

**Independent Test**: Com receita de referência 5.000,00, digitar 500,00 no valor da categoria e ver o percentual 10; digitar 12,5 no percentual e ver o valor 625,00.

---

## Edge Cases

- WHEN o valor digitado gera um percentual que, convertido de volta, difere do digitado por arredondamento (ex.: R$ 100,01 sobre 3.000.000,00) THEN the editor SHALL manter o texto digitado no campo R$ enquanto ele tem o foco.
- IF a receita de referência é alterada para um valor inválido enquanto há valores digitados THEN the editor SHALL desabilitar os campos R$ e manter os percentuais.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BIDIR-01 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-02 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-03 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-04 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-05 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-06 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-07 | P1: Editar valor | Implemented | Pending e2e |
| BIDIR-08 | P1: Editar valor | Implemented | Pending e2e |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️

---

## Success Criteria

- [ ] Digitar R$ 500,00 com receita 5.000,00 resulta em percentual "10" na mesma linha.
- [ ] Nenhuma regressão: salvar continua exigindo soma exatamente 100%.
