import { expect, test } from "@playwright/test";
import { login, resetDatabase, seedCategories, seedTransaction } from "./helpers";

test.beforeEach(resetDatabase);

test("the month's transactions are listed latest date first", async ({ page }) => {
  const [conforto] = await seedCategories([{ name: "Conforto", percent: 100 }]);
  // Inserted out of date order on purpose.
  await seedTransaction({ kind: "expense", amountCents: 1000, date: "2026-09-03", categoryId: conforto.id, description: "Padaria" });
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-20", description: "Salário" });
  await seedTransaction({ kind: "expense", amountCents: 3000, date: "2026-09-11", categoryId: conforto.id, description: "Cinema" });

  await login(page);
  await page.goto("/?mes=2026-09");

  const rows = page.getByTestId("transaction-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("20/09/2026");
  await expect(rows.nth(0)).toContainText("Salário");
  await expect(rows.nth(1)).toContainText("11/09/2026");
  await expect(rows.nth(1)).toContainText("Cinema");
  await expect(rows.nth(2)).toContainText("03/09/2026");
  await expect(rows.nth(2)).toContainText("Padaria");
});

test("editing the amount and deleting with confirmation are reflected in the list", async ({
  page,
}) => {
  const [conforto] = await seedCategories([{ name: "Conforto", percent: 100 }]);
  await seedTransaction({ kind: "expense", amountCents: 10000, date: "2026-09-10", categoryId: conforto.id, description: "Mercado" });

  await login(page);
  await page.goto("/?mes=2026-09");
  const row = page.getByTestId("transaction-row").filter({ hasText: "Mercado" });
  await expect(row).toContainText("R$ 100,00");

  await row.getByRole("button", { name: "Editar" }).click();
  const editForm = page.getByRole("form", { name: "Editar transação" });
  await expect(editForm.getByLabel("Valor (R$)")).toHaveValue("100,00");
  await editForm.getByLabel("Valor (R$)").fill("150,00");
  await editForm.getByRole("button", { name: "Salvar" }).click();
  await expect(editForm).toBeHidden();
  await expect(row).toContainText("R$ 150,00");

  await row.getByRole("button", { name: "Excluir" }).click();
  const confirm = page.getByRole("dialog", { name: "Excluir transação?" });
  await expect(confirm).toBeVisible();
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
  await confirm.getByRole("button", { name: "Excluir" }).click();

  await expect(page.getByTestId("transaction-row")).toHaveCount(0);
  await expect(page.getByText("Nenhuma transação neste mês", { exact: true })).toBeVisible();
});

test("a month without transactions shows the empty message", async ({ page }) => {
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-05", description: "Salário" });

  await login(page);
  await page.goto("/?mes=2026-08");

  await expect(page.getByText("Nenhuma transação neste mês", { exact: true })).toBeVisible();
  await expect(page.getByTestId("transaction-row")).toHaveCount(0);
});

test("an expense shows a marker in its category's color; an income shows none", async ({ page }) => {
  const [, metas] = await seedCategories([
    { name: "Moradia", percent: 70, color: 1 },
    { name: "Metas", percent: 30, color: 7 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01", description: "Salário" });
  await seedTransaction({ kind: "expense", amountCents: 20000, date: "2026-09-10", categoryId: metas.id, description: "Reserva" });

  await login(page);
  await page.goto("/?mes=2026-09");

  const markers = (description: string) =>
    page.getByTestId("transaction-row").filter({ hasText: description }).locator('span[aria-hidden][style*="--viz-"]');
  await expect(markers("Reserva")).toHaveCount(1);
  await expect(markers("Reserva")).toHaveAttribute("style", /background: ?var\(--viz-7\)/);
  await expect(markers("Salário")).toHaveCount(0);
});

test("searching by description narrows the list, combines with the category filter and survives reload", async ({
  page,
}) => {
  const [conforto, lazer] = await seedCategories([
    { name: "Conforto", percent: 60 },
    { name: "Lazer", percent: 40 },
  ]);
  await seedTransaction({ kind: "expense", amountCents: 1000, date: "2026-09-03", categoryId: conforto.id, description: "Café da manhã" });
  await seedTransaction({ kind: "expense", amountCents: 2000, date: "2026-09-04", categoryId: lazer.id, description: "Café com amigos" });
  await seedTransaction({ kind: "expense", amountCents: 90000, date: "2026-09-05", categoryId: conforto.id, description: "Aluguel" });

  await login(page);
  await page.goto("/?mes=2026-09");
  const rows = page.getByTestId("transaction-row");
  await expect(rows).toHaveCount(3);

  await page.getByLabel("Buscar por descrição").fill("CAFE");
  await expect(rows).toHaveCount(2);
  await expect(page).toHaveURL(/busca=CAFE/);

  await page.getByLabel("Filtrar por categoria").selectOption({ label: "Lazer" });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Café com amigos");
  await expect(page.getByLabel("Buscar por descrição")).toHaveValue("CAFE");
  // The summary keeps the whole month.
  await expect(page.getByTestId("total-spent")).toContainText("930,00");

  await page.reload();
  await expect(rows).toHaveCount(1);

  await page.getByLabel("Buscar por descrição").fill("zzz");
  await expect(page.getByText("Nenhuma transação encontrada para esta busca")).toBeVisible();

  await page.getByLabel("Buscar por descrição").fill("");
  await expect(rows).toHaveCount(1);
});
