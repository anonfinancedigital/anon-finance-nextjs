import { expect, test } from "@playwright/test";
import { currentMonth } from "../src/lib/domain/month";
import { login, resetDatabase, seedCategories, seedTransaction } from "./helpers";

test.beforeEach(resetDatabase);

test("without ?mes the current month (America/Sao_Paulo) is shown", async ({ page }) => {
  const { year, month } = currentMonth(new Date());
  const today = `${year}-${String(month).padStart(2, "0")}`;
  await seedTransaction({ kind: "income", amountCents: 123400, date: `${today}-01` });

  await login(page);
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Mês", { exact: true })).toHaveValue(today);
  await expect(page.getByTestId("total-income")).toHaveText("R$ 1.234,00");
});

test("switching between September and October shows each month's own totals", async ({ page }) => {
  const [conforto] = await seedCategories([{ name: "Conforto", percent: 100 }]);
  await seedTransaction({ kind: "expense", amountCents: 10000, date: "2026-09-10", categoryId: conforto.id, description: "Setembro" });
  await seedTransaction({ kind: "expense", amountCents: 25000, date: "2026-10-05", categoryId: conforto.id, description: "Outubro" });

  await login(page);
  await page.goto("/?mes=2026-09");
  await expect(page.getByTestId("month-label")).toHaveText("setembro de 2026");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 100,00");
  await expect(page.getByTestId("transaction-row")).toHaveText([/Setembro/]);

  await page.getByRole("link", { name: "Próximo mês" }).click();
  await expect(page).toHaveURL("/?mes=2026-10");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 250,00");
  await expect(page.getByTestId("transaction-row")).toHaveText([/Outubro/]);

  await page.getByRole("link", { name: "Mês anterior" }).click();
  await expect(page).toHaveURL("/?mes=2026-09");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 100,00");

  await page.getByLabel("Mês", { exact: true }).fill("2026-10");
  await expect(page).toHaveURL("/?mes=2026-10");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 250,00");
});

test("reloading keeps the month selected in the URL", async ({ page }) => {
  await seedTransaction({ kind: "income", amountCents: 70000, date: "2026-09-02" });

  await login(page);
  await page.goto("/?mes=2026-10");
  await page.getByRole("link", { name: "Mês anterior" }).click();
  await expect(page).toHaveURL("/?mes=2026-09");

  await page.reload();
  await expect(page).toHaveURL("/?mes=2026-09");
  await expect(page.getByLabel("Mês", { exact: true })).toHaveValue("2026-09");
  await expect(page.getByTestId("total-income")).toHaveText("R$ 700,00");
});

test("an expense dated in another month goes to that month, not the displayed one", async ({
  page,
}) => {
  await seedCategories([{ name: "Conforto", percent: 100 }]);

  await login(page);
  await page.goto("/?mes=2026-10");
  const form = page.getByRole("form", { name: "Nova transação" });
  await form.getByLabel("Gasto", { exact: true }).check();
  await form.getByLabel("Valor (R$)").fill("80,00");
  await form.getByLabel("Data").fill("2026-09-15");
  await form.getByLabel("Categoria").selectOption({ label: "Conforto" });
  await form.getByLabel("Descrição (opcional)").fill("Farmácia");
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(form.getByText("Transação salva", { exact: true })).toBeVisible();

  await expect(page.getByTestId("total-spent")).toHaveText("R$ 0,00");
  await expect(page.getByText("Nenhuma transação neste mês", { exact: true })).toBeVisible();

  await page.goto("/?mes=2026-09");
  await expect(page.getByTestId("total-spent")).toHaveText("R$ 80,00");
  await expect(page.getByTestId("transaction-row")).toHaveText([/Farmácia/]);
});
