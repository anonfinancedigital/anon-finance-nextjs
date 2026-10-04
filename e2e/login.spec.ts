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
