# Restante com Sinal Positivo para Meta Superada Specification

## Problem Statement

Na tabela de gastos por categoria, uma categoria de investimento que superou a meta mostra "-R$ 1.160,82" na coluna Restante, em verde, ao lado do texto positivo "Excedeu a meta em R$ 1.160,82". O sinal de menos sugere déficit e contradiz a mensagem. A causa: `remainingCents = target - spent` fica negativo e a célula o formata direto (`src/components/summary-table.tsx`).

## Goals

- [ ] Categoria `exceeded` nunca mostra sinal de menos na coluna Restante.
- [ ] Despesa estourada (`overspent`) continua mostrando o valor negativo em vermelho, sem mudança.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Renomear a coluna Restante ou o cabeçalho | A coluna continua servindo despesas |
| Mudar `remainingCents` no domínio | O valor negativo segue válido para outros consumidores e testes |
| Tag "Excedeu a meta em ..." e barra de consumo | Já corretas |
| Gráfico de barras "Gasto × meta" | Não exibe a coluna Restante |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| "+ R$" ou rótulo "Excedente" | Prefixo "+" no valor: "+R$ 1.160,82"; cabeçalho e demais linhas inalterados | Menor mudança; a sugestão do pedido oferecia as duas opções; rótulo por linha pesaria a tabela | n |
| Formato do valor | "+" colado ao "R$", sem espaço, espelhando o "-R$ 622,18" já exibido | Consistência com o formato negativo existente | n |
| Cor | Mantém `text-income` (verde) | Já é a cor atual da linha exceeded | n |
| Meta atingida exatamente (gasto = meta) | Não é `exceeded`; mostra "R$ 0,00" sem sinal | `exceeded` exige gasto acima da meta | n |
| Sub-linhas de subcategoria | Não têm coluna Restante; sem mudança | Células vazias hoje | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Restante positivo para meta superada ⭐ MVP

**User Story**: Como usuário, quero ver o excedente de um investimento como valor positivo para não confundir superação da meta com déficit.

**Why P1**: Pedido direto; mudança isolada em uma célula.

**Acceptance Criteria**:

1. WHEN uma categoria tem `exceeded` verdadeiro com `exceededCents` de 116082 THEN the system SHALL mostrar "+R$ 1.160,82" na coluna Restante, em verde.
2. WHEN uma categoria tem `overspent` verdadeiro com restante de -62218 centavos THEN the system SHALL mostrar "-R$ 622,18" na coluna Restante, em vermelho.
3. WHEN uma categoria tem gasto menor que a meta, com restante de 50910 centavos THEN the system SHALL mostrar "R$ 509,10" na coluna Restante, em verde, sem prefixo.
4. WHEN uma categoria tem gasto igual à meta THEN the system SHALL mostrar "R$ 0,00" na coluna Restante, sem prefixo.
5. WHILE uma categoria está `exceeded`, the system SHALL manter a tag "Excedeu a meta em R$ 1.160,82" com o mesmo valor mostrado na coluna Restante.

**Independent Test**: Abrir o resumo com Liberdade Financeira (investimento) acima da meta e ler "+R$ 1.160,82" em Restante e na tag, sem "-".

---

## Edge Cases

- WHEN `exceededCents` é 1 centavo THEN the system SHALL mostrar "+R$ 0,01".
- WHEN o mês não tem renda e a meta é R$ 0,00 com investimento de R$ 50,00 THEN the system SHALL mostrar "+R$ 50,00" se a categoria estiver `exceeded`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RESTEXC-01 | P1: Restante positivo | - | Verified |
| RESTEXC-02 | P1: Restante positivo | - | Verified |
| RESTEXC-03 | P1: Restante positivo | - | Verified |
| RESTEXC-04 | P1: Restante positivo | - | Verified |
| RESTEXC-05 | P1: Restante positivo | - | Verified |

**Coverage:** 5 total, 5 mapped to tests, 0 unmapped

---

## Success Criteria

- [ ] Nenhuma linha `exceeded` exibe "-" na coluna Restante.
- [ ] Linhas `overspent` e dentro da meta ficam idênticas às de hoje.
