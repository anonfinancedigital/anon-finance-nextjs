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

test("each pie slice and its legend swatch use the category's chosen color", async ({ page }) => {
  const [moradia, metas] = await seedCategories([
    { name: "Moradia", percent: 70, color: 1 },
    { name: "Metas", percent: 30, color: 7 },
  ]);
  await seedTransaction({ kind: "income", amountCents: 500000, date: "2026-09-01" });
  await seedTransaction({ kind: "expense", amountCents: 100000, date: "2026-09-05", categoryId: moradia.id });
  await seedTransaction({ kind: "expense", amountCents: 50000, date: "2026-09-06", categoryId: metas.id });

  await login(page);
  await page.goto("/?mes=2026-09");

  const pie = page.getByTestId("pie-chart");
  // Roxo (7) is "Metas"'s color, not its position in the set (2nd).
  await expect(pie.locator('.recharts-pie-sector path[fill="var(--viz-7)"]')).toHaveCount(1);
  await expect(pie.locator('.recharts-pie-sector path[fill="var(--viz-1)"]')).toHaveCount(1);
  await expect(pie.locator('.recharts-pie-sector path[fill="var(--viz-2)"]')).toHaveCount(0);
  const swatch = (name: string) => pie.getByRole("listitem").filter({ hasText: name }).locator("span").first();
  await expect(swatch("Metas")).toHaveAttribute("style", /background: ?var\(--viz-7\)/);
  await expect(swatch("Moradia")).toHaveAttribute("style", /background: ?var\(--viz-1\)/);
});

test("with 9 categories with spending the pie shows 9 slices and no 'Outras'", async ({ page }) => {
  const names = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"];
  const cats = await seedCategories(names.map((name, i) => ({ name, percent: i === 0 ? 4 : 12 })));
  await seedTransaction({ kind: "income", amountCents: 1000000, date: "2026-09-01" });
  for (const [i, cat] of cats.entries()) {
    await seedTransaction({ kind: "expense", amountCents: 10000, date: "2026-09-05", categoryId: cat.id, description: `G${i}` });
  }

  await login(page);
  await page.goto("/?mes=2026-09");

  const pie = page.getByTestId("pie-chart");
  await expect(pie.locator(".recharts-pie-sector")).toHaveCount(9);
  await expect(pie.getByRole("listitem")).toHaveCount(9);
  await expect(pie).not.toContainText("Outras");
  // The 9th category keeps its own color (cycled back to 1) instead of a grey "other" slice.
  await expect(
    pie.getByRole("listitem").filter({ hasText: "C9" }).locator("span").first(),
  ).toHaveAttribute("style", /background: ?var\(--viz-1\)/);
  await expect(pie.locator('.recharts-pie-sector path[fill="var(--viz-other)"]')).toHaveCount(0);
});
