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

const income = (page: Page) => page.getByLabel("Receita de referência (R$)", { exact: true });
const amount = (page: Page, n: number) => page.getByTestId(`category-amount-${n}`);
const amountSum = (page: Page) => page.getByTestId("category-amount-sum");

const IMAGE_BUDGET = [
  { name: "Custos fixos", percent: 30 },
  { name: "Conforto", percent: 30 },
  { name: "Liberdade financeira", percent: 25 },
  { name: "Metas", percent: 7.5 },
  { name: "Conhecimento", percent: 2.5 },
  { name: "Prazeres", percent: 5 },
];

test("a reference income shows the amount of each category and their sum", async ({ page }) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");

  await expect(income(page)).toHaveValue("");
  const headers = await page.getByRole("columnheader").allTextContents();
  const valueAt = headers.indexOf("Valor (R$)");
  expect(headers.slice(valueAt - 1, valueAt + 2)).toEqual(["Percentual (%)", "Valor (R$)", "Ações"]);

  await income(page).fill("5000");
  const expected = ["R$ 1.500,00", "R$ 1.500,00", "R$ 1.250,00", "R$ 375,00", "R$ 125,00", "R$ 250,00"];
  for (const [i, value] of expected.entries()) await expect(amount(page, i + 1)).toHaveText(value);
  await expect(amountSum(page)).toHaveText("R$ 5.000,00");

  // Changing a percentage updates its amount and the sum without saving (sum ≠ 100% still shown).
  await percent(page, 4).fill("10");
  await expect(amount(page, 4)).toHaveText("R$ 500,00");
  await expect(amountSum(page)).toHaveText("R$ 5.125,00");
  await expect(page.getByText("Categorias salvas", { exact: true })).toHaveCount(0);

  // Changing the income updates every amount.
  await income(page).fill("1.000,00");
  await expect(amount(page, 1)).toHaveText("R$ 300,00");
  await expect(amountSum(page)).toHaveText("R$ 1.025,00");
});

test("an empty reference income shows a dash in every amount cell and the sum", async ({ page }) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");

  await income(page).fill("5000");
  await expect(amountSum(page)).toHaveText("R$ 5.000,00");
  await income(page).fill("");
  for (let n = 1; n <= IMAGE_BUDGET.length; n++) await expect(amount(page, n)).toHaveText("—");
  await expect(amountSum(page)).toHaveText("—");
});

for (const [typed, message] of [
  ["abc", "Valor inválido. Use o formato 1.234,56"],
  ["0", "O valor deve ser maior que zero"],
  ["1.000.000.000,00", "O valor máximo é R$ 999.999.999,99"],
]) {
  test(`an invalid reference income "${typed}" shows the parse error and dashes`, async ({ page }) => {
    await seedCategories(IMAGE_BUDGET);
    await login(page);
    await page.goto("/categorias");

    await income(page).fill(typed);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    for (let n = 1; n <= IMAGE_BUDGET.length; n++) await expect(amount(page, n)).toHaveText("—");
    await expect(amountSum(page)).toHaveText("—");
  });
}

test("a row without a valid percentage shows a dash; removing a row recalculates the sum", async ({
  page,
}) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");
  await income(page).fill("5000");

  await page.getByRole("button", { name: "Adicionar categoria" }).click();
  await expect(amount(page, 7)).toHaveText("—");
  await percent(page, 7).fill("abc");
  await expect(amount(page, 7)).toHaveText("—");
  await expect(amountSum(page)).toHaveText("R$ 5.000,00");

  await page.getByRole("button", { name: "Remover categoria 1" }).click();
  await expect(amountSum(page)).toHaveText("R$ 3.500,00");
});

test("saving keeps the reference income, does not send it, and a reload clears it", async ({
  page,
}) => {
  await seedCategories(IMAGE_BUDGET);
  await login(page);
  await page.goto("/categorias");
  await income(page).fill("4321,09");

  const bodies: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) {
      bodies.push(request.postData() ?? "");
    }
  });

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toContain("Custos fixos");
  expect(bodies[0]).not.toContain("4321");

  await expect(income(page)).toHaveValue("4321,09");
  await expect(amount(page, 1)).toHaveText("R$ 1.296,33");

  await page.reload();
  await expect(income(page)).toHaveValue("");
});
