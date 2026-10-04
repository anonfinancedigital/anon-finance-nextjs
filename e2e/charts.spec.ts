import { expect, test } from "@playwright/test";
import { login, resetDatabase, seedCategories, seedTransaction } from "./helpers";

test.beforeEach(resetDatabase);

test("with spending in 3 categories both the bar and pie charts are shown", async ({ page }) => {
  const [moradia, conforto, lazer] = await seedCategories([
    { name: "Moradia", percent: 50 },
    { name: "Conforto", percent: 30 },
    { name: "Lazer", percent: 20 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 1000000, date: "2026-09-01" });
  await seedTransaction({ kind: "expense", amountCents: 200000, date: "2026-09-05", categoryId: moradia.id });
  await seedTransaction({ kind: "expense", amountCents: 100000, date: "2026-09-06", categoryId: conforto.id });
  await seedTransaction({ kind: "expense", amountCents: 100000, date: "2026-09-07", categoryId: lazer.id });

  await login(page);
  await page.goto("/?mes=2026-09");

  const bars = page.getByTestId("bar-chart");
  await expect(bars).toBeVisible();
  // One target bar and one spent bar per category.
  await expect(bars.locator(".recharts-bar-rectangle")).toHaveCount(6);
  await expect(bars).not.toContainText("Estourou R$");

  const pie = page.getByTestId("pie-chart");
  await expect(pie).toBeVisible();
  await expect(pie.locator(".recharts-pie-sector")).toHaveCount(3);
  // Shares of the R$ 4.000,00 spent: 2.000 / 1.000 / 1.000.
  await expect(pie.getByRole("listitem")).toHaveText(["Moradia50%", "Conforto25%", "Lazer25%"]);
  await expect(page.getByText("Sem gastos no mês", { exact: true })).toHaveCount(0);
});

test("an overspent category carries an 'Estourou' text label in the bar chart", async ({ page }) => {
  const [conforto, fixos] = await seedCategories([
    { name: "Conforto", percent: 30 },
    { name: "Custos fixos", percent: 70 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01" });
  await seedTransaction({ kind: "expense", amountCents: 160000, date: "2026-09-10", categoryId: conforto.id });
  await seedTransaction({ kind: "expense", amountCents: 100000, date: "2026-09-11", categoryId: fixos.id });

  await login(page);
  await page.goto("/?mes=2026-09");

  const bars = page.getByTestId("bar-chart");
  await expect(bars.locator(".recharts-label-list")).toContainText("Estourou R$ 100,00");
  // The overspent bar uses the distinct "over" color; the other spent bar does not.
  await expect(bars.locator('.recharts-bar-rectangle path[fill="var(--viz-over)"]')).toHaveCount(1);
  await expect(bars.locator('.recharts-bar-rectangle path[fill="var(--viz-spent)"]')).toHaveCount(1);
  // Only the overspent category is labeled.
  await expect(bars.locator(".recharts-label-list text").filter({ hasText: "Estourou" })).toHaveCount(1);
});

test("a month without spending shows 'Sem gastos no mês' and no pie chart", async ({ page }) => {
  await seedCategories([{ name: "Conforto", percent: 100 }]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01" });

  await login(page);
  await page.goto("/?mes=2026-09");

  await expect(page.getByText("Sem gastos no mês", { exact: true })).toBeVisible();
  await expect(page.getByTestId("pie-chart")).toHaveCount(0);
  await expect(page.getByTestId("bar-chart")).toBeVisible();
});
