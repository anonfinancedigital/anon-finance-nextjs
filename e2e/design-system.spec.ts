import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login, resetDatabase } from "./helpers";

test.beforeEach(resetDatabase);

for (const theme of ["dark", "light"] as const) {
  test(`/design-system has no accessibility violations in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await login(page);
    await page.goto("/design-system");
    await expect(page.getByRole("heading", { name: "Design system", level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^((?!dark).)*$/);

    // Colors transition on first paint; axe must read the settled ones.
    await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
}

test("the theme toggle switches and remembers the theme", async ({ page }) => {
  await login(page);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("the sidebar marks the current page", async ({ page }) => {
  await login(page);
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Visão Geral" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Alocação" }).click();
  await expect(page).toHaveURL("/categorias");
  await expect(nav.getByRole("link", { name: "Alocação" })).toHaveAttribute("aria-current", "page");
});
