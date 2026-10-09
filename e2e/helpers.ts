import { randomUUID } from "node:crypto";
import { expect, type Locator, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { user } from "../src/lib/db/auth-schema";
import { transaction } from "../src/lib/db/schema";
import { seedAdminFromEnv } from "../src/lib/db/seed-user";
import { insertCategory } from "../src/test/db";
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
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Signs in as the admin and waits for the redirect to /. */
export async function login(page: Page) {
  await fillLogin(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL("/");
}

/** Id of the seeded admin user. */
export async function adminUserId(): Promise<string> {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, ADMIN.email));
  return row.id;
}

/**
 * Saves the admin's category set straight in the database; returns it with ids, in order.
 * Without `color`, the n-th category gets palette color ((n − 1) mod 8) + 1.
 */
export async function seedCategories(cats: { name: string; percent: number; color?: number }[]) {
  const userId = await adminUserId();
  const saved = [];
  for (const [i, c] of cats.entries()) {
    const percentMicro = c.percent * 1_000_000;
    const row = await insertCategory(userId, { name: c.name, percentMicro, color: c.color ?? (i % 8) + 1 });
    saved.push({ id: row.id, name: c.name, percentMicro, color: row.color });
  }
  return saved;
}

/** Inserts one admin transaction straight in the database. */
export async function seedTransaction(tx: {
  kind: "income" | "expense";
  amountCents: number;
  date: string;
  categoryId?: string;
  description?: string;
}) {
  await db.insert(transaction).values({ id: randomUUID(), userId: await adminUserId(), ...tx });
}

/** Chooses an option of a `SelectField` (a Radix dropdown, not a native select). */
export async function chooseOption(trigger: Locator, label: string) {
  await trigger.click();
  await trigger.page().getByRole("option", { name: label, exact: true }).click();
}
