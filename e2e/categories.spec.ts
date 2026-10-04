import { expect, type Page, test } from "@playwright/test";
import { login, resetDatabase, seedCategories, seedTransaction } from "./helpers";

test.beforeEach(resetDatabase);

const name = (page: Page, n: number) => page.getByLabel(`Nome da categoria ${n}`, { exact: true });
const percent = (page: Page, n: number) =>
  page.getByLabel(`Percentual da categoria ${n}`, { exact: true });

async function addCategories(page: Page, cats: [string, string][]) {
  for (const [i, [catName, catPercent]] of cats.entries()) {
    await page.getByRole("button", { name: "Adicionar categoria" }).click();
    await name(page, i + 1).fill(catName);
    await percent(page, i + 1).fill(catPercent);
  }
}

const BUDGET: [string, string][] = [
  ["Custos fixos", "30"],
  ["Conforto", "30"],
  ["Metas", "10"],
  ["Prazeres", "10"],
  ["Liberdade financeira", "20"],
];

test("categories summing 100% are saved and listed after reload", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, BUDGET);

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();

  await page.reload();
  for (const [i, [catName, catPercent]] of BUDGET.entries()) {
    await expect(name(page, i + 1)).toHaveValue(catName);
    await expect(percent(page, i + 1)).toHaveValue(catPercent);
  }
  await expect(name(page, BUDGET.length + 1)).toHaveCount(0);
});

test("a sum of 105% shows the sum message and disables saving", async ({ page }) => {
  await login(page);
  await page.goto("/categorias");
  await addCategories(page, [...BUDGET, ["Extra", "5"]]);

  await expect(
    page.getByText("A soma dos percentuais deve ser 100% (atual: 105%)", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();
});

test("removing a category that has expenses is blocked with the expense count", async ({
  page,
}) => {
  const [moradia] = await seedCategories([
    { name: "Moradia", percent: 50 },
    { name: "Lazer", percent: 50 },
  ]);
  await seedTransaction({ kind: "expense", amountCents: 1000, date: "2026-09-10", categoryId: moradia.id });
  await seedTransaction({ kind: "expense", amountCents: 2000, date: "2026-09-11", categoryId: moradia.id });

  await login(page);
  await page.goto("/categorias");
  await page.getByRole("button", { name: "Remover categoria 1" }).click();
  await percent(page, 1).fill("100");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(
    page.getByText("Esta categoria tem 2 gastos e não pode ser excluída", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(name(page, 1)).toHaveValue("Moradia");
  await expect(name(page, 2)).toHaveValue("Lazer");
});
