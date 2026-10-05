import { expect, type Page, test } from "@playwright/test";
import { login, resetDatabase, seedCategories, chooseOption } from "./helpers";

test.beforeEach(resetDatabase);

const form = (page: Page) => page.getByRole("form", { name: "Registrar Lançamento" });

async function fillTransaction(
  page: Page,
  tx: { kind: "Saída de Caixa" | "Entrada de Capital"; amount: string; date: string; category?: string; description?: string },
) {
  const f = form(page);
  await f.getByLabel(tx.kind, { exact: true }).check();
  await f.getByLabel("Valor (R$)").fill(tx.amount);
  await f.getByLabel("Data").fill(tx.date);
  if (tx.category) await chooseOption(f.getByLabel("Categoria"), tx.category);
  if (tx.description) await f.getByLabel("Descrição (opcional)").fill(tx.description);
}

test("an income and an expense are saved and both appear in the month list", async ({ page }) => {
  await seedCategories([
    { name: "Conforto", percent: 30 },
    { name: "Custos fixos", percent: 70 },
  ]);
  await login(page);
  await page.goto("/?mes=2026-09");
  const rows = page.getByTestId("transaction-row");

  await fillTransaction(page, { kind: "Entrada de Capital", amount: "5.000", date: "2026-09-05", description: "Salário" });
  await form(page).getByRole("button", { name: "Salvar" }).click();
  await expect(rows).toHaveCount(1);

  await fillTransaction(page, {
    kind: "Saída de Caixa",
    amount: "200,00",
    date: "2026-09-06",
    category: "Conforto",
    description: "Jantar",
  });
  await form(page).getByRole("button", { name: "Salvar" }).click();

  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Salário" })).toContainText("R$ 5.000,00");
  await expect(rows.filter({ hasText: "Jantar" })).toContainText("Conforto");
  await expect(rows.filter({ hasText: "Jantar" })).toContainText("R$ 200,00");
});

test("amount 0 shows a validation message and keeps what was typed", async ({ page }) => {
  await seedCategories([{ name: "Conforto", percent: 100 }]);
  await login(page);
  await page.goto("/?mes=2026-09");

  await fillTransaction(page, {
    kind: "Saída de Caixa",
    amount: "0",
    date: "2026-09-06",
    category: "Conforto",
    description: "Jantar",
  });
  await form(page).getByRole("button", { name: "Salvar" }).click();

  const f = form(page);
  await expect(f.getByText("O valor deve ser maior que zero", { exact: true })).toBeVisible();
  await expect(f.getByLabel("Valor (R$)")).toHaveValue("0");
  await expect(f.getByLabel("Data")).toHaveValue("2026-09-06");
  await expect(f.getByLabel("Categoria").locator("option:checked")).toHaveText("Conforto");
  await expect(f.getByLabel("Descrição (opcional)")).toHaveValue("Jantar");
  await expect(page.getByTestId("transaction-row")).toHaveCount(0);
});

test("a fast double click on save creates a single transaction", async ({ page }) => {
  await seedCategories([{ name: "Conforto", percent: 100 }]);
  await login(page);
  await page.goto("/?mes=2026-09");

  await fillTransaction(page, {
    kind: "Saída de Caixa",
    amount: "50",
    date: "2026-09-06",
    category: "Conforto",
    description: "Café",
  });
  await form(page).getByRole("button", { name: "Salvar" }).dblclick();
  await expect(form(page).getByText("Transação salva", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("transaction-row")).toHaveCount(1);
});

test("without categories an expense points to creating categories first", async ({ page }) => {
  await login(page);
  await page.goto("/?mes=2026-09");

  const link = form(page).getByRole("link", { name: "Crie suas categorias primeiro" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL("/categorias");
});
