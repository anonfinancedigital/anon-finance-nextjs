import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { transactionsRepo } from "@/lib/db/repos/transactions";
import { category, categoryPercent, recurringPaid, transaction } from "@/lib/db/schema";
import { createSignedInUser } from "@/test/auth";
import { insertTestUser, setupTestDb } from "@/test/db";
import { setOccurrencePaid } from "./transactions-paid";

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => request.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");

setupTestDb();

const NOT_FOUND = { ok: false, error: "Transação não encontrada" };
const PAID_FAILED = { ok: false, error: "Não foi possível atualizar o estado. Tente novamente." };

let userId: string;
let categoryId: string;

async function insertRecurring(owner: string, date = "2026-10-15") {
  const id = randomUUID();
  await db.insert(transaction).values({
    id,
    userId: owner,
    kind: "expense",
    date,
    categoryId,
    amountCt: "v1:valor",
    descriptionCt: "v1:desc",
    recurring: true,
    recurrenceDay: Number(date.slice(8)),
    recurrenceEnd: null,
    seriesId: id,
  });
  return id;
}

const paidRows = () => db.select().from(recurringPaid);

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  const signedIn = await createSignedInUser();
  userId = signedIn.userId;
  request.headers = new Headers({ cookie: signedIn.cookie });
  const [cat] = await db.insert(category).values({ userId, nameCt: "v1:cat", color: 1 }).returning();
  await db.insert(categoryPercent).values({ categoryId: cat.id, fromMonth: "0001-01-01", percentCt: "v1:p" });
  categoryId = cat.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("setOccurrencePaid", () => {
  it("marks the month as paid, returns ok and revalidates /", async () => {
    const id = await insertRecurring(userId);

    expect(await setOccurrencePaid(id, "2026-11", true)).toEqual({ ok: true });

    expect(await paidRows()).toEqual([{ userId, seriesId: id, month: "2026-11-01" }]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("unmarks only the given month", async () => {
    const id = await insertRecurring(userId);
    await setOccurrencePaid(id, "2026-11", true);
    await setOccurrencePaid(id, "2026-12", true);

    expect(await setOccurrencePaid(id, "2026-11", false)).toEqual({ ok: true });

    expect(await paidRows()).toEqual([{ userId, seriesId: id, month: "2026-12-01" }]);
  });

  it.each([
    ["id is not a uuid", () => "nao-uuid", "2026-11", true],
    ["month is not a valid month", (id: string) => id, "2026-13", true],
    ["month has the wrong format", (id: string) => id, "11/2026", true],
    ["paid is not a boolean", (id: string) => id, "2026-11", "true"],
  ])("rejects without writing when %s", async (_, pickId, month, paid) => {
    const id = await insertRecurring(userId);

    const result = await setOccurrencePaid(pickId(id), month, paid as boolean);

    expect(result).toMatchObject({ ok: false });
    expect(await paidRows()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers not found for an occurrence of another user, writing nothing", async () => {
    const other = await insertRecurring(await insertTestUser());

    expect(await setOccurrencePaid(other, "2026-11", true)).toEqual(NOT_FOUND);

    expect(await paidRows()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers not found for a month outside the series, writing nothing", async () => {
    const id = await insertRecurring(userId, "2026-10-15");

    expect(await setOccurrencePaid(id, "2026-09", true)).toEqual(NOT_FOUND);

    expect(await paidRows()).toEqual([]);
  });

  it("returns UNAUTHORIZED without a session and writes nothing", async () => {
    const id = await insertRecurring(userId);
    request.headers = new Headers();

    expect(await setOccurrencePaid(id, "2026-11", true)).toEqual({ ok: false, error: "UNAUTHORIZED" });

    expect(await paidRows()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers the generic failure when the repo throws", async () => {
    const id = await insertRecurring(userId);
    vi.spyOn(transactionsRepo, "setPaid").mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await setOccurrencePaid(id, "2026-11", true)).toEqual(PAID_FAILED);

    expect(await paidRows()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
