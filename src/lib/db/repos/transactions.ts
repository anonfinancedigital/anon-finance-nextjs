import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lt, not, or, sql } from "drizzle-orm";
import {
  type Installment,
  type Segment,
  appliesInMonth,
  installmentOf,
  monthKey,
  occurrenceDate,
  planDelete,
  planEdit,
  startOfSeries,
} from "@/lib/domain/recurrence";
import type { MonthPayload, TransactionDto, UpdateTransactionDto } from "@/lib/vault/types";
import { db } from "../client";
import { plain, transaction } from "../schema";

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
  /** AAAA-MM first month of the series; read only when `recurrence` is "until". */
  recurrenceStartMonth?: string | null;
  /** AAAA-MM, inclusive; read only when `recurrence` is "until". */
  recurrenceEndMonth?: string | null;
};

export type Transaction = Omit<
  typeof transaction.$inferSelect,
  | "userId"
  | "recurring"
  | "recurrenceDay"
  | "recurrenceEnd"
  | "seriesId"
  | "amountCents"
  | "amountCt"
  | "descriptionCt"
> & { amountCents: number };

/** A transaction as shown in a month: recurring rows carry the occurrence's projected date. */
export type Occurrence = Transaction & {
  recurring: boolean;
  /** First day of the final month; null = no end (or not recurring). */
  recurrenceEnd: string | null;
  /** AAAA-MM of the month the occurrence belongs to. */
  month: string;
  /** "N/T" of a series with an end month; null otherwise. */
  installment: Installment | null;
  /** AAAA-MM of the series' first month; null when not recurring. */
  seriesStart: string | null;
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

const NEW_SERIES = { id: "", seriesId: null, date: "", endMonth: null };

/**
 * Recurrence columns of a new series, whose id is `id`. It starts at `tx.date`, or, for "until",
 * on the day of `tx.date` in `recurrenceStartMonth`.
 */
const recurrenceFields = (id: string, tx: TransactionData) => {
  const recurring = (tx.recurrence ?? "none") !== "none";
  const day = Number(tx.date.slice(8, 10));
  const start = tx.recurrence === "until" ? tx.recurrenceStartMonth : null;
  return {
    recurring,
    date: start ? occurrenceDate({ ...NEW_SERIES, recurringDay: day }, start) : tx.date,
    recurrenceDay: recurring ? day : null,
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
        startMonth: data.recurrence === "until" ? (data.recurrenceStartMonth ?? null) : null,
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

/**
 * Deletes the occurrence of `month` (AAAA-MM) of row `id` and every later one; earlier months
 * stay (see `planDelete`). Returns false when the user has no such row or it has no occurrence
 * in `month`.
 */
async function deleteFrom(userId: string, id: string, month: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const segments = await lockSeries(tx, userId, id, month);
    if (!segments) return false;
    const plan = planDelete({ segments, id, month });
    if (plan.deleteIds.length > 0) {
      await tx
        .delete(transaction)
        .where(and(eq(transaction.userId, userId), inArray(transaction.id, plan.deleteIds)));
    }
    if (plan.truncate) {
      await tx
        .update(transaction)
        .set({ recurrenceEnd: `${plan.truncate.endMonth}-01`, updatedAt: sql`clock_timestamp()` })
        .where(ownedBy(userId, plan.truncate.id));
    }
    return true;
  });
}

/** Segments (id, series, date, day, end) of the user's series `seriesIds`, grouped by series. */
async function loadSeries(userId: string, seriesIds: string[]): Promise<Map<string, Segment[]>> {
  const bySeries = new Map<string, Segment[]>();
  if (seriesIds.length === 0) return bySeries;
  const rows = await db
    .select({
      id: transaction.id,
      seriesId: transaction.seriesId,
      date: transaction.date,
      recurrenceDay: transaction.recurrenceDay,
      recurrenceEnd: transaction.recurrenceEnd,
    })
    .from(transaction)
    .where(and(eq(transaction.userId, userId), inArray(transaction.seriesId, seriesIds)));
  for (const row of rows) {
    const list = bySeries.get(row.seriesId!) ?? [];
    list.push({
      id: row.id,
      seriesId: row.seriesId,
      date: row.date,
      recurringDay: row.recurrenceDay,
      endMonth: row.recurrenceEnd === null ? null : monthKey(row.recurrenceEnd),
    });
    bySeries.set(row.seriesId!, list);
  }
  return bySeries;
}

/**
 * Stored date and recurrence flag of the user's row, plus the first month (AAAA-MM) of its series
 * (null when not recurring); null when the row does not exist.
 */
async function findStored(
  userId: string,
  id: string,
): Promise<{ date: string; recurring: boolean; seriesStart: string | null } | null> {
  const [row] = await db
    .select({
      date: transaction.date,
      recurring: transaction.recurring,
      seriesId: transaction.seriesId,
    })
    .from(transaction)
    .where(ownedBy(userId, id));
  if (!row) return null;
  const segments = row.seriesId ? (await loadSeries(userId, [row.seriesId])).get(row.seriesId) : null;
  return {
    date: row.date,
    recurring: row.recurring,
    seriesStart: segments ? startOfSeries(segments) : null,
  };
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
      seriesId: transaction.seriesId,
    })
    .from(transaction)
    .where(applicableInMonth(userId, range))
    // Ties keep this order (stable sort below): createdAt at full database precision.
    .orderBy(desc(transaction.createdAt));
  const month = monthKey(range.start);
  const series = await loadSeries(userId, [
    ...new Set(rows.flatMap((r) => (r.seriesId ? [r.seriesId] : []))),
  ]);
  return rows
    .map(({ recurrenceDay, seriesId, amountCents, ...row }) => {
      const segments = seriesId ? series.get(seriesId) : undefined;
      return {
        ...row,
        amountCents: plain(amountCents, "transaction.amount_cents"),
        date: occurrenceDate(
          { id: row.id, seriesId: null, date: row.date, recurringDay: recurrenceDay, endMonth: null },
          month,
        ),
        month,
        installment: segments ? installmentOf(segments, month) : null,
        seriesStart: segments ? startOfSeries(segments) : null,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Recurrence fields of the sealed DTO in the shape the shared helpers read ("indefinite" = "forever"). */
const recurrenceData = (dto: TransactionDto) => ({
  date: dto.date,
  recurrence: dto.recurrence === "indefinite" ? ("forever" as const) : dto.recurrence,
  recurrenceStartMonth: dto.recurrenceStartMonth ?? null,
  recurrenceEndMonth: dto.recurrenceEndMonth ?? null,
});

/** Sealed columns of a row: the plain-text twins stay NULL. */
const sealedFields = (
  dto: Pick<TransactionDto, "kind" | "categoryId" | "subcategoryId">,
  ct: { amountCt: string; descriptionCt: string | null },
) => ({
  kind: dto.kind,
  categoryId: dto.categoryId,
  subcategoryId: dto.subcategoryId,
  amountCents: null,
  description: null,
  amountCt: ct.amountCt,
  descriptionCt: ct.descriptionCt,
});

/** Idempotent by the client-generated id: a repeated id is ignored. */
async function createSealed(userId: string, dto: TransactionDto): Promise<void> {
  await db
    .insert(transaction)
    .values({
      id: dto.id,
      userId,
      ...sealedFields(dto, dto),
      ...recurrenceFields(dto.id, { kind: dto.kind, amountCents: 0, ...recurrenceData(dto) }),
    })
    .onConflictDoNothing({ target: transaction.id });
}

/**
 * Same as `updateFrom` for a sealed account: the edited row takes `dto.amountCt`/`descriptionCt`;
 * the new segment of a split series is inserted with the client's `newRowId` and `insertedCt`.
 * A `newRowId` that already exists fails and rolls the whole edit back.
 */
async function updateFromSealed(
  userId: string,
  id: string,
  month: string,
  dto: UpdateTransactionDto,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const segments = await lockSeries(tx, userId, id, month);
    if (!segments) return false;
    const plan = planEdit({
      segments,
      id,
      month,
      next: {
        date: dto.date,
        recurring: dto.recurrence !== "none",
        endMonth: dto.recurrence === "until" ? (dto.recurrenceEndMonth ?? null) : null,
        startMonth: dto.recurrence === "until" ? (dto.recurrenceStartMonth ?? null) : null,
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
        .set({ ...sealedFields(dto, dto), ...segmentFields(plan.updateInPlace), updatedAt: now })
        .where(ownedBy(userId, plan.updateInPlace.id));
    }
    if (plan.insert) {
      await tx.insert(transaction).values({
        id: dto.newRowId,
        userId,
        ...sealedFields(dto, dto.insertedCt),
        ...segmentFields(plan.insert),
      });
    }
    return true;
  });
}

/** `listByMonth` for a sealed account: same occurrences, order and installments, values as ciphertext. */
async function listByMonthSealed(
  userId: string,
  range: MonthRange,
): Promise<MonthPayload["occurrences"]> {
  const rows = await db
    .select({
      id: transaction.id,
      kind: transaction.kind,
      date: transaction.date,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      amountCt: transaction.amountCt,
      descriptionCt: transaction.descriptionCt,
      recurring: transaction.recurring,
      recurrenceDay: transaction.recurrenceDay,
      recurrenceEnd: transaction.recurrenceEnd,
      seriesId: transaction.seriesId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    })
    .from(transaction)
    .where(applicableInMonth(userId, range))
    .orderBy(desc(transaction.createdAt));
  const month = monthKey(range.start);
  const series = await loadSeries(userId, [
    ...new Set(rows.flatMap((r) => (r.seriesId ? [r.seriesId] : []))),
  ]);
  return rows
    .map(({ recurrenceDay, seriesId, amountCt, ...row }) => {
      const segments = seriesId ? series.get(seriesId) : undefined;
      return {
        ...row,
        amountCt: plain(amountCt, "transaction.amount_ct"),
        date: occurrenceDate(
          { id: row.id, seriesId: null, date: row.date, recurringDay: recurrenceDay, endMonth: null },
          month,
        ),
        month,
        installment: segments ? installmentOf(segments, month) : null,
        seriesStart: segments ? startOfSeries(segments) : null,
      };
    })
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

/** Stored transactions of the user in any month (not occurrences), to tell first access from an empty month. */
async function countAll(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transaction)
    .where(eq(transaction.userId, userId));
  return row.total;
}

export const transactionsRepo = {
  create,
  update,
  updateFrom,
  findStored,
  delete: remove,
  deleteFrom,
  listByMonth,
  createSealed,
  updateFromSealed,
  listByMonthSealed,
  monthTotals,
  countAll,
};
