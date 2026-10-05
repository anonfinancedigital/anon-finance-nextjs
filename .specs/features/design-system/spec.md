# Design system

## Requisitos (EARS)
- DS-01: O sistema SHALL oferecer primitivos de UI (Button, Input, SelectField (Radix), Textarea, Select, Checkbox, RadioGroup, Card, Badge, Alert, Tabs, Tooltip, Dialog, Table, Progress, Label).
- DS-02: O sistema SHALL expor tokens de estado success, warning, info e destructive nos temas claro e escuro.
- DS-03: O sistema SHALL oferecer temas escuro e claro; WHEN o usuário aciona o alternador, SHALL aplicar/remover `.dark` em `<html>` e persistir a escolha em `localStorage`; sem escolha, SHALL usar o escuro, sem piscar o tema errado. Fontes Manrope e Sora, conforme `docs/DESIGN_SYSTEM_NOVO.md`.
- DS-04: O sistema SHALL ter a rota `/design-system`, protegida por sessão, listando tokens e componentes.
- DS-05: A página `/design-system` SHALL não ter violações axe em ambos os temas.
- DS-07: O shell SHALL ter barra lateral no desktop e barra inferior no mobile, com item ativo destacado.
- DS-06: Filtros e seletor de mês SHALL usar os primitivos, sem classes de campo duplicadas.

## Fora de escopo
Storybook; migração dos radios/checkboxes nativos e dos botões sem aparência (category-card, category-editor).

## Status
DS-01…DS-06 implementados; validação em `e2e/design-system.spec.ts`.
