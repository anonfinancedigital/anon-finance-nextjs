import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { setupTestDb } from "@/test/db";
import { account, user } from "./auth-schema";
import { db } from "./client";
import { seedAdminFromEnv, seedUser } from "./seed-user";

setupTestDb();

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

describe("seedAdminFromEnv", () => {
  it("lets the env credentials sign in through Better Auth", async () => {
    const userId = await seedAdminFromEnv();

    const res = await auth.api.signInEmail({ body: { email, password } });
    expect(res.user.id).toBe(userId);
    expect(res.user.email).toBe(email);
    expect(res.token).toEqual(expect.any(String));
  });

  it("stores the password only as a salted hash", async () => {
    const userId = await seedAdminFromEnv();

    const [row] = await db.select().from(account).where(eq(account.userId, userId));
    expect(row.password).not.toBe(password);
    expect(row.password).not.toContain(password);
    expect(await verifyPassword({ hash: row.password!, password })).toBe(true);
  });

  it("does not duplicate the user when run twice", async () => {
    const first = await seedAdminFromEnv();
    const second = await seedAdminFromEnv();

    expect(second).toBe(first);
    expect(await db.$count(user)).toBe(1);
    expect(await db.$count(account)).toBe(1);
  });
});

describe("seedUser", () => {
  it("updates the password of an existing account", async () => {
    await seedUser("dono@example.com", "senha-antiga-123");
    await seedUser("dono@example.com", "senha-nova-456");

    const res = await auth.api.signInEmail({
      body: { email: "dono@example.com", password: "senha-nova-456" },
    });
    expect(res.user.email).toBe("dono@example.com");
    await expect(
      auth.api.signInEmail({ body: { email: "dono@example.com", password: "senha-antiga-123" } }),
    ).rejects.toThrow("Invalid email or password");
  });
});
