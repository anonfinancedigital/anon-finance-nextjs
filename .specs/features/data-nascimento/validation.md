# Data de Nascimento no Cadastro Validation

## T3: cópia da migração 0013 (NASC-11)

Banco privado `orcamento_nasc_test`. Aplicadas as migrações até a 0012, inseridos o usuário `u1` (com objetivo, `birth_date = 1993-09-18`) e `u2` (sem objetivo), e então aplicada a 0013.

```
 id | birth_date
----+------------
 u1 | 1993-09-18
 u2 |
```

`financial_goal.birth_date` segue existindo (sai na 0014, T12).
