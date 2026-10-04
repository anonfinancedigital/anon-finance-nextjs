import { expect, test } from "@playwright/test";

for (const path of ["/", "/categorias"]) {
  test(`visitor without a session at ${path} is sent to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL("/login");
  });
}

test("/login is reachable without a session", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
