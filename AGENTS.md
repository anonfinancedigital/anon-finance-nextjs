<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## E2E suspenso (AD-005)

Testes e2e (Playwright) estão suspensos por decisão do projeto (`.specs/STATE.md`, AD-005). Vale para todo agente, inclusive Verifier e subagentes:

- Não escreva testes e2e novos nem peça/crie fix tasks de e2e.
- Não rode `npm run e2e` nem `playwright test`.
- Specs existentes em `e2e/` só mudam se o typecheck quebrar; nesse caso, ajuste mínimo, sem rodar.
- Evidência de UI vem de inspeção de código (`file:line`); lógica testável vai para unit/integration, que continuam obrigatórios.
