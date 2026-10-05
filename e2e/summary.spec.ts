import { expect, type Page, test } from "@playwright/test";
import { login, resetDatabase, seedCategories, seedTransaction, chooseOption } from "./helpers";

test.beforeEach(resetDatabase);

const summaryRow = (page: Page, category: string) =>
  page.getByTestId("summary-row").filter({ has: page.getByRole("cell", { name: category, exact: true }) });

test("income 5.000 and Conforto at 30% with 1.600 spent: target 1.500 and overspent by 100", async ({
  page,
}) => {
  const [conforto] = await seedCategories([
    { name: "Conforto", percent: 30 },
    { name: "Custos fixos", percent: 70 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01" });
  await seedTransaction({ kind: "expense", amountCents: 100000, date: "2026-09-10", categoryId: conforto.id });
  await seedTransaction({ kind: "expense", amountCents: 60000, date: "2026-09-12", categoryId: conforto.id });

  await login(page);
  await page.goto("/?mes=2026-09");

  const row = summaryRow(page, "Conforto");
  await expect(row.getByRole("cell")).toHaveText([
    "Conforto",
    "30%",
    "R$ 1.500,00",
    "R$ 1.600,00",
    "-R$ 100,00",
    "107%Estourou R$ 100,00",
  ]);

  const withinTarget = summaryRow(page, "Custos fixos");
  await expect(withinTarget).not.toContainText("Estourou");
  await expect(withinTarget.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(withinTarget).toContainText("R$ 3.500,00");

  await expect(page.getByTestId("total-income")).toHaveText("R$ 5.000,00");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 1.600,00");
  await expect(page.getByTestId("total-balance")).toHaveText("R$ 3.400,00");
});

test("the summary updates after adding an expense, without a manual reload", async ({ page }) => {
  await seedCategories([
    { name: "Conforto", percent: 30 },
    { name: "Custos fixos", percent: 70 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01" });

  await login(page);
  await page.goto("/?mes=2026-09");
  const row = summaryRow(page, "Conforto");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 0,00");
  await expect(row.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

  const form = page.getByRole("form", { name: "Registrar Lançamento" });
  await form.getByLabel("Saída de Caixa", { exact: true }).check();
  await form.getByLabel("Valor (R$)").fill("750,00");
  await form.getByLabel("Data").fill("2026-09-15");
  await chooseOption(form.getByLabel("Categoria"), "Conforto");
  await form.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByTestId("total-spent")).toHaveText("R$ 750,00");
  await expect(page.getByTestId("total-balance")).toHaveText("R$ 4.250,00");
  await expect(row.getByRole("cell").nth(3)).toHaveText("R$ 750,00");
  await expect(row.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(row).toContainText("50%");
});

test("a month with no income shows R$ 0,00 targets and spent categories as overspent", async ({
  page,
}) => {
  const [conforto] = await seedCategories([
    { name: "Conforto", percent: 30 },
    { name: "Custos fixos", percent: 70 },
  ]);
  await seedTransaction({ kind: "expense", amountCents: 5000, date: "2026-08-20", categoryId: conforto.id });

  await login(page);
  await page.goto("/?mes=2026-08");

  const spent = summaryRow(page, "Conforto");
  await expect(spent.getByRole("cell").nth(2)).toHaveText("R$ 0,00");
  await expect(spent).toHaveAttribute("data-overspent", "true");
  await expect(spent).toContainText("Estourou R$ 50,00");

  const untouched = summaryRow(page, "Custos fixos");
  await expect(untouched.getByRole("cell").nth(2)).toHaveText("R$ 0,00");
  await expect(untouched).not.toContainText("Estourou");
});

test("each summary row shows a marker in its category's chosen color", async ({ page }) => {
  await seedCategories([
    { name: "Moradia", percent: 70, color: 1 },
    { name: "Metas", percent: 30, color: 2 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01" });

  await login(page);
  await page.goto("/categorias");
  await page.getByRole("button", { name: /^Cor da categoria 2:/ }).click();
  await page
    .getByRole("radiogroup", { name: "Cor da categoria 2", exact: true })
    .getByRole("radio", { name: "Roxo", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Categorias salvas", { exact: true })).toBeVisible();

  await page.goto("/?mes=2026-09");
  const marker = (category: string) => summaryRow(page, category).getByRole("cell").first().locator("span[aria-hidden]");
  await expect(marker("Metas")).toHaveAttribute("style", /background: ?var\(--viz-7\)/);
  await expect(marker("Moradia")).toHaveAttribute("style", /background: ?var\(--viz-1\)/);
});
