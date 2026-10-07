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

  await password.fill("abc12345");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("abc12345");
  await expect(page).toHaveURL("/login");

  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("abc12345");
});
