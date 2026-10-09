import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { insertTestUser, setupTestDb } from "@/test/db";
import { db } from "../client";
import { category, categoryPercent, subcategory } from "../schema";
import { categoriesRepo } from "./categories";

setupTestDb();

const NOW = new Date("2026-10-15T15:00:00Z"); // October 2026 in America/Sao_Paulo
const OCT = { year: 2026, month: 10 };

/** Inserts a sealed category and its sealed percent versions; returns the category id. */
async function insertSealed(
  userId: string,
  input: {
    nameCt: string;
    color?: number;
    isInvestment?: boolean;
    deletedFrom?: string;
    versions?: { fromMonth: string; percentCt: string }[];
  },
) {
  const [row] = await db
    .insert(category)
    .values({
      userId,
      nameCt: input.nameCt,
      color: input.color ?? 1,
      isInvestment: input.isInvestment ?? false,
      deletedFrom: input.deletedFrom,
    })
    .returning({ id: category.id });
  for (const v of input.versions ?? [{ fromMonth: "0001-01-01", percentCt: "v1:p" }]) {
    await db.insert(categoryPercent).values({ categoryId: row.id, ...v });
  }
  return row.id;
}

describe("categoriesRepo.listForMonthSealed", () => {
  it("returns every percent version with the sealed name, whichever month is asked", async () => {
    const userId = await insertTestUser();
    const id = await insertSealed(userId, {
      nameCt: "v1:nomea",
      color: 3,
      isInvestment: true,
      versions: [
        { fromMonth: "0001-01-01", percentCt: "v1:p50" },
        { fromMonth: "2026-10-01", percentCt: "v1:p40" },
      ],
    });

    const expected = [
      {
        id,
        color: 3,
        isInvestment: true,
        deleted: false,
        nameCt: "v1:nomea",
        versions: [
          { fromMonth: "0001-01-01", percentCt: "v1:p50" },
          { fromMonth: "2026-10-01", percentCt: "v1:p40" },
        ],
        subcategories: [],
      },
    ];
    expect(await categoriesRepo.listForMonthSealed(userId, { year: 2026, month: 9 }, NOW)).toEqual(expected);
    expect(await categoriesRepo.listForMonthSealed(userId, OCT, NOW)).toEqual(expected);
    expect(await categoriesRepo.listForMonthSealed(userId, { year: 2027, month: 3 }, NOW)).toEqual(expected);
  });

  it("orders the versions by from_month regardless of insertion order", async () => {
    const userId = await insertTestUser();
    await insertSealed(userId, {
      nameCt: "v1:a",
      versions: [
        { fromMonth: "2026-10-01", percentCt: "v1:c" },
        { fromMonth: "0001-01-01", percentCt: "v1:a" },
        { fromMonth: "2026-05-01", percentCt: "v1:b" },
      ],
    });

    const [cat] = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(cat.versions.map((v) => v.percentCt)).toEqual(["v1:a", "v1:b", "v1:c"]);
  });

  it("lists the categories in creation order", async () => {
    const userId = await insertTestUser();
    for (const nameCt of ["v1:primeira", "v1:segunda", "v1:terceira"]) {
      await insertSealed(userId, { nameCt });
    }

    const listed = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(listed.map((c) => c.nameCt)).toEqual(["v1:primeira", "v1:segunda", "v1:terceira"]);
  });

  it("shows a deleted category before deleted_from, flagged deleted, and hides it from that month on", async () => {
    const userId = await insertTestUser();
    await insertSealed(userId, { nameCt: "v1:fica" });
    await insertSealed(userId, { nameCt: "v1:sai", deletedFrom: "2026-10-01" });

    const sep = await categoriesRepo.listForMonthSealed(userId, { year: 2026, month: 9 }, NOW);
    expect(sep.map((c) => [c.nameCt, c.deleted])).toEqual([
      ["v1:fica", false],
      ["v1:sai", true],
    ]);
    expect(sep.every((c) => !("deletedFrom" in c))).toBe(true);
    const names = async (month: { year: number; month: number }) =>
      (await categoriesRepo.listForMonthSealed(userId, month, NOW)).map((c) => c.nameCt);
    expect(await names(OCT)).toEqual(["v1:fica"]);
    expect(await names({ year: 2026, month: 11 })).toEqual(["v1:fica"]);
  });

  it("lists each category's subcategories in creation order, empty when it has none", async () => {
    const userId = await insertTestUser();
    const a = await insertSealed(userId, { nameCt: "v1:a" });
    const b = await insertSealed(userId, { nameCt: "v1:b" });
    const subs: { id: string; nameCt: string }[] = [];
    for (const nameCt of ["v1:streaming", "v1:restaurante", "v1:cinema"]) {
      const [row] = await db
        .insert(subcategory)
        .values({ userId, categoryId: b, nameCt })
        .returning({ id: subcategory.id });
      subs.push({ id: row.id, nameCt });
    }

    const listed = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(listed.find((c) => c.id === a)!.subcategories).toEqual([]);
    expect(listed.find((c) => c.id === b)!.subcategories).toEqual(subs);
  });

  it("returns only the categories and subcategories of the requested user", async () => {
    const userId = await insertTestUser();
    const otherId = await insertTestUser();
    const mine = await insertSealed(userId, { nameCt: "v1:minha" });
    const theirs = await insertSealed(otherId, { nameCt: "v1:dela" });
    await db.insert(subcategory).values({ userId, categoryId: mine, nameCt: "v1:sub" });
    await db.insert(subcategory).values({ userId: otherId, categoryId: theirs, nameCt: "v1:segredo" });

    const result = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(result.map((c) => c.nameCt)).toEqual(["v1:minha"]);
    expect(result[0].subcategories.map((s) => s.nameCt)).toEqual(["v1:sub"]);
  });

  it("exposes no plain-text name or percent field, and the raw columns hold only ciphertext", async () => {
    const userId = await insertTestUser();
    const id = await insertSealed(userId, { nameCt: "v1:nome" });
    await db.insert(subcategory).values({ userId, categoryId: id, nameCt: "v1:sub" });

    const [cat] = await categoriesRepo.listForMonthSealed(userId, OCT, NOW);
    expect(Object.keys(cat).sort()).toEqual(
      ["color", "deleted", "id", "isInvestment", "nameCt", "subcategories", "versions"],
    );
    expect(Object.keys(cat.versions[0]).sort()).toEqual(["fromMonth", "percentCt"]);
    expect(Object.keys(cat.subcategories[0]).sort()).toEqual(["id", "nameCt"]);

    const [rawCategory] = await db.select().from(category).where(eq(category.id, id));
    expect(rawCategory.nameCt!.startsWith("v1:")).toBe(true);
    expect(rawCategory.name).toBeNull();
    const [rawPercent] = await db.select().from(categoryPercent).where(eq(categoryPercent.categoryId, id));
    expect(rawPercent.percentCt!.startsWith("v1:")).toBe(true);
    expect(rawPercent.percentMicro).toBeNull();
    const [rawSub] = await db.select().from(subcategory).where(eq(subcategory.categoryId, id));
    expect(rawSub.nameCt!.startsWith("v1:")).toBe(true);
    expect(rawSub.name).toBeNull();
  });
});
