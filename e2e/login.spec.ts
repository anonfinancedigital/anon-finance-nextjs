import { expect, test } from "@playwright/test";
import { ADMIN, fillLogin, resetDatabase } from "./helpers";

test.beforeEach(resetDatabase);

test("valid credentials sign in and land on /", async ({ page }) => {
  await fillLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL("/");
});

test("wrong password shows the invalid credentials message", async ({ page }) => {
  await fillLogin(page, ADMIN.email, "senha-errada-000");
  await expect(page.getByText("E-mail ou senha inválidos", { exact: true })).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("the eye button shows and hides the password without submitting the form", async ({ page }) => {
  await page.goto("/login");
  const password = page.getByLabel("Senha", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveAttribute("autocomplete", "current-password");

  // Valid credentials: if the eye button submitted the form, the page would leave /login.
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await password.fill(ADMIN.password);
  const show = page.getByRole("button", { name: "Mostrar senha" });
  await expect(show).toHaveAttribute("type", "button");
  await expect(show.locator("svg.lucide-eye")).toBeVisible();
  await show.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue(ADMIN.password);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL("/login");

  const hide = page.getByRole("button", { name: "Ocultar senha" });
  await expect(hide.locator("svg.lucide-eye-off")).toBeVisible();
  await hide.click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue(ADMIN.password);
});
