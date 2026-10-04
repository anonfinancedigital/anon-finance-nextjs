import { expect, test } from "@playwright/test";
import { login, resetDatabase } from "./helpers";

test.beforeEach(resetDatabase);

test("Sair ends the session: lands on /login and / is no longer reachable", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/");
  await expect(page).toHaveURL("/login");
});
