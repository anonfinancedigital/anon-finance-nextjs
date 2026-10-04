import { and, desc, eq, gte, isNull, lt, not, or, sql } from "drizzle-orm";
import { db } from "../client";
import { transaction } from "../schema";

export type MonthRange = { start: string; endExclusive: string };

export type TransactionData = {
  kind: "income" | "expense";
  amountCents: number;
  /** Calendar day, AAAA-MM-DD. */
  date: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  description?: string | null;
  /** Omitted = "none". */
  recurrence?: "none" | "forever" | "until";
  /** AAAA-MM, inclusive; read only when `recurrence` is "until". */
  recurrenceEndMonth?: string | null;
};

export type Transaction = Omit<
  typeof transaction.$inferSelect,
  "userId" | "recurring" | "recurrenceDay" | "recurrenceEnd" | "seriesId"
>;

const columns = {
  id: transaction.id,
  kind: transaction.kind,
  amountCents: transaction.amountCents,
  date: transaction.date,
  categoryId: transaction.categoryId,
  subcategoryId: transaction.subcategoryId,
  description: transaction.description,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
};

const fields = (tx: TransactionData) => ({
  kind: tx.kind,
  amountCents: tx.amountCents,
  date: tx.date,
  categoryId: tx.categoryId ?? null,
  subcategoryId: tx.subcategoryId ?? null,
  description: tx.description ?? null,
});

const ownedBy = (userId: string, id: string) =>
  and(eq(transaction.id, id), eq(transaction.userId, userId));

const inMonth = (userId: string, range: MonthRange) =>
  and(
    eq(transaction.userId, userId),
    gte(transaction.date, range.start),
    lt(transaction.date, range.endExclusive),
  );

/**
 * Rows with an occurrence in the month: single rows dated in it, and recurring segments that
 * started by the month's end and have not ended before its start (AD-004).
 */
const applicableInMonth = (userId: string, range: MonthRange) =>
  and(
    eq(transaction.userId, userId),
    or(
      and(
        not(transaction.recurring),
        gte(transaction.date, range.start),
        lt(transaction.date, range.endExclusive),
      ),
      and(
        transaction.recurring,
        lt(transaction.date, range.endExclusive),
        or(isNull(transaction.recurrenceEnd), gte(transaction.recurrenceEnd, range.start)),
      ),
    ),
  );

/** Recurrence columns of a new series starting at `tx.date`, whose id is `id`. */
const recurrenceFields = (id: string, tx: TransactionData) => {
  const recurring = (tx.recurrence ?? "none") !== "none";
  return {
    recurring,
    recurrenceDay: recurring ? Number(tx.date.slice(8, 10)) : null,
    recurrenceEnd:
      tx.recurrence === "until" && tx.recurrenceEndMonth ? `${tx.recurrenceEndMonth}-01` : null,
    seriesId: recurring ? id : null,
  };
};

/** Idempotent by the client-generated id: a repeated id is ignored. */
async function create(userId: string, tx: TransactionData & { id: string }): Promise<void> {
  await db
    .insert(transaction)
    .values({ id: tx.id, userId, ...fields(tx), ...recurrenceFields(tx.id, tx) })
    .onConflictDoNothing({ target: transaction.id });
}

/** Last write wins. Returns false when the user has no transaction with this id. */
async function update(userId: string, id: string, tx: TransactionData): Promise<boolean> {
  const rows = await db
    .update(transaction)
    .set({ ...fields(tx), updatedAt: sql`clock_timestamp()` })
    .where(ownedBy(userId, id))
    .returning({ id: transaction.id });
  return rows.length > 0;
}

/** Returns false when the user has no transaction with this id. */
async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(transaction)
    .where(ownedBy(userId, id))
    .returning({ id: transaction.id });
  return rows.length > 0;
}

/** The month's transactions, latest date first (ties: most recently created first). */
async function listByMonth(userId: string, range: MonthRange): Promise<Transaction[]> {
  return db
    .select(columns)
    .from(transaction)
    .where(inMonth(userId, range))
    .orderBy(desc(transaction.date), desc(transaction.createdAt));
}

export type MonthTotals = {
  incomeCents: number;
  spentByCategory: Map<string, number>;
  /** Per category, spending by subcategory; the `null` key holds expenses without one. */
  spentBySubcategory: Map<string, Map<string | null, number>>;
};

/** Month income and spending per category and subcategory, from a single SUM … GROUP BY. */
async function monthTotals(userId: string, range: MonthRange): Promise<MonthTotals> {
  const rows = await db
    .select({
      kind: transaction.kind,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      cents: sql<number>`sum(${transaction.amountCents})`.mapWith(Number),
    })
    .from(transaction)
    .where(applicableInMonth(userId, range))
    .groupBy(transaction.kind, transaction.categoryId, transaction.subcategoryId);

  const totals: MonthTotals = {
    incomeCents: 0,
    spentByCategory: new Map(),
    spentBySubcategory: new Map(),
  };
  for (const row of rows) {
    if (row.kind === "income") {
      totals.incomeCents += row.cents;
    } else if (row.categoryId) {
      totals.spentByCategory.set(
        row.categoryId,
        (totals.spentByCategory.get(row.categoryId) ?? 0) + row.cents,
      );
      const bySub = totals.spentBySubcategory.get(row.categoryId) ?? new Map();
      bySub.set(row.subcategoryId, row.cents);
      totals.spentBySubcategory.set(row.categoryId, bySub);
    }
  }
  return totals;
}

export const transactionsRepo = { create, update, delete: remove, listByMonth, monthTotals };
