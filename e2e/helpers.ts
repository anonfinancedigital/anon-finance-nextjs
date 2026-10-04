import { expect, type Page } from "@playwright/test";
import { seedAdminFromEnv } from "../src/lib/db/seed-user";
import { truncateAll } from "../src/test/db-reset";

export const ADMIN = {
  email: process.env.ADMIN_EMAIL!,
  password: process.env.ADMIN_PASSWORD!,
};

/** Empties the test database and seeds the admin again. Call in `test.beforeEach`. */
export async function resetDatabase() {
  await truncateAll();
  await seedAdminFromEnv();
}

export async function fillLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Signs in as the admin and waits for the redirect to /. */
export async function login(page: Page) {
  await fillLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL("/");
}
