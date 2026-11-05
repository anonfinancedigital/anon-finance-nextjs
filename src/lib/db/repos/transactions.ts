import { and, desc, eq, gt, gte, inArray, isNull, lt, not, or, type SQL, sql } from "drizzle-orm";
import {
  type EditPlan,
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
import { plain, recurringPaid, transaction } from "../schema";

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
  /** Paid in this month (AD-018): `true` paid; `false` or absent not paid; `null` not recurring. */
  paid?: boolean | null;
};

const ownedBy = (userId: string, id: string) =>
  and(eq(transaction.id, id), eq(transaction.userId, userId));

/**
 * Rows with an occurrence in the month: single rows dated in it, and recurring segments that
 * started by the month's end and have not ended before its start (AD-004).
 */
export const applicableInMonth = (userId: string, range: MonthRange) =>
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
 * Deletes the occurrence of `month` (AAAA-MM) of row `id` and every later one, with their paid
 * months; earlier months stay (see `planDelete`). Returns false when the user has no such row or it has no occurrence
 * in `month`.
 */
async function deleteFrom(userId: string, id: string, month: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const segments = await lockSeries(tx, userId, id, month);
    if (!segments) return false;
    const plan = planDelete({ segments, id, month });
    const seriesId = segments.find((s) => s.id === id)!.seriesId;
    if (seriesId) {
      // The series is gone from `month` on: its paid months there go with it (AD-018).
      await tx
        .delete(recurringPaid)
        .where(
          and(
            eq(recurringPaid.userId, userId),
            eq(recurringPaid.seriesId, seriesId),
            gte(recurringPaid.month, `${month}-01`),
          ),
        );
    }
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

/**
 * Marks (`paid`) or unmarks the occurrence of `month` (AAAA-MM) of row `id` as paid, for that month
 * only (AD-018). Idempotent: marking twice keeps one row, unmarking twice is a no-op. Returns false,
 * writing nothing, when the user has no such row, it is not recurring or it has no occurrence in
 * `month`.
 */
async function setPaid(userId: string, id: string, month: string, paid: boolean): Promise<boolean> {
  return db.transaction(async (tx) => {
    const segments = await lockSeries(tx, userId, id, month);
    const seriesId = segments?.find((s) => s.id === id)?.seriesId;
    if (!seriesId) return false;
    const row = { userId, seriesId, month: `${month}-01` };
    if (paid) {
      await tx.insert(recurringPaid).values(row).onConflictDoNothing();
    } else {
      await tx
        .delete(recurringPaid)
        .where(
          and(
            eq(recurringPaid.userId, userId),
            eq(recurringPaid.seriesId, seriesId),
            eq(recurringPaid.month, row.month),
          ),
        );
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
 * Paid months an edit removes (AD-018). After the edit the series ends where the edited segment
 * ends: turning month `month` into a single row drops its paid months from `month` on; an end month
 * drops those after it. Editing the series' first month and moving its start forward also drops the
 * months before the new start, which no longer have an occurrence. An edit that keeps the series
 * open and in place leaves every paid month.
 */
async function prunePaidAfterEdit(
  tx: Tx,
  userId: string,
  segments: Segment[],
  id: string,
  month: string,
  plan: EditPlan,
) {
  const seriesId = segments.find((s) => s.id === id)!.seriesId;
  if (!seriesId) return;
  const edited = plan.updateInPlace ?? plan.insert!;
  const removed: SQL[] = [];
  if (edited.recurringDay === null) {
    removed.push(gte(recurringPaid.month, `${month}-01`));
  } else {
    if (edited.endMonth !== null) removed.push(gt(recurringPaid.month, `${edited.endMonth}-01`));
    // The start only moves when the first month is edited in place; the new start is the edited date's month.
    const newStart = monthKey(edited.date);
    if (plan.updateInPlace && startOfSeries(segments) === month && newStart > month) {
      removed.push(lt(recurringPaid.month, `${newStart}-01`));
    }
  }
  if (removed.length === 0) return;
  await tx
    .delete(recurringPaid)
    .where(and(eq(recurringPaid.userId, userId), eq(recurringPaid.seriesId, seriesId), or(...removed)));
}

/**
 * The paid switch of an edit (AD-018): sets or clears the edited month of the series the edit leaves
 * recurring. `undefined` leaves the state as it was; an edit that makes the row a single one has no
 * series left, so there is nothing to write.
 */
async function writePaidAfterEdit(tx: Tx, userId: string, month: string, plan: EditPlan, paid: boolean | undefined) {
  if (paid === undefined) return;
  const edited = plan.updateInPlace ?? plan.insert!;
  if (edited.recurringDay === null || !edited.seriesId) return;
  const row = { userId, seriesId: edited.seriesId, month: `${month}-01` };
  if (paid) {
    await tx.insert(recurringPaid).values(row).onConflictDoNothing();
  } else {
    await tx
      .delete(recurringPaid)
      .where(and(eq(recurringPaid.userId, userId), eq(recurringPaid.seriesId, row.seriesId), eq(recurringPaid.month, row.month)));
  }
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
    // Write first, prune after: a month the edit leaves without an occurrence (start moved forward) must end unpaid.
    await writePaidAfterEdit(tx, userId, month, plan, dto.paid);
    await prunePaidAfterEdit(tx, userId, segments, id, month, plan);
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

/** Series of the user, among `seriesIds`, whose occurrence in `month` (AAAA-MM) is paid (AD-018). */
async function paidSeriesIn(userId: string, seriesIds: string[], month: string): Promise<Set<string>> {
  if (seriesIds.length === 0) return new Set();
  const rows = await db
    .select({ seriesId: recurringPaid.seriesId })
    .from(recurringPaid)
    .where(
      and(
        eq(recurringPaid.userId, userId),
        eq(recurringPaid.month, `${month}-01`),
        inArray(recurringPaid.seriesId, seriesIds),
      ),
    );
  return new Set(rows.map((r) => r.seriesId));
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
  const seriesIds = [...new Set(rows.flatMap((r) => (r.seriesId ? [r.seriesId] : [])))];
  const series = await loadSeries(userId, seriesIds);
  const paidSeries = await paidSeriesIn(userId, seriesIds, month);
  return rows
    .map(({ recurrenceDay, seriesId, amountCt, ...row }) => {
      const segments = seriesId ? series.get(seriesId) : undefined;
      return {
        ...row,
        paid: seriesId ? paidSeries.has(seriesId) : null,
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

/** Stored transactions of the user in any month (not occurrences), to tell first access from an empty month. */
async function countAll(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transaction)
    .where(eq(transaction.userId, userId));
  return row.total;
}

export const transactionsRepo = {
  findStored,
  delete: remove,
  deleteFrom,
  setPaid,
  createSealed,
  updateFromSealed,
  listByMonthSealed,
  countAll,
};
