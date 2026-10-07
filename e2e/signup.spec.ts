import { expect, test } from "@playwright/test";
import { resetDatabase } from "./helpers";

const MISMATCH = "As senhas não coincidem";

test.beforeEach(resetDatabase);

test.describe("password confirmation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cadastro");
  });

  test("each password field has its own eye button", async ({ page }) => {
    const password = page.getByLabel("Senha", { exact: true });
    const confirm = page.getByLabel("Confirmar senha", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await expect(confirm).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Mostrar senha" }).first().click();

    await expect(password).toHaveAttribute("type", "text");
    await expect(confirm).toHaveAttribute("type", "password");
  });

  test("shows the mismatch while typing, keeps the submit disabled, and clears it when they match", async ({ page }) => {
    const password = page.getByLabel("Senha", { exact: true });
    const confirm = page.getByLabel("Confirmar senha", { exact: true });
    const submit = page.getByRole("button", { name: "Cadastrar" });

    await password.fill("12345678");
    await expect(page.getByText(MISMATCH)).toHaveCount(0); // empty confirmation shows nothing

    await confirm.fill("1234567");
    await expect(page.getByText(MISMATCH)).toBeVisible();
    await expect(submit).toBeDisabled();

    await confirm.fill("12345678");
    await expect(page.getByText(MISMATCH)).toHaveCount(0);
    await expect(submit).toBeEnabled();

    await password.fill("12345679"); // changing "Senha" re-runs the comparison
    await expect(page.getByText(MISMATCH)).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test("creates the signup when both passwords match", async ({ page }) => {
    await page.getByLabel("Nome").fill("Ana");
    await page.getByLabel("E-mail").fill("ana@example.com");
    await page.getByLabel("Senha", { exact: true }).fill("12345678");
    await page.getByLabel("Confirmar senha", { exact: true }).fill("12345678");
    await page.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.getByRole("status")).toContainText("Cadastro enviado");
  });
});
