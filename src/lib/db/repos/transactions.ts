import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lt, not, or, sql } from "drizzle-orm";
import {
  type Segment,
  appliesInMonth,
  monthKey,
  occurrenceDate,
  planEdit,
} from "@/lib/domain/recurrence";
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

/** A transaction as shown in a month: recurring rows carry the occurrence's projected date. */
export type Occurrence = Transaction & {
  recurring: boolean;
  /** First day of the final month; null = no end (or not recurring). */
  recurrenceEnd: string | null;
  /** AAAA-MM of the month the occurrence belongs to. */
  month: string;
};

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

/** Recurrence columns of a planned segment. */
const segmentFields = (seg: Omit<Segment, "id">) => ({
  date: seg.date,
  recurring: seg.recurringDay !== null,
  recurrenceDay: seg.recurringDay,
  recurrenceEnd: seg.endMonth === null ? null : `${seg.endMonth}-01`,
  seriesId: seg.seriesId,
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Locks and loads the segment `id` of the user and every segment of its series. Returns null when
 * the user has no such row or it has no occurrence in `month`.
 */
async function lockSeries(tx: Tx, userId: string, id: string, month: string) {
  const toSegment = (row: {
    id: string;
    seriesId: string | null;
    date: string;
    recurrenceDay: number | null;
    recurrenceEnd: string | null;
  }): Segment => ({
    id: row.id,
    seriesId: row.seriesId,
    date: row.date,
    recurringDay: row.recurrenceDay,
    endMonth: row.recurrenceEnd === null ? null : monthKey(row.recurrenceEnd),
  });
  const select = {
    id: transaction.id,
    seriesId: transaction.seriesId,
    date: transaction.date,
    recurrenceDay: transaction.recurrenceDay,
    recurrenceEnd: transaction.recurrenceEnd,
  };
  const [row] = await tx.select(select).from(transaction).where(ownedBy(userId, id)).for("update");
  if (!row || !appliesInMonth(toSegment(row), month)) return null;
  if (row.seriesId === null) return [toSegment(row)];
  const rows = await tx
    .select(select)
    .from(transaction)
    .where(and(eq(transaction.userId, userId), eq(transaction.seriesId, row.seriesId)))
    .for("update");
  return rows.map(toSegment);
}

/**
 * Edits the occurrence of `month` (AAAA-MM) of row `id`: the data applies to that month and every
 * later one; earlier months keep their values (splits the series, see `planEdit`). Returns false
 * when the user has no such row or it has no occurrence in `month`.
 */
async function updateFrom(
  userId: string,
  id: string,
  month: string,
  data: TransactionData,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const segments = await lockSeries(tx, userId, id, month);
    if (!segments) return false;
    const recurring = (data.recurrence ?? "none") !== "none";
    const plan = planEdit({
      segments,
      id,
      month,
      next: {
        date: data.date,
        recurring,
        endMonth: data.recurrence === "until" ? (data.recurrenceEndMonth ?? null) : null,
      },
    });
    const now = sql`clock_timestamp()`;
    if (plan.deleteIds.length > 0) {
      await tx
        .delete(transaction)
        .where(and(eq(transaction.userId, userId), inArray(transaction.id, plan.deleteIds)));
    }
    if (plan.truncate) {
      await tx
        .update(transaction)
        .set({ recurrenceEnd: `${plan.truncate.endMonth}-01`, updatedAt: now })
        .where(ownedBy(userId, plan.truncate.id));
    }
    if (plan.updateInPlace) {
      await tx
        .update(transaction)
        .set({ ...fields(data), ...segmentFields(plan.updateInPlace), updatedAt: now })
        .where(ownedBy(userId, plan.updateInPlace.id));
    }
    if (plan.insert) {
      await tx
        .insert(transaction)
        .values({ id: randomUUID(), userId, ...fields(data), ...segmentFields(plan.insert) });
    }
    return true;
  });
}

/** Returns false when the user has no transaction with this id. */
async function remove(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(transaction)
    .where(ownedBy(userId, id))
    .returning({ id: transaction.id });
  return rows.length > 0;
}

/** The month's occurrences, latest projected date first (ties: most recently created first). */
async function listByMonth(userId: string, range: MonthRange): Promise<Occurrence[]> {
  const rows = await db
    .select({
      ...columns,
      recurring: transaction.recurring,
      recurrenceDay: transaction.recurrenceDay,
      recurrenceEnd: transaction.recurrenceEnd,
    })
    .from(transaction)
    .where(applicableInMonth(userId, range))
    // Ties keep this order (stable sort below): createdAt at full database precision.
    .orderBy(desc(transaction.createdAt));
  const month = monthKey(range.start);
  return rows
    .map(({ recurrenceDay, ...row }) => ({
      ...row,
      date: occurrenceDate(
        { id: row.id, seriesId: null, date: row.date, recurringDay: recurrenceDay, endMonth: null },
        month,
      ),
      month,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
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

export const transactionsRepo = {
  create,
  update,
  updateFrom,
  delete: remove,
  listByMonth,
  monthTotals,
};
